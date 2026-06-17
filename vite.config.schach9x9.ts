import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist/schach9x9',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.schach9x9.html'),
      },
      output: {
        manualChunks: (id: string) => {
          if (id.includes('battleChess3D')) {
            return 'battleChess3D';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@schach9x9': resolve(__dirname, './js/schach9x9'),
      '@shared': resolve(__dirname, './js/shared'),
    },
  },
});
