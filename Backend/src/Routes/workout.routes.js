const express = require('express');
const router = express.Router();


const { protectRoute } = require("../Middlewares/auth.middleware");

const {
  createWorkout,
  getAllWorkouts,
  updateWorkout,
  deleteWorkout,
} = require('../Controllers/workout.controller');






router.post("/",protectRoute, createWorkout);

router.get("/", protectRoute, getAllWorkouts);

router.put("/:id",protectRoute, updateWorkout);

router.delete("/:id", protectRoute, deleteWorkout);

module.exports = router;

