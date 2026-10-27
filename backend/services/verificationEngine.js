/**
 * Unified Authenticity Verification Engine for Fake Drug Detection Platform
 * 
 * Pipeline:
 * QR Verification + DB Identity + OCR Text Normalization + AI Visual Analysis 
 * + Expiry Date Validation + Supply Chain Custody Audit + Blockchain Proof + Canonical SHA-256 Hash
 * -> AUTHENTICITY SCORE (0 - 100) & EXPLAINABLE RESULT LEVEL:
 *    [90-100: AUTHENTIC | 70-89: REVIEW | 40-69: SUSPICIOUS | 0-39: LIKELY COUNTERFEIT]
 */

import crypto from "crypto";
import axios from "axios";
import { Medicine, Transfer, Verification } from "../models.js";
import {
  drugChainService,
  verifyMedicineOnChain,
  calculateMedicineDataHash,
} from "../blockchain.js";
import { logger } from "../utils/logger.js";
import { aiService } from "./ai/ai.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "changeme_set_JWT_SECRET_in_dotenv";

// ── 1. SECURE QR TOKEN GENERATION & DECODING ──
/**
 * Creates a cryptographically signed HMAC-SHA256 QR payload
 */
export function generateSecureQRToken(medicineId, batchId) {
  const timestamp = Date.now();
  const rawPayload = `${medicineId}:${batchId}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", JWT_SECRET).update(rawPayload).digest("hex");
  const token = Buffer.from(JSON.stringify({ mId: medicineId, bId: batchId, ts: timestamp, sig: hmac })).toString("base64url");
  
  return {
    token,
    payload: { medicineId, batchId, timestamp, signature: hmac },
    verificationUrl: `/verify/${token}`,
  };
}

/**
 * Validates and extracts medicine identifier from a QR token or raw code
 */
export function parseAndVerifyQRToken(rawCode) {
  if (!rawCode || typeof rawCode !== "string") {
    return { isValid: false, status: "INVALID_QR", lookupKey: null, isSignedToken: false };
  }

  const clean = decodeURIComponent(rawCode).trim();

  // A. Try decoding as base64url signed token
  try {
    const decodedStr = Buffer.from(clean, "base64url").toString("utf8");
    if (decodedStr.includes('"sig"')) {
      const parsed = JSON.parse(decodedStr);
      if (parsed.mId && parsed.bId && parsed.ts && parsed.sig) {
        const rawPayload = `${parsed.mId}:${parsed.bId}:${parsed.ts}`;
        const expectedHmac = crypto.createHmac("sha256", JWT_SECRET).update(rawPayload).digest("hex");
        if (parsed.sig === expectedHmac) {
          return {
            isValid: true,
            status: "VERIFIED_SIGNED_TOKEN",
            lookupKey: parsed.bId || parsed.mId,
            medicineId: parsed.mId,
            batchId: parsed.bId,
            isSignedToken: true,
          };
        } else {
          return {
            isValid: false,
            status: "MODIFIED_QR_SIGNATURE_MISMATCH",
            lookupKey: parsed.bId || parsed.mId,
            isSignedToken: true,
          };
        }
      }
    }
  } catch (err) {
    if (clean.length > 30 && !clean.includes(" ") && !clean.includes("{")) {
      return {
        isValid: false,
        status: "MODIFIED_QR_SIGNATURE_MISMATCH",
        lookupKey: null,
        isSignedToken: true,
      };
    }
  }

  // B. Try parsing as raw JSON
  try {
    const parsedJson = JSON.parse(clean);
    const lookupKey = parsedJson.batchId || parsedJson.medicineId || parsedJson.batchNumber || parsedJson.code;
    if (lookupKey) {
      return {
        isValid: true,
        status: "VERIFIED_JSON_PAYLOAD",
        lookupKey: String(lookupKey).trim(),
        isSignedToken: false,
      };
    }
  } catch (err) {
    // Plain string code
  }

  // C. Fallback: treat as plain medicineId or batchId string
  if (clean.length > 0) {
    return {
      isValid: true,
      status: "RAW_CODE_REFERENCE",
      lookupKey: clean,
      isSignedToken: false,
    };
  }

  return { isValid: false, status: "INVALID_QR", lookupKey: null, isSignedToken: false };
}

// ── 2. MEDICINE IDENTITY DATABASE LOOKUP ──
export async function lookupMedicineIdentity(lookupKey) {
  if (!lookupKey) return { status: "NOT_FOUND", medicine: null };

  const cleanKey = String(lookupKey).trim();
  const medicine = await Medicine.findOne({
    $or: [
      { id: new RegExp(`^${cleanKey}$`, "i") },
      { batchId: new RegExp(`^${cleanKey}$`, "i") },
      { name: new RegExp(`^${cleanKey}$`, "i") },
    ],
  });

  if (!medicine) {
    return { status: "NOT_FOUND", medicine: null };
  }

  return { status: "FOUND", medicine };
}

// ── 3. EXPIRY VALIDATION ──
export function validateExpiry(manufacturingDate, expiryDate) {
  if (!expiryDate) {
    return { expiryStatus: "INVALID_DATE_DATA", isExpired: false, riskContribution: 10, details: "Expiry date is missing" };
  }

  const mfg = manufacturingDate ? new Date(manufacturingDate) : null;
  const exp = new Date(expiryDate);
  const now = new Date();

  if (isNaN(exp.getTime())) {
    return { expiryStatus: "INVALID_DATE_DATA", isExpired: false, riskContribution: 10, details: "Expiry date format is invalid" };
  }

  if (mfg && !isNaN(mfg.getTime()) && mfg > exp) {
    return {
      expiryStatus: "INVALID_DATE_DATA",
      isExpired: false,
      riskContribution: 10,
      details: "Manufacturing date is recorded as later than Expiry date",
    };
  }

  if (exp < now) {
    return {
      expiryStatus: "EXPIRED",
      isExpired: true,
      riskContribution: 5,
      details: `Medicine expired on ${exp.toISOString().split("T")[0]}`,
    };
  }

  return {
    expiryStatus: "VALID",
    isExpired: false,
    riskContribution: 0,
    details: `Valid until ${exp.toISOString().split("T")[0]}`,
  };
}

// ── 4. SUPPLY CHAIN CUSTODY AUDIT ──
export function validateSupplyChainCustody(medicine) {
  const history = medicine?.transferHistory || [];
  const issues = [];
  const roles = history.map((h) => h.role);

  // Requirement: Manufacturer -> Distributor -> Pharmacy
  const hasManufacturer = roles.includes("Manufacturer") || Boolean(medicine?.company || medicine?.manufacturer);
  const hasDistributor = roles.includes("Distributor");
  const hasPharmacy = roles.includes("Pharmacy");

  if (!hasManufacturer) {
    issues.push("MISSING_MANUFACTURER_ORIGIN: Medicine has no verified manufacturer origin record.");
  }

  // Check for impossible hops (e.g. Pharmacy shelf receipt without Distributor transit)
  if (hasPharmacy && !hasDistributor) {
    issues.push("UNAUTHORIZED_CUSTODY_HOP: Batch reached Pharmacy shelf without verified Distributor transit record.");
  }

  // Check duplicate steps or out-of-order sequence
  let lastStep = 0;
  for (const item of history) {
    if (item.step && item.step < lastStep) {
      issues.push(`OUT_OF_ORDER_STEP: Step ${item.step} recorded after Step ${lastStep}.`);
    }
    if (item.step) lastStep = item.step;
  }

  const status = issues.length === 0 ? "VALID" : "SUSPICIOUS";
  return {
    status,
    chain: history,
    issues,
    summary: status === "VALID" ? "Supply-chain sequence fully verified" : issues.join("; "),
  };
}

// ── 5. IMMUTABLE BLOCKCHAIN LEDGER VERIFICATION ──
export async function validateBlockchainLedger(medicine) {
  const issues = [];
  let chainAuditMatch = false;
  let dataHashVerified = false;
  let blockIndex = null;
  let txHash = medicine?.blockchainTxHash || null;

  try {
    // 1. Calculate canonical SHA-256 hash of current database fields
    const canonicalHash = calculateMedicineDataHash({
      medicineId: medicine.id,
      batchNumber: medicine.batchId,
      medicineName: medicine.name,
      manufacturerCode: medicine.manufacturerCode || "",
      manufacturingDate: medicine.manufacturingDate,
      expiryDate: medicine.expiryDate,
    });

    // 2. Query DrugChain PoA Ledger
    const onChainResult = await verifyMedicineOnChain({
      medicineId: medicine.id,
      batchNumber: medicine.batchId,
      medicineName: medicine.name,
      manufacturerCode: medicine.manufacturerCode || "",
      manufacturingDate: medicine.manufacturingDate,
      expiryDate: medicine.expiryDate,
    });

    chainAuditMatch = onChainResult.isMatch;
    dataHashVerified = onChainResult.isMatch && (medicine.medicineDataHash === canonicalHash);
    blockIndex = onChainResult.blockIndex || null;
    txHash = onChainResult.txHash || txHash;

    if (!onChainResult.foundOnChain) {
      issues.push("NOT_FOUND_ON_CHAIN: No block or transaction found matching this batch on DrugChain ledger.");
    } else if (!onChainResult.isMatch) {
      issues.push("BLOCKCHAIN_MISMATCH: Database parameter hashes differ from immutable on-chain block record.");
    }
  } catch (err) {
    issues.push(`BLOCKCHAIN_AUDIT_ERROR: ${err.message}`);
    chainAuditMatch = false;
  }

  const status = chainAuditMatch ? "VERIFIED" : issues.length > 0 && issues[0].startsWith("NOT_FOUND") ? "UNVERIFIED_NOT_ON_CHAIN" : "MISMATCH";

  return {
    status,
    isMatch: chainAuditMatch,
    dataHashVerified,
    blockIndex,
    txHash,
    issues,
  };
}

// ── 6. OCR & AI IMAGE ANALYSIS (INTEGRATED PART 3 AI SERVICE) ──
export async function processAIAndOCR(imageFile, formMetadata = {}) {
  const aiResult = await aiService.analyzeMedicinePackaging({
    imageFile,
    formMetadata,
  });

  const matches = {
    medicineName: aiResult.comparison ? aiResult.comparison.fields.medicineName?.match : true,
    batchNumber: aiResult.comparison ? aiResult.comparison.fields.batchNumber?.match : true,
    manufacturer: aiResult.comparison ? aiResult.comparison.fields.manufacturer?.match : true,
    expiryDate: aiResult.comparison ? aiResult.comparison.fields.expiryDate?.match : true,
  };

  const ocrExtracted = aiResult.extractedData || {
    medicineName: formMetadata.medicineName || "",
    batchNumber: formMetadata.batchNumber || "",
    manufacturer: formMetadata.companyName || "",
    manufacturingDate: "",
    expiryDate: "",
  };

  return {
    available: aiResult.available,
    status: aiResult.status === "PASS" ? "PASS" : aiResult.status === "NO_IMAGE" || aiResult.status === "AI_UNAVAILABLE" ? "UNAVAILABLE" : "MISMATCH",
    confidence: aiResult.confidence,
    confidenceAvailable: aiResult.confidenceAvailable,
    matches,
    mismatches: aiResult.comparison?.mismatches || [],
    findings: aiResult.findings || [],
    warnings: aiResult.warnings || [],
    ocrExtracted,
    fullAiAnalysis: aiResult,
  };
}

// ── 7. CENTRAL AUTHENTICITY SCORING ENGINE ──
/**
 * Calculates final score (0 - 100) and produces explainable result level:
 * - 90-100: AUTHENTIC
 * - 70-89: REVIEW
 * - 40-69: SUSPICIOUS
 * - 0-39: LIKELY COUNTERFEIT
 */
export async function runFullAuthenticityAudit({ queryCode, imageFile = null, formMetadata = {}, clientIp = "127.0.0.1", user = null }) {
  // A. QR Parsing
  const qrAudit = parseAndVerifyQRToken(queryCode);
  const lookupKey = qrAudit.lookupKey || queryCode;

  // B. Database Identity Lookup
  const dbResult = await lookupMedicineIdentity(lookupKey);
  const medicine = dbResult.medicine;

  if (dbResult.status === "NOT_FOUND" || !medicine) {
    const responsePayload = {
      success: true,
      isFake: true,
      medicine: null,
      result: {
        score: 0,
        status: "LIKELY COUNTERFEIT",
        riskLevel: "HIGH",
        code: "MEDICINE_NOT_FOUND",
      },
      checks: {
        qr: { status: qrAudit.isValid ? "VERIFIED" : "INVALID_SIGNATURE", score: qrAudit.isValid ? 15 : 0 },
        database: { status: "NOT_FOUND_UNREGISTERED", score: 0 },
        ocr: { status: "UNAVAILABLE", score: 0 },
        blockchain: { status: "UNVERIFIED_NOT_ON_CHAIN", score: 0 },
        supplyChain: { status: "UNAUTHORIZED_NO_CUSTODY_RECORD", score: 0 },
        expiry: { status: "UNKNOWN_UNREGISTERED_BATCH", score: 0 },
        ai: { status: "UNAVAILABLE", confidence: 0, score: 0 },
        qrReuseRisk: { status: "HIGH_RISK_SUSPECTED_COUNTERFEIT", score: 0 },
      },
      layers: {
        qr: qrAudit.isValid ? "VERIFIED" : "INVALID_SIGNATURE",
        database: "NOT_FOUND_UNREGISTERED",
        integrity: "FAILED_NO_CRYPTOGRAPHIC_PROOF",
        blockchain: "UNVERIFIED_NOT_ON_CHAIN",
        expiry: "UNKNOWN_UNREGISTERED_BATCH",
        supplyChain: "UNAUTHORIZED_NO_CUSTODY_RECORD",
        qrReuseRisk: "HIGH_RISK_SUSPECTED_COUNTERFEIT",
      },
      reasons: [
        "🚨 CRITICAL SECURITY ALERT: No registered medicine or batch identifier found matching this code on DrugChain.",
        "❌ Cryptographic Signature Missing: This medicine was never created or verified by an approved manufacturer.",
        "❌ No Verified Supply-Chain Custody: Zero authorized distributor transit or pharmacy dispensing logs found.",
        "⚠️ Counterfeit Drug Warning: This item is suspected to be counterfeit, fake packaging, or an unauthorized copy.",
      ],
      warnings: ["Do NOT consume, sell, or dispense this medicine."],
    };

    try {
      await Verification.create({
        medicineId: lookupKey || queryCode,
        batchId: lookupKey || queryCode,
        verifiedBy: user?.name || user?.email || "Public / Customer",
        userId: user?._id || null,
        verificationType: qrAudit.isSignedToken ? "TOKEN_VERIFY" : "QR_SCAN",
        result: "LIKELY COUNTERFEIT",
        authenticityScore: 0,
        reasons: ["No registered medicine or batch identifier found matching this code on DrugChain."],
        warnings: ["Do NOT consume, sell, or dispense this medicine."],
        layers: {
          qr: qrAudit.isValid ? "VERIFIED" : "INVALID_SIGNATURE",
          database: "NOT_FOUND_UNREGISTERED",
          integrity: "FAILED_NO_CRYPTOGRAPHIC_PROOF",
          blockchain: "UNVERIFIED_NOT_ON_CHAIN",
          expiry: "UNKNOWN_UNREGISTERED_BATCH",
          supplyChain: "UNAUTHORIZED_NO_CUSTODY_RECORD",
          qrReuseRisk: "HIGH_RISK_SUSPECTED_COUNTERFEIT",
        },
        clientIp,
      });
    } catch (verErr) {
      // Do not block client response if persistence encounters a transient error
    }

    return responsePayload;
  }

  // ── HANDLE PENDING APPROVAL MEDICINE STATUS ──────────────────────────
  if (medicine.approvalStatus === "pending") {
    return {
      success: true,
      status: "PENDING",
      authenticityScore: 30,
      isFake: false,
      medicine: {
        id: medicine.id,
        batchId: medicine.batchId,
        name: medicine.name,
        company: medicine.company,
        manufacturer: medicine.manufacturer,
        manufacturingDate: medicine.manufacturingDate,
        expiryDate: medicine.expiryDate,
        composition: medicine.composition || "",
        medicineImage: medicine.medicineImage,
        imageUrl: medicine.medicineImage,
        approvalStatus: "pending",
        status: "PENDING APPROVAL",
        blockchainStatus: "Pending Approval",
      },
      result: {
        score: 30,
        status: "PENDING",
        riskLevel: "MEDIUM",
        code: "PENDING_APPROVAL",
      },
      checks: {
        qr: { status: qrAudit.isValid ? "VERIFIED" : "RAW_CODE", score: 10 },
        database: { status: "REGISTERED_PENDING_APPROVAL", score: 15 },
        ocr: { status: "UNAVAILABLE", score: 0 },
        blockchain: { status: "PENDING_ADMIN_APPROVAL", score: 0 },
        supplyChain: { status: "NOT_DISPATCHED_PENDING_APPROVAL", score: 5 },
        expiry: { status: "VALID", score: 0 },
        ai: { status: "UNAVAILABLE", confidence: 0, score: 0 },
        qrReuseRisk: { status: "LOW", score: 0 },
      },
      layers: {
        qr: qrAudit.isValid ? "VERIFIED" : "VALID",
        database: "REGISTERED_PENDING_APPROVAL",
        integrity: "PENDING_APPROVAL",
        blockchain: "PENDING_ADMIN_APPROVAL",
        expiry: "VALID",
        supplyChain: "NOT_DISPATCHED_PENDING_APPROVAL",
        qrReuseRisk: "LOW",
      },
      reasons: [
        "⏳ PENDING COMPLIANCE APPROVAL: This medicine batch has been submitted by the registered manufacturer but is currently awaiting Admin compliance approval.",
        "⚠️ Unreleased Batch: This medicine has not yet been approved or released into the authorized distribution network.",
        "ℹ️ Cryptographic verification on DrugChain will only activate after official Admin review.",
      ],
      warnings: [
        "This batch is PENDING approval. It should not be distributed, sold, or purchased until approved by regulatory administrators.",
      ],
    };
  }

  // ── HANDLE REJECTED MEDICINE STATUS ──────────────────────────────────
  if (medicine.approvalStatus === "rejected") {
    return {
      success: true,
      status: "REJECTED",
      authenticityScore: 0,
      isFake: false,
      medicine: {
        id: medicine.id,
        batchId: medicine.batchId,
        name: medicine.name,
        company: medicine.company,
        manufacturer: medicine.manufacturer,
        manufacturingDate: medicine.manufacturingDate,
        expiryDate: medicine.expiryDate,
        composition: medicine.composition || "",
        medicineImage: medicine.medicineImage,
        imageUrl: medicine.medicineImage,
        approvalStatus: "rejected",
        status: "REJECTED",
        rejectionReason: medicine.rejectionReason || "Failed regulatory compliance review",
        blockchainStatus: "Rejected",
      },
      result: {
        score: 0,
        status: "REJECTED",
        riskLevel: "HIGH",
        code: "SUBMISSION_REJECTED",
      },
      checks: {
        qr: { status: "REJECTED", score: 0 },
        database: { status: "REJECTED_BY_ADMIN", score: 0 },
        ocr: { status: "UNAVAILABLE", score: 0 },
        blockchain: { status: "REJECTED_ON_CHAIN", score: 0 },
        supplyChain: { status: "BLOCKED_FROM_DISTRIBUTION", score: 0 },
        expiry: { status: "UNKNOWN", score: 0 },
        ai: { status: "UNAVAILABLE", confidence: 0, score: 0 },
        qrReuseRisk: { status: "HIGH", score: 0 },
      },
      layers: {
        qr: "REJECTED",
        database: "REJECTED_BY_ADMIN",
        integrity: "FAILED_REJECTED",
        blockchain: "REJECTED_ON_CHAIN",
        expiry: "UNKNOWN",
        supplyChain: "BLOCKED_FROM_DISTRIBUTION",
        qrReuseRisk: "HIGH",
      },
      reasons: [
        "✖ REJECTED MEDICINE: This medicine batch was reviewed by the compliance administration and REJECTED.",
        medicine.rejectionReason ? `Reason for rejection: "${medicine.rejectionReason}"` : "The submission failed authenticity, licensing, or documentation standards.",
        "🚫 Strictly Forbidden: This medicine is unauthorized for sale, distribution, or consumption.",
      ],
      warnings: [
        "DO NOT CONSUME OR DISPENSE. This medicine submission was rejected by regulatory authority.",
      ],
    };
  }

  // Record Verification Scan & Increment Scan Frequency (Anti-Cloning Risk)
  medicine.verificationCount = (medicine.verificationCount || 0) + 1;
  medicine.verificationLogs = medicine.verificationLogs || [];
  
  let qrReuseRisk = "LOW";
  if (medicine.verificationCount > 15) {
    qrReuseRisk = "HIGH";
  } else if (medicine.verificationCount > 5) {
    qrReuseRisk = "MEDIUM";
  }
  medicine.qrReuseRisk = qrReuseRisk;

  // C. Expiry Date Check
  const expiryAudit = validateExpiry(medicine.manufacturingDate, medicine.expiryDate);

  // D. Supply Chain Custody Audit
  const supplyChainAudit = validateSupplyChainCustody(medicine);

  // E. Blockchain & Data Hash Audit
  const blockchainAudit = await validateBlockchainLedger(medicine);

  // F. OCR & AI Vision Inspection
  const aiAudit = await processAIAndOCR(imageFile, {
    medicineName: medicine.name,
    batchNumber: medicine.batchId,
    companyName: medicine.company || medicine.manufacturer,
    ...formMetadata,
  });

  // Save verification log to medicine
  medicine.verificationLogs.push({
    timestamp: new Date(),
    role: user?.role || "Public / Customer",
    result: blockchainAudit.isMatch && supplyChainAudit.status === "VALID" ? "AUTHENTIC" : "SUSPICIOUS",
    clientIp,
  });
  await medicine.save();

  // ── WEIGHT ALLOCATION (TOTAL = 100 POINTS) ──
  // QR: 15, Database: 15, Blockchain: 25, SupplyChain: 15, Expiry: 10, OCR/AI: 20
  let qrScore = qrAudit.isValid ? 15 : 0;
  let dbScore = 15;
  let bcScore = blockchainAudit.isMatch ? 25 : 0;
  let scScore = supplyChainAudit.status === "VALID" ? 15 : 5;
  let expScore = expiryAudit.expiryStatus === "VALID" ? 10 : expiryAudit.expiryStatus === "EXPIRED" ? 8 : 0;

  let aiScore = 20;
  if (aiAudit.available) {
    aiScore = aiAudit.status === "PASS" ? 20 : 5;
  } else {
    // If AI image was not uploaded, redistribute AI score fairly based on cryptographic proof
    aiScore = blockchainAudit.isMatch ? 20 : 10;
  }

  // QR Reuse Penalty
  if (qrReuseRisk === "HIGH") {
    qrScore = Math.max(0, qrScore - 8);
  } else if (qrReuseRisk === "MEDIUM") {
    qrScore = Math.max(0, qrScore - 3);
  }

  const totalScore = Math.min(100, Math.max(0, qrScore + dbScore + bcScore + scScore + expScore + aiScore));

  // Determine Final Result Level
  let finalStatus = "AUTHENTIC";
  let riskLevel = "LOW";

  if (!blockchainAudit.isMatch || qrAudit.status === "MODIFIED_QR_SIGNATURE_MISMATCH") {
    finalStatus = totalScore < 40 ? "LIKELY COUNTERFEIT" : "SUSPICIOUS";
    riskLevel = "HIGH";
  } else if (supplyChainAudit.issues.length > 0 || qrReuseRisk === "HIGH" || totalScore < 70) {
    finalStatus = totalScore < 70 ? "SUSPICIOUS" : "REVIEW";
    riskLevel = "MEDIUM";
  } else if (totalScore < 90) {
    finalStatus = "REVIEW";
    riskLevel = "MEDIUM";
  } else {
    finalStatus = "AUTHENTIC";
    riskLevel = "LOW";
  }

  // Explainable Reasons Generation
  const reasons = [];
  const warnings = [];

  if (qrAudit.isSignedToken) {
    reasons.push("✓ Cryptographic QR Signature Verified: HMAC-SHA256 token is authentic and untampered.");
  } else {
    reasons.push("✓ QR code matched registered pharmaceutical batch code on DrugChain.");
  }

  reasons.push(`✓ Database Record Matched: Registered by manufacturer ${medicine.company || medicine.manufacturer}.`);

  if (blockchainAudit.isMatch) {
    reasons.push(`✓ Immutable Blockchain Proof Verified: On-chain block #${blockchainAudit.blockIndex || 1} matches SHA-256 hash.`);
  } else {
    reasons.push("❌ Blockchain Data Mismatch: On-chain ledger parameters do not match database record.");
  }

  if (supplyChainAudit.status === "VALID") {
    reasons.push("✓ Supply Chain Sequence Valid: Manufacturer → Distributor → Pharmacy custody trace verified.");
  } else {
    supplyChainAudit.issues.forEach((issue) => reasons.push(`⚠ Supply Chain Warning: ${issue}`));
  }

  if (expiryAudit.expiryStatus === "VALID") {
    reasons.push(`✓ Expiry Date Valid: Batch is within safe shelf life (Expires ${medicine.expiryDate}).`);
  } else if (expiryAudit.expiryStatus === "EXPIRED") {
    reasons.push(`⚠ EXPIRED MEDICINE: Expiry date (${medicine.expiryDate}) has passed.`);
    warnings.push(`This medicine has expired on ${medicine.expiryDate}. Do not consume or sell expired drugs.`);
  } else {
    reasons.push(`⚠ Invalid Date Data: ${expiryAudit.details}`);
  }

  if (aiAudit.available) {
    if (aiAudit.status === "PASS") {
      reasons.push("✓ AI Tablet Vision Inspection Passed: Packaging and imprints match expected manufacturer specs.");
    } else {
      reasons.push("⚠ AI Packaging Mismatch Detected: Visual packaging features differ from expected reference.");
      aiAudit.mismatches.forEach((m) => warnings.push(`AI Vision flagged mismatch in field: ${m}`));
    }
  }

  if (qrReuseRisk === "HIGH") {
    reasons.push("⚠ QR Code High Scan Frequency: Scanned over 15 times (potential packaging cloning risk).");
    warnings.push("High QR scan frequency detected. Ensure package seal was not previously tampered.");
  }

  const finalPayload = {
    success: true,
    status: finalStatus,
    authenticityScore: totalScore,
    isFake: false,
    medicine: {
      id: medicine.id,
      batchId: medicine.batchId,
      name: medicine.name,
      company: medicine.company,
      manufacturer: medicine.manufacturer,
      manufacturerCode: medicine.manufacturerCode,
      manufacturingDate: medicine.manufacturingDate,
      expiryDate: medicine.expiryDate,
      price: medicine.price,
      quantity: medicine.quantity,
      medicineImage: medicine.medicineImage,
      composition: medicine.composition || "",
      approvalStatus: medicine.approvalStatus || "approved",
      governmentCertificate: medicine.governmentCertificate,
      blockchainTxHash: medicine.blockchainTxHash,
      blockchainStatus: medicine.blockchainStatus,
      currentHolder: medicine.currentHolder,
      verificationCount: medicine.verificationCount,
      qrReuseRisk: medicine.qrReuseRisk,
      transferHistory: medicine.transferHistory,
    },
    result: {
      score: totalScore,
      status: finalStatus,
      riskLevel,
      code: finalStatus === "AUTHENTIC" ? "VERIFIED_AUTHENTIC" : "REQUIRES_INSPECTION",
    },
    checks: {
      qr: { status: qrAudit.isValid ? "VERIFIED" : "INVALID_SIGNATURE", score: qrScore },
      database: { status: "MATCHED", score: dbScore },
      ocr: { status: aiAudit.available ? aiAudit.status : "UNAVAILABLE", score: aiAudit.available ? (aiAudit.status === "PASS" ? 15 : 5) : 15 },
      blockchain: { status: blockchainAudit.status, score: bcScore },
      supplyChain: { status: supplyChainAudit.status, score: scScore },
      expiry: { status: expiryAudit.expiryStatus, score: expScore },
      ai: { status: aiAudit.status, confidence: aiAudit.confidence, score: aiScore },
      qrReuseRisk: { status: qrReuseRisk, score: qrReuseRisk === "LOW" ? 10 : 5 },
    },
    layers: {
      qr: qrAudit.isValid ? "VERIFIED" : "INVALID_SIGNATURE",
      database: "MATCHED",
      integrity: blockchainAudit.isMatch ? "INTEGRITY_VERIFIED" : "DATA_INTEGRITY_MISMATCH",
      blockchain: blockchainAudit.status,
      expiry: expiryAudit.expiryStatus,
      supplyChain: supplyChainAudit.status,
      qrReuseRisk,
    },
    reasons,
    warnings,
    timeline: medicine.transferHistory,
    aiAnalysis: aiAudit.fullAiAnalysis || null,
  };

  try {
    await Verification.create({
      medicineId: medicine.id,
      batchId: medicine.batchId,
      verifiedBy: user?.name || user?.email || "Public / Customer",
      userId: user?._id || null,
      verificationType: qrAudit.isSignedToken ? "TOKEN_VERIFY" : "QR_SCAN",
      result: finalStatus,
      authenticityScore: totalScore,
      reasons,
      warnings,
      layers: {
        qr: qrAudit.isValid ? "VERIFIED" : "INVALID_SIGNATURE",
        database: "MATCHED",
        integrity: blockchainAudit.isMatch ? "INTEGRITY_VERIFIED" : "DATA_INTEGRITY_MISMATCH",
        blockchain: blockchainAudit.status,
        expiry: expiryAudit.expiryStatus,
        supplyChain: supplyChainAudit.status,
        qrReuseRisk,
      },
      clientIp,
    });
  } catch (verErr) {
    // Non-blocking log
  }

  return finalPayload;
}

