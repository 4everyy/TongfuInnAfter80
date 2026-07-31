from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--background", required=True)
    parser.add_argument("--strip", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--x", type=int, default=600)
    parser.add_argument("--foot-y", type=int, default=296)
    parser.add_argument("--height", type=int, default=104)
    parser.add_argument("--camera", type=int, default=350)
    args = parser.parse_args()

    background = Image.open(args.background).convert("RGBA")
    strip = Image.open(args.strip).convert("RGBA")
    frame_w = strip.width // 8
    frames = []
    viewport_w = 490

    for index in range(8):
        scene = background.crop((args.camera, 0, args.camera + viewport_w, background.height))
        actor = strip.crop((index * frame_w, 0, (index + 1) * frame_w, strip.height))
        bbox = actor.getbbox()
        actor = actor.crop(bbox)
        scale = args.height / actor.height
        actor = actor.resize((round(actor.width * scale), args.height), Image.Resampling.LANCZOS)
        actor = ImageEnhance.Color(actor).enhance(0.88)

        local_x = args.x - args.camera
        shadow = Image.new("RGBA", scene.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(shadow, "RGBA")
        shadow_w = max(22, round(actor.width * 0.42))
        draw.ellipse(
            (local_x - shadow_w // 2, args.foot_y - 5, local_x + shadow_w // 2, args.foot_y + 5),
            fill=(35, 26, 21, 45),
        )
        scene = Image.alpha_composite(scene, shadow)
        scene.alpha_composite(actor, (local_x - actor.width // 2, args.foot_y - actor.height))
        frames.append(scene.convert("RGB"))

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=84, loop=0, optimize=True)
    frames[0].save(output.with_suffix(".jpg"), quality=90, optimize=True)
    print(output)


if __name__ == "__main__":
    main()
