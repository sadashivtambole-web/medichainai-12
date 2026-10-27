import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models.js";
import { BusinessApplication } from "./src/models/BusinessApplication.js";
import { emailService } from "./services/emailService.js";
import { createOrUpdateProfile, getProfileForUser } from "./services/profileService.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fake_drug_detection";

async function runTests() {
  console.log("===============================================================");
  console.log("MEDICHAINAI: MANUFACTURER APPROVAL EMAIL WORKFLOW AUDIT TEST");
  console.log("===============================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB:", MONGO_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  const ts = Date.now();
  const mfrEmail = `test_mfr_${ts}@sunpharma.com`;
  const adminEmail = (process.env.CREATOR_EMAIL || "creator@drugchain.network").toLowerCase();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unconfigured SMTP truthfully reports failure (Does NOT report success)
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Testing unconfigured SMTP behavior...");
    // Force transporter to null to simulate missing SMTP credentials
    const realTransporter = emailService.transporter;
    emailService.transporter = null;

    const unconfiguredResult = await emailService.sendBusinessDecisionEmail({
      toEmail: mfrEmail,
      fullName: "Dr. Arvind Gupta",
      role: "Manufacturer",
      status: "APPROVED",
      organizationName: "Sun Pharma Ltd",
      referenceId: "LIC-MFR-9988",
    });

    assert(
      unconfiguredResult.success === false && unconfiguredResult.mode === "SMTP_NOT_CONFIGURED",
      "Unconfigured SMTP truthfully returns success=false and mode=SMTP_NOT_CONFIGURED",
      JSON.stringify(unconfiguredResult)
    );

    // -------------------------------------------------------------------------
    // TEST 2: Active Test Transport sends email with required subject & recipient
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Testing mock/test email transport dispatch...");
    // Enable test transport
    process.env.USE_TEST_EMAIL = "true";
    emailService._initTransporter();

    let capturedMail = null;
    if (emailService.transporter) {
      // Intercept sendMail to verify content
      const originalSendMail = emailService.transporter.sendMail.bind(emailService.transporter);
      emailService.transporter.sendMail = async (mailOptions) => {
        capturedMail = mailOptions;
        return originalSendMail(mailOptions);
      };
    }

    const testSendResult = await emailService.sendBusinessDecisionEmail({
      toEmail: mfrEmail,
      fullName: "Dr. Arvind Gupta",
      role: "Manufacturer",
      status: "APPROVED",
      organizationName: "Sun Pharma Ltd",
      referenceId: "LIC-MFR-9988",
    });

    assert(testSendResult.success === true, "Test email dispatch succeeds");
    assert(capturedMail !== null, "sendMail was invoked with message payload");
    assert(
      capturedMail?.to === mfrEmail,
      "Recipient is Manufacturer's email (NOT Admin email)",
      `Expected ${mfrEmail}, got ${capturedMail?.to}`
    );
    assert(
      capturedMail?.to !== adminEmail,
      "Recipient is NOT Admin email"
    );
    assert(
      capturedMail?.subject === "MediChainAI – Your Manufacturer Registration Has Been Approved",
      "Subject matches exact required format: 'MediChainAI – Your Manufacturer Registration Has Been Approved'",
      `Got subject: ${capturedMail?.subject}`
    );
    assert(
      capturedMail?.text?.includes("Dr. Arvind Gupta") &&
      capturedMail?.text?.includes("Sun Pharma Ltd") &&
      capturedMail?.text?.includes("LIC-MFR-9988") &&
      capturedMail?.text?.includes("/login"),
      "Plain-text email contains greeting, company, reference ID, and login link"
    );
    assert(
      capturedMail?.html?.includes("Dr. Arvind Gupta") &&
      capturedMail?.html?.includes("Sun Pharma Ltd") &&
      capturedMail?.html?.includes("MediChainAI"),
      "HTML email contains styled greeting, company, and branding"
    );

    // -------------------------------------------------------------------------
    // TEST 3: Do NOT send approval email for pending applications
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Verifying pending application guard...");
    const pendingResult = await emailService.sendBusinessDecisionEmail({
      toEmail: mfrEmail,
      fullName: "Dr. Arvind Gupta",
      role: "Manufacturer",
      status: "PENDING",
    });
    assert(
      pendingResult.success === false && pendingResult.mode === "SKIPPED",
      "Pending application email is blocked/skipped"
    );

    // -------------------------------------------------------------------------
    // TEST 4: Rejection email contains reason and required subject
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Verifying rejection email dispatch...");
    const rejectResult = await emailService.sendBusinessDecisionEmail({
      toEmail: mfrEmail,
      fullName: "Dr. Arvind Gupta",
      role: "Manufacturer",
      status: "REJECTED",
      rejectionReason: "Manufacturing license image was unreadable.",
    });
    assert(rejectResult.success === true, "Rejection email dispatch succeeds");
    assert(
      capturedMail?.html?.includes("Manufacturing license image was unreadable"),
      "Rejection email contains the Admin's specified rejection reason"
    );

    // -------------------------------------------------------------------------
    // TEST 5: BusinessApplication Model and Controller Integration
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Testing BusinessApplication approval controller workflow...");
    // Create candidate user
    const candidateUser = await User.create({
      name: `Mfr Rep ${ts}`,
      fullName: `Dr. Arvind Gupta ${ts}`,
      email: mfrEmail,
      password: "HashedPassword123!",
      role: "Manufacturer",
      company: "Sun Pharma Ltd",
      companyCode: `LIC-${ts}`,
      accountStatus: "PENDING",
      approvalStatus: "PENDING",
      phone: "+919876543210",
      emailNotificationStatus: "NOT_SENT",
    });

    const appRecord = await BusinessApplication.create({
      userId: candidateUser._id,
      applicantName: candidateUser.fullName,
      email: candidateUser.email,
      role: "Manufacturer",
      companyName: candidateUser.company,
      companyCode: candidateUser.companyCode,
      licenseNumber: candidateUser.companyCode,
      status: "PENDING",
      emailNotificationStatus: "NOT_SENT",
    });

    assert(appRecord._id !== undefined, "BusinessApplication created in MongoDB");

    // Dynamically test approval via controller
    const { approveApplication } = await import("./src/controllers/businessApplicationController.js");

    let responseStatus = null;
    let responseJson = null;

    const mockReq = {
      params: { id: appRecord._id.toString() },
      user: { _id: new mongoose.Types.ObjectId(), email: adminEmail, role: "Creator" },
    };
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseJson = data;
            return data;
          },
        };
      },
    };

    await approveApplication(mockReq, mockRes);

    assert(responseStatus === 200, "Approval controller returned HTTP 200");
    assert(responseJson?.success === true, "Approval response indicates success");
    assert(responseJson?.data?.status === "APPROVED", "Returned status is APPROVED");
    assert(responseJson?.data?.emailNotification?.status === "SENT", "emailNotification.status is SENT");

    // Check MongoDB persistence
    const updatedApp = await BusinessApplication.findById(appRecord._id);
    const updatedUser = await User.findById(candidateUser._id);

    assert(updatedApp.status === "APPROVED", "BusinessApplication status in MongoDB is APPROVED");
    assert(updatedApp.emailNotificationStatus === "SENT", "BusinessApplication emailNotificationStatus in MongoDB is SENT");
    assert(updatedApp.approvedBy === adminEmail, "approvedBy recorded in MongoDB");
    assert(updatedUser.accountStatus === "APPROVED", "User accountStatus in MongoDB is APPROVED");
    assert(updatedUser.emailNotificationStatus === "SENT", "User emailNotificationStatus in MongoDB is SENT");

    // -------------------------------------------------------------------------
    // TEST 6: Duplicate approval protection
    // -------------------------------------------------------------------------
    console.log("\n[Test 6] Verifying duplicate approval email guard...");
    let secondCapturedMail = null;
    emailService.transporter.sendMail = async (opts) => {
      secondCapturedMail = opts;
      return { messageId: "dup-test-id" };
    };

    await approveApplication(mockReq, mockRes);
    assert(
      secondCapturedMail === null,
      "Second approval call does NOT send a duplicate email"
    );
    assert(
      responseJson?.data?.emailNotification?.skipped === true,
      "Response indicates duplicate notification was skipped"
    );

    // -------------------------------------------------------------------------
    // TEST 7: Unauthorized user cannot approve
    // -------------------------------------------------------------------------
    console.log("\n[Test 7] Verifying unauthorized rejection...");
    const unauthorizedReq = {
      params: { id: appRecord._id.toString() },
      user: { _id: new mongoose.Types.ObjectId(), email: "hacker@evil.com", role: "Customer" },
    };
    await approveApplication(unauthorizedReq, mockRes);
    assert(responseStatus === 403, "Unauthorized role (Customer) is blocked with HTTP 403");

    // Cleanup candidate test records
    await BusinessApplication.deleteOne({ _id: appRecord._id });
    await User.deleteOne({ _id: candidateUser._id });

    // Restore original state
    delete process.env.USE_TEST_EMAIL;
    emailService.transporter = realTransporter;

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log("\n===============================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log("===============================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
