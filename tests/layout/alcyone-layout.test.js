/**
 * Layout tests: Alcyone overlay structure (Figma 30-643).
 * Asserts presence and hierarchy of main blocks so regressions are caught.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, '../../index.html');

function loadHtml() {
  const fullPath = path.resolve(htmlPath);
  if (!fs.existsSync(fullPath)) throw new Error(`index.html not found: ${fullPath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Alcyone layout (Figma 30-643)', () => {
  let html;

  beforeAll(() => {
    html = loadHtml();
  });

  describe('overlay structure', () => {
    it('has .alcyone-overlay', () => {
      expect(html).toMatch(/class="[^"]*alcyone-overlay[^"]*"/);
    });

    it('has .alcyone-main inside overlay', () => {
      expect(html).toMatch(/alcyone-overlay[\s\S]*?alcyone-main/);
    });

    it('has .alcyone-left (first container = content)', () => {
      expect(html).toMatch(/class="[^"]*alcyone-left[^"]*"/);
    });

    it('has .alcyone-cards after .alcyone-left', () => {
      const leftIdx = html.indexOf('alcyone-left');
      const cardsIdx = html.indexOf('alcyone-cards');
      expect(leftIdx).toBeGreaterThan(-1);
      expect(cardsIdx).toBeGreaterThan(leftIdx);
    });

    it('has .alcyone-header-row inside .alcyone-left', () => {
      const leftStart = html.indexOf('alcyone-left');
      const leftEnd = html.indexOf('</div>', html.indexOf('</div>', leftStart) + 1);
      const slice = html.slice(leftStart, leftEnd);
      expect(slice).toMatch(/alcyone-header-row/);
    });

    it('has .alcyone-txt (Alcyone block) inside .alcyone-left', () => {
      expect(html).toMatch(/alcyone-txt/);
    });

    it('has theme switcher with id', () => {
      expect(html).toMatch(/id="theme-switcher"/);
    });
  });

  describe('cards', () => {
    it('has exactly 3 card articles', () => {
      const matches = html.match(/class="alcyone-card"/g) || [];
      expect(matches.length).toBe(3);
    });

    it('each card has .alcyone-card-body', () => {
      const sections = html.split(/<article[^>]*class="alcyone-card"/);
      expect(sections.length).toBe(4);
      sections.slice(1).forEach((section) => {
        expect(section).toContain('alcyone-card-body');
      });
    });

    it('cards have titles (Resources, Edpolicy, Section 3)', () => {
      expect(html).toContain('Ресурсы');
      expect(html).toContain('Редполитика');
      expect(html).toContain('Раздел 3');
    });
  });

  describe('first container = content width (CSS)', () => {
    it('left container has fit-content or max-content', () => {
      expect(html).toMatch(/width:\s*(fit-content|max-content)/);
    });

    it('left container has max-width: 100% for responsive', () => {
      expect(html).toMatch(/max-width:\s*100%/);
    });

    it('uses clamp for responsive padding', () => {
      expect(html).toMatch(/clamp\(/);
    });
  });

  describe('accessibility', () => {
    it('has main canvas for hero', () => {
      expect(html).toMatch(/data-star-view="hero"/);
      expect(html).toMatch(/id="star-canvas"/);
    });

    it('theme switcher has aria-label', () => {
      expect(html).toMatch(/theme-switcher[^>]*aria-label/);
    });
  });
});
