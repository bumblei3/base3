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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@schach9x9': resolve(__dirname, './js/schach9x9'),
      '@trischach': resolve(__dirname, './js/trischach'),
      '@shared': resolve(__dirname, './js/shared'),
    },
  },
});
