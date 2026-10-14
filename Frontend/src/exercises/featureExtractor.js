import { calculateAngle } from "../mathematics/angles";
import { POSE_LANDMARKS } from "../mediapipe/poseLandmarks";
import { getLandmark } from "../mediapipe/poseUtils";

export function extractExerciseFeatures(landmarks, exercise = "squat") {
  if (!landmarks || landmarks.length === 0) return null;

  const leftShoulder = getLandmark(landmarks, POSE_LANDMARKS.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER);
  const leftElbow = getLandmark(landmarks, POSE_LANDMARKS.LEFT_ELBOW);
  const rightElbow = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_ELBOW);
  const leftWrist = getLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST);
  const rightWrist = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_WRIST);
  const leftHip = getLandmark(landmarks, POSE_LANDMARKS.LEFT_HIP);
  const rightHip = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_HIP);
  const leftKnee = getLandmark(landmarks, POSE_LANDMARKS.LEFT_KNEE);
  const rightKnee = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_KNEE);
  const leftAnkle = getLandmark(landmarks, POSE_LANDMARKS.LEFT_ANKLE);
  const rightAnkle = getLandmark(landmarks, POSE_LANDMARKS.RIGHT_ANKLE);

  // Check if at least one side is visible
  const hasLeft = leftShoulder && leftHip;
  const hasRight = rightShoulder && rightHip;
  if (!hasLeft && !hasRight) {
    return null;
  }

  // Calculate left side angles
  const leftKneeAngle =
    leftHip && leftKnee && leftAnkle
      ? calculateAngle(leftHip, leftKnee, leftAnkle)
      : 90;

  const leftElbowAngle =
    leftShoulder && leftElbow && leftWrist
      ? calculateAngle(leftShoulder, leftElbow, leftWrist)
      : 90;

  const leftHipAngle =
    leftShoulder && leftHip && leftKnee
      ? calculateAngle(leftShoulder, leftHip, leftKnee)
      : 90;

  const leftBodyAngle =
    leftShoulder && leftHip && leftAnkle
      ? calculateAngle(leftShoulder, leftHip, leftAnkle)
      : 165;

  // Calculate right side angles
  const rightKneeAngle =
    rightHip && rightKnee && rightAnkle
      ? calculateAngle(rightHip, rightKnee, rightAnkle)
      : leftKneeAngle;

  const rightElbowAngle =
    rightShoulder && rightElbow && rightWrist
      ? calculateAngle(rightShoulder, rightElbow, rightWrist)
      : leftElbowAngle;

  const rightHipAngle =
    rightShoulder && rightHip && rightKnee
      ? calculateAngle(rightShoulder, rightHip, rightKnee)
      : leftHipAngle;

  const rightBodyAngle =
    rightShoulder && rightHip && rightAnkle
      ? calculateAngle(rightShoulder, rightHip, rightAnkle)
      : leftBodyAngle;

  const leftVis = hasLeft
    ? ((leftShoulder?.visibility || 0.9) +
        (leftHip?.visibility || 0.9) +
        (leftKnee?.visibility || 0.9)) /
      3
    : 0;

  const rightVis = hasRight
    ? ((rightShoulder?.visibility || 0.9) +
        (rightHip?.visibility || 0.9) +
        (rightKnee?.visibility || 0.9)) /
      3
    : 0;

  const useLeft = leftVis >= rightVis;

  const kneeAngle = useLeft ? leftKneeAngle : rightKneeAngle;
  const elbowAngle = useLeft ? leftElbowAngle : rightElbowAngle;
  const hipAngle = useLeft ? leftHipAngle : rightHipAngle;
  const bodyAngle = useLeft ? leftBodyAngle : rightBodyAngle;

  // Calculate symmetry score (0.0 to 1.0)
  const kneeDiff = Math.abs(leftKneeAngle - rightKneeAngle) / 180;
  const hipDiff = Math.abs(leftHipAngle - rightHipAngle) / 180;
  const symmetryScore = Math.max(0, Math.min(1, 1 - (kneeDiff + hipDiff) / 2));

  // Measured left/right difference in DEGREES, before it is squashed into the
  // 0-1 symmetry score. `symmetry_score` alone cannot distinguish a genuinely
  // collapsed knee from ordinary side-to-side variation - both lower it - so
  // the caving check needs the raw magnitude.
  const kneeAsymmetry = Math.abs(leftKneeAngle - rightKneeAngle);
  const hipAsymmetry = Math.abs(leftHipAngle - rightHipAngle);

  // Overall landmark visibility
  const avgVisibility = Math.max(0.7, Math.min(1.0, Math.max(leftVis, rightVis)));

  const normalizedExercise = exercise.trim().toLowerCase();

  return {
    exercise: normalizedExercise,
    knee_angle: Number(kneeAngle.toFixed(2)),
    elbow_angle: Number(elbowAngle.toFixed(2)),
    hip_angle: Number(hipAngle.toFixed(2)),
    body_angle: Number(bodyAngle.toFixed(2)),
    symmetry_score: Number(symmetryScore.toFixed(3)),
    landmark_visibility: Number(avgVisibility.toFixed(3)),
    // Diagnostic only: ignored by /predict, used to judge knees caving.
    knee_asymmetry: Number(kneeAsymmetry.toFixed(2)),
    hip_asymmetry: Number(hipAsymmetry.toFixed(2)),
  };
}

/**
 * Raw pose reliability derived directly from landmarks.
 *
 * Deliberately separate from `landmark_visibility`, which is clamped to a
 * minimum of 0.7 before being sent to the model (see extractExerciseFeatures).
 * That clamp keeps the model input stable, but it also hides a genuinely
 * unusable pose, which is why coaching previously had to be suppressed for it.
 * Used only to decide whether to coach at all; the /predict payload is
 * unchanged.
 */
export function getPoseReliability(landmarks) {
  if (!landmarks || landmarks.length === 0) return 0;

  const critical = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE,
    POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
  ];

  let sum = 0;
  let count = 0;

  for (const index of critical) {
    const point = landmarks[index];
    if (!point) continue;
    sum += typeof point.visibility === "number" ? point.visibility : 0.9;
    count += 1;
  }

  if (count === 0) return 0;

  return sum / count;
}

export function evaluateFormRuleBased(features) {
  // No usable features must NOT be reported as good form.
  if (!features) return null;
  const { exercise, knee_angle, elbow_angle, hip_angle, body_angle, symmetry_score } = features;

  if (exercise === "squat") {
    if (symmetry_score < 0.75) return "knees_caving";
    if (body_angle < 148 || hip_angle < 75) return "forward_lean";
    if (knee_angle > 110) return "shallow";
    return "correct";
  }

  if (exercise === "pushup") {
    if (elbow_angle > 105) return "pushup_elbow_flare";
    if (body_angle < 158 && hip_angle < 158) return "pushup_body_sag";
    if (hip_angle < 162 && body_angle >= 160) return "pushup_hips_high";
    return "pushup_correct";
  }

  if (exercise === "plank") {
    if (hip_angle < 156 && body_angle < 156) return "plank_hips_low";
    if (hip_angle < 165) return "plank_hips_high";
    return "plank_correct";
  }

  return "correct";
}

/**
 * Coaching copy. Wording is intentionally bounded so the coach never implies
 * that a deeper squat is always better - depth should suit the user's own
 * comfortable mobility.
 */
export const COACHING_MESSAGES = {
  correct: "Good squat. Keep going.",
  shallow: "Lower into a comfortable squat depth.",
  forward_lean: "Keep your chest more upright.",
  knees_caving: "Keep your knees aligned with your toes.",
  pushup_correct: "Good push-up form. Keep going.",
  pushup_elbow_flare: "Keep your elbows closer to your body.",
  pushup_body_sag: "Keep your body straight.",
  pushup_hips_high: "Bring your hips down into a straight line.",
  plank_correct: "Great plank. Keep holding.",
  plank_hips_high: "Lower your hips slightly.",
  plank_hips_low: "Raise your hips slightly.",
  pose_unreliable: "I can't see you clearly. Step back and make sure your full body is in frame.",
};

export function getFeedbackForPrediction(prediction) {
  if (!prediction) return null;
  return COACHING_MESSAGES[prediction] || null;
}

