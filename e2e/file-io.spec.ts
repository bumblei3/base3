import { test, expect } from '@playwright/test';

/**
 * E2E smoke for P1.3 file I/O: FEN load + PGN export.
 * Save/Load round-trip is already covered by e2e/persistence.spec.ts.
 */
test.describe('File I/O (FEN / PGN) @p1_3', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ki_mentor_level', 'OFF');
      localStorage.setItem('disable_animations', 'true');
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('FEN load via settings panel replaces the board', async ({ page }) => {
    // Start a classic game
    await page.click('.gamemode-card[data-mode="classic"]');
    await expect(page.locator('#board')).toBeVisible();
    await page.waitForFunction(() => (window as any).game?.phase === 'PLAY', { timeout: 10000 });

    // Open settings
    await page.click('#menu-btn');
    await page.click('[data-tab="settings"]');

    // Stub window.prompt to return a known FEN (empty board, white to move)
    await page.evaluate(() => {
      (window as any).prompt = () => '8/8/8/8/8/8/8/8/RNBQKEACR w - - 0 1';
    });

    await page.click('#import-fen-btn');

    // Board should now reflect the loaded FEN: only the last rank is populated
    const pieceCount = await page.evaluate(() => document.querySelectorAll('.piece-svg').length);
    expect(pieceCount).toBe(9); // 9 pieces on the back rank only

    // Side to move should be white (no black pieces)
    const blackCount = await page.evaluate(
      () => document.querySelectorAll('.piece-svg.black, .piece.black').length
    );
    expect(blackCount).toBe(0);
  });

  test('PGN export downloads a file', async ({ page }) => {
    await page.click('.gamemode-card[data-mode="classic"]');
    await expect(page.locator('#board')).toBeVisible();
    await page.waitForFunction(() => (window as any).game?.phase === 'PLAY', { timeout: 10000 });

    // Stub download + save dialog. Force clipboard write to fail so the app
    // falls back to a download (deterministic path for this test), then capture
    // the downloaded blob text. Note: navigator.clipboard is a read-only getter,
    // so we override the writeText *method* (which is writable), not the object.
    await page.evaluate(() => {
      (window as any).__downloaded = '';
      // Clipboard write is unavailable in headless context — force the download fallback.
      (navigator as any).clipboard.writeText = () => Promise.reject(new Error('no clipboard'));
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

    await page.click('#menu-btn');
    await page.click('[data-tab="settings"]');
    await page.click('#export-pgn-btn');

    // The download is captured asynchronously: URL.createObjectURL is stubbed to
    // read blob.text() (a Promise), so __downloaded is populated on a later microtask.
    // Wait for it instead of reading synchronously to avoid a flaky empty read.
    await page.waitForFunction(
      () => typeof (window as any).__downloaded === 'string' && (window as any).__downloaded.includes('[Event'),
      undefined,
      { timeout: 5000 }
    );
    const pgn = await page.evaluate(() => (window as any).__downloaded);
    expect(pgn).toContain('[Event');
    expect(pgn).toContain('[Variant "9x9"]');
  });
});
