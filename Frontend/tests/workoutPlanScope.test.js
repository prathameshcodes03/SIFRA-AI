import test from "node:test";
import assert from "node:assert/strict";

import {
  findNextOutstandingWorkout,
  selectPlanWorkouts,
  isSameLocalDay,
} from "../src/exercises/workoutPlan.js";

/**
 * The workout PLAN.
 *
 * The bug: the plan builder listed every workout the user had ever created,
 * so yesterday's FINISHED workouts sat in the list looking like plan entries.
 * Removing them deleted the record of those workouts - and the streak, which
 * is built from exactly those records, went DOWN. A user tidying up their
 * plan silently lost their training history.
 */

const NOW = new Date("2026-10-22T10:00:00.000Z").getTime();

const pending = (id) => ({ id, completed: false, completedAt: null });
const doneToday = (id) => ({
  id,
  completed: true,
  completedAt: new Date().toISOString(),
});
const doneEarlier = (id) => ({
  id,
  completed: true,
  completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
});

test("the plan keeps the outstanding exercises", () => {
  const plan = selectPlanWorkouts([pending("a"), pending("b")], NOW);
  assert.deepEqual(
    plan.map((w) => w.id),
    ["a", "b"]
  );
});

test("the plan keeps the exercises finished today", () => {
  const plan = selectPlanWorkouts([pending("a"), doneToday("b")], NOW);
  assert.deepEqual(
    plan.map((w) => w.id),
    ["a", "b"]
  );
});

test("the plan drops the history from previous days", () => {
  // This is the fix: yesterday's finished workouts are HISTORY. They are not
  // plan entries any more, so they cannot be deleted from the plan - which
  // is what silently destroyed the streak.
  const plan = selectPlanWorkouts(
    [pending("a"), doneToday("b"), doneEarlier("c")],
    NOW
  );

  assert.deepEqual(
    plan.map((w) => w.id),
    ["a", "b"],
    "a workout finished days ago must not appear in the plan"
  );
});

test("a plan of only history is empty", () => {
  assert.deepEqual(selectPlanWorkouts([doneEarlier("c")], NOW), []);
});

test("an empty or invalid list is handled", () => {
  assert.deepEqual(selectPlanWorkouts([], NOW), []);
  assert.deepEqual(selectPlanWorkouts(null, NOW), []);
});

test("isSameLocalDay compares calendar days, not instants", () => {
  assert.equal(isSameLocalDay(new Date().toISOString(), Date.now()), true);
  assert.equal(
    isSameLocalDay(
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      Date.now()
    ),
    false
  );
  assert.equal(isSameLocalDay(null), false);
});

test("the next exercise is never a completed workout", () => {
  const workouts = [doneEarlier("old"), pending("next")];

  const next = findNextOutstandingWorkout(workouts, "old");
  assert.equal(next.id, "next");
});
