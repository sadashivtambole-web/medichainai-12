/**
 * Central AI Service Orchestrator
 * Coordinates image quality validation, Gemini multimodal vision inspection,
 * OCR text extraction and database comparison, packaging tampering evaluation,
 * and explainable AI signals generation.
 */

import { executeVisionAnalysis, validateImageFile } from "./imageAnalysis.service.js";
import { compareOcrWithDatabase, getOcrConfidenceInfo } from "./ocr.service.js";
import {
  evaluatePackagingRisk,
  evaluateExpiryDate,
  generateExplainableFindings,
} from "./riskAnalysis.service.js";
import { logger } from "../../utils/logger.js";

export const aiService = {
  /**
   * Pre-flights an image file without running API calls.
   */
  validateImage(imageFile) {
    return validateImageFile(imageFile);
  },

  /**
   * Full end-to-end AI medicine packaging analysis.
   */
  async analyzeMedicinePackaging({ imageFile = null, formMetadata = {}, registeredMedicine = null }) {
    // 1. If no image provided, return graceful fallback
    if (!imageFile) {
      return {
        available: false,
        status: "NO_IMAGE",
        confidence: null,
        confidenceAvailable: false,
        message: "No medicine image provided for visual analysis",
        extractedData: {
          medicineName: formMetadata.medicineName || registeredMedicine?.name || "",
          batchNumber: formMetadata.batchNumber || registeredMedicine?.batchId || "",
          manufacturer: formMetadata.companyName || registeredMedicine?.company || "",
          manufacturingDate: "",
          expiryDate: "",
        },
        comparison: null,
        tamperingAnalysis: { riskLevel: "UNKNOWN", indicators: [], warnings: [] },
        expiryAnalysis: evaluateExpiryDate(null, registeredMedicine?.expiryDate || formMetadata.expiryDate),
        findings: ["Visual inspection skipped: No image uploaded"],
        warnings: [],
        trainedModelPresent: false,
        mlModelNote:
          "Current system uses AI-assisted image analysis and rule-based risk evaluation; a trained counterfeit classifier can be added later.",
      };
    }

    // 2. Pre-flight image validation check
    const validation = validateImageFile(imageFile);
    if (!validation.isValid) {
      logger.warn("Image validation failed prior to AI execution", { code: validation.code, error: validation.error });
      return {
        available: false,
        status: validation.code,
        confidence: null,
        confidenceAvailable: false,
        message: validation.error,
        extractedData: null,
        comparison: null,
        tamperingAnalysis: { riskLevel: "HIGH", indicators: [validation.code], warnings: [validation.error] },
        expiryAnalysis: evaluateExpiryDate(null, registeredMedicine?.expiryDate || formMetadata.expiryDate),
        findings: [],
        warnings: [`Image Quality Warning: ${validation.error}`],
        trainedModelPresent: false,
        mlModelNote:
          "Current system uses AI-assisted image analysis and rule-based risk evaluation; a trained counterfeit classifier can be added later.",
      };
    }

    // 3. Execute Multimodal Vision & OCR Analysis
    const expectedData = {
      medicineName: formMetadata.medicineName || registeredMedicine?.name || "",
      batchNumber: formMetadata.batchNumber || registeredMedicine?.batchId || "",
      companyName: formMetadata.companyName || registeredMedicine?.company || registeredMedicine?.manufacturer || "",
      manufacturingDate: formMetadata.manufacturingDate || registeredMedicine?.manufacturingDate || "",
      expiryDate: formMetadata.expiryDate || registeredMedicine?.expiryDate || "",
    };

    const visionResult = await executeVisionAnalysis(imageFile, expectedData);

    // 4. Handle AI failure / offline fallback gracefully
    if (!visionResult.available || !visionResult.success) {
      return {
        available: false,
        status: visionResult.status || "AI_UNAVAILABLE",
        confidence: null,
        confidenceAvailable: false,
        message: visionResult.message || "AI image inspection is temporarily unavailable",
        extractedData: {
          medicineName: expectedData.medicineName,
          batchNumber: expectedData.batchNumber,
          manufacturer: expectedData.companyName,
          manufacturingDate: expectedData.manufacturingDate,
          expiryDate: expectedData.expiryDate,
        },
        comparison: null,
        tamperingAnalysis: { riskLevel: "UNKNOWN", indicators: [], warnings: [] },
        expiryAnalysis: evaluateExpiryDate(null, expectedData.expiryDate),
        findings: ["AI vision service running in fallback mode"],
        warnings: [],
        trainedModelPresent: false,
        mlModelNote:
          "Current system uses AI-assisted image analysis and rule-based risk evaluation; a trained counterfeit classifier can be added later.",
      };
    }

    // 5. Run structured OCR text comparison against database / expected values
    const ocrComparison = compareOcrWithDatabase(visionResult.extractedData, expectedData);

    // 6. Run Tampering & Packaging Integrity Risk Analysis
    const tamperingRisk = evaluatePackagingRisk({
      visualData: {
        packagingCondition: visionResult.extractedData.packagingCondition,
        labelIntegrity: visionResult.extractedData.labelIntegrity,
        rawWarnings: visionResult.rawWarnings,
      },
      ocrComparison,
    });

    // 7. Deterministic Expiry Assessment
    const expiryEval = evaluateExpiryDate(
      visionResult.extractedData.expiryDate,
      expectedData.expiryDate
    );

    // 8. Generate Explainable Findings & Warnings
    const { findings, warnings } = generateExplainableFindings({
      visualData: visionResult,
      ocrComparison,
      tamperingRisk,
      expiryEval,
    });

    // 9. OCR Confidence Measurement (Honest reporting according to STEP 6)
    const confidenceInfo = getOcrConfidenceInfo(null);

    // 10. Synthesize Final AI Status
    const aiStatus =
      ocrComparison.allMatched && tamperingRisk.riskLevel === "LOW"
        ? "PASS"
        : ocrComparison.mismatches.includes("batchNumber")
        ? "MISMATCH"
        : "SUSPICIOUS";

    return {
      available: true,
      status: aiStatus,
      confidence: confidenceInfo.confidence,
      confidenceAvailable: confidenceInfo.confidenceAvailable,
      confidenceSource: confidenceInfo.confidenceSource,
      modelProvider: visionResult.modelProvider || "Gemini Multimodal Vision",
      extractedData: visionResult.extractedData,
      comparison: ocrComparison,
      tamperingAnalysis: tamperingRisk,
      expiryAnalysis: expiryEval,
      findings,
      warnings,
      trainedModelPresent: false,
      mlModelNote:
        "Current system uses AI-assisted image analysis and rule-based risk evaluation; a trained counterfeit classifier can be added later.",
    };
  },
};
