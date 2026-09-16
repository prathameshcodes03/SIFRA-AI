import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/axios";

// In-memory cache for audio blob URLs to prevent duplicate ElevenLabs calls
const globalAudioCache = new Map();

export const useVoiceCoach = ({ initialMessage = "AI Voice Coach is ready." } = {}) => {
  const [currentMessage, setCurrentMessage] = useState(initialMessage);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentAudioRef = useRef(null);
  const lastSpokenTimeRef = useRef(0);
  const lastSpokenTextRef = useRef("");
  const COOLDOWN_MS = 5000; // 5-second minimum cooldown between voice triggers

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
      setCurrentMessage(trimmedText);

      if (isMuted) return;

      const now = Date.now();
      // If same text was spoken very recently, skip to prevent repetitive loops
      if (!force && trimmedText === lastSpokenTextRef.current && now - lastSpokenTimeRef.current < 8000) {
        return;
      }

      if (!force && now - lastSpokenTimeRef.current < COOLDOWN_MS) {
        return;
      }

      lastSpokenTimeRef.current = now;
      lastSpokenTextRef.current = trimmedText;
      stop();

      // 1. Check in-memory cache first (0 ElevenLabs credits)
      if (globalAudioCache.has(trimmedText)) {
        try {
          const cachedUrl = globalAudioCache.get(trimmedText);
          const audio = new Audio(cachedUrl);
          currentAudioRef.current = audio;

          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            setIsSpeaking(false);
            playWithWebSpeech(trimmedText);
          };

          setIsSpeaking(true);
          await audio.play();
          return;
        } catch (err) {
          console.warn("Cached audio play blocked or failed, using Web Speech fallback:", err);
          playWithWebSpeech(trimmedText);
          return;
        }
      }

      // 2. Fetch audio from backend voice service
      setIsLoading(true);
      try {
        const response = await api.post(
          "/api/voice/coaching",
          { text: trimmedText },
          { responseType: "blob", timeout: 8000 }
        );

        if (response.data && response.data.size > 0) {
          const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Cache blob URL for all future repeats
          globalAudioCache.set(trimmedText, audioUrl);

          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            setIsSpeaking(false);
            playWithWebSpeech(trimmedText);
          };

          setIsSpeaking(true);
          await audio.play();
        } else {
          throw new Error("Empty audio response");
        }
      } catch (err) {
        console.warn("Backend voice coaching failed, falling back to Web Speech:", err);
        playWithWebSpeech(trimmedText);
      } finally {
        setIsLoading(false);
      }
    },
    [isMuted, stop, playWithWebSpeech]
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

