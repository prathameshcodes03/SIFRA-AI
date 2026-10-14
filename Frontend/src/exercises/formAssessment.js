/**
 * Movement-aware form assessment.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two independent paths were telling a squatting user to "go lower" while they
 * were standing:
 *
 * 1. The RandomForest has no standing squat pose in its training data
 *    (knee_angle max 138.28 deg vs ~165-180 deg standing), so it returns
 *    "shallow" for every out-of-support frame - verified against the live
 *    endpoint.
 *
 * 2. The rule-based fallback (`evaluateFormRuleBased`) is completely
 *    movement-blind: `knee_angle > 110 -> shallow`. That fired during every
 *    descent, during the whole ascent, and while resting between reps whenever
 *    the rep tracker was still in its DOWN phase (it only leaves DOWN above
 *    140 deg). Measured: 30 consecutive "shallow" cues during a rest, and 9
 *    during a single comfortable rep.
 *
 * This module produces the form claim from the user's ACTUAL movement state
 * plus validated geometry, so it is correct whether or not the model answers.
 * `coaching.js` then decides whether the model's label may corroborate it.
 *
 * Every threshold below is anchored to something already in this project or to
 * the shipped training data - none of them are invented.
 */

import { REP_THRESHOLDS } from "./repTracker.js";

/**
 * The rep tracker already declares "the joint has returned to the top" at this
 * angle (squat: 140 deg). Reusing it means the coaching depth gate and the rep
 * counter can never disagree about where the top of a rep is.
 */
export const REP_TOP_ANGLE = REP_THRESHOLDS.squat.up; // 140 deg

/**
 * Below this the knee is genuinely flexed into a squat position. Same value the
 * rep tracker uses to declare a descent.
 */
export const DESCENDED_KNEE_ANGLE = REP_THRESHOLDS.squat.down; // 110 deg

/**
 * Depth is only actionable when the descent clearly stalled. 120 deg is 10 deg
 * above the tracker's own descent threshold: the user moved, but did not reach
 * depth. Below 120 deg they are squatting to a comfortable depth and are told
 * "good squat" instead - we never demand the floor.
 */
export const SHALLOW_KNEE_ANGLE = 120;

/**
 * body_angle is shoulder-hip-ankle. In the training data `forward_lean` reaches
 * down to 112.69 deg while `correct` never drops below 153.21 deg. 145 deg
 * sits inside that gap, so ordinary torso inclination at depth is not flagged.
 */
export const FORWARD_LEAN_BODY_ANGLE = 145;

/**
 * The model learned "knees_caving" as essentially "symmetry_score < ~0.9"
 * (training range 0.61-0.92 for caving vs >= 0.85 for everything else), so a
 * few degrees of natural left/right difference is enough to trip it - proven
 * live: symmetry 0.86 at a textbook depth returned "knees_caving".
 *
 * We therefore require the measured knee asymmetry ITSELF to be large. 15 deg
 * separates real knee collapse from normal side-to-side variation.
 */
export const KNEE_CAVING_ASYMMETRY_DEG = 15;
export const KNEE_CAVING_SYMMETRY_MAX = 0.85;

/** Below this, occluded joints cannot support a caving claim. */
export const CAVING_MIN_VISIBILITY = 0.7;

/** How far the torso must tilt before it is called a forward lean. */
export const SEVERE_LEAN_BODY_ANGLE = 130;

const isNumber = (value) => typeof value === "number" && !Number.isNaN(value);

const assessment = (label, reason, evidence = {}) => ({
  label,
  reason,
  evidence,
});

/**
 * Classify a COMPLETED squat repetition from the deepest frame it produced.
 *
 * Judging a rep rather than an instant is what makes this stable: the rep
 * tracker's EMA lags heavily, so judging mid-descent produces false "go
 * lower" cues for users who are about to squat correctly.
 *
 * @param {object} params
 * @param {object} params.features        deepest frame of the rep
 * @param {number} params.deepestKneeAngle smoothed knee angle at that frame
 * @param {string} [params.phase]         rep tracker phase, for evidence only
 * @returns {{label:string|null, reason:string, evidence:object}}
 */
export function assessSquatForm({
  features,
  deepestKneeAngle = null,
  phase = "up",
} = {}) {
  if (!features) return assessment(null, "no_features");

  const depth = isNumber(deepestKneeAngle) ? deepestKneeAngle : features.knee_angle;
  if (!isNumber(depth)) return assessment(null, "no_knee_angle");

  const evidence = {
    depth: Math.round(depth * 10) / 10,
    body: Math.round(features.body_angle ?? 0),
    kneeAsymmetry: Math.round(features.knee_asymmetry ?? 0),
    symmetry: features.symmetry_score ?? null,
    visibility: features.landmark_visibility ?? null,
    phase,
  };

  // The joint never left the top band: the user stood or shifted weight, but
  // performed no rep. A large knee angle here is normal anatomy, never a
  // depth fault.
  if (depth >= REP_TOP_ANGLE) {
    return assessment(null, "no_descent", evidence);
  }

  // A real descent happened and it stalled short of comfortable depth.
  if (depth > SHALLOW_KNEE_ANGLE) {
    return assessment("shallow", "descent_stalled_above_depth", evidence);
  }

  // Depth was reached - now judge the shape of the pose itself.
  const visibility = features.landmark_visibility;
  const visibilityOk =
    !isNumber(visibility) || visibility >= CAVING_MIN_VISIBILITY;
  const asymmetry = features.knee_asymmetry;
  const symmetry = features.symmetry_score;
  const caving =
    visibilityOk &&
    isNumber(asymmetry) &&
    asymmetry > KNEE_CAVING_ASYMMETRY_DEG &&
    isNumber(symmetry) &&
    symmetry < KNEE_CAVING_SYMMETRY_MAX;

  // Most consequential fault first: knee collapse, then spine load.
  if (caving) {
    return assessment("knees_caving", "knee_asymmetry_measured", evidence);
  }

  if (
    isNumber(features.body_angle) &&
    features.body_angle < FORWARD_LEAN_BODY_ANGLE
  ) {
    return assessment(
      "forward_lean",
      features.body_angle < SEVERE_LEAN_BODY_ANGLE
        ? "torso_severely_inclined"
        : "torso_inclined",
      evidence
    );
  }

  return assessment("correct", "at_comfortable_depth", evidence);
}