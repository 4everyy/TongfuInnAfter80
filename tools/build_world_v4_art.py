from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path(r"D:\AI\design-assets\tongfu-ui\world-v4\masters")
RUNTIME_DIR = ROOT / "minigame" / "assets" / "art" / "maps"
REPORT_PATH = (
    ROOT
    / "outputs"
    / "creative-production"
    / "world-v4"
    / "runtime-art-report.json"
)

JPEG_QUALITY = 86
MASK_SUPERSAMPLE = 4

Point = tuple[float, float]
Polygon = tuple[Point, ...]


@dataclass(frozen=True)
class PropSpec:
    id: str
    filename: str
    polygons: tuple[Polygon, ...]
    feather: float = 1.25


@dataclass(frozen=True)
class MapSpec:
    id: str
    source_size: tuple[int, int]
    output_size: tuple[int, int]
    crop_top: float
    props: tuple[PropSpec, ...] = ()


MAPS: tuple[MapSpec, ...] = (
    MapSpec(
        id="inn",
        source_size=(1536, 1024),
        output_size=(1000, 348),
        crop_top=250.0,
        props=(
            PropSpec(
                id="left_table",
                filename="occluder_left_table.png",
                polygons=(
                    ((0, 694), (66, 694), (70, 702), (148, 703), (205, 729), (205, 753), (114, 785), (0, 785)),
                ),
                feather=1.2,
            ),
        ),
    ),
    MapSpec(
        id="yard",
        source_size=(1536, 1024),
        output_size=(900, 348),
        crop_top=90.0,
        props=(
            PropSpec(
                id="training_dummy",
                filename="occluder_training_dummy.png",
                polygons=(
                    ((1365, 438), (1418, 451), (1420, 684), (1360, 684)),
                    ((1310, 557), (1369, 568), (1368, 603), (1316, 594)),
                    ((1415, 588), (1502, 611), (1492, 642), (1416, 620)),
                ),
                feather=1.35,
            ),
        ),
    ),
    MapSpec(
        id="street",
        source_size=(1823, 863),
        output_size=(1200, 348),
        crop_top=70.0,
        props=(
            PropSpec(
                id="right_shopfront",
                filename="occluder_right_shopfront.png",
                polygons=(
                    (
                        (1694, 251),
                        (1823, 279),
                        (1823, 599),
                        (1661, 599),
                        (1655, 553),
                        (1644, 516),
                        (1651, 461),
                        (1637, 418),
                        (1650, 383),
                        (1656, 317),
                    ),
                ),
                feather=1.3,
            ),
        ),
    ),
    MapSpec(
        id="locust_lane",
        source_size=(1822, 863),
        output_size=(1000, 348),
        crop_top=45.0,
        props=(
            PropSpec(
                id="right_wall",
                filename="occluder_right_wall.png",
                polygons=(
                    (
                        (1760, 157),
                        (1822, 145),
                        (1822, 680),
                        (1649, 680),
                        (1658, 646),
                        (1683, 616),
                        (1714, 594),
                        (1740, 508),
                        (1754, 426),
                    ),
                ),
                feather=1.35,
            ),
        ),
    ),
    MapSpec(
        id="tea_shed",
        source_size=(1672, 941),
        output_size=(950, 348),
        crop_top=18.0,
    ),
    MapSpec(
        id="east_gate",
        source_size=(1672, 941),
        output_size=(950, 348),
        crop_top=35.0,
        props=(
            PropSpec(
                id="left_guard_table",
                filename="occluder_left_guard_table.png",
                polygons=(
                    ((108, 444), (292, 437), (339, 468), (151, 488)),
                    ((126, 482), (318, 466), (316, 556), (130, 577)),
                    ((126, 551), (154, 550), (152, 608), (129, 611)),
                ),
                feather=1.3,
            ),
        ),
    ),
    MapSpec(
        id="stone_bridge",
        source_size=(1672, 941),
        output_size=(1050, 348),
        crop_top=145.0,
    ),
)


def relative_path(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path).replace("\\", "/")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def crop_box(source_size: tuple[int, int], output_size: tuple[int, int], top: float) -> tuple[float, float, float, float]:
    source_width, source_height = source_size
    output_width, output_height = output_size
    height = source_width * output_height / output_width
    bottom = top + height
    if top < 0 or bottom > source_height:
        raise ValueError(f"Crop {(0.0, top, float(source_width), bottom)} exceeds source {source_size}")
    return 0.0, top, float(source_width), bottom


def polygon_bounds(polygons: tuple[Polygon, ...], padding: int) -> tuple[int, int, int, int]:
    points = [point for polygon in polygons for point in polygon]
    left = math.floor(min(point[0] for point in points)) - padding
    top = math.floor(min(point[1] for point in points)) - padding
    right = math.ceil(max(point[0] for point in points)) + padding + 1
    bottom = math.ceil(max(point[1] for point in points)) + padding + 1
    return left, top, right, bottom


def draw_prop_mask(prop: PropSpec, bounds: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = bounds
    width = (right - left) * MASK_SUPERSAMPLE
    height = (bottom - top) * MASK_SUPERSAMPLE
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for polygon in prop.polygons:
        scaled = [
            (
                round((x - left) * MASK_SUPERSAMPLE),
                round((y - top) * MASK_SUPERSAMPLE),
            )
            for x, y in polygon
        ]
        draw.polygon(scaled, fill=255)
    if prop.feather:
        mask = mask.filter(ImageFilter.GaussianBlur(prop.feather * MASK_SUPERSAMPLE))
    return mask.resize((right - left, bottom - top), Image.Resampling.LANCZOS)


def build_prop(
    source: Image.Image,
    spec: MapSpec,
    prop: PropSpec,
    box: tuple[float, float, float, float],
    map_dir: Path,
) -> dict:
    crop_left, crop_top, crop_right, crop_bottom = box
    padding = max(4, math.ceil(prop.feather * 4))
    left, top, right, bottom = polygon_bounds(prop.polygons, padding)
    left = max(math.floor(crop_left), left)
    top = max(math.floor(crop_top), top)
    right = min(math.ceil(crop_right), right)
    bottom = min(math.ceil(crop_bottom), bottom)
    bounds = left, top, right, bottom
    if left >= right or top >= bottom:
        raise ValueError(f"Prop {spec.id}/{prop.id} does not intersect its map crop")

    mask = draw_prop_mask(prop, bounds)
    source_crop = source.crop(bounds).convert("RGBA")
    source_crop.putalpha(mask)

    scale = spec.output_size[0] / spec.source_size[0]
    runtime_left = round((left - crop_left) * scale)
    runtime_top = round((top - crop_top) * scale)
    runtime_right = round((right - crop_left) * scale)
    runtime_bottom = round((bottom - crop_top) * scale)
    runtime_size = runtime_right - runtime_left, runtime_bottom - runtime_top
    if runtime_size[0] <= 0 or runtime_size[1] <= 0:
        raise ValueError(f"Prop {spec.id}/{prop.id} became empty at runtime size")

    runtime_prop = source_crop.resize(runtime_size, Image.Resampling.LANCZOS)
    alpha_bbox = runtime_prop.getchannel("A").getbbox()
    if not alpha_bbox:
        raise ValueError(f"Prop {spec.id}/{prop.id} has no visible alpha")
    if alpha_bbox != (0, 0, *runtime_prop.size):
        runtime_prop = runtime_prop.crop(alpha_bbox)
        runtime_left += alpha_bbox[0]
        runtime_top += alpha_bbox[1]

    output_path = map_dir / prop.filename
    runtime_prop.save(output_path, format="PNG", optimize=True, compress_level=9)
    alpha = runtime_prop.getchannel("A")
    alpha_extrema = alpha.getextrema()
    runtime_bounds = [runtime_left, runtime_top, runtime_prop.width, runtime_prop.height]
    return {
        "id": prop.id,
        "filename": prop.filename,
        "path": relative_path(output_path),
        "sourceBounds": [left, top, right - left, bottom - top],
        "runtimeBounds": runtime_bounds,
        "bounds": {
            "x": runtime_bounds[0],
            "y": runtime_bounds[1],
            "width": runtime_bounds[2],
            "height": runtime_bounds[3],
        },
        "featherSourcePixels": prop.feather,
        "alphaExtrema": list(alpha_extrema),
        "bytes": output_path.stat().st_size,
        "sha256": sha256(output_path),
    }


def build_map(spec: MapSpec) -> dict:
    source_path = SOURCE_DIR / f"{spec.id}-master.png"
    if not source_path.is_file():
        raise FileNotFoundError(source_path)

    with Image.open(source_path) as opened:
        if opened.size != spec.source_size:
            raise ValueError(f"Unexpected size for {source_path}: {opened.size}, expected {spec.source_size}")
        source = opened.convert("RGB")

    box = crop_box(spec.source_size, spec.output_size, spec.crop_top)
    background = source.resize(
        spec.output_size,
        Image.Resampling.LANCZOS,
        box=box,
        reducing_gap=3.0,
    )

    map_dir = RUNTIME_DIR / spec.id
    map_dir.mkdir(parents=True, exist_ok=True)
    background_path = map_dir / "far.jpg"
    background.save(
        background_path,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
        progressive=True,
        subsampling=1,
    )

    props = [build_prop(source, spec, prop, box, map_dir) for prop in spec.props]
    return {
        "id": spec.id,
        "source": relative_path(source_path),
        "sourceSize": list(spec.source_size),
        "cropBox": [round(value, 4) for value in box],
        "cropMode": "full-width vertical crop; uniform scale",
        "output": {
            "filename": background_path.name,
            "path": relative_path(background_path),
            "size": list(background.size),
            "format": "JPEG",
            "quality": JPEG_QUALITY,
            "progressive": True,
            "optimized": True,
            "subsampling": "4:2:2",
            "bytes": background_path.stat().st_size,
            "sha256": sha256(background_path),
        },
        "props": props,
    }


def main() -> None:
    if ROOT.drive.upper() == "C:":
        raise RuntimeError(f"Refusing to write runtime art on drive C: {ROOT}")
    report = {
        "version": 4,
        "generator": relative_path(Path(__file__).resolve()),
        "sourceRoot": relative_path(SOURCE_DIR),
        "runtimeRoot": relative_path(RUNTIME_DIR),
        "boundsConvention": "cropBox=[left,top,right,bottom]; sourceBounds/runtimeBounds=[x,y,width,height]",
        "maps": [build_map(spec) for spec in MAPS],
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
