export const CAMERA_STATUS = Object.freeze({
  REQUESTING_PERMISSION: "requesting_permission",
  INITIALIZING_TRACKER: "initializing_tracker",
  WAITING_FOR_POSE: "waiting_for_pose",
  TRACKING: "tracking",
  CAMERA_ERROR: "camera_error",
  TRACKER_ERROR: "tracker_error",
});

export function describeCameraError(error) {
  const name = error?.name || "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was denied. Allow camera access, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found. Connect a camera, then try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera is being used by another app. Close it, then try again.";
  }
  return "We could not start the camera. Check your device and try again.";
}

export function trackingStatusCopy(status) {
  switch (status) {
    case CAMERA_STATUS.REQUESTING_PERMISSION:
      return "REQUESTING CAMERA…";
    case CAMERA_STATUS.INITIALIZING_TRACKER:
      return "INITIALIZING TRACKER…";
    case CAMERA_STATUS.WAITING_FOR_POSE:
      return "STEP INTO FRAME…";
    case CAMERA_STATUS.TRACKING:
      return "TRACKING ACTIVE";
    default:
      return "CAMERA PAUSED";
  }
}
