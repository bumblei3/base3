const { test, expect } = require('@playwright/test');

// Das Mobil-Menü war die einzige Interaktion der Seite ohne Test — und ohne
// Escape und ohne zustandsgemäße Beschriftung. Beides hier festgehalten.
test.describe('Mobil-Menü', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/base3/');
    await page.waitForTimeout(250);
  });

  test('geschlossen: Knopf sichtbar, Menü nicht', async ({ page }) => {
    const menue = page.locator('.nav-links');
    await expect(menue).toBeHidden();
    await expect(page.locator('.nav-toggle')).toBeVisible();
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-label', 'Menü öffnen');
    // Der Knopf muss das Panel ansprechen, das er schaltet — nicht nur
    // aria-expanded mitgeben.
    const ziel = await page.locator('.nav-toggle').getAttribute('aria-controls');
    expect(ziel).toBeTruthy();
    await expect(page.locator(`#${ziel}`)).toHaveClass(/nav-links/);
  });

  test('Klick öffnet und beschriftet um', async ({ page }) => {
    const schalter = page.locator('.nav-toggle');
    await schalter.click();
    await expect(page.locator('.nav-links')).toBeVisible();
    await expect(schalter).toHaveAttribute('aria-expanded', 'true');
    await expect(schalter).toHaveAttribute('aria-label', 'Menü schließen');
    // geschlossen
    await schalter.click();
    await expect(page.locator('.nav-links')).toBeHidden();
    await expect(schalter).toHaveAttribute('aria-expanded', 'false');
    await expect(schalter).toHaveAttribute('aria-label', 'Menü öffnen');
  });

  test('Escape schließt wieder', async ({ page }) => {
    const schalter = page.locator('.nav-toggle');
    await schalter.click();
    await expect(page.locator('.nav-links')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nav-links')).toBeHidden();
    await expect(schalter).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape ohne geöffnetem Menü schlägt fehl', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.nav-links')).toBeHidden();
  });

  test('einem Link im Menü führt zu einer der Spielseiten', async ({ page }) => {
    await page.locator('.nav-toggle').click();
    const ziele = await page.locator('.nav-links a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(ziele).toEqual([
      './',
      'https://bumblei3.github.io/schach9x9/',
      'https://bumblei3.github.io/trischach/',
    ]);
  });

  test('auf breitem Viewport kein Knopf', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('.nav-toggle')).toBeHidden();
    await expect(page.locator('.nav-links')).toBeVisible();
  });
});
