const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Verifies the ElevenLabs synthesis cache.
 *
 * `global.fetch` is replaced by a recording stub for every test, so this file
 * performs ZERO real network calls and never uses a real API key.
 */

const SERVICE_PATH = "../src/Services/elevenLabsService.js";
const realFetch = global.fetch;

/** Every request that would have reached ElevenLabs. */
const calls = [];

/** Swappable stubbed transport; always in memory, never the network. */
let fetchImpl = null;

const okResponse = (bytes) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => Uint8Array.from(bytes).buffer,
  text: async () => "",
});

const defaultImpl = async (url, init) => {
  const text = JSON.parse(init.body).text;
  // Distinct bytes per cue so a cache hit is observable.
  return okResponse([text.length, text.charCodeAt(0) % 256, 7]);
};

const loadService = () => {
  delete require.cache[require.resolve(SERVICE_PATH)];
  return require(SERVICE_PATH);
};

/** Fresh module + empty cache + empty call log. */
const freshService = () => {
  const service = loadService();
  service.clearSpeechCache();
  fetchImpl = defaultImpl;
  calls.length = 0;
  return service;
};

test.before(() => {
  process.env.ELEVENLABS_API_KEY = "test-key-not-real";
  process.env.ELEVENLABS_VOICE_ID = "test-voice-id";
  process.env.ELEVENLABS_MODEL_ID = "test-model-id";

  fetchImpl = defaultImpl;
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return fetchImpl(url, init);
  };
});

test.after(() => {
  global.fetch = realFetch;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_VOICE_ID;
  delete process.env.ELEVENLABS_MODEL_ID;
});

test("an identical cue is synthesised once and then replayed from cache", async () => {
  const { generateSpeech } = freshService();

  const cue =
    "I can't see you clearly. Step back and make sure your full body is in frame.";

  const first = await generateSpeech(cue);
  const second = await generateSpeech(cue);
  const third = await generateSpeech(cue);

  assert.equal(calls.length, 1, "only the first request may reach ElevenLabs");
  assert.ok(Buffer.isBuffer(first));
  assert.ok(first.equals(second));
  assert.ok(second.equals(third));
});

test("a cached cue is still real, non-empty audio", async () => {
  const { generateSpeech } = freshService();

  const first = await generateSpeech("Good squat. Keep going.");
  const cached = await generateSpeech("Good squat. Keep going.");

  assert.ok(first.length > 0);
  assert.ok(cached.equals(first));
});

test("different cues are synthesised separately", async () => {
  const { generateSpeech } = freshService();

  await generateSpeech("Good squat. Keep going.");
  await generateSpeech("Keep your knees aligned with your toes.");

  assert.equal(calls.length, 2);
});

test("the cache is keyed by voice and model", async () => {
  const { generateSpeech } = freshService();

  const cue = "Great plank. Keep holding.";
  await generateSpeech(cue);

  process.env.ELEVENLABS_MODEL_ID = "a-different-model";
  await generateSpeech(cue);
  assert.equal(calls.length, 2, "a different voice/model must not reuse audio");

  process.env.ELEVENLABS_MODEL_ID = "test-model-id";
  await generateSpeech(cue);
  assert.equal(calls.length, 2, "returning to the original voice reuses it");
});

test("the cache is bounded and evicts the oldest cue", async () => {
  const { generateSpeech, speechCacheSize } = freshService();

  for (let i = 0; i < 45; i += 1) {
    await generateSpeech(`cue ${i}`);
  }

  assert.equal(calls.length, 45);
  assert.ok(speechCacheSize() <= 40, `cache grew to ${speechCacheSize()}`);

  await generateSpeech("cue 0");
  assert.equal(calls.length, 46, "the evicted cue is re-synthesised");

  await generateSpeech("cue 44");
  assert.equal(calls.length, 46, "a cached cue costs nothing");
});

test("a failed synthesis is not cached and is retried", async () => {
  const { generateSpeech } = freshService();

  fetchImpl = async () => ({
    ok: false,
    status: 500,
    arrayBuffer: async () => new ArrayBuffer(0),
    text: async () => "upstream error",
  });

  await assert.rejects(() => generateSpeech("Retry me."));
  assert.equal(calls.length, 1);

  fetchImpl = defaultImpl;
  const audio = await generateSpeech("Retry me.");

  assert.equal(calls.length, 2, "a transient failure must be retried");
  assert.ok(audio.length > 0);
});

test("a missing API key fails before any network call", async () => {
  const { generateSpeech } = freshService();

  const key = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;

  await assert.rejects(
    () => generateSpeech("This must never be sent."),
    /ELEVENLABS_API_KEY/
  );
  assert.equal(calls.length, 0, "no request may be attempted");

  process.env.ELEVENLABS_API_KEY = key;
});

test("a missing voice id fails before any network call", async () => {
  const { generateSpeech } = freshService();

  const voice = process.env.ELEVENLABS_VOICE_ID;
  delete process.env.ELEVENLABS_VOICE_ID;

  await assert.rejects(
    () => generateSpeech("This must never be sent."),
    /ELEVENLABS_VOICE_ID/
  );
  assert.equal(calls.length, 0);

  process.env.ELEVENLABS_VOICE_ID = voice;
});

test("empty text fails before any network call", async () => {
  const { generateSpeech } = freshService();

  await assert.rejects(() => generateSpeech(""));
  await assert.rejects(() => generateSpeech(null));

  assert.equal(calls.length, 0);
});

test("a 30-second warning loop costs exactly one synthesis", async () => {
  const { generateSpeech } = freshService();

  // The camera warning arriving 30 times in 30 seconds.
  const warning =
    "I can't see you clearly. Step back and make sure your full body is in frame.";
  for (let i = 0; i < 30; i += 1) {
    await generateSpeech(warning);
  }

  assert.equal(calls.length, 1);

  // Every distinct form cue used in a session, each repeated five times.
  const cues = [
    "Good squat. Keep going.",
    "Lower into a comfortable squat depth.",
    "Keep your chest more upright.",
    "Keep your knees aligned with your toes.",
  ];
  for (let round = 0; round < 5; round += 1) {
    for (const cue of cues) {
      await generateSpeech(cue);
    }
  }

  assert.equal(
    calls.length,
    1 + cues.length,
    "synthesis must happen once per distinct cue"
  );
});