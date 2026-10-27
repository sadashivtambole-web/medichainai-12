import { User } from "../../models.js";
import { BusinessApplication } from "../models/BusinessApplication.js";
import { emailService } from "../../services/emailService.js";
import { createOrUpdateProfile, getProfileForUser } from "../../services/profileService.js";
import { logger } from "../../utils/logger.js";

/**
 * 1. Approve Manufacturer / Partner Application
 * Follows the 8 required steps strictly:
 * 1. Verify Admin authentication & authorization
 * 2. Retrieve application from MongoDB by ID
 * 3. Verify eligibility
 * 4. Update status in MongoDB
 * 5. Retrieve Manufacturer's registered email (never Admin email)
 * 6. Send approval email via sendBusinessDecisionEmail
 * 7. Record email status (SENT vs FAILED)
 * 8. Return truthful response
 */
export async function approveApplication(req, res) {
  try {
    const applicationId = req.params.id || req.params.applicationId || req.params.userId;

    // Step 1: Verify Admin is authenticated and authorized
    if (!req.user || !["Creator", "Admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only Administrators / Creators can approve applications",
        code: "FORBIDDEN",
      });
    }

    // Step 2: Retrieve the application from MongoDB
    let application = await BusinessApplication.findById(applicationId).catch(() => null);
    let user = null;

    if (application) {
      if (application.userId) {
        user = await User.findById(application.userId);
      } else {
        user = await User.findOne({ email: application.email });
      }
    } else {
      // Check if ID refers directly to User collection
      user = await User.findById(applicationId);
      if (user) {
        application = await BusinessApplication.findOne({ userId: user._id });
        if (!application) {
          // Auto-materialize application record if missing
          const profile = await getProfileForUser(user).catch(() => null);
          application = await BusinessApplication.create({
            userId: user._id,
            applicantName: user.fullName || user.name,
            email: user.email,
            role: user.role,
            companyName: profile?.companyName || profile?.pharmacyName || user.company || "",
            companyCode: profile?.companyCode || profile?.licenseNumber || user.companyCode || "",
            licenseNumber: profile?.licenseNumber || "",
            phone: user.phone || profile?.phone || "",
            status: user.accountStatus || "PENDING",
            submittedAt: user.createdAt,
          });
        }
      }
    }

    if (!application && !user) {
      return res.status(404).json({
        success: false,
        message: `Application with ID ${applicationId} not found`,
        code: "APPLICATION_NOT_FOUND",
      });
    }

    // Step 3: Verify eligibility
    const currentStatus = application ? application.status : user.accountStatus;
    const wasAlreadyApproved = currentStatus === "APPROVED";

    // Step 4: Update application's approval status in MongoDB
    const now = new Date();
    const adminEmail = req.user.email;

    if (application) {
      application.status = "APPROVED";
      application.approvedBy = adminEmail;
      application.approvedAt = now;
      application.rejectionReason = "";
      application.rejectedBy = null;
      application.rejectedAt = null;
    }

    if (user) {
      user.accountStatus = "APPROVED";
      user.approvalStatus = "APPROVED";
      user.approvedBy = adminEmail;
      user.approvedAt = now;
      user.rejectionReason = "";
      user.rejectedBy = null;
      user.rejectedAt = null;
      await user.save();
      await createOrUpdateProfile(user, { approvalStatus: "APPROVED" }).catch(() => null);
    }

    // Step 5: Retrieve Manufacturer's registered email address (Never ADMIN_EMAIL!)
    const targetEmail = (application?.email || user?.email || user?.contactInformation?.email || "").toLowerCase().trim();
    if (!targetEmail || targetEmail === adminEmail) {
      logger.warn("Target recipient email matches Admin email or is missing", { targetEmail, adminEmail });
    }

    const recipientName = application?.applicantName || user?.fullName || user?.name || "Manufacturer";
    const roleName = application?.role || user?.role || "Manufacturer";
    const companyName = application?.companyName || user?.company || user?.companyName || "";
    const refCode = application?.companyCode || application?.licenseNumber || user?.companyCode || application?._id?.toString() || "";

    // Step 6: Call email service to send approval email
    let emailResult = { success: false, mode: "SKIPPED", reason: "Already approved" };
    if (!wasAlreadyApproved) {
      try {
        emailResult = await emailService.sendBusinessDecisionEmail({
          toEmail: targetEmail,
          fullName: recipientName,
          role: roleName,
          status: "APPROVED",
          organizationName: companyName,
          referenceId: refCode,
        });
      } catch (sendErr) {
        emailResult = {
          success: false,
          mode: "SMTP_FAILED",
          error: sendErr.message,
        };
      }

      // Step 7: Record whether email was sent successfully or failed
      const notifStatus = emailResult.success ? "SENT" : "FAILED";
      const notifErr = emailResult.success ? null : (emailResult.error || "SMTP error");

      if (application) {
        application.emailNotificationStatus = notifStatus;
        application.emailNotificationSentAt = emailResult.success ? now : null;
        application.emailNotificationError = notifErr;
        await application.save();
      }

      if (user) {
        user.emailNotificationStatus = notifStatus;
        user.emailNotificationSentAt = emailResult.success ? now : null;
        user.emailNotificationError = notifErr;
        await user.save().catch(() => null);
      }
    }

    // Step 8: Return a truthful response to frontend
    return res.status(200).json({
      success: true,
      message: wasAlreadyApproved
        ? `Application was already approved. No duplicate notification sent.`
        : emailResult.success
        ? `Application approved successfully and confirmation email sent to ${targetEmail}.`
        : `Application approved in database, but confirmation email could not be sent (${emailResult.error || "SMTP error"}). Use Resend to retry.`,
      data: {
        application: application || user,
        status: "APPROVED",
        emailNotification: {
          status: emailResult.success ? "SENT" : "FAILED",
          mode: emailResult.mode,
          recipient: targetEmail,
          error: emailResult.error || null,
          skipped: wasAlreadyApproved,
        },
      },
    });
  } catch (err) {
    logger.error("Error approving business application", { error: err.message });
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to approve application",
      code: "APPROVE_FAILED",
    });
  }
}

/**
 * 2. Reject Manufacturer / Partner Application with Reason
 */
export async function rejectApplication(req, res) {
  try {
    const applicationId = req.params.id || req.params.applicationId || req.params.userId;
    const { reason } = req.body;

    if (!req.user || !["Creator", "Admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only Administrators / Creators can reject applications",
        code: "FORBIDDEN",
      });
    }

    let application = await BusinessApplication.findById(applicationId).catch(() => null);
    let user = null;

    if (application) {
      if (application.userId) user = await User.findById(application.userId);
    } else {
      user = await User.findById(applicationId);
      if (user) {
        application = await BusinessApplication.findOne({ userId: user._id });
      }
    }

    if (!application && !user) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
        code: "NOT_FOUND",
      });
    }

    const rejectionReason = (reason && reason.trim())
      ? reason.trim()
      : "Submitted identity documents or organization credentials could not be verified.";

    const now = new Date();
    const adminEmail = req.user.email;

    if (application) {
      application.status = "REJECTED";
      application.rejectionReason = rejectionReason;
      application.rejectedBy = adminEmail;
      application.rejectedAt = now;
    }

    if (user) {
      user.accountStatus = "REJECTED";
      user.approvalStatus = "REJECTED";
      user.rejectionReason = rejectionReason;
      user.rejectedBy = adminEmail;
      user.rejectedAt = now;
      await user.save();
      await createOrUpdateProfile(user, { approvalStatus: "REJECTED" }).catch(() => null);
    }

    const targetEmail = (application?.email || user?.email || "").toLowerCase().trim();
    const recipientName = application?.applicantName || user?.fullName || user?.name || "Applicant";
    const roleName = application?.role || user?.role || "Manufacturer";

    let emailResult = { success: false, mode: "UNKNOWN" };
    try {
      emailResult = await emailService.sendBusinessDecisionEmail({
        toEmail: targetEmail,
        fullName: recipientName,
        role: roleName,
        status: "REJECTED",
        rejectionReason,
      });
    } catch (sendErr) {
      emailResult = { success: false, mode: "SMTP_FAILED", error: sendErr.message };
    }

    const notifStatus = emailResult.success ? "SENT" : "FAILED";
    const notifErr = emailResult.success ? null : (emailResult.error || "SMTP error");

    if (application) {
      application.emailNotificationStatus = notifStatus;
      application.emailNotificationSentAt = emailResult.success ? now : null;
      application.emailNotificationError = notifErr;
      await application.save();
    }

    if (user) {
      user.emailNotificationStatus = notifStatus;
      user.emailNotificationSentAt = emailResult.success ? now : null;
      user.emailNotificationError = notifErr;
      await user.save().catch(() => null);
    }

    return res.status(200).json({
      success: true,
      message: emailResult.success
        ? `Application rejected and notification email sent to ${targetEmail}.`
        : `Application rejected in database, but notification email failed to deliver (${emailResult.error || "SMTP error"}).`,
      data: {
        application: application || user,
        status: "REJECTED",
        emailNotification: {
          status: emailResult.success ? "SENT" : "FAILED",
          mode: emailResult.mode,
          recipient: targetEmail,
          error: emailResult.error || null,
        },
      },
    });
  } catch (err) {
    logger.error("Error rejecting business application", { error: err.message });
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to reject application",
      code: "REJECT_FAILED",
    });
  }
}

/**
 * 3. Resend Notification Email (Admin retry action)
 */
export async function resendApplicationEmail(req, res) {
  try {
    const applicationId = req.params.id || req.params.applicationId || req.params.userId;

    if (!req.user || !["Creator", "Admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        code: "FORBIDDEN",
      });
    }

    let application = await BusinessApplication.findById(applicationId).catch(() => null);
    let user = null;

    if (application) {
      if (application.userId) user = await User.findById(application.userId);
    } else {
      user = await User.findById(applicationId);
      if (user) {
        application = await BusinessApplication.findOne({ userId: user._id });
      }
    }

    if (!application && !user) {
      return res.status(404).json({ success: false, message: "Application not found", code: "NOT_FOUND" });
    }

    const currentStatus = application?.status || user?.accountStatus;
    if (!["APPROVED", "REJECTED"].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Cannot resend email for pending applications.",
        code: "INVALID_STATUS",
      });
    }

    const targetEmail = (application?.email || user?.email || "").toLowerCase().trim();
    const recipientName = application?.applicantName || user?.fullName || user?.name || "User";
    const roleName = application?.role || user?.role || "Manufacturer";
    const companyName = application?.companyName || user?.company || "";
    const refCode = application?.companyCode || user?.companyCode || "";
    const reason = application?.rejectionReason || user?.rejectionReason || "";

    const emailResult = await emailService.sendBusinessDecisionEmail({
      toEmail: targetEmail,
      fullName: recipientName,
      role: roleName,
      status: currentStatus,
      organizationName: companyName,
      referenceId: refCode,
      rejectionReason: reason,
    });

    const notifStatus = emailResult.success ? "SENT" : "FAILED";
    const notifErr = emailResult.success ? null : (emailResult.error || "SMTP error");

    if (application) {
      application.emailNotificationStatus = notifStatus;
      application.emailNotificationSentAt = emailResult.success ? new Date() : application.emailNotificationSentAt;
      application.emailNotificationError = notifErr;
      await application.save();
    }

    if (user) {
      user.emailNotificationStatus = notifStatus;
      user.emailNotificationSentAt = emailResult.success ? new Date() : user.emailNotificationSentAt;
      user.emailNotificationError = notifErr;
      await user.save().catch(() => null);
    }

    if (emailResult.success) {
      return res.status(200).json({
        success: true,
        message: `Notification email resent successfully to ${targetEmail}.`,
        data: { emailNotificationStatus: "SENT", mode: emailResult.mode },
      });
    } else {
      return res.status(502).json({
        success: false,
        message: `Email delivery failed: ${emailResult.error || "SMTP error"}`,
        code: "EMAIL_DELIVERY_FAILED",
      });
    }
  } catch (err) {
    logger.error("Error resending application email", { error: err.message });
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to resend email",
      code: "RESEND_FAILED",
    });
  }
}

/**
 * 4. List Business Applications
 */
export async function getApplications(req, res) {
  try {
    const { status, role } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (role) filter.role = role;

    const apps = await BusinessApplication.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: apps,
      count: apps.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, code: "FETCH_FAILED" });
  }
}
