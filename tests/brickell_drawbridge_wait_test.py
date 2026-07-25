import asyncio
import http.server
import socketserver
import subprocess
import sys
from pathlib import Path

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PORT = 8792
BASE_URL = f"http://127.0.0.1:{PORT}/web/index.html?qa=brickell-drawbridge-wait-test"


async def collect_results():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 1000, "height": 800})
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(800)
        results = await page.evaluate(
            """
            async () => {
              await ensureRoutingGraph();
              const edgeByEndpoints = (from, to) => app.routingGraph.edges.find(
                (edge) => edge.from === from && edge.to === to,
              );
              const routeBetween = (from, to, mode) => {
                const result = findShortestPathBetweenCandidates(
                  [{ id: from, distanceM: 0 }],
                  [{ id: to, distanceM: 0 }],
                  mode,
                );
                const distanceM = result.edges.reduce((sum, edge) => sum + edge.distance_m, 0);
                const bridgeWaitMinutes = result.edges.reduce(
                  (sum, edge) => sum + getBrickellDrawbridgeWaitMinutes(edge),
                  0,
                );
                return {
                  bridgeWaitMinutes,
                  movingMinutes: getTravelMinutes(distanceM, mode),
                  totalMinutes: getTravelMinutes(distanceM, mode) + bridgeWaitMinutes,
                  gateEdges: result.edges
                    .filter((edge) => getBrickellDrawbridgeWaitMinutes(edge))
                    .map((edge) => `${edge.from}|${edge.to}`),
                  edges: result.edges.map((edge) => ({
                    from: edge.from,
                    to: edge.to,
                    name: edge.name,
                    highway: edge.highway,
                    footway: edge.footway,
                    distanceM: edge.distance_m,
                  })),
                };
              };
              const northGate = edgeByEndpoints("osm:9173470943", "osm:9173470946");
              const southGate = edgeByEndpoints("osm:9173470945", "osm:9173470944");
              const westSidewalkGate = edgeByEndpoints("osm:9173470948", "osm:9173470947");
              const eastSidewalkGate = edgeByEndpoints("osm:9173470949", "osm:9173470950");
              const outerSpan = edgeByEndpoints("osm:532214047", "osm:9173470943");
              const home = app.places.find((place) => place.id === "place_id_panorama_tower");
              const bayfront = app.places.find((place) => place.id === "place_id_bayfront_park_playground");
              const appRoute = getGraphRoute(home.coordinates, bayfront.coordinates, "shortest");
              return {
                waitConstant: BRICKELL_DRAWBRIDGE_WAIT_MINUTES,
                appRoute: {
                  bridgeWaitMinutes: appRoute.bridgeWaitMinutes,
                  crossingDelayMinutes: appRoute.crossingDelayMinutes,
                  movingMinutes: getTravelMinutes(appRoute.distanceM, "shortest"),
                  durationMinutes: appRoute.durationMinutes,
                },
                directEdgeWaits: {
                  north: getBrickellDrawbridgeWaitMinutes(northGate),
                  south: getBrickellDrawbridgeWaitMinutes(southGate),
                  westSidewalk: getBrickellDrawbridgeWaitMinutes(westSidewalkGate),
                  eastSidewalk: getBrickellDrawbridgeWaitMinutes(eastSidewalkGate),
                  outer: getBrickellDrawbridgeWaitMinutes(outerSpan),
                },
                penaltyMeters: {
                  shortest: getBrickellDrawbridgePenaltyM(northGate, getRoutingProfile("shortest")),
                  scenic: getBrickellDrawbridgePenaltyM(northGate, getRoutingProfile("scenic")),
                  scooter: getBrickellDrawbridgePenaltyM(northGate, getRoutingProfile("kid_scooter")),
                },
                northbound: Object.fromEntries(
                  ["shortest", "scenic", "kid_scooter"].map((mode) => [
                    mode,
                    routeBetween("osm:532214047", "osm:532214050", mode),
                  ]),
                ),
                southbound: Object.fromEntries(
                  ["shortest", "scenic", "kid_scooter"].map((mode) => [
                    mode,
                    routeBetween("osm:99078090", "osm:99416080", mode),
                  ]),
                ),
              };
            }
            """
        )
        await browser.close()
        return results


def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    return subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    server = start_server()
    try:
        results = asyncio.run(collect_results())
        assert results["waitConstant"] == 3, results
        assert results["appRoute"]["bridgeWaitMinutes"] == 3, results
        expected_app_minutes = round(
            results["appRoute"]["movingMinutes"]
            + results["appRoute"]["bridgeWaitMinutes"]
            + results["appRoute"]["crossingDelayMinutes"]
        )
        assert results["appRoute"]["durationMinutes"] == expected_app_minutes, results
        assert results["directEdgeWaits"] == {
            "north": 3,
            "south": 3,
            "westSidewalk": 3,
            "eastSidewalk": 3,
            "outer": 0,
        }, results
        assert results["penaltyMeters"] == {
            "shortest": 300,
            "scenic": 300,
            "scooter": 700,
        }, results

        expected_gates = {
            "northbound": "osm:9173470943|osm:9173470946",
            "southbound": "osm:9173470945|osm:9173470944",
        }
        for direction in ("northbound", "southbound"):
            for mode, route in results[direction].items():
                assert route["bridgeWaitMinutes"] == 3, f"{direction} {mode}: {route}"
                assert route["totalMinutes"] == route["movingMinutes"] + 3, f"{direction} {mode}: {route}"
                assert route["gateEdges"] == [expected_gates[direction]], f"{direction} {mode}: {route}"
        print("Brickell drawbridge wait tests passed")
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
