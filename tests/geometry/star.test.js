/**
 * Unit tests: four-pointed star geometry (Technical Spec §3.3, §2.1 V1).
 * TDD: run tests before implementation, then implement geometry/star.js to pass.
 */

import {
  getStarVertices,
  getStarIndices,
  getStarBoundary,
  pointInPolygon,
  clampToStarBoundary,
  randomPointInsideStar,
} from '../../src/_legacy/geometry/star.js';

describe('star geometry', () => {
  describe('getStarVertices', () => {
    it('returns 8 vertices for 4-pointed star (4 outer + 4 inner)', () => {
      const vertices = getStarVertices(1, 0.5);
      expect(vertices.length).toBe(16); // 8 vertices × 2 (x,y)
    });

    it('outer vertices lie on circle of radius R_outer', () => {
      const R = 1.5;
      const vertices = getStarVertices(R, 0.5);
      const outerIndices = [0, 2, 4, 6];
      for (const i of outerIndices) {
        const x = vertices[i * 2];
        const y = vertices[i * 2 + 1];
        const r = Math.hypot(x, y);
        expect(r).toBeCloseTo(R, 10);
      }
    });

    it('inner vertices lie on circle of radius R_inner', () => {
      const R_outer = 1;
      const R_inner = 0.4;
      const vertices = getStarVertices(R_outer, R_inner);
      const innerIndices = [1, 3, 5, 7];
      for (const i of innerIndices) {
        const x = vertices[i * 2];
        const y = vertices[i * 2 + 1];
        const r = Math.hypot(x, y);
        expect(r).toBeCloseTo(R_inner, 10);
      }
    });

    it('first outer vertex is at angle 0 (positive x)', () => {
      const vertices = getStarVertices(1, 0.5);
      expect(vertices[0]).toBeCloseTo(1, 10);
      expect(vertices[1]).toBeCloseTo(0, 10);
    });

    it('vertices alternate outer-inner order', () => {
      const R_outer = 1;
      const R_inner = 0.3;
      const vertices = getStarVertices(R_outer, R_inner);
      for (let i = 0; i < 4; i++) {
        const outerX = vertices[i * 4];
        const outerY = vertices[i * 4 + 1];
        const innerX = vertices[i * 4 + 2];
        const innerY = vertices[i * 4 + 3];
        expect(Math.hypot(outerX, outerY)).toBeCloseTo(R_outer, 10);
        expect(Math.hypot(innerX, innerY)).toBeCloseTo(R_inner, 10);
      }
    });
  });

  describe('getStarIndices', () => {
    it('returns indices for triangles (no center vertex)', () => {
      const indices = getStarIndices();
      expect(Array.isArray(indices)).toBe(true);
      expect(indices.length % 3).toBe(0);
    });

    it('produces 4 triangles for 4-pointed star (2 per tip)', () => {
      const indices = getStarIndices();
      expect(indices.length).toBe(12);
    });

    it('all indices are in range [0, 7]', () => {
      const indices = getStarIndices();
      indices.forEach((idx) => {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(7);
      });
    });
  });

  describe('star boundary and particle confinement (Spec V2)', () => {
    it('getStarBoundary returns 8 points', () => {
      const boundary = getStarBoundary();
      expect(boundary).toHaveLength(8);
      boundary.forEach((p) => {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
      });
    });

    it('pointInPolygon: center (0,0) is inside star', () => {
      const boundary = getStarBoundary();
      expect(pointInPolygon(0, 0, boundary)).toBe(true);
    });

    it('pointInPolygon: point far outside is outside star', () => {
      const boundary = getStarBoundary();
      expect(pointInPolygon(2, 2, boundary)).toBe(false);
      expect(pointInPolygon(-2, -2, boundary)).toBe(false);
    });

    it('clampToStarBoundary: point inside returns same point', () => {
      const boundary = getStarBoundary();
      const out = clampToStarBoundary(0, 0, boundary);
      expect(out.x).toBeCloseTo(0, 10);
      expect(out.y).toBeCloseTo(0, 10);
    });

    it('clampToStarBoundary: point outside returns point near or on boundary', () => {
      const boundary = getStarBoundary();
      const out = clampToStarBoundary(2, 2, boundary);
      expect(out.x).not.toBeCloseTo(2, 5);
      expect(out.y).not.toBeCloseTo(2, 5);
      expect(Math.hypot(out.x, out.y)).toBeLessThanOrEqual(1.02);
    });

    it('randomPointInsideStar returns only points inside polygon', () => {
      const boundary = getStarBoundary();
      for (let i = 0; i < 50; i++) {
        const p = randomPointInsideStar(boundary);
        expect(pointInPolygon(p.x, p.y, boundary)).toBe(true);
      }
    });
  });
});
