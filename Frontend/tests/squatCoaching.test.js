import test from "node:test";
import assert from "node:assert/strict";

import { createRepTracker, PHASE } from "../src/exercises/repTracker.js";
import {
  assessSquatForm,
  REP_TOP_ANGLE,
  SHALLOW_KNEE_ANGLE,
  FORWARD_LEAN_BODY_ANGLE,
} from "../src/exercises/formAssessment.js";
import { createSquatRepSummary } from "../src/exercises/squatRepSummary.js";
import { resolveFormCoaching, POSE_UNRELIABLE } from "../src/exercises/coaching.js";
import { isWithinModelSupport } from "../src/exercises/modelSupport.js";
import { getFeedbackForPrediction } from "../src/exercises/featureExtractor.js";
import { createCoachingGate, arbitrateCoaching, resolveCoachingCue } from "../src/exercises/coaching.js";
import { createVoiceCueGate } from "../src/hooks/voiceCueGate.js";

/**
 * Controlled squat fixtures.
 *
 * These are SYNTHETIC landmark-derived feature vectors chosen to span the
 * documented ranges in ml-model/data/processed/sifra_ai_final_cleaned.csv.
 * They prove the DECISION LOGIC is correct. They do NOT prove real-camera
 * accuracy, and they are not a substitute for a webcam test.
 */

const FRAME_MS = 33;

const squatFeatures = ({
  knee,
  hip = 90,
  body = 166,
  symmetry = 0.96,
  visibility = 0.95,
  kneeAsymmetry = 2,
} = {}) => ({
  exercise: "squat",
  knee_angle: knee,
  elbow_angle: 90,
  hip_angle: hip,
  body_angle: body,
  symmetry_score: symmetry,
  landmark_visibility: visibility,
  knee_asymmetry: kneeAsymmetry,
  hip_asymmetry: 1.5,
});

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Replays the shipped Camerafeed coaching path for a squat session.
 *
 * @param {object}   opts
 * @param {Array}    opts.frames     feature vectors, one per camera frame
 * @param {Function} [opts.model]    (features) => label | throws (network down)
 * @param {number}   [opts.predictEveryMs] ML cadence, mirrors PREDICT_INTERVAL_MS
 */
function runSquatSession({ frames, model = null, predictEveryMs = 600 }) {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });
  const summary = createSquatRepSummary();
  const gate = createCoachingGate();
  const cueGate = createVoiceCueGate();

  let now = 1000;
  let reps = 0;
  let lastPredictionAt = -Infinity;
  let pendingRep = null;
  let trackerResult = tracker.update(null, now);

  const spoken = [];
  const voiceRequests = [];

  for (const features of frames) {
    now += FRAME_MS;
    const trackerResult = tracker.update(features, now);
    reps = trackerResult.reps;

    // Frame-driven: remember the deepest frame, judge the rep when it ends.
    const completed = summary.observe(features, trackerResult);
    if (completed) pendingRep = completed;

    if (now - lastPredictionAt <= predictEveryMs) continue;
    lastPredictionAt = now;

    let mlLabel = null;
    if (model) {
      try {
        mlLabel = model(features);
      } catch {
        mlLabel = null; // ML API failure
      }
    }

    const rep = pendingRep;
    pendingRep = null;

    const assessment = rep && rep.features
      ? assessSquatForm({
          features: rep.features,
          deepestKneeAngle: rep.deepestAngle,
          phase: trackerResult.phase,
        })
      : null;

    if (assessment && assessment.label) gate.consider(assessment.label);

    const resolution = resolveFormCoaching({
      assessment: assessment ?? { label: null, reason: "no_completed_rep" },
      mlLabel,
      features: rep?.features ?? features,
      exercise: "squat",
    });

    if (!resolution.message) continue;
    spoken.push({
      at: now,
      label: resolution.label,
      message: resolution.message,
      source: resolution.source,
      reason: resolution.reason,
      mlSupported: resolution.mlSupported,
    });

    if (cueGate.consider(resolution.message).accepted) {
      voiceRequests.push({ at: now, text: resolution.message });
    }
  }

  return { spoken, voiceRequests, reps, phase: trackerResult.phase };
}

/** One frame value repeated n times. */
const hold = (n, features) => Array.from({ length: n }, () => features);

/** A smooth descent then ascent between two knee angles. */
function rep(
  bottomKnee,
  { frames = 60, body = 166, kneeAsymmetry = 2, symmetry = 0.96, visibility = 0.95 } = {}
) {
  return Array.from({ length: frames }, (_, i) => {
    const t = i / (frames - 1);
    const knee = t < 0.5 ? lerp(175, bottomKnee, t * 2) : lerp(bottomKnee, 175, (t - 0.5) * 2);
    return squatFeatures({ knee, hip: knee - 2, body, kneeAsymmetry, symmetry, visibility });
  });
}

// ---------------------------------------------------------------- support ---

test("a standing squat pose is outside the model's training support", () => {
  const standing = squatFeatures({ knee: 175, hip: 173, body: 174 });
  const support = isWithinModelSupport(standing, "squat");

  assert.equal(support.supported, false);
  assert.ok(
    support.outside.some((entry) => entry.startsWith("knee_angle")),
    `expected knee_angle outside support, got ${JSON.stringify(support.outside)}`
  );
});

test("a pose at the bottom of a squat is inside the training support", () => {
  const deep = squatFeatures({ knee: 95, hip: 92, body: 165 });
  assert.equal(isWithinModelSupport(deep, "squat").supported, true);
});

test("the support envelope matches the shipped training CSV exactly", () => {
  // Boundaries read directly from the training data.
  assert.equal(isWithinModelSupport(squatFeatures({ knee: 64.2, hip: 60, body: 160 }), "squat").supported, true);
  assert.equal(isWithinModelSupport(squatFeatures({ knee: 138.2, hip: 120, body: 170 }), "squat").supported, true);
  assert.equal(isWithinModelSupport(squatFeatures({ knee: 138.3, hip: 120, body: 170 }), "squat").supported, false);
});

// ------------------------------------------------------------- scenarios ---

test("SCENARIO 1: standing at rest produces no depth warning at all", () => {
  const session = runSquatSession({
    frames: hold(60, squatFeatures({ knee: 175, hip: 173, body: 174 })),
  });

  assert.deepEqual(session.spoken, [], "a standing user must be told nothing about depth");
  assert.equal(session.reps, 0);
});

test("SCENARIO 2: descending produces no premature depth warning", () => {
  // The descent itself must stay silent until the user is actually at depth.
  const descending = Array.from({ length: 30 }, (_, i) =>
    squatFeatures({ knee: lerp(175, 100, i / 29), hip: lerp(173, 98, i / 29), body: 166 })
  );
  const session = runSquatSession({ frames: descending });

  assert.deepEqual(
    session.spoken.filter((event) => event.label === "shallow"),
    [],
    "no 'go lower' while still descending"
  );
});

test("SCENARIO 3: a comfortable, deep squat is praised, never told to go lower", () => {
  const session = runSquatSession({ frames: rep(95) });

  assert.ok(session.spoken.length > 0, "a deep squat must produce feedback");
  assert.deepEqual(
    session.spoken.filter((event) => event.label === "shallow"),
    [],
    "a comfortable squat must never be called shallow"
  );
  assert.ok(
    session.spoken.some((event) => event.label === "correct"),
    "a comfortable squat should be praised"
  );
});

test("SCENARIO 4: a deliberately shallow squat does get the depth cue", () => {
  // The user bottoms out at 135 deg: clearly above comfortable depth.
  const session = runSquatSession({ frames: rep(135) });

  const shallow = session.spoken.filter((event) => event.label === "shallow");
  assert.ok(shallow.length > 0, "a genuinely shallow squat must be coached");
  assert.equal(
    shallow[0].message,
    "Lower into a comfortable squat depth."
  );
});

test("SCENARIO 5: forward lean maps to the upright-chest message", () => {
  const leaning = rep(90, { body: 125 });
  const session = runSquatSession({ frames: leaning });

  const lean = session.spoken.filter((event) => event.label === "forward_lean");
  assert.ok(lean.length > 0, "a pronounced lean must be detected");
  assert.equal(lean[0].message, "Keep your chest more upright.");
});

test("SCENARIO 6: knees caving maps to the knees message", () => {
  // Real collapse: 22 deg of measured knee asymmetry with low symmetry.
  const caving = rep(95, { kneeAsymmetry: 22, symmetry: 0.7 });
  const session = runSquatSession({ frames: caving });

  const cues = session.spoken.filter((event) => event.label === "knees_caving");
  assert.ok(cues.length > 0, "real knee collapse must be detected");
  assert.equal(cues[0].message, "Keep your knees aligned with your toes.");
});

test("SCENARIO 7: mild natural asymmetry alone does NOT trigger knees caving", () => {
  // 6 deg asymmetry is normal; symmetry 0.93 is well inside healthy range.
  const mild = rep(95, { kneeAsymmetry: 6, symmetry: 0.93 });
  const session = runSquatSession({ frames: mild });

  assert.deepEqual(
    session.spoken.filter((event) => event.label === "knees_caving"),
    [],
    "mild asymmetry must not be reported as knee collapse"
  );
});

test("SCENARIO 8: occluded landmarks do not produce a knees-caving claim", () => {
  // Asymmetry is large but the joints are barely visible.
  const occluded = rep(95, { kneeAsymmetry: 24, symmetry: 0.7, visibility: 0.35 });
  const session = runSquatSession({ frames: occluded });

  assert.deepEqual(
    session.spoken.filter((event) => event.label === "knees_caving"),
    [],
    "unreliable landmarks must not create a false certainty"
  );
});

test("SCENARIO 9: returning to standing stops all form coaching", () => {
  const repFrames = rep(95);
  const session = runSquatSession({
    frames: [...repFrames, ...hold(120, squatFeatures({ knee: 175, hip: 173, body: 174 }))],
  });

  // One rep was performed, so at most one verdict may ever be spoken.
  assert.ok(session.spoken.length <= 1, `expected <=1 cue, got ${session.spoken.length}`);

  // Standing begins at the end of the rep; allow one prediction interval for an
  // in-flight verdict, then the coach must be completely silent.
  const standingFrom = 1000 + repFrames.length * FRAME_MS;
  const afterStanding = session.spoken.filter(
    (event) => event.at > standingFrom + 600
  );
  assert.deepEqual(afterStanding, [], "coaching must stop once upright again");
  assert.equal(session.phase, PHASE.UP);
});

test("SCENARIO 10: an interrupted partial rep still coaches sensibly", () => {
  // Descends to 140 and comes back up without reaching depth.
  const partial = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    const knee = t < 0.5 ? lerp(175, 140, t * 2) : lerp(140, 175, (t - 0.5) * 2);
    return squatFeatures({ knee, hip: knee - 2, body: 166 });
  });
  const session = runSquatSession({ frames: partial });

  assert.deepEqual(
    session.spoken.filter((event) => event.label === "shallow"),
    [],
    "140 deg never descends, so no depth claim is allowed"
  );
  assert.equal(session.reps, 0, "a partial rep must not be counted");
});

// ------------------------------------------------- model trust behaviour ---

test("a model label from outside its support never overrides the movement", () => {
  // This is literally what the live model returns for a standing pose.
  const liveModel = () => "shallow";

  const session = runSquatSession({
    frames: hold(60, squatFeatures({ knee: 175, hip: 173, body: 174 })),
    model: liveModel,
  });

  assert.deepEqual(
    session.spoken,
    [],
    "the model fabricating 'shallow' while standing must not reach the user"
  );
});

test("a model label that disagrees with the movement never overrides it", () => {
  const liveModel = () => "correct"; // wrong: the user stalled at 135 deg
  const session = runSquatSession({ frames: rep(135), model: liveModel });

  const shallow = session.spoken.filter((event) => event.label === "shallow");
  assert.ok(shallow.length > 0, "validated geometry wins over the model");
  assert.equal(shallow[0].source, "geometry");
  assert.equal(shallow[0].reason, "model_disagrees_with_movement");
});

test("an out-of-support frame is never credited to the model", () => {
  // Realistic: a deep squat on a slightly distant, soft camera frame. The
  // extractor clamps landmark_visibility to >= 0.70, but the model was trained
  // only on 0.774-1.00, so this frame sits outside its support.
  const softFrame = squatFeatures({ knee: 95, hip: 93, body: 165, visibility: 0.72 });
  const support = isWithinModelSupport(softFrame, "squat");
  assert.equal(support.supported, false);
  assert.ok(support.outside.some((entry) => entry.startsWith("landmark_visibility")));

  const session = runSquatSession({
    frames: rep(95, { visibility: 0.72 }),
    model: () => "correct",
  });

  assert.ok(session.spoken.length > 0, "the user is still coached");
  assert.ok(
    session.spoken.every((event) => event.source === "geometry"),
    "an out-of-support frame can never be credited to the model"
  );
  assert.equal(session.spoken[0].mlSupported, false);
});

test("an in-support model label that agrees is credited to the model", () => {
  const agreeing = () => "correct";
  const session = runSquatSession({ frames: rep(95), model: agreeing });

  const correct = session.spoken.filter((event) => event.label === "correct");
  assert.ok(correct.length > 0);
  assert.equal(correct[0].source, "model_corroborated");
});

test("an API failure never masquerades as a form fault", () => {
  const failing = () => {
    throw new Error("ML service unavailable");
  };

  const standing = runSquatSession({
    frames: hold(40, squatFeatures({ knee: 175, hip: 173, body: 174 })),
    model: failing,
  });
  assert.deepEqual(standing.spoken, [], "no coaching invented while standing");

  const deep = runSquatSession({ frames: rep(95), model: failing });
  assert.ok(deep.spoken.length > 0, "coaching keeps working without the ML service");
  assert.ok(
    deep.spoken.every((event) => event.source === "geometry"),
    "geometry is the declared source when the model is unavailable"
  );
});

test("a cross-exercise label cannot reach the user as squat feedback", () => {
  const crossExercise = () => "pushup_body_sag";
  const session = runSquatSession({ frames: rep(95), model: crossExercise });

  for (const event of session.spoken) {
    assert.notEqual(event.label, "pushup_body_sag");
    assert.ok(
      ["correct", "shallow", "forward_lean", "knees_caving"].includes(event.label),
      `unexpected label reached the user: ${event.label}`
    );
  }
});

test("a changing movement produces changing feedback", () => {
  const session = runSquatSession({
    frames: [
      ...rep(135), // shallow
      ...rep(90, { body: 128 }), // forward lean
      ...rep(95, { kneeAsymmetry: 22, symmetry: 0.7 }), // knees caving
      ...rep(95), // correct
    ],
  });

  const labels = [...new Set(session.spoken.map((event) => event.label))];
  assert.ok(labels.length >= 3, `expected varied feedback, saw ${labels.join(",")}`);
  for (const label of labels) {
    assert.ok(
      ["correct", "shallow", "forward_lean", "knees_caving"].includes(label),
      `unexpected label ${label}`
    );
  }
});

test("repeated identical predictions do not spam the voice", () => {
  // 20 seconds of one sustained, genuinely shallow squat.
  const frames = [...rep(135, { frames: 40 }), ...hold(420, squatFeatures({ knee: 135, hip: 133, body: 166 }))];
  const session = runSquatSession({ frames, model: () => "shallow" });

  const shallowRequests = session.voiceRequests.filter((request) =>
    request.text.includes("Lower into a comfortable")
  );
  assert.equal(
    shallowRequests.length,
    1,
    `the same warning spoke ${shallowRequests.length} times in one hold`
  );
});

test("a changing movement always updates what the user is shown", () => {
  // Rapid reps: the audio min-gap may swallow a cue, but the HUD message must
  // never lag behind the movement. Every verdict reaches the user.
  const session = runSquatSession({
    frames: [...rep(135), ...rep(90, { body: 128 }), ...rep(95)],
  });

  const shown = session.spoken.map((event) => event.message);
  assert.ok(
    shown.some((text) => text.includes("comfortable squat depth")),
    "the depth cue must be shown"
  );
  assert.ok(
    shown.some((text) => text.includes("chest more upright")),
    "the lean cue must be shown"
  );
  assert.ok(shown.some((text) => text.includes("Good squat")), "praise must be shown");

  // Voice is additionally rate-limited, but never repeats itself.
  const spokenTexts = session.voiceRequests.map((request) => request.text);
  assert.equal(
    new Set(spokenTexts).size,
    spokenTexts.length,
    "the same sentence is never voiced twice"
  );
});

// ------------------------------------------------ rep counting integrity ---

test("rep counting is unaffected by the coaching changes", () => {
  const session = runSquatSession({ frames: [...rep(95), ...rep(95), ...rep(95)] });
  assert.equal(session.reps, 3, "three complete reps must still count");
});

test("a partial or interrupted rep is never counted", () => {
  const partial = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    const knee = t < 0.5 ? lerp(175, 120, t * 2) : lerp(120, 175, (t - 0.5) * 2);
    return squatFeatures({ knee, hip: knee - 2, body: 166 });
  });
  assert.equal(runSquatSession({ frames: partial }).reps, 0);
});

// ------------------------------------------------- assessment unit rules ---

test("the depth gate is anchored to the rep tracker's own descent threshold", () => {
  // Standing at exactly the tracker's descent threshold: not descended.
  const standing = assessSquatForm({
    features: squatFeatures({ knee: 175, hip: 173, body: 174 }),
    deepestKneeAngle: REP_TOP_ANGLE + 5,
  });
  assert.equal(standing.label, null);
  assert.equal(standing.reason, "no_descent");
});

test("comfortable depth is praised and only stalled descents are shallow", () => {
  const comfortable = assessSquatForm({
    features: squatFeatures({ knee: 100, body: 166 }),
    deepestKneeAngle: 95,
  });
  assert.equal(comfortable.label, "correct");

  const stalled = assessSquatForm({
    features: squatFeatures({ knee: 130, body: 166 }),
    deepestKneeAngle: 130,
  });
  assert.equal(stalled.label, "shallow");
  assert.equal(stalled.reason, "descent_stalled_above_depth");
});

test("lean and caving take priority over depth when both are present", () => {
  const both = assessSquatForm({
    features: squatFeatures({ knee: 100, body: FORWARD_LEAN_BODY_ANGLE - 5, kneeAsymmetry: 25, symmetry: 0.6 }),
    deepestKneeAngle: 100,
  });
  assert.equal(both.label, "knees_caving", "knee collapse outranks lean");

  const leanOnly = assessSquatForm({
    features: squatFeatures({ knee: 100, body: FORWARD_LEAN_BODY_ANGLE - 5 }),
    deepestKneeAngle: 100,
  });
  assert.equal(leanOnly.label, "forward_lean");
});

test("the assessment returns no label without usable features", () => {
  assert.equal(assessSquatForm({ features: null }).reason, "no_features");
  assert.equal(assessSquatForm({}).reason, "no_features");
});

// -------------------------------------------- push-up / plank untouched ---

test("push-up and plank arbitration is unchanged", () => {
  const pushup = arbitrateCoaching({
    label: "pushup_body_sag",
    phase: PHASE.DOWN,
    reliable: true,
    exercise: "pushup",
  });
  const pushupCue = resolveCoachingCue({ decision: pushup, exercise: "pushup" });
  assert.equal(pushupCue.label, "pushup_body_sag");
  assert.equal(pushupCue.message, "Keep your body straight.");

  const plank = arbitrateCoaching({
    label: "plank_hips_high",
    phase: PHASE.DOWN,
    reliable: true,
    exercise: "plank",
  });
  assert.equal(
    resolveCoachingCue({ decision: plank, exercise: "plank" }).message,
    "Lower your hips slightly."
  );
});

test("the squat assessment is never applied to another exercise", () => {
  const pushupFeatures = squatFeatures({ knee: 95 });
  pushupFeatures.exercise = "pushup";

  const session = runSquatSession({ frames: hold(30, pushupFeatures) });
  // Camerafeed only calls assessSquatForm for squats; resolveFormCoaching with
  // a null assessment yields no label rather than a squat claim.
  const resolution = resolveFormCoaching({
    assessment: null,
    mlLabel: "pushup_correct",
    features: pushupFeatures,
    exercise: "pushup",
  });
  assert.equal(resolution.label, null);
  assert.equal(session.spoken.length, 0);
});

// ------------------------------------------------------------- messages ---

test("every squat outcome has the required copy", () => {
  const expected = {
    correct: "Good squat. Keep going.",
    shallow: "Lower into a comfortable squat depth.",
    forward_lean: "Keep your chest more upright.",
    knees_caving: "Keep your knees aligned with your toes.",
  };
  for (const [label, message] of Object.entries(expected)) {
    assert.equal(getFeedbackForPrediction(label), message, label);
  }
  assert.ok(
    getFeedbackForPrediction(POSE_UNRELIABLE).toLowerCase().includes("see you"),
    "the camera warning is still available and distinct"
  );
});