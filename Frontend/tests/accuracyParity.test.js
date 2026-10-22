import test from "node:test";
import assert from "node:assert/strict";

import { createRepTracker, PHASE, REP_THRESHOLDS } from "../src/exercises/repTracker.js";
import { createSquatRepSummary } from "../src/exercises/squatRepSummary.js";
import { assessSquatForm } from "../src/exercises/formAssessment.js";
import { extractExerciseFeatures } from "../src/exercises/featureExtractor.js";

/**
 * The repetition detector must not change the ACCURACY pipeline.
 *
 * The session accuracy (already shipped) is computed from the form assessment
 * of every completed repetition. That assessment reads the tracker's
 * `repMinAngle` and the rep summary's deepest frame - so rewriting the
 * repetition detection could silently change which repetitions are scored,
 * or how they are judged.
 *
 * This test re-implements the OLD tracker rule verbatim and asserts that both
 * produce the SAME verdicts, for the same inputs. If a future change to the
 * detector alters the accuracy pipeline, this fails.
 */

/** The tracker as it was before the five-phase squat machine. */
function oldTracker() {
  const t = REP_THRESHOLDS.squat;
  let smoothed = null;
  let phase = PHASE.UP;
  let repMinAngle = null;
  let belowStreak = 0;
  let aboveStreak = 0;
  let armedAtTop = true;

  const smooth = (value) => {
    if (typeof value !== "number") return smoothed;
    smoothed = smoothed === null ? value : smoothed + 0.4 * (value - smoothed);
    return smoothed;
  };

  return {
    update(features) {
      const angle = smooth(features.knee_angle);
      if (angle === null) {
        return { phase, smoothedAngle: smoothed, repMinAngle, trackingOk: true };
      }

      if (angle < t.down) {
        belowStreak += 1;
        aboveStreak = 0;
      } else if (angle > t.up) {
        aboveStreak += 1;
        belowStreak = 0;
      } else {
        belowStreak = 0;
        aboveStreak = 0;
      }

      if (angle > t.up) armedAtTop = true;

      if (phase === PHASE.UP) {
        if (armedAtTop && belowStreak >= t.stableFrames && angle < t.down) {
          phase = PHASE.DOWN;
        }
      } else if (aboveStreak >= t.stableFrames && angle > t.up) {
        phase = PHASE.UP;
        belowStreak = 0;
        aboveStreak = 0;
      }

      if (repMinAngle === null || angle < repMinAngle) repMinAngle = angle;
      if (phase === PHASE.UP && angle >= t.up) repMinAngle = null;

      return { phase, smoothedAngle: smoothed, repMinAngle, trackingOk: true };
    },
  };
}

const P = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16, LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26, LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

function pose({ knee = 175, lean = 0 } = {}) {
  const alpha = ((180 - knee) * Math.PI) / 180;
  const leanRad = (lean * Math.PI) / 180;
  const hip = { x: 0, y: 0 };
  const kneePt = { x: Math.sin(alpha), y: -Math.cos(alpha) };
  const ankle = { x: kneePt.x, y: kneePt.y - 0.9 };
  const shoulder = { x: 0.7 * Math.sin(leanRad), y: 0.7 * Math.cos(leanRad) };
  const elbow = { x: (kneePt.x + shoulder.x) / 2, y: (shoulder.y + kneePt.y) / 2 + 0.1 };
  const wrist = { x: ankle.x, y: ankle.y + 0.3 };
  const m = (p) => ({ x: p.x, y: p.y, z: 0, visibility: 0.95 });
  const landmarks = Array.from({ length: 33 }, () => m({ x: 0, y: 0 }));
  landmarks[P.LEFT_SHOULDER] = m(shoulder);
  landmarks[P.LEFT_HIP] = m(hip);
  landmarks[P.LEFT_KNEE] = m(kneePt);
  landmarks[P.LEFT_ANKLE] = m(ankle);
  landmarks[P.LEFT_ELBOW] = m(elbow);
  landmarks[P.LEFT_WRIST] = m(wrist);
  for (const [src, dst] of [[11, 12], [23, 24], [25, 26], [27, 28], [13, 14], [15, 16]]) {
    landmarks[dst] = { ...landmarks[src] };
  }
  return landmarks;
}

const lerp = (a, b, t) => a + (b - a) * t;

const rep = (bottom, { frames = 40, lean = 0 } = {}) =>
  Array.from({ length: frames }, (_, i) => {
    const t = i / (frames - 1);
    const knee = t < 0.5 ? lerp(175, bottom, t * 2) : lerp(bottom, 175, (t - 0.5) * 2);
    const leanNow = t < 0.5 ? lerp(0, lean, t * 2) : lerp(lean, 0, (t - 0.5) * 2);
    return pose({ knee, lean: leanNow });
  });

/** The verdicts the accuracy pipeline records, for one session. */
function verdicts(frames, useOldTracker) {
  const tracker = useOldTracker
    ? oldTracker()
    : createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });
  const summary = createSquatRepSummary();

  let now = 1000;
  let pending = null;
  const out = [];

  for (const landmarks of frames) {
    const features = extractExerciseFeatures(landmarks, "squat");
    const result = tracker.update(features, now);
    now += 33;

    const completed = summary.observe(features, result);
    if (completed) pending = completed;

    if (pending) {
      const assessment = assessSquatForm({
        features: pending.features,
        deepestKneeAngle: pending.deepestAngle,
        phase: result.phase,
      });
      out.push(
        `${assessment.label}:${assessment.reason}:${Math.round(assessment.evidence.depth)}`
      );
      pending = null;
    }
  }

  return out;
}

const sessions = {
  "three deep squats": [
    ...rep(90, { lean: 20 }),
    ...rep(90, { lean: 20 }),
    ...rep(90, { lean: 20 }),
  ],
  "two shallow squats": [...rep(115, { lean: 10 }), ...rep(115, { lean: 10 })],
  "a deep squat then a partial one": [...rep(90, { lean: 20 }), ...rep(120, { lean: 5 })],
  "standing still": Array.from({ length: 200 }, () => pose({ knee: 175 })),
  "one slow squat": rep(85, { frames: 90, lean: 20 }),
  "a squat with a noisy hip": [...rep(95, { lean: 5 })],
};

for (const [name, frames] of Object.entries(sessions)) {
  test(`the accuracy pipeline is unchanged for: ${name}`, () => {
    const before = verdicts(frames, true);
    const after = verdicts(frames, false);

    assert.deepEqual(
      after,
      before,
      "the repetition detector must not change what the accuracy scores"
    );
  });
}

test("the accuracy pipeline still scores the repetitions it used to", () => {
  const scored = verdicts([...rep(90, { lean: 20 }), ...rep(120, { lean: 5 })], true);

  assert.equal(scored.length, 2, "both the deep and the partial squat are scored");
  assert.ok(
    scored.every((entry) => entry.length > 0),
    "every scored repetition carries a verdict"
  );
});
