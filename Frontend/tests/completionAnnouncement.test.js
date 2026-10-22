import test from "node:test";
import assert from "node:assert/strict";

import {
  announceWorkoutCompletion,
  createWorkoutSessionKey,
  resetCompletionAnnouncements,
} from "../src/voice/completionVoice.js";
import {
  findNextSessionExercise,
  findNextOutstandingWorkout,
} from "../src/exercises/workoutPlan.js";

/**
 * The completion announcement.
 *
 * The bug: finishing a workout was SILENT whenever the plan still had
 * another exercise in it - the announcement was only made on the very last
 * exercise. A second cause sat on top of it: restarting a session in place
 * reused the session key of the attempt that had just finished, so the
 * announcer's "already announced" guard swallowed the second completion.
 *
 * The user finished a workout, heard nothing, and finished it again - and
 * still heard nothing.
 */

test.beforeEach(() => {
  resetCompletionAnnouncements();
});

test("a session key is minted per attempt, so a restart is a new attempt", () => {
  const first = createWorkoutSessionKey("wk-1", "squat");
  const second = createWorkoutSessionKey("wk-1", "squat");

  assert.notEqual(
    first,
    second,
    "a new attempt must not reuse the previous attempt's key"
  );
});

test("the same attempt is never announced twice", async () => {
  const key = createWorkoutSessionKey("wk-1", "squat");

  const first = await announceWorkoutCompletion({ workoutKey: key });
  const second = await announceWorkoutCompletion({ workoutKey: key });

  assert.equal(first.announced, true);
  assert.equal(second.reason, "already_announced");
});

test("a restarted attempt is announced again", async () => {
  // The first attempt.
  await announceWorkoutCompletion({
    workoutKey: createWorkoutSessionKey("wk-1", "squat"),
  });

  // The restart: a new key, so the announcement is eligible again.
  const afterRestart = await announceWorkoutCompletion({
    workoutKey: createWorkoutSessionKey("wk-1", "squat"),
  });

  assert.equal(
    afterRestart.announced,
    true,
    "restarting the session must not silence the announcement"
  );
});

test("the message is always shown on screen, even when muted", async () => {
  const shown = [];
  await announceWorkoutCompletion({
    workoutKey: createWorkoutSessionKey("wk-1", "squat"),
    muted: true,
    onMessage: (text) => shown.push(text),
  });

  assert.equal(shown.length, 1, "the text is shown even with the voice off");
  assert.match(shown[0], /completed your workout/i);
});

test("a stale pending exercise does not hijack the session", () => {
  const now = Date.now();
  const workouts = [
    {
      id: "squat-today",
      completed: true,
      createdAt: new Date(now).toISOString(),
    },
    {
      id: "pushup-old",
      completed: false,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "plank-today",
      completed: false,
      createdAt: new Date(now).toISOString(),
    },
  ];

  const next = findNextSessionExercise(workouts, "squat-today", now);
  assert.equal(
    next.id,
    "plank-today",
    "only an exercise added today continues the session"
  );

  // The stale exercise is still in the plan, and still available.
  const outstanding = findNextOutstandingWorkout(workouts, "squat-today");
  assert.equal(outstanding.id, "pushup-old");
});

test("with nothing outstanding the session ends", () => {
  const now = Date.now();
  const workouts = [
    {
      id: "squat-today",
      completed: true,
      createdAt: new Date(now).toISOString(),
    },
    {
      id: "pushup-old",
      completed: false,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  assert.equal(findNextSessionExercise(workouts, "squat-today", now), null);
});
