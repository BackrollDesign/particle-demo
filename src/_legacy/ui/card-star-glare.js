/**
 * WebGL vector star (cross/X) with animated glow for card glare.
 * One canvas per card; shape and theme drive uniforms.
 */

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

const COLORS = {
  dark: { core: [1, 1, 1], glow: [0.75, 0.85, 1.0] },
  light: { core: [1, 1, 1], glow: [0.85, 0.92, 1.0] },
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ vert: string, frag: string, shape: 'cross' | 'x' }} options
 * @returns {{ start: () => void, stop: () => void, setTheme: (t: 'dark'|'light') => void }}
 */
export function initCardStarGlare(canvas, options) {
  const { vert, frag, shape } = options;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true }) ||
            canvas.getContext('experimental-webgl', { alpha: true, antialias: true });
  if (!gl) return { start: () => {}, stop: () => {}, setTheme: () => {} };

  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vert);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.warn('Card star vertex compile:', gl.getShaderInfoLog(vs));
    return { start: () => {}, stop: () => {}, setTheme: () => {} };
  }
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, frag);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.warn('Card star fragment compile:', gl.getShaderInfoLog(fs));
    return { start: () => {}, stop: () => {}, setTheme: () => {} };
  }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Card star link:', gl.getProgramInfoLog(program));
    return { start: () => {}, stop: () => {}, setTheme: () => {} };
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

  let theme = 'dark';
  let rafId = 0;
  let startTime = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  function frame() {
    resize();
    const time = (performance.now() - startTime) / 1000;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shape'), shape === 'x' ? 1.0 : 0.0);
    const c = COLORS[theme] || COLORS.dark;
    gl.uniform3fv(gl.getUniformLocation(program, 'u_coreColor'), c.core);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_glowColor'), c.glow);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      startTime = performance.now();
      frame();
    },
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
    setTheme(t) {
      theme = t === 'light' ? 'light' : 'dark';
    },
  };
}

/**
 * Init all card star canvases on the page.
 * @param {{ vert: string, frag: string }} shaders
 * @param {() => 'dark'|'light'} getTheme
 * @returns {Array<{ start: () => void, stop: () => void, setTheme: (t: string) => void }>}
 */
export function initAllCardStarGlares(shaders, getTheme) {
  const list = [];
  document.querySelectorAll('.alcyone-card-glare canvas[data-card-star]').forEach((canvas) => {
    const shape = (canvas.getAttribute('data-card-star') || 'cross').toLowerCase();
    const s = shape === 'x' ? 'x' : 'cross';
    const run = initCardStarGlare(canvas, { ...shaders, shape: s });
    run.setTheme(getTheme());
    run.start();
    list.push(run);
  });
  return list;
}
