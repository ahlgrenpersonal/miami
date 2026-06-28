import math
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TILE_ROOT = ROOT / "web" / "tiles" / "offline"
TEST_ZOOMS = [13, 14, 15, 16, 17, 18]

LAND_GUARDS = [
    ("morningside north grid", 25.8330, -80.1850, "morningside-bayshore-mainland"),
    ("morningside east grid", 25.8270, -80.1785, "morningside-bayshore-mainland"),
    ("morningside central grid", 25.8246, -80.1815, "morningside-bayshore-mainland"),
    ("morningside mid grid", 25.8180, -80.1840, "morningside-bayshore-mainland"),
    ("morningside south grid", 25.8110, -80.1850, "morningside-bayshore-mainland"),
    ("bayshore north grid", 25.8020, -80.1850, "edgewater-pallot-mainland"),
    ("bayshore south grid", 25.7996, -80.1826, "edgewater-pallot-mainland"),
    ("edgewater pallot south grid", 25.7940, -80.1840, "edgewater-pallot-mainland"),
    ("sunrise harbor north land", 25.7270, -80.2420, "sunrise-harbor-mainland"),
    ("sunrise harbor central land", 25.7257, -80.2421, "sunrise-harbor-mainland"),
    ("sunrise harbor south land", 25.7236, -80.2422, "sunrise-harbor-mainland"),
    ("isla grande north land", 25.7180, -80.2440, "isla-grande-mainland"),
    ("isla grande central land", 25.7168, -80.2450, "isla-grande-mainland"),
    ("isla grande south land", 25.7132, -80.2455, "isla-grande-mainland"),
]

WATER_GUARDS = [
    ("open bay east of morningside", 25.8216, -80.1647),
    ("morningside nearshore bay", 25.8240, -80.1730),
    ("morningside south nearshore bay", 25.8100, -80.1755),
    ("edgewater pallot bay", 25.7980, -80.1745),
    ("bird key channel", 25.8253, -80.1690),
    ("sunrise harbor outer bay", 25.7262, -80.2248),
    ("sunrise harbor east water", 25.7250, -80.2365),
    ("sunrise harbor channel", 25.7210, -80.2392),
    ("isla grande outer bay", 25.7140, -80.2243),
    ("isla grande east water", 25.7160, -80.2390),
    ("dinner key open bay", 25.7080, -80.2290),
    ("grove open bay", 25.7050, -80.2400),
]


def lat_lon_to_world(lat, lon, zoom):
    scale = 256 * (2**zoom)
    sin_lat = math.sin(math.radians(lat))
    x = (lon + 180.0) / 360.0 * scale
    y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
    return x, y


def tile_for(lat, lon, zoom):
    world_x, world_y = lat_lon_to_world(lat, lon, zoom)
    tile_x = math.floor(world_x / 256)
    tile_y = math.floor(world_y / 256)
    return tile_x, tile_y, world_x - tile_x * 256, world_y - tile_y * 256


def correction_paths(svg):
    pattern = re.compile(
        r'<path[^>]*data-water-correction="land"[^>]*data-water-correction-id="([^"]+)"[^>]*d="([^"]+)"',
    )
    return [(match.group(1), parse_path(match.group(2))) for match in pattern.finditer(svg)]


def parse_path(d):
    values = [float(value) for value in re.findall(r"-?\d+(?:\.\d+)?", d)]
    return list(zip(values[0::2], values[1::2]))


def contains_point(polygon, point):
    x, y = point
    inside = False
    previous_x, previous_y = polygon[-1]
    for current_x, current_y in polygon:
        crosses = (current_y > y) != (previous_y > y)
        if crosses:
            slope_x = (previous_x - current_x) * (y - current_y) / (previous_y - current_y) + current_x
            if x < slope_x:
                inside = not inside
        previous_x, previous_y = current_x, current_y
    return inside


def paths_covering_point(lat, lon, zoom):
    tile_x, tile_y, px, py = tile_for(lat, lon, zoom)
    tile_path = TILE_ROOT / str(zoom) / str(tile_x) / f"{tile_y}.svg"
    assert tile_path.exists(), f"Missing tile {tile_path}"
    svg = tile_path.read_text(encoding="utf-8")
    return [
        correction_id
        for correction_id, polygon in correction_paths(svg)
        if contains_point(polygon, (px, py))
    ]


def test_land_guard_points_have_expected_corrections():
    for zoom in TEST_ZOOMS:
        for name, lat, lon, expected_id in LAND_GUARDS:
            covering = paths_covering_point(lat, lon, zoom)
            assert expected_id in covering, (
                f"{name} at z{zoom} should be covered by {expected_id}; got {covering}"
            )


def test_water_guard_points_are_not_covered_by_land_corrections():
    for zoom in TEST_ZOOMS:
        for name, lat, lon in WATER_GUARDS:
            covering = paths_covering_point(lat, lon, zoom)
            assert not covering, f"{name} at z{zoom} should remain water; got {covering}"


if __name__ == "__main__":
    test_land_guard_points_have_expected_corrections()
    test_water_guard_points_are_not_covered_by_land_corrections()
    print("offline water correction tests passed")
