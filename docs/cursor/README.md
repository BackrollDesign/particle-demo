# Cursor: rules and doc pointers

## Rules (`.cursor/rules/`)

| Rule | When | Content |
|------|------|---------|
| **project-context** | Always | Links to docs/README, SCENE3D_FILTER, code/README. |
| **code-conventions** | Editing `src/**/*.js`, `*.glsl` | PARAM_SCHEMA, STRING_OPT_KEYS, `data-scene3d-opt`, panel destroy. |
| **ux-and-filter** | Editing `index.html`, `src/ui/**` | Tabs, syncFromOptions, controls, DnD. |
| **testing** | Editing `tests/**` | `npm test`, TDD, getOptions/setOptions contract. |
| **technical-debt** | When using tech debt | Links to docs/technical-debt. |

## Doc pointers by task

| Task | Docs |
|------|------|
| Add scene parameter | [code/README.md](../code/README.md), [SCENE3D_FILTER.md](../SCENE3D_FILTER.md), `PARAM_SCHEMA` and `STRING_OPT_KEYS` in `src/config/scene3d-params.js` |
| Change filter panel or sync | [ux/README.md](../ux/README.md), [SCENE3D_FILTER.md](../SCENE3D_FILTER.md) |
| Tests | [testing/README.md](../testing/README.md), tests in `tests/` mirroring `src/` |
| Engine (scene, particles, core) | [README.md](../README.md) (entry points), [code/README.md](../code/README.md), [SCENE3D_FILTER.md](../SCENE3D_FILTER.md) |
| Design, theme | [ux/README.md](../ux/README.md), [DESIGN_KIT.md](../DESIGN_KIT.md) |

Main index: [docs/README.md](../README.md).
