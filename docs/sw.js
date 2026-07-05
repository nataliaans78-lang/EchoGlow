const CACHE_NAME = "echoglow-v7";
const CACHE_PREFIX = CACHE_NAME.slice(0, CACHE_NAME.lastIndexOf("-") + 1);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// Intentionally no fetch handler: all requests go directly to the network.
