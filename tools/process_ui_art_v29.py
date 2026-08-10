from pathlib import Path
import sys

from PIL import Image


SOURCE = Path(r"D:\AI\design-assets\tongfu-ui\v29\ui-ornament-sheet-source.png")
OUTPUT = Path(r"D:\TongfuInnAfter80\minigame\assets\art\ui\presentation")

PIECES = {
    "portrait-frame-v29.webp": ((250, 28, 716, 584), (256, 320)),
    "prompt-frame-v29.webp": ((860, 235, 1350, 490), (512, 208)),
    "dialogue-frame-v29.webp": ((18, 582, 1524, 1015), (1024, 280)),
}


def remove_chroma(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            dominance = green - max(red, blue)
            if green > 92 and dominance > 18:
                edge_alpha = max(0, min(255, 255 - (dominance - 18) * 4))
                green = min(green, max(red, blue) + 10)
                alpha = min(alpha, edge_alpha)
            pixels[x, y] = red, green, blue, alpha
    return rgba


def main() -> int:
    if not SOURCE.exists():
        print(f"missing source: {SOURCE}", file=sys.stderr)
        return 1
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = remove_chroma(Image.open(SOURCE))
    for name, (crop_box, target_size) in PIECES.items():
        piece = source.crop(crop_box)
        alpha_box = piece.getchannel("A").getbbox()
        if alpha_box:
            piece = piece.crop(alpha_box)
        piece.thumbnail(target_size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
        offset = ((target_size[0] - piece.width) // 2, (target_size[1] - piece.height) // 2)
        canvas.alpha_composite(piece, offset)
        canvas.save(OUTPUT / name, format="WEBP", quality=78, method=6)
        print(f"wrote {OUTPUT / name} {canvas.width}x{canvas.height}")
    for legacy in OUTPUT.glob("*-v29.png"):
        legacy.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
