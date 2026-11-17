const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  testMatch: /a11y\.spec\.js/,
  // GitHub Pages serviert das Repo unter /base3/, und index.html referenziert
  // Schriften, Manifest und Service Worker als /base3/... . Der Scan muss
  // dieselbe URL prüfen — sonst laufen diese Dateien in 404 und axe sieht
  // eine andere Seite als der Besucher.
  use: { baseURL: 'http://localhost:8765' },
  webServer: {
    command: 'mkdir -p .lh && ln -sfn "$PWD" .lh/base3 && python3 -m http.server 8765 --directory .lh',
    port: 8765,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
