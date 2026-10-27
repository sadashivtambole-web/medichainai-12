/**
 * Input Validators — Joi-based schemas for all API endpoints
 * Returns clean, consistent JSON error responses on failure.
 */

import Joi from "joi";
import { sendError } from "../middleware.js";

const emailStr = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();
const passwordStr = Joi.string().min(6).max(128);
const idStr = Joi.string().trim().max(100);

/* ── SCHEMA DEFINITIONS ── */

export const schemas = {
  sendOtp: Joi.object({
    email: emailStr.required(),
    fullName: Joi.string().trim().max(100),
  }),

  verifyOtp: Joi.object({
    email: emailStr.required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),

  verifyLoginOtp: Joi.object({
    email: emailStr.required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    loginSessionToken: Joi.string().allow("").optional(),
  }),

  verifyRegistrationOtp: Joi.object({
    email: emailStr.required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    registrationId: Joi.string().allow("").optional(),
  }),

  resendOtp: Joi.object({
    email: emailStr.required(),
    purpose: Joi.string().valid("LOGIN", "REGISTRATION", "PASSWORD_RESET").default("LOGIN"),
    loginSessionToken: Joi.string().allow("").optional(),
    registrationId: Joi.string().allow("").optional(),
  }),

  register: Joi.object({
    name: Joi.string().trim().max(100),
    fullName: Joi.string().trim().max(100),
    email: emailStr.required(),
    password: passwordStr.required(),
    confirmPassword: Joi.string(),
    role: Joi.string()
      .valid("Manufacturer", "Distributor", "Pharmacy", "Customer",
             "manufacturer", "distributor", "pharmacy", "customer")
      .default("Customer"),
    company: Joi.string().trim().max(200).allow(""),
    companyName: Joi.string().trim().max(200).allow(""),
    companyCode: Joi.string().trim().max(100).allow(""),
    phone: Joi.string().trim().max(20).allow(""),
    walletAddress: Joi.string().trim().max(200).allow(""),
    identityPhotoBase64: Joi.string().allow(""),
    governmentIdType: Joi.string().trim().max(100).allow(""),
  }).unknown(true), // allow multer file fields

  login: Joi.object({
    email: emailStr.required(),
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    newPassword: passwordStr.required(),
    confirmPassword: Joi.string().required(),
  }),

  rejectUser: Joi.object({
    reason: Joi.string().trim().max(500).allow(""),
  }),

  forwardTransfer: Joi.object({
    destinationPharmacy: Joi.string().trim().max(200).allow(""),
  }),

  registerMedicine: Joi.object({
    manufacturerName: Joi.string().trim().max(200).allow(""),
    companyName: Joi.string().trim().max(200).allow(""),
    company: Joi.string().trim().max(200).allow(""),
    manufacturer: Joi.string().trim().max(200).allow(""),
    manufacturerCode: Joi.string().trim().max(100).allow(""),
    medicineName: Joi.string().trim().max(200).allow(""),
    name: Joi.string().trim().max(200).allow(""),
    batchNumber: Joi.string().trim().max(100).allow(""),
    batchId: Joi.string().trim().max(100).allow(""),
    manufacturingDate: Joi.string().required(),
    expiryDate: Joi.string().required(),
    price: Joi.string().trim().max(50).allow(""),
    quantity: Joi.number().integer().min(1).max(10000000).optional(),
    composition: Joi.string().trim().max(1000).allow(""),
    medicineImage: Joi.string().allow("").optional(),
    governmentCertificate: Joi.string().allow("").optional(),
  }).unknown(true), // allow multer file fields

  rejectMedicine: Joi.object({
    rejectionReason: Joi.string().trim().min(3).max(1000).required(),
  }),

  qrGenerate: Joi.object({
    medicineId: idStr.allow(""),
    batchId: idStr.allow(""),
  }),

  aiVerification: Joi.object({
    medicineName: Joi.string().trim().max(200).allow(""),
    batchNumber: Joi.string().trim().max(100).allow(""),
    companyName: Joi.string().trim().max(200).allow(""),
  }).unknown(true),
};

/* ── VALIDATE MIDDLEWARE FACTORY ── */

/**
 * Returns an Express middleware that validates req.body against a Joi schema.
 * On failure it sends a clean 400 JSON response.
 * @param {Joi.Schema} schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message.replace(/['"]/g, ""),
      }));
      return sendError(res, "Validation failed. Check the errors field.", "VALIDATION_ERROR", 400, errors);
    }

    // Attach cleaned value — don't overwrite multer files
    req.validatedBody = value;
    next();
  };
}
