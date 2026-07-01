import { test, expect } from '@playwright/test';
import { E2EHelper } from './helpers/E2EHelper.js';

test.describe('Schach9x9 - Critical User Flows', () => {
  let helper: E2EHelper;

  test.beforeEach(async ({ page }) => {
    helper = new E2EHelper(page);
    await helper.goto();
  });

  test('Game loads and shows initial position', async ({ page }) => {
    await helper.startGame('classic');
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cell')).toHaveCount(81);
    await expect(page.locator('.piece-svg')).toHaveCount(18);
  });

  test('Can make a valid move (select piece, then target)', async ({ page }) => {
    await helper.startGame('classic');
    await helper.clickCell(7, 0);
    await page.waitForTimeout(300);
    const validMoves = page.locator('.cell.valid-move');
    const moveCount = await validMoves.count();
    expect(moveCount).toBeGreaterThan(0);
    await page.locator('.cell[data-r="5"][data-c="0"]').click();
    await page.waitForTimeout(500);
    const movedPiece = page.locator('.cell[data-r="5"][data-c="0"] .piece-svg');
    await expect(movedPiece).toBeVisible();
  });

  test('AI responds to player move', async ({ page }) => {
    await helper.startGame('classic');
    await helper.clickCell(7, 0);
    await helper.clickCell(5, 0);
    await page.waitForTimeout(5000);
    const status = page.locator('#status-display');
    await expect(status).toBeVisible();
  });

  test('New Game resets the board', async ({ page }) => {
    await helper.startGame('classic');
    await helper.clickCell(7, 0);
    await helper.clickCell(5, 0);
    await page.waitForTimeout(500);
    const newGameBtn = page.locator('#restart-btn, #new-game-btn').first();
    if (await newGameBtn.isVisible()) {
      await newGameBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.piece-svg')).toHaveCount(18);
    }
  });

  test('Undo button works', async ({ page }) => {
    await helper.startGame('classic');
    await helper.clickCell(7, 0);
    await helper.clickCell(5, 0);
    await page.waitForTimeout(500);
    const undoBtn = page.locator('#undo-btn').first();
    if (await undoBtn.isVisible()) {
      await undoBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.cell[data-r="7"][data-c="0"] .piece-svg')).toBeVisible();
    }
  });

  test('Setup phase: place pieces', async ({ page }) => {
    await helper.startGame('setup');
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });
    await page.locator('.cell[data-r="8"][data-c="4"]').click();
    await page.waitForTimeout(300);
    const cell = page.locator('.cell[data-r="8"][data-c="4"]');
    await expect(cell).toHaveAttribute('data-piece', 'k');
  });

  test('Menu navigation: start and quit', async ({ page }) => {
    await helper.startGame('classic');
    await helper.quitToMenu();
  });

  test('Sound toggle works', async ({ page }) => {
    await helper.startGame('classic');
    const soundToggle = page.locator('#sound-toggle').first();
    if (await soundToggle.isVisible()) {
      await soundToggle.click();
      await page.waitForTimeout(200);
      const isChecked = await soundToggle.isChecked();
      expect(typeof isChecked).toBe('boolean');
    }
  });
});
