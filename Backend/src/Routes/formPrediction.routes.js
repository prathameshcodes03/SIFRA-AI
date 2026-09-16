const express = require("express");
const {
  predictWorkoutForm,
} = require("../Controllers/formPrediction.controller");

const router = express.Router();

router.post("/predict", predictWorkoutForm);

module.exports = router;

