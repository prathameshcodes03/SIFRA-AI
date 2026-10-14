import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/axios";
import { createVoiceCueGate } from "./voiceCueGate";

// In-memory cache for audio blob URLs to prevent duplicate ElevenLabs calls.
// Bounded so a long session cannot grow without limit.
const globalAudioCache = new Map();
const MAX_CACHE_ENTRIES = 60;

const rememberAudio = (key, url) => {
  if (globalAudioCache.has(key)) globalAudioCache.delete(key);
  globalAudioCache.set(key, url);
  while (globalAudioCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = globalAudioCache.keys().next().value;
    const oldestUrl = globalAudioCache.get(oldestKey);
    globalAudioCache.delete(oldestKey);
    if (oldestUrl && typeof oldestUrl !== "string") URL.revokeObjectURL(oldestUrl);
  }
};

export const useVoiceCoach = ({ initialMessage = "AI Voice Coach is ready." } = {}) => {
  const [currentMessage, setCurrentMessage] = useState(initialMessage);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentAudioRef = useRef(null);
  const requestIdRef = useRef(0);
  const isMutedRef = useRef(isMuted);

  // Per-cue dedup. A repeat is recognised even when other cues were spoken in
  // between, which is what stops the same warning being requested from
  // ElevenLabs every couple of seconds.
  const cueGateRef = useRef(null);
  if (cueGateRef.current === null) {
    cueGateRef.current = createVoiceCueGate();
  }

  isMutedRef.current = isMuted;

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {
        // Ignore pause errors
      }
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    setIsSpeaking(false);
  }, []);

  const playWithWebSpeech = useCallback((text) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch (speechErr) {
        console.error("Speech synthesis error:", speechErr);
        setIsSpeaking(false);
      }
    }
  }, []);

  const speak = useCallback(
    async (text, { force = false } = {}) => {
      if (!text || typeof text !== "string") return;

      const trimmedText = text.trim();
      if (!trimmedText) return;

      setCurrentMessage(trimmedText);

      if (isMutedRef.current) return;

      // Dedup BEFORE any audio work: a suppressed repeat costs no request, no
      // ElevenLabs credit and never interrupts the cue already playing.
      const verdict = cueGateRef.current.consider(trimmedText, { force });
      if (!verdict.accepted) return;

      stop();

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const isStale = () => requestIdRef.current !== requestId;

      // 1. Replay cached audio without spending ElevenLabs credits.
      if (globalAudioCache.has(trimmedText)) {
        const cachedUrl = globalAudioCache.get(trimmedText);
        try {
          const audio = new Audio(cachedUrl);
          currentAudioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            setIsSpeaking(false);
            if (!isStale()) playWithWebSpeech(trimmedText);
          };
          setIsSpeaking(true);
          await audio.play();
          return;
        } catch (err) {
          console.warn(
            "Cached audio play blocked or failed, using Web Speech fallback:",
            err
          );
          if (!isStale()) playWithWebSpeech(trimmedText);
          return;
        }
      }

      // 2. Fetch audio from backend voice service.
      //    Runs off the rep-counting path; never blocks the camera loop.
      setIsLoading(true);
      try {
        const response = await api.post(
          "/api/voice/coaching",
          { text: trimmedText },
          { responseType: "blob", timeout: 8000 }
        );

        // A newer cue superseded this one: never let stale audio override it.
        if (isStale()) return;

        if (response.data && response.data.size > 0) {
          const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          rememberAudio(trimmedText, audioUrl);

          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            setIsSpeaking(false);
            if (!isStale()) playWithWebSpeech(trimmedText);
          };

          setIsSpeaking(true);
          await audio.play();
        } else {
          throw new Error("Empty audio response");
        }
      } catch (err) {
        console.warn(
          "Backend voice coaching failed, falling back to Web Speech:",
          err
        );
        if (!isStale()) playWithWebSpeech(trimmedText);
      } finally {
        if (!isStale()) setIsLoading(false);
      }
    },
    [stop, playWithWebSpeech]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    currentMessage,
    isSpeaking,
    isLoading,
    isMuted,
    setIsMuted,
    speak,
    stop,
    setCurrentMessage,
  };
};

export default useVoiceCoach;