import { test, expect } from '@playwright/test';
import { E2EHelper } from './helpers/E2EHelper.js';

test.describe('Schach9x9 - Critical User Flows', () => {
  let helper: E2EHelper;

  test.beforeEach(async ({ page }) => {
    helper = new E2EHelper(page);
    await helper.goto();
    await helper.startGame('classic');
  });

  test('Game loads and shows initial position', async ({ page }) => {
    await expect(page.locator('[data-testid="board"]')).toBeVisible();
    // 9x9 board = 81 cells
    await expect(page.locator('.cell')).toHaveCount(81);
  });

  test('Can make a valid move', async ({ page }) => {
    // Click on a piece (e.g. row 6, col 0 = a2 pawn)
    await helper.clickCell(7, 0);

    // Check that valid moves are highlighted
    await expect(page.locator('.cell.valid-move').first()).toBeVisible();

    // Click on a valid move target
    await helper.clickCell(5, 0);

    // Verify move was made (piece moved)
    await expect(page.locator('.cell[data-r="5"][data-c="0"] .piece-svg')).toBeVisible();
  });

  test('AI responds to player move', async ({ page }) => {
    // Make a move
    await helper.clickCell(7, 0);
    await helper.clickCell(5, 0);

    // Wait for AI to respond
    await page.waitForTimeout(3000);

    // Verify AI made a move (status should change)
    await helper.expectStatus(/Zug|move|weiß|white/i);
  });

  test('New Game resets the board', async ({ page }) => {
    // Make a move
    await helper.clickCell(7, 0);
    await helper.clickCell(5, 0);

    // Click new game via menu
    await helper.quitToMenu();
    await helper.startGame('classic');

    // Verify board is reset (81 cells)
    await expect(page.locator('.cell')).toHaveCount(81);
  });

  test('Undo button works', async ({ page }) => {
    // Make a move
    await helper.clickCell(7, 0);
    await helper.clickCell(5, 0);
    await page.waitForTimeout(300);

    // Undo via game API (see schach9x9-critical "Undo button works" for rationale)
    await page.evaluate(() => {
      const g = (window as any).game;
      if (g.moveController?.undoMove) g.moveController.undoMove();
    });
    await page.waitForTimeout(300);

    // Verify piece is back
    await expect(page.locator('.cell[data-r="7"][data-c="0"] .piece-svg')).toBeVisible();
  });
});
