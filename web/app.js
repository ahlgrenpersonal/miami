const STATE_URL = "../state.json";
const ROUTING_GRAPH_URL = "routing_graph.json";
const ROUTING_GRAPH_MANIFEST_URL = "routing_graph/manifest.json";
const HOME_PLACE_ID = "place_id_panorama_tower";
const OFFLINE_TILE_VERSION = "171";
const HOME_RADIUS_METERS = 805;
const DEFAULT_HOME_ZOOM = 15;
const DEFAULT_MAX_SNAP_DISTANCE_METERS = 500;
const OFFLINE_TILE_BOUNDS = [[25.660, -80.275], [25.835, -80.100]];
const QA_CANVAS_CAPTURE_DELAY_MS = 1200;
const ROUTING_PROFILES = {
  shortest: {
    label: "Shortest",
    speedKmh: 5,
    scoreWeights: {},
    minMultiplier: 1,
    maxMultiplier: 1,
    hardPenalties: {},
    fixedPenaltiesM: {},
  },
  scenic: {
    label: "Scenic",
    speedKmh: 5,
    scoreWeights: { waterside: 0.25, waterfront: 0.3, park_path: 0.45, car_free: 0.1, scenic: 0.18, kid_scooter: 0.02, traffic_stress: -0.18 },
    minMultiplier: 0.35,
    maxMultiplier: 2.6,
    hardPenalties: {},
    fixedPenaltiesM: { traffic_crossing: 24, roadside_baywalk: 4 },
  },
  kid_scooter: {
    label: "Kid scooter",
    speedKmh: 10,
    scoreWeights: { kid_scooter: 0.78, scooter: 0.22, waterfront: 0.03, traffic_stress: -0.26 },
    minMultiplier: 0.35,
    maxMultiplier: 3,
    hardPenalties: { "highway=steps": 1.18 },
    fixedPenaltiesM: { traffic_crossing: 42 },
  },
};
const TAG_FILTERS = [
  { tag: "food", label: "Food" },
  { tag: "dessert", label: "Dessert" },
  { tag: "supermarket", label: "Supermarket" },
  { tag: "schools", label: "Schools" },
  { tag: "playgrounds", label: "Playgrounds" },
  { tag: "parks", label: "Parks" },
  { tag: "metromover", label: "Metromover" },
  { tag: "indoors", label: "Indoors" },
];
const FOOD_FILTER_TAGS = new Set([
  "american_restaurant",
  "asian_restaurant",
  "bakery",
  "dessert",
  "food",
  "grill",
  "ice_cream",
  "mediterranean_restaurant",
  "mexican_restaurant",
  "pizza_restaurant",
  "restaurant",
  "sushi_restaurant",
  "upscale_restaurant_bar",
]);
const DESSERT_FILTER_TAGS = new Set(["bakery", "dessert", "ice_cream"]);
const SUPERMARKET_FILTER_TAGS = new Set(["supermarket"]);
const SCHOOL_FILTER_TAGS = new Set(["academy", "elementary_school", "montessori_school", "preschool", "school"]);
const PLAYGROUND_FILTER_TAGS = new Set(["playground"]);
const PARK_FILTER_TAGS = new Set(["beach_park", "dog_park", "nature_preserve", "park"]);
const METROMOVER_FILTER_TAGS = new Set(["metromover", "metromover_station"]);
const INDOOR_FILTER_TAGS = new Set(["childrens_museum", "indoors", "science_museum"]);

const app = {
  state: null,
  places: [],
  markers: new Map(),
  selectedId: null,
  activeTags: new Set(),
  search: "",
  radiusOnly: false,
  placesPanelCollapsed: false,
  routeFromId: null,
  routeToId: null,
  travelMode: "shortest",
  routingGraph: null,
  routingGraphPromise: null,
  routingGraphStatus: "idle",
  routeAdjacency: null,
  routeNodes: [],
  routeRequestId: 0,
};

window.spinApp = app;

const dom = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindDom();
  renderTagFilters();
  bindEvents();
  await loadState();
  initMap();
  renderAll();
  scheduleCanvasQaCapture();
  registerServiceWorker();
}

function bindDom() {
  dom.map = document.querySelector("#map");
  dom.placeCount = document.querySelector("#place-count");
  dom.visibleCount = document.querySelector("#visible-count");
  dom.searchInput = document.querySelector("#search-input");
  dom.placesPanel = document.querySelector("#places-panel");
  dom.togglePlacesPanel = document.querySelector("#toggle-places-panel");
  dom.tagFilters = document.querySelector("#tag-filters");
  dom.radiusFilter = document.querySelector("#radius-filter");
  dom.placeList = document.querySelector("#place-list");
  dom.resetFilters = document.querySelector("#reset-filters");
  dom.detailSheet = document.querySelector("#detail-sheet");
  dom.closeDetail = document.querySelector("#close-detail");
  dom.detailKicker = document.querySelector("#detail-kicker");
  dom.detailTitle = document.querySelector("#detail-title");
  dom.routeHome = document.querySelector("#route-home");
  dom.routeFrom = document.querySelector("#route-from");
  dom.routeTo = document.querySelector("#route-to");
  dom.modeShortest = document.querySelector("#mode-shortest");
  dom.modeScenic = document.querySelector("#mode-scenic");
  dom.modeScooter = document.querySelector("#mode-scooter");
  dom.routeStatus = document.querySelector("#route-status");
  dom.clearRoute = document.querySelector("#clear-route");
}

function bindEvents() {
  dom.searchInput.addEventListener("input", () => {
    app.search = normalizeSearchText(dom.searchInput.value);
    renderAll();
    focusSearchMatch();
  });

  dom.radiusFilter.addEventListener("change", () => {
    app.radiusOnly = dom.radiusFilter.checked;
    renderAll();
  });

  dom.togglePlacesPanel.addEventListener("click", () => {
    setPlacesPanelCollapsed(!app.placesPanelCollapsed);
  });

  dom.resetFilters.addEventListener("click", () => {
    app.activeTags.clear();
    app.search = "";
    app.radiusOnly = false;
    app.selectedId = null;
    dom.searchInput.value = "";
    dom.radiusFilter.checked = false;
    for (const button of dom.tagFilters.querySelectorAll(".chip")) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    }
    dom.detailSheet.classList.remove("is-open");
    renderAll();
  });

  dom.closeDetail.addEventListener("click", () => {
    app.selectedId = null;
    dom.detailSheet.classList.remove("is-open");
    renderMarkers();
    renderList();
  });

  dom.routeFrom.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeFromId = app.selectedId;
    renderRoute();
  });

  dom.routeHome.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeFromId = HOME_PLACE_ID;
    app.routeToId = app.selectedId;
    renderRoute();
  });

  dom.routeTo.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeToId = app.selectedId;
    renderRoute();
  });

  dom.modeShortest.addEventListener("click", () => setTravelMode("shortest"));
  dom.modeScenic.addEventListener("click", () => setTravelMode("scenic"));
  dom.modeScooter.addEventListener("click", () => setTravelMode("kid_scooter"));

  dom.clearRoute.addEventListener("click", () => {
    app.routeFromId = null;
    app.routeToId = null;
    renderRoute();
  });
}

function setPlacesPanelCollapsed(isCollapsed) {
  app.placesPanelCollapsed = isCollapsed;
  dom.placesPanel.classList.toggle("is-collapsed", isCollapsed);
  dom.togglePlacesPanel.textContent = isCollapsed ? "+" : "-";
  dom.togglePlacesPanel.title = isCollapsed ? "Expand places" : "Collapse places";
  dom.togglePlacesPanel.setAttribute("aria-label", isCollapsed ? "Expand places" : "Collapse places");
  dom.togglePlacesPanel.setAttribute("aria-expanded", String(!isCollapsed));
  window.setTimeout(() => app.map?.invalidateSize(), 120);
}

function renderTagFilters() {
  dom.tagFilters.innerHTML = "";
  for (const filter of TAG_FILTERS) {
    const button = document.createElement("button");
    button.className = `chip chip-${filter.tag}`;
    button.type = "button";
    button.textContent = filter.label;
    button.dataset.tag = filter.tag;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (app.activeTags.has(filter.tag)) {
        app.activeTags.delete(filter.tag);
      } else {
        app.activeTags.add(filter.tag);
      }
      button.classList.toggle("is-active", app.activeTags.has(filter.tag));
      button.setAttribute("aria-pressed", String(app.activeTags.has(filter.tag)));
      renderAll();
    });
    dom.tagFilters.appendChild(button);
  }
}

async function loadState() {
  const response = await fetch(STATE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${STATE_URL}`);
  }
  app.state = await response.json();
  app.places = Object.entries(app.state.places).map(([id, place]) => {
    const normalizedPlace = { id, ...place };
    normalizedPlace.filterTags = getFilterTags(normalizedPlace);
    normalizedPlace.searchText = getSearchText(normalizedPlace);
    return normalizedPlace;
  });
}

async function loadRoutingGraph() {
  try {
    app.routingGraphStatus = "loading";
    app.routingGraph = await fetchRoutingGraph();
    app.routeNodes = Object.entries(app.routingGraph.nodes || {}).map(([id, node]) => ({
      id,
      lat: node.lat,
      lon: node.lon,
      coordinates: [node.lat, node.lon],
    }));
    app.routeAdjacency = buildRouteAdjacency(app.routingGraph.edges || []);
    app.routingGraphStatus = "ready";
  } catch (error) {
    app.routingGraphStatus = "error";
    console.info("Local routing graph unavailable; direct route preview will be used.", error);
  }
}

function ensureRoutingGraph() {
  if (app.routingGraphStatus === "ready" || app.routingGraphStatus === "error") {
    return Promise.resolve();
  }
  if (!app.routingGraphPromise) {
    app.routingGraphPromise = loadRoutingGraph();
  }
  return app.routingGraphPromise;
}

async function fetchRoutingGraph() {
  const manifestResponse = await fetch(ROUTING_GRAPH_MANIFEST_URL, { cache: "no-store" });
  if (manifestResponse.ok) {
    return fetchChunkedRoutingGraph(await manifestResponse.json());
  }

  const response = await fetch(ROUTING_GRAPH_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${ROUTING_GRAPH_MANIFEST_URL} or ${ROUTING_GRAPH_URL}`);
  }
  return response.json();
}

async function fetchChunkedRoutingGraph(manifest) {
  const graph = {
    ...manifest,
    nodes: {},
    edges: [],
  };
  delete graph.chunks;

  const baseUrl = ROUTING_GRAPH_MANIFEST_URL.slice(0, ROUTING_GRAPH_MANIFEST_URL.lastIndexOf("/") + 1);
  for (const chunkPath of manifest.chunks?.nodes || []) {
    Object.assign(graph.nodes, await fetchRoutingGraphChunk(`${baseUrl}${chunkPath}`));
  }
  for (const chunkPath of manifest.chunks?.edges || []) {
    graph.edges.push(...await fetchRoutingGraphChunk(`${baseUrl}${chunkPath}`));
  }
  return graph;
}

async function fetchRoutingGraphChunk(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

function buildRouteAdjacency(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    addRouteEdge(adjacency, edge.from, edge.to, edge);
    addRouteEdge(adjacency, edge.to, edge.from, edge);
  }
  return adjacency;
}

function addRouteEdge(adjacency, fromId, toId, edge) {
  if (!adjacency.has(fromId)) adjacency.set(fromId, []);
  adjacency.get(fromId).push({ toId, edge });
}

function initMap() {
  const home = app.state.user_profile.home_base;
  const requestedView = getRequestedMapView();
  const initialCenter = requestedView.center || home;
  const initialZoom = requestedView.zoom || DEFAULT_HOME_ZOOM;
  app.map = L.map(dom.map, {
    zoomControl: false,
    preferCanvas: true,
    minZoom: 13,
    maxZoom: 19,
    maxBounds: OFFLINE_TILE_BOUNDS,
    maxBoundsViscosity: 0.75,
  }).setView(initialCenter, initialZoom);

  L.control.zoom({ position: "bottomright" }).addTo(app.map);

  L.tileLayer(`tiles/offline/{z}/{x}/{y}.svg?v=${OFFLINE_TILE_VERSION}`, {
    minZoom: 13,
    maxNativeZoom: 18,
    maxZoom: 19,
    bounds: OFFLINE_TILE_BOUNDS,
    noWrap: true,
    attribution: "OpenStreetMap contributors, offline extract",
  }).addTo(app.map);

  app.radiusCircle = L.circle(home, {
    radius: HOME_RADIUS_METERS,
    color: "#087f8c",
    weight: 2,
    fillColor: "#087f8c",
    fillOpacity: 0.08,
  }).addTo(app.map);

  app.selectedCircle = L.circle(home, {
    radius: 95,
    color: "#d95d39",
    weight: 4,
    fillColor: "#d95d39",
    fillOpacity: 0.16,
    opacity: 0,
    interactive: false,
  }).addTo(app.map);

  app.routeLine = L.polyline([], {
    color: "#d95d39",
    weight: 5,
    opacity: 0,
    dashArray: "8 8",
  }).addTo(app.map);

  for (const place of app.places) {
    const marker = L.marker(place.coordinates, {
      icon: getMarkerIcon(place),
      title: place.name,
    }).addTo(app.map);
    marker.bindPopup(getPopupHtml(place), {
      closeButton: false,
      offset: [0, -10],
      className: "spin-popup",
    });
    marker.on("click", () => selectPlace(place.id));
    app.markers.set(place.id, marker);
  }
}

function scheduleCanvasQaCapture() {
  if (new URLSearchParams(window.location.search).get("qa-canvas") !== "1") return;
  writeCanvasQaReport({ status: "pending" });
  app.map.whenReady(() => {
    window.setTimeout(() => {
      captureVisibleMapTiles()
        .then((report) => {
          writeCanvasQaReport({ status: "ready", ...report });
        })
        .catch((error) => {
          writeCanvasQaReport({ status: "error", message: error.message });
        });
    }, QA_CANVAS_CAPTURE_DELAY_MS);
  });
}

function writeCanvasQaReport(report) {
  let target = document.querySelector("#qa-canvas-report");
  if (!target) {
    target = document.createElement("script");
    target.id = "qa-canvas-report";
    target.type = "application/json";
    target.hidden = true;
    document.body.appendChild(target);
  }
  document.documentElement.dataset.canvasQaStatus = report.status;
  target.textContent = JSON.stringify(report);
}

async function captureVisibleMapTiles() {
  const mapRect = dom.map.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mapRect.width);
  canvas.height = Math.round(mapRect.height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#f1efe7";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const tileImages = [...dom.map.querySelectorAll("img.leaflet-tile")];
  await Promise.all(tileImages.map((image) => image.decode?.().catch(() => undefined)));

  const visibleTiles = [];
  const failedTiles = [];
  for (const image of tileImages) {
    const rect = image.getBoundingClientRect();
    const isVisible = rect.right > mapRect.left
      && rect.bottom > mapRect.top
      && rect.left < mapRect.right
      && rect.top < mapRect.bottom
      && rect.width > 0
      && rect.height > 0;
    if (!isVisible) continue;
    if (!image.complete || image.naturalWidth === 0) {
      failedTiles.push(image.currentSrc || image.src);
      continue;
    }
    context.drawImage(
      image,
      rect.left - mapRect.left,
      rect.top - mapRect.top,
      rect.width,
      rect.height,
    );
    visibleTiles.push(image.currentSrc || image.src);
  }

  const pixelSummary = summarizeCanvasPixels(context, canvas.width, canvas.height);
  return {
    mapSize: { width: canvas.width, height: canvas.height },
    visibleTileCount: visibleTiles.length,
    failedTileCount: failedTiles.length,
    failedTiles: failedTiles.slice(0, 6),
    tileVersionOk: visibleTiles.length > 0 && visibleTiles.every((src) => src.includes(`v=${OFFLINE_TILE_VERSION}`)),
    ...pixelSummary,
    pngDataUrl: canvas.toDataURL("image/png"),
  };
}

function summarizeCanvasPixels(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height).data;
  const colors = new Set();
  let nonBackground = 0;
  let water = 0;
  let sampled = 0;
  const stepX = Math.max(1, Math.floor(width / 100));
  const stepY = Math.max(1, Math.floor(height / 100));
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const index = (y * width + x) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const key = `${red},${green},${blue}`;
      colors.add(key);
      sampled += 1;
      if (key !== "241,239,231") nonBackground += 1;
      if (key === "173,215,225") water += 1;
    }
  }
  return {
    sampledPixels: sampled,
    uniqueSampledColors: colors.size,
    nonBackgroundSampleRatio: sampled ? Number((nonBackground / sampled).toFixed(4)) : 0,
    waterSampleRatio: sampled ? Number((water / sampled).toFixed(4)) : 0,
  };
}

function getMarkerIcon(place) {
  const classes = ["spin-marker"];
  if (place.id === HOME_PLACE_ID) {
    classes.push("is-home");
  } else if (place.filterTags.includes("dessert")) {
    classes.push("is-dessert");
  } else if (place.filterTags.includes("supermarket")) {
    classes.push("is-supermarket");
  } else if (place.filterTags.includes("schools")) {
    classes.push("is-school");
  } else if (place.filterTags.includes("food")) {
    classes.push("is-food");
  } else if (place.filterTags.includes("playgrounds")) {
    classes.push("is-playground");
  } else if (place.filterTags.includes("parks")) {
    classes.push("is-park");
  } else if (place.filterTags.includes("metromover")) {
    classes.push("is-metromover");
  } else if (place.filterTags.includes("indoors")) {
    classes.push("is-indoors");
  }
  if (place.id === app.selectedId) {
    classes.push("is-selected");
  }
  return L.divIcon({
    className: "",
    html: `<span class="${classes.join(" ")}"></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function renderAll() {
  renderMarkers();
  renderList();
  renderCounts();
}

function getVisiblePlaces() {
  return app.places.filter((place) => {
    const hasSearch = Boolean(app.search);
    if (!hasSearch && app.radiusOnly && (place.meta?.distance_from_home_m ?? Infinity) > HOME_RADIUS_METERS) return false;
    if (!hasSearch && app.activeTags.size > 0 && ![...app.activeTags].every((tag) => place.filterTags.includes(tag))) return false;
    if (app.search && !place.searchText.includes(app.search)) return false;
    return true;
  }).sort((a, b) => {
    const distanceA = a.meta?.distance_from_home_m ?? 0;
    const distanceB = b.meta?.distance_from_home_m ?? 0;
    return distanceA - distanceB || a.name.localeCompare(b.name);
  });
}

function renderMarkers() {
  const visibleIds = new Set(getVisiblePlaces().map((place) => place.id));
  for (const place of app.places) {
    const marker = app.markers.get(place.id);
    if (!marker) continue;
    marker.setIcon(getMarkerIcon(place));
    marker.setZIndexOffset(place.id === app.selectedId ? 1000 : 0);
    if (visibleIds.has(place.id)) {
      if (!app.map.hasLayer(marker)) marker.addTo(app.map);
    } else if (app.map.hasLayer(marker)) {
      marker.remove();
    }
  }
  renderSelectedCircle();
}

function renderList() {
  const visible = getVisiblePlaces();
  dom.placeList.innerHTML = "";
  for (const place of visible.slice(0, 80)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-row";
    button.classList.toggle("is-selected", place.id === app.selectedId);
    button.innerHTML = `
      <strong>${escapeHtml(place.name)}</strong>
      <span>${getPlaceSubtitle(place)}</span>
    `;
    button.addEventListener("click", () => selectPlace(place.id));
    dom.placeList.appendChild(button);
  }
}

function renderCounts() {
  const visible = getVisiblePlaces().length;
  const filtersActive = getAreFiltersActive();
  dom.placeCount.textContent = `${app.places.length} places`;
  dom.visibleCount.textContent = filtersActive ? `${visible} filtered` : `${visible} visible`;
  dom.resetFilters.hidden = !filtersActive;
}

function getAreFiltersActive() {
  return Boolean(app.search || app.radiusOnly || app.activeTags.size > 0);
}

function focusSearchMatch() {
  if (app.search.length < 3) return;
  const visible = getVisiblePlaces();
  if (!visible.length) return;

  const exactMatch = visible.find((place) => normalizeSearchText(place.name) === app.search);
  const startsWithMatch = visible.find((place) => normalizeSearchText(place.name).startsWith(app.search));
  if (visible.length === 1 || exactMatch || startsWithMatch) {
    const place = exactMatch || startsWithMatch || visible[0];
    selectPlace(place.id, { source: "search" });
  }
}

function selectPlace(id, options = {}) {
  const wasSelected = app.selectedId === id;
  app.selectedId = id;
  const place = app.places.find((item) => item.id === id);
  if (!place) return;
  const marker = app.markers.get(id);
  if (marker) {
    if (!app.map.hasLayer(marker)) {
      marker.addTo(app.map);
    }
    marker.setIcon(getMarkerIcon(place));
    marker.setZIndexOffset(1000);
    if (wasSelected) {
      const targetZoom = Math.max(app.map.getZoom(), options.source === "search" ? 18 : 17);
      app.map.flyTo(marker.getLatLng(), targetZoom, { animate: true, duration: 0.55 });
    } else {
      app.map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    }
    window.setTimeout(() => marker.openPopup(), 180);
  }
  renderDetail(place);
  renderMarkers();
  renderList();
}

function renderSelectedCircle() {
  if (!app.selectedCircle) return;
  const selected = app.places.find((place) => place.id === app.selectedId);
  if (!selected) {
    app.selectedCircle.setStyle({ opacity: 0, fillOpacity: 0 });
    return;
  }
  app.selectedCircle.setLatLng(selected.coordinates);
  app.selectedCircle.setStyle({ opacity: 1, fillOpacity: 0.16 });
}

function renderDetail(place) {
  const meta = place.meta || {};
  dom.detailKicker.textContent = meta.source_list || "local";
  dom.detailTitle.textContent = place.name;
  dom.detailSheet.classList.add("is-open");
  renderRoute();
}

function setTravelMode(mode) {
  app.travelMode = mode;
  dom.modeShortest.classList.toggle("is-active", mode === "shortest");
  dom.modeShortest.setAttribute("aria-pressed", String(mode === "shortest"));
  dom.modeScenic.classList.toggle("is-active", mode === "scenic");
  dom.modeScenic.setAttribute("aria-pressed", String(mode === "scenic"));
  dom.modeScooter.classList.toggle("is-active", mode === "kid_scooter");
  dom.modeScooter.setAttribute("aria-pressed", String(mode === "kid_scooter"));
  renderRoute();
}

async function renderRoute() {
  const requestId = ++app.routeRequestId;
  const from = app.places.find((place) => place.id === app.routeFromId);
  const to = app.places.find((place) => place.id === app.routeToId);
  const modeLabel = getTravelModeLabel(app.travelMode);

  if (from && to && app.routeLine) {
    if (app.routingGraphStatus === "loading" || app.routingGraphStatus === "idle") {
      app.routeLine.setLatLngs([from.coordinates, to.coordinates]);
      app.routeLine.setStyle({ opacity: 0.35, dashArray: "4 8" });
      dom.routeStatus.textContent = `${modeLabel}: loading local graph...`;
      dom.clearRoute.hidden = false;
      const bounds = L.latLngBounds([from.coordinates, to.coordinates]).pad(0.35);
      app.map.fitBounds(bounds, { animate: true, maxZoom: 17 });
      ensureRoutingGraph().then(() => {
        if (requestId === app.routeRequestId) renderRoute();
      });
      return;
    }
    const route = getLocalRoute(from.coordinates, to.coordinates, app.travelMode);
    if (requestId !== app.routeRequestId) return;
    if (route) {
      app.routeLine.setLatLngs(route.coordinates);
      app.routeLine.setStyle({
        opacity: 0.95,
        dashArray: app.travelMode === "shortest" ? "0" : app.travelMode === "scenic" ? "2 8" : "12 8",
      });
      dom.routeStatus.textContent = `${modeLabel}: ${from.name} -> ${to.name} (${formatRouteSummary(route.distanceM, app.travelMode)})`;
      const bounds = L.latLngBounds(route.coordinates).pad(0.18);
      app.map.fitBounds(bounds, { animate: true, maxZoom: 17 });
    } else {
      app.routeLine.setLatLngs([from.coordinates, to.coordinates]);
      app.routeLine.setStyle({ opacity: 0.7, dashArray: "4 8" });
      dom.routeStatus.textContent = `${modeLabel}: direct preview only; local graph unavailable for this pair`;
      const bounds = L.latLngBounds([from.coordinates, to.coordinates]).pad(0.35);
      app.map.fitBounds(bounds, { animate: true, maxZoom: 17 });
    }
    dom.clearRoute.hidden = false;
  } else {
    if (app.routeLine) {
      app.routeLine.setLatLngs([]);
      app.routeLine.setStyle({ opacity: 0 });
    }
    const fromText = from ? `From ${from.name}` : "Choose a start";
    const toText = to ? `to ${to.name}` : "choose a destination";
    dom.routeStatus.textContent = `${modeLabel}: ${fromText}, ${toText}`;
    dom.clearRoute.hidden = !(from || to);
  }
}

function getLocalRoute(fromCoordinates, toCoordinates, mode) {
  if (!app.routingGraph || !app.routeAdjacency || app.routeNodes.length === 0) return null;
  const start = findNearestRouteNode(fromCoordinates);
  const end = findNearestRouteNode(toCoordinates);
  if (!start || !end) return null;
  const maxSnapDistanceM = app.routingGraph.max_snap_distance_m || DEFAULT_MAX_SNAP_DISTANCE_METERS;
  if (start.distanceM > maxSnapDistanceM || end.distanceM > maxSnapDistanceM) return null;

  const nodeIds = findShortestPath(start.id, end.id, mode);
  if (!nodeIds.length) return null;

  const nodesById = app.routingGraph.nodes;
  const coordinates = [
    fromCoordinates,
    ...nodeIds.map((id) => [nodesById[id].lat, nodesById[id].lon]),
    toCoordinates,
  ];
  return {
    coordinates,
    distanceM: getRouteDistance(coordinates),
    startSnapM: start.distanceM,
    endSnapM: end.distanceM,
  };
}

function findNearestRouteNode(coordinates) {
  let best = null;
  for (const node of app.routeNodes) {
    const distanceM = getDistanceMeters(coordinates, node.coordinates);
    if (!best || distanceM < best.distanceM) {
      best = { id: node.id, distanceM };
    }
  }
  return best;
}

function findShortestPath(startId, endId, mode) {
  if (startId === endId) return [startId];
  const distances = new Map([[startId, 0]]);
  const previous = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  heap.push(startId, 0);

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === endId) break;

    for (const next of app.routeAdjacency.get(current.id) || []) {
      if (visited.has(next.toId)) continue;
      const candidate = current.priority + getEdgeCost(next.edge, mode);
      if (candidate < (distances.get(next.toId) ?? Infinity)) {
        distances.set(next.toId, candidate);
        previous.set(next.toId, current.id);
        heap.push(next.toId, candidate);
      }
    }
  }

  if (!previous.has(endId) && startId !== endId) return [];
  const path = [endId];
  let currentId = endId;
  while (currentId !== startId) {
    currentId = previous.get(currentId);
    if (!currentId) return [];
    path.push(currentId);
  }
  return path.reverse();
}

function getEdgeCost(edge, mode) {
  const distance = edge.distance_m || 1;
  const profile = getRoutingProfile(mode);
  const hardPenalty = getHardPenalty(edge, profile.hardPenalties || {});
  if (hardPenalty) return distance * hardPenalty;

  let score = 0;
  for (const [field, weight] of Object.entries(profile.scoreWeights || {})) {
    score += (edge[field] || 0) * weight;
  }
  const multiplier = Math.max(
    profile.minMultiplier ?? 0.35,
    Math.min(profile.maxMultiplier ?? 3, 1 - score)
  );
  return distance * multiplier + getFixedPenalty(edge, profile.fixedPenaltiesM || {});
}

function getRoutingProfile(mode) {
  const graphProfile = app.routingGraph?.profiles?.[mode];
  const fallback = ROUTING_PROFILES[mode] || ROUTING_PROFILES.shortest;
  if (!graphProfile || typeof graphProfile !== "object") return fallback;
  return {
    label: graphProfile.label || fallback.label,
    speedKmh: graphProfile.speedKmh ?? graphProfile.speed_kmh ?? fallback.speedKmh,
    scoreWeights: graphProfile.scoreWeights || graphProfile.score_weights || fallback.scoreWeights,
    minMultiplier: graphProfile.minMultiplier ?? graphProfile.min_multiplier ?? fallback.minMultiplier,
    maxMultiplier: graphProfile.maxMultiplier ?? graphProfile.max_multiplier ?? fallback.maxMultiplier,
    hardPenalties: graphProfile.hardPenalties || graphProfile.hard_penalties || fallback.hardPenalties,
    fixedPenaltiesM: graphProfile.fixedPenaltiesM || graphProfile.fixed_penalties_m || fallback.fixedPenaltiesM,
  };
}

function getHardPenalty(edge, hardPenalties) {
  for (const [rule, multiplier] of Object.entries(hardPenalties)) {
    const [field, expected] = rule.split("=");
    if (edge[field] === expected) return multiplier;
  }
  return 0;
}

function getFixedPenalty(edge, fixedPenaltiesM) {
  let penalty = 0;
  for (const [field, penaltyM] of Object.entries(fixedPenaltiesM)) {
    if (edge[field]) penalty += penaltyM;
  }
  return penalty;
}

function getRouteDistance(coordinates) {
  let distance = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    distance += getDistanceMeters(coordinates[index - 1], coordinates[index]);
  }
  return distance;
}

function getDistanceMeters(a, b) {
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function formatDistance(distanceM) {
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

function formatRouteSummary(distanceM, mode) {
  return `${formatDistance(distanceM)} | ${formatDuration(getTravelMinutes(distanceM, mode))}`;
}

function getTravelMinutes(distanceM, mode) {
  const speedKmh = getRoutingProfile(mode).speedKmh || 5;
  return Math.max(1, Math.round((distanceM / 1000 / speedKmh) * 60));
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getTravelModeLabel(mode) {
  return getRoutingProfile(mode).label;
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(id, priority) {
    this.items.push({ id, priority });
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const root = this.items[0];
    const tail = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }
    return root;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.items[parentIndex].priority <= this.items[index].priority) break;
      [this.items[parentIndex], this.items[index]] = [this.items[index], this.items[parentIndex]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = index * 2 + 2;
      let smallestIndex = index;
      if (leftIndex < this.items.length && this.items[leftIndex].priority < this.items[smallestIndex].priority) {
        smallestIndex = leftIndex;
      }
      if (rightIndex < this.items.length && this.items[rightIndex].priority < this.items[smallestIndex].priority) {
        smallestIndex = rightIndex;
      }
      if (smallestIndex === index) break;
      [this.items[index], this.items[smallestIndex]] = [this.items[smallestIndex], this.items[index]];
      index = smallestIndex;
    }
  }
}

function centerHome() {
  const home = app.state.user_profile.home_base;
  app.map.setView(home, DEFAULT_HOME_ZOOM, { animate: true });
}

function getSearchText(place) {
  return normalizeSearchText([
    place.name,
    ...(place.tags || []),
    ...(place.filterTags || []),
    place.meta?.category,
    place.meta?.source_list,
  ].filter(Boolean).join(" "));
}

function getFilterTags(place) {
  const rawTags = new Set(place.tags || []);
  const category = normalizeSearchText(place.meta?.category || "");
  const name = normalizeSearchText(place.name || "");
  const text = `${name} ${category}`;
  const filterTags = [];

  const hasDessert = hasAnyTag(rawTags, DESSERT_FILTER_TAGS) || /\b(bakery|dessert|gelato|ice cream)\b/.test(text);
  const hasFood = hasAnyTag(rawTags, FOOD_FILTER_TAGS)
    || /\b(restaurant|bakery|cafe|coffee|dessert|grill|pizza|sushi|mediterranean|mexican|asian|ice cream)\b/.test(text);
  const hasSupermarket = hasAnyTag(rawTags, SUPERMARKET_FILTER_TAGS) || /\bsupermarket\b/.test(text);
  const hasSchool = hasAnyTag(rawTags, SCHOOL_FILTER_TAGS) || /\b(school|academy|montessori|preschool)\b/.test(text);
  const hasPlayground = hasAnyTag(rawTags, PLAYGROUND_FILTER_TAGS);
  const hasPark = hasAnyTag(rawTags, PARK_FILTER_TAGS);
  const hasMetromover = hasAnyTag(rawTags, METROMOVER_FILTER_TAGS);
  const hasIndoors = hasAnyTag(rawTags, INDOOR_FILTER_TAGS);

  if (hasFood) filterTags.push("food");
  if (hasDessert) filterTags.push("dessert");
  if (hasSupermarket) filterTags.push("supermarket");
  if (hasSchool) filterTags.push("schools");
  if (hasPlayground) filterTags.push("playgrounds");
  if (hasPark) filterTags.push("parks");
  if (hasMetromover) filterTags.push("metromover");
  if (hasIndoors) filterTags.push("indoors");
  return filterTags;
}

function hasAnyTag(rawTags, wantedTags) {
  for (const tag of wantedTags) {
    if (rawTags.has(tag)) return true;
  }
  return false;
}

function normalizeSearchText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getPopupHtml(place) {
  const meta = place.meta || {};
  return `
    <strong>${escapeHtml(place.name)}</strong>
    <span>${escapeHtml(meta.category || "Place")}</span>
  `;
}

function getPlaceSubtitle(place) {
  const meta = place.meta || {};
  const parts = [];
  if (meta.distance_from_home_m !== undefined) parts.push(`${meta.distance_from_home_m} m`);
  if (meta.category) parts.push(escapeHtml(meta.category));
  return parts.join(" | ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function registerServiceWorker() {
  if (new URLSearchParams(window.location.search).get("no-sw") === "1") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=173", { updateViaCache: "none" })
      .catch((error) => {
        console.info("Offline service worker unavailable.", error);
      });
  }
}

function requestOfflineTileCache(registration) {
  const worker = registration?.active || navigator.serviceWorker.controller;
  if (!worker) return;
  worker.postMessage({
    type: "CACHE_OFFLINE_TILES",
    batchSize: 1,
    throttleMs: 250,
  });
}

function getRequestedMapView() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("qa-view") !== "1") {
    return { center: null, zoom: null };
  }
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const zoom = Number(params.get("z"));
  return {
    center: Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null,
    zoom: Number.isFinite(zoom) ? zoom : null,
  };
}

window.spinApi = {
  app,
  getVisiblePlaces,
  selectPlace,
  setTravelMode,
  renderRoute,
  getLocalRoute,
  getEdgeCost,
  getTravelMinutes,
};
