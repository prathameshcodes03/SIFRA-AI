const { prisma } = require("../data/db");
const {
  dayIndexOf,
  resolveTimeZone,
  startOfWeekIndex,
} = require("../utils/dayKey");

/**
 * The time zone the CLIENT is in.
 *
 * A streak is a calendar-day count, so it has to be evaluated in the user's
 * own day, not the server's (the server runs in UTC). The browser reports its
 * IANA zone on every request; an unknown value falls back to the server zone.
 */
const readClientTimeZone = (req) =>
  resolveTimeZone(
    req?.headers?.["x-client-timezone"] ||
      req?.query?.tz ||
      req?.body?.timezone
  );

/**
 * The day a workout was finished on.
 *
 * `completedAt` is authoritative. The fallbacks only matter for rows written
 * before the column existed: `updatedAt` is a far better estimate of the
 * completion time than `createdAt` (which is when the exercise was added to
 * the plan, possibly days earlier).
 */
const completionDateOf = (workout) =>
  workout?.completedAt || workout?.updatedAt || workout?.createdAt || null;

/**
 * Streak / weekly-goal statistics for a set of completed workouts.
 *
 * Days are compared as integer day numbers in the user's time zone, so a
 * daylight-saving change can never break or inflate a streak.
 *
 * @param {Array<object>} completedWorkouts
 * @param {Date} [now]
 * @param {string|null} [timeZone] IANA zone; null = the server's own zone
 */
const calculateStreakStats = (
  completedWorkouts,
  now = new Date(),
  timeZone = null
) => {
  if (!completedWorkouts || completedWorkouts.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDays: 0,
      weeklyGoal: 7,
      totalCompleted: 0,
    };
  }

  const zone = resolveTimeZone(timeZone);

  // One entry per calendar day the user trained on.
  const daySet = new Set();
  for (const workout of completedWorkouts) {
    const completedOn = completionDateOf(workout);
    if (!completedOn) continue;
    daySet.add(dayIndexOf(completedOn, zone));
  }

  if (daySet.size === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDays: 0,
      weeklyGoal: 7,
      totalCompleted: completedWorkouts.length,
    };
  }

  const sortedDays = Array.from(daySet).sort((a, b) => a - b);

  let bestStreak = 0;
  let runningStreak = 0;
  let previousDay = null;

  for (const day of sortedDays) {
    runningStreak = previousDay !== null && day - previousDay === 1 ? runningStreak + 1 : 1;
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
    previousDay = day;
  }

  const today = dayIndexOf(now, zone);

  // The streak is alive if the user trained today OR yesterday.
  let currentStreak = 0;
  let cursor = null;
  if (daySet.has(today)) {
    cursor = today;
  } else if (daySet.has(today - 1)) {
    cursor = today - 1;
  }

  while (cursor !== null && daySet.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  // Weekly goal: the days trained on inside the current Monday-based week.
  const weekStart = startOfWeekIndex(today);
  let weeklyCompletedDays = 0;
  for (let day = weekStart; day <= today; day += 1) {
    if (daySet.has(day)) {
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
 * Aggregate Dashboard accuracy from persisted form scores.
 *
 * Accuracy (%) = correctPredictions / totalPredictions * 100
 *
 * A "prediction" here is one SCORED FORM SAMPLE - a completed repetition whose
 * form could be judged. Repetitions that could not be judged (pose not
 * measurable, model unavailable, no network) contribute nothing and are
 * excluded from the denominator rather than counted as incorrect form.
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

    const isCompleted = Boolean(completed || false);
    const workout = await prisma.workout.create({
      data: {
        exercise,
        sets: Number(sets),
        reps: Number(reps),
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
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

    const completedAt = new Date();

    // Server-side accuracy wins: it is computed from the counters, not from a
    // client-supplied scalar. A client-supplied percentage is only used when
    // the session produced no scorable repetitions at all.
    const resolvedAccuracy =
      counts.totalPredictions > 0
        ? Math.round((counts.correctPredictions / counts.totalPredictions) * 100)
        : accuracy !== undefined && accuracy !== null
        ? Math.min(100, Math.max(0, Math.round(Number(accuracy))))
        : null;

    let workout = null;

    if (workoutId) {
      const existing = await prisma.workout.findUnique({
        where: { id: workoutId },
      });

      if (existing && existing.userId === req.user.id) {
        if (existing.completed) {
          // This workout was already finished on an EARLIER day. Re-dating it
          // would delete that day from the streak and replace it with today,
          // which is what made the streak appear to stall. The repeat session
          // is therefore stored as its own entry: the original day stays in
          // the history AND today is added.
          workout = await prisma.workout.create({
            data: {
              exercise: existing.exercise,
              sets: existing.sets,
              reps: existing.reps,
              completed: true,
              completedAt,
              totalPredictions: counts.totalPredictions,
              correctPredictions: counts.correctPredictions,
              accuracy: resolvedAccuracy ?? existing.accuracy ?? null,
              userId: req.user.id,
            },
          });
        } else {
          workout = await prisma.workout.update({
            where: { id: workoutId },
            data: {
              completed: true,
              completedAt,
              totalPredictions: counts.totalPredictions,
              correctPredictions: counts.correctPredictions,
              accuracy: resolvedAccuracy ?? existing.accuracy ?? null,
            },
          });
        }
      }
    }

    if (!workout) {
      workout = await prisma.workout.create({
        data: {
          exercise: exercise || "workout",
          sets: Number(sets || 1),
          reps: Number(reps || 10),
          completed: true,
          completedAt,
          totalPredictions: counts.totalPredictions,
          correctPredictions: counts.correctPredictions,
          accuracy: resolvedAccuracy,
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

    // The streak is counted in the USER's calendar, not the server's.
    const streakStats = calculateStreakStats(
      completedWorkouts,
      new Date(),
      readClientTimeZone(req)
    );

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

    const updateData = {
      ...(exercise !== undefined ? { exercise } : {}),
      ...(sets !== undefined ? { sets: Number(sets) } : {}),
      ...(reps !== undefined ? { reps: Number(reps) } : {}),
      ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
      ...(accuracy !== undefined ? { accuracy: Number(accuracy) } : {}),
    };

    // Handle completedAt timestamp based on completion status change
    if (completed !== undefined) {
      const isNowCompleted = Boolean(completed);
      if (isNowCompleted && !workout.completed) {
        // Marking as completed for the first time
        updateData.completedAt = new Date();
      } else if (!isNowCompleted && workout.completed) {
        // Marking as incomplete - clear completedAt
        updateData.completedAt = null;
      }
      // If status unchanged, preserve existing completedAt
    }

    const updatedWorkout = await prisma.workout.update({
      where: { id },
      data: updateData,
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
  calculateStreakStats,
  completionDateOf,
  readClientTimeZone,
};

