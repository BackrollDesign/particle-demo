# Design kit

Small token kit (theme, cards, typography) for building the UI from mockups. The scene editor uses the same tokens via CSS variables.

## Usage

- **Default theme** is set in `src/design/theme-kit.js` (`DEFAULT_THEME_KIT`).
- On page load `applyThemeKit()` is called and sets CSS variables on `:root`.
- The page (background, headings, cards) uses variables like `var(--theme-bg)`, `var(--card-padding)`, etc.

## Tokens

| Variable | Description |
|----------|-------------|
| `--theme-bg` | Page background |
| `--theme-surface` | Surface background |
| `--theme-card-border` | Card border |
| `--theme-text` | Primary text |
| `--theme-text-muted` | Secondary text |
| `--theme-accent` | Accent color |
| `--theme-card-hover-bg`, `--theme-card-hover-border` | Card hover state |
| `--card-padding`, `--card-radius`, `--card-gap` | Card padding and radius |
| `--card-max-width`, `--card-min-height` | Card block dimensions |
| `--card-title-size`, `--card-desc-size`, `--card-list-size` | Card font sizes |
| `--font-family`, `--header-size`, `--title-size`, `--subtitle-size` | Typography |

## Figma sync

Figma has frames with card, size, and theme color data. To pull them into the kit:

1. Get context for the needed nodes (e.g. via Figma MCP `get_design_context` with frame `nodeId`).
2. Manually define `{ colors, cards, typography }` with the same keys as in `DEFAULT_THEME_KIT`. Use `applyThemeKit()` to apply the current theme.
