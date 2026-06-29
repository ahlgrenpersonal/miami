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
                  combinedTransitUsed: Boolean(route?.combinedTransitUsed),
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
                {
                  fromId: "place_id_panorama_tower",
                  fromName: "Panorama Tower",
                  toId: "place_id_bayfront_park_playground",
                  toName: "Bayfront Park Playground",
                  renderStyles: await routeRenderStyles("place_id_panorama_tower", "place_id_bayfront_park_playground"),
                },
              ];
            }
            """
        )
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
        style_route = routes[5]
        assert len(style_route["renderStyles"]) >= 3, f"expected multiple route segments: {style_route}"
        assert style_route["renderStyles"][0]["dashArray"] is None, f"first walking leg should be solid: {style_route}"
        assert style_route["renderStyles"][-1]["dashArray"] is None, f"last walking leg should be solid: {style_route}"
        assert any(style["dashArray"] == "2 8" for style in style_route["renderStyles"][1:-1]), (
            f"middle transit legs should be dotted: {style_route}"
        )
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
