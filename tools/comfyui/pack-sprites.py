from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack equal-sized PNG frames into one row.")
    parser.add_argument("input", type=Path, help="Directory containing ordered PNG frames")
    parser.add_argument("output", type=Path, help="Output sprite sheet PNG")
    parser.add_argument("--fps", type=int, default=8)
    args = parser.parse_args()

    frame_paths = sorted(args.input.glob("*.png"))
    if not frame_paths:
        raise SystemExit(f"No PNG frames found in {args.input}")

    frames = [Image.open(path).convert("RGBA") for path in frame_paths]
    width, height = frames[0].size
    if any(frame.size != (width, height) for frame in frames):
        raise SystemExit("All frames must have the same dimensions.")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, 0))
    sheet.save(args.output, optimize=True)

    metadata = {
        "image": args.output.name,
        "frameWidth": width,
        "frameHeight": height,
        "frameCount": len(frames),
        "fps": args.fps,
        "frames": [path.name for path in frame_paths],
    }
    args.output.with_suffix(".json").write_text(
        json.dumps(metadata, ensure_ascii=True, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
