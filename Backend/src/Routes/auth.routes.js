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

router.post(
  "/send-otp",
  validateSendOTP,
  sendOTP
);

router.post(
  "/verify-otp",
  verifyOTPController
);

router.post(
  "/register",
  validateRegisterUser,
  registerUser
);

router.post(
  "/login",
  validateLoginUser,
  loginUser
);

router.post(
  "/logout",
  logoutUser
);

router.get(
  "/me",
  protectRoute,
  getCurrentUser
);

module.exports = router;