/*
 * base3 Service Worker — Offline-Fallback, bewusst ohne Staleness.
 *
 * Strategie: network-first für alles. Der Cache ist ausschließlich der
 * Offline-Fall, kein Store. Online bekommt der Besucher also immer die
 * frische Datei — exakt wie ohne Service Worker. Offline bekommt er das,
 * was zuletzt geladen war.
 *
 * Warum kein cache-first: die Dateinamen sind nicht gehasht
 * (`outfit-latin.woff2`). Cache-first würde nach einer Schrift- oder
 * Bildänderung noch die alte Datei ausliefern, bis jemand die
 * Versionsnummer hier hochzählt. Das wollen wir nicht — der
 * Staleness-Verzicht ist der Preis für „online immer frisch“.
 *
 * Praxis: nach dem ersten Online-Besuch ist die Seite offline benutzbar,
 * inklusive Schriften und Icons. Ohne Vorab-Besuch liefert der Precache
 * die Hülle (HTML, 404, Manifest, Icons, Schriften).
 *
 * Scope: /base3/ (GitHub Pages serviert das Repo unter /base3/, ein
 * Service Worker darf nur sein eigenes Verzeichnis kontrollieren).
 */
'use strict';

/* Bei einer Strategie-Änderung hochzählen — activate räumt dann die
 * alten Caches weg, sonst serviert ein schon aktiver Besucher noch die
 * bisherige Variante. */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `base3-${CACHE_VERSION}`;

/* Was offline unbedingt gehen muss. Kleiner, expliziter Kernel statt
 * „alles“: Bilder und Unterseiten kommen beim ersten Online-Besuch
 * ohnehin in den Cache und sind danach offline verfügbar. */
const SHELL = [
  'index.html',
  '404.html',
  'manifest.webmanifest',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon.ico',
  'favicon-32.png',
  'assets/fonts/outfit-latin.woff2',
  'assets/fonts/jetbrains-mono-latin.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      /* Einzeln statt cache.addAll(): addAll bricht ab, sobald eine Datei
       * fehlt oder einen Nicht-2xx-Status liefert — dann bliebe gar kein
       * Offline-Fallback. Einzeln mit Abfangen ist robuster. */
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            /* 404.html antwortet absichtlich mit Status 404 — trotzdem
             * cachen, sie ist unsere Offline-Fehlerseite. */
            if (response.ok || url.endsWith('404.html')) {
              await cache.put(url, response);
            }
          } catch (_) {
            /* Schon offline während install: der Precache entfällt, der
             * Rest funktioniert beim nächsten Besuch. */
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/* Frische Antwort aus dem Netz; bei Erfolg nebenbei in den Cache legen.
 * Der Cache-Schritt ist Teil der Promise-Kette — so wartet der Browser
 * darauf, und wir brauchen kein event.waitUntil() in einem Callback. */
const fromNetwork = (request) =>
  fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      return caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, copy))
        .then(() => response);
    }
    return response;
  });

/* Offline-Navigation: erst die exakt angefragte URL, dann die 404-Seite,
 * zuletzt die Startseite — nie ein weißer Screen. */
const offlineNavigation = (request) =>
  caches
    .match(request)
    .then((hit) => hit || caches.match('404.html'))
    .then((hit) => hit || caches.match('index.html'))
    .then((hit) => hit || Response.error());

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }
  /* Nur der eigenen Origin: fremde Requests (Demos, GitHub) gehen
   * unbehelligt ins Netz. */
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fromNetwork(request).catch(() => offlineNavigation(request)));
    return;
  }

  event.respondWith(
    fromNetwork(request).catch(() =>
      caches.match(request).then((hit) => hit || Response.error())
    )
  );
});
