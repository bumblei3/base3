import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist/landing',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]',
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
