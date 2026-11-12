# LUNAR's look — Sunrise (12 November; Aurora before it)

## Sunrise — the identity since 12 November

Rowland, 12 November, having lived with Aurora: *"too dark … too much deep blue, dark background and strong orange contrast."* And the
direction: *"This morning I was looking at the sky as it changed from night into day … deep blue of the night, gradually moving into
light blue, then subtle tones of turquoise and green, with beautiful hints of amber, orange and red … The feeling I want when I open
Lunar is that of looking at a beautiful new morning sky. Light, colour, depth and possibility."*

**The decisions** (all in one layer of `src/styles.css`, *LUNAR — SUNRISE*; every screen reads the tokens, none carries its own colour):

| Role | What it is | Token |
|---|---|---|
| The ground | the morning sky: pale blue above, clearing through the faintest turquoise and green to a warm horizon at the foot; fixed, so pages move over it | `html[data-luna] body` |
| Surfaces | white glass (82% white over the sky) with a hairline and a soft sky shadow | `--surface`, `--elev` |
| Words | the last of the night — dawn navy `#13294b` (13:1), quieter words the same navy at 70% (about 5.3:1); never black | `--lu-ink`, `--lu-dim` |
| What you press | the deep morning blue into the sea's turquoise, white words on it (5:1 or better end to end) | `--brand` → `--brand-2` |
| Where you are, the way you move | the sea's turquoise, deep enough to read (4.6:1); the menu's lit line a sky wash with zenith-blue words | `--lu-sea`, `--lu-zenith` |
| Warmth | amber, orange, coral — the horizon: Luna's light, the line along the frame, a hover's glow, the voice speaking. Never a fill behind words, never a press | `--lu-gold`, `--lu-ember`, `--lu-coral` |
| State | the five meanings at full contrast with their words, unchanged (red, amber, green, violet for under way, grey) | `--st-*` |
| The instrument | a chart, a map, a board on clear white, so figures read as they print | `.ie-pic`, `.lean-pic`, `.tw-canvas` |

Eight colours carry it — zenith `#1b3f7a`, sky `#4c9be0`, sea `#0f8a95`, leaf `#5fc39a`, gold `#ffc56b`, ember `#ff9a5a`, coral `#f06d64`, ink
`#13294b`; every tint (the pale sky, the mist, the horizon, the sea's wash) is mixed from them, so the palette cannot drift (the
ratchet's distinct hex count went down, 70 → 69).

**Luna's light** is a small sunrise, not a blue circle: the last of the night at its rim, the sky through it, the sun's warmth at its heart,
the sky around it turning slowly. Its colours come only from her real state — resting (the first light, breathing), thinking (the sky
turning faster, turquoise into green), listening (clear morning, swelling with each word heard), speaking (the sun rising: amber at the
heart, orange and coral at the edge, lifting with each word she says). At rest on the voice screen she is a soft dawn; grey is kept for
ended and failed.

**Signatures:** the horizon — a two-pixel line along the top bar, sky → sea → leaf → gold → coral, soft; light gathering behind each page
heading; the greeting and the landing's name lit from zenith to sea; the voice screen a morning sky with her light at its centre.

**Avoided, as asked:** heavy navy, black, harsh orange on dark blue, saturated gradients, rainbow, AI purple (the chart palette's violet
became the horizon's ember; violet survives only as the agreed state colour for *under way*, with its word).

---

## Two marks, never one — 12 November

Rowland, on his phone: *"Lunar and luna right next to each other same logo looks wrong."* The top bar drew LUNAR's mark as Luna's sunrise
orb, beside Luna's own orb. So: **LUNAR's mark is a crescent moon** in the morning's deep blues (sky → zenith → ink; `html[data-luna]
.logo-mark`, a mask over the one `ui/Logo` mark) — the platform; **Luna is the sunrise orb** (`.ai-orb`, `.vm-orb`) — the light inside it.
Never the orb in the frame, never the crescent for Luna. On her page her name is said once: *LUNA* over a conversation's own title, not
over the title *Luna*; while the big orb greets you, the header's small orb is not drawn.

## Aurora (11 November) — superseded by Sunrise

Rowland, 11 November, after Spectrum (black with small coloured highlights): *"I want something much more distinctive, vibrant and alive
… deep atmospheric navy, graphite and blue-green rather than pure black … rich luminous oranges, reds, coral, amber, emerald and turquoise
… occasional lighter surfaces where they improve the experience … Do not compromise the quality of operational data presentation for
aesthetics."* Shown Aurora on the real screens (claude.ai/artifact/YSZSTEA6GHhDfAFar8MvEC): *"I'm very happy with the colours and overall
aesthetic you've explored."*

## The six rules

1. **Ground** — navy deepening to blue-green (`--lu-night` → `--lu-tide`), soft light gathering behind each heading; never black.
2. **Meaning** — turquoise (`--lu-teal`) is Luna and where you are; ember to coral (`--brand`, `--brand-2`) is what you press; amber
   waits, emerald is done, crimson is late, violet is under way — always with the word.
3. **Daylight** — an instrument (a chart `.ie-pic`, a map, a board) sits on a light surface with its own deep palette, so it reads as
   it prints. Paper stays light.
4. **Light, not neon** — glow only on Luna's aura, the aurora line under the bar, the primary action and where you are.
5. **Layers** — ground, glass frame, panels with a hairline of light on top, daylight for the instrument.
6. **Type** — Geist, headings tight, labels wide-set capitals, figures tabular.

## Luna's aura, by real state

Resting: turquoise with violet and ember, breathing. Listening: turquoise into emerald, swelling with each word recognised (`--lvl`).
Thinking: violet, turquoise and amber, turning. Speaking: amber, ember and coral, pulsing with each word said. `--lvl` comes from the
words heard and said (`colleague/VoiceMode`), not raw microphone loudness. Reduced motion: nothing turns or pulses.

## Where it lives

The AURORA block at the end of `src/styles.css`, on `html[data-luna]` (set on every signed-in page by `main.tsx`) and the voice parts;
the house tokens are redefined there so every part follows. Contrast: text 15.9 : 1 on the ground; state colours 5 : 1 or better on the
ground and on daylight. Left to do: the grids and boards (SMED, value stream, line standard) onto daylight; the tools list's many Open
buttons quieter.
