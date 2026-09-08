const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOTPController,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} = require("../Controllers/auth.controller");

const {
  validateSendOTP,
  validateRegisterUser,
  validateLoginUser,
  protectRoute,
} = require("../Middlewares/auth.middleware");

// ==========================================
// AUTH & OTP
// ==========================================

// SEND OTP
router.post(
  "/send-otp",
  validateSendOTP,
  sendOTP
);

// VERIFY OTP
router.post(
  "/verify-otp",
  verifyOTPController
);

// REGISTER
router.post(
  "/register",
  validateRegisterUser,
  registerUser
);

// LOGIN
router.post(
  "/login",
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

module.exports = router;