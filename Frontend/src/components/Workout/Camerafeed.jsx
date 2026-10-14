import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { useWorkout } from "../../Context/WorkoutContext";
import api from "../../api/axios";

import {
  initializePoseDetector,
  detectPose,
} from "../../mediapipe/poseDetector";

import { DrawingUtils } from "@mediapipe/tasks-vision";
import {
  extractExerciseFeatures,
  getFeedbackForPrediction,
  evaluateFormRuleBased,
  getPoseReliability,
} from "../../exercises/featureExtractor";
import { createRepTracker, PHASE } from "../../exercises/repTracker";
import {
  createCoachingGate,
  arbitrateCoaching,
  isLabelForExercise,
  CORRECT_LABEL_BY_EXERCISE,
  MIN_RELIABLE_VISIBILITY,
} from "../../exercises/coaching";

/** ML classification cadence. Form is not a per-frame signal. */
const PREDICT_INTERVAL_MS = 600;

const Camerafeed = ({
  exercise = "squat",
  workoutId = null,
  sets = 3,
  reps = 10,
  onFormFeedback,
  workoutPlan = [],
  currentIndex = 0,
}) => {
  const [cameraOn, setCameraOn] = useState(true);
  const [completedInfo, setCompletedInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [livePrediction, setLivePrediction] = useState(null);
  const [liveAccuracy, setLiveAccuracy] = useState(null);

  // Rep/set tracking state (mirrors of the tracker, updated per frame)
  const [currentSet, setCurrentSet] = useState(1);
  const [completedReps, setCompletedReps] = useState(0);
  const [phase, setPhase] = useState(PHASE.UP);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSetComplete, setShowSetComplete] = useState(false);

  const { completeWorkout } = useWorkout();
  const navigate = useNavigate();

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);
  const predictionInFlightRef = useRef(false);
  const completionSentRef = useRef(false);
  const mountedRef = useRef(true);

  // Accuracy denominators. Only genuine model classifications are counted;
  // network failures and rule-based fallbacks are excluded.
  const totalPredictionsRef = useRef(0);
  const correctPredictionsRef = useRef(0);
  const liveAccuracyRef = useRef(null);

  // Live mirrors of the tracker to avoid re-renders when nothing changed.
  const lastSetRepsRef = useRef(0);
  const lastSetsRef = useRef(1);
  const trackerRef = useRef(null);
  const phaseRef = useRef(PHASE.UP);
  const gateRef = useRef(null);
  const finishHandlerRef = useRef(null);
  const setFlashTimerRef = useRef(null);

  if (trackerRef.current === null) {
    trackerRef.current = createRepTracker({
      exercise,
      requiredSets: sets,
      requiredReps: reps,
    });
    gateRef.current = createCoachingGate();
  }

  const videoConstraints = {
    facingMode: "user",
    width: 1280,
    height: 720,
  };

  useEffect(() => {
    initializePoseDetector();
    return () => {
      mountedRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (setFlashTimerRef.current) clearTimeout(setFlashTimerRef.current);
    };
  }, []);

  // Rebuild trackers when the exercise or its targets change.
  useEffect(() => {
    trackerRef.current = createRepTracker({
      exercise,
      requiredSets: sets,
      requiredReps: reps,
    });
    gateRef.current = createCoachingGate();
    phaseRef.current = PHASE.UP;
    completionSentRef.current = false;
    totalPredictionsRef.current = 0;
    correctPredictionsRef.current = 0;
    liveAccuracyRef.current = null;
    lastSetRepsRef.current = 0;
    lastSetsRef.current = 1;
    setCurrentSet(1);
    setCompletedReps(0);
    setPhase(PHASE.UP);
    setExerciseCompleted(false);
    setIsCompleting(false);
    setShowSetComplete(false);
    setLivePrediction(null);
    setLiveAccuracy(null);
  }, [exercise, sets, reps]);

  const completeExercise = async () => {
    if (completionSentRef.current) return;
    completionSentRef.current = true;

    setExerciseCompleted(true);
    setIsCompleting(true);
    setCameraOn(false);

    const total = totalPredictionsRef.current;
    const correct = correctPredictionsRef.current;
    const sessionAccuracy =
      total > 0 ? Math.round((correct / total) * 100) : null;

    try {
      await completeWorkout({
        workoutId,
        exercise,
        sets,
        reps,
        totalPredictions: total,
        correctPredictions: correct,
        accuracy: sessionAccuracy,
      });

      setCompletedInfo({
        exercise,
        accuracy: sessionAccuracy,
      });

      // Auto-advance to the next exercise, or finish the workout.
      if (currentIndex < workoutPlan.length - 1) {
        const next = workoutPlan[currentIndex + 1];
        navigate(
          `/Workout?exercise=${encodeURIComponent(
            next.exercise.toLowerCase()
          )}&workoutId=${next.id}&sets=${next.sets}&reps=${next.reps}`
        );
      } else {
        navigate("/Dashboard");
      }
    } catch (err) {
      console.error("Failed to complete exercise:", err);
      completionSentRef.current = false;
      setIsCompleting(false);
      setCameraOn(true);
    }
  };

  // Keep the newest handler reachable from the rAF loop without re-binding it.
  finishHandlerRef.current = completeExercise;

  useEffect(() => {
    if (!cameraOn) return;

    const updateRepsFromFeatures = (features, nowMs) => {
      const tracker = trackerRef.current;
      if (!tracker) return;

      const result = tracker.update(features, nowMs);

      // Rep counting is local and frame-driven: no network, no ML dependency.
      // Mirrors are compared against the tracker's last emitted values so an
      // unchanged frame does not trigger a React render.
      if (result.setReps !== lastSetRepsRef.current) {
        lastSetRepsRef.current = result.setReps;
        setCompletedReps(result.setReps);
      }
      if (result.sets !== lastSetsRef.current) {
        lastSetsRef.current = result.sets;
        setCurrentSet(result.sets);
      }
      if (result.phase !== phaseRef.current) {
        phaseRef.current = result.phase;
        setPhase(result.phase);
      }

      if (result.setJustCompleted && !result.exerciseJustCompleted) {
        if (setFlashTimerRef.current) clearTimeout(setFlashTimerRef.current);
        setShowSetComplete(true);
        setFlashTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShowSetComplete(false);
        }, 2000);
      }

      if (result.exerciseJustCompleted && finishHandlerRef.current) {
        finishHandlerRef.current();
      }
    };

    const handlePrediction = async (features, reliable) => {
      let label = null;
      let fromModel = false;

      try {
        const response = await api.post("/api/workout/predict", features);
        if (response.data?.prediction) {
          label = response.data.prediction;
          fromModel = true;
        }
      } catch {
        // Model unavailable: fall through to rule-based coaching only.
      }

      predictionInFlightRef.current = false;

      if (!mountedRef.current) return;

      if (!label) {
        label = evaluateFormRuleBased(features);
      }

      // Accuracy accounting: infrastructure fallbacks must not be scored as
      // incorrect form, so they are excluded from the denominator.
      let sessionAccuracy = liveAccuracyRef.current;
      if (fromModel && label) {
        totalPredictionsRef.current += 1;
        if (label === CORRECT_LABEL_BY_EXERCISE[exercise]) {
          correctPredictionsRef.current += 1;
        }

        const total = totalPredictionsRef.current;
        sessionAccuracy = Math.round(
          (correctPredictionsRef.current / total) * 100
        );
        liveAccuracyRef.current = sessionAccuracy;
        setLiveAccuracy(sessionAccuracy);
      }

      const gate = gateRef.current;
      if (gate) gate.consider(label);

      const decision = arbitrateCoaching({
        label: gate ? gate.dominant() || label : label,
        phase: phaseRef.current,
        reliable,
        exercise,
      });

      const spokenLabel = decision.gated ? null : decision.label;

      // Show the model's label in the HUD only when it belongs to this
      // exercise, so the telemetry never contradicts the spoken cue.
      if (fromModel && label) {
        setLivePrediction(isLabelForExercise(label, exercise) ? label : null);
      }

      const message = getFeedbackForPrediction(
        spokenLabel || "pose_unreliable"
      );

      if (onFormFeedback && message) {
        onFormFeedback({
          prediction: spokenLabel,
          message,
          isCorrect: spokenLabel === CORRECT_LABEL_BY_EXERCISE[exercise],
          accuracy: sessionAccuracy,
        });
      }
    };

    const detect = () => {
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;

      if (video && video.readyState === 4 && canvas) {
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = detectPose(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const landmarks = results?.landmarks?.[0];

        if (landmarks) {
          const drawingUtils = new DrawingUtils(ctx);
          drawingUtils.drawLandmarks(landmarks, {
            radius: 4,
            color: "#8B5CF6",
          });

          const features = extractExerciseFeatures(landmarks, exercise);
          const reliability = getPoseReliability(landmarks);
          const reliable = reliability >= MIN_RELIABLE_VISIBILITY;

          // 1) Rep / set counting: every frame, purely local.
          if (features && !completionSentRef.current) {
            updateRepsFromFeatures(features, Date.now());
          }

          // 2) Form classification: throttled, and deliberately NOT awaited so
          //    a slow network call can never stall the camera loop.
          const now = performance.now();
          if (
            features &&
            now - lastPredictionTimeRef.current > PREDICT_INTERVAL_MS &&
            !predictionInFlightRef.current &&
            !completionSentRef.current
          ) {
            lastPredictionTimeRef.current = now;
            predictionInFlightRef.current = true;
            handlePrediction(features, reliable).catch(() => {
              predictionInFlightRef.current = false;
            });
          }
        }
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [cameraOn, exercise, onFormFeedback]);

  const handleEndWorkout = async () => {
    // Guard against a double submit while a completion request is in flight.
    if (exerciseCompleted || completionSentRef.current || isCompleting) return;

    setCameraOn(false);
    setSaving(true);
    setIsCompleting(true);

    const total = totalPredictionsRef.current;
    const correct = correctPredictionsRef.current;
    const sessionAccuracy =
      total > 0 ? Math.round((correct / total) * 100) : null;

    try {
      await completeWorkout({
        workoutId,
        exercise,
        sets,
        reps,
        totalPredictions: total,
        correctPredictions: correct,
        accuracy: sessionAccuracy,
      });

      setCompletedInfo({ exercise, accuracy: sessionAccuracy });
      completionSentRef.current = true;
    } catch (err) {
      console.error("Failed to complete workout:", err);
      // Backend rejected the save: do not present it as permanently completed.
      completionSentRef.current = false;
      setCameraOn(true);
    } finally {
      setSaving(false);
      setIsCompleting(false);
    }
  };

  const handleRestart = () => {
    totalPredictionsRef.current = 0;
    correctPredictionsRef.current = 0;
    liveAccuracyRef.current = null;
    lastSetRepsRef.current = 0;
    lastSetsRef.current = 1;
    trackerRef.current?.reset();
    gateRef.current?.reset();
    completionSentRef.current = false;
    phaseRef.current = PHASE.UP;
    setCompletedInfo(null);
    setLivePrediction(null);
    setLiveAccuracy(null);
    setCurrentSet(1);
    setCompletedReps(0);
    setPhase(PHASE.UP);
    setExerciseCompleted(false);
    setIsCompleting(false);
    setShowSetComplete(false);
    setCameraOn(true);
  };

  const isFormCorrect =
    livePrediction != null &&
    livePrediction === CORRECT_LABEL_BY_EXERCISE[exercise];

  const isHold = exercise === "plank";

  return (
    <div className="relative mx-auto aspect-video min-h-[15rem] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg sm:min-h-[24rem]">
      {cameraOn ? (
        <>
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={videoConstraints}
            screenshotFormat="image/jpeg"
            className="absolute h-full w-full object-cover"
          />

          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 h-full w-full pointer-events-none"
          />

          {/* Live Biomechanical Telemetry Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            <span
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold shadow-md backdrop-blur-md transition-colors ${
                !livePrediction
                  ? "border border-slate-700 bg-slate-900/80 text-slate-300"
                  : isFormCorrect
                  ? "border border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                  : "border border-rose-500/40 bg-rose-950/80 text-rose-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  !livePrediction
                    ? "bg-slate-400"
                    : isFormCorrect
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-rose-400 animate-ping"
                }`}
              />
              {livePrediction
                ? livePrediction.replace(/_/g, " ").toUpperCase()
                : "CALIBRATING POSE..."}
            </span>

            <span className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 font-mono text-xs font-medium text-slate-200 shadow-md backdrop-blur-md">
              Score:{" "}
              <strong className="text-indigo-400">
                {liveAccuracy === null ? "--" : `${liveAccuracy}%`}
              </strong>
            </span>

            {/* Rep/Set Progress */}
            {!exerciseCompleted && (
              <span className="rounded-xl border border-indigo-500/40 bg-indigo-950/80 px-3 py-1.5 font-mono text-xs font-medium text-indigo-200 shadow-md backdrop-blur-md">
                {isHold
                  ? `Hold ${completedReps}/${reps}s`
                  : `Set ${currentSet}/${sets} • Rep ${completedReps}/${reps}`}
              </span>
            )}

            {/* Movement phase */}
            {!exerciseCompleted && !isHold && (
              <span
                className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold shadow-md backdrop-blur-md ${
                  phase === PHASE.DOWN
                    ? "border-amber-500/40 bg-amber-950/80 text-amber-300"
                    : "border-slate-700/80 bg-slate-900/80 text-slate-300"
                }`}
              >
                {phase === PHASE.DOWN ? "DESCENDING" : "RISING"}
              </span>
            )}

            {/* Set Complete Flash */}
            {showSetComplete && (
              <span className="rounded-xl border border-emerald-500/40 bg-emerald-950/80 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300 shadow-md backdrop-blur-md animate-pulse">
                Set Complete!
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white text-slate-900">
          {completedInfo ? (
            <div className="space-y-4 max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <i className="fa-solid fa-circle-check text-3xl"></i>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {exerciseCompleted
                    ? "Exercise Complete!"
                    : "Workout Session Logged!"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Great effort on your{" "}
                  <span className="capitalize font-bold text-indigo-600">
                    {completedInfo.exercise}
                  </span>{" "}
                  routine.
                </p>
                {completedInfo.accuracy !== null &&
                  completedInfo.accuracy !== undefined && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-700">
                      <span>Session Accuracy: {completedInfo.accuracy}%</span>
                    </div>
                  )}
                {exerciseCompleted && currentIndex < workoutPlan.length - 1 && (
                  <p className="mt-2 text-xs font-medium text-indigo-600 animate-pulse">
                    Moving to next exercise...
                  </p>
                )}
                {exerciseCompleted && currentIndex >= workoutPlan.length - 1 && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    All exercises complete! Redirecting to Dashboard...
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => navigate("/Dashboard")}
                  className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  View Dashboard
                </button>
                <button
                  onClick={() => navigate("/WorkoutPlan")}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Workout Plan
                </button>
                <button
                  onClick={handleRestart}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Restart Session
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                <i className="fa-solid fa-video-slash text-2xl"></i>
              </div>
              {saving ? (
                <p className="mt-4 text-sm font-medium text-slate-600">
                  Saving workout record...
                </p>
              ) : (
                <button
                  onClick={handleRestart}
                  className="mt-6 cursor-pointer rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Restart Camera Feed
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {cameraOn && (
        <button
          onClick={handleEndWorkout}
          className="absolute bottom-4 right-4 cursor-pointer rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:bg-rose-700 active:scale-[0.98] sm:bottom-6 sm:right-6"
        >
          Complete Session
        </button>
      )}
    </div>
  );
};

export default Camerafeed;