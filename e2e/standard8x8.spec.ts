import { test, expect } from '@playwright/test';

test.describe('Standard 8x8 Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('ki_mentor_level', 'OFF');
      localStorage.setItem('disable_animations', 'true');
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('should start standard 8x8 chess', async ({ page }) => {
    // Click "Standard (8x8)" card
    const standardCard = page.locator('.gamemode-card[data-mode="standard8x8"]');

    await standardCard.click();

    const mainMenu = page.locator('#main-menu');
    await expect(mainMenu).not.toHaveClass(/active/);
    // await expect(mainMenu).not.toBeVisible(); // Flaky due to opacity < 0.01 but > 0
    await expect(mainMenu).toHaveCSS('pointer-events', 'none');

    // Check 8x8 grid
    const cells = page.locator('.cell');
    await expect(cells).toHaveCount(64); // 8x8

    // Check board setup
    // White King at 7,4 (standard chess e1 is 7,4 index)
    await expect(page.locator('.cell[data-r="7"][data-c="4"]')).toHaveAttribute('data-piece', 'k');
  });

  test('should start 8x8 with upgrades if configured', async ({ page }) => {
    // Logic for 8x8 with points might be triggered differently, e.g. a different card
    // or button. If not exposed in UI yet, we can simulate via console.

    await page.evaluate(async () => {
      // @ts-ignore
      await window.app.init(5, 'standard8x8');
    });

    const mainMenu = page.locator('#main-menu');
    await expect(page.locator('body')).toHaveClass(/game-initialized/);
    await expect(mainMenu).not.toHaveClass(/active/);
    await expect(mainMenu).toHaveCSS('pointer-events', 'none');

    // Should be in Setup Phase (Upgrades)
    // Check for Shop Panel
    await expect(page.locator('#shop-panel')).toBeVisible();

    // Points display should show 5
    await expect(page.locator('#points-display')).toContainText('5');
  });

  test('should play a real move and the AI responds (critical journey)', async ({ page }) => {
    await page.locator('.gamemode-card[data-mode="standard8x8"]').click();
    await expect(page.locator('.cell')).toHaveCount(64);
    await page.waitForFunction(() => (window as any).game?.phase === 'PLAY', { timeout: 10000 });

    // White pawn e2 (row 6, col 4) -> e4 (row 4, col 4)
    await page.locator('.cell[data-r="6"][data-c="4"]').click();
    await page.waitForTimeout(200);
    const validMoves = page.locator('.cell.valid-move');
    expect(await validMoves.count()).toBeGreaterThan(0);
    await page.locator('.cell[data-r="4"][data-c="4"]').click();

    // Wait for the AI (black) to respond — moveHistory should reach length 2.
    await page.waitForFunction(
      () => (window as any).game?.moveHistory && (window as any).game.moveHistory.length >= 2,
      { timeout: 15000 }
    );

    // The pawn should now sit on e4 and the move should be recorded.
    await expect(page.locator('.cell[data-r="4"][data-c="4"]')).toHaveAttribute('data-piece', 'p');
    const historyLen = await page.evaluate(() => (window as any).game.moveHistory.length);
    expect(historyLen).toBeGreaterThanOrEqual(2);
  });

  test('should handle pawn promotion on 8x8 (critical journey)', async ({ page }) => {
    test.slow();
    await page.locator('.gamemode-card[data-mode="standard8x8"]').click();
    await expect(page.locator('.cell')).toHaveCount(64);
    await page.waitForFunction(() => (window as any).game !== undefined, { timeout: 10000 });

    // Inject a White pawn one step away from promotion (8x8: row 1 -> row 0).
    await page.evaluate(() => {
      const game = (window as any).game;
      game.board[0][0] = null; // free the promotion square (a8)
      game.board[1][0] = { type: 'p', color: 'white', hasMoved: true };
      game.turn = 'white';
      if ((window as any).UI) (window as any).UI.renderBoard(game);
    });

    // Move the pawn onto the last rank to open the promotion overlay.
    await page.locator('.cell[data-r="1"][data-c="0"]').click();
    await page.locator('.cell[data-r="0"][data-c="0"]').click();

    const modal = page.locator('#promotion-overlay');
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(modal).not.toHaveClass(/hidden/);

    // 8x8 promotion offers the standard pieces (no Angel 'e' like 9x9).
    const options = modal.locator('.promotion-option');
    await expect(options).not.toHaveCount(0);
    await expect(modal.locator('.promotion-option[data-piece="q"]')).toBeVisible();
    await expect(modal.locator('.promotion-option[data-piece="r"]')).toBeVisible();

    // Choose the Queen.
    await modal.locator('.promotion-option[data-piece="q"]').click();
    await expect(page.locator('.cell[data-r="0"][data-c="0"]')).toHaveAttribute('data-piece', 'q');
  });
});
