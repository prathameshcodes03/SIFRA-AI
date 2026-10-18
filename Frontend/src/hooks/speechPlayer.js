import api from "../api/axios";

/**
 * Single shared TTS + audio playback path.
 *
 * Extracted from `useVoiceCoach` so the workout-completion announcement reuses
 * the EXACT same transport, cache and fallback as live coaching - there is no
 * second ElevenLabs implementation anywhere in the app.
 *
 * This module is deliberately module-level (not a hook): the completion
 * announcement must keep playing across the navigation to the Dashboard, and a
 * component-scoped player would be torn down on unmount.
 *
 * Transport and audio construction are injectable so tests can run with zero
 * real ElevenLabs calls and zero real audio.
 */

// In-memory cache for audio blob URLs to prevent duplicate ElevenLabs calls.
// Bounded so a long session cannot grow without limit.
const audioCache = new Map();
const MAX_CACHE_ENTRIES = 60;

const rememberAudio = (key, url) => {
  if (audioCache.has(key)) audioCache.delete(key);
  audioCache.set(key, url);
  while (audioCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value;
    const oldestUrl = audioCache.get(oldestKey);
    audioCache.delete(oldestKey);
    if (oldestUrl && typeof oldestUrl !== "string") URL.revokeObjectURL(oldestUrl);
  }
};

/** True when this exact cue has already been synthesised. */
export function isSpeechCached(text) {
  return audioCache.has(text);
}

export function clearSpeechCache() {
  audioCache.clear();
}

// --------------------------------------------------------------- injection --

/** Posts to the existing /api/voice/coaching route. */
const defaultTransport = async (text) => {
  const response = await api.post(
    "/api/voice/coaching",
    { text },
    { responseType: "blob", timeout: 8000 }
  );
  return response.data;
};

let transport = defaultTransport;
let audioFactory = (url) => new Audio(url);

export function setSpeechTransport(fn) {
  transport = fn || defaultTransport;
}
export function resetSpeechTransport() {
  transport = defaultTransport;
}
export function setAudioFactory(fn) {
  audioFactory = fn || ((url) => new Audio(url));
}
export function resetAudioFactory() {
  audioFactory = (url) => new Audio(url);
}

// ------------------------------------------------------- active players ----

/**
 * Every player registers here so a new announcement can stop the previous one
 * cleanly. This is how the completion voice avoids overlapping a coaching cue.
 *
 * Entries are owner-scoped: unmounting the coaching page stops only the
 * coaching player, so it can never cut off a completion announcement that is
 * still playing after navigation.
 */
const activePlayers = new Map();

export function stopAllPlayers() {
  for (const stop of [...activePlayers.values()]) {
    try {
      stop();
    } catch {
      // A player that is already finished must never block a new one.
    }
  }
  activePlayers.clear();
}

/** Stop only the players belonging to `owner`. */
export function stopPlayers(owner) {
  for (const [key, stop] of [...activePlayers.entries()]) {
    if (key.owner !== owner) continue;
    try {
      stop();
    } catch {
      // Ignore
    }
    activePlayers.delete(key);
  }
}

export function activePlayerCount() {
  return activePlayers.size;
}

// ---------------------------------------------------------------- synthesis --

/**
 * Return a playable URL for `text`, reusing cached audio when available so a
 * repeated message never spends another ElevenLabs credit.
 *
 * @returns {Promise<string>} blob/object URL
 */
export async function synthesizeSpeech(text) {
  const cached = audioCache.get(text);
  if (cached) return cached;

  const blob = await transport(text);
  if (!blob || (blob.size !== undefined && blob.size === 0)) {
    throw new Error("Empty audio response");
  }

  const url = URL.createObjectURL(new Blob([blob], { type: "audio/mpeg" }));
  rememberAudio(text, url);
  return url;
}

// ------------------------------------------------------------- web speech ----

/**
 * Fallback when the browser blocks programmatic playback. Returns false when
 * speech synthesis is unavailable so callers can surface a manual option.
 */
export function speakWithWebSpeech(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn("Speech synthesis unavailable:", error);
    return false;
  }
}

export function cancelWebSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
  }
}

// ---------------------------------------------------------------- playback ---

/**
 * Play `text`, stopping anything already playing first.
 *
 * Resolves once playback finishes, is blocked by autoplay policy, or fails.
 * It NEVER throws: a voice problem must not break the caller's UI.
 *
 * @returns {Promise<{status:'played'|'blocked'|'error', autoplayBlocked:boolean}>}
 */
export function playSpeech(text, { owner = "default", onStart, onEnd } = {}) {
  // A new cue always supersedes whatever is speaking: this is what keeps two
  // pieces of coaching (and the completion voice) from overlapping.
  stopAllPlayers();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (status) => {
      if (settled) return;
      settled = true;
      activePlayers.delete(entry);
      if (typeof onEnd === "function") onEnd(status);
      resolve({ status, autoplayBlocked: status === "blocked" });
    };

    const audio = { pause: () => {} };
    const entry = { owner, stop: () => audio.pause() };
    const detach = () => {
      activePlayers.delete(entry);
    };

    (async () => {
      let url;
      try {
        url = await synthesizeSpeech(text);
      } catch (error) {
        console.warn("Speech synthesis request failed:", error);
        detach();
        // A failed request still gets the Web Speech fallback.
        const fellBack = speakWithWebSpeech(text);
        finish(fellBack ? "played" : "error");
        return;
      }

      if (settled) {
        detach();
        return;
      }

      let element;
      try {
        element = audioFactory(url);
      } catch (error) {
        console.warn("Audio construction failed:", error);
        detach();
        const fellBack = speakWithWebSpeech(text);
        finish(fellBack ? "played" : "error");
        return;
      }

      audio.pause = () => {
        try {
          element.pause();
          element.currentTime = 0;
        } catch {
          // Ignore pause errors on an already-released element.
        }
      };

      element.onended = () => finish("played");
      element.onerror = () => {
        const fellBack = speakWithWebSpeech(text);
        finish(fellBack ? "played" : "error");
      };

      try {
        await element.play();
        if (typeof onStart === "function") onStart();
      } catch (error) {
        // Browsers reject programmatic playback before a user gesture.
        console.warn("Audio playback blocked, using Web Speech fallback:", error);
        const fellBack = speakWithWebSpeech(text);
        finish(fellBack ? "played" : "blocked");
      }
    })();
  });
}