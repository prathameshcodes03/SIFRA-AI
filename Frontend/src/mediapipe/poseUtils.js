export function getLandmark(landmarks, index) {
  if (!landmarks || !landmarks[index]) {
    return null;
  }

  const lm = landmarks[index];
  if (
    typeof lm.x !== "number" ||
    !Number.isFinite(lm.x) ||
    typeof lm.y !== "number" ||
    !Number.isFinite(lm.y)
  ) {
    return null;
  }

  return lm;
}


export function isLandmarkVisible(
  landmarks,
  index,
  threshold = 0.5
) {
  const landmark = getLandmark(landmarks, index);

  if (!landmark) {
    return false;
  }

  return (
    landmark.visibility === undefined ||
    (typeof landmark.visibility === "number" &&
      Number.isFinite(landmark.visibility) &&
      landmark.visibility >= threshold)
  );
}