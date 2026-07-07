import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const hasSystemChromium = existsSync('/usr/bin/chromium-browser');

export default defineConfig({
  globalSetup: './tests-e2e/globalSetup.ts',
  globalTeardown: './tests-e2e/globalTeardown.ts',
  projects: [
    {
      name: 'schach9x9-e2e',
      testDir: './e2e',
      testMatch: '**/*.spec.ts',
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
    },
    {
      name: 'trischach-e2e',
      testDir: './tests-e2e',
      testMatch: '**/*.spec.ts',
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
    },
  ],
});
