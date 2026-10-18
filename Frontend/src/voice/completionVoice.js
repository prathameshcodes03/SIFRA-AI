import { playSpeech, stopPlayers } from "../hooks/speechPlayer";

/**
 * Workout-completion announcement.
 *
 * Fires only when the ENTIRE workout is confirmed complete - never per set,
 * never between exercises, never on pause/cancel. It reuses the shared
 * `speechPlayer`, so it is the same ElevenLabs route and the same audio cache
 * as live coaching: a replay costs no extra credits.
 */

/**
 * Written to be read aloud: encouraging, specific, and bounded to what a
 * fitness coach would actually say. No exclamation-point pile-up.
 */
export const WORKOUT_COMPLETE_MESSAGE =
  "Congratulations! You've completed your workout. " +
  "Great job showing up and putting in the work today. " +
  "Take a moment to catch your breath, hydrate, and be proud of your progress. " +
  "Keep showing up, and you'll keep getting stronger!";

/** Owner key, separate from the coaching player so the two never fight. */
export const COMPLETION_VOICE_OWNER = "completion";

/** Cap how long the caller waits for playback before moving on. */
export const COMPLETION_PLAYBACK_TIMEOUT_MS = 20000;

/**
 * Ids of workouts already announced.
 *
 * Bounded and insertion-ordered: a re-render, a duplicate completion event or
 * a route change all reuse the same id and are refused; a genuinely new
 * workout produces a new id and is allowed.
 */
const MAX_TRACKED_KEYS = 16;
const announcedKeys = new Set();

let sessionCounter = 0;

/**
 * A stable id for one workout attempt.
 *
 * The counter is monotonic per page load, so re-mounting the workout (a new
 * attempt) is always eligible, while repeated calls within the same mounted
 * attempt return the same id.
 */
export function createWorkoutSessionKey(workoutId, exercise) {
  sessionCounter += 1;
  return `${workoutId ?? "adhoc"}:${exercise ?? "workout"}:${sessionCounter}`;
}

/** Has this exact workout attempt already been announced? */
export function hasAnnouncedWorkout(workoutKey) {
  return announcedKeys.has(workoutKey);
}

/** Forget announcements. Tests only. */
export function resetCompletionAnnouncements() {
  announcedKeys.clear();
  sessionCounter = 0;
}

function remember(workoutKey) {
  announcedKeys.add(workoutKey);
  while (announcedKeys.size > MAX_TRACKED_KEYS) {
    const oldest = announcedKeys.values().next().value;
    announcedKeys.delete(oldest);
  }
}

/**
 * Announce workout completion exactly once.
 *
 * Never throws: a voice problem must not break the completion screen.
 *
 * @param {object} params
 * @param {string} params.workoutKey   id from createWorkoutSessionKey
 * @param {boolean} [params.muted]     respect the existing voice preference
 * @param {Function} [params.onMessage] receives the text so it can be shown
 *   on screen (readable when audio is off, and replayable)
 * @param {Function} [params.onSettled] called when playback finishes or fails,
 *   so the caller can continue its flow
 * @returns {Promise<{announced:boolean, reason?:string, status?:string}>}
 */
export async function announceWorkoutCompletion({
  workoutKey,
  muted = false,
  onMessage,
  onSettled,
} = {}) {
  // The text is always surfaced, even when nothing is spoken.
  if (typeof onMessage === "function") onMessage(WORKOUT_COMPLETE_MESSAGE);

  if (!workoutKey) {
    if (typeof onSettled === "function") onSettled({ status: "no_key" });
    return { announced: false, reason: "no_key" };
  }

  // Idempotent on identity, not on a timer or a cooldown.
  if (hasAnnouncedWorkout(workoutKey)) {
    if (typeof onSettled === "function") onSettled({ status: "duplicate" });
    return { announced: false, reason: "already_announced" };
  }

  // Claim the id before any async work so two rapid calls cannot both proceed.
  remember(workoutKey);

  if (muted) {
    // Voice disabled: never force audio on, but keep the key claimed so the
    // caller's later unmute cannot trigger a surprise announcement.
    if (typeof onSettled === "function") onSettled({ status: "muted" });
    return { announced: false, reason: "muted" };
  }

  try {
    stopPlayers(COMPLETION_VOICE_OWNER);

    // Bounded so a stuck or never-ending player can never hold the completion
    // screen open indefinitely. The timer is always cleared, so it never keeps
    // a host event loop alive after playback settles.
    let timeoutId = null;
    const timeout = new Promise((resolve) => {
      timeoutId = setTimeout(
        () => resolve({ status: "timeout" }),
        COMPLETION_PLAYBACK_TIMEOUT_MS
      );
    });

    let result;
    try {
      result = await Promise.race([
        playSpeech(WORKOUT_COMPLETE_MESSAGE, { owner: COMPLETION_VOICE_OWNER }),
        timeout,
      ]);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }

    if (typeof onSettled === "function") onSettled(result);
    return { announced: true, ...result };
  } catch (error) {
    // Never let a voice failure block completion.
    console.warn("Workout completion voice failed:", error);
    if (typeof onSettled === "function") onSettled({ status: "error" });
    return { announced: false, reason: "voice_error" };
  }
}