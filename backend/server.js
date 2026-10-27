import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import routes from "./routes.js";
import businessApplicationRoutes from "./src/routes/businessApplicationRoutes.js";
import { User } from "./models.js";
import { logger } from "./utils/logger.js";
import {
  connectDatabase,
  closeDatabaseConnection,
  requireDatabaseConnection,
  getDatabaseDiagnostics,
} from "./db.js";

// ── Startup Security Checks ──────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  logger.warn("JWT_SECRET not set in .env — using insecure default. Set a strong random secret for production.");
}
if (!process.env.GEMINI_API_KEY) {
  logger.warn("GEMINI_API_KEY not set — AI verification will run in fallback mode.");
}
if (!process.env.CREATOR_PASSWORD && !process.env.ADMIN_PASSWORD) {
  logger.warn("CREATOR_PASSWORD / ADMIN_PASSWORD not set in .env — Creator account will use insecure default password.");
}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fake_drug_detection";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Uploads directory static serving
const UPLOADS_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

// Health Check API (Public, safe diagnostics without credentials)
app.get("/api/health", (req, res) => {
  const dbDiag = getDatabaseDiagnostics();
  res.json({
    status: dbDiag.readyState === 1 ? "HEALTHY" : "DEGRADED",
    service: "Fake Drug Detection Engine API",
    version: "1.0.0",
    database: dbDiag.status,
    databaseDetails: dbDiag,
    timestamp: new Date().toISOString(),
  });
});

// Safe Database Diagnostics Endpoint
app.get("/api/database/diagnostics", (req, res) => {
  res.json({
    success: true,
    diagnostics: getDatabaseDiagnostics(),
  });
});

// Guard operational API routes from running when database is disconnected
app.use("/api", requireDatabaseConnection);

// Mount Central API Routes
app.use("/api", routes);

// Mount Business Applications Module (Admin approval & notification system)
app.use("/api/business-applications", businessApplicationRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}`, code: "NOT_FOUND" });
});

// Global Exception Handler
app.use((err, req, res, next) => {
  logger.error("Unhandled API Error", { path: req?.path, method: req?.method, message: err.message });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : (err.message || "Internal server error occurred"),
    code: err.code || "INTERNAL_SERVER_ERROR",
  });
});

// Initialize & Sync Secure Creator Account from .env
async function initCreatorAccount() {
  try {
    const creatorEmail = (process.env.CREATOR_EMAIL || process.env.ADMIN_EMAIL || "creator@drugchain.network").toLowerCase().trim();
    const creatorPassword = process.env.CREATOR_PASSWORD || process.env.ADMIN_PASSWORD;
    const creatorName = process.env.CREATOR_NAME || process.env.ADMIN_USERNAME || "System Creator";

    if (!creatorPassword) {
      logger.warn("CREATOR_PASSWORD / ADMIN_PASSWORD not set — Creator account password NOT updated on this startup.");
    }

    let creator = await User.findOne({
      $or: [{ role: "Creator" }, { email: creatorEmail }],
    });

    if (!creator) {
      if (!creatorPassword) {
        logger.warn("Cannot create Creator account without CREATOR_PASSWORD in .env");
        return;
      }
      logger.info("Initializing Creator account in MongoDB...");
      creator = new User({
        name: creatorName,
        email: creatorEmail,
        password: creatorPassword, // Hashed automatically by pre-save hook
        role: "Creator",
        accountStatus: "APPROVED",
        company: "DrugChain Network Authority",
        companyCode: "CREATOR-ROOT-001",
      });
      await creator.save();
      logger.info("Creator account initialized", { email: creatorEmail });
    } else {
      creator.name = creatorName;
      creator.email = creatorEmail;
      creator.role = "Creator";
      creator.accountStatus = "APPROVED";
      // Only update password if env has one
      if (creatorPassword) {
        creator.password = creatorPassword;
      }
      await creator.save();
      logger.info("Creator account synchronized", { email: creatorEmail });
    }
  } catch (err) {
    logger.error("Creator initialization error", { message: err.message });
  }
}

import { migrateToSeparatedArchitecture } from "./services/migrationService.js";

// Start HTTP Server immediately
const server = app.listen(PORT, () => {
  logger.info(`Fake Drug Detection Backend running on port ${PORT}`);
  logger.info(`API Base: http://localhost:${PORT}/api`);
});

// Asynchronously connect to MongoDB and sync database
connectDatabase()
  .then(async () => {
    await initCreatorAccount();
    await migrateToSeparatedArchitecture();
  })
  .catch((err) => {
    logger.error(`MongoDB connection initialization failure: ${err.message}`);
  });

// Graceful process termination
const handleGracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down HTTP server and database connection gracefully...`);
  server.close(async () => {
    await closeDatabaseConnection();
    logger.info("Server and database shutdown completed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
