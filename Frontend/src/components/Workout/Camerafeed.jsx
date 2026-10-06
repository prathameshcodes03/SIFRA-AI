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
} from "../../exercises/featureExtractor";

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
  const [liveAccuracy, setLiveAccuracy] = useState(100);

  // Rep/set tracking state
  const [currentSet, setCurrentSet] = useState(1);
  const [completedReps, setCompletedReps] = useState(0);
  const [setCompleted, setSetCompleted] = useState([]);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSetComplete, setShowSetComplete] = useState(false);

  const { completeWorkout } = useWorkout();
  const navigate = useNavigate();

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);
  const totalChecksRef = useRef(0);
  const correctChecksRef = useRef(0);

  // Rep counting refs
  const exercisePhaseRef = useRef("up"); // "up" or "down" for dynamic exercises
  const plankHoldTimeRef = useRef(0);
  const lastPlankTickRef = useRef(0);
  const completionSentRef = useRef(false);

  const videoConstraints = {
    facingMode: "user",
    width: 1280,
    height: 720,
  };

  useEffect(() => {
    initializePoseDetector();
  }, []);

  useEffect(() => {
    if (!cameraOn) return;

    const detect = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;

        if (canvas) {
          const ctx = canvas.getContext("2d");

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const results = detectPose(video);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results && results.landmarks && results.landmarks.length > 0) {
            const drawingUtils = new DrawingUtils(ctx);

            for (const landmarks of results.landmarks) {
              drawingUtils.drawLandmarks(landmarks, {
                radius: 4,
                color: "#8B5CF6",
              });
            }

            // Real-time ML Prediction throttled every 600ms
            const now = performance.now();
            if (now - lastPredictionTimeRef.current > 600) {
              lastPredictionTimeRef.current = now;

              const features = extractExerciseFeatures(
                results.landmarks[0],
                exercise
              );

              if (features) {
                let pred = null;
                try {
                  const response = await api.post(
                    "/api/workout/predict",
                    features
                  );

                  if (response.data?.prediction) {
                    pred = response.data.prediction;
                  }
                } catch (predErr) {
                  // Fallback to rule-based evaluation if API is unavailable
                  pred = evaluateFormRuleBased(features);
                }

                if (!pred) {
                  pred = evaluateFormRuleBased(features);
                }

                if (pred) {
                  setLivePrediction(pred);

                  totalChecksRef.current += 1;
                  const isCorrect =
                    pred === "correct" ||
                    pred === "pushup_correct" ||
                    pred === "plank_correct";

                  if (isCorrect) {
                    correctChecksRef.current += 1;
                  }

                  const currentAcc = Math.round(
                    (correctChecksRef.current / totalChecksRef.current) * 100
                  );
                  setLiveAccuracy(currentAcc);

                  // Rep/set counting — only if exercise not already completed
                  if (!exerciseCompleted && !isCompleting && !completionSentRef.current) {
                    if (exercise === "plank") {
                      // Plank: count seconds of correct hold as reps
                      const now = Date.now();
                      if (lastPlankTickRef.current === 0) {
                        lastPlankTickRef.current = now;
                      }
                      const elapsed = (now - lastPlankTickRef.current) / 1000;
                      if (elapsed >= 1) {
                        plankHoldTimeRef.current += 1;
                        setCompletedReps(plankHoldTimeRef.current);
                        lastPlankTickRef.current = now;

                        if (plankHoldTimeRef.current >= reps) {
                          completeSet();
                        }
                      }
                    } else {
                      // Squat/Pushup: count reps via phase transitions
                      const angle = exercise === "squat" ? features.knee_angle : features.elbow_angle;
                      const downThreshold = exercise === "squat" ? 110 : 100;
                      const upThreshold = exercise === "squat" ? 140 : 140;

                      if (exercisePhaseRef.current === "up" && angle < downThreshold) {
                        exercisePhaseRef.current = "down";
                      } else if (exercisePhaseRef.current === "down" && angle > upThreshold) {
                        exercisePhaseRef.current = "up";
                        // Rep completed
                        setCompletedReps((prev) => {
                          const newReps = prev + 1;
                          if (newReps >= reps) {
                            completeSet();
                          }
                          return newReps;
                        });
                      }
                    }
                  }

                  const feedbackMsg = getFeedbackForPrediction(pred);

                  if (onFormFeedback) {
                    onFormFeedback({
                      prediction: pred,
                      message: feedbackMsg,
                      isCorrect,
                      accuracy: currentAcc,
                    });
                  }
                }
              }

            }
          }
        }
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [cameraOn, exercise, onFormFeedback]);

  const completeSet = () => {
    setSetCompleted((prev) => {
      const newSetCompleted = [...prev, true];

      if (newSetCompleted.length >= sets) {
        // All sets done — exercise complete
        completeExercise();
      } else {
        // Move to next set
        setCurrentSet(newSetCompleted.length + 1);
        setCompletedReps(0);
        plankHoldTimeRef.current = 0;
        lastPlankTickRef.current = 0;
        exercisePhaseRef.current = "up";
        setShowSetComplete(true);
        setTimeout(() => setShowSetComplete(false), 2000);
      }

      return newSetCompleted;
    });
  };

  const completeExercise = async () => {
    if (completionSentRef.current) return;
    completionSentRef.current = true;

    setExerciseCompleted(true);
    setIsCompleting(true);
    setCameraOn(false);

    const calculatedAccuracy =
      totalChecksRef.current > 0
        ? Math.round(
            (correctChecksRef.current / totalChecksRef.current) * 100
          )
        : 90;

    try {
      await completeWorkout({
        workoutId,
        exercise,
        sets,
        reps,
        accuracy: calculatedAccuracy,
      });

      setCompletedInfo({
        exercise,
        accuracy: calculatedAccuracy,
      });

      // Auto-advance to next exercise or navigate to dashboard
      if (currentIndex < workoutPlan.length - 1) {
        const nextExercise = workoutPlan[currentIndex + 1];
        navigate(
          `/Workout?exercise=${encodeURIComponent(
            nextExercise.exercise.toLowerCase()
          )}&workoutId=${nextExercise.id}&sets=${nextExercise.sets}&reps=${nextExercise.reps}`
        );
      } else {
        // Final exercise — workout session complete
        navigate("/Dashboard");
      }
    } catch (err) {
      console.error("Failed to complete exercise:", err);
      completionSentRef.current = false;
      setIsCompleting(false);
      setCameraOn(true);
    }
  };

  const handleEndWorkout = async () => {
    // If exercise already completed via auto-completion, don't re-complete
    if (exerciseCompleted || completionSentRef.current) return;

    setCameraOn(false);
    setSaving(true);

    const calculatedAccuracy =
      totalChecksRef.current > 0
        ? Math.round(
            (correctChecksRef.current / totalChecksRef.current) * 100
          )
        : 90;

    try {
      await completeWorkout({
        workoutId,
        exercise,
        sets,
        reps,
        accuracy: calculatedAccuracy,
      });

      setCompletedInfo({
        exercise,
        accuracy: calculatedAccuracy,
      });
    } catch (err) {
      console.error("Failed to complete workout:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    totalChecksRef.current = 0;
    correctChecksRef.current = 0;
    setCompletedInfo(null);
    setLivePrediction(null);
    setLiveAccuracy(100);
    setCurrentSet(1);
    setCompletedReps(0);
    setSetCompleted([]);
    setExerciseCompleted(false);
    setIsCompleting(false);
    setShowSetComplete(false);
    exercisePhaseRef.current = "up";
    plankHoldTimeRef.current = 0;
    lastPlankTickRef.current = 0;
    completionSentRef.current = false;
    setCameraOn(true);
  };

  const isFormCorrect =
    livePrediction === "correct" ||
    livePrediction === "pushup_correct" ||
    livePrediction === "plank_correct";

  // Reset rep/set tracking when exercise changes
  useEffect(() => {
    setCurrentSet(1);
    setCompletedReps(0);
    setSetCompleted([]);
    setExerciseCompleted(false);
    setIsCompleting(false);
    setShowSetComplete(false);
    exercisePhaseRef.current = "up";
    plankHoldTimeRef.current = 0;
    lastPlankTickRef.current = 0;
    completionSentRef.current = false;
  }, [exercise]);

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
              Score: <strong className="text-indigo-400">{liveAccuracy}%</strong>
            </span>

            {/* Rep/Set Progress */}
            {!exerciseCompleted && (
              <span className="rounded-xl border border-indigo-500/40 bg-indigo-950/80 px-3 py-1.5 font-mono text-xs font-medium text-indigo-200 shadow-md backdrop-blur-md">
                Set {currentSet}/{sets} • Rep {completedReps}/{reps}
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
                  {exerciseCompleted ? "Exercise Complete!" : "Workout Session Logged!"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Great effort on your{" "}
                  <span className="capitalize font-bold text-indigo-600">
                    {completedInfo.exercise}
                  </span>{" "}
                  routine.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-700">
                  <span>Average Accuracy: {completedInfo.accuracy}%</span>
                </div>
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
                <p className="mt-4 text-sm font-medium text-slate-600">Saving workout record...</p>
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


