from collections import deque
from pathlib import Path
import argparse

from PIL import Image


ICON_NAMES = ("coin", "food", "reputation", "order")


def is_checker_background(pixel):
    red, green, blue = pixel[:3]
    return max(red, green, blue) - min(red, green, blue) <= 20 and (
        red + green + blue
    ) / 3 >= 202


def connected_background(image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    visited = bytearray(width * height)
    queue = deque()

    def add(x, y):
        offset = y * width + x
        if visited[offset] or not is_checker_background(pixels[x, y]):
            return
        visited[offset] = 1
        queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            add(x - 1, y)
        if x + 1 < width:
            add(x + 1, y)
        if y > 0:
            add(x, y - 1)
        if y + 1 < height:
            add(x, y + 1)

    return visited


def process_icon(source, target, canvas_size=96, padding=8):
    source_image = Image.open(source).convert("RGBA")
    width, height = source_image.size
    background = connected_background(source_image)
    pixels = source_image.load()
    alpha = Image.new("L", source_image.size, 0)
    alpha_pixels = alpha.load()

    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if background[offset]:
                continue
            red, green, blue, _ = pixels[x, y]
            edge_alpha = 255
            if max(red, green, blue) - min(red, green, blue) <= 18:
                brightness = (red + green + blue) / 3
                if brightness > 220:
                    edge_alpha = max(90, int((250 - brightness) / 30 * 255))
            alpha_pixels[x, y] = edge_alpha

    box = alpha.getbbox()
    if not box:
        raise RuntimeError(f"No foreground detected in {source}")

    cropped = source_image.crop(box)
    cropped.putalpha(alpha.crop(box))
    available = canvas_size - padding * 2
    scale = min(available / cropped.width, available / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((canvas_size - resized.width) // 2, (canvas_size - resized.height) // 2),
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, optimize=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    for name in ICON_NAMES:
        process_icon(
            args.source_dir / f"hud-{name}-source.png",
            args.output_dir / f"hud-{name}.png",
        )


if __name__ == "__main__":
    main()
