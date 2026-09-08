import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const service = process.env.SMTP_SERVICE;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (user && pass) {
      if (service && service.toLowerCase() === "gmail") {
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user, pass },
        });
      } else if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      } else {
        // Default to standard Gmail SMTP if host not specified
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user, pass },
        });
      }
      console.log(`📡 Email Service configured for real-time dispatch via: ${user}`);
    } else {
      console.log("ℹ️ Email Service running in local simulated mode (No SMTP credentials in .env)");
    }
  }

  /**
   * Send Account Approval Email with Temporary Password
   * @param {Object} params
   * @param {string} params.toEmail
   * @param {string} params.fullName
   * @param {string} params.role
   * @param {string} params.temporaryPassword
   */
  async sendApprovalEmail({ toEmail, fullName, role, temporaryPassword }) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
    const loginUrl = `${frontendUrl}/login`;
    const fromAddress = process.env.SMTP_FROM || '"Fake Drug Detection Administration" <noreply@drugchain.network>';

    const subject = "Fake Drug Detection — Account Approved";
    const textContent = `Hello ${fullName},

Your ${role} account has been approved.

You can now access the Fake Drug Detection platform.

Login Email:
${toEmail}

Temporary Password:
${temporaryPassword}

Login:
${loginUrl}

For security, you will be required to change this temporary password when you first log in.

If you did not submit this registration, please contact the system administrator.

Regards,

Fake Drug Detection
System Administration`;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e8eaf6; border-radius: 12px; overflow: hidden; color: #18182e;">
      <div style="background: #5855f3; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">Fake Drug Detection Platform</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Secure Pharmaceutical Supply Chain</p>
      </div>
      <div style="padding: 32px 28px;">
        <p style="font-size: 16px; margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 14px; color: #5f607a; line-height: 1.6;">
          Your <strong>${role}</strong> account has been reviewed and <span style="color: #10b981; font-weight: bold;">APPROVED</span> by the Creator / Super Admin.
        </p>
        
        <div style="background: #f8f9fd; border: 1px solid #e8eaf6; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #8c8ca1; letter-spacing: 0.05em; margin-bottom: 4px;">Login Email</div>
          <div style="font-size: 14px; font-weight: 700; color: #18182e; margin-bottom: 16px;">${toEmail}</div>

          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #8c8ca1; letter-spacing: 0.05em; margin-bottom: 4px;">Temporary Password</div>
          <div style="font-size: 16px; font-family: monospace; font-weight: 800; color: #5855f3; background: #ffffff; padding: 10px 14px; border: 1px dashed #5855f3; border-radius: 6px; display: inline-block;">${temporaryPassword}</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: #5855f3; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Login to Platform</a>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; font-size: 12px; color: #92400e; line-height: 1.5;">
          <strong>Security Notice:</strong> You will be required to change this temporary password immediately upon your first login.
        </div>

        <p style="font-size: 12px; color: #8c8ca1; margin-top: 30px; line-height: 1.5;">
          If you did not submit this registration, please contact the system administrator immediately.<br/><br/>
          Regards,<br/>
          <strong>Fake Drug Detection System Administration</strong>
        </p>
      </div>
    </div>`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });
        return { success: true, mode: "SMTP_DELIVERED" };
      } catch (err) {
        console.error("⚠️ SMTP dispatch failure:", err.message);
        return { success: false, error: err.message };
      }
    } else {
      // In development when SMTP credentials are not configured, simulate delivery safely
      console.log(`\n📧 [EMAIL DISPATCHED TO ${toEmail}] Subject: "${subject}" (Simulated Dev Mode)`);
      return { success: true, mode: "DEV_SIMULATION" };
    }
  }

  /**
   * Send Live 6-Digit Email OTP Verification Code
   * @param {Object} params
   * @param {string} params.toEmail
   * @param {string} params.otp
   * @param {string} [params.fullName]
   */
  async sendOtpEmail({ toEmail, otp, fullName = "Valued User" }) {
    const fromAddress = process.env.SMTP_FROM || '"Fake Drug Detection Security" <verify@drugchain.network>';
    const subject = `Fake Drug Detection — Your Verification OTP Code: ${otp}`;

    const textContent = `Hello ${fullName},

Your verification OTP code for the Fake Drug Detection platform is:

${otp}

This code is valid for 10 minutes. Please enter it in the registration form to verify your email address.

If you did not request this verification code, please disregard this email.

Regards,
Fake Drug Detection Security Team`;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e8eaf6; border-radius: 12px; overflow: hidden; color: #18182e;">
      <div style="background: linear-gradient(135deg, #5855f3, #4743eb); padding: 22px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.02em;">Fake Drug Detection Platform</h2>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Secure Supply-Chain Email Verification</p>
      </div>
      <div style="padding: 28px 24px; text-align: center;">
        <p style="font-size: 15px; margin-top: 0; color: #18182e;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 13px; color: #5f607a; line-height: 1.5; margin-bottom: 24px;">
          Please use the following 6-digit One-Time Password (OTP) to complete your account registration:
        </p>

        <div style="background: #f8f9fd; border: 2px dashed #5855f3; border-radius: 10px; padding: 18px; display: inline-block; margin-bottom: 24px;">
          <div style="font-size: 32px; font-family: monospace; font-weight: 900; letter-spacing: 8px; color: #5855f3; margin-left: 8px;">
            ${otp}
          </div>
        </div>

        <div style="font-size: 12px; color: #8c8ca1; line-height: 1.5;">
          ⏱️ This code will expire in <strong>10 minutes</strong>.<br />
          If you did not initiate this request, you can safely ignore this message.
        </div>

        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f3fc; font-size: 11px; color: #a1a1b5;">
          Secure Pharmaceutical Traceability System &bull; DrugChain Network
        </div>
      </div>
    </div>`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });
        return { success: true, mode: "SMTP_DELIVERED" };
      } catch (err) {
        console.error("⚠️ SMTP OTP dispatch failure:", err.message);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`\n🔑 [LIVE EMAIL OTP DISPATCHED] To: ${toEmail} | OTP Code: [ ${otp} ] (Valid 10 mins)`);
      return { success: true, mode: "DEV_SIMULATION", otp };
    }
  }
}

export const emailService = new EmailService();
