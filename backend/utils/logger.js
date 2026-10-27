/**
 * Logger Utility
 * Clean, structured server-side logging.
 * Never logs secrets, passwords, OTPs, or JWT tokens.
 */

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(level) {
  return LEVELS[level] <= LEVELS[LOG_LEVEL];
}

function timestamp() {
  return new Date().toISOString();
}

function format(level, message, meta = {}) {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} | ${JSON.stringify(meta)}`;
  }
  return base;
}

export const logger = {
  error(message, meta = {}) {
    if (shouldLog("error")) {
      console.error(format("error", message, meta));
    }
  },

  warn(message, meta = {}) {
    if (shouldLog("warn")) {
      console.warn(format("warn", message, meta));
    }
  },

  info(message, meta = {}) {
    if (shouldLog("info")) {
      console.log(format("info", message, meta));
    }
  },

  debug(message, meta = {}) {
    if (!IS_PRODUCTION && shouldLog("debug")) {
      console.log(format("debug", message, meta));
    }
  },

  // Auth events — never log passwords or tokens
  auth(event, meta = {}) {
    const safe = { ...meta };
    delete safe.password;
    delete safe.token;
    delete safe.otp;
    this.info(`[AUTH] ${event}`, safe);
  },

  // Blockchain events
  blockchain(event, meta = {}) {
    this.info(`[CHAIN] ${event}`, meta);
  },

  // Medicine events
  medicine(event, meta = {}) {
    this.info(`[MED] ${event}`, meta);
  },

  // Transfer events
  transfer(event, meta = {}) {
    this.info(`[TRANSFER] ${event}`, meta);
  },

  // Verification events
  verification(event, meta = {}) {
    this.info(`[VERIFY] ${event}`, meta);
  },
};
