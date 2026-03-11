/**
 * Glare core (nucleus) drawn as a shaded circle at origin corner.
 */

import { createProgram } from '../core/compile-shader.js';

const UNIT_RADIUS = 0.1;
const SEGMENTS = 48;

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 */
export function createSphereRenderer(gl, vertSource, fragSource) {
  const program = createProgram(gl, vertSource, fragSource);
  const verts = [0, 0];
  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    verts.push(UNIT_RADIUS * Math.cos(a), UNIT_RADIUS * Math.sin(a));
  }
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  return {
    program,
    vbo,
    count: SEGMENTS + 2,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
    matrixLoc: gl.getUniformLocation(program, 'u_matrix'),
    colorLoc: gl.getUniformLocation(program, 'u_color'),
  };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {ReturnType<typeof createSphereRenderer>} renderer
 * @param {{ width: number, height: number }} resolution
 * @param {{ originPx: { x: number, y: number }, radiusPx: number }}
 */
export function drawSphere(gl, renderer, resolution, { originPx, radiusPx }) {
  const { program, positionLoc, resolutionLoc, matrixLoc, colorLoc, count } = renderer;
  gl.useProgram(program);
  const scale = radiusPx / UNIT_RADIUS;
  const scaleMat = [scale, 0, 0, 0, -scale, 0, originPx.x, originPx.y, 1];
  gl.uniform2f(resolutionLoc, resolution.width, resolution.height);
  gl.uniformMatrix3fv(matrixLoc, false, scaleMat);
  gl.uniform3fv(colorLoc, [0.85, 0.92, 1.0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vbo);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, count);
}

export { UNIT_RADIUS };
