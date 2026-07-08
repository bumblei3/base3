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

// Capture the install prompt so we can trigger it from a UI button
// (browsers only fire this once and don't show a persistent install button).
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferredInstallPrompt: InstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e: Event) => {
  // Prevent the default mini-infobar from appearing on its own.
  e.preventDefault();
  deferredInstallPrompt = e as InstallPromptEvent;
  // Reveal the install button (hidden by default until the prompt is available).
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.add('hidden');
});

// Expose for DOMHandler (kept minimal — only the prompt trigger is needed).
(window as unknown as { __promptInstall?: () => Promise<void> }).__promptInstall = async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.add('hidden');
};
