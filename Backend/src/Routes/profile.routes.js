const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  uploadProfileImage,
} = require("../Controllers/profile.controller");

const { protectRoute } = require("../Middlewares/auth.middleware");

const upload = require("../Middlewares/upload.middleware");

// GET PROFILE
router.get("/", protectRoute, getProfile);

// UPDATE PROFILE DETAILS
router.put("/", protectRoute, updateProfile);

// UPDATE PROFILE IMAGE
router.post(
  "/image",
  protectRoute,
  upload.single("profileImage"),
  uploadProfileImage
);

module.exports = router;