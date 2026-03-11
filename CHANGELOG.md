# Changelog

All notable changes to this project are documented in this file.

## [3.3.0] — 2026-03-11

### Changed

- **Filter panel renamed to LAB** — panel title now reads "LAB" instead of "Parameters".
- **Preset workflow redesigned** — replaced JSON textarea with three styled buttons: **Save** (downloads `.json` file), **Load** (opens file picker or drag & drop `.json`), **Reset** (restore defaults). Presets are now saved as portable text files.
- **Light theme visibility** — switching to light theme now applies contrasting colors for particles (`#0a2e5c`), star particles (`#1a3a6e`), fog (`#e8edf4`), ambient (`#3b2200`), and fresnel (`#1a1a2e`) so everything remains visible on white background.
- **Wave parameters separated** — disk particles and star particles now have independent wave controls: `waveAmplitude`/`waveFrequency` (Particles tab) and `starWaveAmplitude`/`starWaveFrequency` (Star Particle section).
- **Filter panel padding** — `filter-block-content` horizontal padding reduced to align with `filter-headline`, eliminating excess left/right indentation.
- **Preset schema version** bumped to **3.3**.
- **Card width** increased from 240px to 280px to prevent arrow overlap on longer titles.

### Added

- **Theme color constants** — extracted light/dark theme colors to `src/config/theme-colors.js`.
- **ARIA tab roles** — `role="tabpanel"`, `aria-labelledby`, and `aria-controls` on all filter panel tabs.
- **Tooltips** on technical labels (Z exponent, AO strength, Min. distance, Displacement, Specular).

### Removed

- **Default precision** scale selector (×10/×1/×0.1/×0.01) removed from More tab — magnitude stays at ×1.
- Old preset JSON textarea and Copy button.
- **Dead code archived** — 9 unused JS modules and 12 legacy 2D shaders moved to `src/_legacy/`.
- Unused exports: `kitFromFigmaFrames`, `isWebGLAvailable`, unused `kit` parameter in `applyThemeKit`.

### Performance

- **Per-frame allocation fixes** — reusable Float32Array for sphere model matrix; static fallback birth/death arrays in particle renderer.
- **Buffer uploads** — `bufferSubData` used instead of `bufferData` when particle buffer size is unchanged.
- **Resize optimization** — canvas dimensions checked before calling `gl.viewport`; perspective matrix only recalculated on aspect change.
- **Theme cache** — DOM attribute read once and cached; updated only on theme switch.

### Code quality

- **Memory leaks fixed** — drag listeners properly removed; tab click listeners tracked and cleaned in `destroy()`; `setInterval` ID stored for cleanup.
- **Error handling** — all silent `catch {}` blocks replaced with `console.warn` across main, filter-panel, sphere-renderer, theme-kit.
- **Color sync dedup** — extracted reusable `syncColorPair` helper in filter-panel.js (replaces 6 repeated patterns).
- **CSS cleanup** — removed duplicate light-theme rules, unused CSS variables, consolidated hardcoded colors to CSS vars, added `--space-2`.
- **Stepper buttons** enlarged from 24px to 32px for better touch targets.
- **ambientStrength** slider/field range unified to 0–100.
- **Shader cleanup** — deduplicated N/T/B computation in sphere3d.frag; replaced magic `3.0` with `u_maxRadius` in particles3d.vert.
- **Particle constants** — extracted `SAFE_MAX_SPEED` and `PARTICLE_INNER_RADIUS` from inline values.

## [2.0.0] — 2025-03

### Changed (filter optimization)

- **Filter panel:** Removed duplicate parameters across sections. Each parameter now appears in one place only. Camera (rotation, Z, X, Y, Scene offset, LookAt target, FOV, Near/Far) and lighting (Light intensity, Ambient, Light direction X/Y/Z, height, azimuth) live in **Scene** tab only. **Core → Transform** keeps only Core auto-rotate. **Core → Material** no longer duplicates Light intensity or Fresnel bias (Fresnel bias only in Fresnel section). **Core → Core textures** no longer has Texture projection type or Light direction (Geometry has projection type; Scene light has direction). **Core light** section removed (duplicate of Scene → Scene light). **Particles** tab no longer duplicates G, M, orbit strength, damping, min distance (those stay in Core → Physics). **More** tab no longer has a Bloom subsection (Bloom mode in Core → Geometry, Bloom range in Core → Material). Particle color only in **Particles** tab.

### Added (follow-up iterations)

- **Core vs Star separation:** **Core (sphere)** and **Star (particle cluster)** are now two distinct sections. **coreEnabled** (0/1, default 0) — when Off, the sphere is not drawn. **Star particle system** — second particle system with spherical distribution (dense cluster in a sphere); same physics as disk particles (gravity, wind, damping, orbit) but clamped to **starRadius**. Params: **starParticleCount** (0…100k), **starRadius**, **starParticleSize**. Core tab: "Core (sphere)" section with Core enabled; "Star (particle cluster)" section with star count, cluster radius, particle size. Rendered: sphere (if coreEnabled), then disk particles, then star particles.
- **Camera:** **FOV (deg)**, **Near clip**, **Far clip** in schema and Scene tab; used in `mat4.perspective`. **LookAt target:** **targetX**, **targetY**, **targetZ** for explicit camera lookAt; when not set, fallback to Scene offset (cameraPanX/Y/Z). **Orbit damping:** **orbitDamping** (0..1) in schema and Scene tab (slider + input); for future pointer-based orbit smoothing; not yet used in scene; value saved in presets.
- **Fog:** **fogType** (Linear / Exponential) and **fogDensity**; exponential fog uses `1.0 - exp(-density * dist)` in core fragment shader. Scene → Fog: type select and density slider added.
- **Rendering:** **coreDepthWrite** and **particleDepthWrite** (0/1) — control `gl.depthMask` for core and particles. **depthTestEnabled** (0/1) — toggles `gl.enable/disable(DEPTH_TEST)`. Defaults: depth test On, core depth write On, particles Off. More tab: Depth test, Core depth write, Particle depth write selects.
- **Fog:** Linear fog — **fogEnabled**, **fogNear**, **fogFar**, **fogColorHex**; applied in core fragment shader (mix with fog color by distance from camera). UI: "Fog" block in Scene tab, picker and hex field sync.
- **Blend modes:** **Multiply** and **Subtractive** added to **Core blend mode** (WebGL: DST_COLOR/ZERO and ZERO/ONE_MINUS_SRC_COLOR).
- **Noise (core):** **noiseSpeed** — time-based noise animation; **noiseOffsetX/Y/Z** — sampling offset. In core vertex shader: `u_time`, `u_noiseSpeed`, `u_noiseOffset`; sample `(pos + offset)*4 + (time*speed, 0, 0)`.
- **Background:** **backgroundColorHex** (empty = use theme). Scene tab has "Background" block with color field; valid hex overrides clearColor, otherwise data-theme.
- **Particles — start/end size:** **particleStartSize**, **particleEndSize** (0 = use Particle size). When either is set, particle size interpolates over lifetime (birth → death). State includes **birthTimes**; vertex shader uses **u_time**, **u_particleStartSize**, **u_particleEndSize** and attributes **a_birthTime**, **a_deathTime**. Particles tab: sliders + inputs for start/end size; label shows "—" when 0.

### Added

- **Star mode** — Core display toggle: "Planet" / "Star". In Star mode the core is drawn with Alcyone-style bright glow (~13 000 K): stronger glow, blue-white tint, stronger bloom.
- **Core auto-rotate** — "Core auto-rotate (deg/s)" parameter: independent slow rotation of the core, not tied to camera.
- **Architecture params backlog** — `docs/ARCHITECTURE_PARAMS_BACKLOG.md`: target architecture (Scene & Camera, Particle System, Noise, Rendering & Materials, Textures, Post-processing, GPU Compute) and "current" vs "to add" comparison.

### Fixed (core parameters)

- **Core glow / light / ambient:** Schema uses 0–100; the shader expected ~0–1. **drawSphere3D** now normalizes: **coreGlowStrength** and **coreGlowAmbient** divided by 100; **lightIntensity** and **ambientStrength** left as-is when ≤ 1, otherwise divided by 100. This fixes core glow and scene light having no visible effect or blowing out when set to 100.
- **Map brightness (min/max):** When min > max (e.g. 0.86 and 0.78), the fragment shader now uses `min`/`max` of the two so the brightness range is applied correctly.
- **bloomRange** and **coreGlowRadial** fallbacks aligned with schema defaults (94.7 and 1); **coreGlowRadial** clamped to 0–1.

### Changed

- **Preset schema version** — `filterVersion` (FILTER_SCHEMA_VERSION) set to **3**. Older presets remain compatible via `migratePreset`.
- **Core sphere** — Pole holes fixed for any segment count (longitude/latitude): one vertex per pole, no degenerate triangles.
- **Light direction** — Explicit X/Y/Z take priority: when sliders are set, direction is taken from them; otherwise from height/azimuth angles. Direction vector is normalized.
- **Filter panel** — Tabs (Scene / Core / Particles / More) moved into the panel header and fill width; tabs stay visible when scrolling.
- **Particles** — Sliders added for all numeric params (G, M, orbit strength, wind X/Y/Z, wave amplitude, etc.).

### Fixed

- Light direction (X/Y/Z) is applied correctly when sliders change.
- lightDirX/Y/Z schema bounds: -1…1 (normalized vector).

---

## [1.0.0] — earlier

- 3D scene: particles around core, gravity, wind, waves.
- TouchDesigner-style params (scale 10/1/0.1/0.01), presets, filter panel.
- Specs: TECHNICAL_SPEC_STAR.md, TECHNICAL_SPEC_STAR_V2.md.
