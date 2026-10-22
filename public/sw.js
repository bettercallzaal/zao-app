// The ZAO app service worker: offline support and caching
const CACHE_NAME = 'zaoos-v4';
const IS_LOOPBACK = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);
const OFFLINE_URL = '/offline';

// Bound immutable/offline assets and evict the oldest insertions.
// Member pages and API responses never enter this cache.
const ASSET_CACHE_MAX_ENTRIES = 150;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

// Static assets to pre-cache on install.
// Note: icon-1024.png and logo.png are byte-identical; the OS fetches
// icon-1024.png at PWA install time, so we only precache logo.png here.
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/logo.png',
];

// Install: pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    IS_LOOPBACK ? Promise.resolve() : caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('zaoos-') && (IS_LOOPBACK || key !== CACHE_NAME))
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// Cache only immutable build assets and the explicit public offline shell.
// Never cache API responses, authenticated documents, RSC payloads or other origins.
self.addEventListener('fetch', (event) => {
  if (IS_LOOPBACK) return;
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const isBuildAsset = url.pathname.startsWith('/_next/static/');
  const isOfflineAsset = PRECACHE_ASSETS.includes(url.pathname);
  if (!isBuildAsset && !isOfflineAsset) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const policy = response.headers.get('Cache-Control') || '';
        if (response.ok && response.type === 'basic' && !/private|no-store/i.test(policy)) {
          const clone = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
            await cache.put(request, clone);
            await trimCache(CACHE_NAME, ASSET_CACHE_MAX_ENTRIES);
          }));
        }
        return response;
      });
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'The ZAO app', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'zaoos-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'The ZAO app', options));
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
