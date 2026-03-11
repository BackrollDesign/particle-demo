/**
 * Fullscreen quad + plasma fragment shader (Glare from corner, luminescent).
 */

import { createProgram } from '../core/compile-shader.js';

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 */
export function createPlasmaRenderer(gl, vertSource, fragSource) {
  const program = createProgram(gl, vertSource, fragSource);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  return {
    program,
    vbo,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
    originLoc: gl.getUniformLocation(program, 'u_origin'),
    timeLoc: gl.getUniformLocation(program, 'u_time'),
    intensityLoc: gl.getUniformLocation(program, 'u_intensity'),
    glowRadiusLoc: gl.getUniformLocation(program, 'u_glowRadius'),
    plasmaSpeedLoc: gl.getUniformLocation(program, 'u_plasmaSpeed'),
    glowFalloffLoc: gl.getUniformLocation(program, 'u_glowFalloff'),
    luminescenceLoc: gl.getUniformLocation(program, 'u_luminescence'),
  };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {ReturnType<typeof createPlasmaRenderer>} renderer
 * @param {{ width: number, height: number }} resolution
 * @param {number} time
 * @param {{ originNorm: { x: number, y: number }, intensity: number, glowRadiusUV: number, plasmaSpeed: number, glowFalloff: number, luminescence: number }} opts
 */
export function drawPlasma(gl, renderer, resolution, time, opts = {}) {
  const {
    originNorm = { x: 0, y: 0 },
    intensity = 1,
    glowRadiusUV = 0.08,
    plasmaSpeed = 0.35,
    glowFalloff = 0.4,
    luminescence = 0.9,
  } = opts;
  const { program, positionLoc, resolutionLoc, originLoc, timeLoc, intensityLoc, glowRadiusLoc, plasmaSpeedLoc, glowFalloffLoc, luminescenceLoc } = renderer;
  gl.useProgram(program);
  gl.uniform2f(resolutionLoc, resolution.width, resolution.height);
  if (originLoc) gl.uniform2f(originLoc, originNorm.x, originNorm.y);
  gl.uniform1f(timeLoc, time);
  gl.uniform1f(intensityLoc, intensity);
  if (glowRadiusLoc) gl.uniform1f(glowRadiusLoc, glowRadiusUV);
  if (plasmaSpeedLoc) gl.uniform1f(plasmaSpeedLoc, plasmaSpeed);
  if (glowFalloffLoc) gl.uniform1f(glowFalloffLoc, glowFalloff);
  if (luminescenceLoc) gl.uniform1f(luminescenceLoc, luminescence);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vbo);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
