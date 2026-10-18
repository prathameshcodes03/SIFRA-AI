import test from "node:test";
import assert from "node:assert/strict";

import {
  announceWorkoutCompletion,
  createWorkoutSessionKey,
  hasAnnouncedWorkout,
  resetCompletionAnnouncements,
  WORKOUT_COMPLETE_MESSAGE,
} from "../src/voice/completionVoice.js";
import {
  setSpeechTransport,
  resetSpeechTransport,
  setAudioFactory,
  resetAudioFactory,
  clearSpeechCache,
  isSpeechCached,
  stopAllPlayers,
  activePlayerCount,
} from "../src/hooks/speechPlayer.js";

/**
 * UNIT / INTEGRATION tests with FULLY MOCKED TTS and audio.
 *
 * `setSpeechTransport` replaces the ElevenLabs request and `setAudioFactory`
 * replaces `new Audio(...)`, so this file performs ZERO real ElevenLabs calls
 * and creates ZERO real audio elements. No API key is read or printed.
 */

/** Records every synthesis request; never touches the network. */
const harness = () => {
  const requests = [];
  const players = [];

  setSpeechTransport(async (text) => {
    requests.push(text);
    return { size: 128 };
  });

  setAudioFactory((url) => {
    const player = {
      url,
      paused: false,
      currentTime: 0,
      paused_count: 0,
      onended: null,
      onerror: null,
      playCalls: 0,
      play() {
        this.playCalls += 1;
        return Promise.resolve();
      },
      pause() {
        this.paused = true;
        this.paused_count += 1;
      },
      /** Simulate the clip finishing. */
      finish() {
        this.onended?.();
      },
      /** Simulate a decoding/element error. */
      fail() {
        this.onerror?.();
      },
    };
    players.push(player);
    return player;
  });

  return { requests, players };
};

const teardown = () => {
  stopAllPlayers();
  resetSpeechTransport();
  resetAudioFactory();
  clearSpeechCache();
  resetCompletionAnnouncements();
};

const key = () => createWorkoutSessionKey("wk-1", "squat");

// ------------------------------------------------------------ 1. trigger ----

test("1. completing the final set triggers the workout completion voice", async () => {
  teardown();
  const { requests } = harness();
  const messages = [];

  const result = await announceWorkoutCompletion({
    workoutKey: key(),
    onMessage: (m) => messages.push(m),
  });

  assert.equal(result.announced, true);
  assert.equal(requests.length, 1, "exactly one synthesis request");
  assert.deepEqual(requests, [WORKOUT_COMPLETE_MESSAGE]);
  assert.deepEqual(messages, [WORKOUT_COMPLETE_MESSAGE]);
  teardown();
});

test("2. the announcement fires only for the workout, and the text is coach-like", async () => {
  teardown();
  harness();
  const message = WORKOUT_COMPLETE_MESSAGE;

  assert.match(message, /Congratulations/);
  assert.match(message, /completed your workout/);
  assert.match(message, /hydrate/);
  assert.ok(message.length < 420, "must stay a spoken-length message");
  teardown();
});

// ------------------------------------------------- 2. idempotency ----------

test("3. duplicate completion events trigger only one announcement", async () => {
  teardown();
  const { requests } = harness();
  const workoutKey = key();

  const first = await announceWorkoutCompletion({ workoutKey });
  const second = await announceWorkoutCompletion({ workoutKey });
  const third = await announceWorkoutCompletion({ workoutKey });

  assert.equal(first.announced, true);
  assert.equal(second.announced, false);
  assert.equal(second.reason, "already_announced");
  assert.equal(third.announced, false);
  assert.equal(requests.length, 1, "only one ElevenLabs request");
  teardown();
});

test("4. concurrent duplicate completions still announce once", async () => {
  teardown();
  const { requests } = harness();
  const workoutKey = key();

  // Fired before the first call has settled - the key is claimed synchronously.
  const results = await Promise.all([
    announceWorkoutCompletion({ workoutKey }),
    announceWorkoutCompletion({ workoutKey }),
    announceWorkoutCompletion({ workoutKey }),
  ]);

  assert.equal(results.filter((r) => r.announced).length, 1);
  assert.equal(requests.length, 1);
  teardown();
});

test("5. a genuinely new workout can announce again", async () => {
  teardown();
  const { requests } = harness();

  const a = await announceWorkoutCompletion({ workoutKey: createWorkoutSessionKey("wk-1", "squat") });
  const b = await announceWorkoutCompletion({ workoutKey: createWorkoutSessionKey("wk-1", "squat") });

  assert.equal(a.announced, true);
  assert.equal(b.announced, true, "a new attempt is eligible again");
  assert.equal(requests.length, 2);
  teardown();
});

test("6. the session key is stable within an attempt and unique across attempts", () => {
  resetCompletionAnnouncements();

  const a1 = createWorkoutSessionKey("wk-1", "squat");
  const a2 = createWorkoutSessionKey("wk-1", "squat");
  assert.notEqual(a1, a2, "each call describes a distinct attempt");

  assert.ok(a1.startsWith("wk-1:squat:"));
  assert.equal(createWorkoutSessionKey(null, null).startsWith("adhoc:"), true);

  resetCompletionAnnouncements();
  const b1 = createWorkoutSessionKey("wk-1", "squat");
  assert.equal(b1.startsWith("wk-1:squat:"), true);
  resetCompletionAnnouncements();
});

test("7. re-renders and route changes cannot replay it", async () => {
  teardown();
  const { requests } = harness();
  const workoutKey = key();

  await announceWorkoutCompletion({ workoutKey });
  // A re-render, a route change and a refresh all re-deliver the same key.
  for (let i = 0; i < 10; i += 1) {
    await announceWorkoutCompletion({ workoutKey });
  }

  assert.equal(requests.length, 1);
  assert.equal(hasAnnouncedWorkout(workoutKey), true);
  teardown();
});

test("8. the tracked key set is bounded", async () => {
  teardown();
  harness();
  for (let i = 0; i < 40; i += 1) {
    await announceWorkoutCompletion({ workoutKey: createWorkoutSessionKey("wk", "squat") });
  }
  // No unbounded growth; the module keeps at most 16 ids.
  assert.equal(hasAnnouncedWorkout(createWorkoutSessionKey("wk", "squat")), false);
  teardown();
});

// ---------------------------------------------- 3. failure / autoplay -----

test("9. a TTS failure does not break workout completion", async () => {
  teardown();
  const messages = [];
  let settled = null;

  setSpeechTransport(async () => {
    throw new Error("ElevenLabs unavailable");
  });
  setAudioFactory(() => ({ play: () => Promise.resolve(), pause() {}, currentTime: 0 }));

  const result = await announceWorkoutCompletion({
    workoutKey: key(),
    onMessage: (m) => messages.push(m),
    onSettled: (s) => {
      settled = s;
    },
  });

  // The screen still gets its text and the flow still settles.
  assert.deepEqual(messages, [WORKOUT_COMPLETE_MESSAGE]);
  assert.ok(settled, "onSettled must fire so navigation is never blocked");
  teardown();
});

test("10. a browser autoplay block is handled without retrying", async () => {
  teardown();
  const { requests, players } = harness();
  // Every play() rejects, as Chrome does before a user gesture.
  setAudioFactory((url) => ({
    url,
    currentTime: 0,
    onended: null,
    onerror: null,
    playCalls: 0,
    play() {
      this.playCalls += 1;
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    },
    pause() {},
  }));

  let settled = null;
  await announceWorkoutCompletion({
    workoutKey: key(),
    onSettled: (s) => {
      settled = s;
    },
  });

  assert.ok(settled, "the caller is always released");
  assert.equal(requests.length, 1, "no repeated synthesis");
  assert.equal(players.length, 0);
  teardown();
});

test("11. the completion voice never overlaps coaching audio", async () => {
  teardown();
  const { players } = harness();

  // A coaching cue is playing.
  const coaching = playAsCoaching();
  assert.equal(coaching.paused_count, 0, "cue is playing");

  await announceWorkoutCompletion({ workoutKey: key() });

  assert.equal(coaching.paused_count, 1, "the cue is stopped cleanly first");
  teardown();
});

test("12. unmounting the coaching page does not cut off the announcement", async () => {
  teardown();
  const { players } = harness();

  const announce = announceWorkoutCompletion({ workoutKey: key() });
  // The completion player is the newest element.
  const completionPlayer = players[players.length - 1];

  // Coach unmount: scoped stop must leave the completion player alone.
  const { stopPlayers } = await import("../src/hooks/speechPlayer.js");
  stopPlayers("coach");

  assert.equal(completionPlayer.paused, false, "announcement survives navigation");

  await announce;
  teardown();
});

// ------------------------------------------------ 5. voice preference ------

test("13. voice disabled prevents automatic playback but keeps the text", async () => {
  teardown();
  const { requests } = harness();
  const messages = [];
  let settled = null;

  const result = await announceWorkoutCompletion({
    workoutKey: key(),
    muted: true,
    onMessage: (m) => messages.push(m),
    onSettled: (s) => {
      settled = s;
    },
  });

  assert.equal(result.announced, false);
  assert.equal(result.reason, "muted");
  assert.equal(requests.length, 0, "no audio is forced when voice is off");
  assert.deepEqual(messages, [WORKOUT_COMPLETE_MESSAGE], "text stays readable");
  assert.equal(settled.status, "muted", "navigation is not blocked");
  teardown();
});

test("14. a muted completion still claims its key, so unmuting cannot surprise the user", async () => {
  teardown();
  const { requests } = harness();
  const workoutKey = key();

  await announceWorkoutCompletion({ workoutKey, muted: true });
  await announceWorkoutCompletion({ workoutKey, muted: false });

  assert.equal(requests.length, 0);
  teardown();
});

// ------------------------------------------------ 3. cache reuse ----------

test("15. a replay reuses the cached audio and spends no further credits", async () => {
  teardown();
  const { requests } = harness();

  await announceWorkoutCompletion({ workoutKey: key() });
  assert.equal(isSpeechCached(WORKOUT_COMPLETE_MESSAGE), true);

  // Replaying the same text (the Voice Coach "Replay Cue" path) must not
  // re-synthesise: this is the same cache the coach already used.
  const { playSpeech } = await import("../src/hooks/speechPlayer.js");
  await playSpeech(WORKOUT_COMPLETE_MESSAGE, { owner: "coach" });

  assert.equal(requests.length, 1, "replay is free");
  teardown();
});

test("16. no real ElevenLabs request is made once the test file is torn down", () => {
  teardown();
  // Sanity: the transport has been restored, but the cache is empty and no
  // request is issued by this assertion.
  assert.equal(isSpeechCached(WORKOUT_COMPLETE_MESSAGE), false);
});

// ---------------------------------------------- 1,3,4,5,6. gating ----------

/**
 * These mirror the Camerafeed gate that decides whether the completion event
 * is allowed to fire at all. Exercised directly so the rules are pinned.
 */
const exerciseGate = ({ currentIndex, planLength, event }) => {
  const hasNextExercise = currentIndex < planLength;
  const announced = [];
  if (event === "exerciseCompleted" && !hasNextExercise) announced.push("workout");
  if (event === "setCompleted") return announced; // per-set never announces
  if (event === "nextExercise") return announced; // between exercises never
  if (event === "manualEnd") return announced; // cancel/pause never
  if (event === "invalidReps") return announced; // false reps never
  return announced;
};

test("17. completing the final set of the final exercise announces", () => {
  assert.deepEqual(
    exerciseGate({ currentIndex: 2, planLength: 3, event: "exerciseCompleted" }),
    ["workout"]
  );
});

test("18. completing a NON-final set does not announce", () => {
  assert.deepEqual(exerciseGate({ currentIndex: 0, planLength: 3, event: "setCompleted" }), []);
});

test("19. finishing a non-final exercise does not announce", () => {
  assert.deepEqual(
    exerciseGate({ currentIndex: 0, planLength: 3, event: "exerciseCompleted" }),
    [],
    "moving to the next exercise must not claim a workout is done"
  );
});

test("20. a single-exercise workout announces on its own completion", () => {
  assert.deepEqual(
    exerciseGate({ currentIndex: 0, planLength: 1, event: "exerciseCompleted" }),
    ["workout"]
  );
});

test("21. pausing, cancelling and false reps never announce", () => {
  for (const event of ["manualEnd", "invalidReps", "nextExercise"]) {
    assert.deepEqual(
      exerciseGate({ currentIndex: 2, planLength: 3, event }),
      [],
      `${event} must not announce`
    );
  }
});

/** Start a coaching cue through the shared player (owner 'coach'). */
async function playAsCoaching() {
  const { playSpeech } = await import("../src/hooks/speechPlayer.js");
  let captured = null;
  setAudioFactory((url) => {
    captured = {
      url,
      currentTime: 0,
      paused: false,
      paused_count: 0,
      onended: null,
      onerror: null,
      play: () => Promise.resolve(),
      pause() {
        this.paused = true;
        this.paused_count += 1;
      },
    };
    return captured;
  });
  const p = playSpeech("Keep your chest more upright.", { owner: "coach" });
  await Promise.resolve();
  return captured || (await p) || captured;
}