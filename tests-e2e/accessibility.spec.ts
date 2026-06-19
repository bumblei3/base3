import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit', () => {
  test('Trischach page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Log violations for info (don't fail on minor issues during audit)
    if (results.violations.length > 0) {
      console.log(`\n=== A11y Violations: ${results.violations.length} ===`);
      for (const v of results.violations) {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`    Help: ${v.helpUrl}`);
        for (const node of v.nodes) {
          console.log(`    - ${node.html}`);
        }
      }
    }

    // Only fail on critical/serious violations
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });
});
