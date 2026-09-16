import { calculateAngle } from "../mathematics/angles";
import { POSE_LANDMARKS } from "../mediapipe/poseLandmarks";
import { getLandmark } from "../mediapipe/poseUtils";


export function calculateSquatFeatures(landmarks) {
  const leftShoulder = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_SHOULDER
  );

  const leftHip = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_HIP
  );

  const leftKnee = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_KNEE
  );

  const leftAnkle = getLandmark(
    landmarks,
    POSE_LANDMARKS.LEFT_ANKLE
  );

  if (
    !leftShoulder ||
    !leftHip ||
    !leftKnee ||
    !leftAnkle
  ) {
    return null;
  }

  const kneeAngle = calculateAngle(
    leftHip,
    leftKnee,
    leftAnkle
  );

  const hipAngle = calculateAngle(
    leftShoulder,
    leftHip,
    leftKnee
  );

  return {
    kneeAngle,
    hipAngle,
  };
}