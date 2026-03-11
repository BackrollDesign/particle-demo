/**
 * Optional: draw 4-point star boundary as line loop (Iteration 1).
 */

import { createProgram } from '../core/compile-shader.js';
import { getStarBoundary } from '../geometry/star.js';

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 */
export function createStarContourRenderer(gl, vertSource, fragSource) {
  const program = createProgram(gl, vertSource, fragSource);
  const boundary = getStarBoundary();
  const verts = new Float32Array(boundary.length * 2);
  boundary.forEach((p, i) => {
    verts[i * 2] = p.x;
    verts[i * 2 + 1] = p.y;
  });
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  return {
    program,
    vbo,
    count: boundary.length,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
    matrixLoc: gl.getUniformLocation(program, 'u_matrix'),
    colorLoc: gl.getUniformLocation(program, 'u_color'),
  };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {ReturnType<typeof createStarContourRenderer>} renderer
 * @param {{ width: number, height: number }} resolution
 * @param {{ originPx: { x: number, y: number }, scale: number }}
 */
export function drawStarContour(gl, renderer, resolution, { originPx, scale }) {
  const { program, vbo, count, positionLoc, resolutionLoc, matrixLoc, colorLoc } = renderer;
  gl.useProgram(program);
  const scaleMat = [scale, 0, 0, 0, -scale, 0, originPx.x, originPx.y, 1];
  gl.uniform2f(resolutionLoc, resolution.width, resolution.height);
  gl.uniformMatrix3fv(matrixLoc, false, scaleMat);
  gl.uniform4fv(colorLoc, [0.4, 0.6, 0.9, 0.5]);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.LINE_LOOP, 0, count);
}
