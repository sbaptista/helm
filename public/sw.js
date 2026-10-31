const SHELL = 'helm-shell-v6';
const ASSETS = 'helm-assets-v6';

// Pages kept for offline reading (docs/offline-editing-plan.md, Phase A).
// The dashboard and trip pages are server-rendered with all their data, so a
// cached copy of the page is a readable copy of the trip.
const READABLE = [/^\/advisor\/dashboard\/?$/, /^\/advisor\/trips\/[^/]+\/?$/];

// Background refreshes of a page are skipped if it was cached this recently.
const WARM_INTERVAL_MS = 2 * 60 * 1000;
// After a save, wait for it to land before re-caching the page it came from.
const REWARM_DELAY_MS = 4000;

const lastCached = new Map(); // page key -> time cached
const pendingRewarm = new Map(); // page key -> { timer, resolve }

// Cache key for a readable page: its path, without the query, so
// /advisor/trips/x?tab=flights opens the cached /advisor/trips/x offline.
function pageKey(href) {
  let url;
  try { url = new URL(href, self.location.origin); } catch { return null; }
  if (url.origin !== self.location.origin) return null;
  if (!READABLE.some((r) => r.test(url.pathname))) return null;
  return url.origin + url.pathname;
}

function isCacheablePage(res) {
  return res.ok && !res.redirected && (res.headers.get('content-type') || '').includes('text/html');
}

// Cache the page's own scripts and styles too, so a page cached in the
// background (never opened on this device) still runs offline.
async function cacheStaticRefs(text) {
  const refs = new Set(text.match(/\/_next\/static\/[^"'\s)\\]+/g) || []);
  if (refs.size === 0) return;
  const cache = await caches.open(ASSETS);
  await Promise.all([...refs].map(async (path) => {
    const request = new Request(path);
    if (await cache.match(request)) return;
    try {
      const res = await fetch(request);
      if (!res.ok) return;
      if (path.endsWith('.css')) await cacheStaticRefs(await res.clone().text());
      await cache.put(request, res);
    } catch {}
  }));
}

async function storePage(key, res) {
  const cache = await caches.open(SHELL);
  await cache.put(key, res.clone());
  lastCached.set(key, Date.now());
  await cacheStaticRefs(await res.text());
}

async function warm(key, force) {
  if (!force && Date.now() - (lastCached.get(key) || 0) < WARM_INTERVAL_MS) return;
  lastCached.set(key, Date.now()); // claim it, so overlapping requests don't double-fetch
  try {
    const res = await fetch(key, { credentials: 'same-origin', cache: 'no-store' });
    if (isCacheablePage(res)) await storePage(key, res);
  } catch {
    lastCached.delete(key);
  }
}

function rewarmSoon(href) {
  const key = pageKey(href);
  if (!key) return Promise.resolve();
  const prev = pendingRewarm.get(key);
  if (prev) { clearTimeout(prev.timer); prev.resolve(); }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRewarm.delete(key);
      warm(key, true).finally(resolve);
    }, REWARM_DELAY_MS);
    pendingRewarm.set(key, { timer, resolve });
  });
}

const OFFLINE_FALLBACK = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Helm — offline</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0D1E35;color:#E8E2D8;font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box">
<div><p style="font-size:20px;margin:0 0 12px">You're offline</p>
<p style="font-size:17px;line-height:1.5;margin:0;opacity:.85">This page hasn't been saved on this device yet.<br>Open it once while online and it will be available offline.</p></div>
</body></html>`;

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

// { type: 'warm', paths: [...] } from useOfflineWarmup: refresh the cached
// copies of these pages while online.
self.addEventListener('message', (e) => {
  const data = e.data;
  if (!data || data.type !== 'warm' || !Array.isArray(data.paths)) return;
  const keys = data.paths.map(pageKey).filter(Boolean);
  e.waitUntil(Promise.all(keys.map((key) => warm(key, false))));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept API calls — always go to the network. A save from a
  // readable page re-caches that page shortly after, so the offline copy
  // includes the change.
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET' && request.referrer) e.waitUntil(rewarmSoon(request.referrer));
    return;
  }

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
    const key = pageKey(request.url);
    e.respondWith(
      fetch(request).then((res) => {
        if (key && isCacheablePage(res)) {
          e.waitUntil(storePage(key, res.clone()));
        } else if (res.ok && !res.redirected) {
          const copy = res.clone();
          e.waitUntil(caches.open(SHELL).then((cache) => cache.put(request, copy)));
        }
        return res;
      }).catch(async () => {
        const cache = await caches.open(SHELL);
        // ignoreVary: Next varies pages on router headers a plain navigation never sends.
        const hit = (key && await cache.match(key, { ignoreVary: true })) || await cache.match(request, { ignoreVary: true });
        return hit || new Response(OFFLINE_FALLBACK, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      })
    );
  }
});
