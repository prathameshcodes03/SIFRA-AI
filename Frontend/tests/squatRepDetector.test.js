import test from "node:test";
import assert from "node:assert/strict";

import {
  createSquatRepDetector,
  SQUAT_REP_STATE,
  SQUAT_REP_THRESHOLDS,
} from "../src/exercises/squatRepDetector.js";

/**
 * Squat repetition state machine.
 *
 * The bug these tests lock down: the counter used to qualify a repetition
 * with ONE rule - the smoothed knee angle dipped below 110 deg and came back
 * above 140 deg. 110 deg is not a squat depth (the shipped model only ever
 * saw "correct" between 66 and 97 deg), and 140 deg is not standing, so a
 * quarter squat, a sideways weight shift or a partial dip was credited as a
 * full repetition.
 *
 * The machine now requires the whole cycle:
 *
 *   STANDING -> DESCENDING -> BOTTOM -> ASCENDING -> STANDING
 *
 * with a calibrated standing position, a real squat depth and a real return.
 *
 * These are SYNTHETIC angle fixtures. They prove the decision logic, not
 * real-camera behaviour.
 */

const FRAME_MS = 33; // ~30fps MediaPipe cadence

const ramp = (from, to, n) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

/**
 * A standing pose whose hip angle behaves like a real one: the hip flexes
 * with the thigh, so a real squat moves both.
 */
const pose = (knee, hip = null) => ({
  kneeAngle: knee,
  hipAngle: hip ?? 175 - (175 - knee) * 0.9,
});

/**
 * A pose whose hip stays extended - a sideways weight shift bends the knee
 * without hinging at the hip, so the hip barely moves.
 */
const weightShift = (knee, i) => ({ kneeAngle: knee, hipAngle: 170 + (i % 2) * 4 });

const detector = () =>
  createSquatRepDetector({ descentAngle: 110, standReturnAngle: 140 });

/**
 * Feed a sequence of poses and report how many repetitions were counted.
 *
 * @param {Array<{kneeAngle:number, hipAngle:number}>} poses
 * @param {number} [stepMs]
 */
function run(poses, stepMs = FRAME_MS) {
  const machine = detector();
  let now = 1000;
  let reps = 0;
  for (const frame of poses) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += stepMs;
  }
  return { reps, machine };
}

const squat = (bottom, { frames = 40, hip = null } = {}) => [
  ...ramp(175, bottom, frames / 2).map((k) => pose(k, hip)),
  ...ramp(bottom, 175, frames / 2).map((k) => pose(k, hip)),
];

// -------------------------------------------------- the scenario table -----

test("a user who stands still counts no repetitions", () => {
  const wobble = [168, 172, 175, 171, 176, 169, 174, 170];
  const frames = Array.from({ length: 300 }, (_, i) => pose(wobble[i % 8]));

  assert.equal(run(frames).reps, 0);
});

test("a slight knee bend and return counts no repetition", () => {
  const frames = [
    ...ramp(175, 150, 30).map((k) => pose(k)),
    ...ramp(150, 175, 30).map((k) => pose(k)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("a body sway that never reaches depth counts no repetition", () => {
  // The knee wobbles while the user stays upright.
  const frames = Array.from({ length: 200 }, (_, i) =>
    pose(i % 2 ? 150 : 165)
  );

  assert.equal(run(frames).reps, 0);
});

test("a sideways weight shift counts no repetition even when the knee dips", () => {
  // The knee dips to 100 deg but the hip never flexes: this is a weight
  // shift, not a squat.
  const frames = [
    ...ramp(175, 150, 15).map((k, i) => weightShift(k, i)),
    ...ramp(150, 100, 15).map((k, i) => weightShift(k, i)),
    ...ramp(100, 150, 15).map((k, i) => weightShift(k, i)),
    ...ramp(150, 175, 15).map((k, i) => weightShift(k, i)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("moving the knees without reaching squat depth counts no repetition", () => {
  for (const bottom of [118, 112, 108, 105]) {
    const frames = [
      ...ramp(175, bottom, 40).map((k) => pose(k)),
      ...ramp(bottom, 175, 40).map((k) => pose(k)),
    ];

    assert.equal(
      run(frames).reps,
      0,
      `a dip to ${bottom} deg is not a squat`
    );
  }
});

test("descending without returning to standing counts no repetition", () => {
  const frames = [
    ...ramp(175, 90, 40).map((k) => pose(k)),
    ...Array.from({ length: 200 }, () => pose(90)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("a full squat counts exactly one repetition", () => {
  assert.equal(run(squat(90)).reps, 1);
  assert.equal(run(squat(70)).reps, 1);
  assert.equal(run(squat(95)).reps, 1);
});

test("holding at the bottom does not repeat the increment", () => {
  const frames = [
    ...squat(90),
    ...Array.from({ length: 300 }, () => pose(175)),
  ];

  assert.equal(run(frames).reps, 1);
});

test("two separate full squats count exactly two repetitions", () => {
  const frames = [...squat(90), ...squat(90)];

  assert.equal(run(frames).reps, 2);
});

test("a valid squat followed by a partial squat counts only the valid one", () => {
  const frames = [
    ...squat(90),
    ...ramp(175, 120, 30).map((k) => pose(k)),
    ...ramp(120, 175, 30).map((k) => pose(k)),
  ];

  assert.equal(run(frames).reps, 1);
});

test("a quick bounce is not a repetition", () => {
  // 100 deg for 250ms: too short to be a squat, and far too short to be the
  // body movement a repetition is made of.
  const frames = [
    ...ramp(175, 100, 4).map((k) => pose(k)),
    ...ramp(100, 175, 4).map((k) => pose(k)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("a temporary loss of landmarks does not invent a repetition", () => {
  const frames = Array.from({ length: 120 }, (_, i) =>
    i % 20 === 0 ? null : pose(175)
  );

  const machine = detector();
  let now = 1000;
  let reps = 0;
  for (const frame of frames) {
    if (frame) {
      reps = machine.update({ ...frame, nowMs: now }).reps;
    }
    now += FRAME_MS;
  }

  assert.equal(reps, 0);
});

test("the same movement gives the same verdict at any frame rate", () => {
  // The same 1.3 second squat, sampled at 15, 30, 60 and 120 fps.
  for (const fps of [15, 30, 60, 120]) {
    const frames = Math.round(1.3 * fps);
    const half = Math.floor(frames / 2);
    const poses = [
      ...ramp(175, 90, half).map((k) => pose(k)),
      ...ramp(90, 175, frames - half).map((k) => pose(k)),
    ];

    assert.equal(
      run(poses, 1000 / fps).reps,
      1,
      `${fps} fps must count the squat exactly once`
    );
  }
});

// ------------------------------------------------- the state machine -------

test("the machine walks through every phase of a repetition", () => {
  const machine = detector();
  const seen = new Set();
  let now = 1000;

  for (const frame of [...squat(90), ...Array.from({ length: 20 }, () => pose(175))]) {
    seen.add(machine.update({ ...frame, nowMs: now }).state);
    now += FRAME_MS;
  }

  assert.ok(seen.has(SQUAT_REP_STATE.STANDING));
  assert.ok(seen.has(SQUAT_REP_STATE.DESCENDING));
  assert.ok(seen.has(SQUAT_REP_STATE.BOTTOM));
  assert.ok(seen.has(SQUAT_REP_STATE.ASCENDING));
});

test("the standing angle is calibrated from the user's own posture", () => {
  // A user who stands with slightly bent knees still counts their squats:
  // the thresholds follow the posture, they are not hard-coded.
  const frames = [
    ...Array.from({ length: 40 }, () => pose(160)),
    ...ramp(160, 90, 40).map((k) => pose(k)),
    ...ramp(90, 160, 40).map((k) => pose(k)),
  ];

  assert.equal(run(frames).reps, 1);
});

test("the depth threshold rejects a knee bend that stops short", () => {
  // The depth gate is a real gate: at 108 deg the measured angle never gets
  // close to it, so the repetition is refused even though the movement was
  // smooth and complete.
  const frames = [
    ...ramp(175, 108, 40).map((k) => pose(k)),
    ...ramp(108, 175, 40).map((k) => pose(k)),
  ];

  const { machine } = run(frames);
  assert.equal(machine.snapshot().depthReached, false);
});

test("the depth threshold accepts a genuine bottom", () => {
  const machine = detector();
  let now = 1000;
  let depthAtBottom = false;

  for (const frame of squat(90)) {
    const result = machine.update({ ...frame, nowMs: now });
    if (result.state === SQUAT_REP_STATE.BOTTOM) depthAtBottom = true;
    now += FRAME_MS;
  }

  assert.equal(depthAtBottom, true, "the bottom of a squat is real depth");
});

test("a repetition is refused when the cycle was too short to be one", () => {
  // The whole standing-to-standing cycle has to take a plausible amount of
  // time, not just the descent.
  const frames = [
    ...ramp(175, 90, 3).map((k) => pose(k)),
    ...ramp(90, 175, 3).map((k) => pose(k)),
  ];

  assert.equal(run(frames).reps, 0);
});

test("abandoning the movement discards the partial repetition", () => {
  const machine = detector();
  let now = 1000;

  for (const frame of ramp(175, 90, 20).map((k) => pose(k))) {
    machine.update({ ...frame, nowMs: now });
    now += FRAME_MS;
  }

  // Tracking is lost and the pose comes back standing: that must not look
  // like a completed repetition.
  machine.abandon();
  for (const frame of Array.from({ length: 20 }, () => pose(175))) {
    machine.update({ ...frame, nowMs: now });
    now += FRAME_MS;
  }

  assert.equal(machine.reps, 0);
});

test("a reset clears the machine completely", () => {
  const machine = detector();
  let now = 1000;

  for (const frame of squat(90)) {
    machine.update({ ...frame, nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.reps, 1);

  machine.reset();
  assert.equal(machine.reps, 0);
  assert.equal(machine.snapshot().state, SQUAT_REP_STATE.STANDING);
  assert.equal(machine.snapshot().standingAngle, null);
});

test("the same movement cannot be counted twice", () => {
  const machine = detector();
  let now = 1000;
  let reps = 0;

  for (const frame of [
    ...squat(90),
    // The user stays standing for ten seconds: no further repetitions.
    ...Array.from({ length: 300 }, () => pose(175)),
  ]) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }

  assert.equal(reps, 1);
});

// ------------------------------------------------------- configuration ------

test("the depth thresholds are stricter than the old descent threshold", () => {
  // The old rule accepted a "repetition" at 110 deg of knee flexion and
  // called 140 deg standing. Both are now refused.
  assert.ok(
    SQUAT_REP_THRESHOLDS.maxDepthAngle < 110,
    "the depth gate must be stricter than the old descent threshold"
  );
  assert.ok(
    SQUAT_REP_THRESHOLDS.maxSmoothedDepthAngle < 115,
    "the smoothed depth gate must be stricter than the old threshold"
  );
  assert.equal(SQUAT_REP_THRESHOLDS.standTolerance, 25);
  assert.equal(SQUAT_REP_THRESHOLDS.minCycleMs, 400);
});

test("the thresholds can be overridden for calibration", () => {
  // A user whose comfortable depth is shallower can be served by loosening
  // the depth gate - the machine then accepts a 105 deg bottom.
  const lenient = createSquatRepDetector({
    thresholds: { maxDepthAngle: 108, maxSmoothedDepthAngle: 115 },
  });
  let now = 1000;
  let reps = 0;

  for (const frame of [
    ...ramp(175, 105, 30).map((k) => pose(k)),
    ...ramp(105, 175, 30).map((k) => pose(k)),
  ]) {
    reps = lenient.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }

  assert.equal(reps, 1, "a 105 deg bottom counts when the depth gate allows it");
});
