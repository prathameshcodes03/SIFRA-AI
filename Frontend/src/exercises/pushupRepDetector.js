/**
 * Push-up repetition detection.
 *
 * WHY THIS EXISTS
 * ---------------
 * The old counter qualified a repetition with ONE rule: the smoothed elbow
 * angle dipped below `REP_THRESHOLDS.pushup.down` (100 deg) and came back
 * above `REP_THRESHOLDS.pushup.up` (140 deg). Nothing else was checked.
 *
 * That made two things count as a push-up:
 *
 *  - ANY elbow movement, because the body was never looked at. A user lying
 *    on the floor waving their arms produced a full "repetition", and so did
 *    a standing user raising and lowering their elbows.
 *  - A bent body. A push-up with the hips sagging was credited exactly like
 *    a textbook one, because the body line was never validated.
 *
 * The model itself already knows the difference: its `pushup_correct` class
 * is an elbow of 67-99 deg with a body line of at least ~160 deg, and it
 * calls a bent body `pushup_hips_high`. The counter simply never asked.
 *
 * This module implements the same five-phase machine the squat uses:
 *
 *   TOP -> DESCENDING -> BOTTOM -> ASCENDING -> TOP
 *
 * and validates the BODY ALIGNMENT, not just the arm:
 *
 *  - the body line (shoulder-hip-ankle) and the hip line (shoulder-hip-knee)
 *    must both be straight enough to be a push-up,
 *  - the body must be horizontal (`body_tilt`), which is what separates a
 *    push-up from a standing user - the joint angles alone cannot,
 *  - the bottom must be a real depth, confirmed by the measured AND the
 *    smoothed elbow angle.
 *
 * The module is PURE: it takes angles and a timestamp and returns a verdict.
 */

export const PUSHUP_REP_STATE = Object.freeze({
  TOP: "top",
  DESCENDING: "descending",
  BOTTOM: "bottom",
  ASCENDING: "ascending",
});

export const PUSHUP_REP_THRESHOLDS = Object.freeze({
  /**
   * The MEASURED elbow angle must reach at most this at the bottom.
   *
   * The shipped model's own `pushup_correct` class spans 67.25-98.71 deg, so
   * 100 deg is the model's own boundary: a press that stops above it is a
   * partial push-up, not a full one.
   */
  maxDepthAngle: 100,

  /**
   * The SMOOTHED elbow angle must also reach at most this.
   *
   * The measured angle alone is noisy: one mis-read frame can dive below the
   * depth threshold without the user having moved. The smoothed angle cannot
   * be fooled that easily, so the depth has to be confirmed by BOTH signals.
   *
   * The allowance is generous because the exponential average lags more at a
   * low frame rate (at 15fps a measured bottom of 100 deg smooths to ~109),
   * and a depth gate that depends on the frame rate would reject perfectly
   * good push-ups on a slow device.
   */
  maxSmoothedDepthAngle: 115,

  /**
   * How long the SMOOTHED elbow angle must stay at or below the depth
   * threshold.
   *
   * The stability requirement: a real push-up bottoms out, while a
   * mis-read landmark - which is what moving the camera produces - crosses
   * the threshold for a moment and comes straight back.
   */
  minDepthHoldMs: 150,

  /**
   * How far the elbow must flex from the calibrated top position before the
   * movement counts as a descent at all.
   */
  minFlexion: 40,

  /**
   * How far below the calibrated top the elbow may sit and still count as
   * the top position. Tolerates normal individual variations in lockout.
   */
  topTolerance: 20,

  /** The starting assumption for the top position, before one is observed. */
  defaultTopAngle: 140,

  /** Floor above which an observed elbow extension can calibrate topAngle. */
  topFloor: 135,

  /**
   * The body line (shoulder-hip-ankle) must be at least this straight for
   * the pose to be a push-up at all. The model calls anything below ~160 deg
   * `pushup_hips_high`, so a bent body is a FORM fault - it still counts as
   * a repetition, with a lower form score. Only a body that is genuinely
   * folded (a user lying on the floor) is refused.
   */
  minBodyAngle: 140,

  /**
   * The hip line (shoulder-hip-knee) must be at least this straight.
   */
  minHipAngle: 140,

  /**
   * The body must be this close to horizontal. A standing user has a
   * perfectly straight body line (180 deg) - the tilt is the only thing that
   * tells a push-up apart from someone waving their arms while upright.
   */
  maxBodyTilt: 55,

  /** The descent must be confirmed for at least this long. */
  minDescentMs: 60,

  /** The return to the top must hold for at least this long. */
  minTopMs: 50,

  /** A repetition must last at least this long. */
  minCycleMs: 350,

  /** How far the elbow must rise from the bottom before the ascent is real. */
  minAscentRise: 12,

  /**
   * Secondary protection only: the minimum gap between two counted reps.
   */
  cooldownMs: 250,

  /** EMA factor for the elbow angle. */
  smoothing: 0.4,

  /** How fast the top baseline is allowed to follow a relaxed or fatigued posture. */
  baselineDecayDegPerSec: 5,
});

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * @param {object} [options]
 * @param {object} [options.thresholds] overrides for PUSHUP_REP_THRESHOLDS
 */
export function createPushupRepDetector({ thresholds = {} } = {}) {
  const cfg = { ...PUSHUP_REP_THRESHOLDS, ...thresholds };

  let state = PUSHUP_REP_STATE.TOP;
  let elbowEma = null;

  // The calibrated top position: the most extended elbow the user reaches.
  let topAngle = null;

  // The movement in progress.
  let cycleStartedAt = null;
  let deepestElbow = null; // deepest SMOOTHED elbow angle
  let deepestRawElbow = null; // deepest MEASURED elbow angle
  let depthReached = false;
  let depthHoldSince = null; // when the smoothed angle first reached the depth
  let depthHeld = false; // the depth has been HELD long enough to count
  let alignedAtBottom = false;

  // Pending transition timers.
  let candidateSince = null;

  // Guards.
  let armed = true; // the top position has been established
  let lastRepAt = null;
  let lastTimestamp = null;
  let reps = 0;

  const ema = (previous, value) =>
    previous === null ? value : previous + cfg.smoothing * (value - previous);

  const enterState = (next) => {
    state = next;
    candidateSince = null;
  };

  const resetMovement = () => {
    cycleStartedAt = null;
    deepestElbow = null;
    deepestRawElbow = null;
    depthReached = false;
    depthHoldSince = null;
    depthHeld = false;
    alignedAtBottom = false;
    candidateSince = null;
  };

  /**
   * Is this a recognisable push-up body?
   *
   * The angles alone cannot tell a push-up from a standing user, so the
   * orientation is checked as well - but only when it was measured. A
   * missing tilt is treated as "unknown", never as "not a push-up".
   */
  const alignmentIsValid = ({ bodyAngle, hipAngle, tilt }) => {
    if (isNumber(bodyAngle) && bodyAngle < cfg.minBodyAngle) return false;
    if (isNumber(hipAngle) && hipAngle < cfg.minHipAngle) return false;
    if (isNumber(tilt) && tilt > cfg.maxBodyTilt) return false;
    return true;
  };

  /**
   * May the cycle that just finished be counted as a repetition?
   */
  function isRepQualified(nowMs) {
    // 1. A real bottom: deep enough, confirmed by both signals, and with a
    //    body that was actually in a push-up position.
    if (!depthReached) return false;
    if (deepestElbow === null || deepestElbow > cfg.maxSmoothedDepthAngle) {
      return false;
    }
    if (deepestRawElbow === null || deepestRawElbow > cfg.maxDepthAngle) {
      return false;
    }
    if (!alignedAtBottom) return false;

    // 2. The whole cycle took a plausible amount of time.
    if (cycleStartedAt === null) return false;
    if (nowMs - cycleStartedAt < cfg.minCycleMs) return false;

    // 3. Secondary protection: two reps cannot land on top of each other.
    if (lastRepAt !== null && nowMs - lastRepAt < cfg.cooldownMs) return false;

    return true;
  }

  const snapshot = (extra = {}) => ({
    state,
    reps,
    phase: state === PUSHUP_REP_STATE.TOP ? "up" : "down",
    smoothedAngle: elbowEma,
    topAngle,
    deepestAngle: deepestElbow,
    depthReached,
    armed,
    ...extra,
  });

  /**
   * Feed one camera frame.
   *
   * @param {object} frame
   * @param {number} frame.elbowAngle  the measured elbow angle
   * @param {number?} [frame.bodyAngle] the measured shoulder-hip-ankle line
   * @param {number?} [frame.hipAngle]  the measured shoulder-hip-knee line
   * @param {number?} [frame.bodyTilt]  the body orientation, 0 = horizontal
   * @param {number} frame.nowMs
   */
  function update({ elbowAngle, bodyAngle = null, hipAngle = null, bodyTilt = null, nowMs }) {
    if (!isNumber(elbowAngle)) return snapshot();
    const safeNowMs = isNumber(nowMs) ? nowMs : Date.now();

    elbowEma = ema(elbowEma, elbowAngle);

    const dt = lastTimestamp === null ? 0 : Math.max(0, safeNowMs - lastTimestamp);
    lastTimestamp = safeNowMs;

    // --- the top position ---------------------------------------------------
    // The most extended elbow the user reaches is their top. It is learned
    // from the pose itself, so a user who does not fully lock out their arms
    // is not punished for it.
    if (topAngle === null) {
      if (elbowEma >= (cfg.topFloor ?? 135)) topAngle = elbowEma;
    } else if (elbowEma > topAngle) {
      topAngle = elbowEma;
    } else if (state === PUSHUP_REP_STATE.TOP && elbowAngle >= 90 && isNumber(dt)) {
      const decay = ((cfg.baselineDecayDegPerSec ?? 5) * dt) / 1000;
      topAngle = Math.max(elbowEma, topAngle - decay);
    }
    const topThreshold = Math.max(
      90,
      (topAngle ?? cfg.defaultTopAngle) - cfg.topTolerance
    );

    const atTop = elbowAngle >= topThreshold;
    const aligned = alignmentIsValid({
      bodyAngle,
      hipAngle,
      tilt: bodyTilt,
    });

    // --- the movement in progress -------------------------------------------
    if (elbowEma < (deepestElbow ?? Infinity)) deepestElbow = elbowEma;
    if (elbowAngle < (deepestRawElbow ?? Infinity)) deepestRawElbow = elbowAngle;

    // The depth is reached when BOTH signals say so. The measured angle
    // proves the user really was that deep; the smoothed angle proves it was
    // not a one-frame mis-read.
    //
    // And the smoothed angle has to STAY at the depth for the hold time: a
    // real push-up bottoms out, while a mis-read landmark only crosses the
    // threshold for a moment. The hold is latched once achieved, because the
    // ascent starts as soon as the user presses back up.
    if (!depthHeld) {
      if (elbowEma <= cfg.maxSmoothedDepthAngle) {
        if (depthHoldSince === null) depthHoldSince = safeNowMs;
        if (safeNowMs - depthHoldSince >= cfg.minDepthHoldMs) depthHeld = true;
      } else {
        depthHoldSince = null;
      }
    }

    depthReached =
      depthHeld &&
      deepestElbow !== null &&
      deepestRawElbow !== null &&
      deepestElbow <= cfg.maxSmoothedDepthAngle &&
      deepestRawElbow <= cfg.maxDepthAngle;

    // A descent must be a REAL reduction from the calibrated top, and it is
    // always detected before the depth gate is reached.
    const descentThreshold = Math.max(
      cfg.maxDepthAngle + 5,
      topThreshold - cfg.minFlexion
    );

    let repCompleted = false;

    switch (state) {
      // ----------------------------------------------------------------- TOP
      case PUSHUP_REP_STATE.TOP: {
        if (atTop && aligned) armed = true;

        if (armed && aligned && elbowAngle <= descentThreshold) {
          if (candidateSince === null) candidateSince = safeNowMs;
          if (safeNowMs - candidateSince >= cfg.minDescentMs) {
            enterState(PUSHUP_REP_STATE.DESCENDING);
            cycleStartedAt = safeNowMs;
            depthReached = false;
            alignedAtBottom = false;
          }
        } else {
          candidateSince = null;
        }
        break;
      }

      // -------------------------------------------------- DESCENDING / BOTTOM
      case PUSHUP_REP_STATE.DESCENDING:
      case PUSHUP_REP_STATE.BOTTOM: {
        if (
          state === PUSHUP_REP_STATE.DESCENDING &&
          elbowEma <= cfg.maxSmoothedDepthAngle
        ) {
          enterState(PUSHUP_REP_STATE.BOTTOM);
        }

        // The bottom counts only if the body was a push-up at that moment.
        if (depthReached && aligned) alignedAtBottom = true;

        // The ascent starts once the elbow has risen meaningfully off the
        // bottom. A jitter around the minimum is not an ascent.
        if (elbowEma - (deepestElbow ?? elbowEma) >= cfg.minAscentRise) {
          enterState(PUSHUP_REP_STATE.ASCENDING);
        }
        break;
      }

      // ------------------------------------------------------------- ASCENDING
      case PUSHUP_REP_STATE.ASCENDING: {
        if (elbowEma < (deepestElbow ?? elbowEma)) {
          // The user sank again: that was not an ascent.
          enterState(PUSHUP_REP_STATE.BOTTOM);
          break;
        }

        if (atTop && aligned) {
          if (candidateSince === null) candidateSince = safeNowMs;
          if (safeNowMs - candidateSince >= cfg.minTopMs) {
            repCompleted = isRepQualified(safeNowMs);
            if (repCompleted) {
              reps += 1;
              lastRepAt = safeNowMs;
            }
            enterState(PUSHUP_REP_STATE.TOP);
            resetMovement();
          }
        } else {
          candidateSince = null;
        }
        break;
      }
    }

    return snapshot({ repCompleted });
  }

  /**
   * Abandon the movement in progress.
   *
   * Used when tracking is lost: the user may have disappeared at the bottom
   * of a push-up and reappeared at the top, which would otherwise look like
   * a completed repetition nobody performed.
   */
  function abandon() {
    state = PUSHUP_REP_STATE.TOP;
    armed = false;
    resetMovement();
    deepestElbow = null;
    deepestRawElbow = null;
  }

  function reset() {
    abandon();
    armed = true;
    elbowEma = null;
    topAngle = null;
    lastRepAt = null;
    lastTimestamp = null;
    reps = 0;
  }

  return {
    update,
    abandon,
    reset,
    snapshot: () => snapshot(),
    get reps() {
      return reps;
    },
  };
}
