import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, 'index.schach9x9.html'),
        resolve(__dirname, 'index.trischach.html'),
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@schach9x9': resolve(__dirname, './js/schach9x9'),
      '@trischach': resolve(__dirname, './js/trischach'),
      '@shared': resolve(__dirname, './js/shared'),
      '@engine-wasm': resolve(__dirname, './engine-wasm/pkg'),
      '@engine-wasm/*': resolve(__dirname, './engine-wasm/pkg/*'),
    },
  },
});
