/**
 * Plank hold timing.
 *
 * WHY THIS EXISTS
 * ---------------
 * The old implementation asked one question - "is the body line straight?"
 * - and banked time whenever the answer was yes. That is not enough:
 *
 *  - The body line is 180 deg for a STANDING person and for someone lying
 *    flat on the floor, exactly as it is for a plank. The joint angles are
 *    completely orientation-blind, so the timer ran for a user who was
 *    simply standing in front of the camera. The body ORIENTATION is what
 *    separates those poses, and it was never measured.
 *  - The timer started on the very first valid frame, so a single
 *    false-positive frame could open a hold.
 *  - The accumulated time was reset by any broken frame, so a momentary
 *    tracking dropout cost the user up to a second of a good hold.
 *  - The per-frame time was capped at 250ms, so on a slow device the timer
 *    ran at a fraction of real time.
 *
 * This module owns the hold:
 *
 *  - the pose must be a real plank (straight body, horizontal body),
 *  - the pose must hold for a confirmation period before the timer starts,
 *  - invalid time is never banked, and a brief break pauses the timer
 *    instead of destroying it,
 *  - the duration is measured from the clock, so it is frame-rate
 *    independent.
 */

export const PLANK_HOLD_THRESHOLDS = Object.freeze({
  /**
   * The body line (shoulder-hip-ankle) must be at least this straight. This
   * is also what catches a bent-at-the-hip body, whether the hips are raised
   * or sagging.
   */
  minBodyAngle: 150,

  /**
   * The body must be this close to horizontal. A standing user has a
   * perfectly straight body line, so the tilt is the only thing that tells a
   * plank apart from standing.
   */
  maxBodyTilt: 55,

  /** The left/right symmetry must be at least this good. */
  minSymmetry: 0.7,

  /**
   * How long the pose must hold before the timer starts. It stops a single
   * false-positive frame from opening a hold.
   */
  confirmationMs: 500,

  /**
   * How long the pose may be invalid before the hold is considered broken.
   * Within this window the timer is merely PAUSED: the accumulated time
   * survives, because a dropped frame or a short wobble is not the user
   * giving up. Beyond it the hold is broken and the pose has to be confirmed
   * again.
   */
  graceMs: 1000,

  /**
   * The largest gap between frames that may be banked. A longer gap means
   * the camera stalled or the tab was hidden, and the pose was not verified
   * in between, so that time is not credited.
   */
  maxBankableGapMs: 1000,
});

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Is this a recognisable plank?
 *
 * @param {object} features
 * @param {number} [features.bodyAngle]  the smoothed shoulder-hip-ankle line
 * @param {number} [features.bodyTilt]   the body orientation, 0 = horizontal
 * @param {number} [features.symmetryScore]
 * @returns {boolean}
 */
export function isPlankPose(features = {}) {
  const { bodyAngle, bodyTilt, symmetryScore } = features;

  if (!isNumber(bodyAngle) || bodyAngle < PLANK_HOLD_THRESHOLDS.minBodyAngle) {
    return false;
  }

  // A missing tilt is "unknown", never "not a plank": only a tilt that was
  // actually measured can refuse the pose.
  if (isNumber(bodyTilt) && bodyTilt > PLANK_HOLD_THRESHOLDS.maxBodyTilt) {
    return false;
  }

  if (
    isNumber(symmetryScore) &&
    symmetryScore < PLANK_HOLD_THRESHOLDS.minSymmetry
  ) {
    return false;
  }

  return true;
}

/**
 * @param {object} [options]
 * @param {object} [options.thresholds] overrides for PLANK_HOLD_THRESHOLDS
 */
export function createPlankHold({ thresholds = {} } = {}) {
  const cfg = { ...PLANK_HOLD_THRESHOLDS, ...thresholds };

  let seconds = 0; // the accumulated VALID hold time
  let validSince = null; // when the current valid stretch began
  let invalidSince = null; // when the pose first became invalid
  let confirmed = false; // the pose has held long enough to be banked
  let previousValid = false; // was the previous frame valid?
  let formOk = false;

  const snapshot = () => ({
    seconds,
    wholeSeconds: Math.floor(seconds),
    formOk,
    confirmed,
  });

  /**
   * Feed one frame.
   *
   * @param {object} frame
   * @param {boolean} frame.valid  is the pose a valid plank right now?
   * @param {number} frame.nowMs
   * @param {number} frame.dtMs    the time since the previous frame
   * @returns {{seconds:number, wholeSeconds:number, formOk:boolean, confirmed:boolean}}
   */
  function update({ valid, nowMs, dtMs }) {
    formOk = Boolean(valid);
    const wasValid = previousValid;

    if (valid) {
      if (validSince === null) validSince = nowMs;
      invalidSince = null;

      if (nowMs - validSince >= cfg.confirmationMs) {
        confirmed = true;
        // Only the time between two VERIFIED frames is credited. A break in
        // the pose is never banked, however short it was - so a pose that
        // flickers in and out of validity banks nothing at all.
        if (wasValid) {
          const gap = isNumber(dtMs) ? Math.min(dtMs, cfg.maxBankableGapMs) : 0;
          seconds += Math.max(0, gap) / 1000;
        }
      }
    } else {
      if (invalidSince === null) invalidSince = nowMs;

      // Within the grace window the timer is merely PAUSED: the hold
      // continues, the accumulated time survives, and the pose does not have
      // to be confirmed again. A sustained break ends the hold - the time
      // already banked still survives, but the pose has to hold again before
      // any more is banked.
      if (nowMs - invalidSince > cfg.graceMs) {
        validSince = null;
        confirmed = false;
      }
    }

    previousValid = Boolean(valid);
    return snapshot();
  }

  /**
   * Break the hold without discarding the time already banked.
   *
   * Used when the pose could not be observed - the camera lost the user, or
   * the tab was hidden. The accumulated time survives (the user did hold it),
   * but the pose has to be confirmed again before any more time is banked.
   */
  function breakHold() {
    validSince = null;
    confirmed = false;
    invalidSince = null;
  }

  function reset() {
    seconds = 0;
    validSince = null;
    invalidSince = null;
    confirmed = false;
    formOk = false;
  }

  return {
    update,
    abandon: breakHold,
    breakHold,
    reset,
    snapshot,
    get seconds() {
      return seconds;
    },
    get wholeSeconds() {
      return Math.floor(seconds);
    },
  };
}
