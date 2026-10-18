/**
 * Per-repetition form summary for squats.
 *
 * WHY
 * ---
 * Form cannot be judged from a single frame:
 *
 *  - The rep tracker smooths the knee angle with an EMA, so mid-descent the
 *    smoothed angle (e.g. 129 deg while heading to 95 deg) passes straight
 *    through the "shallow" band and would fire "go lower" at a user who is
 *    about to squat perfectly.
 *  - Depth is only knowable once the user has descended AND come back up.
 *    The ML cadence (600 ms) rarely samples the bottom of a ~2 s rep.
 *
 * So the camera loop accumulates the DEPESTEST frame of every descent - frame
 * driven, local, no network - and the coaching decision is taken from that
 * snapshot once the rep is finished. That is exactly how a human coach works:
 * they judge the rep you just did, not the frame the camera happened to catch.
 */

import { REP_THRESHOLDS } from "./repTracker.js";

const TOP_ANGLE = REP_THRESHOLDS.squat.up;

const isNumber = (value) => typeof value === "number" && !Number.isNaN(value);

/**
 * @param {object} [options]
 * @param {Function} [options.onRepComplete] called with the rep snapshot
 */
export function createSquatRepSummary({ onRepComplete = null } = {}) {
  let armed = false;
  let deepestAngle = null;
  let deepestFeatures = null;

  function finishRep() {
    armed = false;
    deepestAngle = null;
    deepestFeatures = null;
  }

  /**
   * Feed one camera frame.
   *
   * @param {object} features  extractExerciseFeatures() output
   * @param {object} tracker   the rep tracker's latest update() result
   * @returns {object|null} the completed rep snapshot, when one just finished
   */
  function observe(features, tracker) {
    if (!features || !tracker) return null;

    // A frame whose knee angle was never measured must not arm a "rep":
    // otherwise tracking noise manufactures coaching verdicts.
    const measured = features.measured;
    if (measured && measured.knee === false) return null;
    if (tracker.trackingOk === false) return null;

    const angle = tracker.smoothedAngle;
    if (!isNumber(angle)) return null;

    // repMinAngle is null exactly while the joint sits at the top, so it is
    // the tracker's own "this descent just ended" signal.
    if (tracker.repMinAngle === null) {
      if (!armed) return null;

      const snapshot = {
        features: deepestFeatures,
        deepestAngle,
        reason: "rep_completed",
      };
      finishRep();

      if (snapshot.features && onRepComplete) onRepComplete(snapshot);
      return snapshot;
    }

    if (!armed) {
      armed = true;
      deepestAngle = angle;
      deepestFeatures = features;
      return null;
    }

    if (deepestAngle === null || angle < deepestAngle) {
      deepestAngle = angle;
      deepestFeatures = features;
    }

    return null;
  }

  return {
    observe,
    reset: finishRep,
    isInProgress: () => armed,
    currentDeepest: () => ({ angle: deepestAngle, features: deepestFeatures }),
    topAngle: TOP_ANGLE,
  };
}