# Can it be done? — the long video study, measured before it is built

Rowland, 19 October, on leaving a phone on a line:

> "If I was to leave a mobile phone on a production line for 1 hour to gain
> insight, that's okay, but that's a large video. What if we wanted 2 hours,
> 3 hours? ... we're doing live analysis, and we're saving the live analysis,
> not the video itself. We have videos that would be clips."

> "because of the complexity of the video system we really need to make sure
> that the technical abilities are possible.. and then how we achieve them.."

> "Does it operate if I was moving? ... Does it have to be stationary? Does it
> have to be bird's eye view? Does it have to be side of the line? ... Can't
> work in every variable, surely."

So before any of the long study is built, each ability it would need was
measured. This file says how, what was found, what it means for the design,
and what only the phone itself can tell.

## How it was measured

- **`scripts/video-feasibility.mjs`** — not a pass/fail. A real Chromium,
  footage whose times are known (`src/dev/videoSynth` `lineScene`: three
  stations, each worker moving only while working, a camera's grain on every
  frame), drawn live and fed to the reading the way a camera is
  (`canvas.captureStream`), read by the app's own arithmetic
  (`lib/video/extract` `changeByZone`, `lib/video/detect`, `lib/video/evaluate`,
  `lib/video/steady`). Probes A–G below; `FEAS_ONLY=A,G` runs some.
- **What it cannot prove:** a phone — its camera's own noise, its heat and
  battery over hours, a locked screen, Safari. That is the phone check's
  (below), run on the phone that would film the line.
- Measured 19 October on the build server (four cores, no GPU — every cost
  below is a desk computer's software path, not a phone's).

## What was found

| Ability | How it was tried | What was found | So |
|---|---|---|---|
| **A — read as it films** | 120 s read live, a sample every 0.2 s at 160 px wide; recorded alongside and read again afterwards by the app's own reader | Live: 45 of 45 pieces of work found, precision 1.00, recall 1.00, starts ±0.08 s, ends ±0.24 s. The same footage read afterwards: the same 45, starts ±0.05 s. Live against afterwards: the same events within 0.05 s. A sample costs 5.7 ms (20 ms at the slowest twentieth); 599 of 600 taken. Reading the recording afterwards took **94 s for 120 s** of footage | **Read live.** Live is as good as afterwards and costs nothing extra; reading three hours afterwards on the device would take some 2.3 hours more |
| **B — clips that play on their own** | A recorder started anew every 30 s, one after another and overlapping by a second; one recorder sliced every 10 s | One after another: every clip plays, **60–70 ms lost** between two. Overlapping: every clip plays, **nothing lost**. Sliced: only the first slice plays on its own — the others need the first | **A clip is its own recorder, the next started a second before the last stops.** Slices of one recording cannot be kept apart |
| **C — a long run** | 15 minutes read live with the steady check, clips every 30 s, the reading saved to the device's storage every 10 s, minute by minute — beside the gate's own heavy run on the same server | **300–301 samples every minute**, all fifteen (five a second kept up); 4.6–8.0 ms a sample to read, 4.3 ms more for the steady check; memory flat at 48–72 MB, no growth; at the end **339 found of 338**, precision 0.99, recall 1.00, worked out in 33 ms; the reading **72 KB** (some 290 KB an hour); 30 clips, 59 MB if all were kept; saving the reading so far took 13–57 ms on average, **206 ms at the worst** | **An hour or three is not a problem of memory or keeping up.** Saving grows with the reading because each save writes all of it — the long study writes only what is new since the last |
| **D — a camera** | Chromium's own fake camera at 1280×720, read every 0.2 s while it recorded | 149 of 150 samples; **65 ms a sample** to draw a 720p frame down to 160 px on this server's software path (5.7 ms for a 640-wide picture); the recording plays. The browser offers WebM (VP8, VP9) and MP4 recording, frame-by-frame timing, the screen kept on, the track processor | A phone draws on its GPU, so the cost there is unknown — **the phone check measures it** |
| **E — sizes** | 20 s recorded at three bitrates; a still of each station | **133 MB an hour at 0.5 Mbps, 247 at 1, 579 at 2.5**; a still about **5 KB**; the reading itself about **290 KB an hour** | An hour of video is five times what one file may be in the cloud (50 MB) and a quarter of the free plan's whole store (1 GB). **Keep the reading, the stills and the clips that matter — not the hours** |
| **F — the camera's set-up** | 60 s each of ten set-ups, scored against the known times | See the table below | **A fixed camera.** Side-on or from above both work; vibration and a hand do not |
| **G — the steady check** | 60 s each of twelve set-ups; the picture's place against the first frame, judged two seconds at a time (`lib/video/steady`) | See the table below | **The reading can tell, as it reads, that the camera shook, moved or was held — apart from the light and from people crossing** |

### F — the camera's set-up (precision and recall of the work found)

| Set-up | Found | Precision | Recall | Start ± | End ± |
|---|---|---|---|---|---|
| Fixed, side-on (the reference) | 23 of 24 | 0.96 | 0.92 | 0.07 s | 0.28 s |
| Line vibration, ±1.5 px every frame | 50 of 24 | **0.36** | 0.75 | 0.79 s | 1.26 s |
| Knocked once, 10 px at 30 s | 23 of 24 | 0.96 | 0.92 | 0.07 s | 0.28 s |
| Held in the hand, drifting ±12 px | 60 of 24 | **0.37** | 0.92 | 1.12 s | 1.35 s |
| The phone's exposure changing (25% brighter for 14 s in 40) | 23 of 24 | 0.96 | 0.92 | 0.14 s | 0.44 s |
| Somebody walking across every station every 20 s | 27 of 24 | 0.81 | 0.92 | 0.52 s | 0.34 s |
| A running conveyor inside every station | 23 of 24 | 0.96 | 0.92 | 0.10 s | 0.28 s |
| From above: six stations in a 2 × 3 grid | 46 of 48 | 0.96 | 0.92 | 0.10 s | 0.34 s |
| Ten stations in one picture (16 px each) | 76 of 80 | 0.96 | 0.91 | 0.06 s | 0.29 s |
| Ten stations, read at twice the width | 76 of 80 | 0.96 | 0.91 | 0.07 s | 0.29 s |

What breaks it is the camera moving all the time — vibration or a hand: work
is found where there is none (two of every three pieces it finds are false).
A single knock, the light, a running belt, a view from above and ten stations
in one picture do not. People crossing make a few false pieces.

### G — the steady check (`lib/video/steady`, as the app uses it)

Thresholds: shaking over 0.12 px a step, moved over 0.75 px, the light over 8% — pixels at the reading's 160 (one there is four of a 640-wide picture). 60 s each.

| Set-up | Said shaking | Said moved | Said the light | Step a sample, median · worst | Place against the truth, median · 95th | The reading as it is (precision · recall) | Drawn back first | The check a sample |
|---|---|---|---|---|---|---|---|---|
| fixed camera (the reference) | 0% | 0% | 0% | 0.006 · 0.010 | 0.004 · 0.011 | 0.96 · 0.92 | 0.96 · 0.92 | 2.66 ms |
| light vibration (±0.75 px every frame) | 83% | 0% | 0% | 0.153 · 0.196 | 0.078 · 0.201 | 0.58 · 0.92 | 0.81 · 0.92 | 2.86 ms |
| line vibration (±1.5 px every frame) | 100% | 0% | 0% | 0.414 · 0.643 | 0.092 · 0.261 | 0.46 · 0.75 | 0.69 · 0.92 | 2.69 ms |
| heavy vibration (±3 px every frame) | 100% | 79% (from 2 s) | 0% | 0.927 · 1.160 | 0.085 · 0.820 | 0.33 · 0.58 | 0.76 · 0.92 | 2.94 ms |
| knocked once, 4 px, at 30 s | 0% | 48% (from 30 s) | 0% | 0.007 · 0.015 | 0.015 · 0.080 | 0.96 · 0.92 | 0.96 · 0.92 | 2.72 ms |
| knocked once, 10 px, at 30 s | 3% | 48% (from 30 s) | 0% | 0.007 · 0.914 | 0.119 · 0.135 | 0.96 · 0.92 | 0.96 · 0.92 | 2.54 ms |
| the stand sinking 0.1 px a second | 0% | 55% (from 26 s) | 0% | 0.011 · 0.022 | 0.075 · 0.124 | 0.96 · 0.92 | 0.96 · 0.92 | 2.42 ms |
| held in the hand (drifting ±12 px) | 100% | 100% (from 0 s) | 0% | 1.163 · 1.357 | 0.089 · 0.123 | 0.36 · 0.88 | 0.71 · 0.92 | 4.13 ms |
| the phone’s exposure changing | 0% | 0% | 24% | 0.007 · 0.011 | 0.004 · 0.011 | 0.96 · 0.92 | 0.96 · 0.92 | 2.3 ms |
| somebody walking across every station | 0% | 0% | 0% | 0.006 · 0.038 | 0.005 · 0.024 | 0.85 · 0.92 | 0.85 · 0.92 | 2.79 ms |
| a running conveyor inside every station | 0% | 0% | 0% | 0.056 · 0.068 | 0.032 · 0.042 | 0.96 · 0.92 | 0.92 · 0.92 | 2.41 ms |
| from above: six stations in a 2 × 3 grid | 0% | 0% | 0% | 0.007 · 0.012 | 0.006 · 0.018 | 0.96 · 0.94 | 0.94 · 0.92 | 2.53 ms |
| a wide belt running, a fifth of the picture | 100% | 0% | 0% | 0.373 · 0.418 | 0.219 · 0.251 | 0.00 · 0.00 | 0.00 · 0.00 | 2.67 ms |
| a plain wall: fixed, little detail, grain and the workers | 0% | 0% | 0% | 0.044 · 0.091 | 0.021 · 0.096 | 0.92 · 0.92 | 0.92 · 0.92 | 2.32 ms |
| a plain wall, light vibration (±0.75 px every frame) | 97% | 0% | 0% | 0.187 · 0.273 | 0.060 · 0.130 | 0.96 · 0.92 | 0.96 · 0.92 | 3.12 ms |

What it shows: the check says a camera that **shook** (vibration of under a
pixel at 640 wide, up to a camera in the hand), one that **moved** (knocked,
a stand sinking — from the moment it happened, and by how far: a 10 px knock
read as 2.49, 1.12 against the true 2.50, 1.25), and **the light** changing,
apart from each other; people crossing, a belt along the bottom, a view from
above and a plain wall with workers in front raise nothing. It errs to the
safe side once: on a plain wall it calls light vibration shaking where the
reading was not harmed (there is too little detail for a small shake to make
false work). It costs 2.3–4.1 ms a sample on this server. Drawing each frame back to where the first one was
before it is read (the last column but one) roughly doubles the precision
under vibration but does not bring it back — **a camera that moves is said,
not corrected**.

What it cannot do: **a belt across a fifth of the picture** — the place is
pulled by the belt's own detail and the camera is called shaking; and the
reading finds no work at all, because the belt keeps every station busy. So a
belt is kept out of the stations (the stations drawn as boxes above it — the
staged path's V3), and the check's verdict there is not to be trusted.

**Leaving out what moves, tried and not used** (19 October, on the app's own
scenes drawn frame by frame; window step, median · worst, px at 160):

| Scene | The whole picture (used) | What moves left out, three times | …keeping thin lines (3 × 3) | …keeping thin lines (5 × 5) |
|---|---|---|---|---|
| Detailed, still | 0.006 · 0.009 | 0.003 · 0.006 | 0.005 · 0.008 | 0.006 · 0.009 |
| Detailed, light vibration | 0.152 · 0.171 | 0.139 · 0.155 | 0.154 · 0.170 | 0.153 · 0.171 |
| Detailed, a belt along the bottom | 0.056 · 0.062 | 0.026 · 0.030 | 0.031 · 0.035 | 0.045 · 0.051 |
| Detailed, a belt a fifth of the picture | 0.392 · 0.408 | 0.203 · 0.218 | 0.214 · 0.229 | 0.302 · 0.315 |
| Plain wall, still | 0.046 · 0.085 | **0.443 · 0.534** | 0.065 · 0.176 | 0.056 · 0.105 |
| Plain wall, light vibration | 0.178 · 0.219 | 0.408 · 0.771 | 0.181 · 0.224 | 0.178 · 0.221 |
| Plain wall, knocked | 0.032 · 0.085 | 0.121 · 0.534 | 0.025 · 0.176 | 0.026 · 0.105 |
| Work a sample | 4–7 ms | 18–24 ms | 18–29 ms | 17–30 ms |

Leaving out what moves halves what a belt does — and on a plain wall throws
away the few thin edges there are to match, calling a still camera shaking.
Keeping thin lines in brings plain walls back and the belt's gain with it. At
a threshold of 0.12 the whole picture passes every scene the others pass, at
a quarter of the work, so it is what the app uses.

## What it means for the long study

1. **The camera is fixed** — on a stand or a clamp that does not touch the
   line; never in the hand, never on a guard that vibrates. Side-on or from
   above, both work; the stations are bands (side-on) or rectangles (above),
   and a running belt is kept out of them — framed below the stations, or
   left outside their boxes.
2. **It reads as it films.** The reading is the record (some 290 KB an
   hour); it is saved on the phone as it goes, so a test stopped part way —
   or a phone that dies — keeps what was read.
3. **It keeps clips, not hours.** Thirty-second clips one over the next by a
   second, each playing on its own; the long study keeps the ones that
   matter (the longest waits, the odd cycles, a sample for review) and a
   still a station, and lets the rest go. The footage that reaches the cloud
   is clips under 50 MB each.
4. **It says when the camera was not steady**, as it reads: shaking (the
   reading counts shake as work — fix the phone), moved (knocked, sinking,
   picked up — check the stations), and the light changing (said, and not a
   fault). Still to build: the figures from a stretch the camera shook
   marked as not to be trusted.
5. **A person reviews by sample**, not all of it — an hour on an 8-second
   cycle is some 1,350 pieces of work at three stations. (For Rowland to
   agree.)

## What only the phone can tell — *Can this phone film a long study?*

From Video studies (`#/video-check`, `screens/VideoCheckScreen`,
`lib/video/phoneRun` runs it, `lib/video/phoneCheck` says what it found). It
does what the long study would do on the phone's rear camera, for two
minutes, ten, thirty or an hour: reads five times a second, writes
overlapping 30-second clips and plays each on its own, runs the steady
check, asks the screen to stay on, notes the app going out of sight or the
camera being held back or stopped, the battery each minute, and saves the
reading every ten seconds. Then it says, a line an ability, whether the
phone can, with the figures to copy and send. Nothing is uploaded and nothing
goes into the records; what it saved on the phone is deleted when it ends.
`scripts/acceptance/video-check.mjs` drives it on Chromium's fake camera in
every gate.

To run on the phone that would film the line, stood where it would film it:
the 2-minute test first, then the 1-hour test, each with **Copy results**
sent back. What it answers that nothing here can: the phone's cost a sample
at 720p, its camera's own noise (which sets how small a shake the steady
check can say), whether the screen stays on and the app in front, the
battery an hour, whether Safari's clips play on their own.

## What is not decided

- Review by sample for long studies — for Rowland to agree.
- The cloud plan: the free plan's 1 GB holds about four hours of clips at
  1 Mbps; Pro ($25 a month) holds 100 GB and files up to 500 GB.
- Real footage — side-on fixed, from above, one held in the hand — with a few
  pieces timed by hand, to score the reading on the floor (docs/VIDEO.md,
  the protocol).
