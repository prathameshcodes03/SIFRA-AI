import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let poseLandmarker = null;
let initializationPromise = null;
let detectorGeneration = 0;

export const initializePoseDetector = async () => {
  if (poseLandmarker) return poseLandmarker;
  if (initializationPromise) return initializationPromise;

  const generation = detectorGeneration;
  const pendingInitialization = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );

    const detector = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

    // A workout may have ended while the model was downloading. Do not let
    // that obsolete async result recreate a detector after cleanup.
    if (generation !== detectorGeneration) {
      detector.close?.();
      throw new Error("Pose detector initialization was cancelled.");
    }

    poseLandmarker = detector;
    console.log("Pose Detector Ready");
    return detector;
  })();
  initializationPromise = pendingInitialization;

  try {
    return await pendingInitialization;
  } finally {
    // Failed initialization must be retryable after the user fixes a network
    // or device issue. A successful detector remains cached above.
    if (initializationPromise === pendingInitialization) {
      initializationPromise = null;
    }
  }
};

export const detectPose = (video) => {
  if (!poseLandmarker) return null;

  return poseLandmarker.detectForVideo(video, performance.now());
};

/** Release MediaPipe resources when the workout camera leaves the page. */
export const disposePoseDetector = () => {
  detectorGeneration += 1;
  initializationPromise = null;
  if (!poseLandmarker) return;

  try {
    poseLandmarker.close?.();
  } finally {
    poseLandmarker = null;
  }
};
