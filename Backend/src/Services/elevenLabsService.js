const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

/**
 * Coaching cues are drawn from a small fixed set of strings, so the same
 * sentence is asked for over and over during a workout. Re-synthesising an
 * identical cue costs credits and adds latency for nothing, so successful
 * results are memoised in memory (bounded, oldest-first eviction) and replayed
 * without touching the ElevenLabs API.
 */
const SPEECH_CACHE_MAX_ENTRIES = 40;
const speechCache = new Map();

const cacheKeyFor = (text, voiceId, modelId) =>
  `${modelId}::${voiceId}::${text.trim()}`;

const readCachedSpeech = (key) => {
  const cached = speechCache.get(key);
  if (!cached) return null;

  // Refresh recency so a frequently reused cue is not evicted first.
  speechCache.delete(key);
  speechCache.set(key, cached);
  return cached;
};

const storeSpeech = (key, audioBuffer) => {
  speechCache.delete(key);
  speechCache.set(key, audioBuffer);

  while (speechCache.size > SPEECH_CACHE_MAX_ENTRIES) {
    const oldestKey = speechCache.keys().next().value;
    speechCache.delete(oldestKey);
  }
};

const clearSpeechCache = () => speechCache.clear();

const speechCacheSize = () => speechCache.size;

const generateSpeech = async (text) => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  if (!process.env.ELEVENLABS_VOICE_ID) {
    throw new Error("ELEVENLABS_VOICE_ID is not configured");
  }

  if (!text || typeof text !== "string") {
    throw new Error("Text is required");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  const modelId =
    process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";

  const cacheKey = cacheKeyFor(text, voiceId, modelId);
  const cached = readCachedSpeech(cacheKey);
  if (cached) return cached;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },

      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error("ElevenLabs API Error:", errorText);

    throw new Error(
      `ElevenLabs API failed with status ${response.status}`
    );
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Only successful synthesis is cached, so a transient failure is retried.
  storeSpeech(cacheKey, audioBuffer);

  return audioBuffer;
};

module.exports = {
  generateSpeech,
  clearSpeechCache,
  speechCacheSize,
};