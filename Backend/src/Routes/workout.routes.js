const express = require("express");
const router = express.Router();

const { protectRoute } = require("../Middlewares/auth.middleware");

const {
  createWorkout,
  completeWorkout,
  getWorkoutStats,
  getAllWorkouts,
  updateWorkout,
  deleteWorkout,
} = require("../Controllers/workout.controller");

const { workoutMutationLimiter } = require("../Middlewares/rateLimiter");

router.get("/stats", protectRoute, getWorkoutStats);

// Mutation routes: rate-limited per authenticated user.
router.post("/complete", protectRoute, workoutMutationLimiter, completeWorkout);

router.post(
  "/:id/complete",
  protectRoute,
  workoutMutationLimiter,
  completeWorkout,
);

router.post("/", protectRoute, workoutMutationLimiter, createWorkout);

router.get("/", protectRoute, getAllWorkouts);

router.put("/:id", protectRoute, workoutMutationLimiter, updateWorkout);

router.delete("/:id", protectRoute, workoutMutationLimiter, deleteWorkout);

module.exports = router;

