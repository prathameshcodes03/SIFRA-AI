export function calculateAngle(a, b, c) {
  const ba = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: (a.z || 0) - (b.z || 0),
  };

  const bc = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: (c.z || 0) - (b.z || 0),
  };

  const dotProduct =
    ba.x * bc.x +
    ba.y * bc.y +
    ba.z * bc.z;

  const magnitudeBA = Math.sqrt(
    ba.x ** 2 +
    ba.y ** 2 +
    ba.z ** 2
  );

  const magnitudeBC = Math.sqrt(
    bc.x ** 2 +
    bc.y ** 2 +
    bc.z ** 2
  );

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0;
  }

  let cosineAngle =
    dotProduct / (magnitudeBA * magnitudeBC);

  cosineAngle = Math.max(
    -1,
    Math.min(1, cosineAngle)
  );

  const angle =
    Math.acos(cosineAngle) * (180 / Math.PI);

  return angle;
}