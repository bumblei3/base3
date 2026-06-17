import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    globals: true,
    pool: 'threads',
    threads: { singleThread: true },
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/**/*.{test,unit.test,integration.test}.{js,ts}'],
    exclude: [],
    testTimeout: 120000,
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
      // Mock WASM module for CI tests (engine-wasm not built in test job)
      '../../../engine-wasm/pkg/schach9x9.js': resolve(__dirname, './tests/mocks/wasm-mock.js'),
    },
  },
});
