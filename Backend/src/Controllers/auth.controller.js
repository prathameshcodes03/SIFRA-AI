const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../data/db");
const { sendOtpEmail } = require("../Services/mail.service");
const { checkCooldown, generateAndStoreOTP, verifyOTP } = require("../Services/otp.service");

const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

const logAuthError = (operation, error) => {
  console.error(`${operation} ERROR:`, {
    name: error.name,
    code: error.code,
    message: error.message,
    meta: error.meta,
  });
};

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });
    } catch (dbError) {
      console.warn("DB lookup notice during sendOTP (proceeding with generation):", dbError.message);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
      });
    }

    const cooldown = checkCooldown(email);
    if (!cooldown.allowed) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldown.remainingSeconds}s before requesting another OTP.`,
        remainingSeconds: cooldown.remainingSeconds,
      });
    }

    const otp = generateAndStoreOTP(email);
    const emailResult = await sendOtpEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: emailResult?.simulated
        ? "Verification code generated! (Check terminal console for dev code)"
        : "Verification code sent to your email.",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    logAuthError("SEND OTP", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send verification code.",
    });
  }
};

const verifyOTPController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const result = verifyOTP(email, otp, false);
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

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, age, gender, weight, otp } = req.body;

    // Verify and consume OTP
    const otpResult = verifyOTP(email, otp, true);
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        age,
        gender,
        weight,
      },
    });

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
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};




const loginUser = async (req, res) => {
  try {
    console.log("LOGIN: request reached login controller");

    const { email, password } = req.body;
    console.log("LOGIN: email received", { email });

    console.log("LOGIN: user lookup started");

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      console.log("LOGIN: user not found");
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    console.log("LOGIN: user found", { userId: user.id });
    console.log("LOGIN: password comparison started");
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("LOGIN: password comparison result", { isMatch });

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    console.log("LOGIN: JWT generation started");
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d",
      },
    );

    const { password: _, ...userData } = user;

    console.log("LOGIN: cookie creation started");
    res.cookie("token", token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("LOGIN: response sent", { status: 200, userId: user.id });

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

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", cookieOptions);

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

    const { password, ...userData } = user;

    return res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    logAuthError("GET CURRENT USER", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


// Get logged-in user's profile
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
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};


// Update logged-in user's profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, age, gender, weight } = req.body;

    if (!fullName || !age || !gender || weight === undefined) {
      return res.status(400).json({
        success: false,
        message: "All profile fields are required.",
      });
    }

    const updatedUser = await prisma.user.update({
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
      message: "Profile updated successfully.",
      user: updatedUser,
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};




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
