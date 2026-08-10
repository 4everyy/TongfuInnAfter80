# UI Art v29

## Scope

This pass unifies dialogue, character panels, task prompts, scene interactions,
inn actions, service events, loading states, and error recovery around one
hand-painted storybook visual language.

## Runtime art

- `dialogue-frame-v29.webp`: wide storybook frame for dialogue and full overlays.
- `portrait-frame-v29.webp`: character presentation frame.
- `prompt-frame-v29.webp`: compact task, toast, and action frame.

All three files retain transparency and contain no baked text. Runtime Chinese text remains
Canvas-rendered. If an image is unavailable, `ui-art-v29.js` draws a restrained
paper-and-ink fallback so the game remains playable.

## Semantic icons

Icons are deterministic Canvas paths and share rounded line caps, an ink outline,
and a minimum readable size. The set covers dialogue, investigation, battle,
exits, quests, lock/completion states, rewards, relationships, party status,
energy, mood, rooms, accounting, kitchen, supplies, repairs, cleaning, and touch.

## Interaction rules

- Icon plus text is used for commands; icon-only is reserved for familiar compact states.
- Touch targets remain at least 44 logical pixels.
- Primary choices use cinnabar; management information uses jade; warnings use cinnabar outlines.
- Pressed buttons move down 2 logical pixels and retain their hit target.
- No generated image contains text, role names, numbers, or quest data.

## Storage

Generated source art is stored under `D:\AI\design-assets\tongfu-ui\v29`.
Only cropped and optimized runtime files are stored in the game project.
