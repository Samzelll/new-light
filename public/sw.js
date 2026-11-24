const CACHE_NAME = 'opinion-net-static-v3';
const OFFLINE_URLS = ['/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Never intercept Next.js build chunks, data routes, HMR, or API routes —
  // stale SW caches on hashed JS chunks cause "Unexpected token '<'" on updates.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__')
  ) {
    return;
  }

  // Static non-Next assets (icons, images, fonts, manifest): Network-first with MIME guard
  const isStaticAsset = Boolean(
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|webmanifest)$/)
  );

  if (isStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const contentType = networkResponse.headers.get('content-type') || '';
          if (
            networkResponse.ok &&
            networkResponse.type === 'basic' &&
            !contentType.includes('text/html')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});
