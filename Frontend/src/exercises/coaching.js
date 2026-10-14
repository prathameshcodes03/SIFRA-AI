/**
 * Coaching arbitration.
 *
 * The trained model is a SINGLE-FRAME pose classifier. Probing the shipped
 * artifact showed, for squats:
 *
 *   hip_angle 60-100 -> "correct"      hip_angle 110-180 -> "shallow"
 *   body_angle 130-150 -> "forward_lean"  body_angle >= 155 -> "shallow"
 *
 * hip_angle is shoulder-hip-knee. A person standing upright sits near 170-180,
 * so the model reports "shallow" for almost the whole ascent unless the user
 * folds very deeply. Firing that message every cycle is what made the coach
 * repeat "go deeper" / "keep your chest upright" and feel like it demanded
 * touching the floor.
 *
 * This module therefore gates *when* a form label is allowed to become spoken
 * coaching, without altering the model, its thresholds, or the /predict
 * contract. It only decides whether the model's current label is actionable.
 */

import { PHASE } from "./repTracker.js";
import { getFeedbackForPrediction } from "./featureExtractor.js";
import { isWithinModelSupport } from "./modelSupport.js";

/** Pseudo-label used when the pose itself is not measurable. Never sent to the model. */
export const POSE_UNRELIABLE = "pose_unreliable";

/** Decision reasons that describe the camera view. */
export const UNRELIABLE_POSE_REASON = "unreliable_pose";
export const CROSS_EXERCISE_REASON = "cross_exercise_label";
export const NO_LABEL_REASON = "no_label";
export const DEPTH_GATED_REASON = "depth_not_actionable_while_upright";

/**
 * Labels the shipped model legitimately emits for each exercise.
 *
 * Verified by probing the trained artifact: the model occasionally returns a
 * label belonging to a DIFFERENT exercise (a push-up frame receiving
 * "knees_caving", a squat frame receiving "pushup_elbow_flare"). Speaking such
 * a cue verbatim would tell a push-up user to align their knees.
 *
 * Such a label is therefore treated as an unreliable classification for the
 * exercise in progress, rather than being coached literally.
 */
export const EXERCISE_LABELS = {
  squat: new Set(["correct", "shallow", "forward_lean", "knees_caving"]),
  pushup: new Set([
    "pushup_correct",
    "pushup_elbow_flare",
    "pushup_body_sag",
    "pushup_hips_high",
  ]),
  plank: new Set(["plank_correct", "plank_hips_high", "plank_hips_low"]),
};

/** Correct-form label per exercise, used for accuracy accounting. */
export const CORRECT_LABEL_BY_EXERCISE = {
  squat: "correct",
  pushup: "pushup_correct",
  plank: "plank_correct",
};

/**
 * Is this label valid for the exercise actually being performed?
 * @param {string|null} label
 * @param {string} exercise
 */
export function isLabelForExercise(label, exercise) {
  if (!label) return false;
  const allowed = EXERCISE_LABELS[String(exercise || "").toLowerCase()];
  // Unknown exercise: don't invent a restriction.
  if (!allowed) return true;
  return allowed.has(label);
}

/** Below this raw landmark visibility the form features are not trustworthy. */
export const MIN_RELIABLE_VISIBILITY = 0.55;

/** Number of recent labels considered for the majority vote. */
export const DEFAULT_SMOOTHING_WINDOW = 5;

/**
 * Labels that describe depth/posture are only actionable once the user has
 * actually descended. While upright there is nothing useful to say about
 * depth, so these are suppressed to stop the "go deeper" spam.
 */
const PHASE_GATED_LABELS = new Set(["shallow"]);

/**
 * Majority vote over a short window so a single noisy frame cannot flip the
 * spoken cue. Keeps the *model's* label, only stabilises it.
 */
export function createCoachingGate({
  windowSize = DEFAULT_SMOOTHING_WINDOW,
} = {}) {
  let history = [];

  function consider(label) {
    if (!label) return;
    history.push(label);
    if (history.length > windowSize) history = history.slice(-windowSize);
  }

  function dominant() {
    if (history.length === 0) return null;
    const tally = new Map();
    for (const item of history) {
      tally.set(item, (tally.get(item) || 0) + 1);
    }
    let best = null;
    let bestCount = 0;
    for (const [item, count] of tally) {
      if (count > bestCount) {
        best = item;
        bestCount = count;
      }
    }
    return best;
  }

  function reset() {
    history = [];
  }

  return { consider, dominant, reset, history: () => [...history] };
}

/**
 * Decide whether the current model label should become coaching.
 *
 * @param {object} params
 * @param {string} params.label        raw label produced by the model / fallback
 * @param {string} params.phase        PHASE.UP or PHASE.DOWN from repTracker
 * @param {boolean} params.reliable    false when visibility is too low
 * @returns {{label:string, gated:boolean, reason:string}}
 */
export function arbitrateCoaching({ label, phase, reliable, exercise }) {
  if (!reliable) {
    return {
      label: POSE_UNRELIABLE,
      gated: false,
      reason: UNRELIABLE_POSE_REASON,
    };
  }

  if (!label) {
    return { label, gated: true, reason: NO_LABEL_REASON };
  }

  // A label from another exercise is not a valid classification here.
  if (!isLabelForExercise(label, exercise)) {
    return {
      label: POSE_UNRELIABLE,
      gated: false,
      reason: CROSS_EXERCISE_REASON,
    };
  }

  if (PHASE_GATED_LABELS.has(label) && phase === PHASE.UP) {
    return { label, gated: true, reason: DEPTH_GATED_REASON };
  }

  return { label, gated: false, reason: "ok" };
}

/**
 * Turn a coaching decision into a cue worth showing and speaking.
 *
 * Returns null for every case the old caller used to answer with the camera
 * message: gated depth cues, missing labels, unreliable poses and
 * cross-exercise labels. Those are distinct problems, and only the first two
 * families are about the camera - and even those are spoken by the per-frame
 * visibility controller, which owns their cooldown.
 *
 * @param {{decision:{label:string,gated:boolean,reason:string}, exercise:string}} params
 * @returns {{label:string, message:string}|null}
 */
export function resolveCoachingCue({ decision, exercise } = {}) {
  if (!decision || decision.gated) return null;

  // Pose visibility is reported by the visibility controller, never here, so a
  // slow or failing prediction cannot re-announce it.
  if (decision.reason === UNRELIABLE_POSE_REASON) return null;

  // A label from another exercise is discarded, not coached as a camera fault.
  if (!isLabelForExercise(decision.label, exercise)) return null;

  const message = getFeedbackForPrediction(decision.label);
  if (!message) return null;

  return { label: decision.label, message };
}

/**
 * Choose the form label that is allowed to become coaching.
 *
 * The movement-aware assessment owns the claim: it is computed from the user's
 * actual movement state and validated geometry, so it stays correct when the
 * ML service is unreachable, slow, or answering from outside its training
 * distribution. The model still runs and is still trusted - but only when
 * (a) the frame is inside the training support envelope and (b) it agrees with
 * the assessment. A model label can therefore never override validated
 * evidence, and the disagreement is reported for diagnostics rather than
 * swallowed.
 *
 * @param {object}   params
 * @param {object}   params.assessment  assessSquatForm() result
 * @param {string?}  params.mlLabel     raw model label, if one came back
 * @param {object}   params.features    features the label was produced from
 * @param {string}   params.exercise
 * @returns {{label:string|null, source:string, reason:string, mlLabel:?string,
 *            mlSupported:boolean, message:?string}}
 */
export function resolveFormCoaching({
  assessment,
  mlLabel = null,
  features = null,
  exercise,
} = {}) {
  const base = {
    label: null,
    source: "none",
    reason: "no_assessment",
    mlLabel: mlLabel ?? null,
    mlSupported: false,
    message: null,
  };

  if (!assessment) return base;

  const support = isWithinModelSupport(features, exercise);
  const withSupport = { ...base, mlSupported: support.supported };

  // Nothing worth saying (standing / resting / unreliable).
  if (!assessment.label) {
    return { ...withSupport, reason: assessment.reason };
  }

  const usableModelLabel =
    mlLabel && isLabelForExercise(mlLabel, exercise) ? mlLabel : null;
  const message = getFeedbackForPrediction(assessment.label);

  if (usableModelLabel && support.supported && usableModelLabel === assessment.label) {
    return {
      ...withSupport,
      label: assessment.label,
      source: "model_corroborated",
      reason: "model_agrees_with_movement",
      message,
    };
  }

  const reason = !usableModelLabel
    ? "model_unavailable_or_foreign"
    : !support.supported
    ? "model_out_of_support"
    : "model_disagrees_with_movement";

  return {
    ...withSupport,
    label: assessment.label,
    source: "geometry",
    reason,
    message,
  };
}

export { PHASE };