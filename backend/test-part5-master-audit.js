/**
 * PART 5: FINAL INTEGRATION, TESTING, SECURITY AUDIT & MASTER VERIFICATION SUITE
 * 
 * Verifies end-to-end integration across:
 * - Admin / Creator Governance
 * - User Registration, Approval & RBAC Enforcement
 * - User Account Status (PENDING, APPROVED, SUSPENDED)
 * - Medicine Registration, SHA-256 Hashing & DrugChain Block Minting
 * - Cryptographic QR Generation (HMAC-SHA256 Token Signing)
 * - Distributor Custody & DrugChain Transit Tracking
 * - Pharmacy Receipt & Shelf Confirmation
 * - Customer Public Verification (6-Layer Audit Engine)
 * - Authentic Medicine Verification
 * - Tampered QR HMAC Signature Detection
 * - Non-existent / Malformed QR Handling
 * - Expired Medicine Detection
 * - Supply Chain Sequence Custody Anomaly Detection
 * - Blockchain Data Hash Integrity Detection
 * - Anti-Cloning Scan Frequency Risk Penalty
 * - AI / OCR Fallback & Resilience
 * - File Upload Security Filter (Malicious executable rejection)
 * - Information Leakage & Secret Sanitization
 */

import axios from "axios";
import dotenv from "dotenv";
import { calculateMedicineDataHash } from "./blockchain.js";
import { validateExpiry, validateSupplyChainCustody } from "./services/verificationEngine.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const API = process.env.VITE_API_URL || `http://localhost:${PORT}/api`;
const CREATOR_EMAIL = process.env.CREATOR_EMAIL || "sadashivtambole@gmail.com";
const CREATOR_PASSWORD = process.env.CREATOR_PASSWORD || "Shiva@123";

async function runPart5MasterAudit() {
  console.log("══════════════════════════════════════════════════════════════════════════════════");
  console.log("   PART 5: FINAL INTEGRATION, SECURITY AUDIT & END-TO-END MASTER SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════════════\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      failedTests++;
      console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    }
  }

  const nonce = Math.floor(10000 + Math.random() * 90000);
  const mfgEmail = `mfg_p5_${nonce}@auditmail.com`;
  const distEmail = `dist_p5_${nonce}@auditmail.com`;
  const pharmEmail = `pharm_p5_${nonce}@auditmail.com`;
  const custEmail = `cust_p5_${nonce}@auditmail.com`;
  const testPassword = "AuditPassword@2026";

  let creatorToken = "";
  let mfgToken = "";
  let distToken = "";
  let pharmToken = "";
  let custToken = "";

  let mfgUserId = "";
  let distUserId = "";
  let pharmUserId = "";
  let custUserId = "";

  let registeredMedId = "";
  let registeredBatchId = `BATCH-P5-${nonce}`;
  let signedQrToken = "";
  let transferId = "";

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: SYSTEM ARCHITECTURE & PRE-FLIGHT HEALTH
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("📌 SECTION 1: System Architecture & Pre-flight Health Check");
  try {
    const healthRes = await axios.get(`${API}/health`);
    assert(healthRes.status === 200, "Health check endpoint returns HTTP 200");
    assert(healthRes.data?.status === "HEALTHY", "System status is reported as HEALTHY");
    assert(healthRes.data?.database === "CONNECTED", "MongoDB database connection is CONNECTED");

    const chainStatus = await axios.get(`${API}/blockchain/status`);
    assert(chainStatus.data?.success === true, "DrugChain status endpoint responds successfully");
    assert(typeof chainStatus.data?.data?.chainLength === "number", "DrugChain height/chainLength is actively reported");
  } catch (err) {
    assert(false, "System health pre-flight check failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: ADMIN / CREATOR GOVERNANCE & AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 2: Creator / Admin Governance & Blockchain Audit");
  try {
    // 2.1 Login with invalid password
    try {
      await axios.post(`${API}/auth/login`, {
        email: CREATOR_EMAIL,
        password: "WrongPassword@999",
      });
      assert(false, "Creator login with wrong password was unexpectedly accepted");
    } catch (err) {
      assert(err.response?.status === 401, "Creator login with incorrect password safely rejected with 401");
    }

    // 2.2 Legitimate Creator Login
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: CREATOR_EMAIL,
      password: CREATOR_PASSWORD,
    });
    assert(loginRes.data?.success === true, "Creator authenticated successfully");
    assert(!!loginRes.data?.data?.token, "Creator received valid JWT session token");
    assert(loginRes.data?.data?.user?.role === "Creator", "Authenticated user role is confirmed as Creator");
    creatorToken = loginRes.data?.data?.token;

    // 2.3 Creator Cryptographic Audit of DrugChain
    const auditRes = await axios.get(`${API}/creator/blockchain/audit`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    });
    assert(auditRes.data?.success === true, "Creator accessed DrugChain cryptographic audit endpoint");
    assert(auditRes.data?.data?.valid === true, "DrugChain passes 100% cryptographic block and hash integrity");
  } catch (err) {
    assert(false, "Creator governance flow failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: USER REGISTRATION, RBAC & LIFECYCLE GOVERNANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 3: User Registration, Lifecycle Status & Approval Flow");
  try {
    // 3.1 Public cannot register as Creator
    try {
      await axios.post(`${API}/auth/register`, {
        fullName: "Attacker Creator",
        email: `fakecreator_${nonce}@badactor.com`,
        password: testPassword,
        role: "Creator",
      });
      assert(false, "Public registration as Creator was unexpectedly accepted");
    } catch (err) {
      assert(err.response?.status === 403, "Public attempt to register as Creator strictly blocked with 403");
    }

    // 3.2 Register Manufacturer -> starts as PENDING
    const mfgForm = new FormData();
    mfgForm.append("fullName", `Apex Pharma Rep ${nonce}`);
    mfgForm.append("email", mfgEmail);
    mfgForm.append("password", testPassword);
    mfgForm.append("confirmPassword", testPassword);
    mfgForm.append("role", "Manufacturer");
    mfgForm.append("phone", "+91 9876543210");
    mfgForm.append("companyName", `Apex Pharma Labs ${nonce}`);
    mfgForm.append("companyCode", `APEX-LIC-${nonce}`);
    mfgForm.append("governmentIdType", "Drug Manufacturing License");
    const dummyBlob = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")], { type: "image/png" });
    mfgForm.append("identityPhoto", dummyBlob, "identity.png");
    mfgForm.append("governmentId", dummyBlob, "license.png");

    const mfgReg = await axios.post(`${API}/auth/register`, mfgForm);
    assert(mfgReg.data?.success === true, "Manufacturer registration submitted");
    assert(mfgReg.data?.data?.accountStatus === "PENDING", "Manufacturer account status initialized to PENDING");
    mfgUserId = mfgReg.data?.data?.user?.id || mfgReg.data?.data?.user?._id;

    // 3.3 Register Distributor -> starts as PENDING
    const distForm = new FormData();
    distForm.append("fullName", `MedExpress Logistics ${nonce}`);
    distForm.append("email", distEmail);
    distForm.append("password", testPassword);
    distForm.append("confirmPassword", testPassword);
    distForm.append("role", "Distributor");
    distForm.append("phone", "+91 9876543211");
    distForm.append("companyName", `MedExpress Distribution ${nonce}`);
    distForm.append("companyCode", `DIST-LIC-${nonce}`);
    distForm.append("identityPhoto", dummyBlob, "identity.png");
    distForm.append("governmentId", dummyBlob, "license.png");

    const distReg = await axios.post(`${API}/auth/register`, distForm);
    assert(distReg.data?.data?.accountStatus === "PENDING", "Distributor account status initialized to PENDING");
    distUserId = distReg.data?.data?.user?.id || distReg.data?.data?.user?._id;

    // 3.4 Register Pharmacy -> starts as PENDING
    const pharmForm = new FormData();
    pharmForm.append("fullName", `Metro Care Pharmacy ${nonce}`);
    pharmForm.append("email", pharmEmail);
    pharmForm.append("password", testPassword);
    pharmForm.append("confirmPassword", testPassword);
    pharmForm.append("role", "Pharmacy");
    pharmForm.append("phone", "+91 9876543212");
    pharmForm.append("companyName", `Metro Care Chemists ${nonce}`);
    pharmForm.append("companyCode", `PHARM-LIC-${nonce}`);
    pharmForm.append("identityPhoto", dummyBlob, "identity.png");
    pharmForm.append("governmentId", dummyBlob, "license.png");

    const pharmReg = await axios.post(`${API}/auth/register`, pharmForm);
    assert(pharmReg.data?.data?.accountStatus === "PENDING", "Pharmacy account status initialized to PENDING");
    pharmUserId = pharmReg.data?.data?.user?.id || pharmReg.data?.data?.user?._id;

    // 3.5 Register Customer -> active immediately
    const custReg = await axios.post(`${API}/auth/register`, {
      fullName: `John Doe ${nonce}`,
      email: custEmail,
      password: testPassword,
      role: "Customer",
    });
    assert(custReg.data?.success === true, "Customer registered successfully");
    custUserId = custReg.data?.data?.user?.id || custReg.data?.data?.user?._id;

    // 3.6 PENDING user cannot log in
    try {
      await axios.post(`${API}/auth/login`, {
        email: mfgEmail,
        password: testPassword,
      });
      assert(false, "Pending manufacturer was unexpectedly allowed to log in");
    } catch (err) {
      assert(err.response?.status === 403, "Pending manufacturer login correctly rejected with 403");
      const errCode = err.response?.data?.code;
      assert(errCode === "ACCOUNT_PENDING" || errCode === "ACCOUNT_PENDING_APPROVAL", `Error code is ACCOUNT_PENDING (${errCode})`);
    }

    // 3.7 Creator Approves Manufacturer, Distributor, Pharmacy
    const approveMfg = await axios.patch(
      `${API}/creator/users/${mfgUserId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(approveMfg.data?.data?.accountStatus === "APPROVED", "Creator approved Manufacturer account");

    const approveDist = await axios.patch(
      `${API}/creator/users/${distUserId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(approveDist.data?.data?.accountStatus === "APPROVED", "Creator approved Distributor account");

    const approvePharm = await axios.patch(
      `${API}/creator/users/${pharmUserId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(approvePharm.data?.data?.accountStatus === "APPROVED", "Creator approved Pharmacy account");

    // 3.8 Approved users can now log in
    const mfgLogin = await axios.post(`${API}/auth/login`, { email: mfgEmail, password: testPassword });
    mfgToken = mfgLogin.data?.data?.token;
    assert(!!mfgToken, "Approved Manufacturer successfully logged in and obtained JWT");

    const distLogin = await axios.post(`${API}/auth/login`, { email: distEmail, password: testPassword });
    distToken = distLogin.data?.data?.token;
    assert(!!distToken, "Approved Distributor successfully logged in and obtained JWT");

    const pharmLogin = await axios.post(`${API}/auth/login`, { email: pharmEmail, password: testPassword });
    pharmToken = pharmLogin.data?.data?.token;
    assert(!!pharmToken, "Approved Pharmacy successfully logged in and obtained JWT");

    const custLogin = await axios.post(`${API}/auth/login`, { email: custEmail, password: testPassword });
    custToken = custLogin.data?.data?.token;
    assert(!!custToken, "Customer successfully logged in and obtained JWT");
  } catch (err) {
    assert(false, "Registration and approval flow failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: RBAC & USER SUSPENSION GOVERNANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 4: Role-Based Access Control & User Account Suspension");
  try {
    // 4.1 Customer trying to access Manufacturer medicine registration -> 403 Forbidden
    try {
      await axios.post(
        `${API}/medicines`,
        {
          companyName: "Fake Meds",
          medicineName: "Unauthorized Drug",
          batchNumber: `BATCH-UNAUTH-${nonce}`,
          manufacturingDate: "2026-01-01",
          expiryDate: "2027-01-01",
          quantity: 10,
        },
        { headers: { Authorization: `Bearer ${custToken}` } }
      );
      assert(false, "Customer was unexpectedly allowed to register medicine");
    } catch (err) {
      assert(err.response?.status === 403, "Customer registration attempt blocked with 403 Forbidden");
    }

    // 4.2 Customer trying to confirm distributor transfer -> 403 Forbidden
    try {
      await axios.post(
        `${API}/transfers/TR-FAKE-123/confirm`,
        {},
        { headers: { Authorization: `Bearer ${custToken}` } }
      );
      assert(false, "Customer was unexpectedly allowed to confirm transfer");
    } catch (err) {
      assert(err.response?.status === 403, "Customer transfer confirm blocked with 403 Forbidden");
    }

    // 4.3 Distributor trying to approve users -> 403 Forbidden
    try {
      await axios.patch(
        `${API}/creator/users/${mfgUserId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${distToken}` } }
      );
      assert(false, "Distributor was unexpectedly allowed to approve users");
    } catch (err) {
      assert(err.response?.status === 403, "Distributor approval attempt blocked with 403 Forbidden");
    }

    // 4.4 Creator suspends Customer account -> Customer is blocked
    await axios.patch(
      `${API}/creator/users/${custUserId}/suspend`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    try {
      await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${custToken}` } });
      assert(false, "Suspended user was unexpectedly allowed to access profile");
    } catch (err) {
      assert(err.response?.status === 403, "Suspended user access blocked with 403");
      assert(err.response?.data?.code === "ACCOUNT_SUSPENDED", "Error code is ACCOUNT_SUSPENDED");
    }

    // 4.5 Creator reactivates Customer account -> Customer can access again
    await axios.patch(
      `${API}/creator/users/${custUserId}/activate`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    const meRes = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${custToken}` } });
    assert(meRes.data?.success === true, "Reactivated user can access protected endpoints normally");
  } catch (err) {
    assert(false, "RBAC & suspension test failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: MANUFACTURER FLOW & INPUT VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 5: Manufacturer Medicine Registration & DrugChain Block Minting");
  try {
    // 5.1 Input Validation: Missing medicineName -> 400
    try {
      await axios.post(
        `${API}/medicines`,
        {
          companyName: `Apex Pharma Labs ${nonce}`,
          batchNumber: `BATCH-ERR-${nonce}`,
          manufacturingDate: "2026-01-01",
          expiryDate: "2027-01-01",
        },
        { headers: { Authorization: `Bearer ${mfgToken}` } }
      );
      assert(false, "Registration with missing medicineName unexpectedly accepted");
    } catch (err) {
      assert(err.response?.status === 400, "Missing medicineName rejected with 400 Validation Error");
    }

    // 5.2 Input Validation: Invalid negative quantity -> 400
    try {
      await axios.post(
        `${API}/medicines`,
        {
          companyName: `Apex Pharma Labs ${nonce}`,
          medicineName: "Amoxicillin 500mg",
          batchNumber: `BATCH-NEG-${nonce}`,
          manufacturingDate: "2026-01-01",
          expiryDate: "2027-01-01",
          quantity: -50,
        },
        { headers: { Authorization: `Bearer ${mfgToken}` } }
      );
      assert(false, "Registration with negative quantity unexpectedly accepted");
    } catch (err) {
      assert(err.response?.status === 400, "Negative quantity rejected with 400 Validation Error");
    }

    // 5.3 Legitimate Medicine Registration
    const regRes = await axios.post(
      `${API}/medicines`,
      {
        companyName: `Apex Pharma Labs ${nonce}`,
        manufacturerName: `Apex Pharma ${nonce}`,
        medicineName: "Amoxicillin Trihydrate 500mg",
        batchNumber: registeredBatchId,
        manufacturingDate: "2026-02-15",
        expiryDate: "2028-02-15",
        price: "180.00",
        quantity: 500,
      },
      { headers: { Authorization: `Bearer ${mfgToken}` } }
    );
    assert(regRes.data?.success === true, "Medicine registered successfully by Manufacturer");
    assert(regRes.data?.data?.batchId === registeredBatchId, "Batch ID matches registered value");
    assert(!!regRes.data?.data?.id, "Unique Medicine ID generated");
    assert(!!regRes.data?.data?.blockchainTxHash, "DrugChain transaction hash created and recorded");
    assert(regRes.data?.data?.transferHistory?.length >= 1, "Initial custody step recorded in transfer history");
    registeredMedId = regRes.data?.data?.id;

    // 5.4 Duplicate Batch Registration -> 409 Conflict
    try {
      await axios.post(
        `${API}/medicines`,
        {
          companyName: `Apex Pharma Labs ${nonce}`,
          medicineName: "Amoxicillin Trihydrate 500mg",
          batchNumber: registeredBatchId,
          manufacturingDate: "2026-02-15",
          expiryDate: "2028-02-15",
          quantity: 200,
        },
        { headers: { Authorization: `Bearer ${mfgToken}` } }
      );
      assert(false, "Duplicate batch registration was unexpectedly accepted");
    } catch (err) {
      assert(err.response?.status === 409, "Duplicate batch registration safely rejected with 409 Conflict");
    }

    // 5.5 Cryptographic QR Generation with HMAC Signed Token
    const qrRes = await axios.post(
      `${API}/qr/generate`,
      { medicineId: registeredMedId, batchId: registeredBatchId },
      { headers: { Authorization: `Bearer ${mfgToken}` } }
    );
    assert(qrRes.data?.success === true, "Cryptographic QR generation endpoint responded");
    signedQrToken = qrRes.data?.data?.token || qrRes.data?.data?.payload;
    assert(!!signedQrToken, "HMAC-SHA256 signed token generated in QR payload");
    assert(!!qrRes.data?.data?.verificationUrl, "Public verification URL generated in QR data");
  } catch (err) {
    assert(false, "Manufacturer flow failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: DISTRIBUTOR FLOW & DRUGCHAIN TRANSIT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 6: Distributor Custody Receipt & Forwarding on DrugChain");
  try {
    // 6.1 Distributor views incoming transfers
    const transfersRes = await axios.get(`${API}/transfers/incoming`, {
      headers: { Authorization: `Bearer ${distToken}` },
    });
    assert(transfersRes.data?.success === true, "Distributor retrieved incoming transfers");
    const activeTransfer = transfersRes.data?.data?.find((t) => t.batchId === registeredBatchId);
    assert(!!activeTransfer, "Transfer order automatically created and located for registered batch");
    transferId = activeTransfer?.id;

    // 6.2 Distributor confirms receipt on DrugChain
    const confirmRes = await axios.post(
      `${API}/transfers/${transferId}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${distToken}` } }
    );
    assert(confirmRes.data?.success === true, "Distributor confirmed receipt on DrugChain");
    assert(confirmRes.data?.data?.blockchainStatus === "Confirmed", "Transfer status changed to Confirmed");
    assert(!!confirmRes.data?.data?.confirmTxHash, "DrugChain confirmation block transaction hash generated");

    // 6.3 Distributor forwards batch to Pharmacy
    const forwardRes = await axios.post(
      `${API}/transfers/${transferId}/forward`,
      { destinationPharmacy: `Metro Care Chemists ${nonce}` },
      { headers: { Authorization: `Bearer ${distToken}` } }
    );
    assert(forwardRes.data?.success === true, "Batch forwarded to Pharmacy on DrugChain");
    assert(forwardRes.data?.data?.blockchainStatus === "Forwarded to Pharmacy", "Transfer status changed to Forwarded to Pharmacy");
    assert(!!forwardRes.data?.data?.forwardTxHash, "DrugChain forwarding block transaction hash generated");
  } catch (err) {
    assert(false, "Distributor flow failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 7: PHARMACY FLOW & SHELF RECEIPT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 7: Pharmacy Custody Confirmation & Shelf Stocking");
  try {
    const pharmConfirmRes = await axios.post(
      `${API}/pharmacy/${registeredMedId}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${pharmToken}` } }
    );
    assert(pharmConfirmRes.data?.success === true, "Pharmacy confirmed shelf receipt on DrugChain");
    assert(pharmConfirmRes.data?.data?.currentHolder === "Pharmacy Shelf", "Current custody holder updated to Pharmacy Shelf");
    assert(pharmConfirmRes.data?.data?.transferHistory?.length >= 3, "Transfer history contains complete 3-tier custody records");
  } catch (err) {
    assert(false, "Pharmacy flow failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 8: CUSTOMER VERIFICATION FLOW — AUTHENTIC MEDICINE (6-LAYER AUDIT)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 8: Authentic Customer Verification (6-Layer Multi-Signal Audit)");
  try {
    // 8.1 Verify using HMAC signed QR token
    const verifyRes = await axios.get(`${API}/public/verify/${encodeURIComponent(signedQrToken)}`);
    assert(verifyRes.status === 200, "Public verification returned HTTP 200");
    assert(verifyRes.data?.data?.result?.status === "AUTHENTIC", "Final authenticity status is AUTHENTIC");
    assert(verifyRes.data?.data?.result?.score >= 90, `Authenticity score is >= 90 (Actual: ${verifyRes.data?.data?.result?.score}/100)`);
    assert(verifyRes.data?.data?.result?.riskLevel === "LOW", "Overall counterfeit risk level is LOW");
    assert(verifyRes.data?.data?.isFake === false, "Medicine correctly confirmed NOT fake (isFake: false)");

    // 8.2 Verify Individual Verification Layers
    const layers = verifyRes.data?.data?.layers;
    assert(layers?.qr === "VERIFIED", "Layer 1: Cryptographic QR HMAC token verified as VERIFIED");
    assert(layers?.database === "MATCHED", "Layer 2: MongoDB medicine identity record verified as MATCHED");
    assert(layers?.integrity === "INTEGRITY_VERIFIED", "Layer 3A: Medicine parameter integrity matches DrugChain ledger");
    assert(layers?.blockchain === "VERIFIED", "Layer 3B: DrugChain PoA block hash verified as VERIFIED");
    assert(layers?.supplyChain === "VALID", "Layer 4: 3-tier supply chain custody verified as VALID");
    assert(layers?.expiry === "VALID", "Layer 5: Expiry date verified as VALID");
    assert(verifyRes.data?.data?.checks?.ocr?.status === "UNAVAILABLE" || verifyRes.data?.data?.checks?.ocr?.status === "PASS", "Layer 6: Visual/OCR fallback handled safely");
  } catch (err) {
    assert(false, "Authentic customer verification failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 9: NEGATIVE & ADVERSARIAL TESTING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 9: Negative & Adversarial Counterfeit Detection");
  try {
    // 9.1 Non-existent / Fake QR
    const fakeRes = await axios.get(`${API}/public/verify/TOTALLY_FAKE_MED_99999`);
    assert(fakeRes.data?.data?.isFake === true, "Unregistered / fake QR correctly identified as isFake: true");
    assert(fakeRes.data?.data?.result?.status === "LIKELY COUNTERFEIT", "Status reported as LIKELY COUNTERFEIT");
    assert(fakeRes.data?.data?.result?.score === 0, "Counterfeit drug authenticity score is 0");
    assert(fakeRes.data?.data?.layers?.database === "NOT_FOUND_UNREGISTERED", "Database layer reports NOT_FOUND_UNREGISTERED");
    assert(fakeRes.data?.data?.layers?.blockchain === "UNVERIFIED_NOT_ON_CHAIN", "Blockchain layer reports UNVERIFIED_NOT_ON_CHAIN");

    // 9.2 Cryptographically Tampered QR Signature (Forged Token)
    const tamperedToken = `${signedQrToken.slice(0, -6)}FFFFFF`;
    const tamperedRes = await axios.get(`${API}/public/verify/${encodeURIComponent(tamperedToken)}`);
    assert(tamperedRes.data?.data?.layers?.qr === "INVALID_SIGNATURE" || tamperedRes.data?.data?.layers?.qr === "MODIFIED_QR_SIGNATURE_MISMATCH", "Tampered HMAC signature detected as INVALID_SIGNATURE");
    assert(tamperedRes.data?.data?.result?.status !== "AUTHENTIC", "Tampered QR does NOT return AUTHENTIC");

    // 9.3 Expired Medicine Backend Validation
    const expiryPast = validateExpiry("2020-01-01", "2023-01-01");
    assert(expiryPast.expiryStatus === "EXPIRED", "Past expiry date accurately evaluated as EXPIRED by backend engine");
    assert(expiryPast.isExpired === true, "isExpired flag accurately set to true");

    const expiryFuture = validateExpiry("2025-01-01", "2029-01-01");
    assert(expiryFuture.expiryStatus === "VALID", "Future expiry date accurately evaluated as VALID");
    assert(expiryFuture.isExpired === false, "isExpired flag accurately set to false");

    // 9.4 Supply-Chain Custody Anomaly (Skipping Distributor)
    const anomalyCustody = validateSupplyChainCustody({
      company: "Apex Labs",
      transferHistory: [
        { step: 1, role: "Manufacturer", status: "Manufactured" },
        { step: 2, role: "Pharmacy", status: "Verified & Stocked" }, // Distributor skipped!
      ],
    });
    assert(anomalyCustody.status === "SUSPICIOUS", "Supply chain with skipped distributor flagged as SUSPICIOUS");
    assert(anomalyCustody.issues.some((i) => i.includes("UNAUTHORIZED_CUSTODY_HOP")), "Custody hop issue UNAUTHORIZED_CUSTODY_HOP reported");

    // 9.5 Blockchain Canonical Hash Sensitivity
    const validHash = calculateMedicineDataHash({
      medicineId: registeredMedId,
      batchNumber: registeredBatchId,
      medicineName: "Amoxicillin Trihydrate 500mg",
      manufacturerCode: `APEX-${nonce}`,
      manufacturingDate: "2026-02-15",
      expiryDate: "2028-02-15",
    });
    const alteredHash = calculateMedicineDataHash({
      medicineId: registeredMedId,
      batchNumber: registeredBatchId,
      medicineName: "Amoxicillin Trihydrate 500mg",
      manufacturerCode: `APEX-${nonce}`,
      manufacturingDate: "2026-02-15",
      expiryDate: "2028-02-16", // 1 day difference
    });
    assert(validHash !== alteredHash, "1-character alteration produces completely different SHA-256 data hash");
  } catch (err) {
    assert(false, "Negative testing section failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 10: ANTI-CLONING SCAN FREQUENCY PENALTY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 10: Anti-Cloning Scan Frequency Risk Evaluation");
  try {
    // Send 16 rapid scans on the registered batch to simulate QR cloning / mass-dispensing
    let lastScanRes = null;
    for (let i = 0; i < 16; i++) {
      lastScanRes = await axios.get(`${API}/public/verify/${encodeURIComponent(registeredBatchId)}`);
    }
    const finalScanCount = lastScanRes?.data?.data?.medicine?.verificationCount;
    assert(finalScanCount >= 16, `Verification scan counter incremented accurately (Count: ${finalScanCount})`);
    const reuseRisk = lastScanRes?.data?.data?.layers?.qrReuseRisk;
    assert(reuseRisk === "HIGH", `High scan count (>15) flagged as HIGH cloning risk (Status: ${reuseRisk})`);
    const overallRisk = lastScanRes?.data?.data?.result?.riskLevel;
    assert(overallRisk === "MEDIUM" || overallRisk === "HIGH", `Overall risk elevated due to QR cloning (Risk: ${overallRisk})`);
  } catch (err) {
    assert(false, "Scan frequency evaluation failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 11: AI / OCR SERVICE RESILIENCE & INPUT SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SECTION 11: AI & OCR Service Resilience & Security Checks");
  try {
    // 11.1 AI Verification with no image returns graceful fallback without crashing
    const noImgRes = await axios.post(
      `${API}/verification/ai`,
      { medicineName: "Test Drug", batchNumber: registeredBatchId },
      { headers: { Authorization: `Bearer ${custToken}` } }
    );
    assert(noImgRes.status === 200, "AI verification endpoint returns HTTP 200 on missing image");
    assert(noImgRes.data?.data?.imageVerified === false, "Correctly notes imageVerified: false without fake scores");

    // 11.2 API Response Secret Scan (GEMINI_API_KEY must never leak in responses)
    const jsonStr = JSON.stringify(noImgRes.data);
    // NOTE: The key fragment below is intentionally split to avoid secret scanner false-positives.
    // Test verifies no GCP/Gemini API key prefix pattern appears in API responses.
    const gcpKeyPrefix = "AIza"; // GCP API keys always start with this prefix
    const foundGcpKey = jsonStr.match(/AIza[0-9A-Za-z_-]{35}/);
    assert(!foundGcpKey, "Gemini API key is NEVER leaked in API responses");
    assert(!jsonStr.includes("super_secret_jwt_key"), "JWT secret is NEVER leaked in API responses");


    // 11.3 Password field omitted in user profile queries
    const profileRes = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${mfgToken}` } });
    assert(profileRes.data?.data?.user?.password === undefined, "User password field strictly deleted via toSafeObject()");

    // 11.4 Malicious Executable File Upload Blocked
    try {
      const badUpload = new FormData();
      const exeBlob = new Blob([Buffer.from("MZ9000ExecutableSimulation")], { type: "application/x-msdownload" });
      badUpload.append("medicineImage", exeBlob, "malicious_script.exe");
      await axios.post(`${API}/verification/ai`, badUpload, {
        headers: { Authorization: `Bearer ${custToken}` },
      });
      assert(false, "Executable file upload was unexpectedly accepted");
    } catch (uploadErr) {
      assert(uploadErr.response?.status === 400 || uploadErr.response?.status === 500, "Executable file upload (.exe) strictly blocked by security filter");
    }
  } catch (err) {
    assert(false, "AI & secret scan failed", err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════════════════════════");
  console.log(`🏁 PART 5 MASTER AUDIT COMPLETE: ${passedTests} PASSED | ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log("══════════════════════════════════════════════════════════════════════════════════");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPart5MasterAudit().catch((err) => {
  console.error("FATAL ERROR IN MASTER AUDIT SUITE:", err);
  process.exit(1);
});
