const CACHE_NAME = 'physiobill-static-v3';
const CACHE_PREFIX = 'physiobill-static-';
const INSTALL_ASSETS = ['/offline.html', '/favicon.svg', '/manifest.webmanifest'];
const STATIC_PATHS = new Set(INSTALL_ASSETS);
const CACHEABLE_BUILD_DESTINATIONS = new Set(['script', 'style', 'font', 'image']);

function responseAllowsStaticCaching(response) {
  if (!response.ok || response.type !== 'basic') return false;

  const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  if (response.headers.get('vary') === '*') return false;

  return true;
}

function isApprovedStaticRequest(request, url) {
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (request.headers.has('authorization')) return false;

  if (STATIC_PATHS.has(url.pathname)) return true;

  return (
    url.pathname.startsWith('/assets/') &&
    CACHEABLE_BUILD_DESTINATIONS.has(request.destination)
  );
}

async function cacheInstallAssets() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    INSTALL_ASSETS.map(async (assetPath) => {
      const request = new Request(assetPath, { cache: 'reload' });
      const response = await fetch(request);

      if (!responseAllowsStaticCaching(response)) return;
      await cache.put(request, response.clone());
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheInstallAssets());
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

  if (!isApprovedStaticRequest(request, url)) return;

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
