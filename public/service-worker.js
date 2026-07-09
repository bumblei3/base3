// Schach9x9 Service Worker
/* eslint-env serviceworker */
// Provides offline support + asset caching for the PWA (solo play without network).

const CACHE_NAME = 'schach9x9-v9';

// Core assets to precache on install so the game is fully playable offline.
// Paths are relative to the app root (/schach9x9/ when served from GitHub Pages).
const CORE_ASSETS = [
  './',
  './index.schach9x9.html',
  './js/index.js',
  './assets/index.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './opening-book.json',
];

// Static asset extensions served cache-first (JS chunks, CSS, fonts, images).
const STATIC_EXT = ['js', 'css', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'woff', 'woff2', 'ttf', 'json'];

function isStaticAsset(url) {
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.schach9x9.html')) return true;
  const ext = url.pathname.split('.').pop()?.toLowerCase();
  return STATIC_EXT.includes(ext || '');
}

// Install: precache core assets (best-effort — don't fail if one is missing)
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        CORE_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch (e) {
            console.warn('[SW] Failed to precache', asset, e);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

// Activate: drop old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: cache-first for static assets, network-first (fallback to cache) for the rest
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
      }),
    );
  } else {
    // HTML / dynamic: network-first, fall back to cached core page when offline
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match('./index.schach9x9.html').then(
                (fallback) =>
                  fallback ||
                  new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }),
              ),
          ),
        ),
    );
  }
});

console.log('[SW] Schach9x9 Service Worker loaded:', CACHE_NAME);
