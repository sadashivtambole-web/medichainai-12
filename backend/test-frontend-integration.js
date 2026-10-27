import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API = "http://localhost:5000/api";
const CREATOR_EMAIL = process.env.CREATOR_EMAIL || "sadashivtambole@gmail.com";
const CREATOR_PASSWORD = process.env.CREATOR_PASSWORD || "Shiva@123";

async function testWorkflow() {
  console.log("==================================================================");
  console.log("PART 4: FRONTEND-BACKEND INTEGRATION & WORKFLOW VALIDATION SUITE");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // ── TEST 1: Health Check ──
  console.log("\n--- TEST 1: Server Health Check ---");
  try {
    const health = await axios.get("http://localhost:5000/api/health");
    assert(health.status === 200, "Health check status 200");
    assert(health.data.status === "HEALTHY", "API status is HEALTHY");
    assert(health.data.database === "CONNECTED", "MongoDB is CONNECTED");
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // ── TEST 2: Creator Authentication & Privileges ──
  console.log("\n--- TEST 2: Creator / Admin Flow ---");
  let creatorToken = "";
  try {
    // Login as Creator using credentials from .env
    const res = await axios.post(`${API}/auth/login`, {
      email: CREATOR_EMAIL,
      password: CREATOR_PASSWORD,
    });
    assert(res.data.success === true, "Creator login successful");
    assert(!!res.data.data?.token, "JWT token returned for Creator");
    assert(res.data.data?.user?.role === "Creator", "Role is Creator");
    creatorToken = res.data.data.token;

    // Fetch Creator Stats
    const stats = await axios.get(`${API}/creator/stats`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    });
    assert(stats.data.success === true, "Creator stats API responds");
    assert(typeof stats.data.data.registeredMedicines === "number", "Real registered medicines count returned");

    // Fetch Cryptographic DrugChain Audit
    const audit = await axios.get(`${API}/creator/blockchain/audit`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    });
    assert(audit.data.success === true, "DrugChain cryptographic audit succeeds");
    assert(audit.data.data.valid === true, "Blockchain ledger integrity is cryptographically valid");
  } catch (err) {
    assert(false, `Creator flow failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 3: User Registration & Approval Flow ──
  console.log("\n--- TEST 3: Registration & Approval Flow ---");
  const uniqueId = Date.now().toString().slice(-5);
  const mfrEmail = `sunpharma_${uniqueId}@testmail.com`;
  let mfrToken = "";

  try {
    // Register as Manufacturer using FormData
    const formData = new FormData();
    formData.append("fullName", `Sun Pharma Representative ${uniqueId}`);
    formData.append("email", mfrEmail);
    formData.append("password", "MfrPassword123!");
    formData.append("confirmPassword", "MfrPassword123!");
    formData.append("role", "Manufacturer");
    formData.append("phone", "+91 9876543210");
    formData.append("companyName", "Sun Pharmaceuticals Ltd");
    formData.append("companyCode", `SUN-MFR-${uniqueId}`);
    formData.append("governmentIdType", "Pharmacy Manufacturing License");

    // Attach tiny PNG blob as identityPhoto and governmentId
    const dummyBlob = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")], { type: "image/png" });
    formData.append("identityPhoto", dummyBlob, "identity.png");
    formData.append("governmentId", dummyBlob, "license.png");

    const regRes = await axios.post(`${API}/auth/register`, formData);

    assert(regRes.data.success === true, "Manufacturer registration submitted");
    assert(regRes.data.data.accountStatus === "PENDING", "Professional account initialized as PENDING");
    const mfrUserId = regRes.data.data.user.id || regRes.data.data.user._id;

    // Attempt login before approval (Negative test -> must fail with 403)
    try {
      await axios.post(`${API}/auth/login`, {
        email: mfrEmail,
        password: "MfrPassword123!",
      });
      assert(false, "Unapproved user should NOT be able to log in");
    } catch (loginErr) {
      assert(loginErr.response?.status === 403, "Login denied with 403 for PENDING user");
    }

    // Creator Approves Candidate
    const appRes = await axios.patch(
      `${API}/creator/users/${mfrUserId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(appRes.data.success === true, "Creator approved candidate account");

    // Login after approval (Must succeed)
    const mfrLogin = await axios.post(`${API}/auth/login`, {
      email: mfrEmail,
      password: "MfrPassword123!",
    });
    assert(mfrLogin.data.success === true, "Approved user logged in successfully");
    mfrToken = mfrLogin.data.data.token;
  } catch (err) {
    assert(false, `Registration / approval flow failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 4: Manufacturer Medicine Registration on Blockchain ──
  console.log("\n--- TEST 4: Medicine Registration on DrugChain ---");
  const testBatch = `BATCH-${uniqueId}`;
  let registeredMed = null;
  try {
    const medRes = await axios.post(
      `${API}/medicines`,
      {
        manufacturerName: "Sun Pharma Specialist",
        companyName: "Sun Pharmaceuticals Ltd",
        manufacturerCode: `SUN-MFR-${uniqueId}`,
        medicineName: `Amoxicillin ${uniqueId}mg`,
        batchNumber: testBatch,
        manufacturingDate: "2024-01-10",
        expiryDate: "2027-01-10",
        price: "₹185.00",
        quantity: 5000,
      },
      { headers: { Authorization: `Bearer ${mfrToken}` } }
    );

    assert(medRes.data.success === true, "Medicine registered successfully");
    registeredMed = medRes.data.data;
    assert(registeredMed.batchId === testBatch, "Batch ID stored accurately");
    assert(!!registeredMed.blockchainTxHash, "DrugChain transaction hash created");
    assert(registeredMed.transferHistory?.length === 1, "Initial custody step is Manufacturer");
  } catch (err) {
    assert(false, `Medicine registration failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 5: QR Code Generation (Signed HMAC Token) ──
  console.log("\n--- TEST 5: Cryptographic QR Generation ---");
  let qrPayload = "";
  try {
    const qrRes = await axios.post(`${API}/qr/generate`, {
      medicineId: registeredMed.id,
      batchId: testBatch,
    });
    assert(qrRes.data.success === true, "QR generation API responded");
    assert(!!qrRes.data.data.token, "HMAC-SHA256 signed token generated");
    qrPayload = qrRes.data.data.token;
  } catch (err) {
    assert(false, `QR generation failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 6: Distributor Custody Receipt & Forwarding ──
  console.log("\n--- TEST 6: Distributor Custody Transition ---");
  try {
    const incoming = await axios.get(`${API}/transfers/incoming`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    });
    assert(incoming.data.success === true, "Incoming transfers retrieved");
    const targetTransfer = incoming.data.data.find((t) => t.batchId === testBatch);
    assert(!!targetTransfer, "Automated transfer order found for new batch");

    // Distributor Confirms Receipt
    const confirmRes = await axios.post(
      `${API}/transfers/${targetTransfer.id}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(confirmRes.data.success === true, "Distributor confirmed receipt on DrugChain");

    // Distributor Forwards to Pharmacy
    const forwardRes = await axios.post(
      `${API}/transfers/${targetTransfer.id}/forward`,
      { destinationPharmacy: "Apollo Pharmacy Central" },
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(forwardRes.data.success === true, "Batch forwarded to pharmacy on DrugChain");
  } catch (err) {
    assert(false, `Distributor flow failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 7: Pharmacy Receipt & Shelf Confirmation ──
  console.log("\n--- TEST 7: Pharmacy Receipt & Confirmation ---");
  try {
    const pharmConfirm = await axios.post(
      `${API}/pharmacy/${testBatch}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(pharmConfirm.data.success === true, "Pharmacy shelf receipt confirmed on DrugChain");
    assert(pharmConfirm.data.data.currentHolder === "Pharmacy Shelf", "Current holder updated to Pharmacy Shelf");
  } catch (err) {
    assert(false, `Pharmacy receipt failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 8: Public Customer Verification by Code & Signed QR ──
  console.log("\n--- TEST 8: Public Verification & Audit Report ---");
  try {
    // A. Verify by Batch ID
    const verifyRes = await axios.get(`${API}/public/verify/${testBatch}`);
    assert(verifyRes.data.success === true, "Public verification API responded");
    assert(verifyRes.data.data.result?.status === "AUTHENTIC", "Authenticity status is AUTHENTIC");
    assert(verifyRes.data.data.result?.score >= 90, `Authenticity score is high (${verifyRes.data.data.result?.score}/100)`);
    assert(verifyRes.data.data.layers?.blockchain === "VERIFIED", "DrugChain layer verified (VERIFIED)");
    assert(verifyRes.data.data.layers?.supplyChain === "VALID", "Supply chain custody verified");

    // B. Verify by Signed QR Token
    const qrVerify = await axios.post(`${API}/qr/verify`, {
      code: qrPayload,
    });
    assert(qrVerify.data.success === true, "Signed QR verified successfully");
    assert(qrVerify.data.data.checks?.qr?.status === "VERIFIED", "HMAC QR signature cryptographically verified");
  } catch (err) {
    assert(false, `Public verification failed: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST 9: Negative & Edge Case Tests ──
  console.log("\n--- TEST 9: Negative Testing & Anti-Counterfeit Detection ---");
  try {
    // A. Query completely non-existent / counterfeit code
    const fakeCode = "FAKE-DRUG-UNREGISTERED-999";
    const fakeRes = await axios.get(`${API}/public/verify/${fakeCode}`);
    assert(fakeRes.data.data.isFake === true, "Unregistered drug flagged as isFake=true");
    assert(fakeRes.data.data.result?.score === 0, "Fake drug authenticity score is 0");
    assert(fakeRes.data.data.layers?.database === "NOT_FOUND_UNREGISTERED", "Database layer shows NOT_FOUND_UNREGISTERED");
    assert(fakeRes.data.data.layers?.blockchain === "UNVERIFIED_NOT_ON_CHAIN", "Blockchain layer shows UNVERIFIED_NOT_ON_CHAIN");

    // B. Tampered / modified QR signature
    if (qrPayload) {
      const tamperedQr = qrPayload.slice(0, -6) + "XXXXXX";
      const tamperedRes = await axios.post(`${API}/qr/verify`, { code: tamperedQr });
      assert(
        tamperedRes.data.data.checks?.qr?.status === "INVALID_SIGNATURE" ||
        tamperedRes.data.data.layers?.qr === "INVALID_SIGNATURE",
        "Tampered QR token signature flagged as INVALID_SIGNATURE"
      );
    }

    // C. Duplicate Batch Registration (Must be rejected with 409)
    try {
      await axios.post(
        `${API}/medicines`,
        {
          manufacturerName: "Sun Pharma Specialist",
          companyName: "Sun Pharmaceuticals Ltd",
          manufacturerCode: `SUN-MFR-${uniqueId}`,
          medicineName: `Amoxicillin ${uniqueId}mg`,
          batchNumber: testBatch, // DUPLICATE BATCH
          manufacturingDate: "2024-01-10",
          expiryDate: "2027-01-10",
        },
        { headers: { Authorization: `Bearer ${mfrToken}` } }
      );
      assert(false, "Duplicate batch registration should fail");
    } catch (dupErr) {
      assert(dupErr.response?.status === 409, "Duplicate batch registration rejected with 409 Conflict");
    }

    // D. Invalid Expiry Date (Expiry before Manufacturing)
    try {
      await axios.post(
        `${API}/medicines`,
        {
          manufacturerName: "Sun Pharma Specialist",
          companyName: "Sun Pharmaceuticals Ltd",
          manufacturerCode: `SUN-MFR-${uniqueId}`,
          medicineName: "Invalid Dates Medicine",
          batchNumber: `INVALID-DATES-${uniqueId}`,
          manufacturingDate: "2025-01-10",
          expiryDate: "2024-01-10", // Expiry before mfg date
        },
        { headers: { Authorization: `Bearer ${mfrToken}` } }
      );
      assert(false, "Medicine with invalid dates should fail");
    } catch (dateErr) {
      assert(dateErr.response?.status === 400, "Invalid dates rejected with 400 Bad Request");
    }
  } catch (err) {
    assert(false, `Negative testing error: ${err.response?.data?.message || err.message}`);
  }

  // ── TEST SUMMARY ──
  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed === 0) {
    console.log(">>> ALL FRONTEND-BACKEND INTEGRATION TESTS PASSED CLEANLY! <<<");
  } else {
    console.error(`>>> ${failed} TEST(S) FAILED. REVIEW REQUIRED. <<<`);
    process.exit(1);
  }
}

testWorkflow().catch(console.error);
