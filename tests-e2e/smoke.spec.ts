import { test, expect } from '@playwright/test';

test.describe('TriSchach Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('disable_animations', 'true');
    });
  });

  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/trischach/index.trischach.html', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check no critical JS errors (ignore font/asset 404s)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('sourcemap') &&
        !e.includes('DevTools') &&
        !e.includes('404') &&
        !e.includes('net::ERR_ABORTED'),
    );
    expect(criticalErrors).toEqual([]);
  });

  test('board SVG is rendered', async ({ page }) => {
    await page.goto('/trischach/index.trischach.html', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if board-svg exists
    const boardExists = await page.evaluate(() => !!document.getElementById('board-svg'));
    expect(boardExists).toBe(true);
  });

  test('pieces are rendered', async ({ page }) => {
    await page.goto('/trischach/index.trischach.html', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const pieceCount = await page.evaluate(
      () => document.querySelectorAll('#board-svg .piece, .piece').length,
    );
    expect(pieceCount).toBeGreaterThan(0);
  });
});
