const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../data/db");

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

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, age, gender, weight } = req.body;

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
        age: Number(age),
        gender,
        weight: Number(weight),
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

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
};
