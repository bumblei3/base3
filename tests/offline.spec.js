const { test, expect } = require('@playwright/test');

// Die Seite wirbt mit „Im Browser lassen sich beide Spiele als App
// installieren … dann spielst du auch ohne Verbindung". Das ist eine
// funktionale Zusage, aber tests/test_sw.py prüft sie nur strukturell —
// gefahren wird der Service Worker nie. CI hat mittlerweile Chromium und
// Playwright (a11y.yml), also kann die Zusage hier bewiesen statt behauptet
// werden.
//
// Vorgehen wie in references/service-worker-offline.md: erst online laden und
// den Precache füllen, dann den HTTP-Cache des Browsers leeren UND das Netz
// abschalten. Ohne beides könnte ein „grüner" Render aus dem Browser-Cache
// kommen und nichts über den Service Worker aussagen.

const CACHE_PREFIX = 'base3-';

async function waitUntilCached(page) {
  await page.waitForFunction(
    async (prefix) => {
      const keys = await caches.keys();
      const key = keys.find((k) => k.startsWith(prefix));
      if (!key) return false;
      const cache = await caches.open(key);
      // index.html und 404.html sind der Precache-Kern — ohne die beiden
      // darf kein Offline-Test starten.
      return (await cache.match('index.html')) && (await cache.match('404.html'));
    },
    CACHE_PREFIX,
    { timeout: 20000 },
  );
}

async function goOffline(page, context) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  // `context.setOffline(true)` ist die Playwright-eigene Abschaltung; eine
  // CDP-Emulation über eine zweite Session wurde hier ignoriert — die Seite
  // erreichte den Server noch, und der Test wäre grün gewesen, ohne etwas zu
  // prüfen.
  await context.setOffline(true);
}

test('offline: die Startseite lädt nach dem ersten Besuch ohne Netz', async ({
  page,
  context,
}) => {
  await page.goto('/base3/');
  test.skip(
    !(await page.evaluate(() => 'serviceWorker' in navigator)),
    'Browser ohne Service-Worker-API',
  );
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, {
    timeout: 20000,
  });
  await waitUntilCached(page);

  await goOffline(page, context);
  await page.reload();

  // h1 aus dem DOM lesen, nicht aus documentElement.outerHTML: der Parser
  // hängt Inhalt nach </html> an das Document, und Kommentare dort würde er
  // verpassen.
  await expect(page.locator('h1')).toHaveText(/Base3 Chess Platform/);
  expect(await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL)).toContain(
    '/base3/sw.js',
  );
  // Die Karten-Vorschauen sind die Seite — offline dürfen sie nicht
  // Platzhalter bleiben. Erst scrollen: sie sind lazy. Und schrittweise,
  // nicht mit einem Sprung ans Ende — Chrome lädt lazy-Bilder außerhalb
  // seiner Entfernungsschwelle nicht, und die Schwelle hängt von der
  // Verbindungsgeschwindigkeit ab.
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  await page.waitForTimeout(800);
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('#schach9x9 img, #trischach img')].map((i) => ({
      src: i.currentSrc,
      ok: i.complete && i.naturalWidth > 0,
    })),
  );
  expect(imgs).toHaveLength(2);
  for (const img of imgs) {
    expect(img.ok, `Vorschau offline nicht geladen: ${img.src}`).toBe(true);
  }
});

test('offline: eine unbekannte URL liefert die gecachte 404-Seite', async ({
  page,
  context,
}) => {
  await page.goto('/base3/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, {
    timeout: 20000,
  });
  await waitUntilCached(page);

  await goOffline(page, context);
  // Diese URL wurde nie besucht — ein Treffer kann nur aus dem SW-Cache kommen.
  await page.goto('/base3/diese-seite-gibt-es-nicht/');
  await expect(page.locator('h1')).toHaveText(/Diese Seite gibt es nicht/);
});
