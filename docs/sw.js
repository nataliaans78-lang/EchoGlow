const CACHE_PREFIX = "echoglow-";
const CACHE_NAME = `${CACHE_PREFIX}v6`;
const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const withScope = (path) => `${scopePath}${path}`;

const ASSETS = [
  withScope("/"),
  withScope("/index.html"),
  withScope("/style.css"),
  withScope("/js/main.js"),
  withScope("/js/config.js"),
  withScope("/favicon.png"),
  withScope("/manifest.webmanifest"),
  withScope("/icons/icon-192.png"),
  withScope("/icons/icon-512.png"),
  withScope("/icons/icon-512-maskable.png"),
  withScope("/assets/image/ScreenShot_1.png"),
  withScope("/app/"),
  withScope("/app/index.html"),
  withScope("/app/style/style.css"),
  withScope("/app/audioWorker.js"),
  withScope("/app/js/main.js"),
  withScope("/app/js/config.js"),
  withScope("/app/js/audio/audioEngine.js"),
  withScope("/app/js/audio/equalizer.js"),
  withScope("/app/js/audio/visualizer.js"),
  withScope("/app/js/input/shortcuts.js"),
  withScope("/app/js/persistence/storage.js"),
  withScope("/app/js/playlist/playlist.js"),
  withScope("/app/js/runtime/appConstants.js"),
  withScope("/app/js/runtime/appContext.js"),
  withScope("/app/js/runtime/appRuntime.js"),
  withScope("/app/js/runtime/docsRuntime.js"),
  withScope("/app/js/runtime/domRefs.js"),
  withScope("/app/js/ui/controls.js"),
  withScope("/app/icons/clear-all.svg"),
  withScope("/app/icons/down.svg"),
  withScope("/app/icons/eq.svg"),
  withScope("/app/icons/next.svg"),
  withScope("/app/icons/pause.svg"),
  withScope("/app/icons/play.svg"),
  withScope("/app/icons/previous.svg"),
  withScope("/app/icons/repeat.svg"),
  withScope("/app/icons/return.svg"),
  withScope("/app/icons/search.svg"),
  withScope("/app/icons/shuffle.svg"),
  withScope("/app/icons/up.svg"),
  withScope("/app/icons/upload.svg")
];

const STATIC_PATHS = new Set(ASSETS);

function offlineResponse() {
  return new Response("Offline", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

async function networkFirst(request, fallbackPath) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(fallbackPath, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(fallbackPath)) || offlineResponse();
  }
}

async function cacheFirst(request, cachePath) {
  const cached = await caches.match(cachePath);
  if (cached) return cached;

  try {
    return await fetch(request);
  } catch (_) {
    return offlineResponse();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (request.mode === "navigate") {
    const appRoot = withScope("/app");
    const isAppNavigation = url.pathname === appRoot || url.pathname.startsWith(`${appRoot}/`);
    const fallbackPath = withScope(isAppNavigation ? "/app/index.html" : "/index.html");
    event.respondWith(networkFirst(request, fallbackPath));
    return;
  }

  if (!STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(cacheFirst(request, url.pathname));
});
