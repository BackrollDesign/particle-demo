/**
 * 3D scene parameters (TouchDesigner-style).
 * Per-field magnitude 10 | 1 | 0.1 | 0.01; hex color; preset export.
 * Filter schema version for preset compatibility and migration.
 */

/** Filter schema version: added to preset on save; used for migration when loading older presets. */
export const FILTER_SCHEMA_VERSION = 3.3;

/** Magnitude multipliers: index 0=10, 1=1, 2=0.1, 3=0.01 */
export const MAGNITUDES = [10, 1, 0.1, 0.01];

/** Params that use magnitude; each has per-field mag_KEY (0..3). */
export const MAGNITUDE_PARAMS = ['G', 'M', 'orbitStrength', 'windX', 'windY', 'windZ', 'waveAmplitude', 'waveFrequency', 'particleSize'];

/** Particle gradient presets: name -> [r,g,b] */
export const PARTICLE_GRADIENTS = {
  white: [0.98, 0.98, 1.0],
  blue: [0.35, 0.55, 1.0],
  cyan: [0.25, 0.85, 1.0],
  warm: [1.0, 0.75, 0.5],
  green: [0.35, 1.0, 0.5],
};

/**
 * Normalize hex to 6-char form. "#f00" -> "#ff0000", "#ff0000" -> "#ff0000". Returns '' if invalid.
 * @param {string} hex
 * @returns {string}
 */
export function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return '';
  const s = hex.replace(/^#/, '').trim();
  if (s.length === 3 && /^[0-9a-fA-F]{3}$/.test(s)) return '#' + s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length === 6 && /^[0-9a-fA-F]{6}$/.test(s)) return '#' + s;
  return '';
}

/**
 * Parse hex color to [r, g, b] in 0..1. Returns null if invalid.
 * @param {string} hex e.g. "#fff" or "#ffffff"
 * @returns {[number,number,number]|null}
 */
export function parseHexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const s = hex.replace(/^#/, '');
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    if (Number.isNaN(r + g + b)) return null;
    return [r / 255, g / 255, b / 255];
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    if (Number.isNaN(r + g + b)) return null;
    return [r / 255, g / 255, b / 255];
  }
  return null;
}

/** Blend modes for core glow (WebGL blend). */
export const BLEND_MODES = ['normal', 'additive', 'screen', 'multiply', 'subtractive'];

/** Texture projection type for core (UV, XYZ normalized, Face). */
export const CORE_TEXTURE_TYPES = ['uv', 'xyz_normalized', 'face'];

/** Noise types for 3D shape / particles. */
export const NOISE_TYPES = ['none', 'simplex', 'perlin', 'value'];

/** Particle motion modes: orbit, drift, mixed, noise. */
export const MOTION_MODES = ['orbit', 'drift', 'mixed', 'noise'];

/** Core display mode: planet (default) or star (Alcyone-style bright glow). */
export const CORE_DISPLAY_MODES = ['planet', 'star'];

/** Fog type: linear (use near/far) or exponential (use density). */
export const FOG_TYPES = ['linear', 'exponential'];

/** Option keys that are string values (not coerced to number in UI). */
export const STRING_OPT_KEYS = ['particleColorHex', 'starParticleColorHex', 'fresnelColorHex', 'ambientColorHex', 'fogColorHex', 'backgroundColorHex', 'fogType', 'coreTextureUrl', 'coreNormalMapUrl', 'coreDispMapUrl', 'coreSpecMapUrl', 'coreOccMapUrl', 'particleGradient', 'starParticleGradient', 'coreTextureType', 'noiseType', 'coreBlendMode', 'motionMode', 'starMotionMode', 'coreDisplayMode'];

/** Default preset (values on load and in getDefaultScene3DParams). */
/** @type {Record<string, { default: number | string, min?: number, max?: number, label?: string }>} */
export const PARAM_SCHEMA = {
  magnitudeLevel: { default: 1, min: 0, max: 3, label: 'Default precision' },
  // Camera (±100 where applicable)
  cameraX: { default: 0, min: -100, max: 100, label: 'Camera X' },
  cameraY: { default: -0.5, min: -100, max: 100, label: 'Camera Y' },
  cameraZ: { default: 3, min: 1, max: 100, label: 'Camera Z' },
  cameraAngleX: { default: 1.4, min: -1.4, max: 1.4, label: 'Rotation X (vert.)' },
  cameraAngleY: { default: -0.58, min: -6.28, max: 6.28, label: 'Rotation Y (horiz.)' },
  cameraPanX: { default: 0.1, min: -100, max: 100, label: 'Scene offset X' },
  cameraPanY: { default: 0, min: -100, max: 100, label: 'Scene offset Y' },
  cameraPanZ: { default: 0, min: -100, max: 100, label: 'Scene offset Z' },
  targetX: { default: 0, min: -100, max: 100, label: 'LookAt target X' },
  targetY: { default: 0, min: -100, max: 100, label: 'LookAt target Y' },
  targetZ: { default: 0, min: -100, max: 100, label: 'LookAt target Z' },
  fov: { default: 45, min: 5, max: 120, label: 'FOV (deg)' },
  near: { default: 0.1, min: 0.01, max: 10, label: 'Near clip' },
  far: { default: 100, min: 10, max: 1000, label: 'Far clip' },
  orbitDamping: { default: 0.92, min: 0, max: 1, label: 'Orbit damping' },
  // Fog
  fogEnabled: { default: 0, min: 0, max: 1, label: 'Fog' },
  fogType: { default: 'linear', label: 'Fog type' },
  fogNear: { default: 5, min: 0, max: 100, label: 'Fog start' },
  fogFar: { default: 50, min: 1, max: 200, label: 'Fog end' },
  fogDensity: { default: 0.05, min: 0.001, max: 0.5, label: 'Fog density' },
  fogColorHex: { default: '#0e1012', label: 'Fog color' },
  // Gravity
  G: { default: -35, min: -100, max: 100, label: 'Gravity' },
  M: { default: 0.01, min: 0.001, max: 10, label: 'Core mass' },
  orbitStrength: { default: -29.4, min: -100, max: 100, label: 'Orbit strength' },
  damping: { default: 0.5, min: 0.5, max: 1, label: 'Velocity damping' },
  minDistance: { default: 0.0001, min: 1e-6, max: 0.1, label: 'Min. distance' },
  // Core (sphere nucleus; can be disabled)
  coreEnabled: { default: 0, min: 0, max: 1, label: 'Core (sphere) enabled' },
  coreRadius: { default: 0.31, min: 0.05, max: 10, label: 'Core radius' },
  coreGlowStrength: { default: 100, min: -100, max: 100, label: 'Core glow' },
  coreGlowAmbient: { default: 100, min: -100, max: 100, label: 'Core ambient glow' },
  coreGlowRadial: { default: 1, min: 0, max: 1, label: 'Radial glow' },
  coreBlendMode: { default: 'normal', label: 'Core blend mode' },
  coreSegmentsLat: { default: 64, min: 4, max: 128, label: 'Core segments (latitude)' },
  coreSegmentsLon: { default: 64, min: 4, max: 128, label: 'Core segments (longitude)' },
  coreTextureUrl: { default: '', label: 'Core texture URL (Color)' },
  coreNormalMapUrl: { default: '', label: 'Normal map URL' },
  coreDispMapUrl: { default: '', label: 'Displacement map URL' },
  coreSpecMapUrl: { default: '', label: 'Specular map URL' },
  coreOccMapUrl: { default: '', label: 'AO map URL' },
  coreTextureStrength: { default: 1, min: 0, max: 1, label: 'Texture blend' },
  coreNormalStrength: { default: 1, min: 0, max: 2, label: 'Normal map strength' },
  coreDispStrength: { default: 0.04, min: 0, max: 0.2, label: 'Displacement strength' },
  coreSpecStrength: { default: 0.3, min: 0, max: 2, label: 'Specular strength' },
  coreOccStrength: { default: 0.5, min: 0, max: 1, label: 'AO strength' },
  coreBrightnessMin: { default: 0, min: -1, max: 2, label: 'Map brightness (min) / Fresnel bias' },
  coreBrightnessMax: { default: 1, min: 0, max: 2, label: 'Map brightness (max)' },
  coreTextureType: { default: 'uv', label: 'Texture projection type' },
  coreZExponent: { default: 1, min: 0.2, max: 3, label: 'Z exponent' },
  coreBevelSize: { default: 0, min: 0, max: 1, label: 'Bevel size' },
  coreRotationSpeed: { default: 0, min: 0, max: 30, label: 'Core auto-rotate (deg/s)' },
  coreDisplayMode: { default: 'planet', label: 'Core display' },
  noiseType: { default: 'none', label: 'Noise type' },
  noisePeriod: { default: 1, min: 0.01, max: 20, label: 'Noise period' },
  noiseHarmonics: { default: 3, min: 1, max: 8, label: 'Noise harmonics' },
  noiseAmplitude: { default: 0.1, min: 0, max: 2, label: 'Noise amplitude' },
  noiseSpeed: { default: 0, min: 0, max: 10, label: 'Noise speed' },
  noiseOffsetX: { default: 0, min: -10, max: 10, label: 'Noise offset X' },
  noiseOffsetY: { default: 0, min: -10, max: 10, label: 'Noise offset Y' },
  noiseOffsetZ: { default: 0, min: -10, max: 10, label: 'Noise offset Z' },
  backgroundColorHex: { default: '', label: 'Background color' },
  // Bloom
  bloomEnabled: { default: 1, min: 0, max: 1, label: 'Bloom mode' },
  bloomRange: { default: 94.7, min: 0.2, max: 100, label: 'Bloom range' },
  // Particles
  particleCount: { default: 46000, min: 500, max: 100000, label: 'Particle count' },
  particleSize: { default: 0.71, min: 0.01, max: 100, label: 'Particle size' },
  particleStartSize: { default: 0, min: 0, max: 100, label: 'Particle start size' },
  particleEndSize: { default: 0, min: 0, max: 100, label: 'Particle end size' },
  diskRadius: { default: 3.8, min: 0.2, max: 100, label: 'Disk radius' },
  diskThickness: { default: 0.08, min: 0.001, max: 100, label: 'Disk thickness' },
  particleNoiseAmount: { default: 0.2, min: 0, max: 2, label: 'Particle noise (amplitude)' },
  particleNoiseSpeed: { default: 3, min: 0, max: 20, label: 'Particle noise speed' },
  particleLifetimeMin: { default: 2, min: 0.5, max: 60, label: 'Particle lifetime (min), s' },
  particleLifetimeMax: { default: 8, min: 0.5, max: 60, label: 'Particle lifetime (max), s' },
  motionMode: { default: 'orbit', label: 'Particle motion mode' },
  speedScale: { default: 1, min: 0.1, max: 5, label: 'Speed scale' },
  maxSpeed: { default: 2, min: 0.01, max: 50, label: 'Max speed' },
  // Star (spherical particle cluster; Particle Star section)
  starParticleCount: { default: 20000, min: 0, max: 100000, label: 'Star particle count' },
  starRadius: { default: 1.2, min: 0.1, max: 20, label: 'Star cluster radius' },
  starParticleSize: { default: 0.5, min: 0.01, max: 10, label: 'Star particle size' },
  starParticleStartSize: { default: 0, min: 0, max: 100, label: 'Star particle start size' },
  starParticleEndSize: { default: 0, min: 0, max: 100, label: 'Star particle end size' },
  starParticleNoiseAmount: { default: 0.2, min: 0, max: 2, label: 'Star particle noise (amplitude)' },
  starParticleNoiseSpeed: { default: 3, min: 0, max: 20, label: 'Star particle noise speed' },
  starParticleLifetimeMin: { default: 2, min: 0.5, max: 60, label: 'Star particle lifetime (min), s' },
  starParticleLifetimeMax: { default: 8, min: 0.5, max: 60, label: 'Star particle lifetime (max), s' },
  starMotionMode: { default: 'orbit', label: 'Star particle motion mode' },
  starSpeedScale: { default: 1, min: 0.1, max: 5, label: 'Star speed scale' },
  starMaxSpeed: { default: 2, min: 0.01, max: 50, label: 'Star max speed' },
  // Wind
  windX: { default: 11, min: -100, max: 100, label: 'Wind X' },
  windY: { default: 0, min: -100, max: 100, label: 'Wind Y' },
  windZ: { default: 2.5, min: -100, max: 100, label: 'Wind Z' },
  // Waves (disk particles)
  waveAmplitude: { default: 0, min: -100, max: 100, label: 'Wave amplitude' },
  waveFrequency: { default: 53.01, min: 0.01, max: 100, label: 'Wave frequency' },
  // Waves (star particles)
  starWaveAmplitude: { default: 0, min: -100, max: 100, label: 'Star wave amplitude' },
  starWaveFrequency: { default: 0.51, min: 0.01, max: 100, label: 'Star wave frequency' },
  // Light
  lightDirX: { default: 0.5, min: -1, max: 1, label: 'Light direction X' },
  lightDirY: { default: 0.6, min: -1, max: 1, label: 'Light direction Y' },
  lightDirZ: { default: 0.8, min: -1, max: 1, label: 'Light direction Z' },
  lightIntensity: { default: 0, min: 0, max: 100, label: 'Light intensity' },
  ambientStrength: { default: 0.4, min: 0, max: 100, label: 'Ambient light' },
  lightHeight: { default: 181, min: 0, max: 360, label: 'Light height (deg)' },
  lightDirection: { default: 280, min: 0, max: 360, label: 'Light direction (deg)' },
  fresnelColorHex: { default: '#FFFFFF', label: 'Rim light color' },
  fresnelPower: { default: 3, min: 0.5, max: 8, label: 'Rim light sharpness' },
  fresnelStrength: { default: 0.5, min: 0, max: 2, label: 'Rim light strength' },
  ambientColorHex: { default: '#000000', label: 'Ambient color' },
  // Display
  pointScale: { default: 27.5, min: 0.5, max: 5000, label: 'On-screen point size' },
  coreDepthWrite: { default: 1, min: 0, max: 1, label: 'Core depth write' },
  particleDepthWrite: { default: 0, min: 0, max: 1, label: 'Particle depth write' },
  depthTestEnabled: { default: 1, min: 0, max: 1, label: 'Depth test' },
};

// Per-field magnitude (0..3), default ×1
MAGNITUDE_PARAMS.forEach((key) => {
  PARAM_SCHEMA['mag_' + key] = { default: 1, min: 0, max: 3, label: 'Scale ' + key };
});

/** particleGradient / particleColorHex (not in PARAM_SCHEMA); default preset */
export const DEFAULT_GRADIENT = 'white';
export const DEFAULT_PARTICLE_COLOR_HEX = '#b8e4ff';
export const DEFAULT_STAR_GRADIENT = 'white';
export const DEFAULT_STAR_COLOR_HEX = '#8ac2ff';

/** Default preset overlay (user-provided defaults; texture URLs empty for portability). */
const DEFAULT_PRESET = {
  particleGradient: 'white',
  particleColorHex: '#b8e4ff',
  starParticleGradient: 'white',
  starParticleColorHex: '#8ac2ff',
  magnitudeLevel: 1,
  cameraX: 2,
  cameraY: -2,
  cameraZ: 33.5,
  cameraAngleX: -1.15,
  cameraAngleY: 1.57,
  cameraPanX: 0.09,
  cameraPanY: 0.3,
  cameraPanZ: -0.06,
  targetX: 0.31,
  targetY: -1,
  targetZ: -0.05,
  fov: 44,
  near: 1.29,
  far: 1000,
  orbitDamping: 1,
  fogEnabled: 1,
  fogType: 'exponential',
  fogNear: 100,
  fogFar: 200,
  fogDensity: 0.001,
  fogColorHex: '#000000',
  G: 100,
  M: 9.991,
  orbitStrength: 63.5,
  damping: 0.735,
  minDistance: 0.00071,
  coreEnabled: 1,
  coreRadius: 10,
  coreGlowStrength: 0,
  coreGlowAmbient: 100,
  coreGlowRadial: 1,
  coreBlendMode: 'additive',
  coreSegmentsLat: 128,
  coreSegmentsLon: 128,
  coreTextureUrl: '',
  coreNormalMapUrl: '',
  coreDispMapUrl: '',
  coreSpecMapUrl: '',
  coreOccMapUrl: '',
  coreTextureStrength: 1,
  coreNormalStrength: 2,
  coreDispStrength: 0,
  coreSpecStrength: 0.58,
  coreOccStrength: 0.19,
  coreBrightnessMin: -0.16,
  coreBrightnessMax: 0.4,
  coreTextureType: 'uv',
  coreZExponent: 1,
  coreRotationSpeed: 0,
  coreDisplayMode: 'star',
  noiseType: 'none',
  noisePeriod: 2.41,
  noiseHarmonics: 7,
  noiseAmplitude: 0.05,
  noiseSpeed: 1.7,
  noiseOffsetX: 1.4,
  noiseOffsetY: -0.2,
  noiseOffsetZ: 1,
  backgroundColorHex: '#000000',
  bloomEnabled: 1,
  bloomRange: 100,
  particleCount: 73000,
  particleSize: 0.01,
  particleStartSize: 0.1,
  particleEndSize: 8.68,
  diskRadius: 100,
  diskThickness: 1.996,
  particleNoiseAmount: 0.05,
  particleNoiseSpeed: 20,
  particleLifetimeMin: 5,
  particleLifetimeMax: 25,
  motionMode: 'orbit',
  speedScale: 0.8,
  maxSpeed: 3.91,
  starParticleCount: 70000,
  starRadius: 9.9,
  starParticleSize: 9.96,
  starParticleStartSize: 56.83,
  starParticleEndSize: 3.83,
  starParticleNoiseAmount: 0.2,
  starParticleNoiseSpeed: 0,
  starParticleLifetimeMin: 4,
  starParticleLifetimeMax: 6,
  starMotionMode: 'orbit',
  starSpeedScale: 2,
  starMaxSpeed: 4.91,
  windX: 0,
  windY: 31,
  windZ: 0,
  waveAmplitude: 0,
  waveFrequency: 0.51,
  starWaveAmplitude: -0.3,
  starWaveFrequency: 1.01,
  lightDirX: -1,
  lightDirY: -0.34,
  lightDirZ: -1,
  lightIntensity: 100,
  ambientStrength: 100,
  lightHeight: 360,
  lightDirection: 360,
  fresnelColorHex: '#f7f7f7',
  ambientColorHex: '#ffdd00',
  pointScale: 0.5,
  coreDepthWrite: 1,
  particleDepthWrite: 0,
  depthTestEnabled: 1,
  mag_G: 1,
  mag_M: 1,
  mag_orbitStrength: 1,
  mag_windX: 1,
  mag_windY: 1,
  mag_windZ: 1,
  mag_waveAmplitude: 1,
  mag_waveFrequency: 1,
  mag_particleSize: 1,
};

/**
 * @returns {Record<string, number | string>}
 */
export function getDefaultScene3DParams() {
  const out = {
    particleGradient: DEFAULT_GRADIENT,
    particleColorHex: DEFAULT_PARTICLE_COLOR_HEX,
    starParticleGradient: DEFAULT_STAR_GRADIENT,
    starParticleColorHex: DEFAULT_STAR_COLOR_HEX,
  };
  for (const [key, schema] of Object.entries(PARAM_SCHEMA)) {
    out[key] = schema.default;
  }
  return { ...out, ...DEFAULT_PRESET };
}

/**
 * Clamp and apply params; accepts mag_*, particleColorHex.
 * @param {Record<string, number | string>} params
 * @returns {Record<string, number | string>}
 */
export function applyScene3DParams(params) {
  const out = { ...getDefaultScene3DParams() };
  const magLevel = Math.max(0, Math.min(3, Math.floor(Number(params.magnitudeLevel) ?? 1)));
  out.magnitudeLevel = magLevel;

  if (params.particleGradient != null && typeof params.particleGradient === 'string' && (PARTICLE_GRADIENTS[params.particleGradient] || params.particleGradient === 'custom')) {
    out.particleGradient = params.particleGradient;
  }
  if (params.particleColorHex != null && typeof params.particleColorHex === 'string') {
    out.particleColorHex = params.particleColorHex.trim();
  }
  if (params.starParticleGradient != null && typeof params.starParticleGradient === 'string' && (PARTICLE_GRADIENTS[params.starParticleGradient] || params.starParticleGradient === 'custom')) {
    out.starParticleGradient = params.starParticleGradient;
  }
  if (params.starParticleColorHex != null && typeof params.starParticleColorHex === 'string') {
    out.starParticleColorHex = params.starParticleColorHex.trim();
  }
  if (params.fresnelColorHex != null && typeof params.fresnelColorHex === 'string') {
    out.fresnelColorHex = params.fresnelColorHex.trim();
  }
  if (params.ambientColorHex != null && typeof params.ambientColorHex === 'string') {
    out.ambientColorHex = params.ambientColorHex.trim();
  }
  if (params.fogColorHex != null && typeof params.fogColorHex === 'string') {
    out.fogColorHex = params.fogColorHex.trim();
  }
  if (params.backgroundColorHex != null && typeof params.backgroundColorHex === 'string') {
    out.backgroundColorHex = params.backgroundColorHex.trim();
  }
  for (const [key, value] of Object.entries(params)) {
    if (key === 'particleGradient' || key === 'particleColorHex' || key === 'starParticleGradient' || key === 'starParticleColorHex' || key === 'magnitudeLevel' || key === 'fresnelColorHex' || key === 'ambientColorHex' || key === 'fogColorHex' || key === 'backgroundColorHex') continue;
    if (!(key in PARAM_SCHEMA)) continue;
    const schema = PARAM_SCHEMA[key];
    if (key === 'coreBlendMode' && typeof value === 'string' && BLEND_MODES.includes(value)) {
      out[key] = value;
      continue;
    }
    if (key === 'coreDisplayMode' && typeof value === 'string' && CORE_DISPLAY_MODES.includes(value)) {
      out[key] = value;
      continue;
    }
    if (key === 'fogType' && typeof value === 'string' && FOG_TYPES.includes(value)) {
      out[key] = value;
      continue;
    }
    if ((key === 'coreTextureUrl' || key === 'coreNormalMapUrl' || key === 'coreDispMapUrl' || key === 'coreSpecMapUrl' || key === 'coreOccMapUrl') && typeof value === 'string') {
      out[key] = value.trim();
      continue;
    }
    if (key === 'coreTextureType' && typeof value === 'string' && CORE_TEXTURE_TYPES.includes(value)) {
      out[key] = value;
      continue;
    }
    if (key === 'noiseType' && typeof value === 'string' && NOISE_TYPES.includes(value)) {
      out[key] = value;
      continue;
    }
    if (key === 'motionMode' && typeof value === 'string' && MOTION_MODES.includes(value)) {
      out[key] = value;
      continue;
    }
    if (key === 'starMotionMode' && typeof value === 'string' && MOTION_MODES.includes(value)) {
      out[key] = value;
      continue;
    }
    if ((key === 'fresnelColorHex' || key === 'ambientColorHex' || key === 'fogColorHex' || key === 'backgroundColorHex') && typeof value === 'string') {
      out[key] = value.trim();
      continue;
    }
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    const clamped = schema.min != null && schema.max != null
      ? Math.max(schema.min, Math.min(schema.max, num))
      : num;
    out[key] = clamped;
  }
  return out;
}

/**
 * Effective value for a magnitude-scaled param: base * MAGNITUDES[level].
 * Uses per-field mag_KEY if present, else magnitudeLevel.
 * @param {Record<string, number>} opts
 * @param {string} key one of MAGNITUDE_PARAMS
 * @returns {number}
 */
export function getEffectiveMagnitudeParam(opts, key) {
  const level = Math.max(0, Math.min(3, Math.floor(Number(opts['mag_' + key] ?? opts.magnitudeLevel ?? 1))));
  const mult = MAGNITUDES[level];
  const base = opts[key];
  return (typeof base === 'number' ? base : PARAM_SCHEMA[key]?.default ?? 0) * mult;
}

/**
 * Migrate preset from older schema version: merge with defaults, drop unknown keys.
 * @param {Record<string, unknown>} data loaded preset (may contain filterVersion)
 * @returns {Record<string, number | string>} params ready for applyScene3DParams
 */
export function migratePreset(data) {
  if (!data || typeof data !== 'object') return getDefaultScene3DParams();
  const version = Number(data.filterVersion) || 0;
  const defaults = getDefaultScene3DParams();
  const out = { ...defaults };
  for (const [key, value] of Object.entries(data)) {
    if (key === 'filterVersion') continue;
    if (key in PARAM_SCHEMA || key === 'particleGradient' || key === 'particleColorHex' || key === 'starParticleGradient' || key === 'starParticleColorHex') {
      if (value !== undefined && value !== null) out[key] = value;
    }
  }
  return applyScene3DParams(out);
}
