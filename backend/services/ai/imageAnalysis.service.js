/**
 * Image Analysis Service
 * Manages image pre-processing, validation checks, and Gemini Multimodal Vision API invocation.
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import { parseAndNormalizeAIResponse } from "./aiResponseParser.js";
import { logger } from "../../utils/logger.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MIN_IMAGE_BYTES = 100;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Validates image file size, existence, and format prior to API invocation.
 */
export function validateImageFile(imageFile) {
  if (!imageFile) {
    return { isValid: false, code: "MISSING_IMAGE", error: "No image file provided for analysis" };
  }

  // Handle path string or Multer file object
  const filePath = typeof imageFile === "string" ? imageFile : imageFile.path;
  const mimeType = (imageFile.mimetype || getMimeFromPath(filePath) || "").toLowerCase();

  if (!filePath || !fs.existsSync(filePath)) {
    return { isValid: false, code: "IMAGE_NOT_FOUND", error: "Image file does not exist on storage" };
  }

  try {
    const stats = fs.statSync(filePath);
    if (stats.size < MIN_IMAGE_BYTES) {
      return {
        isValid: false,
        code: "IMAGE_QUALITY_LOW",
        error: "Image file is too small or empty (unreadable packaging image)",
      };
    }
    if (stats.size > MAX_IMAGE_BYTES) {
      return {
        isValid: false,
        code: "IMAGE_TOO_LARGE",
        error: `Image file exceeds maximum allowable size of ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`,
      };
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        code: "IMAGE_INVALID_TYPE",
        error: `Unsupported image format (${mimeType}). Allowed formats: JPEG, PNG, WEBP`,
      };
    }

    // Verify file header / magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WEBP: 52 49 46 46, GIF: 47 49 46)
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.toString("utf8", 0, 4) === "RIFF";
    const isGif = buffer.toString("utf8", 0, 3) === "GIF";

    if (!isJpeg && !isPng && !isWebp && !isGif) {
      return {
        isValid: false,
        code: "IMAGE_INVALID",
        error: "Corrupt or invalid image file header format",
      };
    }

    return { isValid: true, filePath, mimeType: mimeType || "image/jpeg", sizeBytes: stats.size };
  } catch (err) {
    return { isValid: false, code: "IMAGE_READ_ERROR", error: `Failed to inspect image file: ${err.message}` };
  }
}

/**
 * Invokes Gemini Multimodal Vision API to inspect packaging and perform text extraction.
 */
export async function executeVisionAnalysis(imageFile, formMetadata = {}) {
  const validation = validateImageFile(imageFile);
  if (!validation.isValid) {
    return {
      success: false,
      available: false,
      status: validation.code,
      message: validation.error,
      extractedData: null,
      rawObservations: [],
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!geminiApiKey || geminiApiKey.trim() === "" || geminiApiKey === "your_gemini_api_key_here") {
    return {
      success: false,
      available: false,
      status: "AI_UNAVAILABLE",
      message: "Gemini API key is not configured in backend environment",
      extractedData: null,
      rawObservations: ["AI Vision inspection service running in fallback mode"],
    };
  }

  try {
    const fileBuffer = await fs.promises.readFile(validation.filePath);
    const imageBase64 = fileBuffer.toString("base64");

    const promptText = `You are an AI Pharmaceutical Packaging & Visual Quality Inspector.
Analyze this uploaded medicine blister strip, tablet bottle, or packaging box.
Expected registration metadata (for comparison):
- Medicine Name: "${formMetadata.medicineName || "N/A"}"
- Batch Number: "${formMetadata.batchNumber || "N/A"}"
- Manufacturer: "${formMetadata.companyName || formMetadata.manufacturer || "N/A"}"

Perform visual inspection and optical character recognition (OCR) on text printed on the packaging.
Evaluate:
1. Exact printed medicine name
2. Printed batch number / lot ID
3. Printed manufacturer or marketing authority
4. Printed manufacturing date (YYYY-MM-DD or as printed)
5. Printed expiry date (YYYY-MM-DD or as printed)
6. Physical packaging condition ("INTACT", "SUSPICIOUS", "DAMAGED")
7. Label print integrity ("CLEAR", "BLURRED", "TAMPERED", "INCOMPLETE")

Return ONLY a valid JSON object matching this schema with no markdown backticks:
{
  "medicineName": "extracted medicine name",
  "batchNumber": "extracted batch number",
  "manufacturer": "extracted company name",
  "manufacturingDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "packagingCondition": "INTACT",
  "labelIntegrity": "CLEAR",
  "status": "PASS",
  "findings": ["short bullet observations regarding visual packaging features"],
  "warnings": ["any visible inconsistencies, print errors, or packaging tampering flags"]
}`;

    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const response = await axios.post(
      endpointUrl,
      {
        contents: [
          {
            parts: [
              { text: promptText },
              { inlineData: { mimeType: validation.mimeType, data: imageBase64 } },
            ],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000, // 10-second defensive timeout
      }
    );

    const rawCandidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const normalized = parseAndNormalizeAIResponse(rawCandidateText);

    return {
      success: true,
      available: true,
      status: "SUCCESS",
      modelProvider: geminiModel,
      extractedData: {
        medicineName: normalized.medicineName,
        batchNumber: normalized.batchNumber,
        manufacturer: normalized.manufacturer,
        manufacturingDate: normalized.manufacturingDate,
        expiryDate: normalized.expiryDate,
        packagingCondition: normalized.packagingCondition,
        labelIntegrity: normalized.labelIntegrity,
      },
      rawObservations: normalized.visualObservations,
      rawWarnings: normalized.suspiciousIndicators,
      rawStatus: normalized.rawStatus,
    };
  } catch (err) {
    logger.warn("Gemini vision analysis failed", {
      status: err.response?.status,
      message: err.message,
    });

    let failureStatus = "AI_UNAVAILABLE";
    let failureMessage = "AI analysis is temporarily unavailable";

    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      failureStatus = "AI_TIMEOUT";
      failureMessage = "AI image analysis service timed out after 10 seconds";
    } else if (err.response?.status === 429) {
      failureStatus = "AI_RATE_LIMITED";
      failureMessage = "AI analysis rate limit exceeded. Please retry momentarily";
    } else if (err.response?.status === 401 || err.response?.status === 403) {
      failureStatus = "AI_AUTH_ERROR";
      failureMessage = "Invalid or unauthorized AI credentials";
    }

    return {
      success: false,
      available: false,
      status: failureStatus,
      message: failureMessage,
      extractedData: null,
      rawObservations: [`Fallback active: ${failureMessage}`],
      rawWarnings: [],
    };
  }
}

function getMimeFromPath(filePath) {
  if (!filePath) return "image/jpeg";
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}
