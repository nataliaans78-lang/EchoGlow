const CACHE_NAME = "echoglow-v9";
const CACHE_PREFIX = CACHE_NAME.slice(0, CACHE_NAME.lastIndexOf("-") + 1);

const APP_SHELL = [
  "./",
  "./index.html",
  "./app/",
  "./app/index.html",
  "./style.css",
  "./js/main.js",
  "./js/config.js",
  "./app/style/style.css",
  "./app/js/main.js",
  "./app/js/config.js",
  "./app/js/runtime/appRuntime.js",
  "./app/js/runtime/appContext.js",
  "./app/js/runtime/appConstants.js",
  "./app/js/runtime/docsRuntime.js",
  "./app/js/runtime/domRefs.js",
  "./app/js/audio/audioEngine.js",
  "./app/js/audio/equalizer.js",
  "./app/js/audio/visualizer.js",
  "./app/js/input/shortcuts.js",
  "./app/js/persistence/storage.js",
  "./app/js/playlist/playlist.js",
  "./app/js/ui/controls.js",
  "./app/audioWorker.js",
  "./app/icons/play.svg",
  "./app/icons/pause.svg",
  "./app/icons/next.svg",
  "./app/icons/previous.svg",
  "./app/icons/shuffle.svg",
  "./app/icons/repeat.svg",
  "./app/icons/eq.svg",
  "./app/icons/return.svg",
  "./app/icons/down.svg",
  "./app/icons/up.svg",
  "./app/icons/upload.svg",
  "./app/icons/search.svg",
  "./app/icons/clear-all.svg",
  "./manifest.webmanifest",
  "./favicon.png"
];

const MEDIA_RE = /\.(aac|flac|gif|m4a|mp3|mp4|ogg|wav|webm)$/i;
const STATIC_RE = /\.(css|html|ico|js|json|png|svg|webmanifest)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function fetchAndStore(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cachedOrNetwork(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  return fetchAndStore(request);
}

async function handleNavigation(request, url) {
  try {
    return await fetchAndStore(request);
  } catch (_) {
    const fallback = url.pathname.includes("/app") ? "./app/index.html" : "./index.html";
    return caches.match(fallback);
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (request.headers.has("range")) return;
  if (MEDIA_RE.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(cachedOrNetwork(request));
  }
});
