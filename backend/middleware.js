import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { User } from "./models.js";

/* ── DISK STORAGE CONFIGURATION (Stores files on disk, reference in MongoDB) ── */
const UPLOADS_DIR = path.resolve("uploads");
const PROTECTED_UPLOADS_DIR = path.resolve("uploads", "protected");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PROTECTED_UPLOADS_DIR)) {
  fs.mkdirSync(PROTECTED_UPLOADS_DIR, { recursive: true });
}

export { UPLOADS_DIR, PROTECTED_UPLOADS_DIR };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  },
});

const protectedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROTECTED_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `protected_${cleanBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMime = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();

  // Strictly forbid executable extensions
  const forbiddenExt = [".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".vbs", ".msi", ".dll"];
  if (forbiddenExt.includes(ext)) {
    return cb(new Error("Security violation: Executable files are strictly forbidden."));
  }

  if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPG, PNG, WEBP, and PDF documents are allowed."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum
});

export const uploadRegistrationDocs = multer({
  storage: protectedStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* ── JWT AUTHENTICATION MIDDLEWARE ── */
export const verifyToken = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing or malformed",
      code: "UNAUTHORIZED",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "super_secret_jwt_key_fake_drug_detection_2026"
    );
    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User session expired or invalid",
        code: "USER_NOT_FOUND",
      });
    }

    // STRICT CREATOR APPROVAL CHECK
    // If not Creator, access is strictly forbidden unless Creator has APPROVED the account
    const isCreator = (user.role || "").toLowerCase() === "creator";
    if (!isCreator) {
      if (user.accountStatus === "PENDING") {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Your account is waiting for Creator approval.",
          code: "ACCOUNT_PENDING_APPROVAL",
        });
      }
      if (user.accountStatus === "REJECTED") {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Your account has not been approved by the Creator.",
          code: "ACCOUNT_REJECTED",
        });
      }
      if (user.accountStatus === "SUSPENDED") {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Your account has been suspended by the Creator.",
          code: "ACCOUNT_SUSPENDED",
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authorization token",
      code: "INVALID_TOKEN",
    });
  }
};

/* ── ROLE-BASED ACCESS CONTROL (RBAC) ── */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const userRole = (req.user.role || "").toLowerCase().trim();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        code: "FORBIDDEN",
      });
    }
    next();
  };
};

/* ── STANDARDIZED API RESPONSE HELPERS ── */
export const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const sendError = (res, message = "An error occurred", code = "ERROR", statusCode = 400, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    errors,
    timestamp: new Date().toISOString(),
  });
};
