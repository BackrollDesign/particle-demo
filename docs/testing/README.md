# Testing

## Strategy

- **Unit:** Jest, ES modules (`node --experimental-vm-modules`). Tests in `tests/` mirror `src/` structure.
- **E2E:** Playwright for visual and scenario checks (when available).
- Principle: **tests first, then code** for new features (params, utils, API contracts).

## Coverage

- `tests/config/scene3d-params.test.js` — schema, magnitude, applyScene3DParams, coreTextureUrl; **fog** (fogType, fogDensity), **camera target** (targetX/Y/Z), **orbitDamping**, **particleStartSize/particleEndSize**, **core display mode** (planet/star), **depth** (depthTestEnabled, coreDepthWrite, particleDepthWrite), FOG_TYPES, CORE_DISPLAY_MODES, STRING_OPT_KEYS.
- `tests/scene/particle-system-3d.test.js` — disk, wind, waves, particle count.
- New tests: texture params (brightness range, texture type, z exponent, noise), DnD load (mock File/DataTransfer).

## Run

```bash
npm test                    # all unit tests (excludes e2e by default in many setups)
npm run test:layout         # layout tests only (Figma 30-643)
npm test -- --testPathPattern=scene3d-params   # single suite
```

## New scenarios (checklist)

- [ ] coreBrightnessMin/Max params applied in shader/renderer.
- [ ] Texture type (xyz_normalized, face) switches sampling/projection.
- [ ] Z exponent affects shape/Z offset.
- [ ] Noise (type, period, harmonics, amplitude) affects positions/sizes or core.
- [ ] DnD: selecting file as Color/Normal updates textures and options.
- [x] Fog type (linear / exponential) and fog density applied in core fragment shader (unit: schema + applyScene3DParams).
- [x] Camera lookAt target (targetX/Y/Z) and core display mode (planet/star) in schema and applyScene3DParams.
- [x] Depth (depthTestEnabled, coreDepthWrite, particleDepthWrite) in schema and applyScene3DParams; gl.depthTest and gl.depthMask in scene.
- [x] Orbit damping (orbitDamping) in schema, applyScene3DParams, and Scene tab UI; reserved for future orbit control.
- [x] Particle start/end size (particleStartSize, particleEndSize) in schema, applyScene3DParams, particle state (birthTimes), shader (a_birthTime, a_deathTime, u_time, mix), and Particles tab UI; 0 = use Particle size.
