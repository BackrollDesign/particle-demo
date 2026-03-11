# UX — LAB panel and UI

## LAB panel

- **Container:** `[data-scene3d-filter]`. **Tabs:** Scene, Core, Particles, More (in header, visible on scroll). Each parameter appears once (no duplicates).
- **Controls:** Material Web (`md-slider`, `md-outlined-text-field`) and native `input`/`select` with `data-scene3d-opt`. Labels: `[data-scene3d-label]`.
- **Sync:** Scene is source of truth. Panel shows state via `getOptions()`, sends changes via `onChange(opt)` → `setOptions(opt)`. `syncFromOptions()` is called on init, tab switch (delayed), panel expand, and after preset load.
- **Layout:** Panel draggable by header; position saved in localStorage (`alcyone-filter-x`, `alcyone-filter-y`). Collapse to narrow strip; state in `alcyone-filter-collapsed`.

Section breakdown: [SCENE3D_FILTER.md](../SCENE3D_FILTER.md) (Filter component, Tabs).

## Presets

- **Save:** Downloads current parameters as .json file.
- **Load:** File picker or drag-and-drop .json file.
- **Reset:** Restores default preset.

## Core textures

- **URL:** Core texture field — path to color map. Normal/Disp/Spec/AO from same base path.
- **Drag & drop:** Drop zone in Core block for Color and Normal; brightness min/max supported.

## Accessibility

- Labels linked to controls. DnD zone has `aria-label` and keyboard alternative (“Select files” button). ARIA tab roles added for tab navigation.
