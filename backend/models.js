import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ── USER SCHEMA ── */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    role: {
      type: String,
      enum: ["Creator", "Manufacturer", "Distributor", "Pharmacy", "Customer"],
      default: "Customer",
    },
    company: { type: String, default: "" },
    companyName: { type: String, default: "" },
    companyCode: { type: String, default: "" },
    walletAddress: { type: String, default: "" },
    
    // Protected Document File Paths (Stored in protected storage, accessible only by Creator)
    identityPhoto: { type: String, default: null },
    governmentId: { type: String, default: null },
    governmentIdType: { type: String, default: "Government Identity Document" },
    
    // Approval & Security Lifecycle
    accountStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
    },
    approvalStatus: { type: String, default: "PENDING" },
    submittedAt: { type: Date, default: Date.now },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    suspendedAt: { type: Date, default: null },
    
    // Temporary Password & First-Login Password Change Flow
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    temporaryPasswordCreatedAt: { type: Date, default: null },
    credentialEmailStatus: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    isEmailVerified: { type: Boolean, default: false },
    
    // Historical Resubmission Audit Trail
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
  { timestamps: true }
);

// Hash password prior to saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
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

// Safe JSON serialization
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

/* ── OTP VERIFICATION SCHEMA (10-minute auto-expiry) ── */
const OtpVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ── MEDICINE SCHEMA ── */
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

const AIVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["MATCHED", "MISMATCH", "PARTIAL_MATCH", "UNABLE", "NOT_DETECTED"],
      default: "MATCHED",
    },
    confidence: { type: Number, default: 94 },
    ocrExtracted: {
      medicineName: { type: String, default: "" },
      batchNumber: { type: String, default: "" },
      manufacturer: { type: String, default: "" },
      manufacturingDate: { type: String, default: "" },
      expiryDate: { type: String, default: "" },
    },
    reasons: [{ type: String }],
  },
  { _id: false }
);

const MedicineSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    manufacturer: { type: String, required: true },
    manufacturerName: { type: String, default: "" },
    company: { type: String, required: true },
    manufacturerCode: { type: String, default: "" },
    manufacturingDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    price: { type: String, required: true },
    quantity: { type: Number, default: 1000 },
    medicineImage: { type: String, default: null },
    governmentCertificate: { type: String, default: null },
    status: {
      type: String,
      enum: ["AUTHENTIC", "SUSPICIOUS", "UNABLE TO VERIFY"],
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
    aiVerification: { type: AIVerificationSchema, default: () => ({}) },
    blockchainTxHash: { type: String, required: true },
    blockchainStatus: { type: String, default: "Confirmed" },
    transferHistory: [TransferHistoryItemSchema],
    currentHolder: { type: String, default: "Manufacturer" },
  },
  { timestamps: true }
);

/* ── TRANSFER SCHEMA ── */
const TransferSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    medicineId: { type: String, required: true, index: true },
    medicineName: { type: String, required: true },
    batchId: { type: String, required: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    quantity: { type: String, required: true },
    timestamp: { type: String, required: true },
    blockchainStatus: {
      type: String,
      enum: ["Pending Confirmation", "Confirmed", "Forwarded to Pharmacy", "Received"],
      default: "Pending Confirmation",
    },
    confirmTxHash: { type: String, default: null },
    confirmedAt: { type: String, default: null },
    forwardTxHash: { type: String, default: null },
    forwardedAt: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
export const Medicine = mongoose.model("Medicine", MedicineSchema);
export const Transfer = mongoose.model("Transfer", TransferSchema);
export const OtpVerification = mongoose.model("OtpVerification", OtpVerificationSchema);
