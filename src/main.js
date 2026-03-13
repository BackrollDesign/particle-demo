/**
 * Entry: preloader → WebGL init → 3D scene; filter panel; design kit.
 */

import { getGLContext } from './core/gl-context.js';
import { hidePreloader } from './ui/preloader.js';
import { ensureMaterialLoaded } from './ui/material-filter-init.js';
import { createFilterPanel } from './ui/filter-panel.js';
import { applyTheme, getTheme } from './design/theme-kit.js';
import { LIGHT_THEME_COLORS, DARK_THEME_COLORS } from './config/theme-colors.js';
import { initScene } from './scene/scene.js';
import { upgradeSelects } from './ui/custom-select.js';
import particles3dVert from './core/shaders/particles3d.vert.glsl?raw';
import particles3dFrag from './core/shaders/particles3d.frag.glsl?raw';
import sphere3dVert from './core/shaders/sphere3d.vert.glsl?raw';
import sphere3dFrag from './core/shaders/sphere3d.frag.glsl?raw';

const ROOT_SELECTOR = '[data-star-view="hero"]';

/** @type {ReturnType<typeof setInterval> | null} */
let perfWarningIntervalId = null;

function run() {
  const root = document.querySelector(ROOT_SELECTOR);
  const canvas = root?.querySelector('canvas');
  if (!canvas) {
    hidePreloader();
    console.warn('Star view: canvas not found');
    return;
  }

  const gl = getGLContext(canvas);
  if (!gl) {
    hidePreloader();
    console.warn('Star view: WebGL not available');
    return;
  }

  const shaders = {
    particles3dVert,
    particles3dFrag,
    sphere3dVert,
    sphere3dFrag,
  };

  const currentTheme = getTheme();
  applyTheme(currentTheme);

  const initialThemeColors = currentTheme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS;
  const scene = initScene(gl, canvas, shaders, initialThemeColors);

  const filterEl = document.querySelector('[data-scene3d-filter]');
  ensureMaterialLoaded();
  const filterPanel = createFilterPanel(filterEl, (opt) => scene.setOptions(opt), { getOptions: () => scene.getOptions() });
  if (filterEl) {
    initFilterPanelDragAndCollapse(filterEl, filterPanel.syncFromOptions);
    initFilterPanelTabs(filterEl);
    initFilterPanelSections(filterEl);
    upgradeSelects(filterEl);
  }
  const themeSwitcher = document.getElementById('theme-switcher');
  if (themeSwitcher) {
    themeSwitcher.addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      if (next === 'light') {
        scene.setOptions(LIGHT_THEME_COLORS);
      } else {
        scene.setOptions(DARK_THEME_COLORS);
      }
      filterPanel.syncFromOptions();
    });
  }
  const perfWarningEl = document.getElementById('scene-perf-warning');
  if (perfWarningEl && typeof scene.getPerfWarning === 'function') {
    perfWarningIntervalId = setInterval(() => {
      const msg = scene.getPerfWarning();
      perfWarningEl.textContent = msg || '';
      perfWarningEl.hidden = !msg;
    }, 500);
  }
  scene.start();
  hidePreloader();
}

const FILTER_STORAGE_KEY = 'alcyone-filter';

function initFilterPanelDragAndCollapse(panel, onExpand) {
  const header = panel.querySelector('[data-filter-drag-handle]');
  const toggle = panel.querySelector('[data-filter-collapse]');
  if (!header) return;
  try {
    const x = localStorage.getItem(FILTER_STORAGE_KEY + '-x');
    const y = localStorage.getItem(FILTER_STORAGE_KEY + '-y');
    const collapsed = localStorage.getItem(FILTER_STORAGE_KEY + '-collapsed') === '1';
    if (x != null && y != null) {
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
    if (collapsed) panel.classList.add('filter-panel-collapsed');
  } catch (e) { console.warn('filter panel: restore position/collapsed from localStorage', e); }
  let drag = null;
  function onDragMove(e) {
    if (!drag) return;
    const x = e.clientX - drag.startX;
    const y = e.clientY - drag.startY;
    panel.style.left = Math.max(0, x) + 'px';
    panel.style.top = Math.max(0, y) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }
  function onDragEnd() {
    if (!drag) return;
    drag = null;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    try {
      const rect = panel.getBoundingClientRect();
      localStorage.setItem(FILTER_STORAGE_KEY + '-x', String(Math.round(rect.left)));
      localStorage.setItem(FILTER_STORAGE_KEY + '-y', String(Math.round(rect.top)));
    } catch (e) { console.warn('filter panel: save position to localStorage', e); }
  }
  header.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('[data-filter-collapse]')) return;
    const rect = panel.getBoundingClientRect();
    drag = { startX: e.clientX - rect.left, startY: e.clientY - rect.top, right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom };
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  });
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasCollapsed = panel.classList.contains('filter-panel-collapsed');
      panel.classList.toggle('filter-panel-collapsed');
      if (wasCollapsed && typeof onExpand === 'function') setTimeout(onExpand, 80);
      try {
        localStorage.setItem(FILTER_STORAGE_KEY + '-collapsed', panel.classList.contains('filter-panel-collapsed') ? '1' : '0');
      } catch (_) {}
    });
  }
}

function initFilterPanelTabs(panel) {
  const tabs = panel.querySelectorAll('.filter-tab');
  const panels = panel.querySelectorAll('.filter-tab-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-filter-tab');
      tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      panels.forEach((p) => {
        if (p.getAttribute('data-filter-tab') === id) {
          p.classList.add('active');
          p.setAttribute('open', '');
        } else {
          p.classList.remove('active');
          p.removeAttribute('open');
        }
      });
    });
  });
}

const SECTIONS_STORAGE_KEY = FILTER_STORAGE_KEY + '-sections';

function initFilterPanelSections(panel) {
  const sections = panel.querySelectorAll('.filter-section[data-filter-section]');
  if (!sections.length) return;
  let saved = {};
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (_) {}
  sections.forEach((el) => {
    const id = el.getAttribute('data-filter-section');
    if (id && saved[id] === false) el.removeAttribute('open');
    else if (id && saved[id] === true) el.setAttribute('open', '');
    el.addEventListener('toggle', () => {
      try {
        const current = {};
        panel.querySelectorAll('.filter-section[data-filter-section]').forEach((s) => {
          const sid = s.getAttribute('data-filter-section');
          if (sid) current[sid] = s.hasAttribute('open');
        });
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(current));
      } catch (e) { console.warn('filter panel: save sections to localStorage', e); }
    });
  });
}

function initCardHover() {
  document.querySelectorAll('.alcyone-card').forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-hovered'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-hovered'));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { run(); initCardHover(); });
} else {
  run();
  initCardHover();
}
