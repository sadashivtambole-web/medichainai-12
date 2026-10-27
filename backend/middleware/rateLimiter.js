/**
 * Rate Limiter Middleware
 * Provides endpoint-specific rate limiting without blocking legitimate users.
 */

import rateLimit from "express-rate-limit";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Generic JSON error response for rate limit hits
function rateLimitHandler(req, res) {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please wait a moment and try again.",
    errorCode: "RATE_LIMIT_EXCEEDED",
  });
}

/**
 * Login: 10 attempts per 15 minutes per IP
 * Relaxed enough for legitimate users, strict enough to prevent brute-force
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
});

/**
 * OTP Send: 5 sends per 10 minutes per IP
 * Prevents OTP spam/email flooding
 */
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IS_PRODUCTION ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * OTP Verify: 10 attempts per 10 minutes per IP
 * Prevents guessing — OTPs have bcrypt protection anyway
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IS_PRODUCTION ? 10 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * AI Verification: 20 requests per minute per IP
 * AI calls are expensive; prevents abuse
 */
export const aiVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_PRODUCTION ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Public medicine verification: 60 per minute per IP
 * Customers and POS scanners need generous limits
 */
export const publicVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_PRODUCTION ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Registration: 5 per hour per IP
 * Prevents mass fake account creation
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_PRODUCTION ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
