/**
 * main.ts
 * Application entry point.
 */

import { PWAInstaller } from '../shared/utils/PWAInstaller.js';

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

// Capture the install prompt via the shared, tested PWAInstaller so we can
// trigger it from a UI button (browsers only fire this once and don't show a
// persistent install button). Refactors the previous inline handler into the
// reusable, unit-tested utility.

const pwaInstaller = new PWAInstaller();

pwaInstaller.onInstallable(() => {
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.remove('hidden');
});

pwaInstaller.onInstalled(() => {
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.add('hidden');
});

// Expose for DOMHandler (kept minimal — only the prompt trigger is needed).
(window as unknown as { __promptInstall?: () => Promise<void> }).__promptInstall = async () => {
  await pwaInstaller.showPrompt();
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.add('hidden');
};
