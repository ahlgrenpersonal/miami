import asyncio
import http.server
import socketserver
import subprocess
import sys
from pathlib import Path

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
                  })),
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
                    scooter8km: getTravelMinutes(8000, "kid_scooter"),
                    scooterJustOver8km: getTravelMinutes(8001, "kid_scooter"),
                    scooter16km: getTravelMinutes(16000, "kid_scooter"),
                    scooterJustOver16km: getTravelMinutes(16001, "kid_scooter"),
                  },
                  transportFilter: TAG_FILTERS.find((filter) => filter.tag === "transport") || null,
                  transportPlaceIds: app.places
                    .filter((place) => place.filterTags.includes("transport"))
                    .map((place) => place.id)
                    .sort(),
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
        await page.set_viewport_size({"width": 390, "height": 844})
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
            "scooter8km": 30,
            "scooterJustOver8km": 33,
            "scooter16km": 63,
            "scooterJustOver16km": 68,
        }, f"unexpected walking or scooter timing model: {style_route['timings']}"
        assert style_route["transportFilter"] == {"tag": "transport", "label": "Transport"}, (
            f"Transport filter definition is wrong: {style_route['transportFilter']}"
        )
        assert style_route["transportPlaceIds"] == style_route["expectedTransportPlaceIds"], (
            f"Transport filter does not exactly cover transit-tagged places: {style_route}"
        )
        assert len(style_route["transportPlaceIds"]) == 17, (
            f"expected 17 combined transport markers, got {style_route['transportPlaceIds']}"
        )
        required_transport_ids = {
            "place_id_water_taxi_mia_miami_beach",
            "place_id_miami_beach_water_taxi_downtown_miami",
            "place_id_brickell_trolley_panorama_stop",
            "place_id_brickell_trolley_city_hall",
            "place_id_south_beach_trolley_alton_10th",
            "place_id_south_beach_trolley_south_pointe",
        }
        assert required_transport_ids.issubset(style_route["transportPlaceIds"]), (
            f"Transport filter is missing boat or trolley markers: {style_route['transportPlaceIds']}"
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
