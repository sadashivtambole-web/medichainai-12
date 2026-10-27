import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config();

// ── App branding (override via .env) ─────────────────────────────────────
const APP_NAME      = process.env.APP_NAME      || "MediChainAI";
const APP_TAGLINE   = process.env.APP_TAGLINE   || "Secure Pharmaceutical Supply Chain";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@medichain.ai";
const BRAND_COLOR   = process.env.BRAND_COLOR   || "#4F46E5";

export class EmailService {
  constructor() {
    this.transporter = null;
    this._initTransporter();
  }

  _initTransporter() {
    // Support test transport for automated testing environments
    if (process.env.USE_TEST_EMAIL === "true") {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      logger.info("🧪 Email Service initialized with mock/test JSON transport.");
      return;
    }

    const service = process.env.SMTP_SERVICE;
    const host    = process.env.SMTP_HOST;
    const port    = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure  = process.env.SMTP_SECURE === "false" ? false : (port === 465);
    const user    = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass    = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

    if (user && pass) {
      const transportConfig = service && service.toLowerCase() === "gmail"
        ? {
            service: "gmail",
            auth: { user, pass },
          }
        : host
        ? {
            host,
            port,
            secure,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
          }
        : {
            service: "gmail",
            auth: { user, pass },
          };

      this.transporter = nodemailer.createTransport(transportConfig);
      logger.info(`📡 Email Service configured via SMTP (${user})`);
    } else {
      this.transporter = null;
      logger.warn("⚠️  Email Service: No SMTP credentials in .env (SMTP_USER/SMTP_PASS). Real emails will NOT be sent until SMTP is configured.");
    }
  }

  /**
   * Verify SMTP connection health without throwing unhandled exceptions.
   * Returns { ok: boolean, error?: string }
   */
  async verifyConnection() {
    if (!this.transporter) {
      return {
        ok: false,
        error: "SMTP transporter not initialized. Missing SMTP_USER or SMTP_PASS in backend/.env",
      };
    }
    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (err) {
      logger.error("SMTP transporter verification failed", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  /** Shared HTML wrapper with MediChainAI header/footer */
  _htmlWrapper(bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${APP_NAME} Notification</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;
               box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_COLOR},#7C3AED);padding:32px 36px;text-align:center;">
            <div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">🏥 ${APP_NAME}</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.88);margin-top:6px;">${APP_TAGLINE}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">${bodyHtml}</td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
              This is an automated system notification from <strong>${APP_NAME}</strong>.<br/>
              Need assistance? Contact our compliance support at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * Internal dispatcher — returns { success, mode, messageId?, error? }
   * Truthful dispatch: Never reports success if SMTP is not configured or failed!
   */
  async _dispatch({ to, subject, text, html }) {
    // Validate recipient
    if (!to || !to.includes("@")) {
      const err = `Invalid recipient email address: "${to}"`;
      logger.error(`[EMAIL ERROR] ${err}`);
      return { success: false, mode: "INVALID_RECIPIENT", error: err };
    }

    // Determine sender address
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromAddress = process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.EMAIL_FROM || (smtpUser ? `"${APP_NAME}" <${smtpUser}>` : `"${APP_NAME}" <no-reply@medichain.ai>`);

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          text,
          html,
        });
        logger.info("Email dispatched successfully", { to, subject, messageId: info.messageId });
        return {
          success: true,
          mode: process.env.USE_TEST_EMAIL === "true" ? "TEST_DISPATCH" : "SMTP_DELIVERED",
          messageId: info.messageId,
        };
      } catch (err) {
        logger.error("SMTP dispatch failure", { to, subject, error: err.message });
        return { success: false, mode: "SMTP_FAILED", error: err.message };
      }
    } else {
      // SMTP NOT CONFIGURED: Return truthful failure so Admin & API know the email wasn't delivered!
      const errorMsg = "SMTP credentials are not configured in backend/.env (missing SMTP_USER / SMTP_PASS). Email could not be sent to " + to;
      logger.warn(`[SMTP UNCONFIGURED] ${errorMsg}`);
      console.warn(`\n⚠️  [SMTP UNCONFIGURED] Cannot send email to ${to}.\n   Reason: ${errorMsg}\n   Add SMTP_USER and SMTP_PASS to backend/.env to enable real delivery.\n`);
      return {
        success: false,
        mode: "SMTP_NOT_CONFIGURED",
        error: errorMsg,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 1. BUSINESS DECISION EMAIL (Primary function for Manufacturer & partners)
  // ──────────────────────────────────────────────────────────────────────
  /**
   * Universal business decision email for Manufacturer, Distributor, Pharmacy.
   * Handles:
   *   - Object style: sendBusinessDecisionEmail({ toEmail, fullName, role, ... })
   *   - Positional style: sendBusinessDecisionEmail(appOrUser, "APPROVED", { reason, ... })
   */
  async sendBusinessDecisionEmail(firstArg, secondArg, thirdArg = {}) {
    let toEmail, fullName, role, status, organizationName, referenceId, rejectionReason, loginUrl;

    if (firstArg && typeof firstArg === "object" && (!secondArg || typeof secondArg !== "string")) {
      // Object style argument
      const opts = firstArg;
      toEmail          = opts.toEmail || opts.email || opts.contactEmail;
      fullName         = opts.fullName || opts.name || opts.applicantName;
      role             = opts.role || "Manufacturer";
      status           = (opts.status || opts.decision || "APPROVED").toUpperCase();
      organizationName = opts.organizationName || opts.companyName || opts.company || "";
      referenceId      = opts.referenceId || opts.applicationId || opts.companyCode || opts.licenseNumber || "";
      rejectionReason  = opts.rejectionReason || opts.reason || "";
      loginUrl         = opts.loginUrl;
    } else {
      // Positional style argument: (userOrApp, decision, options)
      const userOrApp = firstArg || {};
      status          = (secondArg || userOrApp.accountStatus || userOrApp.approvalStatus || userOrApp.status || "APPROVED").toUpperCase();
      const opts      = thirdArg || {};
      toEmail          = opts.toEmail || userOrApp.email || userOrApp.contactInformation?.email || userOrApp.contactEmail;
      fullName         = opts.fullName || userOrApp.fullName || userOrApp.name || userOrApp.applicantName;
      role             = opts.role || userOrApp.role || "Manufacturer";
      organizationName = opts.organizationName || userOrApp.companyName || userOrApp.company || userOrApp.pharmacyName || "";
      referenceId      = opts.referenceId || userOrApp.companyCode || userOrApp.licenseNumber || userOrApp._id?.toString() || "";
      rejectionReason  = opts.reason || opts.rejectionReason || userOrApp.rejectionReason || "";
      loginUrl         = opts.loginUrl;
    }

    // Safety: Do NOT send approval email for pending applications!
    if (status === "PENDING") {
      logger.warn(`Skipping email dispatch for PENDING application (${toEmail})`);
      return { success: false, mode: "SKIPPED", error: "Cannot send approval email for pending applications" };
    }

    const frontendUrl   = process.env.FRONTEND_URL || "http://localhost:5173";
    const resolvedLogin = loginUrl || `${frontendUrl}/login`;

    // ── CASE A: APPROVED ────────────────────────────────────────────────
    if (status === "APPROVED") {
      // Specific subject format for Manufacturer vs other roles
      const subject = role === "Manufacturer"
        ? `${APP_NAME} – Your Manufacturer Registration Has Been Approved`
        : `${APP_NAME} – Your ${role} Registration Has Been Approved`;

      const orgBlock = organizationName
        ? `<p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Manufacturer / Company:</strong> ${organizationName}</p>`
        : "";
      const refBlock = referenceId
        ? `<p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Reference / License:</strong> ${referenceId}</p>`
        : "";

      const html = this._htmlWrapper(`
        <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
          Dear ${fullName || "Manufacturer Partner"},
        </p>

        <div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:12px;padding:22px;margin-bottom:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">✅</div>
          <div style="font-size:19px;font-weight:800;color:#065F46;">Registration Approved</div>
          <div style="font-size:14px;color:#047857;margin-top:6px;line-height:1.5;">
            We are pleased to inform you that the <strong>${APP_NAME}</strong> Administration team has reviewed and officially <strong>approved</strong> your registration.
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;margin-bottom:12px;">Verified Application Details</div>
          <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Authorized Role:</strong> ${role}</p>
          ${orgBlock}
          ${refBlock}
          <p style="margin:0;font-size:14px;color:#475569;"><strong>Registered Email:</strong> ${toEmail}</p>
        </div>

        <div style="margin-bottom:24px;">
          <div style="font-size:14px;font-weight:700;color:#1E293B;margin-bottom:8px;">🚀 Instructions to Access Your Account</div>
          <ul style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:1.9;">
            <li>Visit the secure ${APP_NAME} portal at the link below.</li>
            <li>Sign in using your registered email (<strong>${toEmail}</strong>) and the password created during registration.</li>
            <li>Begin creating cryptographic drug batches, generating QR codes, and tracking authentic pharmaceutical inventory.</li>
          </ul>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${resolvedLogin}"
            style="background:${BRAND_COLOR};color:#ffffff;padding:14px 40px;text-decoration:none;
                   border-radius:10px;font-weight:700;font-size:15px;display:inline-block;
                   box-shadow:0 3px 14px rgba(79,70,229,0.35);">
            Sign In to ${APP_NAME} →
          </a>
        </div>

        <div style="border-top:1px solid #E2E8F0;padding-top:20px;margin-top:28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
          <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
            <strong>The ${APP_NAME} Administration Team</strong><br/>
            Security & Compliance Division<br/>
            <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a>
          </p>
        </div>
      `);

      const text =
        `Dear ${fullName || "Manufacturer Partner"},\n\n` +
        `We are pleased to inform you that your registration on ${APP_NAME} has been APPROVED by the Administration team.\n\n` +
        `Application Details:\n` +
        `- Role: ${role}\n` +
        (organizationName ? `- Organization: ${organizationName}\n` : "") +
        (referenceId ? `- Reference: ${referenceId}\n` : "") +
        `- Registered Email: ${toEmail}\n\n` +
        `Instructions:\n` +
        `1. Sign in to your account at: ${resolvedLogin}\n` +
        `2. Use your registered email (${toEmail}) and the password you set during registration.\n` +
        `3. Start creating drug batches and monitoring supply chain integrity.\n\n` +
        `Warm regards,\n` +
        `The ${APP_NAME} Administration Team\n` +
        `Support: ${SUPPORT_EMAIL}\n`;

      return this._dispatch({ to: toEmail, subject, text, html });
    }

    // ── CASE B: REJECTED ────────────────────────────────────────────────
    if (status === "REJECTED") {
      const subject = `${APP_NAME} – Registration Application Decision`;
      const reasonText = (rejectionReason && rejectionReason.trim())
        ? rejectionReason.trim()
        : "Submitted documentation or organization credentials could not be verified.";

      const html = this._htmlWrapper(`
        <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
          Dear ${fullName || "Applicant"},
        </p>

        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:22px;margin-bottom:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
          <div style="font-size:19px;font-weight:800;color:#991B1B;">Registration Not Approved</div>
          <div style="font-size:14px;color:#B91C1C;margin-top:6px;line-height:1.5;">
            Thank you for applying for a <strong>${role}</strong> account on ${APP_NAME}. After review, our administration team was unable to approve your application at this time.
          </div>
        </div>

        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#92400E;margin-bottom:8px;">Reason for Decision</div>
          <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6;">${reasonText}</p>
        </div>

        <div style="margin-bottom:24px;">
          <div style="font-size:14px;font-weight:700;color:#1E293B;margin-bottom:8px;">📋 How to Rectify and Re-Apply</div>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:1.9;">
            <li>Ensure uploaded government ID documents and manufacturing licenses are valid, unexpired, and clearly legible.</li>
            <li>Confirm that the organization name matches the official registration documents.</li>
            <li>Submit a new application or contact our compliance desk at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};">${SUPPORT_EMAIL}</a>.</li>
          </ol>
        </div>

        <div style="border-top:1px solid #E2E8F0;padding-top:20px;margin-top:28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
          <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
            <strong>The ${APP_NAME} Administration Team</strong><br/>
            Compliance & Verification Division<br/>
            <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a>
          </p>
        </div>
      `);

      const text =
        `Dear ${fullName || "Applicant"},\n\n` +
        `Your ${role} registration on ${APP_NAME} was reviewed and could not be approved at this time.\n\n` +
        `Reason for decision:\n${reasonText}\n\n` +
        `Next Steps:\n` +
        `Please ensure all submitted documents and business codes are current and legible before submitting a new application.\n\n` +
        `If you have questions, please reach out to ${SUPPORT_EMAIL}.\n\n` +
        `Warm regards,\n` +
        `The ${APP_NAME} Administration Team\n`;

      return this._dispatch({ to: toEmail, subject, text, html });
    }

    return { success: false, mode: "SKIPPED", error: `Unhandled decision status: ${status}` };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. EMAIL OTP DISPATCH (Registration, Two-Step Login, Password Reset)
  // ──────────────────────────────────────────────────────────────────────
  /**
   * Dispatches a 6-digit security OTP to the user's email address
   */
  async sendOtpEmail({ toEmail, otp, fullName, purpose = "LOGIN", role = "Manufacturer" }) {
    const isLogin = purpose === "LOGIN";
    const isPasswordReset = purpose === "PASSWORD_RESET";
    const actionTitle = isLogin
      ? "Two-Step Login Verification"
      : isPasswordReset
      ? "Password Reset Verification"
      : `${role} Registration Email Verification`;

    const subject = isLogin
      ? `${APP_NAME} – Your Two-Step Login Verification Code: ${otp}`
      : isPasswordReset
      ? `${APP_NAME} – Your Password Reset Code: ${otp}`
      : `${APP_NAME} – Verify Your ${role} Registration: ${otp}`;

    const introText = isLogin
      ? `A login attempt was initiated for your <strong>${role}</strong> portal account. Use the six-digit verification code below to authorize your session:`
      : isPasswordReset
      ? `A password reset request was initiated for your account. Use the six-digit code below to set a new password:`
      : `Thank you for registering your organization as a certified <strong>${role}</strong> on ${APP_NAME}. Please confirm your email address with the verification code below:`;

    const html = this._htmlWrapper(`
      <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
        Dear ${fullName || "Valued Partner"},
      </p>

      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        ${introText}
      </p>

      <!-- OTP Card -->
      <div style="background:linear-gradient(135deg,#F0F9FF,#E0F2FE);border:1px solid #BAE6FD;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#0369A1;margin-bottom:10px;">
          ${actionTitle}
        </div>
        <div style="font-size:36px;font-weight:900;letter-spacing:0.25em;color:#0284C7;font-family:monospace;background:#ffffff;display:inline-block;padding:12px 28px;border-radius:12px;border:1px solid #7DD3FC;box-shadow:0 2px 8px rgba(2,132,199,0.1);">
          ${otp}
        </div>
        <div style="font-size:12px;font-weight:600;color:#0C4A6E;margin-top:12px;">
          ⏱️ Valid for <strong>5 minutes</strong> · Single-use only
        </div>
      </div>

      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:800;color:#92400E;margin-bottom:4px;">🛡️ Security Notice</div>
        <p style="margin:0;font-size:12px;color:#78350F;line-height:1.5;">
          Never share this code with anyone. MediChainAI administrators will never ask for your verification code. If you did not initiate this request, please contact our security team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};">${SUPPORT_EMAIL}</a>.
        </p>
      </div>

      <div style="border-top:1px solid #E2E8F0;padding-top:20px;margin-top:28px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
        <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
          <strong>The ${APP_NAME} Security Team</strong><br/>
          Identity & Access Management Division<br/>
          <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    `);

    const text =
      `Dear ${fullName || "Valued Partner"},\n\n` +
      `${introText.replace(/<[^>]*>/g, "")}\n\n` +
      `Your 6-Digit Verification Code:\n` +
      `>> ${otp} <<\n\n` +
      `This code is valid for 5 minutes and can only be used once.\n` +
      `If you did not initiate this request, please contact ${SUPPORT_EMAIL} immediately.\n\n` +
      `Warm regards,\n` +
      `The ${APP_NAME} Security Team\n`;

    return this._dispatch({ to: toEmail, subject, text, html });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. MEDICINE LIFECYCLE EMAILS (Approval, Rejection, Submission)
  // ──────────────────────────────────────────────────────────────────────
  /**
   * Sent to Manufacturer when a new medicine is registered (Awaiting Admin review)
   */
  async sendMedicineSubmissionPendingEmail({ toEmail, fullName, medicineName, batchNumber, manufacturingDate, expiryDate }) {
    const subject = `${APP_NAME} – Medicine Submission Received: ${medicineName} (Batch ${batchNumber}) [Pending Review]`;
    const html = this._htmlWrapper(`
      <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
        Dear ${fullName || "Manufacturer Partner"},
      </p>

      <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:22px;margin-bottom:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">⏳</div>
        <div style="font-size:18px;font-weight:800;color:#0369A1;">Medicine Submission Received</div>
        <div style="font-size:13px;color:#0284C7;margin-top:6px;line-height:1.5;">
          Your batch submission for <strong>${medicineName}</strong> (Batch: <code>${batchNumber}</code>) has been securely logged and is currently <strong>PENDING Admin Compliance Review</strong>.
        </div>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;margin-bottom:10px;">Submission Summary</div>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Medicine:</strong> ${medicineName}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Batch ID:</strong> ${batchNumber}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Manufacturing Date:</strong> ${manufacturingDate}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Expiry Date:</strong> ${expiryDate}</p>
        <p style="margin:0;font-size:13px;color:#475569;"><strong>Status:</strong> <span style="color:#0284C7;font-weight:700;">Pending Admin Approval</span></p>
      </div>

      <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0 0 20px;">
        ⚠️ <em>Note: This medicine batch will not be released for distribution or verified on the public portal until an Admin reviews and approves the submission.</em>
      </p>

      <div style="border-top:1px solid #E2E8F0;padding-top:16px;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">The ${APP_NAME} Regulatory Compliance Team</p>
      </div>
    `);

    const text = `Dear ${fullName || "Manufacturer Partner"},\n\n` +
      `Your medicine submission for ${medicineName} (Batch ${batchNumber}) has been received and is PENDING Admin approval.\n\n` +
      `Batch Details:\n- Medicine: ${medicineName}\n- Batch ID: ${batchNumber}\n- Expiry: ${expiryDate}\n- Status: Pending Approval\n\n` +
      `You will receive an official notification once reviewed by our compliance administrators.\n\n` +
      `The ${APP_NAME} Regulatory Team\n`;

    return this._dispatch({ to: toEmail, subject, text, html });
  }

  /**
   * Sent to Admin/Creator when a new medicine is registered and requires approval
   */
  async sendAdminNewMedicineNotificationEmail({ adminEmail, medicineName, batchNumber, manufacturerName, submittedAt }) {
    const subject = `[Action Required] ${APP_NAME} – New Medicine Awaiting Approval: ${medicineName} (Batch ${batchNumber})`;
    const html = this._htmlWrapper(`
      <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
        Administrator Compliance Alert,
      </p>

      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:22px;margin-bottom:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">📋</div>
        <div style="font-size:18px;font-weight:800;color:#92400E;">New Medicine Batch Requires Review</div>
        <div style="font-size:13px;color:#B45309;margin-top:6px;">
          A certified manufacturer has submitted a new drug batch for network verification.
        </div>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Manufacturer:</strong> ${manufacturerName}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Medicine:</strong> ${medicineName}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Batch ID:</strong> ${batchNumber}</p>
        <p style="margin:0;font-size:13px;color:#475569;"><strong>Submitted:</strong> ${submittedAt ? new Date(submittedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}</p>
      </div>

      <p style="font-size:13px;color:#475569;margin-bottom:20px;">
        Please sign in to the Admin Dashboard to inspect the chemical composition, expiry dates, and uploaded packaging images to make an approval decision.
      </p>
    `);

    const text = `Administrator Alert: A new medicine batch requires approval.\n\n` +
      `Manufacturer: ${manufacturerName}\nMedicine: ${medicineName}\nBatch: ${batchNumber}\n\n` +
      `Please log in to the Creator/Admin Dashboard to inspect and decide.\n`;

    return this._dispatch({ to: adminEmail, subject, text, html });
  }

  /**
   * Sent to Manufacturer when Admin approves the medicine
   */
  async sendMedicineApprovalEmail({ toEmail, fullName, medicineName, batchNumber, manufacturingDate, expiryDate, approvedBy, txHash, loginUrl }) {
    const subject = `✅ ${APP_NAME} – Medicine Batch Approved: ${medicineName} (Batch ${batchNumber})`;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resolvedUrl = loginUrl || `${frontendUrl}/login`;

    const html = this._htmlWrapper(`
      <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
        Dear ${fullName || "Manufacturer Partner"},
      </p>

      <div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:12px;padding:22px;margin-bottom:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">✅</div>
        <div style="font-size:19px;font-weight:800;color:#065F46;">Medicine Registration Approved!</div>
        <div style="font-size:14px;color:#047857;margin-top:6px;line-height:1.5;">
          Your medicine batch <strong>${medicineName}</strong> (Batch: <code>${batchNumber}</code>) has been approved by ${approvedBy || "the Administration"} and is now <strong>recorded on DrugChain</strong>.
        </div>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;margin-bottom:12px;">Verified Blockchain Record</div>
        <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Medicine:</strong> ${medicineName}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Batch Number:</strong> ${batchNumber}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Expiry Date:</strong> ${expiryDate}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Approved By:</strong> ${approvedBy || "Compliance Administrator"}</p>
        ${txHash ? `<p style="margin:0;font-size:13px;color:#0284C7;font-family:monospace;word-break:break-all;"><strong>Blockchain Tx:</strong> ${txHash}</p>` : ""}
      </div>

      <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:24px;">
        🚀 This batch is now available for supply-chain dispatch to your authorized distributors and will verify as authentic on the MediChainAI verification portal.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${resolvedUrl}" style="background:${BRAND_COLOR};color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">
          View in Manufacturer Portal →
        </a>
      </div>
    `);

    const text = `Dear ${fullName || "Manufacturer Partner"},\n\n` +
      `Great news! Your medicine ${medicineName} (Batch ${batchNumber}) has been APPROVED by ${approvedBy || "MediChainAI Admin"}.\n\n` +
      `Blockchain Status: Confirmed & Minted on DrugChain\n` +
      (txHash ? `TxHash: ${txHash}\n` : "") +
      `Expiry: ${expiryDate}\n\n` +
      `The batch is now active in the supply chain and will verify as authentic.\n\n` +
      `The ${APP_NAME} Team\n`;

    return this._dispatch({ to: toEmail, subject, text, html });
  }

  /**
   * Sent to Manufacturer when Admin rejects the medicine
   */
  async sendMedicineRejectionEmail({ toEmail, fullName, medicineName, batchNumber, rejectionReason, rejectedBy }) {
    const subject = `⚠️ ${APP_NAME} – Medicine Submission Rejected: ${medicineName} (Batch ${batchNumber})`;
    const reasonText = rejectionReason && rejectionReason.trim() ? rejectionReason.trim() : "Documentation or packaging inspection did not meet regulatory standards.";

    const html = this._htmlWrapper(`
      <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E293B;">
        Dear ${fullName || "Manufacturer Partner"},
      </p>

      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:22px;margin-bottom:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">✖</div>
        <div style="font-size:19px;font-weight:800;color:#991B1B;">Medicine Submission Rejected</div>
        <div style="font-size:14px;color:#B91C1C;margin-top:6px;line-height:1.5;">
          Your batch submission for <strong>${medicineName}</strong> (Batch: <code>${batchNumber}</code>) was rejected during compliance review.
        </div>
      </div>

      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#92400E;margin-bottom:8px;">Reason for Rejection</div>
        <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6;font-weight:600;">${reasonText}</p>
      </div>

      <p style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:20px;">
        This medicine batch will <strong>NOT</strong> be distributed across the network and will not verify as authentic. If you believe this decision was made in error or wish to provide corrected documentation, please contact compliance support at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};">${SUPPORT_EMAIL}</a>.
      </p>
    `);

    const text = `Dear ${fullName || "Manufacturer Partner"},\n\n` +
      `Your medicine submission for ${medicineName} (Batch ${batchNumber}) was REJECTED during compliance review.\n\n` +
      `Reason:\n${reasonText}\n\n` +
      `This batch will not be released for supply chain distribution.\n\n` +
      `Support: ${SUPPORT_EMAIL}\n` +
      `The ${APP_NAME} Compliance Division\n`;

    return this._dispatch({ to: toEmail, subject, text, html });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Backward-compatible aliases
  // ──────────────────────────────────────────────────────────────────────
  async sendApprovalNotificationEmail(opts) {
    return this.sendBusinessDecisionEmail({ ...opts, status: "APPROVED" });
  }

  async sendRejectionEmail(opts) {
    return this.sendBusinessDecisionEmail({ ...opts, status: "REJECTED" });
  }
}

export const emailService = new EmailService();
export const sendBusinessDecisionEmail = (a, b, c) => emailService.sendBusinessDecisionEmail(a, b, c);
export default emailService;
