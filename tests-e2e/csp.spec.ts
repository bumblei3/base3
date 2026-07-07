import { test, expect } from '@playwright/test';

// Verifies that the app loads and functions correctly under the real
// Content-Security-Policy defined in _headers (Three.js from jsdelivr,
// Google Fonts, Web Workers, WASM). Any CSP violation is reported by the
// browser as a console error of type "securitypolicyviolation".
test.describe('CSP compliance', () => {
  test('loads schach9x9 under CSP without policy violations', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/content-security-policy|Refused to|blocked by/i.test(text)) {
          violations.push(text);
        }
      }
    });
    page.on('pageerror', (err) => {
      // network/CSP failures sometimes surface as page errors
      violations.push(`pageerror: ${err.message}`);
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

    // Give modules (Three.js from CDN) time to load
    await page.waitForTimeout(3000);

    // App should have rendered the board (canvas or squares)
    const hasBoard = await page.locator('#board, canvas, .board, [data-board]').first().count();
    expect(hasBoard).toBeGreaterThan(0);

    // No CSP violations reported
    expect(violations, `CSP violations:\n${violations.join('\n')}`).toHaveLength(0);
  });
});
