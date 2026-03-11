/**
 * Unit tests: Glare params (TouchDesigner-style config).
 */

import {
  getDefaultGlareParams,
  applyGlareParams,
  getOriginNormalized,
  PARAM_SCHEMA,
} from '../../src/_legacy/config/glare-params.js';

describe('glare-params', () => {
  describe('getDefaultGlareParams', () => {
    it('returns an object with all schema keys', () => {
      const params = getDefaultGlareParams();
      expect(typeof params).toBe('object');
      for (const key of Object.keys(PARAM_SCHEMA)) {
        expect(key in params).toBe(true);
        expect(typeof params[key]).toBe('number');
      }
    });

    it('default originCorner is 0 (bottom-left)', () => {
      const params = getDefaultGlareParams();
      expect(params.originCorner).toBe(0);
    });

    it('default useStarBoundary is 0 (Glare mode)', () => {
      const params = getDefaultGlareParams();
      expect(params.useStarBoundary).toBe(0);
    });

    it('default coreRadiusMultiplier is 2', () => {
      const params = getDefaultGlareParams();
      expect(params.coreRadiusMultiplier).toBe(2);
    });

    it('default luminescence and plasmaSpeed are in range', () => {
      const params = getDefaultGlareParams();
      expect(params.luminescence).toBeGreaterThanOrEqual(0);
      expect(params.luminescence).toBeLessThanOrEqual(1);
      expect(params.plasmaSpeed).toBeGreaterThan(0);
    });
  });

  describe('applyGlareParams', () => {
    it('merges partial params with defaults', () => {
      const out = applyGlareParams({ G: 100, plasmaIntensity: 0.5 });
      expect(out.G).toBe(100);
      expect(out.plasmaIntensity).toBe(0.5);
      expect(out.originCorner).toBe(getDefaultGlareParams().originCorner);
    });

    it('clamps values to schema min/max when present', () => {
      const out = applyGlareParams({ G: 500, luminescence: 2 });
      expect(out.G).toBeLessThanOrEqual(400);
      expect(out.luminescence).toBeLessThanOrEqual(1);
    });

    it('ignores unknown keys', () => {
      const out = applyGlareParams({ foo: 1, G: 50 });
      expect('foo' in out).toBe(false);
      expect(out.G).toBe(50);
    });
  });

  describe('getOriginNormalized', () => {
    it('0 returns bottom-left (0,0)', () => {
      const o = getOriginNormalized(0);
      expect(o.x).toBe(0);
      expect(o.y).toBe(0);
    });

    it('1 returns bottom-right (1,0)', () => {
      const o = getOriginNormalized(1);
      expect(o.x).toBe(1);
      expect(o.y).toBe(0);
    });

    it('2 returns top-left (0,1)', () => {
      const o = getOriginNormalized(2);
      expect(o.x).toBe(0);
      expect(o.y).toBe(1);
    });

    it('3 returns top-right (1,1)', () => {
      const o = getOriginNormalized(3);
      expect(o.x).toBe(1);
      expect(o.y).toBe(1);
    });

    it('clamps out-of-range to valid corner', () => {
      expect(getOriginNormalized(-1).x).toBe(0);
      expect(getOriginNormalized(4).x).toBe(1);
    });
  });
});
