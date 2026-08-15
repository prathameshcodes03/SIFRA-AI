import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";

import {
  initializePoseDetector,
  detectPose,
} from "../../mediapipe/poseDetector";

import { DrawingUtils } from "@mediapipe/tasks-vision";

const Camerafeed = () => {
  const [cameraOn, setCameraOn] = useState(true);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

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

    const detect = () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = detectPose(video);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);

          for (const landmarks of results.landmarks) {
            drawingUtils.drawLandmarks(landmarks, {
              radius: 4,
              color: "#8B5CF6",
            });
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
  }, [cameraOn]);

  const handleEndWorkout = () => {
    setCameraOn(false);
  };

  const handleRestart = () => {
    setCameraOn(true);
  };

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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <i className="fa-solid fa-video-slash text-6xl text-red-500"></i>

          <button
            onClick={handleRestart}
            className="mt-8 h-14 w-48 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:scale-105 duration-300"
          >
            Restart Camera
          </button>
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
