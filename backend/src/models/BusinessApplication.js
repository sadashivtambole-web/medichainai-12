import mongoose from "mongoose";

const BusinessApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Manufacturer", "Distributor", "Pharmacy"],
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    companyCode: {
      type: String,
      trim: true,
      default: "",
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: String,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    emailNotificationStatus: {
      type: String,
      enum: ["NOT_SENT", "PENDING", "SENT", "FAILED"],
      default: "NOT_SENT",
      index: true,
    },
    emailNotificationSentAt: {
      type: Date,
      default: null,
    },
    emailNotificationError: {
      type: String,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const BusinessApplication =
  mongoose.models.BusinessApplication ||
  mongoose.model("BusinessApplication", BusinessApplicationSchema);

export default BusinessApplication;
