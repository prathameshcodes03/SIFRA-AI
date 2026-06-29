const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser
} = require("../controllers/auth.controller");

const {
    validateRegisterUser,
    validateLoginUser
} = require("../Middlewares/auth.middleware");

router.post("/register", validateRegisterUser, registerUser);
router.post("/login", validateLoginUser, loginUser);

module.exports = router;