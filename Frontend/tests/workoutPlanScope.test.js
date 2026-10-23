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
  completedAt: new Date(NOW).toISOString(),
});
const doneEarlier = (id) => ({
  id,
  completed: true,
  completedAt: new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString(),
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

// ── Boundary / regression tests ──

test("boundary: workout completed at midnight boundary (same day)", () => {
  // NOW is 2026-10-22T10:00:00Z. A workout completed at 00:00:00 on the
  // same calendar day should still be "today".
  const midnightToday = new Date("2026-10-22T00:00:00.000Z").getTime();
  const workout = {
    id: "midnight",
    completed: true,
    completedAt: new Date(midnightToday).toISOString(),
  };
  const plan = selectPlanWorkouts([workout], NOW);
  assert.deepEqual(plan.map((w) => w.id), ["midnight"]);
});

test("boundary: workout completed two days ago is excluded", () => {
  // Use a timestamp clearly on a different calendar day in any timezone.
  const twoDaysAgo = NOW - 2 * 24 * 60 * 60 * 1000;
  const workout = {
    id: "two-days-ago",
    completed: true,
    completedAt: new Date(twoDaysAgo).toISOString(),
  };
  const plan = selectPlanWorkouts([workout], NOW);
  assert.deepEqual(plan.map((w) => w.id), []);
});

test("boundary: workout completed one second after midnight (same day)", () => {
  // 2026-10-22T00:00:01Z is the same calendar day as NOW.
  const sameDay = new Date("2026-10-22T00:00:01.000Z").getTime();
  const workout = {
    id: "same-day",
    completed: true,
    completedAt: new Date(sameDay).toISOString(),
  };
  const plan = selectPlanWorkouts([workout], NOW);
  assert.deepEqual(plan.map((w) => w.id), ["same-day"]);
});

test("boundary: mix of today and previous day workouts", () => {
  const todayWorkout = {
    id: "today",
    completed: true,
    completedAt: new Date(NOW).toISOString(),
  };
  const prevWorkout = {
    id: "prev",
    completed: true,
    completedAt: new Date(NOW - 24 * 60 * 60 * 1000).toISOString(),
  };
  const pendingWorkout = { id: "pending", completed: false, completedAt: null };

  const plan = selectPlanWorkouts([todayWorkout, prevWorkout, pendingWorkout], NOW);
  assert.deepEqual(plan.map((w) => w.id), ["today", "pending"]);
});

test("boundary: isSameLocalDay with same instant", () => {
  const ts = NOW;
  assert.equal(isSameLocalDay(new Date(ts).toISOString(), ts), true);
});

test("boundary: isSameLocalDay with one day apart", () => {
  const ts = NOW;
  const oneDayLater = ts + 24 * 60 * 60 * 1000;
  assert.equal(isSameLocalDay(new Date(ts).toISOString(), oneDayLater), false);
});
