/**
 * 3D scene only: disk particles around nucleus, TouchDesigner-style params.
 * No 2D mode; all params from scene3d-params (magnitude 10/1/0.1/0.01, wind, wave, gradient).
 */

import {
  getDefaultScene3DParams,
  applyScene3DParams,
  PARAM_SCHEMA,
  PARTICLE_GRADIENTS,
  DEFAULT_GRADIENT,
  parseHexToRgb,
} from '../config/scene3d-params.js';
import { createSphere3DRenderer, drawSphere3D, updateSphere3DGeometry, loadSphereTexture, loadSphereTextureSlot } from './sphere-3d-renderer.js';
import {
  createParticles3D,
  createParticle3DRenderer,
  updateParticles3D,
  drawParticles3D,
  createStarParticles3D,
  updateStarParticles3D,
  MAX_R3D,
} from './particle-system-3d.js';
import * as mat4 from '../math/mat4.js';

/** Cached theme; read once at init, update via setOptions({ theme }) */
let cachedTheme = 'dark';

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLCanvasElement} canvas
 * @param {Object} shaders - must include particles3dVert/Frag, sphere3dVert/Frag
 * @param {Object} options - merged with getDefaultScene3DParams()
 */
export function initScene(gl, canvas, shaders, options = {}) {
  const opts = applyScene3DParams({ ...getDefaultScene3DParams(), ...options });

  const has3D = !!(shaders.particles3dVert && shaders.particles3dFrag && shaders.sphere3dVert && shaders.sphere3dFrag);
  if (!has3D) throw new Error('3D shaders required');

  const sphere3DRenderer = createSphere3DRenderer(gl, shaders.sphere3dVert, shaders.sphere3dFrag, {
    latSegments: opts.coreSegmentsLat ?? 24,
    lonSegments: opts.coreSegmentsLon ?? 32,
  });
  const particleStateRef = { current: createParticles3D(opts.particleCount, opts) };
  const starParticleStateRef = { current: createStarParticles3D(opts.starParticleCount ?? 0, opts) };
  const particle3DRenderer = createParticle3DRenderer(
    gl,
    shaders.particles3dVert,
    shaders.particles3dFrag,
    particleStateRef.current
  );

  const viewProj = mat4.create();
  const proj = mat4.create();
  const view = mat4.create();

  let time = 0;
  let lastTime = performance.now();
  let smoothDt = 0.016;
  let lastLoadedDiffuseUrl = '';
  let lastLoadedNormalUrl = '';
  let currentPerfWarning = null;
  let lastW = 0;
  let lastH = 0;
  let lastAspect = 0;
  const PARTICLE_COUNT_WARN = 80000;
  const FPS_WARN = 25;

  cachedTheme = (typeof document !== 'undefined' && document.documentElement)
    ? (document.documentElement.getAttribute('data-theme') || 'dark')
    : 'dark';

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (w !== lastW || h !== lastH) {
      lastW = w;
      lastH = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  /**
   * Frame loop: resize → clear + camera (viewProj) → core (drawSphere3D) → particle update (updateParticles3D) → particle draw (drawParticles3D).
   */
  function frame() {
    resize();
    const now = performance.now();
    const rawDt = Math.min(0.020, (now - lastTime) / 1000);
    smoothDt = smoothDt * 0.85 + rawDt * 0.15;
    lastTime = now;
    time += smoothDt;
    const fps = smoothDt > 0 ? 1 / smoothDt : 0;
    if ((opts.particleCount ?? 0) > PARTICLE_COUNT_WARN) {
      currentPerfWarning = `Many particles (>${PARTICLE_COUNT_WARN.toLocaleString()}). May cause lag.`;
    } else if (fps > 0 && fps < FPS_WARN) {
      currentPerfWarning = `Low FPS (${Math.round(fps)}). Reduce particle count or quality.`;
    } else {
      currentPerfWarning = null;
    }

    const resolution = { width: canvas.width, height: canvas.height };
    const aspect = resolution.width / resolution.height;

    const theme = cachedTheme;
    const bgHex = opts.backgroundColorHex && typeof opts.backgroundColorHex === 'string' ? opts.backgroundColorHex.trim() : '';
    const bgRgb = bgHex ? parseHexToRgb(bgHex) : null;
    if (bgRgb && (bgRgb[0] !== undefined || bgRgb[1] !== undefined || bgRgb[2] !== undefined)) {
      gl.clearColor(bgRgb[0], bgRgb[1], bgRgb[2], 1);
    } else if (theme === 'light') {
      gl.clearColor(1.0, 1.0, 1.0, 1);
    } else {
      gl.clearColor(0.055, 0.063, 0.071, 1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if ((opts.depthTestEnabled ?? 1) !== 0) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);

    const fovRad = ((opts.fov ?? 45) * Math.PI) / 180;
    if (aspect !== lastAspect) {
      lastAspect = aspect;
      mat4.perspective(proj, fovRad, aspect, opts.near ?? 0.1, opts.far ?? 100);
    }
    const dist = opts.cameraZ ?? 5.5;
    const angleX = opts.cameraAngleX ?? 0;
    const angleY = opts.cameraAngleY ?? 0;
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const camX = (dist * cosX * sinY) + (opts.cameraX ?? 0);
    const camY = (dist * sinX) + (opts.cameraY ?? 0);
    const camZ = dist * cosX * cosY;
    const tX = opts.targetX !== undefined ? opts.targetX : (opts.cameraPanX ?? 0);
    const tY = opts.targetY !== undefined ? opts.targetY : (opts.cameraPanY ?? 0);
    const tZ = opts.targetZ !== undefined ? opts.targetZ : (opts.cameraPanZ ?? 0);
    mat4.lookAt(view, camX, camY, camZ, tX, tY, tZ, 0, 1, 0);
    mat4.multiply(viewProj, proj, view);

    const coreEnabled = (opts.coreEnabled ?? 0) !== 0;
    if (coreEnabled) {
      gl.depthMask((opts.coreDepthWrite ?? 1) !== 0);
      const blendMode = opts.coreBlendMode ?? 'normal';
      if (blendMode === 'additive') {
        gl.blendFunc(gl.ONE, gl.ONE);
      } else if (blendMode === 'screen') {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
      } else if (blendMode === 'multiply') {
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
      } else if (blendMode === 'subtractive') {
        gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
      } else {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      if (opts.coreTextureUrl && opts.coreTextureUrl !== lastLoadedDiffuseUrl) {
        lastLoadedDiffuseUrl = opts.coreTextureUrl;
        loadSphereTexture(gl, sphere3DRenderer, opts.coreTextureUrl, {
          coreNormalMapUrl: opts.coreNormalMapUrl,
          coreDispMapUrl: opts.coreDispMapUrl,
          coreSpecMapUrl: opts.coreSpecMapUrl,
          coreOccMapUrl: opts.coreOccMapUrl,
        });
      }
      if (opts.coreNormalMapUrl && !opts.coreTextureUrl && opts.coreNormalMapUrl !== lastLoadedNormalUrl) {
        lastLoadedNormalUrl = opts.coreNormalMapUrl;
        loadSphereTextureSlot(gl, sphere3DRenderer, opts.coreNormalMapUrl, 'normal');
      }
      if (!opts.coreTextureUrl) lastLoadedDiffuseUrl = '';
      if (!opts.coreNormalMapUrl) lastLoadedNormalUrl = '';
      drawSphere3D(gl, sphere3DRenderer, viewProj, {
      time,
      coreDisplayMode: opts.coreDisplayMode,
      coreRadius: opts.coreRadius,
      coreGlowStrength: opts.coreGlowStrength,
      coreGlowAmbient: opts.coreGlowAmbient,
      coreGlowRadial: opts.coreGlowRadial,
      coreRotationSpeed: opts.coreRotationSpeed,
      bloomEnabled: opts.bloomEnabled,
      bloomRange: opts.bloomRange,
      coreTextureUrl: opts.coreTextureUrl,
      coreNormalMapUrl: opts.coreNormalMapUrl,
      coreBrightnessMin: opts.coreBrightnessMin,
      coreBrightnessMax: opts.coreBrightnessMax,
      coreTextureType: opts.coreTextureType,
      coreZExponent: opts.coreZExponent,
      noiseType: opts.noiseType,
      noisePeriod: opts.noisePeriod,
      noiseHarmonics: opts.noiseHarmonics,
      noiseAmplitude: opts.noiseAmplitude,
      noiseSpeed: opts.noiseSpeed,
      noiseOffsetX: opts.noiseOffsetX,
      noiseOffsetY: opts.noiseOffsetY,
      noiseOffsetZ: opts.noiseOffsetZ,
      cameraPosition: [camX, camY, camZ],
      lightDirX: opts.lightDirX,
      lightDirY: opts.lightDirY,
      lightDirZ: opts.lightDirZ,
      lightHeight: opts.lightHeight,
      lightDirection: opts.lightDirection,
      lightIntensity: opts.lightIntensity,
      ambientStrength: opts.ambientStrength,
      fresnelColorHex: opts.fresnelColorHex,
      ambientColorHex: opts.ambientColorHex,
      fogEnabled: opts.fogEnabled,
      fogType: opts.fogType,
      fogNear: opts.fogNear,
      fogFar: opts.fogFar,
      fogDensity: opts.fogDensity,
      fogColorHex: opts.fogColorHex,
    });
    }

    updateParticles3D(particleStateRef.current, opts, smoothDt, time);
    updateStarParticles3D(starParticleStateRef.current, opts, smoothDt, time);
    let particleColor = null;
    if (opts.particleColorHex && parseHexToRgb(opts.particleColorHex)) {
      particleColor = parseHexToRgb(opts.particleColorHex);
    }
    if (!particleColor) {
      const gradientName = opts.particleGradient && PARTICLE_GRADIENTS[opts.particleGradient]
        ? opts.particleGradient
        : DEFAULT_GRADIENT;
      particleColor = PARTICLE_GRADIENTS[gradientName] ?? PARTICLE_GRADIENTS[DEFAULT_GRADIENT];
    }
    let starColor = null;
    if (opts.starParticleColorHex && parseHexToRgb(opts.starParticleColorHex)) {
      starColor = parseHexToRgb(opts.starParticleColorHex);
    }
    if (!starColor) {
      const starGradientName = opts.starParticleGradient && PARTICLE_GRADIENTS[opts.starParticleGradient]
        ? opts.starParticleGradient
        : DEFAULT_GRADIENT;
      starColor = PARTICLE_GRADIENTS[starGradientName] ?? PARTICLE_GRADIENTS[DEFAULT_GRADIENT];
    }
    gl.depthMask((opts.particleDepthWrite ?? 0) !== 0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawParticles3D(gl, particle3DRenderer, particleStateRef.current, viewProj, {
      pointScale: opts.pointScale,
      maxRadius: opts.diskRadius ?? MAX_R3D,
      color: particleColor,
      time,
      particleSize: opts.particleSize,
      particleStartSize: opts.particleStartSize,
      particleEndSize: opts.particleEndSize,
    });
    if (starParticleStateRef.current.positions.length > 0) {
      drawParticles3D(gl, particle3DRenderer, starParticleStateRef.current, viewProj, {
        pointScale: opts.pointScale,
        maxRadius: opts.starRadius ?? MAX_R3D,
        color: starColor,
        time,
        particleSize: opts.starParticleSize,
        particleStartSize: opts.starParticleStartSize ?? 0,
        particleEndSize: opts.starParticleEndSize ?? 0,
      });
    }

    if ((opts.depthTestEnabled ?? 1) !== 0) gl.disable(gl.DEPTH_TEST);
  }

  function tick() {
    frame();
    requestAnimationFrame(tick);
  }

  resize();

  return {
    start: tick,
    setOptions(opt) {
      if (opt.theme != null) cachedTheme = String(opt.theme);
      const prevCount = opts.particleCount;
      const prevStarCount = opts.starParticleCount;
      const prevLat = opts.coreSegmentsLat;
      const prevLon = opts.coreSegmentsLon;
      const next = applyScene3DParams({ ...opts, ...opt });
      Object.assign(opts, next);
      if (opt.particleGradient != null && typeof opt.particleGradient === 'string') {
        opts.particleGradient = opt.particleGradient;
      }
      if (opt.particleColorHex != null) opts.particleColorHex = String(opt.particleColorHex).trim();
      if (prevCount !== opts.particleCount) {
        particleStateRef.current = createParticles3D(opts.particleCount, opts);
      }
      if (prevStarCount !== opts.starParticleCount) {
        starParticleStateRef.current = createStarParticles3D(opts.starParticleCount ?? 0, opts);
      }
      if (prevLat !== opts.coreSegmentsLat || prevLon !== opts.coreSegmentsLon) {
        updateSphere3DGeometry(sphere3DRenderer, gl, opts.coreSegmentsLat ?? 24, opts.coreSegmentsLon ?? 32);
      }
    },
    getOptions: () => ({ ...opts }),
    getParamSchema: () => PARAM_SCHEMA,
    /** Warning when particleCount > 80k or FPS < 25, otherwise null. */
    getPerfWarning: () => currentPerfWarning,
  };
}
