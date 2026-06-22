import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const hasSystemChromium = existsSync('/usr/bin/chromium-browser');

export default defineConfig({
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
      retries: process.env.CI ? 2 : 0,
      workers: process.env.CI ? 1 : undefined,
      webServer: {
        command: 'npx http-server dist/schach9x9 -p 3000 -s -c-1',
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
        baseURL: 'http://localhost:3001',
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
      retries: process.env.CI ? 2 : 0,
      workers: process.env.CI ? 1 : undefined,
      webServer: {
        command: 'npx http-server dist/trischach -p 3001 -s -c-1',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
    },
  ],
});
