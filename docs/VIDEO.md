# Video intelligence — the implementation record

Rowland, 18 October: *"allow a user to upload a production video, describe the
analysis they want in natural language, and receive a structured, reviewable
manufacturing study with measurements, findings, calculations and a
professional report."* A specialist power tool inside Faultline — not a
replacement for the methods engine, the library, the stage gate, the 6M, Line
capacity, SMED or the reports.

This file is the record: what is built, what is verified and how, what was
measured, what it does not do, and what waits on someone.

## Where it sits on the blueprint (BLUEPRINT §8)

- **Layer:** on the line — a tool, used on its own, on a line, or on a job.
- **Record:** no new noun. A video study is a **line balance study**
  (`studies`, tool `balance`) whose laps come from footage instead of a
  stopwatch: `facts.video` holds the source (the footage's media reference,
  its facts read from its bytes, the job and the settings it ran with, the
  demand for takt, every report made), `facts.vevents` the events (an
  id-keyed list, merged by id between devices by the sync engine's nested
  merge). Nothing worked out is stored: cycles, workload, takt and the report
  are worked out from the accepted events every time they are read.
- **Where it shows:** the rail's Tools (*Video study*, `/video`); the study's
  own page (`/video/:id`); anywhere a line balance is read
  (`lib/ie/balanceLink` `studyBalance` builds the elements from the accepted
  events) — so a method's step done with the line balance offers it and reads
  its figures (balance efficiency, people needed, the longest stack); its
  report.
- **Replaces:** nothing.

## The pipeline as built

| Piece | Where | What it does |
|---|---|---|
| Ingestion | `lib/video/extract` `probe`, `lib/video/validate` `checkFootage` | The file's type read from its **first bytes** (`lib/mime` sniffMime), never its name; its length, picture size and orientation from the browser's decoder; its frame rate estimated by playing a second of it (`requestVideoFrameCallback`); its codec where the file names it. Refused in words: not a video, empty, too long (20 min), too large (500 MB), no picture, damaged. |
| Storage | `db` putBlob (IndexedDB `media` store) | The original recording kept on the device it was taken on. Never a public URL; played from a local object URL. |
| Job lifecycle | `lib/video/job`, `lib/video/runner` | `uploaded → queued → extracting → analysing → validating → review → reported`, `failed` (retryable or not) and `cancelled`, kept **on the study's record**. One reading at a time per study (`navigator.locks`); every few frames the signal so far is kept beside the footage so a closed or reloaded tab **resumes from its last frame**; a reading is keyed by the footage's fingerprint and every setting, and the same key is never read twice. |
| Preprocessing | `lib/video/extract` `readSignal` | The footage decoded by the browser: seeked to each source second and drawn small and grey; for each station in view, how much its pixels changed since the frame before. Every value is tied to the source second it was seeked to — resizing never changes the time. The sampling interval follows the footage's length (0.1 s up to a minute, 0.2 s to five, 0.5 s beyond) and the frame limit (2,400). |
| Analysis — when | `lib/video/detect` | Deterministic, on the device: each station's quiet and busy levels from its own values; work is movement above the larger of `sensitivity` spreads over quiet or a share of the way to busy; stretches found on the smoothed signal, each boundary placed on the raw values halfway between quiet and that stretch's level; flickers joined, blips dropped. Every event a **candidate**, with its confidence and its supporting frames' source seconds. |
| Analysis — what | `lib/video/providers`, `lib/video/visionCore`, `supabase/functions/assist` task `video-label` | Provider-independent: a labeller interface. The one built asks a vision model, through the app's gateway, what each candidate's work looks like — from **one small frame per event, cropped to its station**, at most 24, only when the person ticks *Name the work from the frames* on that study. The model is told never to identify anyone and never to estimate times or counts; its answer is held to a JSON schema and read again (`checkLabels`); labels change a candidate's kind and words, never its boundaries or its review. Observed and inferred are kept apart. |
| Validation | `lib/video/validate` `checkEvent`, `keepValid` | Every event from every source — the reading, the model, a person — checked before it is kept: inside the footage, a known kind, a known station, confidence 0–1, says what is seen, says how it is known. A malformed one is refused in words. |
| Engine | `lib/video/study` | Deterministic, from accepted events (or, said as provisional, with the candidates): each station's work a cycle (whole cycles only — a piece cut off by the footage's start or end is kept out), its cycle start-to-start, its waiting between, its utilisation; a cycle half again as long as usual flagged as possibly a missed one; the bottleneck and the rate it allows; how evenly the work is spread; takt from a demand and its minutes; the stations over takt; the line balance's own elements for `lib/ie/balance` (stacks, fewest people, efficiency, the Yamazumi). Each finding says whether it is **measured**, **worked out**, **proposed — not measured** (never said to be safe: "check the method, the reach and the safety before it is") or **not known yet**. Never "verified" while a candidate remains. |
| Review | `screens/VideoScreen`, `lib/video/review` | The footage played with the stations drawn over it; every event on a lane per station and in a list; a tap plays from it; *Start here* / *End here* move a boundary to the playhead; its kind changed; merge with the next at the station; split at the playhead; accept, reject; *Add work at …* for what it missed; *Accept every one still to review*. What the reading first proposed is kept on the event (`proposed`), said *corrected from …*. A new reading never proposes again what a person accepted or rejected. |
| Words | `lib/video/ask` | The study asked for in words on New ("Analyse this video for line balance against takt" → a line balance, with takt) and questions answered from the figures on the page — cycles, waiting, takt (and what it needs), the bottleneck, what is missing, the report — each answer saying it was worked out or is not known. No assistant needed. |
| Report | `lib/video/reportPdf`, `lib/video/printReport` | The lean page on paper: the band, five tiles, what was asked of what footage, how it was read (every setting and the reading's key), each station with units, the stacks against takt drawn, takt worked out with its arithmetic, what it says by kind, every event with its time, how it is known and what was decided (*NOT REVIEWED* where it was not), the closing line. Each report made is kept on the study (when, from how many accepted and still to review), so a report made again after a correction never loses the one before. |
| Access | `useAccess` | On a job, the job's levels: a client reads, the team reviews, the owner deletes; on no job, its maker. The studies table's rules apply to the record as to every study. |
| Deletion | the study page | *Delete the footage* removes the recording from the device and marks the study (when and by whom); the events, figures and reports are kept and say the footage was deleted. *Delete the study* with Undo. |

## Verified, and how

- `src/lib/video/__tests__/video.test.ts` — 26 tests: the footage checks;
  detection on signals whose busy times are known (every piece found, none
  twice, boundaries within 0.15 s at a 0.2 s reading); nothing invented in a
  still station; the engine's figures worked by hand; provisional kept apart;
  each review operation and what it keeps; malformed events refused; the job's
  states; the reading key; the words; the assistant's labels — what is kept
  and that a decided event is never touched; reading again over a person's
  decisions.
- `scripts/acceptance/video-study.mjs` — 33 checks in a real browser from an
  empty device: footage made with a known schedule, uploaded through New; a
  file that is not a video refused; read on the device; **the reading
  measured against the truth** and printed; reviewed (all accepted, a
  boundary moved to the playhead, one rejected); the line balance, the
  stacks, takt asked for and given; the report downloaded and read back; a
  reload, and a second reading stopped by a reload carrying on; the footage
  deleted with what was found kept; no console error.
- `scripts/video-eval.mjs` — the reading measured condition by condition
  (below). Not pass/fail.

## Measured accuracy (18 October)

Synthetic footage only (`src/dev/videoSynth`): a line drawn side-on, each
worker moving only while working, a camera's grain on every frame, 25 frames a
second, 640×360 (960×360 for six stations), WebM from the browser's own
recorder; read every 0.1 s at sensitivity 4. Matched when a found event and a
true one share at least 30% of their joint span.

| Footage | Found / true | Precision | Recall | Start error | End error | Work error | Cycle error | Read in |
|---|---|---|---|---|---|---|---|---|
| Clean — three stations, light grain | 12 / 12 | 1.00 | 1.00 | 0.02 s | 0.13 s | 0.10 s | 0.01 s | 29 s for 32 s |
| Heavy grain (a dim, noisy camera) | 12 / 12 | 1.00 | 1.00 | 0.06 s | 0.12 s | 0.05 s | 0.04 s | 32 s for 32 s |
| A station busy nine-tenths of the time | 11 / 12 | 1.00 | 0.92 | 0.05 s | 0.77 s | 0.81 s | 1.34 s | 29 s for 32 s |
| Short pieces of work (1 s every 3 s) | 20 / 20 | 1.00 | 1.00 | 0.08 s | 0.12 s | 0.01 s | 0.01 s | 27 s for 30 s |
| Six stations in view | 28 / 29 | 1.00 | 0.97 | 0.03 s | 0.12 s | 0.17 s | 0.01 s | 36 s for 32 s |
| Flickering lights (every 1.3 s) | 13 / 12 | 0.92 | 1.00 | 0.38 s | 0.20 s | 0.53 s | 0.75 s | 28 s for 32 s |

Read the table as: on clean or noisy footage of distinct work, the reading's
boundaries are within a tenth or two of a second and each station's cycle
within a few hundredths. It is weak where it was expected to be:

- **A station that is almost never idle** — a gap shorter than the join (0.5 s)
  makes two pieces one; its cycle is then wrong by a whole piece.
- **Lighting that changes** — every station changes at once, so a flicker
  reads as work. Nothing in the reading separates the two yet.
- Not measured at all: real footage; a camera that moves; people walking
  between stations; one person working two stations; occlusion; slow work
  with little movement (inspection); a person reaching into a neighbour's
  zone. Each is a reason a person reviews every event.

**What the model adds is not measured.** The labeller is built and tested on
recorded answers, but the gateway is not deployed (below), so how often its
names are right, and what they cost, has not been seen. The percentage of
observations a person corrects is not measured on real footage either.

## What it does not do yet

- **Real footage, timed by hand** — the evaluation set the mandate asks for
  needs permissioned factory footage with event times a person has checked.
  None exists here; `scripts/video-eval.mjs` takes it the day it does (a
  `truth` list a condition, the same score).
- **A worker for long footage.** Reading runs on the device that has the
  footage, about as long as the footage runs, and resumes; past twenty
  minutes, or on a phone, it is slow. A separately deployed worker (FFmpeg,
  authenticated jobs, restricted storage access) would write the same signal
  and the same job states; it is not built, and Vercel's static hosting and
  one edge function cannot hold a video for minutes.
- **Station zones beyond side-by-side bands.** Stations are vertical bands of
  the picture with movable edges; a free rectangle per station is next.
- **SMED, cycle-only and waiting studies** are read as their kind from the
  words, and the same events and engine serve them, but only the line
  balance's figures and paper are built; SMED from footage (the activity
  sequence, internal and external — never auto-labelled convertible) is the
  next study on the same pipeline.
- **Capacity from footage** — the demand and the minutes are asked for takt;
  product mix, machine limits, downtime and yield are Line capacity's, and
  linking a video study to a product's Line capacity is next.
- **The job's own page** does not yet list its video studies; the study
  carries its job, the list shows it, and a method step done with the line
  balance offers it.

## Waiting on someone

| What | Why | Who |
|---|---|---|
| `supabase/VIDEO_MEDIA.sql` applied and read back | The media bucket takes a file only when a row the person can see names it; studies are not looked in yet. Until then the footage stays on the device it was taken on, and the study says so; everything else syncs. | Rowland's yes (the last migration offered was declined), or a paste into the Supabase SQL editor |
| `supabase/ASSIST_USAGE.sql` applied, `supabase/functions/assist` deployed, `ANTHROPIC_API_KEY` set | Naming the work from the frames goes through the gateway, which never runs without its cost control. Until then the study says the assistant is off and every figure is worked out the same. | Rowland |
| Permissioned real footage with hand-timed events | The only honest accuracy figure for the floor. | Rowland / the site |

## Next actions

1. With the footage migration applied: studies name their footage for the
   sync (`cloud/mappers` studies.mediaKeys), the study's words change, and
   `sync-two-devices` gains a study's footage played on the other device.
2. Real footage: a first permissioned clip timed by hand, scored by
   `scripts/video-eval.mjs`, the table above split by real conditions.
3. Station rectangles drawn on the frame; lighting change told from work (a
   change at every station at once is the light).
4. SMED from footage on the same events: the sequence, internal/external
   candidates for a person to decide, the future state as a proposal.
5. A video study linked to a product's Line capacity (a station's timed cycle
   from footage, as the line balance's person already gives it).
