# Tongfu free local art workflow

This pipeline has no required paid cloud service or paid desktop application.
ComfyUI creates drafts and local final candidates, Krita handles paint-over,
layering, and frame animation, and the project scripts build runtime atlases.

Start the local-only service:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\comfyui\start-comfyui.ps1
```

Open `http://127.0.0.1:8188`, or render a repeatable 512px draft:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\comfyui\render-draft.ps1
```

Render a slower two-pass 1024x640 final candidate:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\comfyui\render-final.ps1
```

For production, use a layout guide so the model cannot freely change the map:

```powershell
D:\AI\ComfyUI\venv\Scripts\python.exe .\tools\comfyui\make-layout-guide.py
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\comfyui\render-guided-final.ps1
```

The final workflow starts at 512x320, refines the composition, then performs a
low-denoise latent upscale and tiled VAE decode. This is slower than a paid
cloud GPU, but stays usable on a 6GB GTX 1660 SUPER.

- Draft checkpoint: `v1-5-pruned-emaonly.safetensors`
- Local final checkpoint: `DreamShaper_8_pruned.safetensors`

Use the free desktop build from `krita.org` for corrections and animation.
Aseprite is optional and is not part of the required pipeline.

Outputs are written to `D:\AI\ComfyUI\app\output`. Model files, temporary
images, and caches stay outside the mini game repository. All ComfyUI-related
caches and temporary files are explicitly rooted under `D:\AI`; drive C is not
used for new installs, downloads, or generation caches.
