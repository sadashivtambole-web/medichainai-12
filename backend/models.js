import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ══════════════════════════════════════════════════════════════════════
   1. USER AUTHENTICATION & CORE IDENTITY COLLECTION
   Stores ONLY authentication credentials and system status.
   Business profile data is separated into role-specific collections.
══════════════════════════════════════════════════════════════════════ */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Creator", "Manufacturer", "Distributor", "Pharmacy", "Customer"],
      default: "Customer",
      index: true,
    },
    
    // Approval & Security Lifecycle
    accountStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
      index: true,
    },
    approvalStatus: { type: String, default: "PENDING" },
    submittedAt: { type: Date, default: Date.now },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    suspendedAt: { type: Date, default: null },
    
    // Password Lifecycle
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    temporaryPasswordCreatedAt: { type: Date, default: null },
    credentialEmailStatus: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    // Approval / Rejection notification email tracking
    emailNotificationStatus: {
      type: String,
      enum: ["NOT_SENT", "SENT", "FAILED"],
      default: "NOT_SENT",
      index: true,
    },
    emailNotificationSentAt: { type: Date, default: null },
    emailNotificationError:  { type: String, default: null },
    isEmailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Hash password prior to saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    // If password is already hashed with bcrypt ($2a$, $2b$, or $2y$), skip re-hashing
    if (/^\$2[aby]\$\d+\$/.test(this.password)) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password helper method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization — strips password and optionally merges profile data
UserSchema.methods.toSafeObject = function (profile = null) {
  const obj = this.toObject();
  delete obj.password;

  if (profile) {
    const pObj = typeof profile.toObject === "function" ? profile.toObject() : profile;
    delete pObj.password;
    delete pObj._id;
    delete pObj.__v;
    delete pObj.userId;
    return {
      ...obj,
      ...pObj,
      company: pObj.companyName || pObj.pharmacyName || obj.company || "",
      companyName: pObj.companyName || pObj.pharmacyName || obj.companyName || "",
      companyCode: pObj.companyCode || pObj.licenseNumber || obj.companyCode || "",
      phone: pObj.phone || obj.phone || "",
      identityPhoto: pObj.identityPhoto || obj.identityPhoto || null,
      governmentId: pObj.governmentId || obj.governmentId || null,
      governmentIdType: pObj.governmentIdType || obj.governmentIdType || "Government Identity Document",
      walletAddress: pObj.walletAddress || obj.walletAddress || "",
    };
  }

  return obj;
};

/* ══════════════════════════════════════════════════════════════════════
   2. ROLE-SPECIFIC PROFILE COLLECTIONS (DATA ISOLATION)
   Manufacturer, Distributor, Pharmacy, and Customer business data
   are stored in dedicated collections, linked via userId.
══════════════════════════════════════════════════════════════════════ */

// 2.1 Manufacturer Profile
const ManufacturerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true, default: "" },
    companyCode: { type: String, trim: true, default: "" },
    licenseNumber: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    contactInformation: {
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },
    walletAddress: { type: String, default: "" },
    identityPhoto: { type: String, default: null },
    governmentId: { type: String, default: null },
    governmentIdType: { type: String, default: "Drug Manufacturing License" },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
      index: true,
    },
    resubmissionHistory: [
      {
        submittedAt: { type: Date, default: Date.now },
        identityPhoto: { type: String },
        governmentId: { type: String },
        company: { type: String },
        rejectionReason: { type: String },
      },
    ],
  },
  { timestamps: true, collection: "manufacturerProfiles" }
);

// 2.2 Distributor Profile
const DistributorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true },
    companyCode: { type: String, trim: true, default: "" },
    licenseNumber: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    contactInformation: {
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },
    walletAddress: { type: String, default: "" },
    identityPhoto: { type: String, default: null },
    governmentId: { type: String, default: null },
    governmentIdType: { type: String, default: "Wholesale Drug License" },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
      index: true,
    },
    resubmissionHistory: [
      {
        submittedAt: { type: Date, default: Date.now },
        identityPhoto: { type: String },
        governmentId: { type: String },
        company: { type: String },
        rejectionReason: { type: String },
      },
    ],
  },
  { timestamps: true, collection: "distributorProfiles" }
);

// 2.3 Pharmacy Profile
const PharmacyProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    pharmacyName: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    companyCode: { type: String, trim: true, default: "" },
    licenseNumber: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    contactInformation: {
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },
    walletAddress: { type: String, default: "" },
    identityPhoto: { type: String, default: null },
    governmentId: { type: String, default: null },
    governmentIdType: { type: String, default: "Retail Pharmacy License" },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
      index: true,
    },
    resubmissionHistory: [
      {
        submittedAt: { type: Date, default: Date.now },
        identityPhoto: { type: String },
        governmentId: { type: String },
        company: { type: String },
        rejectionReason: { type: String },
      },
    ],
  },
  { timestamps: true, collection: "pharmacyProfiles" }
);

// 2.4 Customer Profile
const CustomerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    fullName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    preferences: { type: Object, default: () => ({}) },
  },
  { timestamps: true, collection: "customerProfiles" }
);

/* ══════════════════════════════════════════════════════════════════════
   3. MEDICINE COLLECTION
   Completely separated from user credentials.
   References manufacturerId, currentOwnerId, and DrugChain proof.
══════════════════════════════════════════════════════════════════════ */
const TransferHistoryItemSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    role: { type: String, required: true },
    actor: { type: String, required: true },
    timestamp: { type: String, required: true },
    status: { type: String, required: true },
    txHash: { type: String, default: null },
  },
  { _id: false }
);

const VerificationLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    role: { type: String, default: "Customer" },
    result: { type: String, default: "AUTHENTIC" },
    clientIp: { type: String, default: "127.0.0.1" },
  },
  { _id: false }
);

const MedicineSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    medicineName: { type: String, trim: true },
    
    // Ownership & Manufacturer References
    manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    manufacturer: { type: String, required: true },
    manufacturerName: { type: String, default: "" },
    company: { type: String, required: true },
    manufacturerCode: { type: String, default: "" },
    
    // Dates & Pricing
    manufacturingDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    price: { type: String, required: true },
    quantity: { type: Number, default: 1000 },
    composition: { type: String, trim: true, default: "" },
    medicineImage: { type: String, default: null },
    governmentCertificate: { type: String, default: null },

    // Admin Approval Lifecycle
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    
    // Custody State & Role
    currentOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    currentOwnerRole: {
      type: String,
      enum: ["Manufacturer", "Distributor", "Pharmacy", "Customer"],
      default: "Manufacturer",
    },
    currentHolder: { type: String, default: "Manufacturer" },
    
    // Verification & Tamper Status
    status: {
      type: String,
      enum: ["AUTHENTIC", "SUSPICIOUS", "UNABLE TO VERIFY", "EXPIRED", "RECALLED"],
      default: "AUTHENTIC",
    },
    medicineDataHash: { type: String, default: "" },
    verificationCount: { type: Number, default: 0 },
    verificationLogs: [VerificationLogSchema],
    anomalyStatus: {
      type: String,
      enum: ["NORMAL", "ANOMALY_DETECTED"],
      default: "NORMAL",
    },
    anomalyFlags: [{ type: String }],
    qrReuseRisk: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    
    // Immutable Blockchain Proof Reference
    blockchainTxHash: { type: String, default: "" },
    blockchainStatus: { type: String, default: "Pending Approval" },
    transferHistory: [TransferHistoryItemSchema],
  },
  { timestamps: true, collection: "medicines" }
);

/* ══════════════════════════════════════════════════════════════════════
   4. SUPPLY CHAIN TRANSACTIONS COLLECTION
   Stores all custody transfers, receipts, and transit events.
══════════════════════════════════════════════════════════════════════ */
const SupplyChainTransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true }, // TR-xxxxxx
    transferId: { type: String, index: true },
    medicineId: { type: String, required: true, index: true },
    medicineName: { type: String, required: true },
    batchId: { type: String, required: true, index: true },
    
    // Sender
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fromRole: { type: String, default: "Manufacturer" },
    from: { type: String, required: true },
    
    // Receiver
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    toRole: { type: String, default: "Distributor" },
    to: { type: String, required: true },
    
    quantity: { type: String, required: true },
    timestamp: { type: String, required: true },
    
    // Custody State Lifecycle
    action: {
      type: String,
      enum: ["REGISTERED", "TRANSFERRED", "FORWARDED", "RECEIVED", "CONFIRMED"],
      default: "TRANSFERRED",
    },
    status: {
      type: String,
      enum: ["Pending Confirmation", "Confirmed", "Forwarded to Pharmacy", "Received", "Stocked"],
      default: "Pending Confirmation",
    },
    blockchainStatus: {
      type: String,
      enum: ["Pending Confirmation", "Confirmed", "Forwarded to Pharmacy", "Received"],
      default: "Pending Confirmation",
    },
    confirmTxHash: { type: String, default: null },
    confirmedAt: { type: String, default: null },
    forwardTxHash: { type: String, default: null },
    forwardedAt: { type: String, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true, collection: "supplyChainTransactions" }
);

/* ══════════════════════════════════════════════════════════════════════
   5. VERIFICATIONS COLLECTION
   Dedicated collection for customer, POS, and public verification logs.
══════════════════════════════════════════════════════════════════════ */
const VerificationSchema = new mongoose.Schema(
  {
    medicineId: { type: String, index: true },
    batchId: { type: String, index: true },
    verifiedBy: { type: String, default: "Public / Customer" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verificationType: {
      type: String,
      enum: ["QR_SCAN", "TOKEN_VERIFY", "BATCH_LOOKUP", "AI_VISUAL", "MANUAL"],
      default: "QR_SCAN",
    },
    result: {
      type: String,
      enum: ["AUTHENTIC", "REVIEW", "SUSPICIOUS", "LIKELY COUNTERFEIT", "EXPIRED"],
      default: "AUTHENTIC",
    },
    authenticityScore: { type: Number, default: 100 },
    reasons: [{ type: String }],
    warnings: [{ type: String }],
    layers: { type: Object, default: () => ({}) },
    clientIp: { type: String, default: "127.0.0.1" },
    metadata: { type: Object, default: () => ({}) },
  },
  { timestamps: true, collection: "verifications" }
);

/* ══════════════════════════════════════════════════════════════════════
   6. AI & OCR ANALYSIS AUDIT LOG COLLECTION
   Stores multimodal inspection signals separately.
══════════════════════════════════════════════════════════════════════ */
const AiAnalysisSchema = new mongoose.Schema(
  {
    medicineId: { type: String, index: true, default: "" },
    batchNumber: { type: String, index: true, default: "" },
    verificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Verification", default: null },
    imageReference: { type: String, default: null },
    status: { type: String, default: "UNKNOWN" },
    riskLevel: { type: String, default: "LOW" },
    modelProvider: { type: String, default: "Gemini Multimodal Vision" },
    extractedData: { type: Object, default: () => ({}) },
    comparison: { type: Object, default: () => ({}) },
    findings: [{ type: String }],
    warnings: [{ type: String }],
    confidence: { type: Number, default: null },
    confidenceAvailable: { type: Boolean, default: false },
    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "aiAnalyses" }
);

/* ══════════════════════════════════════════════════════════════════════
   7. BLOCKCHAIN TRANSACTIONS COLLECTION
   Maintains on-chain transaction hashes, block indices, and audit state.
══════════════════════════════════════════════════════════════════════ */
const BlockchainTransactionSchema = new mongoose.Schema(
  {
    medicineId: { type: String, index: true },
    batchId: { type: String, index: true },
    transactionType: {
      type: String,
      enum: ["MEDICINE_REGISTRATION", "CUSTODY_TRANSFER", "RECEIPT_CONFIRMATION", "VERIFICATION_EVENT"],
      default: "MEDICINE_REGISTRATION",
    },
    blockIndex: { type: Number, required: true },
    transactionHash: { type: String, required: true, index: true },
    dataHash: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    validationStatus: { type: String, default: "VALID" },
  },
  { timestamps: true, collection: "blockchainTransactions" }
);

/* ══════════════════════════════════════════════════════════════════════
   8. AUDIT LOGS COLLECTION
   System security, authorization events, and business action audit trails.
══════════════════════════════════════════════════════════════════════ */
const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: null },
    role: { type: String, default: "Public" },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String, default: null },
    ipAddress: { type: String, default: "127.0.0.1" },
    result: {
      type: String,
      enum: ["SUCCESS", "FAILED", "BLOCKED", "FORBIDDEN"],
      default: "SUCCESS",
    },
    details: { type: Object, default: () => ({}) },
  },
  { timestamps: true, collection: "auditLogs" }
);

/* ══════════════════════════════════════════════════════════════════════
   9. NOTIFICATIONS COLLECTION
   User-targeted notifications (e.g. Account approved, Transfer received)
══════════════════════════════════════════════════════════════════════ */
const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["APPROVAL", "TRANSFER", "WARNING", "SYSTEM", "SECURITY"],
      default: "SYSTEM",
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "notifications" }
);

/* ══════════════════════════════════════════════════════════════════════
   10. OTP VERIFICATION SCHEMA (10-minute auto-expiry)
══════════════════════════════════════════════════════════════════════ */
const OtpVerificationSchema = new mongoose.Schema(
  {
    registrationId: { type: String, default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["REGISTRATION", "LOGIN", "PASSWORD_RESET"],
      default: "REGISTRATION",
      index: true,
    },
    role: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    lastResentAt: { type: Date, default: Date.now },
    loginAttemptId: { type: String, default: null, index: true },
    tempRegistrationData: { type: Object, default: null },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "otpverifications" }
);

/* ══════════════════════════════════════════════════════════════════════
   11. SECURITY ALERTS COLLECTION — ADMIN-ONLY RISK SIGNALS
   Stores automated risk flags generated during manufacturer registration
   and medicine submission. NEVER exposed to the submitting party.
   Only accessible by Creator role.
══════════════════════════════════════════════════════════════════════ */
const SecurityAlertSchema = new mongoose.Schema(
  {
    // Source context
    sourceType: {
      type: String,
      enum: ["MANUFACTURER_REGISTRATION", "MEDICINE_REGISTRATION", "MEDICINE_RESUBMISSION"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "REVIEWED", "DISMISSED", "ESCALATED"],
      default: "OPEN",
      index: true,
    },

    // Who triggered it
    submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    submittedByEmail: { type: String, default: "" },
    submittedByName: { type: String, default: "" },
    submittedByRole: { type: String, default: "" },

    // What was submitted
    relatedResourceType: { type: String, default: "" },   // "User", "Medicine"
    relatedResourceId: { type: String, default: "" },

    // Alert details
    title: { type: String, required: true },
    description: { type: String, default: "" },
    riskFlags: [{ type: String }],   // Individual risk signals detected
    riskScore: { type: Number, default: 0, min: 0, max: 100 },

    // Admin review trail
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true, collection: "securityAlerts" }
);

/* ══════════════════════════════════════════════════════════════════════
   12. SUPPLY CHAIN LINK COLLECTION
   Persistent approved relationships between Manufacturers↔Distributors
   and Distributors↔Pharmacies. Required for proper supply-chain access.
══════════════════════════════════════════════════════════════════════ */
const SupplyChainLinkSchema = new mongoose.Schema(
  {
    // Link type identifies the stage
    linkType: {
      type: String,
      enum: ["MANUFACTURER_DISTRIBUTOR", "DISTRIBUTOR_PHARMACY"],
      required: true,
      index: true,
    },

    // "From" party (Manufacturer for MFR-DIST, Distributor for DIST-PHARM)
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fromCompanyName: { type: String, trim: true, default: "" },
    fromRole: { type: String, trim: true, default: "" },

    // "To" party (Distributor for MFR-DIST, Pharmacy for DIST-PHARM)
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toCompanyName: { type: String, trim: true, default: "" },
    toRole: { type: String, trim: true, default: "" },

    // Relationship lifecycle
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED", // Auto-approved on creation (Creator already vetted both parties)
      index: true,
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },

    // Notes / metadata
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "supplyChainLinks",
  }
);

// Compound index to prevent duplicate links
SupplyChainLinkSchema.index({ linkType: 1, fromUserId: 1, toUserId: 1 }, { unique: true });

// ── Models Export ──
export const User = mongoose.model("User", UserSchema);
export const ManufacturerProfile = mongoose.model("ManufacturerProfile", ManufacturerProfileSchema);
export const DistributorProfile = mongoose.model("DistributorProfile", DistributorProfileSchema);
export const PharmacyProfile = mongoose.model("PharmacyProfile", PharmacyProfileSchema);
export const CustomerProfile = mongoose.model("CustomerProfile", CustomerProfileSchema);
export const Medicine = mongoose.model("Medicine", MedicineSchema);
export const SupplyChainTransaction = mongoose.model("SupplyChainTransaction", SupplyChainTransactionSchema);
export const Transfer = SupplyChainTransaction; // Backward compatibility alias
export const Verification = mongoose.model("Verification", VerificationSchema);
export const AiAnalysis = mongoose.model("AiAnalysis", AiAnalysisSchema);
export const AiAnalysisLog = AiAnalysis; // Backward compatibility alias
export const BlockchainTransaction = mongoose.model("BlockchainTransaction", BlockchainTransactionSchema);
export const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export const Notification = mongoose.model("Notification", NotificationSchema);
export const OtpVerification = mongoose.model("OtpVerification", OtpVerificationSchema);
export const SecurityAlert = mongoose.model("SecurityAlert", SecurityAlertSchema);
export const SupplyChainLink = mongoose.model("SupplyChainLink", SupplyChainLinkSchema);

