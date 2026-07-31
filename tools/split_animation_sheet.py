from pathlib import Path
import sys

from PIL import Image


source = Image.open(sys.argv[1]).convert("RGBA")
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
row = source.height // 3
source.crop((0, 0, source.width, row)).save(output / "idle.png")
source.crop((0, row, source.width, row * 3)).save(output / "actions.png")
print(output)
