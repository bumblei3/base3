import { test, expect } from '@playwright/test';

test.describe('PWA / Offline @pwa', () => {
  test('Service Worker registers, activates and precaches core assets', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'), { timeout: 15000 });

    // SW must be registered and active
    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no-api' };
      const reg = await navigator.serviceWorker.ready;
      return { ok: !!reg.active, scope: reg.scope };
    });
    expect(swState.ok).toBe(true);

    // Core assets must be present in the SW cache (proves offline-readiness)
    const cached = await page.evaluate(async () => {
      if (!('caches' in window)) return [];
      const names = await caches.keys();
      const found: string[] = [];
      for (const n of names) {
        const c = await caches.open(n);
        const reqs = await c.keys();
        found.push(...reqs.map((r) => r.url));
      }
      return found;
    });
    expect(cached.some((u) => u.includes('js/index.js'))).toBe(true);
    expect(cached.some((u) => u.includes('index.schach9x9.html'))).toBe(true);
    expect(cached.some((u) => u.includes('assets/index.css'))).toBe(true);
  });

  test('manifest is linked', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.body.classList.contains('app-ready'), { timeout: 15000 });
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toContain('manifest.json');
  });
});
