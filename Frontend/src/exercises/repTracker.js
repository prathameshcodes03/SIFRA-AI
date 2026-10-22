/**
 * Rep / set phase tracking.
 *
 * This module is intentionally pure and framework-free so it can be unit
 * tested and so that the camera loop can update rep counters on EVERY frame
 * without waiting for the ML network round-trip.
 *
 * Rep counting is driven purely by local joint angles from MediaPipe landmarks.
 * It never counts a rep because the ML model said the form was correct.
 */

import { createSquatRepDetector } from "./squatRepDetector.js";
import { createPushupRepDetector } from "./pushupRepDetector.js";
import { createPlankHold, isPlankPose } from "./plankHold.js";

export const PHASE = {
  UP: "up",
  DOWN: "down",
};

/**
 * Movement thresholds per exercise, expressed as "the joint angle has passed
 * below/above this value".
 *
 * `down`/`up` form a hysteresis band so noisy landmarks cannot flip the phase
 * inside the dead zone.
 *
 * Values are biomechanically anchored:
 *  - Squat  : knee flexion (hip-knee-ankle). Standing is ~170-180deg, a squat
 *             bottom is ~70-110deg.
 *  - Push-up: elbow flexion (shoulder-elbow-wrist). Locked out is ~170-180deg,
 *             bottom of the rep is ~70-100deg.
 *
 * `minCycleMs` is a physiological floor. It is measured from CONFIRMED descent
 * to CONFIRMED return, which costs ~264ms over the true movement time (the
 * EMA lag plus the stability confirmation), so:
 *   measured 462ms  <=>  a real 1.32s squat  -> accepted
 *   measured 363ms  <=>  a real 0.99s squat  -> rejected
 *   measured 231ms  <=>  a real 0.66s dip    -> rejected
 * Measured against the shipped EMA (0.4) and 30fps sampling, so 400ms accepts
 * any genuine squat cycle of ~1.25s or longer and rejects anything faster -
 * faster than that is a twitch, not a repetition.
 *
 * `stableFrames` requires a condition to persist across consecutive frames
 * (~66ms at 30fps) before the phase moves, which rejects single-frame spikes
 * without adding perceptible lag.
 */
export const REP_THRESHOLDS = {
  squat: {
    signal: "knee_angle",
    down: 110,
    up: 140,
    minCycleMs: 400,
    stableFrames: 2,
  },
  pushup: {
    signal: "elbow_angle",
    down: 100,
    up: 140,
    minCycleMs: 350,
    stableFrames: 2,
  },
};

/** Plank is an isometric hold, counted in seconds, not reps. */
export const PLANK_HOLD_SIGNAL = "body_angle";

/** Below this measured visibility the pose cannot be trusted. */
export const MIN_TRACKING_VISIBILITY = 0.5;

/**
 * A gap longer than this discards any movement in progress. Shorter gaps
 * (a dropped frame, a brief occlusion) are tolerated so a rep in progress is
 * not destroyed by one bad frame.
 */
export const MAX_TRACKING_GAP_MS = 400;

/**
 * A frame arriving much later than the previous one means the session was
 * interrupted rather than merely slow: a backgrounded tab (browsers throttle
 * requestAnimationFrame to ~1fps or pause it entirely), a sleeping laptop, or
 * a camera stall. Any half-finished rep is abandoned rather than being
 * completed by whatever happens to be on screen at the moment of return.
 *
 * 1500ms sits well above a slow device still delivering frames (2fps = 500ms)
 * and well below any genuine resume gap.
 */
export const RESUME_GAP_MS = 1500;

/** Exponential moving average factor applied to raw joint angles. */
const DEFAULT_SMOOTHING = 0.4;

/** Maps a feature key to its entry in `features.measured`. */
const MEASURED_KEY_BY_SIGNAL = {
  knee_angle: "knee",
  elbow_angle: "elbow",
  hip_angle: "hip",
  body_angle: "body",
};

/**
 * @param {object} config
 * @param {string} config.exercise  "squat" | "pushup" | "plank"
 * @param {number} config.requiredSets
 * @param {number} config.requiredReps
 * @param {number} [config.smoothing]      EMA factor (0 < f <= 1). Lower = smoother.
 * @param {number} [config.maxTrackingGapMs]
 */
export function createRepTracker({
  exercise,
  requiredSets = 1,
  requiredReps = 10,
  smoothing = DEFAULT_SMOOTHING,
  maxTrackingGapMs = MAX_TRACKING_GAP_MS,
} = {}) {
  const normalized = String(exercise || "").trim().toLowerCase();

  let smoothed = null;
  let phase = PHASE.UP;
  let reps = 0;
  let sets = 1;
  let setReps = 0;
  let holdSeconds = 0;
  let lastFrameAt = 0;
  let holdFormOk = false;
  let finished = false;
  /**
   * Deepest (smallest) smoothed angle reached during the CURRENT descent
   * attempt, cleared once the joint returns to the top.
   *
   * Form coaching must judge the rep, not the instant: a squat lasts ~1-2s
   * while the ML cadence is 600ms, so a prediction rarely lands exactly at the
   * bottom. Without this, the assessment would miss the bottom of most reps
   * and either say nothing or judge a stale mid-descent angle.
   */
  let repMinAngle = null;

  // --- cycle state machine -------------------------------------------------
  /** When the current descent was confirmed. A rep cannot be faster than this. */
  let descentStartedAt = 0;
  /** Consecutive frames confirming a move below `down` / above `up`. */
  let belowStreak = 0;
  let aboveStreak = 0;
  /** Start of the current run of unusable frames, or null while tracking well. */
  let invalidSince = null;
  /**
   * A descent may only be confirmed from a genuine standing position.
   *
   * After a tracking loss the camera can "lose" the user at the bottom of a
   * squat and then see them stand up. Without this guard that would look like
   * a descent followed by a return and count a repetition nobody performed.
   */
  let armedAtTop = true;

  const isHold = normalized === "plank";
  const isSquat = normalized === "squat";
  const isPushup = normalized === "pushup";

  /**
   * The squat repetition detector.
   *
   * Squat repetitions are detected by a dedicated five-phase state machine:
   * the generic two-phase machine further down (descend / return) could not
   * tell a real repetition from a quarter squat - the only qualification was
   * "the knee went below 110 deg and came back above 140 deg", and 110 deg
   * is not a squat depth.
   *
   * The detector owns the whole squat cycle - standing calibration, descent,
   * bottom validation, ascent and return - and hands the tracker a single
   * verdict.
   */
  const squatDetector = isSquat
    ? createSquatRepDetector({
        descentAngle: REP_THRESHOLDS.squat.down,
        standReturnAngle: REP_THRESHOLDS.squat.up,
      })
    : null;

  /**
   * The push-up repetition detector.
   *
   * A push-up is a whole-body movement, so its detector validates the body
   * alignment and the body orientation as well as the elbow angle. Without
   * that, a user lying on the floor waving their arms produced "repetitions".
   */
  const pushupDetector = isPushup
    ? createPushupRepDetector({
        minCycleMs: REP_THRESHOLDS.pushup.minCycleMs,
      })
    : null;

  /**
   * The plank hold timer.
   *
   * A plank is a timed hold, not a repetition: the timer measures the time
   * the user actually spent in a valid plank position.
   */
  const plankHold = isHold ? createPlankHold() : null;

  function smooth(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return smoothed;
    if (smoothed === null) {
      smoothed = value;
    } else {
      smoothed = smoothed + smoothing * (value - smoothed);
    }
    return smoothed;
  }

  /** Drop any movement in progress; used on sustained tracking loss. */
  function abandonMotion() {
    phase = PHASE.UP;
    repMinAngle = null;
    descentStartedAt = 0;
    belowStreak = 0;
    aboveStreak = 0;
    // A new descent must start from a real standing position again.
    armedAtTop = false;
    // The squat detector keeps its own cycle, so it has to be told too.
    squatDetector?.abandon();
    pushupDetector?.abandon();
    // A lost pose breaks the hold: the accumulated time survives, but the
    // pose has to be confirmed again before any more is banked.
    plankHold?.breakHold();
  }

  /**
   * Can this frame be believed?
   *
   * Requires the joint angle to have been genuinely measured. A frame whose
   * `measured[signal]` is explicitly false carries a placeholder value, not a
   * measurement, and must never move the state machine. Frames with no
   * `measured` block at all are treated as measured, so hand-built fixtures
   * and any older caller keep working.
   */
  function isUsable(features, signal) {
    if (!features) return false;

    const measured = features.measured;
    const key = MEASURED_KEY_BY_SIGNAL[signal];
    if (measured && key && measured[key] === false) return false;

    const visibility =
      typeof features.pose_visibility === "number"
        ? features.pose_visibility
        : typeof features.landmark_visibility === "number"
        ? features.landmark_visibility
        : 1;

    return visibility >= MIN_TRACKING_VISIBILITY;
  }

  const snapshot = (extra) => ({
    phase,
    reps,
    sets,
    setReps,
    holdSeconds,
    smoothedAngle: smoothed,
    repMinAngle,
    setJustCompleted: false,
    exerciseJustCompleted: false,
    holdFormOk,
    ...extra,
  });

  /**
   * Feed one frame of features.
   *
   * @param {object|null} features   output of extractExerciseFeatures
   * @param {number} nowMs
   * @param {{reliable?:boolean}} [context] `reliable:false` forces the frame to
   *   be treated as unusable, so a caller that already knows tracking is poor
   *   does not have to duplicate the check.
   * @returns {{phase:string, reps:number, sets:number, setReps:number,
   *            holdSeconds:number, smoothedAngle:number|null,
   *            repMinAngle:number|null, setJustCompleted:boolean,
   *            exerciseJustCompleted:boolean, holdFormOk:boolean,
   *            trackingOk:boolean}}
   */
  function update(features, nowMs, context = {}) {
    if (finished) return snapshot({ trackingOk: invalidSince === null });

    const thresholds = REP_THRESHOLDS[normalized];
    const signal = isHold ? PLANK_HOLD_SIGNAL : thresholds?.signal;

    // ---- tracking gate ----------------------------------------------------
    const usable =
      context.reliable !== false &&
      isUsable(features, signal) &&
      typeof features[signal] === "number" &&
      Number.isFinite(features[signal]);

    if (!usable) {
      if (invalidSince === null) invalidSince = nowMs;
      // A brief occlusion is tolerated; sustained loss abandons the movement
      // so that recovery cannot complete a repetition nobody performed.
      if (nowMs - invalidSince >= maxTrackingGapMs) {
        abandonMotion();
        if (isHold) holdSeconds = 0;
        holdFormOk = false;
      }
      return snapshot({ trackingOk: false });
    }

    invalidSince = null;

    // A long gap means the session was interrupted (backgrounded tab, sleep,
    // camera stall), not that the user moved slowly. Anything half-finished is
    // abandoned so the first frame back cannot complete a rep nobody finished.
    const gapMs = lastFrameAt ? Math.max(0, nowMs - lastFrameAt) : 0;
    const resumed = lastFrameAt > 0 && gapMs > RESUME_GAP_MS;
    if (resumed) {
      abandonMotion();
    }

    lastFrameAt = nowMs;

    // The plank banks the REAL elapsed time, not a capped frame delta: a
    // slow camera must not make the hold run at a fraction of real time. The
    // hold module caps the gap itself, and a resumed session banks nothing
    // because the pose was not verified while the tab was hidden.
    const holdDtMs = resumed ? 0 : gapMs;

    // ---- plank: a timed hold, never a repetition --------------------------
    //
    // The timer measures the time the user actually spent in a valid plank.
    // It is not "how long the camera was running": a standing user has a
    // perfectly straight body line, so the body ORIENTATION is what decides
    // that the user is in a plank at all.
    if (isHold) {
      const body = smooth(features[PLANK_HOLD_SIGNAL]);
      const poseValid = isPlankPose({
        bodyAngle: typeof body === "number" ? body : null,
        bodyTilt:
          typeof features.body_tilt === "number" &&
          Number.isFinite(features.body_tilt)
            ? features.body_tilt
            : null,
        symmetryScore: features.symmetry_score,
      });

      const outcome = plankHold.update({
        valid: poseValid,
        nowMs,
        dtMs: holdDtMs,
      });

      holdFormOk = outcome.formOk;
      // The whole seconds already banked live in `setReps`; this is only the
      // fraction still to come.
      holdSeconds = outcome.seconds - outcome.wholeSeconds;

      let setJustCompleted = false;
      let exerciseJustCompleted = false;

      while (outcome.wholeSeconds > setReps && setReps < requiredReps) {
        setReps += 1;

        if (setReps >= requiredReps) {
          setJustCompleted = true;
          if (sets >= requiredSets) {
            finished = true;
            exerciseJustCompleted = true;
          } else {
            sets += 1;
            setReps = 0;
          }
          break;
        }
      }
      if (finished) holdSeconds = 0;

      return snapshot({
        setJustCompleted,
        exerciseJustCompleted,
        trackingOk: true,
      });
    }

    if (!thresholds) return snapshot({ trackingOk: true });

    // ---- squat: a dedicated five-phase repetition machine ------------------
    //
    // The generic machine below only knows "below `down`" and "above `up`",
    // which for squats could not tell a real repetition from a quarter squat.
    // The detector validates the whole cycle instead: standing calibration,
    // a meaningful descent, real squat depth, an ascent and a return to
    // standing. It also owns the smoothing, so the tracker reads the
    // smoothed knee angle straight from it.
    if (isSquat) {
      const outcome = squatDetector.update({
        kneeAngle: features[thresholds.signal],
        hipAngle:
          typeof features.hip_angle === "number" &&
          Number.isFinite(features.hip_angle)
            ? features.hip_angle
            : null,
        nowMs,
      });

      smoothed = outcome.smoothedAngle;
      repMinAngle = outcome.repMinAngle;
      phase = outcome.phase === "up" ? PHASE.UP : PHASE.DOWN;

      let setJustCompleted = false;
      let exerciseJustCompleted = false;

      if (outcome.repCompleted) {
        reps += 1;
        setReps += 1;

        if (setReps >= requiredReps) {
          setJustCompleted = true;
          if (sets >= requiredSets) {
            finished = true;
            exerciseJustCompleted = true;
          } else {
            sets += 1;
            setReps = 0;
          }
        }
      }

      return snapshot({
        setJustCompleted,
        exerciseJustCompleted,
        trackingOk: true,
      });
    }

    // ---- push-up: the same five-phase machine, with the body validated ----
    //
    // A push-up is a whole-body movement. The generic machine further down
    // only knew the elbow angle, so a user lying on the floor waving their
    // arms produced "repetitions", and so did a standing user raising and
    // lowering their elbows.
    if (isPushup) {
      const outcome = pushupDetector.update({
        elbowAngle: features[thresholds.signal],
        bodyAngle:
          typeof features.body_angle === "number" &&
          Number.isFinite(features.body_angle)
            ? features.body_angle
            : null,
        hipAngle:
          typeof features.hip_angle === "number" &&
          Number.isFinite(features.hip_angle)
            ? features.hip_angle
            : null,
        bodyTilt:
          typeof features.body_tilt === "number" &&
          Number.isFinite(features.body_tilt)
            ? features.body_tilt
            : null,
        nowMs,
      });

      smoothed = outcome.smoothedAngle;
      repMinAngle = outcome.deepestAngle;
      phase = outcome.phase === "up" ? PHASE.UP : PHASE.DOWN;

      let setJustCompleted = false;
      let exerciseJustCompleted = false;

      if (outcome.repCompleted) {
        reps += 1;
        setReps += 1;

        if (setReps >= requiredReps) {
          setJustCompleted = true;
          if (sets >= requiredSets) {
            finished = true;
            exerciseJustCompleted = true;
          } else {
            sets += 1;
            setReps = 0;
          }
        }
      }

      return snapshot({
        setJustCompleted,
        exerciseJustCompleted,
        trackingOk: true,
      });
    }

    const angle = smooth(features[thresholds.signal]);
    if (angle === null) return snapshot({ trackingOk: true });

    // ---- the generic two-phase machine ------------------------------------
    //
    // The fallback for an exercise that has thresholds but no dedicated
    // detector: "below `down`" and "above `up`", with a repetition counted
    // when the joint goes down and comes back. Squats and push-ups have their
    // own machines above, because this one cannot tell a real repetition
    // from a partial one.

    // ---- stability counters ----------------------------------------------
    if (angle < thresholds.down) {
      belowStreak += 1;
      aboveStreak = 0;
    } else if (angle > thresholds.up) {
      aboveStreak += 1;
      belowStreak = 0;
    } else {
      // Inside the hysteresis band: neither condition is advancing.
      belowStreak = 0;
      aboveStreak = 0;
    }

    // Decide using the depth accumulated so far. This must be read BEFORE the
    // top-of-rep clear below, otherwise the very frame that completes the
    // return would erase the evidence that the bottom was reached.
    const reachedBottom = repMinAngle !== null && repMinAngle < thresholds.down;

    // Standing clears the "must return to the top first" guard.
    if (angle > thresholds.up) armedAtTop = true;

    let setJustCompleted = false;
    let exerciseJustCompleted = false;

    if (phase === PHASE.UP) {
      if (
        armedAtTop &&
        belowStreak >= thresholds.stableFrames &&
        angle < thresholds.down
      ) {
        phase = PHASE.DOWN;
        descentStartedAt = nowMs;
      }
    } else if (aboveStreak >= thresholds.stableFrames && angle > thresholds.up) {
      const cycleMs = nowMs - descentStartedAt;
      const longEnough = cycleMs >= thresholds.minCycleMs;

      // Return to standing either way, but only a genuine, complete,
      // long-enough cycle earns a repetition. An interrupted or impossibly
      // fast cycle is abandoned silently.
      phase = PHASE.UP;
      belowStreak = 0;
      aboveStreak = 0;

      if (longEnough && reachedBottom) {
        reps += 1;
        setReps += 1;

        if (setReps >= requiredReps) {
          setJustCompleted = true;
          if (sets >= requiredSets) {
            finished = true;
            exerciseJustCompleted = true;
          } else {
            sets += 1;
            setReps = 0;
          }
        }
      }
    }

    // Deepest point of the current attempt, maintained for the NEXT frame's
    // decision.
    //
    // The clear only runs once the phase is back at the top. Clearing on the
    // first frame above `up` would wipe the evidence during the
    // `stableFrames` confirmation window, so no rep could ever register.
    if (repMinAngle === null || angle < repMinAngle) {
      repMinAngle = angle;
    }
    if (phase === PHASE.UP && angle >= thresholds.up) {
      repMinAngle = null;
    }

    return snapshot({
      setJustCompleted,
      exerciseJustCompleted,
      trackingOk: true,
    });
  }

  function reset() {
    smoothed = null;
    phase = PHASE.UP;
    reps = 0;
    sets = 1;
    setReps = 0;
    holdSeconds = 0;
    lastFrameAt = 0;
    holdFormOk = false;
    finished = false;
    repMinAngle = null;
    abandonMotion();
    invalidSince = null;
    armedAtTop = true;
    // The squat detector carries its own calibration and cycle state, so a
    // new session must start from a clean slate as well.
    squatDetector?.reset();
    pushupDetector?.reset();
    plankHold?.reset();
  }

  return { update, reset, isFinished: () => finished };
}