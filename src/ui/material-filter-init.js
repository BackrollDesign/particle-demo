/**
 * Material Web components: lazy-loaded when filter panel first becomes visible.
 * Registers <md-slider> and <md-outlined-text-field> custom elements.
 */
let _loaded = false;

export function ensureMaterialLoaded() {
  if (_loaded) return;
  _loaded = true;
  import('@material/web/slider/slider.js');
  import('@material/web/textfield/outlined-text-field.js');
}
