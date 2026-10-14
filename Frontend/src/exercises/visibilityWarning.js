/**
 * Camera-visibility warning policy.
 *
 * The camera warning used to be re-emitted on *every* prediction. The caller
 * fell back to the `pose_unreliable` copy whenever a label was gated, missing,
 * or belonged to another exercise, so "I can't see you clearly..." was
 * displayed - and re-requested from ElevenLabs - roughly every 2 seconds for as
 * long as the user was slightly out of frame. Three separate problems were
 * being reported with one sentence:
 *
 *   1. genuinely low landmark visibility        -> reposition the camera
 *   2. a pose so partial it cannot be measured  -> reposition the camera
 *   3. a gated / missing / cross-exercise label  -> NOT a camera problem
 *
 * This module owns that policy: why the pose is unusable, what the user is told,
 * and when the warning is allowed to appear again. It is pure and ref-based at
 * the call site, so React re-renders can never reset the cooldown.
 */

import {
  POSE_UNRELIABLE,
  CROSS_EXERCISE_REASON,
  NO_LABEL_REASON,
  DEPTH_GATED_REASON,
} from "./coaching";
import { COACHING_MESSAGES } from "./featureExtractor";

/**
 * Reasons that genuinely mean "the camera cannot see enough of you". Only these
 * may produce a camera-position instruction.
 */
export const VISIBILITY_FAILURE_REASONS = Object.freeze({
  LOW_VISIBILITY: "low_visibility",
  NO_POSE: "no_pose",
  MISSING_POINTS: "missing_points",
});

/**
 * Failure reasons that must never be reported as a camera problem. A model
 * failure, a network failure or a label from another exercise says nothing
 * about where the camera is pointing.
 */
export const NON_VISIBILITY_FAILURE_REASONS = Object.freeze({
  CROSS_EXERCISE_LABEL: CROSS_EXERCISE_REASON,
  MODEL_UNAVAILABLE: "model_unavailable",
  NO_LABEL: NO_LABEL_REASON,
  DEPTH_NOT_ACTIONABLE: DEPTH_GATED_REASON,
});

/**
 * Silence after a visibility warning before a single reminder is allowed. The
 * warning state stays active while the pose is bad; only the repetition is
 * rate-limited, so nothing is hidden from the model or the rep counter.
 */
export const DEFAULT_WARNING_COOLDOWN_MS = 9000;

/**
 * Consecutive frames required before the state flips. Landmark visibility
 * jitters frame to frame; without this a single dip would read as "recovered"
 * and immediately re-arm the warning.
 */
export const DEFAULT_CONFIRM_FRAMES = 3;

/**
 * Copy per failure reason, kept short and actionable. The low-visibility copy
 * is the existing `pose_unreliable` message so the wording does not change.
 */
export const VISIBILITY_WARNINGS = Object.freeze({
  [VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY]: COACHING_MESSAGES[POSE_UNRELIABLE],
  [VISIBILITY_FAILURE_REASONS.NO_POSE]:
    "I can't see you. Step back into frame so I can keep tracking you.",
  [VISIBILITY_FAILURE_REASONS.MISSING_POINTS]:
    "Keep your shoulders and hips in view so I can track your form.",
});

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

/** Concise instruction for a camera failure; unknown reasons fall back safely. */
export function getVisibilityWarningMessage(reason) {
  return (
    VISIBILITY_WARNINGS[reason] ||
    VISIBILITY_WARNINGS[VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY]
  );
}

/** Does this failure reason describe the camera view rather than the model? */
export function isVisibilityFailureReason(reason) {
  return hasOwn(VISIBILITY_WARNINGS, reason);
}

/**
 * Edge-triggered camera-visibility warning with a cooldown.
 *
 * `update()` is called once per camera frame. It returns `visible: true` only
 * when the user should actually be told something:
 *
 *   - the first confirmed unreliable frames (reliable -> unreliable)
 *   - at most one reminder per cooldown while the problem persists
 *
 * Repeated unreliable frames are absorbed, a recovery clears the active state,
 * and a later failure warns again immediately.
 *
 * @param {object}   [options]
 * @param {number}   [options.cooldownMs]  silence between reminders
 * @param {number}   [options.confirmFrames] frames needed to flip the state
 * @param {Function} [options.now] injectable clock for tests
 */
export function createVisibilityWarningController({
  cooldownMs = DEFAULT_WARNING_COOLDOWN_MS,
  confirmFrames = DEFAULT_CONFIRM_FRAMES,
  now = () => Date.now(),
} = {}) {
  /** @type {"idle"|"unreliable"} */
  let state = "idle";
  /** Outcome of the run of frames currently being confirmed. */
  let candidate = null;
  let pendingFrames = 0;
  let lastShownAt = null;
  let shownCount = 0;

  const result = (visible, reason, isReminder) => ({
    visible,
    message: visible ? getVisibilityWarningMessage(reason) : null,
    reason: visible ? reason : null,
    isReminder: visible ? isReminder : false,
    state,
    shownCount,
  });

  function clear() {
    state = "idle";
    candidate = null;
    pendingFrames = 0;
    lastShownAt = null;
    shownCount = 0;
  }

  /**
   * @param {object} frame
   * @param {boolean} frame.reliable  is the pose measurable right now
   * @param {string}  [frame.reason]  why it is not, when it is not
   */
  function update({ reliable, reason } = {}) {
    const failureReason = reason ?? VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY;
    const cameraProblem =
      reliable === false && isVisibilityFailureReason(failureReason);

    // Count consecutive frames of the SAME outcome, so a one-frame dip in
    // landmark visibility can neither raise nor clear a warning.
    const outcome = cameraProblem ? "unreliable" : "reliable";
    pendingFrames = candidate === outcome ? pendingFrames + 1 : 1;
    candidate = outcome;

    if (!cameraProblem) {
      // A model/network/cross-exercise failure is not a camera problem: never
      // warn about the camera, and do not let a stale warning stay armed.
      // Recovery is debounced too, so one good frame cannot re-arm the very
      // next dip.
      if (pendingFrames >= confirmFrames) {
        state = "idle";
        pendingFrames = 0;
      }
      return result(false, null, false);
    }

    // Debounce a single noisy frame before declaring a failure.
    if (state !== "unreliable" && pendingFrames < confirmFrames) {
      return result(false, null, false);
    }

    const timestamp = now();

    if (state !== "unreliable") {
      state = "unreliable";
      pendingFrames = 0;
      lastShownAt = timestamp;
      shownCount += 1;
      return result(true, failureReason, false);
    }

    // Still bad: repeat only once the cooldown has expired.
    if (lastShownAt !== null && timestamp - lastShownAt >= cooldownMs) {
      lastShownAt = timestamp;
      shownCount += 1;
      return result(true, failureReason, true);
    }

    return result(false, null, false);
  }

  return {
    update,
    isActive: () => state === "unreliable",
    shownCount: () => shownCount,
    reset: clear,
  };
}