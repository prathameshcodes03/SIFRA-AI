import test from "node:test";
import assert from "node:assert/strict";

// ── RecentSessions logic ──
// Mirrors the filtering/sorting in RecentSessions.jsx
function getRecentSessions(workouts, limit = 5) {
  return (workouts || [])
    .filter((w) => w && w.completed)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.completedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);
}

test("RecentSessions: displays only completed workouts", () => {
  const workouts = [
    { id: "1", exercise: "squat", completed: true, completedAt: "2026-01-03T10:00:00Z", sets: 3, reps: 10 },
    { id: "2", exercise: "pushup", completed: false, createdAt: "2026-01-02T10:00:00Z", sets: 3, reps: 10 },
    { id: "3", exercise: "plank", completed: true, completedAt: "2026-01-01T10:00:00Z", sets: 3, reps: 10 },
  ];
  const result = getRecentSessions(workouts);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "1");
  assert.equal(result[1].id, "3");
});

test("RecentSessions: sorts by completedAt descending", () => {
  const workouts = [
    { id: "a", exercise: "squat", completed: true, completedAt: "2026-01-01T10:00:00Z" },
    { id: "b", exercise: "pushup", completed: true, completedAt: "2026-01-03T10:00:00Z" },
    { id: "c", exercise: "plank", completed: true, completedAt: "2026-01-02T10:00:00Z" },
  ];
  const result = getRecentSessions(workouts);
  assert.equal(result[0].id, "b");
  assert.equal(result[1].id, "c");
  assert.equal(result[2].id, "a");
});

test("RecentSessions: limits to 5 most recent", () => {
  const workouts = Array.from({ length: 8 }, (_, i) => ({
    id: `w${i}`,
    exercise: "squat",
    completed: true,
    completedAt: new Date(2026, 0, i + 1).toISOString(),
  }));
  const result = getRecentSessions(workouts);
  assert.equal(result.length, 5);
});

test("RecentSessions: handles empty list", () => {
  assert.deepEqual(getRecentSessions([]), []);
  assert.deepEqual(getRecentSessions(null), []);
  assert.deepEqual(getRecentSessions(undefined), []);
});

test("RecentSessions: handles missing completedAt (falls back to createdAt)", () => {
  const workouts = [
    { id: "1", exercise: "squat", completed: true, createdAt: "2026-01-02T10:00:00Z" },
    { id: "2", exercise: "pushup", completed: true, completedAt: "2026-01-03T10:00:00Z" },
  ];
  const result = getRecentSessions(workouts);
  assert.equal(result[0].id, "2");
  assert.equal(result[1].id, "1");
});

test("RecentSessions: accuracy shown only when valid", () => {
  const workouts = [
    { id: "1", exercise: "squat", completed: true, completedAt: "2026-01-03T10:00:00Z", accuracy: 87.5 },
    { id: "2", exercise: "pushup", completed: true, completedAt: "2026-01-02T10:00:00Z", accuracy: null },
    { id: "3", exercise: "plank", completed: true, completedAt: "2026-01-01T10:00:00Z" },
  ];
  const result = getRecentSessions(workouts);
  assert.equal(result[0].accuracy, 87.5);
  assert.equal(result[1].accuracy, null);
  assert.equal(result[2].accuracy, undefined);
});

// ── WeeklyActivity logic ──
function getWeekDays(referenceDate = new Date()) {
  const now = referenceDate;
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getActiveDays(workouts, referenceDate = new Date()) {
  const weekDays = getWeekDays(referenceDate);
  return weekDays.map((day) => {
    const hasWorkout = (workouts || []).some((w) => {
      if (!w || !w.completed) return false;
      const completedDate = new Date(w.completedAt || w.createdAt);
      return isSameDay(completedDate, day);
    });
    return { date: day, active: hasWorkout };
  });
}

test("WeeklyActivity: Monday is first day of week", () => {
  // Wednesday Jan 7, 2026
  const ref = new Date(2026, 0, 7);
  const days = getWeekDays(ref);
  assert.equal(days[0].getDay(), 1); // Monday
  assert.equal(days[6].getDay(), 0); // Sunday
});

test("WeeklyActivity: highlights completed workout days", () => {
  const ref = new Date(2026, 0, 7); // Wednesday
  const workouts = [
    { id: "1", completed: true, completedAt: new Date(2026, 0, 5).toISOString() }, // Monday
    { id: "2", completed: true, completedAt: new Date(2026, 0, 7).toISOString() }, // Wednesday
  ];
  const active = getActiveDays(workouts, ref);
  assert.equal(active[0].active, true);  // Monday
  assert.equal(active[1].active, false); // Tuesday
  assert.equal(active[2].active, true);  // Wednesday
});

test("WeeklyActivity: excludes incomplete workouts", () => {
  const ref = new Date(2026, 0, 7);
  const workouts = [
    { id: "1", completed: false, completedAt: new Date(2026, 0, 5).toISOString() },
  ];
  const active = getActiveDays(workouts, ref);
  assert.equal(active[0].active, false);
});

test("WeeklyActivity: handles empty list", () => {
  const ref = new Date(2026, 0, 7);
  const active = getActiveDays([], ref);
  assert.equal(active.length, 7);
  assert.ok(active.every((d) => d.active === false));
});

test("WeeklyActivity: no double-counting same day", () => {
  const ref = new Date(2026, 0, 7);
  const workouts = [
    { id: "1", completed: true, completedAt: new Date(2026, 0, 5, 10, 0).toISOString() },
    { id: "2", completed: true, completedAt: new Date(2026, 0, 5, 14, 0).toISOString() },
  ];
  const active = getActiveDays(workouts, ref);
  assert.equal(active[0].active, true);
  assert.equal(active.filter((d) => d.active).length, 1);
});

// ── ContinueWorkout logic ──
import { selectPlanWorkouts } from "../src/exercises/workoutPlan.js";

function getNextExercise(workouts) {
  const plan = selectPlanWorkouts(workouts || []);
  return plan.find((w) => !w.completed) || null;
}

test("ContinueWorkout: finds next pending exercise", () => {
  const workouts = [
    { id: "1", exercise: "squat", completed: true, completedAt: new Date().toISOString(), sets: 3, reps: 10 },
    { id: "2", exercise: "pushup", completed: false, createdAt: new Date().toISOString(), sets: 3, reps: 15 },
  ];
  const next = getNextExercise(workouts);
  assert.equal(next.id, "2");
  assert.equal(next.exercise, "pushup");
});

test("ContinueWorkout: returns null when all complete", () => {
  const workouts = [
    { id: "1", exercise: "squat", completed: true, completedAt: new Date().toISOString(), sets: 3, reps: 10 },
  ];
  const next = getNextExercise(workouts);
  assert.equal(next, null);
});

test("ContinueWorkout: returns null for empty plan", () => {
  assert.equal(getNextExercise([]), null);
  assert.equal(getNextExercise(null), null);
});

test("ContinueWorkout: route params are correct", () => {
  const next = { id: "abc", exercise: "Pushup", sets: 3, reps: 15 };
  const route = `/Workout?exercise=${encodeURIComponent(next.exercise.toLowerCase())}&workoutId=${next.id}&sets=${next.sets}&reps=${next.reps}`;
  assert.equal(route, "/Workout?exercise=pushup&workoutId=abc&sets=3&reps=15");
});