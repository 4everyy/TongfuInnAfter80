from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MAP_ROOT = ROOT / "minigame" / "assets" / "art" / "maps"
OUTPUT = ROOT / "outputs" / "canva" / "world-v4-route-review.png"

WIDTH = 1920
HEIGHT = 1080

COLORS = {
    "ink": "#2c211d",
    "paper": "#eee2c3",
    "paper_dark": "#d9c69b",
    "wood": "#684631",
    "jade": "#3f6f68",
    "cinnabar": "#a84436",
    "gold": "#c59a45",
    "white": "#fff8e9",
}

MAPS = (
    ("inn", "1  同福客栈大堂", "接案与客栈日结"),
    ("yard", "2  客栈后院", "调查断裂货绳"),
    ("street", "3  七侠镇十字街", "解围并招募郭芙蓉"),
    ("locust_lane", "4  老槐树告示巷", "辨认伪造告示"),
    ("tea_shed", "5  镇东破茶棚", "向茶棚老板问讯"),
    ("east_gate", "6  镇东牌坊", "查验路引与放行"),
    ("stone_bridge", "7  镇外石桥", "击退匪徒并夺回物资"),
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int]) -> None:
    draw.line((start, end), fill=COLORS["gold"], width=8)
    x, y = end
    if abs(end[0] - start[0]) >= abs(end[1] - start[1]):
        direction = 1 if end[0] > start[0] else -1
        points = [(x, y), (x - 18 * direction, y - 12), (x - 18 * direction, y + 12)]
    else:
        direction = 1 if end[1] > start[1] else -1
        points = [(x, y), (x - 12, y - 18 * direction), (x + 12, y - 18 * direction)]
    draw.polygon(points, fill=COLORS["gold"])


def card(canvas: Image.Image, draw: ImageDraw.ImageDraw, item: tuple[str, str, str], box: tuple[int, int, int, int]) -> None:
    map_id, title, caption = item
    left, top, right, bottom = box
    draw.rounded_rectangle(box, radius=6, fill=COLORS["paper"], outline=COLORS["wood"], width=3)
    draw.text((left + 18, top + 13), title, font=font(25, True), fill=COLORS["ink"])
    image = Image.open(MAP_ROOT / map_id / "far.jpg").convert("RGB")
    preview = ImageOps.fit(image, (right - left - 24, 158), method=Image.Resampling.LANCZOS)
    canvas.paste(preview, (left + 12, top + 50))
    draw.rectangle((left + 12, top + 50, right - 12, top + 208), outline=COLORS["wood"], width=2)
    draw.text((left + 18, top + 218), caption, font=font(19), fill=COLORS["wood"])


def main() -> None:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), COLORS["paper_dark"])
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, 100), fill=COLORS["ink"])
    draw.text((64, 25), "《镇东风波》首章地图路线与运行验收", font=font(38, True), fill=COLORS["white"])
    draw.text((WIDTH - 64, 36), "微信 2D 小游戏 · 2.5D 八向探索", font=font(23), fill=COLORS["gold"], anchor="ra")

    boxes = [
        (60, 140, 460, 400),
        (510, 140, 910, 400),
        (960, 140, 1360, 400),
        (1410, 140, 1810, 400),
        (1410, 480, 1810, 740),
        (960, 480, 1360, 740),
        (510, 480, 910, 740),
    ]
    centers = [((box[0] + box[2]) // 2, (box[1] + box[3]) // 2) for box in boxes]
    arrow(draw, (boxes[0][2] + 10, centers[0][1]), (boxes[1][0] - 10, centers[1][1]))
    arrow(draw, (boxes[1][2] + 10, centers[1][1]), (boxes[2][0] - 10, centers[2][1]))
    arrow(draw, (boxes[2][2] + 10, centers[2][1]), (boxes[3][0] - 10, centers[3][1]))
    arrow(draw, (centers[3][0], boxes[3][3] + 10), (centers[4][0], boxes[4][1] - 10))
    arrow(draw, (boxes[4][0] - 10, centers[4][1]), (boxes[5][2] + 10, centers[5][1]))
    arrow(draw, (boxes[5][0] - 10, centers[5][1]), (boxes[6][2] + 10, centers[6][1]))

    for item, box in zip(MAPS, boxes):
        card(canvas, draw, item, box)

    draw.rounded_rectangle((60, 800, 1810, 1016), radius=6, fill=COLORS["paper"], outline=COLORS["wood"], width=3)
    draw.text((88, 825), "首章闭环", font=font(28, True), fill=COLORS["cinnabar"])
    flow = "客栈接案 → 后院查线索 → 十字街组队 → 告示巷辨伪 → 茶棚问讯 → 牌坊查路引 → 石桥战斗 → 回店日结"
    draw.text((88, 873), flow, font=font(24), fill=COLORS["ink"])

    badges = (
        ("7 张正式地图", COLORS["jade"]),
        ("八向移动", COLORS["jade"]),
        ("4 角色三方向", COLORS["wood"]),
        ("7 名章节 NPC", COLORS["wood"]),
        ("运行包 2.49 MB", COLORS["cinnabar"]),
    )
    x = 88
    for label, color in badges:
        text_box = draw.textbbox((0, 0), label, font=font(20, True))
        badge_width = text_box[2] - text_box[0] + 38
        draw.rounded_rectangle((x, 930, x + badge_width, 980), radius=6, fill=color)
        draw.text((x + 19, 955), label, font=font(20, True), fill=COLORS["white"], anchor="lm")
        x += badge_width + 18

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
