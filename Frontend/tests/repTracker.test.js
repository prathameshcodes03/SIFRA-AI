import test from "node:test";
import assert from "node:assert/strict";

import {
  createRepTracker,
  PHASE,
  REP_THRESHOLDS,
} from "../src/exercises/repTracker.js";

/**
 * Fixtures are synthetic joint-angle frames, not real captures. They verify
 * the counter's state machine only - they cannot prove real-world detection.
 */
const squatFrame = (kneeAngle) => ({
  exercise: "squat",
  knee_angle: kneeAngle,
  elbow_angle: 20,
  hip_angle: 110,
  body_angle: 165,
  symmetry_score: 0.9,
  landmark_visibility: 0.95,
});

const pushupFrame = (elbowAngle) => ({
  exercise: "pushup",
  knee_angle: 0,
  elbow_angle: elbowAngle,
  hip_angle: 170,
  body_angle: 175,
  symmetry_score: 0.93,
  landmark_visibility: 0.97,
});

const plankFrame = (bodyAngle) => ({
  exercise: "plank",
  knee_angle: 0,
  elbow_angle: 0,
  hip_angle: 170,
  body_angle: bodyAngle,
  symmetry_score: 0.94,
  landmark_visibility: 0.98,
});

const frameFactory = (exercise) =>
  exercise === "pushup" ? pushupFrame : exercise === "plank" ? plankFrame : squatFrame;

/**
 * Frames in each third of one rep.
 *
 * 30 frames per phase at 33ms = a ~3.0s repetition, which is a realistic
 * bodyweight tempo. The tracker measures the CONFIRMED descent-to-return
 * window, which runs ~264ms shorter than the true movement (EMA lag plus
 * stability confirmation), so fixtures must use realistic tempo or they test a
 * twitch rather than a repetition.
 */
const FRAMES_PER_PHASE = 30;

/**
 * Feed one full up -> down -> up cycle, one frame every 33ms.
 * @param {object} tracker
 * @param {string} exercise
 * @param {number} upAngle    standing / locked-out joint angle
 * @param {number} downAngle  bottom-of-rep joint angle
 */
function runCycle(tracker, exercise, upAngle, downAngle, startMs, frames = FRAMES_PER_PHASE * 3) {
  const makeFrame = frameFactory(exercise);
  const stepMs = 33; // ~30fps sampling, typical MediaPipe cadence
  let t = startMs;
  let last;
  for (let i = 0; i < frames; i += 1) {
    const angle =
      i < frames / 3 ? upAngle : i < (frames * 2) / 3 ? downAngle : upAngle;
    last = tracker.update(makeFrame(angle), t);
    t += stepMs;
  }
  return { last, endTime: t };
}

test("squat: a full up-down-up cycle counts exactly one rep", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 1, requiredReps: 3 });
  const { last } = runCycle(tracker, "squat", 175, 95, 1000);

  assert.equal(last.reps, 1, "one complete cycle = one rep");
  assert.equal(last.phase, PHASE.UP, "ends in the up phase");
});

test("squat: a partial squat that never returns to standing counts zero reps", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 1, requiredReps: 3 });

  let t = 1000;
  let last;
  // Descend only, never rise past the `up` threshold.
  for (let i = 0; i < 40; i += 1) {
    last = tracker.update(squatFrame(i < 5 ? 175 : 95), t);
    t += 33;
  }

  assert.equal(last.reps, 0, "partial squat must not count");
  assert.equal(last.phase, PHASE.DOWN);
});

test("squat: noise inside the hysteresis band cannot double count", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 1, requiredReps: 5 });

  let t = 1000;
  let reps = 0;
  // Valid cycle, then jitter that oscillates within the dead zone.
  runCycle(tracker, "squat", 175, 95, t);
  reps = tracker.update(squatFrame(175), 6000).reps;

  for (let i = 0; i < 60; i += 1) {
    reps = tracker.update(squatFrame(i % 2 === 0 ? 120 : 135), t).reps;
    t += 40;
  }

  assert.equal(reps, 1, "jitter between 120 and 135 must not add reps");
});

/**
 * Runs cycles while tallying transient completion events.
 * `setJustCompleted` / `exerciseJustCompleted` are single-frame events, so they
 * must be observed while iterating rather than on the final frame only. This
 * mirrors how Camerafeed consumes them.
 */
function runCyclesTallying(tracker, exercise, upAngle, downAngle, startMs, cycleCount) {
  const makeFrame = frameFactory(exercise);
  const stepMs = 33;
  const framesPerPhase = FRAMES_PER_PHASE;
  let t = startMs;
  let setEvents = 0;
  let exerciseEvents = 0;
  let last = null;

  for (let c = 0; c < cycleCount; c += 1) {
    for (let i = 0; i < framesPerPhase * 3; i += 1) {
      const angle =
        i < framesPerPhase ? upAngle : i < framesPerPhase * 2 ? downAngle : upAngle;
      last = tracker.update(makeFrame(angle), t);
      t += stepMs;
      if (last.setJustCompleted) setEvents += 1;
      if (last.exerciseJustCompleted) exerciseEvents += 1;
    }
  }
  return { last, setEvents, exerciseEvents, endTime: t };
}

test("squat: reaching the rep target completes the set", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 2 });

  const { last, setEvents } = runCyclesTallying(
    tracker,
    "squat",
    175,
    95,
    1000,
    2
  );

  assert.equal(setEvents, 1, "set 1 completes exactly once at the rep target");
  assert.equal(last.sets, 2, "advances to set 2");
  assert.equal(last.setReps, 0, "rep counter resets for the new set");
});

test("squat: completing the final set completes the exercise exactly once", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 2, requiredReps: 2 });

  const { exerciseEvents, last } = runCyclesTallying(
    tracker,
    "squat",
    175,
    95,
    1000,
    5
  );

  assert.equal(exerciseEvents, 1, "exercise completion must fire once only");
  assert.equal(last.reps, 4, "all prescribed reps were counted");
});

test("squat: further frames after completion produce no extra completion event", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 1, requiredReps: 1 });

  let t = 1000;
  let events = 0;
  for (let i = 0; i < 200; i += 1) {
    const angle =
      i < FRAMES_PER_PHASE ? 175 : i < FRAMES_PER_PHASE * 2 ? 95 : 175;
    const res = tracker.update(squatFrame(angle), t);
    t += 33;
    if (res.exerciseJustCompleted) events += 1;
  }

  assert.equal(events, 1, "guard prevents duplicate completion requests");
});

test("pushup: counts from elbow flexion, not knee angle", () => {
  const tracker = createRepTracker({ exercise: "pushup", requiredSets: 1, requiredReps: 1 });

  let t = 1000;
  const { last } = runCycle(tracker, "pushup", 175, 85, t);

  assert.equal(last.reps, 1);
  assert.equal(REP_THRESHOLDS.pushup.signal, "elbow_angle");
});

test("plank: accumulates whole seconds while the hold is valid", () => {
  const tracker = createRepTracker({ exercise: "plank", requiredSets: 1, requiredReps: 3 });

  let t = 1000;
  let last;
  let completionEvents = 0;
  // ~30fps sampling for ~3.2s of continuous good hold.
  for (let i = 0; i < 96; i += 1) {
    last = tracker.update(plankFrame(175), t);
    t += 33;
    if (last.exerciseJustCompleted) completionEvents += 1;
  }

  assert.equal(last.holdFormOk, true);
  // A plank is a timed hold: the hold counter advances, the REP counter does not.
  assert.ok(last.setReps >= 3, `expected >=3 hold seconds, got ${last.setReps}`);
  assert.equal(last.reps, 0, "a hold must never be counted as repetitions");
  assert.equal(completionEvents, 1, "hold target fires completion once");
});

test("plank: a broken hold does not bank partial seconds", () => {
  const tracker = createRepTracker({ exercise: "plank", requiredSets: 1, requiredReps: 10 });

  let t = 1000;
  let last;
  // Hold for 0.8s, break the line, then hold again.
  for (let i = 0; i < 8; i += 1) {
    last = tracker.update(plankFrame(175), t);
    t += 100;
  }
  for (let i = 0; i < 5; i += 1) {
    last = tracker.update(plankFrame(120), t); // hips/line broken
    t += 100;
  }
  for (let i = 0; i < 8; i += 1) {
    last = tracker.update(plankFrame(175), t);
    t += 100;
  }

  assert.equal(last.reps, 0, "0.8s + 0.8s must not become a full second");
});

test("plank: low visibility does not advance the hold timer", () => {
  const tracker = createRepTracker({ exercise: "plank", requiredSets: 1, requiredReps: 5 });

  let t = 1000;
  let last;
  for (let i = 0; i < 30; i += 1) {
    const frame = plankFrame(175);
    frame.symmetry_score = 0.5; // below the reliability gate
    last = tracker.update(frame, t);
    t += 100;
  }

  assert.equal(last.holdFormOk, false);
  assert.equal(last.setReps, 0);
  assert.equal(last.reps, 0);
});

test("missing features never advance the counter or throw", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });

  const result = tracker.update(null, 1000);

  assert.equal(result.reps, 0);
  assert.equal(result.phase, PHASE.UP);
});

test("unknown exercise is inert rather than crashing the camera loop", () => {
  const tracker = createRepTracker({ exercise: "burpee", requiredSets: 3, requiredReps: 10 });

  const result = tracker.update(
    { exercise: "burpee", knee_angle: 90, elbow_angle: 90 },
    1000
  );

  assert.equal(result.reps, 0);
});

test("reset restores a clean session", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 2 });
  runCycle(tracker, "squat", 175, 95, 1000);
  assert.ok(tracker.update(squatFrame(175), 3000).reps > 0);

  tracker.reset();
  const afterReset = tracker.update(squatFrame(175), 4000);

  assert.equal(afterReset.reps, 0);
  assert.equal(afterReset.sets, 1);
  assert.equal(afterReset.phase, PHASE.UP);
});