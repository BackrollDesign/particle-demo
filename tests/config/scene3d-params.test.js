/**
 * Unit tests: 3D scene params (TouchDesigner magnitude 10/1/0.1/0.01, gradient).
 */

import {
  MAGNITUDES,
  PARAM_SCHEMA,
  PARTICLE_GRADIENTS,
  DEFAULT_GRADIENT,
  MAGNITUDE_PARAMS,
  BLEND_MODES,
  CORE_TEXTURE_TYPES,
  CORE_DISPLAY_MODES,
  NOISE_TYPES,
  FOG_TYPES,
  STRING_OPT_KEYS,
  FILTER_SCHEMA_VERSION,
  normalizeHex,
  parseHexToRgb,
  getDefaultScene3DParams,
  applyScene3DParams,
  migratePreset,
  getEffectiveMagnitudeParam,
} from '../../src/config/scene3d-params.js';

describe('scene3d-params', () => {
  describe('MAGNITUDES', () => {
    it('has 4 levels 10, 1, 0.1, 0.01', () => {
      expect(MAGNITUDES).toEqual([10, 1, 0.1, 0.01]);
    });
  });

  describe('PARTICLE_GRADIENTS', () => {
    it('includes white, blue, cyan, warm, green', () => {
      expect(PARTICLE_GRADIENTS.white).toEqual([0.98, 0.98, 1.0]);
      expect(PARTICLE_GRADIENTS.blue).toHaveLength(3);
      expect(PARTICLE_GRADIENTS.cyan).toHaveLength(3);
      expect(PARTICLE_GRADIENTS.warm).toHaveLength(3);
      expect(PARTICLE_GRADIENTS.green).toHaveLength(3);
    });
  });

  describe('getDefaultScene3DParams', () => {
    it('returns particleGradient and all schema defaults (preset 1)', () => {
      const p = getDefaultScene3DParams();
      expect(p.particleGradient).toBe(DEFAULT_GRADIENT);
      expect(p.particleColorHex).toBe('#3874ff');
      expect(p.magnitudeLevel).toBe(1);
      expect(p.G).toBe(-100);
      expect(p.coreGlowStrength).toBe(100);
      expect(p.windX).toBe(-8);
      expect(p.waveAmplitude).toBe(0);
      expect(p.coreBlendMode).toBe('additive');
      expect(p.cameraPanX).toBe(1);
      expect(p.bloomEnabled).toBe(1);
    });
    it('includes core texture and noise defaults', () => {
      const p = getDefaultScene3DParams();
      expect(p.coreTextureType).toBe('uv');
      expect(p.coreZExponent).toBe(1);
      expect(p.noiseType).toBe('none');
      expect(p.coreBrightnessMin).toBe(-0.54);
      expect(p.coreBrightnessMax).toBe(2);
    });
    it('includes particle noise and lifetime params', () => {
      const p = getDefaultScene3DParams();
      expect(p.particleNoiseAmount).toBe(0.15);
      expect(p.particleNoiseSpeed).toBe(20);
      expect(p.particleLifetimeMin).toBe(5);
      expect(p.particleLifetimeMax).toBe(20.5);
    });
    it('includes coreEnabled and star particle defaults from default preset', () => {
      const p = getDefaultScene3DParams();
      expect(p.coreEnabled).toBe(1);
      expect(p.starParticleCount).toBe(40000);
      expect(p.starRadius).toBe(4.6);
      expect(p.starParticleSize).toBe(0.01);
    });
    it('includes fog, camera target, core display and depth write defaults', () => {
      const p = getDefaultScene3DParams();
      expect(p.fogType).toBe('exponential');
      expect(p.fogDensity).toBe(0.001);
      expect(p.targetX).toBe(1);
      expect(p.targetY).toBe(1);
      expect(p.targetZ).toBe(-1);
      expect(p.coreDisplayMode).toBe('planet');
      expect(p.coreDepthWrite).toBe(1);
      expect(p.particleDepthWrite).toBe(0);
      expect(p.depthTestEnabled).toBe(1);
      expect(p.orbitDamping).toBe(1);
      expect(p.particleStartSize).toBe(0.87);
      expect(p.particleEndSize).toBe(0);
    });
    it('getOptions contract: returns object with all PARAM_SCHEMA keys plus particle/star gradient and color', () => {
      const p = getDefaultScene3DParams();
      for (const key of Object.keys(PARAM_SCHEMA)) {
        expect(p).toHaveProperty(key);
      }
      expect(p).toHaveProperty('particleGradient');
      expect(p).toHaveProperty('particleColorHex');
      expect(p).toHaveProperty('starParticleGradient');
      expect(p).toHaveProperty('starParticleColorHex');
    });
  });

  describe('applyScene3DParams', () => {
    it('clamps numeric params and keeps magnitudeLevel', () => {
      const out = applyScene3DParams({ G: 200, magnitudeLevel: 0 });
      expect(out.G).toBe(100);
      expect(out.magnitudeLevel).toBe(0);
    });
    it('clamps coreRadius to schema range', () => {
      const out = applyScene3DParams({ coreRadius: 200 });
      expect(out.coreRadius).toBe(10);
      const out2 = applyScene3DParams({ coreRadius: 0.005 });
      expect(out2.coreRadius).toBe(0.05);
    });
    it('accepts coreBlendMode string', () => {
      const out = applyScene3DParams({ coreBlendMode: 'additive' });
      expect(out.coreBlendMode).toBe('additive');
    });
    it('ignores invalid coreBlendMode and keeps default', () => {
      const out = applyScene3DParams({ coreBlendMode: 'invalid' });
      expect(['normal', 'additive']).toContain(out.coreBlendMode);
    });
    it('accepts particleGradient string', () => {
      const out = applyScene3DParams({ particleGradient: 'cyan' });
      expect(out.particleGradient).toBe('cyan');
    });
    it('ignores unknown particleGradient', () => {
      const out = applyScene3DParams({ particleGradient: 'invalid' });
      expect(out.particleGradient).toBe(DEFAULT_GRADIENT);
    });
    it('accepts coreTextureUrl and coreNormalMapUrl as strings', () => {
      const out = applyScene3DParams({ coreTextureUrl: '/path/color.jpg', coreNormalMapUrl: '/path/norm.jpg' });
      expect(out.coreTextureUrl).toBe('/path/color.jpg');
      expect(out.coreNormalMapUrl).toBe('/path/norm.jpg');
    });
    it('accepts coreTextureType and noiseType', () => {
      const out = applyScene3DParams({ coreTextureType: 'xyz_normalized', noiseType: 'simplex' });
      expect(out.coreTextureType).toBe('xyz_normalized');
      expect(out.noiseType).toBe('simplex');
    });
    it('clamps coreBrightness and noise params', () => {
      const out = applyScene3DParams({ coreBrightnessMin: -1, coreBrightnessMax: 3, noiseAmplitude: 5 });
      expect(out.coreBrightnessMin).toBe(-1);
      expect(out.coreBrightnessMax).toBe(2);
      expect(out.noiseAmplitude).toBe(2);
    });
    it('clamps particleNoiseAmount and particleNoiseSpeed', () => {
      const out = applyScene3DParams({ particleNoiseAmount: 5, particleNoiseSpeed: 100 });
      expect(out.particleNoiseAmount).toBe(2);
      expect(out.particleNoiseSpeed).toBe(20);
    });
    it('accepts fogType linear and exponential', () => {
      expect(applyScene3DParams({ fogType: 'linear' }).fogType).toBe('linear');
      expect(applyScene3DParams({ fogType: 'exponential' }).fogType).toBe('exponential');
    });
    it('ignores invalid fogType and keeps default', () => {
      const out = applyScene3DParams({ fogType: 'invalid' });
      expect(['linear', 'exponential']).toContain(out.fogType);
    });
    it('clamps fogDensity to schema range', () => {
      const out = applyScene3DParams({ fogDensity: 1 });
      expect(out.fogDensity).toBe(0.5);
      const out2 = applyScene3DParams({ fogDensity: 0.0001 });
      expect(out2.fogDensity).toBe(0.001);
    });
    it('accepts coreDisplayMode planet and star', () => {
      expect(applyScene3DParams({ coreDisplayMode: 'planet' }).coreDisplayMode).toBe('planet');
      expect(applyScene3DParams({ coreDisplayMode: 'star' }).coreDisplayMode).toBe('star');
    });
    it('ignores invalid coreDisplayMode and keeps default', () => {
      const out = applyScene3DParams({ coreDisplayMode: 'invalid' });
      expect(['planet', 'star']).toContain(out.coreDisplayMode);
    });
    it('applies coreEnabled 0 and 1', () => {
      expect(applyScene3DParams({ coreEnabled: 0 }).coreEnabled).toBe(0);
      expect(applyScene3DParams({ coreEnabled: 1 }).coreEnabled).toBe(1);
    });
    it('clamps starParticleCount, starRadius, starParticleSize', () => {
      const out = applyScene3DParams({ starParticleCount: 200000, starRadius: 50, starParticleSize: 20 });
      expect(out.starParticleCount).toBe(100000);
      expect(out.starRadius).toBe(20);
      expect(out.starParticleSize).toBe(10);
    });
    it('clamps targetX, targetY, targetZ to schema range', () => {
      const out = applyScene3DParams({ targetX: 500, targetY: -500, targetZ: 0 });
      expect(out.targetX).toBe(360);
      expect(out.targetY).toBe(-360);
      expect(out.targetZ).toBe(0);
    });
    it('clamps coreDepthWrite and particleDepthWrite to 0 or 1', () => {
      expect(applyScene3DParams({ coreDepthWrite: 1 }).coreDepthWrite).toBe(1);
      expect(applyScene3DParams({ coreDepthWrite: 0 }).coreDepthWrite).toBe(0);
      expect(applyScene3DParams({ particleDepthWrite: 1 }).particleDepthWrite).toBe(1);
      expect(applyScene3DParams({ particleDepthWrite: 0 }).particleDepthWrite).toBe(0);
      expect(applyScene3DParams({ coreDepthWrite: 2 }).coreDepthWrite).toBe(1);
      expect(applyScene3DParams({ particleDepthWrite: -1 }).particleDepthWrite).toBe(0);
    });
    it('clamps depthTestEnabled to 0 or 1', () => {
      expect(applyScene3DParams({ depthTestEnabled: 1 }).depthTestEnabled).toBe(1);
      expect(applyScene3DParams({ depthTestEnabled: 0 }).depthTestEnabled).toBe(0);
      expect(applyScene3DParams({ depthTestEnabled: 2 }).depthTestEnabled).toBe(1);
    });
    it('clamps orbitDamping to 0..1', () => {
      expect(applyScene3DParams({ orbitDamping: 0.92 }).orbitDamping).toBe(0.92);
      expect(applyScene3DParams({ orbitDamping: 1.5 }).orbitDamping).toBe(1);
      expect(applyScene3DParams({ orbitDamping: -0.1 }).orbitDamping).toBe(0);
    });
    it('clamps particleStartSize and particleEndSize to 0..100', () => {
      expect(applyScene3DParams({ particleStartSize: 0.5 }).particleStartSize).toBe(0.5);
      expect(applyScene3DParams({ particleEndSize: 1 }).particleEndSize).toBe(1);
      expect(applyScene3DParams({ particleStartSize: 150 }).particleStartSize).toBe(100);
      expect(applyScene3DParams({ particleEndSize: -1 }).particleEndSize).toBe(0);
    });
  });

  describe('getEffectiveMagnitudeParam', () => {
    it('multiplies G by MAGNITUDES[level]', () => {
      const opts = { G: 2, magnitudeLevel: 0 };
      expect(getEffectiveMagnitudeParam(opts, 'G')).toBe(20);
      opts.magnitudeLevel = 1;
      expect(getEffectiveMagnitudeParam(opts, 'G')).toBe(2);
      opts.magnitudeLevel = 2;
      expect(getEffectiveMagnitudeParam(opts, 'G')).toBeCloseTo(0.2);
      opts.magnitudeLevel = 3;
      expect(getEffectiveMagnitudeParam(opts, 'G')).toBeCloseTo(0.02);
    });
    it('uses per-field mag_G when present', () => {
      const opts = { G: 2, magnitudeLevel: 0, mag_G: 2 };
      expect(getEffectiveMagnitudeParam(opts, 'G')).toBeCloseTo(0.2);
    });
    it('uses default when param missing', () => {
      const opts = { magnitudeLevel: 1 };
      expect(getEffectiveMagnitudeParam(opts, 'G')).toBe(-35);
    });
    it('scales particleSize by magnitude', () => {
      const opts = { particleSize: 0.5, mag_particleSize: 0 };
      expect(getEffectiveMagnitudeParam(opts, 'particleSize')).toBe(5);
    });
  });

  describe('MAGNITUDE_PARAMS', () => {
    it('includes particleSize', () => {
      expect(MAGNITUDE_PARAMS).toContain('particleSize');
    });
  });

  describe('BLEND_MODES', () => {
    it('includes normal, additive, screen', () => {
      expect(BLEND_MODES).toContain('normal');
      expect(BLEND_MODES).toContain('additive');
      expect(BLEND_MODES).toContain('screen');
    });
  });

  describe('CORE_TEXTURE_TYPES', () => {
    it('includes uv, xyz_normalized, face', () => {
      expect(CORE_TEXTURE_TYPES).toContain('uv');
      expect(CORE_TEXTURE_TYPES).toContain('xyz_normalized');
      expect(CORE_TEXTURE_TYPES).toContain('face');
    });
  });

  describe('CORE_DISPLAY_MODES', () => {
    it('includes planet and star', () => {
      expect(CORE_DISPLAY_MODES).toContain('planet');
      expect(CORE_DISPLAY_MODES).toContain('star');
    });
  });

  describe('FOG_TYPES', () => {
    it('includes linear and exponential', () => {
      expect(FOG_TYPES).toContain('linear');
      expect(FOG_TYPES).toContain('exponential');
    });
  });

  describe('NOISE_TYPES', () => {
    it('includes none, simplex, perlin, value', () => {
      expect(NOISE_TYPES).toContain('none');
      expect(NOISE_TYPES).toContain('simplex');
      expect(NOISE_TYPES).toContain('perlin');
      expect(NOISE_TYPES).toContain('value');
    });
  });

  describe('STRING_OPT_KEYS', () => {
    it('includes particle, texture, fog and display string options', () => {
      expect(STRING_OPT_KEYS).toContain('particleColorHex');
      expect(STRING_OPT_KEYS).toContain('coreTextureUrl');
      expect(STRING_OPT_KEYS).toContain('coreTextureType');
      expect(STRING_OPT_KEYS).toContain('noiseType');
      expect(STRING_OPT_KEYS).toContain('fogType');
      expect(STRING_OPT_KEYS).toContain('coreDisplayMode');
    });
  });

  describe('normalizeHex', () => {
    it('expands 3-char hex to 6-char', () => {
      expect(normalizeHex('#f00')).toBe('#ff0000');
      expect(normalizeHex('fff')).toBe('#ffffff');
    });
    it('returns 6-char hex as-is', () => {
      expect(normalizeHex('#ff0000')).toBe('#ff0000');
    });
    it('returns empty string for invalid', () => {
      expect(normalizeHex('')).toBe('');
      expect(normalizeHex('#gg')).toBe('');
    });
  });

  describe('parseHexToRgb', () => {
    it('parses #fff to [1,1,1]', () => {
      const rgb = parseHexToRgb('#fff');
      expect(rgb).toEqual([1, 1, 1]);
    });
    it('parses #ffffff to [1,1,1]', () => {
      const rgb = parseHexToRgb('#ffffff');
      expect(rgb[0]).toBeCloseTo(1);
      expect(rgb[1]).toBeCloseTo(1);
      expect(rgb[2]).toBeCloseTo(1);
    });
    it('returns null for invalid hex', () => {
      expect(parseHexToRgb('')).toBeNull();
      expect(parseHexToRgb('#gg')).toBeNull();
    });
  });

  describe('FILTER_SCHEMA_VERSION and migratePreset', () => {
    it('FILTER_SCHEMA_VERSION is a number', () => {
      expect(typeof FILTER_SCHEMA_VERSION).toBe('number');
      expect(FILTER_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
    });
    it('migratePreset returns defaults for empty or invalid input', () => {
      const out = migratePreset(null);
      expect(out).toEqual(getDefaultScene3DParams());
      expect(migratePreset({})).toEqual(getDefaultScene3DParams());
    });
    it('migratePreset ignores filterVersion and applies known keys', () => {
      const out = migratePreset({ filterVersion: 1, coreRadius: 0.5, particleCount: 1000 });
      expect(out.filterVersion).toBeUndefined();
      expect(out.coreRadius).toBe(0.5);
      expect(out.particleCount).toBe(1000);
      expect(out.particleGradient).toBe(DEFAULT_GRADIENT);
    });
    it('migratePreset clamps and applies like applyScene3DParams', () => {
      const out = migratePreset({ coreRadius: 999, coreBlendMode: 'additive' });
      expect(out.coreRadius).toBe(10);
      expect(out.coreBlendMode).toBe('additive');
    });
  });
});
