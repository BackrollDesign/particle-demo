/**
 * Animation and particle stability tests (Spec V2 §4).
 * No NaN/Inf after many steps; positions stay within bounds.
 */

import { createParticles, updateParticles } from '../../src/_legacy/scene/particle-system.js';

describe('particle animation stability', () => {
  it('no NaN or Inf in positions/velocities after 1000 steps', () => {
    const state = createParticles(500, { G: 20, M: 5, maxRadius: 5 });
    const opts = { G: 20, M: 5, maxRadius: 5, orbitStrength: 0.05, damping: 0.995, minDistance: 1e-4, anisotropy: 0.5, driftStrength: 0.05 };
    for (let step = 0; step < 1000; step++) {
      updateParticles(state, opts, 0.016);
    }
    const n = state.positions.length / 2;
    for (let i = 0; i < n; i++) {
      const px = state.positions[i * 2];
      const py = state.positions[i * 2 + 1];
      const vx = state.velocities[i * 2];
      const vy = state.velocities[i * 2 + 1];
      expect(Number.isFinite(px)).toBe(true);
      expect(Number.isFinite(py)).toBe(true);
      expect(Number.isFinite(vx)).toBe(true);
      expect(Number.isFinite(vy)).toBe(true);
    }
  });

  it('positions stay within maxRadius after 500 steps', () => {
    const maxR = 4;
    const state = createParticles(300, { maxRadius: maxR });
    const opts = { G: 15, M: 4, maxRadius: maxR, orbitStrength: 0.04, damping: 0.99, minDistance: 1e-4, anisotropy: 0.5, driftStrength: 0.06 };
    for (let step = 0; step < 500; step++) {
      updateParticles(state, opts, 0.016);
    }
    const n = state.positions.length / 2;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(state.positions[i * 2], state.positions[i * 2 + 1]);
      expect(r).toBeLessThanOrEqual(maxR * 1.01);
    }
  });
});
