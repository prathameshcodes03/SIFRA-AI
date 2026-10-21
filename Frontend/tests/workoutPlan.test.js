import test from "node:test";
import assert from "node:assert/strict";

import { findNextOutstandingWorkout } from "../src/exercises/workoutPlan.js";

/**
 * Session plan selection.
 *
 * The bug this locks down: the camera auto-advanced to "the next entry in the
 * workout list", and that list contains every exercise the user has ever
 * added. Finishing an exercise could therefore launch an OLD, already
 * completed session, and completing it re-dated that workout to today - which
 * erased the day it was originally performed and made the streak stall.
 */

const pending = (id, extra = {}) => ({ id, completed: false, ...extra });
const done = (id, extra = {}) => ({ id, completed: true, ...extra });

test("an outstanding workout is offered as the next exercise", () => {
  const workouts = [done("old-1"), pending("next-1"), pending("next-2")];

  const next = findNextOutstandingWorkout(workouts, "old-1");
  assert.equal(next.id, "next-1");
});

test("a completed workout is never the next exercise", () => {
  const workouts = [done("old-1"), done("old-2")];

  assert.equal(findNextOutstandingWorkout(workouts, "old-1"), null);
  assert.equal(findNextOutstandingWorkout(workouts, null), null);
});

test("the workout being performed right now is excluded", () => {
  const workouts = [pending("current"), pending("other")];

  const next = findNextOutstandingWorkout(workouts, "current");
  assert.equal(next.id, "other");
});

test("the next exercise does not change when the current one is completed", () => {
  // Before the completion the plan still contains the running workout.
  const before = [pending("current"), pending("other")];
  assert.equal(findNextOutstandingWorkout(before, "current").id, "other");

  // After the completion the running workout is flagged as done. The answer
  // must be the same, otherwise the auto-advance would jump around.
  const after = [done("current"), pending("other")];
  assert.equal(findNextOutstandingWorkout(after, "current").id, "other");
});

test("an empty plan has no next exercise", () => {
  assert.equal(findNextOutstandingWorkout([], "current"), null);
  assert.equal(findNextOutstandingWorkout(null, "current"), null);
  assert.equal(findNextOutstandingWorkout(undefined, null), null);
});
