import test from "node:test";
import assert from "node:assert/strict";

import {
  createVisibilityWarningController,
  getVisibilityWarningMessage,
  isVisibilityFailureReason,
  VISIBILITY_FAILURE_REASONS,
  NON_VISIBILITY_FAILURE_REASONS,
  DEFAULT_WARNING_COOLDOWN_MS,
} from "../src/exercises/visibilityWarning.js";
import {
  arbitrateCoaching,
  resolveCoachingCue,
  createCoachingGate,
  POSE_UNRELIABLE,
} from "../src/exercises/coaching.js";
import { createVoiceCueGate } from "../src/hooks/voiceCueGate.js";
import { createRepTracker, PHASE } from "../src/exercises/repTracker.js";

/** 30fps camera, matching the shipped rAF loop. */
const FRAME_MS = 33;
const FPS = Math.round(1000 / FRAME_MS);

/** Controllable clock so cooldowns are asserted exactly, not waited for. */
const fakeClock = (start = 0) => {
  const state = { t: start };
  return {
    now: () => state.t,
    advance: (ms) => {
      state.t += ms;
    },
    /** Advance one camera frame. */
    frame: (count = 1) => {
      state.t += count * FRAME_MS;
    },
  };
};

const unreliable = (reason = VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY) => ({
  reliable: false,
  reason,
});

const reliableFrame = () => ({
  reliable: true,
  reason: VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY,
});

// ---------------------------------------------------------------- reasons ---

test("only camera-facing reasons are treated as a visibility failure", () => {
  for (const reason of Object.values(VISIBILITY_FAILURE_REASONS)) {
    assert.equal(isVisibilityFailureReason(reason), true, reason);
  }

  for (const reason of Object.values(NON_VISIBILITY_FAILURE_REASONS)) {
    assert.equal(isVisibilityFailureReason(reason), false, reason);
  }
});

test("every visibility reason has a concise repositioning instruction", () => {
  for (const reason of Object.values(VISIBILITY_FAILURE_REASONS)) {
    const message = getVisibilityWarningMessage(reason);
    assert.ok(typeof message === "string" && message.trim().length > 0, reason);
    assert.ok(message.length <= 120, `${reason} copy must stay concise`);
    assert.ok(
      /\b(frame|view|see)\b/i.test(message),
      `${reason} copy must tell the user where to be`
    );
  }
});

test("an unrecognised reason falls back to the known camera instruction", () => {
  assert.equal(
    getVisibilityWarningMessage("something_else"),
    getVisibilityWarningMessage(VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY)
  );
});

// ------------------------------------------------------------- cooldown ----

test("the first visibility warning appears immediately", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  const first = controller.update(unreliable());

  assert.equal(first.visible, true);
  assert.equal(first.isReminder, false);
  assert.equal(first.reason, VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY);
  assert.equal(
    first.message,
    getVisibilityWarningMessage(VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY)
  );
  assert.equal(controller.isActive(), true);
});

test("a single noisy frame never triggers a warning", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  assert.equal(controller.update(unreliable()).visible, false);
  assert.equal(controller.isActive(), false);

  // Recovery must also be debounced, so one good frame clears the candidate.
  assert.equal(controller.update(reliableFrame()).visible, false);
  clock.frame();
  assert.equal(controller.update(unreliable()).visible, false);
  clock.frame();
  assert.equal(controller.isActive(), false);
});

test("repeated unreliable frames do not create repeated warnings", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  let shown = 0;
  // Just under the cooldown, at 30fps: the transition must warn exactly once.
  for (let frame = 0; frame < Math.floor((DEFAULT_WARNING_COOLDOWN_MS - 500) / FRAME_MS); frame += 1) {
    clock.frame();
    if (controller.update(unreliable()).visible) shown += 1;
  }

  assert.equal(shown, 1, "only the transition may warn");
  assert.equal(controller.shownCount(), 1);
});

test("the warning is never displayed every 2 seconds", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  const timestamps = [];
  for (let frame = 0; frame < 60 * FPS; frame += 1) {
    clock.frame();
    if (controller.update(unreliable()).visible) timestamps.push(clock.now());
  }

  assert.ok(timestamps.length >= 1, "the warning must still appear");
  for (let i = 1; i < timestamps.length; i += 1) {
    const gap = timestamps[i] - timestamps[i - 1];
    assert.ok(
      gap >= DEFAULT_WARNING_COOLDOWN_MS,
      `warnings ${gap}ms apart must never be closer than the ${DEFAULT_WARNING_COOLDOWN_MS}ms cooldown`
    );
  }
});

test("a persistent problem gets one reminder only after the cooldown", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  const emitted = [];
  const run = (ms) => {
    for (let frame = 0; frame < Math.round(ms / FRAME_MS); frame += 1) {
      clock.frame();
      const result = controller.update(unreliable());
      if (result.visible) emitted.push({ at: clock.now(), result });
    }
  };

  run(DEFAULT_WARNING_COOLDOWN_MS - 1000);
  assert.equal(emitted.length, 1, "no reminder before the cooldown expires");

  // Cross the boundary.
  run(2000);
  assert.equal(emitted.length, 2, "exactly one reminder after the cooldown");
  assert.equal(emitted[1].result.isReminder, true);
  assert.ok(
    emitted[1].at - emitted[0].at >= DEFAULT_WARNING_COOLDOWN_MS,
    "the reminder must respect the full cooldown"
  );

  // Another 5 seconds of bad framing: still no third warning.
  run(5000);
  assert.equal(emitted.length, 2, "the cooldown is not reset by new frames");
});

test("recovery clears the active warning", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  assert.equal(controller.update(unreliable()).visible, true);
  assert.equal(controller.isActive(), true);

  clock.frame();
  assert.equal(controller.update(reliableFrame()).visible, false);
  assert.equal(controller.isActive(), false);
  assert.equal(controller.shownCount(), 1, "clearing does not re-arm the count");
});

test("a new problem after recovery warns again immediately", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  controller.update(unreliable());
  clock.frame();
  controller.update(reliableFrame());

  clock.frame();
  const again = controller.update(unreliable());

  assert.equal(again.visible, true, "the cooldown does not survive recovery");
  assert.equal(again.isReminder, false);
  assert.equal(controller.shownCount(), 2);
});

test("recovery needs the same debounce as the failure", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  for (let i = 0; i < 3; i += 1) {
    clock.frame();
    controller.update(unreliable());
  }
  assert.equal(controller.isActive(), true);

  // One good frame in a noisy stream must not clear an active warning.
  clock.frame();
  controller.update(reliableFrame());
  assert.equal(controller.isActive(), true);

  for (let i = 0; i < 3; i += 1) {
    clock.frame();
    controller.update(reliableFrame());
  }
  assert.equal(controller.isActive(), false);
});

test("reset drops an armed warning so a new session starts clean", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  controller.update(unreliable());
  assert.equal(controller.isActive(), true);

  controller.reset();
  assert.equal(controller.isActive(), false);
  assert.equal(controller.shownCount(), 0);

  clock.frame();
  assert.equal(controller.update(unreliable()).visible, true);
});

// --------------------------------------------------- failure attribution ---

test("cross-exercise labels never produce a camera warning", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  for (let i = 0; i < 30; i += 1) {
    clock.frame();
    const result = controller.update({
      reliable: true,
      reason: NON_VISIBILITY_FAILURE_REASONS.CROSS_EXERCISE_LABEL,
    });
    assert.equal(result.visible, false);
  }

  assert.equal(controller.isActive(), false);
});

test("a model or network failure never produces a camera warning", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({ now: clock.now });

  for (const reason of [
    NON_VISIBILITY_FAILURE_REASONS.MODEL_UNAVAILABLE,
    NON_VISIBILITY_FAILURE_REASONS.NO_LABEL,
  ]) {
    for (let i = 0; i < 10; i += 1) {
      clock.frame();
      assert.equal(
        controller.update({ reliable: true, reason }).visible,
        false,
        reason
      );
    }
  }

  assert.equal(controller.shownCount(), 0);
});

test("a non-visibility failure cannot leave a warning stuck on", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  controller.update(unreliable());
  assert.equal(controller.isActive(), true);

  controller.update({
    reliable: true,
    reason: NON_VISIBILITY_FAILURE_REASONS.CROSS_EXERCISE_LABEL,
  });

  assert.equal(controller.isActive(), false);
  assert.equal(controller.shownCount(), 1, "clearing never re-arms a warning");
});

test("a missing pose and missing landmarks get their own copy", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  const noPose = controller.update(
    unreliable(VISIBILITY_FAILURE_REASONS.NO_POSE)
  );
  assert.equal(noPose.reason, VISIBILITY_FAILURE_REASONS.NO_POSE);

  clock.frame();
  controller.update(reliableFrame());
  clock.frame();

  const partial = controller.update(
    unreliable(VISIBILITY_FAILURE_REASONS.MISSING_POINTS)
  );
  assert.equal(partial.reason, VISIBILITY_FAILURE_REASONS.MISSING_POINTS);

  assert.notEqual(
    getVisibilityWarningMessage(VISIBILITY_FAILURE_REASONS.MISSING_POINTS),
    getVisibilityWarningMessage(VISIBILITY_FAILURE_REASONS.NO_POSE)
  );
});

// ------------------------------------------------------- coaching cues -----

test("a gated depth cue is silence, not a camera instruction", () => {
  const decision = arbitrateCoaching({
    label: "shallow",
    phase: PHASE.UP,
    reliable: true,
    exercise: "squat",
  });

  assert.equal(decision.gated, true);
  assert.equal(resolveCoachingCue({ decision, exercise: "squat" }), null);
});

test("a null label is silence, not a camera instruction", () => {
  const decision = arbitrateCoaching({
    label: null,
    phase: PHASE.UP,
    reliable: true,
    exercise: "squat",
  });

  assert.equal(resolveCoachingCue({ decision, exercise: "squat" }), null);
});

test("an unreliable pose yields no cue here - the controller owns it", () => {
  const decision = arbitrateCoaching({
    label: "correct",
    phase: PHASE.DOWN,
    reliable: false,
    exercise: "squat",
  });

  assert.equal(decision.label, POSE_UNRELIABLE);
  assert.equal(resolveCoachingCue({ decision, exercise: "squat" }), null);
});

test("a cross-exercise label is never coached as a camera fault", () => {
  const decision = arbitrateCoaching({
    label: "knees_caving",
    phase: PHASE.UP,
    reliable: true,
    exercise: "pushup",
  });

  assert.equal(decision.reason, "cross_exercise_label");
  assert.equal(resolveCoachingCue({ decision, exercise: "pushup" }), null);
});

test("ordinary form coaching still resolves", () => {
  for (const [exercise, label] of [
    ["squat", "correct"],
    ["squat", "forward_lean"],
    ["pushup", "pushup_body_sag"],
    ["plank", "plank_hips_high"],
  ]) {
    const decision = arbitrateCoaching({
      label,
      phase: PHASE.DOWN,
      reliable: true,
      exercise,
    });

    const cue = resolveCoachingCue({ decision, exercise });
    assert.ok(cue, `${exercise}/${label} must still coach`);
    assert.equal(cue.label, label);
    assert.ok(cue.message.length > 0);
    assert.ok(
      !cue.message.toLowerCase().includes("see you"),
      "form coaching must not claim the camera cannot see the user"
    );
  }
});

// ------------------------------------------------------------- voice gate ---

test("an identical cue is suppressed even when other cues were spoken between", () => {
  const clock = fakeClock();
  const gate = createVoiceCueGate({ now: clock.now });

  const warning = "I can't see you clearly.";
  const coaching = [
    "Good squat. Keep going.",
    "Keep your knees aligned with your toes.",
    "Keep your chest more upright.",
  ];

  assert.equal(gate.consider(warning).accepted, true);

  // Interleaved coaching used to make the warning look brand new again: the
  // gate only remembered the LAST cue, so the repeat window never applied and
  // the warning was re-requested from ElevenLabs every ~2s.
  let spoken = 1;
  let cueIndex = 0;
  // Four steps of 2.5s stays inside the 12s repeat window on purpose: within
  // that window the warning may be offered repeatedly, but must speak once.
  for (let i = 0; i < 4; i += 1) {
    clock.advance(2500);

    if (i % 2 === 0) {
      const verdict = gate.consider(warning);
      assert.equal(verdict.accepted, false, `warning repeat ${i} must be silent`);
      assert.equal(verdict.reason, "repeat");
      continue;
    }

    const verdict = gate.consider(coaching[cueIndex % coaching.length]);
    assert.equal(verdict.accepted, true, `new coaching cue ${i} must be spoken`);
    cueIndex += 1;
    spoken += 1;
  }

  assert.equal(spoken, 3, "the warning speaks once, coaching is not lost");

  // Once the repeat window has genuinely passed it may speak again.
  clock.advance(13000);
  assert.equal(gate.consider(warning).accepted, true);
});

test("a cue is re-allowed once its own repeat window has passed", () => {
  const clock = fakeClock();
  const gate = createVoiceCueGate({ now: clock.now });

  assert.equal(gate.consider("Step back.").accepted, true);
  clock.advance(13000);
  assert.equal(gate.consider("Step back.").accepted, true);
});

test("different cues keep a minimum gap and never overlap", () => {
  const clock = fakeClock();
  const gate = createVoiceCueGate({ now: clock.now });

  assert.equal(gate.consider("Good squat.").accepted, true);
  clock.advance(100);
  const tooSoon = gate.consider("Keep your chest upright.");

  assert.equal(tooSoon.accepted, false);
  assert.equal(tooSoon.reason, "too_soon");
  assert.ok(tooSoon.retryInMs > 0);

  clock.advance(2600);
  assert.equal(gate.consider("Keep your chest upright.").accepted, true);
});

test("an explicit replay bypasses suppression", () => {
  const clock = fakeClock();
  const gate = createVoiceCueGate({ now: clock.now });

  gate.consider("Step back.");
  assert.equal(gate.consider("Step back.").accepted, false);
  assert.equal(gate.consider("Step back.", { force: true }).accepted, true);
});

test("blank cues never reach the audio pipeline", () => {
  const gate = createVoiceCueGate();
  assert.equal(gate.consider("").accepted, false);
  assert.equal(gate.consider("   ").accepted, false);
  assert.equal(gate.consider(null).accepted, false);
});

test("the tracked cue set is bounded", () => {
  const gate = createVoiceCueGate({ maxTracked: 4, now: () => 0 });

  for (let i = 0; i < 20; i += 1) {
    gate.consider(`cue ${i}`, { force: true });
  }

  assert.equal(gate.trackedCues().length, 4);
  assert.deepEqual(gate.trackedCues(), [
    "cue 16",
    "cue 17",
    "cue 18",
    "cue 19",
  ]);
});

// ----------------------------------------------- whole-pipeline simulation ---

/**
 * Replays the shipped Camerafeed pipeline - frame loop, coaching gate,
 * arbitration, visibility controller and voice gate - against a fake camera
 * and a fake clock. No React, no MediaPipe, no network, no ElevenLabs.
 *
 * `emitted` is what the user would see and hear; `voiceRequests` is what would
 * cost an ElevenLabs credit.
 */
const simulateSession = ({
  seconds = 30,
  reliable = false,
  modelLabel = "shallow",
  phase = PHASE.UP,
  exercise = "squat",
  modelOnline = true,
  poseFrames = true,
} = {}) => {
  const clock = fakeClock(1000);
  const controller = createVisibilityWarningController({ now: clock.now });
  const gate = createCoachingGate();
  const cueGate = createVoiceCueGate({ now: clock.now });
  const tracker = createRepTracker({
    exercise,
    requiredSets: 3,
    requiredReps: 10,
  });

  const emitted = [];
  const voiceRequests = [];
  let reps = 0;
  let lastPredictionAt = -Infinity;

  for (let frame = 0; frame < seconds * FPS; frame += 1) {
    clock.frame();
    const timestamp = clock.now();
    const hasPose = poseFrames;

    if (!hasPose) {
      const warning = controller.update({
        reliable: false,
        reason: VISIBILITY_FAILURE_REASONS.NO_POSE,
      });
      if (warning.visible) {
        emitted.push({ at: timestamp, kind: "visibility", message: warning.message });
      }
      continue;
    }

    const warning = controller.update({
      reliable,
      reason: VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY,
    });
    if (warning.visible) {
      emitted.push({
        at: timestamp,
        kind: "visibility",
        message: warning.message,
        isReminder: warning.isReminder,
      });
    }

    // Rep counting keeps running on every frame regardless of the warning.
    const result = tracker.update(
      {
        exercise,
        knee_angle: frame % 60 < 30 ? 175 : 95,
        elbow_angle: 90,
        hip_angle: 120,
        body_angle: 165,
        symmetry_score: 0.9,
        landmark_visibility: 0.95,
      },
      timestamp
    );
    reps = result.reps;

    // ML cadence: one prediction per 600ms of camera time.
    if (timestamp - lastPredictionAt <= 600) continue;
    lastPredictionAt = timestamp;

    const label = modelOnline ? modelLabel : evaluateFallback(exercise);
    gate.consider(label);

    const decision = arbitrateCoaching({
      label: gate.dominant() || label,
      phase,
      reliable,
      exercise,
    });

    const cue = resolveCoachingCue({ decision, exercise });
    if (!cue) continue;

    emitted.push({ at: timestamp, kind: "coaching", message: cue.message });

    const verdict = cueGate.consider(cue.message);
    if (verdict.accepted) voiceRequests.push({ at: timestamp, text: cue.message });
  }

  return { emitted, voiceRequests, reps, clock };
};

const evaluateFallback = (exercise) =>
  exercise === "squat" ? "correct" : `${exercise}_correct`;

test("30 seconds of bad framing never repeats the camera warning every 2s", () => {
  const { emitted, voiceRequests } = simulateSession({
    seconds: 30,
    reliable: false,
  });

  const warnings = emitted.filter((event) => event.kind === "visibility");
  assert.ok(warnings.length >= 1, "the warning must still be shown");
  assert.ok(warnings.length <= 4, `expected few warnings, got ${warnings.length}`);

  for (let i = 1; i < warnings.length; i += 1) {
    assert.ok(
      warnings[i].at - warnings[i - 1].at >= DEFAULT_WARNING_COOLDOWN_MS,
      "consecutive warnings must respect the cooldown"
    );
  }

  // Every warning carries a camera instruction, and nothing else does.
  for (const event of emitted) {
    if (event.kind === "visibility") {
      assert.match(event.message, /see you/i);
    } else {
      assert.doesNotMatch(event.message, /see you/i);
    }
  }

  // No repeated identical audio requests.
  const texts = voiceRequests.map((request) => request.text);
  assert.equal(new Set(texts).size, texts.length, "no duplicate audio requests");
});

test("a network failure produces no camera-position warning", () => {
  const { emitted, voiceRequests } = simulateSession({
    seconds: 30,
    reliable: true,
    modelOnline: false,
    phase: PHASE.DOWN,
  });

  for (const event of emitted) {
    assert.notEqual(event.kind, "visibility");
    assert.doesNotMatch(event.message, /see you|frame/i);
  }
  assert.ok(emitted.length > 0, "rule-based coaching still works offline");
  assert.ok(voiceRequests.length > 0);
});

test("cross-exercise predictions never create camera warnings", () => {
  const { emitted } = simulateSession({
    seconds: 30,
    reliable: true,
    exercise: "pushup",
    modelLabel: "knees_caving", // squat label arriving during a push-up
  });

  assert.equal(
    emitted.filter((event) => event.kind === "visibility").length,
    0
  );
  for (const event of emitted) {
    assert.doesNotMatch(event.message, /see you/i);
  }
});

test("a perfectly framed workout still coaches and counts reps", () => {
  const { emitted, voiceRequests, reps } = simulateSession({
    seconds: 20,
    reliable: true,
    modelLabel: "correct",
    phase: PHASE.DOWN,
  });

  assert.equal(emitted.filter((event) => event.kind === "visibility").length, 0);
  assert.ok(emitted.length > 0, "normal coaching must keep flowing");
  assert.ok(reps > 0, "rep counting must keep working");
  assert.ok(voiceRequests.length > 0);
});

test("rep counting is untouched by a suppressed warning", () => {
  const bad = simulateSession({ seconds: 30, reliable: false });
  const good = simulateSession({ seconds: 30, reliable: true, phase: PHASE.DOWN });

  assert.equal(
    bad.reps,
    good.reps,
    "the visibility cooldown must never slow the rep tracker"
  );
  assert.ok(bad.reps > 0);
});

test("recovery restores normal feedback in the same session", () => {
  const clock = fakeClock(1000);
  const controller = createVisibilityWarningController({ now: clock.now });
  const cueGate = createVoiceCueGate({ now: clock.now });

  for (let frame = 0; frame < 10 * FPS; frame += 1) {
    clock.frame();
    controller.update({ reliable: false, reason: VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY });
  }
  assert.equal(controller.isActive(), true);

  for (let frame = 0; frame < 3; frame += 1) {
    clock.frame();
    controller.update({ reliable: true, reason: VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY });
  }
  assert.equal(controller.isActive(), false);

  // Normal coaching is audible again straight away.
  assert.equal(cueGate.consider("Good squat. Keep going.").accepted, true);
});

test("starting a new exercise does not inherit an armed warning", () => {
  const clock = fakeClock();
  const controller = createVisibilityWarningController({
    confirmFrames: 1,
    now: clock.now,
  });

  controller.update(unreliable());
  assert.equal(controller.isActive(), true);

  // What Camerafeed does when the exercise changes.
  controller.reset();

  assert.equal(controller.isActive(), false);
  assert.equal(controller.shownCount(), 0);
});