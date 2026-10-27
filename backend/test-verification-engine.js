/**
 * Automated Test Suite for Authenticity Verification Engine (PART 2)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Medicine } from "./models.js";
import {
  generateSecureQRToken,
  parseAndVerifyQRToken,
  validateExpiry,
  validateSupplyChainCustody,
  processAIAndOCR,
  runFullAuthenticityAudit,
} from "./services/verificationEngine.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fake_drug_detection";

async function runTests() {
  await mongoose.connect(MONGO_URI);
  await Medicine.updateOne({ id: "MED-2024-001" }, { $set: { verificationCount: 0, qrReuseRisk: "LOW" } });
  console.log("\n🧪 ════════════════════════════════════════════════════════════");
  console.log("   AUTHENTICITY VERIFICATION ENGINE TEST SUITE (PART 2)");
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

  // TEST 1: Valid Medicine Verification (AUTHENTIC)
  console.log("📌 Group 1: Valid Medicine Verification");
  try {
    const res = await runFullAuthenticityAudit({ queryCode: "MED-2024-001" });
    assert(res.success === true, "TEST 1: Valid medicine query returns success true");
    assert(res.result.status === "AUTHENTIC", "TEST 1: Status is AUTHENTIC", `(Received: ${res.result.status})`);
    assert(res.result.score >= 90, "TEST 1: Score is >= 90", `(Score: ${res.result.score})`);
  } catch (err) {
    assert(false, "TEST 1: Valid medicine query", err.message);
  }

  // TEST 2: Medicine Does Not Exist
  console.log("\n📌 Group 2: Non-existent Medicine Verification");
  try {
    const res = await runFullAuthenticityAudit({ queryCode: "NON_EXISTENT_BATCH_9999" });
    assert(res.success === true, "TEST 2: Non-existent query returns safe response without crashing");
    assert(res.isFake === true, "TEST 2: Marked as isFake true");
    assert(res.result.status === "LIKELY COUNTERFEIT", "TEST 2: Status is LIKELY COUNTERFEIT", `(Received: ${res.result.status})`);
    assert(res.result.score === 0, "TEST 2: Score is 0");
  } catch (err) {
    assert(false, "TEST 2: Non-existent medicine query", err.message);
  }

  // TEST 3: Invalid QR Payload Parsing
  console.log("\n📌 Group 3: Invalid QR Handling");
  try {
    const parsed = parseAndVerifyQRToken("");
    assert(parsed.isValid === false, "TEST 3: Empty string QR parsed as invalid");
    assert(parsed.status === "INVALID_QR", "TEST 3: Status is INVALID_QR");
  } catch (err) {
    assert(false, "TEST 3: Invalid QR handling", err.message);
  }

  // TEST 4: Modified / Tampered QR Signature
  console.log("\n📌 Group 4: Cryptographically Tampered QR Signature");
  try {
    const tamperedPayload = Buffer.from(JSON.stringify({ mId: "MED-2024-001", bId: "BATCH-001", ts: Date.now(), sig: "deadbeef_fake_signature" })).toString("base64url");
    const parsed = parseAndVerifyQRToken(tamperedPayload);
    assert(parsed.isValid === false, "TEST 4: Tampered QR signature detected as invalid");
    assert(parsed.status === "MODIFIED_QR_SIGNATURE_MISMATCH", "TEST 4: Status is MODIFIED_QR_SIGNATURE_MISMATCH");
  } catch (err) {
    assert(false, "TEST 4: Tampered QR handling", err.message);
  }

  // TEST 5: Valid QR Payload Reference Parsing
  console.log("\n📌 Group 5: Secure Signed QR Token Generation & Parsing");
  try {
    const tokenData = generateSecureQRToken("MED-2024-001", "BATCH-001");
    const parsed = parseAndVerifyQRToken(tokenData.token);
    assert(parsed.isValid === true, "TEST 5: Valid HMAC signed QR token parses successfully");
    assert(parsed.isSignedToken === true, "TEST 5: Recognized as isSignedToken");
    assert(parsed.batchId === "BATCH-001", "TEST 5: Extracted batchId correctly");
  } catch (err) {
    assert(false, "TEST 5: Valid signed QR token parsing", err.message);
  }

  // TEST 6: OCR Batch Mismatch Signal
  console.log("\n📌 Group 6: OCR Text Match / Mismatch Logic");
  try {
    const ocrRes = await processAIAndOCR(null, { medicineName: "Paracetamol", batchNumber: "BATCH-123", companyName: "Pfizer" });
    assert(ocrRes.available === false, "TEST 6: Gracefully returns available false when no image provided");
    assert(ocrRes.status === "UNAVAILABLE", "TEST 6: OCR status is UNAVAILABLE");
  } catch (err) {
    assert(false, "TEST 6: OCR mismatch signal", err.message);
  }

  // TEST 7: Expired Medicine Date Handling
  console.log("\n📌 Group 7: Expiry Validation Rules");
  try {
    const validExp = validateExpiry("2023-01-01", "2028-12-31");
    assert(validExp.expiryStatus === "VALID", "TEST 7A: Future expiry date is VALID");

    const pastExp = validateExpiry("2020-01-01", "2021-01-01");
    assert(pastExp.expiryStatus === "EXPIRED", "TEST 7B: Past expiry date is EXPIRED");
    assert(pastExp.isExpired === true, "TEST 7B: isExpired flag is true");
  } catch (err) {
    assert(false, "TEST 7: Expiry validation rules", err.message);
  }

  // TEST 8: Supply Chain Custody Sequence Validation
  console.log("\n📌 Group 8: Supply Chain Sequence Validation");
  try {
    const validChain = validateSupplyChainCustody({
      company: "Acme Pharma",
      transferHistory: [
        { step: 1, role: "Manufacturer" },
        { step: 2, role: "Distributor" },
        { step: 3, role: "Pharmacy" },
      ],
    });
    assert(validChain.status === "VALID", "TEST 8A: Complete Manufacturer -> Distributor -> Pharmacy sequence is VALID");

    const invalidHopChain = validateSupplyChainCustody({
      company: "Acme Pharma",
      transferHistory: [
        { step: 1, role: "Manufacturer" },
        { step: 2, role: "Pharmacy" }, // Skipped Distributor!
      ],
    });
    assert(invalidHopChain.status === "SUSPICIOUS", "TEST 8B: Direct Manufacturer -> Pharmacy jump marked as SUSPICIOUS");
    assert(invalidHopChain.issues.length > 0, "TEST 8B: Custody hop issue reported in issues array");
  } catch (err) {
    assert(false, "TEST 8: Supply chain sequence validation", err.message);
  }

  // TEST 9: AI Service Unavailable Fallback
  console.log("\n📌 Group 9: AI Service Fallback Test");
  try {
    const aiRes = await processAIAndOCR(null, {});
    assert(aiRes.status === "UNAVAILABLE", "TEST 9: AI service fallback mode returns UNAVAILABLE cleanly");
  } catch (err) {
    assert(false, "TEST 9: AI service fallback", err.message);
  }

  // TEST 10: Fully Valid Medicine Score
  console.log("\n📌 Group 10: High Authenticity Score Calculation");
  try {
    const res = await runFullAuthenticityAudit({ queryCode: "MED-2024-001" });
    assert(res.result.score >= 90, `TEST 10: Authentic medicine gets score >= 90 (Score: ${res.result.score})`);
    assert(res.reasons.length > 0, "TEST 10: Returns human-readable explainable reasons");
  } catch (err) {
    assert(false, "TEST 10: High authenticity score", err.message);
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`🏁 VERIFICATION ENGINE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
