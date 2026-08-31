const express = require("express");
const router = express.Router();

const {
   registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
    getProfile,
  updateProfile,
} = require("../Controllers/auth.controller");


const {
  validateRegisterUser,
  validateLoginUser,
  protectRoute,
} = require("../Middlewares/auth.middleware");



router.post("/register", validateRegisterUser, registerUser);

router.post("/login", validateLoginUser, loginUser);

router.post("/logout", logoutUser);

router.get("/me", protectRoute, getCurrentUser);


router.get("/profile", protectRoute, getProfile);

router.put("/profile", protectRoute, updateProfile);

module.exports = router;
