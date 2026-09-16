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

router.get("/stats", protectRoute, getWorkoutStats);

router.post("/complete", protectRoute, completeWorkout);

router.post("/:id/complete", protectRoute, completeWorkout);

router.post("/", protectRoute, createWorkout);

router.get("/", protectRoute, getAllWorkouts);

router.put("/:id", protectRoute, updateWorkout);

router.delete("/:id", protectRoute, deleteWorkout);

module.exports = router;

