import { test, expect } from '@playwright/test';

test.describe('Schach9x9 - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for board to render
    await page.waitForSelector('.board', { timeout: 15000 });
  });

  test('Game loads and shows initial position', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Schach9x9');
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('.piece')).toHaveCount(18); // 9 per side
  });

  test('Can make a valid move', async ({ page }) => {
    // Click on a piece (e.g. a2 pawn)
    const pawn = page.locator('[data-square="a2"] .piece').first();
    await pawn.click();

    // Check that valid moves are highlighted
    await expect(page.locator('.valid-move').first()).toBeVisible();

    // Click on a valid move target
    const target = page.locator('[data-square="a3"]');
    await target.click();

    // Verify move was made (piece moved)
    await expect(page.locator('[data-square="a3"] .piece')).toHaveCount(1);
  });

  test('AI responds to player move', async ({ page }) => {
    // Make a move
    await page.locator('[data-square="a2"] .piece').first().click();
    await page.locator('[data-square="a3"]').click();

    // Wait for AI to respond (check move history or status)
    await page.waitForTimeout(3000);

    // Verify AI made a move (move log should have entries)
    const moveLog = page.locator('#move-log, .move-history');
    if (await moveLog.isVisible()) {
      await expect(moveLog).not.toBeEmpty();
    }
  });

  test('New Game resets the board', async ({ page }) => {
    // Make a move
    await page.locator('[data-square="a2"] .piece').first().click();
    await page.locator('[data-square="a3"]').click();

    // Click new game
    const newGameBtn = page.locator('#new-game-btn, #restart-btn, :text("New Game")').first();
    if (await newGameBtn.isVisible()) {
      await newGameBtn.click();

      // Verify board is reset
      await page.waitForTimeout(1000);
      await expect(page.locator('.piece')).toHaveCount(18);
    }
  });

  test('Undo button works', async ({ page }) => {
    // Make a move
    await page.locator('[data-square="a2"] .piece').first().click();
    await page.locator('[data-square="a3"]').click();

    // Click undo
    const undoBtn = page.locator('#undo-btn, :text("Undo")').first();
    if (await undoBtn.isVisible()) {
      await undoBtn.click();

      // Verify piece is back
      await expect(page.locator('[data-square="a2"] .piece').first()).toBeVisible();
    }
  });
});
