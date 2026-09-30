const CACHE_NAME = 'reign-v3';
const APP_SHELL = [
  '/Goal-tracker/',
  '/Goal-tracker/index.html',
  '/Goal-tracker/manifest.webmanifest',
  '/Goal-tracker/icon-192.png',
  '/Goal-tracker/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    // Bypass the browser's HTTP cache as well as this service worker's cache.
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request) || (request.mode === 'navigate' ? caches.match('/Goal-tracker/index.html') : Response.error());
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // HTML, JavaScript, and CSS are always network-first so a reopened PWA sees a deploy.
  event.respondWith(networkFirst(event.request));
});
