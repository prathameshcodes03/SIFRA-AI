import test from "node:test";
import assert from "node:assert/strict";

import { createFormCueGate, isFormFault } from "../src/exercises/formCueGate.js";
import { createLatestOnlyGuard } from "../src/utils/latestOnly.js";
import { createVoiceCueGate } from "../src/hooks/voiceCueGate.js";
import { isLabelForExercise, resolveCoachingCue, arbitrateCoaching } from "../src/exercises/coaching.js";
import { evaluateFormRuleBased, extractExerciseFeatures } from "../src/exercises/featureExtractor.js";
import { isWithinModelSupport } from "../src/exercises/modelSupport.js";
import { createRepTracker, PHASE } from "../src/exercises/repTracker.js";
import { POSE_LANDMARKS as P } from "../src/mediapipe/poseLandmarks.js";

/**
 * SYNTHETIC TESTS. Deterministic feature vectors and a generated landmark
 * skeleton. No webcam, no network, no ElevenLabs. They prove DECISION LOGIC,
 * not real-camera accuracy.
 */

const FRAME_MS = 33;

/**
 * Drives the push-up/plank coaching path exactly as Camerafeed does:
 * trusted-label selection -> arbitration -> cue resolution -> form cue gate.
 */
function runCoaching({
  exercise,
  frames,
  modelLabel = null,          // what the ML service returns, or null
  modelOnline = true,
  tracker = createRepTracker({ exercise, requiredSets: 3, requiredReps: 10 }),
  voiceGate = createVoiceCueGate(),
  cueGate = createFormCueGate(),
}) {
  const messages = [];
  const voiceRequests = [];
  const heldLabels = [];

  let now = 1000;
  let last = null;
  let apiFailed = false;
  let support = null;

  for (const frame of frames) {
    now += FRAME_MS;
    const features = frame.features ?? frame;

    if (tracker) last = tracker.update(features, now);

    // --- ML response -------------------------------------------------------
    let label = null;
    if (modelOnline) {
      label = modelLabel;
    } else {
      apiFailed = true;
    }

    // --- label selection (mirrors Camerafeed) ------------------------------
    support = isWithinModelSupport(features, exercise);
    const effectiveLabel = label || evaluateFormRuleBased(features);

    // --- arbitration -> cue -> state gate ----------------------------------
    const decision = arbitrateCoaching({
      label: effectiveLabel,
      phase: last ? last.phase : PHASE.UP,
      reliable: true,
      exercise,
    });
    const cue = resolveCoachingCue({ decision, exercise });
    const verdict = cueGate.consider(cue ? cue.label : null, exercise, {
      observable: Boolean(cue),
    });

    if (verdict.announce && cue) {
      messages.push({ at: now, label: cue.label, message: cue.message });
      heldLabels.push(cue.label);
      if (voiceGate.consider(cue.message).accepted) {
        voiceRequests.push({ at: now, text: cue.message });
      }
    }
  }

  return { messages, voiceRequests, heldLabels, last, apiFailed, support };
}

const pushupFeatures = (overrides = {}) => ({
  exercise: "pushup",
  knee_angle: 92.27,
  elbow_angle: 175,
  hip_angle: 172,
  body_angle: 172,
  symmetry_score: 0.93,
  landmark_visibility: 0.97,
  measured: { knee: true, elbow: true, hip: true, body: true },
  ...overrides,
});

const plankFeatures = (overrides = {}) => ({
  exercise: "plank",
  knee_angle: 92.27,
  elbow_angle: 90.2,
  hip_angle: 175,
  body_angle: 175,
  symmetry_score: 0.94,
  landmark_visibility: 0.98,
  measured: { knee: true, elbow: true, hip: true, body: true },
  ...overrides,
});

const hold = (n, features) => Array.from({ length: n }, () => features);

// =============================================================== PUSH-UP ====

test("PUSH-UP 1: correct form is announced once, not repeatedly", () => {
  const { messages, voiceRequests } = runCoaching({
    exercise: "pushup",
    frames: hold(60, pushupFeatures()), // 20s of good form
  });

  assert.equal(messages.length, 1, `expected one cue, got ${messages.length}`);
  assert.equal(messages[0].label, "pushup_correct");
  assert.equal(voiceRequests.length, 1);
});

test("PUSH-UP 2: excessive elbow flare maps to the flare message", () => {
  // Geometry: an elbow inside the trained flare band (81.5-133.2 deg).
  const flared = pushupFeatures({ elbow_angle: 120 });
  const { messages } = runCoaching({ exercise: "pushup", frames: hold(30, flared) });
  assert.equal(messages.at(-1).label, "pushup_elbow_flare");
  assert.equal(messages.at(-1).message, "Keep your elbows closer to your body.");
  assert.equal(messages.length, 1, "a sustained flare speaks once");
});

test("PUSH-UP 2b: a locked-out arm is NOT reported as an elbow flare", () => {
  // ~175deg is outside every trained push-up class, so it carries no flare
  // information. The previous unbounded rule called this a flare.
  const lockedOut = pushupFeatures({ elbow_angle: 175 });
  const { messages } = runCoaching({ exercise: "pushup", frames: hold(20, lockedOut) });
  assert.equal(messages.at(-1).label, "pushup_correct");
});

test("PUSH-UP 3: sagging hips map to the straight-body message", () => {
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: hold(30, pushupFeatures({ hip_angle: 150, body_angle: 150 })),
  });
  assert.equal(messages.at(-1).label, "pushup_body_sag");
  assert.equal(messages.at(-1).message, "Keep your body straight.");
});

test("PUSH-UP 4: hips too high map to the hips message", () => {
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: hold(30, pushupFeatures({ hip_angle: 158, body_angle: 165 })),
  });
  assert.equal(messages.at(-1).label, "pushup_hips_high");
  assert.equal(messages.at(-1).message, "Bring your hips down into a straight line.");
});

test("PUSH-UP 5: a transition from incorrect to correct form is announced", () => {
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: [
      ...hold(20, pushupFeatures({ hip_angle: 150, body_angle: 150 })), // sagging
      ...hold(20, pushupFeatures()),                                    // fixed
    ],
  });

  assert.deepEqual(
    messages.map((m) => m.label),
    ["pushup_body_sag", "pushup_correct"],
    "each real transition is announced"
  );
});

test("PUSH-UP 6: a fault persisting for several seconds speaks once", () => {
  const { messages, voiceRequests } = runCoaching({
    exercise: "pushup",
    frames: hold(300, pushupFeatures({ hip_angle: 150, body_angle: 150 })), // 10s
  });

  assert.equal(messages.length, 1, `10s of one fault produced ${messages.length} cues`);
  assert.equal(voiceRequests.length, 1, "and spoke it once");
});

test("PUSH-UP 7: a fault that disappears and returns is announced again", () => {
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: [
      ...hold(20, pushupFeatures({ hip_angle: 150, body_angle: 150 })), // sag
      ...hold(20, pushupFeatures()),                                    // recover
      ...hold(20, pushupFeatures({ hip_angle: 150, body_angle: 150 })), // sag again
    ],
  });

  assert.deepEqual(
    messages.map((m) => m.label),
    ["pushup_body_sag", "pushup_correct", "pushup_body_sag"],
    "recovery then recurrence must be heard"
  );
});

test("PUSH-UP 8: temporary tracking loss produces no coaching", () => {
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: [
      ...hold(20, pushupFeatures({ hip_angle: 150, body_angle: 150 })),
      ...hold(10, { exercise: "pushup", elbow_angle: null, measured: { elbow: false } }),
      ...hold(20, pushupFeatures({ hip_angle: 150, body_angle: 150 })),
    ],
  });

  assert.equal(messages.length, 1, "lost tracking must not re-announce the same fault");
  assert.equal(messages[0].label, "pushup_body_sag");
});

test("PUSH-UP 9: an API failure still coaches from geometry and speaks once", () => {
  const { messages, apiFailed } = runCoaching({
    exercise: "pushup",
    frames: hold(120, pushupFeatures({ hip_angle: 150, body_angle: 150 })),
    modelOnline: false,
  });

  assert.equal(apiFailed, true);
  assert.equal(messages.length, 1, "geometry coaching is deduplicated too");
  assert.equal(messages[0].label, "pushup_body_sag");
});

test("PUSH-UP 10: a completed repetition does not restart the coaching cycle", () => {
  const frames = [];
  for (let c = 0; c < 5; c += 1) {
    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      const elbow = t < 0.5 ? 175 - t * 180 : 85 + (t - 0.5) * 180;
      frames.push(pushupFeatures({ elbow_angle: Math.round(elbow) }));
    }
  }

  // Model online and agreeing on correct form: repetitions must not speak.
  const stable = runCoaching({
    exercise: "pushup",
    frames,
    modelLabel: "pushup_correct",
  });
  assert.equal(stable.last.reps, 5, "five push-ups were counted");
  assert.equal(stable.messages.length, 1, `reps must not cue each: got ${stable.messages.length}`);
});

test("PUSH-UP: the 600ms cadence no longer produces a cue per prediction", () => {
  // 100 predictions over 60s of unchanged, correct form.
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: hold(100, pushupFeatures()),
  });
  assert.equal(messages.length, 1, "100 predictions, 1 cue");
});

// ================================================================= PLANK ====

test("PLANK 1: a correct stable hold is announced once", () => {
  const { messages } = runCoaching({ exercise: "plank", frames: hold(200, plankFeatures()) });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].label, "plank_correct");
});

test("PLANK 2: hips too high map to the lower-hips message", () => {
  const { messages } = runCoaching({
    exercise: "plank",
    frames: hold(30, plankFeatures({ hip_angle: 158 })),
  });
  assert.equal(messages.at(-1).label, "plank_hips_high");
  assert.equal(messages.at(-1).message, "Lower your hips slightly.");
});

test("PLANK 3: hips too low map to the raise-hips message", () => {
  const { messages } = runCoaching({
    exercise: "plank",
    frames: hold(30, plankFeatures({ hip_angle: 150, body_angle: 150 })),
  });
  assert.equal(messages.at(-1).label, "plank_hips_low");
  assert.equal(messages.at(-1).message, "Raise your hips slightly.");
});

test("PLANK 4: correcting a posture fault is announced", () => {
  const { messages } = runCoaching({
    exercise: "plank",
    frames: [...hold(20, plankFeatures({ hip_angle: 158 })), ...hold(20, plankFeatures())],
  });
  assert.deepEqual(messages.map((m) => m.label), ["plank_hips_high", "plank_correct"]);
});

test("PLANK 5: a persistent fault speaks once, not repeatedly", () => {
  const { messages, voiceRequests } = runCoaching({
    exercise: "plank",
    frames: hold(400, plankFeatures({ hip_angle: 158 })), // ~13s
  });
  assert.equal(messages.length, 1, `got ${messages.length} cues`);
  assert.equal(voiceRequests.length, 1);
});

test("PLANK 6: a fault that returns after recovery is announced again", () => {
  const { messages } = runCoaching({
    exercise: "plank",
    frames: [
      ...hold(20, plankFeatures({ hip_angle: 158 })),
      ...hold(20, plankFeatures()),
      ...hold(20, plankFeatures({ hip_angle: 158 })),
    ],
  });
  assert.deepEqual(messages.map((m) => m.label), ["plank_hips_high", "plank_correct", "plank_hips_high"]);
});

test("PLANK 7: brief visibility fluctuations do not re-announce anything", () => {
  const { messages } = runCoaching({
    exercise: "plank",
    frames: (() => {
      const frames = [];
      for (let i = 0; i < 60; i += 1) {
        frames.push(i % 5 === 0 ? plankFeatures({ hip_angle: 158, landmark_visibility: 0.3 }) : plankFeatures({ hip_angle: 158 }));
      }
      return frames;
    })(),
  });

  assert.equal(messages.length, 1, "a flickering pose must not restart the gate");
});

test("PLANK 8: prolonged tracking loss yields no coaching", () => {
  const lost = {
    exercise: "plank",
    hip_angle: 0,
    body_angle: 0,
    symmetry_score: 0,
    landmark_visibility: 0,
    measured: { knee: false, elbow: false, hip: false, body: false },
  };
  const { messages } = runCoaching({
    exercise: "plank",
    frames: [...hold(20, plankFeatures({ hip_angle: 158 })), ...hold(60, lost), ...hold(20, plankFeatures({ hip_angle: 158 }))],
  });
  assert.equal(messages.length, 1);
});

test("PLANK 9: holding with no fault at all says nothing after the first cue", () => {
  const { messages } = runCoaching({ exercise: "plank", frames: hold(900, plankFeatures()) });
  assert.equal(messages.length, 1, "a 30s fault-free hold produces one cue");
});

test("PLANK 10: restarting the hold does not replay the old cue", () => {
  const cueGate = createFormCueGate();
  const first = runCoaching({ exercise: "plank", frames: hold(20, plankFeatures({ hip_angle: 158 })), cueGate });
  assert.equal(first.messages.length, 1);

  cueGate.reset(); // "Ending and restarting the hold"

  const second = runCoaching({ exercise: "plank", frames: hold(20, plankFeatures({ hip_angle: 158 })), cueGate });
  assert.equal(second.messages.length, 1, "after a reset the state may speak again");

  const third = runCoaching({ exercise: "plank", frames: hold(20, plankFeatures({ hip_angle: 158 })), cueGate });
  assert.equal(third.messages.length, 0, "but not repeatedly within one hold");
});

// ======================================================== GATE UNIT TESTS ===

test("a single-frame label flicker is never announced", () => {
  const gate = createFormCueGate();
  gate.consider("pushup_body_sag", "pushup");
  const flicker = gate.consider("pushup_correct", "pushup"); // one tick only
  assert.equal(flicker.announce, false);
  assert.equal(flicker.reason, "unconfirmed");
});

test("the gate distinguishes faults from correct form", () => {
  assert.equal(isFormFault("pushup_body_sag", "pushup"), true);
  assert.equal(isFormFault("pushup_correct", "pushup"), false);
  assert.equal(isFormFault("plank_hips_low", "plank"), true);
  assert.equal(isFormFault("plank_correct", "plank"), false);
  assert.equal(isFormFault(null, "squat"), false);
});

test("the gate has no timers, so it cannot conflict with the voice gate", () => {
  // Same input, different wall-clock times: identical decisions.
  const a = createFormCueGate();
  const b = createFormCueGate();
  const feed = (gate) =>
    [0, 10_000, 20_000, 60_000, 120_000].map(() =>
      gate.consider("pushup_body_sag", "pushup").announce
    );
  assert.deepEqual(feed(a), feed(b));
});

// ================================================= STALE PREDICTION GUARD ===

test("a stale asynchronous response cannot overwrite a newer decision", async () => {
  const guard = createLatestOnlyGuard();

  // Three requests dispatched in order; they resolve OUT of order.
  const first = guard.issue();
  const second = guard.issue();
  const third = guard.issue();

  assert.equal(guard.isCurrent(third), true, "newest is current");
  assert.equal(guard.isCurrent(second), false, "middle is superseded");
  assert.equal(guard.isCurrent(first), false, "oldest is superseded");
});

test("invalidate drops every outstanding response", () => {
  const guard = createLatestOnlyGuard();
  const token = guard.issue();
  assert.equal(guard.isCurrent(token), true);

  guard.invalidate(); // unmount / exercise change
  assert.equal(guard.isCurrent(token), false, "a late response is discarded");
});

test("out-of-order resolution in a real async race keeps only the newest", async () => {
  const guard = createLatestOnlyGuard();
  const applied = [];

  const request = (label, delayMs) =>
    new Promise((resolve) =>
      setTimeout(() => {
        const token = guard.issue();
        resolve({ label, apply: () => guard.isCurrent(token) });
      }, delayMs)
    );

  const slow = await request("stale-pose", 10);
  const fast = await request("fresh-pose", 1);

  if (slow.apply()) applied.push(slow.label);
  if (fast.apply()) applied.push(fast.label);

  assert.deepEqual(applied, ["fresh-pose"], "only the newest result is applied");
});

// ================================================ MODEL TRUST / ACCURACY ====

test("push-up coaching uses the model label when the service answers", () => {
  // Push-up/plank keep their existing arbitration path: the model label wins
  // when present, the rule-based fallback fills in when it is not.
  const sagging = pushupFeatures({ hip_angle: 150, body_angle: 150 });
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: hold(20, sagging),
    modelLabel: "pushup_correct",
  });
  assert.equal(messages.at(-1).label, "pushup_correct");
});

test("an in-support agreeing model label is trusted", () => {
  // Elbow 120 sits inside the trained range [59.49, 133.21].
  const inSupport = pushupFeatures({ elbow_angle: 120 });
  assert.equal(isWithinModelSupport(inSupport, "pushup").supported, true);

  const { messages } = runCoaching({
    exercise: "pushup",
    frames: hold(20, inSupport),
    modelLabel: "pushup_correct",
  });
  assert.equal(messages.at(-1).label, "pushup_correct");
});

test("a cross-exercise label never reaches the user as push-up feedback", () => {
  const { messages } = runCoaching({
    exercise: "pushup",
    frames: hold(20, pushupFeatures()),
    modelLabel: "knees_caving", // squat label during a push-up
  });
  for (const message of messages) {
    assert.notEqual(message.label, "knees_caving");
  }
});

test("cross-exercise labels are excluded from the accuracy denominator", () => {
  const foreign = "knees_caving";

  assert.equal(isLabelForExercise(foreign, "pushup"), false);
  assert.equal(isLabelForExercise("pushup_correct", "pushup"), true);

  // Mirrors the Camerafeed counter condition.
  let total = 0;
  let correctCount = 0;
  for (const label of ["pushup_correct", foreign, "pushup_body_sag", "plank_hips_low"]) {
    if (isLabelForExercise(label, "pushup")) {
      total += 1;
      if (label === "pushup_correct") correctCount += 1;
    }
  }
  assert.equal(total, 2, "only this exercise's two labels are counted");
  assert.equal(correctCount, 1);
});

// ================================================ LANDMARK MEASUREMENT ====

/** A real, non-degenerate plank skeleton; `visibility` may be omitted. */
const plankLandmarks = (visibility) => {
  const lms = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.9, z: 0 }));
  const put = (i, x, y) => {
    lms[i] = visibility === undefined ? { x, y, z: 0 } : { x, y, z: 0, visibility };
  };
  put(P.LEFT_SHOULDER, 0.2, 0.2);
  put(P.LEFT_HIP, 0.5, 0.2);
  put(P.LEFT_KNEE, 0.8, 0.2);
  put(P.LEFT_ANKLE, 1.1, 0.2);
  for (const [src, dst] of [
    [P.LEFT_SHOULDER, P.RIGHT_SHOULDER],
    [P.LEFT_HIP, P.RIGHT_HIP],
    [P.LEFT_KNEE, P.RIGHT_KNEE],
    [P.LEFT_ANKLE, P.RIGHT_ANKLE],
  ]) {
    lms[dst] = { ...lms[src] };
  }
  return lms;
};

test("a missing visibility value is never treated as high confidence", () => {
  // Landmarks carry no `visibility` field at all: that must read as 0, not 0.9.
  const features = extractExerciseFeatures(plankLandmarks(), "plank");
  assert.equal(features.pose_visibility, 0, "absent visibility must not inflate");
  assert.ok(features.landmark_visibility >= 0.7, "the model payload stays clamped");
});

test("an explicitly invisible pose reports near-zero visibility", () => {
  const features = extractExerciseFeatures(plankLandmarks(0), "plank");
  assert.equal(features.pose_visibility, 0);
});

test("an angle is only accepted when its three landmarks exist", () => {
  const lms = plankLandmarks(0.9);
  // Removing only the ankles invalidates body_angle (shoulder-hip-ankle) but
  // leaves hip_angle (shoulder-hip-knee) measurable.
  lms[P.LEFT_ANKLE] = null;
  lms[P.RIGHT_ANKLE] = null;

  const features = extractExerciseFeatures(lms, "plank");
  assert.equal(features.measured.body, false, "body angle needs the ankle");
  assert.equal(features.measured.hip, true, "hip angle survives a missing ankle");

  // With the ankles AND knees gone nothing is measurable at all.
  const nothing = plankLandmarks(0.9);
  for (const index of [P.LEFT_ANKLE, P.RIGHT_ANKLE, P.LEFT_KNEE, P.RIGHT_KNEE]) {
    nothing[index] = null;
  }
  assert.equal(
    extractExerciseFeatures(nothing, "plank"),
    null,
    "an unmeasurable pose must not produce features"
  );
});