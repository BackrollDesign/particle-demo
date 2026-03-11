# Code documentation

## Architecture

- **Entry point:** `src/main.js` — preloader, WebGL context, initScene, filter panel, theme.
- **Scene:** `src/scene/scene.js` — camera, core (sphere), particles, setOptions/getOptions, geometry and texture updates.
- **Params:** `src/config/scene3d-params.js` — PARAM_SCHEMA, magnitude, gradients, FOG_TYPES, CORE_DISPLAY_MODES, applyScene3DParams.
- **Theme colors:** `src/config/theme-colors.js` — LIGHT_THEME_COLORS, DARK_THEME_COLORS for theme switching.
- **Core:** `src/scene/sphere-3d-renderer.js` — sphere mesh, UV/tangents, texture load (URL and DnD), drawSphere3D.
- **Particles:** `src/scene/particle-system-3d.js` — createParticles3D, updateParticles3D, drawParticles3D (count from state).
- **UI:** `src/ui/filter-panel.js` — option collection, syncFromOptions, notify, preset Save/Load/Reset (file-based).
- **Legacy:** Legacy code archived in `src/_legacy/` (unused 2D modules and shaders).

## New modules / extensions

- **Core textures:** load by URL + drag-and-drop (color/normal), brightness min/max in fragment shader or at sample time.
- **Texture type:** enum (e.g. `xyz_normalized`, `face`) — UI choice, passed to renderer/shader for UV or generated coords.
- **Z exponent:** single scene param, passed to 3D shape engine (sphere/mesh) for Z distortion (e.g. scale.z = f(radius, zExponent)).
- **Noise:** module or params in scene3d-params (noiseType, noisePeriod, noiseHarmonics, noiseAmplitude); use in vertex/fragment or particle positions.

## Conventions

- Scene params added to PARAM_SCHEMA and applyScene3DParams (including strings for textureType, noiseType, coreBlendMode, fogType, coreDisplayMode).
- String options (not coerced to number) listed in STRING_OPT_KEYS (scene3d-params.js); when adding new string field — add key there and in schema.
- New panel options — `data-scene3d-opt="key"`; native input/select and Material Web (md-slider, md-outlined-text-field) supported.
- On panel destroy revoke blob URLs and remove listeners from controls and color fields.
