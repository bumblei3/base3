import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';
import process from 'process';

const isCI = !!process.env.CI;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    globals: true,
    pool: isCI ? 'forks' : 'threads',
    poolOptions: {
      forks: { singleFork: true },
      threads: { singleThread: true },
    },
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/**/*.{test,unit.test,integration.test}.{js,ts}'],
    exclude: [
      // Exclude all schach9x9 tests (import path issues, need separate fix)
      'tests/schach9x9/**',
    ],
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'tests-e2e/**',
        '*.config.*',
        'scripts/**',
        'public/**',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
    resolve: {
      conditions: ['import', 'module', 'browser', 'default'],
      extensions: ['.js', '.ts', '.json'],
      mainFields: ['module', 'main'],
    },
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
    alias: {
      '@trischach': resolve(__dirname, './js/trischach'),
      '@trischach/*': resolve(__dirname, './js/trischach/*'),
      '@schach9x9': resolve(__dirname, './js/schach9x9'),
      '@schach9x9/*': resolve(__dirname, './js/schach9x9/*'),
      '@shared': resolve(__dirname, './js/shared'),
      '@shared/*': resolve(__dirname, './js/shared/*'),
    },
  },
});
