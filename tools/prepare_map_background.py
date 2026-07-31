from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--focus-y", type=float, default=0.56)
    parser.add_argument("--quality", type=int, default=86)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    target_ratio = args.width / args.height
    source_ratio = source.width / source.height
    if source_ratio > target_ratio:
        crop_width = round(source.height * target_ratio)
        left = max(0, (source.width - crop_width) // 2)
        box = (left, 0, left + crop_width, source.height)
    else:
        crop_height = round(source.width / target_ratio)
        center_y = round(source.height * args.focus_y)
        top = max(0, min(source.height - crop_height, center_y - crop_height // 2))
        box = (0, top, source.width, top + crop_height)

    prepared = source.crop(box).resize((args.width, args.height), Image.Resampling.LANCZOS)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    prepared.save(output, "JPEG", quality=args.quality, optimize=True, progressive=True)
    print(f"prepared {source.size} crop={box} -> {prepared.size}: {output}")


if __name__ == "__main__":
    main()
