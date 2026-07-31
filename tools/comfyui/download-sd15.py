from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import requests


CACHE_ROOT = Path(r"D:\AI\cache")

MODEL_URL = (
    "https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/"
    "resolve/main/v1-5-pruned-emaonly.safetensors"
)
EXPECTED_SIZE = 4_265_146_304
TARGET = Path(
    r"D:\AI\ComfyUI\app\models\checkpoints\v1-5-pruned-emaonly.safetensors"
)


def main() -> int:
    temp = CACHE_ROOT / "temp" / "downloads"
    temp.mkdir(parents=True, exist_ok=True)
    os.environ.update(
        {
            "PIP_CACHE_DIR": r"D:\AI\pip-cache",
            "HF_HOME": str(CACHE_ROOT / "huggingface"),
            "HUGGINGFACE_HUB_CACHE": str(CACHE_ROOT / "huggingface" / "hub"),
            "TORCH_HOME": str(CACHE_ROOT / "torch"),
            "XDG_CACHE_HOME": str(CACHE_ROOT),
            "TEMP": str(temp),
            "TMP": str(temp),
        }
    )
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    partial = TARGET.with_suffix(TARGET.suffix + ".part")
    offset = partial.stat().st_size if partial.exists() else 0

    headers = {"Range": f"bytes={offset}-"} if offset else {}
    with requests.get(
        MODEL_URL,
        headers=headers,
        stream=True,
        allow_redirects=True,
        timeout=(30, 120),
    ) as response:
        response.raise_for_status()
        if offset and response.status_code != 206:
            offset = 0
            mode = "wb"
        else:
            mode = "ab" if offset else "wb"

        downloaded = offset
        last_report = downloaded
        started = time.monotonic()
        with partial.open(mode) as output:
            for chunk in response.iter_content(chunk_size=4 * 1024 * 1024):
                if not chunk:
                    continue
                output.write(chunk)
                downloaded += len(chunk)
                if downloaded - last_report >= 64 * 1024 * 1024:
                    elapsed = max(time.monotonic() - started, 0.1)
                    speed = (downloaded - offset) / elapsed / 1024 / 1024
                    print(
                        f"{downloaded / 1024 / 1024:.0f} MiB / "
                        f"{EXPECTED_SIZE / 1024 / 1024:.0f} MiB "
                        f"({speed:.1f} MiB/s)",
                        flush=True,
                    )
                    last_report = downloaded

    actual_size = partial.stat().st_size
    if actual_size != EXPECTED_SIZE:
        raise RuntimeError(
            f"Downloaded size {actual_size} does not match expected {EXPECTED_SIZE}. "
            "Run this script again to resume."
        )

    os.replace(partial, TARGET)
    print(f"MODEL_PATH={TARGET}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
