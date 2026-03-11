## Documentation

- **[CHANGELOG](CHANGELOG.md)** — change history.
- **[docs/](docs/README.md)** — project docs: [3D scene and filter](docs/SCENE3D_FILTER.md) (params, API, files), [architecture backlog](docs/ARCHITECTURE_PARAMS_BACKLOG.md) (current vs planned), testing, technical debt, code/UX conventions.

**CI:** GitHub Actions (`.github/workflows/ci.yml`) on push: `npm test`, `npm run test:layout`, `npm run build`, then E2E (Playwright).

## Stack

- **Vanilla WebGL** (no Three.js) for easy embedding.
- **ES modules**, Vite for build and dev.
- **Jest** for unit tests (TDD: tests written to spec before implementation).

## Design system integration

- Container: `[data-star-view="hero"]` (or `#star-hero`). Inside — canvas and settings panel only, no headings.
- Default background: black.
- Preload: preloader hidden after `load` and WebGL init.

## Structure

```
docs/README.md               # Doc index and engine entry points
docs/SCENE3D_FILTER.md       # 3D scene params, filter UI, API
docs/ARCHITECTURE_PARAMS_BACKLOG.md
src/config/scene3d-params.js  # PARAM_SCHEMA, applyScene3DParams
src/scene/                    # scene.js, sphere-3d-renderer, particle-system-3d
src/core/                     # WebGL, shaders (particles3d, sphere3d)
src/ui/                       # Preloader, filter-panel
tests/                        # config, scene, layout, e2e, etc.
```

## Links

- [Gravitational calculation of a particle via GLSL / WebGL](https://computergraphics.stackexchange.com/questions/7565/gravitational-calculation-of-a-particle-via-glsl-webgl)
- [Efficient particle system in JavaScript (WebGL)](https://webglfundamentals.org/webgl/lessons/webgl-qna-efficient-particle-system-in-javascript---webgl-.html)
