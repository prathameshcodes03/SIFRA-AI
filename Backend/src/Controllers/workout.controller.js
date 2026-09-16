const { prisma } = require("../data/db");

const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateStreakStats = (completedWorkouts) => {
  if (!completedWorkouts || completedWorkouts.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDays: 0,
      weeklyGoal: 7,
      totalCompleted: 0,
    };
  }

  const dateSet = new Set(
    completedWorkouts.map((w) => formatDateKey(w.updatedAt || w.createdAt))
  );

  const sortedDates = Array.from(dateSet).sort();

  let bestStreak = 0;
  let runningStreak = 0;
  let prevDateObj = null;

  for (const dateStr of sortedDates) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const currentDateObj = new Date(y, m - 1, d);

    if (prevDateObj) {
      const diffMs = currentDateObj.getTime() - prevDateObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }
    } else {
      runningStreak = 1;
    }

    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }

    prevDateObj = currentDateObj;
  }

  const now = new Date();
  const todayKey = formatDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  let currentStreak = 0;
  let checkDate = null;

  if (dateSet.has(todayKey)) {
    checkDate = new Date(now);
  } else if (dateSet.has(yesterdayKey)) {
    checkDate = yesterday;
  }

  if (checkDate) {
    while (true) {
      const key = formatDateKey(checkDate);
      if (dateSet.has(key)) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  let weeklyCompletedDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    if (d > now && formatDateKey(d) !== todayKey) break;
    if (dateSet.has(formatDateKey(d))) {
      weeklyCompletedDays += 1;
    }
  }

  return {
    currentStreak,
    bestStreak,
    completedDays: weeklyCompletedDays,
    weeklyGoal: 7,
    totalCompleted: completedWorkouts.length,
  };
};

// Create Workout
const createWorkout = async (req, res) => {
  try {
    const { exercise, sets, reps, completed, accuracy } = req.body;

    if (!exercise || sets === undefined || reps === undefined) {
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
        completed: Boolean(completed || false),
        accuracy:
          accuracy !== undefined && accuracy !== null
            ? Number(accuracy)
            : null,
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

// Complete a Workout (or record a completed workout)
const completeWorkout = async (req, res) => {
  try {
    const workoutId = req.params.id || req.body.workoutId;
    const { exercise, sets, reps, accuracy } = req.body;

    let workout = null;

    if (workoutId) {
      const existing = await prisma.workout.findUnique({
        where: { id: workoutId },
      });

      if (existing && existing.userId === req.user.id) {
        workout = await prisma.workout.update({
          where: { id: workoutId },
          data: {
            completed: true,
            accuracy:
              accuracy !== undefined && accuracy !== null
                ? Math.min(100, Math.max(0, Math.round(Number(accuracy))))
                : existing.accuracy || 100,
            updatedAt: new Date(),
          },
        });
      }
    }

    if (!workout) {
      workout = await prisma.workout.create({
        data: {
          exercise: exercise || "workout",
          sets: Number(sets || 1),
          reps: Number(reps || 10),
          completed: true,
          accuracy:
            accuracy !== undefined && accuracy !== null
              ? Math.min(100, Math.max(0, Math.round(Number(accuracy))))
              : 100,
          userId: req.user.id,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workout completed successfully.",
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

// Get Workout Stats (Accuracy, Streak, Goal)
const getWorkoutStats = async (req, res) => {
  try {
    const completedWorkouts = await prisma.workout.findMany({
      where: {
        userId: req.user.id,
        completed: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const streakStats = calculateStreakStats(completedWorkouts);

    const workoutsWithAccuracy = completedWorkouts.filter(
      (w) => typeof w.accuracy === "number" && !isNaN(w.accuracy)
    );

    const overallAccuracy =
      workoutsWithAccuracy.length > 0
        ? Math.round(
            workoutsWithAccuracy.reduce((sum, w) => sum + w.accuracy, 0) /
              workoutsWithAccuracy.length
          )
        : 0;

    return res.status(200).json({
      success: true,
      stats: {
        accuracy: overallAccuracy,
        currentStreak: streakStats.currentStreak,
        bestStreak: streakStats.bestStreak,
        completedDays: streakStats.completedDays,
        weeklyGoal: streakStats.weeklyGoal,
        totalCompleted: streakStats.totalCompleted,
      },
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
    const { exercise, sets, reps, completed, accuracy } = req.body;

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
        ...(exercise !== undefined ? { exercise } : {}),
        ...(sets !== undefined ? { sets: Number(sets) } : {}),
        ...(reps !== undefined ? { reps: Number(reps) } : {}),
        ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
        ...(accuracy !== undefined ? { accuracy: Number(accuracy) } : {}),
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
  completeWorkout,
  getWorkoutStats,
  getAllWorkouts,
  updateWorkout,
  deleteWorkout,
};

