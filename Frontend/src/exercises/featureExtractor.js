import { calculateAngle } from "../mathematics/angles";
import { POSE_LANDMARKS } from "../mediapipe/poseLandmarks";
import { getLandmark } from "../mediapipe/poseUtils";
import { PUSHUP_MAX_TRAINED_ELBOW } from "./modelSupport";

/**
 * Angle extraction for coaching and rep tracking.
 *
 * CRITICAL RULE: an angle that was not actually measured is NEVER allowed to
 * look like a real one.
 *
 * The previous version substituted hard-coded fallbacks (knee 90, elbow 90,
 * hip 90, body 165) whenever a landmark was missing, and scored each side's
 * visibility with `landmark?.visibility || 0.9`, so a MISSING landmark scored
 * 0.9 instead of 0. Two things followed, both reproduced in tests:
 *
 *  1. A side whose knee/ankle were missing out-scored a complete side and won
 *     the left/right vote, so the missing side's fabricated 90 deg was used.
 *  2. That 90 deg sits BELOW the squat `down` threshold (110), which drove the
 *     rep tracker into the descending phase. When the pose recovered, the
 *     tracker saw a return to standing and counted a repetition - while the
 *     user had not moved at all.
 *
 * `measured` now records which angles are real. Rep tracking and form
 * assessment refuse to act on anything else.
 */

/** A joint angle below this is degenerate, not a measurement. */
const MIN_PLAUSIBLE_ANGLE = 1;

/**
 * How far the body leans away from the horizontal plane.
 *
 * The angles above CANNOT tell a plank from a push-up from standing: a
 * standing person and a person lying flat on the floor both have a perfectly
 * straight shoulder-hip-ankle line, so `body_angle` is 180 for all of them.
 * The orientation of the body is the missing piece, and it is what decides
 * whether the user is actually in a plank (or doing a push-up) at all.
 *
 * It is measured in the pseudo-3D landmark space, so it stays meaningful
 * whatever the camera angle: a body seen from the side is horizontal in the
 * image, a body seen head-on points away from the camera (and is therefore
 * horizontal in 3D), and a standing body is vertical in both.
 *
 * 0 = perfectly horizontal, 90 = perfectly vertical.
 */
const bodyTiltOf = (shoulder, ankle) => {
  if (!shoulder || !ankle) return null;

  const dx = (ankle.x ?? 0) - (shoulder.x ?? 0);
  const dy = (ankle.y ?? 0) - (shoulder.y ?? 0);
  const dz = (ankle.z ?? 0) - (shoulder.z ?? 0);
  const horizontal = Math.hypot(dx, dz);
  if (!Number.isFinite(horizontal) || horizontal === 0) return null;

  const tilt = (Math.atan2(Math.abs(dy), horizontal) * 180) / Math.PI;
  if (!Number.isFinite(tilt)) return null;
  return tilt;
};

const angleOf = (a, b, c) => {
  if (!a || !b || !c) return null;
  const angle = calculateAngle(a, b, c);
  if (!Number.isFinite(angle) || angle <= MIN_PLAUSIBLE_ANGLE) return null;
  return angle;
};

/**
 * Real visibility. A missing landmark scores 0 and an explicit 0 stays 0 -
 * `|| 0.9` used to hide both.
 */
const visibilityOf = (point) => {
  if (!point) return 0;
  return typeof point.visibility === "number" ? point.visibility : 0;
};

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

  // A side is only usable if it has the shoulder/hip pair the tracker needs.
  const hasLeft = Boolean(leftShoulder && leftHip);
  const hasRight = Boolean(rightShoulder && rightHip);
  if (!hasLeft && !hasRight) return null;

  const side = (shoulder, hip, knee, ankle, elbow, wrist) => ({
    visibility: (visibilityOf(shoulder) + visibilityOf(hip) + visibilityOf(knee)) / 3,
    knee: angleOf(hip, knee, ankle),
    elbow: angleOf(shoulder, elbow, wrist),
    hip: angleOf(shoulder, hip, knee),
    body: angleOf(shoulder, hip, ankle),
    tilt: bodyTiltOf(shoulder, ankle),
  });

  const left = side(
    leftShoulder, leftHip, leftKnee, leftAnkle, leftElbow, leftWrist
  );
  const right = side(
    rightShoulder, rightHip, rightKnee, rightAnkle, rightElbow, rightWrist
  );

  /**
   * Pick each angle independently, from a side where it was really measured.
   * Ties go to the more visible side.
   */
  const pick = (name) => {
    const l = left[name];
    const r = right[name];
    if (l !== null && r !== null) {
      return left.visibility >= right.visibility ? { value: l, measured: true } : { value: r, measured: true };
    }
    if (l !== null) return { value: l, measured: true };
    if (r !== null) return { value: r, measured: true };
    return { value: null, measured: false };
  };

  const knee = pick("knee");
  const elbow = pick("elbow");
  const hip = pick("hip");
  const body = pick("body");
  const tilt = pick("tilt");

  const measured = {
    knee: knee.measured,
    elbow: elbow.measured,
    hip: hip.measured,
    body: body.measured,
    tilt: tilt.measured,
  };

  // Nothing at all could be measured: there is no pose to report.
  if (
    !knee.measured &&
    !elbow.measured &&
    !hip.measured &&
    !body.measured &&
    !tilt.measured
  ) {
    return null;
  }

  // Symmetry is only claimed when BOTH sides were measurable. With one side
  // missing there is no evidence of asymmetry, so it must not manufacture any.
  const bothSides = left.knee !== null && right.knee !== null;
  const symmetryScore = bothSides
    ? Math.max(
        0,
        Math.min(
          1,
          1 -
            (Math.abs(left.knee - right.knee) +
              Math.abs(left.hip - right.hip)) /
              360
        )
      )
    : 1;

  const kneeAsymmetry =
    left.knee !== null && right.knee !== null
      ? Math.abs(left.knee - right.knee)
      : 0;
  const hipAsymmetry =
    left.hip !== null && right.hip !== null
      ? Math.abs(left.hip - right.hip)
      : 0;

  // Honest, unclamped visibility for tracking decisions. The clamped value
  // below is kept only because it is the model's documented input.
  const poseVisibility = Math.max(
    hasLeft ? left.visibility : 0,
    hasRight ? right.visibility : 0
  );
  const avgVisibility = Math.max(0.7, Math.min(1.0, poseVisibility));

  const normalizedExercise = exercise.trim().toLowerCase();

  return {
    exercise: normalizedExercise,
    // Unmeasured angles keep their historical placeholders so the /predict
    // payload shape is unchanged - but `measured` stops anything from
    // believing them.
    knee_angle: Number((knee.value ?? 90).toFixed(2)),
    elbow_angle: Number((elbow.value ?? 90).toFixed(2)),
    hip_angle: Number((hip.value ?? 90).toFixed(2)),
    body_angle: Number((body.value ?? 165).toFixed(2)),
    // How far the body leans away from the horizontal plane: 0 = horizontal
    // (a plank or a push-up), 90 = vertical (standing). It is what tells
    // those two apart, because the joint angles alone cannot.
    body_tilt: tilt.measured ? Number(tilt.value.toFixed(2)) : null,
    symmetry_score: Number(symmetryScore.toFixed(3)),
    landmark_visibility: Number(avgVisibility.toFixed(3)),
    knee_asymmetry: Number(kneeAsymmetry.toFixed(2)),
    hip_asymmetry: Number(hipAsymmetry.toFixed(2)),
    pose_visibility: Number(poseVisibility.toFixed(3)),
    measured,
  };
}

/**
 * Raw pose reliability derived directly from landmarks.
 *
 * Deliberately separate from `landmark_visibility`, which is clamped to a
 * minimum of 0.7 before being sent to the model (see extractExerciseFeatures).
 * That clamp keeps the model input stable, but it also hides a genuinely
 * unusable pose, which is why coaching previously had to be suppressed for it.
 * Used only to decide whether to coach or count at all; the /predict payload is
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
    // A missing landmark is 0, not 0.9: `|| 0.9` used to report a completely
    // untracked frame as highly reliable.
    sum += visibilityOf(landmarks[index]);
    count += 1;
  }

  if (count === 0) return 0;

  return sum / count;
}

/**
 * Rule-based fallback, used only when the model returns nothing at all.
 *
 * This is the LIVE push-up/plank coach whenever the ML service is unavailable,
 * so its push-up elbow rule is bounded by the model's own training envelope:
 * `pushup_elbow_flare` tops out at 133.21deg and a locked-out arm (~175deg) is
 * outside every trained class. The previous unbounded `> 105` therefore
 * reported a flare for every straight arm.
 */
export function evaluateFormRuleBased(features) {
  // No usable features must NOT be reported as good form.
  if (!features) return null;
  const { exercise, knee_angle, elbow_angle, hip_angle, body_angle, symmetry_score } = features;

  // Never form a claim from an angle that was never measured.
  const measured = features.measured;
  if (measured && measured[exercise === "pushup" ? "elbow" : "knee"] === false) {
    return null;
  }

  if (exercise === "squat") {
    if (symmetry_score < 0.75) return "knees_caving";
    if (body_angle < 148 || hip_angle < 75) return "forward_lean";
    if (knee_angle > 110) return "shallow";
    return "correct";
  }

  if (exercise === "pushup") {
    if (elbow_angle > 105 && elbow_angle <= PUSHUP_MAX_TRAINED_ELBOW) {
      return "pushup_elbow_flare";
    }
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