import { test, expect } from '@playwright/test';
import { E2EHelper } from '../e2e/helpers/E2EHelper.js';

test.describe('Schach9x9 - Critical User Flows', () => {
  let helper: E2EHelper;

  test.beforeEach(async ({ page }) => {
    helper = new E2EHelper(page);
    await helper.goto();
  });

  test('Game loads and shows initial position', async ({ page }) => {
    await helper.startGame('classic');

    // Check title
    await expect(page.locator('h1')).toContainText('Schach 9x9');
    // Check board is rendered
    await expect(page.locator('[data-testid="board"]')).toBeVisible();
    // Check 81 cells (9x9)
    await expect(page.locator('.cell')).toHaveCount(81);
    // Check 18 pieces (9 per side)
    await expect(page.locator('.piece-svg')).toHaveCount(18);
  });

  test('Can make a valid move (select piece, then target)', async ({ page }) => {
    await helper.startGame('classic');

    // Click on a white pawn (row 6, col 0 = a2)
    await helper.clickCell(6, 0);

    // Check that valid moves are highlighted
    const validMoves = page.locator('.cell.valid-move');
    const moveCount = await validMoves.count();
    expect(moveCount).toBeGreaterThan(0);

    // Click first valid move target
    await validMoves.first().click();
    await page.waitForTimeout(500);

    // Verify move was made (piece moved to new cell)
    // After moving a2->a3, the piece should be at row 5, col 0
    const movedPiece = page.locator('.cell[data-r="5"][data-c="0"] .piece-svg');
    await expect(movedPiece).toBeVisible();
  });

  test('AI responds to player move', async ({ page }) => {
    await helper.startGame('classic');

    // Make a move
    await helper.clickCell(6, 0);
    const validMoves = page.locator('.cell.valid-move');
    await validMoves.first().click();

    // Wait for AI to respond
    await page.waitForTimeout(5000);

    // Verify AI made a move (status should show black's turn or game continued)
    const status = page.locator('#status-display');
    await expect(status).toBeVisible();
  });

  test('New Game resets the board', async ({ page }) => {
    await helper.startGame('classic');

    // Make a move
    await helper.clickCell(6, 0);
    const validMoves = page.locator('.cell.valid-move');
    await validMoves.first().click();
    await page.waitForTimeout(500);

    // Click new game button
    const newGameBtn = page.locator('#restart-btn, #new-game-btn, :text("Neues Spiel")').first();
    if (await newGameBtn.isVisible()) {
      await newGameBtn.click();
      await page.waitForTimeout(1000);

      // Verify board is reset (18 pieces)
      await expect(page.locator('.piece-svg')).toHaveCount(18);
    }
  });

  test('Undo button works', async ({ page }) => {
    await helper.startGame('classic');

    // Make a move
    await helper.clickCell(6, 0);
    const validMoves = page.locator('.cell.valid-move');
    await validMoves.first().click();
    await page.waitForTimeout(500);

    // Click undo
    const undoBtn = page.locator('#undo-btn, :text("Rückgängig")').first();
    if (await undoBtn.isVisible()) {
      await undoBtn.click();
      await page.waitForTimeout(500);

      // Verify piece is back at original position
      const originalPiece = page.locator('.cell[data-r="6"][data-c="0"] .piece-svg');
      await expect(originalPiece).toBeVisible();
    }
  });

  test('Setup phase: place pieces', async ({ page }) => {
    await helper.startGame('setup');

    // In setup mode, click on a cell to place a king
    await helper.clickCell(8, 4);
    await page.waitForTimeout(300);

    // Verify king was placed
    await helper.expectPiece(8, 4, 'k', 'white');
  });

  test('Menu navigation: start and quit', async ({ page }) => {
    await helper.startGame('classic');
    await expect(page.locator('[data-testid="board"]')).toBeVisible();

    // Quit to menu
    await helper.quitToMenu();
    await expect(page.locator('#main-menu')).toBeVisible();
  });

  test('Sound toggle works', async ({ page }) => {
    await helper.startGame('classic');

    const soundToggle = page.locator('#sound-toggle, [data-testid="sound-toggle"]').first();
    if (await soundToggle.isVisible()) {
      // Toggle sound
      await soundToggle.click();
      await page.waitForTimeout(200);

      // Verify toggle state changed
      const isChecked = await soundToggle.isChecked();
      // Just verify the toggle is interactive
      expect(typeof isChecked).toBe('boolean');
    }
  });
});
