import test from "node:test";
import assert from "node:assert/strict";

import { createAccuracyTracker } from "../src/exercises/accuracyTracker.js";
import { assessSquatForm } from "../src/exercises/formAssessment.js";
import { CORRECT_LABEL_BY_EXERCISE } from "../src/exercises/coaching.js";

/**
 * Session form-accuracy accounting.
 *
 * The bug these tests lock down: accuracy used to be counted per SAMPLED
 * FRAME, so a good squat set reported 0%. Two things caused that:
 *
 *  1. The model has no standing pose in its training data, so every frame
 *     between repetitions was answered "shallow" and scored as wrong form.
 *  2. The model is hypersensitive to `symmetry_score` - at the bottom of a
 *     textbook squat 0.90 returns "correct" but 0.87 returns "knees_caving" -
 *     so a normal webcam view almost never produced the "correct" label.
 *
 * Accuracy is now scored per completed repetition, from the movement-aware
 * verdict, which is what the coach speaks.
 */

/** Realistic bottom-of-squat feature vector from a webcam view. */
const goodSquat = ({
  knee = 92,
  hip = 95,
  body = 165,
  symmetry = 0.89, // normal left/right variation in perspective
  visibility = 0.95,
  kneeAsymmetry = 14, // a few degrees of natural difference
} = {}) => ({
  exercise: "squat",
  knee_angle: knee,
  elbow_angle: 170,
  hip_angle: hip,
  body_angle: body,
  symmetry_score: symmetry,
  landmark_visibility: visibility,
  knee_asymmetry: kneeAsymmetry,
  hip_asymmetry: 12,
  measured: { knee: true, elbow: true, hip: true, body: true },
});

test("a good squat is judged correct, so a good set is no longer 0%", () => {
  const tracker = createAccuracyTracker({ exercise: "squat" });

  const verdict = assessSquatForm({
    features: goodSquat(),
    deepestKneeAngle: 92,
    phase: "up",
  });

  assert.equal(verdict.label, "correct");
  tracker.record(verdict.label);

  assert.equal(tracker.snapshot().totalPredictions, 1);
  assert.equal(tracker.snapshot().correctPredictions, 1);
  assert.equal(tracker.snapshot().accuracy, 100);
});

test("the raw symmetry score never decides the verdict on its own", () => {
  // The same pose, but with the symmetry score the model would have used:
  // 0.87 makes the shipped RandomForest answer "knees_caving" (0.77), and
  // 0.85 makes it answer "knees_caving" (0.89) - even though the measured
  // knee asymmetry is a normal 14 degrees.
  const verdict = assessSquatForm({
    features: goodSquat({ symmetry: 0.85, kneeAsymmetry: 14 }),
    deepestKneeAngle: 92,
    phase: "up",
  });

  assert.equal(verdict.label, "correct");
});

test("a genuinely collapsed knee is still reported as a fault", () => {
  const verdict = assessSquatForm({
    features: goodSquat({ symmetry: 0.7, kneeAsymmetry: 30 }),
    deepestKneeAngle: 92,
    phase: "up",
  });

  assert.equal(verdict.label, "knees_caving");
});

test("a repetition that could not be judged is excluded, not scored as wrong", () => {
  const tracker = createAccuracyTracker({ exercise: "squat" });

  tracker.record(null);
  tracker.record(undefined);
  tracker.record("");

  assert.equal(tracker.snapshot().totalPredictions, 0);
  assert.equal(tracker.snapshot().accuracy, null);
});

test("accuracy is the share of judged repetitions that were good form", () => {
  const tracker = createAccuracyTracker({ exercise: "squat" });

  tracker.record("correct");
  tracker.record("shallow");
  tracker.record("correct");
  tracker.record("correct");

  const snapshot = tracker.snapshot();
  assert.equal(snapshot.totalPredictions, 4);
  assert.equal(snapshot.correctPredictions, 3);
  assert.equal(snapshot.accuracy, 75);
});

test("a session with no good repetition still reports real data", () => {
  const tracker = createAccuracyTracker({ exercise: "squat" });

  tracker.record("shallow");
  tracker.record("forward_lean");

  const snapshot = tracker.snapshot();
  assert.equal(snapshot.totalPredictions, 2);
  assert.equal(snapshot.correctPredictions, 0);
  assert.equal(snapshot.accuracy, 0);
});

test("each exercise scores against its own correct label", () => {
  const pushup = createAccuracyTracker({ exercise: "pushup" });
  pushup.record("pushup_correct");
  assert.equal(pushup.snapshot().accuracy, 100);
  assert.equal(pushup.correctLabel, CORRECT_LABEL_BY_EXERCISE.pushup);

  const plank = createAccuracyTracker({ exercise: "plank" });
  plank.record("plank_correct");
  assert.equal(plank.snapshot().accuracy, 100);

  // A squat verdict must not count as a correct push-up.
  const mixed = createAccuracyTracker({ exercise: "pushup" });
  mixed.record("correct");
  assert.equal(mixed.snapshot().correctPredictions, 0);
});

test("the tracker starts empty and can be reset", () => {
  const tracker = createAccuracyTracker({ exercise: "squat" });

  assert.equal(tracker.snapshot().accuracy, null);
  assert.equal(tracker.snapshot().totalPredictions, 0);

  tracker.record("correct");
  tracker.reset();

  assert.equal(tracker.snapshot().accuracy, null);
  assert.equal(tracker.snapshot().totalPredictions, 0);
  assert.equal(tracker.snapshot().correctPredictions, 0);
});
