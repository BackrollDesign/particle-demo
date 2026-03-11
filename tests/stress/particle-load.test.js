/**
 * Load/stress tests: particle system and params under high load.
 * Texture loading is rate-limited: load runs only when coreTextureUrl/coreNormalMapUrl
 * change (once per URL), not every frame, to avoid freezes from repeated decode/upload.
 * Run with: npm test -- --testPathPattern=stress
 */

import {
  createParticles3D,
  updateParticles3D,
} from '../../src/scene/particle-system-3d.js';
import {
  getDefaultScene3DParams,
  applyScene3DParams,
  getEffectiveMagnitudeParam,
} from '../../src/config/scene3d-params.js';

describe('stress · particle load', () => {
  it('creates 50k particles within reasonable time', () => {
    const t0 = performance.now();
    const state = createParticles3D(50000, getDefaultScene3DParams());
    const dt = performance.now() - t0;
    expect(state.positions.length).toBe(150000);
    expect(state.velocities.length).toBe(150000);
    expect(state.sizes.length).toBe(50000);
    expect(dt).toBeLessThan(2000);
  });

  it('updates 20k particles 60 steps without NaN/Inf', () => {
    const opts = applyScene3DParams({
      ...getDefaultScene3DParams(),
      particleCount: 20000,
      G: 1.5,
      M: 2,
      diskRadius: 2.5,
      diskThickness: 0.08,
    });
    const state = createParticles3D(20000, opts);
    for (let s = 0; s < 60; s++) {
      updateParticles3D(state, opts, 0.016, s * 0.016);
    }
    for (let i = 0; i < 20000; i++) {
      expect(Number.isFinite(state.positions[i * 3])).toBe(true);
      expect(Number.isFinite(state.positions[i * 3 + 1])).toBe(true);
      expect(Number.isFinite(state.positions[i * 3 + 2])).toBe(true);
      expect(Number.isFinite(state.velocities[i * 3])).toBe(true);
    }
  });

  it('buffer sizes match particle count', () => {
    const count = 10000;
    const state = createParticles3D(count, {});
    const posBytes = state.positions.byteLength;
    const velBytes = state.velocities.byteLength;
    const sizeBytes = state.sizes.byteLength;
    expect(posBytes).toBe(count * 3 * 4);
    expect(velBytes).toBe(count * 3 * 4);
    expect(sizeBytes).toBe(count * 4);
  });

  it('getEffectiveMagnitudeParam is fast for many lookups', () => {
    const opts = getDefaultScene3DParams();
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) {
      getEffectiveMagnitudeParam(opts, 'G');
      getEffectiveMagnitudeParam(opts, 'particleSize');
    }
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(100);
  });
});
