import crypto from "crypto";

/**
 * Calculate standard SHA-256 hash of any string or object
 * @param {string|object} data 
 * @returns {string} Hex encoded SHA-256 hash
 */
export function sha256(data) {
  const content = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Calculate deterministic block hash
 * SHA256(index + previousHash + timestamp + merkleRoot + validator)
 */
export function calculateBlockHash(index, previousHash, timestamp, merkleRoot, validator) {
  const rawPayload = `${index}|${previousHash}|${timestamp}|${merkleRoot}|${validator}`;
  return crypto.createHash("sha256").update(rawPayload).digest("hex");
}

/**
 * Calculate deterministic medicine data hash
 * Ensures immutable integrity for core medicine parameters
 */
export function calculateMedicineDataHash({
  medicineId,
  batchNumber,
  medicineName,
  manufacturerCode,
  manufacturingDate,
  expiryDate,
}) {
  const normalized = [
    String(medicineId || "").trim().toUpperCase(),
    String(batchNumber || "").trim().toUpperCase(),
    String(medicineName || "").trim().toLowerCase(),
    String(manufacturerCode || "").trim().toUpperCase(),
    String(manufacturingDate || "").trim(),
    String(expiryDate || "").trim(),
  ].join("|");

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Compute Merkle Root of an array of transactions
 * @param {Array} transactions 
 * @returns {string} Merkle root SHA-256 hash
 */
export function calculateMerkleRoot(transactions) {
  if (!transactions || transactions.length === 0) {
    return sha256("EMPTY_TRANSACTIONS");
  }

  let hashes = transactions.map((tx) => {
    const serialized = typeof tx.serialize === "function" ? tx.serialize() : JSON.stringify(tx);
    return sha256(serialized);
  });

  while (hashes.length > 1) {
    if (hashes.length % 2 !== 0) {
      hashes.push(hashes[hashes.length - 1]); // Duplicate last hash if odd count
    }
    const nextLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      nextLevel.push(sha256(hashes[i] + hashes[i + 1]));
    }
    hashes = nextLevel;
  }

  return hashes[0];
}
