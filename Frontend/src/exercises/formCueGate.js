/**
 * State-aware form-cue gate.
 *
 * Push-up and plank coaching used to run on the 600ms prediction cadence: any
 * label the model returned produced a message, every 600ms, for as long as the
 * fault existed. The user heard "keep your body straight" dozens of times per
 * set.
 *
 * This gate turns that into state-change coaching. It speaks only when the
 * confirmed form label actually CHANGES:
 *
 *   - an unchanged posture stays silent (the fix for the spam)
 *   - a new fault is announced immediately
 *   - a fault that disappears and genuinely returns is announced again
 *   - a single-frame label flicker is ignored
 *
 * Deliberately TIMER-FREE. It counts prediction ticks, not milliseconds, so it
 * cannot fight with the wall-clock cooldown in the voice-cue gate: that gate
 * decides what gets *played*, this one decides what is *worth saying*. They are
 * complementary layers, not competing cooldown systems.
 */

import { CORRECT_LABEL_BY_EXERCISE } from "./coaching.js";

/**
 * Consecutive identical predictions required before a label is believed.
 * At the 600ms prediction cadence, 2 ticks is ~1.2s of confirmation, which
 * rejects a one-frame flicker without making real feedback feel slow.
 */
export const DEFAULT_STABLE_TICKS = 2;

/**
 * How many confirmed non-fault ticks must pass before an identical fault may
 * be announced a second time. This is what allows a genuine return after
 * recovery while still refusing to nag during one continuous fault.
 */
export const DEFAULT_RECOVERY_TICKS = 2;

const normalizeExercise = (exercise) =>
  String(exercise || "").trim().toLowerCase();

/** Anything that is not this exercise's "correct" label is a fault. */
export function isFormFault(label, exercise) {
  if (!label) return false;
  return label !== CORRECT_LABEL_BY_EXERCISE[normalizeExercise(exercise)];
}

export function createFormCueGate({
  stableTicks = DEFAULT_STABLE_TICKS,
  recoveryTicks = DEFAULT_RECOVERY_TICKS,
} = {}) {
  /** Label awaiting confirmation. */
  let candidate = null;
  let candidateTicks = 0;
  /** Last confirmed label, regardless of whether it was announced. */
  let observed = null;
  /** Last label the user was actually told about. */
  let announced = null;
  /** Consecutive confirmed non-fault ticks. */
  let cleanTicks = 0;

  const verdict = (announce, reason, label) => ({ announce, reason, label });

  /**
   * Feed one prediction's resolved label.
   *
   * @param {string|null} label   resolved coaching label, or null for silence
   * @param {string} exercise
   * @param {{observable?:boolean}} [options] `observable: false` means the pose
   *   could not be assessed (tracking lost, camera warning showing). That is
   *   NOT evidence the posture changed, so no counter is touched and an
   *   unchanged fault stays unchanged instead of being announced again.
   * @returns {{announce:boolean, reason:string, label:?string}}
   */
  function consider(label, exercise, { observable = true } = {}) {
    if (!observable) {
      return verdict(false, "not_observable", candidate);
    }

    if (label === candidate) {
      candidateTicks += 1;
    } else {
      candidate = label;
      candidateTicks = 1;
    }

    // Debounce: a label must persist before it is allowed to speak.
    if (candidateTicks < stableTicks) {
      return verdict(false, "unconfirmed", candidate);
    }

    // The confirmed label has not changed since the last decision.
    if (candidate === observed) {
      return verdict(false, "unchanged", candidate);
    }

    observed = candidate;

    if (isFormFault(candidate, exercise)) {
      if (candidate === announced && cleanTicks < recoveryTicks) {
        // Same fault, no real recovery in between: stay quiet.
        cleanTicks = 0;
        return verdict(false, "repeat_fault", candidate);
      }

      cleanTicks = 0;
      announced = candidate;
      return verdict(true, "fault_change", candidate);
    }

    // Correct form, or nothing worth saying.
    cleanTicks += 1;
    if (candidate === announced) {
      return verdict(false, "unchanged", candidate);
    }

    announced = candidate;
    return verdict(true, "status_change", candidate);
  }

  function reset() {
    candidate = null;
    candidateTicks = 0;
    observed = null;
    announced = null;
    cleanTicks = 0;
  }

  return { consider, reset, isActive: () => candidate !== null };
}