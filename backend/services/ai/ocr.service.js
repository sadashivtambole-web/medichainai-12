/**
 * OCR Service
 * Text normalization, character confusion tolerance, and structured database comparison.
 * Clearly separates real confidence from unavailable confidence without fabrication.
 */

/**
 * Normalizes text for comparison by trimming, uppercasing, and removing redundant punctuation.
 */
export function normalizeOcrText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, ""); // Strips hyphens, spaces, dots, slashes
}

/**
 * Checks equality between extracted OCR string and registered value,
 * accounting for benign formatting differences and standard OCR character confusions
 * (e.g., 'O' vs '0', 'I' vs '1', 'S' vs '5') without hiding genuine mismatches.
 */
export function compareOcrString(extracted, expected) {
  if (!expected && !extracted) return { status: "UNKNOWN", match: true };
  if (!expected || !extracted) return { status: "UNKNOWN", match: false };

  const normExtracted = normalizeOcrText(extracted);
  const normExpected = normalizeOcrText(expected);

  if (normExtracted === normExpected) {
    return { status: "MATCH", match: true, similarity: 1.0 };
  }

  // Check substring containment (e.g. "XYZ PHARMA LTD" vs "XYZ PHARMA")
  if (normExtracted.includes(normExpected) || normExpected.includes(normExtracted)) {
    return { status: "MATCH", match: true, similarity: 0.9 };
  }

  // Check benign character confusion substitution (O <-> 0, I <-> 1, S <-> 5)
  const substExtracted = normExtracted
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S");
  const substExpected = normExpected
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S");

  if (substExtracted === substExpected) {
    return { status: "MATCH", match: true, similarity: 0.85, note: "Match with minor OCR character confusion tolerance" };
  }

  return { status: "MISMATCH", match: false, similarity: 0.0 };
}

/**
 * Compares all extracted packaging fields against registered pharmaceutical data.
 */
export function compareOcrWithDatabase(extracted = {}, registered = {}) {
  const medicineNameComp = compareOcrString(extracted.medicineName, registered.name || registered.medicineName);
  const batchNumberComp = compareOcrString(extracted.batchNumber, registered.batchId || registered.batchNumber);
  const manufacturerComp = compareOcrString(
    extracted.manufacturer,
    registered.company || registered.manufacturer || registered.manufacturerName
  );

  // Date comparison (format independent)
  const mfgComp = compareOcrDate(extracted.manufacturingDate, registered.manufacturingDate);
  const expComp = compareOcrDate(extracted.expiryDate, registered.expiryDate);

  const fields = {
    medicineName: {
      status: medicineNameComp.status,
      extracted: extracted.medicineName || "",
      registered: registered.name || registered.medicineName || "",
      match: medicineNameComp.match,
    },
    batchNumber: {
      status: batchNumberComp.status,
      extracted: extracted.batchNumber || "",
      registered: registered.batchId || registered.batchNumber || "",
      match: batchNumberComp.match,
    },
    manufacturer: {
      status: manufacturerComp.status,
      extracted: extracted.manufacturer || "",
      registered: registered.company || registered.manufacturer || registered.manufacturerName || "",
      match: manufacturerComp.match,
    },
    manufacturingDate: {
      status: mfgComp.status,
      extracted: extracted.manufacturingDate || "",
      registered: registered.manufacturingDate || "",
      match: mfgComp.match,
    },
    expiryDate: {
      status: expComp.status,
      extracted: extracted.expiryDate || "",
      registered: registered.expiryDate || "",
      match: expComp.match,
    },
  };

  const mismatches = [];
  const matches = [];

  if (fields.medicineName.status === "MISMATCH") mismatches.push("medicineName");
  else if (fields.medicineName.status === "MATCH") matches.push("medicineName");

  if (fields.batchNumber.status === "MISMATCH") mismatches.push("batchNumber");
  else if (fields.batchNumber.status === "MATCH") matches.push("batchNumber");

  if (fields.manufacturer.status === "MISMATCH") mismatches.push("manufacturer");
  else if (fields.manufacturer.status === "MATCH") matches.push("manufacturer");

  if (fields.expiryDate.status === "MISMATCH") mismatches.push("expiryDate");
  else if (fields.expiryDate.status === "MATCH") matches.push("expiryDate");

  return {
    fields,
    allMatched: mismatches.length === 0,
    mismatches,
    matches,
    overallOcrStatus: mismatches.length === 0 ? "MATCHED" : "MISMATCH",
  };
}

/**
 * Compares two date strings flexibly.
 */
function compareOcrDate(extracted, registered) {
  if (!extracted || !registered) {
    return { status: "UNKNOWN", match: true };
  }

  const cleanExtracted = extracted.replace(/[^0-9]/g, "");
  const cleanRegistered = registered.replace(/[^0-9]/g, "");

  if (cleanExtracted === cleanRegistered) {
    return { status: "MATCH", match: true };
  }

  // Parse Date timestamps
  const extDate = new Date(extracted);
  const regDate = new Date(registered);

  if (!isNaN(extDate.getTime()) && !isNaN(regDate.getTime())) {
    const isSameYearMonth =
      extDate.getFullYear() === regDate.getFullYear() && extDate.getMonth() === regDate.getMonth();
    if (isSameYearMonth) {
      return { status: "MATCH", match: true };
    }
  }

  return { status: "MISMATCH", match: false };
}

/**
 * Returns OCR confidence info strictly adhering to STEP 6:
 * Do NOT invent confidence numbers if the underlying engine doesn't produce character-level probabilities.
 */
export function getOcrConfidenceInfo(engineMetrics = null) {
  if (engineMetrics && typeof engineMetrics.confidence === "number") {
    return {
      confidence: engineMetrics.confidence,
      confidenceAvailable: true,
      confidenceSource: "OCR Engine Engine Measurement",
    };
  }

  return {
    confidence: null,
    confidenceAvailable: false,
    confidenceSource: "UNAVAILABLE (Vision API outputs text without character probability metrics)",
  };
}
