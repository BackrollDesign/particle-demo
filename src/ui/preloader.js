/**
 * Preloader: show until page and WebGL are ready.
 * Spec: §3.7, §2.3 I3
 */

const SELECTOR = '[data-star-preloader]';

/**
 * @param {string} [selector]
 * @returns {HTMLElement | null}
 */
export function getPreloaderElement(selector = SELECTOR) {
  return document.querySelector(selector);
}

/**
 * Hide preloader (call after window.load and WebGL init).
 * @param {string} [selector]
 */
export function hidePreloader(selector = SELECTOR) {
  const el = getPreloaderElement(selector);
  if (el) {
    el.classList.add('star-preloader--hidden');
    el.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Show preloader.
 * @param {string} [selector]
 */
export function showPreloader(selector = SELECTOR) {
  const el = getPreloaderElement(selector);
  if (el) {
    el.classList.remove('star-preloader--hidden');
    el.setAttribute('aria-hidden', 'false');
  }
}
