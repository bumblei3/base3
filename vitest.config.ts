import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import process from 'process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const isCI = !!process.env.CI;
export default defineConfig({
  resolve: {
    extensions: ['.js', '.ts', '.json'],
    tsconfigPaths: true,
    alias: {
      '@trischach': resolve(__dirname, './js/trischach'),
      '@trischach/*': resolve(__dirname, './js/trischach/*'),
      '@schach9x9': resolve(__dirname, './js/schach9x9'),
      '@schach9x9/*': resolve(__dirname, './js/schach9x9/*'),
      '@shared': resolve(__dirname, './js/shared'),
      '@shared/*': resolve(__dirname, './js/shared/*')
    }
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'tests-e2e/**', '*.config.*', 'scripts/**', 'public/**'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80
      }
    },
    projects: [{
      extends: true,
      test: {
        environment: 'happy-dom',
        globals: true,
        pool: isCI ? 'forks' : 'threads',
        threads: {
          singleThread: true
        },
        forks: {
          singleFork: true
        },
        setupFiles: ['./tests/vitest.setup.ts'],
        include: ['tests/**/*.{test,unit.test,integration.test}.{js,ts}'],
        exclude: [
        // Exclude all schach9x9 tests (import path issues, need separate fix)
        'tests/schach9x9/**',
        // Exclude e2e tests (require Playwright)
        'tests-e2e/**'],
        testTimeout: 60000,
        resolve: {
          conditions: ['import', 'module', 'browser', 'default'],
          extensions: ['.js', '.ts', '.json'],
          mainFields: ['module', 'main']
        }
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});
