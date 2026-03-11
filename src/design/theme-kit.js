/**
 * Design kit: dark/light themes from Figma (30-643, 30-2199, 30-2246, hover variants).
 * applyTheme('light' | 'dark') sets CSS variables and data-theme on <html>.
 */

/** @typedef {{ background?: string, cardBorder?: string, text?: string, textMuted?: string, accent?: string, cardHoverBg?: string, cardHoverBorder?: string }} ThemeColors */
/** @typedef {{ padding?: string, borderRadius?: string, gap?: string, maxWidth?: string, minHeight?: string, titleSize?: string, titleWeight?: string, descSize?: string, listItemSize?: string }} CardStyle */
/** @typedef {{ colors?: ThemeColors, cards?: CardStyle, typography?: Record<string, string> }} ThemeKit */

/** Dark theme (Figma 30-1251, 30-1277: bg #0e1012, border #23252f, hover 30-1714) */
export const DARK_THEME_KIT = {
  colors: {
    background: '#0e1012',
    surface: '#121a24',
    cardBorder: '#23252f',
    text: '#dcdee5',
    textMuted: '#dcdee5',
    accent: '#6c9eff',
    cardHoverBg: '#12151C33',
    cardHoverBorder: '#23252f',
    cardGlassBg: 'transparent',
  },
  cards: {
    padding: '32px 12px 40px',
    borderRadius: '0',
    gap: '12px',
    maxWidth: 'none',
    minHeight: '0',
    titleSize: '32px',
    titleWeight: '500',
    descSize: '16px',
    listItemSize: '16px',
  },
  typography: {
    fontFamily: "'TT Hoves Pro Trial', -apple-system, BlinkMacSystemFont, sans-serif",
    headerSize: '20px',
    titleSize: '160px',
    subtitleSize: '16px',
  },
};

/** Light theme (Figma 30-2199, card hover 30-2034) */
export const LIGHT_THEME_KIT = {
  colors: {
    background: '#ffffff',
    surface: '#f5f7fa',
    cardBorder: '#c9d6e2',
    text: '#111419',
    textMuted: '#111419',
    accent: '#2563eb',
    cardHoverBg: 'rgba(18, 21, 28, 0.12)',
    cardHoverBorder: '#c9d6e2',
    cardGlassBg: 'transparent',
  },
  cards: {
    padding: '32px 12px 40px',
    borderRadius: '0',
    gap: '12px',
    maxWidth: 'none',
    minHeight: '0',
    titleSize: '32px',
    titleWeight: '500',
    descSize: '16px',
    listItemSize: '16px',
  },
  typography: {
    fontFamily: "'TT Hoves Pro Trial', -apple-system, BlinkMacSystemFont, sans-serif",
    headerSize: '20px',
    titleSize: '160px',
    subtitleSize: '16px',
  },
};

export const DEFAULT_THEME_KIT = DARK_THEME_KIT;

const STORAGE_KEY = 'alcyone-theme';

/**
 * Apply theme kit to document (sets CSS custom properties on :root).
 * @param {ThemeKit} kit
 */
function applyKit(root, kit) {
  if (!root || !kit) return;
  const { colors = {}, cards = {}, typography = {} } = kit;
  const vars = {
    '--theme-bg': colors.background,
    '--theme-surface': colors.surface,
    '--theme-card-border': colors.cardBorder,
    '--theme-text': colors.text,
    '--theme-text-muted': colors.textMuted,
    '--theme-accent': colors.accent,
    '--theme-card-hover-bg': colors.cardHoverBg,
    '--theme-card-hover-border': colors.cardHoverBorder,
    '--theme-card-glass-bg': colors.cardGlassBg,
    '--card-padding': cards.padding,
    '--card-radius': cards.borderRadius,
    '--card-gap': cards.gap,
    '--card-max-width': cards.maxWidth,
    '--card-min-height': cards.minHeight,
    '--card-title-size': cards.titleSize,
    '--card-title-weight': cards.titleWeight,
    '--card-desc-size': cards.descSize,
    '--card-list-size': cards.listItemSize,
    '--font-family': typography.fontFamily,
    '--header-size': typography.headerSize,
    '--title-size': typography.titleSize,
    '--subtitle-size': typography.subtitleSize,
  };
  for (const [key, value] of Object.entries(vars)) {
    if (value != null) root.style.setProperty(key, value);
  }
}

/**
 * Apply theme by name. Sets data-theme and CSS variables; persists to localStorage.
 * @param {'light' | 'dark'} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  const kit = theme === 'light' ? LIGHT_THEME_KIT : DARK_THEME_KIT;
  applyKit(root, kit);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) { console.warn('theme-kit: persist theme to localStorage', e); }
}

/**
 * Get current theme from DOM or localStorage.
 * @returns {'light' | 'dark'}
 */
export function getTheme() {
  const root = document.documentElement;
  const attr = root.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (e) { console.warn('theme-kit: read theme from localStorage', e); }
  return 'dark';
}

/** Apply theme kit (single kit object). For backward compatibility. */
export function applyThemeKit() {
  const theme = getTheme();
  applyTheme(theme);
}

