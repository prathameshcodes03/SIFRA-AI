const { prisma } = require("../data/db");

// Create Workout
const createWorkout = async (req, res) => {
  try {
    const { exercise, sets, reps } = req.body;

    if (!exercise || !sets || !reps) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const workout = await prisma.workout.create({
      data: {
        exercise,
        sets: Number(sets),
        reps: Number(reps),
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Workout added successfully.",
      workout,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

// Get All Workouts of Logged In User
const getAllWorkouts = async (req, res) => {
  try {
   
    const workouts = await prisma.workout.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      workouts,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

// Update Workout
const updateWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const { exercise, sets, reps } = req.body;

    const workout = await prisma.workout.findUnique({
      where: { id },
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: "Workout not found.",
      });
    }

    if (workout.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const updatedWorkout = await prisma.workout.update({
      where: { id },
      data: {
        exercise,
        sets: Number(sets),
        reps: Number(reps),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Workout updated successfully.",
      workout: updatedWorkout,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

// Delete Workout
const deleteWorkout = async (req, res) => {
  try {
    const { id } = req.params;

    const workout = await prisma.workout.findUnique({
      where: { id },
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: "Workout not found.",
      });
    }

    if (workout.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    await prisma.workout.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Workout deleted successfully.",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

module.exports = {
  createWorkout,
  getAllWorkouts,
  updateWorkout,
  deleteWorkout,
};