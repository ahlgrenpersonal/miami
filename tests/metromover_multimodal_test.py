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
                  biscayneTrolleyUsed: Boolean(route?.biscayneTrolleyUsed),
                  littleHavanaTrolleyUsed: Boolean(route?.littleHavanaTrolleyUsed),
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
                  },
                  selectionRouting: await testRouteReplacement(),
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
                    "place_id_brickell_station_trolleys",
                    "place_id_domino_park_calle_ocho_trolley",
                    "place_id_margaret_pace_park",
                    "place_id_collection_at_midtown_miami",
                    "place_id_miami_design_district",
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
        }, f"unexpected sourced transport waits: {style_route['waitAssumptions']}"
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
        assert len(style_route["transportPlaceIds"]) == 19, (
            f"expected 19 combined transport markers, got {style_route['transportPlaceIds']}"
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
