/**
 * Unit tests: 3D particle system (disk, wind, wave, no collapse).
 */

import {
  createParticles3D,
  updateParticles3D,
  createStarParticles3D,
  updateStarParticles3D,
  MAX_R3D,
} from '../../src/scene/particle-system-3d.js';

describe('particle-system-3d', () => {
  describe('createParticles3D', () => {
    it('creates count*3 positions, velocities, sizes, deathTimes and birthTimes', () => {
      const state = createParticles3D(100, { diskRadius: 2, diskThickness: 0.05 });
      expect(state.positions.length).toBe(300);
      expect(state.velocities.length).toBe(300);
      expect(state.sizes.length).toBe(100);
      expect(state.deathTimes).toBeDefined();
      expect(state.deathTimes.length).toBe(100);
      expect(state.birthTimes).toBeDefined();
      expect(state.birthTimes.length).toBe(100);
    });
    it('places particles in disk (z near zero)', () => {
      const state = createParticles3D(200, { diskRadius: 2, diskThickness: 0.08 });
      let maxZ = 0;
      for (let i = 0; i < 200; i++) {
        const z = Math.abs(state.positions[i * 3 + 2]);
        if (z > maxZ) maxZ = z;
      }
      expect(maxZ).toBeLessThanOrEqual(0.06);
    });
    it('positions within disk radius', () => {
      const state = createParticles3D(150, { diskRadius: 2.5 });
      for (let i = 0; i < 150; i++) {
        const x = state.positions[i * 3];
        const y = state.positions[i * 3 + 1];
        const r = Math.hypot(x, y);
        expect(r).toBeLessThanOrEqual(2.51);
        expect(r).toBeGreaterThanOrEqual(0.1);
      }
    });
  });

  describe('updateParticles3D', () => {
    it('keeps positions finite after 100 steps', () => {
      const state = createParticles3D(50, { diskRadius: 2 });
      const opts = { G: 1, M: 1, magnitudeLevel: 1, diskRadius: 2, damping: 0.998 };
      for (let s = 0; s < 100; s++) updateParticles3D(state, opts, 0.016, s * 0.016);
      for (let i = 0; i < 50; i++) {
        expect(Number.isFinite(state.positions[i * 3])).toBe(true);
        expect(Number.isFinite(state.positions[i * 3 + 1])).toBe(true);
        expect(Number.isFinite(state.positions[i * 3 + 2])).toBe(true);
      }
    });
    it('applies wind when windX set', () => {
      const state = createParticles3D(20, { diskRadius: 2 });
      const opts = { G: 0.5, M: 0.5, magnitudeLevel: 1, windX: 0.5, windY: 0, windZ: 0, diskRadius: 2 };
      for (let s = 0; s < 50; s++) updateParticles3D(state, opts, 0.016, 0);
      expect(Array.from(state.positions).every(Number.isFinite)).toBe(true);
    });
    it('keeps radius within diskRadius after steps', () => {
      const state = createParticles3D(80, { diskRadius: 2.5 });
      const opts = { G: 1, M: 1, magnitudeLevel: 1, diskRadius: 2.5, damping: 0.998 };
      for (let s = 0; s < 200; s++) updateParticles3D(state, opts, 0.016, s * 0.016);
      for (let i = 0; i < 80; i++) {
        const r = Math.hypot(state.positions[i * 3], state.positions[i * 3 + 1]);
        expect(r).toBeLessThanOrEqual(2.52);
      }
    });
    it('clamps z to diskThickness after steps', () => {
      const state = createParticles3D(50, { diskRadius: 2, diskThickness: 0.1 });
      const opts = { G: 0.5, M: 0.5, magnitudeLevel: 1, diskRadius: 2, diskThickness: 0.1, damping: 0.998, windZ: 0.5 };
      for (let s = 0; s < 100; s++) updateParticles3D(state, opts, 0.016, 0);
      const halfT = 0.05;
      for (let i = 0; i < 50; i++) {
        const z = state.positions[i * 3 + 2];
        expect(z).toBeGreaterThanOrEqual(-halfT - 1e-5);
        expect(z).toBeLessThanOrEqual(halfT + 1e-5);
      }
    });
  });

  describe('createStarParticles3D', () => {
    it('returns same state shape as disk (positions, velocities, sizes, deathTimes, birthTimes)', () => {
      const state = createStarParticles3D(80, { starRadius: 1.5, starParticleSize: 0.3 });
      expect(state.positions.length).toBe(240);
      expect(state.velocities.length).toBe(240);
      expect(state.sizes.length).toBe(80);
      expect(state.deathTimes).toBeDefined();
      expect(state.deathTimes.length).toBe(80);
      expect(state.birthTimes).toBeDefined();
      expect(state.birthTimes.length).toBe(80);
    });
    it('places particles inside sphere of starRadius', () => {
      const R = 1.2;
      const state = createStarParticles3D(200, { starRadius: R });
      for (let i = 0; i < 200; i++) {
        const x = state.positions[i * 3];
        const y = state.positions[i * 3 + 1];
        const z = state.positions[i * 3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);
        expect(dist).toBeLessThanOrEqual(R + 1e-5);
      }
    });
    it('returns empty arrays when count is 0', () => {
      const state = createStarParticles3D(0, { starRadius: 1 });
      expect(state.positions.length).toBe(0);
      expect(state.velocities.length).toBe(0);
      expect(state.sizes.length).toBe(0);
    });
  });

  describe('updateStarParticles3D', () => {
    it('keeps positions inside starRadius after steps', () => {
      const R = 1.5;
      const state = createStarParticles3D(60, { starRadius: R });
      const opts = { G: 1, M: 1, magnitudeLevel: 1, starRadius: R, damping: 0.998 };
      for (let s = 0; s < 150; s++) updateStarParticles3D(state, opts, 0.016, s * 0.016);
      for (let i = 0; i < 60; i++) {
        const dist = Math.sqrt(
          state.positions[i * 3] ** 2 + state.positions[i * 3 + 1] ** 2 + state.positions[i * 3 + 2] ** 2
        );
        expect(dist).toBeLessThanOrEqual(R + 1e-4);
      }
    });
    it('keeps positions finite', () => {
      const state = createStarParticles3D(40, { starRadius: 1 });
      const opts = { G: 0.5, M: 0.5, magnitudeLevel: 1, starRadius: 1.2, windX: 0.2, damping: 0.998 };
      for (let s = 0; s < 100; s++) updateStarParticles3D(state, opts, 0.016, s * 0.016);
      expect(Array.from(state.positions).every(Number.isFinite)).toBe(true);
    });
  });
});
