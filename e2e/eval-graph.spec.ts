import { test, expect } from '@playwright/test';

// Replaces the skipped jsdom unit test (GameStatusUI.test.ts) that could not
// verify SVG click bubbling. Runs in a real browser via the real app flow:
// enterAnalysisMode() -> UI.renderEvalGraph() -> click .eval-point -> jumpToMove.
test.describe('Eval Graph (real browser)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('ki_mentor_level', 'OFF');
      localStorage.setItem('disable_animations', 'true');
    });
    await page.goto('/?disable-sw');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'));
  });

  test('renders the eval graph and jumps to a move on point click', async ({ page }) => {
    // Select a game mode so window.game / window.gameController are created.
    await page.locator('.gamemode-card[data-mode="standard8x8"]').click();
    await page.waitForFunction(() => (window as any).game !== undefined, { timeout: 10000 });

    // Seed a finished game with eval scores so analysis mode has data to plot.
    await page.evaluate(() => {
      const game = (window as any).game;
      game.moveHistory = [
        { evalScore: 120 },
        { evalScore: -40 },
        { evalScore: 300 },
        { evalScore: 10 },
      ];
    });

    // Enter analysis mode via the real controller — this calls
    // UI.renderEvalGraph(game) and reveals #eval-graph-container.
    const entered = await page.evaluate(() => {
      const gc = (window as any).gameController;
      return gc && gc.enterAnalysisMode ? gc.enterAnalysisMode() : false;
    });
    expect(entered).toBe(true);

    const container = page.locator('#eval-graph-container');
    await expect(container).not.toHaveClass(/hidden/);

    const svg = page.locator('#eval-graph');
    await expect(svg.locator('.eval-line')).toHaveCount(1);
    const points = svg.locator('.eval-point');
    await expect(points).not.toHaveCount(0);

    // Click the LAST plotted point — it is always rendered (i === length-1)
    // and its data-index maps to a real history entry. Verify the click drives
    // jumpToMove to exactly that index.
    const last = points.last();
    const expectedIndex = Number(await last.getAttribute('data-index'));
    await last.click();

    // jumpToMove should have been invoked on the game controller, which sets
    // game.replayPosition to the clicked point's index.
    const replayPosition = await page.evaluate(() => {
      const game = (window as any).game;
      return game.replayPosition;
    });
    expect(replayPosition).toBe(expectedIndex);
  });
});
