# 3D scene and filter component

The scene displays **3D mode only**: particle disk around the core in a gravity field, no 2D (corner plasma, star).

## Parameters (TouchDesigner-style)

- **Per-field scale** — Fields “Gravity”, “Core mass”, “Orbit strength”, “Wind X/Y/Z”, “Wave amplitude”, “Wave frequency”, **“Particle size”** have **per-field scale** (×10, ×1, ×0.1, ×0.01 dropdown in row). Effective value = slider value × selected scale for that field. Global default precision UI removed in v3.3.

- **Camera**  
  - **Position X, Y, Z** — camera position; Z is distance from center.  
  - **Rotation X (vert.)**, **Rotation Y (horiz.)** — view angles.  
  - **Scene offset X/Y/Z** (`cameraPanX`, `cameraPanY`, `cameraPanZ`) — used as lookAt target when targetX/Y/Z are not set.  
  - **LookAt target X/Y/Z** (`targetX`, `targetY`, `targetZ`) — explicit camera lookAt point; fallback to scene offset when not set.  
  - **FOV (deg)**, **Near clip**, **Far clip** — perspective and clipping planes.  
  - **Orbit damping** — slider + input (0..1) in Scene tab; in schema for future pointer-based orbit smoothing; value saved in presets.

- **Fog**  
  - **Fog** — On/Off.  
  - **Fog type** — Linear (uses start/end) or Exponential (uses density).  
  - **Fog start**, **Fog end** — linear fog range.  
  - **Fog density** — exponential fog falloff (`1 - exp(-density * dist)`).  
  - **Fog color** — hex.

- **Background**  
  - **Background color** — hex; when set overrides clear color; empty uses theme.

- **Gravity**  
  - **G** (min −50) — attraction; negative values give repulsion.  
  - **M** — core mass.  
  - **Orbit** (min −2) — tangential speed; negative inverts orbit.  
  - **Damping** — velocity decay (0.9…1).

- **Core (sphere)** — The 3D sphere/nucleus. Can be turned off entirely.  
  - **Core enabled** — On/Off (default Off). When Off, the sphere is not drawn; only particles (disk and/or star) are shown.  
  - **Core display** — Planet or Star (Alcyone-style glow), when core is enabled.  
  - **Radius**, **Segments (lat / lon)** — 4…128.  
  - **Blend mode** — Normal, Additive, Screen, Multiply, Subtractive.  
  - **Glow**, **Core ambient glow** — UI 0–100; renderer normalizes to 0–1 for shader. **Radial glow** — 0–1.  
  - **Light intensity**, **Ambient strength** (Scene light) — UI 0–100; values > 1 normalized to 0–1.  
  - **Texture (Color)**, **Normal map** — URL or DnD; **Texture type** — UV, XYZ Normalized, Face.  
  - **Brightness (min/max)** — map brightness range; order-independent (min/max applied correctly if min > max). **Fresnel** — color and bias (separate section).  
  - **Z exponent** — Z-axis squash/stretch (0.2…3).  
  - **Noise** — type (none, simplex, perlin, value), period, harmonics, amplitude, **speed**, **offset X/Y/Z**; applied to sphere vertices.  
  - **Core auto-rotate (deg/s)** — independent slow rotation.  
  - **Bloom**, **Bloom range**.

- **Star (particle cluster)** — A second particle system: dense spherical cluster. Same physics as disk particles (gravity, wind, damping, orbit-style motion) but shape is a sphere instead of a disk.  
  - **Star color** — separate from disk particles (hex + picker in Core tab → Particle Star).  
  - **Star particle count** — 0…100 000; 0 disables star particles.  
  - **Star cluster radius** — radius of the spherical volume (particles spawn and are clamped inside it).  
  - **Star particle size**, **Star start/end size**, **Star lifetime (min/max)**, **Star particle noise**, **Star noise speed**, **Star motion mode**, **Star speed scale**, **Star max speed** — mirror of main particle controls.  
  - **Star wave amplitude**, **Star wave frequency** — separate wave controls for star particles (independent from disk wave).  
  Rendered after disk particles with the same point shader.

- **Particles**  
  - **Color preset**, **Color (hex)** — as before.  
  - **Count**, **Size** (with ×10/×1/×0.1/×0.01 scale), **Particle start size**, **Particle end size** (0 = use Size; when both set, size interpolates over lifetime), **disk radius**, **disk thickness**.  
  - **Wave amplitude**, **Wave frequency** — in Particles tab (separate from Star wave params).  
  - **Disk thickness** clamps particles on Z: particles stay within ±(diskThickness/2).

- **Wind and waves**  
  **windX/Y/Z** — constant force. **Wave amplitude** can be negative (phase inversion).

- **Scene light** (single place for lighting): **Light intensity**, **Ambient light**, **Ambient color**, **Light direction X/Y/Z**, **Light height**, **Light azimuth**.
- **Preset** — Save / Load / Reset (file-based: Save downloads .json, Load via file picker or drag-and-drop). JSON with `filterVersion`.
- **Rendering (More):** **Depth test** — toggles `gl.depthTest`. **Core depth write**, **Particle depth write** — control `gl.depthMask` (On/Off). Defaults: depth test On, core On, particles Off.

## Filter panel UI (LAB)

- Panel title: **LAB** (v3.3).

## Filter component (UI)

- Container: **`[data-scene3d-filter]`**.
- Controls: **`input[data-scene3d-opt]`**, **`select[data-scene3d-opt]`**, **`md-slider[data-scene3d-opt]`**, **`md-outlined-text-field[data-scene3d-opt]`**.
- Value/label: **`[data-scene3d-label]`** (updated on change).
- **Tabs:** Scene, Core, Particles, More. Tabs live in the panel header and stay visible when scrolling.
- **No duplicate params:** each parameter appears in one section only. Panel title: **LAB**. **Scene** — camera (rotation, Z, X, Y, scene offset, lookAt target, FOV, near/far), fog, background, scene light. **Core** tab has two top-level subsections: **(1) Core** — collapsible; inside it: Sphere (enabled, display mode, radius, segments, texture type, bloom, glow, blend), Physics (G, M, orbit, damping, min distance), Transform (core auto-rotate), Material (glow, brightness, noise, bloom range), Fresnel, Core textures (DnD). **(2) Particle Star** — collapsible; star color, count, radius, size, start/end size, lifetime, noise, motion mode, speed scale, max speed, star wave amplitude/frequency. **Particles** — color, count, size, disk, lifetime, noise, motion, wind, wave amplitude/frequency (no G/M/orbit here; those are in Core → Physics). **More** — point scale, preset (Save/Load/Reset).
- Per-field scale (×10/×1/×0.1/×0.01) where applicable; labels follow UX copy.

Panel collects all values and passes them to `scene.setOptions(opt)`. String options (**particleGradient**, **fogType**, **coreDisplayMode**, hex colors, etc.) and numeric params are handled in `applyScene3DParams`; gradient → color from `PARTICLE_GRADIENTS` at draw time.

## Scene API contract (getOptions / setOptions)

- **`getOptions()`** — returns object with all scene option keys. Source of truth: internal `opts` in `scene.js`. Keys match **PARAM_SCHEMA** in `src/config/scene3d-params.js`, plus `particleGradient`, `particleColorHex`. Includes: camera (incl. targetX/Y/Z, fov, near, far), fog (fogEnabled, fogType, fogNear, fogFar, fogDensity, fogColorHex), backgroundColorHex, core (incl. coreDisplayMode, coreRotationSpeed, noise speed/offset), blend, particle*, wind*, wave*, light*, ambient*, pointScale, magnitudeLevel, mag_*, and strings in **STRING_OPT_KEYS** (e.g. coreTextureType, coreBlendMode, noiseType, fogType, coreDisplayMode, texture URLs, hex colors).
- **`setOptions(opt)`** — accepts object with subset of keys; applies via `applyScene3DParams({ ...opts, ...opt })`. Unknown keys ignored. String options listed in **STRING_OPT_KEYS** in `scene3d-params.js`.
- Filter panel on sync calls `getOptions()` and sets all elements with `data-scene3d-opt` and updates `[data-scene3d-label]` by key. On user change collects values into object and calls `onChange(opt)` → `setOptions(opt)`.

## Files

| File | Purpose |
|------|---------|
| `src/config/scene3d-params.js` | Schema, per-field scale (mag_*), gradients, `BLEND_MODES`, `FOG_TYPES`, `CORE_DISPLAY_MODES`, `getEffectiveMagnitudeParam`, `applyScene3DParams` |
| `src/scene/scene.js` | 3D: camera (incl. pan), core, particles, core blend mode, sphere geometry update |
| `src/scene/particle-system-3d.js` | Disk particles (radius + Z thickness), **star particles** (spherical cluster, same physics); wind, waves, gravity; particle size with scale |
| `src/scene/sphere-3d-renderer.js` | 3D sphere with configurable segments, `updateSphere3DGeometry`, radial glow, bloom |
| `src/ui/filter-panel.js` | Value collection, color/hex sync, syncFromOptions on preset load, Save/Load |

## Tests

- **tests/config/scene3d-params.test.js** — multipliers, gradients, `applyScene3DParams`, `getEffectiveMagnitudeParam`; fog (fogType, fogDensity), camera target (targetX/Y/Z), core display mode (planet/star), FOG_TYPES, CORE_DISPLAY_MODES, STRING_OPT_KEYS.
- **tests/scene/particle-system-3d.test.js** — disk creation (z, radius), finite positions, wind application, radius clamp; **star particles:** createStarParticles3D (state shape, positions inside sphere, empty count), updateStarParticles3D (stays inside starRadius, finite).

Run: `npm test`.
