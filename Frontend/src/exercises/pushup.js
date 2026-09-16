import { calculateAngle } from "../mathematics/angles";
import { POSE_LANDMARKS } from "../mediapipe/poseLandmarks";
import { getLandmark } from "../mediapipe/poseUtils";


export function calculatePushupFeatures(landmarks) {
  const shoulder = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_SHOULDER
  );

  const elbow = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_ELBOW
  );

  const wrist = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_WRIST
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
    !elbow ||
    !wrist ||
    !hip ||
    !ankle
  ) {
    return null;
  }

  const elbowAngle = calculateAngle(
    shoulder,
    elbow,
    wrist
  );

  const bodyAngle = calculateAngle(
    shoulder,
    hip,
    ankle
  );

  return {
    elbowAngle,
    bodyAngle,
  };
}