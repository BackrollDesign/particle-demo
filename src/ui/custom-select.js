/**
 * Upgrades native <select> elements to custom dropdown components.
 * Preserves data-scene3d-opt attribute and dispatches change/input events.
 */
const ARROW_SVG = '<svg viewBox="0 0 8 5" fill="none" class="filter-select-arrow"><path d="M0.5 0.5L4 4L7.5 0.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function upgradeSelects(container) {
  if (!container) return;
  const selects = container.querySelectorAll('select[data-scene3d-opt]');
  selects.forEach(upgradeSelect);
  document.addEventListener('click', (e) => {
    container.querySelectorAll('.filter-select.open').forEach((el) => {
      if (!el.contains(e.target)) el.classList.remove('open');
    });
  });
}

function upgradeSelect(select) {
  const key = select.getAttribute('data-scene3d-opt');
  const wrap = document.createElement('div');
  wrap.className = 'filter-select';
  wrap.setAttribute('data-scene3d-opt-wrap', key);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'filter-select-trigger';
  const valSpan = document.createElement('span');
  valSpan.className = 'filter-select-value';
  trigger.appendChild(valSpan);
  trigger.insertAdjacentHTML('beforeend', ARROW_SVG);

  const menu = document.createElement('div');
  menu.className = 'filter-select-menu';

  Array.from(select.options).forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'filter-select-item';
    item.textContent = opt.textContent;
    item.dataset.value = opt.value;
    if (opt.selected) item.classList.add('selected');
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      select.value = opt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      syncDisplay(wrap, select);
      wrap.classList.remove('open');
    });
    menu.appendChild(item);
  });

  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  select.parentNode.insertBefore(wrap, select);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = wrap.classList.contains('open');
    wrap.closest('[data-scene3d-filter]')?.querySelectorAll('.filter-select.open').forEach((el) => {
      if (el !== wrap) el.classList.remove('open');
    });
    wrap.classList.toggle('open', !wasOpen);
  });

  syncDisplay(wrap, select);

  const observer = new MutationObserver(() => syncDisplay(wrap, select));
  observer.observe(select, { attributes: true, childList: true, subtree: true });
  select.addEventListener('change', () => syncDisplay(wrap, select));
}

function syncDisplay(wrap, select) {
  const valSpan = wrap.querySelector('.filter-select-value');
  const selectedOpt = select.options[select.selectedIndex];
  if (valSpan && selectedOpt) valSpan.textContent = selectedOpt.textContent;
  wrap.querySelectorAll('.filter-select-item').forEach((item) => {
    item.classList.toggle('selected', item.dataset.value === select.value);
  });
}
