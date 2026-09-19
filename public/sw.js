// ============================================
// SpotFish! — Service Worker
// ============================================
// Strategies:
// - Pages/API: network-first (fall back to cache offline)
// - Map tiles: cache-first (immutable, max 200 entries)
// - Static assets: stale-while-revalidate

const CACHE_VERSION = 'spotfish-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const TILES_CACHE = `${CACHE_VERSION}-tiles`;
const OFFLINE_URL = '/offline';

// Tiles + static assets patterns
const TILE_HOSTS = ['tile.openstreetmap.org', 'server.arcgisonline.com', 'basemaps.cartocdn.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Map tiles — cache-first (immutable, trim to 200)
  if (TILE_HOSTS.some((h) => url.hostname.endsWith(h))) {
    event.respondWith(
      caches.open(TILES_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) {
            cache.put(request, res.clone());
            // Trim old tiles
            const keys = await cache.keys();
            if (keys.length > 200) {
              for (let i = 0; i < keys.length - 200; i++) cache.delete(keys[i]);
            }
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 2. Static assets (/_next/static) — stale-while-revalidate
  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. API GET — network-only, but don't break when offline (fail fast)
  if (url.pathname.startsWith('/api/')) {
    return; // default browser behavior
  }

  // 4. Pages — network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        return (
          offline ||
          new Response('Anda sedang offline. Sambungkan internet untuk memuat halaman ini.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })
  );
});
