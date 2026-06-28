const STATE_URL = "../state.json";
const ROUTING_GRAPH_URL = "routing_graph.json";
const ROUTING_GRAPH_MANIFEST_URL = "routing_graph/manifest.json";
const HOME_PLACE_ID = "place_id_panorama_tower";
const OFFLINE_TILE_VERSION = "177";
const WALK_SPEED_KMH = 6;
const KID_SCOOTER_SPEED_KMH = 12;
const KID_SCOOTER_BREAK_INTERVAL_MINUTES = 20;
const KID_SCOOTER_BREAK_DURATION_MINUTES = 5;
const DEFAULT_HOME_ZOOM = 15;
const DEFAULT_MAX_SNAP_DISTANCE_METERS = 500;
const ROUTE_SNAP_CANDIDATE_LIMIT = 32;
const METROMOVER_SPEED_KMH = 14.5;
const METROMOVER_WAIT_MINUTES = 2;
const WATER_TAXI_WAIT_MINUTES = 15;
const WATER_TAXI_CROSSING_MINUTES = 20;
const TRANSIT_TRANSFER_MAX_DISTANCE_METERS = 1800;
const WATER_TAXI_STOP_IDS = [
  "place_id_miami_beach_water_taxi_downtown_miami",
  "place_id_water_taxi_mia_miami_beach",
];
const NOISE_OVERLAY_MIN_SCORE = 0.25;
const NOISE_OVERLAY_MAX_EDGES = 9000;
const RADAR_WMS_URL = "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows";
const RADAR_LAYER_NAME = "conus_bref_qcd";
const RADAR_CLEAR_AIR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#cceef4" stop-opacity="0.42"/>
      <stop offset="0.55" stop-color="#e8f8fb" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#b4dce8" stop-opacity="0.34"/>
    </linearGradient>
    <radialGradient id="puff" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.52"/>
      <stop offset="0.52" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1000" height="1000" fill="url(#wash)"/>
  <g fill="url(#puff)">
    <ellipse cx="150" cy="170" rx="150" ry="58"/>
    <ellipse cx="360" cy="300" rx="210" ry="72"/>
    <ellipse cx="770" cy="210" rx="180" ry="64"/>
    <ellipse cx="650" cy="590" rx="240" ry="78"/>
    <ellipse cx="220" cy="770" rx="190" ry="66"/>
    <ellipse cx="865" cy="835" rx="170" ry="60"/>
  </g>
  <g fill="none" stroke="#62b9ca" stroke-opacity="0.24" stroke-width="10">
    <path d="M-80 260 C 180 160, 360 360, 620 260 S 930 190, 1080 285"/>
    <path d="M-60 560 C 180 460, 390 650, 630 540 S 900 480, 1060 585"/>
    <path d="M-40 845 C 180 745, 385 900, 625 820 S 900 730, 1040 830"/>
  </g>
</svg>`;
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const METROMOVER_STATION_LINKS = [
  ["place_id_metromover_financial_district_station", "place_id_metromover_tenth_street_promenade_station"],
  ["place_id_metromover_tenth_street_promenade_station", "place_id_metromover_brickell_city_centre_eight_street_station"],
  ["place_id_metromover_brickell_city_centre_eight_street_station", "place_id_metromover_5th_st_station"],
  ["place_id_metromover_5th_st_station", "place_id_metromover_riverwalk_station"],
  ["place_id_metromover_riverwalk_station", "place_id_metromover_miami_avenue_station"],
  ["place_id_metromover_miami_avenue_station", "place_id_metromover_government_center_station"],
  ["place_id_metromover_government_center_station", "place_id_metromover_college_bayside_station"],
  ["place_id_metromover_college_bayside_station", "place_id_metromover_museum_park_station"],
  ["place_id_metromover_museum_park_station", "place_id_adrienne_arsht_metromover_station"],
  ["place_id_metromover_riverwalk_station", "place_id_metromover_bayfront_park_station"],
  ["place_id_metromover_bayfront_park_station", "place_id_metromover_college_bayside_station"],
];
const OFFLINE_TILE_BOUNDS = [[25.660, -80.275], [25.835, -80.100]];
const QA_CANVAS_CAPTURE_DELAY_MS = 1200;
const ROUTING_PROFILES = {
  shortest: {
    label: "Shortest",
    speedKmh: WALK_SPEED_KMH,
    scoreWeights: {},
    minMultiplier: 1,
    maxMultiplier: 1,
    hardPenalties: {},
    fixedPenaltiesM: {},
  },
  scenic: {
    label: "Scenic",
    speedKmh: WALK_SPEED_KMH,
    scoreWeights: { waterside: 0.25, waterfront: 0.3, park_path: 0.45, car_free: 0.1, scenic: 0.18, kid_scooter: 0.02, traffic_stress: -0.18, noise: -0.85 },
    minMultiplier: 0.35,
    maxMultiplier: 2.6,
    hardPenalties: {},
    fixedPenaltiesM: { traffic_crossing: 24, roadside_baywalk: 4 },
  },
  kid_scooter: {
    label: "Kid scooter",
    speedKmh: KID_SCOOTER_SPEED_KMH,
    scoreWeights: { kid_scooter: 0.78, scooter: 0.22, waterfront: 0.03, traffic_stress: -0.26 },
    minMultiplier: 0.35,
    maxMultiplier: 3,
    hardPenalties: { "highway=steps": 1.18 },
    fixedPenaltiesM: { traffic_crossing: 42 },
  },
  metromover: {
    label: "Metromover",
    speedKmh: 5,
    scoreWeights: {},
    minMultiplier: 1,
    maxMultiplier: 1,
    hardPenalties: {},
    fixedPenaltiesM: {},
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
const METROMOVER_FILTER_TAGS = new Set(["metromover"]);
const INDOOR_FILTER_TAGS = new Set(["childrens_museum", "indoors", "science_museum"]);

const app = {
  state: null,
  places: [],
  markers: new Map(),
  selectedId: null,
  activeTags: new Set(),
  search: "",
  placesPanelCollapsed: true,
  routeFromId: null,
  routeToId: null,
  routeAnchorMode: null,
  travelMode: "shortest",
  routingGraph: null,
  routingGraphPromise: null,
  routingGraphStatus: "idle",
  routeAdjacency: null,
  routeNodes: [],
  noiseOverlayEnabled: false,
  noiseOverlayEdges: null,
  noiseOverlayLayer: null,
  radarOverlayEnabled: false,
  radarBackdropLayer: null,
  radarLayer: null,
  weatherRefreshTimer: null,
  weatherForecastSlots: [],
  weatherForecastError: "",
  weatherPanelOpen: false,
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
  refreshWeather();
  scheduleCanvasQaCapture();
  registerServiceWorker();
}

function bindDom() {
  dom.map = document.querySelector("#map");
  dom.weatherPill = document.querySelector("#weather-pill");
  dom.weatherPanel = document.querySelector("#weather-panel");
  dom.weatherForecast = document.querySelector("#weather-forecast");
  dom.placeCount = document.querySelector("#place-count");
  dom.visibleCount = document.querySelector("#visible-count");
  dom.searchInput = document.querySelector("#search-input");
  dom.placesPanel = document.querySelector("#places-panel");
  dom.placesBrandToggle = document.querySelector("#places-brand-toggle");
  dom.tagFilters = document.querySelector("#tag-filters");
  dom.noiseFilter = document.querySelector("#noise-filter");
  dom.radarFilter = document.querySelector("#radar-filter");
  dom.placeList = document.querySelector("#place-list");
  dom.resetFilters = document.querySelector("#reset-filters");
  dom.detailSheet = document.querySelector("#detail-sheet");
  dom.closeDetail = document.querySelector("#close-detail");
  dom.detailTitleLink = document.querySelector("#detail-title-link");
  dom.routeHome = document.querySelector("#route-home");
  dom.routeLocation = document.querySelector("#route-location");
  dom.routeMetromover = document.querySelector("#route-metromover");
  dom.modeShortest = document.querySelector("#mode-shortest");
  dom.modeScenic = document.querySelector("#mode-scenic");
  dom.modeScooter = document.querySelector("#mode-scooter");
  dom.routeStatus = document.querySelector("#route-status");
  dom.clearRoute = document.querySelector("#clear-route");
}

function bindEvents() {
  dom.weatherPill.addEventListener("click", (event) => {
    event.stopPropagation();
    setWeatherPanelOpen(!app.weatherPanelOpen);
  });

  document.addEventListener("click", (event) => {
    if (!app.weatherPanelOpen) return;
    if (dom.weatherPanel.contains(event.target) || dom.weatherPill.contains(event.target)) return;
    setWeatherPanelOpen(false);
  });

  dom.searchInput.addEventListener("input", () => {
    app.search = normalizeSearchText(dom.searchInput.value);
    renderAll();
    focusSearchMatch();
  });

  dom.noiseFilter.addEventListener("change", () => {
    setNoiseOverlayEnabled(dom.noiseFilter.checked);
  });

  dom.radarFilter.addEventListener("change", () => {
    setRadarOverlayEnabled(dom.radarFilter.checked);
  });

  dom.placesBrandToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setPlacesPanelCollapsed(!app.placesPanelCollapsed);
  });

  dom.placesBrandToggle.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setPlacesPanelCollapsed(!app.placesPanelCollapsed);
  });

  dom.resetFilters.addEventListener("click", () => {
    app.activeTags.clear();
    app.search = "";
    app.selectedId = null;
    dom.searchInput.value = "";
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

  dom.routeLocation.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeFromId = app.selectedId;
    app.routeToId = null;
    app.routeAnchorMode = "location";
    renderRoute();
  });

  dom.routeHome.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeFromId = HOME_PLACE_ID;
    app.routeToId = app.selectedId;
    app.routeAnchorMode = null;
    renderRoute();
  });

  dom.routeMetromover.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.travelMode = "metromover";
    if (app.routeFromId && !app.routeToId && app.routeFromId !== app.selectedId) {
      app.routeToId = app.selectedId;
    } else if (!hasActiveRoute() || (app.selectedId !== app.routeFromId && app.selectedId !== app.routeToId)) {
      app.routeFromId = HOME_PLACE_ID;
      app.routeToId = app.selectedId;
      app.routeAnchorMode = null;
    }
    syncTravelModeButtons();
    renderRoute();
  });

  dom.modeShortest.addEventListener("click", () => setTravelMode("shortest"));
  dom.modeScenic.addEventListener("click", () => setTravelMode("scenic"));
  dom.modeScooter.addEventListener("click", () => setTravelMode("kid_scooter"));

  dom.clearRoute.addEventListener("click", () => {
    app.routeFromId = null;
    app.routeToId = null;
    app.routeAnchorMode = null;
    renderRoute();
  });
}

async function refreshWeather() {
  if (!dom.weatherPill || !dom.weatherPanel || !app.state?.user_profile?.home_base) return;
  window.clearTimeout(app.weatherRefreshTimer);
  try {
    const [lat, lon] = app.state.user_profile.home_base;
    const weather = await fetchWeatherSummary(lat, lon);
    dom.weatherPill.textContent = `${Math.round(weather.temperatureC)}°C · RH ${Math.round(weather.humidityPct)}% · Rain ${Math.round(weather.rainPct)}%`;
    dom.weatherPill.title = "Weather near Panorama Tower";
    dom.weatherPill.classList.remove("is-muted");
    app.weatherForecastSlots = weather.slots;
    app.weatherForecastError = "";
    renderWeatherForecast();
  } catch (error) {
    dom.weatherPill.textContent = "Weather unavailable";
    dom.weatherPill.title = "Weather unavailable";
    dom.weatherPill.classList.add("is-muted");
    app.weatherForecastSlots = [];
    app.weatherForecastError = "Weather unavailable";
    renderWeatherForecast("Weather unavailable");
  } finally {
    app.weatherRefreshTimer = window.setTimeout(refreshWeather, WEATHER_REFRESH_MS);
  }
}

async function fetchWeatherSummary(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lon.toFixed(5),
    current: "temperature_2m,relative_humidity_2m",
    hourly: "temperature_2m,relative_humidity_2m,precipitation_probability",
    temperature_unit: "celsius",
    forecast_days: "2",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const data = await response.json();
  const temperatureC = Number(data.current?.temperature_2m);
  const humidityPct = Number(data.current?.relative_humidity_2m);
  const rainPct = getSecondHighestForecastValue(data.hourly, "precipitation_probability", new Date(), 6);
  const slots = getDaytimeWeatherSlots(data.hourly, new Date());
  if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPct) || !Number.isFinite(rainPct)) {
    throw new Error("Weather response missing expected values");
  }
  return { temperatureC, humidityPct, rainPct, slots };
}

function getSecondHighestForecastValue(hourly, field, now, hours) {
  const times = hourly?.time || [];
  const values = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = parseWeatherTime(times[index]);
    if (!time || time < now) continue;
    const hoursAhead = (time - now) / (60 * 60 * 1000);
    if (hoursAhead >= hours) continue;
    values.push(Number(hourly?.[field]?.[index]));
  }
  const sortedValues = values.map(Number).filter(Number.isFinite).sort((left, right) => right - left);
  return sortedValues[1] ?? sortedValues[0] ?? NaN;
}

function getDaytimeWeatherSlots(hourly, now) {
  const times = hourly?.time || [];
  const slots = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = parseWeatherTime(times[index]);
    if (!time || time < now) continue;
    const hour = time.getHours();
    if (hour < 8 || hour > 19) continue;
    slots.push({
      time,
      dateKey: getWeatherDateKey(time),
      hour,
      temperatureC: Number(hourly?.temperature_2m?.[index]),
      humidityPct: Number(hourly?.relative_humidity_2m?.[index]),
      rainPct: Number(hourly?.precipitation_probability?.[index]),
    });
  }
  return slots.filter((slot) => (
    Number.isFinite(slot.temperatureC)
    && Number.isFinite(slot.humidityPct)
    && Number.isFinite(slot.rainPct)
  ));
}

function parseWeatherTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeatherDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderWeatherForecast(message = "") {
  if (!dom.weatherForecast) return;
  if (!message && app.weatherForecastError) message = app.weatherForecastError;
  if (message) {
    dom.weatherForecast.innerHTML = `<p class="weather-empty">${message}</p>`;
    return;
  }
  if (!app.weatherForecastSlots.length) {
    dom.weatherForecast.innerHTML = '<p class="weather-empty">Forecast unavailable.</p>';
    return;
  }
  const todayKey = getWeatherDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getWeatherDateKey(tomorrow);
  const groups = [
    { key: todayKey, label: "Today" },
    { key: tomorrowKey, label: "Tomorrow" },
  ].map((group) => ({
    ...group,
    slots: app.weatherForecastSlots.filter((slot) => slot.dateKey === group.key),
  }));

  const content = groups.map((group) => `
    <section class="weather-day">
      <h3>${group.label}</h3>
      ${group.slots.length ? group.slots.map((slot) => `
        <div class="weather-slot">
          <span>${formatWeatherHour(slot.hour)}</span>
          <span>${Math.round(slot.temperatureC)}°C</span>
          <span>H ${Math.round(slot.humidityPct)}%</span>
          <span>Rain ${Math.round(slot.rainPct)}%</span>
        </div>
      `).join("") : '<p class="weather-empty">No remaining 8-19 slots.</p>'}
    </section>
  `).join("");
  dom.weatherForecast.innerHTML = content || '<p class="weather-empty">Forecast unavailable.</p>';
}

function formatWeatherHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function setWeatherPanelOpen(isOpen) {
  app.weatherPanelOpen = isOpen;
  dom.weatherPanel.hidden = !isOpen;
  dom.weatherPill.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) renderWeatherForecast();
}

function setPlacesPanelCollapsed(isCollapsed) {
  app.placesPanelCollapsed = isCollapsed;
  dom.placesPanel.classList.toggle("is-collapsed", isCollapsed);
  dom.placesBrandToggle.setAttribute("aria-label", isCollapsed ? "Expand places" : "Collapse places");
  dom.placesBrandToggle.setAttribute("aria-expanded", String(!isCollapsed));
  window.setTimeout(() => app.map?.invalidateSize(), 120);
}

function setNoiseOverlayEnabled(isEnabled) {
  app.noiseOverlayEnabled = isEnabled;
  dom.noiseFilter.checked = isEnabled;
  if (!app.map) return;
  ensureNoiseOverlayLayer();
  if (isEnabled) {
    app.noiseOverlayLayer.addTo(app.map);
    ensureRoutingGraph().then(() => {
      if (app.noiseOverlayEnabled) app.noiseOverlayLayer.redraw();
    });
  } else if (app.noiseOverlayLayer) {
    app.noiseOverlayLayer.remove();
  }
}

function setRadarOverlayEnabled(isEnabled) {
  app.radarOverlayEnabled = isEnabled;
  dom.radarFilter.checked = isEnabled;
  if (!app.map) return;
  ensureRadarLayer();
  if (isEnabled) {
    app.radarBackdropLayer.addTo(app.map);
    app.radarLayer.addTo(app.map);
  } else {
    app.radarBackdropLayer?.remove();
    app.radarLayer.remove();
  }
}

function ensureRadarLayer() {
  if (app.radarLayer) return;
  const refreshToken = Math.floor(Date.now() / (5 * 60 * 1000));
  const clearAirUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(RADAR_CLEAR_AIR_SVG)}`;
  app.radarBackdropLayer = L.imageOverlay(clearAirUrl, OFFLINE_TILE_BOUNDS, {
    opacity: 0.44,
    interactive: false,
    zIndex: 235,
  });
  app.radarLayer = L.tileLayer.wms(RADAR_WMS_URL, {
    layers: RADAR_LAYER_NAME,
    format: "image/png",
    transparent: true,
    version: "1.1.1",
    opacity: 0.62,
    zIndex: 240,
    uppercase: true,
    _ts: refreshToken,
    attribution: "NOAA/NWS MRMS radar",
  });
}

function ensureNoiseOverlayLayer() {
  if (app.noiseOverlayLayer) return;
  const NoiseOverlayLayer = L.Layer.extend({
    onAdd(map) {
      this._map = map;
      this._canvas = L.DomUtil.create("canvas", "noise-overlay");
      this._context = this._canvas.getContext("2d");
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on("moveend zoomend resize", this.redraw, this);
      this.redraw();
    },
    onRemove(map) {
      map.off("moveend zoomend resize", this.redraw, this);
      this._canvas?.remove();
      this._canvas = null;
      this._context = null;
      this._map = null;
    },
    redraw() {
      if (!this._map || !this._canvas || !this._context) return;
      const size = this._map.getSize();
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      if (this._canvas.width !== size.x) this._canvas.width = size.x;
      if (this._canvas.height !== size.y) this._canvas.height = size.y;
      this._context.clearRect(0, 0, size.x, size.y);
      if (app.routingGraphStatus !== "ready") return;
      drawNoiseOverlay(this._context, this._map);
    },
  });
  app.noiseOverlayLayer = new NoiseOverlayLayer();
}

function drawNoiseOverlay(context, map) {
  const edges = getNoiseOverlayEdges();
  if (!edges.length) return;
  const bounds = map.getBounds().pad(0.08);
  const zoom = map.getZoom();
  const lineWidth = Math.max(2.2, Math.min(8, (zoom - 11) * 0.65));
  const visibleEdges = [];
  for (const edge of edges) {
    if (edge.south > bounds.getNorth()
      || edge.north < bounds.getSouth()
      || edge.west > bounds.getEast()
      || edge.east < bounds.getWest()) {
      continue;
    }
    visibleEdges.push(edge);
  }
  visibleEdges
    .sort((a, b) => a.noise - b.noise)
    .slice(-NOISE_OVERLAY_MAX_EDGES)
    .forEach((edge) => {
      const from = map.latLngToContainerPoint(edge.from);
      const to = map.latLngToContainerPoint(edge.to);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = getNoiseOverlayColor(edge.noise);
      context.globalAlpha = 0.34 + Math.min(0.38, edge.noise * 0.38);
      context.lineWidth = lineWidth + edge.noise * 3.2;
      context.lineCap = "round";
      context.stroke();
    });
  context.globalAlpha = 1;
}

function getNoiseOverlayEdges() {
  if (app.noiseOverlayEdges) return app.noiseOverlayEdges;
  if (!app.routingGraph?.edges || !app.routingGraph?.nodes) return [];
  const nodes = app.routingGraph.nodes;
  app.noiseOverlayEdges = app.routingGraph.edges
    .filter((edge) => (edge.noise || 0) >= NOISE_OVERLAY_MIN_SCORE)
    .map((edge) => {
      const fromNode = nodes[edge.from];
      const toNode = nodes[edge.to];
      if (!fromNode || !toNode) return null;
      const from = [fromNode.lat, fromNode.lon];
      const to = [toNode.lat, toNode.lon];
      return {
        from,
        to,
        noise: edge.noise || 0,
        south: Math.min(from[0], to[0]),
        north: Math.max(from[0], to[0]),
        west: Math.min(from[1], to[1]),
        east: Math.max(from[1], to[1]),
      };
    })
    .filter(Boolean);
  return app.noiseOverlayEdges;
}

function getNoiseOverlayColor(noise) {
  if (noise >= 0.82) return "#7a1fb3";
  if (noise >= 0.65) return "#d62f6c";
  if (noise >= 0.48) return "#e4572e";
  if (noise >= 0.34) return "#f18701";
  return "#f6c945";
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
  app.map.attributionControl.setPrefix(false);

  L.control.zoom({ position: "bottomright" }).addTo(app.map);

  L.tileLayer(`tiles/offline/{z}/{x}/{y}.svg?v=${OFFLINE_TILE_VERSION}`, {
    minZoom: 13,
    maxNativeZoom: 18,
    maxZoom: 19,
    bounds: OFFLINE_TILE_BOUNDS,
    noWrap: true,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
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
  app.routeSegmentLines = [];

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
    button.addEventListener("click", () => selectPlace(place.id, { source: "list" }));
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
  return Boolean(app.search || app.activeTags.size > 0);
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

function hasActiveRoute() {
  return Boolean(app.routeFromId && app.routeToId);
}

function hasLocationRouteAnchor() {
  return app.routeAnchorMode === "location" && Boolean(app.routeFromId);
}

function selectPlace(id, options = {}) {
  if (options.source === "list") {
    setPlacesPanelCollapsed(true);
  }
  const wasSelected = app.selectedId === id;
  const shouldUpdateAnchoredRoute = hasLocationRouteAnchor() && id !== app.routeFromId;
  if (shouldUpdateAnchoredRoute) {
    app.routeToId = id;
  }
  const preserveMapView = (hasActiveRoute() || shouldUpdateAnchoredRoute) && !options.forceMapMove;
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
    if (!preserveMapView && wasSelected) {
      const targetZoom = Math.max(app.map.getZoom(), options.source === "search" ? 18 : 17);
      app.map.flyTo(marker.getLatLng(), targetZoom, { animate: true, duration: 0.55 });
    } else if (!preserveMapView) {
      app.map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    }
    if (!preserveMapView) {
      window.setTimeout(() => marker.openPopup(), 180);
    }
  }
  renderDetail(place, { fitRouteMap: !preserveMapView });
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

function renderDetail(place, options = {}) {
  dom.detailTitleLink.textContent = place.name;
  dom.detailTitleLink.href = getGoogleMapsUrl(place);
  dom.detailTitleLink.title = `Open ${place.name} in Google Maps`;
  dom.detailTitleLink.setAttribute("aria-label", `Open ${place.name} in Google Maps`);
  dom.detailSheet.classList.add("is-open");
  renderRoute({ fitMap: options.fitRouteMap !== false });
}

function setTravelMode(mode) {
  app.travelMode = mode;
  syncTravelModeButtons();
  renderRoute();
}

function syncTravelModeButtons() {
  dom.modeShortest.classList.toggle("is-active", app.travelMode === "shortest");
  dom.modeShortest.setAttribute("aria-pressed", String(app.travelMode === "shortest"));
  dom.modeScenic.classList.toggle("is-active", app.travelMode === "scenic");
  dom.modeScenic.setAttribute("aria-pressed", String(app.travelMode === "scenic"));
  dom.modeScooter.classList.toggle("is-active", app.travelMode === "kid_scooter");
  dom.modeScooter.setAttribute("aria-pressed", String(app.travelMode === "kid_scooter"));
  dom.routeMetromover.classList.toggle("is-active", app.travelMode === "metromover");
  dom.routeMetromover.setAttribute("aria-pressed", String(app.travelMode === "metromover"));
}

async function renderRoute(options = {}) {
  const requestId = ++app.routeRequestId;
  const from = app.places.find((place) => place.id === app.routeFromId);
  const to = app.places.find((place) => place.id === app.routeToId);
  const modeLabel = getTravelModeLabel(app.travelMode);
  const shouldFitMap = options.fitMap !== false;

  if (from && to && app.routeLine) {
    if (app.routingGraphStatus === "loading" || app.routingGraphStatus === "idle") {
      setRoutePreview([from.coordinates, to.coordinates], { opacity: 0.35 });
      dom.routeStatus.textContent = `${modeLabel}: loading local graph...`;
      dom.clearRoute.hidden = false;
      if (shouldFitMap) {
        const bounds = L.latLngBounds([from.coordinates, to.coordinates]).pad(0.35);
        app.map.fitBounds(bounds, { animate: true, maxZoom: 17 });
      }
      ensureRoutingGraph().then(() => {
        if (requestId === app.routeRequestId) renderRoute({ fitMap: shouldFitMap });
      });
      return;
    }
    const route = getLocalRoute(from.coordinates, to.coordinates, app.travelMode);
    if (requestId !== app.routeRequestId) return;
    if (route) {
      renderRouteGeometry(route, app.travelMode);
      dom.routeStatus.textContent = `${modeLabel}: ${from.name} -> ${to.name} (${formatRouteSummary(route, app.travelMode)})`;
      if (shouldFitMap) {
        const bounds = L.latLngBounds(route.coordinates).pad(0.18);
        app.map.fitBounds(bounds, { animate: true, maxZoom: 17 });
      }
    } else {
      setRoutePreview([from.coordinates, to.coordinates], { opacity: 0.7 });
      dom.routeStatus.textContent = `${modeLabel}: direct preview only; local graph unavailable for this pair`;
      if (shouldFitMap) {
        const bounds = L.latLngBounds([from.coordinates, to.coordinates]).pad(0.35);
        app.map.fitBounds(bounds, { animate: true, maxZoom: 17 });
      }
    }
    dom.clearRoute.hidden = false;
  } else {
    clearRouteGeometry();
    const fromText = from ? `From ${from.name}` : "Choose a start";
    const toText = to ? `to ${to.name}` : "choose a destination";
    dom.routeStatus.textContent = `${modeLabel}: ${fromText}, ${toText}`;
    dom.clearRoute.hidden = !(from || to);
  }
}

function getLocalRoute(fromCoordinates, toCoordinates, mode) {
  if (mode === "metromover") return getMetromoverRoute(fromCoordinates, toCoordinates);
  return getGraphRoute(fromCoordinates, toCoordinates, mode);
}

function getGraphRoute(fromCoordinates, toCoordinates, mode) {
  if (!app.routingGraph || !app.routeAdjacency || app.routeNodes.length === 0) return null;
  const maxSnapDistanceM = app.routingGraph.max_snap_distance_m || DEFAULT_MAX_SNAP_DISTANCE_METERS;
  const startCandidates = findNearestRouteNodes(fromCoordinates, ROUTE_SNAP_CANDIDATE_LIMIT)
    .filter((node) => node.distanceM <= maxSnapDistanceM);
  const endCandidates = findNearestRouteNodes(toCoordinates, ROUTE_SNAP_CANDIDATE_LIMIT)
    .filter((node) => node.distanceM <= maxSnapDistanceM);
  if (!startCandidates.length || !endCandidates.length) return null;

  const routeResult = findShortestPathBetweenCandidates(startCandidates, endCandidates, mode);
  if (!routeResult?.nodeIds?.length) return null;

  const nodesById = app.routingGraph.nodes;
  const coordinates = [
    fromCoordinates,
    ...routeResult.nodeIds.map((id) => [nodesById[id].lat, nodesById[id].lon]),
    toCoordinates,
  ];
  return {
    coordinates,
    distanceM: getRouteDistance(coordinates),
    startSnapM: routeResult.start.distanceM,
    endSnapM: routeResult.end.distanceM,
  };
}

function getMetromoverRoute(fromCoordinates, toCoordinates) {
  const walkingRoute = getGraphRoute(fromCoordinates, toCoordinates, "shortest");
  const transitRoute = getBestMultimodalTransitRoute(fromCoordinates, toCoordinates);
  if (!walkingRoute) return transitRoute;

  const walkingMinutes = getTravelMinutes(walkingRoute.distanceM, "shortest");
  if (!transitRoute || transitRoute.durationMinutes >= walkingMinutes) {
    return { ...walkingRoute, durationMinutes: walkingMinutes, metromoverUsed: false, transitUsed: false };
  }

  return transitRoute;
}

function getBestMultimodalTransitRoute(fromCoordinates, toCoordinates) {
  const transitNodes = getTransitNodes(fromCoordinates, toCoordinates);
  if (transitNodes.length < 4) return null;

  const nodeById = new Map(transitNodes.map((node) => [node.id, node]));
  const adjacency = new Map(transitNodes.map((node) => [node.id, []]));
  const routeCache = new Map();

  const addEdge = (fromId, toId, edge) => {
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    adjacency.get(fromId).push({ toId, edge });
  };

  const getWalkingRoute = (fromNode, toNode) => {
    const cacheKey = `${fromNode.id}->${toNode.id}`;
    if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);
    const route = getGraphRoute(fromNode.coordinates, toNode.coordinates, "shortest");
    routeCache.set(cacheKey, route);
    return route;
  };

  for (const node of transitNodes) {
    if (node.type === "endpoint") continue;
    const startRoute = getWalkingRoute(nodeById.get("origin"), node);
    if (startRoute) {
      addEdge("origin", node.id, {
        type: "walk",
        distanceM: startRoute.distanceM,
        durationMinutes: getTravelMinutes(startRoute.distanceM, "shortest"),
        coordinates: startRoute.coordinates,
        startId: "origin",
        endId: node.id,
        endName: node.name,
      });
    }

    const endRoute = getWalkingRoute(node, nodeById.get("destination"));
    if (endRoute) {
      addEdge(node.id, "destination", {
        type: "walk",
        distanceM: endRoute.distanceM,
        durationMinutes: getTravelMinutes(endRoute.distanceM, "shortest"),
        coordinates: endRoute.coordinates,
        startId: node.id,
        endId: "destination",
        startName: node.name,
      });
    }
  }

  const transferNodes = transitNodes.filter((node) => node.type !== "endpoint");
  for (let outer = 0; outer < transferNodes.length; outer += 1) {
    for (let inner = outer + 1; inner < transferNodes.length; inner += 1) {
      const fromNode = transferNodes[outer];
      const toNode = transferNodes[inner];
      if (getDistanceMeters(fromNode.coordinates, toNode.coordinates) > TRANSIT_TRANSFER_MAX_DISTANCE_METERS) continue;
      const route = getWalkingRoute(fromNode, toNode);
      if (!route) continue;
      const edge = {
        type: "walk",
        distanceM: route.distanceM,
        durationMinutes: getTravelMinutes(route.distanceM, "shortest"),
        coordinates: route.coordinates,
        startId: fromNode.id,
        endId: toNode.id,
        startName: fromNode.name,
        endName: toNode.name,
      };
      addEdge(fromNode.id, toNode.id, edge);
      addEdge(toNode.id, fromNode.id, {
        ...edge,
        coordinates: [...edge.coordinates].reverse(),
        startId: toNode.id,
        endId: fromNode.id,
        startName: toNode.name,
        endName: fromNode.name,
      });
    }
  }

  addMetromoverTransitEdges(nodeById, addEdge);
  addWaterTaxiTransitEdges(nodeById, addEdge);

  const result = findShortestTransitPath(adjacency, "origin", "destination");
  if (!result?.segments?.length) return null;

  const segments = result.segments;
  const metromoverSegments = segments.filter((segment) => segment.type === "metromover");
  const waterTaxiSegments = segments.filter((segment) => segment.type === "water_taxi");
  const metromoverUsed = metromoverSegments.length > 0;
  const waterTaxiUsed = waterTaxiSegments.length > 0;
  const transitWaitMinutes = metromoverUsed ? METROMOVER_WAIT_MINUTES : 0;

  return {
    coordinates: mergeRouteCoordinates(...segments.map((segment) => segment.coordinates)),
    distanceM: segments.reduce((sum, segment) => sum + segment.distanceM, 0),
    durationMinutes: Math.round(segments.reduce((sum, segment) => sum + segment.durationMinutes, 0) + transitWaitMinutes),
    metromoverUsed,
    waterTaxiUsed,
    combinedTransitUsed: metromoverUsed && waterTaxiUsed,
    transitUsed: true,
    transitStartName: segments.find((segment) => segment.type !== "walk")?.startName,
    transitEndName: [...segments].reverse().find((segment) => segment.type !== "walk")?.endName,
    metromoverStartName: metromoverSegments[0]?.startName,
    metromoverEndName: metromoverSegments[metromoverSegments.length - 1]?.endName,
    waterTaxiStartName: waterTaxiSegments[0]?.startName,
    waterTaxiEndName: waterTaxiSegments[waterTaxiSegments.length - 1]?.endName,
    segments,
  };
}

function getTransitNodes(fromCoordinates, toCoordinates) {
  const nodes = [
    { id: "origin", type: "endpoint", name: "Origin", coordinates: fromCoordinates },
    { id: "destination", type: "endpoint", name: "Destination", coordinates: toCoordinates },
  ];
  for (const station of getMetromoverStations()) {
    nodes.push({ id: station.id, type: "metromover", name: station.name, coordinates: station.coordinates });
  }
  for (const stop of getWaterTaxiStops()) {
    nodes.push({ id: stop.id, type: "water_taxi", name: stop.name, coordinates: stop.coordinates });
  }
  return nodes;
}

function addMetromoverTransitEdges(nodeById, addEdge) {
  for (const [fromId, toId] of METROMOVER_STATION_LINKS) {
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) continue;
    const distanceM = getDistanceMeters(from.coordinates, to.coordinates);
    const durationMinutes = getMetromoverEdgeMinutes(distanceM);
    const forward = {
      type: "metromover",
      distanceM,
      durationMinutes,
      coordinates: [from.coordinates, to.coordinates],
      startId: from.id,
      endId: to.id,
      startName: from.name,
      endName: to.name,
    };
    addEdge(from.id, to.id, forward);
    addEdge(to.id, from.id, {
      ...forward,
      coordinates: [to.coordinates, from.coordinates],
      startId: to.id,
      endId: from.id,
      startName: to.name,
      endName: from.name,
    });
  }
}

function addWaterTaxiTransitEdges(nodeById, addEdge) {
  const stops = WATER_TAXI_STOP_IDS.map((id) => nodeById.get(id)).filter(Boolean);
  if (stops.length !== 2) return;
  const [first, second] = stops;
  const distanceM = getRouteDistance([first.coordinates, second.coordinates]);
  const durationMinutes = WATER_TAXI_WAIT_MINUTES + WATER_TAXI_CROSSING_MINUTES;
  const forward = {
    type: "water_taxi",
    distanceM,
    durationMinutes,
    coordinates: [first.coordinates, second.coordinates],
    startId: first.id,
    endId: second.id,
    startName: first.name,
    endName: second.name,
  };
  addEdge(first.id, second.id, forward);
  addEdge(second.id, first.id, {
    ...forward,
    coordinates: [second.coordinates, first.coordinates],
    startId: second.id,
    endId: first.id,
    startName: second.name,
    endName: first.name,
  });
}

function findShortestTransitPath(adjacency, startId, endId) {
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

    for (const next of adjacency.get(current.id) || []) {
      if (visited.has(next.toId)) continue;
      const candidate = current.priority + next.edge.durationMinutes;
      if (candidate < (distances.get(next.toId) ?? Infinity)) {
        distances.set(next.toId, candidate);
        previous.set(next.toId, { id: current.id, edge: next.edge });
        heap.push(next.toId, candidate);
      }
    }
  }

  if (!previous.has(endId)) return null;
  const segments = [];
  let currentId = endId;
  while (currentId !== startId) {
    const step = previous.get(currentId);
    if (!step) return null;
    segments.push(step.edge);
    currentId = step.id;
  }
  segments.reverse();
  return { segments };
}

function getBestMetromoverCandidate(fromCoordinates, toCoordinates) {
  const stations = getMetromoverStations();
  if (stations.length < 2) {
    return null;
  }

  const startLegs = stations.map((station) => ({
    station,
    route: getGraphRoute(fromCoordinates, station.coordinates, "shortest"),
  })).filter((leg) => leg.route);
  const endLegs = stations.map((station) => ({
    station,
    route: getGraphRoute(station.coordinates, toCoordinates, "shortest"),
  })).filter((leg) => leg.route);

  let best = null;
  for (const startLeg of startLegs) {
    for (const endLeg of endLegs) {
      if (startLeg.station.id === endLeg.station.id) continue;
      const metroRoute = getMetromoverStationRoute(startLeg.station.id, endLeg.station.id);
      if (!metroRoute) continue;
      const durationMinutes = getTravelMinutes(startLeg.route.distanceM, "shortest")
        + getMetromoverMinutes(metroRoute)
        + getTravelMinutes(endLeg.route.distanceM, "shortest");
      const distanceM = startLeg.route.distanceM + metroRoute.distanceM + endLeg.route.distanceM;
      if (!best || durationMinutes < best.durationMinutes || (durationMinutes === best.durationMinutes && distanceM < best.distanceM)) {
        best = {
          type: "metromover",
          startName: startLeg.station.name,
          endName: endLeg.station.name,
          distanceM,
          durationMinutes,
          segments: [
            { type: "walk", coordinates: startLeg.route.coordinates },
            { type: "metromover", coordinates: metroRoute.coordinates },
            { type: "walk", coordinates: endLeg.route.coordinates },
          ],
        };
      }
    }
  }
  return best;
}

function getBestWaterTaxiCandidate(fromCoordinates, toCoordinates) {
  const stops = WATER_TAXI_STOP_IDS.map((id) => app.places.find((place) => place.id === id))
    .filter((place) => place && Array.isArray(place.coordinates));
  if (stops.length !== 2) return null;

  let best = null;
  for (const [startStop, endStop] of [[stops[0], stops[1]], [stops[1], stops[0]]]) {
    const startRoute = getGraphRoute(fromCoordinates, startStop.coordinates, "shortest");
    const endRoute = getGraphRoute(endStop.coordinates, toCoordinates, "shortest");
    if (!startRoute || !endRoute) continue;

    const waterCoordinates = [startStop.coordinates, endStop.coordinates];
    const waterDistanceM = getRouteDistance(waterCoordinates);
    const durationMinutes = getTravelMinutes(startRoute.distanceM, "shortest")
      + WATER_TAXI_WAIT_MINUTES
      + WATER_TAXI_CROSSING_MINUTES
      + getTravelMinutes(endRoute.distanceM, "shortest");
    const distanceM = startRoute.distanceM + waterDistanceM + endRoute.distanceM;
    if (!best || durationMinutes < best.durationMinutes || (durationMinutes === best.durationMinutes && distanceM < best.distanceM)) {
      best = {
        type: "water_taxi",
        startName: startStop.name,
        endName: endStop.name,
        distanceM,
        durationMinutes,
        segments: [
          { type: "walk", coordinates: startRoute.coordinates },
          { type: "water_taxi", coordinates: waterCoordinates },
          { type: "walk", coordinates: endRoute.coordinates },
        ],
      };
    }
  }
  return best;
}

function renderRouteGeometry(route, mode) {
  clearRouteSegments();
  if (mode === "metromover" && route.transitUsed && route.segments?.length) {
    app.routeLine.setLatLngs([]);
    app.routeLine.setStyle({ opacity: 0 });
    for (const segment of route.segments) {
      const isMetromover = segment.type === "metromover";
      const isWaterTaxi = segment.type === "water_taxi";
      const lineOptions = {
        color: isWaterTaxi ? "#0b8ea0" : "#d95d39",
        weight: 5,
        opacity: 0.95,
      };
      if (isMetromover || isWaterTaxi) lineOptions.dashArray = "2 8";
      const line = L.polyline(segment.coordinates, lineOptions).addTo(app.map);
      app.routeSegmentLines.push(line);
    }
    return;
  }
  app.routeLine.setLatLngs(route.coordinates);
  app.routeLine.setStyle({
    color: "#d95d39",
    weight: 5,
    opacity: 0.95,
    dashArray: getRouteDashArray(mode),
  });
}

function setRoutePreview(coordinates, options = {}) {
  clearRouteSegments();
  app.routeLine.setLatLngs(coordinates);
  app.routeLine.setStyle({
    color: "#d95d39",
    weight: 5,
    opacity: options.opacity ?? 0.7,
    dashArray: "4 8",
  });
}

function clearRouteGeometry() {
  clearRouteSegments();
  if (app.routeLine) {
    app.routeLine.setLatLngs([]);
    app.routeLine.setStyle({ opacity: 0 });
  }
}

function clearRouteSegments() {
  for (const line of app.routeSegmentLines || []) {
    line.remove();
  }
  app.routeSegmentLines = [];
}

function getMetromoverStations() {
  return app.places.filter((place) => place.filterTags?.includes("metromover") && Array.isArray(place.coordinates));
}

function getWaterTaxiStops() {
  return WATER_TAXI_STOP_IDS.map((id) => app.places.find((place) => place.id === id))
    .filter((place) => place && Array.isArray(place.coordinates));
}

function getMetromoverStationRoute(fromStationId, toStationId) {
  if (fromStationId === toStationId) return null;
  const stationsById = new Map(getMetromoverStations().map((station) => [station.id, station]));
  const adjacency = new Map();
  for (const [fromId, toId] of METROMOVER_STATION_LINKS) {
    const from = stationsById.get(fromId);
    const to = stationsById.get(toId);
    if (!from || !to) continue;
    const distanceM = getDistanceMeters(from.coordinates, to.coordinates);
    const durationMinutes = getMetromoverEdgeMinutes(distanceM);
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    if (!adjacency.has(toId)) adjacency.set(toId, []);
    adjacency.get(fromId).push({ id: toId, distanceM, durationMinutes });
    adjacency.get(toId).push({ id: fromId, distanceM, durationMinutes });
  }

  const costs = new Map([[fromStationId, 0]]);
  const distances = new Map([[fromStationId, 0]]);
  const previous = new Map();
  const queue = new MinHeap();
  queue.push(fromStationId, 0);
  while (queue.size) {
    const current = queue.pop();
    if (!current) break;
    if (current.priority > (costs.get(current.id) ?? Infinity)) continue;
    if (current.id === toStationId) break;
    for (const edge of adjacency.get(current.id) || []) {
      const nextCost = current.priority + edge.durationMinutes;
      if (nextCost < (costs.get(edge.id) ?? Infinity)) {
        costs.set(edge.id, nextCost);
        distances.set(edge.id, (distances.get(current.id) || 0) + edge.distanceM);
        previous.set(edge.id, current.id);
        queue.push(edge.id, nextCost);
      }
    }
  }
  if (!costs.has(toStationId)) return null;

  const stationIds = [];
  for (let id = toStationId; id; id = previous.get(id)) {
    stationIds.push(id);
    if (id === fromStationId) break;
  }
  stationIds.reverse();
  if (stationIds[0] !== fromStationId) return null;

  return {
    coordinates: stationIds.map((id) => stationsById.get(id).coordinates),
    distanceM: distances.get(toStationId),
    durationMinutes: costs.get(toStationId),
  };
}

function getMetromoverMinutes(route) {
  return METROMOVER_WAIT_MINUTES + Math.round(route.durationMinutes);
}

function getMetromoverEdgeMinutes(distanceM) {
  return Math.max(1, (distanceM / 1000 / METROMOVER_SPEED_KMH) * 60);
}

function mergeRouteCoordinates(...segments) {
  const merged = [];
  for (const segment of segments) {
    for (const coordinate of segment || []) {
      const previous = merged[merged.length - 1];
      if (!previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1]) {
        merged.push(coordinate);
      }
    }
  }
  return merged;
}

function findNearestRouteNode(coordinates) {
  return findNearestRouteNodes(coordinates, 1)[0] || null;
}

function findNearestRouteNodes(coordinates, limit) {
  const best = [];
  for (const node of app.routeNodes) {
    const distanceM = getDistanceMeters(coordinates, node.coordinates);
    const candidate = { id: node.id, distanceM };
    if (best.length < limit) {
      best.push(candidate);
      best.sort((a, b) => a.distanceM - b.distanceM);
    } else if (distanceM < best[best.length - 1].distanceM) {
      best[best.length - 1] = candidate;
      best.sort((a, b) => a.distanceM - b.distanceM);
    }
  }
  return best;
}

function findShortestPathBetweenCandidates(startCandidates, endCandidates, mode) {
  const endById = new Map(endCandidates.map((candidate) => [candidate.id, candidate]));
  const distances = new Map();
  const previous = new Map();
  const sourceByNode = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  let bestEnd = null;
  let bestTotalCost = Infinity;

  for (const start of startCandidates) {
    const initialCost = start.distanceM;
    if (initialCost >= (distances.get(start.id) ?? Infinity)) continue;
    distances.set(start.id, initialCost);
    previous.set(start.id, null);
    sourceByNode.set(start.id, start);
    heap.push(start.id, initialCost);
  }

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || visited.has(current.id)) continue;
    if (current.priority >= bestTotalCost) break;
    visited.add(current.id);

    const end = endById.get(current.id);
    if (end) {
      const totalCost = current.priority + end.distanceM;
      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestEnd = { id: current.id, end };
      }
    }

    for (const next of app.routeAdjacency.get(current.id) || []) {
      if (visited.has(next.toId)) continue;
      const candidate = current.priority + getEdgeCost(next.edge, mode);
      if (candidate < (distances.get(next.toId) ?? Infinity)) {
        distances.set(next.toId, candidate);
        previous.set(next.toId, current.id);
        sourceByNode.set(next.toId, sourceByNode.get(current.id));
        heap.push(next.toId, candidate);
      }
    }
  }

  if (!bestEnd) return null;
  const nodeIds = [bestEnd.id];
  let currentId = bestEnd.id;
  while (previous.get(currentId)) {
    currentId = previous.get(currentId);
    nodeIds.push(currentId);
  }
  nodeIds.reverse();
  return {
    nodeIds,
    start: sourceByNode.get(nodeIds[0]),
    end: bestEnd.end,
  };
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
    speedKmh: fallback.speedKmh,
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
  if (typeof distanceM === "object") {
    const route = distanceM;
    const durationMinutes = route.durationMinutes ?? getTravelMinutes(route.distanceM, mode);
    const suffix = mode === "metromover"
      ? route.waterTaxiUsed && route.metromoverUsed ? " | Water taxi + Metromover" : route.waterTaxiUsed ? " | Water taxi" : route.metromoverUsed ? " | Metromover" : " | walking fastest"
      : "";
    return `${formatDistance(route.distanceM)} | ${formatDuration(durationMinutes)}${suffix}`;
  }
  return `${formatDistance(distanceM)} | ${formatDuration(getTravelMinutes(distanceM, mode))}`;
}

function getTravelMinutes(distanceM, mode) {
  const speedKmh = getRoutingProfile(mode).speedKmh || 5;
  const exactMovingMinutes = (distanceM / 1000 / speedKmh) * 60;
  const movingMinutes = Math.max(1, Math.round(exactMovingMinutes));
  if (mode !== "kid_scooter") return movingMinutes;
  const breakCount = Math.floor(Math.max(0, exactMovingMinutes - 0.001) / KID_SCOOTER_BREAK_INTERVAL_MINUTES);
  return movingMinutes + breakCount * KID_SCOOTER_BREAK_DURATION_MINUTES;
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

function getRouteDashArray(mode) {
  if (mode === "shortest") return null;
  if (mode === "scenic") return "2 8";
  if (mode === "metromover") return null;
  return "12 8";
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

function getGoogleMapsUrl(place) {
  const address = place.meta?.address;
  const searchText = address ? `${place.name}, ${address}` : `${place.name}, Miami FL`;
  return `https://www.google.com/maps/search/${encodeURIComponent(searchText)}`;
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
    navigator.serviceWorker.register("sw.js?v=195", { updateViaCache: "none" })
      .then((registration) => navigator.serviceWorker.ready.then((readyRegistration) => {
        requestOfflineTileCache(readyRegistration || registration);
      }))
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
