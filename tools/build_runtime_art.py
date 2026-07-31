from __future__ import annotations

import json
import math
import statistics
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


PROJECT = Path(r"D:\TongfuInnAfter80")
SOURCE = Path(r"D:\AI\design-assets\tongfu-ui")
ANIMATION_SOURCE = SOURCE / "step-3" / "animation-v2"
RUNTIME = PROJECT / "minigame" / "assets" / "art"
REPORT_DIR = PROJECT / "outputs" / "art-processing"

FRAME_WIDTH = 192
FRAME_HEIGHT = 256
PIVOT_X = 96
PIVOT_Y = 244
ATLAS_COLUMNS = 8
ALPHA_THRESHOLD = 36

ROLES = {
    "xiangyu": {
        "walk": ANIMATION_SOURCE / "xiangyu" / "xiangyu-walk-alpha-source-v2.png",
        "action": SOURCE / "step-2" / "characters" / "xiangyu" / "xiangyu-explore-action-keys-v4.png",
        "action_frames": 5,
        "idle": 1,
        "interact": 3,
        "hit": 4,
    },
    "zhantang": {
        "walk": ANIMATION_SOURCE / "zhantang" / "zhantang-walk-alpha-source-v2.png",
        "action": SOURCE / "step-2" / "characters" / "zhantang" / "zhantang-explore-v1.png",
        "action_frames": 6,
        "idle": 0,
        "interact": 4,
        "hit": 5,
    },
    "furong": {
        "walk": ANIMATION_SOURCE / "furong" / "furong-walk-alpha-source-v2.png",
        "action": SOURCE / "step-2" / "characters" / "furong" / "furong-explore-v1.png",
        "action_frames": 6,
        "idle": 0,
        "interact": 4,
        "hit": 5,
    },
    "xiucai": {
        "walk": ANIMATION_SOURCE / "xiucai" / "xiucai-walk-alpha-source-v2.png",
        "action": SOURCE / "step-2" / "characters" / "xiucai" / "xiucai-explore-v1.png",
        "action_frames": 6,
        "idle": 0,
        "interact": 4,
        "hit": 5,
    },
}


def threshold_mask(alpha: Image.Image, threshold: int = ALPHA_THRESHOLD) -> Image.Image:
    return alpha.point(lambda value: 255 if value > threshold else 0)


def remove_connected_paper(image: Image.Image) -> Image.Image:
    """Remove only paper-colored pixels connected to the outer border."""
    source = image.convert("RGBA")
    work = source.convert("RGB")
    marker = (255, 0, 255)
    width, height = work.size
    seeds = [
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (width // 2, height - 1),
        (0, height // 2),
        (width - 1, height // 2),
    ]
    for seed in seeds:
        if work.getpixel(seed) != marker:
            ImageDraw.floodfill(work, seed, marker, thresh=66)

    pixels = list(work.getdata())
    background = Image.new("L", work.size)
    background.putdata([255 if pixel == marker else 0 for pixel in pixels])
    background = background.filter(ImageFilter.MaxFilter(3))
    foreground = ImageChops.invert(background).filter(ImageFilter.GaussianBlur(0.35))
    source.putalpha(foreground)
    return source


def central_seed(mask: Image.Image) -> tuple[int, int]:
    width, height = mask.size
    pixels = mask.load()
    center_x = width / 2
    center_y = height * 0.48
    best = None
    for y in range(int(height * 0.12), int(height * 0.88), 2):
        for x in range(int(width * 0.18), int(width * 0.82), 2):
            if pixels[x, y] > 0:
                distance = (x - center_x) ** 2 + (y - center_y) ** 2
                if best is None or distance < best[0]:
                    best = (distance, x, y)
    if best is None:
        raise ValueError("No foreground component found in frame cell")
    return best[1], best[2]


def connected_subject(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = threshold_mask(alpha)
    width, height = mask.size
    source = mask.tobytes()
    seed_x, seed_y = central_seed(mask)
    seed = seed_y * width + seed_x
    selected = bytearray(width * height)
    queue = deque([seed])
    selected[seed] = 255

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        for nx, ny in (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
            (x - 1, y - 1),
            (x + 1, y - 1),
            (x - 1, y + 1),
            (x + 1, y + 1),
        ):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            neighbor = ny * width + nx
            if selected[neighbor] or source[neighbor] == 0:
                continue
            selected[neighbor] = 255
            queue.append(neighbor)

    selection = Image.frombytes("L", (width, height), bytes(selected))
    selection = selection.filter(ImageFilter.MaxFilter(5))
    rgba.putalpha(ImageChops.multiply(alpha, selection))
    bbox = threshold_mask(rgba.getchannel("A"), 8).getbbox()
    if not bbox:
        raise ValueError("Selected foreground component is empty")
    return rgba.crop(bbox)


def split_subjects(image: Image.Image, count: int) -> list[Image.Image]:
    width, height = image.size
    frames = []
    for index in range(count):
        left = round(index * width / count)
        right = round((index + 1) * width / count)
        cell = image.crop((left, 0, right, height))
        frames.append(connected_subject(cell))
    return frames


def torso_center(frame: Image.Image) -> float:
    alpha = frame.getchannel("A")
    width, height = frame.size
    torso_bottom = max(1, int(height * 0.64))
    weights = []
    for x in range(width):
        total = sum(alpha.crop((x, 0, x + 1, torso_bottom)).getdata())
        weights.append(total)
    weight_sum = sum(weights)
    if not weight_sum:
        return width / 2
    return sum(index * weight for index, weight in enumerate(weights)) / weight_sum


def place_frame(frame: Image.Image, scale: float) -> Image.Image:
    width = max(1, round(frame.width * scale))
    height = max(1, round(frame.height * scale))
    resized = frame.resize((width, height), Image.Resampling.LANCZOS)
    center = torso_center(resized)
    x = round(PIVOT_X - center)
    y = PIVOT_Y - height
    canvas = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (x, y))
    return canvas


def normalize_walk(frames: list[Image.Image]) -> tuple[list[Image.Image], float]:
    heights = [frame.height for frame in frames]
    widths = [frame.width for frame in frames]
    scale = 222 / statistics.median(heights)
    scale = min(scale, 184 / max(widths))
    return [place_frame(frame, scale) for frame in frames], scale


def normalize_action(frame: Image.Image) -> Image.Image:
    scale = min(222 / frame.height, 184 / frame.width)
    return place_frame(frame, scale)


def breathe(frame: Image.Image, scale: float) -> Image.Image:
    width = max(1, round(FRAME_WIDTH * scale))
    height = max(1, round(FRAME_HEIGHT * scale))
    resized = frame.resize((width, height), Image.Resampling.BICUBIC)
    canvas = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    x = round((FRAME_WIDTH - width) / 2)
    y = PIVOT_Y - round(PIVOT_Y * scale)
    canvas.alpha_composite(resized, (x, y))
    return canvas


def assemble_atlas(role: str, config: dict) -> dict:
    walk_source = Image.open(config["walk"]).convert("RGBA")
    walk_subjects = split_subjects(walk_source, 8)
    walk_frames, scale = normalize_walk(walk_subjects)

    action_source = remove_connected_paper(Image.open(config["action"]))
    action_subjects = split_subjects(action_source, config["action_frames"])
    source_idle = normalize_action(action_subjects[config["idle"]])
    source_interact = normalize_action(action_subjects[config["interact"]])
    source_hit = normalize_action(action_subjects[config["hit"]])

    idle_frames = [
        source_idle,
        breathe(source_idle, 1.002),
        breathe(source_idle, 1.004),
        breathe(source_idle, 1.002),
    ]
    interact_frames = [source_idle, source_interact, breathe(source_interact, 1.002), source_idle]
    hit_frames = [source_idle, source_hit, source_idle]
    frames = idle_frames + walk_frames + interact_frames + hit_frames

    atlas_rows = math.ceil(len(frames) / ATLAS_COLUMNS)
    atlas = Image.new(
        "RGBA",
        (FRAME_WIDTH * ATLAS_COLUMNS, FRAME_HEIGHT * atlas_rows),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        column = index % ATLAS_COLUMNS
        row = index // ATLAS_COLUMNS
        atlas.alpha_composite(frame, (column * FRAME_WIDTH, row * FRAME_HEIGHT))

    output = RUNTIME / "characters" / role / "explore-v3.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, optimize=True, compress_level=9)

    bottoms = []
    frame_boxes = []
    for index, frame in enumerate(frames):
        bbox = threshold_mask(frame.getchannel("A"), 8).getbbox()
        if not bbox:
            raise ValueError(f"{role} frame {index} is empty")
        frame_boxes.append(bbox)
        bottoms.append(bbox[3])

    return {
        "role": role,
        "output": str(output),
        "bytes": output.stat().st_size,
        "sourceScale": round(scale, 5),
        "frames": len(frames),
        "atlasColumns": ATLAS_COLUMNS,
        "atlasSize": list(atlas.size),
        "clips": {
            "idle": [0, 1, 2, 3],
            "walk": [4, 5, 6, 7, 8, 9, 10, 11],
            "interact": [12, 13, 14, 15],
            "hit": [16, 17, 18],
        },
        "bottomRange": [min(bottoms), max(bottoms)],
        "boxes": frame_boxes,
    }


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    role_reports = [assemble_atlas(role, config) for role, config in ROLES.items()]
    report = {
        "frameSize": [FRAME_WIDTH, FRAME_HEIGHT],
        "pivot": [PIVOT_X, PIVOT_Y],
        "roles": role_reports,
        "maps": [],
        "mapPipeline": "tools/build_world_v4_art.py",
    }
    report_path = REPORT_DIR / "runtime-art-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
