import test from "node:test";
import assert from "node:assert/strict";

import {
  createPushupRepDetector,
  PUSHUP_REP_STATE,
  PUSHUP_REP_THRESHOLDS,
} from "../src/exercises/pushupRepDetector.js";
import { createRepTracker } from "../src/exercises/repTracker.js";

/**
 * Push-up repetition detection.
 *
 * The bug these tests lock down: the counter used to qualify a repetition
 * with ONE rule - the smoothed elbow angle dipped below 100 deg and came back
 * above 140 deg. The BODY was never looked at, so a user lying on the floor
 * waving their arms produced full "repetitions", and so did a standing user
 * raising and lowering their elbows.
 *
 * These are SYNTHETIC feature frames. They prove the decision logic, not
 * real-camera behaviour.
 */

const FRAME_MS = 33;
const ramp = (from, to, n) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

/**
 * A push-up frame.
 *
 * `body_tilt` is the body orientation: 0 = horizontal (a push-up), 90 =
 * vertical (standing). It is the only thing that separates a push-up from a
 * standing user, because the joint angles alone are identical.
 */
const pushupFrame = (
  elbow,
  { body = 175, hip = 172, tilt = 8, symmetry = 0.93 } = {}
) => ({
  exercise: "pushup",
  knee_angle: 92,
  elbow_angle: elbow,
  hip_angle: hip,
  body_angle: body,
  body_tilt: tilt,
  symmetry_score: symmetry,
  landmark_visibility: 0.97,
});

const detector = () => createPushupRepDetector();

/** The detector takes explicit parameters, not the feature frame. */
const feed = (machine, frame, nowMs) =>
  machine.update({
    elbowAngle: frame.elbow_angle,
    bodyAngle: frame.body_angle,
    hipAngle: frame.hip_angle,
    bodyTilt: frame.body_tilt,
    nowMs,
  });

function run(poses, stepMs = FRAME_MS) {
  const machine = detector();
  let now = 1000;
  let reps = 0;
  for (const pose of poses) {
    reps = feed(machine, pose, now).reps;
    now += stepMs;
  }
  return { reps, machine };
}

const pushup = (bottom, { frames = 40, ...options } = {}) => [
  ...ramp(175, bottom, frames / 2).map((e) => pushupFrame(e, options)),
  ...ramp(bottom, 175, frames / 2).map((e) => pushupFrame(e, options)),
];

// --------------------------------------------------------- the scenario table

test("a user standing in front of the camera counts no repetitions", () => {
  // The body is straight and the elbow moves, but the body is vertical.
  const frames = [
    ...ramp(175, 95, 40).map((e) => pushupFrame(e, { body: 180, hip: 175, tilt: 88 })),
    ...ramp(95, 175, 40).map((e) => pushupFrame(e, { body: 180, hip: 175, tilt: 88 })),
  ];

  assert.equal(run(frames).reps, 0);
});

test("a user lying on the floor waving their arms counts no repetitions", () => {
  const frames = [
    ...ramp(175, 95, 40).map((e) => pushupFrame(e, { body: 100, hip: 95, tilt: 4 })),
    ...ramp(95, 175, 40).map((e) => pushupFrame(e, { body: 100, hip: 95, tilt: 4 })),
  ];

  assert.equal(run(frames).reps, 0);
});

test("bending the elbows slightly and straightening them counts no repetition", () => {
  const frames = [
    ...ramp(175, 150, 30).map((e) => pushupFrame(e)),
    ...ramp(150, 175, 30).map((e) => pushupFrame(e)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("a partial push-up counts no repetition", () => {
  for (const bottom of [130, 120, 110]) {
    const frames = [
      ...ramp(175, bottom, 40).map((e) => pushupFrame(e)),
      ...ramp(bottom, 175, 40).map((e) => pushupFrame(e)),
    ];

    assert.equal(run(frames).reps, 0, `a press to ${bottom} deg is not a push-up`);
  }
});

test("descending fully without returning to the top counts no repetition", () => {
  const frames = [
    ...ramp(175, 80, 40).map((e) => pushupFrame(e)),
    ...Array.from({ length: 200 }, () => pushupFrame(80)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("one valid push-up counts exactly one repetition", () => {
  assert.equal(run(pushup(80)).reps, 1);
  assert.equal(run(pushup(70)).reps, 1);
});

test("holding at the bottom does not repeat the increment", () => {
  const frames = [
    ...pushup(80),
    ...Array.from({ length: 200 }, () => pushupFrame(80)),
  ];

  assert.equal(run(frames).reps, 1);
});

test("three separate valid push-ups count exactly three repetitions", () => {
  const frames = [...pushup(80), ...pushup(80), ...pushup(80)];

  assert.equal(run(frames).reps, 3);
});

test("temporarily unreliable landmarks produce no false repetition", () => {
  const machine = detector();
  let now = 1000;
  let reps = 0;

  const frames = [
    ...pushup(80),
    // A lost pose in the middle of the set.
    null,
    null,
    ...pushup(80),
  ];

  for (const frame of frames) {
    if (frame) {
      reps = feed(machine, frame, now).reps;
    }
    now += FRAME_MS;
  }

  assert.equal(reps, 2, "the two real push-ups count, the dropout adds nothing");
});

test("the camera frame rate does not change the count", () => {
  // The same 1.3 second push-up, sampled at 15, 30, 60 and 120 fps.
  for (const fps of [15, 30, 60, 120]) {
    const frames = Math.round(1.3 * fps);
    const half = Math.floor(frames / 2);
    const poses = [
      ...ramp(175, 80, half).map((e) => pushupFrame(e)),
      ...ramp(80, 175, frames - half).map((e) => pushupFrame(e)),
    ];

    assert.equal(
      run(poses, 1000 / fps).reps,
      1,
      `${fps} fps must count the push-up exactly once`
    );
  }
});

test("changing exercise or resetting the workout clears the state", () => {
  const tracker = createRepTracker({
    exercise: "pushup",
    requiredSets: 3,
    requiredReps: 10,
  });
  let now = 1000;
  for (const frame of pushup(80)) {
    tracker.update(frame, now);
    now += FRAME_MS;
  }
  assert.ok(tracker.update(pushupFrame(175), now).reps > 0);

  tracker.reset();
  const after = tracker.update(pushupFrame(175), now + FRAME_MS);

  assert.equal(after.reps, 0);
  assert.equal(after.setReps, 0);
  assert.equal(after.phase, "up");
});

// ------------------------------------------------------------- the machine ---

test("the machine walks through every phase of a repetition", () => {
  const machine = detector();
  const seen = new Set();
  let now = 1000;

  for (const frame of [...pushup(80), ...Array.from({ length: 20 }, () => pushupFrame(175))]) {
    seen.add(feed(machine, frame, now).state);
    now += FRAME_MS;
  }

  assert.ok(seen.has(PUSHUP_REP_STATE.TOP));
  assert.ok(seen.has(PUSHUP_REP_STATE.DESCENDING));
  assert.ok(seen.has(PUSHUP_REP_STATE.BOTTOM));
  assert.ok(seen.has(PUSHUP_REP_STATE.ASCENDING));
});

test("a bent body is a form fault, not a missing repetition", () => {
  // The hips are high: the model calls that `pushup_hips_high`, and the
  // repetition still counts - the form score carries the fault.
  const frames = pushup(80, { body: 140 });

  assert.equal(run(frames).reps, 1);
});

test("a folded body is not a push-up at all", () => {
  const frames = pushup(80, { body: 100, hip: 95 });

  assert.equal(run(frames).reps, 0);
});

test("the top position follows the user's own arms", () => {
  // A user who cannot fully lock out their elbows still counts their
  // push-ups: the top is calibrated from the pose, not hard-coded.
  const frames = [
    ...ramp(160, 80, 40).map((e) => pushupFrame(e)),
    ...ramp(80, 160, 40).map((e) => pushupFrame(e)),
  ];

  assert.equal(run(frames).reps, 1);
});

test("abandoning the movement discards the partial repetition", () => {
  const machine = detector();
  let now = 1000;

  for (const frame of ramp(175, 80, 20).map((e) => pushupFrame(e))) {
    feed(machine, frame, now);
    now += FRAME_MS;
  }

  machine.abandon();
  for (const frame of Array.from({ length: 20 }, () => pushupFrame(175))) {
    feed(machine, frame, now);
    now += FRAME_MS;
  }

  assert.equal(machine.reps, 0);
});

test("a reset clears the machine completely", () => {
  const machine = detector();
  let now = 1000;

  for (const frame of pushup(80)) {
    feed(machine, frame, now);
    now += FRAME_MS;
  }
  assert.equal(machine.reps, 1);

  machine.reset();
  assert.equal(machine.reps, 0);
  assert.equal(machine.snapshot().state, PUSHUP_REP_STATE.TOP);
  assert.equal(machine.snapshot().topAngle, null);
});

test("the depth gate matches the shipped model's own push-up class", () => {
  // The model's `pushup_correct` class spans 67.25 - 98.71 deg of elbow
  // flexion, so the depth gate is set at that boundary rather than at the
  // old 100 deg descent trigger.
  assert.ok(PUSHUP_REP_THRESHOLDS.maxDepthAngle <= 100);
  assert.ok(PUSHUP_REP_THRESHOLDS.maxDepthAngle >= 95);
  assert.ok(
    PUSHUP_REP_THRESHOLDS.maxSmoothedDepthAngle >
      PUSHUP_REP_THRESHOLDS.maxDepthAngle,
    "the smoothed gate must leave room for the averaging lag"
  );
});
