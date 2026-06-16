import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const hasSystemChromium = existsSync('/usr/bin/chromium-browser');

export default defineConfig({
  // Separate test directories for each game
  projects: [
    {
      name: 'schach9x9-e2e',
      testDir: './e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
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
      fullyParallel: true,
      forbidOnly: !!process.env.CI,
      retries: process.env.CI ? 2 : 0,
      workers: process.env.CI ? 1 : undefined,
      reporter: process.env.CI
        ? [['github'], ['html', { outputFolder: 'playwright-report/schach9x9', open: 'never' }]]
        : 'html',
      webServer: {
        command: 'cp dist/schach9x9/index.schach9x9.html dist/schach9x9/index.html && npx http-server dist/schach9x9 -p 3000 -s -c-1',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
    },
    {
      name: 'trischach-e2e',
      testDir: './tests-e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        navigationTimeout: 30000,
        launchOptions: process.env.CI
          ? {}
          : hasSystemChromium
            ? {
                executablePath: '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
              }
            : {},
      },
      fullyParallel: true,
      forbidOnly: !!process.env.CI,
      retries: process.env.CI ? 2 : 0,
      workers: process.env.CI ? 1 : undefined,
      reporter: [['html', { outputFolder: 'playwright-report/trischach', open: 'never' }], ['json', { outputFile: 'test-results/trischach-results.json' }]],
      webServer: {
        command: 'npx vite preview --port 4173 --host',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
    },
  ],
});
