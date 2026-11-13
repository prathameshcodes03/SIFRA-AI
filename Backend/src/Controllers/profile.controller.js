const { prisma } = require("../data/db");
const { getImageKit } = require("../Services/imagekit.service");

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
      age === undefined ||
      age === null ||
      !gender ||
      weight === undefined ||
      weight === null
    ) {
      return res.status(400).json({
        success: false,
        message: "All profile fields are required.",
      });
    }

    const trimmedName = String(fullName).trim();

    if (!trimmedName || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 1 and 100 characters.",
      });
    }

    const normalizedGender = String(gender).trim().toUpperCase();
    if (!["MALE", "FEMALE", "OTHER"].includes(normalizedGender)) {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male, Female, or Other.",
      });
    }

    const numericAge = Number(age);
    const numericWeight = Number(weight);

    if (
      !Number.isInteger(numericAge) ||
      numericAge < 10 ||
      numericAge > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Age must be an integer between 10 and 100.",
      });
    }

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight < 20 ||
      numericWeight > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Weight must be a number between 20 and 300 kg.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        fullName: trimmedName,
        age: numericAge,
        gender: normalizedGender,
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

    const result = await getImageKit().upload({
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