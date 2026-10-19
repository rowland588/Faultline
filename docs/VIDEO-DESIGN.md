# Video studies — how Faultline decides how to film and how to read

Rowland, 19 October:

> "I want to make sure the video intelligence is being designed as a serious
> manufacturing analysis capability, rather than simply uploading video to an
> AI model and asking it what it sees … Please don't assume a single camera
> setup or analysis approach will suit every situation … The objective is not
> simply to summarise factory footage. It is to extract defensible,
> time-based manufacturing observations that can support real analysis, while
> clearly distinguishing measured facts, model interpretations and unverified
> assumptions."

This is the design every video study follows. `docs/VIDEO.md` is the record of
what is built and measured; `docs/VIDEO-FEASIBILITY.md` what was proved about
cameras and phones before any of this was built.

## 1. Where it stood on 19 October (read from the code)

| Asked for | How it was handled | Built? |
|---|---|---|
| Choosing the study | `lib/video/ask` `readObjective` read four words (line balance, cycles, changeover, waiting) — but **every kind was read the same way**, as a line balance | Words only |
| Camera position | One hint on an empty list: "filmed side-on with every station in view". Stations were vertical strips of the picture only; the record allows rectangles, the screen did not | One set-up, assumed |
| Guidance before filming | None | No |
| Is the footage fit? | Only the file: its type from its bytes, length (20 min), size, picture. The steady check (`lib/video/steady`) existed but was not run on uploaded footage | File only |
| People and movement | A station's worker is a fixed label ("Operator A"); no tracks, no walking, reaching or handling found — only by the assistant's naming or a person | No |
| Product and material flow | Nothing | No |
| Machine activity | Movement in a strip is called *work*, whatever moved | No distinction |
| Time and accuracy | Source seconds kept on every event; boundaries measured within 0.1–0.2 s on synthetic footage — but **no ± on any figure**, every time printed to a tenth of a second whatever the reading's interval, and gaps with no movement called **"waiting"** — an assumption written as a fact | Partly |
| Interpretation vs measurement | Kept apart well: *observed* and *inferred* words on each event; the assistant never moves a boundary; findings say measured, worked out, proposed or not known | Yes |
| Review | Every event a candidate; accept, reject, move a boundary to the playhead, split, merge, add by hand; what was proposed kept | Yes |
| Privacy, storage, cost | People as labels, never named; frames for the assistant cropped to the station, 24 at most; footage on the device, synced, deleted everywhere; reading on the device costs nothing | Yes |

## 2. The decisions

**D1 — A video study starts from a manufacturing objective, never from the
footage.** The objective decides the camera set-up, the methods, how long to
film, and what may be claimed. The catalogue is `lib/video/objectives`; each
entry says whether Faultline can measure it from footage *today*, partly, or
not yet — and, when not yet, which of the app's tools to use meanwhile.

**D2 — Four kinds of statement, never mixed.**

| Kind | What it is | Example | Who can make it |
|---|---|---|---|
| **Fact about the footage** | Measured from the file and its frames | "Filmed at 30 frames a second; the camera shook for 4% of it" | The reading |
| **Observation** | A time-stamped thing seen in the picture by a method whose accuracy is measured, with its ± | "Movement at Station 2 from 1:04.2 to 1:08.6, ±0.1 s each end" | The reading (a candidate) → **confirmed** by a person |
| **Interpretation** | What an observation is believed to be | "Placing a tray on the conveyor"; "this gap is waiting" | The assistant (from frames) or a person — never changes a time |
| **Worked-out figure** | Arithmetic on confirmed observations, with its precision and whether the sample is enough | "Work 4.1 s a cycle, 95% between 3.9 and 4.3 s, 12 cycles (9 needed for ±5%)" | The engine (`lib/video/study`), the same way every time |

Proposals ("moving 1.2 s of work…") are a fifth, said *proposed — not
measured*. **An absence of movement is an observation; calling it waiting is
an interpretation** — so the app says "no movement seen", and waiting only
when a person has seen it.

**D3 — Techniques chosen by what they have been shown to do, not novelty.**

| Method (`lib/video/objectives` METHODS) | Technique | Produces | Status | Shown on |
|---|---|---|---|---|
| Movement in a zone | Conventional vision: frame difference in a box, against the box's own quiet level | When activity starts and stops in a fixed place | Built | Synthetic footage, six conditions (VIDEO.md) |
| The camera's steadiness | Conventional vision: the picture's shift against the first frame | Steady · shaking · moved, by when and how far | Built | Fifteen set-ups (VIDEO-FEASIBILITY.md, G) |
| The light | Brightness frame to frame | Light changes and sudden jumps | Built | The same set-ups |
| Naming the work | A vision model through the gateway, on a few frames the timing picked | What an event looks like — an interpretation | Built, **not measured** | Recorded answers only |
| A person marking | The player and the review controls | Events, boundaries, names — the ground truth | Built | — |
| Presence in a zone | Conventional vision: a learned empty background | Someone or something there while still — tells waiting from absent | Planned | — |
| A count line | Conventional vision: changes crossing a line drawn across the flow | When each item passes — output, gaps, a machine's discharge | Planned — **next** | — |
| People's tracks | An on-device person detector and a tracker, from above | Temporary tracks between areas: walking, distances | Planned | — |
| Objects' tracks | Detection and tracking of trays, baskets, cases | Hand-offs, accumulation, waiting of material | Planned | — |

A vision model is good at saying what a frame shows and has no measured
accuracy at saying *when*, *how long* or *how many*; conventional vision gives
timestamps whose error can be measured against footage with known times. So
timing and counting are conventional; the model only interprets, and only
what the timing picked. Every method must be measured on footage with known
times before its figures are claimed, and on real footage timed by hand before
they leave "synthetic only".

**D4 — The camera.** Every timed study needs a **fixed camera** — vibration
of under a pixel made two of every three pieces of work found false
(VIDEO-FEASIBILITY.md, F and G). The view follows the objective:

| View | For | Why |
|---|---|---|
| Side-on, raised (2–2.5 m, angled down) | A line of stations: balance, cycles, waiting | Every station's hands and bench in one picture; people do not stand in front of each other |
| From above, or a high corner | Movement between areas; an area's material; several stations in depth | Paths and areas are flat from above; nothing hides behind anything |
| Across the flow | Products passing a point; a machine's discharge | Each item crosses the picture one after another |
| Close-up of one station | The elements inside a cycle | Hands and parts large enough to see a reach from a place |
| Hand-held or moving | **Never timed.** A walk-through for the record | The picture moves, so movement is not work; the assessment refuses to time it |

Several cameras only when one view cannot hold every station at a tenth of
its width or something hides part of the work; each is its own footage on a
shared clock (planned: a study holding several sources, each with its offset).

**D5 — Guidance before filming.** For the objective chosen, Faultline says
where the phone goes and why, what must be in the picture, how long to film
(from the cycles needed and the cycle time, when it is known), the settings,
the stability, the light, and the people — consent, no sound, faces not the
subject, hygiene (`lib/video/capture`). A long study is tried on the phone
first (*Can this phone film a long study?*).

**D6 — Footage already filmed is assessed before it is trusted.** On upload a
quick scan reads the light and the camera's steadiness over a stretch; the
reading then tracks both over the whole footage; and the assessment
(`lib/video/assess`) says, check by check with what it measured, whether the
footage suits the objective — and, measure by measure, what can be measured,
what only with limits, what only interpreted, and what not at all, and why.
Unsuitable footage can still be kept and marked by hand; its figures and its
report say it was unsuitable.

**D7 — Time.** Source seconds on everything. Every boundary from the reading
carries ± half its reading interval (`pm` on the event); a boundary a person
moved keeps that ± for now — one frame at the player is the best a person
does, and telling the two apart is not built. Durations are printed to a
tenth of a second with the ± said beside them: each end's, a length's (√2 ×
an end's), and a station's mean as the larger of its 95% interval and the
reading's own ±, so a mean is never printed surer than the frames allow.
Each station's mean comes with its 95% interval and the cycles needed for
±5% (Student's t, the line balance's own arithmetic, `lib/ie/balance`
`cyclesNeeded`) — one number, the same on its row, in the assessment and on
paper. An event inside a stretch where the camera shook, after it moved, or
where the light jumped is flagged on the review, the findings and the
paper.

**D8 — Validation is a person's, and measured.** Every observation is a
candidate until a person confirms it on the footage; figures count only the
confirmed unless provisional is chosen and said; a correction keeps what was
proposed. Each method is scored against known times (`scripts/video-eval.mjs`)
and its measured accuracy is quoted where its figures are shown.

**D9 — Practical limits, said.** Occlusion and people crossing — prevented by
the view (raised, behind the line) and caught in review (a planned flag for a
sweep across neighbouring zones). Lighting — tracked and flagged. Privacy — no
sound, labels not names, no face recognition, frames for the assistant
cropped to the station, deletion everywhere. Hygiene — the phone outside the
product zone, in a cleanable case, by the site's rules. Storage and cost —
read on the device; keep the reading (kilobytes an hour), the stills and the
clips that matter, never hours of video; the assistant's frames capped per
study. Length — 20 minutes a study today; longer is the long study (read live
as it films, proved feasible).

## 3. The first capability, end to end (built 19 October)

**Fit-for-purpose station timing**: the objective chosen → the plan shown
before filming → the footage assessed on upload → read with its quality
tracked → candidates with their ± and flags → reviewed → figures with their
precision, intervals and whether the cycles are enough → the assessment and
all of it on paper. Chosen first because the line balance and cycle times are
the study a site does most, the reading for it is the one whose accuracy is
measured, and every later method plugs into the same chain: objective →
capture needs → assessment → method → observations with ± → review → figures.

### Built and proved, 19 October

| Piece | Where | Proved by |
|---|---|---|
| The studies, their claims, the views, the methods | `lib/video/objectives` | `assess.test.ts`: every study refuses the hand; a vision model never makes a time or a count; only line balance and cycle times measured today |
| How to film it | `lib/video/capture`, `ui/VideoFit` FilmPlan — New, before the footage, and on the study's page | `assess.test.ts` (the length from the cycle: (10 + 2) × 30 s → 6 minutes; over 20 minutes said); `video-fit.mjs` 1–1b |
| A quick look as it comes in | `lib/video/extract` `scanFootage`: 16 frames for the light, 10 s at 0.25 s for the camera, from a quarter in | `video-fit.mjs` 2 (shaken footage said unfit from the stretch); `video-study.mjs` 1b1 (steady footage said fit, "checked on a stretch so far") |
| The footage's quality over every frame read | `readSignal` keeps each frame's steadiness and brightness; `lib/video/assess` `qualityOf` → `facts.video.quality` | `assess.test.ts` (shake 10–14 s, a move at 20 s, a lamp at 25 s found where they were); `video-fit.mjs` 3b — **measured: shaken 8–20 s, said 8–20 s and 8–21 s on two runs** |
| Each event flagged by it | `flagEvents`, run with every reading | `video-fit.mjs` 3c: every event inside the shake flagged, none outside it (3 of 8) |
| Is this footage fit for the study? | `assessFootage` → `ui/VideoFit` FitView on New and the study's page; the report's section | `assess.test.ts` (each check's status, unfit for the hand, a shake ≥ 20%, a station under 32 px; the claims a failure stops); `video-fit.mjs` 3f, 4a, 5; `video-study.mjs` 2a1; the inventory (the seeded study: the light jumped once, too few cycles, two to review) |
| ± and the cycles needed | `lib/video/study`: `ci95`, `pm`, `needed`, `enough`, `flagged`; the table, the findings, the paper | `assess.test.ts` (t(9) 2.262 × 0.176 ÷ √10; (2.262 × 0.176 ÷ 0.15)² → 8 needed); `video-fit.mjs` 3d, 4, 5a |
| No movement is not waiting | the step `No movement at …`, the findings, the answers, the table, the paper | `video.test.ts`; `video-study.mjs` 4e; `video-fit.mjs` 4, 5a |

What this does **not** yet prove: the steadiness and light thresholds and the
reading itself are measured on made footage only; real footage timed by hand
(VIDEO.md, the protocol) is what moves any figure from "synthetic only".
Changing the study's kind changes its plan, its assessment and what it may
claim; the figures for studies not measured yet are still the movement in
each box, said so on the page.

## 4. The route from here

1. **The count line** — items crossing a line drawn across the flow: output
   rate, the gaps between items, a machine's discharge stopping (observed:
   "nothing passed for 42 s"; never inferred: "the machine faulted").
   Objectives *Product and material flow* and *A machine's output and stops*
   move from not-yet to partly.
2. **Presence in a zone** — someone there and still told from nobody there:
   waiting measured, not interpreted; *Waiting and idle time* to measured.
3. **Rectangles drawn on the frame** for stations, buffers and count lines
   (the record already holds rectangles).
4. **Sweep flag** — a person crossing several zones in turn flagged in review.
5. **Several cameras** on one clock.
6. **People's tracks from above** — walking between areas; the spaghetti
   diagram from footage.
7. **Elements inside a cycle**, SMED from footage, work sampling from footage —
   each proposed by the reading, named and decided by a person.
