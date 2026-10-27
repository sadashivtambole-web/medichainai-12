/**
 * AI Response Parser & Sanitizer
 * Defensively extracts and normalizes structured JSON from raw multimodal AI responses.
 * Never allows malformed or unexpected AI outputs to crash the backend.
 */

export function parseAndNormalizeAIResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return createDefaultParsedResult("EMPTY_RESPONSE");
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  cleaned = cleaned.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // First try: standard JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    return normalizeParsedObject(parsed);
  } catch (parseErr) {
    // Second try: extract outermost JSON object via regex if there was surrounding commentary
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return normalizeParsedObject(parsed);
      } catch (innerErr) {
        // Fallback: heuristic extraction
      }
    }
  }

  // Fallback: heuristic key-value extraction for partial responses
  return extractHeuristicFields(cleaned);
}

function normalizeParsedObject(obj) {
  if (!obj || typeof obj !== "object") {
    return createDefaultParsedResult("INVALID_OBJECT");
  }

  const medicineName = sanitizeString(obj.medicineName || obj.medicine_name || obj.name);
  const batchNumber = sanitizeString(obj.batchNumber || obj.batch_number || obj.batch || obj.lotNumber);
  const manufacturer = sanitizeString(obj.manufacturer || obj.company || obj.companyName || obj.manufacturerName);
  const manufacturingDate = sanitizeDateString(obj.manufacturingDate || obj.mfgDate || obj.mfg);
  const expiryDate = sanitizeDateString(obj.expiryDate || obj.expDate || obj.exp);

  let packagingCondition = sanitizeString(obj.packagingCondition || obj.packagingIntegrity || obj.packaging).toUpperCase();
  if (!["INTACT", "SUSPICIOUS", "DAMAGED", "ALTERED"].includes(packagingCondition)) {
    packagingCondition = packagingCondition.includes("SUSPIC") ? "SUSPICIOUS" : packagingCondition.includes("INTACT") ? "INTACT" : "UNKNOWN";
  }

  let labelIntegrity = sanitizeString(obj.labelIntegrity || obj.label).toUpperCase();
  if (!["CLEAR", "BLURRED", "TAMPERED", "INCOMPLETE"].includes(labelIntegrity)) {
    labelIntegrity = labelIntegrity.includes("CLEAR") ? "CLEAR" : labelIntegrity.includes("BLUR") ? "BLURRED" : "UNKNOWN";
  }

  const visualObservations = Array.isArray(obj.findings)
    ? obj.findings.map(sanitizeString).filter(Boolean)
    : Array.isArray(obj.visualObservations)
    ? obj.visualObservations.map(sanitizeString).filter(Boolean)
    : [];

  const suspiciousIndicators = Array.isArray(obj.warnings)
    ? obj.warnings.map(sanitizeString).filter(Boolean)
    : Array.isArray(obj.suspiciousIndicators)
    ? obj.suspiciousIndicators.map(sanitizeString).filter(Boolean)
    : [];

  let rawStatus = sanitizeString(obj.status).toUpperCase();
  if (!["PASS", "MATCHED", "MISMATCH", "SUSPICIOUS"].includes(rawStatus)) {
    rawStatus = suspiciousIndicators.length > 0 ? "SUSPICIOUS" : "PASS";
  }

  return {
    medicineName,
    batchNumber,
    manufacturer,
    manufacturingDate,
    expiryDate,
    packagingCondition: packagingCondition || "INTACT",
    labelIntegrity: labelIntegrity || "CLEAR",
    visualObservations,
    suspiciousIndicators,
    rawStatus: rawStatus === "MATCHED" ? "PASS" : rawStatus,
    parseSuccess: true,
  };
}

function extractHeuristicFields(text) {
  const medicineName = extractRegex(text, /"?(?:medicineName|medicine_name|name)"?\s*:\s*"([^"]+)"/i);
  const batchNumber = extractRegex(text, /"?(?:batchNumber|batch_number|batch)"?\s*:\s*"([^"]+)"/i);
  const manufacturer = extractRegex(text, /"?(?:manufacturer|company)"?\s*:\s*"([^"]+)"/i);
  const manufacturingDate = extractRegex(text, /"?(?:manufacturingDate|mfgDate)"?\s*:\s*"([^"]+)"/i);
  const expiryDate = extractRegex(text, /"?(?:expiryDate|expDate)"?\s*:\s*"([^"]+)"/i);

  return {
    medicineName,
    batchNumber,
    manufacturer,
    manufacturingDate: sanitizeDateString(manufacturingDate),
    expiryDate: sanitizeDateString(expiryDate),
    packagingCondition: "UNKNOWN",
    labelIntegrity: "UNKNOWN",
    visualObservations: ["Heuristic extraction applied to partial AI vision response"],
    suspiciousIndicators: [],
    rawStatus: "UNKNOWN",
    parseSuccess: Boolean(medicineName || batchNumber || manufacturer),
  };
}

function extractRegex(text, regex) {
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : "";
}

function sanitizeString(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/<[^>]*>?/gm, "").trim();
}

function sanitizeDateString(val) {
  if (!val) return "";
  const cleaned = sanitizeString(val);
  // Match YYYY-MM-DD or MM/YYYY or similar valid representations
  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(cleaned) || /\d{1,2}[-/]\d{4}/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

function createDefaultParsedResult(reason = "DEFAULT") {
  return {
    medicineName: "",
    batchNumber: "",
    manufacturer: "",
    manufacturingDate: "",
    expiryDate: "",
    packagingCondition: "UNKNOWN",
    labelIntegrity: "UNKNOWN",
    visualObservations: [`AI response parser default fallback (${reason})`],
    suspiciousIndicators: [],
    rawStatus: "UNKNOWN",
    parseSuccess: false,
  };
}
