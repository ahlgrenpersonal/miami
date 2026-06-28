import math
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TILE_ROOT = ROOT / "web" / "tiles" / "offline"
MIN_ZOOM = 13
MAX_ZOOM = 18
LAND_FILL = "#f1efe7"
LAND_STROKE = "#8ab09d"


CORRECTIONS = [
    {
        "id": "morningside-bayshore-mainland",
        "polygon": [
            (25.8368, -80.1905),
            (25.8364, -80.1796),
            (25.8322, -80.1765),
            (25.8246, -80.1760),
            (25.8162, -80.1769),
            (25.8075, -80.1815),
            (25.8037, -80.1862),
            (25.8062, -80.1901),
            (25.8185, -80.1917),
            (25.8304, -80.1914),
        ],
    },
    {
        "id": "edgewater-pallot-mainland",
        "polygon": [
            (25.8058, -80.1899),
            (25.8052, -80.1804),
            (25.7987, -80.1769),
            (25.7898, -80.1788),
            (25.7892, -80.1887),
            (25.7955, -80.1917),
        ],
    },
    {
        "id": "sunrise-harbor-mainland",
        "polygon": [
            (25.7281, -80.2451),
            (25.7277, -80.2392),
            (25.7227, -80.2393),
            (25.7215, -80.2448),
        ],
    },
    {
        "id": "isla-grande-mainland",
        "polygon": [
            (25.7195, -80.2472),
            (25.7187, -80.2416),
            (25.7110, -80.2427),
            (25.7097, -80.2478),
            (25.7143, -80.2491),
        ],
    },
]

START = "<!-- water-corrections:start -->"
END = "<!-- water-corrections:end -->"


def lat_lon_to_world(lat, lon, zoom):
    scale = 256 * (2**zoom)
    sin_lat = math.sin(math.radians(lat))
    x = (lon + 180.0) / 360.0 * scale
    y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
    return x, y


def lat_lon_to_tile_pixel(lat, lon, zoom, tile_x, tile_y):
    world_x, world_y = lat_lon_to_world(lat, lon, zoom)
    return world_x - tile_x * 256, world_y - tile_y * 256


def tile_range_for_polygon(polygon, zoom):
    xs = []
    ys = []
    for lat, lon in polygon:
        x, y = lat_lon_to_world(lat, lon, zoom)
        xs.append(x / 256)
        ys.append(y / 256)
    return (
        math.floor(min(xs)),
        math.floor(max(xs)),
        math.floor(min(ys)),
        math.floor(max(ys)),
    )


def clip_polygon(points):
    def clip_edge(poly, inside, intersect):
        if not poly:
            return []
        out = []
        prev = poly[-1]
        prev_inside = inside(prev)
        for curr in poly:
            curr_inside = inside(curr)
            if curr_inside:
                if not prev_inside:
                    out.append(intersect(prev, curr))
                out.append(curr)
            elif prev_inside:
                out.append(intersect(prev, curr))
            prev = curr
            prev_inside = curr_inside
        return out

    def intersect_x(bound):
        def inner(a, b):
            ax, ay = a
            bx, by = b
            if bx == ax:
                return (bound, ay)
            t = (bound - ax) / (bx - ax)
            return (bound, ay + t * (by - ay))

        return inner

    def intersect_y(bound):
        def inner(a, b):
            ax, ay = a
            bx, by = b
            if by == ay:
                return (ax, bound)
            t = (bound - ay) / (by - ay)
            return (ax + t * (bx - ax), bound)

        return inner

    clipped = points
    clipped = clip_edge(clipped, lambda p: p[0] >= 0, intersect_x(0))
    clipped = clip_edge(clipped, lambda p: p[0] <= 256, intersect_x(256))
    clipped = clip_edge(clipped, lambda p: p[1] >= 0, intersect_y(0))
    clipped = clip_edge(clipped, lambda p: p[1] <= 256, intersect_y(256))
    return clipped


def path_d(points):
    if len(points) < 3:
        return ""
    coords = [f"{x:.1f},{y:.1f}" for x, y in points]
    return "M" + " L".join(coords) + " Z"


def remove_existing_group(svg):
    return re.sub(
        rf"{re.escape(START)}.*?{re.escape(END)}",
        "",
        svg,
        flags=re.DOTALL,
    )


def insert_group(svg, group):
    insertion = svg.find('<path d="', svg.find("<rect"))
    first_stroked_path = svg.find('fill="none" stroke=', insertion)
    if first_stroked_path != -1:
        path_start = svg.rfind("<path", 0, first_stroked_path)
        if path_start != -1:
            insertion = path_start
    return svg[:insertion] + group + svg[insertion:]


def build_paths_for_tile(zoom, tile_x, tile_y):
    paths = []
    for correction in CORRECTIONS:
        px_points = [
            lat_lon_to_tile_pixel(lat, lon, zoom, tile_x, tile_y)
            for lat, lon in correction["polygon"]
        ]
        clipped = clip_polygon(px_points)
        d = path_d(clipped)
        if not d:
            continue
        paths.append(
            f'<path data-water-correction="land" '
            f'data-water-correction-id="{correction["id"]}" '
            f'd="{d}" fill="{LAND_FILL}" stroke="{LAND_STROKE}" '
            f'stroke-width="0.55"/>'
        )
    return paths


def main():
    touched = 0
    candidate_tiles = set()
    for tile_path in TILE_ROOT.glob("*/*/*.svg"):
        svg = tile_path.read_text(encoding="utf-8")
        if START in svg:
            zoom = int(tile_path.parent.parent.name)
            tile_x = int(tile_path.parent.name)
            tile_y = int(tile_path.stem)
            candidate_tiles.add((zoom, tile_x, tile_y))

    for zoom in range(MIN_ZOOM, MAX_ZOOM + 1):
        for correction in CORRECTIONS:
            min_x, max_x, min_y, max_y = tile_range_for_polygon(correction["polygon"], zoom)
            for tile_x in range(min_x, max_x + 1):
                for tile_y in range(min_y, max_y + 1):
                    candidate_tiles.add((zoom, tile_x, tile_y))

    for zoom, tile_x, tile_y in sorted(candidate_tiles):
        tile_path = TILE_ROOT / str(zoom) / str(tile_x) / f"{tile_y}.svg"
        if not tile_path.exists():
            continue
        svg = remove_existing_group(tile_path.read_text(encoding="utf-8"))
        paths = build_paths_for_tile(zoom, tile_x, tile_y)
        if paths:
            group = START + "".join(paths) + END
            svg = insert_group(svg, group)
        tile_path.write_text(svg, encoding="utf-8", newline="")
        touched += 1
    print(f"Applied water corrections to {touched} tiles.")


if __name__ == "__main__":
    main()
