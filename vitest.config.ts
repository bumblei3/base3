import { defineConfig } from 'vitest/config';
import process from 'process';

const isCI = !!process.env.CI;

export default defineConfig({
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
        'schach9x9/**',
        'trischach/**',
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
  },
});
