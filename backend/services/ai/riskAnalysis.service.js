/**
 * Risk Analysis Service
 * Synthesizes visual indicators, OCR comparison signals, and deterministic date validation.
 * Strictly avoids fabricated ML probabilities; uses explainable rule-based risk evaluation.
 */

/**
 * Evaluates packaging and tampering risks from visual indicators and OCR results.
 */
export function evaluatePackagingRisk({ visualData = {}, ocrComparison = {} }) {
  const indicators = [];
  const warnings = [];

  const packaging = visualData.packagingCondition || "UNKNOWN";
  const label = visualData.labelIntegrity || "UNKNOWN";

  if (packaging === "SUSPICIOUS" || packaging === "DAMAGED" || packaging === "ALTERED") {
    indicators.push(`Packaging condition flagged as ${packaging.toLowerCase()}`);
    warnings.push("AI-assisted visual analysis indicates potential physical packaging anomalies or seal irregularities.");
  }

  if (label === "BLURRED" || label === "TAMPERED" || label === "INCOMPLETE") {
    indicators.push(`Label print integrity flagged as ${label.toLowerCase()}`);
    warnings.push("AI-assisted visual analysis indicates printed label quality or typography is degraded or altered.");
  }

  // OCR mismatches
  if (ocrComparison.mismatches && ocrComparison.mismatches.length > 0) {
    if (ocrComparison.mismatches.includes("batchNumber")) {
      indicators.push("OCR batch number mismatch with registered pharmaceutical record");
      warnings.push("AI-assisted visual analysis indicates printed batch number does not match registered manufacturer records.");
    }
    if (ocrComparison.mismatches.includes("medicineName")) {
      indicators.push("OCR medicine name mismatch");
      warnings.push("AI-assisted visual analysis indicates packaging title differs from registered drug identity.");
    }
    if (ocrComparison.mismatches.includes("manufacturer")) {
      indicators.push("OCR manufacturer name mismatch");
      warnings.push("AI-assisted visual analysis indicates printed manufacturer differs from marketing authorization holder.");
    }
  }

  // Add any direct observations from vision API
  if (Array.isArray(visualData.rawWarnings)) {
    visualData.rawWarnings.forEach((w) => {
      if (w && !warnings.includes(w)) warnings.push(`AI-assisted visual observation: ${w}`);
    });
  }

  let riskLevel = "LOW";
  if (indicators.length >= 2 || (ocrComparison.mismatches && ocrComparison.mismatches.includes("batchNumber"))) {
    riskLevel = "HIGH";
  } else if (indicators.length === 1 || packaging === "UNKNOWN" || label === "UNKNOWN") {
    riskLevel = "MEDIUM";
  }

  return {
    riskLevel,
    indicators,
    warnings,
    packagingCondition: packaging,
    labelIntegrity: label,
    assessmentNote: "AI-assisted visual analysis of exterior tablet or packaging characteristics",
  };
}

/**
 * Deterministically validates detected vs registered expiry dates against current system time.
 */
export function evaluateExpiryDate(detectedExpiryStr, registeredExpiryStr) {
  const now = new Date();
  let expiryStatus = "UNKNOWN";
  let isExpired = false;
  let detectedDate = null;
  let registeredDate = null;

  if (registeredExpiryStr) {
    registeredDate = new Date(registeredExpiryStr);
  }
  if (detectedExpiryStr) {
    detectedDate = new Date(detectedExpiryStr);
  }

  const effectiveDate = detectedDate && !isNaN(detectedDate.getTime()) ? detectedDate : registeredDate;

  if (effectiveDate && !isNaN(effectiveDate.getTime())) {
    if (effectiveDate < now) {
      expiryStatus = "EXPIRED";
      isExpired = true;
    } else {
      expiryStatus = "VALID";
      isExpired = false;
    }
  }

  const expiryMatch =
    Boolean(detectedDate && registeredDate) &&
    detectedDate.getFullYear() === registeredDate.getFullYear() &&
    detectedDate.getMonth() === registeredDate.getMonth();

  return {
    detectedExpiryDate: detectedExpiryStr || null,
    registeredExpiryDate: registeredExpiryStr || null,
    expiryMatch: detectedExpiryStr ? expiryMatch : true,
    expiryStatus,
    isExpired,
  };
}

/**
 * Generates clear, explainable, human-readable findings for the AI analysis module.
 */
export function generateExplainableFindings({ visualData, ocrComparison, tamperingRisk, expiryEval }) {
  const findings = [];
  const warnings = [...(tamperingRisk.warnings || [])];

  if (ocrComparison.fields) {
    if (ocrComparison.fields.medicineName?.match) {
      findings.push("✓ Medicine Name Detected: Printed text matches registered pharmaceutical identity.");
    } else if (ocrComparison.fields.medicineName?.status === "MISMATCH") {
      warnings.push(`⚠ Medicine Name Discrepancy: Extracted "${ocrComparison.fields.medicineName.extracted}" differs from expected.`);
    }

    if (ocrComparison.fields.batchNumber?.match) {
      findings.push("✓ Batch Number Detected: Printed batch identifier matches registered lot code.");
    } else if (ocrComparison.fields.batchNumber?.status === "MISMATCH") {
      warnings.push(`⚠ Batch Identifier Discrepancy: Extracted "${ocrComparison.fields.batchNumber.extracted}" differs from registered.`);
    }

    if (ocrComparison.fields.manufacturer?.match) {
      findings.push("✓ Manufacturer Detected: Packaging imprint reflects authorized manufacturing authority.");
    }
  }

  if (tamperingRisk.packagingCondition === "INTACT") {
    findings.push("✓ Packaging Condition: AI-assisted visual analysis indicates tablet packaging appears intact.");
  }
  if (tamperingRisk.labelIntegrity === "CLEAR") {
    findings.push("✓ Label Print Integrity: Printed text and graphics appear clear and uncompromised.");
  }

  if (expiryEval.isExpired) {
    warnings.push(`⚠ Expired Product: Detected expiry date (${expiryEval.detectedExpiryDate || expiryEval.registeredExpiryDate}) has passed.`);
  }

  return { findings, warnings };
}
