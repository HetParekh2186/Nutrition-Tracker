// Mise service worker: installable app, and today's diary readable offline.
//
// - Build assets (/_next/static) are immutable: cache first.
// - The Today page and the diary and summary APIs: network first, falling
//   back to the last copy saved on this device.
// - Other pages offline get a short notice that links to Today.
// The page asks the worker to drop saved copies on sign out.

const VERSION = "v1";
const STATIC = `mise-static-${VERSION}`;
const DATA = `mise-data-${VERSION}`;
const OFFLINE_PAGES = ["/today"];
const OFFLINE_APIS = ["/api/diary", "/api/summary/day"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, DATA]);
      for (const key of await caches.keys()) {
        if (key.startsWith("mise-") && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-data") event.waitUntil(caches.delete(DATA));
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(DATA);
  try {
    const res = await fetch(request);
    // Only keep real pages, not redirects to the login screen.
    if (res.ok && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit =
      (await cache.match(request)) ??
      (fallbackUrl ? await cache.match(fallbackUrl) : undefined);
    if (hit) return hit;
    throw err;
  }
}

function offlineNotice() {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Mise</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#f7f4ee;color:#1a1814;display:grid;place-items:center;min-height:100vh;margin:0;padding:0 16px}@media (prefers-color-scheme:dark){body{background:#12110f;color:#f2eee6}}a{color:inherit}</style><main><h1 style="font-weight:500">You are offline</h1><p>This page needs a connection. <a href="/today">Today</a> is saved on this device.</p></main></html>`,
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    if (OFFLINE_PAGES.includes(url.pathname)) {
      event.respondWith(
        networkFirst(request, url.pathname).catch(() => offlineNotice()),
      );
    } else {
      event.respondWith(fetch(request).catch(() => offlineNotice()));
    }
    return;
  }
  if (OFFLINE_APIS.includes(url.pathname)) {
    event.respondWith(networkFirst(request));
  }
});
