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
  evaluateFormRuleBased,
  getPoseReliability,
} from "../../exercises/featureExtractor";
import { createRepTracker, PHASE } from "../../exercises/repTracker";
import {
  createCoachingGate,
  arbitrateCoaching,
  resolveCoachingCue,
  resolveFormCoaching,
  isLabelForExercise,
  CORRECT_LABEL_BY_EXERCISE,
  MIN_RELIABLE_VISIBILITY,
  POSE_UNRELIABLE,
} from "../../exercises/coaching";
import {
  createVisibilityWarningController,
  VISIBILITY_FAILURE_REASONS,
} from "../../exercises/visibilityWarning";
import { assessSquatForm } from "../../exercises/formAssessment";
import { createSquatRepSummary } from "../../exercises/squatRepSummary";
import { createCoachDiagnostics } from "../../utils/diagnostics";
import { createLatestOnlyGuard } from "../../utils/latestOnly";
import { createFormCueGate } from "../../exercises/formCueGate";
import { createWorkoutSessionKey } from "../../voice/completionVoice";

/** ML classification cadence. Form is not a per-frame signal. */
const PREDICT_INTERVAL_MS = 600;

const Camerafeed = ({
  exercise = "squat",
  workoutId = null,
  sets = 3,
  reps = 10,
  onFormFeedback,
  onWorkoutComplete,
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
  // Drops superseded async prediction responses (stale pose data).
  const predictionGuardRef = useRef(null);
  // State-aware coaching for push-up and plank: speaks on label CHANGES, not
  // on the 600ms prediction cadence.
  const formCueRef = useRef(null);
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
  // Reports "the ENTIRE workout is done" - never per set, never between
  // exercises. Ref-held so re-renders cannot replay the announcement.
  const completionHandlerRef = useRef(null);
  // Stable id for this workout attempt: identical across re-renders, unique
  // for a genuinely new session.
  const workoutSessionKeyRef = useRef(null);
  if (workoutSessionKeyRef.current === null) {
    workoutSessionKeyRef.current = createWorkoutSessionKey(workoutId, exercise);
  }
  const feedbackHandlerRef = useRef(null);
  const setFlashTimerRef = useRef(null);

  // Edge-triggered camera-visibility warning. Held in a ref so that re-renders,
  // effect restarts and prediction responses can never reset its cooldown.
  const visibilityWarningRef = useRef(null);
  // EMA-smoothed knee angle from the rep tracker: the movement evidence the
  // squat assessment needs, available without waiting for any prediction.
  const smoothedKneeAngleRef = useRef(null);
  // Deepest frame of the rep in progress; judged once the rep completes.
  const squatRepRef = useRef(null);
  // Completed rep awaiting a coaching decision from the next prediction.
  const pendingRepRef = useRef(null);
  // Dev-only, self-disabling in production builds.
  const diagnosticsRef = useRef(null);

  if (trackerRef.current === null) {
    trackerRef.current = createRepTracker({
      exercise,
      requiredSets: sets,
      requiredReps: reps,
    });
    gateRef.current = createCoachingGate();
    visibilityWarningRef.current = createVisibilityWarningController();
    squatRepRef.current = createSquatRepSummary();
    predictionGuardRef.current = createLatestOnlyGuard();
    formCueRef.current = createFormCueGate();
    diagnosticsRef.current = createCoachDiagnostics();
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
      visibilityWarningRef.current?.reset();
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
    // A new exercise must not inherit the previous one's warning cooldown or
    // smoothed movement history.
    visibilityWarningRef.current?.reset();
    smoothedKneeAngleRef.current = null;
    squatRepRef.current?.reset();
    formCueRef.current?.reset();
    predictionGuardRef.current?.invalidate();
    // A different exercise is a different attempt: it must be eligible to
    // announce its own completion later.
    workoutSessionKeyRef.current = createWorkoutSessionKey(workoutId, exercise);
    pendingRepRef.current = null;
    setCurrentSet(1);
    setCompletedReps(0);
    setPhase(PHASE.UP);
    setExerciseCompleted(false);
    setIsCompleting(false);
    setShowSetComplete(false);
    setLivePrediction(null);
    setLiveAccuracy(null);
    // `workoutId` is read only to build a fresh session key; the reset is
    // intentionally keyed to the exercise and its targets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // The workout is over only when there is no exercise left in the plan.
      const hasNextExercise = currentIndex < workoutPlan.length - 1;

      if (!hasNextExercise && typeof completionHandlerRef.current === "function") {
        // The backend has confirmed completion, so the announcement is safe to
        // make. The handler is idempotent on the session key, so extra renders
        // or duplicate events cannot replay it.
        const announce = completionHandlerRef.current({
          workoutKey: workoutSessionKeyRef.current,
          exercise,
          accuracy: sessionAccuracy,
        });

        // Hold the completion screen until the announcement settles so it is
        // heard in full and the message stays readable. Bounded by the
        // announcer's own timeout, and the existing buttons stay available.
        if (announce && typeof announce.then === "function") {
          await announce;
        }
        navigate("/Dashboard");
        return;
      }

      // Auto-advance to the next exercise.
      const next = workoutPlan[currentIndex + 1];
      navigate(
        `/Workout?exercise=${encodeURIComponent(
          next.exercise.toLowerCase()
        )}&workoutId=${next.id}&sets=${next.sets}&reps=${next.reps}`
      );
    } catch (err) {
      console.error("Failed to complete exercise:", err);
      completionSentRef.current = false;
      setIsCompleting(false);
      setCameraOn(true);
    }
  };

  // Keep the newest handler reachable from the rAF loop without re-binding it.
  finishHandlerRef.current = completeExercise;
  feedbackHandlerRef.current = onFormFeedback;
  // Kept in a ref for the same reason: a parent re-render must not re-bind the
  // camera loop, and must not restart a completion announcement.
  completionHandlerRef.current = onWorkoutComplete;

  useEffect(() => {
    if (!cameraOn) {
      visibilityWarningRef.current?.reset();
      return undefined;
    }

    const updateRepsFromFeatures = (features, nowMs, reliable) => {
      const tracker = trackerRef.current;
      if (!tracker) return;

      // `reliable` is forwarded so the tracker can refuse to act on a frame
      // whose pose the camera loop already knows is poor. A frame that is not
      // measured can never complete a repetition.
      const result = tracker.update(features, nowMs, { reliable });
      smoothedKneeAngleRef.current = result.smoothedAngle;

      // Frame-driven rep summary: remembers the deepest frame of the rep so a
      // prediction landing anywhere in the rep can judge it correctly.
      const completedRep = exercise === "squat"
        ? squatRepRef.current?.observe(features, result)
        : null;
      if (completedRep) pendingRepRef.current = completedRep;

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

    const handlePrediction = async (features, reliable, reliability) => {
      const requestedAt = performance.now();
      // Claim a slot: a slow response that lands after a newer one is dropped,
      // so stale network output can never overwrite newer valid feedback.
      const seq = predictionGuardRef.current.issue();

      let label = null;
      let fromModel = false;
      let modelReport = { ok: false, label: null, status: "not_requested" };

      try {
        const response = await api.post("/api/workout/predict", features);
        if (response.data?.prediction) {
          label = response.data.prediction;
          fromModel = true;
          modelReport = {
            ok: true,
            label,
            // Only reported when the service sends it; never invented here.
            confidence: response.data?.confidence ?? null,
            probabilities: response.data?.probabilities ?? null,
            status: response.status ?? null,
          };
        } else {
          modelReport = { ok: false, label: null, status: "empty_response" };
        }
      } catch (error) {
        // Model unavailable. Coaching continues from the movement-aware
        // assessment below - it does not depend on the network.
        modelReport = {
          ok: false,
          label: null,
          status: error?.response?.status ?? "network_error",
        };
      }

      predictionInFlightRef.current = false;

      if (!mountedRef.current) return;
      if (!predictionGuardRef.current.isCurrent(seq)) return;

      // Accuracy accounting: infrastructure fallbacks must not be scored as
      // incorrect form, so they are excluded from the denominator.
      //
      // A label belonging to a DIFFERENT exercise is also excluded: it is not a
      // classification of this exercise at all, so counting it as an error
      // would understate the model's accuracy on its own labels. What remains
      // is exactly "the model's classification accuracy for this exercise".
      let sessionAccuracy = liveAccuracyRef.current;
      if (fromModel && label && isLabelForExercise(label, exercise)) {
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

      // Movement-aware assessment: the authoritative form claim. It uses the
      // rep tracker's smoothed knee angle, so standing between reps can never
      // be mistaken for a shallow squat.
      // Squat form is judged from the completed rep's deepest frame, never from
      // a single mid-descent instant (the smoothed angle lags and would fire
      // false "go lower" cues).
      const rep = exercise === "squat" ? pendingRepRef.current : null;
      if (rep) pendingRepRef.current = null;

      const assessment =
        exercise === "squat"
          ? rep && rep.features
            ? assessSquatForm({
                features: rep.features,
                deepestKneeAngle: rep.deepestAngle,
                phase: phaseRef.current,
              })
            : null
          : null;

      // Stabilise the label that will be spoken with the existing majority gate.
      const gate = gateRef.current;
      if (gate && assessment?.label) gate.consider(assessment.label);

      const resolution = resolveFormCoaching({
        assessment: assessment ?? { label: null, reason: "no_completed_rep" },
        mlLabel: label,
        features: rep?.features ?? features,
        exercise,
      });

      // Show the model's label in the HUD only when it belongs to this
      // exercise, so the telemetry never contradicts the spoken cue.
      if (fromModel && label) {
        setLivePrediction(isLabelForExercise(label, exercise) ? label : null);
      }

      let message = null;
      let spokenLabel = null;

      if (resolution.message && exercise === "squat") {
        // Squats are already event-driven: one verdict per completed rep.
        message = resolution.message;
        spokenLabel = resolution.label;
      } else if (exercise !== "squat") {
        // Push-up / plank keep their existing arbitration path: the model label
        // when one arrives, otherwise the rule-based fallback.
        const decision = arbitrateCoaching({
          label: label || evaluateFormRuleBased(features),
          phase: phaseRef.current,
          reliable,
          exercise,
        });
        const cue = resolveCoachingCue({ decision, exercise });

        // Speak only when the confirmed form label CHANGES, not every 600ms.
        // A pose that could not be assessed is not observable: it must not be
        // mistaken for the posture having changed.
        const verdict = formCueRef.current.consider(cue?.label ?? null, exercise, {
          observable: Boolean(cue),
        });
        if (verdict.announce && cue) {
          message = cue.message;
          spokenLabel = cue.label;
        }
      }

      const isSpoken = Boolean(message) && reliable;
      if (isSpoken && feedbackHandlerRef.current) {
        feedbackHandlerRef.current({
          kind: "coaching",
          prediction: spokenLabel,
          message,
          isCorrect: spokenLabel === CORRECT_LABEL_BY_EXERCISE[exercise],
          accuracy: sessionAccuracy,
        });
      }

      diagnosticsRef.current?.log({
        exercise,
        features: rep?.features ?? features,
        reliability,
        reliable,
        phase: phaseRef.current,
        smoothedKneeAngle: smoothedKneeAngleRef.current,
        elapsedMs: Math.round(performance.now() - requestedAt),
        model: modelReport,
        ruleFallback: label ? null : "movement_assessment_used",
        assessment,
        resolution,
        spoken: isSpoken,
        message,
      });
    };

    /**
     * Camera visibility is evaluated every frame, independently of the ML
     * request, so the warning appears and clears without waiting for the
     * network and without depending on a prediction landing.
     */
    const checkVisibility = (frame) => {
      const warning = visibilityWarningRef.current?.update(frame);
      if (!warning?.visible) return;
      feedbackHandlerRef.current?.({
        kind: "visibility",
        prediction: POSE_UNRELIABLE,
        message: warning.message,
        isCorrect: false,
        isReminder: warning.isReminder,
        accuracy: liveAccuracyRef.current,
      });
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

        if (!landmarks) {
          // Nobody (or nothing) in frame at all.
          checkVisibility({
            reliable: false,
            reason: VISIBILITY_FAILURE_REASONS.NO_POSE,
          });
        } else {
          const drawingUtils = new DrawingUtils(ctx);
          drawingUtils.drawLandmarks(landmarks, {
            radius: 4,
            color: "#8B5CF6",
          });

          const features = extractExerciseFeatures(landmarks, exercise);
          const reliability = getPoseReliability(landmarks);
          const reliable = reliability >= MIN_RELIABLE_VISIBILITY;

          checkVisibility(
            features
              ? { reliable, reason: VISIBILITY_FAILURE_REASONS.LOW_VISIBILITY }
              : {
                  reliable: false,
                  reason: VISIBILITY_FAILURE_REASONS.MISSING_POINTS,
                }
          );

          // 1) Rep / set counting: every frame, purely local. Untouched by the
          //    warning cooldown so counters stay responsive.
          if (features && !completionSentRef.current) {
            updateRepsFromFeatures(features, Date.now(), reliable);
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
            handlePrediction(features, reliable, reliability).catch(() => {
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
      // Camera stopped (or exercise changed): drop any armed warning so a new
      // session never inherits an old cooldown.
      visibilityWarningRef.current?.reset();
    };
    // onFormFeedback is read through feedbackHandlerRef so that a parent
    // re-render cannot tear down and re-arm the camera loop.
  }, [cameraOn, exercise]);

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
    visibilityWarningRef.current?.reset();
    smoothedKneeAngleRef.current = null;
    squatRepRef.current?.reset();
    formCueRef.current?.reset();
    predictionGuardRef.current?.invalidate();
    pendingRepRef.current = null;
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