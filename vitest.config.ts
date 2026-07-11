import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import process from 'process';

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
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'tests-e2e/**', '*.config.*', 'scripts/**', 'public/**', 'js/trischach/ai.ts'],
    },
    projects: [{
      extends: true,
      test: {
        environment: 'happy-dom',
        globals: true,
        pool: isCI ? 'forks' : 'threads',
        setupFiles: ['./tests/vitest.setup.ts'],
        include: ['tests/**/*.{test,unit.test,integration.test}.{js,ts}'],
        exclude: [
        // Exclude e2e tests (require Playwright)
        'tests-e2e/**'],
        testTimeout: 60000,
        resolve: {
          conditions: ['import', 'module', 'browser', 'default'],
          extensions: ['.js', '.ts', '.json'],
          mainFields: ['module', 'main']
        },
        coverage: {
          // NOTE: coverage.thresholds MUST live at project level. A top-level
          // `coverage.thresholds` is silently ignored when `projects` is used
          // (vitest 4.x), so the gate never fired. Measured floor 2026-07-11:
          // 71.47% stmts / 73.22% lines / 63.58% branches / 68.40% fns.
          thresholds: {
            global: {
              lines: 72,
              branches: 60,
              functions: 65,
              statements: 70
            }
          }
        }
      }
    }]
  }
});
