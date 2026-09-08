import crypto from "crypto";
import { TRANSACTION_TYPES } from "../types/blockchain.types.js";
import { sha256 } from "../crypto/hash.js";

export class Transaction {
  /**
   * @param {Object} params
   * @param {string} [params.transactionId]
   * @param {string} params.type
   * @param {string} params.medicineId
   * @param {string} params.batchNumber
   * @param {string|null} [params.from]
   * @param {string} params.to
   * @param {string} [params.timestamp]
   * @param {string} params.dataHash
   * @param {Object} [params.metadata]
   * @param {string} [params.status]
   */
  constructor({
    transactionId,
    type,
    medicineId,
    batchNumber,
    from = null,
    to,
    timestamp,
    dataHash,
    metadata = {},
    status = "CONFIRMED",
  }) {
    if (!type || !TRANSACTION_TYPES[type]) {
      throw new Error(`Invalid transaction type: ${type}`);
    }
    if (!medicineId) {
      throw new Error("Transaction requires a valid medicineId");
    }

    this.transactionId =
      transactionId ||
      `tx-${crypto.randomBytes(8).toString("hex")}-${Date.now().toString(36)}`;
    this.type = type;
    this.medicineId = String(medicineId).trim().toUpperCase();
    this.batchNumber = String(batchNumber || "").trim().toUpperCase();
    this.from = from ? String(from).trim() : null;
    this.to = String(to || "").trim();
    this.timestamp = timestamp || new Date().toISOString();
    this.dataHash = dataHash || sha256(`${this.medicineId}|${this.batchNumber}|${this.timestamp}`);
    this.metadata = metadata;
    this.status = status;
  }

  /**
   * Serialize transaction deterministically
   */
  serialize() {
    return JSON.stringify({
      transactionId: this.transactionId,
      type: this.type,
      medicineId: this.medicineId,
      batchNumber: this.batchNumber,
      from: this.from,
      to: this.to,
      timestamp: this.timestamp,
      dataHash: this.dataHash,
      metadata: this.metadata,
      status: this.status,
    });
  }

  /**
   * Validate transaction structure
   */
  isValid() {
    if (!this.transactionId || !this.type || !this.medicineId || !this.timestamp) {
      return false;
    }
    if (!TRANSACTION_TYPES[this.type]) {
      return false;
    }
    if (!this.dataHash || typeof this.dataHash !== "string" || this.dataHash.length !== 64) {
      return false;
    }
    return true;
  }

  toJSON() {
    return {
      transactionId: this.transactionId,
      type: this.type,
      medicineId: this.medicineId,
      batchNumber: this.batchNumber,
      from: this.from,
      to: this.to,
      timestamp: this.timestamp,
      dataHash: this.dataHash,
      metadata: this.metadata,
      status: this.status,
    };
  }

  static fromJSON(data) {
    return new Transaction(data);
  }
}
