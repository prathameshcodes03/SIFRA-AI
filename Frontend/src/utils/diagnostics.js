/**
 * Development-only coaching diagnostics.
 *
 * Purpose: make the squat feedback chain auditable. For each throttled
 * prediction it records what the camera saw, what the rep tracker thought,
 * what the model said, what the movement-aware assessment concluded, which one
 * was allowed to speak, and why anything was overridden.
 *
 * Safety properties:
 *  - Compiled out of production builds (`import.meta.env.DEV`), so nothing is
 *    logged or even evaluated for real users.
 *  - Throttled: one record per window, never one per camera frame.
 *  - No imagery, no video, no identity data and no credentials - only derived
 *    scalars (angles, scores, labels, timings).
 *  - Confidence is only reported when the service actually sends it; it is
 *    never invented locally.
 */

const DEV_FLAG = import.meta.env?.DEV === true;

const isProductionBuild = () =>
  typeof import.meta.env !== "undefined" &&
  typeof import.meta.env.PROD === "boolean" &&
  import.meta.env.PROD;

/**
 * @param {object}   [options]
 * @param {boolean}  [options.enabled]  defaults to the Vite dev flag
 * @param {number}   [options.intervalMs] minimum ms between records
 * @param {Function} [options.sink]     receives each record (defaults to console)
 * @param {Function} [options.now]
 */
export function createCoachDiagnostics({
  enabled = DEV_FLAG,
  intervalMs = 1500,
  sink = null,
  now = () => Date.now(),
} = {}) {
  const active = Boolean(enabled) && !isProductionBuild();
  let lastAt = null;
  let dropped = 0;

  function emit(record) {
    const writer = sink ?? console.log;
    writer(`[sifra:coach] ${JSON.stringify(record)}`);
  }

  /**
   * @param {object} sample
   * @param {string}  sample.exercise
   * @param {object?} sample.features
   * @param {number}  sample.reliability       raw landmark reliability 0-1
   * @param {boolean} sample.reliable          passed the visibility gate
   * @param {string}  sample.phase             rep tracker phase
   * @param {number?} sample.smoothedKneeAngle
   * @param {number}  sample.elapsedMs         since previous prediction
   * @param {{ok:boolean, label:?string, confidence:?number, probabilities?:object, status?:number|string, error?:string}} sample.model
   * @param {object?} sample.assessment
   * @param {object?} sample.resolution        resolveFormCoaching() result
   * @param {boolean} sample.spoken            whether a cue reached the user
   * @param {string?} sample.message
   * @returns {boolean} whether a record was emitted
   */
  function log(sample) {
    if (!active) return false;

    const timestamp = now();
    // The very first record is always emitted, so a session's opening
    // prediction is diagnosable without waiting out the window.
    const sinceLast = lastAt === null ? null : timestamp - lastAt;
    if (sinceLast !== null && sinceLast < intervalMs) {
      dropped += 1;
      return false;
    }
    lastAt = timestamp;

    const { model = {}, resolution = {}, assessment = null, features = null } = sample;

    emit({
      t: new Date(timestamp).toISOString().slice(11, 23),
      sinceLastMs: sinceLast,
      throttledAway: dropped,
      exercise: sample.exercise,
      elapsedMs: sample.elapsedMs ?? null,
      features: features
        ? {
            knee: features.knee_angle,
            hip: features.hip_angle,
            body: features.body_angle,
            symmetry: features.symmetry_score,
            visibility: features.landmark_visibility,
            kneeAsymmetry: features.knee_asymmetry,
          }
        : null,
      reliability:
        typeof sample.reliability === "number"
          ? Math.round(sample.reliability * 1000) / 1000
          : null,
      reliable: Boolean(sample.reliable),
      phase: sample.phase,
      smoothedKnee:
        typeof sample.smoothedKneeAngle === "number"
          ? Math.round(sample.smoothedKneeAngle)
          : null,
      movement: sample.movement ?? null,
      // Raw model result - never conflated with the coaching decision.
      model: {
        ok: Boolean(model.ok),
        label: model.label ?? null,
        // Only present when the service supplies it; null otherwise.
        confidence:
          typeof model.confidence === "number" && Number.isFinite(model.confidence)
            ? Math.round(model.confidence * 1000) / 1000
            : null,
        probabilities: model.probabilities ?? null,
        status: model.status ?? null,
        error: model.error ?? null,
      },
      ruleFallback: sample.ruleFallback ?? null,
      assessment: assessment
        ? { label: assessment.label, reason: assessment.reason, evidence: assessment.evidence }
        : null,
      decision: resolution.label
        ? {
            label: resolution.label,
            source: resolution.source,
            reason: resolution.reason,
            mlSupported: resolution.mlSupported,
          }
        : null,
      spoken: Boolean(sample.spoken),
      message: sample.message ?? null,
    });

    dropped = 0;
    return true;
  }

  return {
    isActive: () => active,
    log,
    droppedSinceLastRecord: () => dropped,
  };
}

export const DIAGNOSTICS_ENABLED_IN_DEV = DEV_FLAG;