const crypto = require("crypto");

// ==========================================
// OTP STORE
// ==========================================

const otpStore = new Map();

// ==========================================
// CONFIGURATION
// ==========================================

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000;        // 60 seconds
const MAX_ATTEMPTS = 5;

// ==========================================
// HASH OTP
// ==========================================

const hashOTP = (otp) => {
  return crypto
    .createHash("sha256")
    .update(String(otp).trim())
    .digest("hex");
};

// ==========================================
// CLEANUP EXPIRED OTPs
// ==========================================

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

// ==========================================
// CHECK COOLDOWN
// ==========================================

const checkCooldown = (email) => {
  const normalizedEmail =
    email.toLowerCase().trim();

  const existing =
    otpStore.get(normalizedEmail);

  if (
    !existing ||
    !existing.lastSentAt
  ) {
    return {
      allowed: true,
      remainingSeconds: 0,
    };
  }

  const elapsed =
    Date.now() - existing.lastSentAt;

  if (elapsed < COOLDOWN_MS) {
    const remainingSeconds =
      Math.ceil(
        (COOLDOWN_MS - elapsed) / 1000
      );

    return {
      allowed: false,
      remainingSeconds,
    };
  }

  return {
    allowed: true,
    remainingSeconds: 0,
  };
};

// ==========================================
// GENERATE AND STORE OTP
// ==========================================

const generateAndStoreOTP = (email) => {
  const normalizedEmail =
    email.toLowerCase().trim();

  const otp =
    crypto
      .randomInt(100000, 1000000)
      .toString();

  const hashedOtp =
    hashOTP(otp);

  const now = Date.now();

  otpStore.set(
    normalizedEmail,
    {
      hashedOtp,
      expiresAt:
        now + OTP_EXPIRY_MS,
      lastSentAt: now,
      attempts: 0,
    }
  );

  return otp;
};

// ==========================================
// VERIFY OTP
// ==========================================

const verifyOTP = (
  email,
  inputOtp,
  consume = false
) => {
  const normalizedEmail =
    email.toLowerCase().trim();

  const entry =
    otpStore.get(normalizedEmail);

  if (!entry) {
    return {
      valid: false,
      message:
        "No OTP was requested for this email or it has expired.",
    };
  }

  // Expired
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);

    return {
      valid: false,
      message:
        "OTP has expired. Please request a new one.",
    };
  }

  // Too many attempts
  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalizedEmail);

    return {
      valid: false,
      message:
        "Too many failed attempts. Please request a new OTP.",
    };
  }

  const inputHash =
    hashOTP(inputOtp);

  const isMatch =
    crypto.timingSafeEqual(
      Buffer.from(
        entry.hashedOtp,
        "hex"
      ),
      Buffer.from(
        inputHash,
        "hex"
      )
    );

  if (!isMatch) {
    entry.attempts += 1;

    const remaining =
      MAX_ATTEMPTS -
      entry.attempts;

    return {
      valid: false,
      message:
        `Invalid OTP. ${remaining} attempts remaining.`,
    };
  }

  // Consume OTP after successful registration
  if (consume) {
    otpStore.delete(
      normalizedEmail
    );
  }

  return {
    valid: true,
    message:
      "OTP verified successfully.",
  };
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  checkCooldown,
  generateAndStoreOTP,
  verifyOTP,
};