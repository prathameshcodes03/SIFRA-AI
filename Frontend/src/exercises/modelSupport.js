/**
 * Training support envelope for the shipped RandomForest.
 *
 * GENERATED FROM DATA - do not hand-edit. Source of truth:
 *   ml-model/data/processed/sifra_ai_final_cleaned.csv
 *   (the exact dataset the deployed sifra_form_model.pkl was fitted on)
 *
 * A tree ensemble interpolates only inside the convex hull of its training
 * data. Outside that hull every split is an arbitrary extrapolation, so a
 * prediction there is not a measurement - it is a guess that is still returned
 * with high `predict_proba` confidence.
 *
 * This matters enormously for squats: the training data contains NO standing
 * pose at all (knee_angle max 138.28 deg, while a standing person is ~165-180
 * deg). Verified against the LIVE deployed endpoint:
 *
 *   POST /predict  knee=175, hip=175, body=172  ->  "shallow"   (fabricated)
 *   POST /predict  knee=165, hip=165, body=170  ->  "shallow"   (fabricated)
 *   POST /predict  knee= 85, hip= 85, body=160  ->  "correct"   (in support)
 *
 * So `isWithinModelSupport()` is used to decide whether a model label may be
 * believed. It is a validity envelope, not a quality threshold.
 */

export const MODEL_SUPPORT = Object.freeze({
  squat: Object.freeze({
    knee_angle: Object.freeze([64.15, 138.28]),
    elbow_angle: Object.freeze([90.2, 90.2]),
    hip_angle: Object.freeze([52.38, 135.49]),
    body_angle: Object.freeze([112.69, 180.0]),
    symmetry_score: Object.freeze([0.6133, 1.0]),
    landmark_visibility: Object.freeze([0.7741, 1.0]),
  }),
  pushup: Object.freeze({
    knee_angle: Object.freeze([92.27, 92.27]),
    elbow_angle: Object.freeze([59.49, 133.21]),
    hip_angle: Object.freeze([120.0, 180.0]),
    body_angle: Object.freeze([131.81, 180.0]),
    symmetry_score: Object.freeze([0.8194, 1.0]),
    landmark_visibility: Object.freeze([0.8247, 1.0]),
  }),
  plank: Object.freeze({
    knee_angle: Object.freeze([92.27, 92.27]),
    elbow_angle: Object.freeze([90.2, 90.2]),
    hip_angle: Object.freeze([131.0, 180.0]),
    body_angle: Object.freeze([133.1, 180.0]),
    symmetry_score: Object.freeze([0.8033, 1.0]),
    landmark_visibility: Object.freeze([0.7918, 1.0]),
  }),
});

/**
 * Observed training range per squat label, used to justify the movement-aware
 * depth and lean rules in formAssessment.js (never used to gate the model).
 */
export const SQUAT_LABEL_RANGES = Object.freeze({
  correct: Object.freeze({
    knee_angle: Object.freeze([65.96, 96.99]),
    hip_angle: Object.freeze([70.82, 108.14]),
    body_angle: Object.freeze([153.21, 178.77]),
    symmetry_score: Object.freeze([0.9, 1.0]),
  }),
  shallow: Object.freeze({
    knee_angle: Object.freeze([90.9, 138.28]),
    hip_angle: Object.freeze([86.66, 135.49]),
    body_angle: Object.freeze([154.03, 180.0]),
    symmetry_score: Object.freeze([0.88, 1.0]),
  }),
  forward_lean: Object.freeze({
    knee_angle: Object.freeze([70.37, 106.54]),
    hip_angle: Object.freeze([52.38, 100.61]),
    body_angle: Object.freeze([112.69, 170.09]),
    symmetry_score: Object.freeze([0.85, 1.0]),
  }),
  knees_caving: Object.freeze({
    knee_angle: Object.freeze([64.15, 102.48]),
    hip_angle: Object.freeze([61.2, 109.12]),
    body_angle: Object.freeze([143.31, 176.61]),
    symmetry_score: Object.freeze([0.61, 0.92]),
  }),
});

/**
 * Features with ZERO variance in the training data.
 *
 * They are excluded from the support check on purpose:
 *   - squat: elbow_angle is 90.20 for all 305 rows; plank: knee_angle 92.27 and
 *     elbow_angle 90.20; pushup: knee_angle 92.27.
 * A feature that never varied carries no information - the model learned
 * nothing from it - yet a real person's elbow_angle is ~170 deg with arms
 * hanging, so including it would mark EVERY live squat frame as unsupported
 * and silently disable the model everywhere.
 */
const ZERO_VARIANCE_FEATURES = new Set([
  "squat:elbow_angle",
  "plank:elbow_angle",
  "plank:knee_angle",
  "pushup:knee_angle",
]);

const round = (value) => Math.round(value * 100) / 100;

/**
 * Highest elbow angle the model was ever trained on for push-ups, and the top
 * of its `pushup_elbow_flare` class.
 *
 * Training elbow ranges per push-up label:
 *   pushup_correct      [ 67.25,  98.71]
 *   pushup_body_sag     [ 59.49, 104.83]
 *   pushup_hips_high    [ 64.08, 107.08]
 *   pushup_elbow_flare  [ 81.52, 133.21]
 *
 * A locked-out arm (~170-180deg) is therefore OUTSIDE every trained class, so
 * an elbow angle above this value says nothing about flare. The previous
 * unbounded `elbow_angle > 105` rule classified every straight arm as flared.
 */
export const PUSHUP_MAX_TRAINED_ELBOW = 133.21;

/**
 * Is this frame inside the region the model was actually trained on?
 *
 * @param {object|null} features
 * @param {string} exercise
 * @returns {{supported: boolean, outside: string[]}}
 */
export function isWithinModelSupport(features, exercise) {
  const key = String(exercise || "").toLowerCase();
  const envelope = MODEL_SUPPORT[key];
  if (!features || !envelope) return { supported: false, outside: ["unknown"] };

  const outside = [];
  for (const [name, [min, max]] of Object.entries(envelope)) {
    if (ZERO_VARIANCE_FEATURES.has(`${key}:${name}`)) continue;

    const value = features[name];
    if (typeof value !== "number" || Number.isNaN(value)) {
      outside.push(`${name}:missing`);
      continue;
    }
    if (value < min || value > max) {
      outside.push(`${name}:${round(value)}`);
    }
  }

  return { supported: outside.length === 0, outside };
}