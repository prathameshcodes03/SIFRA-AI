export function getLandmark(landmarks, index) {
  if (!landmarks || !landmarks[index]) {
    return null;
  }

  return landmarks[index];
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
    landmark.visibility >= threshold
  );
}