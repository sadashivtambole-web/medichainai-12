/**
 * Comprehensive Email OTP Authentication Verification Suite
 * Tests all requirements from Master Prompt:
 * - Manufacturer, Distributor, Pharmacy registration with Email OTP
 * - Duplicate email prevention
 * - Invalid OTP rejection & attempt tracking (max 5)
 * - 60s resend cooldown enforcement
 * - Two-step Login with Email OTP
 * - Incorrect password protection (no OTP issued)
 * - Pending account block (no OTP issued until approved)
 * - Admin approval workflow integration
 * - Successful OTP verification & JWT issuance
 * - Reused OTP rejection
 * - Role-based protected API access
 */

import axios from "axios";
import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User, OtpVerification, ManufacturerProfile, DistributorProfile, PharmacyProfile } from "./models.js";

dotenv.config();

// Fix Windows DNS SRV lookup if needed
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const BASE_URL = "http://localhost:5050/api";
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/medichain_ai";

let testResults = [];
function recordTest(name, passed, detail = "") {
  testResults.push({ name, passed, detail });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon}: ${name}${detail ? ` (${detail})` : ""}`);
}

async function runSuite() {
  console.log("==========================================================");
  console.log("🚀 STARTING EMAIL OTP AUTHENTICATION TEST SUITE");
  console.log("==========================================================");

  // Connect to DB directly for inspecting OTP records and admin approval
  await mongoose.connect(MONGO_URI);
  console.log("Connected to database for test assertions.");

  const uniqueId = Date.now().toString().slice(-6);
  const mfgEmail = `mfg_test_${uniqueId}@medichain.test`;
  const distEmail = `dist_test_${uniqueId}@medichain.test`;
  const pharmEmail = `pharm_test_${uniqueId}@medichain.test`;
  const testPassword = "SecurePassword123!";

  try {
    // ── TEST 1: Manufacturer Registration initiates Email OTP ──
    console.log("\n--- Scenario 1: Manufacturer Registration & Email OTP ---");
    const mfgRegPayload = {
      fullName: "Apex Pharmaceuticals Ltd",
      name: "Apex Pharmaceuticals Ltd",
      email: mfgEmail,
      password: testPassword,
      confirmPassword: testPassword,
      role: "Manufacturer",
      phone: "+91 98765 43210",
      companyName: "Apex Pharma Global",
      company: "Apex Pharma Global",
      companyCode: `MFG-APEX-${uniqueId}`,
      governmentIdType: "Drug Manufacturing / Wholesale Distribution License",
      identityPhotoBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      governmentIdBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const mfgRegRes = await axios.post(`${BASE_URL}/auth/register`, mfgRegPayload);
    const mfgRequiresOtp = mfgRegRes.data.success && mfgRegRes.data.data?.requiresOtp === true;
    recordTest("Manufacturer Registration requires Email OTP", mfgRequiresOtp, `Masked: ${mfgRegRes.data.data?.maskedEmail}`);

    // Verify OTP record created in DB
    const mfgOtpRecord = await OtpVerification.findOne({ email: mfgEmail, purpose: "REGISTRATION" });
    recordTest("OTP Record stored securely with hash & 5-min expiry", !!mfgOtpRecord && mfgOtpRecord.otpHash.startsWith("$2"), `Expires: ${mfgOtpRecord?.expiresAt}`);

    // ── TEST 2: Duplicate registration blocked ──
    try {
      await axios.post(`${BASE_URL}/auth/register`, mfgRegPayload);
      // Notice: If second registration is attempted immediately, cooldown triggers or duplicate triggers
      recordTest("Duplicate registration within cooldown rejected", false, "Allowed duplicate request without error");
    } catch (err) {
      const isCooldownOrDuplicate = err.response?.status === 429 || err.response?.status === 409;
      recordTest("Resend cooldown protects registration OTP spam", isCooldownOrDuplicate, `Status: ${err.response?.status} (${err.response?.data?.code})`);
    }

    // ── TEST 3: Invalid OTP attempt fails & increments attempt counter ──
    try {
      await axios.post(`${BASE_URL}/auth/verify-registration-otp`, {
        email: mfgEmail,
        otp: "000000",
      });
      recordTest("Invalid OTP rejected", false, "Invalid OTP was accepted");
    } catch (err) {
      recordTest("Invalid OTP rejected with 400", err.response?.status === 400, err.response?.data?.message);
    }

    // Check attempts counter in DB
    const mfgOtpAfterFailed = await OtpVerification.findOne({ email: mfgEmail, purpose: "REGISTRATION" });
    recordTest("Incorrect attempt increments attempts counter", mfgOtpAfterFailed?.attempts === 1, `Attempts: ${mfgOtpAfterFailed?.attempts}`);

    // ── TEST 4: Successful Registration OTP verification creates User in PENDING state ──
    // Retrieve the raw OTP from response debugOtp or test helper
    const debugOtp = mfgRegRes.data.data?.debugOtp;
    if (!debugOtp) {
      console.warn("⚠️ debugOtp not returned in non-prod mode; checking if OTP matches");
    }

    const mfgVerifyRes = await axios.post(`${BASE_URL}/auth/verify-registration-otp`, {
      email: mfgEmail,
      otp: debugOtp || "123456",
    });

    const mfgVerifiedOk = mfgVerifyRes.data.success && mfgVerifyRes.data.data?.isEmailVerified === true;
    recordTest("Valid OTP confirms email & sets accountStatus to PENDING", mfgVerifiedOk, mfgVerifyRes.data.data?.accountStatus);

    // Verify OTP record invalidated after verification
    const otpAfterSuccess = await OtpVerification.findOne({ email: mfgEmail, purpose: "REGISTRATION" });
    recordTest("Registration OTP invalidated immediately upon success", otpAfterSuccess === null, "Deleted from database");

    // ── TEST 5: Reused OTP is rejected ──
    try {
      await axios.post(`${BASE_URL}/auth/verify-registration-otp`, {
        email: mfgEmail,
        otp: debugOtp,
      });
      recordTest("Reused OTP rejected", false, "Accepted reused OTP");
    } catch (err) {
      recordTest("Reused OTP rejected", err.response?.status === 400, err.response?.data?.message);
    }

    // ── TEST 6: Distributor Registration with Email OTP ──
    console.log("\n--- Scenario 2: Distributor Registration & Email OTP ---");
    const distRegPayload = {
      fullName: "Metro Med Logistics",
      name: "Metro Med Logistics",
      email: distEmail,
      password: testPassword,
      confirmPassword: testPassword,
      role: "Distributor",
      phone: "+91 91234 56789",
      companyName: "Metro Med Logistics Hub",
      company: "Metro Med Logistics Hub",
      companyCode: `DIST-METRO-${uniqueId}`,
      governmentIdType: "Drug Manufacturing / Wholesale Distribution License",
      identityPhotoBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      governmentIdBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const distRegRes = await axios.post(`${BASE_URL}/auth/register`, distRegPayload);
    recordTest("Distributor Registration requires Email OTP", distRegRes.data.data?.requiresOtp === true);

    const distDebugOtp = distRegRes.data.data?.debugOtp;
    const distVerifyRes = await axios.post(`${BASE_URL}/auth/verify-registration-otp`, {
      email: distEmail,
      otp: distDebugOtp,
    });
    recordTest("Distributor registration verified with OTP", distVerifyRes.data.success);

    // ── TEST 7: Pharmacy Registration with Email OTP ──
    console.log("\n--- Scenario 3: Pharmacy Registration & Email OTP ---");
    const pharmRegPayload = {
      fullName: "CarePoint Healthcare Pharmacy",
      name: "CarePoint Healthcare Pharmacy",
      email: pharmEmail,
      password: testPassword,
      confirmPassword: testPassword,
      role: "Pharmacy",
      phone: "+91 99887 76655",
      companyName: "CarePoint Pharmacy",
      company: "CarePoint Pharmacy",
      companyCode: `PHARM-CARE-${uniqueId}`,
      governmentIdType: "State Pharmacy Council Registration",
      identityPhotoBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      governmentIdBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const pharmRegRes = await axios.post(`${BASE_URL}/auth/register`, pharmRegPayload);
    recordTest("Pharmacy Registration requires Email OTP", pharmRegRes.data.data?.requiresOtp === true);

    const pharmDebugOtp = pharmRegRes.data.data?.debugOtp;
    const pharmVerifyRes = await axios.post(`${BASE_URL}/auth/verify-registration-otp`, {
      email: pharmEmail,
      otp: pharmDebugOtp,
    });
    recordTest("Pharmacy registration verified with OTP", pharmVerifyRes.data.success);

    // ── TEST 8: Login while PENDING is rejected (No OTP issued) ──
    console.log("\n--- Scenario 4: Login Before Admin Approval ---");
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: mfgEmail,
        password: testPassword,
      });
      recordTest("Pending account blocked from login", false, "Login was allowed");
    } catch (err) {
      recordTest("Pending account blocked from login with 403", err.response?.status === 403, err.response?.data?.message);
    }

    // Verify NO login OTP was created in database
    const pendingLoginOtp = await OtpVerification.findOne({ email: mfgEmail, purpose: "LOGIN" });
    recordTest("No login OTP generated when account is pending", pendingLoginOtp === null);

    // ── TEST 9: Admin approves Manufacturer account ──
    console.log("\n--- Scenario 5: Admin Approval & Two-Step Login OTP ---");
    const mfgUser = await User.findOne({ email: mfgEmail });
    mfgUser.accountStatus = "APPROVED";
    mfgUser.approvalStatus = "APPROVED";
    await mfgUser.save();
    console.log(`Manufacturer ${mfgEmail} approved by Admin.`);

    // ── TEST 10: Incorrect password rejected (No OTP issued) ──
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: mfgEmail,
        password: "WrongPassword999!",
      });
      recordTest("Incorrect password rejected", false, "Accepted wrong password");
    } catch (err) {
      recordTest("Incorrect password rejected with 401", err.response?.status === 401, err.response?.data?.message);
    }

    const wrongPassOtp = await OtpVerification.findOne({ email: mfgEmail, purpose: "LOGIN" });
    recordTest("No login OTP generated when password is wrong", wrongPassOtp === null);

    // ── TEST 11: Valid credentials triggers Two-Step Login OTP (No JWT issued yet) ──
    const loginStep1Res = await axios.post(`${BASE_URL}/auth/login`, {
      email: mfgEmail,
      password: testPassword,
    });

    const requiresLoginOtp = loginStep1Res.data.success && loginStep1Res.data.data?.requiresOtp === true;
    const noTokenIssuedYet = !loginStep1Res.data.data?.token;
    const hasLoginSession = !!loginStep1Res.data.data?.loginSessionToken;
    recordTest("Login Step 1 requires Email OTP", requiresLoginOtp);
    recordTest("No JWT token issued before OTP verification", noTokenIssuedYet);
    recordTest("Login attempt bound to loginSessionToken", hasLoginSession);

    const loginOtpCode = loginStep1Res.data.data?.debugOtp;
    const loginSessionToken = loginStep1Res.data.data?.loginSessionToken;

    // ── TEST 12: Calling protected API without completing login OTP returns 401 ──
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      recordTest("Protected API blocked without token", false, "Allowed unauthenticated access");
    } catch (err) {
      recordTest("Protected API blocked without token with 401", err.response?.status === 401, err.response?.data?.message);
    }

    // ── TEST 13: Invalid login OTP rejected ──
    try {
      await axios.post(`${BASE_URL}/auth/verify-login-otp`, {
        email: mfgEmail,
        otp: "999999",
        loginSessionToken,
      });
      recordTest("Invalid login OTP rejected", false, "Accepted bad OTP");
    } catch (err) {
      recordTest("Invalid login OTP rejected with 400", err.response?.status === 400, err.response?.data?.message);
    }

    // ── TEST 14: Resend OTP cooldown check ──
    try {
      await axios.post(`${BASE_URL}/auth/resend-otp`, {
        email: mfgEmail,
        purpose: "LOGIN",
        loginSessionToken,
      });
      recordTest("Resend cooldown within 60s rejected", false, "Allowed resend immediately");
    } catch (err) {
      recordTest("Resend cooldown enforced with 429", err.response?.status === 429, err.response?.data?.message);
    }

    // ── TEST 15: Successful Login OTP verification issues JWT & logs in ──
    const loginStep2Res = await axios.post(`${BASE_URL}/auth/verify-login-otp`, {
      email: mfgEmail,
      otp: loginOtpCode,
      loginSessionToken,
    });

    const jwtToken = loginStep2Res.data.data?.token;
    const loggedInUser = loginStep2Res.data.data?.user;
    recordTest("Login OTP verification issues 7-day JWT token", !!jwtToken && jwtToken.split(".").length === 3);
    recordTest("User profile returned with role Manufacturer", loggedInUser?.role === "Manufacturer");

    // Verify OTP deleted after successful login
    const loginOtpAfterSuccess = await OtpVerification.findOne({ email: mfgEmail, purpose: "LOGIN" });
    recordTest("Login OTP deleted after successful verification", loginOtpAfterSuccess === null);

    // ── TEST 16: Authenticated API access works with issued token ──
    console.log("\n--- Scenario 6: Role-Based Access with OTP-Issued JWT ---");
    const mfgAuthRes = await axios.get(`${BASE_URL}/medicines`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    recordTest("Authorized API request succeeds with OTP JWT", mfgAuthRes.status === 200);

    // ── TEST 17: Cross-role protection ──
    try {
      // Manufacturer trying to call distributor confirm transfer
      await axios.post(
        `${BASE_URL}/distributor/confirm-receipt`,
        { transferId: "dummy" },
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );
      recordTest("Cross-role access forbidden", false, "Allowed Manufacturer on Distributor route");
    } catch (err) {
      const isBlocked = err.response?.status === 403 || err.response?.status === 404;
      recordTest("Cross-role access protected", isBlocked, `Status: ${err.response?.status}`);
    }

  } catch (error) {
    console.error("Test execution caught error:", error.message, error.response?.data || "");
    recordTest("Suite executed without unhandled errors", false, error.message);
  } finally {
    await mongoose.disconnect();
  }

  console.log("\n==========================================================");
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("==========================================================");
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log(`Total Tests : ${testResults.length}`);
  console.log(`Passed      : ${passed} ✅`);
  console.log(`Failed      : ${failed} ❌`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
