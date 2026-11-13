const express = require("express");
const {
  predictWorkoutForm,
} = require("../Controllers/formPrediction.controller");

const { mlPredictionLimiter } = require("../Middlewares/rateLimiter");

const router = express.Router();

router.post("/predict", mlPredictionLimiter, predictWorkoutForm);

module.exports = router;

