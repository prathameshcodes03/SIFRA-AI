const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { prisma } = require("../data/db");

const { sendOtpEmail } = require("../Services/mail.service");

const {
  checkCooldown,
  generateAndStoreOTP,
  verifyOTP,
} = require("../Services/otp.service");

// ==========================================
// COOKIE CONFIGURATION
// ==========================================

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

// ==========================================
// ERROR LOGGER
// ==========================================

const logAuthError = (operation, error) => {
  console.error(`${operation} ERROR:`, {
    name: error.name,
    code: error.code,
    message: error.message,
    meta: error.meta,
  });
};

// ==========================================
// SEND OTP
// ==========================================

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ==========================================
    // CHECK IF USER ALREADY EXISTS
    // ==========================================

    let existingUser = null;

    try {
      existingUser = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });
    } catch (dbError) {
      console.warn(
        "DB lookup notice during sendOTP:",
        dbError.message
      );
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "An account with this email already exists. Please log in.",
      });
    }

    // ==========================================
    // CHECK OTP COOLDOWN
    // ==========================================

    const cooldown = checkCooldown(normalizedEmail);

    if (!cooldown.allowed) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldown.remainingSeconds}s before requesting another OTP.`,
        remainingSeconds: cooldown.remainingSeconds,
      });
    }

    // ==========================================
    // GENERATE OTP
    // ==========================================

    const otp = generateAndStoreOTP(normalizedEmail);

    // ==========================================
    // SEND OTP EMAIL
    // ==========================================

    const emailResult = await sendOtpEmail(
      normalizedEmail,
      otp
    );

    // IMPORTANT:
    // Only return success if email was actually sent.

    if (!emailResult || !emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please try again.",
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Verification code sent to your email! Please check your inbox.",
    });

  } catch (error) {
    logAuthError("SEND OTP", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send verification code.",
    });
  }
};

// ==========================================
// VERIFY OTP
// ==========================================

const verifyOTPController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = verifyOTP(
      normalizedEmail,
      otp,
      false
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });

  } catch (error) {
    logAuthError("VERIFY OTP", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed.",
    });
  }
};

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      age,
      gender,
      weight,
      otp,
    } = req.body;

    if (!fullName || !email || !password || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Required registration fields are missing.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ==========================================
    // VERIFY AND CONSUME OTP
    // ==========================================

    const otpResult = verifyOTP(
      normalizedEmail,
      otp,
      true
    );

    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists.",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        age: Number(age),
        gender,
        weight: Number(weight),
      },
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message: "User Registered Successfully",

      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        weight: user.weight,
      },
    });

  } catch (error) {
    logAuthError("REGISTER", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

const loginUser = async (req, res) => {
  try {
    console.log(
      "LOGIN: request reached login controller"
    );

    const { email, password } = req.body;

    console.log("LOGIN: email received", {
      email,
    });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    console.log(
      "LOGIN: user lookup started"
    );

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      console.log(
        "LOGIN: user not found"
      );

      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    console.log("LOGIN: user found", {
      userId: user.id,
    });

    console.log(
      "LOGIN: password comparison started"
    );

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    console.log(
      "LOGIN: password comparison result",
      {
        isMatch,
      }
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    // ==========================================
    // JWT
    // ==========================================

    console.log(
      "LOGIN: JWT generation started"
    );

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Remove password from response
    const { password: _, ...userData } = user;

    // ==========================================
    // COOKIE
    // ==========================================

    console.log(
      "LOGIN: cookie creation started"
    );

    res.cookie("token", token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("LOGIN: response sent", {
      status: 200,
      userId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Login Successful",

      token,

      user: userData,
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// LOGOUT
// ==========================================

const logoutUser = async (req, res) => {
  try {
    res.clearCookie(
      "token",
      cookieOptions
    );

    return res.status(200).json({
      success: true,
      message: "Logout Successful",
    });

  } catch (error) {
    logAuthError("LOGOUT", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      password,
      ...userData
    } = user;

    return res.status(200).json({
      success: true,
      user: userData,
    });

  } catch (error) {
    logAuthError(
      "GET CURRENT USER",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET PROFILE
// ==========================================

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        age: true,
        gender: true,
        weight: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error(
      "GET PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

// ==========================================
// UPDATE PROFILE
// ==========================================

const updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      age,
      gender,
      weight,
    } = req.body;

    if (
      !fullName ||
      !age ||
      !gender ||
      weight === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All profile fields are required.",
      });
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: req.user.id,
        },

        data: {
          fullName: fullName.trim(),
          age: Number(age),
          gender,
          weight: Number(weight),
        },

        select: {
          id: true,
          fullName: true,
          email: true,
          age: true,
          gender: true,
          weight: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      user: updatedUser,
    });

  } catch (error) {
    console.error(
      "UPDATE PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  sendOTP,
  verifyOTPController,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getProfile,
  updateProfile,
};