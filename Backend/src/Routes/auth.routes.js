const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
} = require("../Controllers/auth.controller");

const {
    validateRegisterUser,
    validateLoginUser,
    protectRoute,
} = require("../Middlewares/auth.middleware");


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