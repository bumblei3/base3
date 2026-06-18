import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    testTimeout: 300000,
    pool: 'forks',
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/**/*.{test,unit.test,integration.test}.{js,ts}'],
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
    tsconfigPaths: true,
    alias: {
      '@trischach': resolve(__dirname, './js/trischach'),
      '@trischach/*': resolve(__dirname, './js/trischach/*'),
      '@schach9x9': resolve(__dirname, './js/schach9x9'),
      '@schach9x9/*': resolve(__dirname, './js/schach9x9/*'),
      '@shared': resolve(__dirname, './js/shared'),
      '@shared/*': resolve(__dirname, './js/shared/*'),
      '@engine-wasm': resolve(__dirname, './engine-wasm/pkg'),
      '@engine-wasm/*': resolve(__dirname, './engine-wasm/pkg/*'),
    },
  },
});
