import api from "../services/api";

// OCR helpers for reading batch number / expiry date off a medicine label via the backend AI engine.
export class OcrUnavailableError extends Error {
  constructor(message = "No OCR engine available.") {
    super(message);
    this.name = "OcrUnavailableError";
  }
}

/** Run OCR on an image File/Blob using backend multimodal OCR endpoint */
export async function runOcr(file, onProgress = () => {}) {
  try {
    const form = new FormData();
    form.append("medicineImage", file);
    onProgress(0.4);

    const res = await api.post("/verification/ai", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    onProgress(1.0);

    const data = res?.data || res;
    const extracted = data?.ocrExtracted || data?.extractedData || {};
    const textPieces = [
      extracted.medicineName,
      extracted.batchNumber,
      extracted.expiryDate,
      extracted.manufacturer,
      ...(data?.reasons || []),
    ].filter(Boolean);

    return {
      text: textPieces.join(" "),
      extracted,
      data,
      engine: "DrugChain AI Multimodal Vision",
    };
  } catch (err) {
    throw new OcrUnavailableError(err.message || "Server OCR service unavailable");
  }
}

const BATCH_RE = /\b(?:b\.?\s*no|batch(?:\s*no)?|lot)\b[^A-Za-z0-9]{0,4}([A-Z0-9][A-Z0-9-]{3,})/i;
const EXPIRY_RE =
  /\b(?:exp(?:iry)?|use\s*before|best\s*before)\b[^A-Za-z0-9]{0,6}((?:\d{1,2}[/\-. ])?(?:\d{1,2}|[A-Za-z]{3,9})[/\-. ]\d{2,4})/i;
const CODE_RE = /\b(?:MED-[A-Z0-9-]+|MEDG-[A-Z0-9-]+|BT[0-9]+)\b/i;

/** Pull the interesting fields out of raw OCR text. */
export function parseLabel(text) {
  const flat = (text || "").replace(/\s+/g, " ");
  return {
    raw: text || "",
    batch: flat.match(BATCH_RE)?.[1]?.toUpperCase() ?? null,
    expiry: flat.match(EXPIRY_RE)?.[1]?.trim() ?? null,
    code: flat.match(CODE_RE)?.[0]?.toUpperCase() ?? null,
  };
}
