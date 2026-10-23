import test from "node:test";
import assert from "node:assert/strict";

import { calculateAngle } from "../src/mathematics/angles.js";
import { calculateDistance, calculateVector } from "../src/mathematics/geometry.js";
import { getLandmark, isLandmarkVisible } from "../src/mediapipe/poseUtils.js";
import { POSE_LANDMARKS as P } from "../src/mediapipe/poseLandmarks.js";
import {
  extractExerciseFeatures,
  evaluateFormRuleBased,
  normalizeExerciseName,
  getPoseReliability,
} from "../src/exercises/featureExtractor.js";
import {
  createRepTracker,
  PHASE,
  MIN_TRACKING_VISIBILITY,
} from "../src/exercises/repTracker.js";
import {
  createSquatRepDetector,
  SQUAT_REP_STATE,
} from "../src/exercises/squatRepDetector.js";
import {
  createPushupRepDetector,
  PUSHUP_REP_STATE,
} from "../src/exercises/pushupRepDetector.js";
import {
  createPlankHold,
  isPlankPose,
} from "../src/exercises/plankHold.js";
import { createAccuracyTracker } from "../src/exercises/accuracyTracker.js";
import { isLabelForExercise } from "../src/exercises/coaching.js";

const FRAME_MS = 33;
const ramp = (from, to, n) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

// ============================================================================
// 1. SQUAT DETECTION RELIABILITY
// ============================================================================

const squatPose = (knee, hip = null) => ({
  kneeAngle: knee,
  hipAngle: hip ?? 175 - (175 - knee) * 0.9,
});

const fullSquat = (bottom = 90, frames = 40) => [
  ...ramp(175, bottom, Math.floor(frames / 2)).map((k) => squatPose(k)),
  ...ramp(bottom, 175, Math.ceil(frames / 2)).map((k) => squatPose(k)),
];

test("SQUATS: valid repetition counts exactly 1", () => {
  const machine = createSquatRepDetector();
  let now = 1000;
  let reps = 0;
  for (const frame of fullSquat(90, 40)) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 1);
});

test("SQUATS: shallow squat (stopping at 115 deg) counts 0", () => {
  const machine = createSquatRepDetector();
  let now = 1000;
  let reps = 0;
  const shallowSquat = [
    ...ramp(175, 115, 20).map((k) => squatPose(k)),
    ...ramp(115, 175, 20).map((k) => squatPose(k)),
  ];
  for (const frame of shallowSquat) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 0);
  assert.equal(machine.snapshot().depthReached, false);
});

test("SQUATS: brief crossing of depth threshold without hold counts 0", () => {
  const machine = createSquatRepDetector();
  let now = 1000;
  // User stands at 175, spikes down to 90 for 1 frame (33ms < minDepthHoldMs 150ms), returns
  const spike = [
    ...Array.from({ length: 20 }, () => squatPose(175)),
    squatPose(90),
    ...Array.from({ length: 20 }, () => squatPose(175)),
  ];
  let reps = 0;
  for (const frame of spike) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 0, "a momentary spike must not count as a squat");
});

test("SQUATS: standing landmark jitter counts 0", () => {
  const machine = createSquatRepDetector();
  let now = 1000;
  let reps = 0;
  const jitterAngles = [174, 169, 176, 171, 168, 173, 175, 170];
  for (let i = 0; i < 200; i++) {
    reps = machine.update({ ...squatPose(jitterAngles[i % 8]), nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 0);
});

test("SQUATS: missing landmarks return un-incremented snapshot and reject reps", () => {
  const machine = createSquatRepDetector();
  let now = 1000;
  const res1 = machine.update({ kneeAngle: null, hipAngle: 170, nowMs: now });
  assert.equal(res1.reps, 0);
  const res2 = machine.update({ kneeAngle: undefined, nowMs: now + 33 });
  assert.equal(res2.reps, 0);
  const res3 = machine.update({ kneeAngle: NaN, nowMs: now + 66 });
  assert.equal(res3.reps, 0);
});

test("SQUATS: tracking loss during descent abandons rep, preventing phantom count upon standing", () => {
  const tracker = createRepTracker({ exercise: "squat" });
  let now = 1000;

  // Descend to bottom
  for (const k of ramp(175, 90, 20)) {
    tracker.update({
      exercise: "squat",
      knee_angle: k,
      hip_angle: 175 - (175 - k) * 0.9,
      pose_visibility: 0.95,
      measured: { knee: true, hip: true },
    }, now);
    now += FRAME_MS;
  }

  // Camera loses tracking sustained (>= 400ms)
  for (let i = 0; i < 15; i++) {
    tracker.update(null, now);
    now += FRAME_MS;
  }

  // Suddenly camera reappears standing at 175
  let last = null;
  for (let i = 0; i < 20; i++) {
    last = tracker.update({
      exercise: "squat",
      knee_angle: 175,
      hip_angle: 175,
      pose_visibility: 0.95,
      measured: { knee: true, hip: true },
    }, now);
    now += FRAME_MS;
  }

  assert.equal(last.reps, 0, "tracking dropout must not invent a rep on return to standing");
});

test("SQUATS: holding at bottom or standing does not duplicate count", () => {
  const machine = createSquatRepDetector();
  let now = 1000;

  for (const k of ramp(175, 90, 20)) {
    machine.update({ ...squatPose(k), nowMs: now });
    now += FRAME_MS;
  }
  // Hold at bottom for 3 seconds
  for (let i = 0; i < 90; i++) {
    machine.update({ ...squatPose(90), nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 0, "holding at bottom must not count reps yet");

  // Ascend to standing
  for (const k of ramp(90, 175, 20)) {
    machine.update({ ...squatPose(k), nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 1);

  // Stand at top for 3 seconds
  for (let i = 0; i < 90; i++) {
    machine.update({ ...squatPose(175), nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 1, "holding at top must not duplicate counts");
});

test("SQUATS: recovery after tracking loss allows subsequent valid repetition", () => {
  const machine = createSquatRepDetector();
  let now = 1000;

  // Interrupted rep
  for (const k of ramp(175, 90, 20)) {
    machine.update({ ...squatPose(k), nowMs: now });
    now += FRAME_MS;
  }
  machine.abandon();

  // Return to standing and stabilize
  for (let i = 0; i < 20; i++) {
    machine.update({ ...squatPose(175), nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 0);

  // Now execute a complete, valid squat
  for (const frame of fullSquat(90, 40)) {
    machine.update({ ...frame, nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 1, "valid rep after recovery must count");
});

// ============================================================================
// 2. PUSHUP DETECTION RELIABILITY
// ============================================================================

const pushupPose = (elbow, { body = 175, hip = 172, tilt = 8 } = {}) => ({
  elbowAngle: elbow,
  bodyAngle: body,
  hipAngle: hip,
  bodyTilt: tilt,
});

const fullPushup = (bottom = 80, options = {}) => [
  ...ramp(160, bottom, 20).map((e) => pushupPose(e, options)),
  ...ramp(bottom, 160, 20).map((e) => pushupPose(e, options)),
];

test("PUSHUPS: valid repetition counts exactly 1", () => {
  const machine = createPushupRepDetector();
  let now = 1000;
  let reps = 0;
  for (const frame of fullPushup(80)) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 1);
});

test("PUSHUPS: standing arm movement rejected by body orientation (tilt = 85 deg)", () => {
  const machine = createPushupRepDetector();
  let now = 1000;
  // Straight body, arm flexes 160->80->160, but user is vertical (tilt = 85)
  const standingMovement = fullPushup(80, { tilt: 85, body: 178, hip: 175 });
  let reps = 0;
  for (const frame of standingMovement) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 0, "standing arm movement must not count as pushups");
});

test("PUSHUPS: standing with ankles occluded is rejected via torso tilt", () => {
  // Skeleton representing standing person with ankles missing
  const make = (x, y, z = 0, v = 0.95) => ({ x, y, z, visibility: v });
  const lms = Array.from({ length: 33 }, () => null);
  // Standing upright: shoulder at y=0.2, hip at y=0.6, elbow flexed
  lms[P.LEFT_SHOULDER] = make(0.5, 0.2);
  lms[P.RIGHT_SHOULDER] = make(0.5, 0.2);
  lms[P.LEFT_ELBOW] = make(0.7, 0.3);
  lms[P.RIGHT_ELBOW] = make(0.7, 0.3);
  lms[P.LEFT_WRIST] = make(0.5, 0.35);
  lms[P.RIGHT_WRIST] = make(0.5, 0.35);
  lms[P.LEFT_HIP] = make(0.5, 0.6);
  lms[P.RIGHT_HIP] = make(0.5, 0.6);
  lms[P.LEFT_KNEE] = make(0.5, 0.8);
  lms[P.RIGHT_KNEE] = make(0.5, 0.8);
  // Ankles are MISSING (null)

  const features = extractExerciseFeatures(lms, "pushup");
  assert.ok(features, "features extracted from visible upper body");
  assert.ok(features.body_tilt !== null, "torso tilt is computed even when ankles are off-screen");
  assert.ok(features.body_tilt > 55, `standing torso tilt should be > 55 deg, got ${features.body_tilt}`);

  const machine = createPushupRepDetector();
  const res = machine.update({
    elbowAngle: features.elbow_angle,
    bodyAngle: features.body_angle,
    hipAngle: features.hip_angle,
    bodyTilt: features.body_tilt,
    nowMs: 1000,
  });
  assert.equal(res.state, PUSHUP_REP_STATE.TOP);
  assert.equal(res.reps, 0);
});

test("PUSHUPS: incomplete descent (stopping at 120 deg) counts 0", () => {
  const machine = createPushupRepDetector();
  let now = 1000;
  const partial = [
    ...ramp(160, 120, 20).map((e) => pushupPose(e)),
    ...ramp(120, 160, 20).map((e) => pushupPose(e)),
  ];
  let reps = 0;
  for (const frame of partial) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 0);
});

test("PUSHUPS: incomplete ascent (stopping at 120 deg) counts 0", () => {
  const machine = createPushupRepDetector();
  let now = 1000;
  const incompleteAscent = [
    ...ramp(160, 80, 20).map((e) => pushupPose(e)),
    ...ramp(80, 120, 20).map((e) => pushupPose(e)),
    ...Array.from({ length: 30 }, () => pushupPose(120)),
  ];
  let reps = 0;
  for (const frame of incompleteAscent) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 0);
});

test("PUSHUPS: user with natural measured extension at 145 deg completes repetition", () => {
  const machine = createPushupRepDetector();
  let now = 1000;
  // Calibration starts at 145, descends to 80, ascends back to 145
  const userPushup = [
    ...Array.from({ length: 10 }, () => pushupPose(145)),
    ...ramp(145, 80, 20).map((e) => pushupPose(e)),
    ...ramp(80, 145, 20).map((e) => pushupPose(e)),
    ...Array.from({ length: 10 }, () => pushupPose(145)),
  ];
  let reps = 0;
  for (const frame of userPushup) {
    reps = machine.update({ ...frame, nowMs: now }).reps;
    now += FRAME_MS;
  }
  assert.equal(reps, 1, "a 145 deg elbow lockout must be accepted as a valid pushup top");
});

test("PUSHUPS: fatigued user whose lockout drops from 165 to 145 deg still counts reps", () => {
  const machine = createPushupRepDetector();
  let now = 1000;

  // First rep from 165
  for (const frame of fullPushup(80)) {
    machine.update({ ...frame, nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 1);

  // User is fatigued: rest at top at 145 deg for 2 seconds (decay takes effect)
  for (let i = 0; i < 60; i++) {
    machine.update({ ...pushupPose(145), nowMs: now });
    now += FRAME_MS;
  }

  // Second rep from 145 down to 80 and back to 145
  for (const frame of [
    ...ramp(145, 80, 20).map((e) => pushupPose(e)),
    ...ramp(80, 145, 20).map((e) => pushupPose(e)),
    ...Array.from({ length: 10 }, () => pushupPose(145)),
  ]) {
    machine.update({ ...frame, nowMs: now });
    now += FRAME_MS;
  }
  assert.equal(machine.snapshot().reps, 2, "fatigued user returning to 145 deg must count second rep");
});

// ============================================================================
// 3. PLANK DETECTION RELIABILITY
// ============================================================================

test("PLANKS: valid plank pose confirms and banks time", () => {
  const timer = createPlankHold();
  let now = 1000;
  // 30 valid frames at 33ms step = ~1000ms. After 500ms confirmation, banks remaining ~500ms
  for (let i = 0; i < 30; i++) {
    timer.update({ valid: true, nowMs: now, dtMs: FRAME_MS });
    now += FRAME_MS;
  }
  assert.ok(timer.snapshot().confirmed);
  assert.ok(timer.seconds > 0.4, `should bank ~0.5s, got ${timer.seconds}`);
});

test("PLANKS: standing posture is rejected even if body line is straight", () => {
  // Straight body (bodyAngle 178) but standing (bodyTilt 85)
  assert.equal(
    isPlankPose({ bodyAngle: 178, bodyTilt: 85, symmetryScore: 0.95 }),
    false,
    "standing posture must not be accepted as plank"
  );
});

test("PLANKS: invalid alignment (hips pike or sag) is rejected", () => {
  assert.equal(isPlankPose({ bodyAngle: 140, bodyTilt: 8, symmetryScore: 0.95 }), false);
  assert.equal(isPlankPose({ bodyAngle: 175, bodyTilt: 8, symmetryScore: 0.95, hipAngle: 135 }), false);
});

test("PLANKS: low-confidence landmarks do not bank time in tracker", () => {
  const tracker = createRepTracker({ exercise: "plank" });
  let now = 1000;
  let last = null;
  // Straight horizontal body, but landmark visibility is low (0.3 < 0.5)
  for (let i = 0; i < 30; i++) {
    last = tracker.update({
      exercise: "plank",
      body_angle: 175,
      body_tilt: 8,
      symmetry_score: 0.95,
      pose_visibility: 0.3,
      landmark_visibility: 0.3,
      measured: { body: true },
    }, now, { reliable: false });
    now += FRAME_MS;
  }
  assert.equal(last.holdSeconds, 0);
  assert.equal(last.setReps, 0);
  assert.equal(last.trackingOk, false);
});

test("PLANKS: brief invalid frames do not reset accumulated time (grace period)", () => {
  const timer = createPlankHold();
  let now = 1000;

  // Hold valid for 1.5s
  for (let i = 0; i < 45; i++) {
    timer.update({ valid: true, nowMs: now, dtMs: FRAME_MS });
    now += FRAME_MS;
  }
  const banked = timer.seconds;
  assert.ok(banked >= 0.9);

  // Momentary invalid wobble of 200ms (< 1000ms grace)
  for (let i = 0; i < 6; i++) {
    timer.update({ valid: false, nowMs: now, dtMs: FRAME_MS });
    now += FRAME_MS;
  }
  assert.equal(timer.seconds, banked, "invalid time must not be banked");

  // Valid resumed
  for (let i = 0; i < 15; i++) {
    timer.update({ valid: true, nowMs: now, dtMs: FRAME_MS });
    now += FRAME_MS;
  }
  assert.ok(timer.seconds > banked, "accumulated time continues advancing after brief wobble");
});

// ============================================================================
// 4. GENERAL ROBUSTNESS & MATHEMATICAL SAFETY
// ============================================================================

test("GENERAL: calculateAngle handles missing points, NaN, and Infinity safely", () => {
  assert.equal(calculateAngle(null, null, null), 0);
  assert.equal(calculateAngle({ x: 0, y: 0 }, undefined, { x: 1, y: 1 }), 0);
  assert.equal(calculateAngle({ x: NaN, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 0);
  assert.equal(calculateAngle({ x: Infinity, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 0);
  assert.equal(calculateAngle({ x: 0, y: 0, z: NaN }, { x: 0, y: 0 }, { x: 1, y: 0 }), 0);
  // Valid right angle
  const angle = calculateAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(Math.abs(angle - 90) < 0.001);
});

test("GENERAL: calculateDistance and calculateVector handle NaN safely", () => {
  assert.equal(calculateDistance(null, null), 0);
  assert.equal(calculateDistance({ x: NaN, y: 0 }, { x: 0, y: 0 }), 0);
  const vec = calculateVector(null, { x: 1, y: 2 });
  assert.deepEqual(vec, { x: 0, y: 0, z: 0 });
});

test("GENERAL: getLandmark and isLandmarkVisible reject corrupted landmarks", () => {
  const lms = [{ x: NaN, y: 0 }, { x: 0.5, y: 0.5, visibility: 0.9 }];
  assert.equal(getLandmark(lms, 0), null);
  assert.equal(isLandmarkVisible(lms, 0), false);
  assert.ok(getLandmark(lms, 1) !== null);
  assert.equal(isLandmarkVisible(lms, 1), true);
});

test("GENERAL: getPoseReliability accurately scores critical landmark visibility", () => {
  assert.equal(getPoseReliability([]), 0);
  assert.equal(getPoseReliability(null), 0);
  const lms = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.8 }));
  assert.ok(Math.abs(getPoseReliability(lms) - 0.8) < 0.01);
});

test("GENERAL: normalizeExerciseName standardizes plural and hyphenated variations", () => {
  assert.equal(normalizeExerciseName("Squats"), "squat");
  assert.equal(normalizeExerciseName("squat"), "squat");
  assert.equal(normalizeExerciseName("Pushups"), "pushup");
  assert.equal(normalizeExerciseName("push-ups"), "pushup");
  assert.equal(normalizeExerciseName("Planks"), "plank");
});

test("GENERAL: evaluateFormRuleBased evaluates correctly with normalized names", () => {
  const features = {
    exercise: "Squats",
    knee_angle: 90,
    hip_angle: 90,
    body_angle: 165,
    symmetry_score: 0.9,
    measured: { knee: true, hip: true, body: true },
  };
  assert.equal(evaluateFormRuleBased(features), "correct");
});

test("GENERAL: accuracy tracker scores pushups and planks with normalized exercise names", () => {
  const pushupTracker = createAccuracyTracker({ exercise: "Pushups" });
  assert.equal(pushupTracker.correctLabel, "pushup_correct");
  pushupTracker.record("pushup_correct");
  assert.equal(pushupTracker.snapshot().accuracy, 100);

  const plankTracker = createAccuracyTracker({ exercise: "Planks" });
  assert.equal(plankTracker.correctLabel, "plank_correct");
  plankTracker.record("plank_correct");
  assert.equal(plankTracker.snapshot().accuracy, 100);
});

test("GENERAL: cross-exercise labels are rejected by isLabelForExercise with normalized names", () => {
  assert.equal(isLabelForExercise("pushup_correct", "Squats"), false);
  assert.equal(isLabelForExercise("knees_caving", "Pushups"), false);
  assert.equal(isLabelForExercise("plank_hips_high", "Planks"), true);
});

test("GENERAL: exercise switching cleanly resets trackers and states", () => {
  const squatTracker = createRepTracker({ exercise: "squat" });
  // Drive some frames
  const snap1 = squatTracker.update({
    exercise: "squat",
    knee_angle: 175,
    hip_angle: 175,
    pose_visibility: 0.95,
  }, 1000);
  assert.equal(snap1.phase, PHASE.UP);

  squatTracker.reset();
  const resetSnap = squatTracker.update({
    exercise: "squat",
    knee_angle: 175,
    hip_angle: 175,
    pose_visibility: 0.95,
  }, 2000);
  assert.equal(resetSnap.reps, 0);
  assert.equal(resetSnap.setReps, 0);
});
