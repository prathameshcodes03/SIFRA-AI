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
 * Values are biomechanically anchored:
 *  - Squat  : knee flexion (hip-knee-ankle). Standing is ~170-180deg, a squat
 *             bottom is ~70-110deg.
 *  - Push-up: elbow flexion (shoulder-elbow-wrist). Locked out is ~170-180deg,
 *             bottom of the rep is ~70-100deg.
 *
 * `down` and `up` form a hysteresis band so noisy landmarks cannot toggle the
 * phase back and forth inside the dead zone and double count a rep.
 */
export const REP_THRESHOLDS = {
  squat: {
    signal: "knee_angle",
    down: 110,
    up: 140,
  },
  pushup: {
    signal: "elbow_angle",
    down: 100,
    up: 140,
  },
};

/** Plank is an isometric hold, counted in seconds, not reps. */
export const PLANK_HOLD_SIGNAL = "body_angle";

/** Exponential moving average factor applied to raw joint angles. */
const DEFAULT_SMOOTHING = 0.4;

/** Minimum ms between accepted phase transitions, guards noisy landmark spikes. */
const MIN_TRANSITION_INTERVAL_MS = 250;

/**
 * @param {object} config
 * @param {string} config.exercise  "squat" | "pushup" | "plank"
 * @param {number} config.requiredSets
 * @param {number} config.requiredReps
 * @param {number} [config.smoothing]      EMA factor (0 < f <= 1). Lower = smoother.
 * @param {number} [config.minTransitionMs]
 */
export function createRepTracker({
  exercise,
  requiredSets = 1,
  requiredReps = 10,
  smoothing = DEFAULT_SMOOTHING,
  minTransitionMs = MIN_TRANSITION_INTERVAL_MS,
} = {}) {
  const normalized = String(exercise || "").trim().toLowerCase();

  let smoothed = null;
  let phase = PHASE.UP;
  let reps = 0;
  let sets = 1;
  let setReps = 0;
  let holdSeconds = 0;
  let lastTransitionAt = 0;
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

  /**
   * Feed one frame of features.
   * @param {object|null} features  output of extractExerciseFeatures
   * @param {number} nowMs
   * @returns {{phase:string, reps:number, sets:number, setReps:number,
   *            holdSeconds:number, smoothedAngle:number|null,
   *            setJustCompleted:boolean, exerciseJustCompleted:boolean,
   *            holdFormOk:boolean}}
   */
  function update(features, nowMs) {
    const empty = {
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
    };

    if (finished || !features) return empty;

    const dt = lastFrameAt ? Math.max(0, nowMs - lastFrameAt) : 0;
    lastFrameAt = nowMs;

    let setJustCompleted = false;
    let exerciseJustCompleted = false;

    if (isHold) {
      // Plank: accumulate whole seconds while the hold is acceptable.
      const body = smooth(features[PLANK_HOLD_SIGNAL]);
      holdFormOk =
        typeof body === "number" &&
        features.symmetry_score >= 0.7 &&
        body >= 150;

      if (holdFormOk) {
        holdSeconds += dt / 1000;
        while (holdSeconds >= 1 && setReps < requiredReps) {
          holdSeconds -= 1;
          setReps += 1;
          reps += 1;

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
      } else {
        // Do not reward a broken hold; reset the fractional second so a user
        // cannot bank partial seconds across form breaks.
        holdSeconds = 0;
      }

      return {
        phase,
        reps,
        sets,
        setReps,
        holdSeconds,
        smoothedAngle: smoothed,
        repMinAngle,
        setJustCompleted,
        exerciseJustCompleted,
        holdFormOk,
      };
    }

    const thresholds = REP_THRESHOLDS[normalized];
    if (!thresholds) return empty;

    const angle = smooth(features[thresholds.signal]);
    if (angle === null) return empty;

    // Track the depth of the current descent attempt. Reaching the top clears
    // it, so standing between reps never inherits an old minimum.
    if (angle >= thresholds.up) {
      repMinAngle = null;
    } else if (repMinAngle === null || angle < repMinAngle) {
      repMinAngle = angle;
    }

    const canTransition = nowMs - lastTransitionAt >= minTransitionMs;

    if (phase === PHASE.UP && angle < thresholds.down && canTransition) {
      phase = PHASE.DOWN;
      lastTransitionAt = nowMs;
    } else if (phase === PHASE.DOWN && angle > thresholds.up && canTransition) {
      phase = PHASE.UP;
      lastTransitionAt = nowMs;

      // One full up -> down -> up cycle is one completed repetition.
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

    return {
      phase,
      reps,
      sets,
      setReps,
      holdSeconds: 0,
      smoothedAngle: smoothed,
      repMinAngle,
      setJustCompleted,
      exerciseJustCompleted,
      holdFormOk: false,
    };
  }

  function reset() {
    smoothed = null;
    phase = PHASE.UP;
    reps = 0;
    sets = 1;
    setReps = 0;
    holdSeconds = 0;
    lastTransitionAt = 0;
    lastFrameAt = 0;
    holdFormOk = false;
    finished = false;
    repMinAngle = null;
  }

  return { update, reset, isFinished: () => finished };
}