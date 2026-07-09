import { test, expect } from '@playwright/test';

/**
 * E2E for self-contained error-log export (P0.1 observability, no Sentry).
 * Verifies the Settings-panel controls record, download, and clear the
 * in-memory error buffer.
 */
test.describe('Error Log Export (self-contained observability) @p0_1', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ki_mentor_level', 'OFF');
      localStorage.setItem('disable_animations', 'true');
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('records a runtime error and downloads the log as .txt', async ({ page }) => {
    // Enter a game so the Settings panel is reachable.
    await page.click('.gamemode-card[data-mode="classic"]');
    await expect(page.locator('#board')).toBeVisible();
    await page.waitForFunction(() => (window as any).game?.phase === 'PLAY', { timeout: 10000 });

    // Dispatch a real global error so the ErrorManager ring buffer records it.
    await page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent('error', { message: 'e2e boom', error: new Error('e2e boom') })
      );
    });

    // Open settings
    await page.click('#menu-btn');
    await page.click('[data-tab="settings"]');
    await expect(page.locator('#view-settings')).toBeVisible();

    // Capture the downloaded .txt blob (clipboard is unavailable in headless).
    await page.evaluate(() => {
      (window as any).__downloaded = '';
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = (blob: Blob) => {
        void blob.text().then((t) => ((window as any).__downloaded = t));
        return origCreate.call(URL, blob);
      };
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        if (this.download) return; // swallow the download click
        return origClick.apply(this, arguments as any);
      };
    });

    await page.click('#download-log-btn');

    await page.waitForFunction(
      () =>
        typeof (window as any).__downloaded === 'string' &&
        (window as any).__downloaded.includes('e2e boom'),
      undefined,
      { timeout: 5000 }
    );
    const dump = await page.evaluate(() => (window as any).__downloaded);
    expect(dump).toContain('[error]');
    expect(dump).toContain('e2e boom');
  });

  test('clear button empties the log and updates status', async ({ page }) => {
    await page.click('.gamemode-card[data-mode="classic"]');
    await expect(page.locator('#board')).toBeVisible();
    await page.waitForFunction(() => (window as any).game?.phase === 'PLAY', { timeout: 10000 });

    await page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent('error', { message: 'clear me', error: new Error('clear me') })
      );
    });

    await page.click('#menu-btn');
    await page.click('[data-tab="settings"]');
    await expect(page.locator('#view-settings')).toBeVisible();

    await page.click('#clear-log-btn');
    await expect(page.locator('#log-export-status')).toContainText('geleert');
  });
});
