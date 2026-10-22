/**
 * Squat repetition detection.
 *
 * WHY THIS EXISTS
 * ---------------
 * The old counter qualified a repetition with ONE rule: the smoothed knee
 * angle had to dip below `REP_THRESHOLDS.squat.down` (110 deg) and come back
 * above `REP_THRESHOLDS.squat.up` (140 deg).
 *
 * 110 deg is not a squat depth. The codebase's own form assessment calls
 * anything above 120 deg "shallow", and the shipped model only ever saw
 * "correct" between 66 and 97 deg. So a quarter squat, a weight shift or a
 * sideways sway that happened to bend one knee past 110 deg was counted as a
 * complete repetition - and because the return only had to reach 140 deg, the
 * rep was credited while the user was still 30 deg short of standing.
 *
 * This module replaces that rule with an explicit five-phase machine:
 *
 *   STANDING -> DESCENDING -> BOTTOM -> ASCENDING -> STANDING
 *
 * A repetition is counted only when the WHOLE cycle was observed:
 *
 *   1. a calibrated standing position was established,
 *   2. a meaningful descent happened,
 *   3. real squat depth was reached,
 *   4. the user ascended,
 *   5. the user returned to (close to) standing.
 *
 * Anything else - a partial squat, a sway, a hold at the bottom, a dip that
 * never comes back up, a dip that was too shallow - leaves the counter
 * untouched.
 *
 * The module is PURE: it takes angles and a timestamp and returns a verdict.
 * It knows nothing about the camera, React or the model, which is what makes
 * every rule below testable without a webcam.
 *
 * A NOTE ON THE TWO ANGLES
 * ------------------------
 * The MEASURED angle is what the camera sees; the SMOOTHED angle is its
 * exponential moving average. They are used for different jobs:
 *
 *  - The MEASURED angle decides WHERE the user is (standing, at the bottom,
 *    back up). It is responsive, and the depth rules below are designed to
 *    survive a single mis-read frame.
 *  - The SMOOTHED angle decides what is STABLE (a confirmed descent, a
 *    confirmed rise off the bottom, a depth that was really reached). It lags,
 *    so it can never be used to decide that a movement has finished.
 */

export const SQUAT_REP_STATE = Object.freeze({
  STANDING: "standing",
  DESCENDING: "descending",
  BOTTOM: "bottom",
  ASCENDING: "ascending",
});

export const SQUAT_REP_THRESHOLDS = Object.freeze({
  /**
   * The MEASURED knee angle must reach at most this at the bottom.
   *
   * Anchored to the shipped model's own "correct" squat class
   * (65.96 - 96.99 deg) and to the form assessment, which only calls a rep
   * good below 120 deg. 103 deg keeps every genuine squat - including a fast
   * one, whose measured angle only briefly passes the threshold - while
   * rejecting the quarter squats that used to count.
   */
  maxDepthAngle: 103,

  /**
   * The SMOOTHED knee angle must also reach at most this.
   *
   * The measured angle alone is noisy: a single mis-read frame can dip below
   * the depth threshold for a moment without the user having moved. The
   * smoothed angle cannot be fooled that easily - one bad frame pulls the
   * average down by only 40% of the error - so the depth has to be confirmed
   * by BOTH signals. A transient spike therefore never reaches depth, while
   * a real bottom always does.
   */
  maxSmoothedDepthAngle: 110,

  /**
   * How far below the calibrated standing angle the knee must go before the
   * movement counts as a descent at all. Absorbs perspective and individual
   * body proportions: a user who stands with slightly bent knees still has to
   * flex meaningfully before a rep can start.
   */
  minFlexion: 45,

  /**
   * Degrees below the calibrated standing angle that still count as standing.
   * Deliberately generous - the user must NOT have perfectly straight joints.
   */
  standTolerance: 25,

  /**
   * The absolute floor for "standing". Below this the user has definitely
   * left the standing position, whatever the calibration says.
   */
  standFloor: 140,

  /** The descent must be confirmed for at least this long. */
  minDescentMs: 60,

  /** The return to standing must hold for at least this long. */
  minStandMs: 50,

  /** A repetition must last at least this long. */
  minCycleMs: 400,

  /** How far the knee must rise from the bottom before the ascent is real. */
  minAscentRise: 12,

  /**
   * The descent is always detected BEFORE the depth is reached, by at least
   * this much. It keeps the two thresholds consistent when the depth gate is
   * recalibrated: the machine can never be asked to reach a depth it has
   * already refused to descend into.
   */
  descentMargin: 5,

  /**
   * How far the hip must flex for the hip to corroborate the depth. The hip
   * angle is shoulder-hip-knee, so a real squat rotates the thigh and the
   * hip together.
   */
  minHipFlexion: 35,

  /**
   * How much the hip angle must have moved during the session before its
   * signal is trusted as a depth signal at all.
   *
   * A hip that never moves carries no information and must not be able to
   * reject a repetition. The threshold is deliberately tiny: it only has to
   * tell a live signal from a dead one.
   */
  hipSignalRange: 1,

  /**
   * The hip must be EXTENDED while standing for it to be a useful depth
   * signal. A user who already stands with a flexed hip has little hip range
   * to give, so requiring a hip flexion from them would reject legitimate
   * repetitions.
   */
  hipStandingFloor: 150,

  /**
   * Secondary protection only: the minimum gap between two counted reps.
   * The state machine is the real guard - this just stops a jitter at the
   * standing threshold from producing two reps back to back.
   */
  cooldownMs: 250,

  /** EMA factor for the knee and hip angles. */
  smoothing: 0.4,

  /** How fast the standing baseline is allowed to follow a lower posture. */
  baselineDecayDegPerSec: 5,
});

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * @param {object} [options]
 * @param {object} [options.thresholds] overrides for SQUAT_REP_THRESHOLDS
 * @param {number} [options.descentAngle] the tracker's descent threshold
 * @param {number} [options.standReturnAngle] the tracker's "back at the top"
 *   threshold. It still decides when the joint counts as returned to the top
 *   for the FORM ASSESSMENT, so the accuracy pipeline is untouched.
 */
export function createSquatRepDetector({
  thresholds = {},
  descentAngle = 110,
  standReturnAngle = 140,
} = {}) {
  const cfg = { ...SQUAT_REP_THRESHOLDS, ...thresholds };

  let state = SQUAT_REP_STATE.STANDING;
  let stateSince = null;
  let lastTimestamp = null;

  // Smoothed signals.
  let kneeEma = null;
  let hipEma = null;

  // Standing calibration.
  let standingKnee = null;
  let standingHip = null;
  let hipMax = null;
  let hipMin = null;
  let standThreshold = cfg.standFloor;

  // The movement in progress.
  let cycleStartedAt = null;
  let deepestKnee = null; // deepest SMOOTHED knee angle
  let deepestRawKnee = null; // deepest MEASURED knee angle
  let deepestHip = null;
  let depthReached = false;

  /**
   * The deepest angle since the joint last sat at the top.
   *
   * The FORM ASSESSMENT judges a repetition by this value, so its meaning is
   * kept exactly as it was: null while the joint is back at the top, the
   * running minimum otherwise. It is deliberately NOT tied to the repetition
   * state machine.
   */
  let repMinAngle = null;

  // Pending transition timers.
  let candidateSince = null;

  // Guards.
  let armed = true; // a standing position has been established
  let lastRepAt = null;
  let reps = 0;

  const ema = (previous, value) =>
    previous === null ? value : previous + cfg.smoothing * (value - previous);

  const enterState = (next, nowMs) => {
    state = next;
    stateSince = nowMs;
  };

  const resetMovement = () => {
    cycleStartedAt = null;
    deepestKnee = null;
    deepestRawKnee = null;
    deepestHip = null;
    depthReached = false;
    candidateSince = null;
  };

  /**
   * Has the hip signal proven itself?
   *
   * The hip angle is only a second depth signal once it has actually MOVED
   * in this session. A hip that never moves - a landmark that is not being
   * tracked, a body that does not hinge - carries no information and must
   * never be able to reject a repetition.
   */
  const hipSignalIsUsable = () => {
    if (hipMax === null || hipMin === null) return false;
    // The signal has to be live: a hip that never moves carries no
    // information and must not be able to reject a repetition.
    if (hipMax - hipMin < cfg.hipSignalRange) return false;
    // And the user has to stand with an extended hip for a hip flexion to
    // be expected during a squat.
    if (standingHip === null || standingHip < cfg.hipStandingFloor) return false;
    return true;
  };

  /**
   * Did the hip corroborate the depth?
   *
   * When the hip is a usable signal it has to have flexed with the knee. A
   * "knee-only" movement - the knee dipping while the hip stays extended, as
   * a sideways weight shift does - is not a squat.
   */
  const hipCorroborates = () => {
    if (!hipSignalIsUsable()) return true;
    if (standingHip === null || deepestHip === null) return true;
    return standingHip - deepestHip >= cfg.minHipFlexion;
  };

  /**
   * May the cycle that just finished be counted as a repetition?
   */
  function isRepQualified(nowMs) {
    // 1. The depth was actually reached, confirmed by BOTH signals.
    if (deepestKnee === null || deepestKnee > cfg.maxSmoothedDepthAngle) {
      return false;
    }
    if (deepestRawKnee === null || deepestRawKnee > cfg.maxDepthAngle) {
      return false;
    }

    // 2. The hip corroborates the depth, when the hip is a usable signal.
    if (!hipCorroborates()) return false;

    // 3. The whole cycle took a plausible amount of time.
    if (cycleStartedAt === null) return false;
    if (nowMs - cycleStartedAt < cfg.minCycleMs) return false;

    // 4. Secondary protection: two reps cannot land on top of each other.
    if (lastRepAt !== null && nowMs - lastRepAt < cfg.cooldownMs) return false;

    return true;
  }

  const snapshot = (extra = {}) => ({
    state,
    stateSince,
    reps,
    phase: state === SQUAT_REP_STATE.STANDING ? "up" : "down",
    smoothedAngle: kneeEma,
    standingAngle: standingKnee,
    deepestAngle: deepestKnee,
    depthReached,
    armed,
    ...extra,
  });

  /**
   * Feed one camera frame.
   *
   * @param {object} frame
   * @param {number} frame.kneeAngle  the measured knee angle (hip-knee-ankle)
   * @param {number?} [frame.hipAngle] the measured hip angle (shoulder-hip-knee)
   * @param {number} frame.nowMs
   */
  function update({ kneeAngle, hipAngle = null, nowMs }) {
    if (!isNumber(kneeAngle)) return snapshot();

    // --- smoothing ---------------------------------------------------------
    kneeEma = ema(kneeEma, kneeAngle);
    if (isNumber(hipAngle)) hipEma = ema(hipEma, hipAngle);

    const dt = lastTimestamp === null ? 0 : Math.max(0, nowMs - lastTimestamp);
    lastTimestamp = nowMs;

    // --- standing calibration ---------------------------------------------
    // The upright posture is the highest knee angle the user reaches. It is
    // tracked as a running maximum (an outlier cannot drag it down) and is
    // allowed to drift down slowly while the user stands, so a camera that
    // moves - or a user whose posture relaxes - is followed rather than
    // frozen.
    if (standingKnee === null) {
      // The baseline can only be learned from a CLEARLY upright pose. A
      // session that starts mid-squat must not calibrate the standing angle
      // to the bottom of that squat - the thresholds would then be measured
      // against a position the user never stands in.
      if (kneeEma >= cfg.standFloor) standingKnee = kneeEma;
    } else if (kneeEma > standingKnee) {
      standingKnee = kneeEma;
    } else if (
      state === SQUAT_REP_STATE.STANDING &&
      kneeEma >= standThreshold
    ) {
      const decay = (cfg.baselineDecayDegPerSec * dt) / 1000;
      standingKnee = Math.max(kneeEma, standingKnee - decay);
    }

    if (hipEma !== null) {
      if (hipMax === null) {
        hipMax = hipEma;
        hipMin = hipEma;
      } else {
        hipMax = Math.max(hipMax, hipEma);
        hipMin = Math.min(hipMin, hipEma);
      }
      if (standingHip === null || hipEma > standingHip) standingHip = hipEma;
    }

    // Until the baseline is known the absolute thresholds are used, so a
    // session that starts mid-squat still detects the descent.
    standThreshold =
      standingKnee === null
        ? cfg.standFloor
        : Math.max(cfg.standFloor, standingKnee - cfg.standTolerance);

    // The MEASURED angle decides where the user is; the smoothed one is only
    // used to decide what is stable.
    const atStanding = kneeAngle >= standThreshold;
    const belowStanding = kneeAngle < standThreshold;

    // A descent must be a REAL reduction from the calibrated standing angle,
    // not merely a crossing of the tracker's descent threshold - and it is
    // always detected before the depth gate is reached, so the two can never
    // contradict each other.
    const descentThreshold =
      standingKnee === null
        ? Math.max(descentAngle, cfg.maxDepthAngle + cfg.descentMargin)
        : Math.max(
            Math.min(descentAngle, standingKnee - cfg.minFlexion),
            cfg.maxDepthAngle + cfg.descentMargin
          );

    // --- the movement in progress ------------------------------------------
    //
    // The deepest angles and the depth evidence are tracked CONTINUOUSLY,
    // not only inside a confirmed cycle: on a fast repetition the smoothed
    // angle crosses the descent threshold only at the very bottom, so the
    // depth window would already have closed by the time the descent was
    // confirmed. They are discarded whenever the user is back at standing,
    // so every repetition has to earn its own depth.
    if (kneeEma < (deepestKnee ?? Infinity)) deepestKnee = kneeEma;
    if (kneeAngle < (deepestRawKnee ?? Infinity)) deepestRawKnee = kneeAngle;
    if (hipEma !== null && hipEma < (deepestHip ?? Infinity)) {
      deepestHip = hipEma;
    }

    // The depth is reached when BOTH signals say so. The measured angle
    // proves the user really was that deep; the smoothed angle proves it was
    // not a one-frame mis-read. No duration is involved, so the rule behaves
    // identically at 15fps and at 60fps.
    depthReached =
      deepestKnee !== null &&
      deepestRawKnee !== null &&
      deepestKnee <= cfg.maxSmoothedDepthAngle &&
      deepestRawKnee <= cfg.maxDepthAngle;

    if (state === SQUAT_REP_STATE.STANDING && atStanding) {
      // Back at standing: the evidence of the previous movement is dropped.
      if (cycleStartedAt !== null) resetMovement();
      deepestKnee = kneeEma;
      deepestRawKnee = kneeAngle;
      deepestHip = hipEma;
    }

    if (belowStanding && cycleStartedAt === null) {
      // The user left the standing position: the cycle begins now.
      cycleStartedAt = nowMs;
    }

    let repCompleted = false;

    switch (state) {
      // ------------------------------------------------------------ STANDING
      case SQUAT_REP_STATE.STANDING: {
        if (atStanding) armed = true;

        if (armed && kneeAngle <= descentThreshold) {
          if (candidateSince === null) candidateSince = nowMs;
          if (nowMs - candidateSince >= cfg.minDescentMs) {
            enterState(SQUAT_REP_STATE.DESCENDING, nowMs);
            candidateSince = null;
          }
        } else {
          candidateSince = null;
        }
        break;
      }

      // -------------------------------------------------- DESCENDING / BOTTOM
      case SQUAT_REP_STATE.DESCENDING:
      case SQUAT_REP_STATE.BOTTOM: {
        if (
          state === SQUAT_REP_STATE.DESCENDING &&
          kneeEma <= cfg.maxSmoothedDepthAngle
        ) {
          enterState(SQUAT_REP_STATE.BOTTOM, nowMs);
        }

        // The ascent starts once the knee has risen meaningfully off the
        // bottom. A jitter around the minimum is not an ascent.
        if (kneeEma - (deepestKnee ?? kneeEma) >= cfg.minAscentRise) {
          enterState(SQUAT_REP_STATE.ASCENDING, nowMs);
          candidateSince = null;
        }
        break;
      }

      // ------------------------------------------------------------ ASCENDING
      case SQUAT_REP_STATE.ASCENDING: {
        if (kneeEma < (deepestKnee ?? kneeEma)) {
          // The user sank again: that was not an ascent.
          enterState(SQUAT_REP_STATE.BOTTOM, nowMs);
          candidateSince = null;
          break;
        }

        if (atStanding) {
          if (candidateSince === null) candidateSince = nowMs;
          if (nowMs - candidateSince >= cfg.minStandMs) {
            repCompleted = isRepQualified(nowMs);
            if (repCompleted) {
              reps += 1;
              lastRepAt = nowMs;
            }
            enterState(SQUAT_REP_STATE.STANDING, nowMs);
            resetMovement();
          }
        } else {
          candidateSince = null;
        }
        break;
      }
    }

    // The deepest angle since the joint last sat at the top, with exactly
    // the meaning it always had: null while the joint is back at the top, the
    // running minimum otherwise. The form assessment - and therefore the
    // session accuracy - reads this value, so it is deliberately NOT tied to
    // the repetition state machine.
    if (repMinAngle === null || kneeEma < repMinAngle) repMinAngle = kneeEma;
    if (kneeEma >= standReturnAngle) repMinAngle = null;

    return snapshot({ repCompleted, repMinAngle });
  }

  /**
   * Abandon the movement in progress.
   *
   * Used when tracking is lost: the user may have disappeared at the bottom
   * of a squat and reappeared standing, which would otherwise look like a
   * completed repetition nobody performed. After an abandon a standing
   * position must be established again before the next descent counts.
   */
  function abandon() {
    state = SQUAT_REP_STATE.STANDING;
    stateSince = null;
    armed = false;
    resetMovement();
    deepestKnee = null;
    deepestRawKnee = null;
    deepestHip = null;
  }

  function reset() {
    abandon();
    armed = true;
    kneeEma = null;
    hipEma = null;
    standingKnee = null;
    standingHip = null;
    hipMax = null;
    hipMin = null;
    standThreshold = cfg.standFloor;
    lastTimestamp = null;
    lastRepAt = null;
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
