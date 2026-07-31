from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


OUTPUT = Path(__file__).parent / "guides" / "tongfu-inn-hall-guide.png"
WIDTH = 1024
HEIGHT = 640


def main() -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#d9c9a4")
    draw = ImageDraw.Draw(image)

    # Flat side-view architecture guide. The diffusion pass adds all texture.
    draw.rectangle((0, 0, WIDTH, 105), fill="#6f4a32")
    draw.rectangle((0, 105, WIDTH, 465), fill="#caa875")
    draw.rectangle((0, 465, WIDTH, HEIGHT), fill="#786248")
    draw.rectangle((0, 448, WIDTH, 470), fill="#4b3327")

    for x in (70, 330, 650, 950):
        draw.rectangle((x, 80, x + 34, 510), fill="#4c3025")
        draw.rectangle((x - 12, 105, x + 46, 125), fill="#72503a")

    # Rear windows and lanterns.
    for x in (150, 400, 690):
        draw.rectangle((x, 175, x + 130, 315), fill="#395f57", outline="#3f2c22", width=12)
        draw.line((x + 65, 180, x + 65, 310), fill="#d7c59a", width=8)
        draw.line((x + 5, 245, x + 125, 245), fill="#d7c59a", width=8)
        draw.ellipse((x + 45, 118, x + 85, 168), fill="#b84435", outline="#4b2b24", width=6)

    # Counter on the right, kept above the walk lane.
    draw.rectangle((755, 332, 990, 458), fill="#875338", outline="#3f2a22", width=12)
    draw.rectangle((730, 315, 1005, 345), fill="#4f3025")
    draw.rectangle((830, 245, 930, 315), fill="#b84834", outline="#4f3025", width=8)

    # Stair silhouette in the rear right.
    points = [(650, 325), (745, 170), (785, 170), (690, 325)]
    draw.polygon(points, fill="#5f3b2c")
    for index in range(6):
        y = 305 - index * 24
        x = 665 + index * 15
        draw.line((x, y, x + 75, y), fill="#d0a668", width=8)

    # Three readable tables, leaving the bottom lane clear for gameplay.
    for x in (175, 410, 625):
        draw.ellipse((x, 360, x + 145, 405), fill="#9c673f", outline="#493027", width=9)
        draw.rectangle((x + 65, 400, x + 80, 465), fill="#4b3025")
        draw.rectangle((x + 25, 440, x + 55, 465), fill="#65432f")
        draw.rectangle((x + 90, 440, x + 120, 465), fill="#65432f")

    # Door and uninterrupted walk lane.
    draw.rectangle((0, 260, 70, 465), fill="#273b36")
    draw.rectangle((0, 510, WIDTH, HEIGHT), fill="#65725b")
    draw.line((0, 510, WIDTH, 510), fill="#3c2c24", width=10)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
