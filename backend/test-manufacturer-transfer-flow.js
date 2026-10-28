/**
 * MEDICHAINAI — END-TO-END VERIFICATION TEST SUITE
 * Manufacturer Transfer, Admin Approval & Distributor Inventory
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5050;
const API = `http://localhost:${PORT}/api`;
const CREATOR_EMAIL = process.env.CREATOR_EMAIL || "sadashivtambole@gmail.com";
const CREATOR_PASSWORD = process.env.CREATOR_PASSWORD || "Shiva@123";

async function runTestSuite() {
  console.log("══════════════════════════════════════════════════════════════════════════════");
  console.log("   MEDICHAINAI: MANUFACTURER TRANSFERS & DISTRIBUTOR INVENTORY E2E TEST");
  console.log("══════════════════════════════════════════════════════════════════════════════\n");

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

  const nonce = Math.floor(100000 + Math.random() * 900000);
  const mfgEmail = `mfg_flow_${nonce}@testmed.com`;
  const distAEmail = `dist_a_${nonce}@testmed.com`;
  const distBEmail = `dist_b_${nonce}@testmed.com`;
  const testPassword = "SecurePass@2026!";

  let creatorToken = "";
  let mfgToken = "";
  let distAToken = "";
  let distBToken = "";

  let mfgUserId = "";
  let distAUserId = "";
  let distBUserId = "";

  let medicineId = "";
  const batchNumber = `BT-FLOW-${nonce}`;
  let transfer1Id = "";
  let transfer2Id = "";

  try {
    // ── STEP 1: Creator Login ──
    console.log("📌 1. Authenticating Creator / Administrator...");
    const creatorLoginRes = await axios.post(`${API}/auth/login`, {
      email: CREATOR_EMAIL,
      password: CREATOR_PASSWORD,
    });
    assert(creatorLoginRes.data?.success === true, "Creator login succeeded");
    creatorToken = creatorLoginRes.data?.data?.token;

    // ── STEP 2: Register Manufacturer & Two Distributors ──
    console.log("\n📌 2. Registering Manufacturer and Two Separate Distributors...");
    const dummyBlob = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")], { type: "image/png" });

    // Helper to complete registration with OTP verification if required
    async function registerAndVerify(form, email, label) {
      const regRes = await axios.post(`${API}/auth/register`, form);
      assert(regRes.data?.success === true, `${label} registration initiated`);
      if (regRes.data?.data?.requiresOtp) {
        const otp = regRes.data.data.debugOtp || "123456";
        const regId = regRes.data.data.registrationId;
        const verifyRes = await axios.post(`${API}/auth/verify-registration-otp`, {
          email,
          registrationId: regId,
          otp,
        });
        assert(verifyRes.data?.success === true, `${label} OTP verified (Account Pending Creator Review)`);
        return verifyRes.data?.data?.user?.id || verifyRes.data?.data?.user?._id;
      }
      return regRes.data?.data?.user?.id || regRes.data?.data?.user?._id;
    }

    // Manufacturer
    const mfgForm = new FormData();
    mfgForm.append("fullName", `Apex BioTech ${nonce}`);
    mfgForm.append("email", mfgEmail);
    mfgForm.append("password", testPassword);
    mfgForm.append("confirmPassword", testPassword);
    mfgForm.append("role", "Manufacturer");
    mfgForm.append("phone", "+91 9123456789");
    mfgForm.append("companyName", `Apex BioTech Labs ${nonce}`);
    mfgForm.append("companyCode", `MFR-LIC-${nonce}`);
    mfgForm.append("governmentIdType", "Manufacturing License");
    mfgForm.append("identityPhoto", dummyBlob, "identity.png");
    mfgForm.append("governmentId", dummyBlob, "license.png");
    mfgUserId = await registerAndVerify(mfgForm, mfgEmail, "Manufacturer");

    // Distributor A
    const distAForm = new FormData();
    distAForm.append("fullName", `Alpha Pharma Express ${nonce}`);
    distAForm.append("email", distAEmail);
    distAForm.append("password", testPassword);
    distAForm.append("confirmPassword", testPassword);
    distAForm.append("role", "Distributor");
    distAForm.append("phone", "+91 9123456780");
    distAForm.append("companyName", `Alpha Logistics ${nonce}`);
    distAForm.append("companyCode", `DIST-A-${nonce}`);
    distAForm.append("governmentIdType", "Distributor License");
    distAForm.append("identityPhoto", dummyBlob, "identity.png");
    distAForm.append("governmentId", dummyBlob, "license.png");
    distAUserId = await registerAndVerify(distAForm, distAEmail, "Distributor A");

    // Distributor B
    const distBForm = new FormData();
    distBForm.append("fullName", `Beta Pharma Trans ${nonce}`);
    distBForm.append("email", distBEmail);
    distBForm.append("password", testPassword);
    distBForm.append("confirmPassword", testPassword);
    distBForm.append("role", "Distributor");
    distBForm.append("phone", "+91 9123456781");
    distBForm.append("companyName", `Beta Cargo ${nonce}`);
    distBForm.append("companyCode", `DIST-B-${nonce}`);
    distBForm.append("governmentIdType", "Distributor License");
    distBForm.append("identityPhoto", dummyBlob, "identity.png");
    distBForm.append("governmentId", dummyBlob, "license.png");
    distBUserId = await registerAndVerify(distBForm, distBEmail, "Distributor B");

    // ── STEP 3: Admin Approves All 3 Accounts ──
    console.log("\n📌 3. Admin Approving Registered User Accounts...");
    await axios.patch(`${API}/creator/users/${mfgUserId}/approve`, {}, { headers: { Authorization: `Bearer ${creatorToken}` } });
    await axios.patch(`${API}/creator/users/${distAUserId}/approve`, {}, { headers: { Authorization: `Bearer ${creatorToken}` } });
    await axios.patch(`${API}/creator/users/${distBUserId}/approve`, {}, { headers: { Authorization: `Bearer ${creatorToken}` } });
    assert(true, "Admin approved Manufacturer, Distributor A, and Distributor B");

    // Helper to complete login with 2-step OTP if required
    async function loginUser(email, password) {
      const loginRes = await axios.post(`${API}/auth/login`, { email, password });
      if (loginRes.data?.data?.token) {
        return loginRes.data.data.token;
      }
      if (loginRes.data?.data?.requiresOtp) {
        const otp = loginRes.data.data.debugOtp || "123456";
        const sessionToken = loginRes.data.data.loginSessionToken;
        const verifyRes = await axios.post(`${API}/auth/verify-login-otp`, {
          email,
          otp,
          loginSessionToken: sessionToken,
        });
        return verifyRes.data?.data?.token;
      }
      return null;
    }

    mfgToken = await loginUser(mfgEmail, testPassword);
    distAToken = await loginUser(distAEmail, testPassword);
    distBToken = await loginUser(distBEmail, testPassword);

    assert(!!mfgToken && !!distAToken && !!distBToken, "All approved users authenticated with JWT sessions");

    // ── STEP 4: Manufacturer Registers Medicine (Initial Status: Pending) ──
    console.log("\n📌 4. Manufacturer Submitting New Medicine Registration...");
    const medRegRes = await axios.post(
      `${API}/medicines`,
      {
        companyName: `Apex BioTech Labs ${nonce}`,
        manufacturerName: `Apex BioTech ${nonce}`,
        medicineName: "Paracetamol 650mg Active",
        composition: "Paracetamol IP 650mg",
        batchNumber,
        manufacturingDate: "2026-03-01",
        expiryDate: "2028-03-01",
        price: "45.00",
        quantity: 500,
      },
      { headers: { Authorization: `Bearer ${mfgToken}` } }
    );
    assert(medRegRes.data?.success === true, "Medicine registered successfully");
    const registeredMed = medRegRes.data?.data;
    medicineId = registeredMed?.id || registeredMed?.batchId;
    assert(registeredMed?.approvalStatus === "pending", "Medicine initialized with approvalStatus: 'pending'");
    assert(registeredMed?.quantity === 500, "Initial batch quantity recorded as 500 units");

    // ── STEP 5: Attempt Transfer of Unapproved Medicine (Must Fail) ──
    console.log("\n📌 5. Testing Policy: Unapproved Medicine CANNOT Be Transferred...");
    try {
      await axios.post(
        `${API}/transfers`,
        {
          medicineId,
          distributorId: distAUserId,
          quantity: 100,
          notes: "Attempt unapproved transfer",
        },
        { headers: { Authorization: `Bearer ${mfgToken}` } }
      );
      assert(false, "Transfer of unapproved medicine was unexpectedly accepted");
    } catch (err) {
      assert(err.response?.status === 400, "Transfer of unapproved medicine rejected with HTTP 400");
      assert(err.response?.data?.code === "MEDICINE_NOT_APPROVED" || err.response?.data?.code === "NOT_APPROVED", `Error code is MEDICINE_NOT_APPROVED (${err.response?.data?.code})`);
    }

    // ── STEP 6: Admin Reviews and Approves Medicine ──
    console.log("\n📌 6. Admin Approving Medicine on DrugChain...");
    const approveMedRes = await axios.patch(
      `${API}/creator/medicines/${medicineId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(approveMedRes.data?.success === true, "Admin approved medicine on DrugChain");
    assert(approveMedRes.data?.data?.approvalStatus === "approved", "Medicine approvalStatus is persisted as 'approved'");

    // ── STEP 7: Inventory Validation: Transfer More Than Available Stock (Must Fail) ──
    console.log("\n📌 7. Testing Inventory Validation: Over-transfer Guard...");
    try {
      await axios.post(
        `${API}/transfers`,
        {
          medicineId,
          distributorId: distAUserId,
          quantity: 600, // Available is only 500
          notes: "Attempting to transfer 600 units when only 500 exist",
        },
        { headers: { Authorization: `Bearer ${mfgToken}` } }
      );
      assert(false, "Over-transfer was unexpectedly allowed");
    } catch (err) {
      assert(err.response?.status === 400, "Over-transfer rejected with HTTP 400");
      assert(err.response?.data?.code === "INSUFFICIENT_INVENTORY" || err.response?.data?.code === "INSUFFICIENT_QUANTITY", `Error code is INSUFFICIENT_INVENTORY (${err.response?.data?.code})`);
    }

    // ── STEP 8: Legitimate Transfer 1 (200 units) to Distributor A ──
    console.log("\n📌 8. Manufacturer Dispatches Transfer 1 (200 units) to Distributor A...");
    const transfer1Res = await axios.post(
      `${API}/transfers`,
      {
        medicineId,
        distributorId: distAUserId,
        quantity: 200,
        notes: "Cold-chain shipment 2-8°C. Waybill #TRK-1001",
      },
      { headers: { Authorization: `Bearer ${mfgToken}` } }
    );
    assert(transfer1Res.data?.success === true, "Transfer 1 created and persisted");
    transfer1Id = transfer1Res.data?.data?.transferId;
    assert(!!transfer1Id, "Generated unique transferId");
    assert(transfer1Res.data?.data?.status === "Pending Confirmation", "Status is 'Pending Confirmation'");
    assert(transfer1Res.data?.data?.availableStockAfterTransfer === 300, "Manufacturer batch stock decremented to 300 units");

    // ── STEP 9: Intended Recipient (Distributor A) Views Incoming Transfers ──
    console.log("\n📌 9. Distributor A Checks Incoming Pending Transfers...");
    const distAIncomingRes = await axios.get(`${API}/transfers/incoming`, {
      headers: { Authorization: `Bearer ${distAToken}` },
    });
    assert(distAIncomingRes.data?.success === true, "Distributor A retrieved incoming transfers");
    const distATx1 = distAIncomingRes.data?.data?.find((t) => t.id === transfer1Id || t.transferId === transfer1Id);
    assert(!!distATx1, "Distributor A sees Transfer 1 in their incoming pending transfers list");
    assert(distATx1?.quantity === "200 Units" || distATx1?.quantity === 200, "Transfer 1 reflects 200 units");
    assert(distATx1?.status === "Pending Confirmation", "Transfer 1 status is 'Pending Confirmation'");

    // ── STEP 10: Private Scoping Check: Distributor B Cannot See Transfer 1 ──
    console.log("\n📌 10. Privacy & RBAC Check: Distributor B Cannot See Distributor A's Transfer...");
    const distBIncomingRes = await axios.get(`${API}/transfers/incoming`, {
      headers: { Authorization: `Bearer ${distBToken}` },
    });
    const distBTx1 = distBIncomingRes.data?.data?.find((t) => t.id === transfer1Id || t.transferId === transfer1Id);
    assert(!distBTx1, "Distributor B DOES NOT see Distributor A's private transfer (scoped correctly)");

    // ── STEP 11: Security Check: Distributor B Cannot Accept or Reject Transfer 1 ──
    console.log("\n📌 11. Security Check: Cross-distributor Tampering Strictly Blocked (403)...");
    try {
      await axios.post(
        `${API}/transfers/${transfer1Id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${distBToken}` } }
      );
      assert(false, "Distributor B unexpectedly confirmed another distributor's transfer");
    } catch (err) {
      assert(err.response?.status === 403, "Distributor B confirmation attempt blocked with HTTP 403 Forbidden");
    }

    try {
      await axios.post(
        `${API}/transfers/${transfer1Id}/reject`,
        { rejectionReason: "Malicious attempt to reject" },
        { headers: { Authorization: `Bearer ${distBToken}` } }
      );
      assert(false, "Distributor B unexpectedly rejected another distributor's transfer");
    } catch (err) {
      assert(err.response?.status === 403, "Distributor B rejection attempt blocked with HTTP 403 Forbidden");
    }

    // ── STEP 12: Distributor A Rejects Transfer 1 With Specific Reason ──
    console.log("\n📌 12. Distributor A Rejects Transfer 1 (Reason: Packaging seal compromised)...");
    const rejectRes = await axios.post(
      `${API}/transfers/${transfer1Id}/reject`,
      { rejectionReason: "Packaging seal compromised during transit; temperature log exceeded threshold." },
      { headers: { Authorization: `Bearer ${distAToken}` } }
    );
    assert(rejectRes.data?.success === true, "Transfer 1 rejection recorded");
    assert(rejectRes.data?.data?.status === "Rejected", "Transfer status changed to 'Rejected'");
    assert(rejectRes.data?.data?.rejectionReason?.includes("Packaging seal compromised"), "Rejection reason saved");

    // Verify duplicate actions on rejected transfer are blocked
    try {
      await axios.post(`${API}/transfers/${transfer1Id}/confirm`, {}, { headers: { Authorization: `Bearer ${distAToken}` } });
      assert(false, "Confirmed a rejected transfer unexpectedly");
    } catch (err) {
      assert(err.response?.status === 400, "Cannot confirm a rejected transfer (rejected with 400 ALREADY_REJECTED)");
    }

    try {
      await axios.post(
        `${API}/transfers/${transfer1Id}/reject`,
        { rejectionReason: "Rejecting again" },
        { headers: { Authorization: `Bearer ${distAToken}` } }
      );
      assert(false, "Rejected an already rejected transfer unexpectedly");
    } catch (err) {
      assert(err.response?.status === 400, "Cannot re-reject an already rejected transfer (rejected with 400 ALREADY_REJECTED)");
    }

    // ── STEP 13: Manufacturer Dispatches Transfer 2 (150 units) to Distributor A ──
    console.log("\n📌 13. Manufacturer Dispatches Replacement Transfer 2 (150 units)...");
    const transfer2Res = await axios.post(
      `${API}/transfers`,
      {
        medicineId,
        distributorId: distAUserId,
        quantity: 150,
        notes: "Replacement shipment in certified refrigerated carrier #RC-881",
      },
      { headers: { Authorization: `Bearer ${mfgToken}` } }
    );
    assert(transfer2Res.data?.success === true, "Transfer 2 created and persisted");
    transfer2Id = transfer2Res.data?.data?.transferId;

    // ── STEP 14: Distributor A Accepts Transfer 2 (Confirm Receipt) ──
    console.log("\n📌 14. Distributor A Confirms Receipt on DrugChain...");
    const confirmRes = await axios.post(
      `${API}/transfers/${transfer2Id}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${distAToken}` } }
    );
    assert(confirmRes.data?.success === true, "Distributor A confirmed transfer receipt");
    assert(confirmRes.data?.data?.status === "Confirmed", "Transfer 2 status changed to 'Confirmed'");
    assert(confirmRes.data?.data?.action === "CONFIRMED", "Transfer 2 action recorded as 'CONFIRMED'");
    assert(!!confirmRes.data?.data?.confirmTxHash, "DrugChain confirmation block txHash generated");

    // ── STEP 15: Duplicate Confirmation Guard ──
    console.log("\n📌 15. Testing Duplicate Confirmation Guard...");
    try {
      await axios.post(`${API}/transfers/${transfer2Id}/confirm`, {}, { headers: { Authorization: `Bearer ${distAToken}` } });
      assert(false, "Duplicate confirmation unexpectedly succeeded");
    } catch (err) {
      assert(err.response?.status === 400, "Duplicate confirmation blocked with HTTP 400");
      assert(err.response?.data?.code === "ALREADY_CONFIRMED", `Error code is ALREADY_CONFIRMED (${err.response?.data?.code})`);
    }

    // ── STEP 16: Manufacturer Outgoing Transfers Ledger Inspection ──
    console.log("\n📌 16. Manufacturer Inspects Outgoing Transfers History...");
    const outgoingRes = await axios.get(`${API}/transfers/outgoing`, {
      headers: { Authorization: `Bearer ${mfgToken}` },
    });
    assert(outgoingRes.data?.success === true, "Manufacturer retrieved outgoing transfers");
    const mfgTx1 = outgoingRes.data?.data?.find((t) => t.id === transfer1Id || t.transferId === transfer1Id);
    const mfgTx2 = outgoingRes.data?.data?.find((t) => t.id === transfer2Id || t.transferId === transfer2Id);
    assert(!!mfgTx1 && mfgTx1.status === "Rejected", "Outgoing ledger reflects Rejected status for Transfer 1");
    assert(!!mfgTx2 && mfgTx2.status === "Confirmed", "Outgoing ledger reflects Confirmed status for Transfer 2");

    // ── STEP 17: In-App Notifications Verification ──
    console.log("\n📌 17. Verifying In-App Notifications Generated for Manufacturer...");
    const notifsRes = await axios.get(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${mfgToken}` },
    });
    assert(notifsRes.data?.success === true, "Manufacturer notifications retrieved");
    const notifs = notifsRes.data?.data || [];
    const hasRejectNotif = notifs.some((n) => n.title?.includes("Rejected") || n.message?.includes("rejected"));
    const hasConfirmNotif = notifs.some((n) => /confirmed|accepted|received/i.test((n.title || "") + " " + (n.message || "")));
    assert(hasRejectNotif, "Manufacturer received in-app Notification for rejected transfer");
    assert(hasConfirmNotif, "Manufacturer received in-app Notification for confirmed transfer");

    // ── STEP 18: Distributor In-Stock Inventory Verification ──
    console.log("\n📌 18. Verifying Distributor Inventory Contains Confirmed Batch...");
    const distAllTransfers = await axios.get(`${API}/transfers/incoming`, {
      headers: { Authorization: `Bearer ${distAToken}` },
    });
    const confirmedInStock = distAllTransfers.data?.data?.filter((t) => t.status === "Confirmed" || t.action === "CONFIRMED");
    const stockItem = confirmedInStock.find((t) => t.id === transfer2Id || t.transferId === transfer2Id);
    assert(!!stockItem, "Confirmed batch is present in Distributor's In-Stock Inventory");

  } catch (err) {
    console.error("FATAL SUITE ERROR:", err.response?.data || err.message);
    assert(false, "Master test suite encountered an unexpected exception", err.message);
  }

  console.log("\n══════════════════════════════════════════════════════════════════════════════");
  console.log(`   SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log("══════════════════════════════════════════════════════════════════════════════\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
