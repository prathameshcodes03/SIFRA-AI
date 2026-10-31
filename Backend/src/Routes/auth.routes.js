const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOTPController,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} = require("../Controllers/auth.controller");

const {
  validateSendOTP,
  validateRegisterUser,
  validateLoginUser,
  protectRoute,
} = require("../Middlewares/auth.middleware");

const {
  loginLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
  registerLimiter,
} = require("../Middlewares/rateLimiter");

// ==========================================
// AUTH & OTP
// ==========================================

// SEND OTP
router.post(
  "/send-otp",
  sendOtpLimiter,
  validateSendOTP,
  sendOTP
);

// VERIFY OTP
router.post(
  "/verify-otp",
  verifyOtpLimiter,
  verifyOTPController
);

// REGISTER
router.post(
  "/register",
  registerLimiter,
  validateRegisterUser,
  registerUser
);

// LOGIN
router.post(
  "/login",
  loginLimiter,
  validateLoginUser,
  loginUser
);

// LOGOUT
router.post(
  "/logout",
  logoutUser
);

// CURRENT USER
router.get(
  "/me",
  protectRoute,
  getCurrentUser
);

// FORGOT PASSWORD
router.post(
  "/forgot-password",
  sendOtpLimiter,
  forgotPassword
);

// RESET PASSWORD
router.post(
  "/reset-password",
  resetPassword
);

module.exports = router;