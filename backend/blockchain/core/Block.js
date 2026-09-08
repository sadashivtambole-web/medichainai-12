import { calculateBlockHash, calculateMerkleRoot } from "../crypto/hash.js";
import { Transaction } from "./Transaction.js";

export class Block {
  /**
   * @param {Object} params
   * @param {number} params.index
   * @param {string} [params.timestamp]
   * @param {Array<Transaction|Object>} params.transactions
   * @param {string} params.previousHash
   * @param {string} [params.hash]
   * @param {string} [params.merkleRoot]
   * @param {string} params.validator
   */
  constructor({
    index,
    timestamp,
    transactions = [],
    previousHash,
    hash,
    merkleRoot,
    validator,
  }) {
    if (typeof index !== "number" || index < 0) {
      throw new Error(`Invalid block index: ${index}`);
    }
    if (!previousHash) {
      throw new Error("Block requires a valid previousHash");
    }
    if (!validator) {
      throw new Error("Block requires an authorized validator identity");
    }

    this.index = index;
    this.timestamp = timestamp || new Date().toISOString();
    this.previousHash = previousHash;
    this.validator = String(validator).trim();

    // Instantiate Transaction objects
    this.transactions = transactions.map((t) =>
      t instanceof Transaction ? t : Transaction.fromJSON(t)
    );

    this.merkleRoot = merkleRoot || calculateMerkleRoot(this.transactions);
    this.hash =
      hash ||
      calculateBlockHash(
        this.index,
        this.previousHash,
        this.timestamp,
        this.merkleRoot,
        this.validator
      );
  }

  /**
   * Re-computes block hash deterministically
   * @returns {string}
   */
  calculateHash() {
    this.merkleRoot = calculateMerkleRoot(this.transactions);
    return calculateBlockHash(
      this.index,
      this.previousHash,
      this.timestamp,
      this.merkleRoot,
      this.validator
    );
  }

  /**
   * Verify all transactions in the block are structurally valid
   * @returns {boolean}
   */
  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate this block against its predecessor
   * @param {Block|null} previousBlock
   * @param {Function} [isValidatorAuthorized]
   * @returns {{ valid: boolean, error?: string }}
   */
  isValid(previousBlock = null, isValidatorAuthorized = null) {
    // 1. Validator authorization check
    if (isValidatorAuthorized && !isValidatorAuthorized(this.validator)) {
      return { valid: false, error: `Unauthorized block validator: ${this.validator}` };
    }

    // 2. Merkle Root validation
    const expectedMerkle = calculateMerkleRoot(this.transactions);
    if (this.merkleRoot !== expectedMerkle) {
      return { valid: false, error: `Merkle root mismatch on Block ${this.index}` };
    }

    // 3. Hash integrity check
    const calculatedHash = this.calculateHash();
    if (this.hash !== calculatedHash) {
      return {
        valid: false,
        error: `Block ${this.index} hash mismatch (expected: ${calculatedHash}, stored: ${this.hash})`,
      };
    }

    // 4. Transaction validity check
    if (!this.hasValidTransactions()) {
      return { valid: false, error: `Block ${this.index} contains corrupted transactions` };
    }

    // 5. Linkage with predecessor (if not genesis)
    if (previousBlock) {
      if (this.index !== previousBlock.index + 1) {
        return {
          valid: false,
          error: `Block index sequence broken: Block ${this.index} after Block ${previousBlock.index}`,
        };
      }
      if (this.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          error: `Previous hash linkage broken on Block ${this.index} (points to ${this.previousHash}, previous block was ${previousBlock.hash})`,
        };
      }
      if (new Date(this.timestamp).getTime() < new Date(previousBlock.timestamp).getTime()) {
        return {
          valid: false,
          error: `Timestamp anomaly on Block ${this.index}: precedes previous block`,
        };
      }
    }

    return { valid: true };
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map((tx) => tx.toJSON()),
      previousHash: this.previousHash,
      hash: this.hash,
      merkleRoot: this.merkleRoot,
      validator: this.validator,
    };
  }

  static fromJSON(data) {
    return new Block({
      index: data.index,
      timestamp: data.timestamp,
      transactions: data.transactions || [],
      previousHash: data.previousHash,
      hash: data.hash,
      merkleRoot: data.merkleRoot,
      validator: data.validator,
    });
  }
}
