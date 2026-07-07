/**
 * main.ts
 * Application entry point.
 */

// Sentry Error Tracking & Web Vitals (Production only)
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  const { init: initSentry } = await import('@sentry/browser');
  const { browserTracingIntegration } = await import('@sentry/browser');
  const { replayIntegration } = await import('@sentry/browser');

  initSentry({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      browserTracingIntegration(),
      replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const init = async () => {
  try {
    const { App } = await import('./App.js');
    const app = new App();
    (window as unknown as Record<string, unknown>).app = app;
    app.initDOM();
  } catch (e) {
    console.error('[Main] Initialization failed:', e);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Register Service Worker for PWA (skip in E2E via ?disable-sw)
if ('serviceWorker' in navigator && !window.location.search.includes('disable-sw')) {
  const registerSW = () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  };
  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}
