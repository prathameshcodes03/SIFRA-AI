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
 * Frames are ~33ms apart, but a backgrounded tab can deliver one enormous
 * step. Clamping stops a hidden tab from banking plank seconds on resume.
 */
export const MAX_FRAME_DT_MS = 250;

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
    if (lastFrameAt > 0 && nowMs - lastFrameAt > RESUME_GAP_MS) {
      abandonMotion();
    }

    const dt = lastFrameAt
      ? Math.min(MAX_FRAME_DT_MS, Math.max(0, nowMs - lastFrameAt))
      : 0;
    lastFrameAt = nowMs;

    // ---- plank: a timed hold, never a repetition --------------------------
    if (isHold) {
      const body = smooth(features[PLANK_HOLD_SIGNAL]);
      holdFormOk =
        typeof body === "number" &&
        features.symmetry_score >= 0.7 &&
        body >= 150;

      if (!holdFormOk) {
        // Never bank partial seconds across a broken line or a lost pose.
        holdSeconds = 0;
        return snapshot({ trackingOk: true });
      }

      holdSeconds += dt / 1000;
      let setJustCompleted = false;
      let exerciseJustCompleted = false;

      while (holdSeconds >= 1 && setReps < requiredReps) {
        holdSeconds -= 1;
        // Only the hold counter advances. `reps` stays 0: a plank has no
        // repetitions, and the rep figure feeds rep-based workout reporting.
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

    const angle = smooth(features[thresholds.signal]);
    if (angle === null) return snapshot({ trackingOk: true });

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
  }

  return { update, reset, isFinished: () => finished };
}