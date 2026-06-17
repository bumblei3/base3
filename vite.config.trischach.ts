import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist/trischach',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.trischach.html'),
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: false,
        format: 'es',
      },
    },
    sourcemap: true,
    minify: 'terser',
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@trischach': resolve(__dirname, './js/trischach'),
      '@shared': resolve(__dirname, './js/shared'),
    },
  },
});
