const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('index.html has no axe WCAG 2.x violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  if (results.violations.length) {
    console.log(JSON.stringify(results.violations, null, 2));
  }
  expect(results.violations).toEqual([]);
});
