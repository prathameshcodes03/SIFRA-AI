import { useState, useRef, useCallback, useEffect } from "react";
import { createVoiceCueGate } from "./voiceCueGate";
import {
  playSpeech,
  stopPlayers,
  cancelWebSpeech,
  isSpeechCached,
} from "./speechPlayer";

/** Owner key so this player can be stopped without touching other voices. */
export const COACH_VOICE_OWNER = "coach";

/**
 * Live coaching voice.
 *
 * All TTS and audio work is delegated to the shared `speechPlayer`, which is
 * also used by the workout-completion announcement. There is exactly one
 * ElevenLabs transport and one audio cache in the app.
 */

export const useVoiceCoach = ({ initialMessage = "AI Voice Coach is ready." } = {}) => {
  const [currentMessage, setCurrentMessage] = useState(initialMessage);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const requestIdRef = useRef(0);
  const isMutedRef = useRef(isMuted);
  const activeTextRef = useRef(null);

  // Per-cue dedup. A repeat is recognised even when other cues were spoken in
  // between, which is what stops the same warning being requested from
  // ElevenLabs every couple of seconds.
  const cueGateRef = useRef(null);
  if (cueGateRef.current === null) {
    cueGateRef.current = createVoiceCueGate();
  }

  isMutedRef.current = isMuted;

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    activeTextRef.current = null;
    // Scoped to this owner only: unmounting the coaching page must not cut off
    // a completion announcement that is still playing after navigation.
    stopPlayers(COACH_VOICE_OWNER);
    cancelWebSpeech();
    setIsSpeaking(false);
    setIsLoading(false);
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

      // Supersede whatever was in flight; its result will be ignored.
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      const isStale = () => requestIdRef.current !== requestId;
      activeTextRef.current = trimmedText;

      const cached = isSpeechCached(trimmedText);
      if (!cached) setIsLoading(true);

      await playSpeech(trimmedText, {
        owner: COACH_VOICE_OWNER,
        onStart: () => {
          if (!isStale()) setIsSpeaking(true);
        },
        onEnd: () => {
          if (!isStale()) return;
          setIsSpeaking(false);
          setIsLoading(false);
          if (activeTextRef.current === trimmedText) activeTextRef.current = null;
        },
      });

      if (isStale()) return;

      setIsLoading(false);
    },
    []
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