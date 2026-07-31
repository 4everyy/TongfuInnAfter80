from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(r"D:\AI\design-assets\tongfu-ui\world-v4")
RUNTIME_ROOT = ROOT / "minigame" / "assets" / "art"
REPORT_PATH = ROOT / "outputs" / "creative-production" / "world-v4" / "entity-runtime-report.json"

NPC_SOURCE = SOURCE_ROOT / "npcs" / "chapter1-npc-lineup-source.png"
CART_SOURCE = SOURCE_ROOT / "props" / "supply-cart-source.png"

NPC_IDS = (
    "tea_owner",
    "merchant",
    "guard",
    "townsman_old",
    "townswoman_young",
    "ruffian_heavy",
    "ruffian_fast",
)


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
    output.putalpha(output.getchannel("A").filter(ImageFilter.MinFilter(3)))
    return output


def crop_subject(image: Image.Image) -> Image.Image:
    box = image.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
    if not box:
        raise ValueError("No foreground subject found")
    return image.crop(box)


def normalized_npc(subject: Image.Image) -> Image.Image:
    scale = min(156 / subject.width, 222 / subject.height)
    width = max(1, round(subject.width * scale))
    height = max(1, round(subject.height * scale))
    resized = subject.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (160, 224), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((160 - width) // 2, 224 - height))
    return canvas


def normalized_cart(subject: Image.Image) -> Image.Image:
    scale = min(320 / subject.width, 210 / subject.height)
    width = max(1, round(subject.width * scale))
    height = max(1, round(subject.height * scale))
    return subject.resize((width, height), Image.Resampling.LANCZOS)


def save_palette_png(image: Image.Image, output: Path, colors: int = 192) -> dict:
    output.parent.mkdir(parents=True, exist_ok=True)
    runtime = image.quantize(
        colors=colors,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.FLOYDSTEINBERG,
    )
    runtime.save(output, optimize=True)
    decoded = Image.open(output).convert("RGBA")
    alpha = decoded.getchannel("A").getextrema()
    if alpha != (0, 255):
        raise ValueError(f"{output.name} does not contain full transparency: {alpha}")
    return {
        "output": str(output.relative_to(ROOT)).replace("\\", "/"),
        "size": list(decoded.size),
        "alpha": list(alpha),
        "bytes": output.stat().st_size,
    }


def build_npcs() -> list[dict]:
    source = chroma_to_alpha(Image.open(NPC_SOURCE))
    reports = []
    for index, npc_id in enumerate(NPC_IDS):
        left = round(index * source.width / len(NPC_IDS))
        right = round((index + 1) * source.width / len(NPC_IDS))
        subject = crop_subject(source.crop((left, 0, right, source.height)))
        output = RUNTIME_ROOT / "npcs" / f"{npc_id}.png"
        report = save_palette_png(normalized_npc(subject), output)
        report.update({"id": npc_id, "sourceCell": index + 1})
        reports.append(report)
    return reports


def build_cart() -> dict:
    subject = crop_subject(chroma_to_alpha(Image.open(CART_SOURCE)))
    output = RUNTIME_ROOT / "maps" / "stone_bridge" / "supply-cart.png"
    report = save_palette_png(normalized_cart(subject), output)
    report.update({
        "id": "supply_cart",
        "pivot": [round(report["size"][0] / 2), report["size"][1]],
    })
    return report


def optimize_side_atlases() -> list[dict]:
    reports = []
    for role in ("xiangyu", "zhantang", "furong", "xiucai"):
        path = RUNTIME_ROOT / "characters" / role / "explore-v3.png"
        original_bytes = path.stat().st_size
        opened = Image.open(path)
        if opened.mode != "P":
            image = opened.convert("RGBA")
            temporary = path.with_name(path.stem + "-optimized.png")
            runtime = image.quantize(
                colors=192,
                method=Image.Quantize.FASTOCTREE,
                dither=Image.Dither.FLOYDSTEINBERG,
            )
            runtime.save(temporary, optimize=True)
            if temporary.stat().st_size < original_bytes:
                temporary.replace(path)
            else:
                temporary.unlink()
        decoded = Image.open(path).convert("RGBA")
        alpha = decoded.getchannel("A").getextrema()
        if decoded.size != (1536, 768) or alpha != (0, 255):
            raise ValueError(f"Invalid optimized atlas for {role}: {decoded.size}, {alpha}")
        reports.append({
            "role": role,
            "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            "originalBytes": original_bytes,
            "bytes": path.stat().st_size,
            "savedBytes": original_bytes - path.stat().st_size,
            "size": list(decoded.size),
            "alpha": list(alpha),
        })
    return reports


def main() -> None:
    report = {
        "version": 4,
        "npcs": build_npcs(),
        "cart": build_cart(),
        "sideAtlases": optimize_side_atlases(),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
