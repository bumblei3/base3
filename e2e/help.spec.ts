import { test, expect } from '@playwright/test';

/**
 * Tests the Help overlay (opened via the "?" key or help button).
 */
test.describe('Help Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('"?" key opens the help overlay with shortcuts', async ({ page }) => {
    await page.keyboard.press('?');
    const overlay = page.locator('#help-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Tastenkürzel');
    await expect(overlay).toContainText('Rückgängig');
  });

  test('Escape closes the help overlay', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('#help-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#help-overlay')).toBeHidden();
  });

  test('close button hides the help overlay', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('#help-overlay')).toBeVisible();
    await page.locator('#close-help-btn').click();
    await expect(page.locator('#help-overlay')).toBeHidden();
  });
});
