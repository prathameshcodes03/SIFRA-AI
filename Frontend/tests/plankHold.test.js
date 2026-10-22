import test from "node:test";
import assert from "node:assert/strict";

import {
  createPlankHold,
  isPlankPose,
  PLANK_HOLD_THRESHOLDS,
} from "../src/exercises/plankHold.js";
import { createRepTracker } from "../src/exercises/repTracker.js";

/**
 * Plank hold timing.
 *
 * The bug these tests lock down: the timer only asked "is the body line
 * straight?", and a body line is 180 deg for a STANDING person and for
 * someone lying flat on the floor - exactly as it is for a plank. The timer
 * therefore ran for a user who was simply standing in front of the camera.
 *
 * The second bug: the per-frame time was capped at 250ms, so on a slow
 * camera the hold ran at a fraction of real time.
 *
 * These are SYNTHETIC feature frames with deterministic timestamps. They
 * prove the timing logic, not real-camera behaviour.
 */

const FRAME_MS = 33;

const plankFrame = (
  body = 178,
  { tilt = 6, symmetry = 0.94, visibility = 0.98 } = {}
) => ({
  exercise: "plank",
  knee_angle: 92,
  elbow_angle: 90,
  hip_angle: 170,
  body_angle: body,
  body_tilt: tilt,
  symmetry_score: symmetry,
  landmark_visibility: visibility,
});

/** Drives the hold module directly, with deterministic timestamps. */
function hold(frames, { stepMs = FRAME_MS, startMs = 1000 } = {}) {
  const timer = createPlankHold();
  let now = startMs;
  for (const frame of frames) {
    timer.update({ valid: frame.valid, nowMs: now, dtMs: stepMs });
    now += stepMs;
  }
  return { timer, now };
}

// ------------------------------------------------------------- the pose -----

test("a straight body alone is not a plank", () => {
  // The body line is perfectly straight - and so it is for a standing user.
  assert.equal(
    isPlankPose({ bodyAngle: 180, bodyTilt: 88, symmetryScore: 0.95 }),
    false,
    "a vertical body is not a plank"
  );

  assert.equal(
    isPlankPose({ bodyAngle: 178, bodyTilt: 6, symmetryScore: 0.95 }),
    true,
    "a straight, horizontal body is a plank"
  );
});

test("a bent body is not a plank", () => {
  assert.equal(
    isPlankPose({ bodyAngle: 140, bodyTilt: 6, symmetryScore: 0.95 }),
    false
  );
});

test("a missing tilt is unknown, never a refusal", () => {
  // The tilt could not be measured: the angles decide, and the pose is not
  // refused for something that was never measured.
  assert.equal(isPlankPose({ bodyAngle: 178, symmetryScore: 0.95 }), true);
});

test("a body angle that was never measured is not a plank", () => {
  assert.equal(isPlankPose({ bodyAngle: null, bodyTilt: 6 }), false);
});

// ------------------------------------------------------------ the timing ----

test("a user who is not in a plank banks no time", () => {
  const frames = Array.from({ length: 300 }, () => ({
    valid: false,
  }));

  assert.equal(hold(frames).timer.seconds, 0);
});

test("the confirmation period is respected", () => {
  // A plank that appears and disappears again inside the confirmation
  // window never starts the timer.
  const frames = [
    ...Array.from({ length: 5 }, () => ({ valid: true })),
    ...Array.from({ length: 5 }, () => ({ valid: false })),
    ...Array.from({ length: 5 }, () => ({ valid: true })),
  ];

  assert.equal(hold(frames).timer.seconds, 0);
});

test("a valid plank for ten seconds banks about ten seconds", () => {
  const frames = Array.from({ length: 300 }, () => ({ valid: true }));

  const { timer } = hold(frames);
  const elapsed = 300 * FRAME_MS;

  assert.ok(
    timer.seconds > elapsed / 1000 - PLANK_HOLD_THRESHOLDS.confirmationMs / 1000 - 0.1,
    `expected about ${elapsed / 1000}s, got ${timer.seconds}`
  );
  assert.ok(timer.seconds <= elapsed / 1000, "never more than the real time");
});

test("invalid time is never included in the hold", () => {
  const frames = [
    ...Array.from({ length: 150 }, () => ({ valid: true })),
    ...Array.from({ length: 60 }, () => ({ valid: false })),
    ...Array.from({ length: 150 }, () => ({ valid: true })),
  ];

  const { timer } = hold(frames);
  const validFrames = 300;

  assert.ok(
    timer.seconds <= (validFrames * FRAME_MS) / 1000,
    "the invalid stretch must not be banked"
  );
  assert.ok(timer.seconds > 0, "the valid stretches are still banked");
});

test("a brief tracking loss pauses the timer instead of destroying it", () => {
  const frames = [
    ...Array.from({ length: 150 }, () => ({ valid: true })),
    ...Array.from({ length: 3 }, () => ({ valid: false })),
    ...Array.from({ length: 150 }, () => ({ valid: true })),
  ];

  const { timer } = hold(frames);

  assert.ok(
    timer.seconds > 9,
    `a three frame dropout must not cost the hold, got ${timer.seconds}`
  );
});

test("a sustained form break ends the hold and the pose is confirmed again", () => {
  const frames = [
    ...Array.from({ length: 150 }, () => ({ valid: true })),
    ...Array.from({ length: 90 }, () => ({ valid: false })),
    ...Array.from({ length: 30 }, () => ({ valid: true })),
  ];

  const { timer } = hold(frames);

  // The time banked before the break survives, but the pose has to hold
  // again before any more is banked.
  assert.ok(timer.seconds > 3 && timer.seconds < 6, `got ${timer.seconds}`);
});

test("the duration is time-based, not frame-based", () => {
  // The same ten seconds of holding, sampled at three frame rates.
  for (const fps of [15, 30, 60]) {
    const stepMs = 1000 / fps;
    const frames = Array.from({ length: 10 * fps }, () => ({ valid: true }));

    const { timer } = hold(frames, { stepMs });

    assert.ok(
      timer.seconds > 9,
      `${fps} fps must bank about ten seconds, got ${timer.seconds}`
    );
    assert.ok(timer.seconds <= 10, `${fps} fps must not bank more than real time`);
  }
});

test("a hidden tab cannot bank time", () => {
  const tracker = createRepTracker({
    exercise: "plank",
    requiredSets: 1,
    requiredReps: 60,
  });
  tracker.update(plankFrame(), 1000);

  // One enormous step, as if the tab was hidden for a minute.
  const after = tracker.update(plankFrame(), 61000);

  assert.equal(after.setReps, 0, "a hidden tab banks no hold seconds");
});

test("the tracker stops banking when the pose is invalid", () => {
  const tracker = createRepTracker({
    exercise: "plank",
    requiredSets: 1,
    requiredReps: 60,
  });
  let now = 1000;
  for (let i = 0; i < 60; i += 1) {
    tracker.update(plankFrame(), now);
    now += FRAME_MS;
  }
  const held = tracker.update(plankFrame(), now).setReps;
  assert.ok(held > 0, "the valid plank banked time");

  const standing = tracker.update(plankFrame(180, { tilt: 88 }), now);
  assert.equal(standing.holdFormOk, false, "a standing user is not a plank");

  // Ten more seconds of standing bank nothing: the timer is paused, so the
  // time already banked survives but no more is added.
  for (let i = 0; i < 300; i += 1) {
    tracker.update(plankFrame(180, { tilt: 88 }), now);
    now += FRAME_MS;
  }
  assert.equal(
    tracker.update(plankFrame(180, { tilt: 88 }), now).setReps,
    held,
    "an invalid pose banks no further time"
  );
});

test("a reset clears the hold", () => {
  const tracker = createRepTracker({
    exercise: "plank",
    requiredSets: 1,
    requiredReps: 60,
  });
  let now = 1000;
  for (let i = 0; i < 120; i += 1) {
    tracker.update(plankFrame(), now);
    now += FRAME_MS;
  }
  assert.ok(tracker.update(plankFrame(), now).setReps > 0);

  tracker.reset();
  const after = tracker.update(plankFrame(), now + FRAME_MS);

  assert.equal(after.setReps, 0);
  assert.equal(after.holdSeconds, 0);
});
