from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image


FRAME_W = 192
FRAME_H = 256
PIVOT_X = 96
PIVOT_Y = 244


def foreground_mask(image: Image.Image):
    pixels = image.load()
    mask = Image.new("L", image.size, 0)
    out = mask.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            distance = math.sqrt((r - 245) ** 2 + g**2 + (b - 250) ** 2)
            if distance <= 28:
                out[x, y] = 0
            elif distance >= 105:
                out[x, y] = 255
            else:
                out[x, y] = round((distance - 28) / 77 * 255)
    return mask


def despill(image: Image.Image, mask: Image.Image):
    source = image.convert("RGBA")
    pixels = source.load()
    alpha = mask.load()
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    target = result.load()
    for y in range(source.height):
        for x in range(source.width):
            a = alpha[x, y]
            if not a:
                continue
            r, g, b, _ = pixels[x, y]
            magenta_excess = max(0, min(r, b) - g)
            if magenta_excess > 6:
                neutral = max(g, round((r + b) * 0.18))
                strength = min(0.92, magenta_excess / 155)
                r = round(r * (1 - strength) + neutral * strength)
                b = round(b * (1 - strength) + neutral * strength)
            if a < 245:
                factor = max(a / 255, 0.08)
                r = round(max(0, min(255, (r - (1 - factor) * 245) / factor)))
                g = round(max(0, min(255, g / factor)))
                b = round(max(0, min(255, (b - (1 - factor) * 250) / factor)))
            target[x, y] = (r, g, b, a)
    return result


def main(source_path: str, output_dir: str):
    source = Image.open(source_path).convert("RGBA")
    cols, rows = 4, 2
    cell_w = source.width // cols
    cell_h = source.height // rows
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    strip = Image.new("RGBA", (FRAME_W * 8, FRAME_H), (0, 0, 0, 0))
    metrics = []

    for index in range(8):
        col = index % cols
        row = index // cols
        cell = source.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        mask = foreground_mask(cell)
        bbox = mask.getbbox()
        if not bbox:
            raise RuntimeError(f"No subject detected in frame {index}")
        subject = despill(cell.crop(bbox), mask.crop(bbox))
        scale = min(172 / subject.width, 232 / subject.height)
        width = max(1, round(subject.width * scale))
        height = max(1, round(subject.height * scale))
        subject = subject.resize((width, height), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
        x = PIVOT_X - width // 2
        y = PIVOT_Y - height
        frame.alpha_composite(subject, (x, y))
        frame.save(output / f"frame-{index:02d}.png", optimize=True)
        strip.alpha_composite(frame, (index * FRAME_W, 0))
        metrics.append({"frame": index, "bbox": [x, y, x + width, y + height], "width": width, "height": height, "footY": PIVOT_Y})

    strip_path = output / "wuchen-side-walk-strip-v1.png"
    strip.save(strip_path, optimize=True)
    checker = Image.new("RGBA", strip.size, (43, 43, 43, 255))
    tile = 16
    draw = checker.load()
    for y in range(checker.height):
        for x in range(checker.width):
            shade = 73 if (x // tile + y // tile) % 2 else 45
            draw[x, y] = (shade, shade, shade, 255)
    checker.alpha_composite(strip)
    checker.save(output / "wuchen-side-walk-checker-v1.png", optimize=True)
    heights = [entry["height"] for entry in metrics]
    widths = [entry["width"] for entry in metrics]
    report = {
        "sourceSize": list(source.size),
        "frameSize": [FRAME_W, FRAME_H],
        "pivot": [PIVOT_X, PIVOT_Y],
        "frames": metrics,
        "baselineDriftPx": 0,
        "heightVariationPct": round((max(heights) - min(heights)) / max(heights) * 100, 2),
        "widthVariationPct": round((max(widths) - min(widths)) / max(widths) * 100, 2),
        "output": str(strip_path),
    }
    (output / "wuchen-side-walk-report-v1.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
