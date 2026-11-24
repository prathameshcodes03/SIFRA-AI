/**
 * Pose visibility state management.
 *
 * Determines whether the camera can reliably see the user's body for exercise
 * analysis. Uses temporal validation across frames to avoid flickering between
 * states, and provides three explicit detection states.
 *
 * States:
 *   PERSON_DETECTED          - Enough critical landmarks visible and features
 *                              extractable for reliable exercise analysis.
 *   PERSON_PARTIALLY_VISIBLE - Some landmarks detected but not enough for
 *                              trustworthy analysis (user moving out of frame,
 *                              camera pointed away, partial occlusion).
 *   PERSON_NOT_DETECTED      - No person detected, or pose completely
 *                              unreliable (camera covered, out of frame).
 *
 * Only PERSON_DETECTED permits rep counting, form assessment, ML predictions,
 * and voice coaching.
 */

import { MIN_RELIABLE_VISIBILITY } from "./coaching";

export const POSE_VISIBILITY = Object.freeze({
  PERSON_DETECTED: "person_detected",
  PERSON_PARTIALLY_VISIBLE: "person_partially_visible",
  PERSON_NOT_DETECTED: "person_not_detected",
});

/** At or below this average critical-landmark visibility, nobody is present. */
const NOT_DETECTED_THRESHOLD = 0.2;

/** Below this average visibility the person is only partially visible. */
const PARTIAL_VISIBILITY_THRESHOLD = MIN_RELIABLE_VISIBILITY; // 0.55

/** Consecutive frames required to confirm a state change (prevents flicker). */
const CONFIRM_FRAMES = 3;

/**
 * Classify visibility from raw inputs.
 *
 * @param {number} reliability   0-1 average visibility of critical landmarks
 * @param {boolean} hasPose      whether MediaPipe returned any landmarks
 * @param {boolean} hasFeatures  whether extractExerciseFeatures returned data
 * @returns {string} one of POSE_VISIBILITY values
 */
function classifyVisibility(reliability, hasPose, hasFeatures) {
  if (!hasPose || reliability <= NOT_DETECTED_THRESHOLD) {
    return POSE_VISIBILITY.PERSON_NOT_DETECTED;
  }
  if (!hasFeatures || reliability < PARTIAL_VISIBILITY_THRESHOLD) {
    return POSE_VISIBILITY.PERSON_PARTIALLY_VISIBLE;
  }
  return POSE_VISIBILITY.PERSON_DETECTED;
}

/**
 * Creates a visibility state controller with temporal validation.
 *
 * @param {object}   options
 * @param {number}   [options.confirmFrames] frames needed to confirm a state change
 */
export function createPoseVisibilityController({
  confirmFrames = CONFIRM_FRAMES,
} = {}) {
  let state = POSE_VISIBILITY.PERSON_NOT_DETECTED;
  let candidate = null;
  let pendingFrames = 0;

  /**
   * Feed one frame's visibility data.
   *
   * @param {object} frame
   * @param {number} frame.reliability   0-1 average landmark visibility
   * @param {boolean} frame.hasPose      whether MediaPipe returned landmarks
   * @param {boolean} frame.hasFeatures  whether feature extraction succeeded
   * @returns {object} {
   *   state, changed, isFullyVisible, isPartiallyVisible, isNotDetected
   * }
   */
  function update({ reliability, hasPose, hasFeatures } = {}) {
    const next = classifyVisibility(reliability, hasPose, hasFeatures);

    if (next === candidate) {
      pendingFrames += 1;
    } else {
      candidate = next;
      pendingFrames = 1;
    }

    const changed = pendingFrames >= confirmFrames && next !== state;

    if (changed) {
      state = next;
      pendingFrames = 0;
    }

    return {
      state,
      changed,
      isFullyVisible: state === POSE_VISIBILITY.PERSON_DETECTED,
      isPartiallyVisible:
        state === POSE_VISIBILITY.PERSON_PARTIALLY_VISIBLE,
      isNotDetected: state === POSE_VISIBILITY.PERSON_NOT_DETECTED,
    };
  }

  function reset() {
    state = POSE_VISIBILITY.PERSON_NOT_DETECTED;
    candidate = null;
    pendingFrames = 0;
  }

  return { update, reset, state: () => state };
}
