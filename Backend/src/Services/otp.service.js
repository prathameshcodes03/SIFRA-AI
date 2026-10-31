const crypto = require("crypto");
const { prisma } = require("../data/db");

// ==========================================
// CONFIGURATION
// ==========================================

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

const otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET || "sifra-otp-secret";

// ==========================================
// HASH OTP (HMAC-SHA256)
// ==========================================

const hashOTP = (otp) => {
  return crypto
    .createHmac("sha256", otpSecret)
    .update(String(otp).trim())
    .digest("hex");
};

// ==========================================
// CHECK COOLDOWN
// ==========================================

const checkCooldown = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.otpCode.findFirst({
    where: { email: normalizedEmail, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!existing || !existing.lastSentAt) {
    return { allowed: true, remainingSeconds: 0 };
  }

  const elapsed = Date.now() - new Date(existing.lastSentAt).getTime();

  if (elapsed < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true, remainingSeconds: 0 };
};

// ==========================================
// GENERATE AND STORE OTP
// ==========================================

const generateAndStoreOTP = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOTP(otp);
  const now = new Date();

  // Invalidate any previous unconsumed OTPs for this email.
  await prisma.otpCode.updateMany({
    where: { email: normalizedEmail, consumed: false },
    data: { consumed: true },
  });

  await prisma.otpCode.create({
    data: {
      email: normalizedEmail,
      hashedOtp,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      lastSentAt: now,
      attempts: 0,
      consumed: false,
    },
  });

  return otp;
};

// ==========================================
// VERIFY OTP
// ==========================================

const verifyOTP = async (email, inputOtp, consume = false) => {
  const normalizedEmail = email.toLowerCase().trim();

  const entry = await prisma.otpCode.findFirst({
    where: { email: normalizedEmail, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!entry) {
    return { valid: false, message: "No OTP was requested for this email or it has expired." };
  }

  if (Date.now() > new Date(entry.expiresAt).getTime()) {
    await prisma.otpCode.update({
      where: { id: entry.id },
      data: { consumed: true },
    });
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: entry.id },
      data: { consumed: true },
    });
    return { valid: false, message: "Too many failed attempts. Please request a new OTP." };
  }

  const inputHash = hashOTP(inputOtp);

  let isMatch = false;
  try {
    isMatch = crypto.timingSafeEqual(
      Buffer.from(entry.hashedOtp, "hex"),
      Buffer.from(inputHash, "hex")
    );
  } catch (e) {
    isMatch = false;
  }

  if (!isMatch) {
    await prisma.otpCode.update({
      where: { id: entry.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = MAX_ATTEMPTS - (entry.attempts + 1);
    return { valid: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  if (consume) {
    // Atomic consume: only succeeds if not already consumed.
    const updated = await prisma.otpCode.updateMany({
      where: { id: entry.id, consumed: false },
      data: { consumed: true },
    });
    if (updated.count === 0) {
      return { valid: false, message: "OTP has already been used." };
    }
  }

  return { valid: true, message: "OTP verified successfully." };
};

// ==========================================
// CLEANUP EXPIRED
// ==========================================

const cleanupExpired = async () => {
  try {
    await prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch (e) {
    // ignore
  }
};

// Periodic cleanup (unref so it doesn't keep process alive)
const cleanupInterval = setInterval(cleanupExpired, 5 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

module.exports = {
  checkCooldown,
  generateAndStoreOTP,
  verifyOTP,
};