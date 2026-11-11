# Luna's look — Spectrum (11 November)

Rowland, 11 November, after a first ink-and-paper direction ("too muted, too gentle"): *"REVISIT THE VISUAL IDENTITY. MAKE IT
BRILLIANT"* — vibrant and luminous (reds, oranges, amber, greens on richer, deeper backgrounds), an aura that reflects Luna's
real states, no mascot, never generic blue/black/gold or beige; AI Mode first, shown before spreading. Shown the result: *"Go new
design is a go."*

## What it is

- **The canvas** — night (`--lu-night #0a0b10`, `--lu-deep #13151d`) with faint amber and violet light; words `--lu-text`, quiet
  words `--lu-dim`; type Geist (`@fontsource-variable/geist`).
- **What you press** — amber to orange (`--lu-amber`, `--lu-orange`) with night words; the focus ring amber.
- **The aura, by real state** (`.ai-orb` in AI Mode, `.vm-orb` / `.vm-bar-orb` in voice): resting small and quiet; listening and
  transcribing green, swelling with `--lvl`; thinking (chat `is-thinking`, voice processing · preparing · initialising · recovering)
  a violet–green–amber field that turns; speaking amber → orange → red, pulsing with `--lvl`. `--lvl` is raised by the words
  recognised (`heardTick`) and the words spoken (`onboundary`) in `colleague/VoiceMode` — not raw microphone loudness. Reduced
  motion: no turning, no pulse.
- **No moon** — Luna is light, not a figure; in AI Mode the frame's mark gives way to a small amber light.
- **State colours** keep their five meanings and words, lifted for the dark ground.

## How it is scoped

`main.tsx` sets `html[data-luna]` on `#/ai…`; the house tokens are redefined under `html[data-luna], .vm, .vm-bar`, so every
shared part follows with no per-part colours (the SPECTRUM block at the end of `styles.css`). The voice screen and bar wear it
wherever they open. The work panel opens by itself only once a conversation holds work (a draft, a record made, notes), never for
a line in scope alone; the person's own choice is kept (`fl-ai-wide`).

## Next — the rest of the app, slice by slice

Each screen moved to the Spectrum tokens, shown at 1440 and 390, the calm check and the inventory green; paper stays light
(CLAUDE.md, visual management — what prints is never white on dark).
