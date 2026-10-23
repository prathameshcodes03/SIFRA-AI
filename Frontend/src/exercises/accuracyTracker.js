/**
 * Session form-accuracy accounting.
 *
 * WHY PER REPETITION
 * ------------------
 * The shipped model is a SINGLE-FRAME pose classifier and the camera loop
 * samples it every 600ms. Counting those samples as "accuracy" measures the
 * user's TIMELINE, not their form:
 *
 *  - Standing between repetitions is roughly half of a squat set, and the
 *    training data contains NO standing squat pose at all, so the model
 *    answers "shallow" for every one of those frames. Scoring them as wrong
 *    form drove a perfectly good set to a double-digit percentage.
 *  - The model is extremely sensitive to `symmetry_score`: at the bottom of a
 *    textbook squat, 0.90 still returns "correct" (0.54) but 0.87 returns
 *    "knees_caving" (0.77). A webcam view has a few degrees of natural
 *    left/right difference, so the raw model label was almost never
 *    "correct" even for a good squat.
 *
 * Accuracy is therefore scored once per COMPLETED REPETITION, from the same
 * verdict the coach speaks. The movement-aware assessment
 * (assessSquatForm) owns that verdict: it is computed from the repetition's
 * deepest frame and validated geometry, and it uses a measured knee
 * asymmetry rather than the raw symmetry score, so ordinary side-to-side
 * variation is not mistaken for a fault.
 *
 * A repetition that could not be judged is EXCLUDED from the denominator. It
 * is never scored as incorrect form - a camera that cannot see the user is
 * not evidence of a bad squat.
 */

import { CORRECT_LABEL_BY_EXERCISE } from "./coaching.js";
import { normalizeExerciseName } from "./featureExtractor.js";

/**
 * @param {object} [options]
 * @param {string} [options.exercise] "squat" | "pushup" | "plank"
 */
export function createAccuracyTracker({ exercise = "squat" } = {}) {
  const canonical = normalizeExerciseName(exercise);
  const correctLabel = CORRECT_LABEL_BY_EXERCISE[canonical] ?? null;

  let total = 0;
  let correct = 0;

  const snapshot = () => ({
    totalPredictions: total,
    correctPredictions: correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
  });

  /**
   * Record the form verdict for one completed repetition.
   *
   * @param {string|null|undefined} label the judged form label. A falsy label
   *   means the repetition could not be judged and is skipped entirely.
   * @returns {{totalPredictions:number, correctPredictions:number, accuracy:number|null}|null}
   */
  const record = (label) => {
    if (!label || !correctLabel) return null;

    total += 1;
    if (label === correctLabel) {
      correct += 1;
    }
    return snapshot();
  };

  return {
    record,
    reset() {
      total = 0;
      correct = 0;
    },
    snapshot,
    /** The label that counts as correct form for this exercise. */
    correctLabel,
  };
}
