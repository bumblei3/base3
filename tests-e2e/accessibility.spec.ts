import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe.configure({ retries: 0 });

test('@accessibility Landing page should have no WCAG 2.1 AA violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2aa', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('@accessibility Schach9x9 page should have no WCAG 2.1 AA violations', async ({ page }) => {
  await page.goto('/schach9x9/');
  await page.waitForLoadState('networkidle');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2aa', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('@accessibility Trischach page should have no WCAG 2.1 AA violations', async ({ page }) => {
  await page.goto('/trischach/');
  await page.waitForLoadState('networkidle');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2aa', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});