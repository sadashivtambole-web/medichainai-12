import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import {
  User,
  ManufacturerProfile,
  DistributorProfile,
  PharmacyProfile,
  CustomerProfile,
  Medicine,
  SupplyChainTransaction,
  Transfer,
  Verification,
  AiAnalysis,
  AiAnalysisLog,
  BlockchainTransaction,
  AuditLog,
  Notification,
  OtpVerification,
  SecurityAlert,
  SupplyChainLink,
} from "./models.js";
import {
  getProfileForUser,
  createOrUpdateProfile,
  getSafeUserWithProfile,
} from "./services/profileService.js";
import {
  upload,
  uploadRegistrationDocs,
  UPLOADS_DIR,
  PROTECTED_UPLOADS_DIR,
  verifyToken,
  requireRole,
  sendSuccess,
  sendError,
  getJwtSecret,
} from "./middleware.js";
import { emailService } from "./services/emailService.js";
import {
  drugChainService,
  recordMedicineOnChain,
  recordTransferOnChain,
  recordReceiptOnChain,
  verifyMedicineOnChain,
  getBlockchainStatus,
  validateDrugChain,
  calculateMedicineDataHash,
} from "./blockchain.js";
import {
  loginLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  aiVerifyLimiter,
  publicVerifyLimiter,
  registrationLimiter,
} from "./middleware/rateLimiter.js";
import { schemas, validate } from "./validators/index.js";
import { logger } from "./utils/logger.js";
import {
  runFullAuthenticityAudit,
  generateSecureQRToken,
  parseAndVerifyQRToken,
  processAIAndOCR,
  escapeRegex,
} from "./services/verificationEngine.js";
import { aiService } from "./services/ai/ai.service.js";

const router = express.Router();

// Single source of truth for JWT secret from middleware
const EFFECTIVE_JWT_SECRET = getJwtSecret();

/* ═══════════════════════════════════════════════════════════════
   SECURITY RISK EVALUATION HELPER — produces SecurityAlert records.
   NEVER reveals detailed findings to the submitting party.
   Only admins (Creator role) can access /api/security-alerts.
═══════════════════════════════════════════════════════════════ */
async function evaluateAndLogSecurityRisk({
  sourceType,
  submittedByUser,         // Mongoose User document (may be null for pre-save)
  submittedByEmail = "",
  submittedByName = "",
  submittedByRole = "",
  relatedResourceType = "",
  relatedResourceId = "",
  data = {},               // Raw submission fields to inspect
}) {
  const flags = [];
  let riskScore = 0;

  const email = (submittedByEmail || "").toLowerCase();
  const companyName = (data.companyName || data.company || "").trim().toLowerCase();
  const companyCode = (data.companyCode || data.licenseNumber || "").trim().toLowerCase();
  const medicineName = (data.medicineName || data.name || "").trim().toLowerCase();
  const manufacturingDate = data.manufacturingDate || "";
  const expiryDate = data.expiryDate || "";
  const price = (data.price || "").toString().trim();
  const batchId = (data.batchId || data.batchNumber || "").trim().toLowerCase();

  // ── Registration-level signals ──────────────────────────────────
  if (sourceType === "MANUFACTURER_REGISTRATION") {
    // Suspicious email patterns
    if (/\+|temp|fake|test\d|noreply|throw/.test(email)) {
      flags.push("Suspicious email pattern detected in registrant address");
      riskScore += 20;
    }
    // Very short company name (1–2 chars)
    if (companyName.length > 0 && companyName.length < 3) {
      flags.push("Company name is unusually short — possible placeholder");
      riskScore += 15;
    }
    // Generic / placeholder company names
    if (/^(test|company|abc|xyz|sample|dummy|pharma|drug|lab)$/.test(companyName)) {
      flags.push(`Generic or placeholder company name detected: "${data.companyName || data.company}"`); 
      riskScore += 25;
    }
    // Suspiciously short or sequential license/code
    if (companyCode.length > 0 && companyCode.length < 4) {
      flags.push("License/company code is unusually short");
      riskScore += 15;
    }
    if (/^(1234|0000|1111|9999|abcd|test)/.test(companyCode)) {
      flags.push(`Sequential or placeholder license code: "${data.companyCode || data.licenseNumber}"`);
      riskScore += 30;
    }
  }

  // ── Medicine-level signals ──────────────────────────────────────
  if (sourceType === "MEDICINE_REGISTRATION") {
    // Expired before manufacturing
    if (manufacturingDate && expiryDate) {
      const mfg = new Date(manufacturingDate);
      const exp = new Date(expiryDate);
      const diffDays = (exp - mfg) / 86400000;
      if (diffDays < 30) {
        flags.push(`Extremely short medicine validity window: only ${Math.round(diffDays)} days between manufacturing and expiry`);
        riskScore += 35;
      }
    }
    // Already expired on registration date
    if (expiryDate && new Date(expiryDate) < new Date()) {
      flags.push(`Medicine registered with an already-expired date: ${expiryDate}`);
      riskScore += 50;
    }
    // Price anomalies
    if (price) {
      const priceNum = parseFloat(price.replace(/[^\d.]/g, ""));
      if (!isNaN(priceNum) && priceNum <= 0) {
        flags.push(`Zero or negative medicine price submitted: "${price}"`);
        riskScore += 20;
      }
      if (!isNaN(priceNum) && priceNum > 100000) {
        flags.push(`Unusually high medicine price: "${price}" — possible data entry error or fraud`);
        riskScore += 15;
      }
    }
    // Suspicious batch ID patterns
    if (/^(test|batch|abc|0000|1234|fake|sample)/i.test(batchId)) {
      flags.push(`Suspicious batch ID pattern: "${data.batchId || data.batchNumber}"`);
      riskScore += 25;
    }
    // Generic medicine names
    if (/^(medicine|drug|tablet|capsule|pill|test|sample)$/i.test(medicineName)) {
      flags.push(`Generic placeholder medicine name submitted: "${data.medicineName || data.name}"`);
      riskScore += 20;
    }
    // Manufacturing date in the future (more than 7 days)
    if (manufacturingDate && new Date(manufacturingDate) > new Date(Date.now() + 7 * 86400000)) {
      flags.push(`Future manufacturing date submitted: ${manufacturingDate}`);
      riskScore += 30;
    }
  }

  // Only create an alert if at least one flag was raised
  if (flags.length === 0) return null;

  const severity = riskScore >= 60 ? "CRITICAL" : riskScore >= 40 ? "HIGH" : riskScore >= 20 ? "MEDIUM" : "LOW";

  const titleMap = {
    MANUFACTURER_REGISTRATION: "Suspicious Manufacturer Registration",
    MEDICINE_REGISTRATION: "Suspicious Medicine Registration",
    MEDICINE_RESUBMISSION: "Suspicious Medicine Resubmission",
  };

  try {
    const alert = await SecurityAlert.create({
      sourceType,
      severity,
      status: "OPEN",
      submittedByUserId: submittedByUser?._id || null,
      submittedByEmail: submittedByUser?.email || submittedByEmail,
      submittedByName: submittedByUser?.name || submittedByName,
      submittedByRole: submittedByUser?.role || submittedByRole,
      relatedResourceType,
      relatedResourceId,
      title: titleMap[sourceType] || "Suspicious Submission",
      description: `${flags.length} risk signal(s) detected during automated validation. Risk score: ${riskScore}/100.`,
      riskFlags: flags,
      riskScore,
    });
    logger.warn(`[SECURITY ALERT] ${sourceType} | score=${riskScore} | severity=${severity} | by=${submittedByEmail}`, { flags });
    return alert;
  } catch (err) {
    logger.warn("Could not save SecurityAlert", { message: err.message });
    return null;
  }
}


/* ══════════════════════════════════════════════════════════════════════
   1. AUTHENTICATION, LIVE EMAIL OTP & REGISTRATION APIS
══════════════════════════════════════════════════════════════════════ */
const VALID_ROLES = ["Manufacturer", "Distributor", "Pharmacy", "Customer"];

/**
 * Mask an email address for privacy (e.g., "m***r@pharma.com")
 */
function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

// 1.0 Live Email OTP Dispatch
router.post("/auth/send-otp", otpSendLimiter, validate(schemas.sendOtp), async (req, res) => {
  try {
    const { email, fullName } = req.body;
    if (!email || !email.trim()) {
      return sendError(res, "Email address is required to receive OTP", "EMAIL_REQUIRED", 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return sendError(res, "Please provide a valid email address", "INVALID_EMAIL", 400);
    }

    // Check if account already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return sendError(res, "An account with this email is already registered", "DUPLICATE_EMAIL", 409);
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = generateSecureOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    // Invalidate previous OTPs for this email with purpose REGISTRATION
    await OtpVerification.deleteMany({ email: cleanEmail, purpose: "REGISTRATION" });

    // Store new OTP record (5 minute expiry per security specs)
    const otpDoc = new OtpVerification({
      email: cleanEmail,
      otpHash,
      purpose: "REGISTRATION",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      lastResentAt: new Date(),
      verified: false,
    });
    await otpDoc.save();

    // Dispatch Email Notification
    const emailRes = await emailService.sendOtpEmail({
      toEmail: cleanEmail,
      otp: rawOtp,
      fullName: fullName || "Valued User",
      purpose: "REGISTRATION",
    });

    if (!emailRes.success && emailRes.mode !== "JSON_TEST") {
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: "REGISTRATION" });
      return sendError(res, `Failed to deliver OTP: ${emailRes.error || "Email delivery failed"}`, "EMAIL_DELIVERY_FAILED", 502);
    }

    return sendSuccess(
      res,
      {
        email: cleanEmail,
        maskedEmail: maskEmail(cleanEmail),
        expiresIn: "5 minutes",
        deliveryMode: emailRes.mode,
        debugOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
      },
      `Live 6-digit OTP dispatched to ${maskEmail(cleanEmail)}.`
    );
  } catch (err) {
    return sendError(res, err.message, "OTP_SEND_FAILED", 500);
  }
});

// 1.0.1 Live Email OTP Verification
router.post("/auth/verify-otp", otpVerifyLimiter, validate(schemas.verifyOtp), async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return sendError(res, "Email and 6-digit OTP code are required", "VALIDATION_ERROR", 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const record = await OtpVerification.findOne({
      email: cleanEmail,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return sendError(res, "OTP has expired or does not exist. Please request a new code.", "OTP_EXPIRED", 400);
    }

    const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
    if (!isMatch) {
      return sendError(res, "Invalid OTP code. Please check and re-enter.", "INVALID_OTP", 400);
    }

    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();

    return sendSuccess(
      res,
      { email: cleanEmail, verified: true },
      "Email address verified successfully!"
    );
  } catch (err) {
    return sendError(res, err.message, "OTP_VERIFY_FAILED", 500);
  }
});

// 1.0.2 Forgot Password - Dispatch Password Reset OTP
router.post("/auth/forgot-password", otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return sendError(res, "Email address is required to reset password", "EMAIL_REQUIRED", 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Security: Don't reveal if account exists, but for ease of use in internal platforms return clean message
      return sendError(res, "No account found matching this email address", "USER_NOT_FOUND", 404);
    }

    // Generate secure 6-digit numeric OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(8);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    // Invalidate previous OTPs for this email
    await OtpVerification.deleteMany({ email: cleanEmail });

    // Store new OTP record (10 minute expiry)
    const otpDoc = new OtpVerification({
      email: cleanEmail,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });
    await otpDoc.save();

    // Dispatch Email Notification
    const emailRes = await emailService.sendOtpEmail({
      toEmail: cleanEmail,
      otp: rawOtp,
      fullName: user.name || "Valued User",
    });

    return sendSuccess(
      res,
      {
        email: cleanEmail,
        expiresIn: "10 minutes",
        deliveryMode: emailRes.mode,
        debugOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
      },
      `A 6-digit password reset code has been sent to ${cleanEmail}.`
    );
  } catch (err) {
    return sendError(res, err.message, "FORGOT_PASSWORD_FAILED", 500);
  }
});

// 1.0.3 Reset Password With Verified OTP
router.post("/auth/reset-password", otpVerifyLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return sendError(res, "Email, OTP code, and new password are required", "VALIDATION_ERROR", 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, "Password must be at least 6 characters long", "WEAK_PASSWORD", 400);
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return sendError(res, "Passwords do not match", "PASSWORD_MISMATCH", 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const record = await OtpVerification.findOne({
      email: cleanEmail,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return sendError(res, "Password reset OTP has expired or does not exist. Please request a new code.", "OTP_EXPIRED", 400);
    }

    const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
    if (!isMatch) {
      return sendError(res, "Invalid OTP code. Please check and re-enter.", "INVALID_OTP", 400);
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return sendError(res, "User account not found", "USER_NOT_FOUND", 404);
    }

    user.password = newPassword; // Hashed by User pre-save hook
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();

    // Audit Log
    try {
      await AuditLog.create({
        userId: user._id,
        email: user.email,
        role: user.role,
        action: "PASSWORD_RESET_SUCCESS",
        resource: "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
      });
    } catch (e) {}

    return sendSuccess(res, { email: cleanEmail }, "Your password has been reset successfully! You can now log in.");
  } catch (err) {
    return sendError(res, err.message, "RESET_PASSWORD_FAILED", 500);
  }
});


// Helper to save base64 live camera capture to protected disk
function saveBase64IdentityPhoto(base64Data, userEmail) {
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const ext = matches[1].includes("png") ? ".png" : ".jpg";
    const cleanEmail = userEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `protected_live_cam_${cleanEmail}_${Date.now()}${ext}`;
    const filePath = path.join(PROTECTED_UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(matches[2], "base64"));
    return filename;
  } catch (err) {
    console.error("Error saving live camera photo:", err.message);
    return null;
  }
}

// 1.1 Professional User Registration (Uses the password given during registration)
router.post(
  "/auth/register",
  registrationLimiter,
  uploadRegistrationDocs.fields([
    { name: "identityPhoto", maxCount: 1 },
    { name: "governmentId", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let {
        name,
        fullName,
        email,
        password,
        confirmPassword,
        role,
        company,
        companyName,
        companyCode,
        phone,
        walletAddress,
        identityPhotoBase64,
        governmentIdType,
      } = req.body;

      const effectiveName = (fullName || name || "").trim();
      const effectiveCompany = (companyName || company || "").trim();
      const effectiveEmail = (email || "").toLowerCase().trim();

      if (!effectiveName || !effectiveEmail || !password) {
        return sendError(res, "Full Name, email, and password are required", "VALIDATION_ERROR", 400);
      }

      // Explicitly forbid public registration as Creator
      if (role && role.toLowerCase() === "creator") {
        return sendError(
          res,
          "Registration as Creator is restricted. Creator accounts are provisioned by system administration.",
          "CREATOR_REGISTRATION_FORBIDDEN",
          403
        );
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(effectiveEmail)) {
        return sendError(res, "Please provide a valid email address", "INVALID_EMAIL", 400);
      }

      // Password length validation
      if (password.length < 6) {
        return sendError(res, "Password must be at least 6 characters long", "WEAK_PASSWORD", 400);
      }

      // Confirm password check
      if (confirmPassword && password !== confirmPassword) {
        return sendError(res, "Passwords do not match", "PASSWORD_MISMATCH", 400);
      }

      // Role validation: Normalize role to TitleCase
      const formattedRole = role
        ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
        : "Customer";

      if (!VALID_ROLES.includes(formattedRole)) {
        return sendError(res, `Invalid role. Allowed public roles are: ${VALID_ROLES.join(", ")}`, "INVALID_ROLE", 400);
      }

      // Duplicate email check
      const existingUser = await User.findOne({ email: effectiveEmail });
      if (existingUser) {
        return sendError(res, "An account with this email already exists", "DUPLICATE_EMAIL", 409);
      }

      // Professional role requirements (Manufacturer, Distributor, Pharmacy)
      let identityPhotoPath = null;
      let governmentIdPath = null;

      if (["Manufacturer", "Distributor", "Pharmacy"].includes(formattedRole)) {
        if (!phone || !phone.trim()) {
          return sendError(res, "Phone Number is required for professional verification", "MISSING_PHONE", 400);
        }
        if (!effectiveCompany) {
          return sendError(res, "Organization / Company Name is required", "MISSING_COMPANY", 400);
        }
        if (!companyCode || !companyCode.trim()) {
          return sendError(res, "Official Organization Code / License Number is required", "MISSING_CODE", 400);
        }

        // Handle Identity Photo (File upload or Live Camera Base64)
        if (req.files?.identityPhoto?.[0]) {
          identityPhotoPath = req.files.identityPhoto[0].filename;
        } else if (identityPhotoBase64 && identityPhotoBase64.startsWith("data:image")) {
          identityPhotoPath = saveBase64IdentityPhoto(identityPhotoBase64, effectiveEmail);
        }

        if (!identityPhotoPath) {
          return sendError(res, "Identity Photo is required for professional account verification. Please capture or upload a clear photo.", "MISSING_IDENTITY_PHOTO", 400);
        }

        // Handle Government ID Document
        if (req.files?.governmentId?.[0]) {
          governmentIdPath = req.files.governmentId[0].filename;
        } else if (req.body.governmentIdBase64 && req.body.governmentIdBase64.startsWith("data:")) {
          governmentIdPath = saveBase64IdentityPhoto(req.body.governmentIdBase64, effectiveEmail);
        }

        if (!governmentIdPath) {
          return sendError(res, "Government ID Proof document is required for professional account verification.", "MISSING_GOVERNMENT_ID", 400);
        }
      }

      // For Customer accounts: Direct registration without identity vetting
      if (formattedRole === "Customer") {
        const user = new User({
          name: effectiveName,
          fullName: effectiveName,
          email: effectiveEmail,
          password, // Hashed by UserSchema pre-save hook
          role: "Customer",
          accountStatus: "APPROVED",
          approvalStatus: "APPROVED",
          submittedAt: new Date(),
          mustChangePassword: false,
          credentialEmailStatus: "PENDING",
          isEmailVerified: true,
        });
        await user.save();

        const profile = await createOrUpdateProfile(user, {
          companyName: effectiveCompany,
          phone: (phone || "").trim(),
          approvalStatus: "APPROVED",
        });

        try {
          await AuditLog.create({
            userId: user._id,
            email: user.email,
            role: user.role,
            action: "USER_REGISTRATION",
            resource: "User",
            resourceId: user._id.toString(),
            ipAddress: req.ip || "127.0.0.1",
            result: "SUCCESS",
            details: { role: user.role, accountStatus: "APPROVED" },
          });
        } catch (logErr) {}

        const token = jwt.sign(
          {
            userId: user._id,
            id: user._id,
            email: user.email,
            role: user.role,
            company: effectiveCompany,
            accountStatus: user.accountStatus,
          },
          EFFECTIVE_JWT_SECRET,
          { expiresIn: "7d" }
        );

        logger.auth("Customer registered", { email: effectiveEmail, role: formattedRole });
        return sendSuccess(
          res,
          {
            user: user.toSafeObject(profile),
            token,
            accountStatus: "APPROVED",
            message: "Registration successful! You are now logged in.",
          },
          "Registration successful",
          201
        );
      }

      // For Professional Roles (Manufacturer, Distributor, Pharmacy):
      // 1. Check 60-second cooldown on existing OTP for registration
      const existingOtp = await OtpVerification.findOne({
        email: effectiveEmail,
        purpose: "REGISTRATION",
      }).sort({ createdAt: -1 });

      if (existingOtp && existingOtp.lastResentAt) {
        const elapsed = Math.floor((Date.now() - new Date(existingOtp.lastResentAt).getTime()) / 1000);
        if (elapsed < 60) {
          return sendError(
            res,
            `A verification code was recently sent. Please wait ${60 - elapsed} seconds before requesting a new code.`,
            "RESEND_COOLDOWN",
            429
          );
        }
      }

      // 2. Generate 6-digit cryptographically secure OTP and unique registration ID
      const rawOtp = generateSecureOtp();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(rawOtp, salt);
      const registrationId = `REG-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const hashedPassword = await bcrypt.hash(password, 10);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute persistent window

      // Invalidate existing registration OTPs for this email
      await OtpVerification.deleteMany({ email: effectiveEmail, purpose: "REGISTRATION" });

      // 3. Store temporary registration payload and hashed OTP in MongoDB (15-minute expiry)
      await OtpVerification.create({
        registrationId,
        email: effectiveEmail,
        otpHash,
        purpose: "REGISTRATION",
        role: formattedRole,
        tempRegistrationData: {
          effectiveName,
          effectiveEmail,
          hashedPassword,
          password: hashedPassword, // Backward-compat
          role: formattedRole,
          effectiveCompany,
          companyCode: (companyCode || "").trim(),
          phone: (phone || "").trim(),
          walletAddress: (walletAddress || "").trim(),
          identityPhotoPath,
          governmentIdPath,
          governmentIdType: governmentIdType || "Government Identity Document",
        },
        attempts: 0,
        lastResentAt: new Date(),
        expiresAt,
        verified: false,
      });

      // 4. Dispatch Email OTP via configured SMTP service
      const emailRes = await emailService.sendOtpEmail({
        toEmail: effectiveEmail,
        otp: rawOtp,
        fullName: effectiveName,
        purpose: "REGISTRATION",
        role: formattedRole,
      });

      if (!emailRes.success && emailRes.mode !== "JSON_TEST") {
        await OtpVerification.deleteMany({ email: effectiveEmail, purpose: "REGISTRATION" });
        return sendError(
          res,
          `Failed to deliver verification code to ${effectiveEmail}: ${emailRes.error || "Email service error"}. Please verify your email configuration.`,
          "EMAIL_DELIVERY_FAILED",
          502
        );
      }

      logger.auth("Registration OTP dispatched", { email: effectiveEmail, role: formattedRole, registrationId });

      return sendSuccess(
        res,
        {
          requiresOtp: true,
          registrationId,
          email: effectiveEmail,
          maskedEmail: maskEmail(effectiveEmail),
          purpose: "REGISTRATION",
          role: formattedRole,
          expiresIn: "15 minutes",
          debugOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
        },
        `A 6-digit verification code has been dispatched to ${maskEmail(effectiveEmail)}. Please verify your email to complete registration.`
      );
    } catch (err) {
      return sendError(res, err.message, "REGISTRATION_FAILED", 500);
    }
  }
);

// 1.1.1 Verify Registration OTP & Activate Pending Creator Review
router.post(
  "/auth/verify-registration-otp",
  otpVerifyLimiter,
  validate(schemas.verifyRegistrationOtp),
  async (req, res) => {
    try {
      const { email, otp, registrationId } = req.body;
      const cleanEmail = (email || "").toLowerCase().trim();
      const cleanOtp = (otp || "").toString().trim();
      const cleanRegistrationId = (registrationId || "").trim();

      if (!cleanOtp) {
        return sendError(res, "Verification code is required.", "INVALID_INPUT", 400);
      }
      if (!cleanEmail && !cleanRegistrationId) {
        return sendError(res, "Email or Registration ID is required.", "INVALID_INPUT", 400);
      }

      // Query by registrationId OR email for maximum reliability across refresh & server restarts
      const query = {
        purpose: "REGISTRATION",
        expiresAt: { $gt: new Date() },
      };
      if (cleanRegistrationId && cleanEmail) {
        query.$or = [{ registrationId: cleanRegistrationId }, { email: cleanEmail }];
      } else if (cleanRegistrationId) {
        query.registrationId = cleanRegistrationId;
      } else {
        query.email = cleanEmail;
      }

      const record = await OtpVerification.findOne(query).sort({ createdAt: -1 });

      if (!record || !record.tempRegistrationData) {
        logger.warn("Registration OTP lookup failed: Session expired or not found", {
          email: cleanEmail,
          registrationId: cleanRegistrationId,
        });
        return sendError(
          res,
          "Registration session has expired or was not found. Please submit your registration details again.",
          "OTP_EXPIRED",
          400
        );
      }

      if (record.attempts >= 5) {
        await OtpVerification.deleteOne({ _id: record._id });
        return sendError(
          res,
          "Too many failed verification attempts. Please register again to receive a fresh verification code.",
          "MAX_ATTEMPTS_EXCEEDED",
          429
        );
      }

      const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
      if (!isMatch) {
        record.attempts = (record.attempts || 0) + 1;
        await record.save();
        const remaining = Math.max(0, 5 - record.attempts);
        return sendError(
          res,
          `Invalid verification code. ${remaining} attempt(s) remaining.`,
          "INVALID_OTP",
          400
        );
      }

      // Check duplicate email again in User collection to prevent race conditions
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        await OtpVerification.deleteMany({
          $or: [
            { email: cleanEmail, purpose: "REGISTRATION" },
            ...(cleanRegistrationId ? [{ registrationId: cleanRegistrationId }] : []),
          ],
        });
        return sendError(res, "An account with this email is already registered.", "DUPLICATE_EMAIL", 409);
      }

      const temp = record.tempRegistrationData;

      // Invalidate OTP record immediately upon successful verification
      await OtpVerification.deleteMany({
        $or: [
          { email: cleanEmail, purpose: "REGISTRATION" },
          ...(cleanRegistrationId ? [{ registrationId: cleanRegistrationId }] : []),
        ],
      });

      // 1. Save Authentication Record in Users Collection (using pre-hashed password)
      const user = new User({
        name: temp.effectiveName,
        fullName: temp.effectiveName,
        email: cleanEmail,
        password: temp.hashedPassword || temp.password,
        role: temp.role,
        accountStatus: "PENDING",
        approvalStatus: "PENDING",
        submittedAt: new Date(),
        mustChangePassword: false,
        credentialEmailStatus: "PENDING",
        isEmailVerified: true,
      });

      await user.save();

      // 2. Save Business Profile in Dedicated Role Collection
      const profile = await createOrUpdateProfile(user, {
        companyName: temp.effectiveCompany,
        companyCode: temp.companyCode,
        licenseNumber: temp.companyCode,
        phone: temp.phone,
        walletAddress: temp.walletAddress,
        identityPhoto: temp.identityPhotoPath,
        governmentId: temp.governmentIdPath,
        governmentIdType: temp.governmentIdType,
        approvalStatus: "PENDING",
      });

      // 3. Record in Audit Log
      try {
        await AuditLog.create({
          userId: user._id,
          email: user.email,
          role: user.role,
          action: "USER_REGISTRATION",
          resource: "User",
          resourceId: user._id.toString(),
          ipAddress: req.ip || "127.0.0.1",
          result: "SUCCESS",
          details: { role: user.role, accountStatus: "PENDING", isEmailVerified: true },
        });
      } catch (logErr) {}

      logger.auth("User registration verified via OTP", { email: cleanEmail, role: temp.role });

      // Run silent security risk evaluation asynchronously
      evaluateAndLogSecurityRisk({
        sourceType: "MANUFACTURER_REGISTRATION",
        submittedByUser: user,
        relatedResourceType: "User",
        relatedResourceId: user._id.toString(),
        data: {
          companyName: temp.effectiveCompany,
          companyCode: temp.companyCode,
          licenseNumber: temp.companyCode,
        },
      }).catch(() => {});

      return sendSuccess(
        res,
        {
          user: user.toSafeObject(profile),
          accountStatus: "PENDING",
          isEmailVerified: true,
          message:
            "Your email has been verified successfully! Your application has been submitted for Creator identity review. You can log in with your registered password once approved.",
        },
        "Email verified and registration submitted for Creator review",
        201
      );
    } catch (err) {
      logger.error("Verify registration OTP error", { message: err.message });
      return sendError(res, "Registration verification failed", "REGISTRATION_VERIFY_FAILED", 500);
    }
  }
);

// 1.2 Rejected User Resubmission
router.patch(
  "/auth/resubmit",
  uploadRegistrationDocs.fields([
    { name: "identityPhoto", maxCount: 1 },
    { name: "governmentId", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { email, password, fullName, phone, companyName, companyCode, identityPhotoBase64 } = req.body;

      if (!email || !password) {
        return sendError(res, "Email and password are required to verify your application", "AUTH_REQUIRED", 400);
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) return sendError(res, "Application not found", "USER_NOT_FOUND", 404);

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return sendError(res, "Invalid credentials", "AUTH_FAILED", 401);

      if (user.accountStatus !== "REJECTED") {
        return sendError(res, `Cannot resubmit account in ${user.accountStatus} status`, "INVALID_STATUS", 400);
      }

      // Record resubmission history
      user.resubmissionHistory = user.resubmissionHistory || [];
      user.resubmissionHistory.push({
        submittedAt: user.submittedAt || new Date(),
        identityPhoto: user.identityPhoto,
        governmentId: user.governmentId,
        company: user.company,
        rejectionReason: user.rejectionReason,
      });

      // Update fields
      if (fullName) {
        user.name = fullName.trim();
        user.fullName = fullName.trim();
      }
      if (phone) user.phone = phone.trim();
      if (companyName) {
        user.company = companyName.trim();
        user.companyName = companyName.trim();
      }
      if (companyCode) user.companyCode = companyCode.trim();

      // Check updated documents
      if (req.files?.identityPhoto?.[0]) {
        user.identityPhoto = req.files.identityPhoto[0].filename;
      } else if (identityPhotoBase64 && identityPhotoBase64.startsWith("data:image")) {
        const saved = saveBase64IdentityPhoto(identityPhotoBase64, user.email);
        if (saved) user.identityPhoto = saved;
      }

      if (req.files?.governmentId?.[0]) {
        user.governmentId = req.files.governmentId[0].filename;
      }

      user.accountStatus = "PENDING";
      user.approvalStatus = "PENDING";
      user.submittedAt = new Date();
      user.rejectionReason = "";

      await user.save();

      // Update role profile in separate collection
      const profile = await createOrUpdateProfile(user, {
        companyName: companyName ? companyName.trim() : undefined,
        companyCode: companyCode ? companyCode.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        identityPhoto: user.identityPhoto,
        governmentId: user.governmentId,
        approvalStatus: "PENDING",
      });

      // Audit Log
      try {
        await AuditLog.create({
          userId: user._id,
          email: user.email,
          role: user.role,
          action: "ACCOUNT_RESUBMITTED",
          resource: "User",
          resourceId: user._id.toString(),
          ipAddress: req.ip || "127.0.0.1",
          result: "SUCCESS",
        });
      } catch (logErr) {}

      return sendSuccess(res, user.toSafeObject(profile), "Application updated and resubmitted for Creator approval.");
    } catch (err) {
      return sendError(res, err.message, "RESUBMISSION_FAILED", 500);
    }
  }
);

// 1.3 User Login
router.post("/auth/login", loginLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, "Email and password are required", "VALIDATION_ERROR", 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      try {
        await AuditLog.create({
          email: cleanEmail,
          action: "LOGIN_FAILED",
          resource: "User",
          ipAddress: req.ip || "127.0.0.1",
          result: "FAILED",
          details: { reason: "User not found" },
        });
      } catch (e) {}
      return sendError(res, "Invalid email or password", "AUTH_FAILED", 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      try {
        await AuditLog.create({
          userId: user._id,
          email: user.email,
          role: user.role,
          action: "LOGIN_FAILED",
          resource: "User",
          resourceId: user._id.toString(),
          ipAddress: req.ip || "127.0.0.1",
          result: "FAILED",
          details: { reason: "Password mismatch" },
        });
      } catch (e) {}
      return sendError(res, "Invalid email or password", "AUTH_FAILED", 401);
    }

    // Check account status
    const isCreator = (user.role || "").toLowerCase() === "creator";
    if (!isCreator) {
      if (user.accountStatus === "PENDING") {
        return sendError(
          res,
          "Your account is waiting for Creator approval.",
          "ACCOUNT_PENDING",
          403
        );
      }
      if (user.accountStatus === "REJECTED") {
        const rejectionMsg = user.rejectionReason
          ? `Your account has not been approved: ${user.rejectionReason}`
          : "Your account has not been approved.";
        return res.status(403).json({
          success: false,
          message: rejectionMsg,
          code: "ACCOUNT_REJECTED",
          rejectionReason: user.rejectionReason || "Application rejected by Creator.",
          canResubmit: true,
          email: user.email,
        });
      }
      if (user.accountStatus === "SUSPENDED") {
        return sendError(
          res,
          "Your account has been suspended by the Creator. Please contact administrator.",
          "ACCOUNT_SUSPENDED",
          403
        );
      }
    }

    // Direct login for Creator (system admin) and Customer roles
    if (isCreator || (user.role || "").toLowerCase() === "customer") {
      const profile = await getProfileForUser(user);
      const token = jwt.sign(
        {
          id: user._id,
          userId: user._id,
          role: user.role,
          email: user.email,
          company: profile?.companyName || profile?.pharmacyName || "",
        },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: "7d" }
      );
      logger.auth("Direct login successful", { email: user.email, role: user.role });

      try {
        await AuditLog.create({
          userId: user._id,
          email: user.email,
          role: user.role,
          action: "LOGIN_SUCCESS",
          resource: "User",
          resourceId: user._id.toString(),
          ipAddress: req.ip || "127.0.0.1",
          result: "SUCCESS",
        });
      } catch (e) {}

      return sendSuccess(
        res,
        {
          user: user.toSafeObject(profile),
          token,
          mustChangePassword: !!user.mustChangePassword,
        },
        "Login successful"
      );
    }

    // ── Two-Step Login with Email OTP for Manufacturer, Distributor, Pharmacy ──
    const rawOtp = generateSecureOtp();
    const loginSessionToken = crypto.randomBytes(32).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    // Invalidate previous LOGIN OTPs for this email
    await OtpVerification.deleteMany({ email: cleanEmail, purpose: "LOGIN" });

    // Store new OTP record (5 minute expiry per security specs)
    await OtpVerification.create({
      email: cleanEmail,
      otpHash,
      purpose: "LOGIN",
      role: user.role,
      loginAttemptId: loginSessionToken,
      attempts: 0,
      lastResentAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      verified: false,
    });

    // Send OTP email
    const emailRes = await emailService.sendOtpEmail({
      toEmail: cleanEmail,
      otp: rawOtp,
      fullName: user.name || user.fullName || "Partner",
      purpose: "LOGIN",
      role: user.role,
    });

    if (!emailRes.success && emailRes.mode !== "JSON_TEST") {
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: "LOGIN" });
      return sendError(
        res,
        `Failed to deliver login verification code to your email: ${emailRes.error || "Email provider error"}. Please check your email configuration.`,
        "EMAIL_DELIVERY_FAILED",
        502
      );
    }

    logger.auth("Login OTP dispatched", { email: cleanEmail, role: user.role });

    return sendSuccess(
      res,
      {
        requiresOtp: true,
        email: cleanEmail,
        maskedEmail: maskEmail(cleanEmail),
        loginSessionToken,
        purpose: "LOGIN",
        role: user.role,
        expiresIn: "5 minutes",
        debugOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
      },
      `A 6-digit verification code has been dispatched to ${maskEmail(cleanEmail)}.`
    );
  } catch (err) {
    logger.error("Login error", { message: err.message });
    return sendError(res, "Login failed due to server error", "LOGIN_FAILED", 500);
  }
});

// 1.3.1 Verify Login OTP & Complete Two-Step Authentication
router.post(
  "/auth/verify-login-otp",
  otpVerifyLimiter,
  validate(schemas.verifyLoginOtp),
  async (req, res) => {
    try {
      const { email, otp, loginSessionToken } = req.body;
      const cleanEmail = email.toLowerCase().trim();
      const cleanOtp = otp.toString().trim();

      const query = {
        email: cleanEmail,
        purpose: "LOGIN",
        expiresAt: { $gt: new Date() },
      };
      if (loginSessionToken) {
        query.loginAttemptId = loginSessionToken;
      }

      const record = await OtpVerification.findOne(query).sort({ createdAt: -1 });

      if (!record) {
        return sendError(
          res,
          "Verification code has expired or is invalid. Please log in again to receive a new code.",
          "OTP_EXPIRED",
          400
        );
      }

      if (record.attempts >= 5) {
        await OtpVerification.deleteOne({ _id: record._id });
        return sendError(
          res,
          "Too many failed verification attempts. Please log in again to request a new code.",
          "MAX_ATTEMPTS_EXCEEDED",
          429
        );
      }

      const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
      if (!isMatch) {
        record.attempts = (record.attempts || 0) + 1;
        await record.save();
        const remaining = Math.max(0, 5 - record.attempts);
        return sendError(
          res,
          `Invalid verification code. ${remaining} attempt(s) remaining.`,
          "INVALID_OTP",
          400
        );
      }

      // Invalidate OTP record immediately upon successful verification
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: "LOGIN" });

      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return sendError(res, "Account not found", "USER_NOT_FOUND", 404);
      }

      // Final status check
      if (user.accountStatus !== "APPROVED") {
        return sendError(res, `Your account is currently in ${user.accountStatus} status.`, "ACCOUNT_NOT_APPROVED", 403);
      }

      // Mark email as verified
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
      }

      const profile = await getProfileForUser(user);

      // Issue final JWT
      const token = jwt.sign(
        {
          id: user._id,
          userId: user._id,
          role: user.role,
          email: user.email,
          company: profile?.companyName || profile?.pharmacyName || "",
        },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: "7d" }
      );

      logger.auth("Two-step login verified successfully", { email: user.email, role: user.role });

      try {
        await AuditLog.create({
          userId: user._id,
          email: user.email,
          role: user.role,
          action: "LOGIN_SUCCESS",
          resource: "User",
          resourceId: user._id.toString(),
          ipAddress: req.ip || "127.0.0.1",
          result: "SUCCESS",
          details: { verifiedVia: "EMAIL_OTP" },
        });
      } catch (e) {}

      return sendSuccess(
        res,
        {
          user: user.toSafeObject(profile),
          token,
          mustChangePassword: !!user.mustChangePassword,
        },
        "Two-step authentication successful! Welcome back."
      );
    } catch (err) {
      logger.error("Verify login OTP error", { message: err.message });
      return sendError(res, "Verification failed due to server error", "OTP_VERIFY_FAILED", 500);
    }
  }
);

// 1.3.2 Resend OTP (Supports LOGIN, REGISTRATION, and PASSWORD_RESET)
router.post(
  "/auth/resend-otp",
  otpSendLimiter,
  validate(schemas.resendOtp),
  async (req, res) => {
    try {
      const { email, purpose = "LOGIN", loginSessionToken, registrationId } = req.body;
      const cleanEmail = email.toLowerCase().trim();
      const cleanRegId = (registrationId || "").trim();

      // Check 60-second cooldown
      const existingRecord = await OtpVerification.findOne({
        $or: [
          ...(cleanRegId ? [{ registrationId: cleanRegId }] : []),
          { email: cleanEmail, purpose },
        ],
        purpose,
      }).sort({ createdAt: -1 });

      if (existingRecord && existingRecord.lastResentAt) {
        const elapsed = Math.floor((Date.now() - new Date(existingRecord.lastResentAt).getTime()) / 1000);
        if (elapsed < 60) {
          return sendError(
            res,
            `Please wait ${60 - elapsed} seconds before requesting another code.`,
            "RESEND_COOLDOWN",
            429
          );
        }
      }

      let recipientName = "Partner";
      let role = "Manufacturer";

      if (purpose === "LOGIN") {
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
          return sendError(res, "Account not found.", "USER_NOT_FOUND", 404);
        }
        recipientName = user.name || user.fullName || "Partner";
        role = user.role;
      } else if (purpose === "REGISTRATION") {
        if (!existingRecord || !existingRecord.tempRegistrationData) {
          return sendError(
            res,
            "No pending registration session found. Please submit your registration details again.",
            "SESSION_NOT_FOUND",
            400
          );
        }
        recipientName = existingRecord.tempRegistrationData.effectiveName || "Partner";
        role = existingRecord.role || "Manufacturer";
      }

      const rawOtp = generateSecureOtp();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(rawOtp, salt);
      const newSessionToken = loginSessionToken || crypto.randomBytes(32).toString("hex");
      const preservedRegId = existingRecord?.registrationId || cleanRegId || null;

      // Invalidate old OTP
      await OtpVerification.deleteMany({
        $or: [
          { email: cleanEmail, purpose },
          ...(preservedRegId ? [{ registrationId: preservedRegId }] : []),
        ],
      });

      // Create new OTP record (15 minute persistent expiry)
      await OtpVerification.create({
        registrationId: preservedRegId,
        email: cleanEmail,
        otpHash,
        purpose,
        role,
        loginAttemptId: newSessionToken,
        tempRegistrationData: existingRecord?.tempRegistrationData || null,
        attempts: 0,
        lastResentAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
      });

      const emailRes = await emailService.sendOtpEmail({
        toEmail: cleanEmail,
        otp: rawOtp,
        fullName: recipientName,
        purpose,
        role,
      });

      if (!emailRes.success && emailRes.mode !== "JSON_TEST") {
        await OtpVerification.deleteMany({ email: cleanEmail, purpose });
        return sendError(
          res,
          `Failed to dispatch verification email: ${emailRes.error || "Email delivery failed"}`,
          "EMAIL_DELIVERY_FAILED",
          502
        );
      }

      return sendSuccess(
        res,
        {
          registrationId: preservedRegId,
          email: cleanEmail,
          maskedEmail: maskEmail(cleanEmail),
          expiresIn: "15 minutes",
          debugOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
        },
        `A fresh 6-digit verification code has been dispatched to ${maskEmail(cleanEmail)}.`
      );
    } catch (err) {
      logger.error("Resend OTP error", { message: err.message });
      return sendError(res, err.message, "RESEND_FAILED", 500);
    }
  }
);

// 1.3.3 Send OTP Alias (for backward compatibility)
router.post(
  "/auth/send-otp",
  otpSendLimiter,
  async (req, res) => {
    try {
      const { email, fullName = "Partner" } = req.body;
      const cleanEmail = (email || "").toLowerCase().trim();
      if (!cleanEmail) {
        return sendError(res, "Email address is required.", "INVALID_INPUT", 400);
      }

      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return sendError(res, "An account with this email is already registered.", "DUPLICATE_EMAIL", 409);
      }

      // Check 60-second cooldown
      const existingRecord = await OtpVerification.findOne({
        email: cleanEmail,
        purpose: "REGISTRATION",
      }).sort({ createdAt: -1 });

      if (existingRecord && existingRecord.lastResentAt) {
        const elapsed = Math.floor((Date.now() - new Date(existingRecord.lastResentAt).getTime()) / 1000);
        if (elapsed < 60) {
          return sendError(res, `Please wait ${60 - elapsed} seconds before requesting another code.`, "RESEND_COOLDOWN", 429);
        }
      }

      const rawOtp = generateSecureOtp();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(rawOtp, salt);
      const registrationId = `REG-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

      await OtpVerification.deleteMany({ email: cleanEmail, purpose: "REGISTRATION" });

      await OtpVerification.create({
        registrationId,
        email: cleanEmail,
        otpHash,
        purpose: "REGISTRATION",
        role: "Manufacturer",
        attempts: 0,
        lastResentAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
      });

      await emailService.sendOtpEmail({
        toEmail: cleanEmail,
        otp: rawOtp,
        fullName,
        purpose: "REGISTRATION",
      });

      return sendSuccess(
        res,
        {
          requiresOtp: true,
          registrationId,
          email: cleanEmail,
          maskedEmail: maskEmail(cleanEmail),
          expiresIn: "15 minutes",
          debugOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
        },
        `A 6-digit verification code has been dispatched to ${maskEmail(cleanEmail)}.`
      );
    } catch (err) {
      return sendError(res, err.message, "OTP_SEND_FAILED", 500);
    }
  }
);

// 1.4 First-Login Password Change Endpoint
router.post("/auth/change-password", verifyToken, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, "New password must be at least 6 characters long", "WEAK_PASSWORD", 400);
    }
    if (newPassword !== confirmPassword) {
      return sendError(res, "New password and confirmation do not match", "PASSWORD_MISMATCH", 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, "User not found", "USER_NOT_FOUND", 404);

    user.password = newPassword; // Hashed automatically by pre-save hook
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();

    await user.save();

    const profile = req.userProfile || await getProfileForUser(user);

    // Audit Log
    try {
      await AuditLog.create({
        userId: user._id,
        email: user.email,
        role: user.role,
        action: "PASSWORD_CHANGED",
        resource: "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
      });
    } catch (e) {}

    return sendSuccess(
      res,
      { user: user.toSafeObject(profile), mustChangePassword: false },
      "Password updated successfully. You can now access your dashboard."
    );
  } catch (err) {
    return sendError(res, err.message, "PASSWORD_CHANGE_FAILED", 500);
  }
});

router.get("/auth/me", verifyToken, async (req, res) => {
  const profile = req.userProfile || await getProfileForUser(req.user);
  return sendSuccess(res, { user: req.user.toSafeObject(profile) }, "Profile retrieved");
});

/* ══════════════════════════════════════════════════════════════════════
   1.1 CREATOR / SUPER ADMIN CONTROL APIS & IDENTITY REVIEW
══════════════════════════════════════════════════════════════════════ */
router.get("/creator/stats", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const [
      totalUsers,
      pendingApprovals,
      approvedMfr,
      approvedDist,
      approvedPharm,
      totalMedicines,
      activeTransfers,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "Creator" } }),
      User.countDocuments({ accountStatus: "PENDING" }),
      User.countDocuments({ role: "Manufacturer", accountStatus: "APPROVED" }),
      User.countDocuments({ role: "Distributor", accountStatus: "APPROVED" }),
      User.countDocuments({ role: "Pharmacy", accountStatus: "APPROVED" }),
      Medicine.countDocuments(),
      Transfer.countDocuments(),
    ]);

    const chainStatus = drugChainService.getChainStatus ? drugChainService.getChainStatus() : { status: "Connected" };

    return sendSuccess(
      res,
      {
        totalUsers,
        pendingApprovals,
        approvedManufacturers: approvedMfr,
        approvedDistributors: approvedDist,
        approvedPharmacies: approvedPharm,
        registeredMedicines: totalMedicines,
        activeTransfers,
        verificationRecords: totalMedicines,
        blockchainStatus: chainStatus,
      },
      "Creator metrics retrieved"
    );
  } catch (err) {
    return sendError(res, err.message, "CREATOR_STATS_FAILED", 500);
  }
});

router.get("/creator/users", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const query = { role: { $ne: "Creator" } };

    if (role && role !== "ALL") {
      query.role = new RegExp(`^${role}$`, "i");
    }
    if (status && status !== "ALL") {
      query.accountStatus = status.toUpperCase();
    }
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { company: new RegExp(s, "i") },
        { companyCode: new RegExp(s, "i") },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    const usersWithProfiles = await Promise.all(
      users.map(async (u) => {
        const profile = await getProfileForUser(u);
        return u.toSafeObject(profile);
      })
    );
    return sendSuccess(res, usersWithProfiles, "Users retrieved");
  } catch (err) {
    return sendError(res, err.message, "CREATOR_USERS_FAILED", 500);
  }
});

router.get("/creator/users/:userId", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "User not found", "NOT_FOUND", 404);
    const profile = await getProfileForUser(user);
    return sendSuccess(res, user.toSafeObject(profile), "User details retrieved");
  } catch (err) {
    return sendError(res, err.message, "USER_FETCH_FAILED", 500);
  }
});

router.get("/creator/approvals", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const pendingUsers = await User.find({ accountStatus: "PENDING" }).sort({ createdAt: -1 });
    const pendingWithProfiles = await Promise.all(
      pendingUsers.map(async (u) => {
        const profile = await getProfileForUser(u);
        return u.toSafeObject(profile);
      })
    );
    return sendSuccess(res, pendingWithProfiles, "Pending users retrieved");
  } catch (err) {
    return sendError(res, err.message, "APPROVALS_FETCH_FAILED", 500);
  }
});

// 1.5 Secure Protected Document Streaming for Creator
router.get("/creator/users/:userId/identity-photo", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "Candidate user not found", "NOT_FOUND", 404);
    const profile = await getProfileForUser(user);
    const identityPhoto = profile?.identityPhoto || user.identityPhoto;
    if (!identityPhoto) {
      return sendError(res, "Identity photo not found for this candidate", "NOT_FOUND", 404);
    }

    // A. If stored as Base64 Data URL
    if (identityPhoto.startsWith("data:image/")) {
      const matches = identityPhoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", "inline; filename=identity_photo");
        return res.send(buffer);
      }
    }

    // B. Check disk locations
    let resolvedPath = path.join(PROTECTED_UPLOADS_DIR, identityPhoto);
    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = path.join(UPLOADS_DIR, identityPhoto);
    }
    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = path.resolve(identityPhoto);
    }

    if (!fs.existsSync(resolvedPath)) {
      return sendError(res, "Physical photo document file is missing on storage", "FILE_MISSING", 404);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    res.setHeader("Content-Type", mimeTypes[ext] || "image/jpeg");
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(resolvedPath)}"`);
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  } catch (err) {
    return sendError(res, err.message, "STREAM_FAILED", 500);
  }
});

router.get("/creator/users/:userId/government-id", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "Candidate user not found", "NOT_FOUND", 404);
    const profile = await getProfileForUser(user);
    const governmentId = profile?.governmentId || user.governmentId;
    if (!governmentId) {
      return sendError(res, "Government ID document not found for this candidate", "NOT_FOUND", 404);
    }

    // A. If stored as Base64 Data URL
    if (governmentId.startsWith("data:")) {
      const matches = governmentId.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", "inline; filename=government_id");
        return res.send(buffer);
      }
    }

    // B. Check disk locations
    let resolvedPath = path.join(PROTECTED_UPLOADS_DIR, governmentId);
    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = path.join(UPLOADS_DIR, governmentId);
    }
    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = path.resolve(governmentId);
    }

    if (!fs.existsSync(resolvedPath)) {
      return sendError(res, "Physical ID document file is missing on storage", "FILE_MISSING", 404);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    res.setHeader("Content-Type", mimeTypes[ext] || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(resolvedPath)}"`);
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  } catch (err) {
    return sendError(res, err.message, "STREAM_FAILED", 500);
  }
});

// 1.6 Optional AI/OCR Identity Document Analysis Assistance
router.post("/creator/users/:userId/id-ocr", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "Candidate user not found", "NOT_FOUND", 404);
    const profile = await getProfileForUser(user);
    const governmentId = profile?.governmentId || user.governmentId;
    if (!governmentId) {
      return sendError(res, "No government ID document found to inspect", "NO_DOC", 404);
    }

    let filePath = path.join(PROTECTED_UPLOADS_DIR, governmentId);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(UPLOADS_DIR, governmentId);
    }
    if (!fs.existsSync(filePath)) {
      return sendError(res, "Government ID document file missing on disk", "FILE_MISSING", 404);
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-flash-latest";

    let extractedName = user.fullName || user.name;
    let extractedId = "Detected ID Proof";
    let nameMatch = true;
    let comparisonSummary = "Visual review assistance active.";

    if (geminiApiKey) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const imageBase64 = fileBuffer.toString("base64");
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";

        const promptText = `Analyze this government identity document (Aadhaar, Passport, Driving License, Pharmacy Council License, etc.).
Registered Candidate Full Name: "${user.fullName || user.name}"

Extract:
1. Name appearing on document
2. Document Identification / License Number (mask middle characters with asterisks for security, e.g. ****1234)

Return ONLY valid JSON matching this structure without markdown backticks:
{
  "extractedName": "string",
  "extractedId": "string",
  "nameMatch": true or false,
  "comparisonSummary": "concise observation for administrator"
}`;

        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
          {
            contents: [
              {
                parts: [
                  { text: promptText },
                  { inlineData: { mimeType, data: imageBase64 } },
                ],
              },
            ],
          },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
        );

        const raw = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(clean);
          extractedName = parsed.extractedName || extractedName;
          extractedId = parsed.extractedId || extractedId;
          nameMatch = parsed.nameMatch !== false;
          comparisonSummary = parsed.comparisonSummary || comparisonSummary;
        }
      } catch (ocrErr) {
        console.warn("OCR Assistance note:", ocrErr.message);
      }
    }

    return sendSuccess(
      res,
      {
        extractedName,
        extractedId,
        registeredName: user.fullName || user.name,
        nameMatch,
        comparisonSummary,
      },
      "Document OCR assistance complete"
    );
  } catch (err) {
    return sendError(res, err.message, "OCR_ASSIST_FAILED", 500);
  }
});

// 1.7 Creator Approval (Preserves user's registered password — sends approval notification email)
router.patch("/creator/users/:userId/approve", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "Candidate user not found", "NOT_FOUND", 404);

    // Guard: prevent double-approval from re-sending emails
    const wasAlreadyApproved = user.accountStatus === "APPROVED";

    // Approve the account — user keeps the password they registered with
    user.accountStatus = "APPROVED";
    user.approvalStatus = "APPROVED";
    user.approvedBy = req.user.email;
    user.approvedAt = new Date();
    user.rejectedBy = null;
    user.rejectedAt = null;
    user.rejectionReason = "";
    user.suspendedAt = null;
    user.mustChangePassword = false;
    // Do NOT set credentialEmailStatus = "SENT" here — no credentials email is sent on approval

    await user.save();

    // Synchronize approvalStatus in role profile
    const profile = await createOrUpdateProfile(user, { approvalStatus: "APPROVED" });

    // Audit Log
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "CREATOR_USER_APPROVED",
        resource: "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { approvedEmail: user.email, userRole: user.role },
      });
    } catch (logErr) {}

    // ── Send Approval Notification Email (only on first approval) ────────
    let emailResult = { success: false, mode: "SKIPPED", reason: "Already approved" };
    if (!wasAlreadyApproved) {
      const organizationName =
        profile?.companyName || profile?.pharmacyName || user.company || null;
      const referenceId =
        profile?.companyCode || profile?.licenseNumber || user.companyCode || user._id.toString();
      try {
        emailResult = await emailService.sendBusinessDecisionEmail({
          toEmail:          user.email,
          fullName:         user.fullName || user.name,
          role:             user.role,
          status:           "APPROVED",
          organizationName,
          referenceId,
        });
      } catch (emailErr) {
        emailResult = { success: false, mode: "SMTP_FAILED", error: emailErr.message };
      }

      // Persist notification status without blocking the approval response
      try {
        user.emailNotificationStatus  = emailResult.success ? "SENT" : "FAILED";
        user.emailNotificationSentAt  = emailResult.success ? new Date() : null;
        user.emailNotificationError   = emailResult.success ? null : (emailResult.error || "Unknown SMTP error");
        await user.save();
      } catch (saveErr) {
        logger.error("Failed to persist emailNotificationStatus after approval", { error: saveErr.message });
      }
    }

    return sendSuccess(
      res,
      {
        user: user.toSafeObject(profile),
        accountStatus: "APPROVED",
        emailNotification: {
          status:    emailResult.success ? "SENT" : "FAILED",
          mode:      emailResult.mode,
          error:     emailResult.error || null,
          skipped:   wasAlreadyApproved,
        },
      },
      wasAlreadyApproved
        ? `Account for ${user.name} (${user.role}) was already approved. No notification email sent.`
        : emailResult.success
          ? `Account for ${user.name} (${user.role}) has been APPROVED and a notification email has been sent.`
          : `Account for ${user.name} (${user.role}) has been APPROVED. ⚠️ Notification email could not be delivered — use Resend Notification to retry.`
    );
  } catch (err) {
    return sendError(res, err.message, "APPROVE_FAILED", 500);
  }
});


// 1.8 Resend Login Credentials
router.post("/creator/users/:userId/resend-credentials", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "User not found", "NOT_FOUND", 404);

    if (user.accountStatus !== "APPROVED") {
      return sendError(res, "Cannot send credentials for unapproved account", "INVALID_STATUS", 400);
    }

    const rawChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
    let tempPass = "";
    const randBytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      tempPass += rawChars[randBytes[i] % rawChars.length];
    }
    tempPass += `${Math.floor(10 + Math.random() * 90)}!`;

    user.password = tempPass;
    user.mustChangePassword = true;
    user.temporaryPasswordCreatedAt = new Date();

    const emailResult = await emailService.sendApprovalEmail({
      toEmail: user.email,
      fullName: user.fullName || user.name,
      role: user.role,
      temporaryPassword: tempPass,
    });

    user.credentialEmailStatus = emailResult.success ? "SENT" : "FAILED";
    await user.save();

    return sendSuccess(
      res,
      { credentialEmailStatus: user.credentialEmailStatus },
      `New login credentials generated and dispatched to ${user.email}.`
    );
  } catch (err) {
    return sendError(res, err.message, "RESEND_CREDENTIALS_FAILED", 500);
  }
});

// 1.8b Resend Approval/Rejection Notification Email (no password change)
router.post("/creator/users/:userId/resend-notification", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "User not found", "NOT_FOUND", 404);

    // Only valid for approved or rejected users
    if (!["APPROVED", "REJECTED"].includes(user.accountStatus)) {
      return sendError(res, "Notification emails can only be resent for approved or rejected accounts.", "INVALID_STATUS", 400);
    }

    // Validate email address
    if (!user.email || !user.email.includes("@")) {
      return sendError(res, "User does not have a valid email address.", "INVALID_EMAIL", 400);
    }

    const profile = await getProfileForUser(user).catch(() => null);
    let emailResult;

    if (user.accountStatus === "APPROVED") {
      const organizationName = profile?.companyName || profile?.pharmacyName || user.company || null;
      emailResult = await emailService.sendApprovalNotificationEmail({
        toEmail:          user.email,
        fullName:         user.fullName || user.name,
        role:             user.role,
        organizationName,
      });
    } else {
      emailResult = await emailService.sendRejectionEmail({
        toEmail:  user.email,
        fullName: user.fullName || user.name,
        role:     user.role,
        reason:   user.rejectionReason,
      });
    }

    // Persist updated notification status
    user.emailNotificationStatus = emailResult.success ? "SENT" : "FAILED";
    user.emailNotificationSentAt = emailResult.success ? new Date() : user.emailNotificationSentAt;
    user.emailNotificationError  = emailResult.success ? null : (emailResult.error || "Unknown SMTP error");
    await user.save();

    // Audit log
    try {
      await AuditLog.create({
        userId:    req.user._id,
        email:     req.user.email,
        role:      req.user.role,
        action:    "CREATOR_RESEND_NOTIFICATION",
        resource:  "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result:    emailResult.success ? "SUCCESS" : "FAILED",
        details:   { targetEmail: user.email, accountStatus: user.accountStatus, emailMode: emailResult.mode },
      });
    } catch (logErr) {}

    if (emailResult.success) {
      return sendSuccess(
        res,
        { emailNotificationStatus: "SENT", mode: emailResult.mode },
        `Notification email resent successfully to ${user.email}.`
      );
    } else {
      return sendError(
        res,
        `Email delivery failed: ${emailResult.error || "SMTP error"}`,
        "EMAIL_DELIVERY_FAILED",
        500
      );
    }
  } catch (err) {
    return sendError(res, err.message, "RESEND_NOTIFICATION_FAILED", 500);
  }
});

// 1.9 Creator Rejection with Reason + Rejection Email

router.patch("/creator/users/:userId/reject", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "User not found", "NOT_FOUND", 404);

    // Guard: prevent re-sending rejection emails for already-rejected accounts
    const wasAlreadyRejected = user.accountStatus === "REJECTED";

    user.accountStatus = "REJECTED";
    user.approvalStatus = "REJECTED";
    user.rejectedBy = req.user.email;
    user.rejectedAt = new Date();
    user.rejectionReason = reason || "Submitted identity documents or organization credentials could not be verified.";

    await user.save();

    // Synchronize approvalStatus in role profile
    const profile = await createOrUpdateProfile(user, { approvalStatus: "REJECTED" });

    // Audit Log
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "CREATOR_USER_REJECTED",
        resource: "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { rejectedEmail: user.email, userRole: user.role, reason: user.rejectionReason },
      });
    } catch (logErr) {}

    // ── Send Rejection Notification Email (only on first rejection) ──────
    let emailResult = { success: false, mode: "SKIPPED", reason: "Already rejected" };
    if (!wasAlreadyRejected) {
      try {
        emailResult = await emailService.sendRejectionEmail({
          toEmail:  user.email,
          fullName: user.fullName || user.name,
          role:     user.role,
          reason:   user.rejectionReason,
        });
      } catch (emailErr) {
        emailResult = { success: false, mode: "SMTP_FAILED", error: emailErr.message };
      }

      // Persist notification status
      try {
        user.emailNotificationStatus = emailResult.success ? "SENT" : "FAILED";
        user.emailNotificationSentAt = emailResult.success ? new Date() : null;
        user.emailNotificationError  = emailResult.success ? null : (emailResult.error || "Unknown SMTP error");
        await user.save();
      } catch (saveErr) {
        logger.error("Failed to persist emailNotificationStatus after rejection", { error: saveErr.message });
      }
    }

    return sendSuccess(
      res,
      {
        user: user.toSafeObject(profile),
        emailNotification: {
          status:  emailResult.success ? "SENT" : "FAILED",
          mode:    emailResult.mode,
          error:   emailResult.error || null,
          skipped: wasAlreadyRejected,
        },
      },
      wasAlreadyRejected
        ? `Application for ${user.name} (${user.role}) was already rejected.`
        : emailResult.success
          ? `Application for ${user.name} (${user.role}) has been REJECTED and a notification email has been sent.`
          : `Application for ${user.name} (${user.role}) has been REJECTED. ⚠️ Notification email could not be delivered.`
    );
  } catch (err) {
    return sendError(res, err.message, "REJECT_FAILED", 500);
  }
});


router.patch("/creator/users/:userId/suspend", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "User not found", "NOT_FOUND", 404);

    user.accountStatus = "SUSPENDED";
    user.approvalStatus = "SUSPENDED";
    user.suspendedAt = new Date();

    await user.save();

    // Synchronize approvalStatus in role profile
    const profile = await createOrUpdateProfile(user, { approvalStatus: "SUSPENDED" });

    // Audit Log
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "CREATOR_USER_SUSPENDED",
        resource: "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { suspendedEmail: user.email, userRole: user.role },
      });
    } catch (logErr) {}

    return sendSuccess(res, user.toSafeObject(profile), `Account for ${user.name} (${user.role}) has been SUSPENDED.`);
  } catch (err) {
    return sendError(res, err.message, "SUSPEND_FAILED", 500);
  }
});

router.patch("/creator/users/:userId/activate", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, "User not found", "NOT_FOUND", 404);

    user.accountStatus = "APPROVED";
    user.approvalStatus = "APPROVED";
    user.suspendedAt = null;

    await user.save();

    // Synchronize approvalStatus in role profile
    const profile = await createOrUpdateProfile(user, { approvalStatus: "APPROVED" });

    // Audit Log
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "CREATOR_USER_ACTIVATED",
        resource: "User",
        resourceId: user._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { activatedEmail: user.email, userRole: user.role },
      });
    } catch (logErr) {}

    return sendSuccess(res, user.toSafeObject(profile), `Account for ${user.name} (${user.role}) has been ACTIVATED.`);
  } catch (err) {
    return sendError(res, err.message, "ACTIVATE_FAILED", 500);
  }
});

// Full Cryptographic Blockchain Audit for Creator
router.get("/creator/blockchain/audit", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const auditResult = await validateDrugChain();
    logger.blockchain("Blockchain audit requested", { by: req.user?.email });
    return sendSuccess(res, auditResult, "Cryptographic audit of DrugChain complete");
  } catch (err) {
    logger.error("Blockchain audit failed", { message: err.message });
    return sendError(res, err.message, "AUDIT_FAILED", 500);
  }
});

/* ── CREATOR MEDICINE APPROVAL & MANAGEMENT ────────────────────────── */
// 1. Get Pending Medicines Awaiting Review
router.get("/creator/medicines/pending", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const pendingMeds = await Medicine.find({ approvalStatus: "pending" })
      .populate("manufacturerId", "name fullName email company companyName phone")
      .sort({ createdAt: -1 });
    return sendSuccess(res, pendingMeds, "Pending medicine submissions retrieved");
  } catch (err) {
    logger.error("Failed to fetch pending medicines", { error: err.message });
    return sendError(res, err.message, "FETCH_PENDING_FAILED", 500);
  }
});

// 2. Get All Medicines with status filtering for Creator
router.get("/creator/medicines", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status && status !== "ALL" && status !== "all") {
      query.approvalStatus = status.toLowerCase();
    }
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: new RegExp(q, "i") },
        { batchId: new RegExp(q, "i") },
        { company: new RegExp(q, "i") },
        { manufacturer: new RegExp(q, "i") },
      ];
    }
    const medicines = await Medicine.find(query)
      .populate("manufacturerId", "name fullName email company companyName")
      .sort({ createdAt: -1 });
    return sendSuccess(res, medicines, "Creator medicines list retrieved");
  } catch (err) {
    return sendError(res, err.message, "FETCH_MEDICINES_FAILED", 500);
  }
});

// 3. Approve Medicine Submission on DrugChain
router.patch("/creator/medicines/:id/approve", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const medicineParam = req.params.id.trim();
    const queryConditions = [
      { id: new RegExp(`^${medicineParam}$`, "i") },
      { batchId: new RegExp(`^${medicineParam}$`, "i") },
    ];
    if (mongoose.isValidObjectId(medicineParam)) {
      queryConditions.push({ _id: medicineParam });
    }
    const medicine = await Medicine.findOne({ $or: queryConditions });

    if (!medicine) {
      return sendError(res, "Medicine submission not found", "NOT_FOUND", 404);
    }

    if (medicine.approvalStatus === "approved") {
      return sendSuccess(res, medicine, "Medicine is already approved on DrugChain");
    }

    // 1. Record on DrugChain blockchain
    const chainRecord = await recordMedicineOnChain(
      {
        id: medicine.id,
        batchId: medicine.batchId,
        name: medicine.name,
        manufacturer: medicine.company || medicine.manufacturer,
        manufacturerCode: medicine.manufacturerCode || "",
        manufacturingDate: medicine.manufacturingDate,
        expiryDate: medicine.expiryDate,
      },
      "Creator"
    );

    // 2. Update Database Record
    medicine.approvalStatus = "approved";
    medicine.approvedBy = req.user.email;
    medicine.approvedAt = new Date();
    medicine.rejectedBy = null;
    medicine.rejectedAt = null;
    medicine.rejectionReason = "";
    medicine.status = "AUTHENTIC";
    medicine.blockchainTxHash = chainRecord.txHash;
    medicine.medicineDataHash = chainRecord.dataHash;
    medicine.blockchainStatus = "Confirmed";
    medicine.transferHistory = [
      {
        step: 1,
        role: "Manufacturer",
        actor: medicine.company || medicine.manufacturer,
        timestamp: new Date().toLocaleString("en-IN"),
        status: "Approved on DrugChain",
        txHash: chainRecord.txHash,
      },
    ];

    await medicine.save();
    logger.info("Medicine approved by Admin", { id: medicine.id, batchId: medicine.batchId, admin: req.user.email });

    // 3. Create SupplyChainTransaction for linked distributors (releasing batch to distribution)
    const mfrDistLinks = await SupplyChainLink.find({
      linkType: "MANUFACTURER_DISTRIBUTOR",
      fromUserId: medicine.manufacturerId,
      status: "APPROVED",
    });
    const toDistributors = mfrDistLinks.length > 0 ? mfrDistLinks : [null];

    for (const link of toDistributors) {
      const transferId = `TR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const newTransfer = new SupplyChainTransaction({
        id: transferId,
        transferId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: medicine.batchId,
        fromUserId: medicine.manufacturerId,
        fromRole: "Manufacturer",
        from: medicine.company || medicine.manufacturer,
        toRole: "Distributor",
        toUserId: link ? link.toUserId : null,
        to: link ? link.toCompanyName : "Pending Assignment",
        quantity: `${medicine.quantity} Units`,
        timestamp: new Date().toLocaleString("en-IN"),
        action: "REGISTERED",
        status: "Pending Confirmation",
        blockchainStatus: "Pending Confirmation",
      });
      await newTransfer.save();
    }

    // 4. Record Blockchain Transaction in collection
    try {
      await BlockchainTransaction.create({
        medicineId: medicine.id,
        batchId: medicine.batchId,
        transactionType: "MEDICINE_REGISTRATION",
        blockIndex: chainRecord.blockIndex || 1,
        transactionHash: chainRecord.txHash,
        dataHash: chainRecord.dataHash || "",
        timestamp: new Date(),
        validationStatus: "VALID",
      });
    } catch (bcErr) {}

    // 5. In-App Notification to Manufacturer
    if (medicine.manufacturerId) {
      try {
        await Notification.create({
          userId: medicine.manufacturerId,
          title: "Medicine Approved on DrugChain",
          message: `Your medicine "${medicine.name}" (Batch ${medicine.batchId}) has been officially APPROVED by Admin compliance review and recorded on DrugChain.`,
          type: "APPROVAL",
        });
      } catch (notifErr) {}
    }

    // 6. Send Approval Email to Manufacturer
    try {
      const mfrUser = medicine.manufacturerId ? await User.findById(medicine.manufacturerId) : null;
      const recipientEmail = mfrUser?.email || null;
      if (recipientEmail) {
        emailService.sendMedicineApprovalEmail({
          toEmail: recipientEmail,
          fullName: mfrUser?.fullName || mfrUser?.name || medicine.company,
          medicineName: medicine.name,
          batchNumber: medicine.batchId,
          manufacturingDate: medicine.manufacturingDate,
          expiryDate: medicine.expiryDate,
          approvedBy: req.user.email,
          txHash: chainRecord.txHash,
        }).catch((err) => logger.warn("Approval email dispatch failed", { error: err.message }));
      }
    } catch (emailErr) {}

    // 7. Audit Log
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "ADMIN_MEDICINE_APPROVED",
        resource: "Medicine",
        resourceId: medicine.id,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: medicine.batchId, medicineName: medicine.name, txHash: chainRecord.txHash },
      });
    } catch (logErr) {}

    return sendSuccess(res, medicine, `Medicine '${medicine.name}' (Batch ${medicine.batchId}) has been APPROVED and minted on DrugChain.`);
  } catch (err) {
    logger.error("Medicine approval failed", { error: err.message });
    return sendError(res, err.message, "APPROVE_FAILED", 500);
  }
});

// 4. Reject Medicine Submission
router.patch("/creator/medicines/:id/reject", verifyToken, requireRole("Creator"), validate(schemas.rejectMedicine), async (req, res) => {
  try {
    const medicineParam = req.params.id.trim();
    const { rejectionReason } = req.body;

    const queryConditions = [
      { id: new RegExp(`^${medicineParam}$`, "i") },
      { batchId: new RegExp(`^${medicineParam}$`, "i") },
    ];
    if (mongoose.isValidObjectId(medicineParam)) {
      queryConditions.push({ _id: medicineParam });
    }
    const medicine = await Medicine.findOne({ $or: queryConditions });

    if (!medicine) {
      return sendError(res, "Medicine submission not found", "NOT_FOUND", 404);
    }

    medicine.approvalStatus = "rejected";
    medicine.rejectedBy = req.user.email;
    medicine.rejectedAt = new Date();
    medicine.rejectionReason = rejectionReason.trim();
    medicine.status = "UNABLE TO VERIFY";
    medicine.blockchainStatus = "Rejected";

    await medicine.save();
    logger.info("Medicine rejected by Admin", { id: medicine.id, batchId: medicine.batchId, admin: req.user.email, reason: rejectionReason });

    // Clean up any supply chain transfers for this batch so distributors cannot access it
    await SupplyChainTransaction.deleteMany({ batchId: medicine.batchId });

    // In-App Notification to Manufacturer
    if (medicine.manufacturerId) {
      try {
        await Notification.create({
          userId: medicine.manufacturerId,
          title: "Medicine Submission Rejected",
          message: `Your medicine "${medicine.name}" (Batch ${medicine.batchId}) was rejected by ${req.user.email}. Reason: ${rejectionReason.trim()}`,
          type: "WARNING",
        });
      } catch (notifErr) {}
    }

    // Send Rejection Email to Manufacturer
    try {
      const mfrUser = medicine.manufacturerId ? await User.findById(medicine.manufacturerId) : null;
      const recipientEmail = mfrUser?.email || null;
      if (recipientEmail) {
        emailService.sendMedicineRejectionEmail({
          toEmail: recipientEmail,
          fullName: mfrUser?.fullName || mfrUser?.name || medicine.company,
          medicineName: medicine.name,
          batchNumber: medicine.batchId,
          rejectionReason: rejectionReason.trim(),
          rejectedBy: req.user.email,
        }).catch((err) => logger.warn("Rejection email dispatch failed", { error: err.message }));
      }
    } catch (emailErr) {}

    // Audit Log
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "ADMIN_MEDICINE_REJECTED",
        resource: "Medicine",
        resourceId: medicine.id,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: medicine.batchId, medicineName: medicine.name, rejectionReason },
      });
    } catch (logErr) {}

    return sendSuccess(res, medicine, `Medicine '${medicine.name}' (Batch ${medicine.batchId}) has been REJECTED.`);
  } catch (err) {
    logger.error("Medicine rejection failed", { error: err.message });
    return sendError(res, err.message, "REJECT_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   2. AI & OCR VERIFICATION ENGINE (VISUAL RISK ASSESSMENT)
══════════════════════════════════════════════════════════════════════ */
router.post(
  "/verification/ai",
  aiVerifyLimiter,
  upload.fields([
    { name: "medicineImage", maxCount: 1 },
    { name: "governmentCertificate", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { medicineName, batchNumber, companyName, manufacturingDate, expiryDate } = req.body;
      const imageFile = req.files?.medicineImage?.[0] || req.files?.governmentCertificate?.[0];

      // Lookup registered medicine if batchNumber is provided
      let registeredMedicine = null;
      if (batchNumber && batchNumber.trim()) {
        registeredMedicine = await Medicine.findOne({
          batchId: new RegExp(`^${batchNumber.trim()}$`, "i"),
        });
      }

      // Execute AI Packaging & Visual OCR Analysis
      const aiAnalysis = await aiService.analyzeMedicinePackaging({
        imageFile,
        formMetadata: { medicineName, batchNumber, companyName, manufacturingDate, expiryDate },
        registeredMedicine,
      });

      // Optionally run full authenticity audit if batch or code provided
      let auditResult = null;
      const queryCode = batchNumber || medicineName;
      if (queryCode && queryCode.trim()) {
        try {
          auditResult = await runFullAuthenticityAudit({
            queryCode: queryCode.trim(),
            imageFile,
            formMetadata: { medicineName, batchNumber, companyName, manufacturingDate, expiryDate },
            clientIp: req.ip,
            user: req.user,
          });
        } catch (auditErr) {
          logger.warn("Audit integration note in /verification/ai:", { message: auditErr.message });
        }
      }

      // Persist AI analysis log to MongoDB (STEP 19)
      try {
        const logEntry = new AiAnalysisLog({
          medicineId: registeredMedicine?.id || auditResult?.medicine?.id || "",
          batchNumber: batchNumber || registeredMedicine?.batchId || "",
          status: aiAnalysis.status,
          riskLevel: aiAnalysis.tamperingAnalysis?.riskLevel || "LOW",
          modelProvider: aiAnalysis.modelProvider || "Gemini Multimodal Vision",
          extractedData: aiAnalysis.extractedData || {},
          comparison: aiAnalysis.comparison || {},
          findings: aiAnalysis.findings || [],
          warnings: aiAnalysis.warnings || [],
          confidence: aiAnalysis.confidence,
          confidenceAvailable: aiAnalysis.confidenceAvailable,
        });
        await logEntry.save();
      } catch (logErr) {
        logger.warn("Could not save AiAnalysisLog record", { message: logErr.message });
      }

      return sendSuccess(
        res,
        {
          status: aiAnalysis.status === "PASS" ? "MATCHED" : "MISMATCH",
          confidence: aiAnalysis.confidence || (aiAnalysis.available ? 92 : 0),
          confidenceAvailable: aiAnalysis.confidenceAvailable,
          confidenceSource: aiAnalysis.confidenceSource,
          ocrExtracted: aiAnalysis.extractedData || {
            medicineName: medicineName || "",
            batchNumber: batchNumber || "",
            manufacturer: companyName || "",
            manufacturingDate: manufacturingDate || "",
            expiryDate: expiryDate || "",
          },
          reasons: aiAnalysis.findings,
          warnings: aiAnalysis.warnings,
          imageVerified: aiAnalysis.available,
          riskLevel: aiAnalysis.tamperingAnalysis?.riskLevel || "LOW",
          aiAnalysisDetails: aiAnalysis.findings.join("; "),
          engine: "AI Tablet Visual Risk Assessment & OCR Engine",
          ai: {
            available: aiAnalysis.available,
            status: aiAnalysis.status,
            confidence: aiAnalysis.confidence,
            confidenceAvailable: aiAnalysis.confidenceAvailable,
          },
          extractedData: aiAnalysis.extractedData,
          comparison: aiAnalysis.comparison,
          tamperingAnalysis: aiAnalysis.tamperingAnalysis,
          expiryAnalysis: aiAnalysis.expiryAnalysis,
          trainedModelPresent: false,
          mlModelNote:
            "Current system uses AI-assisted image analysis and rule-based risk evaluation; a trained counterfeit classifier can be added later.",
          audit: auditResult,
        },
        "AI/OCR tablet validation analysis complete"
      );
    } catch (err) {
      logger.error("AI verification route error", { message: err.message });
      return sendError(res, err.message, "AI_VERIFICATION_ERROR", 500);
    }
  }
);

/* ══════════════════════════════════════════════════════════════════════
   3. MEDICINES REGISTRATION & RETRIEVAL (ROLE ISOLATED)
══════════════════════════════════════════════════════════════════════ */
router.post(
  "/medicines",
  verifyToken,
  requireRole("Manufacturer", "Creator"),
  upload.fields([
    { name: "medicineImage", maxCount: 1 },
    { name: "governmentCertificate", maxCount: 1 },
  ]),
  validate(schemas.registerMedicine),
  async (req, res) => {
    try {
      const effectiveMedicineName = (req.body.medicineName || req.body.name || "").trim();
      const effectiveBatchNumber = (req.body.batchNumber || req.body.batchId || "").trim();
      const effectiveCompanyName = (req.body.companyName || req.body.company || req.body.manufacturer || "").trim();
      const effectiveManufacturerName = (req.body.manufacturerName || req.body.manufacturer || effectiveCompanyName).trim();
      const {
        manufacturerCode,
        manufacturingDate,
        expiryDate,
        price,
        quantity,
        composition,
      } = req.body;

      if (!effectiveMedicineName || !effectiveBatchNumber || !effectiveCompanyName || !manufacturingDate || !expiryDate) {
        return sendError(res, "Missing required medicine registration fields", "MISSING_FIELDS", 400);
      }

      if (new Date(expiryDate) <= new Date(manufacturingDate)) {
        return sendError(res, "Expiry date must be after manufacturing date", "INVALID_DATES", 400);
      }

      const batchId = effectiveBatchNumber.toUpperCase();

      // ── STEP 1: Check MongoDB for existing record by batchId ────────────
      const existingInDB = await Medicine.findOne({ batchId });
      if (existingInDB) {
        const chainHistory = drugChainService.getMedicineHistory(existingInDB.id) || [];
        return res.status(409).json({
          success: false,
          code: "ALREADY_REGISTERED",
          alreadyRegistered: true,
          message: `Batch '${batchId}' is already registered. View the existing record below.`,
          data: {
            ...existingInDB.toObject(),
            chainHistory,
            registrationStatus: "EXISTING_RECORD",
          },
        });
      }

      // ── STEP 2: Check blockchain for orphaned chain record (chain has it, DB doesn't) ──
      const chainExisting = drugChainService.getRegistrationRecord(null, batchId);
      if (chainExisting) {
        const syncedId = chainExisting.medicineId || `MED-SYNCED-${batchId}`;
        const syncedMed = new Medicine({
          id: syncedId,
          batchId,
          name: chainExisting.metadata?.medicineName || effectiveMedicineName,
          medicineName: chainExisting.metadata?.medicineName || effectiveMedicineName,
          manufacturerId: req.user._id,
          manufacturer: chainExisting.metadata?.manufacturerName || effectiveCompanyName,
          manufacturerName: chainExisting.metadata?.manufacturerName || effectiveManufacturerName || "",
          company: effectiveCompanyName,
          manufacturerCode: chainExisting.metadata?.manufacturerCode || manufacturerCode?.trim() || "",
          manufacturingDate: chainExisting.metadata?.manufacturingDate || manufacturingDate,
          expiryDate: chainExisting.metadata?.expiryDate || expiryDate,
          price: price || "₹120.00",
          quantity: Number(quantity) || 1000,
          composition: composition?.trim() || "",
          medicineImage: req.files?.medicineImage?.[0] ? `/uploads/${req.files.medicineImage[0].filename}` : null,
          currentOwnerId: req.user._id,
          currentOwnerRole: "Manufacturer",
          currentHolder: "Manufacturer",
          status: "AUTHENTIC",
          approvalStatus: "approved",
          approvedBy: "System (Chain Sync)",
          approvedAt: new Date(),
          medicineDataHash: chainExisting.dataHash,
          blockchainTxHash: chainExisting.blockHash,
          blockchainStatus: "Confirmed",
          transferHistory: [{
            step: 1,
            role: "Manufacturer",
            actor: companyName.trim(),
            timestamp: new Date(chainExisting.timestamp).toLocaleString("en-IN"),
            status: "Registered (synced from DrugChain)",
            txHash: chainExisting.blockHash,
          }],
        });
        try {
          await syncedMed.save();
          logger.info("Medicine synced from chain to DB", { batchId, syncedId });
        } catch (syncErr) {
          const raceDoc = await Medicine.findOne({ batchId });
          if (raceDoc) {
            return res.status(200).json({
              success: false,
              code: "ALREADY_REGISTERED",
              alreadyRegistered: true,
              message: `Batch '${batchId}' is already registered. View the existing record below.`,
              data: { ...raceDoc.toObject(), registrationStatus: "EXISTING_RECORD" },
            });
          }
        }
        return res.status(200).json({
          success: false,
          code: "SYNCED_FROM_CHAIN",
          alreadyRegistered: true,
          message: `Batch '${batchId}' was already on DrugChain. Record has been synced to the database.`,
          data: { ...syncedMed.toObject(), registrationStatus: "SYNCED_FROM_CHAIN", chainRecord: chainExisting },
        });
      }

      // ── STEP 3: Generate a collision-safe unique medicine ID ────────────
      const year = new Date().getFullYear();
      const uniqueSuffix = `${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
      let medicineId = `MED-${year}-${uniqueSuffix}`;
      let idExists = await Medicine.findOne({ id: medicineId });
      let idAttempts = 0;
      while (idExists && idAttempts < 5) {
        medicineId = `MED-${year}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 99 + 1)}`;
        idExists = await Medicine.findOne({ id: medicineId });
        idAttempts++;
      }

      const medicineImage = req.files?.medicineImage?.[0]
        ? `/uploads/${req.files.medicineImage[0].filename}`
        : (req.body.medicineImage || null);
      const governmentCertificate = req.files?.governmentCertificate?.[0]
        ? `/uploads/${req.files.governmentCertificate[0].filename}`
        : (req.body.governmentCertificate || null);

      const isCreator = req.user.role === "Creator";

      // ── CASE A: CREATOR SUBMISSION (Direct Mint & Auto-Approval) ─────────
      if (isCreator) {
        const chainRecord = await recordMedicineOnChain(
          {
            id: medicineId,
            batchId,
            name: effectiveMedicineName,
            manufacturer: effectiveCompanyName,
            manufacturerCode: manufacturerCode?.trim() || "",
            manufacturingDate,
            expiryDate,
          },
          req.user.role
        );

        const newMedicine = new Medicine({
          id: medicineId,
          batchId,
          name: effectiveMedicineName,
          medicineName: effectiveMedicineName,
          manufacturerId: req.user._id,
          manufacturer: effectiveManufacturerName || effectiveCompanyName,
          manufacturerName: effectiveManufacturerName || "",
          company: effectiveCompanyName,
          manufacturerCode: manufacturerCode?.trim() || "",
          manufacturingDate,
          expiryDate,
          price: price || "₹120.00",
          quantity: Number(quantity) || 1000,
          composition: composition?.trim() || "",
          medicineImage,
          governmentCertificate,
          approvalStatus: "approved",
          approvedBy: req.user.email,
          approvedAt: new Date(),
          currentOwnerId: req.user._id,
          currentOwnerRole: "Manufacturer",
          currentHolder: "Manufacturer",
          status: "AUTHENTIC",
          medicineDataHash: chainRecord.dataHash,
          blockchainTxHash: chainRecord.txHash,
          blockchainStatus: "Confirmed",
          transferHistory: [
            {
              step: 1,
              role: "Creator",
              actor: companyName.trim(),
              timestamp: new Date().toLocaleString("en-IN"),
              status: "Registered and Approved by Creator",
              txHash: chainRecord.txHash,
            },
          ],
        });

        await newMedicine.save();

        // Create SupplyChainTransaction for distributors
        const mfrDistLinks = await SupplyChainLink.find({
          linkType: "MANUFACTURER_DISTRIBUTOR",
          status: "APPROVED",
        });
        const toDistributors = mfrDistLinks.length > 0 ? mfrDistLinks : [null];
        for (const link of toDistributors) {
          const transferId = `TR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
          const newTransfer = new SupplyChainTransaction({
            id: transferId,
            transferId,
            medicineId,
            medicineName: newMedicine.name,
            batchId,
            fromUserId: req.user._id,
            fromRole: "Manufacturer",
            from: effectiveCompanyName,
            toRole: "Distributor",
            toUserId: link ? link.toUserId : null,
            to: link ? link.toCompanyName : "Pending Assignment",
            quantity: `${newMedicine.quantity} Units`,
            timestamp: new Date().toLocaleString("en-IN"),
            action: "REGISTERED",
            status: "Pending Confirmation",
            blockchainStatus: "Pending Confirmation",
          });
          await newTransfer.save();
        }

        return sendSuccess(res, newMedicine, "Medicine registered and approved directly by Creator", 201);
      }

      // ── CASE B: MANUFACTURER SUBMISSION (Saves with approvalStatus: 'pending') ──
      const precalculatedHash = calculateMedicineDataHash({
        medicineId,
        batchNumber: batchId,
        medicineName: effectiveMedicineName,
        manufacturerCode: manufacturerCode?.trim() || "",
        manufacturingDate,
        expiryDate,
      });

      const newMedicine = new Medicine({
        id: medicineId,
        batchId,
        name: effectiveMedicineName,
        medicineName: effectiveMedicineName,
        manufacturerId: req.user._id,
        manufacturer: effectiveManufacturerName || effectiveCompanyName,
        manufacturerName: effectiveManufacturerName || "",
        company: effectiveCompanyName,
        manufacturerCode: manufacturerCode?.trim() || "",
        manufacturingDate,
        expiryDate,
        price: price || "₹120.00",
        quantity: Number(quantity) || 1000,
        composition: composition?.trim() || "",
        medicineImage,
        governmentCertificate,
        approvalStatus: "pending",
        submittedAt: new Date(),
        currentOwnerId: req.user._id,
        currentOwnerRole: "Manufacturer",
        currentHolder: "Manufacturer",
        status: "UNABLE TO VERIFY",
        medicineDataHash: precalculatedHash,
        blockchainTxHash: "",
        blockchainStatus: "Pending Approval",
        transferHistory: [
          {
            step: 1,
            role: "Manufacturer",
            actor: effectiveCompanyName,
            timestamp: new Date().toLocaleString("en-IN"),
            status: "Submitted (Pending Admin Approval)",
            txHash: null,
          },
        ],
      });

      await newMedicine.save();
      logger.medicine("Medicine submitted for Admin approval", { id: medicineId, batchId, by: req.user?.email });

      // Silent security risk evaluation
      evaluateAndLogSecurityRisk({
        sourceType: "MEDICINE_REGISTRATION",
        submittedByUser: req.user,
        relatedResourceType: "Medicine",
        relatedResourceId: medicineId,
        data: { medicineName: effectiveMedicineName, batchId, batchNumber: batchId, manufacturingDate, expiryDate, price: price || "" },
      }).catch(() => {});

      // In-app notifications to all Admins/Creators
      try {
        const creators = await User.find({ role: "Creator" });
        for (const c of creators) {
          await Notification.create({
            userId: c._id,
            title: "New Medicine Awaiting Approval",
            message: `Manufacturer "${effectiveCompanyName}" submitted medicine "${effectiveMedicineName}" (Batch: ${batchId}) requiring compliance review.`,
            type: "APPROVAL",
          });
        }
      } catch (notifErr) {}

      // Confirmation email to Manufacturer (Pending Notice - NOT approval)
      try {
        emailService.sendMedicineSubmissionPendingEmail({
          toEmail: req.user.email,
          fullName: req.user.fullName || req.user.name,
          medicineName: effectiveMedicineName,
          batchNumber: batchId,
          manufacturingDate,
          expiryDate,
        }).catch((err) => logger.warn("Manufacturer pending email note", { error: err.message }));
      } catch (eErr) {}

      // Notification email to Admin/Creator
      try {
        const creatorUser = await User.findOne({ role: "Creator" });
        if (creatorUser?.email) {
          emailService.sendAdminNewMedicineNotificationEmail({
            adminEmail: creatorUser.email,
            medicineName: effectiveMedicineName,
            batchNumber: batchId,
            manufacturerName: effectiveCompanyName,
            submittedAt: new Date(),
          }).catch((err) => logger.warn("Admin new medicine email note", { error: err.message }));
        }
      } catch (aErr) {}

      // Audit Log
      try {
        await AuditLog.create({
          userId: req.user._id,
          email: req.user.email,
          role: req.user.role,
          action: "MEDICINE_SUBMITTED_PENDING_APPROVAL",
          resource: "Medicine",
          resourceId: medicineId,
          ipAddress: req.ip || "127.0.0.1",
          result: "SUCCESS",
          details: { batchId, medicineName: effectiveMedicineName, approvalStatus: "pending" },
        });
      } catch (auditErr) {}

      return sendSuccess(
        res,
        newMedicine,
        "Medicine submitted successfully! It is now pending Admin approval before being released to distributors.",
        201
      );
    } catch (err) {
      return sendError(res, err.message, "MEDICINE_REGISTER_FAILED", 500);
    }
  }
);

// Role-Based Query Isolation for Medicine Retrieval
router.get("/medicines", verifyToken, requireRole("Manufacturer", "Distributor", "Pharmacy", "Creator"), async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const company = (userProfile?.companyName || userProfile?.pharmacyName || req.user.company || req.user.name || "").trim();

    let query = {};

    if (role === "creator") {
      // Creator can filter by approvalStatus query param or view all
      const statusParam = req.query.approvalStatus || req.query.status;
      if (statusParam && statusParam.toLowerCase() !== "all") {
        query.approvalStatus = statusParam.toLowerCase();
      }
    } else if (role === "manufacturer") {
      // Manufacturer ONLY sees medicines they created or own (all approval statuses so they can track pending/rejected)
      const safeCompany = escapeRegex(company);
      query = {
        $or: [
          { manufacturerId: req.user._id },
          { currentOwnerId: req.user._id },
          ...(safeCompany ? [
            { manufacturer: new RegExp(`^${safeCompany}$`, "i") },
            { company: new RegExp(`^${safeCompany}$`, "i") },
          ] : []),
        ],
      };
      if (req.query.approvalStatus && req.query.approvalStatus !== "all") {
        query.approvalStatus = req.query.approvalStatus.toLowerCase();
      }
    } else if (role === "distributor") {
      // Distributor ONLY sees Admin-approved medicines authorized for their organization
      const safeCompany = escapeRegex(company);
      const orConditions = [{ currentOwnerId: req.user._id }];
      if (safeCompany) {
        orConditions.push({ "transferHistory.actor": new RegExp(`^${safeCompany}$`, "i") });
      }
      // Also include medicines for which a transfer was addressed to this distributor
      const userTransfers = await SupplyChainTransaction.find({
        toRole: "Distributor",
        $or: [
          { toUserId: req.user._id },
          ...(safeCompany ? [{ to: new RegExp(`^${safeCompany}$`, "i") }] : []),
        ],
      }).distinct("batchId");
      if (userTransfers.length > 0) {
        orConditions.push({ batchId: { $in: userTransfers } });
      }
      query = {
        approvalStatus: "approved",
        $or: orConditions,
      };
    } else if (role === "pharmacy") {
      // Pharmacy ONLY sees Admin-approved medicines legitimately dispatched or transferred to them
      const safeCompany = escapeRegex(company);
      const orConditions = [{ currentOwnerId: req.user._id }];
      if (safeCompany) {
        orConditions.push({ "transferHistory.actor": new RegExp(`^${safeCompany}$`, "i") });
        orConditions.push({ currentHolder: new RegExp(`^${safeCompany}$`, "i") });
      }
      // Also include medicines for which a transfer was addressed to this pharmacy
      const pharmacyTransfers = await SupplyChainTransaction.find({
        toRole: "Pharmacy",
        $or: [
          { toUserId: req.user._id },
          ...(safeCompany ? [{ to: new RegExp(`^${safeCompany}$`, "i") }] : []),
        ],
      }).distinct("batchId");
      if (pharmacyTransfers.length > 0) {
        orConditions.push({ batchId: { $in: pharmacyTransfers } });
      }
      query = {
        approvalStatus: "approved",
        $or: orConditions,
      };
    } else {
      return sendError(res, "Access denied. Only supply-chain partners may inspect internal medicine batches.", "FORBIDDEN", 403);
    }

    const medicines = await Medicine.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, medicines, "Medicines retrieved");
  } catch (err) {
    return sendError(res, err.message, "FETCH_FAILED", 500);
  }
});

// Single Medicine Details with Access Isolation
router.get("/medicines/:id", verifyToken, async (req, res) => {
  try {
    const rawId = req.params.id.trim();
    const safeId = escapeRegex(rawId);
    const queryConditions = [
      { id: new RegExp(`^${safeId}$`, "i") },
      { batchId: new RegExp(`^${safeId}$`, "i") },
    ];
    if (mongoose.isValidObjectId(rawId)) {
      queryConditions.push({ _id: rawId });
    }
    const medicine = await Medicine.findOne({ $or: queryConditions });

    if (!medicine) {
      return sendError(res, "Medicine not found", "NOT_FOUND", 404);
    }

    const role = (req.user.role || "").toLowerCase();
    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const company = (userProfile?.companyName || userProfile?.pharmacyName || req.user.company || "").trim();
    const safeCompany = escapeRegex(company);

    // 1. Creator has administrative access
    if (role === "creator") {
      return sendSuccess(res, medicine, "Medicine details found");
    }

    // 2. Customer must use public verification
    if (role === "customer") {
      return sendError(res, "Access denied. Customers must use the public verification portal.", "FORBIDDEN", 403);
    }

    // 3. Manufacturer isolation: Only the manufacturer who owns this batch
    if (role === "manufacturer") {
      const isOwner = (medicine.manufacturerId && medicine.manufacturerId.toString() === req.user._id.toString()) ||
        (medicine.currentOwnerId && medicine.currentOwnerId.toString() === req.user._id.toString()) ||
        (company && (medicine.company.toLowerCase() === company.toLowerCase() || medicine.manufacturer.toLowerCase() === company.toLowerCase()));
      if (!isOwner) {
        return sendError(res, "Access denied: You are not authorized to view medicines belonging to other manufacturers.", "FORBIDDEN", 403);
      }
    }

    // 4. Distributor isolation: Only distributors who handle or have received this batch AND it is approved
    if (role === "distributor") {
      if (medicine.approvalStatus !== "approved") {
        return sendError(res, "Access denied: This medicine batch has not been approved by administration.", "FORBIDDEN", 403);
      }
      const hasCustody = (medicine.currentOwnerId && medicine.currentOwnerId.toString() === req.user._id.toString()) ||
        (company && medicine.transferHistory && medicine.transferHistory.some(t => t.actor.toLowerCase().includes(company.toLowerCase())));
      const hasTransfer = await SupplyChainTransaction.findOne({
        batchId: medicine.batchId,
        toRole: "Distributor",
        $or: [
          { toUserId: req.user._id },
          ...(safeCompany ? [{ to: new RegExp(`^${safeCompany}$`, "i") }] : []),
        ],
      });
      if (!hasCustody && !hasTransfer) {
        return sendError(res, "Access denied: You are not authorized to inspect this medicine batch.", "FORBIDDEN", 403);
      }
    }

    // 5. Pharmacy isolation: Only pharmacy that received or is receiving this batch AND it is approved
    if (role === "pharmacy") {
      if (medicine.approvalStatus !== "approved") {
        return sendError(res, "Access denied: This medicine batch has not been approved by administration.", "FORBIDDEN", 403);
      }
      const isPharmacyCustody = (medicine.currentOwnerId && medicine.currentOwnerId.toString() === req.user._id.toString()) ||
        (company && medicine.transferHistory && medicine.transferHistory.some(t => t.actor.toLowerCase().includes(company.toLowerCase())));
      const hasTransfer = await SupplyChainTransaction.findOne({
        batchId: medicine.batchId,
        toRole: "Pharmacy",
        $or: [
          { toUserId: req.user._id },
          ...(safeCompany ? [{ to: new RegExp(`^${safeCompany}$`, "i") }] : []),
        ],
      });
      if (!isPharmacyCustody && !hasTransfer) {
        return sendError(res, "Access denied: This medicine has not been dispatched to your pharmacy.", "FORBIDDEN", 403);
      }
    }

    return sendSuccess(res, medicine, "Medicine details found");
  } catch (err) {
    return sendError(res, err.message, "QUERY_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   4. DISTRIBUTOR & PHARMACY TRANSFERS (ISOLATED SUPPLY CHAIN)
══════════════════════════════════════════════════════════════════════ */

// 4.1 Manufacturer initiates transfer of an approved medicine to a Distributor
router.post("/transfers", verifyToken, requireRole("Manufacturer", "Creator"), validate(schemas.createTransfer), async (req, res) => {
  try {
    const { medicineId, distributorId, notes } = req.body;
    const quantityNum = parseInt(req.body.quantity, 10);

    if (isNaN(quantityNum) || quantityNum <= 0) {
      return sendError(res, "Quantity must be a positive integer", "INVALID_QUANTITY", 400);
    }

    // 1. Locate Medicine
    const rawMedId = (medicineId || "").trim();
    const safeMedId = escapeRegex(rawMedId);
    const queryConditions = [
      { id: new RegExp(`^${safeMedId}$`, "i") },
      { batchId: new RegExp(`^${safeMedId}$`, "i") },
    ];
    if (mongoose.isValidObjectId(rawMedId)) {
      queryConditions.push({ _id: rawMedId });
    }
    const medicine = await Medicine.findOne({ $or: queryConditions });
    if (!medicine) {
      return sendError(res, "Medicine not found", "MEDICINE_NOT_FOUND", 404);
    }

    // 2. Enforce Approval Check
    if (medicine.approvalStatus !== "approved" && req.user.role !== "Creator") {
      return sendError(
        res,
        `Cannot transfer medicine with approval status '${medicine.approvalStatus || "pending"}'. Only approved medicines may be transferred.`,
        "MEDICINE_NOT_APPROVED",
        400
      );
    }

    // 3. Authorization Check
    if (req.user.role !== "Creator") {
      const isMfr = medicine.manufacturerId && medicine.manufacturerId.toString() === req.user._id.toString();
      const isOwner = medicine.currentOwnerId && medicine.currentOwnerId.toString() === req.user._id.toString();
      if (!isMfr && !isOwner) {
        return sendError(res, "Access denied: You are not authorized to transfer this medicine batch.", "FORBIDDEN", 403);
      }
    }

    // 4. Quantity / Inventory Validation
    const availableQty = typeof medicine.quantity === "number" ? medicine.quantity : 1000;
    if (quantityNum > availableQty) {
      return sendError(
        res,
        `Requested transfer quantity (${quantityNum}) exceeds available inventory (${availableQty} units).`,
        "INSUFFICIENT_INVENTORY",
        400
      );
    }

    // 5. Target Distributor Validation
    const targetUser = await User.findById(distributorId);
    if (!targetUser || (targetUser.role !== "Distributor" && targetUser.role !== "distributor")) {
      return sendError(res, "Target distributor not found or invalid role", "INVALID_DISTRIBUTOR", 404);
    }
    if (targetUser.accountStatus !== "APPROVED") {
      return sendError(res, "Selected distributor account is not approved for supply-chain transfers.", "DISTRIBUTOR_NOT_APPROVED", 400);
    }

    const distProfile = await getProfileForUser(targetUser);
    const toDistName = (distProfile?.companyName || targetUser.company || targetUser.name || "Distributor").trim();

    const mfrProfile = req.userProfile || await getProfileForUser(req.user);
    const fromMfrName = (mfrProfile?.companyName || req.user.company || medicine.company || medicine.manufacturer || "Manufacturer").trim();

    // 6. Create SupplyChainTransaction
    const transferId = `TR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const ts = new Date().toLocaleString("en-IN");

    const newTransfer = new SupplyChainTransaction({
      id: transferId,
      transferId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      batchId: medicine.batchId,
      fromUserId: req.user._id,
      fromRole: "Manufacturer",
      from: fromMfrName,
      toUserId: targetUser._id,
      toRole: "Distributor",
      to: toDistName,
      quantity: `${quantityNum} Units`,
      timestamp: ts,
      action: "TRANSFERRED",
      status: "Pending Confirmation",
      blockchainStatus: "Pending Confirmation",
      notes: (notes || "").trim(),
    });
    await newTransfer.save();

    // 7. Update Medicine History & Inventory Stock
    medicine.transferHistory.push({
      step: 1.5,
      role: "Manufacturer",
      actor: fromMfrName,
      timestamp: ts,
      status: `Dispatched to Distributor (${toDistName}) - Pending Confirmation`,
      txHash: null,
    });
    medicine.currentHolder = `Dispatched to ${toDistName}`;
    if (typeof medicine.quantity === "number") {
      medicine.quantity = Math.max(0, medicine.quantity - quantityNum);
    }
    await medicine.save();

    // 8. In-App Notification to Distributor
    try {
      await Notification.create({
        userId: targetUser._id,
        title: "New Incoming Medicine Transfer",
        message: `${fromMfrName} has dispatched ${quantityNum} Units of ${medicine.name} (Batch: ${medicine.batchId}) to your organization.`,
        type: "TRANSFER",
      });
    } catch (notifErr) {}

    // 9. Record AuditLog
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "TRANSFER_CREATED",
        resource: "SupplyChainTransaction",
        resourceId: transferId,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: medicine.batchId, toDistName, quantity: quantityNum },
      });
    } catch (auditErr) {}

    const responsePayload = {
      ...newTransfer.toObject(),
      availableStockAfterTransfer: medicine.quantity,
    };

    return sendSuccess(res, responsePayload, "Transfer initiated successfully! Pending Distributor confirmation.", 201);
  } catch (err) {
    return sendError(res, err.message, "TRANSFER_CREATION_FAILED", 500);
  }
});

// 4.2 Manufacturer views outgoing transfers
router.get("/transfers/outgoing", verifyToken, requireRole("Manufacturer", "Creator"), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "Creator") {
      query = { fromRole: "Manufacturer" };
    } else {
      query = { fromUserId: req.user._id };
    }

    const rawTransfers = await SupplyChainTransaction.find(query).sort({ createdAt: -1 });

    // Enrich each transfer with medicine details & image
    const batchIds = [...new Set(rawTransfers.map((t) => t.batchId).filter(Boolean))];
    const medicines = await Medicine.find(
      { batchId: { $in: batchIds } },
      { batchId: 1, medicineImage: 1, manufacturingDate: 1, expiryDate: 1, approvalStatus: 1, composition: 1 }
    );
    const medicineMap = Object.fromEntries(medicines.map((m) => [m.batchId, m]));

    const transfers = rawTransfers.map((t) => {
      const med = medicineMap[t.batchId];
      const plain = t.toObject ? t.toObject() : { ...t };
      return {
        ...plain,
        medicineImage: med?.medicineImage || null,
        manufacturingDate: plain.manufacturingDate || med?.manufacturingDate || null,
        expiryDate: plain.expiryDate || med?.expiryDate || null,
        composition: med?.composition || "",
        approvalStatus: med?.approvalStatus || "approved",
      };
    });

    return sendSuccess(res, transfers, "Outgoing transfers retrieved");
  } catch (err) {
    return sendError(res, err.message, "OUTGOING_TRANSFERS_FAILED", 500);
  }
});

router.get("/transfers/incoming", verifyToken, requireRole("Distributor", "Pharmacy", "Creator"), async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const company = (userProfile?.companyName || userProfile?.pharmacyName || req.user.company || "").trim();

    let query = {};
    if (role === "creator") {
      query = {};
    } else if (role === "distributor") {
      // Scope strictly to this distributor — not all distributors
      const safeCompany = escapeRegex(company);
      const orConditions = [
        { toUserId: req.user._id },
        { to: "Pending Assignment" },
        { toUserId: null, toRole: "Distributor", action: "REGISTERED" },
      ];
      if (safeCompany) orConditions.push({ to: new RegExp(`^${safeCompany}$`, "i") });
      // Also show REGISTERED batches from manufacturers the distributor is linked to
      const mfrLinks = await SupplyChainLink.find({
        linkType: "MANUFACTURER_DISTRIBUTOR",
        toUserId: req.user._id,
        status: "APPROVED",
      }).distinct("fromUserId");
      if (mfrLinks.length > 0) {
        orConditions.push({ fromUserId: { $in: mfrLinks }, action: "REGISTERED" });
      }
      query = { $or: orConditions };
    } else if (role === "pharmacy") {
      // Scope strictly to this pharmacy
      const safeCompany = escapeRegex(company);
      const orConditions = [
        { toUserId: req.user._id },
        { to: "Pending Assignment" },
        { to: "Unassigned Pharmacy" },
      ];
      if (safeCompany) {
        orConditions.push({ to: new RegExp(`^${safeCompany}$`, "i") });
      }
      query = { $or: orConditions };
    }

    const rawTransfers = await SupplyChainTransaction.find(query).sort({ createdAt: -1 });

    // Enrich each transfer with the medicine image from the Medicine collection
    const batchIds = [...new Set(rawTransfers.map((t) => t.batchId).filter(Boolean))];
    const medicines = await Medicine.find(
      { batchId: { $in: batchIds } },
      { batchId: 1, medicineImage: 1, manufacturingDate: 1, expiryDate: 1, approvalStatus: 1 }
    );
    const medicineMap = Object.fromEntries(medicines.map((m) => [m.batchId, m]));

    // Strictly filter out transfers for unapproved medicines if caller is not Creator
    const approvedBatchSet = new Set(
      medicines.filter((m) => m.approvalStatus === "approved").map((m) => m.batchId)
    );
    const eligibleTransfers = role === "creator"
      ? rawTransfers
      : rawTransfers.filter((t) => approvedBatchSet.has(t.batchId));

    const transfers = eligibleTransfers.map((t) => {
      const med = medicineMap[t.batchId];
      if (!med) return t;
      const plain = t.toObject ? t.toObject() : { ...t };
      return {
        ...plain,
        medicineImage: med.medicineImage || null,
        manufacturingDate: plain.manufacturingDate || med.manufacturingDate || null,
        expiryDate: plain.expiryDate || med.expiryDate || null,
        approvalStatus: med.approvalStatus || "approved",
      };
    });

    return sendSuccess(res, transfers, "Incoming transfers retrieved");
  } catch (err) {
    return sendError(res, err.message, "TRANSFERS_FETCH_FAILED", 500);
  }
});

router.post("/transfers/:id/confirm", verifyToken, requireRole("Distributor", "Creator"), async (req, res) => {
  try {
    const transferId = req.params.id;
    logger.transfer("Transfer confirm requested", { transferId, by: req.user?.email });
    const transfer = await SupplyChainTransaction.findOne({
      $or: [{ id: transferId }, { transferId }],
    });
    if (!transfer) {
      return sendError(res, "Transfer not found", "NOT_FOUND", 404);
    }

    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const actor = userProfile?.companyName || req.user.company || "ABC Distributors";

    // 1. RBAC check: ensure this transfer is addressed to this distributor
    if (req.user.role !== "Creator") {
      const isTargetUser = transfer.toUserId && transfer.toUserId.toString() === req.user._id.toString();
      const isTargetActor = transfer.to && actor && transfer.to.toLowerCase() === actor.toLowerCase();
      if (transfer.toUserId && !isTargetUser && !isTargetActor) {
        return sendError(res, "Access denied: This transfer is addressed to another distributor.", "FORBIDDEN", 403);
      }
    }

    // 2. State check: prevent duplicate confirmation or confirming rejected transfer
    if (transfer.status === "Confirmed" || transfer.action === "CONFIRMED") {
      return sendError(res, "Transfer has already been confirmed.", "ALREADY_CONFIRMED", 400);
    }
    if (transfer.status === "Rejected" || transfer.action === "REJECTED") {
      return sendError(res, "Cannot confirm a rejected transfer.", "ALREADY_REJECTED", 400);
    }

    // 3. Approval check: ensure medicine batch is approved
    const medicine = await Medicine.findOne({ batchId: transfer.batchId });
    if (!medicine) {
      return sendError(res, "Associated medicine batch not found.", "NOT_FOUND", 404);
    }
    if (medicine.approvalStatus !== "approved" && req.user.role !== "Creator") {
      return sendError(res, "Cannot confirm unapproved or rejected medicine batch.", "MEDICINE_NOT_APPROVED", 400);
    }

    const chainRecord = await recordTransferOnChain(transfer.id, transfer.from, actor, "Distributor", transfer.medicineId, transfer.batchId);
    const ts = new Date().toLocaleString("en-IN");

    // Update SupplyChainTransaction
    transfer.toUserId = req.user._id;
    transfer.to = actor;
    transfer.action = "CONFIRMED";
    transfer.status = "Confirmed";
    transfer.blockchainStatus = "Confirmed";
    transfer.confirmTxHash = chainRecord.txHash;
    transfer.confirmedAt = ts;
    await transfer.save();

    // Update Medicine ownership & custody
    await Medicine.findOneAndUpdate(
      { batchId: transfer.batchId },
      {
        $push: {
          transferHistory: {
            step: 2,
            role: "Distributor",
            actor,
            timestamp: ts,
            status: "Confirmed",
            txHash: chainRecord.txHash,
          },
        },
        $set: {
          currentOwnerId: req.user._id,
          currentOwnerRole: "Distributor",
          currentHolder: `Distributor (${actor})`,
        },
      }
    );

    // Record BlockchainTransaction
    try {
      await BlockchainTransaction.create({
        medicineId: transfer.medicineId,
        batchId: transfer.batchId,
        transactionType: "CUSTODY_TRANSFER",
        blockIndex: chainRecord.blockIndex || 1,
        transactionHash: chainRecord.txHash,
        timestamp: new Date(),
        validationStatus: "VALID",
      });
    } catch (bcErr) {}

    // In-App Notification to Manufacturer
    if (transfer.fromUserId) {
      try {
        await Notification.create({
          userId: transfer.fromUserId,
          title: "Transfer Confirmed by Distributor",
          message: `${actor} has accepted transfer ${transfer.id} for batch ${transfer.batchId}.`,
          type: "TRANSFER",
        });
      } catch (notifErr) {}
    }

    // Record AuditLog
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "TRANSFER_CONFIRMED",
        resource: "SupplyChainTransaction",
        resourceId: transfer.id,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: transfer.batchId, actor, txHash: chainRecord.txHash },
      });
    } catch (auditErr) {}

    return sendSuccess(res, transfer, "Transfer confirmed and recorded on DrugChain");
  } catch (err) {
    return sendError(res, err.message, "CONFIRM_FAILED", 500);
  }
});

// 4.4 Distributor Rejects Transfer
router.post("/transfers/:id/reject", verifyToken, requireRole("Distributor", "Creator"), validate(schemas.rejectTransfer), async (req, res) => {
  try {
    const transferId = req.params.id;
    const transfer = await SupplyChainTransaction.findOne({
      $or: [{ id: transferId }, { transferId }],
    });
    if (!transfer) {
      return sendError(res, "Transfer not found", "NOT_FOUND", 404);
    }

    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const actor = userProfile?.companyName || req.user.company || "ABC Distributors";

    // RBAC check: ensure this transfer is addressed to this distributor
    if (req.user.role !== "Creator") {
      const isTargetUser = transfer.toUserId && transfer.toUserId.toString() === req.user._id.toString();
      const isTargetActor = transfer.to && actor && transfer.to.toLowerCase() === actor.toLowerCase();
      if (transfer.toUserId && !isTargetUser && !isTargetActor) {
        return sendError(res, "Access denied: This transfer is addressed to another distributor.", "FORBIDDEN", 403);
      }
    }

    // State check
    if (transfer.status === "Confirmed" || transfer.action === "CONFIRMED") {
      return sendError(res, "Cannot reject an already confirmed transfer.", "ALREADY_CONFIRMED", 400);
    }
    if (transfer.status === "Rejected" || transfer.action === "REJECTED") {
      return sendError(res, "Transfer has already been rejected.", "ALREADY_REJECTED", 400);
    }

    const rejectionReason = (req.body.rejectionReason || req.body.reason || "Rejected by distributor").trim();
    const ts = new Date().toLocaleString("en-IN");

    transfer.status = "Rejected";
    transfer.action = "REJECTED";
    transfer.blockchainStatus = "Rejected";
    transfer.rejectionReason = rejectionReason;
    transfer.rejectedAt = ts;
    transfer.rejectedBy = req.user._id;
    await transfer.save();

    // Reconcile medicine holder back to Manufacturer
    const medicine = await Medicine.findOne({ batchId: transfer.batchId });
    if (medicine) {
      medicine.currentHolder = medicine.company || medicine.manufacturer || "Manufacturer";
      medicine.transferHistory.push({
        step: 2,
        role: "Distributor",
        actor,
        timestamp: ts,
        status: `Rejected by Distributor: ${rejectionReason}`,
        txHash: null,
      });
      await medicine.save();
    }

    // Notify Manufacturer
    if (transfer.fromUserId) {
      try {
        await Notification.create({
          userId: transfer.fromUserId,
          title: "Transfer Rejected by Distributor",
          message: `${actor} rejected transfer ${transfer.id} for batch ${transfer.batchId}. Reason: ${rejectionReason}`,
          type: "WARNING",
        });
      } catch (notifErr) {}
    }

    // Record AuditLog
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "TRANSFER_REJECTED",
        resource: "SupplyChainTransaction",
        resourceId: transfer.id,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: transfer.batchId, actor, rejectionReason },
      });
    } catch (auditErr) {}

    return sendSuccess(res, transfer, "Transfer rejected. Manufacturer has been notified.");
  } catch (err) {
    return sendError(res, err.message, "REJECT_FAILED", 500);
  }
});

router.post("/transfers/:id/forward", verifyToken, requireRole("Distributor", "Creator"), async (req, res) => {
  try {
    const transferId = req.params.id;
    const transfer = await SupplyChainTransaction.findOne({
      $or: [{ id: transferId }, { transferId }],
    });
    if (!transfer) {
      return sendError(res, "Transfer not found", "NOT_FOUND", 404);
    }

    // 1. Approval check: ensure medicine batch is approved
    const medicine = await Medicine.findOne({ batchId: transfer.batchId });
    if (!medicine) {
      return sendError(res, "Associated medicine batch not found.", "NOT_FOUND", 404);
    }
    if (medicine.approvalStatus !== "approved" && req.user.role !== "Creator") {
      return sendError(res, "Cannot forward unapproved or rejected medicine batch.", "MEDICINE_NOT_APPROVED", 400);
    }

    // 2. Custody authorization: user must own or have confirmed this transfer
    if (req.user.role !== "Creator") {
      const isOwner = medicine.currentOwnerId && medicine.currentOwnerId.toString() === req.user._id.toString();
      const isRecipient = transfer.toUserId && transfer.toUserId.toString() === req.user._id.toString();
      if (!isOwner && !isRecipient) {
        return sendError(res, "Access denied: You must be the confirmed recipient of this batch to forward it.", "FORBIDDEN", 403);
      }
    }

    // 3. Prevent duplicate forward
    if (transfer.action === "FORWARDED" || transfer.status === "Forwarded to Pharmacy") {
      return sendError(res, "Transfer has already been forwarded to pharmacy.", "ALREADY_FORWARDED", 400);
    }

    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const fromActor = (userProfile?.companyName || req.user.company || "").trim() || "Distributor";

    // Resolve destination pharmacy: use provided pharmacyUserId or pharmacyName, else use linked pharmacy
    let toActor = (req.body.destinationPharmacy || "").trim();
    let toPharmacyUserId = req.body.pharmacyUserId || null;

    if (!toActor && toPharmacyUserId) {
      const pharmUser = await User.findById(toPharmacyUserId);
      const pharmProfile = pharmUser ? await getProfileForUser(pharmUser) : null;
      toActor = pharmProfile?.pharmacyName || pharmProfile?.companyName || pharmUser?.name || "Pharmacy";
    }

    if (!toActor) {
      // Fall back to first approved linked pharmacy
      const pharmLink = await SupplyChainLink.findOne({
        linkType: "DISTRIBUTOR_PHARMACY",
        fromUserId: req.user._id,
        status: "APPROVED",
      });
      if (pharmLink) {
        toActor = pharmLink.toCompanyName;
        toPharmacyUserId = pharmLink.toUserId;
      } else {
        toActor = "Unassigned Pharmacy";
      }
    }

    const chainRecord = await recordTransferOnChain(transfer.id, fromActor, toActor, "Pharmacy", transfer.medicineId, transfer.batchId);
    const ts = new Date().toLocaleString("en-IN");

    // Update SupplyChainTransaction
    transfer.action = "FORWARDED";
    transfer.status = "Forwarded to Pharmacy";
    transfer.blockchainStatus = "Forwarded to Pharmacy";
    transfer.forwardTxHash = chainRecord.txHash;
    transfer.forwardedAt = ts;
    await transfer.save();

    // Create a new SupplyChainTransaction for the Pharmacy leg
    const pharmacyTransferId = `TR-${Date.now().toString().slice(-6)}`;
    await SupplyChainTransaction.create({
      id: pharmacyTransferId,
      transferId: pharmacyTransferId,
      medicineId: transfer.medicineId,
      medicineName: transfer.medicineName,
      batchId: transfer.batchId,
      fromUserId: req.user._id,
      fromRole: "Distributor",
      from: fromActor,
      toRole: "Pharmacy",
      toUserId: toPharmacyUserId || null,
      to: toActor,
      quantity: transfer.quantity,
      timestamp: ts,
      action: "FORWARDED",
      status: "Forwarded to Pharmacy",
      blockchainStatus: "Forwarded to Pharmacy",
      forwardTxHash: chainRecord.txHash,
      forwardedAt: ts,
    });

    // Update Medicine custody
    await Medicine.findOneAndUpdate(
      { batchId: transfer.batchId },
      {
        $push: {
          transferHistory: {
            step: 3,
            role: "Pharmacy",
            actor: toActor,
            timestamp: ts,
            status: "In Transit to Pharmacy",
            txHash: chainRecord.txHash,
          },
        },
        $set: {
          currentHolder: `Transit (${toActor})`,
          currentOwnerRole: "Pharmacy",
        },
      }
    );

    // Record BlockchainTransaction
    try {
      await BlockchainTransaction.create({
        medicineId: transfer.medicineId,
        batchId: transfer.batchId,
        transactionType: "CUSTODY_TRANSFER",
        blockIndex: chainRecord.blockIndex || 1,
        transactionHash: chainRecord.txHash,
        timestamp: new Date(),
        validationStatus: "VALID",
      });
    } catch (bcErr) {}

    // Record AuditLog
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "TRANSFER_FORWARDED",
        resource: "SupplyChainTransaction",
        resourceId: transfer.id,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: transfer.batchId, fromActor, toActor, txHash: chainRecord.txHash },
      });
    } catch (auditErr) {}

    return sendSuccess(res, transfer, "Batch forwarded to pharmacy on DrugChain");
  } catch (err) {
    return sendError(res, err.message, "FORWARD_FAILED", 500);
  }
});

router.post("/pharmacy/:medicineId/confirm", verifyToken, requireRole("Pharmacy", "Creator"), async (req, res) => {
  try {
    const rawId = req.params.medicineId.trim();
    const safeId = escapeRegex(rawId);
    const medicine = await Medicine.findOne({
      $or: [{ id: new RegExp(`^${safeId}$`, "i") }, { batchId: new RegExp(`^${safeId}$`, "i") }],
    });

    if (!medicine) {
      return sendError(res, "Medicine not found", "NOT_FOUND", 404);
    }

    if (medicine.approvalStatus !== "approved" && req.user.role !== "Creator") {
      return sendError(res, "Cannot stock unapproved medicine batch. Batch is pending or rejected.", "MEDICINE_NOT_APPROVED", 400);
    }

    const userProfile = req.userProfile || await getProfileForUser(req.user);
    const pharmacyActor = userProfile?.pharmacyName || userProfile?.companyName || req.user.company || "City Pharmacy (POS)";
    const safePharmacyActor = escapeRegex(pharmacyActor);

    // RBAC: Verify that this batch was dispatched to this pharmacy or is eligible for pharmacy receipt
    if (req.user.role !== "Creator") {
      // If another pharmacy has a dedicated exclusive transfer lock for this batch, reject unauthorized third parties
      const otherPharmacyTransfer = await SupplyChainTransaction.findOne({
        batchId: medicine.batchId,
        toRole: "Pharmacy",
        toUserId: { $exists: true, $ne: null },
      });

      if (otherPharmacyTransfer && otherPharmacyTransfer.toUserId && otherPharmacyTransfer.toUserId.toString() !== req.user._id.toString()) {
        const isActorMatch = otherPharmacyTransfer.to && safePharmacyActor && otherPharmacyTransfer.to.toLowerCase() === pharmacyActor.toLowerCase();
        if (!isActorMatch) {
          return sendError(res, "Access denied: This medicine batch was dispatched to a different pharmacy.", "FORBIDDEN", 403);
        }
      }
    }

    const ts = new Date().toLocaleString("en-IN");
    const chainRecord = await recordReceiptOnChain(medicine.id, medicine.batchId, pharmacyActor, "Pharmacy");

    medicine.transferHistory.push({
      step: medicine.transferHistory.length + 1,
      role: "Pharmacy",
      actor: pharmacyActor,
      timestamp: ts,
      status: "Verified & Stocked",
      txHash: chainRecord.txHash,
    });
    medicine.currentOwnerId = req.user._id;
    medicine.currentOwnerRole = "Pharmacy";
    medicine.currentHolder = `Pharmacy Shelf (${pharmacyActor})`;
    await medicine.save();

    // Update or create SupplyChainTransaction for this batch
    const existingPharmTransfer = await SupplyChainTransaction.findOne({
      batchId: medicine.batchId,
      toRole: "Pharmacy",
    });

    if (existingPharmTransfer) {
      existingPharmTransfer.toUserId = req.user._id;
      existingPharmTransfer.to = pharmacyActor;
      existingPharmTransfer.action = "RECEIVED";
      existingPharmTransfer.status = "Stocked";
      existingPharmTransfer.blockchainStatus = "Received";
      existingPharmTransfer.confirmTxHash = chainRecord.txHash;
      await existingPharmTransfer.save();
    } else {
      // Find latest transfer (e.g. from Distributor or Manufacturer) to link the custody chain
      const latestTx = await SupplyChainTransaction.findOne({ batchId: medicine.batchId }).sort({ createdAt: -1 });
      const pharmacyTransferId = `TR-${Date.now().toString().slice(-6)}`;
      await SupplyChainTransaction.create({
        id: pharmacyTransferId,
        transferId: pharmacyTransferId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: medicine.batchId,
        fromUserId: latestTx?.toUserId || latestTx?.fromUserId || medicine.manufacturerId,
        fromRole: latestTx?.toRole || latestTx?.fromRole || "Distributor",
        from: latestTx?.to || latestTx?.from || "Distributor",
        toRole: "Pharmacy",
        toUserId: req.user._id,
        to: pharmacyActor,
        quantity: latestTx?.quantity || `${medicine.quantity || 1} Units`,
        timestamp: ts,
        action: "RECEIVED",
        status: "Stocked",
        blockchainStatus: "Received",
        confirmTxHash: chainRecord.txHash,
      });

      // Mark the prior transfer as confirmed/fulfilled
      if (latestTx && latestTx.status === "Pending Confirmation") {
        latestTx.status = "Confirmed";
        latestTx.action = "CONFIRMED";
        latestTx.blockchainStatus = "Confirmed";
        await latestTx.save();
      }
    }

    // Record BlockchainTransaction
    try {
      await BlockchainTransaction.create({
        medicineId: medicine.id,
        batchId: medicine.batchId,
        transactionType: "RECEIPT_CONFIRMATION",
        blockIndex: chainRecord.blockIndex || 1,
        transactionHash: chainRecord.txHash,
        timestamp: new Date(),
        validationStatus: "VALID",
      });
    } catch (bcErr) {}

    // Record AuditLog
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: "PHARMACY_STOCK_CONFIRMED",
        resource: "Medicine",
        resourceId: medicine.id,
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { batchId: medicine.batchId, pharmacyActor, txHash: chainRecord.txHash },
      });
    } catch (auditErr) {}

    return sendSuccess(res, medicine, "Pharmacy shelf receipt confirmed on DrugChain");
  } catch (err) {
    return sendError(res, err.message, "PHARMACY_CONFIRM_FAILED", 500);
  }
});

// 4.6 Notifications
router.get("/notifications", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return sendSuccess(res, notifications, "Notifications retrieved");
  } catch (err) {
    return sendError(res, err.message, "NOTIFICATIONS_FETCH_FAILED", 500);
  }
});

router.patch("/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    return sendSuccess(res, notif, "Notification marked as read");
  } catch (err) {
    return sendError(res, err.message, "UPDATE_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   5. UNIFIED REAL VERIFICATION ENGINE (SUPPLY CHAIN ANOMALIES & QR REUSE)
══════════════════════════════════════════════════════════════════════ */
function evaluateSupplyChainAnomalies(medicine) {
  const flags = [];
  const now = new Date();

  // Check 1: Expiry date check
  if (new Date(medicine.expiryDate) < now) {
    flags.push(`EXPIRED: Medicine passed expiry date (${medicine.expiryDate})`);
  }

  // Check 2: Sequential transfer history check
  const history = medicine.transferHistory || [];
  if (history.length > 0) {
    const steps = history.map((h) => h.role);
    // Pharmacy step without preceding Distributor
    if (steps.includes("Pharmacy") && !steps.includes("Distributor")) {
      flags.push("UNAUTHORIZED_CUSTODY_HOP: Batch arrived at Pharmacy without verified Distributor transit record");
    }
  }

  return {
    anomalyDetected: flags.length > 0,
    flags,
    summary: flags.length > 0 ? "ANOMALY_DETECTED" : "NORMAL",
  };
}

router.get("/public/verify/:code", publicVerifyLimiter, async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code).trim();
    const auditResult = await runFullAuthenticityAudit({
      queryCode: code,
      clientIp: req.ip,
      user: req.user,
    });
    return sendSuccess(res, auditResult, "Medicine authenticity verification completed");
  } catch (err) {
    logger.error("Verification engine error", { message: err.message });
    return sendError(res, "Verification failed due to server error", "VERIFICATION_ENGINE_FAILED", 500);
  }
});

router.post("/qr/verify", publicVerifyLimiter, async (req, res) => {
  try {
    const { code, token, medicineId, batchId } = req.body;
    const targetCode = token || code || batchId || medicineId;
    if (!targetCode) {
      return sendError(res, "Verification code or token is required", "MISSING_CODE", 400);
    }
    const auditResult = await runFullAuthenticityAudit({
      queryCode: String(targetCode).trim(),
      clientIp: req.ip,
      user: req.user,
    });
    return sendSuccess(res, auditResult, "QR authenticity verification completed");
  } catch (err) {
    logger.error("QR verification error", { message: err.message });
    return sendError(res, err.message, "QR_VERIFY_FAILED", 500);
  }
});

router.get("/public/medicine/:code", async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code).trim();
    const safeCode = escapeRegex(code);
    const medicine = await Medicine.findOne({
      $or: [{ id: new RegExp(`^${safeCode}$`, "i") }, { batchId: new RegExp(`^${safeCode}$`, "i") }],
    });

    if (!medicine) return sendError(res, "Medicine not found", "NOT_FOUND", 404);

    const isApproved = medicine.approvalStatus === "approved";
    const isRejected = medicine.approvalStatus === "rejected";

    const safePublicData = {
      id: medicine.id,
      batchId: medicine.batchId,
      name: medicine.name,
      medicineName: medicine.medicineName || medicine.name,
      company: medicine.company,
      manufacturer: medicine.manufacturer,
      manufacturingDate: medicine.manufacturingDate,
      expiryDate: medicine.expiryDate,
      price: medicine.price,
      composition: medicine.composition || "",
      medicineImage: medicine.medicineImage,
      approvalStatus: medicine.approvalStatus || "approved",
      status: isApproved ? medicine.status : (isRejected ? "REJECTED" : "PENDING APPROVAL"),
      blockchainStatus: isApproved ? medicine.blockchainStatus : (isRejected ? "Rejected" : "Pending Approval"),
      rejectionReason: isRejected ? medicine.rejectionReason : undefined,
      currentHolder: isApproved ? medicine.currentHolder : "Manufacturer (Pre-approval)",
      transferHistory: isApproved ? medicine.transferHistory : [],
    };

    return sendSuccess(res, safePublicData, "Medicine details retrieved");
  } catch (err) {
    return sendError(res, err.message, "FETCH_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   6. DRUGCHAIN BLOCKCHAIN NETWORK EXPLORER & AUDITING
══════════════════════════════════════════════════════════════════════ */
router.get("/blockchain/status", async (req, res) => {
  try {
    const status = await getBlockchainStatus();
    return sendSuccess(res, status, "DrugChain status retrieved");
  } catch (err) {
    return sendError(res, err.message, "STATUS_FAILED", 500);
  }
});

router.get("/blockchain/chain", async (req, res) => {
  try {
    const chain = drugChainService.getFullChain ? drugChainService.getFullChain() : [];
    return sendSuccess(res, chain, "DrugChain raw ledger retrieved");
  } catch (err) {
    logger.error("Blockchain chain fetch failed", { message: err.message });
    return sendError(res, err.message, "CHAIN_FETCH_FAILED", 500);
  }
});

router.get("/blockchain/medicine/:medicineId", async (req, res) => {
  try {
    const queryId = req.params.medicineId.trim();
    const safeQueryId = escapeRegex(queryId);
    const history = drugChainService.getMedicineHistory(queryId);
    const medicine = await Medicine.findOne({
      $or: [{ id: new RegExp(`^${safeQueryId}$`, "i") }, { batchId: new RegExp(`^${safeQueryId}$`, "i") }],
    });

    return sendSuccess(
      res,
      {
        medicineId: queryId,
        onChainHistory: history,
        medicineDetails: medicine || null,
        totalEvents: history.length,
      },
      "On-chain medicine record retrieved"
    );
  } catch (err) {
    return sendError(res, err.message, "BLOCKCHAIN_MEDICINE_FAILED", 500);
  }
});

router.get("/blockchain/history/:medicineId", async (req, res) => {
  try {
    const history = drugChainService.getMedicineHistory(req.params.medicineId);
    return sendSuccess(res, history, "On-chain history retrieved");
  } catch (err) {
    return sendError(res, err.message, "HISTORY_FAILED", 500);
  }
});

router.get("/blockchain/validate", async (req, res) => {
  try {
    const validation = await validateDrugChain();
    return sendSuccess(res, validation, "DrugChain validation complete");
  } catch (err) {
    return sendError(res, err.message, "VALIDATION_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   7. FILE UPLOADS STANDALONE ENDPOINTS
══════════════════════════════════════════════════════════════════════ */
router.post("/uploads/medicine", upload.single("medicineImage"), (req, res) => {
  if (!req.file) return sendError(res, "No medicine image uploaded", "NO_FILE", 400);
  return sendSuccess(res, { fileUrl: `/uploads/${req.file.filename}`, filename: req.file.filename }, "Medicine image uploaded");
});

router.post("/uploads/certificate", upload.single("governmentCertificate"), (req, res) => {
  if (!req.file) return sendError(res, "No certificate uploaded", "NO_FILE", 400);
  return sendSuccess(res, { fileUrl: `/uploads/${req.file.filename}`, filename: req.file.filename }, "Certificate uploaded");
});

/* ══════════════════════════════════════════════════════════════════════
   8. SECURE QR GENERATION & HMAC TOKEN VERIFICATION
══════════════════════════════════════════════════════════════════════ */
router.post("/qr/generate", (req, res) => {
  const { medicineId, batchId } = req.body;
  if (!medicineId && !batchId) return sendError(res, "medicineId or batchId required", "MISSING_ID", 400);

  const tokenData = generateSecureQRToken(medicineId || "MED-2024-001", batchId || "BATCH-001");

  return sendSuccess(
    res,
    {
      payload: tokenData.token,
      token: tokenData.token,
      verificationUrl: tokenData.verificationUrl,
      code: batchId || medicineId,
      signedPayload: tokenData.payload,
    },
    "Secure HMAC-SHA256 signed QR Payload generated"
  );
});

/* ══════════════════════════════════════════════════════════════════════
   9. SECURITY ALERTS — ADMIN / CREATOR ONLY
   Risk signals generated silently during registration and medicine
   submission. STRICTLY access-controlled — 403 for any non-Creator.
══════════════════════════════════════════════════════════════════════ */

// GET /security-alerts — list alerts with optional filters
router.get("/security-alerts", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const { status, severity, sourceType, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== "ALL") query.status = status.toUpperCase();
    if (severity && severity !== "ALL") query.severity = severity.toUpperCase();
    if (sourceType && sourceType !== "ALL") query.sourceType = sourceType.toUpperCase();

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [alerts, total] = await Promise.all([
      SecurityAlert.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      SecurityAlert.countDocuments(query),
    ]);

    // Counts by severity for dashboard badge
    const [openCount, criticalCount, highCount] = await Promise.all([
      SecurityAlert.countDocuments({ status: "OPEN" }),
      SecurityAlert.countDocuments({ status: "OPEN", severity: "CRITICAL" }),
      SecurityAlert.countDocuments({ status: "OPEN", severity: "HIGH" }),
    ]);

    return sendSuccess(
      res,
      {
        alerts,
        total,
        openCount,
        criticalCount,
        highCount,
        page: Number(page),
        limit: Number(limit),
      },
      "Security alerts retrieved"
    );
  } catch (err) {
    return sendError(res, err.message, "SECURITY_ALERTS_FAILED", 500);
  }
});

// GET /security-alerts/:alertId — single alert detail
router.get("/security-alerts/:alertId", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const alert = await SecurityAlert.findById(req.params.alertId);
    if (!alert) return sendError(res, "Security alert not found", "NOT_FOUND", 404);
    return sendSuccess(res, alert, "Alert detail retrieved");
  } catch (err) {
    return sendError(res, err.message, "ALERT_FETCH_FAILED", 500);
  }
});

// PATCH /security-alerts/:alertId/review — mark as reviewed with note
router.patch("/security-alerts/:alertId/review", verifyToken, requireRole("Creator"), async (req, res) => {
  try {
    const { action, note } = req.body; // action: "REVIEWED" | "DISMISSED" | "ESCALATED"
    const allowedActions = ["REVIEWED", "DISMISSED", "ESCALATED"];
    if (!action || !allowedActions.includes(action.toUpperCase())) {
      return sendError(res, `action must be one of: ${allowedActions.join(", ")}`, "INVALID_ACTION", 400);
    }

    const alert = await SecurityAlert.findById(req.params.alertId);
    if (!alert) return sendError(res, "Security alert not found", "NOT_FOUND", 404);

    alert.status = action.toUpperCase();
    alert.reviewedBy = req.user.email;
    alert.reviewedAt = new Date();
    alert.reviewNote = (note || "").trim();
    await alert.save();

    // Audit this review action
    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: `SECURITY_ALERT_${action.toUpperCase()}`,
        resource: "SecurityAlert",
        resourceId: alert._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { severity: alert.severity, sourceType: alert.sourceType, note },
      });
    } catch (auditErr) {}

    return sendSuccess(res, alert, `Alert marked as ${action.toUpperCase()}`);
  } catch (err) {
    return sendError(res, err.message, "ALERT_REVIEW_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   10. SUPPLY CHAIN DIRECTORY — APPROVED MANUFACTURERS & PHARMACIES LISTING
   Distributors can see all approved Manufacturers to link with.
   Distributors can see all approved Pharmacies to supply to.
══════════════════════════════════════════════════════════════════════ */

// GET /manufacturers — list all APPROVED manufacturers (for Distributor use)
router.get("/manufacturers", verifyToken, requireRole("Distributor", "Creator", "Manufacturer"), async (req, res) => {
  try {
    const { search } = req.query;
    const query = { role: "Manufacturer", accountStatus: "APPROVED" };
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
      ];
    }
    const manufacturers = await User.find(query).sort({ createdAt: -1 });
    const withProfiles = await Promise.all(
      manufacturers.map(async (u) => {
        const profile = await getProfileForUser(u);
        const safe = u.toSafeObject(profile);
        // Check if this distributor already has a link with this manufacturer
        let linkStatus = null;
        if (req.user.role === "Distributor") {
          const existingLink = await SupplyChainLink.findOne({
            linkType: "MANUFACTURER_DISTRIBUTOR",
            fromUserId: u._id,
            toUserId: req.user._id,
          });
          linkStatus = existingLink ? existingLink.status : null;
        }
        return {
          ...safe,
          linkStatus,
          profileComplete: !!(safe.companyName && safe.companyCode),
        };
      })
    );
    return sendSuccess(res, withProfiles, "Approved manufacturers retrieved");
  } catch (err) {
    return sendError(res, err.message, "MANUFACTURERS_FETCH_FAILED", 500);
  }
});

// GET /pharmacies — list all APPROVED pharmacies (for Distributor use)
router.get("/pharmacies", verifyToken, requireRole("Distributor", "Creator", "Pharmacy"), async (req, res) => {
  try {
    const { search } = req.query;
    const query = { role: "Pharmacy", accountStatus: "APPROVED" };
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
      ];
    }
    const pharmacies = await User.find(query).sort({ createdAt: -1 });
    const withProfiles = await Promise.all(
      pharmacies.map(async (u) => {
        const profile = await getProfileForUser(u);
        const safe = u.toSafeObject(profile);
        // Check if this distributor already has a link with this pharmacy
        let linkStatus = null;
        if (req.user.role === "Distributor") {
          const existingLink = await SupplyChainLink.findOne({
            linkType: "DISTRIBUTOR_PHARMACY",
            fromUserId: req.user._id,
            toUserId: u._id,
          });
          linkStatus = existingLink ? existingLink.status : null;
        }
        return {
          ...safe,
          linkStatus,
          profileComplete: !!(safe.companyName),
        };
      })
    );
    return sendSuccess(res, withProfiles, "Approved pharmacies retrieved");
  } catch (err) {
    return sendError(res, err.message, "PHARMACIES_FETCH_FAILED", 500);
  }
});

// GET /distributors — list all APPROVED distributors (for Manufacturer / Pharmacy use)
router.get("/distributors", verifyToken, requireRole("Manufacturer", "Pharmacy", "Creator", "Distributor"), async (req, res) => {
  try {
    const distributors = await User.find({ role: "Distributor", accountStatus: "APPROVED" }).sort({ createdAt: -1 });
    const withProfiles = await Promise.all(
      distributors.map(async (u) => {
        const profile = await getProfileForUser(u);
        const safe = u.toSafeObject(profile);
        let linkStatus = null;
        if (req.user.role === "Manufacturer") {
          const existingLink = await SupplyChainLink.findOne({
            linkType: "MANUFACTURER_DISTRIBUTOR",
            fromUserId: req.user._id,
            toUserId: u._id,
          });
          linkStatus = existingLink ? existingLink.status : null;
        }
        return { ...safe, linkStatus };
      })
    );
    return sendSuccess(res, withProfiles, "Approved distributors retrieved");
  } catch (err) {
    return sendError(res, err.message, "DISTRIBUTORS_FETCH_FAILED", 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   11. SUPPLY CHAIN LINKING — Persistent Manufacturer↔Distributor &
       Distributor↔Pharmacy Relationship Management
══════════════════════════════════════════════════════════════════════ */

// POST /supply-chain/link — create a supply-chain link between two parties
router.post("/supply-chain/link", verifyToken, requireRole("Manufacturer", "Distributor", "Creator"), async (req, res) => {
  try {
    const { targetUserId, linkType } = req.body;

    if (!targetUserId) {
      return sendError(res, "targetUserId is required", "MISSING_TARGET", 400);
    }

    const allowedLinkTypes = ["MANUFACTURER_DISTRIBUTOR", "DISTRIBUTOR_PHARMACY"];
    const resolvedLinkType = linkType || (req.user.role === "Manufacturer" ? "MANUFACTURER_DISTRIBUTOR" : "DISTRIBUTOR_PHARMACY");

    if (!allowedLinkTypes.includes(resolvedLinkType)) {
      return sendError(res, `linkType must be one of: ${allowedLinkTypes.join(", ")}`, "INVALID_LINK_TYPE", 400);
    }

    // Validate the target user exists and is approved
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return sendError(res, "Target user not found", "TARGET_NOT_FOUND", 404);
    }
    if (targetUser.accountStatus !== "APPROVED") {
      return sendError(res, "Target user is not yet approved. Only approved supply-chain partners can be linked.", "TARGET_NOT_APPROVED", 400);
    }

    // Validate roles
    const myRole = req.user.role;
    const targetRole = targetUser.role;
    if (resolvedLinkType === "MANUFACTURER_DISTRIBUTOR") {
      if (myRole !== "Manufacturer" && myRole !== "Creator") {
        return sendError(res, "Only Manufacturers or Creator can create Manufacturer-Distributor links", "ROLE_MISMATCH", 403);
      }
      if (targetRole !== "Distributor") {
        return sendError(res, "Target must be a Distributor for MANUFACTURER_DISTRIBUTOR links", "ROLE_MISMATCH", 400);
      }
    } else if (resolvedLinkType === "DISTRIBUTOR_PHARMACY") {
      if (myRole !== "Distributor" && myRole !== "Creator") {
        return sendError(res, "Only Distributors or Creator can create Distributor-Pharmacy links", "ROLE_MISMATCH", 403);
      }
      if (targetRole !== "Pharmacy") {
        return sendError(res, "Target must be a Pharmacy for DISTRIBUTOR_PHARMACY links", "ROLE_MISMATCH", 400);
      }
    }

    // Get both parties' company names for denormalization
    const myProfile = req.userProfile || await getProfileForUser(req.user);
    const myCompany = (myProfile?.companyName || myProfile?.pharmacyName || req.user.name || "").trim();
    const targetProfile = await getProfileForUser(targetUser);
    const targetCompany = (targetProfile?.companyName || targetProfile?.pharmacyName || targetUser.name || "").trim();

    // Prevent duplicate links
    const existing = await SupplyChainLink.findOne({
      linkType: resolvedLinkType,
      fromUserId: req.user._id,
      toUserId: targetUserId,
    });

    if (existing) {
      if (existing.status === "APPROVED") {
        return sendError(res, "A supply-chain link already exists between these parties", "DUPLICATE_LINK", 409);
      }
      // Reactivate rejected link
      existing.status = "APPROVED";
      existing.approvedAt = new Date();
      existing.rejectionReason = "";
      await existing.save();
      return sendSuccess(res, existing, "Supply-chain link reactivated successfully");
    }

    const link = await SupplyChainLink.create({
      linkType: resolvedLinkType,
      fromUserId: req.user._id,
      fromCompanyName: myCompany,
      fromRole: req.user.role,
      toUserId: targetUserId,
      toCompanyName: targetCompany,
      toRole: targetUser.role,
      status: "APPROVED",
      approvedAt: new Date(),
    });

    try {
      await AuditLog.create({
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        action: `SUPPLY_CHAIN_LINK_CREATED`,
        resource: "SupplyChainLink",
        resourceId: link._id.toString(),
        ipAddress: req.ip || "127.0.0.1",
        result: "SUCCESS",
        details: { linkType: resolvedLinkType, fromCompany: myCompany, toCompany: targetCompany },
      });
    } catch (e) {}

    return sendSuccess(res, link, `${resolvedLinkType.replace("_", "→")} supply-chain link established successfully`, 201);
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, "A supply-chain link already exists between these parties", "DUPLICATE_LINK", 409);
    }
    return sendError(res, err.message, "LINK_FAILED", 500);
  }
});

// GET /supply-chain/links — list my supply-chain links (both incoming and outgoing)
router.get("/supply-chain/links", verifyToken, async (req, res) => {
  try {
    const { linkType, direction } = req.query;
    const query = {};

    if (linkType && linkType !== "ALL") {
      query.linkType = linkType;
    }

    // By default: show all links where I am either from or to party
    if (direction === "outgoing") {
      query.fromUserId = req.user._id;
    } else if (direction === "incoming") {
      query.toUserId = req.user._id;
    } else {
      query.$or = [{ fromUserId: req.user._id }, { toUserId: req.user._id }];
    }

    const links = await SupplyChainLink.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, links, "Supply-chain links retrieved");
  } catch (err) {
    return sendError(res, err.message, "LINKS_FETCH_FAILED", 500);
  }
});

// DELETE /supply-chain/links/:id — remove a supply-chain link
router.delete("/supply-chain/links/:id", verifyToken, requireRole("Manufacturer", "Distributor", "Creator"), async (req, res) => {
  try {
    const link = await SupplyChainLink.findById(req.params.id);
    if (!link) return sendError(res, "Link not found", "NOT_FOUND", 404);

    // Only from-party or Creator can remove a link
    if (link.fromUserId.toString() !== req.user._id.toString() && req.user.role !== "Creator") {
      return sendError(res, "You are not authorized to remove this link", "FORBIDDEN", 403);
    }

    await link.deleteOne();
    return sendSuccess(res, { id: req.params.id }, "Supply-chain link removed");
  } catch (err) {
    return sendError(res, err.message, "LINK_DELETE_FAILED", 500);
  }
});

// GET /supply-chain/my-manufacturers — shortcut for Distributor to see their linked manufacturers
router.get("/supply-chain/my-manufacturers", verifyToken, requireRole("Distributor", "Creator"), async (req, res) => {
  try {
    const links = await SupplyChainLink.find({
      linkType: "MANUFACTURER_DISTRIBUTOR",
      toUserId: req.user._id,
      status: "APPROVED",
    });

    const manufacturers = await Promise.all(
      links.map(async (link) => {
        const mfrUser = await User.findById(link.fromUserId);
        if (!mfrUser) return null;
        const profile = await getProfileForUser(mfrUser);
        return {
          ...mfrUser.toSafeObject(profile),
          linkId: link._id,
          linkedAt: link.createdAt,
        };
      })
    );

    return sendSuccess(res, manufacturers.filter(Boolean), "Linked manufacturers retrieved");
  } catch (err) {
    return sendError(res, err.message, "LINKED_MANUFACTURERS_FAILED", 500);
  }
});

// GET /supply-chain/my-pharmacies — shortcut for Distributor to see their linked pharmacies
router.get("/supply-chain/my-pharmacies", verifyToken, requireRole("Distributor", "Creator"), async (req, res) => {
  try {
    const links = await SupplyChainLink.find({
      linkType: "DISTRIBUTOR_PHARMACY",
      fromUserId: req.user._id,
      status: "APPROVED",
    });

    const pharmacies = await Promise.all(
      links.map(async (link) => {
        const pharmUser = await User.findById(link.toUserId);
        if (!pharmUser) return null;
        const profile = await getProfileForUser(pharmUser);
        return {
          ...pharmUser.toSafeObject(profile),
          linkId: link._id,
          linkedAt: link.createdAt,
        };
      })
    );

    return sendSuccess(res, pharmacies.filter(Boolean), "Linked pharmacies retrieved");
  } catch (err) {
    return sendError(res, err.message, "LINKED_PHARMACIES_FAILED", 500);
  }
});

export default router;

