import asyncio
import http.server
import socketserver
import subprocess
import sys
from pathlib import Path

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PORT = 8793
BASE_URL = f"http://127.0.0.1:{PORT}/web/index.html?qa=metrobus-26-test"
SCREENSHOT_PATH = PROJECT_ROOT / ".tmp" / "metrobus-26-crandon-qa.png"


async def collect_results():
    console_errors = []
    failed_requests = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("requestfailed", lambda request: failed_requests.append(f"{request.url}: {request.failure}"))
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        results = await page.evaluate(
            """
            async () => {
              await ensureRoutingGraph();
              const byId = (id) => app.places.find((place) => place.id === id);
              const summarize = (fromId, toId) => {
                const from = byId(fromId);
                const to = byId(toId);
                const route = getMetromoverRoute(from.coordinates, to.coordinates);
                return {
                  fromId,
                  toId,
                  minutes: route?.durationMinutes ?? null,
                  metrobus26Used: Boolean(route?.metrobus26Used),
                  transitUsed: Boolean(route?.transitUsed),
                  segmentTypes: (route?.segments || []).map((segment) => segment.type),
                  busSegments: (route?.segments || [])
                    .filter((segment) => segment.type === "metrobus_26")
                    .map((segment) => ({
                      startId: segment.startId,
                      endId: segment.endId,
                      minutes: segment.durationMinutes,
                    })),
                  itinerary: route?.itinerary || [],
                  status: route ? formatRouteStatus("Transport", from, to, route, "metromover") : null,
                  coordinates: route?.coordinates || [],
                  renderStyles: (() => {
                    if (!route) return [];
                    renderRouteGeometry(route, "metromover");
                    return app.routeSegmentLines.map((line) => ({
                      color: line.options.color,
                      dashArray: line.options.dashArray || null,
                    }));
                  })(),
                };
              };
              const routes = {
                homeToHobie: summarize("place_id_panorama_tower", "place_id_hobie_island_beach_park"),
                hobieToHome: summarize("place_id_hobie_island_beach_park", "place_id_panorama_tower"),
                homeToCrandon: summarize("place_id_panorama_tower", "place_id_crandon_beach"),
                crandonToHome: summarize("place_id_crandon_beach", "place_id_panorama_tower"),
              };
              const visibleStops = METROBUS_26_VISIBLE_STOP_IDS.map((id) => byId(id)).map((place) => ({
                id: place.id,
                name: place.name,
                filterTags: place.filterTags,
                searchText: place.searchText,
                mapsUrl: getGoogleMapsUrl(place),
              }));
              return {
                routes,
                visibleStops,
                waitMinutes: METROBUS_26_WAIT_MINUTES,
                virtualStopIds: METROBUS_26_VIRTUAL_STOPS.map((stop) => stop.id),
              };
            }
            """
        )

        await page.evaluate(
            """
            async () => {
              const home = app.places.find((place) => place.id === "place_id_panorama_tower");
              const beach = app.places.find((place) => place.id === "place_id_crandon_beach");
              const route = getMetromoverRoute(home.coordinates, beach.coordinates);
              closeRouteTool();
              setPlacesPanelCollapsed(true);
              app.selectedId = beach.id;
              app.routeFromId = home.id;
              app.routeToId = beach.id;
              app.travelMode = "metromover";
              renderDetail(beach);
              renderMarkers();
              renderRouteGeometry(route, "metromover");
              dom.routeStatus.textContent = formatRouteStatus("Transport", home, beach, route, "metromover");
              dom.clearRoute.hidden = false;
              const bounds = L.latLngBounds(route.coordinates);
              app.map.fitBounds(bounds, {
                animate: false,
                paddingTopLeft: [20, 100],
                paddingBottomRight: [20, 255],
              });
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
            """
        )
        SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=SCREENSHOT_PATH)
        await browser.close()
    return results, console_errors, failed_requests


def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    return subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def assert_route(route, expected_pairs, expected_ride_minutes):
    assert route["metrobus26Used"], route
    assert route["transitUsed"], route
    assert route["segmentTypes"][0] == "walk", route
    assert route["segmentTypes"][-1] == "walk", route
    assert all(pair in {
        (segment["startId"], segment["endId"])
        for segment in route["busSegments"]
    } for pair in expected_pairs), route
    assert round(sum(segment["minutes"] for segment in route["busSegments"]), 1) == expected_ride_minutes, route
    assert any(step["type"] == "wait" and step["minutes"] == 15 for step in route["itinerary"]), route
    assert any(step["type"] == "metrobus_26" for step in route["itinerary"]), route
    assert "Metrobus 26" in route["status"], route
    bus_styles = [style for style in route["renderStyles"] if style["color"] == "#008fa8"]
    assert bus_styles and all(style["dashArray"] == "2 8" for style in bus_styles), route
    walking_styles = [style for style in route["renderStyles"] if style["color"] != "#008fa8"]
    assert walking_styles and all(style["dashArray"] is None for style in walking_styles), route


def main():
    server = start_server()
    try:
        results, console_errors, failed_requests = asyncio.run(collect_results())
        routes = results["routes"]
        assert results["waitMinutes"] == 15
        assert results["virtualStopIds"] == [
            "transit:metrobus26:crandon-northbound",
            "transit:metrobus26:hobie-northbound",
            "transit:metrobus26:panorama-northbound",
        ]

        assert_route(
            routes["homeToHobie"],
            [("place_id_metrobus_26_panorama", "place_id_metrobus_26_hobie_beach")],
            14,
        )
        assert_route(
            routes["hobieToHome"],
            [("transit:metrobus26:hobie-northbound", "transit:metrobus26:panorama-northbound")],
            10,
        )
        assert_route(
            routes["homeToCrandon"],
            [
                ("place_id_metrobus_26_panorama", "place_id_metrobus_26_hobie_beach"),
                ("place_id_metrobus_26_hobie_beach", "place_id_metrobus_26_crandon_beach"),
            ],
            25,
        )
        assert_route(
            routes["crandonToHome"],
            [
                ("transit:metrobus26:crandon-northbound", "transit:metrobus26:hobie-northbound"),
                ("transit:metrobus26:hobie-northbound", "transit:metrobus26:panorama-northbound"),
            ],
            19.5,
        )

        assert [stop["id"] for stop in results["visibleStops"]] == [
            "place_id_metrobus_26_panorama",
            "place_id_metrobus_26_hobie_beach",
            "place_id_metrobus_26_crandon_beach",
        ]
        for stop in results["visibleStops"]:
            assert "transport" in stop["filterTags"], stop
            assert "metrobus 26" in stop["searchText"], stop
            assert stop["mapsUrl"].startswith("https://www.google.com/maps/search/"), stop

        assert not console_errors, console_errors
        assert not failed_requests, failed_requests
        print("Metrobus 26 multimodal routing checks passed")
        for key, route in routes.items():
            print(f"{key}: {route['minutes']} min | {route['status'].replace(chr(10), ' | ')}")
        print(f"Visual QA screenshot: {SCREENSHOT_PATH}")
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()