/**
 * Comprehensive Automated Test Suite for AI Medicine Analysis Module (PART 3)
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { aiService } from "./services/ai/ai.service.js";
import { parseAndNormalizeAIResponse } from "./services/ai/aiResponseParser.js";
import { validateImageFile } from "./services/ai/imageAnalysis.service.js";
import { compareOcrString, compareOcrWithDatabase, getOcrConfidenceInfo } from "./services/ai/ocr.service.js";
import { evaluatePackagingRisk, evaluateExpiryDate, generateExplainableFindings } from "./services/ai/riskAnalysis.service.js";
import { runFullAuthenticityAudit } from "./services/verificationEngine.js";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fake_drug_detection";

async function runAITests() {
  console.log("\n🧪 ════════════════════════════════════════════════════════════");
  console.log("   AI MEDICINE ANALYSIS MODULE TEST SUITE (PART 3)");
  console.log("════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${testName} ${extraInfo}`);
      failed++;
    }
  }

  // Setup temporary test image files
  const testDir = path.resolve("scratch_ai_tests");
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // 1. Create a minimal valid JPEG image (with real JPEG magic header FF D8 FF E0)
  const validJpegPath = path.join(testDir, "valid_tablet.jpg");
  const validJpegBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    Buffer.alloc(300, 0xaa),
    Buffer.from([0xff, 0xd9]),
  ]);
  fs.writeFileSync(validJpegPath, validJpegBuffer);

  // 2. Create an invalid/corrupt image file (text content > 100 bytes with .jpg extension)
  const corruptImgPath = path.join(testDir, "corrupt_image.jpg");
  fs.writeFileSync(corruptImgPath, Buffer.from("THIS_IS_NOT_AN_IMAGE_JUST_PLAIN_TEXT_DUMMY_DATA_EXCEEDING_ONE_HUNDRED_BYTES_OF_CORRUPT_HEADER_STREAM_FOR_IMAGE_VALIDATION_TESTING_PURPOSES"));

  // 3. Create a low-quality / too-small file (< 100 bytes)
  const tinyImgPath = path.join(testDir, "tiny_image.jpg");
  fs.writeFileSync(tinyImgPath, Buffer.from([0xff, 0xd8, 0xff]));

  // Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI);
  } catch (dbErr) {
    console.warn("MongoDB connection notice:", dbErr.message);
  }

  // ── TEST 1: Valid Medicine Image Pre-flight & Structured AI Execution ──
  console.log("📌 Group 1: Image Validation & Pre-flight Checks");
  try {
    const valRes = validateImageFile(validJpegPath);
    assert(valRes.isValid === true, "TEST 1: Valid JPEG passes pre-flight image validation");
    assert(valRes.mimeType === "image/jpeg", "TEST 1: MIME type detected as image/jpeg");
  } catch (err) {
    assert(false, "TEST 1: Image validation", err.message);
  }

  // ── TEST 2: Invalid Image Detection ──
  console.log("\n📌 Group 2: Corrupt / Invalid Image Header Handling");
  try {
    const valRes = validateImageFile(corruptImgPath);
    assert(valRes.isValid === false, "TEST 2: Corrupt image file fails validation");
    assert(valRes.code === "IMAGE_INVALID", "TEST 2: Returns controlled error code IMAGE_INVALID", `(Received: ${valRes.code})`);
  } catch (err) {
    assert(false, "TEST 2: Corrupt image test", err.message);
  }

  // ── TEST 3: Missing Image Handling ──
  console.log("\n📌 Group 3: Missing Image Controlled Error");
  try {
    const missingRes = validateImageFile(null);
    assert(missingRes.isValid === false, "TEST 3: Missing image fails validation gracefully");
    assert(missingRes.code === "MISSING_IMAGE", "TEST 3: Returns code MISSING_IMAGE");
  } catch (err) {
    assert(false, "TEST 3: Missing image test", err.message);
  }

  // ── TEST 4: AI API Unavailable Fallback (Non-blocking) ──
  console.log("\n📌 Group 4: AI Service Graceful Fallback (API Offline)");
  try {
    // Calling analyzeMedicinePackaging with no image or mock offline state
    const fallbackRes = await aiService.analyzeMedicinePackaging({
      imageFile: null,
      formMetadata: { medicineName: "Amoxicillin", batchNumber: "AMX-500" },
    });
    assert(fallbackRes.available === false, "TEST 4: Reports available: false cleanly");
    assert(fallbackRes.status === "NO_IMAGE", "TEST 4: Returns controlled fallback status NO_IMAGE");
    assert(fallbackRes.trainedModelPresent === false, "TEST 4: Honestly reports trainedModelPresent: false");
    assert(typeof fallbackRes.mlModelNote === "string", "TEST 4: Provides clear ML model note without fake predictions");
  } catch (err) {
    assert(false, "TEST 4: AI fallback test", err.message);
  }

  // ── TEST 5: Defensive AI Response Parsing (Malformed & Markdown JSON) ──
  console.log("\n📌 Group 5: Malformed AI Response Parsing & Normalization");
  try {
    const markdownJson = `Here is the analysis:\n\`\`\`json\n{\n  "medicineName": "Paracetamol 500mg",\n  "batchNumber": "BT001",\n  "manufacturer": "XYZ Pharma Ltd.",\n  "packagingCondition": "INTACT",\n  "labelIntegrity": "CLEAR",\n  "status": "PASS",\n  "findings": ["Packaging clear and sealed"]\n}\n\`\`\``;
    const parsedMd = parseAndNormalizeAIResponse(markdownJson);
    assert(parsedMd.parseSuccess === true, "TEST 5A: Strips markdown fences and parses JSON");
    assert(parsedMd.medicineName === "Paracetamol 500mg", "TEST 5A: Extracted medicineName accurately");
    assert(parsedMd.packagingCondition === "INTACT", "TEST 5A: Normalized packagingCondition to INTACT");

    const brokenJson = `Some commentary: { "medicineName": "Aspirin", "batchNumber": "ASP-99" ...TRUNCATED BROKEN TEXT`;
    const parsedBroken = parseAndNormalizeAIResponse(brokenJson);
    assert(typeof parsedBroken === "object", "TEST 5B: Broken truncated JSON does not crash backend");
    assert(parsedBroken.medicineName === "Aspirin", "TEST 5B: Heuristically rescued available fields from broken text");
  } catch (err) {
    assert(false, "TEST 5: Response parser test", err.message);
  }

  // ── TEST 6: OCR Medicine Name Match ──
  console.log("\n📌 Group 6: OCR Text Normalization & Field Matching");
  try {
    const matchRes = compareOcrString("Paracetamol-500mg", "PARACETAMOL 500MG");
    assert(matchRes.status === "MATCH", "TEST 6A: OCR text comparison matches normalized values");

    const confTolerance = compareOcrString("BT001", "BTOO1"); // '0' vs 'O'
    assert(confTolerance.status === "MATCH", "TEST 6B: Tolerates common OCR character confusion ('0' vs 'O')");
  } catch (err) {
    assert(false, "TEST 6: OCR text match", err.message);
  }

  // ── TEST 7: OCR Batch Mismatch Signal ──
  console.log("\n📌 Group 7: OCR Batch Mismatch Detection");
  try {
    const mismatchRes = compareOcrWithDatabase(
      { medicineName: "Paracetamol", batchNumber: "FAKE-BATCH-999" },
      { name: "Paracetamol", batchId: "BT001" }
    );
    assert(mismatchRes.allMatched === false, "TEST 7: Batch mismatch correctly detected");
    assert(mismatchRes.mismatches.includes("batchNumber"), "TEST 7: mismatches includes 'batchNumber'");
    assert(mismatchRes.fields.batchNumber.status === "MISMATCH", "TEST 7: batchNumber status is MISMATCH");
  } catch (err) {
    assert(false, "TEST 7: OCR batch mismatch", err.message);
  }

  // ── TEST 8: OCR Expiry Extraction & Deterministic Backend Date Math ──
  console.log("\n📌 Group 8: Deterministic Backend Expiry Date Validation");
  try {
    const futureExpiry = evaluateExpiryDate("2029-12-31", "2029-12-31");
    assert(futureExpiry.expiryStatus === "VALID", "TEST 8A: Future expiry date is VALID");
    assert(futureExpiry.isExpired === false, "TEST 8A: isExpired is false");

    const pastExpiry = evaluateExpiryDate("2020-01-01", "2020-01-01");
    assert(pastExpiry.expiryStatus === "EXPIRED", "TEST 8B: Past expiry date is EXPIRED");
    assert(pastExpiry.isExpired === true, "TEST 8B: isExpired is true");
  } catch (err) {
    assert(false, "TEST 8: Expiry date validation", err.message);
  }

  // ── TEST 9: Low-Quality / Under-sized Image Rejection ──
  console.log("\n📌 Group 9: Low-Quality Image Quality Check");
  try {
    const tinyVal = validateImageFile(tinyImgPath);
    assert(tinyVal.isValid === false, "TEST 9: Image smaller than 100 bytes rejected");
    assert(tinyVal.code === "IMAGE_QUALITY_LOW", "TEST 9: Returns code IMAGE_QUALITY_LOW");
  } catch (err) {
    assert(false, "TEST 9: Low quality image test", err.message);
  }

  // ── TEST 10: AI Does NOT Override Blockchain Truth ──
  console.log("\n📌 Group 10: AI Subordination to Immutable Blockchain Ledger");
  try {
    // If a medicine has a blockchain mismatch or is fake, AI visual pass must NOT override it
    const fakeBatchAudit = await runFullAuthenticityAudit({ queryCode: "NON_EXISTENT_BATCH_9999" });
    assert(fakeBatchAudit.result.status === "LIKELY COUNTERFEIT", "TEST 10: Unregistered batch stays LIKELY COUNTERFEIT even if image exists");
    assert(fakeBatchAudit.result.score === 0, "TEST 10: Score remains 0 when blockchain proof is missing");
  } catch (err) {
    assert(false, "TEST 10: AI vs blockchain subordination", err.message);
  }

  // ── TEST 11: Non-AI Verification Continues When AI is Unavailable ──
  console.log("\n📌 Group 11: Non-AI Verification Resilience");
  try {
    // Valid medicine query without image: verification continues smoothly using QR + DB + Blockchain + Supply Chain
    const auditRes = await runFullAuthenticityAudit({ queryCode: "MED-2024-001", imageFile: null });
    assert(auditRes.success === true, "TEST 11: Audit completes successfully when AI image is absent");
    assert(["AUTHENTIC", "REVIEW"].includes(auditRes.result.status), "TEST 11: Verified authentic batch is validated via blockchain & QR proof", `(Status: ${auditRes.result.status})`);
    assert(auditRes.result.score >= 70, "TEST 11: Authenticity score remains high without AI", `(Score: ${auditRes.result.score})`);
    assert(auditRes.checks.ai.status === "UNAVAILABLE", "TEST 11: AI check status is transparently marked UNAVAILABLE");
  } catch (err) {
    assert(false, "TEST 11: Non-AI resilience", err.message);
  }

  // ── TEST 12: Multiple Suspicious Signals Elevates Risk ──
  console.log("\n📌 Group 12: Packaging & Tampering Risk Synthesis");
  try {
    const riskEval = evaluatePackagingRisk({
      visualData: { packagingCondition: "SUSPICIOUS", labelIntegrity: "TAMPERED", rawWarnings: ["Foil punctured"] },
      ocrComparison: { mismatches: ["batchNumber"] },
    });
    assert(riskEval.riskLevel === "HIGH", "TEST 12: Multiple suspicious signals correctly produce HIGH risk level");
    assert(riskEval.warnings.length >= 2, "TEST 12: Warnings contain multiple explainable warnings");
  } catch (err) {
    assert(false, "TEST 12: Risk synthesis test", err.message);
  }

  // ── TEST 13: OCR Confidence Honesty Check (No Fake Confidence) ──
  console.log("\n📌 Group 13: Honest Confidence Representation");
  try {
    const confInfo = getOcrConfidenceInfo(null);
    assert(confInfo.confidence === null, "TEST 13: Confidence is null when not measured by OCR library");
    assert(confInfo.confidenceAvailable === false, "TEST 13: confidenceAvailable is explicitly false");
  } catch (err) {
    assert(false, "TEST 13: Honest confidence check", err.message);
  }

  // Clean up scratch files
  try {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}

  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`🏁 AI MODULE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

runAITests();
