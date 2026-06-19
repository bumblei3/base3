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
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'tests-e2e/**', '*.config.*', 'scripts/**', 'public/**'],
      thresholds: {
        global: {
          lines: 55,
          branches: 50,
          functions: 55,
          statements: 55
        }
      }
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
        }
      }
    }]
  }
});
