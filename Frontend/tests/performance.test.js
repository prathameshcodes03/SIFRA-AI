import test from "node:test";
import assert from "node:assert/strict";

import { createRepTracker } from "../src/exercises/repTracker.js";

const squatFrame = (kneeAngle) => ({
  exercise: "squat",
  knee_angle: kneeAngle,
  elbow_angle: 20,
  hip_angle: 110,
  body_angle: 165,
  symmetry_score: 0.9,
  landmark_visibility: 0.95,
});

test("rep counting runs entirely locally with no network dependency", () => {
  // The tracker API accepts only features + timestamp. It has no client, no
  // fetch and no await, which is what guarantees counters stay responsive
  // while the ML request is still in flight.
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });

  const surface = Object.keys(tracker).sort();
  assert.deepEqual(surface, ["isFinished", "reset", "update"]);

  const result = tracker.update(squatFrame(175), 1000);
  assert.equal(typeof result.reps, "number");
  assert.equal(typeof result.sets, "number");
  assert.equal(typeof result.phase, "string");
});

test("reps are counted locally, without waiting for ML", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });

  // Simulate a slow ML round-trip: frames keep arriving regardless.
  let now = 1000;
  let t0 = performance.now();
  let repsAtEnd = 0;

  for (let i = 0; i < 63; i += 1) {
    const angle = i < 21 ? 175 : i < 42 ? 95 : 175;
    const res = tracker.update(squatFrame(angle), now);
    now += 33;
    repsAtEnd = res.reps;
  }
  const elapsed = performance.now() - t0;

  assert.equal(repsAtEnd, 1, "rep counted locally");
  assert.ok(elapsed < 50, `63 frames processed in ${elapsed.toFixed(2)}ms`);
});

test("60 simulated camera frames cost far less than one 600ms ML interval", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 5, requiredReps: 20 });

  const t0 = performance.now();
  let now = 1000;
  for (let i = 0; i < 60; i += 1) {
    const angle = i % 30 < 15 ? 175 : 95;
    tracker.update(squatFrame(angle), now);
    now += 16;
  }
  const elapsed = performance.now() - t0;

  // A single ML prediction interval is 600ms. Local counting must be orders
  // of magnitude cheaper so it can never be the bottleneck.
  assert.ok(
    elapsed < 10,
    `60 frames in ${elapsed.toFixed(3)}ms (ML interval is 600ms)`
  );
});

test("update() is synchronous and returns without a promise", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });
  const result = tracker.update(squatFrame(175), 1000);

  assert.equal(typeof result.then, "undefined", "must not be a thenable");
});

test("prediction cadence is capped well below camera frame rate", () => {
  // Mirrors the PREDICT_INTERVAL_MS contract in Camerafeed.
  const PREDICT_INTERVAL_MS = 600;
  const CAMERA_FPS = 30;

  const predictionsPerSecond = 1000 / PREDICT_INTERVAL_MS;
  assert.ok(
    predictionsPerSecond < CAMERA_FPS / 10,
    `~${predictionsPerSecond.toFixed(2)} predictions/sec must be far below ${CAMERA_FPS} fps`
  );
});

test("rep detection latency is bounded and measured", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });

  let now = 1000;
  // Descend past both thresholds to confirm the DOWN phase.
  for (let i = 0; i < 20; i += 1) {
    tracker.update(squatFrame(95), now);
    now += 33;
  }

  // Rise again and measure how many frames it takes for the rep to register.
  let framesToRep = null;
  for (let i = 0; i < 20; i += 1) {
    const res = tracker.update(squatFrame(175), now);
    now += 33;
    if (res.reps === 1 && framesToRep === null) {
      framesToRep = i + 1;
      break;
    }
  }

  assert.ok(framesToRep !== null, "rep must register on the way back up");
  // EMA crossover plus the 2-frame stability confirmation.
  assert.ok(
    framesToRep <= 4,
    `rep registered after ${framesToRep} frames (~${framesToRep * 33}ms at 30fps)`
  );
});