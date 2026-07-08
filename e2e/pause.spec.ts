import { test, expect } from '@playwright/test';

/**
 * Tests the Pause overlay (toggled via the "P" key or resume button).
 * Note: pause only blocks input while the overlay is open; game state is
 * unaffected (the AI does not pause). See FUTURE_PLAN P0.2.
 */
test.describe('Pause Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('"P" key opens the pause overlay', async ({ page }) => {
    await page.keyboard.press('p');
    const overlay = page.locator('#pause-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('pausiert');
  });

  test('"P" key toggles the pause overlay off', async ({ page }) => {
    await page.keyboard.press('p');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await page.keyboard.press('p');
    await expect(page.locator('#pause-overlay')).toBeHidden();
  });

  test('Escape closes the pause overlay', async ({ page }) => {
    await page.keyboard.press('p');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-overlay')).toBeHidden();
  });

  test('resume button hides the pause overlay', async ({ page }) => {
    await page.keyboard.press('p');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await page.locator('#resume-game-btn-pause').click();
    await expect(page.locator('#pause-overlay')).toBeHidden();
  });
});
