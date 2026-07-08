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
      // Start every test context with a clean storage so no spec inherits an
      // autosave / leftover localStorage from a previous one (root cause of the
      // cross-file flaky screenshot failures). Each spec still sets its own
      // needed keys via addInitScript on top of this empty baseline.
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        storageState: { cookies: [], origins: [] },
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
      fullyParallel: false,
      retries: process.env.CI ? 2 : 0,
      // Always single-worker: the app's AI/worker module state is not safe to
      // share across parallel contexts, and parallel runs caused flaky
      // menu-click/tutor races locally. CI and local now run identically.
      workers: 1,
    },
    {
      name: 'trischach-e2e',
      testDir: './tests-e2e',
      testMatch: '**/*.spec.ts',
      // csp.spec.ts runs only in the dedicated `csp` project (playwright.csp.config.mjs),
      // which serves dist/schach9x9 on port 3005. Running it here would hit the
      // trischach server and assert a schach9x9 board, which fails.
      testIgnore: '**/csp.spec.ts',
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
      fullyParallel: false,
      retries: process.env.CI ? 2 : 0,
      // Always single-worker: the app's AI/worker module state is not safe to
      // share across parallel contexts, and parallel runs caused flaky
      // menu-click/tutor races locally. CI and local now run identically.
      workers: 1,
    },
  ],
});
