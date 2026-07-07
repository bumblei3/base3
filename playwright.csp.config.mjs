import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const hasSystemChromium = existsSync('/usr/bin/chromium-browser');

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false,
  retries: 0,
  projects: [
    {
      name: 'csp',
      testDir: './tests-e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        trace: 'on-first-retry',
        launchOptions: process.env.CI
          ? {}
          : hasSystemChromium
            ? {
                executablePath: '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
              }
            : {},
      },
    },
  ],
  // webServer on TOP-LEVEL works (per-project webServer is ignored by Playwright 1.61)
  webServer: {
    command: 'node tests-e2e/csp-server.mjs dist/schach9x9 3005',
    url: 'http://localhost:3005/',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
