/**
 * Voice-cue deduplication gate.
 *
 * The hook used to remember only the *last* spoken cue, so an identical cue
 * that arrived after any other cue looked brand new. Interleaved coaching
 * therefore defeated the suppression and the camera warning was re-requested
 * from ElevenLabs roughly every 2 seconds, burning credits each time.
 *
 * This gate remembers when *each* cue was last accepted, so a repeat is
 * recognised even when other messages were spoken in between. It is pure: no
 * timers, no audio, no network. `useVoiceCoach` consults it before doing any
 * work, which is what keeps the credit-spending request off the hot path.
 */

/** An identical cue must not be re-requested within this window. */
export const DEFAULT_REPEAT_SUPPRESSION_MS = 12000;

/** Minimum spacing between two *different* cues, so coaching never overlaps. */
export const DEFAULT_MIN_GAP_MS = 2500;

/** Bounded so a long session cannot grow this without limit. */
export const MAX_TRACKED_CUES = 60;

/**
 * @param {object}   [options]
 * @param {number}   [options.repeatSuppressionMs]
 * @param {number}   [options.minGapMs]
 * @param {number}   [options.maxTracked]
 * @param {Function} [options.now] injectable clock for tests
 */
export function createVoiceCueGate({
  repeatSuppressionMs = DEFAULT_REPEAT_SUPPRESSION_MS,
  minGapMs = DEFAULT_MIN_GAP_MS,
  maxTracked = MAX_TRACKED_CUES,
  now = () => Date.now(),
} = {}) {
  /** @type {Map<string, number>} cue -> timestamp it was last accepted */
  const lastAcceptedAtByCue = new Map();
  let lastAcceptedAt = null;

  function remember(cue, timestamp) {
    // Re-insert so the map stays ordered oldest-first for eviction.
    lastAcceptedAtByCue.delete(cue);
    lastAcceptedAtByCue.set(cue, timestamp);

    while (lastAcceptedAtByCue.size > maxTracked) {
      const oldest = lastAcceptedAtByCue.keys().next().value;
      lastAcceptedAtByCue.delete(oldest);
    }
  }

  /**
   * @param {string} text
   * @param {{force?: boolean}} [options] force = explicit user replay
   * @returns {{accepted: boolean, reason: string, cue: string, retryInMs?: number}}
   */
  function consider(text, { force = false } = {}) {
    const cue = typeof text === "string" ? text.trim() : "";
    if (!cue) return { accepted: false, reason: "empty", cue: "" };

    const timestamp = now();

    if (force) {
      remember(cue, timestamp);
      lastAcceptedAt = timestamp;
      return { accepted: true, reason: "forced", cue };
    }

    // The same cue, wherever it sits in the recent sequence.
    const previous = lastAcceptedAtByCue.get(cue);
    if (previous !== undefined && timestamp - previous < repeatSuppressionMs) {
      return {
        accepted: false,
        reason: "repeat",
        cue,
        retryInMs: repeatSuppressionMs - (timestamp - previous),
      };
    }

    // Any other cue spoken moments ago: wait rather than talk over it.
    if (lastAcceptedAt !== null && timestamp - lastAcceptedAt < minGapMs) {
      return {
        accepted: false,
        reason: "too_soon",
        cue,
        retryInMs: minGapMs - (timestamp - lastAcceptedAt),
      };
    }

    remember(cue, timestamp);
    lastAcceptedAt = timestamp;
    return { accepted: true, reason: "accepted", cue };
  }

  function reset() {
    lastAcceptedAtByCue.clear();
    lastAcceptedAt = null;
  }

  return {
    consider,
    reset,
    trackedCues: () => [...lastAcceptedAtByCue.keys()],
  };
}