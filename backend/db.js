/**
 * Centralized MongoDB Connection Layer with Safe Diagnostics & Failover
 * 
 * Features:
 * - Environment variable support: MONGODB_URI, MONGO_URI, MONGODB_FALLBACK_URI, MONGODB_DB_NAME
 * - Automatic detection and fallback to local MongoDB if Atlas connection is rejected (e.g. IP whitelist / SSL alert 80)
 * - Credential redaction in logs (never exposes passwords or secrets in logs)
 * - BufferCommands disabled to prevent 10,000ms buffering timeouts when disconnected
 * - Database readiness middleware (requireDatabaseConnection) returning HTTP 503 instead of hanging
 * - Safe connection health diagnostics endpoint
 * - Graceful shutdown handling (SIGINT, SIGTERM)
 */

import mongoose from "mongoose";
import dns from "dns";
import { logger } from "./utils/logger.js";

// Disable Mongoose operation buffering so queries fail immediately or are guarded
// rather than hanging for 10000ms in memory when database is disconnected
mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 5000);

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/medichain_ai";

export function getRawUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_LOCAL_URI;
}

export function getFallbackUri() {
  return process.env.MONGODB_FALLBACK_URI || DEFAULT_LOCAL_URI;
}

export function getDbName(uri) {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  try {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    if (match && match[1] && !match[1].startsWith("cluster")) return match[1];
  } catch (e) {}
  return "medichain_ai";
}

/**
 * Redact sensitive password/credentials from MongoDB connection string for safe logging
 * @param {string} uri 
 * @returns {string} Redacted URI (e.g. mongodb+srv://user:******@host/db)
 */
export function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== "string") return "mongodb://[undefined]";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:******@");
}

let isConnecting = false;
let retryCount = 0;
const MAX_RETRIES = 5;
let activeConnectionUri = null;
let lastConnectionError = null;

/**
 * Check if MongoDB connection is ready
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Safe connection diagnostics for API health inspection (never exposes secrets or OTPs)
 */
export function getDatabaseDiagnostics() {
  const readyStates = {
    0: "DISCONNECTED",
    1: "CONNECTED",
    2: "CONNECTING",
    3: "DISCONNECTING",
  };
  const stateCode = mongoose.connection.readyState;
  const stateName = readyStates[stateCode] || "UNKNOWN";

  let host = "unknown";
  try {
    if (mongoose.connection.host) {
      host = mongoose.connection.host;
    } else if (activeConnectionUri) {
      const match = activeConnectionUri.match(/@([^/?]+)/);
      if (match) host = match[1];
    }
  } catch (e) {}

  return {
    status: stateCode === 1 ? "CONNECTED" : "DISCONNECTED",
    readyState: stateCode,
    stateDescription: stateName,
    databaseName: mongoose.connection.name || getDbName(getRawUri()),
    host: host,
    isLocal: host.includes("127.0.0.1") || host.includes("localhost"),
    activeUriSanitized: sanitizeMongoUri(activeConnectionUri || getRawUri()),
    lastError: lastConnectionError ? lastConnectionError.message : null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Middleware that guards routes against disconnected database state.
 * Returns HTTP 503 Service Unavailable immediately instead of letting queries buffer/time out.
 */
export function requireDatabaseConnection(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const diagnostics = getDatabaseDiagnostics();
  logger.warn("Request blocked: Database is not connected", {
    path: req.originalUrl || req.path,
    method: req.method,
    readyState: diagnostics.stateDescription,
  });

  return res.status(503).json({
    success: false,
    message: "Database service is temporarily unavailable. Please verify MongoDB is running or network access is configured.",
    code: "DATABASE_UNAVAILABLE",
    details: {
      status: diagnostics.status,
      state: diagnostics.stateDescription,
      database: diagnostics.databaseName,
      hint: diagnostics.isLocal
        ? "Ensure the local MongoDB service is running (e.g. net start MongoDB)."
        : "If connecting to MongoDB Atlas, ensure your IP address is whitelisted in Atlas Network Access.",
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Attempt to connect to a specific MongoDB URI
 */
async function attemptConnect(uri, label = "Primary") {
  const dbName = getDbName(uri);
  const sanitized = sanitizeMongoUri(uri);

  if (uri.startsWith("mongodb+srv://")) {
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (e) {
      logger.warn("Custom DNS servers could not be set, using system default.", { error: e.message });
    }
  }

  const options = {
    dbName: dbName,
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 6000,
    socketTimeoutMS: 30000,
    maxPoolSize: 20,
    minPoolSize: 2,
  };

  logger.info(`Attempting ${label} MongoDB connection to ${sanitized} (db: ${dbName})...`);
  await mongoose.connect(uri, options);
  activeConnectionUri = uri;
  lastConnectionError = null;
  logger.info(`MongoDB connected successfully (${label}) | Database: ${dbName} | URI: ${sanitized}`);
  return mongoose.connection;
}

/**
 * Connect to MongoDB with timeout, Atlas IP whitelist detection, and automatic local fallback
 */
export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return;
  }

  isConnecting = true;
  const rawUri = getRawUri();
  const fallbackUri = getFallbackUri();

  try {
    // 1. Attempt primary connection
    await attemptConnect(rawUri, "Primary");
    isConnecting = false;
    retryCount = 0;
    return mongoose.connection;
  } catch (primaryErr) {
    lastConnectionError = primaryErr;
    const sanitizedPrimary = sanitizeMongoUri(rawUri);
    logger.error(`Primary MongoDB connection failed: ${primaryErr.message} | URI: ${sanitizedPrimary}`);

    // Check for Atlas IP Whitelist / TLS rejection (SSL alert number 80)
    const isAtlasRejection =
      primaryErr.message.includes("SSL alert number 80") ||
      primaryErr.message.includes("whitelist") ||
      primaryErr.message.includes("tlsv1 alert internal error");

    if (isAtlasRejection) {
      logger.warn("Atlas rejection detected: Your current IP address is not whitelisted in MongoDB Atlas Network Access.");
    }

    // 2. If primary failed and fallback URI is distinct, attempt automatic fallback
    if (fallbackUri && fallbackUri !== rawUri) {
      const sanitizedFallback = sanitizeMongoUri(fallbackUri);
      logger.warn(`Attempting automatic fallback to local MongoDB instance: ${sanitizedFallback}`);
      try {
        await attemptConnect(fallbackUri, "Fallback Local");
        isConnecting = false;
        retryCount = 0;
        logger.info(`Failover successful! Connected to local MongoDB fallback at ${sanitizedFallback}`);
        return mongoose.connection;
      } catch (fallbackErr) {
        lastConnectionError = fallbackErr;
        logger.error(`Fallback MongoDB connection also failed: ${fallbackErr.message}`);
      }
    }

    isConnecting = false;

    // 3. Retry loop with capped backoff
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
      logger.warn(`Retrying MongoDB connection in ${delayMs / 1000}s (Attempt ${retryCount}/${MAX_RETRIES})...`);
      setTimeout(() => connectDatabase(), delayMs);
    } else {
      logger.error(`Max MongoDB connection retries (${MAX_RETRIES}) reached. Operating in disconnected state.`);
    }
  }
}

// ── Lifecycle Event Listeners ──
mongoose.connection.on("connected", () => {
  logger.info("MongoDB connection state: CONNECTED");
});

mongoose.connection.on("error", (err) => {
  lastConnectionError = err;
  logger.error("MongoDB connection runtime error", { message: err.message });
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB connection disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB connection successfully reconnected");
});

/**
 * Graceful shutdown for MongoDB connection
 */
export async function closeDatabaseConnection() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed gracefully.");
    }
  } catch (err) {
    logger.error("Error closing MongoDB connection", { message: err.message });
  }
}

// Handle application termination signals
process.on("SIGINT", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

export default mongoose;
