const CACHE_NAME = 'physiobill-static-v2';
const CACHE_PREFIX = 'physiobill-static-';
const INSTALL_ASSETS = ['/offline.html', '/favicon.svg', '/manifest.webmanifest'];
const STATIC_PATHS = new Set(['/offline.html', '/favicon.svg', '/manifest.webmanifest']);
const CACHEABLE_BUILD_DESTINATIONS = new Set(['script', 'style', 'font', 'image']);

function responseAllowsStaticCaching(response) {
  if (!response.ok || response.type !== 'basic') return false;

  const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  if (response.headers.get('vary') === '*') return false;

  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(INSTALL_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match('/offline.html');
        return offline || Response.error();
      }),
    );
    return;
  }

  const isBuildAsset =
    url.pathname.startsWith('/assets/') &&
    CACHEABLE_BUILD_DESTINATIONS.has(request.destination);
  const isExplicitStatic = STATIC_PATHS.has(url.pathname);
  if (!isBuildAsset && !isExplicitStatic) return;

  if (request.headers.has('authorization')) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;

      const response = await fetch(request);
      if (responseAllowsStaticCaching(response)) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
