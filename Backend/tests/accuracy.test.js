const test = require("node:test");
const assert = require("node:assert/strict");

const {
  summariseAccuracy,
  normaliseCounts,
} = require("../src/Controllers/workout.controller.js");

test("no prediction data yields an honest empty state, not a fake score", () => {
  const result = summariseAccuracy([]);

  assert.equal(result.accuracy, null);
  assert.equal(result.hasAccuracyData, false);
  assert.equal(result.totalPredictions, 0);
  assert.equal(result.correctPredictions, 0);
});

test("workouts with zero predictions are excluded, not scored as wrong", () => {
  // A session where the ML service was unreachable contributes 0 valid
  // predictions and must not drag accuracy down.
  const result = summariseAccuracy([
    { totalPredictions: 10, correctPredictions: 8 },
    { totalPredictions: 0, correctPredictions: 0 },
  ]);

  assert.equal(result.totalPredictions, 10);
  assert.equal(result.accuracy, 80);
});

test("8 correct out of 10 valid predictions is 80%", () => {
  const result = summariseAccuracy([
    { totalPredictions: 10, correctPredictions: 8 },
  ]);
  assert.equal(result.accuracy, 80);
});

test("accuracy aggregates across multiple workouts", () => {
  const result = summariseAccuracy([
    { totalPredictions: 10, correctPredictions: 8 },
    { totalPredictions: 30, correctPredictions: 21 },
  ]);

  assert.equal(result.totalPredictions, 40);
  assert.equal(result.correctPredictions, 29);
  // 29/40 = 72.5% -> 73
  assert.equal(result.accuracy, 73);
});

test("all-correct yields 100", () => {
  const result = summariseAccuracy([
    { totalPredictions: 25, correctPredictions: 25 },
  ]);
  assert.equal(result.accuracy, 100);
});

test("none-correct yields 0 but still counts as real data", () => {
  const result = summariseAccuracy([
    { totalPredictions: 12, correctPredictions: 0 },
  ]);
  assert.equal(result.accuracy, 0);
  assert.equal(result.hasAccuracyData, true);
});

test("missing or malformed counters are ignored", () => {
  const result = summariseAccuracy([
    {},
    { totalPredictions: null, correctPredictions: null },
    { totalPredictions: undefined, correctPredictions: undefined },
    { totalPredictions: "abc", correctPredictions: "xyz" },
  ]);

  assert.equal(result.hasAccuracyData, false);
  assert.equal(result.accuracy, null);
});

test("a client cannot report more correct than total predictions", () => {
  const result = summariseAccuracy([
    { totalPredictions: 10, correctPredictions: 99 },
  ]);

  assert.equal(result.correctPredictions, 10);
  assert.equal(result.accuracy, 100);
});

test("negative counters are rejected", () => {
  const result = summariseAccuracy([
    { totalPredictions: 10, correctPredictions: -5 },
  ]);
  assert.equal(result.correctPredictions, 0);
});

test("normaliseCounts clamps hostile payloads", () => {
  assert.deepEqual(normaliseCounts(10, 4), {
    totalPredictions: 10,
    correctPredictions: 4,
  });

  assert.deepEqual(normaliseCounts("12", "7"), {
    totalPredictions: 12,
    correctPredictions: 7,
  });

  // correct > total is clamped
  assert.deepEqual(normaliseCounts(5, 50), {
    totalPredictions: 5,
    correctPredictions: 5,
  });

  // negative / non-numeric fall back to zero
  assert.deepEqual(normaliseCounts(-3, -1), {
    totalPredictions: 0,
    correctPredictions: 0,
  });

  assert.deepEqual(normaliseCounts(undefined, undefined), {
    totalPredictions: 0,
    correctPredictions: 0,
  });

  assert.deepEqual(normaliseCounts("abc", "def"), {
    totalPredictions: 0,
    correctPredictions: 0,
  });
});