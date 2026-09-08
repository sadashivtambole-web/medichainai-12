import { Block } from "./Block.js";
import { Transaction } from "./Transaction.js";
import { ValidatorManager } from "./Validator.js";
import { BlockchainStorage } from "../storage/blockchainStorage.js";
import { GENESIS_PREVIOUS_HASH, TRANSACTION_TYPES } from "../types/blockchain.types.js";
import { sha256 } from "../crypto/hash.js";

export class Blockchain {
  /**
   * @param {Object} [options]
   * @param {BlockchainStorage} [options.storage]
   * @param {ValidatorManager} [options.validatorManager]
   * @param {boolean} [options.autoLoad]
   */
  constructor(options = {}) {
    this.storage = options.storage || new BlockchainStorage();
    this.validatorManager = options.validatorManager || new ValidatorManager();
    this.chain = [];

    if (options.autoLoad !== false) {
      this.initialize();
    }
  }

  /**
   * Initialize or restore the blockchain
   */
  initialize() {
    const persisted = this.storage.loadChain();

    if (persisted && persisted.length > 0) {
      this.chain = persisted.map((b) => Block.fromJSON(b));
      const audit = this.isValidChain();
      if (!audit.valid) {
        throw new Error(
          `DRUGCHAIN_CORRUPTION_DETECTED: Stored blockchain failed cryptographic audit: ${audit.error} (Block #${audit.invalidBlockIndex})`
        );
      }
    } else {
      // Create and persist Genesis Block 0
      const genesis = this.createGenesisBlock();
      this.chain = [genesis];
      this.storage.saveChainSync(this.toJSON());
    }
  }

  /**
   * Create deterministic Genesis Block 0
   * @returns {Block}
   */
  createGenesisBlock() {
    const genesisTx = new Transaction({
      transactionId: "tx-genesis-0000000000000000",
      type: TRANSACTION_TYPES.MEDICINE_REGISTERED,
      medicineId: "GENESIS-DRUGCHAIN-ROOT",
      batchNumber: "GENESIS-BATCH-000",
      from: null,
      to: "DrugChain Network Authority",
      timestamp: "2024-01-01T00:00:00.000Z",
      dataHash: sha256("DRUGCHAIN_GENESIS_ROOT_SEED_HASH_IMMUTABLE_V1"),
      metadata: {
        network: "DrugChain Private Permissioned Network",
        consensus: "Proof of Authority (PoA)",
        purpose: "Immutable Pharmaceutical Traceability & Anti-Counterfeit Ledger",
      },
      status: "CONFIRMED",
    });

    return new Block({
      index: 0,
      timestamp: "2024-01-01T00:00:00.000Z",
      transactions: [genesisTx],
      previousHash: GENESIS_PREVIOUS_HASH,
      validator: "genesis-authority",
    });
  }

  /**
   * Get the latest block in the chain
   * @returns {Block}
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Get the total length of the blockchain
   * @returns {number}
   */
  getLength() {
    return this.chain.length;
  }

  /**
   * Add a new block containing confirmed transactions
   * @param {Array<Transaction|Object>} transactions
   * @param {string} validator
   * @returns {Promise<Block>}
   */
  async addBlock(transactions, validator) {
    if (!transactions || transactions.length === 0) {
      throw new Error("Cannot append an empty block without transactions to DrugChain");
    }

    if (!this.validatorManager.isAuthorized(validator)) {
      throw new Error(`Unauthorized validator identity: '${validator}'. Block creation rejected.`);
    }

    const previousBlock = this.getLatestBlock();
    const newIndex = previousBlock.index + 1;
    const newTimestamp = new Date().toISOString();

    const block = new Block({
      index: newIndex,
      timestamp: newTimestamp,
      transactions,
      previousHash: previousBlock.hash,
      validator,
    });

    // Validate the candidate block before appending
    const check = block.isValid(previousBlock, (v) => this.validatorManager.isAuthorized(v));
    if (!check.valid) {
      throw new Error(`Block validation rejected: ${check.error}`);
    }

    this.chain.push(block);

    // Save atomically to disk
    await this.storage.saveChain(this.toJSON());

    return block;
  }

  /**
   * Validate a single block against its predecessor
   * @param {Block} block
   * @param {Block|null} previousBlock
   * @returns {{ valid: boolean, error?: string }}
   */
  isValidBlock(block, previousBlock = null) {
    if (!(block instanceof Block)) {
      return { valid: false, error: "Object is not an instance of Block" };
    }
    return block.isValid(previousBlock, (v) => this.validatorManager.isAuthorized(v));
  }

  /**
   * Full cryptographic validation of the entire blockchain
   * Verifies:
   * 1. Genesis Block integrity
   * 2. Hash linkage across all blocks
   * 3. Merkle Root transaction consistency
   * 4. Validator authorization
   * 5. Sequence indices and chronological timestamps
   * @returns {{ valid: boolean, blocksChecked: number, invalidBlockIndex?: number, error?: string, message: string }}
   */
  isValidChain() {
    if (this.chain.length === 0) {
      return {
        valid: false,
        blocksChecked: 0,
        invalidBlockIndex: -1,
        error: "Chain is completely empty",
        message: "Blockchain integrity violation detected",
      };
    }

    // 1. Genesis block check
    const genesis = this.chain[0];
    if (genesis.index !== 0 || genesis.previousHash !== GENESIS_PREVIOUS_HASH) {
      return {
        valid: false,
        blocksChecked: 1,
        invalidBlockIndex: 0,
        error: "Genesis block header or previousHash corrupted",
        message: "Blockchain integrity violation detected",
      };
    }

    const genesisCheck = genesis.isValid(null, (v) => this.validatorManager.isAuthorized(v));
    if (!genesisCheck.valid) {
      return {
        valid: false,
        blocksChecked: 1,
        invalidBlockIndex: 0,
        error: `Genesis block hash invalid: ${genesisCheck.error}`,
        message: "Blockchain integrity violation detected",
      };
    }

    // 2. Continuous chain check
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const prevBlock = this.chain[i - 1];

      const blockCheck = currentBlock.isValid(prevBlock, (v) =>
        this.validatorManager.isAuthorized(v)
      );

      if (!blockCheck.valid) {
        return {
          valid: false,
          blocksChecked: this.chain.length,
          invalidBlockIndex: i,
          error: blockCheck.error,
          message: "Blockchain integrity violation detected",
        };
      }
    }

    return {
      valid: true,
      blocksChecked: this.chain.length,
      message: `DrugChain is fully valid (${this.chain.length} blocks checked)`,
    };
  }

  /**
   * Find all transactions related to a given medicineId across the blockchain
   * @param {string} medicineId
   * @returns {Array<Object>}
   */
  getTransactionsForMedicine(medicineId) {
    const target = String(medicineId).trim().toUpperCase();
    const results = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (
          tx.medicineId === target ||
          tx.batchNumber === target ||
          tx.metadata?.batchId?.toUpperCase() === target
        ) {
          results.push({
            ...tx.toJSON(),
            blockIndex: block.index,
            blockHash: block.hash,
            validator: block.validator,
            blockTimestamp: block.timestamp,
          });
        }
      }
    }

    return results;
  }

  /**
   * Retrieve the original registered medicineDataHash from Block 1..N
   * @param {string} medicineId
   * @returns {string|null}
   */
  getRegisteredMedicineHash(medicineId) {
    const target = String(medicineId).trim().toUpperCase();

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (
          tx.type === TRANSACTION_TYPES.MEDICINE_REGISTERED &&
          (tx.medicineId === target || tx.batchNumber === target)
        ) {
          return tx.dataHash;
        }
      }
    }

    return null;
  }

  /**
   * Check if a medicine or batch is already registered on DrugChain
   * @param {string} medicineId
   * @param {string} batchNumber
   * @returns {boolean}
   */
  isMedicineRegistered(medicineId, batchNumber) {
    const targetMed = String(medicineId || "").trim().toUpperCase();
    const targetBatch = String(batchNumber || "").trim().toUpperCase();

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.type === TRANSACTION_TYPES.MEDICINE_REGISTERED) {
          if (targetMed && tx.medicineId === targetMed) return true;
          if (targetBatch && tx.batchNumber === targetBatch) return true;
        }
      }
    }
    return false;
  }

  toJSON() {
    return this.chain.map((b) => b.toJSON());
  }
}
