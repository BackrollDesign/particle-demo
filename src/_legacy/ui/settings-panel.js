/**
 * Settings panel: bind all data-star-opt controls to scene (TouchDesigner-style).
 */

const CONTAINER_SELECTOR = '[data-star-settings]';

/**
 * @param {HTMLElement} container
 * @param {(opt: Record<string, number>) => void} onChange
 * @returns {{ destroy: () => void }}
 */
export function createSettingsPanel(container, onChange) {
  if (!container) return { destroy: () => {} };

  const inputs = container.querySelectorAll('input[data-star-opt]');
  const labels = new Map();
  container.querySelectorAll('[data-star-label]').forEach((el) => {
    const key = el.getAttribute('data-star-label');
    if (key) labels.set(key, el);
  });

  const notify = () => {
    const opt = {};
    inputs.forEach((input) => {
      const key = input.getAttribute('data-star-opt');
      if (!key) return;
      const num = input.type === 'range' ? Number(input.value) : Number(input.value);
      if (key in opt) return;
      opt[key] = num;
      const label = labels.get(key);
      if (label) label.textContent = input.value;
    });
    onChange(opt);
  };

  const listeners = [];
  inputs.forEach((input) => {
    const key = input.getAttribute('data-star-opt');
    if (!key) return;
    const label = labels.get(key);
    const handler = () => {
      if (label) label.textContent = input.value;
      notify();
    };
    input.addEventListener('input', handler);
    listeners.push({ input, handler });
  });

  notify();
  return {
    destroy() {
      listeners.forEach(({ input, handler }) => input.removeEventListener('input', handler));
    },
  };
}
