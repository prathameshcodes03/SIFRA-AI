const rateLimit = require("express-rate-limit");

const authLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  ...authLimiterOptions,
});

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  ...authLimiterOptions,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  ...authLimiterOptions,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  ...authLimiterOptions,
});

module.exports = {
  loginLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
  registerLimiter,
};