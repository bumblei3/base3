import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  worker: {
    format: 'es',
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: 'dist/schach9x9',
    assetsDir: 'assets',
    sourcemap: true, // Readable production traces for self-contained debugging
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.schach9x9.html'),
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        preserveModules: false,
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
