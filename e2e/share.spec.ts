import { test, expect } from '@playwright/test';

/**
 * Tests the Share / Copy-position feature (Phase 8.2).
 * Verifies the share button copies a FEN+PGN payload to the clipboard.
 */
test.describe('Share / Copy Position', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('share button copies FEN to clipboard and shows a toast', async ({ page }) => {
    // Start a classic game via the main menu card
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]').first();
    let started = false;
    for (let attempt = 0; attempt < 3 && !started; attempt++) {
      await classicCard.click({ force: true });
      try {
        await page.waitForSelector('#board', { state: 'visible', timeout: 5000 });
        started = true;
      } catch {
        // retry if the menu animation swallowed the click
      }
    }
    await expect(page.locator('#board')).toBeVisible();

    // Click the share button
    const shareBtn = page.locator('#share-btn');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // A confirmation toast should appear
    await expect(page.locator('text=Stellung kopiert')).toBeVisible({ timeout: 5000 });

    // Clipboard should contain a valid FEN (board + side to move)
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('FEN:');
    const fenLine = clip.split('\n').find(l => l.startsWith('FEN:'));
    expect(fenLine).toBeTruthy();
    // 9x9 starting position has 9 ranks
    const fen = fenLine!.replace('FEN:', '').trim();
    expect(fen.split(' ')[0].split('/').length).toBe(9);
  });
});
