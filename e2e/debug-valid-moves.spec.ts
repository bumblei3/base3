import { test, expect } from '@playwright/test';

test('Debug: check showBlunderWarning', async ({ page }) => {
  await page.goto('/?disable-sw');
  await page.waitForFunction(() => document.body.classList.contains('app-ready'));
  await page.locator('#main-menu').waitFor({ state: 'visible' });

  await page.locator('.gamemode-card[data-mode="classic"]').click();
  await page.locator('[data-testid="board"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);

  // Select piece
  await page.locator('.cell[data-r="7"][data-c="0"]').click();
  await page.waitForTimeout(300);

  const info = await page.evaluate(async () => {
    const game = window.game;
    const mc = window.app.moveController;

    // Check if showBlunderWarning exists
    const hasShowBlunderWarning = typeof game?.tutorController?.showBlunderWarning;
    const hasAnalyzePlayerMovePreExecution = typeof game?.tutorController?.analyzePlayerMovePreExecution;

    // Try calling analyzePlayerMovePreExecution
    let analysisResult = null;
    let analysisError = null;
    try {
      if (hasAnalyzePlayerMovePreExecution === 'function') {
        analysisResult = await game.tutorController.analyzePlayerMovePreExecution({
          from: { r: 7, c: 0 },
          to: { r: 5, c: 0 },
        });
      }
    } catch (e) {
      analysisError = String(e);
    }

    return {
      kiMentorEnabled: game?.kiMentorEnabled,
      hasShowBlunderWarning,
      hasAnalyzePlayerMovePreExecution,
      analysisResult,
      analysisError,
    };
  });

  console.log('Info:', JSON.stringify(info, null, 2));
});
