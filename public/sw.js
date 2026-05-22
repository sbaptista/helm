const SHELL = 'helm-shell-v5';
const ASSETS = 'helm-assets-v5';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
);

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept API calls — always go to the network
  if (url.pathname.startsWith('/api/')) return;

  // Immutable Next.js static chunks — cache forever on first fetch
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(ASSETS).then((cache) =>
        cache.match(request).then((hit) =>
          hit || fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // Navigation requests — network first, fall back to cache only if offline
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.open(SHELL).then((cache) =>
        fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cache.match(request))
      )
    );
  }
});
