# Architecture params: backlog and current state

Long-term plan for exposing parameters for full scene control. Below: target blocks and "current" vs "to add" comparison.

---

## 1. Scene & Camera

| Parameter | Current | To add |
|-----------|--------|--------|
| FOV | **fov** (deg) in schema and UI, used in `mat4.perspective` | — |
| Near/far clipping | **near**, **far** in schema and UI | — |
| Position XYZ | cameraX, cameraY, cameraZ (offset), cameraZ as distance | Present; **lookAt target** separately if needed |
| Rotation XYZ | cameraAngleX, cameraAngleY | Present |
| LookAt target | **targetX, targetY, targetZ** (fallback to cameraPanX/Y/Z when not set) | — |
| Orbit damping | **orbitDamping** in schema (0..1); reserved for future pointer orbit smoothing | — |
| Background | **backgroundColorHex** — when set overrides clearColor; otherwise data-theme | Optional **texture/cubemap** |
| Fog | **fogEnabled**, **fogType** (linear / exponential), **fogNear**, **fogFar**, **fogDensity**, **fogColorHex**; linear and exponential fog in core shader | — |
| Environment map intensity | No | For IBL / reflections |

---

## 2. Core (sphere) vs Star (particle cluster)

| Element | Current | To add |
|---------|--------|--------|
| **Core (sphere)** | **coreEnabled** (0/1, default 0) — when Off, sphere not drawn. Radius, segments, blend, glow, textures, noise, bloom. | — |
| **Star particles** | Second particle system: **starParticleCount**, **starRadius**, **starParticleSize**. Spherical distribution (dense cluster), same physics as disk (G, M, wind, damping, orbit). Clamped to sphere of radius starRadius. | Done: starParticleColorHex, starStartSize/EndSize, starWaveAmplitude, starWaveFrequency. |

## 3. Particle System — disk

| Group | Current | To add |
|-------|--------|--------|
| **Emitter** | particleCount, diskRadius, diskThickness, initial disk distribution | **emitRate** (particles/s), **maxParticles**, **emitterShape** (point, sphere, box, cone, mesh), **emitterSize** xyz, **direction** + **spread angle**, **velocity min/max**, **inheritVelocity** |
| **Per-particle** | particleSize, **particleStartSize/particleEndSize** (0 = use particleSize; interpolated over lifetime), particleColorHex/particleGradient, lifetime from particleLifetimeMin/Max | **startColor/endColor** or gradient by lifetime, **startRotation**, **angularVelocity**, **mass**, **drag** |
| **Forces** | G, M, windX/Y/Z, waveAmplitude, waveFrequency, orbitStrength, damping, minDistance | **gravity** xyz, **wind** xyz, **turbulence** (frequency, amplitude, speed), **vortex** (center, strength), **attractor/repulsor** (positions, force), **curl noise** (scale, intensity) |

---

## 4. Noise — for organic motion

| Parameter | Current | To add |
|-----------|--------|--------|
| noiseType | none, simplex, perlin, value (on sphere/vertices) | Extend: **curl, worley, FBM** |
| frequency / scale | noisePeriod, noiseHarmonics | **frequency**, **octaves** (FBM), **lacunarity**, **persistence** |
| amplitude | noiseAmplitude | Present; separate **amplitude** for particles if needed |
| speed | **noiseSpeed** — time-based animation in core vertex shader | — |
| offset xyz | **noiseOffsetX/Y/Z** — noise sampling offset on core | — |
| Curl noise | No | **curl** for divergence-free field (fluid-like particles) |

---

## 5. Rendering & Materials

| Element | Current | To add |
|----------|---------|--------|
| **Blend modes** | normal, additive, screen, **multiply**, **subtractive** (coreBlendMode) | Explicit GL params for custom mode if needed |
| **Depth** | **depthTestEnabled**, **coreDepthWrite**, **particleDepthWrite** (gl.depthTest + gl.depthMask) | **alphaTest**, **sortParticles** (optional) |
| **Core display** | planet / star (coreDisplayMode) — star glow | Implemented in v2.0 |

---

## 6. Textures

| Parameter | Current | To add |
|-----------|--------|--------|
| Core | diffuse, normal, disp, spec, AO; coreTextureType (UV, xyz, face) | **UV offset/repeat**, **texture rotation** |
| Particles | No (points, color from attribute) | **texture map** (sprite), **textureAtlas** rows/cols, **frameRate** animation, **alphaMap**, optional **normalMap** for billboard quads |
| Settings | Basic | **wrapS/wrapT**, **magFilter/minFilter**, **anisotropy**, **encoding** (sRGB/linear) |

---

## 7. Post-processing

| Parameter | Current | To add |
|-----------|--------|--------|
| Bloom | bloomEnabled, bloomRange (in core fragment shader) | Separate pass: **threshold**, **strength**, **radius**; consider **postprocessing** (vanruesc) vs built-in |
| DoF | No | **focusDistance**, **aperture**, **maxBlur** |
| Color grading | No | **exposure**, **contrast**, **saturation**, **hue shift** |
| Chromatic aberration | No | **offset** |
| Film grain | No | **intensity**, **animated** |
| Tone mapping | No | **type** (ACES, Reinhard, Cineon), **exposure** |

---

## 8. GPU Compute (heavy systems)

| Element | Current | To add |
|---------|--------|--------|
| Simulation | CPU: updateParticles3D (Euler), single position/velocity buffer | For 100k+ particles: **GPGPU** — positions/velocities in DataTexture (float RGBA), compute shader (ping-pong FBO) |
| Params | — | **simulationTextureSize** (sqrt(maxParticles)), **timeStep**, **bounds** (wrap/kill) |
| Libraries | — | **GPUComputationRenderer** (Three.js) or equivalent in vanilla WebGL 2 |

---

## 9. Useful libraries (reference)

- **Core:** three + postprocessing + lil-gui / tweakpane (here: vanilla WebGL + custom filter).
- **Utils:** stats.js (FPS/MS/MB), glsl-noise (GLSL noise), three-custom-shader-material.
- **Advanced:** three-gpu-pathtracer, troika-three-text, drei (R3F).

---

## 10. Priorities for next iterations

1. **High (done):** FOV, near/far; fog (linear, exponential, color, density); lookAt target; depth (depthTest, core/particle depth write); noise speed/offset on core; orbitDamping in schema (for future orbit control).
2. **Medium:** Emitter shape/size, startSize/endSize (done), turbulence/vortex; blend multiply/subtractive (done); texture atlas for particles.
3. **Long-term:** Full post-processing pass (Bloom, DoF, tone mapping); GPGPU for particles when count grows above 100k.

---

*Document version: 3.3. See CHANGELOG 3.3.0.*
