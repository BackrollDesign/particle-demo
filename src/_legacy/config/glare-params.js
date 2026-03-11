/**
 * Glare effect parameters (TouchDesigner-style).
 * All values are optional; defaults match Figma Glare from corner + luminescent plasma.
 */

export const GLARE_ORIGIN = {
  BOTTOM_LEFT: 'bottomLeft',
  BOTTOM_RIGHT: 'bottomRight',
  TOP_LEFT: 'topLeft',
  TOP_RIGHT: 'topRight',
};

/** @type {Record<string, { default: number, min?: number, max?: number, label?: string }>} */
export const PARAM_SCHEMA = {
  // Mode
  scene3D: { default: 1, min: 0, max: 1, label: '3D scene (0=2D, 1=3D with nucleus)' },
  useStarBoundary: { default: 0, min: 0, max: 1, label: '2D: (0=Glare, 1=Star shape)' },
  // Origin
  originCorner: { default: 0, min: 0, max: 3, label: 'Origin corner (0=BL,1=BR,2=TL,3=TR)' },
  // Core (nucleus)
  coreRadius: { default: 0.2, min: 0.02, max: 1.5, label: 'Core radius (world)' },
  coreRadiusMultiplier: { default: 2, min: 0.5, max: 5, label: 'Core size multiplier (x2)' },
  // Particles
  particleCount: { default: 10000, min: 1000, max: 60000, label: 'Particle count' },
  coreFraction: { default: 0.5, min: 0.1, max: 0.95, label: 'Fraction of particles near core' },
  coreRingRadius: { default: 0.08, min: 0.01, max: 0.6, label: 'Core ring radius (touch center)' },
  spreadRadius: { default: 1.5, min: 0.5, max: 6, label: 'Spread radius' },
  maxRadius: { default: 5, min: 2, max: 15, label: 'Max particle radius (reach)' },
  particleSize: { default: 1.2, min: 0.3, max: 3, label: 'Particle size multiplier' },
  // Physics
  G: { default: 18, min: 0, max: 400, label: 'Gravity constant' },
  M: { default: 5, min: 0.1, max: 30, label: 'Core mass' },
  driftStrength: { default: 0.08, min: 0, max: 0.5, label: 'Drift from core (up-right)' },
  orbitStrength: { default: 0.05, min: 0, max: 0.35, label: 'Orbit strength' },
  damping: { default: 0.995, min: 0.85, max: 1, label: 'Velocity damping' },
  minDistance: { default: 1e-4, min: 1e-6, max: 0.02, label: 'Min distance (particles touch center)' },
  anisotropy: { default: 0.5, min: 0, max: 1, label: '4-fold anisotropy (0=isotropic)' },
  // Glow / plasma
  plasmaIntensity: { default: 1, min: 0, max: 3, label: 'Plasma intensity' },
  plasmaSpeed: { default: 0.4, min: 0.05, max: 2.5, label: 'Plasma animation speed' },
  glowFalloff: { default: 0.45, min: 0.05, max: 1, label: 'Glow falloff softness' },
  luminescence: { default: 0.9, min: 0, max: 1, label: 'Luminescence (white vs blue)' },
  // Scale
  scale: { default: 0.65, min: 0.2, max: 1.3, label: 'Effect scale' },
};

/**
 * @returns {Record<string, number>}
 */
export function getDefaultGlareParams() {
  const out = {};
  for (const [key, schema] of Object.entries(PARAM_SCHEMA)) {
    out[key] = schema.default;
  }
  return out;
}

/**
 * Clamp and apply params; unknown keys ignored.
 * @param {Record<string, number>} params
 * @returns {Record<string, number>}
 */
export function applyGlareParams(params) {
  const out = { ...getDefaultGlareParams() };
  for (const [key, value] of Object.entries(params)) {
    if (key in PARAM_SCHEMA && typeof value === 'number') {
      const s = PARAM_SCHEMA[key];
      const v = s.min != null && s.max != null
        ? Math.max(s.min, Math.min(s.max, value))
        : value;
      out[key] = v;
    }
  }
  return out;
}

/**
 * Origin in normalized 0..1 (x,y), bottom-left = (0,0).
 * @param {number} originCorner 0=BL, 1=BR, 2=TL, 3=TR
 * @returns {{ x: number, y: number }}
 */
export function getOriginNormalized(originCorner) {
  const corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  return corners[Math.max(0, Math.min(3, Math.floor(originCorner)))] ?? corners[0];
}
