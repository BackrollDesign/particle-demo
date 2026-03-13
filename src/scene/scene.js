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

function detectPerformanceTier() {
  const ua = navigator.userAgent || '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 2;
  const memGB = (/** @type {any} */ (navigator)).deviceMemory || 4;
  if (isMobile || cores <= 2 || memGB <= 2) return 'low';
  if (cores <= 4 || dpr >= 3 || memGB <= 4) return 'medium';
  return 'high';
}

function applyPerfCaps(opts) {
  const tier = detectPerformanceTier();
  if (tier === 'low') {
    if (opts.particleCount > 15000) opts.particleCount = 15000;
    if (opts.starParticleCount > 8000) opts.starParticleCount = 8000;
    if ((opts.coreSegmentsLat ?? 64) > 32) opts.coreSegmentsLat = 32;
    if ((opts.coreSegmentsLon ?? 64) > 32) opts.coreSegmentsLon = 32;
  } else if (tier === 'medium') {
    if (opts.particleCount > 35000) opts.particleCount = 35000;
    if (opts.starParticleCount > 20000) opts.starParticleCount = 20000;
    if ((opts.coreSegmentsLat ?? 64) > 48) opts.coreSegmentsLat = 48;
    if ((opts.coreSegmentsLon ?? 64) > 48) opts.coreSegmentsLon = 48;
  }
  return opts;
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLCanvasElement} canvas
 * @param {Object} shaders - must include particles3dVert/Frag, sphere3dVert/Frag
 * @param {Object} options - merged with getDefaultScene3DParams()
 */
export function initScene(gl, canvas, shaders, options = {}) {
  const opts = applyPerfCaps(applyScene3DParams({ ...getDefaultScene3DParams(), ...options }));

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
  let lastFov = 0;
  let lastNear = 0;
  let lastFar = 0;
  const PARTICLE_COUNT_WARN = 80000;
  const FPS_WARN = 25;

  const _coreOpts = {};
  const _camPos = [0, 0, 0];
  let _cachedParticleHex = '';
  let _cachedParticleRgb = null;
  let _cachedStarHex = '';
  let _cachedStarRgb = null;
  let _cachedBgHex = '';
  let _cachedBgRgb = null;

  cachedTheme = (typeof document !== 'undefined' && document.documentElement)
    ? (document.documentElement.getAttribute('data-theme') || 'dark')
    : 'dark';

  const _perfTier = detectPerformanceTier();
  const _maxDpr = _perfTier === 'low' ? 1.5 : _perfTier === 'medium' ? 2 : 3;

  function resize() {
    const dpr = Math.min(_maxDpr, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
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
    if (bgHex !== _cachedBgHex) { _cachedBgHex = bgHex; _cachedBgRgb = bgHex ? parseHexToRgb(bgHex) : null; }
    const bgRgb = _cachedBgRgb;
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
    const nearVal = opts.near ?? 0.1;
    const farVal = opts.far ?? 100;
    if (aspect !== lastAspect || fovRad !== lastFov || nearVal !== lastNear || farVal !== lastFar) {
      lastAspect = aspect;
      lastFov = fovRad;
      lastNear = nearVal;
      lastFar = farVal;
      mat4.perspective(proj, fovRad, aspect, nearVal, farVal);
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
    const tX = opts.targetX ?? 0;
    const tY = opts.targetY ?? 0;
    const tZ = opts.targetZ ?? 0;
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
      _coreOpts.time = time;
      _coreOpts.sceneOffsetX = opts.cameraPanX ?? 0;
      _coreOpts.sceneOffsetY = opts.cameraPanY ?? 0;
      _coreOpts.sceneOffsetZ = opts.cameraPanZ ?? 0;
      _coreOpts.coreDisplayMode = opts.coreDisplayMode;
      _coreOpts.coreRadius = opts.coreRadius;
      _coreOpts.coreGlowStrength = opts.coreGlowStrength;
      _coreOpts.coreGlowAmbient = opts.coreGlowAmbient;
      _coreOpts.coreGlowRadial = opts.coreGlowRadial;
      _coreOpts.coreRotationSpeed = opts.coreRotationSpeed;
      _coreOpts.bloomEnabled = opts.bloomEnabled;
      _coreOpts.bloomRange = opts.bloomRange;
      _coreOpts.coreTextureUrl = opts.coreTextureUrl;
      _coreOpts.coreNormalMapUrl = opts.coreNormalMapUrl;
      _coreOpts.coreTextureStrength = opts.coreTextureStrength;
      _coreOpts.coreNormalStrength = opts.coreNormalStrength;
      _coreOpts.coreDispStrength = opts.coreDispStrength;
      _coreOpts.coreSpecStrength = opts.coreSpecStrength;
      _coreOpts.coreOccStrength = opts.coreOccStrength;
      _coreOpts.coreBrightnessMin = opts.coreBrightnessMin;
      _coreOpts.coreBrightnessMax = opts.coreBrightnessMax;
      _coreOpts.coreTextureType = opts.coreTextureType;
      _coreOpts.coreZExponent = opts.coreZExponent;
      _coreOpts.coreBevelSize = opts.coreBevelSize;
      _coreOpts.noiseType = opts.noiseType;
      _coreOpts.noisePeriod = opts.noisePeriod;
      _coreOpts.noiseHarmonics = opts.noiseHarmonics;
      _coreOpts.noiseAmplitude = opts.noiseAmplitude;
      _coreOpts.noiseSpeed = opts.noiseSpeed;
      _coreOpts.noiseOffsetX = opts.noiseOffsetX;
      _coreOpts.noiseOffsetY = opts.noiseOffsetY;
      _coreOpts.noiseOffsetZ = opts.noiseOffsetZ;
      _camPos[0] = camX; _camPos[1] = camY; _camPos[2] = camZ;
      _coreOpts.cameraPosition = _camPos;
      _coreOpts.lightDirX = opts.lightDirX;
      _coreOpts.lightDirY = opts.lightDirY;
      _coreOpts.lightDirZ = opts.lightDirZ;
      _coreOpts.lightHeight = opts.lightHeight;
      _coreOpts.lightDirection = opts.lightDirection;
      _coreOpts.lightIntensity = opts.lightIntensity;
      _coreOpts.ambientStrength = opts.ambientStrength;
      _coreOpts.fresnelColorHex = opts.fresnelColorHex;
      _coreOpts.fresnelPower = opts.fresnelPower;
      _coreOpts.fresnelStrength = opts.fresnelStrength;
      _coreOpts.ambientColorHex = opts.ambientColorHex;
      _coreOpts.fogEnabled = opts.fogEnabled;
      _coreOpts.fogType = opts.fogType;
      _coreOpts.fogNear = opts.fogNear;
      _coreOpts.fogFar = opts.fogFar;
      _coreOpts.fogDensity = opts.fogDensity;
      _coreOpts.fogColorHex = opts.fogColorHex;
      _coreOpts._isGlowPass = false;

      if (opts.bloomEnabled && opts.bloomRange > 0) {
        gl.depthMask(false);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        const savedRadius = _coreOpts.coreRadius;
        _coreOpts.coreRadius = opts.coreRadius * (1.0 + (opts.bloomRange / 100) * 0.5);
        _coreOpts._isGlowPass = true;
        drawSphere3D(gl, sphere3DRenderer, viewProj, _coreOpts);
        _coreOpts.coreRadius = savedRadius;
        _coreOpts._isGlowPass = false;
        gl.depthMask((opts.coreDepthWrite ?? 1) !== 0);
        if (blendMode === 'additive') gl.blendFunc(gl.ONE, gl.ONE);
        else if (blendMode === 'screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      drawSphere3D(gl, sphere3DRenderer, viewProj, _coreOpts);
    }

    opts.sceneOffsetX = opts.cameraPanX ?? 0;
    opts.sceneOffsetY = opts.cameraPanY ?? 0;
    opts.sceneOffsetZ = opts.cameraPanZ ?? 0;
    updateParticles3D(particleStateRef.current, opts, smoothDt, time);
    updateStarParticles3D(starParticleStateRef.current, opts, smoothDt, time);
    if (opts.particleColorHex !== _cachedParticleHex) {
      _cachedParticleHex = opts.particleColorHex || '';
      _cachedParticleRgb = _cachedParticleHex ? parseHexToRgb(_cachedParticleHex) : null;
    }
    let particleColor = _cachedParticleRgb;
    if (!particleColor) {
      const gradientName = opts.particleGradient && PARTICLE_GRADIENTS[opts.particleGradient]
        ? opts.particleGradient
        : DEFAULT_GRADIENT;
      particleColor = PARTICLE_GRADIENTS[gradientName] ?? PARTICLE_GRADIENTS[DEFAULT_GRADIENT];
    }
    if (opts.starParticleColorHex !== _cachedStarHex) {
      _cachedStarHex = opts.starParticleColorHex || '';
      _cachedStarRgb = _cachedStarHex ? parseHexToRgb(_cachedStarHex) : null;
    }
    let starColor = _cachedStarRgb;
    if (!starColor) {
      const starGradientName = opts.starParticleGradient && PARTICLE_GRADIENTS[opts.starParticleGradient]
        ? opts.starParticleGradient
        : DEFAULT_GRADIENT;
      starColor = PARTICLE_GRADIENTS[starGradientName] ?? PARTICLE_GRADIENTS[DEFAULT_GRADIENT];
    }
    gl.depthMask((opts.particleDepthWrite ?? 0) !== 0);
    if (theme === 'light') {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }
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
      const prevFlat = opts.coreShadingFlat;
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
      if (prevLat !== opts.coreSegmentsLat || prevLon !== opts.coreSegmentsLon || prevFlat !== opts.coreShadingFlat) {
        updateSphere3DGeometry(sphere3DRenderer, gl, opts.coreSegmentsLat ?? 24, opts.coreSegmentsLon ?? 32, !!opts.coreShadingFlat);
      }
    },
    getOptions: () => ({ ...opts }),
    getParamSchema: () => PARAM_SCHEMA,
    /** Warning when particleCount > 80k or FPS < 25, otherwise null. */
    getPerfWarning: () => currentPerfWarning,
  };
}
