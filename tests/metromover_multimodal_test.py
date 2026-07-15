import asyncio
import http.server
import socketserver
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PORT = 8791
BASE_URL = f"http://127.0.0.1:{PORT}/web/index.html?qa=metromover-multimodal-test"


async def collect_routes():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 1200, "height": 900})
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        routes = await page.evaluate(
            """
            async () => {
              await ensureRoutingGraph();
              const byId = (id) => app.places.find((place) => place.id === id);
              const home = byId("place_id_panorama_tower");
              const routeDetails = (fromId, toId = home.id) => {
                const from = byId(fromId);
                const to = byId(toId);
                const route = getMetromoverRoute(from.coordinates, to.coordinates);
                return {
                  fromId,
                  fromName: from.name,
                  toId,
                  toName: to.name,
                  minutes: route ? route.durationMinutes : null,
                  waterTaxiUsed: Boolean(route?.waterTaxiUsed),
                  metromoverUsed: Boolean(route?.metromoverUsed),
                  brickellTrolleyUsed: Boolean(route?.brickellTrolleyUsed),
                  southBeachTrolleyUsed: Boolean(route?.southBeachTrolleyUsed),
                  biscayneTrolleyUsed: Boolean(route?.biscayneTrolleyUsed),
                  littleHavanaTrolleyUsed: Boolean(route?.littleHavanaTrolleyUsed),
                  coralWayTrolleyUsed: Boolean(route?.coralWayTrolleyUsed),
                  combinedTransitUsed: Boolean(route?.combinedTransitUsed),
                  itinerary: route?.itinerary || [],
                  statusText: route ? formatRouteStatus("Transport", from, to, route, "metromover") : null,
                  segments: (route?.segments || []).map((segment) => ({
                    type: segment.type,
                    startId: segment.startId,
                    endId: segment.endId,
                    startName: segment.startName,
                    endName: segment.endName,
                    minutes: Math.round(segment.durationMinutes),
                    distanceM: segment.distanceM,
                    coordinates: segment.coordinates,
                  })),
                };
              };
              const auditCoralWayReturn = () => {
                const from = byId("place_id_la_prima_casa_montessori_roads_campus");
                const context = createUnifiedMultimodalContext(from.coordinates, home.coordinates);
                const walkingWinner = findShortestUnifiedMultimodalPath(context, context.originId, context.destinationId);
                const transportCandidate = findShortestUnifiedMultimodalPathUsingTransport(
                  context,
                  context.originId,
                  context.destinationId,
                );
                const boarding = (context.customAdjacency.get(context.originId) || [])
                  .find((next) => next.toId === CORAL_WAY_TROLLEY_SCHOOL_EASTBOUND_NODE_ID);
                const ride = (context.customAdjacency.get(CORAL_WAY_TROLLEY_SCHOOL_EASTBOUND_NODE_ID) || [])
                  .find((next) => next.toId === CORAL_WAY_TROLLEY_BRICKELL_NODE_ID);
                const tail = findShortestUnifiedMultimodalPath(
                  context,
                  CORAL_WAY_TROLLEY_BRICKELL_NODE_ID,
                  context.destinationId,
                );
                return {
                  walkingMinutes: walkingWinner?.durationMinutes ?? null,
                  transportMinutes: transportCandidate?.durationMinutes ?? null,
                  preferenceLimitMinutes: walkingWinner
                    ? walkingWinner.durationMinutes * TRANSPORT_PREFERENCE_MAX_TIME_RATIO
                    : null,
                  boardingWaitMinutes: boarding?.edge.waitMinutes ?? null,
                  boardingWalkMinutes: boarding?.edge.movingDurationMinutes ?? null,
                  rideMinutes: ride?.edge.durationMinutes ?? null,
                  rideStartId: ride?.edge.startId ?? null,
                  rideEndId: ride?.edge.endId ?? null,
                  candidateMinutes: boarding && ride && tail
                    ? boarding.edge.durationMinutes + ride.edge.durationMinutes + tail.durationMinutes
                    : null,
                };
              };
              const testTransportPreferenceBoundary = (transitMinutes) => {
                const startId = "preference-test:origin";
                const endId = "preference-test:destination";
                const startCoordinates = [0, 0];
                const endCoordinates = [0, 0.001];
                const walkEdge = createUnifiedMultimodalEdge(
                  "walk",
                  startId,
                  endId,
                  startCoordinates,
                  endCoordinates,
                  { durationMinutes: 10 },
                );
                const transitEdge = createUnifiedMultimodalEdge(
                  "metromover",
                  startId,
                  endId,
                  startCoordinates,
                  endCoordinates,
                  { durationMinutes: transitMinutes },
                );
                const context = {
                  customAdjacency: new Map([
                    [startId, [
                      { toId: endId, edge: walkEdge },
                      { toId: endId, edge: transitEdge },
                    ]],
                    [endId, []],
                  ]),
                  virtualNodes: new Map(),
                };
                const result = findPreferredUnifiedMultimodalPath(context, startId, endId);
                return {
                  durationMinutes: result?.durationMinutes ?? null,
                  edgeTypes: (result?.edges || []).map((edge) => edge.type),
                };
              };
              const routeRenderStyles = async (fromId, toId = home.id) => {
                const from = byId(fromId);
                const to = byId(toId);
                app.travelMode = "metromover";
                app.routeFromId = from.id;
                app.routeToId = to.id;
                renderRoute();
                await new Promise((resolve) => setTimeout(resolve, 50));
                return app.routeSegmentLines.map((line) => ({
                  dashArray: line.options.dashArray || null,
                  color: line.options.color,
                }));
              };
              const testRouteReplacement = async () => {
                app.travelMode = "shortest";
                clearRouteState();
                selectPlace("place_id_avo_miami");
                dom.routeHome.click();
                const homeRequestBefore = app.routeRequestId;
                selectPlace("place_id_trader_joes_miami_beach");
                await new Promise((resolve) => setTimeout(resolve, 50));
                const homeResult = {
                  fromId: app.routeFromId,
                  toId: app.routeToId,
                  selectedId: app.selectedId,
                  anchorMode: app.routeAnchorMode,
                  rerendered: app.routeRequestId > homeRequestBefore,
                  status: dom.routeStatus.textContent,
                };

                clearRouteState();
                selectPlace("place_id_avo_miami");
                dom.routeLocation.click();
                selectPlace("place_id_trader_joes_miami_beach");
                const initialLocationToId = app.routeToId;
                const locationRequestBefore = app.routeRequestId;
                selectPlace("place_id_maurice_gibb_memorial_park");
                await new Promise((resolve) => setTimeout(resolve, 50));
                const locationResult = {
                  fromId: app.routeFromId,
                  initialToId: initialLocationToId,
                  toId: app.routeToId,
                  selectedId: app.selectedId,
                  anchorMode: app.routeAnchorMode,
                  rerendered: app.routeRequestId > locationRequestBefore,
                  status: dom.routeStatus.textContent,
                };
                return { home: homeResult, location: locationResult };
              };
              return [
                routeDetails("place_id_avo_miami"),
                routeDetails("place_id_trader_joes_miami_beach"),
                routeDetails("place_id_maurice_gibb_memorial_park"),
                routeDetails("place_id_water_taxi_mia_miami_beach"),
                routeDetails("place_id_trader_joes_miami_beach", "place_id_bayfront_park_playground"),
                routeDetails("place_id_brickell_trolley_city_hall"),
                routeDetails("place_id_regatta_park"),
                routeDetails("place_id_panorama_tower", "place_id_bayshore_club_bar_grill"),
                routeDetails("place_id_water_taxi_mia_miami_beach", "place_id_south_pointe_beach"),
                routeDetails("place_id_south_pointe_beach", "place_id_water_taxi_mia_miami_beach"),
                routeDetails("place_id_water_taxi_mia_miami_beach", "place_id_south_beach_trolley_south_pointe"),
                routeDetails("place_id_panorama_tower", "place_id_south_pointe_beach"),
                {
                  fromId: "place_id_panorama_tower",
                  fromName: "Panorama Tower",
                  toId: "place_id_bayfront_park_playground",
                  toName: "Bayfront Park Playground",
                  timings: {
                    walking6km: getTravelMinutes(6000, "shortest"),
                    metromoverWalking6km: getTravelMinutes(6000, "metromover"),
                    scooterSpeedKmh: KID_SCOOTER_SPEED_KMH,
                    scooter7km: getTravelMinutes(7000, "kid_scooter"),
                    scooterJustOver7km: getTravelMinutes(7001, "kid_scooter"),
                    scooter14km: getTravelMinutes(14000, "kid_scooter"),
                    scooterJustOver14km: getTravelMinutes(14001, "kid_scooter"),
                  },
                  waitAssumptions: {
                    metromover: METROMOVER_WAIT_MINUTES,
                    waterTaxi: WATER_TAXI_WAIT_MINUTES,
                    brickellTrolley: BRICKELL_TROLLEY_WAIT_MINUTES,
                    southBeachTrolley: SOUTH_BEACH_TROLLEY_WAIT_MINUTES,
                    biscayneTrolley: BISCAYNE_TROLLEY_WAIT_MINUTES,
                    littleHavanaTrolley: LITTLE_HAVANA_TROLLEY_WAIT_MINUTES,
                    coralWayToSchool: CORAL_WAY_TROLLEY_TO_SCHOOL_WAIT_MINUTES,
                    coralWayToHome: CORAL_WAY_TROLLEY_TO_HOME_WAIT_MINUTES,
                  },
                  coralWaySchoolAccess: {
                    distanceM: CORAL_WAY_SCHOOL_SAFE_ACCESS_DISTANCE_METERS,
                    minutes: CORAL_WAY_SCHOOL_SAFE_ACCESS_MINUTES,
                  },
                  transportPreference: {
                    ratio: TRANSPORT_PREFERENCE_MAX_TIME_RATIO,
                    below: testTransportPreferenceBoundary(11.99),
                    boundary: testTransportPreferenceBoundary(12),
                    above: testTransportPreferenceBoundary(12.01),
                  },
                  selectionRouting: await testRouteReplacement(),
                  transportFilter: TAG_FILTERS.find((filter) => filter.tag === "transport") || null,
                  transportPlaceIds: app.places
                    .filter((place) => place.filterTags.includes("transport"))
                    .map((place) => place.id)
                    .sort(),
                  trolleyGoogleMapsLinks: app.places
                    .filter((place) => (place.tags || []).some((tag) => [
                      "brickell_trolley",
                      "south_beach_trolley",
                      "biscayne_trolley",
                      "little_havana_trolley",
                      "coral_way_trolley",
                    ].includes(tag)))
                    .map((place) => {
                      renderDetail(place);
                      return {
                        id: place.id,
                        query: place.meta?.google_maps_query || null,
                        url: getGoogleMapsUrl(place),
                        renderedUrl: dom.detailTitleLink.href,
                      };
                    })
                    .sort((a, b) => a.id.localeCompare(b.id)),
                  expectedTransportPlaceIds: app.places
                    .filter((place) => (place.tags || []).some((tag) => TRANSPORT_FILTER_TAGS.has(tag)))
                    .map((place) => place.id)
                    .sort(),
                  metromoverStationIds: getMetromoverStations().map((place) => place.id).sort(),
                  rawMetromoverIds: app.places
                    .filter((place) => (place.tags || []).includes("metromover"))
                    .map((place) => place.id)
                    .sort(),
                  transportMarkersStyled: app.places
                    .filter((place) => place.filterTags.includes("transport"))
                    .every((place) => getMarkerIcon(place).options.html.includes("is-transport")),
                  lighthousePresent: Boolean(byId("place_id_cape_florida_lighthouse")),
                  newPlaceRoutes: [
                    "place_id_crandon_beach",
                    "place_id_el_chiringuito_ocean_view",
                    "place_id_cape_florida_beach",
                    "place_id_rosa_sky",
                    "place_id_21st_street_lifeguard_tower",
                    "place_id_brickell_trolley_panorama_stop",
                    "place_id_brickell_trolley_city_hall",
                    "place_id_south_beach_trolley_alton_10th",
                    "place_id_south_beach_trolley_south_pointe",
                    "place_id_brickell_station_trolleys",
                    "place_id_domino_park_calle_ocho_trolley",
                    "place_id_margaret_pace_park",
                    "place_id_collection_at_midtown_miami",
                    "place_id_miami_design_district",
                    "place_id_coral_way_trolley_prima_casa",
                  ].map((placeId) => {
                    const place = byId(placeId);
                    const route = getGraphRoute(home.coordinates, place.coordinates, "shortest");
                    return {
                      placeId,
                      placeName: place.name,
                      routable: Boolean(route),
                      distanceM: route ? Math.round(route.distanceM) : null,
                    };
                  }),
                  renderStyles: await routeRenderStyles("place_id_panorama_tower", "place_id_bayfront_park_playground"),
                  trolleyRenderStyles: await routeRenderStyles("place_id_regatta_park", "place_id_panorama_tower"),
                  southBeachTrolleyRenderStyles: await routeRenderStyles(
                    "place_id_water_taxi_mia_miami_beach",
                    "place_id_south_pointe_beach",
                  ),
                  biscayneTrolleyRenderStyles: await routeRenderStyles(
                    "place_id_panorama_tower",
                    "place_id_miami_design_district",
                  ),
                  coralWayTrolleyRenderStyles: await routeRenderStyles(
                    "place_id_panorama_tower",
                    "place_id_la_prima_casa_montessori_roads_campus",
                  ),
                  coralWayTrolleyReturnRenderStyles: await routeRenderStyles(
                    "place_id_la_prima_casa_montessori_roads_campus",
                    "place_id_panorama_tower",
                  ),
                  newTrolleyRoutes: {
                    edgewater: routeDetails("place_id_panorama_tower", "place_id_margaret_pace_park"),
                    midtown: routeDetails("place_id_panorama_tower", "place_id_collection_at_midtown_miami"),
                    designDistrict: routeDetails("place_id_panorama_tower", "place_id_miami_design_district"),
                    bayside: routeDetails("place_id_panorama_tower", "place_id_bayside_marketplace"),
                    littleHavanaHome: routeDetails("place_id_domino_park_calle_ocho_trolley"),
                    littleHavanaOutbound: routeDetails(
                      "place_id_panorama_tower",
                      "place_id_domino_park_calle_ocho_trolley",
                    ),
                    coralWaySchoolOutbound: routeDetails(
                      "place_id_panorama_tower",
                      "place_id_la_prima_casa_montessori_roads_campus",
                    ),
                    coralWaySchoolReturn: routeDetails(
                      "place_id_la_prima_casa_montessori_roads_campus",
                      "place_id_panorama_tower",
                    ),
                    coralWayReturnGraph: auditCoralWayReturn(),
                  },
                },
              ];
            }
            """
        )
        await page.evaluate(
            """
            () => {
              const bounds = L.latLngBounds([]);
              for (const line of app.routeSegmentLines) bounds.extend(line.getBounds());
              if (bounds.isValid()) app.map.fitBounds(bounds, { padding: [70, 70], animate: false });
            }
            """
        )
        await page.wait_for_timeout(250)
        await page.screenshot(path=PROJECT_ROOT / ".tmp" / "south-beach-trolley-qa.png")
        await page.evaluate(
            """
            () => {
              app.travelMode = "metromover";
              app.routeFromId = "place_id_panorama_tower";
              app.routeToId = "place_id_miami_design_district";
              renderRoute();
            }
            """
        )
        await page.wait_for_timeout(250)
        await page.evaluate(
            """
            () => {
              const bounds = L.latLngBounds([]);
              for (const line of app.routeSegmentLines) bounds.extend(line.getBounds());
              if (bounds.isValid()) app.map.fitBounds(bounds, { padding: [70, 70], animate: false });
            }
            """
        )
        await page.wait_for_timeout(250)
        await page.screenshot(path=PROJECT_ROOT / ".tmp" / "biscayne-trolley-qa.png")
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.evaluate(
            """
            () => {
              app.travelMode = "metromover";
              syncTravelModeButtons();
              app.routeFromId = "place_id_panorama_tower";
              app.routeToId = "place_id_la_prima_casa_montessori_roads_campus";
              renderRoute();
              selectPlace("place_id_la_prima_casa_montessori_roads_campus");
              setPlacesPanelCollapsed(true);
              const bounds = L.latLngBounds([]);
              for (const line of app.routeSegmentLines) bounds.extend(line.getBounds());
              if (bounds.isValid()) {
                app.map.fitBounds(bounds, {
                  paddingTopLeft: [20, 90],
                  paddingBottomRight: [20, 315],
                  animate: false,
                });
              }
            }
            """
        )
        await page.wait_for_timeout(250)
        await page.screenshot(path=PROJECT_ROOT / ".tmp" / "coral-way-school-route-qa.png")
        await page.evaluate(
            """
            () => {
              const safeAccessLine = app.routeSegmentLines.at(-1);
              if (safeAccessLine) {
                app.map.fitBounds(safeAccessLine.getBounds(), {
                  paddingTopLeft: [25, 90],
                  paddingBottomRight: [25, 315],
                  animate: false,
                });
              }
            }
            """
        )
        await page.wait_for_timeout(250)
        await page.screenshot(path=PROJECT_ROOT / ".tmp" / "coral-way-school-safe-access-qa.png")
        await page.evaluate(
            """
            () => {
              app.routeFromId = "place_id_la_prima_casa_montessori_roads_campus";
              app.routeToId = "place_id_panorama_tower";
              renderRoute();
              selectPlace("place_id_panorama_tower");
              const bounds = L.latLngBounds([]);
              for (const line of app.routeSegmentLines) bounds.extend(line.getBounds());
              if (bounds.isValid()) {
                app.map.fitBounds(bounds, {
                  paddingTopLeft: [20, 90],
                  paddingBottomRight: [20, 315],
                  animate: false,
                });
              }
            }
            """
        )
        await page.wait_for_timeout(250)
        await page.screenshot(path=PROJECT_ROOT / ".tmp" / "coral-way-school-return-qa.png")
        await page.evaluate(
            """
            () => {
              closeRouteTool();
              app.activeTags.clear();
              app.search = "";
              dom.searchInput.value = "";
              renderTagFilters();
              renderAll();
              setPlacesPanelCollapsed(false);
            }
            """
        )
        await page.locator('[data-tag="transport"]').click()
        await page.wait_for_timeout(250)
        await page.screenshot(path=PROJECT_ROOT / ".tmp" / "transport-filter-qa.png")
        await browser.close()
        return routes


def start_server():
    handler = http.server.SimpleHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    return subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def assert_multimodal(route):
    assert route["combinedTransitUsed"], f"{route['fromName']} -> {route['toName']} did not combine transit: {route}"
    assert route["waterTaxiUsed"], f"{route['fromName']} -> {route['toName']} did not use water taxi: {route}"
    assert route["metromoverUsed"], f"{route['fromName']} -> {route['toName']} did not use Metromover: {route}"
    segment_types = [segment["type"] for segment in route["segments"]]
    assert "water_taxi" in segment_types, f"{route['fromName']} route has no water taxi segment: {route}"
    assert "metromover" in segment_types, f"{route['fromName']} route has no Metromover segment: {route}"
    endpoints = {(segment["startId"], segment["endId"]) for segment in route["segments"]}
    assert (
        ("place_id_water_taxi_mia_miami_beach", "place_id_miami_beach_water_taxi_downtown_miami") in endpoints
        or ("place_id_miami_beach_water_taxi_downtown_miami", "place_id_water_taxi_mia_miami_beach") in endpoints
    ), f"{route['fromName']} route does not cross between the water taxi docks: {route}"


def assert_home_route(route):
    assert_multimodal(route)
    endpoints = {(segment["startId"], segment["endId"]) for segment in route["segments"]}
    assert (
        ("place_id_adrienne_arsht_metromover_station", "place_id_metromover_museum_park_station") in endpoints
        or ("place_id_metromover_museum_park_station", "place_id_adrienne_arsht_metromover_station") in endpoints
    ), f"{route['fromName']} home route does not board through Adrienne Arsht: {route}"
    visited = {segment["startId"] for segment in route["segments"]} | {segment["endId"] for segment in route["segments"]}
    assert "place_id_metromover_tenth_street_promenade_station" in visited, (
        f"{route['fromName']} home route does not reach the Tenth Street station: {route}"
    )


def main():
    server = start_server()
    try:
        routes = asyncio.run(collect_routes())
        for route in routes[:4]:
            assert_home_route(route)
        assert_multimodal(routes[4])
        trolley_routes = routes[5:7]
        for route in trolley_routes:
            assert route["brickellTrolleyUsed"], f"{route['fromName']} -> {route['toName']} did not use Brickell Trolley: {route}"
            assert any(segment["type"] == "brickell_trolley" for segment in route["segments"]), (
                f"{route['fromName']} route has no Brickell Trolley segment: {route}"
            )
        bayshore_route = routes[7]
        assert bayshore_route["brickellTrolleyUsed"], f"Panorama -> Bayshore Club did not use trolley: {bayshore_route}"
        assert [step["type"] for step in bayshore_route["itinerary"]] == [
            "walk",
            "wait",
            "brickell_trolley",
            "walk",
        ], f"unexpected Panorama -> Bayshore itinerary: {bayshore_route}"
        assert bayshore_route["itinerary"][1]["minutes"] == 10, f"unexpected trolley wait: {bayshore_route}"
        assert bayshore_route["itinerary"][2]["minutes"] == 35, f"unexpected trolley ride: {bayshore_route}"
        assert bayshore_route["statusText"].startswith("Transport: Panorama Tower -> Bayshore Club Bar & Grill"), (
            f"route status did not use Transport label: {bayshore_route}"
        )
        assert chr(10) + "Path: Walk " in bayshore_route["statusText"], (
            f"route status has no separate path line: {bayshore_route}"
        )

        water_taxi_itinerary = routes[0]["itinerary"]
        assert any(step["type"] == "wait" and step["minutes"] == 15 for step in water_taxi_itinerary), (
            f"water taxi wait is not separate: {routes[0]}"
        )
        assert any(step["type"] == "water_taxi" and step["minutes"] == 20 for step in water_taxi_itinerary), (
            f"water taxi crossing is not separate: {routes[0]}"
        )

        south_beach_routes = routes[8:11]
        for route in south_beach_routes:
            assert route["southBeachTrolleyUsed"], (
                f"{route['fromName']} -> {route['toName']} did not use South Beach Trolley: {route}"
            )
            assert any(segment["type"] == "south_beach_trolley" for segment in route["segments"]), (
                f"{route['fromName']} route has no South Beach Trolley segment: {route}"
            )
            assert any(step["type"] == "wait" and step["minutes"] == 10 for step in route["itinerary"]), (
                f"{route['fromName']} route has no 10-minute trolley wait: {route}"
            )
            assert any(step["type"] == "south_beach_trolley" and step["minutes"] == 23 for step in route["itinerary"]), (
                f"{route['fromName']} route does not combine the two trolley hops into 23 minutes: {route}"
            )

        full_sofi_route = routes[11]
        assert full_sofi_route["metromoverUsed"], f"Panorama -> South Pointe did not use Metromover: {full_sofi_route}"
        assert full_sofi_route["waterTaxiUsed"], f"Panorama -> South Pointe did not use water taxi: {full_sofi_route}"
        assert full_sofi_route["southBeachTrolleyUsed"], (
            f"Panorama -> South Pointe did not use South Beach Trolley: {full_sofi_route}"
        )

        style_route = routes[12]
        assert style_route["timings"] == {
            "walking6km": 60,
            "metromoverWalking6km": 60,
            "scooterSpeedKmh": 14,
            "scooter7km": 30,
            "scooterJustOver7km": 33,
            "scooter14km": 63,
            "scooterJustOver14km": 68,
        }, f"unexpected walking or scooter timing model: {style_route['timings']}"
        assert style_route["waitAssumptions"] == {
            "metromover": 2.5,
            "waterTaxi": 15,
            "brickellTrolley": 10,
            "southBeachTrolley": 10,
            "biscayneTrolley": 7.5,
            "littleHavanaTrolley": 7.5,
            "coralWayToSchool": 5,
            "coralWayToHome": 10,
        }, f"unexpected sourced transport waits: {style_route['waitAssumptions']}"
        assert style_route["coralWaySchoolAccess"] == {
            "distanceM": 322,
            "minutes": 4,
        }, f"unexpected Coral Way safe school access model: {style_route['coralWaySchoolAccess']}"
        preference = style_route["transportPreference"]
        assert preference["ratio"] == 1.2, f"unexpected Transport preference ratio: {preference}"
        assert preference["below"] == {
            "durationMinutes": 11.99,
            "edgeTypes": ["metromover"],
        }, f"Transport should win just below the 20% boundary: {preference}"
        assert preference["boundary"] == {
            "durationMinutes": 12,
            "edgeTypes": ["metromover"],
        }, f"Transport should win exactly at the 20% boundary: {preference}"
        assert preference["above"] == {
            "durationMinutes": 10,
            "edgeTypes": ["walk"],
        }, f"Walking should win just above the 20% boundary: {preference}"
        home_replacement = style_route["selectionRouting"]["home"]
        assert home_replacement == {
            "fromId": "place_id_panorama_tower",
            "toId": "place_id_trader_joes_miami_beach",
            "selectedId": "place_id_trader_joes_miami_beach",
            "anchorMode": "home",
            "rerendered": True,
            "status": home_replacement["status"],
        }, f"Route Home did not replace its destination: {home_replacement}"
        assert "Panorama Tower -> Trader Joe's" in home_replacement["status"], (
            f"Route Home status did not update to the clicked place: {home_replacement}"
        )
        location_replacement = style_route["selectionRouting"]["location"]
        assert location_replacement == {
            "fromId": "place_id_avo_miami",
            "initialToId": "place_id_trader_joes_miami_beach",
            "toId": "place_id_maurice_gibb_memorial_park",
            "selectedId": "place_id_maurice_gibb_memorial_park",
            "anchorMode": "location",
            "rerendered": True,
            "status": location_replacement["status"],
        }, f"Route Location did not preserve A and replace B with C: {location_replacement}"
        assert "Avo Miami -> Maurice Gibb Memorial Park" in location_replacement["status"], (
            f"Route Location status did not update from A to C: {location_replacement}"
        )

        assert style_route["transportFilter"] == {"tag": "transport", "label": "Transport"}, (
            f"Transport filter definition is wrong: {style_route['transportFilter']}"
        )
        assert style_route["transportPlaceIds"] == style_route["expectedTransportPlaceIds"], (
            f"Transport filter does not exactly cover transit-tagged places: {style_route}"
        )
        assert len(style_route["transportPlaceIds"]) == 20, (
            f"expected 20 combined transport markers, got {style_route['transportPlaceIds']}"
        )
        required_transport_ids = {
            "place_id_water_taxi_mia_miami_beach",
            "place_id_miami_beach_water_taxi_downtown_miami",
            "place_id_brickell_trolley_panorama_stop",
            "place_id_brickell_trolley_city_hall",
            "place_id_south_beach_trolley_alton_10th",
            "place_id_south_beach_trolley_south_pointe",
            "place_id_brickell_station_trolleys",
            "place_id_domino_park_calle_ocho_trolley",
            "place_id_coral_way_trolley_prima_casa",
        }
        assert required_transport_ids.issubset(style_route["transportPlaceIds"]), (
            f"Transport filter is missing boat or trolley markers: {style_route['transportPlaceIds']}"
        )
        expected_trolley_queries = {
            "place_id_brickell_station_trolleys": "Brickell Station, 1001 SW 1st Ave, Miami, FL 33130",
            "place_id_brickell_trolley_city_hall": "Miami City Hall, 3500 Pan American Dr, Miami, FL 33133",
            "place_id_brickell_trolley_panorama_stop": "Brickell Ave & SE 12th St, Miami, FL 33131",
            "place_id_domino_park_calle_ocho_trolley": (
                "Maximo Gomez Park / Domino Park, 801 SW 15th Ave, Miami, FL 33135"
            ),
            "place_id_south_beach_trolley_alton_10th": "Alton Rd & 10th St, Miami Beach, FL 33139",
            "place_id_south_beach_trolley_south_pointe": (
                "South Pointe Dr & Washington Ave, Miami Beach, FL 33139"
            ),
            "place_id_coral_way_trolley_prima_casa": "SW 3rd Ave & SW 27th Rd, Miami, FL 33129",
        }
        actual_trolley_links = {
            link["id"]: link for link in style_route["trolleyGoogleMapsLinks"]
        }
        assert set(actual_trolley_links) == set(expected_trolley_queries), (
            f"Trolley Google Maps audit is incomplete: {actual_trolley_links}"
        )
        for place_id, query in expected_trolley_queries.items():
            link = actual_trolley_links[place_id]
            assert link["query"] == query, f"Unexpected Google Maps query for {place_id}: {link}"
            expected_url = "https://www.google.com/maps/search/" + quote(
                query,
                safe="-_.!~*'()",
            )
            assert link["url"] == expected_url, f"Incorrect Google Maps URL for {place_id}: {link}"
            assert link["renderedUrl"] == expected_url, (
                f"Selecting {place_id} did not wire its title to Google Maps: {link}"
            )
        assert style_route["metromoverStationIds"] == style_route["rawMetromoverIds"], (
            f"non-Metromover transport nodes leaked into the rail graph: {style_route}"
        )
        assert style_route["transportMarkersStyled"], f"not all transport markers use transport styling: {style_route}"
        assert not style_route["lighthousePresent"], "Cape Florida Lighthouse still appears in app state"
        failed_places = [place for place in style_route["newPlaceRoutes"] if not place["routable"]]
        assert not failed_places, f"new places without a local route from Panorama Tower: {failed_places}"
        assert len(style_route["renderStyles"]) >= 3, f"expected multiple route segments: {style_route}"
        assert style_route["renderStyles"][0]["dashArray"] is None, f"first walking leg should be solid: {style_route}"
        assert style_route["renderStyles"][-1]["dashArray"] is None, f"last walking leg should be solid: {style_route}"
        assert any(style["dashArray"] == "2 8" for style in style_route["renderStyles"][1:-1]), (
            f"middle transit legs should be dotted: {style_route}"
        )
        assert style_route["trolleyRenderStyles"][0]["dashArray"] is None, (
            f"first trolley walking leg should be solid: {style_route}"
        )
        assert style_route["trolleyRenderStyles"][-1]["dashArray"] is None, (
            f"last trolley walking leg should be solid: {style_route}"
        )
        assert any(style["dashArray"] == "2 8" for style in style_route["trolleyRenderStyles"][1:-1]), (
            f"trolley ride should be dotted between walking legs: {style_route}"
        )
        assert style_route["southBeachTrolleyRenderStyles"][0]["dashArray"] is None, (
            f"first South Beach trolley walking leg should be solid: {style_route}"
        )
        assert style_route["southBeachTrolleyRenderStyles"][-1]["dashArray"] is None, (
            f"last South Beach trolley walking leg should be solid: {style_route}"
        )
        assert any(
            style["dashArray"] == "2 8" and style["color"] == "#4f63a8"
            for style in style_route["southBeachTrolleyRenderStyles"][1:-1]
        ), f"South Beach trolley ride should be a dotted blue line: {style_route}"

        new_trolley_routes = style_route["newTrolleyRoutes"]
        for area in ("edgewater", "midtown"):
            route = new_trolley_routes[area]
            assert route["metromoverUsed"], f"{area} did not choose the faster Metromover route: {route}"
            assert not route["biscayneTrolleyUsed"], (
                f"{area} incorrectly forced the slower Biscayne Trolley: {route}"
            )

        design_district_route = new_trolley_routes["designDistrict"]
        assert design_district_route["biscayneTrolleyUsed"], (
            f"Design District did not choose Biscayne Trolley: {design_district_route}"
        )
        assert any(segment["type"] == "biscayne_trolley" for segment in design_district_route["segments"]), (
            f"Design District route has no Biscayne Trolley segment: {design_district_route}"
        )
        assert any(
            step["type"] == "wait" and step["minutes"] == 8
            for step in design_district_route["itinerary"]
        ), f"Design District route has no 8-minute Biscayne wait: {design_district_route}"

        bayside_route = new_trolley_routes["bayside"]
        assert bayside_route["metromoverUsed"], f"Bayside should choose Metromover: {bayside_route}"
        assert not bayside_route["biscayneTrolleyUsed"], (
            f"Biscayne Trolley should not displace faster Metromover service to Bayside: {bayside_route}"
        )

        little_havana_home = new_trolley_routes["littleHavanaHome"]
        assert little_havana_home["littleHavanaTrolleyUsed"], (
            f"Domino Park -> home did not choose Little Havana Trolley: {little_havana_home}"
        )
        assert any(step["type"] == "little_havana_trolley" and step["minutes"] == 10
                   for step in little_havana_home["itinerary"]), (
            f"Domino Park return does not use the 10-minute trolley segment: {little_havana_home}"
        )
        little_havana_outbound = new_trolley_routes["littleHavanaOutbound"]
        assert not little_havana_outbound["littleHavanaTrolleyUsed"], (
            f"outbound route incorrectly forced the slow one-way Little Havana loop: {little_havana_outbound}"
        )

        coral_way_outbound = new_trolley_routes["coralWaySchoolOutbound"]
        assert coral_way_outbound["coralWayTrolleyUsed"], (
            f"Panorama -> La Prima Casa did not choose Coral Way Trolley: {coral_way_outbound}"
        )
        assert [step["type"] for step in coral_way_outbound["itinerary"]] == [
            "walk",
            "wait",
            "coral_way_trolley",
            "walk",
        ], f"unexpected school outbound itinerary: {coral_way_outbound}"
        assert coral_way_outbound["itinerary"][1]["minutes"] == 5, (
            f"school outbound did not use timed five-minute wait: {coral_way_outbound}"
        )
        assert coral_way_outbound["itinerary"][2]["minutes"] == 9, (
            f"school outbound ride did not use official 8.5-minute timing: {coral_way_outbound}"
        )
        assert coral_way_outbound["minutes"] == 24, (
            f"school outbound total should include the safe four-minute access walk: {coral_way_outbound}"
        )
        assert coral_way_outbound["itinerary"][-1] == {
            "type": "walk",
            "label": "Walk",
            "minutes": 4,
        }, f"school outbound does not show the four-minute safe crossing walk: {coral_way_outbound}"
        safe_school_access = coral_way_outbound["segments"][-1]
        assert safe_school_access["startId"] == "transit:coral-way:prima-casa-westbound", (
            f"safe school access does not begin at the westbound stop: {safe_school_access}"
        )
        assert safe_school_access["endId"] == "unified:destination", (
            f"safe school access does not end at La Prima Casa: {safe_school_access}"
        )
        assert safe_school_access["distanceM"] == 322, (
            f"safe school access does not preserve Google Maps' 0.2-mile distance: {safe_school_access}"
        )
        assert max(coordinates[0] for coordinates in safe_school_access["coordinates"]) > 25.7559, (
            f"safe school access does not detour north to the SW 26th Road crossing: {safe_school_access}"
        )
        assert any(
            segment["startId"] == "transit:coral-way:brickell-station"
            and segment["endId"] == "transit:coral-way:prima-casa-westbound"
            for segment in coral_way_outbound["segments"]
        ), f"school outbound did not use the westbound SW 27th Road stop: {coral_way_outbound}"

        coral_way_return = new_trolley_routes["coralWaySchoolReturn"]
        coral_way_return_graph = new_trolley_routes["coralWayReturnGraph"]
        assert coral_way_return["coralWayTrolleyUsed"], (
            f"return should prefer the trolley when it is within 20% of walking: {coral_way_return}"
        )
        assert coral_way_return["itinerary"] == [
            {"type": "walk", "label": "Walk", "minutes": 1},
            {"type": "wait", "label": "Wait", "minutes": 10},
            {"type": "coral_way_trolley", "label": "Coral Way Trolley", "minutes": 8},
            {"type": "walk", "label": "Walk", "minutes": 6},
        ], f"unexpected selected school return itinerary: {coral_way_return}"
        assert coral_way_return_graph["boardingWaitMinutes"] == 10, (
            f"school return graph does not use the average ten-minute wait: {coral_way_return_graph}"
        )
        assert 8.4 < coral_way_return_graph["rideMinutes"] < 8.5, (
            f"school return graph does not use official 8.4-minute ride: {coral_way_return_graph}"
        )
        assert coral_way_return_graph["rideStartId"] == "transit:coral-way:prima-casa-eastbound", (
            f"school return graph does not start at the SW 28th Road stop: {coral_way_return_graph}"
        )
        assert coral_way_return_graph["rideEndId"] == "transit:coral-way:brickell-station", (
            f"school return graph does not reach Brickell Station: {coral_way_return_graph}"
        )
        assert coral_way_return_graph["walkingMinutes"] < coral_way_return_graph["transportMinutes"], (
            f"the base shortest-path search should still identify walking as fastest: {coral_way_return_graph}"
        )
        assert coral_way_return_graph["transportMinutes"] <= coral_way_return_graph["preferenceLimitMinutes"], (
            f"the trolley return should fit within the 20% preference limit: {coral_way_return_graph}"
        )
        assert coral_way_return["minutes"] == round(coral_way_return_graph["transportMinutes"]), (
            f"Transport mode did not select the qualified trolley candidate: "
            f"{coral_way_return_graph} vs {coral_way_return}"
        )

        coral_way_markers = [
            place for place in style_route["transportPlaceIds"]
            if place == "place_id_coral_way_trolley_prima_casa"
        ]
        assert coral_way_markers == ["place_id_coral_way_trolley_prima_casa"], (
            f"Coral Way school stops were not merged into one visible marker: {coral_way_markers}"
        )
        assert style_route["coralWayTrolleyRenderStyles"][0]["dashArray"] is None, (
            f"first Coral Way walking leg should be solid: {style_route}"
        )
        assert style_route["coralWayTrolleyRenderStyles"][-1]["dashArray"] is None, (
            f"last Coral Way walking leg should be solid: {style_route}"
        )
        assert any(
            style["dashArray"] == "2 8" and style["color"] == "#8a6d1d"
            for style in style_route["coralWayTrolleyRenderStyles"][1:-1]
        ), f"Coral Way trolley ride should be a dotted ochre line: {style_route}"
        assert style_route["coralWayTrolleyReturnRenderStyles"][0]["dashArray"] is None, (
            f"first Coral Way return walking leg should be solid: {style_route}"
        )
        assert style_route["coralWayTrolleyReturnRenderStyles"][-1]["dashArray"] is None, (
            f"last Coral Way return walking leg should be solid: {style_route}"
        )
        assert any(
            style["dashArray"] == "2 8" and style["color"] == "#8a6d1d"
            for style in style_route["coralWayTrolleyReturnRenderStyles"][1:-1]
        ), f"Coral Way return ride should be a dotted ochre line: {style_route}"

        assert style_route["biscayneTrolleyRenderStyles"][0]["dashArray"] is None, (
            f"first Biscayne walking leg should be solid: {style_route}"
        )
        assert style_route["biscayneTrolleyRenderStyles"][-1]["dashArray"] is None, (
            f"last Biscayne walking leg should be solid: {style_route}"
        )
        assert any(
            style["dashArray"] == "2 8" and style["color"] == "#c75f20"
            for style in style_route["biscayneTrolleyRenderStyles"][1:-1]
        ), f"Biscayne trolley ride should be a dotted orange line: {style_route}"
        for route in routes:
            if "segments" not in route:
                print(
                    f"PASS {route['fromName']} -> {route['toName']}: "
                    f"render styles {route['renderStyles']}"
                )
                continue
            print(
                f"PASS {route['fromName']} -> {route['toName']}: "
                f"{route['minutes']} min, {[segment['type'] for segment in route['segments']]}"
            )
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
