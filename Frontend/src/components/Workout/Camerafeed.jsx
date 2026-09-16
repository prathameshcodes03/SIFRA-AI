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
} from "../../exercises/featureExtractor";

const Camerafeed = ({
  exercise = "squat",
  workoutId = null,
  sets = 3,
  reps = 10,
  onFormFeedback,
}) => {
  const [cameraOn, setCameraOn] = useState(true);
  const [completedInfo, setCompletedInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [livePrediction, setLivePrediction] = useState(null);
  const [liveAccuracy, setLiveAccuracy] = useState(100);

  const { completeWorkout } = useWorkout();
  const navigate = useNavigate();

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);
  const totalChecksRef = useRef(0);
  const correctChecksRef = useRef(0);

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

  const handleEndWorkout = async () => {
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
    setCameraOn(true);
  };

  const isFormCorrect =
    livePrediction === "correct" ||
    livePrediction === "pushup_correct" ||
    livePrediction === "plank_correct";

  return (
    <div className="relative mx-auto aspect-video min-h-[13rem] w-full overflow-hidden rounded-2xl bg-[#11111B] shadow-[0_0_30px_rgba(139,92,246,.12)] sm:min-h-[22rem]">
      {cameraOn ? (
        <>
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={videoConstraints}
            screenshotFormat="image/jpeg"
            className="absolute w-full h-full object-cover"
          />

          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />

          {/* Live Form Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 shadow-lg ${
                !livePrediction
                  ? "bg-black/60 text-gray-300 border border-white/10"
                  : isFormCorrect
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  !livePrediction
                    ? "bg-gray-400"
                    : isFormCorrect
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-rose-400 animate-ping"
                }`}
              />
              {livePrediction
                ? livePrediction.replace(/_/g, " ").toUpperCase()
                : "TRACKING POSE..."}
            </span>

            <span className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-xs font-medium text-white/90">
              Form Score:{" "}
              <strong className="text-violet-400">{liveAccuracy}%</strong>
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          {completedInfo ? (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <i className="fa-solid fa-circle-check text-4xl"></i>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">
                  Workout Completed!
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Great effort on your{" "}
                  <span className="capitalize font-semibold text-violet-400">
                    {completedInfo.exercise}
                  </span>{" "}
                  session.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-400">
                  <span>Accuracy: {completedInfo.accuracy}%</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => navigate("/Dashboard")}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
                >
                  View Dashboard
                </button>
                <button
                  onClick={() => navigate("/WorkoutPlan")}
                  className="rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/20"
                >
                  Workout Plan
                </button>
                <button
                  onClick={handleRestart}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:text-white"
                >
                  Restart
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <i className="fa-solid fa-video-slash text-6xl text-red-500"></i>
              {saving ? (
                <p className="mt-4 text-sm text-gray-400">Saving workout...</p>
              ) : (
                <button
                  onClick={handleRestart}
                  className="mt-8 h-14 w-48 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:scale-105 duration-300"
                >
                  Restart Camera
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {cameraOn && (
        <button
          onClick={handleEndWorkout}
          className="absolute bottom-4 right-4 min-h-11 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-4 text-sm font-semibold text-white transition-all duration-300 hover:from-rose-600 hover:to-red-600 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(244,63,94,0.45)] active:scale-[0.98] sm:bottom-6 sm:right-6 sm:px-6 sm:text-base"
        >
          End Workout
        </button>
      )}
    </div>
  );
};

export default Camerafeed;


