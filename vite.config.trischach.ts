import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
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
        manualChunks: (id: string) => {
          if (id.includes('opening-book.ts') || id.includes('opening-book.compiled')) {
            return 'opening-book';
          }
          if (id.includes('ai-core.ts')) {
            return 'ai-core';
          }
        },
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
