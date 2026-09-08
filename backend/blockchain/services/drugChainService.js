import { Blockchain } from "../core/Blockchain.js";
import { Transaction } from "../core/Transaction.js";
import { TRANSACTION_TYPES } from "../types/blockchain.types.js";
import { calculateMedicineDataHash, sha256 } from "../crypto/hash.js";

export class DrugChainService {
  /**
   * @param {Blockchain} [blockchain] 
   */
  constructor(blockchain = null) {
    this.blockchain = blockchain || new Blockchain();
  }

  /**
   * Register a new medicine batch on DrugChain
   * @param {Object} params
   */
  async registerMedicine({
    medicineId,
    batchNumber,
    medicineName,
    manufacturerCode,
    manufacturerName,
    manufacturingDate,
    expiryDate,
    validator = "validator-manufacturer",
  }) {
    if (!medicineId || !batchNumber || !medicineName) {
      throw new Error("Registration requires medicineId, batchNumber, and medicineName");
    }

    if (this.blockchain.isMedicineRegistered(medicineId, batchNumber)) {
      throw new Error(`Medicine '${medicineId}' / Batch '${batchNumber}' is already registered on DrugChain`);
    }

    // 1. Calculate deterministic medicine data hash
    const medicineDataHash = calculateMedicineDataHash({
      medicineId,
      batchNumber,
      medicineName,
      manufacturerCode,
      manufacturingDate,
      expiryDate,
    });

    // 2. Create MEDICINE_REGISTERED transaction
    const tx = new Transaction({
      type: TRANSACTION_TYPES.MEDICINE_REGISTERED,
      medicineId,
      batchNumber,
      from: null,
      to: manufacturerName || manufacturerCode || "Manufacturer",
      timestamp: new Date().toISOString(),
      dataHash: medicineDataHash,
      metadata: {
        medicineName,
        manufacturerCode,
        manufacturerName,
        manufacturingDate,
        expiryDate,
        role: "Manufacturer",
      },
      status: "CONFIRMED",
    });

    // 3. Append to DrugChain as a new block
    const block = await this.blockchain.addBlock([tx], validator);

    return {
      success: true,
      medicineId,
      batchNumber,
      transactionId: tx.transactionId,
      dataHash: medicineDataHash,
      blockIndex: block.index,
      blockHash: block.hash,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      validator: block.validator,
    };
  }

  /**
   * Record a supply chain custody transfer on DrugChain
   * @param {Object} params
   */
  async transferMedicine({
    medicineId,
    batchNumber,
    from,
    to,
    fromRole,
    toRole,
    validator = "validator-distributor",
  }) {
    if (!medicineId || !from || !to) {
      throw new Error("Transfer requires medicineId, from, and to fields");
    }

    // Enforce valid supply chain sequence
    const allowedTransitions = [
      { from: "Manufacturer", to: "Distributor" },
      { from: "Distributor", to: "Pharmacy" },
    ];

    if (fromRole && toRole) {
      const isValidTransition = allowedTransitions.some(
        (t) => t.from.toLowerCase() === fromRole.toLowerCase() && t.to.toLowerCase() === toRole.toLowerCase()
      );
      if (!isValidTransition) {
        throw new Error(
          `Invalid supply chain sequence: '${fromRole}' cannot directly transfer to '${toRole}'. Expected Manufacturer → Distributor → Pharmacy.`
        );
      }
    }

    const txDataHash = sha256(`TRANSFER|${medicineId}|${batchNumber}|${from}|${to}|${Date.now()}`);

    const tx = new Transaction({
      type: TRANSACTION_TYPES.MEDICINE_TRANSFERRED,
      medicineId,
      batchNumber,
      from,
      to,
      timestamp: new Date().toISOString(),
      dataHash: txDataHash,
      metadata: {
        fromRole: fromRole || "Origin",
        toRole: toRole || "Destination",
        action: "TRANSFER_DISPATCHED",
      },
      status: "CONFIRMED",
    });

    const block = await this.blockchain.addBlock([tx], validator);

    return {
      success: true,
      medicineId,
      batchNumber,
      transactionId: tx.transactionId,
      blockIndex: block.index,
      blockHash: block.hash,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      validator: block.validator,
    };
  }

  /**
   * Record a custody receipt confirmation by Distributor or Pharmacy
   * @param {Object} params
   */
  async confirmReceipt({
    medicineId,
    batchNumber,
    actor,
    role,
    validator = "validator-pharmacy",
  }) {
    if (!medicineId || !actor) {
      throw new Error("Confirm receipt requires medicineId and actor");
    }

    const txDataHash = sha256(`RECEIPT_CONFIRMED|${medicineId}|${batchNumber}|${actor}|${Date.now()}`);

    const tx = new Transaction({
      type: TRANSACTION_TYPES.RECEIPT_CONFIRMED,
      medicineId,
      batchNumber,
      from: actor,
      to: actor,
      timestamp: new Date().toISOString(),
      dataHash: txDataHash,
      metadata: {
        actor,
        role: role || "Custodian",
        action: "CUSTODY_CONFIRMED",
      },
      status: "CONFIRMED",
    });

    const block = await this.blockchain.addBlock([tx], validator);

    return {
      success: true,
      medicineId,
      batchNumber,
      transactionId: tx.transactionId,
      blockIndex: block.index,
      blockHash: block.hash,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      validator: block.validator,
    };
  }

  /**
   * Verify medicine data hash against original DrugChain registration
   * @param {Object} params
   */
  async verifyMedicine({
    medicineId,
    batchNumber,
    submittedData = {},
    verifier = "Customer Verification Portal",
    validator = "validator-admin",
  }) {
    if (!medicineId && !batchNumber) {
      throw new Error("Verification requires medicineId or batchNumber");
    }

    const lookupId = medicineId || batchNumber;
    const registeredHash = this.blockchain.getRegisteredMedicineHash(lookupId);

    if (!registeredHash) {
      return {
        success: false,
        result: "NOT_FOUND",
        match: false,
        message: `No registration record found on DrugChain for '${lookupId}'`,
      };
    }

    // Calculate submitted hash
    const submittedHash = submittedData.dataHash
      ? submittedData.dataHash
      : calculateMedicineDataHash({
          medicineId: submittedData.medicineId || medicineId,
          batchNumber: submittedData.batchNumber || batchNumber,
          medicineName: submittedData.medicineName || submittedData.name,
          manufacturerCode: submittedData.manufacturerCode,
          manufacturingDate: submittedData.manufacturingDate,
          expiryDate: submittedData.expiryDate,
        });

    const isMatch = submittedHash === registeredHash;
    const result = isMatch ? "MATCH" : "MISMATCH";

    // Record verification event on-chain
    const verifyTxHash = sha256(`VERIFY|${lookupId}|${verifier}|${result}|${Date.now()}`);
    const tx = new Transaction({
      type: TRANSACTION_TYPES.MEDICINE_VERIFIED,
      medicineId: lookupId,
      batchNumber: batchNumber || "",
      from: verifier,
      to: "DrugChain Verification Gate",
      timestamp: new Date().toISOString(),
      dataHash: verifyTxHash,
      metadata: {
        verifier,
        result,
        match: isMatch,
        submittedHash,
        registeredHash,
      },
      status: "CONFIRMED",
    });

    const block = await this.blockchain.addBlock([tx], validator);

    return {
      success: true,
      result,
      match: isMatch,
      medicineId: lookupId,
      submittedHash,
      registeredHash,
      transactionId: tx.transactionId,
      blockIndex: block.index,
      blockHash: block.hash,
      timestamp: block.timestamp,
      message: isMatch
        ? "Submitted medicine parameters match immutable DrugChain registration"
        : "CRYPTOGRAPHIC MISMATCH: Submitted data does not match on-chain record",
    };
  }

  /**
   * Retrieve all blockchain transactions for a given medicine
   * @param {string} medicineId
   * @returns {Array<Object>}
   */
  getMedicineHistory(medicineId) {
    return this.blockchain.getTransactionsForMedicine(medicineId);
  }

  /**
   * Get real-time status of the DrugChain network
   * @returns {Object}
   */
  getChainStatus() {
    const latest = this.blockchain.getLatestBlock();
    const validation = this.blockchain.isValidChain();

    return {
      connected: true,
      network: "DrugChain Private Permissioned Network",
      consensus: "Proof of Authority (PoA)",
      chainLength: this.blockchain.getLength(),
      latestBlock: latest ? latest.index : 0,
      latestHash: latest ? latest.hash : null,
      validator: latest ? latest.validator : null,
      valid: validation.valid,
      message: validation.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Full cryptographic validation of the DrugChain
   * @returns {Object}
   */
  validateChain() {
    return this.blockchain.isValidChain();
  }

  /**
   * Return full serialized blockchain
   * @returns {Array<Object>}
   */
  getFullChain() {
    return this.blockchain.toJSON();
  }
}

// Global Singleton Instance
export const drugChainService = new DrugChainService();
