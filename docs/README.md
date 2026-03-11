# Project documentation

Essential docs for development and maintenance.

## Core reference

| Doc | Purpose |
|-----|--------|
| [SCENE3D_FILTER.md](./SCENE3D_FILTER.md) | 3D scene and filter: all parameters (camera, fog, core, star particles, disk particles, rendering), UI contract (`getOptions` / `setOptions`), main files. |
| [ARCHITECTURE_PARAMS_BACKLOG.md](./ARCHITECTURE_PARAMS_BACKLOG.md) | Parameter backlog: current vs planned (Scene & Camera, Core/Star, Particles, Noise, Rendering, Textures, Post-processing, GPU Compute). |

## Entry points (engine)

| File | Role |
|------|------|
| `src/main.js` | Preloader, WebGL context, `initScene`, filter panel, theme. |
| `src/scene/scene.js` | Scene init, camera, core (sphere) and star/disk particles, `setOptions` / `getOptions`, frame loop. |
| `src/scene/particle-system-3d.js` | Disk particles + star particles (spherical cluster), `createParticles3D` / `createStarParticles3D`, `updateParticles3D` / `updateStarParticles3D`, `drawParticles3D`. |
| `src/scene/sphere-3d-renderer.js` | Core sphere: mesh, textures, `drawSphere3D`, bloom, Fresnel. |
| `src/config/scene3d-params.js` | `PARAM_SCHEMA`, defaults, `applyScene3DParams`, `getEffectiveMagnitudeParam`, preset migration. |
| `src/ui/filter-panel.js` | Option collection, `syncFromOptions`, preset Save/Load/Reset (file-based). |

New params: add to `PARAM_SCHEMA` and to filter UI (`data-scene3d-opt`). String options: add to `STRING_OPT_KEYS` in `scene3d-params.js`.

## Other sections

| Section | Description |
|--------|--------------|
| [Testing](./testing/README.md) | Unit tests (Jest), coverage, how to run. |
| [Technical debt](./technical-debt/README.md) | Done items, remaining debt, recommendations. |
| [Code](./code/README.md) | Architecture, conventions, adding params and panel options. |
| [UX](./ux/README.md) | Filter panel structure, sync, DnD, accessibility. |
| [DESIGN_KIT.md](./DESIGN_KIT.md) | Theme tokens (CSS variables), theme-kit usage. |
| [Cursor](./cursor/README.md) | Rules, skills, doc pointers for Cursor. |
