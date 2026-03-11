/**
 * Unit tests: Glare particle system (origin at corner, particles touch center).
 * Spec V2: star boundary mode (useStarBoundary).
 */

import { createParticles, updateParticles, MAX_RADIUS_DEFAULT } from '../../src/_legacy/scene/particle-system.js';
import { getStarBoundary, pointInPolygon } from '../../src/_legacy/geometry/star.js';

describe('particle-system (glare)', () => {
  describe('createParticles', () => {
    it('returns positions in first quadrant (x >= 0, y >= 0)', () => {
      const state = createParticles(500, { coreFraction: 0.3, coreRingRadius: 0.05, spreadRadius: 1 });
      for (let i = 0; i < 500; i++) {
        expect(state.positions[i * 2]).toBeGreaterThanOrEqual(0);
        expect(state.positions[i * 2 + 1]).toBeGreaterThanOrEqual(0);
      }
    });

    it('some particles are very close to origin (touch center)', () => {
      const state = createParticles(800, { coreFraction: 0.6, coreRingRadius: 0.02, spreadRadius: 1 });
      let near = 0;
      for (let i = 0; i < 800; i++) {
        const x = state.positions[i * 2];
        const y = state.positions[i * 2 + 1];
        if (Math.hypot(x, y) < 0.05) near++;
      }
      expect(near).toBeGreaterThan(0);
    });

    it('positions and velocities have correct length', () => {
      const state = createParticles(100, {});
      expect(state.positions.length).toBe(200);
      expect(state.velocities.length).toBe(200);
      expect(state.sizes.length).toBe(100);
    });
  });

  describe('updateParticles', () => {
    it('keeps positions in first quadrant and within maxRadius', () => {
      const state = createParticles(200, { maxRadius: 3, G: 10, M: 2 });
      for (let step = 0; step < 20; step++) {
        updateParticles(state, { G: 10, M: 2, maxRadius: 3, orbitStrength: 0.02, damping: 0.99, minDistance: 1e-4, anisotropy: 0.5 }, 0.016);
      }
      for (let i = 0; i < 200; i++) {
        const x = state.positions[i * 2];
        const y = state.positions[i * 2 + 1];
        expect(x).toBeGreaterThanOrEqual(-0.01);
        expect(y).toBeGreaterThanOrEqual(-0.01);
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(3.5);
      }
    });
  });

  it('MAX_RADIUS_DEFAULT is positive', () => {
    expect(MAX_RADIUS_DEFAULT).toBeGreaterThan(0);
  });

  describe('useStarBoundary mode (Iteration 1)', () => {
    it('createParticles with useStarBoundary places all particles inside star', () => {
      const boundary = getStarBoundary();
      const state = createParticles(300, { useStarBoundary: 1 });
      for (let i = 0; i < 300; i++) {
        const x = state.positions[i * 2];
        const y = state.positions[i * 2 + 1];
        expect(pointInPolygon(x, y, boundary)).toBe(true);
      }
    });

    it('updateParticles with useStarBoundary keeps all positions inside or on star', () => {
      const boundary = getStarBoundary();
      const state = createParticles(200, { useStarBoundary: 1 });
      const opts = { useStarBoundary: 1, G: 15, M: 4, orbitStrength: 0.05, damping: 0.99, minDistance: 1e-4, anisotropy: 0.5, driftStrength: 0.02 };
      for (let step = 0; step < 100; step++) {
        updateParticles(state, opts, 0.016);
      }
      for (let i = 0; i < 200; i++) {
        const x = state.positions[i * 2];
        const y = state.positions[i * 2 + 1];
        const inside = pointInPolygon(x, y, boundary);
        const distFromOrigin = Math.hypot(x, y);
        expect(inside || distFromOrigin <= 1.02).toBe(true);
      }
    });
  });
});
