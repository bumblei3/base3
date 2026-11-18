const { test, expect } = require('@playwright/test');

// Breakpoints und Geräteklassen, für die die Seite laufen soll. Ein
// horizontaler Überlauf ist die eine Responsive-Fehlerart, die weder axe noch
// der Seiten-Validator sehen — sie fällt nur auf, wenn man wirklich rendert.
//
// 480 und 640 sind nicht Geräte, sondern Zoomstufen: 640 CSS px entsprechen
// 200 % Browserzoom bei einem 1280er-Fenster, 480 knapp 267 %. Genau dort
// bricht WCAG 1.4.4 (Text vergrößern) und 1.4.10 (Reflow) — die Breiten
// darüber prüfen nur, dass die Seite auf dem Gerät passt.
const WIDTHS = [320, 360, 390, 480, 640, 768, 1024, 1280, 1920];

async function loadFully(page) {
  await page.goto('/base3/');
  // Erst scrollen: die Karten-Vorschauen sind lazy und reservieren sonst
  // keinen Platz.
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

for (const width of WIDTHS) {
  test(`${width}px: kein horizontaler Überlauf`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loadFully(page);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      state.overflow,
      `bei ${width}px ist die Seite ${state.scrollWidth}px breit statt ${width}px`,
    ).toBeLessThanOrEqual(0);
  });
}
