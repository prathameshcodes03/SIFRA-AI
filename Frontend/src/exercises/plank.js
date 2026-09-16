import { calculateAngle } from "../mathematics/angles";
import { POSE_LANDMARKS } from "../mediapipe/poseLandmarks";
import { getLandmark } from "../mediapipe/poseUtils";


export function calculatePlankFeatures(landmarks) {
  const shoulder = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_SHOULDER
  );

  const hip = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_HIP
  );

  const ankle = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_ANKLE
  );

  if (
    !shoulder ||
    !hip ||
    !ankle
  ) {
    return null;
  }

  const bodyAngle = calculateAngle(
    shoulder,
    hip,
    ankle
  );

  return {
    bodyAngle,
  };
}