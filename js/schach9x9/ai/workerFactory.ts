/**
 * Creates an instance of the Chess 9x9 AI Web Worker.
 *
 * Uses the Vite-native `new Worker(new URL(...), { type: 'module' })` form
 * instead of a `?worker` import suffix. This keeps the code loadable in
 * non-Vite test runners (e.g. Playwright's esbuild-based collector), which
 * cannot resolve `?worker` module suffixes. Vite still detects and bundles
 * the worker the same way.
 */
export function createAIWorker(): Worker {
  if (typeof Worker === 'undefined' || typeof window === 'undefined') {
    throw new Error('Web Workers are not available in this environment');
  }
  return new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });
}
