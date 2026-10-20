const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  testMatch: /a11y\.spec\.js/,
  use: { baseURL: 'http://localhost:8765' },
  webServer: {
    command: 'python3 -m http.server 8765 --directory .',
    port: 8765,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
