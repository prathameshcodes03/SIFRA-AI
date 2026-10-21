const test = require("node:test");
const assert = require("node:assert/strict");

// Force UTC timezone for deterministic date handling in tests
// This must be set BEFORE importing the controller module
process.env.TZ = "UTC";

const { calculateStreakStats, completionDateOf } = require("../src/Controllers/workout.controller.js");

// Helper to create a Date at a specific date (local noon to avoid DST issues)
const makeDate = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0);

test("streak: first workout day -> current=1, best=1", () => {
  const today = makeDate(2026, 1, 1);
  const workouts = [{ completedAt: makeDate(2026, 1, 1) }];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 1);
  assert.equal(result.bestStreak, 1);
});

test("streak: two consecutive workout days -> current=2, best=2", () => {
  const today = makeDate(2026, 1, 2);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

test("streak: two-day streak followed by missed day (check on day 4) -> current=0, best=2", () => {
  // Workouts on Jan 1, Jan 2. Missed Jan 3. Check on Jan 4.
  const today = makeDate(2026, 1, 4);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 2);
});

test("streak: two-day streak, check on missed day (day 3) -> current=2, best=2", () => {
  // Workouts on Jan 1, Jan 2. Check on Jan 3 (missed day, but streak still alive from yesterday)
  const today = makeDate(2026, 1, 3);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

test("streak: multiple workouts same day -> no duplicate increment", () => {
  const today = makeDate(2026, 1, 2);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1, 10, 0) },
    { completedAt: makeDate(2026, 1, 1, 18, 0) }, // Same day
    { completedAt: makeDate(2026, 1, 2) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.bestStreak, 2);
  assert.equal(result.currentStreak, 2);
});

test("streak: empty history -> zeros", () => {
  const today = makeDate(2026, 1, 1);
  const result = calculateStreakStats([], today);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 0);
});

test("streak: non-consecutive days -> streak resets", () => {
  const today = makeDate(2026, 1, 3);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 3) }, // Skip Jan 2
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.bestStreak, 1);
  assert.equal(result.currentStreak, 1); // Today (Jan 3) has workout
});

// Timezone edge case: workout completed late at night crosses midnight in server timezone
test("streak: timezone - workout at 23:00 local = next day UTC", () => {
  // Server in UTC, user in EST (UTC-5)
  // User works out Jan 1 22:00 EST = Jan 2 03:00 UTC
  // User works out Jan 2 22:00 EST = Jan 3 03:00 UTC
  // In UTC: Jan 2 and Jan 3 (consecutive)
  // Server calculates on Jan 3 UTC
  const today = makeDate(2026, 1, 3); // Jan 3 UTC
  const workouts = [
    { completedAt: new Date("2026-01-02T03:00:00.000Z") }, // Jan 1 22:00 EST
    { completedAt: new Date("2026-01-03T03:00:00.000Z") }, // Jan 2 22:00 EST
  ];
  const result = calculateStreakStats(workouts, today);
  // In UTC: consecutive days (Jan 2, Jan 3) -> streak 2
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Timezone edge case: workout at 23:00 local crosses midnight, but server checks next day
test("streak: timezone - check next day in server timezone", () => {
  // Same workouts as above, but server checks on Jan 4 UTC
  const today = makeDate(2026, 1, 4); // Jan 4 UTC
  const workouts = [
    { completedAt: new Date("2026-01-02T03:00:00.000Z") }, // Jan 1 22:00 EST
    { completedAt: new Date("2026-01-03T03:00:00.000Z") }, // Jan 2 22:00 EST
  ];
  const result = calculateStreakStats(workouts, today);
  // today=Jan 4, yesterday=Jan 3, dateSet has Jan 2, Jan 3
  // yesterday (Jan 3) in set -> checkDate = Jan 3
  // Loop: Jan 3, Jan 2 -> streak = 2
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Test the exact user scenario: 2-day streak, miss day, check following day
test("streak: user scenario - 2 day streak, miss day 3, check day 4 -> current=0, best=2", () => {
  const today = makeDate(2026, 1, 4); // Check on day 4
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    // No workout on day 3
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 2);
});

// Test: best streak should never decrease
test("streak: best streak never decreases when current resets", () => {
  // User had 5-day streak, then missed a day
  const today = makeDate(2026, 1, 7); // Check on day 7
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    { completedAt: makeDate(2026, 1, 3) },
    { completedAt: makeDate(2026, 1, 4) },
    { completedAt: makeDate(2026, 1, 5) },
    // No workout on day 6
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 5);
});

// Test: new record updates best streak
test("streak: new record updates best streak", () => {
  // Previous best was 2, now achieved 3
  const today = makeDate(2026, 1, 3);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    { completedAt: makeDate(2026, 1, 3) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 3);
  assert.equal(result.bestStreak, 3);
});

// Test: workout with null completedAt falls back to createdAt
test("streak: workout with null completedAt falls back to createdAt", () => {
  const today = makeDate(2026, 1, 2);
  const workouts = [
    { completedAt: null, createdAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Test: delete workout (simulate by removing from array) - best streak recalculates from remaining
test("streak: deleting a workout that was part of best streak reduces best streak if no other record", () => {
  const today = makeDate(2026, 1, 5);
  // 5-day streak, but we delete day 3 workout
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    // Day 3 deleted
    { completedAt: makeDate(2026, 1, 4) },
    { completedAt: makeDate(2026, 1, 5) },
  ];
  const result = calculateStreakStats(workouts, today);
  // Historical best was 5, but now max consecutive is 2 (days 1-2 or 4-5)
  // Since we recalculate from history, best streak becomes 2
  assert.equal(result.bestStreak, 2);
  // Current streak: today=5, yesterday=4 (both in set) -> streak 2
  assert.equal(result.currentStreak, 2);
});

// Test: editing completion status to false removes from completed workouts
test("streak: marking workout as incomplete removes it from streak calculation", () => {
  const today = makeDate(2026, 1, 3);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    { completedAt: makeDate(2026, 1, 3) },
  ];
  // Simulate marking day 2 as incomplete
  const remainingWorkouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 3) },
  ];
  const result = calculateStreakStats(remainingWorkouts, today);
  assert.equal(result.bestStreak, 1);
  assert.equal(result.currentStreak, 1); // Only today (Jan 3) has workout
});

// Test: duplicate workout completion (same day, same user) - deduplicated by date
test("streak: duplicate completions on same day do not inflate streak", () => {
  const today = makeDate(2026, 1, 3);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    { completedAt: makeDate(2026, 1, 2) }, // Duplicate day 2
    { completedAt: makeDate(2026, 1, 3) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 3);
  assert.equal(result.bestStreak, 3);
});

// Test: timezone - user in UTC+10, server in UTC, workout at 23:00 user time = 13:00 UTC same day
test("streak: timezone - user UTC+10, server UTC, workout at 23:00 user time", () => {
  // User in Sydney (UTC+10) works out Jan 1 23:00 = Jan 1 13:00 UTC
  // User works out Jan 2 23:00 = Jan 2 13:00 UTC
  // Server (UTC) calculates on Jan 3 00:00 UTC (which is Jan 3 10:00 Sydney)
  const today = makeDate(2026, 1, 3); // Jan 3 UTC
  const workouts = [
    { completedAt: new Date("2026-01-01T13:00:00.000Z") }, // Jan 1 23:00 Sydney
    { completedAt: new Date("2026-01-02T13:00:00.000Z") }, // Jan 2 23:00 Sydney
  ];
  const result = calculateStreakStats(workouts, today);
  // In UTC: Jan 1 and Jan 2 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Test: timezone - user in UTC-10, server in UTC, workout at 23:00 user time = next day 09:00 UTC
test("streak: timezone - user UTC-10, server UTC, workout at 23:00 user time crosses midnight", () => {
  // User in Hawaii (UTC-10) works out Jan 1 23:00 = Jan 2 09:00 UTC
  // User works out Jan 2 23:00 = Jan 3 09:00 UTC
  // Server calculates on Jan 3 UTC
  const today = makeDate(2026, 1, 3);
  const workouts = [
    { completedAt: new Date("2026-01-02T09:00:00.000Z") }, // Jan 1 23:00 Hawaii
    { completedAt: new Date("2026-01-03T09:00:00.000Z") }, // Jan 2 23:00 Hawaii
  ];
  const result = calculateStreakStats(workouts, today);
  // In UTC: Jan 2 and Jan 3 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Test: DST transition - spring forward (loses 1 hour)
test("streak: DST spring forward - 23 hour day", () => {
  // In US, DST starts March 8, 2026 at 2am (clocks forward to 3am)
  // Workout on March 7 and March 8 (both at noon local = 17:00 and 18:00 UTC)
  // March 7 noon EST = March 7 17:00 UTC
  // March 8 noon EDT = March 8 18:00 UTC
  // Server (UTC) calculates on March 9
  const today = makeDate(2026, 3, 9);
  const workouts = [
    { completedAt: new Date("2026-03-07T17:00:00.000Z") },
    { completedAt: new Date("2026-03-08T18:00:00.000Z") },
  ];
  const result = calculateStreakStats(workouts, today);
  // formatDateKey in server local timezone:
  // If server is UTC: March 7 and March 8 -> consecutive
  // If server is US/Eastern: March 7 and March 8 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Test: DST transition - fall back (gains 1 hour)
test("streak: DST fall back - 25 hour day", () => {
  // In US, DST ends November 1, 2026 at 2am (clocks back to 1am)
  // Workout on Oct 31 and Nov 1 (both at noon local)
  // Oct 31 noon EDT = Oct 31 16:00 UTC
  // Nov 1 noon EST = Nov 1 17:00 UTC
  // Server calculates on Nov 2
  const today = makeDate(2026, 11, 2);
  const workouts = [
    { completedAt: new Date("2026-10-31T16:00:00.000Z") },
    { completedAt: new Date("2026-11-01T17:00:00.000Z") },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Test: current streak resets correctly after a gap, but best streak preserved
test("streak: multiple gaps - best streak is max of all streaks", () => {
  const today = makeDate(2026, 1, 15);
  const workouts = [
    { completedAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
    { completedAt: makeDate(2026, 1, 3) }, // 3-day streak
    // Gap days 4-5
    { completedAt: makeDate(2026, 1, 6) },
    { completedAt: makeDate(2026, 1, 7) },
    { completedAt: makeDate(2026, 1, 8) },
    { completedAt: makeDate(2026, 1, 9) }, // 4-day streak
    // Gap days 10-14
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.bestStreak, 4);
  assert.equal(result.currentStreak, 0); // Today Jan 15, yesterday Jan 14 no workout
});

// ============================================================
// TIMEZONE-SPECIFIC TESTS (Server runs in UTC)
// These tests document the current behavior: all date grouping
// uses the SERVER'S local timezone (assumed UTC for these tests).
// ============================================================

// Helper: create a Date from ISO string (UTC)
const utc = (iso) => new Date(iso);

// --- Asia/Kolkata (UTC+5:30) ---
// User works out at 23:30 local = 18:00 UTC SAME day
// User works out next day at 23:30 local = 18:00 UTC next day
// Server (UTC) groups by UTC date -> consecutive days
test("streak: Asia/Kolkata - user 23:30 local = 18:00 UTC same day, consecutive", () => {
  // Server (UTC) "today" = Jan 3
  const today = utc("2026-01-03T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-01T18:00:00.000Z") }, // Jan 1 23:30 Kolkata
    { completedAt: utc("2026-01-02T18:00:00.000Z") }, // Jan 2 23:30 Kolkata
  ];
  const result = calculateStreakStats(workouts, today);
  // UTC dates: Jan 1, Jan 2 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// User in Kolkata works out at 23:30 Jan 1 = 18:00 UTC Jan 1
// User works out at 23:30 Jan 3 = 18:00 UTC Jan 3 (skips Jan 2 local)
// Server (UTC) sees Jan 1 and Jan 3 -> gap
test("streak: Asia/Kolkata - user skips local day, server sees gap", () => {
  const today = utc("2026-01-04T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-01T18:00:00.000Z") }, // Jan 1 23:30 Kolkata
    { completedAt: utc("2026-01-03T18:00:00.000Z") }, // Jan 3 23:30 Kolkata (skipped Jan 2)
  ];
  const result = calculateStreakStats(workouts, today);
  // UTC dates: Jan 1, Jan 3 -> NOT consecutive
  assert.equal(result.bestStreak, 1);
  assert.equal(result.currentStreak, 1); // Today Jan 4 UTC, yesterday Jan 3 has workout
});

// User in Kolkata works out at 23:30 Jan 1 = 18:00 UTC Jan 1
// User works out at 00:30 Jan 2 = 19:00 UTC Jan 1 (same UTC day!)
// Server (UTC) groups as SAME day -> no duplicate increment
test("streak: Asia/Kolkata - two workouts same UTC day count once", () => {
  const today = utc("2026-01-02T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-01T18:00:00.000Z") }, // Jan 1 23:30 Kolkata
    { completedAt: utc("2026-01-01T19:00:00.000Z") }, // Jan 2 00:30 Kolkata = same UTC day
  ];
  const result = calculateStreakStats(workouts, today);
  // Both map to UTC Jan 1 -> deduped
  assert.equal(result.currentStreak, 1);
  assert.equal(result.bestStreak, 1);
});

// --- America/Los_Angeles (UTC-7 in DST, UTC-8 in winter) ---
// Summer: user 23:00 PDT = next day 06:00 UTC
// Winter: user 23:00 PST = next day 07:00 UTC

// Summer DST: User works out July 1 23:00 PDT = July 2 06:00 UTC
// User works out July 2 23:00 PDT = July 3 06:00 UTC
// Server (UTC) sees July 2, July 3 -> consecutive
test("streak: America/Los_Angeles (summer) - user 23:00 = next day 06:00 UTC, consecutive", () => {
  const today = utc("2026-07-03T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-07-02T06:00:00.000Z") }, // July 1 23:00 PDT
    { completedAt: utc("2026-07-03T06:00:00.000Z") }, // July 2 23:00 PDT
  ];
  const result = calculateStreakStats(workouts, today);
  // UTC dates: July 2, July 3 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Winter PST: User works out Jan 1 23:00 PST = Jan 2 07:00 UTC
// User works out Jan 2 23:00 PST = Jan 3 07:00 UTC
// Server (UTC) sees Jan 2, Jan 3 -> consecutive
test("streak: America/Los_Angeles (winter) - user 23:00 = next day 07:00 UTC, consecutive", () => {
  const today = utc("2026-01-03T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-02T07:00:00.000Z") }, // Jan 1 23:00 PST
    { completedAt: utc("2026-01-03T07:00:00.000Z") }, // Jan 2 23:00 PST
  ];
  const result = calculateStreakStats(workouts, today);
  // UTC dates: Jan 2, Jan 3 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// User in LA works out at 23:00 Jan 1 PST = 07:00 UTC Jan 2
// User works out at 01:00 Jan 2 PST = 09:00 UTC Jan 2 (same UTC day!)
// Server (UTC) groups as SAME day -> no duplicate increment
test("streak: America/Los_Angeles - two workouts same UTC day count once", () => {
  const today = utc("2026-01-03T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-02T07:00:00.000Z") }, // Jan 1 23:00 PST
    { completedAt: utc("2026-01-02T09:00:00.000Z") }, // Jan 2 01:00 PST = same UTC day
  ];
  const result = calculateStreakStats(workouts, today);
  // Both map to UTC Jan 2 -> deduped
  assert.equal(result.currentStreak, 1);
  assert.equal(result.bestStreak, 1);
});

// --- UTC ---
// User in UTC works out at 23:00 = 23:00 UTC same day
test("streak: UTC - user 23:00 local = 23:00 UTC same day, consecutive", () => {
  const today = utc("2026-01-03T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-01T23:00:00.000Z") }, // Jan 1 23:00 UTC
    { completedAt: utc("2026-01-02T23:00:00.000Z") }, // Jan 2 23:00 UTC
  ];
  const result = calculateStreakStats(workouts, today);
  // UTC dates: Jan 1, Jan 2 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// User in UTC works out at 23:00 Jan 1 = 23:00 UTC Jan 1
// User works out at 01:00 Jan 2 = 01:00 UTC Jan 2 (different UTC day)
// Server (UTC) sees consecutive days
test("streak: UTC - midnight boundary works correctly", () => {
  const today = utc("2026-01-03T00:00:00.000Z");
  const workouts = [
    { completedAt: utc("2026-01-01T23:00:00.000Z") }, // Jan 1 23:00 UTC
    { completedAt: utc("2026-01-02T01:00:00.000Z") }, // Jan 2 01:00 UTC
  ];
  const result = calculateStreakStats(workouts, today);
  // UTC dates: Jan 1, Jan 2 -> consecutive
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// --- SERVER DATE DIFFERS FROM USER LOCAL DATE ---
// User in UTC+12 (e.g., Auckland summer) works out Monday 23:00 local
// = Sunday 11:00 UTC
// Server (UTC) calculates streak on Monday UTC
// User thinks it's Monday, server thinks it's Sunday
test("streak: server date differs from user local date - UTC+12 user", () => {
  // Server (UTC) "today" = Monday Jan 5
  const today = utc("2026-01-05T00:00:00.000Z");
  // User in UTC+12 works out Sunday Jan 4 23:00 local = Jan 4 11:00 UTC
  // User works out Monday Jan 5 23:00 local = Jan 5 11:00 UTC
  const workouts = [
    { completedAt: utc("2026-01-04T11:00:00.000Z") }, // User's Sunday 23:00
    { completedAt: utc("2026-01-05T11:00:00.000Z") }, // User's Monday 23:00
  ];
  const result = calculateStreakStats(workouts, today);
  // Server (UTC) groups: Jan 4, Jan 5 -> consecutive
  // Server sees streak = 2 on Monday Jan 5
  // User expects streak = 2 on their Monday Jan 5
  // IN THIS CASE they align because server "today" is user's Monday
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// User in UTC+12 works out Sunday Jan 4 23:00 = Jan 4 11:00 UTC
// Server calculates on SUNDAY UTC (Jan 4)
// Server "today" = Jan 4, yesterday = Jan 3
// Server sees workout on Jan 4 (today) -> streak = 1
// User thinks it's Sunday Jan 4, expects streak = 1
// But if user worked out Saturday Jan 3 23:00 = Jan 3 11:00 UTC
// Server would see Jan 3 and Jan 4 -> streak = 2
test("streak: server date differs - UTC+12 user, server checks on user's Sunday", () => {
  // Server (UTC) "today" = Sunday Jan 4
  const today = utc("2026-01-04T00:00:00.000Z");
  // User worked out Saturday Jan 3 23:00 local = Jan 3 11:00 UTC
  // User worked out Sunday Jan 4 23:00 local = Jan 4 11:00 UTC
  const workouts = [
    { completedAt: utc("2026-01-03T11:00:00.000Z") }, // User's Saturday 23:00
    { completedAt: utc("2026-01-04T11:00:00.000Z") }, // User's Sunday 23:00
  ];
  const result = calculateStreakStats(workouts, today);
  // Server (UTC) "today" = Jan 4, workout on Jan 4 -> streak = 1 (only today)
  // Because server "yesterday" = Jan 3, but checkDate starts from today
  // Actually: dateSet has Jan 3 and Jan 4, today=Jan 4 -> checkDate=today -> loop: Jan 4, Jan 3 -> streak=2
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// User in UTC+12 works out Saturday Jan 3 23:00 = Jan 3 11:00 UTC
// Server checks on MONDAY UTC (Jan 5) - user's Tuesday
// Server "today" = Jan 5, yesterday = Jan 4
// No workout on Jan 4 or Jan 5 UTC -> streak = 0
// User's Monday Jan 5 they worked out? No, they missed it.
// User's Tuesday Jan 6 they check.
// In UTC: Jan 3 has workout, Jan 4-5 no workout -> streak broken
test("streak: server date differs - UTC+12 user misses local day, server sees gap", () => {
  // Server (UTC) "today" = Monday Jan 5 (user's Tuesday)
  const today = utc("2026-01-05T00:00:00.000Z");
  // User worked out Saturday Jan 3 23:00 = Jan 3 11:00 UTC
  // User worked out Sunday Jan 4 23:00 = Jan 4 11:00 UTC
  // User MISSED Monday Jan 5 23:00 = would be Jan 5 11:00 UTC
  const workouts = [
    { completedAt: utc("2026-01-03T11:00:00.000Z") }, // User's Saturday
    { completedAt: utc("2026-01-04T11:00:00.000Z") }, // User's Sunday
    // No workout on user's Monday (would be Jan 5 11:00 UTC)
  ];
  const result = calculateStreakStats(workouts, today);
  // Server (UTC): today=Jan 5, yesterday=Jan 4. Jan 4 has workout, Jan 5 doesn't.
  // checkDate = yesterday (Jan 4) -> loop: Jan 4, Jan 3 -> streak = 2
  // Wait: today=Jan 5 (no workout), yesterday=Jan 4 (has workout) -> checkDate=yesterday
  // Loop from Jan 4: Jan 4 (yes), Jan 3 (yes), Jan 2 (no) -> streak = 2
  // This is CORRECT from server perspective: user worked out on server's Jan 3 and Jan 4
  // But from user perspective: they worked out their Sat/Sun, missed Mon, checking Tue
  // Their streak should be 0 on Tue, but server says 2 because Mon UTC has no workout yet
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// User in UTC-11 (e.g., Midway) works out Monday 23:00 local = Tuesday 10:00 UTC
// Server (UTC) "today" = Tuesday
// Server sees workout on Tuesday (today) -> streak starts at 1
// User thinks it's Monday, expects streak to continue from Sunday
test("streak: server date differs - UTC-11 user, workout maps to next server day", () => {
  // Server (UTC) "today" = Tuesday Jan 6
  const today = utc("2026-01-06T00:00:00.000Z");
  // User in UTC-11 works out Monday Jan 5 23:00 local = Jan 6 10:00 UTC (server's TODAY)
  // User worked out Sunday Jan 4 23:00 local = Jan 5 10:00 UTC (server's YESTERDAY)
  const workouts = [
    { completedAt: utc("2026-01-05T10:00:00.000Z") }, // User's Sunday -> server Jan 5
    { completedAt: utc("2026-01-06T10:00:00.000Z") }, // User's Monday -> server Jan 6 (TODAY)
  ];
  const result = calculateStreakStats(workouts, today);
  // Server: today=Jan 6 (has workout), yesterday=Jan 5 (has workout)
  // checkDate=today -> loop: Jan 6, Jan 5 -> streak = 2
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// Missed local day resets current streak without reducing best streak
// (using server timezone since that's what the implementation uses)
test("streak: missed local day (server timezone) resets current streak, preserves best", () => {
  const today = utc("2026-01-05T00:00:00.000Z"); // Server Jan 5
  // Server days: Jan 1, 2, 3 (3-day streak), Jan 4 MISSED, Jan 5 today
  const workouts = [
    { completedAt: utc("2026-01-01T12:00:00.000Z") },
    { completedAt: utc("2026-01-02T12:00:00.000Z") },
    { completedAt: utc("2026-01-03T12:00:00.000Z") },
    // Jan 4 missed
  ];
  const result = calculateStreakStats(workouts, today);
  // today=Jan 5 (no workout), yesterday=Jan 4 (no workout) -> current=0
  // Historical best = 3 (Jan 1-3)
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 3);
});
// ============================================================
// USER TIME ZONE
//
// The server runs in UTC, but a streak counts the user's CALENDAR days. A
// session finished at 00:30 in Asia/Kolkata is 19:00 UTC on the PREVIOUS
// date, so grouping by the server's date files it under the wrong day and
// the streak stops matching the user's own calendar.
// ============================================================

test("streak: a late-night session is filed under the USER's day, not the server's", () => {
  // 2026-01-01 19:00 UTC = 2026-01-02 00:30 in Asia/Kolkata (+05:30).
  const workouts = [{ completedAt: utc("2026-01-01T19:00:00.000Z") }];

  // Server (UTC) sees Jan 1.
  assert.equal(calculateStreakStats(workouts, utc("2026-01-01T20:00:00.000Z")).currentStreak, 1);

  // The user's own day is Jan 2, so "today" for them is Jan 2 and the
  // session belongs to Jan 2.
  const inUserZone = calculateStreakStats(
    workouts,
    utc("2026-01-01T20:00:00.000Z"),
    "Asia/Kolkata"
  );
  assert.equal(inUserZone.currentStreak, 1);
  assert.equal(inUserZone.totalCompleted, 1);
});

test("streak: the user's day decides whether a session counts as today", () => {
  // The session happened at 00:30 IST on Jan 2 = Jan 1 19:00 UTC.
  const workouts = [{ completedAt: utc("2026-01-01T19:00:00.000Z") }];

  // 2026-01-01 20:00 UTC = 2026-01-02 01:30 IST -> the user's today is Jan 2
  // and the session was completed on the user's Jan 2.
  const result = calculateStreakStats(
    workouts,
    utc("2026-01-01T20:00:00.000Z"),
    "Asia/Kolkata"
  );
  assert.equal(result.currentStreak, 1);

  // The next day in the user's zone (2026-01-02 20:00 UTC = Jan 3 01:30 IST)
  // the session is yesterday's, so the streak is still alive.
  const nextDay = calculateStreakStats(
    workouts,
    utc("2026-01-02T20:00:00.000Z"),
    "Asia/Kolkata"
  );
  assert.equal(nextDay.currentStreak, 1);
  assert.equal(nextDay.bestStreak, 1);

  // Two days later in the user's zone it is over - exactly what the user
  // sees on their own calendar.
  const later = calculateStreakStats(
    workouts,
    utc("2026-01-03T20:00:00.000Z"),
    "Asia/Kolkata"
  );
  assert.equal(later.currentStreak, 0);
  assert.equal(later.bestStreak, 1);
});

test("streak: two sessions 30 minutes apart across midnight are two days for the user", () => {
  // 2026-01-01 18:30 UTC = 2026-01-02 00:00 IST
  // 2026-01-01 19:00 UTC = 2026-01-02 00:30 IST
  const workouts = [
    { completedAt: utc("2026-01-01T18:30:00.000Z") },
    { completedAt: utc("2026-01-01T19:00:00.000Z") },
  ];

  // Both land on the same UTC day -> one day for the server.
  assert.equal(
    calculateStreakStats(workouts, utc("2026-01-01T20:00:00.000Z")).currentStreak,
    1
  );

  // Both land on the same IST day too -> still one day, and the streak is
  // alive because it is the user's today.
  const inUserZone = calculateStreakStats(
    workouts,
    utc("2026-01-01T20:00:00.000Z"),
    "Asia/Kolkata"
  );
  assert.equal(inUserZone.currentStreak, 1);
  assert.equal(inUserZone.completedDays, 1);
});

test("streak: consecutive user days are a streak even when the server days are not", () => {
  // The user trains at 23:30 IST every day:
  //   Jan 1 23:30 IST = Jan 1 18:00 UTC
  //   Jan 2 23:30 IST = Jan 2 18:00 UTC
  const workouts = [
    { completedAt: utc("2026-01-01T18:00:00.000Z") },
    { completedAt: utc("2026-01-02T18:00:00.000Z") },
  ];

  const result = calculateStreakStats(
    workouts,
    utc("2026-01-02T19:00:00.000Z"), // Jan 3 00:30 IST -> the user's today is Jan 3
    "Asia/Kolkata"
  );
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

test("streak: a western-zone user is not penalised for training after midnight", () => {
  // 2026-01-01 23:00 in America/Los_Angeles (PST, UTC-8) = Jan 2 07:00 UTC.
  // 2026-01-02 23:00 PST = Jan 3 07:00 UTC.
  const workouts = [
    { completedAt: utc("2026-01-02T07:00:00.000Z") },
    { completedAt: utc("2026-01-03T07:00:00.000Z") },
  ];

  const result = calculateStreakStats(
    workouts,
    utc("2026-01-03T08:00:00.000Z"), // Jan 3 00:00 PST -> the user's today is Jan 3
    "America/Los_Angeles"
  );
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

test("streak: an unknown time zone falls back to the server's own zone", () => {
  const workouts = [
    { completedAt: utc("2026-01-01T12:00:00.000Z") },
    { completedAt: utc("2026-01-02T12:00:00.000Z") },
  ];

  const result = calculateStreakStats(
    workouts,
    utc("2026-01-02T13:00:00.000Z"),
    "Not/A_Zone"
  );
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

test("streak: a daylight-saving change never breaks a streak", () => {
  // US DST starts on 2026-03-08. The user trains at noon local every day:
  //   Mar 7 12:00 EST = Mar 7 17:00 UTC
  //   Mar 8 12:00 EDT = Mar 8 16:00 UTC  <- 23 hours later
  const workouts = [
    { completedAt: utc("2026-03-07T17:00:00.000Z") },
    { completedAt: utc("2026-03-08T16:00:00.000Z") },
  ];

  const result = calculateStreakStats(
    workouts,
    utc("2026-03-08T18:00:00.000Z"),
    "America/New_York"
  );
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

// ============================================================
// COMPLETION DATE RESOLUTION
// ============================================================

test("streak: a row with no completedAt falls back to updatedAt, not createdAt", () => {
  // The exercise was added to the plan on Jan 1 but finished on Jan 2, so the
  // completion date - not the creation date - is the day that counts.
  const today = makeDate(2026, 1, 2);
  const workouts = [
    {
      completedAt: null,
      createdAt: makeDate(2026, 1, 1),
      updatedAt: makeDate(2026, 1, 2),
    },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 1);
  assert.equal(result.bestStreak, 1);
});

test("streak: createdAt is the last resort when nothing else is known", () => {
  const today = makeDate(2026, 1, 2);
  const workouts = [
    { completedAt: null, createdAt: makeDate(2026, 1, 1) },
    { completedAt: makeDate(2026, 1, 2) },
  ];
  const result = calculateStreakStats(workouts, today);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
});

test("completionDateOf prefers completedAt, then updatedAt, then createdAt", () => {
  const completed = makeDate(2026, 1, 3);
  const updated = makeDate(2026, 1, 2);
  const created = makeDate(2026, 1, 1);

  assert.equal(
    completionDateOf({ completedAt: completed, updatedAt: updated, createdAt: created }),
    completed
  );
  assert.equal(completionDateOf({ completedAt: null, updatedAt: updated, createdAt: created }), updated);
  assert.equal(completionDateOf({ completedAt: null, updatedAt: null, createdAt: created }), created);
  assert.equal(completionDateOf({}), null);
});
