/* Eldritch Garden — service worker.

   Offline is a hard requirement: the phone is propped beside a laptop for half an
   hour and may have no signal for any of it. Once installed, the app must open
   and run a full session with the radio off.

   Bump CACHE whenever index.html changes. The browser re-fetches this file on
   navigation, sees the new constant, and the activate handler drops the old
   cache. Forget to bump it and users keep running the previous build. */
const CACHE = 'eldritch-garden-v2';

const SHELL = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', e => {
  // addAll rejects the whole batch if any single request fails, which would leave
  // the app with no cache at all. Individual puts degrade instead: whatever
  // succeeded is still there.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigations go network-first so a new build lands the moment the phone is
  // online, falling back to cache when it is not. A 30-minute session makes the
  // extra round trip on open irrelevant, and cache-first here would strand the
  // user on an old version until the next CACHE bump.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('index.html').then(r => r || caches.match('.')))
    );
    return;
  }

  // Everything else — icons, manifest, the Google font CSS and its woff2 files —
  // is cache-first with a background refresh. Fonts are cross-origin and come
  // back opaque; they still cache and still render.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
