/**
 * 3D sphere (nucleus) mesh with normals for lighting.
 * Configurable segments; radial glow and bloom in fragment.
 */

import { createProgram } from '../core/compile-shader.js';
import { parseHexToRgb } from '../config/scene3d-params.js';

const DEFAULT_RADIUS = 0.25;

/**
 * Build sphere mesh with single-vertex poles to avoid holes at north/south poles.
 * Layout: vertex 0 = north pole, then (latSeg-1) rings of (lonSeg+1) vertices, then vertex last = south pole.
 * @param {number} latSeg
 * @param {number} lonSeg
 * @param {number} radius
 * @returns {{ positions: number[], normals: number[], tangents: number[], indices: number[], uvs: number[] }}
 */
function buildSphereMesh(latSeg, lonSeg, radius = DEFAULT_RADIUS) {
  const positions = [];
  const normals = [];
  const tangents = [];
  const uvs = [];
  const lonCount = lonSeg + 1;
  const northPole = 0;
  positions.push(0, radius, 0);
  normals.push(0, 1, 0);
  tangents.push(1, 0, 0);
  uvs.push(0.5, 0);
  for (let lat = 1; lat < latSeg; lat++) {
    const theta = (lat / latSeg) * Math.PI;
    const y = Math.cos(theta);
    const r = Math.sin(theta);
    const v = lat / latSeg;
    for (let lon = 0; lon <= lonSeg; lon++) {
      const phi = (lon / lonSeg) * Math.PI * 2;
      const x = r * Math.cos(phi);
      const z = r * Math.sin(phi);
      positions.push(radius * x, radius * y, radius * z);
      normals.push(x, y, z);
      const sinT = Math.max(1e-5, r);
      tangents.push(-z / sinT, 0, x / sinT);
      uvs.push(lon / lonSeg, 1 - v);
    }
  }
  const southPole = 1 + (latSeg - 1) * lonCount;
  positions.push(0, -radius, 0);
  normals.push(0, -1, 0);
  tangents.push(1, 0, 0);
  uvs.push(0.5, 1);
  const indices = [];
  const firstRingStart = 1;
  for (let lon = 0; lon < lonSeg; lon++) {
    indices.push(northPole, firstRingStart + lon, firstRingStart + lon + 1);
  }
  for (let lat = 0; lat < latSeg - 2; lat++) {
    const rowStart = firstRingStart + lat * lonCount;
    for (let lon = 0; lon < lonSeg; lon++) {
      const a = rowStart + lon;
      const b = a + lonCount;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const lastRingStart = firstRingStart + (latSeg - 2) * lonCount;
  for (let lon = 0; lon < lonSeg; lon++) {
    indices.push(southPole, lastRingStart + lon + 1, lastRingStart + lon);
  }
  return { positions, normals, tangents, indices, uvs };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 * @param {{ latSegments?: number, lonSegments?: number }} options
 */
export function createSphere3DRenderer(gl, vertSource, fragSource, options = {}) {
  const latSeg = Math.max(4, Math.min(128, Math.floor(options.latSegments ?? 24)));
  const lonSeg = Math.max(4, Math.min(128, Math.floor(options.lonSegments ?? 32)));
  const program = createProgram(gl, vertSource, fragSource);
  const { positions, normals, tangents, indices, uvs } = buildSphereMesh(latSeg, lonSeg);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const nbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  const tbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
  const uvb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return {
    program,
    vbo,
    nbo,
    tbo,
    uvb,
    ibo,
    indexCount: indices.length,
    latSegments: latSeg,
    lonSegments: lonSeg,
    textures: { diffuse: null, normal: null, disp: null, spec: null, ao: null },
    texturesLoaded: null,
    positionLoc: gl.getAttribLocation(program, 'a_position'),
    normalLoc: gl.getAttribLocation(program, 'a_normal'),
    tangentLoc: gl.getAttribLocation(program, 'a_tangent'),
    uvLoc: gl.getAttribLocation(program, 'a_uv'),
    viewProjLoc: gl.getUniformLocation(program, 'u_viewProj'),
    modelLoc: gl.getUniformLocation(program, 'u_model'),
    colorLoc: gl.getUniformLocation(program, 'u_color'),
    lightDirLoc: gl.getUniformLocation(program, 'u_lightDir'),
    glowStrengthLoc: gl.getUniformLocation(program, 'u_glowStrength'),
    glowAmbientLoc: gl.getUniformLocation(program, 'u_glowAmbient'),
    lightIntensityLoc: gl.getUniformLocation(program, 'u_lightIntensity'),
    ambientStrengthLoc: gl.getUniformLocation(program, 'u_ambientStrength'),
    coreRadiusLoc: gl.getUniformLocation(program, 'u_coreRadius'),
    glowRadialLoc: gl.getUniformLocation(program, 'u_glowRadial'),
    bloomEnabledLoc: gl.getUniformLocation(program, 'u_bloomEnabled'),
    bloomRangeLoc: gl.getUniformLocation(program, 'u_bloomRange'),
    useTextureLoc: gl.getUniformLocation(program, 'u_useTexture'),
    useNormalMapLoc: gl.getUniformLocation(program, 'u_useNormalMap'),
    dispScaleLoc: gl.getUniformLocation(program, 'u_dispScale'),
    texStrengthLoc: gl.getUniformLocation(program, 'u_texStrength'),
    normalStrengthLoc: gl.getUniformLocation(program, 'u_normalStrength'),
    specStrengthLoc: gl.getUniformLocation(program, 'u_specStrength'),
    aoStrengthLoc: gl.getUniformLocation(program, 'u_aoStrength'),
    cameraPositionLoc: gl.getUniformLocation(program, 'u_cameraPosition'),
    brightnessMinLoc: gl.getUniformLocation(program, 'u_brightnessMin'),
    brightnessMaxLoc: gl.getUniformLocation(program, 'u_brightnessMax'),
    textureTypeLoc: gl.getUniformLocation(program, 'u_textureType'),
    zExponentLoc: gl.getUniformLocation(program, 'u_zExponent'),
    noiseAmplitudeLoc: gl.getUniformLocation(program, 'u_noiseAmplitude'),
    noisePeriodLoc: gl.getUniformLocation(program, 'u_noisePeriod'),
    noiseHarmonicsLoc: gl.getUniformLocation(program, 'u_noiseHarmonics'),
    noiseSpeedLoc: gl.getUniformLocation(program, 'u_noiseSpeed'),
    noiseOffsetLoc: gl.getUniformLocation(program, 'u_noiseOffset'),
    timeLoc: gl.getUniformLocation(program, 'u_time'),
    uTextureLoc: gl.getUniformLocation(program, 'u_texture'),
    uNormalMapLoc: gl.getUniformLocation(program, 'u_normalMap'),
    uDispMapLoc: gl.getUniformLocation(program, 'u_dispMap'),
    uSpecMapLoc: gl.getUniformLocation(program, 'u_specMap'),
    uAoMapLoc: gl.getUniformLocation(program, 'u_aoMap'),
    fresnelColorLoc: gl.getUniformLocation(program, 'u_fresnelColor'),
    ambientColorLoc: gl.getUniformLocation(program, 'u_ambientColor'),
    starModeLoc: gl.getUniformLocation(program, 'u_starMode'),
    fogEnabledLoc: gl.getUniformLocation(program, 'u_fogEnabled'),
    fogTypeLoc: gl.getUniformLocation(program, 'u_fogType'),
    fogNearLoc: gl.getUniformLocation(program, 'u_fogNear'),
    fogFarLoc: gl.getUniformLocation(program, 'u_fogFar'),
    fogDensityLoc: gl.getUniformLocation(program, 'u_fogDensity'),
    fogColorLoc: gl.getUniformLocation(program, 'u_fogColor'),
  };
}

/**
 * Rebuild sphere geometry with new segment counts.
 * @param {*} renderer
 * @param {WebGLRenderingContext} gl
 * @param {number} latSeg
 * @param {number} lonSeg
 */
export function updateSphere3DGeometry(renderer, gl, latSeg, lonSeg) {
  const lat = Math.max(4, Math.min(128, Math.floor(latSeg)));
  const lon = Math.max(4, Math.min(128, Math.floor(lonSeg)));
  const { positions, normals, tangents, indices, uvs } = buildSphereMesh(lat, lon);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.nbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  if (renderer.tbo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.tbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
  }
  if (renderer.uvb) {
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.uvb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  renderer.indexCount = indices.length;
  renderer.latSegments = lat;
  renderer.lonSegments = lon;
}

/** Derive texture set base path from diffuse URL (e.g. .../Ice_002_COLOR.jpg -> .../Ice_002). */
function getTextureBaseUrl(diffuseUrl) {
  const s = String(diffuseUrl).trim();
  return s.replace(/_?(?:COLOR|color|Diffuse|diffuse)(\.(?:jpg|jpeg|png|webp))?$/i, '').replace(/\.[^.]+$/, '') || s.replace(/\.[^.]+$/, '');
}

function createTexture2D(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/** 1x1 white pixel for missing maps (disp/ao/spec); normal = (0.5,0.5,1). */
function getDefaultTexture(gl, kind = 'white') {
  if (!gl._coreDefaultTex) gl._coreDefaultTex = {};
  if (gl._coreDefaultTex[kind]) return gl._coreDefaultTex[kind];
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (kind === 'normal') {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 255, 255]));
  } else if (kind === 'disp') {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  }
  gl._coreDefaultTex[kind] = tex;
  return tex;
}

const MAX_TEXTURE_DIMENSION = 2048;

/** Returns a canvas with the image drawn, scaled down if larger than MAX_TEXTURE_DIMENSION. */
function limitImageSize(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w <= MAX_TEXTURE_DIMENSION && h <= MAX_TEXTURE_DIMENSION) return img;
  const scale = Math.min(MAX_TEXTURE_DIMENSION / w, MAX_TEXTURE_DIMENSION / h, 1);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(w * scale));
  c.height = Math.max(1, Math.floor(h * scale));
  const ctx = c.getContext('2d');
  if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const TEXTURE_SLOTS = ['diffuse', 'normal', 'disp', 'spec', 'ao'];

/**
 * Load a single texture from URL (or object URL from File). Slot: diffuse | normal | disp | spec | ao.
 * @param {WebGLRenderingContext} gl
 * @param {*} renderer
 * @param {string} url
 * @param {'diffuse'|'normal'|'disp'|'spec'|'ao'} slot
 */
export function loadSphereTextureSlot(gl, renderer, url, slot) {
  if (!url || !gl || !renderer || !TEXTURE_SLOTS.includes(slot)) return;
  const loaded = renderer.texturesLoaded || {};
  if (loaded[slot] === url && renderer.textures?.[slot]) return;
  loadImage(url).then((img) => {
    if (!img) return;
    const source = limitImageSize(img);
    const textures = renderer.textures || { diffuse: null, normal: null, disp: null, spec: null, ao: null };
    const tex = textures[slot] || createTexture2D(gl);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    textures[slot] = tex;
    renderer.textures = textures;
    if (!renderer.texturesLoaded) renderer.texturesLoaded = {};
    renderer.texturesLoaded[slot] = url;
  });
}

/**
 * Load core texture set from diffuse URL. Derives Normal, Displacement, Specular, AO from same base path
 * unless coreNormalMapUrl is provided.
 * @param {WebGLRenderingContext} gl
 * @param {*} renderer
 * @param {string} diffuseUrl
 * @param {{ coreNormalMapUrl?: string, coreDispMapUrl?: string, coreSpecMapUrl?: string, coreOccMapUrl?: string }} opts
 */
export function loadSphereTexture(gl, renderer, diffuseUrl, opts = {}) {
  if (!diffuseUrl || !gl || !renderer) return;
  const normalUrl = (opts.coreNormalMapUrl && String(opts.coreNormalMapUrl).trim()) || '';
  const dispUrl = (opts.coreDispMapUrl && String(opts.coreDispMapUrl).trim()) || '';
  const specUrl = (opts.coreSpecMapUrl && String(opts.coreSpecMapUrl).trim()) || '';
  const occUrl = (opts.coreOccMapUrl && String(opts.coreOccMapUrl).trim()) || '';
  if (renderer.texturesLoaded && renderer.texturesLoaded.diffuse === diffuseUrl && !normalUrl && !dispUrl && !specUrl && !occUrl) return;
  if (renderer._loadInFlight === diffuseUrl) return;
  renderer._loadInFlight = diffuseUrl;
  const isBlob = String(diffuseUrl).startsWith('blob:');
  const base = getTextureBaseUrl(diffuseUrl);
  const urls = {
    diffuse: diffuseUrl,
    normal: normalUrl || (isBlob ? '' : base + '_NORM.jpg'),
    disp: isBlob ? dispUrl : (base + '_DISP.png'),
    spec: isBlob ? specUrl : (base + '_SPEC.jpg'),
    ao: isBlob ? occUrl : (base + '_OCC.jpg'),
  };
  const keys = isBlob
    ? ['diffuse', normalUrl && 'normal', dispUrl && 'disp', specUrl && 'spec', occUrl && 'ao'].filter(Boolean)
    : ['diffuse', 'normal', 'disp', 'spec', 'ao'];
  Promise.all(keys.map((k) => loadImage(urls[k] || ''))).then((imgs) => {
    const textures = renderer.textures || { diffuse: null, normal: null, disp: null, spec: null, ao: null };
    keys.forEach((k, i) => {
      if (imgs[i]) {
        const source = limitImageSize(imgs[i]);
        const tex = textures[k] || createTexture2D(gl);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.generateMipmap(gl.TEXTURE_2D);
        textures[k] = tex;
      }
    });
    renderer.textures = textures;
    renderer.texturesLoaded = { ...urls };
    renderer._loadInFlight = null;
  }).catch((e) => { renderer._loadInFlight = null; console.warn('sphere renderer: load texture set', e); });
}

const RADIUS = DEFAULT_RADIUS;
const _modelBuf = new Float32Array(16);

/**
 * @param {WebGLRenderingContext} gl
 * @param {*} renderer
 * @param {Float32Array} viewProj
 * @param {{ coreRadius?: number, coreGlowStrength?: number, coreGlowAmbient?: number, coreGlowRadial?: number, bloomEnabled?: number, bloomRange?: number, coreTextureUrl?: string, lightDirX?: number, lightDirY?: number, lightDirZ?: number, lightIntensity?: number, ambientStrength?: number }} opts
 */
export function drawSphere3D(gl, renderer, viewProj, opts = {}) {
  const coreRadius = opts.coreRadius ?? 0.2;
  const tex = renderer.textures;
  const loaded = renderer.texturesLoaded;
  const useTexture = !!(opts.coreTextureUrl && loaded?.diffuse === opts.coreTextureUrl && tex?.diffuse);
  const useNormalMap = !!(useTexture && tex?.normal);

  const {
    program, vbo, nbo, tbo, uvb, ibo, indexCount, positionLoc, normalLoc, tangentLoc, uvLoc,
    viewProjLoc, modelLoc, colorLoc, lightDirLoc, glowStrengthLoc, glowAmbientLoc,
    lightIntensityLoc, ambientStrengthLoc, coreRadiusLoc, glowRadialLoc, bloomEnabledLoc, bloomRangeLoc,
    useTextureLoc, useNormalMapLoc, dispScaleLoc, texStrengthLoc, normalStrengthLoc, specStrengthLoc, aoStrengthLoc, cameraPositionLoc,
    brightnessMinLoc, brightnessMaxLoc, textureTypeLoc, zExponentLoc,
    noiseAmplitudeLoc, noisePeriodLoc, noiseHarmonicsLoc, noiseSpeedLoc, noiseOffsetLoc, timeLoc,
    fresnelColorLoc, ambientColorLoc, starModeLoc,
    fogEnabledLoc, fogTypeLoc, fogNearLoc, fogFarLoc, fogDensityLoc, fogColorLoc,
  } = renderer;

  gl.useProgram(program);
  const scale = coreRadius / RADIUS;
  const speed = Number(opts.coreRotationSpeed) || 0;
  const time = Number(opts.time) || 0;
  const angle = (time * speed * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  _modelBuf[0] = scale * c; _modelBuf[1] = 0; _modelBuf[2] = scale * s; _modelBuf[3] = 0;
  _modelBuf[4] = 0; _modelBuf[5] = scale; _modelBuf[6] = 0; _modelBuf[7] = 0;
  _modelBuf[8] = -scale * s; _modelBuf[9] = 0; _modelBuf[10] = scale * c; _modelBuf[11] = 0;
  _modelBuf[12] = 0; _modelBuf[13] = 0; _modelBuf[14] = 0; _modelBuf[15] = 1;
  gl.uniformMatrix4fv(viewProjLoc, false, viewProj);
  gl.uniformMatrix4fv(modelLoc, false, _modelBuf);
  gl.uniform3fv(colorLoc, [0.85, 0.92, 1.0]);
  let lx = opts.lightDirX ?? 0.5;
  let ly = opts.lightDirY ?? 0.6;
  let lz = opts.lightDirZ ?? 0.8;
  const lightHeight = opts.lightHeight;
  const lightDirection = opts.lightDirection;
  const hasExplicitXyz = opts.lightDirX != null && opts.lightDirY != null && opts.lightDirZ != null
    && Number.isFinite(Number(opts.lightDirX)) && Number.isFinite(Number(opts.lightDirY)) && Number.isFinite(Number(opts.lightDirZ));
  if (!hasExplicitXyz && lightHeight != null && lightDirection != null && Number.isFinite(Number(lightHeight)) && Number.isFinite(Number(lightDirection))) {
    const el = (Number(lightHeight) % 360) * (Math.PI / 180);
    const az = (Number(lightDirection) % 360) * (Math.PI / 180);
    const ce = Math.cos(el);
    lx = ce * Math.cos(az);
    ly = Math.sin(el);
    lz = ce * Math.sin(az);
  } else if (hasExplicitXyz) {
    lx = Number(opts.lightDirX);
    ly = Number(opts.lightDirY);
    lz = Number(opts.lightDirZ);
  }
  const len = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
  lx /= len; ly /= len; lz /= len;
  gl.uniform3fv(lightDirLoc, [lx, ly, lz]);
  // Schema uses 0–100 for glow/light/ambient; shader expects ~0–1. Normalize so 100 → 1.
  const glowStr = Number(opts.coreGlowStrength ?? 100);
  const glowAmb = Number(opts.coreGlowAmbient ?? 100);
  const lightInt = Number(opts.lightIntensity ?? 0);
  const ambStr = Number(opts.ambientStrength ?? 0.4);
  if (glowStrengthLoc) gl.uniform1f(glowStrengthLoc, Number.isFinite(glowStr) ? Math.max(-1, Math.min(1, glowStr / 100)) : 1);
  if (glowAmbientLoc) gl.uniform1f(glowAmbientLoc, Number.isFinite(glowAmb) ? Math.max(-1, Math.min(1, glowAmb / 100)) : 0.8);
  if (lightIntensityLoc) gl.uniform1f(lightIntensityLoc, Number.isFinite(lightInt) ? (lightInt <= 1 ? lightInt : Math.min(1, lightInt / 100)) : 0);
  if (ambientStrengthLoc) gl.uniform1f(ambientStrengthLoc, Number.isFinite(ambStr) ? (ambStr <= 1 ? ambStr : Math.min(1, ambStr / 100)) : 0.4);
  const fresnelRgb = parseHexToRgb(opts.fresnelColorHex || '#FFFFFF');
  if (fresnelColorLoc && fresnelRgb) gl.uniform3fv(fresnelColorLoc, fresnelRgb);
  const ambientRgb = parseHexToRgb(opts.ambientColorHex || '#000000');
  if (ambientColorLoc && ambientRgb) gl.uniform3fv(ambientColorLoc, ambientRgb);
  if (coreRadiusLoc) gl.uniform1f(coreRadiusLoc, coreRadius);
  if (glowRadialLoc) gl.uniform1f(glowRadialLoc, Math.max(0, Math.min(1, Number(opts.coreGlowRadial ?? 1))));
  if (bloomEnabledLoc) gl.uniform1f(bloomEnabledLoc, opts.bloomEnabled ? 1.0 : 0.0);
  if (bloomRangeLoc) gl.uniform1f(bloomRangeLoc, opts.bloomRange ?? 94.7);
  if (useTextureLoc) gl.uniform1i(useTextureLoc, useTexture ? 1 : 0);
  if (useNormalMapLoc) gl.uniform1i(useNormalMapLoc, useNormalMap ? 1 : 0);
  if (dispScaleLoc) gl.uniform1f(dispScaleLoc, Number(opts.coreDispStrength ?? 0.04));
  if (texStrengthLoc) gl.uniform1f(texStrengthLoc, Number(opts.coreTextureStrength ?? 1));
  if (normalStrengthLoc) gl.uniform1f(normalStrengthLoc, Number(opts.coreNormalStrength ?? 1));
  if (specStrengthLoc) gl.uniform1f(specStrengthLoc, Number(opts.coreSpecStrength ?? 0.3));
  if (aoStrengthLoc) gl.uniform1f(aoStrengthLoc, Number(opts.coreOccStrength ?? 0.5));
  const camPos = Array.isArray(opts.cameraPosition) && opts.cameraPosition.length >= 3
    ? opts.cameraPosition : [0, 0, 5];
  if (cameraPositionLoc) gl.uniform3fv(cameraPositionLoc, camPos);
  if (brightnessMinLoc != null) gl.uniform1f(brightnessMinLoc, opts.coreBrightnessMin ?? 0);
  if (brightnessMaxLoc != null) gl.uniform1f(brightnessMaxLoc, opts.coreBrightnessMax ?? 1);
  const texType = opts.coreTextureType === 'xyz_normalized' ? 1 : (opts.coreTextureType === 'face' ? 2 : 0);
  if (textureTypeLoc != null) gl.uniform1i(textureTypeLoc, texType);
  if (zExponentLoc != null) gl.uniform1f(zExponentLoc, opts.coreZExponent ?? 1);
  const noiseAmp = (opts.noiseType && opts.noiseType !== 'none') ? (opts.noiseAmplitude ?? 0.1) : 0;
  if (noiseAmplitudeLoc != null) gl.uniform1f(noiseAmplitudeLoc, noiseAmp);
  if (noisePeriodLoc != null) gl.uniform1f(noisePeriodLoc, opts.noisePeriod ?? 1);
  if (noiseHarmonicsLoc != null) gl.uniform1f(noiseHarmonicsLoc, opts.noiseHarmonics ?? 3);
  if (noiseSpeedLoc != null) gl.uniform1f(noiseSpeedLoc, Number(opts.noiseSpeed) || 0);
  if (noiseOffsetLoc != null) gl.uniform3f(noiseOffsetLoc, opts.noiseOffsetX ?? 0, opts.noiseOffsetY ?? 0, opts.noiseOffsetZ ?? 0);
  if (timeLoc != null) gl.uniform1f(timeLoc, Number(opts.time) || 0);
  if (starModeLoc != null) gl.uniform1f(starModeLoc, opts.coreDisplayMode === 'star' ? 1.0 : 0.0);
  if (fogEnabledLoc != null) gl.uniform1f(fogEnabledLoc, opts.fogEnabled ? 1.0 : 0.0);
  if (fogTypeLoc != null) gl.uniform1f(fogTypeLoc, opts.fogType === 'exponential' ? 1.0 : 0.0);
  if (fogNearLoc != null) gl.uniform1f(fogNearLoc, opts.fogNear ?? 5);
  if (fogFarLoc != null) gl.uniform1f(fogFarLoc, opts.fogFar ?? 50);
  if (fogDensityLoc != null) gl.uniform1f(fogDensityLoc, opts.fogDensity != null && Number.isFinite(Number(opts.fogDensity)) ? Number(opts.fogDensity) : 0.05);
  const fogRgb = parseHexToRgb(opts.fogColorHex || '#0e1012');
  if (fogColorLoc != null && fogRgb) gl.uniform3fv(fogColorLoc, fogRgb);

  if (useTexture && tex) {
    const uTex = renderer.uTextureLoc;
    const uNorm = renderer.uNormalMapLoc;
    const uDisp = renderer.uDispMapLoc;
    const uSpec = renderer.uSpecMapLoc;
    const uAo = renderer.uAoMapLoc;
    if (uTex != null) gl.uniform1i(uTex, 0);
    if (uNorm != null) gl.uniform1i(uNorm, 1);
    if (uDisp != null) gl.uniform1i(uDisp, 2);
    if (uSpec != null) gl.uniform1i(uSpec, 3);
    if (uAo != null) gl.uniform1i(uAo, 4);
    const defWhite = getDefaultTexture(gl, 'white');
    const defNormal = getDefaultTexture(gl, 'normal');
    const defDisp = getDefaultTexture(gl, 'disp');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex.diffuse || defWhite);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex.normal || defNormal);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tex.disp || defDisp);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tex.spec || defWhite);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, tex.ao || defWhite);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.enableVertexAttribArray(normalLoc);
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  if (tbo != null && tangentLoc >= 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.enableVertexAttribArray(tangentLoc);
    gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);
  }
  if (uvb != null && uvLoc >= 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, uvb);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}
