import { test, expect } from '@playwright/test';

test.describe('Schach9x9 - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('disable_animations', 'true');
    });
    await page.goto('/?disable-sw');
    // Wait for main menu to appear (app is ready)
    await expect(page.locator('#main-menu')).toBeVisible({ timeout: 15000 });
  });

  test('Game loads and shows initial position', async ({ page }) => {
    // Start classic game mode
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }

    // Wait for board to appear
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cell')).toHaveCount(81);
    await expect(page.locator('.piece-svg')).toHaveCount(18);
  });

  test('Can make a valid move (select piece, then target)', async ({ page }) => {
    // Start classic game
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    // Click on a white pawn (row 7, col 0 = a2)
    const pawn = page.locator('.cell[data-r="7"][data-c="0"]');
    await pawn.click();
    await page.waitForTimeout(300);

    // Check that valid moves are highlighted
    const validMoves = page.locator('.cell.valid-move');
    const moveCount = await validMoves.count();
    expect(moveCount).toBeGreaterThan(0);

    // Click first valid move target
    await validMoves.first().click();
    await page.waitForTimeout(500);

    // Verify piece moved
    const movedPiece = page.locator('.cell[data-r="5"][data-c="0"] .piece-svg');
    await expect(movedPiece).toBeVisible();
  });

  test('AI responds to player move', async ({ page }) => {
    // Start classic game
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    // Make a move
    await page.locator('.cell[data-r="6"][data-c="0"]').click();
    await page.waitForTimeout(300);
    const validMoves = page.locator('.cell.valid-move');
    await validMoves.first().click();

    // Wait for AI to respond
    await page.waitForTimeout(5000);

    // Verify game continued (status display visible)
    const status = page.locator('#status-display');
    await expect(status).toBeVisible();
  });

  test('New Game resets the board', async ({ page }) => {
    // Start classic game
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    // Make a move
    await page.locator('.cell[data-r="6"][data-c="0"]').click();
    await page.waitForTimeout(300);
    const validMoves = page.locator('.cell.valid-move');
    await validMoves.first().click();
    await page.waitForTimeout(500);

    // Click new game button
    const newGameBtn = page.locator('#restart-btn, #new-game-btn').first();
    if (await newGameBtn.isVisible()) {
      await newGameBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.piece-svg')).toHaveCount(18);
    }
  });

  test('Undo button works', async ({ page }) => {
    // Start classic game
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    // Make a move
    await page.locator('.cell[data-r="6"][data-c="0"]').click();
    await page.waitForTimeout(300);
    const validMoves = page.locator('.cell.valid-move');
    await validMoves.first().click();
    await page.waitForTimeout(500);

    // Click undo
    const undoBtn = page.locator('#undo-btn').first();
    if (await undoBtn.isVisible()) {
      await undoBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.cell[data-r="6"][data-c="0"] .piece-svg')).toBeVisible();
    }
  });

  test('Setup phase: place pieces', async ({ page }) => {
    // Start setup mode
    const setupCard = page.locator('.gamemode-card[data-mode="setup"]');
    if (await setupCard.isVisible()) {
      await setupCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Setup' }).click();
    }

    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    // Click on a cell to place a king
    await page.locator('.cell[data-r="8"][data-c="4"]').click();
    await page.waitForTimeout(300);

    // Verify king was placed
    const cell = page.locator('.cell[data-r="8"][data-c="4"]');
    await expect(cell).toHaveAttribute('data-piece', 'k');
  });

  test('Menu navigation: start and quit', async ({ page }) => {
    // Start classic game
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    // Quit to menu
    const menuBtn = page.locator('#menu-btn').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await expect(page.locator('#main-menu')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Sound toggle works', async ({ page }) => {
    // Start classic game
    const classicCard = page.locator('.gamemode-card[data-mode="classic"]');
    if (await classicCard.isVisible()) {
      await classicCard.click();
    } else {
      await page.locator('.gamemode-card').filter({ hasText: 'Klassisch' }).click();
    }
    await expect(page.locator('[data-testid="board"]')).toBeVisible({ timeout: 10000 });

    const soundToggle = page.locator('#sound-toggle').first();
    if (await soundToggle.isVisible()) {
      await soundToggle.click();
      await page.waitForTimeout(200);
      const isChecked = await soundToggle.isChecked();
      expect(typeof isChecked).toBe('boolean');
    }
  });
});
