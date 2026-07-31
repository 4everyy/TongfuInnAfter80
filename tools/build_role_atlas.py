from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image


FRAME_W = 192
FRAME_H = 256
PIVOT = (96, 244)


def key_color(image: Image.Image):
    points = [(2, 2), (image.width - 3, 2), (2, image.height - 3), (image.width - 3, image.height - 3)]
    samples = [image.getpixel(point)[:3] for point in points]
    return tuple(sorted(channel)[len(samples) // 2] for channel in zip(*samples))


def remove_key(image: Image.Image):
    image = image.convert("RGBA")
    alpha_extrema = image.getchannel("A").getextrema()
    if alpha_extrema[0] == 0 and alpha_extrema[1] == 255:
        return image
    key = key_color(image)
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    source = image.load()
    target = result.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = source[x, y]
            distance = math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
            alpha = 0 if distance < 24 else 255 if distance > 105 else round((distance - 24) / 81 * 255)
            if not alpha:
                continue
            magenta = max(0, min(r, b) - g)
            if magenta > 8:
                amount = min(0.9, magenta / 150)
                neutral = max(g, round((r + b) * 0.16))
                r = round(r * (1 - amount) + neutral * amount)
                b = round(b * (1 - amount) + neutral * amount)
            target[x, y] = (r, g, b, alpha)
    return result


def cells(path: str, columns: int, rows: int, count: int):
    source = Image.open(path).convert("RGBA")
    width = source.width // columns
    height = source.height // rows
    output = []
    for index in range(count):
        col = index % columns
        row = index // columns
        cell = remove_key(source.crop((col * width, row * height, (col + 1) * width, (row + 1) * height)))
        bbox = cell.getbbox()
        if not bbox:
            raise RuntimeError(f"empty frame {index} in {path}")
        output.append(cell.crop(bbox))
    return output


def normalize(subject: Image.Image):
    scale = 232 / subject.height
    width = max(1, round(subject.width * scale))
    height = max(1, round(subject.height * scale))
    subject = subject.resize((width, height), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    x = PIVOT[0] - width // 2
    y = PIVOT[1] - height
    frame.alpha_composite(subject, (x, y))
    return frame, {"width": width, "height": height, "footY": PIVOT[1]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--idle", required=True)
    parser.add_argument("--walk", required=True)
    parser.add_argument("--actions", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()

    raw = cells(args.idle, 4, 1, 4) + cells(args.walk, 4, 2, 8) + cells(args.actions, 4, 2, 7)
    atlas = Image.new("RGBA", (FRAME_W * 8, FRAME_H * 3), (0, 0, 0, 0))
    metrics = []
    for index, subject in enumerate(raw):
        frame, metric = normalize(subject)
        atlas.alpha_composite(frame, ((index % 8) * FRAME_W, (index // 8) * FRAME_H))
        metrics.append(dict(frame=index, **metric))

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, optimize=True)
    heights = [item["height"] for item in metrics]
    report = {
        "atlas": str(output),
        "size": list(atlas.size),
        "frameSize": [FRAME_W, FRAME_H],
        "pivot": list(PIVOT),
        "frameCount": len(metrics),
        "baselineDriftPx": 0,
        "heightVariationPct": round((max(heights) - min(heights)) / max(heights) * 100, 2),
        "frames": metrics,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
