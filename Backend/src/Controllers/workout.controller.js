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
    completedWorkouts.map((w) => formatDateKey(w.completedAt || w.createdAt))
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

// Normalise prediction counters supplied by the client.
// Non-finite / negative values are clamped so a bad payload cannot poison
// the aggregate Dashboard accuracy.
const normaliseCounts = (total, correct) => {
  const totalCount = Number.isFinite(Number(total)) ? Math.max(0, Math.trunc(Number(total))) : 0;
  const correctCount = Number.isFinite(Number(correct)) ? Math.max(0, Math.trunc(Number(correct))) : 0;
  return {
    totalPredictions: totalCount,
    correctPredictions: Math.min(correctCount, totalCount),
  };
};

/**
 * Aggregate Dashboard accuracy from persisted prediction counts.
 *
 * Accuracy (%) = correctPredictions / totalPredictions * 100
 *
 * Only genuine model classifications contribute. Rows with zero predictions
 * (network failure, invalid payload, unavailable model) are excluded from the
 * denominator rather than counted as incorrect form.
 *
 * @param {Array<{totalPredictions?:number, correctPredictions?:number}>} workouts
 * @returns {{accuracy:number|null, hasAccuracyData:boolean, totalPredictions:number, correctPredictions:number}}
 */
const summariseAccuracy = (workouts = []) => {
  let totalPredictions = 0;
  let correctPredictions = 0;

  for (const workout of workouts) {
    const total = Number(workout?.totalPredictions);
    const correct = Number(workout?.correctPredictions);

    if (!Number.isFinite(total) || total <= 0) continue;

    totalPredictions += Math.trunc(total);
    const boundedCorrect = Number.isFinite(correct)
      ? Math.min(Math.max(0, Math.trunc(correct)), Math.trunc(total))
      : 0;
    correctPredictions += boundedCorrect;
  }

  const hasAccuracyData = totalPredictions > 0;

  return {
    accuracy: hasAccuracyData
      ? Math.round((correctPredictions / totalPredictions) * 100)
      : null,
    hasAccuracyData,
    totalPredictions,
    correctPredictions,
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
    const counts = normaliseCounts(
      req.body.totalPredictions,
      req.body.correctPredictions
    );

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
            completedAt: new Date(),
            totalPredictions: counts.totalPredictions,
            correctPredictions: counts.correctPredictions,
            accuracy:
              counts.totalPredictions > 0
                ? Math.round(
                    (counts.correctPredictions / counts.totalPredictions) * 100
                  )
                : accuracy !== undefined && accuracy !== null
                ? Math.min(100, Math.max(0, Math.round(Number(accuracy))))
                : existing.accuracy || null,
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
          completedAt: new Date(),
          totalPredictions: counts.totalPredictions,
          correctPredictions: counts.correctPredictions,
          accuracy:
            counts.totalPredictions > 0
              ? Math.round(
                  (counts.correctPredictions / counts.totalPredictions) * 100
                )
              : accuracy !== undefined && accuracy !== null
              ? Math.min(100, Math.max(0, Math.round(Number(accuracy))))
              : null,
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

    const {
      accuracy: overallAccuracy,
      hasAccuracyData,
      totalPredictions,
      correctPredictions,
    } = summariseAccuracy(completedWorkouts);

    return res.status(200).json({
      success: true,
      stats: {
        accuracy: overallAccuracy,
        hasAccuracyData,
        totalPredictions,
        correctPredictions,
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
  summariseAccuracy,
  normaliseCounts,
};

