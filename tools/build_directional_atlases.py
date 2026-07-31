from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(r"D:\AI\design-assets\tongfu-ui\world-v4\directions")
RUNTIME_ROOT = ROOT / "minigame" / "assets" / "art" / "characters"
REPORT_PATH = ROOT / "outputs" / "creative-production" / "world-v4" / "directional-atlas-report.json"

ROLES = ("xiangyu", "zhantang", "furong", "xiucai")
FRAME_WIDTH = 192
FRAME_HEIGHT = 256
PIVOT_X = 96
PIVOT_Y = 244
ATLAS_COLUMNS = 8


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    source = image.convert("RGB")
    output = Image.new("RGBA", source.size)
    source_pixels = source.load()
    output_pixels = output.load()
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue = source_pixels[x, y]
            distance = math.sqrt((255 - red) ** 2 + green ** 2 + (255 - blue) ** 2)
            if distance <= 12:
                alpha = 0
            elif distance >= 92:
                alpha = 255
            else:
                alpha = round((distance - 12) / 80 * 255)
            if alpha < 250:
                red = min(red, green + 12)
                blue = min(blue, green + 12)
            output_pixels[x, y] = (red, green, blue, alpha)
    contracted = output.getchannel("A").filter(ImageFilter.MinFilter(3))
    output.putalpha(contracted)
    return output


def source_frames(path: Path) -> list[Image.Image]:
    image = chroma_to_alpha(Image.open(path))
    frames = []
    for index in range(8):
        left = round(index * image.width / 8)
        right = round((index + 1) * image.width / 8)
        cell = keep_center_component(image.crop((left, 0, right, image.height)))
        box = cell.getchannel("A").getbbox()
        if not box:
            raise ValueError(f"{path.name} frame {index + 1} is empty")
        frames.append(cell.crop(box))
    return frames


def keep_center_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    binary = alpha.point(lambda value: 255 if value > 24 else 0)
    pixels = binary.load()
    center_x = image.width // 2
    center_y = image.height // 2
    seed = None
    best_distance = None
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y] == 0:
                continue
            candidate_distance = (x - center_x) ** 2 + (y - center_y) ** 2
            if best_distance is None or candidate_distance < best_distance:
                seed = (x, y)
                best_distance = candidate_distance
    if seed is None:
        return image
    filled = binary.copy()
    ImageDraw.floodfill(filled, seed, 128, thresh=0)
    component = filled.point(lambda value: 255 if value == 128 else 0)
    cleaned = image.copy()
    cleaned.putalpha(ImageChops.multiply(alpha, component))
    return cleaned


def normalize_frame(subject: Image.Image) -> Image.Image:
    maximum_width = 178
    maximum_height = 224
    scale = min(maximum_width / subject.width, maximum_height / subject.height)
    width = max(1, round(subject.width * scale))
    height = max(1, round(subject.height * scale))
    resized = subject.resize((width, height), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT))
    frame.alpha_composite(resized, (PIVOT_X - width // 2, PIVOT_Y - height))
    return frame


def offset(frame: Image.Image, dx: int, dy: int = 0) -> Image.Image:
    shifted = Image.new("RGBA", frame.size)
    shifted.alpha_composite(frame, (dx, dy))
    return shifted


def interact_frame(frame: Image.Image, factor: float) -> Image.Image:
    box = frame.getchannel("A").getbbox()
    if not box:
        return frame.copy()
    subject = frame.crop(box)
    width = max(1, round(subject.width * factor))
    resized = subject.resize((width, subject.height), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", frame.size)
    result.alpha_composite(resized, (PIVOT_X - width // 2, PIVOT_Y - subject.height))
    return result


def hit_frame(frame: Image.Image, dx: int, tint: float) -> Image.Image:
    shifted = offset(frame, dx)
    red_layer = Image.new("RGBA", shifted.size, (150, 30, 22, 0))
    red_layer.putalpha(shifted.getchannel("A").point(lambda alpha: round(alpha * tint)))
    return Image.alpha_composite(shifted, red_layer)


def assemble(walk_subjects: list[Image.Image]) -> tuple[Image.Image, list[tuple[int, int, int, int]]]:
    walk = [normalize_frame(subject) for subject in walk_subjects]
    idle_base = walk[3]
    frames = [
        idle_base.copy(), offset(idle_base, 0, -1), idle_base.copy(), offset(idle_base, 0, 1),
    ]
    frames.extend(walk)
    frames.extend([
        interact_frame(idle_base, 1.0), interact_frame(idle_base, 1.025),
        interact_frame(idle_base, 1.04), interact_frame(idle_base, 1.015),
    ])
    frames.extend([
        hit_frame(idle_base, -4, 0.16), hit_frame(idle_base, -8, 0.22), hit_frame(idle_base, -3, 0.12),
    ])

    atlas = Image.new("RGBA", (FRAME_WIDTH * ATLAS_COLUMNS, FRAME_HEIGHT * 3))
    boxes = []
    for index, frame in enumerate(frames):
        x = (index % ATLAS_COLUMNS) * FRAME_WIDTH
        y = (index // ATLAS_COLUMNS) * FRAME_HEIGHT
        atlas.alpha_composite(frame, (x, y))
        boxes.append(frame.getchannel("A").getbbox())
    return atlas, boxes


def process_role(role: str) -> dict:
    result = {"role": role, "directions": {}}
    destination = RUNTIME_ROOT / role
    destination.mkdir(parents=True, exist_ok=True)
    for direction in ("front", "back"):
        source = SOURCE_ROOT / f"{role}-{direction}-source.png"
        if not source.exists():
            result["directions"][direction] = {"status": "missing", "source": str(source)}
            continue
        atlas, boxes = assemble(source_frames(source))
        output = destination / f"explore-{direction}-v4.png"
        runtime = atlas.quantize(
            colors=192,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
        runtime.save(output, optimize=True)
        bottoms = [box[3] if box else 0 for box in boxes]
        heights = [box[3] - box[1] if box else 0 for box in boxes]
        result["directions"][direction] = {
            "status": "ready",
            "source": str(source).replace("\\", "/"),
            "output": str(output.relative_to(ROOT)).replace("\\", "/"),
            "size": list(atlas.size),
            "frames": len(boxes),
            "alpha": atlas.getchannel("A").getextrema(),
            "baselineDrift": max(bottoms) - min(bottoms),
            "heightDrift": max(heights) - min(heights),
            "bytes": output.stat().st_size,
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Build four-direction Tongfu Inn runtime atlases")
    parser.add_argument("--role", choices=ROLES, action="append", help="Only process selected role(s)")
    args = parser.parse_args()
    selected = args.role or list(ROLES)
    report = {
        "version": 4,
        "frameSize": [FRAME_WIDTH, FRAME_HEIGHT],
        "pivot": [PIVOT_X, PIVOT_Y],
        "roles": [process_role(role) for role in selected],
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
