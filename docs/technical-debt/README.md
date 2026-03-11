# Technical debt and improvements

## Current status

Done: texture load (URL + DnD), brightness min/max, projection type (UV, XYZ), Z exponent, pseudo-noise in shader, Material Web in all filter sections (md-slider, md-outlined-text-field), long sliders and compact number fields, draggable filter panel (position: fixed, position saved in localStorage) and collapsible to narrow strip, particle noise (particleNoiseAmount, particleNoiseSpeed) in physics, removed “Default scale” and “Color preset” blocks.

Recently completed: filter panel de-duplicated (one param per section); fog type/density, lookAt target, core display mode, background color; depth (depthTestEnabled, coreDepthWrite, particleDepthWrite) in schema and More tab; orbitDamping in schema (for future orbit control); particle start/end size (particleStartSize, particleEndSize) with lifetime interpolation in particle shader and birthTimes in state. **Core vs Star separation:** coreEnabled (sphere On/Off, default Off); second particle system — Star (spherical cluster) with starParticleCount, starRadius, starParticleSize; same physics as disk, spherical distribution and boundary. v3.3: Archived 9 dead JS modules + 12 shaders to _legacy/; fixed per-frame allocations; bufferSubData for particles; resize optimization; theme cache; silent catches replaced with console.warn; memory leak fixes; ARIA tab roles; CSS cleanup; color sync dedup; extracted theme colors to constants.

## Remaining debt (low priority)

| Description | Where | Priority |
|-------------|-------|----------|
| Real simplex/perlin/value noise in shader (currently one pseudo-noise) | sphere3d.vert.glsl | low |
| Face mode for texture type (need face id in mesh) | shaders, mesh | low |

## Improvement recommendations

- **Filter panel:** destroy() removes all listeners: controls (input/change), color (hex/picker), Copy/Load buttons, DnD (dragover, dragleave, drop, click, keydown), file input change. Blob URLs revoked.
- **Config:** string options in STRING_OPT_KEYS (scene3d-params.js); add new string fields via this constant.
- **Optimization:** textures loaded once on URL change; size limited to 2048px; blob URLs revoked on file change and on panel destroy.
- **Code actualization:** before large refactor — save state in git (tag/branch); after changes — update tests and docs; find and remove dead code.

## Links

- [WebGL asset optimization](https://habr.com/ru/articles/456526/)
