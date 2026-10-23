export function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 0;

  const ax = typeof a.x === "number" && Number.isFinite(a.x) ? a.x : null;
  const ay = typeof a.y === "number" && Number.isFinite(a.y) ? a.y : null;
  const bx = typeof b.x === "number" && Number.isFinite(b.x) ? b.x : null;
  const by = typeof b.y === "number" && Number.isFinite(b.y) ? b.y : null;
  const cx = typeof c.x === "number" && Number.isFinite(c.x) ? c.x : null;
  const cy = typeof c.y === "number" && Number.isFinite(c.y) ? c.y : null;

  if (ax === null || ay === null || bx === null || by === null || cx === null || cy === null) {
    return 0;
  }

  const az = typeof a.z === "number" && Number.isFinite(a.z) ? a.z : 0;
  const bz = typeof b.z === "number" && Number.isFinite(b.z) ? b.z : 0;
  const cz = typeof c.z === "number" && Number.isFinite(c.z) ? c.z : 0;

  const ba = {
    x: ax - bx,
    y: ay - by,
    z: az - bz,
  };

  const bc = {
    x: cx - bx,
    y: cy - by,
    z: cz - bz,
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

  if (magnitudeBA === 0 || magnitudeBC === 0 || !Number.isFinite(magnitudeBA) || !Number.isFinite(magnitudeBC)) {
    return 0;
  }

  let cosineAngle =
    dotProduct / (magnitudeBA * magnitudeBC);

  if (!Number.isFinite(cosineAngle)) {
    return 0;
  }

  cosineAngle = Math.max(
    -1,
    Math.min(1, cosineAngle)
  );

  const angle =
    Math.acos(cosineAngle) * (180 / Math.PI);

  return Number.isFinite(angle) ? angle : 0;
}