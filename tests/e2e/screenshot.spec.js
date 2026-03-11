/**
 * E2E: opens page and takes screenshot.
 * Run: npm run build && npx playwright test
 * Screenshots on failure — test-results/; toHaveScreenshot baseline — tests/screenshots/.
 */

import { test, expect } from '@playwright/test';

test.describe('Alcyone layout', () => {
  test('main page renders and screenshot can be taken', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.alcyone-overlay')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.alcyone-title')).toContainText('Alcyone');
    await expect(page).toHaveScreenshot('alcyone-home.png', { maxDiffPixels: 500 });
  });

  test('left container has content width', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.alcyone-left')).toBeVisible({ timeout: 15000 });
    const box = await page.locator('.alcyone-left').boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(0);
  });

  test('three cards are present', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('article.alcyone-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    await expect(cards).toHaveCount(3);
  });
});
