const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Beide ausgelieferten Seiten: Die 404 ist keine Nebenseite, sondern genau
// das, was ein alter Link ausliefert — und war bisher der einzige Teil der
// Seite, den der axe-Gate nicht geprüft hat.
//
// Die Pfade sind bewusst absolut und mit /base3/ genannt: GitHub Pages serviert
// das Repo dort, und page.goto('/') würde sonst den Server-Wurzelordner
// scannen (ein Verzeichnislisting hat keine axe-Verstöße — ein grüner Test,
// der nichts prüft).
const PAGES = [
  { path: '/base3/', marker: /^Base3 Chess Platform$/ },
  { path: '/base3/404.html', marker: /^Diese Seite gibt es nicht$/ },
];

for (const { path, marker } of PAGES) {
  test(`${path} has no axe WCAG 2.x violations`, async ({ page }) => {
    await page.goto(path);
    // Erst prüfen, dass wir wirklich UNSERE Seite scannen — eine 404 des
    // Servers hätte dieselbe URL und wäre sonst still durchgelaufen.
    expect(page.url()).toBe(`http://localhost:8765${path}`);
    await expect(page.locator('h1')).toHaveText(marker);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    if (results.violations.length) {
      console.log(path, JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  });
}

// Der Gate lief immer im Ausgangszustand und auf Desktop-Breite. Das
// geöffnete Mobil-Menü ist eine eigene Überlagerung mit eigenem Kontrast und
// eigenem Fokus — den hat axe nie geprüft.
test('geöffnetes Mobil-Menü hat keine axe-Verstöße', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/base3/');
  await expect(page.locator('h1')).toHaveText(/^Base3 Chess Platform$/);
  await page.locator('.nav-toggle').click();
  await expect(page.locator('.nav-links')).toBeVisible();
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  if (results.violations.length) {
    console.log('menü', JSON.stringify(results.violations, null, 2));
  }
  expect(results.violations).toEqual([]);
});
