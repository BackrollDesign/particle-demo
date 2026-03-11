/**
 * Unit tests: gravity physics (Technical Spec §3.4, §2.2).
 * TDD: run tests before implementation, then implement gravity.js to pass.
 */

import {
  getGravityAcceleration,
  getGravityAcceleration3D,
  integrateEuler,
  clampDistance,
} from '../../src/physics/gravity.js';

describe('gravity', () => {
  describe('getGravityAcceleration', () => {
    it('returns acceleration vector toward core', () => {
      const core = { x: 0, y: 0 };
      const particle = { x: 100, y: 0 };
      const G = 100;
      const M = 10;
      const a = getGravityAcceleration(particle, core, G, M);
      // From (100,0) to core (0,0): direction is negative x
      expect(a.x).toBeCloseTo(-0.1, 10);
      expect(a.y).toBeCloseTo(0, 10);
    });

    it('points from particle to core', () => {
      const core = { x: 0, y: 0 };
      const particle = { x: -50, y: 0 };
      const a = getGravityAcceleration(particle, core, 100, 10);
      expect(a.x).toBeGreaterThan(0);
      expect(a.y).toBeCloseTo(0, 10);
    });

    it('magnitude decreases with distance (inverse square)', () => {
      const core = { x: 0, y: 0 };
      const G = 100, M = 10;
      const a1 = getGravityAcceleration({ x: 10, y: 0 }, core, G, M);
      const a2 = getGravityAcceleration({ x: 20, y: 0 }, core, G, M);
      const mag1 = Math.hypot(a1.x, a1.y);
      const mag2 = Math.hypot(a2.x, a2.y);
      expect(mag2).toBeCloseTo(mag1 / 4, 5);
    });

    it('avoids division by zero when distance is clamped', () => {
      const core = { x: 0, y: 0 };
      const particle = { x: 0, y: 0 };
      const a = getGravityAcceleration(particle, core, 100, 10, 1e-3);
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
    });

    it('allows particles to touch center with very small minR', () => {
      const core = { x: 0, y: 0 };
      const particle = { x: 1e-5, y: 0 };
      const a = getGravityAcceleration(particle, core, 100, 10, 1e-6);
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
      expect(a.x).toBeLessThan(0);
    });
  });

  describe('getGravityAcceleration3D', () => {
    it('returns acceleration toward core in 3D', () => {
      const core = { x: 0, y: 0, z: 0 };
      const particle = { x: 1, y: 0, z: 0 };
      const a = getGravityAcceleration3D(particle, core, 10, 1);
      expect(a.x).toBeLessThan(0);
      expect(a.y).toBeCloseTo(0, 10);
      expect(a.z).toBeCloseTo(0, 10);
      expect(Number.isFinite(a.x)).toBe(true);
    });
  });

  describe('clampDistance', () => {
    it('returns r when r >= minR', () => {
      expect(clampDistance(10, 1)).toBe(10);
      expect(clampDistance(1, 1)).toBe(1);
    });
    it('returns minR when r < minR', () => {
      expect(clampDistance(0.5, 1)).toBe(1);
      expect(clampDistance(0, 1)).toBe(1);
    });
  });

  describe('integrateEuler', () => {
    it('updates position and velocity with acceleration', () => {
      const state = { px: 0, py: 0, vx: 0, vy: 0 };
      const acc = { x: 10, y: 0 };
      const dt = 0.1;
      const next = integrateEuler(state, acc, dt);
      expect(next.vx).toBeCloseTo(1, 10);
      expect(next.vy).toBeCloseTo(0, 10);
      expect(next.px).toBeCloseTo(0.1, 10);
      expect(next.py).toBeCloseTo(0, 10);
    });

    it('does not mutate input state', () => {
      const state = { px: 1, py: 2, vx: 3, vy: 4 };
      const acc = { x: 0, y: 0 };
      integrateEuler(state, acc, 0.016);
      expect(state.px).toBe(1);
      expect(state.py).toBe(2);
    });
  });
});
