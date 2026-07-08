import { test, expect, type Page } from '@playwright/test';

/**
 * Verifies the in-game language switcher updates the UI locale.
 * The status pill (data-testid="status-display") uses t('game.*') which
 * should switch between German and English when the select changes.
 */
test.describe('i18n language switcher', () => {
  test('switches UI language via settings select', async ({ page }: { page: Page }) => {
    await page.goto('/');
    // Open main menu (if not already open on landing) and go to settings.
    const menuBtn = page.locator('#menu-btn');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }
    // The landing screen may show the menu directly; ensure settings tab open.
    const settingsTab = page.locator('[data-tab="settings"]');
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }
    const langSelect = page.locator('#language-select');
    await expect(langSelect).toBeVisible();

    // Default is German.
    await expect(langSelect).toHaveValue('de');

    // Switch to English and confirm the <html lang> updates.
    await langSelect.selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Switch back to German.
    await langSelect.selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });
});
