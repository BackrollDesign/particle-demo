/**
 * Particle system: Glare (first quadrant from corner) or Star (inside 4-point star polygon).
 */

import { getGravityAcceleration } from '../../physics/gravity.js';
import { createProgram } from '../../core/compile-shader.js';
import { getStarBoundary, randomPointInsideStar, pointInPolygon, clampToStarBoundary } from '../geometry/star.js';

const CORE = { x: 0, y: 0 };

const DEFAULTS = {
  coreFraction: 0.5,
  coreRingRadius: 0.08,
  spreadRadius: 1.5,
  maxRadius: 5,
  orbitStrength: 0.05,
  damping: 0.995,
  minDistance: 1e-4,
  anisotropy: 0.5,
  driftStrength: 0.08,
  particleSize: 1.2,
};

/**
 * Random position in first quadrant from corner (0,0); dense near center so particles touch core.
 * @param {{ coreFraction: number, coreRingRadius: number, spreadRadius: number }} opts
 */
function randomPosition(opts = {}) {
  const cf = opts.coreFraction ?? DEFAULTS.coreFraction;
  const cr = opts.coreRingRadius ?? DEFAULTS.coreRingRadius;
  const sr = opts.spreadRadius ?? DEFAULTS.spreadRadius;
  if (Math.random() < cf) {
    const r = cr * Math.sqrt(Math.random());
    const a = (Math.PI / 2) * Math.random();
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }
  const r = cr + (sr - cr) * Math.sqrt(Math.random());
  const a = (Math.PI / 2) * Math.random();
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

/**
 * @param {number} count
 * @param {Record<string, number>} params - glare params; useStarBoundary=1 => spawn inside star polygon
 * @returns {{ positions: Float32Array, velocities: Float32Array, sizes: Float32Array }}
 */
export function createParticles(count, params = {}) {
  const positions = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  const sizes = new Float32Array(count);
  const orbitStr = params.orbitStrength ?? DEFAULTS.orbitStrength;
  const useStar = params.useStarBoundary > 0;
  const boundary = useStar ? getStarBoundary() : null;

  for (let i = 0; i < count; i++) {
    let x, y;
    if (useStar && boundary) {
      const p = randomPointInsideStar(boundary);
      x = p.x;
      y = p.y;
    } else {
      const p = randomPosition(params);
      x = p.x;
      y = p.y;
    }
    positions[i * 2] = x;
    positions[i * 2 + 1] = y;
    const r = Math.hypot(x, y) || 0.01;
    const tangentX = -y / r;
    const tangentY = x / r;
    const orbit = (0.3 + Math.random() * 0.4) * orbitStr;
    velocities[i * 2] = tangentX * orbit + (Math.random() - 0.5) * 0.004;
    velocities[i * 2 + 1] = tangentY * orbit + (Math.random() - 0.5) * 0.004;
    const sizeMul = params.particleSize ?? DEFAULTS.particleSize;
    sizes[i] = (2.2 + Math.random() * 1.8) * sizeMul;
  }
  return { positions, velocities, sizes };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 * @param {{ positions: Float32Array, velocities: Float32Array, sizes: Float32Array }} state
 */
export function createParticleRenderer(gl, vertSource, fragSource, state) {
  const program = createProgram(gl, vertSource, fragSource);
  const count = state.positions.length / 2;

  const posBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.sizes, gl.STATIC_DRAW);

  return {
    program,
    posBuffer,
    sizeBuffer,
    count,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    sizeLoc: gl.getAttribLocation(program, 'a_size'),
    resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
    matrixLoc: gl.getUniformLocation(program, 'u_matrix'),
    colorLoc: gl.getUniformLocation(program, 'u_color'),
    pointScaleLoc: gl.getUniformLocation(program, 'u_pointScale'),
    maxRadiusLoc: gl.getUniformLocation(program, 'u_maxRadius'),
  };
}

/**
 * @param {{ positions: Float32Array, velocities: Float32Array }} state
 * @param {{ G: number, M: number, orbitStrength: number, damping: number, minDistance: number, maxRadius: number, anisotropy: number }} opts
 * @param {number} dt
 */
export function updateParticles(state, opts, dt) {
  const count = state.positions.length / 2;
  const G = opts.G ?? 18;
  const M = opts.M ?? 5;
  const orbitStr = opts.orbitStrength ?? DEFAULTS.orbitStrength;
  const damping = opts.damping ?? DEFAULTS.damping;
  const minR = opts.minDistance ?? DEFAULTS.minDistance;
  const maxR = opts.maxRadius ?? DEFAULTS.maxRadius;
  const anisotropy = opts.anisotropy ?? DEFAULTS.anisotropy;
  const driftStr = opts.driftStrength ?? DEFAULTS.driftStrength;
  const useStar = opts.useStarBoundary > 0;
  const boundary = useStar ? getStarBoundary() : null;

  for (let i = 0; i < count; i++) {
    const px = state.positions[i * 2];
    const py = state.positions[i * 2 + 1];
    const r = Math.hypot(px, py) || 0.01;

    const angle = Math.atan2(py, px);
    const cos2a = Math.cos(2.0 * angle);
    const aniso = 0.5 + 0.5 * (1.0 - anisotropy) + 0.5 * anisotropy * cos2a;

    let acc = getGravityAcceleration({ x: px, y: py }, CORE, G * aniso, M, minR);

    const outwardX = px / r;
    const outwardY = py / r;
    acc = {
      x: acc.x + outwardX * driftStr,
      y: acc.y + outwardY * driftStr,
    };

    const tangentX = -py / r;
    const tangentY = px / r;

    let vx = state.velocities[i * 2] + acc.x * dt;
    let vy = state.velocities[i * 2 + 1] + acc.y * dt;
    vx += tangentX * orbitStr * dt;
    vy += tangentY * orbitStr * dt;

    vx *= damping;
    vy *= damping;

    let nx = px + vx * dt;
    let ny = py + vy * dt;

    if (useStar && boundary) {
      if (!pointInPolygon(nx, ny, boundary)) {
        const clamped = clampToStarBoundary(nx, ny, boundary);
        nx = clamped.x;
        ny = clamped.y;
        state.velocities[i * 2] *= 0.3;
        state.velocities[i * 2 + 1] *= 0.3;
      } else {
        state.velocities[i * 2] = vx;
        state.velocities[i * 2 + 1] = vy;
      }
    } else {
      if (nx < 0 || ny < 0) {
        if (nx < 0) { nx = 0; vx = Math.max(0, vx); }
        if (ny < 0) { ny = 0; vy = Math.max(0, vy); }
      }
      const newR = Math.hypot(nx, ny);
      if (newR > maxR) {
        const s = maxR / newR;
        nx *= s;
        ny *= s;
        const tangentSpeed = vx * tangentX + vy * tangentY;
        state.velocities[i * 2] = tangentX * tangentSpeed * 0.5;
        state.velocities[i * 2 + 1] = tangentY * tangentSpeed * 0.5;
      } else {
        state.velocities[i * 2] = vx;
        state.velocities[i * 2 + 1] = vy;
      }
    }
    state.positions[i * 2] = nx;
    state.positions[i * 2 + 1] = ny;
  }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {ReturnType<typeof createParticleRenderer>} renderer
 * @param {{ positions: Float32Array }} state
 * @param {{ width: number, height: number }} resolution
 * @param {{ originPx: { x: number, y: number }, scale: number }}
 */
export function drawParticles(gl, renderer, state, resolution, { originPx, scale, pointScale = 1, maxRadius = 5 }) {
  const { program, posBuffer, count, positionLoc, sizeLoc, resolutionLoc, matrixLoc, colorLoc, pointScaleLoc, maxRadiusLoc } = renderer;
  gl.useProgram(program);

  const scaleMat = [scale, 0, 0, 0, -scale, 0, originPx.x, originPx.y, 1];
  const minRes = Math.min(resolution.width, resolution.height);
  const ps = pointScale > 0 ? pointScale : minRes / 200;
  gl.uniform2f(resolutionLoc, resolution.width, resolution.height);
  gl.uniformMatrix3fv(matrixLoc, false, scaleMat);
  if (pointScaleLoc) gl.uniform1f(pointScaleLoc, ps);
  if (maxRadiusLoc) gl.uniform1f(maxRadiusLoc, maxRadius);
  gl.uniform3fv(colorLoc, [0.92, 0.97, 1.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.positions, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.sizes, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(sizeLoc);
  gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.POINTS, 0, count);
}

export const MAX_RADIUS_DEFAULT = DEFAULTS.maxRadius;
