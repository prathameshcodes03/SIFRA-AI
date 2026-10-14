const {
  MlServiceError,
  requestFormPrediction,
} = require("../Services/ml.service");

const SUPPORTED_EXERCISES = new Set(["squat", "pushup", "plank"]);
const ANGLE_FIELDS = ["knee_angle", "elbow_angle", "hip_angle", "body_angle"];
const SCORE_FIELDS = ["symmetry_score", "landmark_visibility"];

const validatePredictionFeatures = (body) => {
  if (!body || typeof body !== "object") {
    return { error: "A JSON prediction payload is required." };
  }

  const exercise = String(body.exercise || "").trim().toLowerCase();
  if (!SUPPORTED_EXERCISES.has(exercise)) {
    return {
      error: "Exercise must be one of: squat, pushup, or plank.",
    };
  }

  const features = { exercise };

  for (const field of ANGLE_FIELDS) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { error: `${field} must be a finite number.` };
    }

    if (value < 0 || value > 360) {
      return { error: `${field} must be between 0 and 360.` };
    }

    features[field] = value;
  }

  for (const field of SCORE_FIELDS) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { error: `${field} must be a finite number.` };
    }

    if (value < 0 || value > 1) {
      return { error: `${field} must be between 0 and 1.` };
    }

    features[field] = value;
  }

  return { features };
};

const predictWorkoutForm = async (req, res) => {
  const validation = validatePredictionFeatures(req.body);
  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    // Prediction label is returned exactly as produced by the trained model.
    const prediction = await requestFormPrediction(validation.features);

    return res.status(200).json({
      success: true,
      exercise: validation.features.exercise,
      prediction,
    });
  } catch (error) {
    if (error instanceof MlServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("FORM PREDICTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to complete form prediction.",
    });
  }
};

module.exports = {
  predictWorkoutForm,
};
