const crypto = require("crypto");

// In-memory OTP store (Stores cryptographic SHA-256 hash at rest, never plaintext)
// Key: email (lowercase) -> { hashedOtp, expiresAt, lastSentAt, attempts }
const otpStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes TTL
const COOLDOWN_MS = 60 * 1000;        // 60 seconds resend cooldown
const MAX_ATTEMPTS = 5;               // Brute-force throttling

// Hash helper using SHA-256 for secure at-rest storage
const hashOTP = (otp) =>
  crypto.createHash("sha256").update(String(otp).trim()).digest("hex");

// Periodically clean up expired OTP records to prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Checks if the user is still within the resend cooldown window.
 * Returns { allowed: boolean, remainingSeconds: number }
 */
const checkCooldown = (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = otpStore.get(normalizedEmail);

  if (!existing || !existing.lastSentAt) {
    return { allowed: true, remainingSeconds: 0 };
  }

  const elapsed = Date.now() - existing.lastSentAt;
  if (elapsed < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true, remainingSeconds: 0 };
};

/**
 * Generates a Cryptographically Secure (CSPRNG) 6-digit OTP
 * and stores its SHA-256 digest at rest.
 */
const generateAndStoreOTP = (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  // CSPRNG: Cryptographically secure random integer between 100000 and 999999
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOTP(otp);
  const now = Date.now();

  otpStore.set(normalizedEmail, {
    hashedOtp,
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
  });

  return otp;
};

/**
 * Verifies if the provided OTP matches using constant-time comparison (timingSafeEqual)
 * to prevent side-channel timing attacks.
 * If consume = true, deletes the OTP upon success (replay protection).
 */
const verifyOTP = (email, inputOtp, consume = false) => {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    return {
      valid: false,
      message: "No OTP was requested for this email or it has expired.",
    };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return {
      valid: false,
      message: "OTP has expired. Please request a new one.",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new OTP.",
    };
  }

  // Constant-time hash comparison to eliminate side-channel timing attacks
  const inputHash = hashOTP(inputOtp);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(entry.hashedOtp, "hex"),
    Buffer.from(inputHash, "hex")
  );

  if (!isMatch) {
    entry.attempts += 1;
    const remaining = MAX_ATTEMPTS - entry.attempts;
    return {
      valid: false,
      message: `Invalid OTP. ${remaining} attempts remaining.`,
    };
  }

  // Replay attack prevention: consume token on successful verification
  if (consume) {
    otpStore.delete(normalizedEmail);
  }

  return {
    valid: true,
    message: "OTP verified successfully.",
  };
};

module.exports = {
  checkCooldown,
  generateAndStoreOTP,
  verifyOTP,
};
