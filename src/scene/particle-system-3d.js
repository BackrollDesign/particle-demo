/**
 * 3D particle system: disk around core, no collapse; wind and wave.
 * Uses scene3d-params (magnitude 10/1/0.1/0.01) for G, M, orbit, wind, wave.
 */

import { gravityAccel3D } from '../physics/gravity.js';
import { createProgram } from '../core/compile-shader.js';
import { getEffectiveMagnitudeParam } from '../config/scene3d-params.js';

const SAFE_MAX_SPEED = 1e3;
const PARTICLE_INNER_RADIUS = 0.2;

/**
 * Random point in a flat disk (z near 0); annulus [innerR, outerR].
 * @param {number} innerR
 * @param {number} outerR
 * @param {number} halfThickness max |z|
 */
const _diskOut = [0, 0, 0];
function randomInDisk(innerR, outerR, halfThickness) {
  const r = innerR + (outerR - innerR) * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  _diskOut[0] = r * Math.cos(a);
  _diskOut[1] = r * Math.sin(a);
  _diskOut[2] = (Math.random() * 2 - 1) * halfThickness;
  return _diskOut;
}

/**
 * Tangent in XY plane (perpendicular to radius in disk), so particles orbit.
 */
const _tangOut = [0, 0, 0];
function tangentInDisk(x, y) {
  const r = Math.hypot(x, y) || 0.01;
  _tangOut[0] = -y / r;
  _tangOut[1] = x / r;
  _tangOut[2] = 0;
  return _tangOut;
}

/**
 * Spawn one particle into buffers at index i.
 * @param {{ positions: Float32Array, velocities: Float32Array, sizes: Float32Array }} state
 * @param {number} i - particle index
 * @param {{ diskRadius?: number, diskThickness?: number, orbitStrength?: number, particleSize?: number }} params
 */
function spawnParticle(state, i, params) {
  const diskR = params.diskRadius ?? 2.5;
  const diskT = (params.diskThickness ?? 0.08) / 2;
  const innerR = PARTICLE_INNER_RADIUS;
  const orbitStr = params.orbitStrength ?? 0.08;
  const sizeMul = getEffectiveMagnitudeParam(params, 'particleSize');
  const ox = params.sceneOffsetX ?? 0;
  const oy = params.sceneOffsetY ?? 0;
  const oz = params.sceneOffsetZ ?? 0;
  const p = randomInDisk(innerR, diskR, diskT);
  const spx = p[0] + ox, spy = p[1] + oy, spz = p[2] + oz;
  state.positions[i * 3] = spx;
  state.positions[i * 3 + 1] = spy;
  state.positions[i * 3 + 2] = spz;
  const tang = tangentInDisk(spx - ox, spy - oy);
  const orbit = (0.3 + Math.random() * 0.7) * orbitStr;
  state.velocities[i * 3] = tang[0] * orbit + (Math.random() - 0.5) * 0.001;
  state.velocities[i * 3 + 1] = tang[1] * orbit + (Math.random() - 0.5) * 0.001;
  state.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
  state.sizes[i] = (0.5 + Math.random() * 0.8) * sizeMul;
}

/**
 * @param {number} count
 * @param {{ diskRadius?: number, diskThickness?: number, particleSize?: number, particleLifetimeMin?: number, particleLifetimeMax?: number }} params
 * @returns {{ positions: Float32Array, velocities: Float32Array, sizes: Float32Array, deathTimes: Float32Array, birthTimes: Float32Array }}
 */
export function createParticles3D(count, params = {}) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const lifeMin = Math.max(0.5, params.particleLifetimeMin ?? 2);
  const lifeMax = Math.max(lifeMin, params.particleLifetimeMax ?? 8);
  const deathTimes = new Float32Array(count);
  const birthTimes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    spawnParticle({ positions, velocities, sizes }, i, params);
    birthTimes[i] = 0;
    deathTimes[i] = lifeMin + (lifeMax - lifeMin) * Math.random();
  }
  return { positions, velocities, sizes, deathTimes, birthTimes };
}

/**
 * @param {{ positions: Float32Array, velocities: Float32Array }} state
 * @param {Record<string, number>} opts - scene3d params; G,M,orbit,wind,wave use magnitude
 * @param {number} dt
 * @param {number} time - for wave phase
 */
export function updateParticles3D(state, opts, dt, time = 0) {
  const count = state.positions.length / 3;
  const G = getEffectiveMagnitudeParam(opts, 'G');
  const M = getEffectiveMagnitudeParam(opts, 'M');
  let orbitStr = getEffectiveMagnitudeParam(opts, 'orbitStrength');
  const motionMode = opts.motionMode ?? 'orbit';
  const speedScale = Math.max(0.1, Math.min(5, Number(opts.speedScale) ?? 1));
  const maxSpeed = Math.max(0.01, Number(opts.maxSpeed) ?? 2);
  if (motionMode === 'drift') orbitStr = 0;
  else if (motionMode === 'mixed') orbitStr *= 0.5;
  else if (motionMode === 'noise') orbitStr *= 0.2;
  const damping = opts.damping ?? 0.998;
  const minR = opts.minDistance ?? 1e-4;
  const diskR = opts.diskRadius ?? 2.5;
  const diskT = (opts.diskThickness ?? 0.08) / 2;
  const windX = getEffectiveMagnitudeParam(opts, 'windX');
  const windY = getEffectiveMagnitudeParam(opts, 'windY');
  const windZ = getEffectiveMagnitudeParam(opts, 'windZ');
  const waveA = getEffectiveMagnitudeParam(opts, 'waveAmplitude');
  const waveF = getEffectiveMagnitudeParam(opts, 'waveFrequency');
  let particleNoiseAmt = opts.particleNoiseAmount ?? 0.2;
  const particleNoiseSpd = opts.particleNoiseSpeed ?? 3;
  if (motionMode === 'noise') particleNoiseAmt = Math.min(2, particleNoiseAmt * 2);
  const lifeMin = Math.max(0.5, opts.particleLifetimeMin ?? 2);
  const lifeMax = Math.max(lifeMin, opts.particleLifetimeMax ?? 8);
  const deathTimes = state.deathTimes;
  const ox = opts.sceneOffsetX ?? 0;
  const oy = opts.sceneOffsetY ?? 0;
  const oz = opts.sceneOffsetZ ?? 0;

  const birthTimes = state.birthTimes;
  for (let i = 0; i < count; i++) {
    if (deathTimes && time >= deathTimes[i]) {
      spawnParticle(state, i, opts);
      if (birthTimes) birthTimes[i] = time;
      deathTimes[i] = time + lifeMin + (lifeMax - lifeMin) * Math.random();
    }
    const px = state.positions[i * 3];
    const py = state.positions[i * 3 + 1];
    const pz = state.positions[i * 3 + 2];
    const acc = gravityAccel3D(px, py, pz, ox, oy, oz, G, M, minR);
    const tang = tangentInDisk(px - ox, py - oy);
    let vx = state.velocities[i * 3] + acc[0] * dt;
    let vy = state.velocities[i * 3 + 1] + acc[1] * dt;
    let vz = state.velocities[i * 3 + 2] + acc[2] * dt;
    vx += tang[0] * orbitStr * dt;
    vy += tang[1] * orbitStr * dt;
    vx += windX * dt;
    vy += windY * dt;
    vz += windZ * dt;
    vx *= damping;
    vy *= damping;
    vz *= damping;
    vx *= speedScale;
    vy *= speedScale;
    vz *= speedScale;
    let speed = Math.hypot(vx, vy, vz);
    if (Number.isFinite(speed) && speed > SAFE_MAX_SPEED) {
      const s = SAFE_MAX_SPEED / speed;
      vx *= s;
      vy *= s;
      vz *= s;
      speed = SAFE_MAX_SPEED;
    } else if (!Number.isFinite(speed)) {
      vx = 0;
      vy = 0;
      vz = 0;
      speed = 0;
    }
    if (Number.isFinite(speed) && speed > maxSpeed && speed > 1e-10) {
      const s = maxSpeed / speed;
      vx *= s;
      vy *= s;
      vz *= s;
    }
    if (!Number.isFinite(vx)) vx = 0;
    if (!Number.isFinite(vy)) vy = 0;
    if (!Number.isFinite(vz)) vz = 0;
    let nx = px + vx * dt;
    let ny = py + vy * dt;
    let nz = pz + vz * dt;
    const wavePhase = time * waveF + i * 0.1;
    nx += Math.sin(wavePhase) * waveA;
    ny += Math.cos(wavePhase * 1.3) * waveA;
    nz += Math.sin(wavePhase * 0.7) * waveA * 0.5;
    if (particleNoiseAmt > 0 && particleNoiseSpd > 0) {
      const phase = time * particleNoiseSpd + i * 0.07;
      nx += (Math.sin(phase) * Math.cos(phase * 1.3) + Math.sin(phase * 0.7) * 0.5) * particleNoiseAmt * 0.02;
      ny += Math.cos(phase * 1.1) * particleNoiseAmt * 0.02;
      nz += Math.sin(phase * 0.9) * particleNoiseAmt * 0.01;
    }
    const lx = nx - ox, ly = ny - oy;
    const r2 = lx * lx + ly * ly;
    const r = Math.sqrt(r2) || 0.01;
    if (r > diskR) {
      const s = diskR / r;
      nx = ox + lx * s;
      ny = oy + ly * s;
      const tn = vx * tang[0] + vy * tang[1];
      state.velocities[i * 3] = tang[0] * tn * 0.4;
      state.velocities[i * 3 + 1] = tang[1] * tn * 0.4;
      state.velocities[i * 3 + 2] = vz * 0.3;
    } else {
      state.velocities[i * 3] = vx;
      state.velocities[i * 3 + 1] = vy;
      state.velocities[i * 3 + 2] = vz;
    }
    if (diskT > 0) {
      nz = Math.max(oz - diskT, Math.min(oz + diskT, nz));
    }
    state.positions[i * 3] = nx;
    state.positions[i * 3 + 1] = ny;
    state.positions[i * 3 + 2] = nz;
  }
}

export const MAX_R3D = 3.5;

// --- Star particle system (dense spherical cluster; same physics as disk) ---

/** Uniform random point inside a sphere of given radius. */
const _sphereOut = [0, 0, 0];
function randomInSphere(radius) {
  const r = radius * Math.cbrt(Math.random());
  const theta = Math.acos(2 * Math.random() - 1);
  const phi = Math.PI * 2 * Math.random();
  _sphereOut[0] = r * Math.sin(theta) * Math.cos(phi);
  _sphereOut[1] = r * Math.sin(theta) * Math.sin(phi);
  _sphereOut[2] = r * Math.cos(theta);
  return _sphereOut;
}

/** Tangent to sphere at point (perpendicular to radius; for orbital velocity). */
const _tangSphereOut = [0, 0, 0];
function tangentToSphere(x, y, z) {
  const len = Math.sqrt(x * x + z * z) || 0.01;
  _tangSphereOut[0] = z / len;
  _tangSphereOut[1] = 0;
  _tangSphereOut[2] = -x / len;
  return _tangSphereOut;
}

function spawnStarParticle(state, i, params) {
  const starR = params.starRadius ?? 1.2;
  const orbitStr = params.orbitStrength ?? 0.08;
  const sizeMul = params.starParticleSize ?? 0.5;
  const ox = params.sceneOffsetX ?? 0;
  const oy = params.sceneOffsetY ?? 0;
  const oz = params.sceneOffsetZ ?? 0;
  const p = randomInSphere(starR);
  const spx = p[0] + ox, spy = p[1] + oy, spz = p[2] + oz;
  state.positions[i * 3] = spx;
  state.positions[i * 3 + 1] = spy;
  state.positions[i * 3 + 2] = spz;
  const tang = tangentToSphere(spx - ox, spy - oy, spz - oz);
  const orbit = (0.2 + Math.random() * 0.6) * orbitStr;
  state.velocities[i * 3] = tang[0] * orbit + (Math.random() - 0.5) * 0.002;
  state.velocities[i * 3 + 1] = tang[1] * orbit + (Math.random() - 0.5) * 0.002;
  state.velocities[i * 3 + 2] = tang[2] * orbit + (Math.random() - 0.5) * 0.002;
  state.sizes[i] = (0.4 + Math.random() * 0.8) * sizeMul;
}

/**
 * Create star particle state (spherical cluster). Same state shape as disk particles.
 * @param {number} count
 * @param {{ starRadius?: number, starParticleSize?: number, orbitStrength?: number, particleLifetimeMin?: number, particleLifetimeMax?: number }} params
 */
export function createStarParticles3D(count, params = {}) {
  if (count <= 0) {
    return { positions: new Float32Array(0), velocities: new Float32Array(0), sizes: new Float32Array(0), deathTimes: new Float32Array(0), birthTimes: new Float32Array(0) };
  }
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const lifeMin = Math.max(0.5, params.starParticleLifetimeMin ?? params.particleLifetimeMin ?? 2);
  const lifeMax = Math.max(lifeMin, params.starParticleLifetimeMax ?? params.particleLifetimeMax ?? 8);
  const deathTimes = new Float32Array(count);
  const birthTimes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    spawnStarParticle({ positions, velocities, sizes }, i, params);
    birthTimes[i] = 0;
    deathTimes[i] = lifeMin + (lifeMax - lifeMin) * Math.random();
  }
  return { positions, velocities, sizes, deathTimes, birthTimes };
}

/**
 * Update star particles: same physics as disk (gravity, wind, damping) but clamp to sphere radius.
 */
export function updateStarParticles3D(state, opts, dt, time = 0) {
  const count = state.positions.length / 3;
  if (count === 0) return;
  const G = getEffectiveMagnitudeParam(opts, 'G');
  const M = getEffectiveMagnitudeParam(opts, 'M');
  let orbitStr = getEffectiveMagnitudeParam(opts, 'orbitStrength');
  const motionMode = opts.starMotionMode ?? opts.motionMode ?? 'orbit';
  const speedScale = Math.max(0.1, Math.min(5, Number(opts.starSpeedScale ?? opts.speedScale) ?? 1));
  const maxSpeed = Math.max(0.01, Number(opts.starMaxSpeed ?? opts.maxSpeed) ?? 2);
  if (motionMode === 'drift') orbitStr = 0;
  else if (motionMode === 'mixed') orbitStr *= 0.5;
  else if (motionMode === 'noise') orbitStr *= 0.2;
  const damping = opts.damping ?? 0.998;
  const minR = opts.minDistance ?? 1e-4;
  const starR = Math.max(0.01, opts.starRadius ?? 1.2);
  const windX = getEffectiveMagnitudeParam(opts, 'windX');
  const windY = getEffectiveMagnitudeParam(opts, 'windY');
  const windZ = getEffectiveMagnitudeParam(opts, 'windZ');
  const waveA = opts.starWaveAmplitude ?? getEffectiveMagnitudeParam(opts, 'waveAmplitude');
  const waveF = opts.starWaveFrequency ?? getEffectiveMagnitudeParam(opts, 'waveFrequency');
  const deathTimes = state.deathTimes;
  const birthTimes = state.birthTimes;
  const lifeMin = Math.max(0.5, opts.starParticleLifetimeMin ?? opts.particleLifetimeMin ?? 2);
  const lifeMax = Math.max(lifeMin, opts.starParticleLifetimeMax ?? opts.particleLifetimeMax ?? 8);
  const starNoiseAmt = opts.starParticleNoiseAmount ?? opts.particleNoiseAmount ?? 0.2;
  const starNoiseSpd = opts.starParticleNoiseSpeed ?? opts.particleNoiseSpeed ?? 3;
  const ox = opts.sceneOffsetX ?? 0;
  const oy = opts.sceneOffsetY ?? 0;
  const oz = opts.sceneOffsetZ ?? 0;

  for (let i = 0; i < count; i++) {
    if (deathTimes && time >= deathTimes[i]) {
      spawnStarParticle(state, i, opts);
      if (birthTimes) birthTimes[i] = time;
      deathTimes[i] = time + lifeMin + (lifeMax - lifeMin) * Math.random();
    }
    const px = state.positions[i * 3];
    const py = state.positions[i * 3 + 1];
    const pz = state.positions[i * 3 + 2];
    const acc = gravityAccel3D(px, py, pz, ox, oy, oz, G, M, minR);
    const lpx = px - ox, lpy = py - oy, lpz = pz - oz;
    const r = Math.sqrt(lpx * lpx + lpy * lpy + lpz * lpz) || 0.01;
    const horiz = Math.sqrt(lpx * lpx + lpz * lpz) || 0.01;
    const tangX = lpz / horiz;
    const tangY = 0;
    const tangZ = -lpx / horiz;
    let vx = state.velocities[i * 3] + acc[0] * dt;
    let vy = state.velocities[i * 3 + 1] + acc[1] * dt;
    let vz = state.velocities[i * 3 + 2] + acc[2] * dt;
    vx += tangX * orbitStr * dt;
    vy += tangY * orbitStr * dt;
    vz += tangZ * orbitStr * dt;
    vx += windX * dt;
    vy += windY * dt;
    vz += windZ * dt;
    vx *= damping;
    vy *= damping;
    vz *= damping;
    vx *= speedScale;
    vy *= speedScale;
    vz *= speedScale;
    let speed = Math.hypot(vx, vy, vz);
    if (Number.isFinite(speed) && speed > SAFE_MAX_SPEED) {
      const s = SAFE_MAX_SPEED / speed;
      vx *= s; vy *= s; vz *= s;
    } else if (!Number.isFinite(speed)) {
      vx = vy = vz = 0;
      speed = 0;
    }
    if (Number.isFinite(speed) && speed > maxSpeed && speed > 1e-10) {
      const s = maxSpeed / speed;
      vx *= s; vy *= s; vz *= s;
    }
    let nx = px + vx * dt;
    let ny = py + vy * dt;
    let nz = pz + vz * dt;
    const wavePhase = time * waveF + i * 0.1;
    nx += Math.sin(wavePhase) * waveA * 0.3;
    ny += Math.cos(wavePhase * 1.3) * waveA * 0.3;
    nz += Math.sin(wavePhase * 0.7) * waveA * 0.2;
    if (starNoiseAmt > 0 && starNoiseSpd > 0) {
      const phase = time * starNoiseSpd + i * 0.07;
      nx += (Math.sin(phase) * Math.cos(phase * 1.3) + Math.sin(phase * 0.7) * 0.5) * starNoiseAmt * 0.02;
      ny += Math.cos(phase * 1.1) * starNoiseAmt * 0.02;
      nz += Math.sin(phase * 0.9) * starNoiseAmt * 0.01;
    }
    const dx = nx - ox, dy = ny - oy, dz = nz - oz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    if (dist > starR) {
      const s = starR / dist;
      nx = ox + dx * s;
      ny = oy + dy * s;
      nz = oz + dz * s;
      const rdx = nx - ox, rdy = ny - oy, rdz = nz - oz;
      const vn = (vx * rdx + vy * rdy + vz * rdz) / starR;
      state.velocities[i * 3] = (vx - (vn * rdx / starR)) * 0.4;
      state.velocities[i * 3 + 1] = (vy - (vn * rdy / starR)) * 0.4;
      state.velocities[i * 3 + 2] = (vz - (vn * rdz / starR)) * 0.4;
    } else {
      state.velocities[i * 3] = vx;
      state.velocities[i * 3 + 1] = vy;
      state.velocities[i * 3 + 2] = vz;
    }
    state.positions[i * 3] = nx;
    state.positions[i * 3 + 1] = ny;
    state.positions[i * 3 + 2] = nz;
  }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 * @param {{ positions: Float32Array, sizes: Float32Array, deathTimes?: Float32Array, birthTimes?: Float32Array }} state
 */
export function createParticle3DRenderer(gl, vertSource, fragSource, state) {
  const program = createProgram(gl, vertSource, fragSource);
  const count = state.positions.length / 3;
  const posBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();
  const birthTimeBuffer = gl.createBuffer();
  const deathTimeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.sizes, gl.STATIC_DRAW);
  const fallbackBirth = new Float32Array(count);
  const fallbackDeath = new Float32Array(count).fill(1);
  return {
    program,
    posBuffer,
    sizeBuffer,
    birthTimeBuffer,
    deathTimeBuffer,
    count,
    fallbackBirth,
    fallbackDeath,
    _lastBufSize: 0,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    sizeLoc: gl.getAttribLocation(program, 'a_size'),
    birthTimeLoc: gl.getAttribLocation(program, 'a_birthTime'),
    deathTimeLoc: gl.getAttribLocation(program, 'a_deathTime'),
    viewProjLoc: gl.getUniformLocation(program, 'u_viewProj'),
    pointScaleLoc: gl.getUniformLocation(program, 'u_pointScale'),
    maxRadiusLoc: gl.getUniformLocation(program, 'u_maxRadius'),
    colorLoc: gl.getUniformLocation(program, 'u_color'),
    timeLoc: gl.getUniformLocation(program, 'u_time'),
    particleStartSizeLoc: gl.getUniformLocation(program, 'u_particleStartSize'),
    particleEndSizeLoc: gl.getUniformLocation(program, 'u_particleEndSize'),
  };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {*} renderer
 * @param {{ positions: Float32Array, sizes: Float32Array, deathTimes?: Float32Array, birthTimes?: Float32Array }} state
 * @param {Float32Array} viewProj
 * @param {{ pointScale?: number, maxRadius?: number, color?: [number,number,number], time?: number, particleStartSize?: number, particleEndSize?: number, particleSize?: number }} opts
 */
export function drawParticles3D(gl, renderer, state, viewProj, opts = {}) {
  const {
    program, posBuffer, sizeBuffer, birthTimeBuffer, deathTimeBuffer,
    positionLoc, sizeLoc, birthTimeLoc, deathTimeLoc,
    viewProjLoc, pointScaleLoc, maxRadiusLoc, colorLoc,
    timeLoc, particleStartSizeLoc, particleEndSizeLoc,
  } = renderer;
  const stateCount = state.positions.length / 3;
  const hasLifetime = state.birthTimes && state.deathTimes;
  const baseSize = opts.particleSize ?? 0.71;
  const startSize = hasLifetime ? (opts.particleStartSize || baseSize) : 0;
  const endSize = hasLifetime ? (opts.particleEndSize || baseSize) : 0;

  gl.useProgram(program);
  gl.uniformMatrix4fv(viewProjLoc, false, viewProj);
  if (pointScaleLoc) gl.uniform1f(pointScaleLoc, opts.pointScale ?? 6);
  if (maxRadiusLoc) gl.uniform1f(maxRadiusLoc, opts.maxRadius ?? MAX_R3D);
  const col = opts.color ?? [0.9, 0.95, 1.0];
  gl.uniform3fv(colorLoc, col);
  if (timeLoc) gl.uniform1f(timeLoc, opts.time ?? 0);
  if (particleStartSizeLoc) gl.uniform1f(particleStartSizeLoc, startSize);
  if (particleEndSizeLoc) gl.uniform1f(particleEndSizeLoc, endSize);

  const sizeChanged = renderer._lastBufSize !== stateCount;
  const upload = sizeChanged ? (buf, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); }
    : (buf, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); };
  if (sizeChanged) renderer._lastBufSize = stateCount;

  upload(posBuffer, state.positions);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  upload(sizeBuffer, state.sizes);
  gl.enableVertexAttribArray(sizeLoc);
  gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

  const birthTimes = state.birthTimes || renderer.fallbackBirth;
  const deathTimes = state.deathTimes || renderer.fallbackDeath;
  if (birthTimeLoc >= 0) {
    upload(birthTimeBuffer, birthTimes);
    gl.enableVertexAttribArray(birthTimeLoc);
    gl.vertexAttribPointer(birthTimeLoc, 1, gl.FLOAT, false, 0, 0);
  }
  if (deathTimeLoc >= 0) {
    upload(deathTimeBuffer, deathTimes);
    gl.enableVertexAttribArray(deathTimeLoc);
    gl.vertexAttribPointer(deathTimeLoc, 1, gl.FLOAT, false, 0, 0);
  }

  gl.drawArrays(gl.POINTS, 0, stateCount);
}
