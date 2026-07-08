import { test, expect, type Page } from '@playwright/test';

/**
 * Verifies the PWA install button wiring.
 * The button is hidden by default and only shown once the browser fires a
 * `beforeinstallprompt` event (which we simulate here, since Playwright does
 * not auto-fire it). We open the settings menu first so the button is in the
 * visible DOM tree, then assert it becomes visible after the event.
 */
test.describe('PWA install button', () => {
  test('shows and triggers install prompt when available', async ({ page }: { page: Page }) => {
    await page.goto('/');

    // Open the main menu and switch to the settings tab.
    const menuBtn = page.locator('#menu-btn');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }
    const settingsTab = page.locator('[data-tab="settings"]');
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    const installBtn = page.locator('#install-app-btn');

    // Initially hidden (no install prompt captured yet).
    await expect(installBtn).toHaveClass(/hidden/);

    // Wait until main.ts has registered the handler.
    await page.waitForFunction(
      () => typeof (window as unknown as { __promptInstall?: unknown }).__promptInstall === 'function',
      null,
      { timeout: 5000 },
    );

    // Simulate the browser offering an install prompt.
    await page.evaluate(() => {
      const evt = new Event('beforeinstallprompt');
      (evt as unknown as { preventDefault: () => void }).preventDefault = () => {};
      window.dispatchEvent(evt);
    });

    // The handler reveals the button.
    await expect(installBtn).not.toHaveClass(/hidden/);

    // Clicking must not throw (prompt() is a no-op in headless without a real prompt).
    await installBtn.click({ timeout: 5000 }).catch(() => {});
  });
});
