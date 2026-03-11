/**
 * Renders the burning-gas star via fullscreen quad + procedural fragment shader.
 * Spec: §3.2 scene/star-renderer.js
 */

import { createProgram } from '../core/compile-shader.js';

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 */
export function createStarRenderer(gl, vertSource, fragSource) {
  const program = createProgram(gl, vertSource, fragSource);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

  return {
    program,
    vbo,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
    scaleLoc: gl.getUniformLocation(program, 'u_scale'),
    timeLoc: gl.getUniformLocation(program, 'u_time'),
  };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {ReturnType<typeof createStarRenderer>} renderer
 * @param {{ width: number, height: number }} resolution
 * @param {number} scale - Star scale in pixels (tips at ~scale)
 * @param {number} time - Animation time
 */
export function drawStar(gl, renderer, resolution, scale, time) {
  const { program, positionLoc, resolutionLoc, scaleLoc, timeLoc } = renderer;
  gl.useProgram(program);
  gl.uniform2f(resolutionLoc, resolution.width, resolution.height);
  gl.uniform1f(scaleLoc, scale);
  gl.uniform1f(timeLoc, time);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vbo);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
