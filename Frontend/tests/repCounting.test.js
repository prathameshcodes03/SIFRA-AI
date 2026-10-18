import test from "node:test";
import assert from "node:assert/strict";

import { createRepTracker, PHASE, REP_THRESHOLDS } from "../src/exercises/repTracker.js";
import { extractExerciseFeatures } from "../src/exercises/featureExtractor.js";
import { createSquatRepSummary } from "../src/exercises/squatRepSummary.js";
import { assessSquatForm } from "../src/exercises/formAssessment.js";
import { resolveFormCoaching } from "../src/exercises/coaching.js";
import { createVoiceCueGate } from "../src/hooks/voiceCueGate.js";
import { POSE_LANDMARKS as P } from "../src/mediapipe/poseLandmarks.js";

/**
 * DETERMINISTIC SYNTHETIC FIXTURES - NOT A REAL CAMERA.
 *
 * Two fixture styles are used:
 *
 *  A. `pose()` builds a MediaPipe-shaped landmark array for a side view at a
 *     given knee angle, so the tests exercise the REAL
 *     extractExerciseFeatures -> repTracker path. This is where the production
 *     bug lived, so the regression must be pinned at this level.
 *
 *  B. Plain feature objects, for timing and precision scenarios where driving
 *     the angle directly is clearer.
 *
 * Neither style proves real-camera accuracy. They prove the decision logic.
 */

const FRAME_MS = 33; // ~30fps MediaPipe cadence
const L_THIGH = 1;
const L_SHIN = 1;
const L_TORSO = 0.7;

/** Side-view skeleton for a given knee angle and torso lean. */
function pose({ knee = 175, lean = 0, visibility = 0.95, drop = [] } = {}) {
  const alpha = ((180 - knee) * Math.PI) / 180;
  const leanRad = (lean * Math.PI) / 180;

  const hip = { x: 0, y: 0 };
  const kneePt = {
    x: L_THIGH * Math.sin(alpha),
    y: -L_THIGH * Math.cos(alpha),
  };
  const ankle = { x: kneePt.x, y: kneePt.y - L_SHIN };
  const shoulder = {
    x: L_TORSO * Math.sin(leanRad),
    y: L_TORSO * Math.cos(leanRad),
  };
  const elbow = { x: (kneePt.x + shoulder.x) / 2, y: (shoulder.y + kneePt.y) / 2 + 0.1 };
  const wrist = { x: ankle.x, y: ankle.y + 0.3 };

  const make = (point) => ({ x: point.x, y: point.y, z: 0, visibility });
  const lms = Array.from({ length: 33 }, () => make({ x: 0, y: 0 }));

  lms[P.LEFT_SHOULDER] = make(shoulder);
  lms[P.LEFT_HIP] = make(hip);
  lms[P.LEFT_KNEE] = make(kneePt);
  lms[P.LEFT_ANKLE] = make(ankle);
  lms[P.LEFT_ELBOW] = make(elbow);
  lms[P.LEFT_WRIST] = make(wrist);
  // The right side mirrors the left so symmetry is well defined.
  for (const [src, dst] of [
    [P.LEFT_SHOULDER, P.RIGHT_SHOULDER],
    [P.LEFT_HIP, P.RIGHT_HIP],
    [P.LEFT_KNEE, P.RIGHT_KNEE],
    [P.LEFT_ANKLE, P.RIGHT_ANKLE],
    [P.LEFT_ELBOW, P.RIGHT_ELBOW],
    [P.LEFT_WRIST, P.RIGHT_WRIST],
  ]) {
    lms[dst] = { ...lms[src] };
  }

  for (const index of drop) lms[index] = null;
  return lms;
}

/** Plain feature frame (style B). */
const squatFrame = (kneeAngle, extra = {}) => ({
  exercise: "squat",
  knee_angle: kneeAngle,
  elbow_angle: 20,
  hip_angle: 110,
  body_angle: 165,
  symmetry_score: 0.9,
  landmark_visibility: 0.95,
  ...extra,
});

const pushupFrame = (elbowAngle, extra = {}) => ({
  exercise: "pushup",
  knee_angle: 0,
  elbow_angle: elbowAngle,
  hip_angle: 170,
  body_angle: 175,
  symmetry_score: 0.93,
  landmark_visibility: 0.97,
  ...extra,
});

const plankFrame = (bodyAngle, extra = {}) => ({
  exercise: "plank",
  knee_angle: 0,
  elbow_angle: 0,
  hip_angle: 170,
  body_angle: bodyAngle,
  symmetry_score: 0.94,
  landmark_visibility: 0.98,
  ...extra,
});

/** Drives a tracker with plain feature frames; returns the final snapshot. */
function drive(tracker, frames, startMs = 1000, stepMs = FRAME_MS, context) {
  let now = startMs;
  let last = null;
  for (const frame of frames) {
    last = tracker.update(frame, now, context);
    now += stepMs;
  }
  return { last, now };
}

const lerp = (a, b, t) => a + (b - a) * t;

/** One realistic repetition: standing -> bottom -> standing, gradual. */
function repFrames(bottomKnee, { frames = 90, lean = 0 } = {}) {
  return Array.from({ length: frames }, (_, i) => {
    const t = i / (frames - 1);
    const knee = t < 0.5 ? lerp(175, bottomKnee, t * 2) : lerp(bottomKnee, 175, (t - 0.5) * 2);
    const leanNow = t < 0.5 ? lerp(0, lean, t * 2) : lerp(lean, 0, (t - 0.5) * 2);
    return pose({ knee, lean: leanNow });
  });
}

/** Full landmark -> tracker pipeline, as Camerafeed runs it. */
function driveLandmarks(tracker, landmarksList, startMs = 1000, exercise = "squat") {
  let now = startMs;
  let last = null;
  const seen = [];
  for (const lms of landmarksList) {
    const features = extractExerciseFeatures(lms, exercise);
    seen.push(features);
    last = tracker.update(features, now);
    now += FRAME_MS;
  }
  return { last, now, features: seen[seen.length - 1] };
}

const squatTracker = (overrides = {}) =>
  createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10, ...overrides });

// ------------------------------------------------- 1. standing still -------

test("1. standing still for 30 seconds counts zero reps", () => {
  const tracker = squatTracker();
  // 30s at 30fps = 900 frames, through the real landmark pipeline.
  const { last } = driveLandmarks(
    tracker,
    Array.from({ length: 900 }, () => pose({ knee: 175 }))
  );
  assert.equal(last.reps, 0, "a motionless user must never accumulate reps");
  assert.equal(last.setReps, 0);
  assert.equal(last.phase, PHASE.UP);
});

// ------------------------------------------ 2, 3, 10. valid repetitions ---

test("2. one complete valid squat counts exactly one rep", () => {
  const tracker = squatTracker();
  const { last } = driveLandmarks(tracker, repFrames(95));
  assert.equal(last.reps, 1);
  assert.equal(last.phase, PHASE.UP);
});

test("3. five complete squats count exactly five reps", () => {
  const tracker = squatTracker();
  const frames = [];
  for (let i = 0; i < 5; i += 1) frames.push(...repFrames(95));
  const { last } = driveLandmarks(tracker, frames);
  assert.equal(last.reps, 5, `expected 5 reps, got ${last.reps}`);
  assert.equal(last.setReps, 5);
});

test("10. rapid but biomechanically plausible squats are not arbitrarily rejected", () => {
  const tracker = squatTracker();
  // ~1.3s per rep: fast but a human can do it.
  const frames = [];
  for (let i = 0; i < 6; i += 1) frames.push(...repFrames(100, { frames: 40 }));
  const { last } = driveLandmarks(tracker, frames);
  assert.equal(last.reps, 6, `fast reps must still count, got ${last.reps}`);
});

// ------------------------------------------ 4, 5. incomplete repetitions ---

test("4. a partial squat that never returns to standing counts zero reps", () => {
  const tracker = squatTracker();
  const frames = [
    ...Array.from({ length: 30 }, () => pose({ knee: 175 })),
    ...Array.from({ length: 45 }, (_, i) => pose({ knee: lerp(175, 95, i / 44) })),
  ];
  const { last } = driveLandmarks(tracker, frames);
  assert.equal(last.reps, 0, "descending alone is not a repetition");
  assert.equal(last.phase, PHASE.DOWN);
});

test("5. descending and staying at the bottom counts zero until the return completes", () => {
  const tracker = squatTracker();
  let now = 1000;
  let reps = 0;

  const feed = (frames) => {
    for (const lms of frames) {
      reps = tracker.update(extractExerciseFeatures(lms, "squat"), now).reps;
      now += FRAME_MS;
    }
  };

  feed(Array.from({ length: 30 }, () => pose({ knee: 175 })));
  feed(Array.from({ length: 40 }, (_, i) => pose({ knee: lerp(175, 90, i / 39) })));
  feed(Array.from({ length: 300 }, () => pose({ knee: 90 }))); // hold 10s
  assert.equal(reps, 0, "holding the bottom must not count a rep");

  feed(Array.from({ length: 40 }, (_, i) => pose({ knee: lerp(90, 175, i / 39) })));
  assert.equal(reps, 1, "the rep registers only once the return completes");
});

// ------------------------------------------------------ 6. jitter ----------

test("6. small knee-angle fluctuations while standing count zero reps", () => {
  const tracker = squatTracker();
  const frames = [];
  for (let i = 0; i < 600; i += 1) {
    const wobble = [168, 172, 175, 171, 176, 169, 174, 170][i % 8];
    frames.push(squatFrame(wobble));
  }
  const { last } = drive(tracker, frames);
  assert.equal(last.reps, 0, "standing sway is not a repetition");
});

// --------------------------------- 7, 8. landmark validity / tracking loss ---

test("7. a brief invalid landmark frame does not create a false rep", () => {
  const tracker = squatTracker();
  const frames = [
    ...repFrames(95),
    pose({ knee: 175, drop: [P.LEFT_KNEE, P.LEFT_ANKLE] }),
    pose({ knee: 175 }),
  ];
  const { last } = driveLandmarks(tracker, frames);
  assert.equal(last.reps, 1, "only the real rep counts; the drop adds nothing");
});

test("7b. a pose with no measurable knee angle is ignored, not fabricated", () => {
  const lms = pose({
    knee: 175,
    drop: [P.LEFT_KNEE, P.LEFT_ANKLE, P.RIGHT_KNEE, P.RIGHT_ANKLE],
  });
  const features = extractExerciseFeatures(lms, "squat");

  // The placeholder stays in the payload so the /predict contract is unchanged,
  // but `measured` marks it as NOT a measurement.
  assert.equal(features.measured.knee, false);
  assert.equal(features.measured.elbow, true, "unaffected angles stay real");

  // Behaviour is what matters: the tracker must not move on this frame.
  const tracker = squatTracker();
  drive(tracker, Array.from({ length: 30 }, () => squatFrame(175)));
  const res = tracker.update(features, 30000);
  assert.equal(res.phase, PHASE.UP, "an unmeasured angle must not look like a descent");
  assert.equal(res.reps, 0);
  assert.equal(res.trackingOk, false);
});

test("8. temporary tracking loss recovers without a phantom repetition", () => {
  const tracker = squatTracker();
  const lost = Array.from({ length: 20 }, () => null); // pose lost entirely
  const frames = [
    ...Array.from({ length: 30 }, () => pose({ knee: 175 })),
    ...lost,
    ...Array.from({ length: 60 }, () => pose({ knee: 175 })),
  ];

  let now = 1000;
  let reps = 0;
  let maxPhase = PHASE.UP;
  for (const lms of frames) {
    const features = lms ? extractExerciseFeatures(lms, "squat") : null;
    const res = tracker.update(features, now);
    reps = res.reps;
    maxPhase = res.phase;
    now += FRAME_MS;
  }

  assert.equal(reps, 0, "losing and regaining the pose must not count a rep");
  assert.equal(maxPhase, PHASE.UP, "state returns cleanly to standing");
});

test("8b. tracking loss mid-descent discards the partial rep", () => {
  const tracker = squatTracker();
  let now = 1000;
  let reps = 0;
  const feed = (lms) => {
    const features = lms ? extractExerciseFeatures(lms, "squat") : null;
    reps = tracker.update(features, now).reps;
    now += FRAME_MS;
  };

  feed(pose({ knee: 175 }));
  for (let i = 0; i < 40; i += 1) feed(pose({ knee: lerp(175, 90, i / 39) }));
  feed(null); // tracking lost at the bottom
  for (let i = 0; i < 20; i += 1) feed(null);
  for (let i = 0; i < 40; i += 1) feed(pose({ knee: lerp(90, 175, i / 39) }));

  assert.equal(reps, 0, "a rep interrupted by tracking loss is not a rep");
});

// --------------------------------------------------- 9. no double count ---

test("9. returning to standing after a completed rep adds no duplicate", () => {
  const tracker = squatTracker();
  const { last } = drive(tracker, [
    ...repFrames(95).map(() => squatFrame(0)), // placeholder, replaced below
  ].slice(0, 0).concat(
    Array.from({ length: 60 }, () => squatFrame(175))
  ));
  assert.equal(last.reps, 0);

  const t2 = squatTracker();
  const cycle = Array.from({ length: 90 }, (_, i) => {
    const t = i / 89;
    return squatFrame(t < 0.5 ? lerp(175, 95, t * 2) : lerp(95, 175, (t - 0.5) * 2));
  });
  const { last: afterCycle } = drive(t2, cycle);
  assert.equal(afterCycle.reps, 1);

  // 20 more seconds of standing must stay at one.
  const { last: afterStanding } = drive(
    t2,
    Array.from({ length: 600 }, () => squatFrame(175)),
    afterCycle === undefined ? 1000 : 1000 + 90 * FRAME_MS
  );
  assert.equal(afterStanding.reps, 1, "standing still must not add reps");
});

// --------------------------------------------------------- 11, 12. push-up ---

test("11. five complete push-ups count exactly five reps", () => {
  const tracker = createRepTracker({ exercise: "pushup", requiredSets: 3, requiredReps: 10 });
  const frames = [];
  for (let c = 0; c < 5; c += 1) {
    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      frames.push(
        pushupFrame(t < 0.5 ? lerp(175, 85, t * 2) : lerp(85, 175, (t - 0.5) * 2))
      );
    }
  }
  const { last } = drive(tracker, frames);
  assert.equal(last.reps, 5, `expected 5 push-ups, got ${last.reps}`);
});

test("12. small arm movements without a full push-up count zero reps", () => {
  const tracker = createRepTracker({ exercise: "pushup", requiredSets: 3, requiredReps: 10 });
  const frames = [];
  for (let i = 0; i < 600; i += 1) {
    const wobble = [172, 176, 168, 174, 170, 178][i % 6];
    frames.push(pushupFrame(wobble));
  }
  const { last } = drive(tracker, frames);
  assert.equal(last.reps, 0);
});

test("12b. a twitch far too short to be a repetition is rejected", () => {
  const tracker = createRepTracker({ exercise: "pushup", requiredSets: 3, requiredReps: 10 });
  const frames = [];
  for (let i = 0; i < 30; i += 1) frames.push(pushupFrame(175));
  for (let i = 0; i < 6; i += 1) frames.push(pushupFrame(85));
  for (let i = 0; i < 30; i += 1) frames.push(pushupFrame(175));
  const { last } = drive(tracker, frames);
  assert.equal(last.reps, 0, "a 200ms dip is noise, not a push-up");
});

// ------------------------------------------------------------ 13. plank ----

test("13. plank hold advances the timer without incrementing the rep counter", () => {
  const tracker = createRepTracker({ exercise: "plank", requiredSets: 3, requiredReps: 10 });
  const { last } = drive(tracker, Array.from({ length: 300 }, () => plankFrame(175)));

  assert.equal(last.reps, 0, "a plank has no repetitions");
  assert.ok(last.setReps >= 9, `expected ~9 hold seconds, got ${last.setReps}`);
  assert.equal(last.holdFormOk, true);
});

test("13b. plank hold timing is independent of rep-style movement", () => {
  const tracker = createRepTracker({ exercise: "plank", requiredSets: 1, requiredReps: 10 });
  // Wild body-angle swings: irrelevant to a hold, and must not bank seconds.
  const frames = Array.from({ length: 300 }, (_, i) => plankFrame(i % 2 === 0 ? 175 : 120));
  const { last } = drive(tracker, frames);
  assert.equal(last.reps, 0);
  assert.equal(last.setReps, 0, "a broken line banks nothing");
});

test("13c. a backgrounded tab cannot bank plank seconds", () => {
  const tracker = createRepTracker({ exercise: "plank", requiredSets: 1, requiredReps: 60 });
  drive(tracker, Array.from({ length: 5 }, () => plankFrame(175)));
  // One enormous step, as if the tab was hidden for a minute.
  const after = tracker.update(plankFrame(175), 61000);
  assert.ok(after.setReps <= 1, `dt must be clamped, jumped to ${after.setReps}s`);
});

// ------------------------------------------------- 14. rest / idle ----------

test("14. a rest period produces no reps and no coaching", () => {
  const tracker = squatTracker();
  const summary = createSquatRepSummary();

  let now = 1000;
  let reps = 0;
  const spoken = [];

  const feed = (lms) => {
    const features = lms ? extractExerciseFeatures(lms, "squat") : null;
    const res = tracker.update(features, now);
    reps = res.reps;
    const completed = summary.observe(features, res);
    if (completed) {
      const assessment = assessSquatForm({
        features: completed.features,
        deepestKneeAngle: completed.deepestAngle,
      });
      const resolution = resolveFormCoaching({
        assessment,
        mlLabel: null,
        features: completed.features,
        exercise: "squat",
      });
      if (resolution.message) spoken.push(resolution.message);
    }
    now += FRAME_MS;
  };

  // Three real reps, then a long rest.
  for (let c = 0; c < 3; c += 1) for (const lms of repFrames(95)) feed(lms);
  const repsAfterWorkout = reps;
  for (let i = 0; i < 900; i += 1) feed(pose({ knee: 175 })); // 30s rest

  assert.equal(repsAfterWorkout, 3);
  assert.equal(reps, 3, "a rest period must add no reps");
  assert.equal(spoken.length, 3, "exactly one verdict per completed rep");
  for (const message of spoken) {
    assert.ok(!message.toLowerCase().includes("go lower"), "no depth nag at rest");
    assert.ok(!message.toLowerCase().includes("deeper"), "no depth nag at rest");
  }
});

test("20. coaching during rest never repeats the same instruction", () => {
  const tracker = squatTracker();
  const summary = createSquatRepSummary();
  const cueGate = createVoiceCueGate();

  let now = 1000;
  const voiceRequests = [];
  const feed = (lms) => {
    const features = lms ? extractExerciseFeatures(lms, "squat") : null;
    const res = tracker.update(features, now);
    const completed = summary.observe(features, res);
    if (completed) {
      const assessment = assessSquatForm({
        features: completed.features,
        deepestKneeAngle: completed.deepestAngle,
      });
      const resolution = resolveFormCoaching({
        assessment,
        mlLabel: null,
        features: completed.features,
        exercise: "squat",
      });
      if (resolution.message && cueGate.consider(resolution.message).accepted) {
        voiceRequests.push(resolution.message);
      }
    }
    now += FRAME_MS;
  };

  for (let c = 0; c < 8; c += 1) for (const lms of repFrames(130)) feed(lms);
  for (let i = 0; i < 900; i += 1) feed(pose({ knee: 175 }));

  assert.equal(voiceRequests.length, 1, "8 shallow reps speak one instruction, once");
});

// ---------------------------------------- 15, 18, 19. lifecycle -----------

test("15. pausing and resuming does not duplicate counters", () => {
  const tracker = squatTracker();

  const cycle = () =>
    Array.from({ length: 90 }, (_, i) => {
      const t = i / 89;
      return squatFrame(t < 0.5 ? lerp(175, 95, t * 2) : lerp(95, 175, (t - 0.5) * 2));
    });

  const first = drive(tracker, cycle());
  assert.equal(first.last.reps, 1, "first rep counts once");

  // PAUSE: the camera stops delivering frames entirely (tab hidden, camera
  // off). No update() calls at all, then time jumps forward.
  const afterPause = tracker.update(null, 600000);
  assert.equal(afterPause.reps, 1, "a pause must not add or reset anything");

  // RESUME and perform a second, complete rep.
  const second = drive(tracker, cycle(), 600000);
  assert.equal(second.last.reps, 2, "resuming counts the new rep exactly once");
});

test("18. switching exercises cannot let old state increment the new one", () => {
  const squatRun = squatTracker();
  drive(squatRun, repFrames(95));
  assert.equal(squatRun.isFinished(), false);

  // A fresh tracker for the next exercise, exactly as Camerafeed rebuilds it.
  const pushupRun = createRepTracker({ exercise: "pushup", requiredSets: 1, requiredReps: 10 });
  const { last } = drive(pushupRun, Array.from({ length: 90 }, () => pushupFrame(175)));
  assert.equal(last.reps, 0, "the squat's progress cannot leak into the push-up");
  assert.equal(last.sets, 1);
});

test("19b. a backgrounded tab resuming mid-rep cannot complete it", () => {
  const tracker = squatTracker();
  let now = 1000;
  let reps = 0;

  const feed = (lms, dt = FRAME_MS) => {
    const features = lms ? extractExerciseFeatures(lms, "squat") : null;
    reps = tracker.update(features, now).reps;
    now += dt;
  };

  feed(pose({ knee: 175 }));
  // Descend to the bottom...
  for (let i = 0; i < 40; i += 1) feed(pose({ knee: lerp(175, 90, i / 39) }));
  assert.equal(tracker.update(null, now).phase, PHASE.DOWN);

  // ...then the tab is hidden for 30 seconds (no frames delivered at all).
  now += 30000;

  // The user is now standing again. The tracker must NOT call that a rep.
  feed(pose({ knee: 175 }), 30000);
  assert.equal(reps, 0, "an interrupted rep must not be completed on resume");

  // A full rep after the resume still counts normally.
  for (const lms of repFrames(95)) feed(lms);
  assert.equal(reps, 1, "the tracker recovers and works normally afterwards");
});

test("19c. a slow device delivering frames is not treated as an interruption", () => {
  const tracker = squatTracker();
  // 5fps: 200ms between frames, far slower than 30fps but still continuous.
  const frames = [];
  for (let i = 0; i < 40; i += 1) {
    const t = i / 39;
    frames.push(squatFrame(t < 0.5 ? lerp(175, 95, t * 2) : lerp(95, 175, (t - 0.5) * 2)));
  }
  const { last } = drive(tracker, frames, 1000, 200);
  assert.equal(last.reps, 1, "a slow but continuous stream must still count");
});

test("19. reset clears every counter so a new session starts clean", () => {
  const tracker = squatTracker();
  const frames = [];
  for (let c = 0; c < 3; c += 1) frames.push(...repFrames(95));
  driveLandmarks(tracker, frames);
  assert.ok(tracker.update(null, 1e6).reps > 0, "three reps were recorded first");

  tracker.reset();
  const fresh = tracker.update(null, 2e6);
  assert.equal(fresh.reps, 0);
  assert.equal(fresh.setReps, 0);
  assert.equal(fresh.sets, 1);
  assert.equal(fresh.phase, PHASE.UP);
  assert.equal(tracker.isFinished(), false);
});

// ------------------------------------- 16, 17. completion integrity ------

test("16. reaching the target completes the set exactly once", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 2 });
  let now = 1000;
  let setEvents = 0;
  let last;

  // Exactly the prescribed reps for one set: 2 reps.
  for (let c = 0; c < 2; c += 1) {
    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      const frame = squatFrame(t < 0.5 ? lerp(175, 95, t * 2) : lerp(95, 175, (t - 0.5) * 2));
      last = tracker.update(frame, now);
      now += FRAME_MS;
      if (last.setJustCompleted) setEvents += 1;
    }
  }

  assert.equal(setEvents, 1, "the set completes exactly once, on its 2nd rep");
  assert.equal(last.sets, 2, "advances to set 2");
  assert.equal(last.setReps, 0, "rep counter resets for the new set");

  // Extra reps in the new set complete THAT set once - never more.
  setEvents = 0;
  for (let c = 0; c < 4; c += 1) {
    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      const frame = squatFrame(t < 0.5 ? lerp(175, 95, t * 2) : lerp(95, 175, (t - 0.5) * 2));
      const res = tracker.update(frame, now);
      now += FRAME_MS;
      if (res.setJustCompleted) setEvents += 1;
    }
  }
  assert.equal(setEvents, 2, "two more reps complete exactly two more sets");
});

test("16b. the final set completes the exercise exactly once", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 1, requiredReps: 2 });
  let now = 1000;
  let events = 0;

  for (let c = 0; c < 6; c += 1) {
    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      const frame = squatFrame(t < 0.5 ? lerp(175, 95, t * 2) : lerp(95, 175, (t - 0.5) * 2));
      const res = tracker.update(frame, now);
      now += FRAME_MS;
      if (res.exerciseJustCompleted) events += 1;
    }
  }

  assert.equal(events, 1, "no duplicate completion requests");
  assert.equal(tracker.isFinished(), true);
});

test("17. a false rep can never complete a set, so no workout finishes early", () => {
  const tracker = createRepTracker({ exercise: "squat", requiredSets: 3, requiredReps: 10 });

  // 10 minutes of the historical failure mode: a partially visible standing
  // user, where the left knee and ankle drop out repeatedly.
  let now = 1000;
  let completions = 0;
  for (let i = 0; i < 18_000; i += 1) {
    const lms =
      i % 7 === 0
        ? pose({ knee: 175, visibility: 0.8, drop: [P.LEFT_KNEE, P.LEFT_ANKLE] })
        : pose({ knee: 175 });
    const res = tracker.update(extractExerciseFeatures(lms, "squat"), now);
    now += FRAME_MS;
    if (res.setJustCompleted || res.exerciseJustCompleted) completions += 1;
  }

  assert.equal(completions, 0, "10 minutes of standing must complete nothing");
  assert.equal(tracker.update(null, now).reps, 0);
});

// ----------------------------------------------- 21. API failure ---------

test("21. an API failure produces no fabricated form fault and no false rep", () => {
  const tracker = squatTracker();
  const failing = () => {
    throw new Error("ML service unavailable");
  };

  let now = 1000;
  const messages = [];
  for (let c = 0; c < 3; c += 1) {
    for (const lms of repFrames(95)) {
      const features = extractExerciseFeatures(lms, "squat");
      const res = tracker.update(features, now);
      now += FRAME_MS;

      let mlLabel = null;
      try {
        mlLabel = failing();
      } catch {
        mlLabel = null;
      }
      const assessment = assessSquatForm({
        features,
        deepestKneeAngle: res.repMinAngle ?? features.knee_angle,
      });
      const resolution = resolveFormCoaching({
        assessment,
        mlLabel,
        features,
        exercise: "squat",
      });
      if (resolution.message) messages.push(resolution.message);
    }
  }

  assert.equal(tracker.update(null, now).reps, 3, "reps are unaffected by the API");
  assert.equal(
    messages.filter((m) => m.includes("deeper")).length,
    0,
    "a network failure must never read as a form fault"
  );
});

// ------------------------------------ 22. rapid state updates -------------

test("22. each valid repetition produces exactly one counter update", () => {
  const tracker = squatTracker();
  // Mirrors Camerafeed's render-avoiding mirror comparison.
  let lastSetRepsRef = 0;
  let stateUpdates = 0;
  let now = 1000;

  for (let c = 0; c < 10; c += 1) {
    for (const lms of repFrames(95)) {
      const res = tracker.update(extractExerciseFeatures(lms, "squat"), now);
      now += FRAME_MS;
      if (res.setReps !== lastSetRepsRef) {
        lastSetRepsRef = res.setReps;
        stateUpdates += 1;
      }
    }
  }

  assert.equal(stateUpdates, 10, "one React-visible update per rep, not per frame");
  assert.equal(tracker.update(null, now).reps, 10);
});

// ---------------------------------------------- threshold sanity ----------

test("the configured thresholds remain the ones the product already used", () => {
  // Guards against a silent regression of the shipped biomechanical anchors.
  assert.equal(REP_THRESHOLDS.squat.signal, "knee_angle");
  assert.equal(REP_THRESHOLDS.squat.down, 110);
  assert.equal(REP_THRESHOLDS.squat.up, 140);
  assert.equal(REP_THRESHOLDS.pushup.signal, "elbow_angle");
  assert.equal(REP_THRESHOLDS.pushup.down, 100);
  assert.equal(REP_THRESHOLDS.pushup.up, 140);
});