const { prisma } = require("../data/db");
const imagekit = require("../Services/imagekit.service");

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
        profileImage: true,
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
        message: "All profile fields are required.",
      });
    }

    const numericAge = Number(age);
    const numericWeight = Number(weight);

    if (
      !Number.isFinite(numericAge) ||
      !Number.isFinite(numericWeight)
    ) {
      return res.status(400).json({
        success: false,
        message: "Age and weight must be valid numbers.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        fullName: fullName.trim(),
        age: numericAge,
        gender,
        weight: numericWeight,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        age: true,
        gender: true,
        weight: true,
        profileImage: true,
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

// ==========================================
// UPLOAD PROFILE IMAGE
// ==========================================

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded.",
      });
    }

    console.log(
      "PROFILE IMAGE RECEIVED:",
      req.file.originalname
    );

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: `profile-${req.user.id}-${Date.now()}`,
      folder: "/sifra/profile-images",
    });

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        profileImage: result.url,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        age: true,
        gender: true,
        weight: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "PROFILE IMAGE UPLOAD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to upload profile image.",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
};