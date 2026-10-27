import { verificationService } from "../services/verificationService";

/**
 * Verify a scanned/entered pack code against the live DrugChain verification engine.
 * Returns { status, code, pack?, message, audit? }.
 * status is one of: 'genuine' | 'expired' | 'counterfeit'
 */
export async function verifyPack(rawCode) {
  const code = (rawCode || "").trim();
  if (!code) {
    return { status: "counterfeit", code, message: "No code provided." };
  }

  try {
    const res = await verificationService.verifyPublicCode(code);
    if (!res || res.isFake || !res.medicine) {
      return {
        status: "counterfeit",
        code,
        audit: res,
        message: "This code is not in the registry or failed cryptographic checks. Treat as suspicious.",
      };
    }

    const medicine = res.medicine;
    const isExpired = medicine.expiryDate && new Date(medicine.expiryDate) < new Date();

    const pack = {
      name: medicine.name,
      batch: medicine.batchId,
      manufacturer: medicine.company || medicine.manufacturer,
      expiry: medicine.expiryDate,
      manufacturingDate: medicine.manufacturingDate,
      price: medicine.price,
      status: res.result?.status || medicine.status,
    };

    if (isExpired) {
      return {
        status: "expired",
        code,
        pack,
        audit: res,
        message: `Genuine medicine, but expired on ${medicine.expiryDate}. Do not dispense or consume.`,
      };
    }

    return {
      status: "genuine",
      code,
      pack,
      audit: res,
      message: `Verified authentic on DrugChain ledger with score ${res.result?.score ?? 100}%. Safe to dispense.`,
    };
  } catch (err) {
    return {
      status: "counterfeit",
      code,
      message: err.message || "Failed to reach verification server.",
    };
  }
}

/**
 * Cross-check a batch number read off a label (via OCR) against the live verification engine.
 * Returns the same shape as verifyPack().
 */
export async function verifyBatch(batch) {
  return verifyPack(batch);
}
