const CACHE_NAME = "spin-brickell-v204";
const TILE_VERSION = "176";
const TILE_CACHE_NAME = `spin-brickell-tiles-v${TILE_VERSION}`;
const TILE_MANIFEST_URL = `./tiles/offline/manifest.json?v=${TILE_VERSION}`;
const ROUTING_GRAPH_MANIFEST_URL = `./routing_graph/manifest.json?v=${TILE_VERSION}`;
const APP_ASSETS = [
  "./",
  "./index.html",
  "./vendor/leaflet/leaflet.css?v=175",
  "./vendor/leaflet/leaflet.js?v=175",
  "./vendor/leaflet/images/marker-icon.png",
  "./vendor/leaflet/images/marker-icon-2x.png",
  "./vendor/leaflet/images/marker-shadow.png",
  "./styles.css?v=198",
  "./app.js?v=202",
  ROUTING_GRAPH_MANIFEST_URL,
  TILE_MANIFEST_URL,
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "../state.json",
];

async function getOfflineTileManifest() {
  let response = null;
  try {
    response = await fetch(new Request(TILE_MANIFEST_URL, { cache: "no-store" }));
  } catch (error) {
    response = await caches.match(TILE_MANIFEST_URL, { ignoreSearch: true });
  }
  if (!response?.ok) {
    response = await caches.match(TILE_MANIFEST_URL, { ignoreSearch: true });
  }
  if (!response?.ok) return [];
  const manifest = await response.json();
  return Array.isArray(manifest.tiles) ? manifest.tiles : [];
}

async function cacheOfflineTiles(cache) {
  const tiles = await getOfflineTileManifest();
  let cached = 0;
  let index = 0;
  while (index < tiles.length) {
    const batchSize = offlineTileCacheSettings.batchSize;
    const throttleMs = offlineTileCacheSettings.throttleMs;
    const chunk = tiles.slice(index, index + batchSize);
    const results = await Promise.allSettled(chunk.map((tilePath) => cacheOfflineTile(cache, tilePath)));
    cached += results.filter((result) => result.status === "fulfilled" && result.value).length;
    index += batchSize;
    if (throttleMs) await wait(throttleMs);
  }
  return { cached, total: tiles.length };
}

async function getRoutingGraphManifest() {
  let response = null;
  try {
    response = await fetch(new Request(ROUTING_GRAPH_MANIFEST_URL, { cache: "no-store" }));
  } catch (error) {
    response = await caches.match(ROUTING_GRAPH_MANIFEST_URL, { ignoreSearch: true });
  }
  if (!response?.ok) {
    response = await caches.match(ROUTING_GRAPH_MANIFEST_URL, { ignoreSearch: true });
  }
  if (!response?.ok) return [];
  const manifest = await response.json();
  const chunks = manifest.chunks || {};
  return [...(chunks.nodes || []), ...(chunks.edges || [])].map((chunkPath) => `./routing_graph/${chunkPath}`);
}

async function cacheRoutingGraphChunks(cache) {
  const chunks = await getRoutingGraphManifest();
  await Promise.all(chunks.map((chunkPath) => cache.add(chunkPath)));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let offlineTileCachePromise = null;
const offlineTileCacheSettings = {
  batchSize: 1,
  throttleMs: 500,
};

function startOfflineTileCache(options = {}) {
  updateOfflineTileCacheSettings(options);
  if (!offlineTileCachePromise) {
    offlineTileCachePromise = caches.open(TILE_CACHE_NAME).then((cache) => cacheOfflineTiles(cache));
  }
  return offlineTileCachePromise;
}

function updateOfflineTileCacheSettings(options = {}) {
  const requestedBatchSize = Number(options.batchSize);
  const requestedThrottleMs = Number(options.throttleMs);
  const batchSize = Math.max(
    1,
    Math.min(Number.isFinite(requestedBatchSize) ? requestedBatchSize : offlineTileCacheSettings.batchSize, 24)
  );
  const throttleMs = Math.max(
    0,
    Number.isFinite(requestedThrottleMs) ? requestedThrottleMs : offlineTileCacheSettings.throttleMs
  );
  offlineTileCacheSettings.batchSize = Math.max(offlineTileCacheSettings.batchSize, batchSize);
  offlineTileCacheSettings.throttleMs = Math.min(offlineTileCacheSettings.throttleMs, throttleMs);
}

async function cacheOfflineTile(cache, tilePath) {
  const tileUrl = `./tiles/${tilePath}?v=${TILE_VERSION}`;
  const tileCacheKey = getOfflineTileCacheKey(tilePath);
  const cached = await cache.match(tileCacheKey);
  if (cached) return true;
  const request = new Request(tileUrl, { cache: "no-store" });
  const response = await fetchWithTimeout(request, 8000);
  if (response.ok) {
    await cache.put(tileCacheKey, response);
    return true;
  }
  return false;
}

function getOfflineTileCacheKey(tilePath) {
  return `./tiles/${tilePath}`;
}

function getOfflineTileCacheKeyFromUrl(url) {
  if (url.origin !== self.location.origin) return null;
  const marker = "/tiles/";
  const index = url.pathname.indexOf(marker);
  if (index === -1) return null;
  const tilePath = url.pathname.slice(index + marker.length);
  return tilePath.startsWith("offline/") ? getOfflineTileCacheKey(tilePath) : null;
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch (error) {
    return new Response("", { status: 504, statusText: "Tile cache timeout" });
  } finally {
    clearTimeout(timeoutId);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== TILE_CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(new Request(request, { cache: "no-store" }))
      .then((response) => {
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const clone = response.clone();
          const url = new URL(request.url);
          const tileCacheKey = getOfflineTileCacheKeyFromUrl(url);
          const cacheName = tileCacheKey ? TILE_CACHE_NAME : CACHE_NAME;
          caches.open(cacheName).then((cache) => cache.put(tileCacheKey || request, clone));
        }
        return response;
      })
      .catch(() => getCachedResponse(request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_OFFLINE_TILES") {
    event.waitUntil(startOfflineTileCache({
      batchSize: event.data.batchSize,
      throttleMs: event.data.throttleMs,
    }));
  }
});

async function getCachedResponse(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return undefined;

  const tileCacheKey = getOfflineTileCacheKeyFromUrl(url);
  if (tileCacheKey) {
    const tileCache = await caches.open(TILE_CACHE_NAME);
    const cachedTile = await tileCache.match(tileCacheKey);
    if (cachedTile) return cachedTile;
  }

  if (request.mode === "navigate") {
    return caches.match("./index.html", { ignoreSearch: true }) || caches.match("./", { ignoreSearch: true });
  }

  return caches.match(request, { ignoreSearch: true });
}
