from pathlib import Path
import sys

from PIL import Image


source = Image.open(sys.argv[1]).convert("RGBA")
output = Path(sys.argv[2])
colors = int(sys.argv[3]) if len(sys.argv) > 3 else 256
output.parent.mkdir(parents=True, exist_ok=True)
quantized = source.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
quantized.save(output, optimize=True, compress_level=9)
print(f"{source.size}: {Path(sys.argv[1]).stat().st_size} -> {output.stat().st_size}")
