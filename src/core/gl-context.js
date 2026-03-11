/**
 * WebGL context creation and capability check.
 * Spec: §3.2 core/gl-context.js
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {WebGLContextAttributes} [attrs]
 * @returns {WebGLRenderingContext | WebGL2RenderingContext | null}
 */
export function getGLContext(canvas, attrs = {}) {
  const options = { alpha: false, antialias: true, ...attrs };
  const gl =
    canvas.getContext('webgl2', options) ||
    canvas.getContext('webgl', options) ||
    null;
  return gl;
}

