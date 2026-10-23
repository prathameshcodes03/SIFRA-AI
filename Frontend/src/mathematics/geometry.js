export function calculateDistance(a, b) {
  if (!a || !b) return 0;
  const ax = typeof a.x === "number" && Number.isFinite(a.x) ? a.x : 0;
  const ay = typeof a.y === "number" && Number.isFinite(a.y) ? a.y : 0;
  const az = typeof a.z === "number" && Number.isFinite(a.z) ? a.z : 0;
  const bx = typeof b.x === "number" && Number.isFinite(b.x) ? b.x : 0;
  const by = typeof b.y === "number" && Number.isFinite(b.y) ? b.y : 0;
  const bz = typeof b.z === "number" && Number.isFinite(b.z) ? b.z : 0;

  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;

  const dist = Math.sqrt(
    dx ** 2 +
    dy ** 2 +
    dz ** 2
  );
  return Number.isFinite(dist) ? dist : 0;
}


export function calculateVector(a, b) {
  if (!a || !b) return { x: 0, y: 0, z: 0 };
  const ax = typeof a.x === "number" && Number.isFinite(a.x) ? a.x : 0;
  const ay = typeof a.y === "number" && Number.isFinite(a.y) ? a.y : 0;
  const az = typeof a.z === "number" && Number.isFinite(a.z) ? a.z : 0;
  const bx = typeof b.x === "number" && Number.isFinite(b.x) ? b.x : 0;
  const by = typeof b.y === "number" && Number.isFinite(b.y) ? b.y : 0;
  const bz = typeof b.z === "number" && Number.isFinite(b.z) ? b.z : 0;

  return {
    x: bx - ax,
    y: by - ay,
    z: bz - az,
  };
}