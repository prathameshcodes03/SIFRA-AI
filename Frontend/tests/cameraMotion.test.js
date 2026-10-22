import test from "node:test";
import assert from "node:assert/strict";

import { createSquatRepDetector } from "../src/exercises/squatRepDetector.js";
import { createRepTracker } from "../src/exercises/repTracker.js";

/**
 * A MOVED CAMERA must never count a repetition.
 *
 * The bug: moving the laptop (or picking it up to reposition it) makes the
 * knee landmark mis-localised for a moment, so the measured knee angle
 * dives and comes straight back. The counter read that dive as a descent
 * and the recovery as an ascent, and the repetition was credited - a single
 * camera move could add dozens of them.
 *
 * A real squat BOTTOMS OUT: the user stays at the bottom for a few hundred
 * milliseconds. Requiring the depth to be HELD is what separates the two.
 */

const FRAME_MS = 33;
const ramp = (from, to, n) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

/** A realistic squat frame: the hip flexes with the thigh. */
const squatFrame = (knee, extra = {}) => ({
  exercise: "squat",
  knee_angle: knee,
  elbow_angle: 170,
  hip_angle: extra.hip ?? 175 - (175 - knee) * 0.9,
  body_angle: 178,
  symmetry_score: 0.95,
  landmark_visibility: 0.95,
  ...extra,
});

/** Drives the real tracker, exactly as the camera loop does. */
const drive = (frames, stepMs = FRAME_MS) => {
  const tracker = createRepTracker({
    exercise: "squat",
    requiredSets: 3,
    requiredReps: 10,
  });
  let now = 1000;
  let reps = 0;
  for (const frame of frames) {
    reps = tracker.update(frame, now).reps;
    now += stepMs;
  }
  return reps;
};

const realSquat = (bottom = 90, frames = 30) => [
  ...ramp(175, bottom, frames).map((k) => squatFrame(k)),
  ...ramp(bottom, 175, frames).map((k) => squatFrame(k)),
];

test("a real squat still counts", () => {
  assert.equal(drive(realSquat()), 1);
  assert.equal(drive(realSquat(95, 20)), 1, "a fast squat still counts");
  assert.equal(
    drive([...realSquat(), ...realSquat(), ...realSquat()]),
    3,
    "three squats count three"
  );
});

test("an oscillating knee reading counts nothing", () => {
  // What a mis-localised knee looks like: the angle dives and recovers
  // again and again.
  const frames = Array.from({ length: 300 }, (_, i) =>
    squatFrame(i % 2 ? 45 : 175, { hip: i % 2 ? 45 : 175 })
  );

  assert.equal(drive(frames), 0);
});

test("a slowly oscillating knee reading counts nothing", () => {
  const frames = Array.from({ length: 300 }, (_, i) =>
    squatFrame(i % 6 < 3 ? 50 : 175, { hip: i % 6 < 3 ? 50 : 175 })
  );

  assert.equal(drive(frames), 0);
});

test("a single deep spike counts nothing", () => {
  const frames = [
    ...Array.from({ length: 40 }, () => squatFrame(175)),
    squatFrame(45),
    ...Array.from({ length: 40 }, () => squatFrame(175)),
  ];

  assert.equal(drive(frames), 0);
});

test("a pair of deep spikes counts nothing", () => {
  const frames = [
    ...Array.from({ length: 40 }, () => squatFrame(175)),
    squatFrame(45),
    squatFrame(45),
    ...Array.from({ length: 40 }, () => squatFrame(175)),
  ];

  assert.equal(drive(frames), 0);
});

test("a knee that dives while the hip stays straight counts nothing", () => {
  // The projection changed, the body did not: the knee and the hip have to
  // flex together for it to be a squat.
  const frames = [
    ...ramp(175, 150, 30).map((k) =>
      squatFrame(k, { hip: 175 - (175 - k) * 1.6 })
    ),
    ...ramp(150, 175, 30).map((k) =>
      squatFrame(k, { hip: 175 - (175 - k) * 1.6 })
    ),
  ];

  assert.equal(drive(frames), 0);
});

test("the depth has to be HELD, not merely touched", () => {
  // The detector's own view: the smoothed angle has to stay at the depth.
  const machine = createSquatRepDetector();
  let now = 1000;

  // A single frame at the bottom is not a bottom.
  for (const frame of [
    ...Array.from({ length: 30 }, () => squatFrame(175)),
    squatFrame(45),
    ...Array.from({ length: 30 }, () => squatFrame(175)),
  ]) {
    machine.update({
      kneeAngle: frame.knee_angle,
      hipAngle: frame.hip_angle,
      nowMs: now,
    });
    now += FRAME_MS;
  }

  assert.equal(machine.reps, 0);
});

test("a held bottom is still counted", () => {
  const machine = createSquatRepDetector();
  let now = 1000;

  for (const frame of [
    ...ramp(175, 90, 25).map((k) => squatFrame(k)),
    // The user HOLDS the bottom for half a second.
    ...Array.from({ length: 15 }, () => squatFrame(90)),
    ...ramp(90, 175, 25).map((k) => squatFrame(k)),
  ]) {
    machine.update({
      kneeAngle: frame.knee_angle,
      hipAngle: frame.hip_angle,
      nowMs: now,
    });
    now += FRAME_MS;
  }

  assert.equal(machine.reps, 1);
});
