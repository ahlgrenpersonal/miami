import asyncio
import json
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PORT = 8796
BASE_URL = f"http://127.0.0.1:{PORT}/web/index.html?no-sw=1&qa=crossing-waits"


async def collect_results():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 1000, "height": 800})
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.evaluate("ensureRoutingGraph()")
        results = await page.evaluate(
            """
            () => {
              const loadedSignalNodeCount = app.signalizedCrossingNodeIds.size;
              const edge = (from, to, distanceM, crossing = false) => ({
                from,
                to,
                distance_m: distanceM,
                traffic_crossing: crossing ? 1 : 0,
              });
              const nodes = {
                S: { lat: 25.75, lon: -80.20 },
                A: { lat: 25.75, lon: -80.1999 },
                B: { lat: 25.75, lon: -80.1998 },
                C: { lat: 25.75, lon: -80.1997 },
                D: { lat: 25.75, lon: -80.1996 },
                Y: { lat: 25.7502, lon: -80.1998 },
              };
              const crossingRun = [
                edge("S", "A", 10, true),
                edge("A", "B", 10, true),
                edge("B", "C", 10, true),
                edge("C", "D", 10, false),
              ];

              app.routingGraph = { nodes, edges: crossingRun };
              app.routeNodes = Object.entries(nodes).map(([id, node]) => ({
                id,
                lat: node.lat,
                lon: node.lon,
                coordinates: [node.lat, node.lon],
              }));
              app.routeAdjacency = buildRouteAdjacency(crossingRun);
              app.signalizedCrossingNodeIds = new Set(["A", "B", "C"]);

              const signalSummary = getPedestrianCrossingDelaySummary(crossingRun);
              app.signalizedCrossingNodeIds = new Set();
              const separatedSummary = getPedestrianCrossingDelaySummary([
                edge("S", "A", 10, true),
                edge("A", "B", 10, false),
                edge("B", "C", 10, true),
              ]);
              app.signalizedCrossingNodeIds = new Set(["A", "B", "C"]);
              const signalRoute = findShortestPathBetweenCandidates(
                [{ id: "S", distanceM: 0 }],
                [{ id: "D", distanceM: 0 }],
                "shortest",
              );

              const directSignalEdges = [
                edge("S", "A", 10, true),
                edge("A", "D", 10, false),
              ];
              const detourEdges = [
                edge("S", "Y", 22.5, false),
                edge("Y", "D", 22.5, false),
              ];
              app.routingGraph = { nodes, edges: [...directSignalEdges, ...detourEdges] };
              app.routeAdjacency = buildRouteAdjacency(app.routingGraph.edges);
              app.signalizedCrossingNodeIds = new Set(["A"]);
              const signalChoice = findShortestPathBetweenCandidates(
                [{ id: "S", distanceM: 0 }],
                [{ id: "D", distanceM: 0 }],
                "shortest",
              ).nodeIds;

              app.signalizedCrossingNodeIds = new Set();
              const unsignalizedChoice = findShortestPathBetweenCandidates(
                [{ id: "S", distanceM: 0 }],
                [{ id: "D", distanceM: 0 }],
                "shortest",
              ).nodeIds;

              app.routingGraph = { nodes, edges: crossingRun };
              app.routeAdjacency = buildRouteAdjacency(crossingRun);
              app.signalizedCrossingNodeIds = new Set(["A", "B", "C"]);
              const context = { customAdjacency: new Map(), virtualNodes: new Map() };
              const unifiedWalk = findShortestUnifiedMultimodalPath(context, "S", "D");
              addUnifiedCustomEdge(
                context,
                "C",
                "D",
                createUnifiedMultimodalEdge(
                  "metromover",
                  "C",
                  "D",
                  [nodes.C.lat, nodes.C.lon],
                  [nodes.D.lat, nodes.D.lon],
                  { distanceM: 10, durationMinutes: 1 },
                ),
              );
              const unifiedTransport = findShortestUnifiedMultimodalPathUsingTransport(
                context,
                "S",
                "D",
              );

              const sampleCrossing = crossingRun[0];
              const entryCosts = Object.fromEntries(
                ["shortest", "scenic", "kid_scooter"].map((mode) => [
                  mode,
                  {
                    entering: getEdgeCost(sampleCrossing, mode, { enteringTrafficCrossing: true }),
                    continuing: getEdgeCost(sampleCrossing, mode, { enteringTrafficCrossing: false }),
                  },
                ]),
              );

              return {
                constants: {
                  signalizedSeconds: SIGNALIZED_CROSSING_DELAY_MINUTES * 60,
                  otherSeconds: OTHER_TRAFFIC_CROSSING_DELAY_MINUTES * 60,
                },
                loadedSignalNodeCount,
                signalSummary,
                separatedSummary,
                signalRoute: {
                  nodeIds: signalRoute.nodeIds,
                  edgeCount: signalRoute.edges.length,
                },
                signalChoice,
                unsignalizedChoice,
                unifiedWalk: {
                  durationMinutes: unifiedWalk.durationMinutes,
                  crossingDelayEdges: unifiedWalk.edges
                    .filter((routeEdge) => routeEdge.crossingDelayMinutes > 0)
                    .length,
                  crossingDelayMinutes: unifiedWalk.edges
                    .reduce((sum, routeEdge) => sum + (routeEdge.crossingDelayMinutes || 0), 0),
                },
                unifiedTransport: {
                  durationMinutes: unifiedTransport.durationMinutes,
                  edgeTypes: unifiedTransport.edges.map((routeEdge) => routeEdge.type),
                  crossingDelayEdges: unifiedTransport.edges
                    .filter((routeEdge) => routeEdge.crossingDelayMinutes > 0)
                    .length,
                },
                entryCosts,
              };
            }
            """
        )
        await browser.close()
        return results


def main():
    server = subprocess.Popen(
        ["python", "-m", "http.server", str(PORT)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(0.8)
        results = asyncio.run(collect_results())

        assert results["constants"] == {
            "signalizedSeconds": 20,
            "otherSeconds": 2,
        }, results
        assert results["loadedSignalNodeCount"] > 5000, results
        assert results["signalSummary"] == {
            "totalMinutes": 20 / 60,
            "signalizedCount": 1,
            "otherCount": 0,
        }, results
        assert results["separatedSummary"] == {
            "totalMinutes": 4 / 60,
            "signalizedCount": 0,
            "otherCount": 2,
        }, results
        assert results["signalRoute"]["nodeIds"] == ["S", "A", "B", "C", "D"], results
        assert results["signalRoute"]["edgeCount"] == 4, results
        assert results["signalChoice"] == ["S", "Y", "D"], results
        assert results["unsignalizedChoice"] == ["S", "A", "D"], results

        assert results["unifiedWalk"]["crossingDelayEdges"] == 1, results
        assert abs(results["unifiedWalk"]["crossingDelayMinutes"] - 20 / 60) < 1e-9, results
        assert results["unifiedTransport"]["crossingDelayEdges"] == 1, results
        assert results["unifiedTransport"]["edgeTypes"][-1] == "metromover", results

        expected_entry_penalties = {
            "shortest": 6 * 1000 * (20 / 60) / 60,
            "scenic": 24 + 6 * 1000 * (20 / 60) / 60,
            "kid_scooter": 42 + 14 * 1000 * (20 / 60) / 60,
        }
        for mode, expected in expected_entry_penalties.items():
            actual = (
                results["entryCosts"][mode]["entering"]
                - results["entryCosts"][mode]["continuing"]
            )
            assert abs(actual - expected) < 1e-9, (mode, actual, expected, results)

        print(json.dumps(results, indent=2))
        print("pedestrian crossing wait tests passed")
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
