import { test, expect } from '@playwright/test';
import { E2EHelper } from './helpers/E2EHelper.js';

test.describe('Setup Phase Tests', () => {
  let helper: E2EHelper;

  test.beforeEach(async ({ page }) => {
    helper = new E2EHelper(page);
    await helper.goto();
  });

  test('should start setup mode and show king placement', async ({ page: _page }) => {
    await helper.startGame('setup');

    // Verify status shows setup start
    await helper.expectStatus(/Korridor für den König/i);

    // Verify board is 9x9
    const cells = _page.locator('.cell');
    await expect(cells).toHaveCount(81);

    // In setup mode, board starts empty until the player places pieces.
    await expect(_page.locator('.cell [data-piece], .cell [data-testid="ghost-piece"]')).toHaveCount(0);
    await helper.expectStatus(/Korridor für den König/i);
  });
});
