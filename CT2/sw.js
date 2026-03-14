// The version of the cache.
const VERSION = "v1";

// The name of the cache
const CACHE_NAME = `period-tracker-${VERSION}`;

// The static resources that the app needs to function.
const APP_STATIC_RESOURCES = [
  // The dot-slash takes care of index.html
  "./",
  "./app.js",
  "./auth.js",
  "./style.css",
  // If we don't include the manifest in the cache,
  // it gets a 404 after reloading the page and the app becomes uninstallable
  "./cycletracker.json",
  // The app icon should be listed here for installation on iOS and Android
  "./icons/tire.svg",
  // This is a higher-resolution icon inherited from upstream that currently isn't used
  "./icons/wheel.svg",
];

// On install, cache the static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RESOURCES);
    })()
  );
});

// delete old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
      await clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // On fetch, intercept only same-origin requests.
  // Cross-origin requests (e.g. Supabase CDN) must go to the network or auth breaks on reload.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // As a single page app, direct app to always go to cached home page.
  if (event.request.mode === "navigate") {
    event.respondWith(caches.match("./"));
    return;
  }

  // For same-origin requests, serve from cache or 404.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response(null, { status: 404 });
    })()
  );
});
