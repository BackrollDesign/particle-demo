/**
 * Gravity physics: universal gravitation and Euler integration.
 * Spec: §2.2 P1–P4, §3.4.
 */

const DEFAULT_MIN_R = 1e-3;

/**
 * Clamp distance to avoid division by zero.
 * @param {number} r - Distance
 * @param {number} minR - Minimum allowed distance
 * @returns {number}
 */
export function clampDistance(r, minR = DEFAULT_MIN_R) {
  return r < minR ? minR : r;
}

/**
 * Gravity acceleration toward core (a = G*M/r², direction to core).
 * @param {{ x: number, y: number }} particle - Particle position
 * @param {{ x: number, y: number }} core - Core position
 * @param {number} G - Gravitational constant (tunable)
 * @param {number} M - Core mass
 * @param {number} minR - Minimum distance for numerical stability
 * @returns {{ x: number, y: number }}
 */
export function getGravityAcceleration(particle, core, G, M, minR = DEFAULT_MIN_R) {
  const dx = core.x - particle.x;
  const dy = core.y - particle.y;
  const r = clampDistance(Math.hypot(dx, dy), minR);
  const aMag = (G * M) / (r * r);
  const ux = dx / r;
  const uy = dy / r;
  return { x: ux * aMag, y: uy * aMag };
}

/**
 * Gravity acceleration in 3D (a = G*M/r² toward core).
 * @param {{ x: number, y: number, z: number }} particle
 * @param {{ x: number, y: number, z: number }} core
 * @param {number} G
 * @param {number} M
 * @param {number} minR
 * @returns {{ x: number, y: number, z: number }}
 */
export function getGravityAcceleration3D(particle, core, G, M, minR = DEFAULT_MIN_R) {
  const dx = core.x - particle.x;
  const dy = core.y - particle.y;
  const dz = core.z - particle.z;
  const r = clampDistance(Math.sqrt(dx * dx + dy * dy + dz * dz), minR);
  const aMag = (G * M) / (r * r);
  return { x: (dx / r) * aMag, y: (dy / r) * aMag, z: (dz / r) * aMag };
}

const _accelOut = [0, 0, 0];
/**
 * Allocation-free 3D gravity acceleration using primitives.
 * Writes result into a shared module-level array and returns it.
 */
export function gravityAccel3D(px, py, pz, cx, cy, cz, G, M, minR = DEFAULT_MIN_R) {
  const dx = cx - px;
  const dy = cy - py;
  const dz = cz - pz;
  let r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (r < minR) r = minR;
  const aMag = (G * M) / (r * r);
  const inv = aMag / r;
  _accelOut[0] = dx * inv;
  _accelOut[1] = dy * inv;
  _accelOut[2] = dz * inv;
  return _accelOut;
}

/**
 * Euler integration: v += a*dt, p += v*dt.
 * Exported for tests only.
 * @param {{ px: number, py: number, vx: number, vy: number }} state
 * @param {{ x: number, y: number }} acc - Acceleration
 * @param {number} dt - Delta time
 * @returns {{ px: number, py: number, vx: number, vy: number }}
 */
export function integrateEuler(state, acc, dt) {
  const vx = state.vx + acc.x * dt;
  const vy = state.vy + acc.y * dt;
  return {
    px: state.px + vx * dt,
    py: state.py + vy * dt,
    vx,
    vy,
  };
}
