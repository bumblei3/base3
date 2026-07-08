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
    sourcemap: true, // Enable for Sentry source-map upload + readable prod traces
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
      output: {
        manualChunks: {
          'three': ['three'],
        },
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
