/**
 * Filter panel: per-field magnitude, hex color, preset log (copy/load).
 * Grouped blocks; collects all data-scene3d-opt controls and sends to onChange.
 * Supports native input/select and Material Web (md-slider, md-outlined-text-field).
 */

import { STRING_OPT_KEYS, normalizeHex, FILTER_SCHEMA_VERSION, migratePreset, getDefaultScene3DParams, applyScene3DParams } from '../config/scene3d-params.js';

const CONTROL_SELECTOR = 'input[data-scene3d-opt], select[data-scene3d-opt], md-slider[data-scene3d-opt], md-outlined-text-field[data-scene3d-opt]';

function isNumericControl(el) {
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'MD-SLIDER' || el.type === 'number' || el.type === 'range';
}

function isTextControl(el) {
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'MD-OUTLINED-TEXT-FIELD' || el.type === 'text';
}

const NOTIFY_DEBOUNCE_MS = 220;

function getControlValue(el, key) {
  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'SELECT') return el.value;
  if (tag === 'MD-SLIDER') return Number(el.value);
  if (tag === 'MD-OUTLINED-TEXT-FIELD') {
    const v = (el.value ?? '').trim();
    return STRING_OPT_KEYS.includes(key) ? v : (v === '' ? 0 : Number(v));
  }
  if (el.type === 'checkbox') return el.checked ? 1 : 0;
  if (el.type === 'color') return el.value;
  if (el.type === 'text') return STRING_OPT_KEYS.includes(key) ? String(el.value).trim() : Number(el.value);
  if (el.type === 'number') return Number(el.value);
  return Number(el.value);
}

function setControlValue(el, value) {
  const tag = (el.tagName || '').toUpperCase();
  const s = String(value);
  const n = Number(value);
  if (tag === 'MD-SLIDER') { el.value = Number.isFinite(n) ? n : el.min; return; }
  if (tag === 'MD-OUTLINED-TEXT-FIELD') { el.value = s; return; }
  if (el.type === 'checkbox') { el.checked = !!(Number(value) || value === '1' || value === true); return; }
  if (el.type === 'number' || el.type === 'range') el.value = Number.isFinite(n) ? n : el.value;
  else el.value = s;
}

function getControlDisplayValue(el, key) {
  if (key === 'bloomEnabled') {
    if (el.tagName === 'SELECT') return el.options?.[el.selectedIndex]?.text ?? (Number(getControlValue(el, key)) ? 'On' : 'Off');
    return Number(getControlValue(el, key)) ? 'On' : 'Off';
  }
  if (key === 'coreBlendMode' && el.tagName === 'SELECT') return el.options?.[el.selectedIndex]?.text ?? el.value ?? '—';
  if (key === 'backgroundColorHex') {
    const v = getControlValue(el, key);
    return (v != null && String(v).trim() !== '') ? String(v).replace(/^#/, '') : '—';
  }
  if (key === 'particleStartSize' || key === 'particleEndSize' || key === 'starParticleStartSize' || key === 'starParticleEndSize') {
    const v = Number(getControlValue(el, key));
    return v === 0 ? '—' : String(v);
  }
  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'SELECT') return el.options?.[el.selectedIndex]?.text ?? el.value ?? '—';
  return getControlValue(el, key) ?? '—';
}

/** Map step from slider/input to use for stepper buttons (optional). */
function getStepForKey(key) {
  const steps = { coreRadius: 0.01, cameraZ: 0.5, particleCount: 500, bloomRange: 0.1, damping: 0.002, orbitDamping: 0.01, particleStartSize: 0.01, particleEndSize: 0.01, starParticleCount: 1000, starRadius: 0.1, starParticleSize: 0.05, starParticleStartSize: 0.01, starParticleEndSize: 0.01 };
  return steps[key] ?? 0.1;
}

/**
 * @param {HTMLElement} container
 * @param {(opt: Record<string, number | string>) => void} onChange
 * @param {{ getOptions?: () => Record<string, unknown> }} options
 * @returns {{ destroy: () => void, notify: () => void }}
 */
export function createFilterPanel(container, onChange, options = {}) {
  const { getOptions } = options;
  if (!container) return { destroy: () => {}, notify: () => {} };

  const controls = container.querySelectorAll(CONTROL_SELECTOR);
  const labels = new Map();
  container.querySelectorAll('[data-scene3d-label]').forEach((el) => {
    const key = el.getAttribute('data-scene3d-label');
    if (key) labels.set(key, el);
  });

  // Sync all color+hex pairs (Light, Particles, etc.)
  function syncColorPair(container, hexOptKey, options = {}) {
    const { allowEmpty } = options;
    const refs = [];
    container.querySelectorAll(`input[data-scene3d-opt="${hexOptKey}"]`).forEach((hexField) => {
      const row = hexField.closest('.filter-input-row');
      const picker = row && row.querySelector('input[type="color"]');
      const label = row && row.querySelector(`[data-scene3d-label="${hexOptKey}"]`);
      if (!hexField || !picker) return;
      const syncFromPicker = () => {
        hexField.value = picker.value;
        if (label) label.textContent = (picker.value || '').replace(/^#/, '');
        notify();
      };
      const syncFromHex = () => {
        const normalized = normalizeHex(hexField.value);
        if (normalized) {
          hexField.value = normalized;
          picker.value = normalized;
          if (label) label.textContent = normalized.replace(/^#/, '');
        } else if (allowEmpty) {
          hexField.value = '';
          if (label) label.textContent = '—';
        } else {
          if (label) label.textContent = hexField.value.trim().replace(/^#/, '') || '—';
        }
        notify();
      };
      picker.addEventListener('input', syncFromPicker);
      hexField.addEventListener('input', syncFromHex);
      hexField.addEventListener('change', syncFromHex);
      refs.push({ hexInput: hexField, colorInput: picker, syncFromPicker, syncFromHex });
    });
    return refs;
  }
  const colorPairRefs = [
    ...syncColorPair(container, 'particleColorHex'),
    ...syncColorPair(container, 'starParticleColorHex'),
    ...syncColorPair(container, 'fresnelColorHex'),
    ...syncColorPair(container, 'ambientColorHex'),
    ...syncColorPair(container, 'fogColorHex'),
    ...syncColorPair(container, 'backgroundColorHex', { allowEmpty: true }),
  ];

  const getOptionsForPreset = () => {
    if (typeof getOptions !== 'function') return {};
    const opts = getOptions();
    return { ...opts, filterVersion: FILTER_SCHEMA_VERSION };
  };

  const notify = () => {
    const opt = {};
    controls.forEach((el) => {
      const key = el.getAttribute('data-scene3d-opt');
      if (!key) return;
      if (key === 'particleColorPicker' || key === 'starParticleColorPicker' || key === 'ambientColorPicker') return;
      const value = STRING_OPT_KEYS.includes(key) && el.tagName === 'SELECT' ? el.value : getControlValue(el, key);
      opt[key] = value;
      const label = labels.get(key);
      if (label) label.textContent = getControlDisplayValue(el, key);
    });
    if (textureUrlsFromDnd.diffuse) opt.coreTextureUrl = textureUrlsFromDnd.diffuse;
    if (textureUrlsFromDnd.normal) opt.coreNormalMapUrl = textureUrlsFromDnd.normal;
    if (textureUrlsFromDnd.disp) opt.coreDispMapUrl = textureUrlsFromDnd.disp;
    if (textureUrlsFromDnd.spec) opt.coreSpecMapUrl = textureUrlsFromDnd.spec;
    if (textureUrlsFromDnd.ao) opt.coreOccMapUrl = textureUrlsFromDnd.ao;
    onChange(opt);
  };

  const syncSameKey = (sourceEl, value) => {
    const key = sourceEl.getAttribute('data-scene3d-opt');
    if (!key) return;
    const raw = (sourceEl.tagName || '').toUpperCase() === 'MD-SLIDER' ? Number(value) : value;
    container.querySelectorAll(`[data-scene3d-opt="${key}"]`).forEach((other) => {
      if (other === sourceEl) return;
      setControlValue(other, raw);
    });
  };

  let textNotifyTimeout = null;
  const scheduleNotify = () => {
    if (textNotifyTimeout != null) clearTimeout(textNotifyTimeout);
    textNotifyTimeout = setTimeout(() => {
      textNotifyTimeout = null;
      notify();
    }, NOTIFY_DEBOUNCE_MS);
  };
  const controlListeners = [];
  controls.forEach((el) => {
    const key = el.getAttribute('data-scene3d-opt');
    if (!key || key === 'particleColorPicker' || key === 'starParticleColorPicker' || key === 'ambientColorPicker') return;
    const label = labels.get(key);
    const onControlInput = (e) => {
      const val = getControlValue(el, key);
      if (isNumericControl(el)) syncSameKey(el, val);
      if (label) label.textContent = getControlDisplayValue(el, key);
      if (isTextControl(el)) {
        if (e?.type === 'change') {
          if (textNotifyTimeout != null) clearTimeout(textNotifyTimeout);
          textNotifyTimeout = null;
          notify();
        } else scheduleNotify();
      } else notify();
    };
    el.addEventListener('input', onControlInput);
    el.addEventListener('change', onControlInput);
    controlListeners.push({ el, fn: onControlInput });
  });

  // Figma-style number stepper arrows: inject into md-outlined-text-field[type="number"], show on hover
  const numberFields = container.querySelectorAll('md-outlined-text-field[type="number"]');
  numberFields.forEach((field) => {
    if (field.querySelector('.filter-input-arrows')) return;
    const opt = field.getAttribute('data-scene3d-opt');
    const siblingSlider = opt ? container.querySelector(`md-slider[data-scene3d-opt="${opt}"]`) : null;
    const step = () => {
      const raw = field.value;
      const stepAttr = parseFloat(field.getAttribute('step') ?? siblingSlider?.getAttribute('step'));
      const minAttr = field.getAttribute('min') ?? siblingSlider?.getAttribute('min');
      const maxAttr = field.getAttribute('max') ?? siblingSlider?.getAttribute('max');
      const stepVal = Number.isFinite(stepAttr) ? stepAttr : 0.1;
      const minVal = minAttr !== null && minAttr !== '' ? parseFloat(minAttr) : -Infinity;
      const maxVal = maxAttr !== null && maxAttr !== '' ? parseFloat(maxAttr) : Infinity;
      const num = (raw === '' || raw === undefined) ? (minVal !== -Infinity ? minVal : 0) : parseFloat(raw);
      return { num, stepVal, minVal, maxVal };
    };
    const applyAndNotify = (newVal) => {
      setControlValue(field, newVal);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const arrows = document.createElement('span');
    arrows.className = 'filter-input-arrows';
    arrows.setAttribute('slot', 'trailing');
    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'filter-arrow filter-arrow-up';
    btnUp.setAttribute('aria-label', 'Increase');
    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'filter-arrow filter-arrow-down';
    btnDown.setAttribute('aria-label', 'Decrease');
    btnUp.addEventListener('click', (e) => {
      e.preventDefault();
      const { num, stepVal, maxVal } = step();
      const next = Math.min(maxVal, num + stepVal);
      if (next !== num) applyAndNotify(next);
    });
    btnDown.addEventListener('click', (e) => {
      e.preventDefault();
      const { num, stepVal, minVal } = step();
      const next = Math.max(minVal, num - stepVal);
      if (next !== num) applyAndNotify(next);
    });
    arrows.appendChild(btnUp);
    arrows.appendChild(btnDown);
    field.appendChild(arrows);
  });

  const savePresetBtn = container.querySelector('[data-scene3d-preset-save]');
  const onSaveClick = () => {
    try {
      const json = JSON.stringify(getOptionsForPreset(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `alcyone-preset-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (savePresetBtn) { savePresetBtn.textContent = 'Saved'; setTimeout(() => { savePresetBtn.textContent = 'Save'; }, 1500); }
    } catch (e) { console.warn('filter panel: save preset to file', e); }
  };
  if (savePresetBtn) savePresetBtn.addEventListener('click', onSaveClick);

  const syncFromOptions = () => {
    if (typeof getOptions !== 'function') return;
    const opts = getOptions();
    controls.forEach((el) => {
      const key = el.getAttribute('data-scene3d-opt');
      if (!key || key === 'particleColorPicker' || key === 'starParticleColorPicker' || key === 'ambientColorPicker' || !(key in opts)) return;
      const v = opts[key];
      if (v === undefined) return;
      setControlValue(el, v);
      const displayVal = getControlDisplayValue(el, key);
      container.querySelectorAll(`[data-scene3d-label="${key}"]`).forEach((labelEl) => { labelEl.textContent = displayVal; });
    });
    if ('particleColorHex' in opts && opts.particleColorHex) {
      const n = normalizeHex(String(opts.particleColorHex)) || String(opts.particleColorHex).trim();
      if (n) container.querySelectorAll('input[data-scene3d-opt="particleColorPicker"]').forEach((p) => { p.value = n; });
    }
    if ('starParticleColorHex' in opts && opts.starParticleColorHex) {
      const n = normalizeHex(String(opts.starParticleColorHex)) || String(opts.starParticleColorHex).trim();
      if (n) container.querySelectorAll('input[data-scene3d-opt="starParticleColorPicker"]').forEach((p) => { p.value = n; });
    }
    const syncFresnel = container.querySelector('input[data-scene3d-opt="fresnelColorHex"]');
    const syncFresnelPicker = container.querySelector('#fresnel-color-picker');
    if (syncFresnel && 'fresnelColorHex' in opts && opts.fresnelColorHex) {
      const n = normalizeHex(String(opts.fresnelColorHex)) || String(opts.fresnelColorHex).trim();
      if (n) { syncFresnel.value = n; if (syncFresnelPicker) syncFresnelPicker.value = n; }
      container.querySelectorAll('[data-scene3d-label="fresnelColorHex"]').forEach((el) => { el.textContent = (n || '').replace(/^#/, ''); });
    }
    if ('ambientColorHex' in opts && opts.ambientColorHex) {
      const n = normalizeHex(String(opts.ambientColorHex)) || String(opts.ambientColorHex).trim();
      if (n) {
        container.querySelectorAll('input[data-scene3d-opt="ambientColorHex"]').forEach((hexEl) => {
          hexEl.value = n;
          const row = hexEl.closest('.filter-input-row');
          const picker = row && row.querySelector('input[type="color"]');
          if (picker) picker.value = n;
        });
      }
      container.querySelectorAll('[data-scene3d-label="ambientColorHex"]').forEach((el) => { el.textContent = (n || '').replace(/^#/, ''); });
    }
    if ('fogColorHex' in opts && opts.fogColorHex) {
      const n = normalizeHex(String(opts.fogColorHex)) || String(opts.fogColorHex).trim();
      if (n) {
        const fogHexEl = container.querySelector('input[data-scene3d-opt="fogColorHex"]');
        const fogPickerEl = container.querySelector('#fog-color-picker');
        if (fogHexEl) fogHexEl.value = n;
        if (fogPickerEl) fogPickerEl.value = n;
      }
      container.querySelectorAll('[data-scene3d-label="fogColorHex"]').forEach((el) => { el.textContent = (String(opts.fogColorHex || '').replace(/^#/, '') || ''); });
    }
    if ('backgroundColorHex' in opts) {
      const v = opts.backgroundColorHex && normalizeHex(String(opts.backgroundColorHex)) ? String(opts.backgroundColorHex).trim() : '';
      const bgHexEl = container.querySelector('input[data-scene3d-opt="backgroundColorHex"]');
      const bgPickerEl = container.querySelector('#bg-color-picker');
      const bgLabelEl = container.querySelector('#bg-color-label');
      if (bgHexEl) bgHexEl.value = v;
      if (bgPickerEl) bgPickerEl.value = v || '';
      if (bgLabelEl) bgLabelEl.textContent = v ? v.replace(/^#/, '') : '—';
    }
    if ('coreTextureUrl' in opts && opts.coreTextureUrl && typeof opts.coreTextureUrl === 'string') {
      textureUrlsFromDnd.diffuse = opts.coreTextureUrl;
      textureFileNamesFromDnd.diffuse = opts.coreTextureUrl.split(/[/\\]/).pop() || '';
    }
    if ('coreNormalMapUrl' in opts && opts.coreNormalMapUrl && typeof opts.coreNormalMapUrl === 'string') {
      textureUrlsFromDnd.normal = opts.coreNormalMapUrl;
      textureFileNamesFromDnd.normal = opts.coreNormalMapUrl.split(/[/\\]/).pop() || '';
    }
    if ('coreDispMapUrl' in opts && opts.coreDispMapUrl && typeof opts.coreDispMapUrl === 'string') {
      textureUrlsFromDnd.disp = opts.coreDispMapUrl;
      textureFileNamesFromDnd.disp = opts.coreDispMapUrl.split(/[/\\]/).pop() || '';
    }
    if ('coreSpecMapUrl' in opts && opts.coreSpecMapUrl && typeof opts.coreSpecMapUrl === 'string') {
      textureUrlsFromDnd.spec = opts.coreSpecMapUrl;
      textureFileNamesFromDnd.spec = opts.coreSpecMapUrl.split(/[/\\]/).pop() || '';
    }
    if ('coreOccMapUrl' in opts && opts.coreOccMapUrl && typeof opts.coreOccMapUrl === 'string') {
      textureUrlsFromDnd.ao = opts.coreOccMapUrl;
      textureFileNamesFromDnd.ao = opts.coreOccMapUrl.split(/[/\\]/).pop() || '';
    }
    updateDndLabel();
  };

  const loadPresetFromJSON = (json) => {
    try {
      const data = JSON.parse(json);
      if (data && typeof data === 'object') {
        const migrated = migratePreset(data);
        onChange(migrated);
        setTimeout(syncFromOptions, 0);
        return true;
      }
    } catch (e) { console.warn('filter panel: load preset from JSON', e); }
    return false;
  };

  const presetFileInput = container.querySelector('#preset-file-input');
  const presetDndZone = container.querySelector('#preset-dnd-zone');
  const presetDndLabel = container.querySelector('#preset-dnd-label');
  const loadPresetBtn = container.querySelector('[data-scene3d-preset-load]');

  const onPresetFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = loadPresetFromJSON(reader.result);
      if (presetDndLabel) {
        presetDndLabel.textContent = ok ? `Loaded: ${file.name}` : 'JSON error';
        setTimeout(() => { if (presetDndLabel) presetDndLabel.textContent = 'Drop preset .json here'; }, 2500);
      }
      if (loadPresetBtn) {
        loadPresetBtn.textContent = ok ? 'Loaded' : 'Error';
        setTimeout(() => { if (loadPresetBtn) loadPresetBtn.textContent = 'Load'; }, 1500);
      }
    };
    reader.readAsText(file);
  };

  const onLoadClick = () => { presetFileInput?.click(); };
  if (loadPresetBtn) loadPresetBtn.addEventListener('click', onLoadClick);
  const onPresetFileChange = () => { onPresetFile(presetFileInput?.files?.[0]); if (presetFileInput) presetFileInput.value = ''; };
  if (presetFileInput) presetFileInput.addEventListener('change', onPresetFileChange);

  const onPresetDndDragover = (e) => { e.preventDefault(); presetDndZone?.classList.add('dnd-over'); };
  const onPresetDndDragleave = () => { presetDndZone?.classList.remove('dnd-over'); };
  const onPresetDndDrop = (e) => {
    e.preventDefault();
    presetDndZone?.classList.remove('dnd-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) onPresetFile(file);
  };
  const onPresetDndClick = () => { presetFileInput?.click(); };
  if (presetDndZone) {
    presetDndZone.addEventListener('dragover', onPresetDndDragover);
    presetDndZone.addEventListener('dragleave', onPresetDndDragleave);
    presetDndZone.addEventListener('drop', onPresetDndDrop);
    presetDndZone.addEventListener('click', onPresetDndClick);
  }

  const resetPresetBtn = container.querySelector('[data-scene3d-preset-reset]');
  const onResetClick = () => {
    const defaults = applyScene3DParams(getDefaultScene3DParams());
    onChange(defaults);
    setTimeout(syncFromOptions, 0);
    if (resetPresetBtn) { resetPresetBtn.textContent = 'Done'; setTimeout(() => { resetPresetBtn.textContent = 'Reset'; }, 1200); }
  };
  if (resetPresetBtn) resetPresetBtn.addEventListener('click', onResetClick);

  const versionEl = container.querySelector('[data-filter-version]');
  if (versionEl) versionEl.textContent = 'v' + FILTER_SCHEMA_VERSION;

  const tabClickHandler = () => {
    setTimeout(syncFromOptions, 120);
  };
  const tabRefs = [];
  container.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', tabClickHandler);
    tabRefs.push({ tab, fn: tabClickHandler });
  });

  const dndZone = container.querySelector('#core-texture-dnd');
  const fileInput = container.querySelector('#core-texture-file');
  const dndLabel = container.querySelector('#core-texture-dnd-label');
  const textureSlotNames = { diffuse: 'Color', normal: 'Norm', disp: 'Disp', spec: 'Spec', ao: 'Occ' };
  const textureSlotOrder = ['diffuse', 'normal', 'disp', 'ao', 'spec'];
  let textureUrlsFromDnd = { diffuse: '', normal: '', disp: '', spec: '', ao: '' };
  let textureFileNamesFromDnd = { diffuse: '', normal: '', disp: '', spec: '', ao: '' };

  function revokeBlobIfAny(value) {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      try { URL.revokeObjectURL(value); } catch (e) { console.warn('filter panel: revoke blob URL', e); }
    }
  }

  function detectTextureSlot(filename) {
    const n = (filename || '').toLowerCase();
    if (/color|diffuse|_c\.|_d\.(?!isp)/.test(n) || /_color\.|color\./.test(n)) return 'diffuse';
    if (/norm|normal|nrm|_n\./.test(n)) return 'normal';
    if (/disp|displacement|_disp\./.test(n)) return 'disp';
    if (/spec|specular|_spec\./.test(n)) return 'spec';
    if (/occ|ao|ambient|_occ\.|_ao\./.test(n)) return 'ao';
    return 'diffuse';
  }

  function updateDndLabel() {
    if (!dndLabel) return;
    const parts = textureSlotOrder.map((key) => {
      const label = textureSlotNames[key];
      const name = textureFileNamesFromDnd[key];
      return name ? `${label}: ${name}` : null;
    }).filter(Boolean);
    const defaultText = 'Drag ' + textureSlotOrder.map((k) => textureSlotNames[k]).join(' · ');
    dndLabel.textContent = parts.length ? parts.join(' · ') : defaultText;
  }

  function assignFileToSlot(file, slot) {
    revokeBlobIfAny(textureUrlsFromDnd[slot]);
    textureUrlsFromDnd[slot] = URL.createObjectURL(file);
    textureFileNamesFromDnd[slot] = file.name || 'file';
    updateDndLabel();
    notify();
  }

  function onFiles(files) {
    if (!files || !files.length) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type || !f.type.startsWith('image/')) continue;
      const slot = detectTextureSlot(f.name);
      assignFileToSlot(f, slot);
    }
  }

  const onDndDragover = (e) => { e.preventDefault(); dndZone?.classList.add('dnd-over'); };
  const onDndDragleave = () => { dndZone?.classList.remove('dnd-over'); };
  const onDndDrop = (e) => { e.preventDefault(); dndZone?.classList.remove('dnd-over'); onFiles(e.dataTransfer?.files); };
  const onDndClick = () => { fileInput?.click(); };
  const onDndKeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); } };
  const onFileChange = () => { onFiles(fileInput?.files); if (fileInput) fileInput.value = ''; };
  if (dndZone) {
    dndZone.addEventListener('dragover', onDndDragover);
    dndZone.addEventListener('dragleave', onDndDragleave);
    dndZone.addEventListener('drop', onDndDrop);
    dndZone.addEventListener('click', onDndClick);
    dndZone.addEventListener('keydown', onDndKeydown);
  }
  if (fileInput) fileInput.addEventListener('change', onFileChange);

  const stepperRefs = [];
  container.querySelectorAll('md-outlined-text-field[data-scene3d-opt]').forEach((field) => {
    const input = field.querySelector('input');
    if (!input || input.type !== 'number') return;
    const key = field.getAttribute('data-scene3d-opt');
    if (!key || STRING_OPT_KEYS.includes(key)) return;
    const wrap = document.createElement('div');
    wrap.className = 'filter-stepper';
    field.parentNode?.insertBefore(wrap, field);
    wrap.appendChild(field);
    const btnMin = document.createElement('button');
    btnMin.type = 'button';
    btnMin.className = 'filter-stepper-btn';
    btnMin.setAttribute('aria-label', 'Decrease');
    btnMin.textContent = '−';
    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'filter-stepper-btn';
    btnPlus.setAttribute('aria-label', 'Increase');
    btnPlus.textContent = '+';
    wrap.insertBefore(btnMin, field);
    wrap.appendChild(btnPlus);
    const applyDelta = (delta) => {
      const min = input.getAttribute('min');
      const max = input.getAttribute('max');
      const step = Number(input.getAttribute('step')) || getStepForKey(key) || 0.1;
      let v = Number(field.value);
      if (Number.isNaN(v)) v = 0;
      v += delta * step;
      if (min !== null && min !== '') v = Math.max(Number(min), v);
      if (max !== null && max !== '') v = Math.min(Number(max), v);
      field.value = String(v);
      syncSameKey(field, v);
      const label = labels.get(key);
      if (label) label.textContent = getControlDisplayValue(field, key);
      notify();
    };
    const handlerMin = () => applyDelta(-1);
    const handlerPlus = () => applyDelta(1);
    btnMin.addEventListener('click', handlerMin);
    btnPlus.addEventListener('click', handlerPlus);
    stepperRefs.push({ btnMin, btnPlus, handlerMin, handlerPlus });
  });

  syncFromOptions();
  setTimeout(syncFromOptions, 150);
  notify();
  return {
    destroy() {
      stepperRefs.forEach(({ btnMin, btnPlus, handlerMin, handlerPlus }) => {
        btnMin.removeEventListener('click', handlerMin);
        btnPlus.removeEventListener('click', handlerPlus);
      });
      if (textNotifyTimeout != null) clearTimeout(textNotifyTimeout);
      textNotifyTimeout = null;
      Object.values(textureUrlsFromDnd).forEach(revokeBlobIfAny);
      controlListeners.forEach(({ el, fn }) => {
        el.removeEventListener('input', fn);
        el.removeEventListener('change', fn);
      });
      colorPairRefs.forEach(({ hexInput, colorInput, syncFromPicker, syncFromHex }) => {
        if (colorInput) colorInput.removeEventListener('input', syncFromPicker);
        if (hexInput) {
          hexInput.removeEventListener('input', syncFromHex);
          hexInput.removeEventListener('change', syncFromHex);
        }
      });
      if (savePresetBtn) savePresetBtn.removeEventListener('click', onSaveClick);
      if (loadPresetBtn) loadPresetBtn.removeEventListener('click', onLoadClick);
      if (resetPresetBtn) resetPresetBtn.removeEventListener('click', onResetClick);
      if (presetFileInput) presetFileInput.removeEventListener('change', onPresetFileChange);
      if (presetDndZone) {
        presetDndZone.removeEventListener('dragover', onPresetDndDragover);
        presetDndZone.removeEventListener('dragleave', onPresetDndDragleave);
        presetDndZone.removeEventListener('drop', onPresetDndDrop);
        presetDndZone.removeEventListener('click', onPresetDndClick);
      }
      if (dndZone) {
        dndZone.removeEventListener('dragover', onDndDragover);
        dndZone.removeEventListener('dragleave', onDndDragleave);
        dndZone.removeEventListener('drop', onDndDrop);
        dndZone.removeEventListener('click', onDndClick);
        dndZone.removeEventListener('keydown', onDndKeydown);
      }
      if (fileInput) fileInput.removeEventListener('change', onFileChange);
      tabRefs.forEach(({ tab, fn }) => tab.removeEventListener('click', fn));
    },
    notify,
    syncFromOptions,
  };
}
