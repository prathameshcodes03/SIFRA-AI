import test from "node:test";
import assert from "node:assert/strict";

import {
  createCoachingGate,
  arbitrateCoaching,
  isLabelForExercise,
  CORRECT_LABEL_BY_EXERCISE,
  POSE_UNRELIABLE,
  MIN_RELIABLE_VISIBILITY,
} from "../src/exercises/coaching.js";
import {
  COACHING_MESSAGES,
  getFeedbackForPrediction,
  getPoseReliability,
} from "../src/exercises/featureExtractor.js";
import { PHASE } from "../src/exercises/repTracker.js";

/** Exactly the labels the shipped model can emit, per the model artifact. */
const MODEL_LABELS = {
  squat: ["correct", "shallow", "forward_lean", "knees_caving"],
  pushup: [
    "pushup_correct",
    "pushup_elbow_flare",
    "pushup_body_sag",
    "pushup_hips_high",
  ],
  plank: ["plank_correct", "plank_hips_high", "plank_hips_low"],
};

test("every model label maps to a non-empty coaching message", () => {
  for (const [exercise, labels] of Object.entries(MODEL_LABELS)) {
    for (const label of labels) {
      const message = getFeedbackForPrediction(label);
      assert.ok(
        typeof message === "string" && message.trim().length > 0,
        `${exercise}/${label} must have a message`
      );
    }
  }
});

test("the pose-unreliable label has its own message", () => {
  const message = getFeedbackForPrediction(POSE_UNRELIABLE);
  assert.ok(message && message.length > 0);
  assert.ok(
    message.toLowerCase().includes("frame") ||
      message.toLowerCase().includes("see you"),
    "message should tell the user to reposition the camera"
  );
});

test("unknown and missing predictions return null rather than a wrong claim", () => {
  assert.equal(getFeedbackForPrediction("something_unexpected"), null);
  assert.equal(getFeedbackForPrediction(null), null);
  assert.equal(getFeedbackForPrediction(undefined), null);
});

test("depth feedback is bounded and does not demand the floor", () => {
  const shallow = COACHING_MESSAGES.shallow.toLowerCase();
  assert.ok(
    shallow.includes("comfortable"),
    "shallow copy should be bounded to a comfortable depth"
  );
  assert.ok(
    !shallow.includes("deeper"),
    "copy must not imply that ever-deeper is always the goal"
  );
});

test("squat correct-form copy names the exercise", () => {
  assert.ok(
    COACHING_MESSAGES.correct.toLowerCase().includes("squat"),
    "positive squat feedback should say 'squat'"
  );
});

test("shallow is suppressed while the user is still upright", () => {
  const upright = arbitrateCoaching({
    label: "shallow",
    phase: PHASE.UP,
    reliable: true,
  });
  assert.equal(upright.gated, true, "not actionable while standing");
  assert.equal(
    upright.reason,
    "depth_not_actionable_while_upright"
  );
});

test("shallow is delivered once the user has descended", () => {
  const descended = arbitrateCoaching({
    label: "shallow",
    phase: PHASE.DOWN,
    reliable: true,
  });
  assert.equal(descended.gated, false, "depth feedback is actionable at the bottom");
  assert.equal(descended.label, "shallow");
});

test("other form labels are delivered in both phases", () => {
  for (const label of ["forward_lean", "knees_caving"]) {
    for (const phase of [PHASE.UP, PHASE.DOWN]) {
      const decision = arbitrateCoaching({ label, phase, reliable: true });
      assert.equal(decision.gated, false, `${label} in ${phase} should speak`);
    }
  }
});

test("unreliable pose overrides any form label", () => {
  const decision = arbitrateCoaching({
    label: "correct",
    phase: PHASE.DOWN,
    reliable: false,
  });
  assert.equal(decision.label, POSE_UNRELIABLE);
  assert.equal(decision.gated, false);
});

test("a null label is gated instead of coaching", () => {
  const decision = arbitrateCoaching({
    label: null,
    phase: PHASE.UP,
    reliable: true,
  });
  assert.equal(decision.gated, true);
});

/**
 * The shipped model occasionally returns a label belonging to a different
 * exercise (verified against the trained artifact). Speaking it verbatim would
 * tell a push-up user to align their knees.
 */
test("isLabelForExercise rejects another exercise's label", () => {
  assert.equal(isLabelForExercise("knees_caving", "squat"), true);
  assert.equal(isLabelForExercise("pushup_body_sag", "pushup"), true);
  assert.equal(isLabelForExercise("plank_hips_low", "plank"), true);

  assert.equal(isLabelForExercise("knees_caving", "pushup"), false);
  assert.equal(isLabelForExercise("pushup_elbow_flare", "squat"), false);
  assert.equal(isLabelForExercise("plank_hips_high", "pushup"), false);
});

test("a cross-exercise label is downgraded, not spoken literally", () => {
  const decision = arbitrateCoaching({
    label: "knees_caving", // squat label arriving during a push-up
    phase: PHASE.UP,
    reliable: true,
    exercise: "pushup",
  });

  assert.equal(decision.label, POSE_UNRELIABLE);
  assert.equal(decision.reason, "cross_exercise_label");
  assert.equal(decision.gated, false);
});

test("the matching exercise's label is still coached normally", () => {
  const decision = arbitrateCoaching({
    label: "pushup_body_sag",
    phase: PHASE.UP,
    reliable: true,
    exercise: "pushup",
  });

  assert.equal(decision.label, "pushup_body_sag");
  assert.equal(decision.gated, false);
});

test("correct labels are exercise-specific for accuracy", () => {
  assert.equal(CORRECT_LABEL_BY_EXERCISE.squat, "correct");
  assert.equal(CORRECT_LABEL_BY_EXERCISE.pushup, "pushup_correct");
  assert.equal(CORRECT_LABEL_BY_EXERCISE.plank, "plank_correct");

  // A squat 'correct' must not be credited as correct push-up form.
  assert.notEqual(
    CORRECT_LABEL_BY_EXERCISE.pushup,
    CORRECT_LABEL_BY_EXERCISE.squat
  );
});

test("majority vote protects against a single noisy frame", () => {
  const gate = createCoachingGate({ windowSize: 5 });

  for (let i = 0; i < 4; i += 1) gate.consider("correct");
  gate.consider("shallow"); // one noisy outlier

  assert.equal(gate.dominant(), "correct");
});

test("a genuine sustained change does flip the dominant label", () => {
  const gate = createCoachingGate({ windowSize: 5 });

  for (let i = 0; i < 3; i += 1) gate.consider("correct");
  for (let i = 0; i < 4; i += 1) gate.consider("knees_caving");

  assert.equal(gate.dominant(), "knees_caving");
});

test("gate history is bounded and resettable", () => {
  const gate = createCoachingGate({ windowSize: 3 });
  for (let i = 0; i < 20; i += 1) gate.consider("correct");
  assert.equal(gate.history().length, 3);

  gate.reset();
  assert.equal(gate.history().length, 0);
  assert.equal(gate.dominant(), null);
});

/** Minimal MediaPipe-shaped landmark array builder. */
const buildLandmarks = (visibility) =>
  Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility }));

test("fully visible landmarks are reliable", () => {
  const reliability = getPoseReliability(buildLandmarks(0.95));
  assert.ok(reliability > MIN_RELIABLE_VISIBILITY);
});

test("low-visibility landmarks are flagged unreliable", () => {
  const reliability = getPoseReliability(buildLandmarks(0.2));
  assert.ok(
    reliability < MIN_RELIABLE_VISIBILITY,
    `expected unreliable, got ${reliability}`
  );
});

test("missing landmarks never throw", () => {
  assert.equal(getPoseReliability(null), 0);
  assert.equal(getPoseReliability([]), 0);
});