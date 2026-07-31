# Art Production Notes

## Cost constraint

The required pipeline must be usable without paid cloud inference or paid art
software. Do not submit assets to a paid API without explicit approval.

- ComfyUI uses the base SD 1.5 checkpoint for fast drafts and the free
  DreamShaper 8 checkpoint for stronger local illustration candidates.
- Krita performs paint-over, layer separation, transparent cleanup, and frame
  animation. Aseprite is optional and not required.
- Pillow-based project tools pack sprite sheets and metadata.
- Canvas remains the runtime renderer and fallback, not the primary painting
  tool.

Quality comes from controlled iteration: approve a cheap 512px composition,
create or correct a flat layout guide, run guided img2img and a two-pass local
upscale, correct anatomy and edges in Krita, then export only the accepted
layers. Pure text-to-image output is not accepted for production maps because
it cannot reliably preserve walk lanes, doors, counters, or collision shapes.

## Visual direction

Original hand-painted Chinese animation for a warm Jianghu inn adventure. Use warm wood, rice-paper cream, jade green, cinnabar red, gentle watercolor texture, and readable shapes for a landscape 2D side scroller. Do not use actor likenesses, screenshots, logos, or text.

## First asset prompts

- Inn: Wide side-scrolling inn interior with wood beams, counter, round tables, stair, lanterns, and a clear lower walking lane.
- Street: Wide Qixia-style town street with staggered shop fronts, awnings, lanterns, distant tree silhouettes, and a clear lower walking lane.
- Yard: Quiet back yard with trees, training post, small pavilion, kitchen wall, and a clear lower walking lane.
- Characters: Original stylized hand-painted explorer sheets for an agile teal waiter, a cinnabar martial artist, and a jade scholar accountant. Create idle, walk, interact, hurt, and fallen poses on a flat removable background; never use celebrity likenesses.

Record model, prompt, date, and license next to every imported source image
before release. Keep source files outside the mini game package and import only
optimized PNG/WebP assets registered in `minigame/assets/art/manifest.js`.
