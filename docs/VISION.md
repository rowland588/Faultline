# Vision — a spaghetti diagram and time and motion from a fixed camera (Phase 6, designed 8 November, not built)

Rowland, 8 November:

> "Position a phone or camera on a tripod overlooking a production area and ask Faultline: observe this operator and
> produce a spaghetti diagram … track movement through a defined working area, movement between zones, a movement
> path, distances where the camera view is calibrated, repeated journeys, unnecessary movement … support
> time-and-motion studies. This would require a dedicated computer vision capability, not simply sending an entire
> video to a conversational model. Investigate calibration, tracking, occlusion, confidence, processing costs, privacy,
> workplace consent and data retention. **Do not implement this now. Keep the architecture open.**"

This is the design and the feasibility case. **Nothing here is built.** It hangs off what is: the video study
(`docs/VIDEO.md`, `docs/VIDEO-DESIGN.md`, `docs/VIDEO-FEASIBILITY.md`, `src/tools/video/`) and the spaghetti diagram
(`src/tools/spaghetti/`, `knowledge/specs/FC-004-spaghetti-board.md`, `FC-242-spaghetti-walkers.md`). It adds **no new
noun**: a track is what a video study reads, a spaghetti diagram is still the several-walkers calculator's record, and
the sums are still that calculator's. `docs/VIDEO-DESIGN.md` §2 D3 already lists *People's tracks* as a planned method;
this document is that method designed.

**On the sources.** This session could not reach the model publishers' pages (ai.google.dev and blog.tensorflow.org
are outside the session's network). Library versions and licences below were read from the npm registry on 8 November.
Model sizes and frame rates are **as published, from knowledge, not re-read** — each is marked *(to confirm)* and is
confirmed, with the page and its date, in slice V2's specification before any code. The figures that matter for the
decision are measured on the phone (§8), not taken from a publisher's table.

## 1. Where it sits (BLUEPRINT §8)

- **Layer:** on the line — a tool used on its own, on a line, or in a project (the line is home).
- **Records:** a video study (`studies`, `facts.video`) gains a calibration, zones and tracks in its facts. The
  spaghetti diagram (`spaghetti-walkers`) gets its walkers' boxes filled from a reviewed track, as the board fills them
  today (`board.ts` `boardInputs`). Observed times go to the line balance's elements, never as a standard.
- **Where it shows:** the video study's page (the track over the frame, the review), the spaghetti diagram's page and
  paper (its picture on the rectified floor), the line's Tools (In use, with its finding), the line report and the full
  package (each tool's own paper block), a Kaizen event's Observe row.
- **Replaces:** nothing. The board stays the first way to draw a spaghetti diagram; the camera becomes a second, as
  Line Talk's set is a third.
- **Schema:** none — facts are JSON (`sync-schema.test` unchanged). Footage stays on the device (`db` putBlob).

## 2. What the video study already gives

| It has | Where | What it means for tracking |
|---|---|---|
| The footage checked from its bytes; length (20 min), size (500 MB) and picture refused in words | `validate.ts`, `extract.ts` `probe` | The same intake; a tracking study adds nothing to the file checks |
| Source seconds on everything, a reading that resumes after a reload, keyed by fingerprint and settings | `job.ts`, `runner.ts`, `record.ts` `READING_VERSION` | A track is a reading like any other: its own version (`track-1`), resumable, never read twice |
| Movement in a zone (frame difference) — when work starts and stops at a station | `detect.ts`, `extract.ts` `changeByZone` | It says *something moved here*, not *who* or *where on the floor*. Not enough for paths |
| The camera's steadiness and the light, frame by frame, events flagged | `steady.ts`, `assess.ts` `qualityOf`, `flagEvents` | **Reused unchanged**: a calibration is only true while the camera has not moved, so a *moved* stretch voids the homography after it (§4) |
| The study chosen from its objective; *Walking and movement* already an objective, said **not yet** | `objectives.ts` `movement`, METHODS `person-track: planned` | The objective and the filming advice exist; its status moves from not-yet to partly at V3 |
| Every event a candidate until a person accepts it; what was proposed kept beside what was decided | `review.ts`, `VideoScreen.tsx` | The same rule for a track's points and moves |
| Four kinds of statement (fact about the footage · observation with ± · interpretation · worked-out figure) | `docs/VIDEO-DESIGN.md` D2 | A position is an observation with its ± in metres; a move is worked out; *unnecessary* is a person's interpretation |
| Privacy: labels not names, no sound, no face recognition, frames to the assistant cropped and capped, deletion everywhere with what was found kept | `footage.ts`, `facts.videoGone`, D9 | The base for §9; tracking adds the consent card, blurring and a retention date |
| *Can this phone film a long study?* — five samples a second, clips, battery a minute, nothing kept | `phoneRun.ts`, `phoneCheck.ts`, `#/video-check` | The place to measure the detector on the phone that will film (§8) |

**Its measured accuracy** (`docs/VIDEO.md`, 18–19 October, synthetic footage only): on clean or noisy footage of
distinct work, precision 1.00 and recall 0.92–1.00, boundaries within 0.02–0.13 s, cycles within 0.01–0.04 s; weak
where a station is almost never idle (cycle error 1.34 s), under flickering light (precision 0.92, every event flagged)
and with a shaking camera (said unfit). From `docs/VIDEO-FEASIBILITY.md`: reading **live as it films** is as good as
afterwards (45 of 45 pieces, starts ±0.08 s) at 5.7 ms a sample; reading afterwards took 94 s for 120 s of footage on
the build server. **Not measured at all:** real footage, people walking between stations, occlusion. Tracking is
exactly those conditions, so nothing in that table transfers to it — tracking needs its own measured table (§10).

The spaghetti diagram today: up to **4 walkers × 12 places** (`walkers.ts` `WALKERS_MAX`, `STEPS_MAX`), a move's
metres typed, or the straight line between two positioned places, said to be straight; a measured metres wins
(`legsOfWalker` `source: 'walked' | 'straight' | 'none'`); the board's scale by two taps and a length
(`board.ts` `metresPerUnit`); the pace a stated choice or **timed** (`spaghetti.ts` `PaceKind 'timed'`); the shift and
its money from the calculator. Everything §6 produces lands in those boxes.

## 3. Where the person-finding runs — on the device, recommended

The reading needs, for each sampled frame, **where each person's feet are on the floor**. Not a pose, not a face —
a point. Options that run in the browser with no new paid service:

| Option | Library (npm, read 8 Nov) | Model | Size *(to confirm)* | Gives | Published speed *(to confirm)* | Licence |
|---|---|---|---|---|---|---|
| **A. MediaPipe Object Detector** | `@mediapipe/tasks-vision` — latest 1.2.2 (3 Nov); pin **1.1.1** (14 Oct, over two weeks old) | EfficientDet-Lite0, COCO, class *person*, 320 px input | ~4–5 MB int8, ~13 MB float | A box a person; any number of people | Tens of ms a frame on a Pixel-class phone, CPU or GPU delegate | Apache-2.0 (library and model) |
| B. MediaPipe Pose Landmarker | same package | pose_landmarker lite · full · heavy | ~5.5 · ~9 · ~29 MB | 33 points a person incl. ankles; `numPoses` for several | lite runs near real time on a recent phone | Apache-2.0 |
| C. TensorFlow.js MoveNet | `@tensorflow-models/pose-detection` 2.1.3 (2023), `@tensorflow/tfjs-core` and `-backend-webgl`/`-webgpu` 4.22.0 (Jan 2025) | SinglePose Lightning / Thunder; MultiPose Lightning (up to 6) | Lightning ~5 MB, Thunder ~12 MB, MultiPose ~10 MB | 17 points a person incl. ankles | TF.js's 2021 table: Lightning about 51 fps on an iPhone 12 and 34 on a Pixel 5, Thunder about 43 and 12 (WebGL) | Apache-2.0 |
| D. ONNX Runtime Web + an exported detector | `onnxruntime-web` 1.31.1 (26 Oct); pin 1.30.0 | RTMDet-tiny / RTMPose (OpenMMLab) | ~5–20 MB | Box or points | WebGPU where the phone has it; WASM otherwise | MIT runtime; OpenMMLab models Apache-2.0 |
| — not used | Ultralytics YOLOv8/11 | — | — | — | Fast and good | **AGPL-3.0** — would oblige the app's source to be offered to every user; excluded unless a commercial licence is bought |

What each needs to load: the library's WASM files (a few MB, served from our own origin, not a CDN at run time — the
site works offline on the floor) and the model file, fetched once and kept in the PWA cache. MediaPipe's tasks run on
WASM with an optional GPU delegate; TF.js on WebGL, or WebGPU where present (Chrome on Android has it; Safari on iOS
from 26, *to confirm*); ONNX Runtime Web on WASM or WebGPU. All four are a dynamic import, loaded only when a tracking study is
opened, so the rest of the app pays nothing.

**Recommendation: A — the MediaPipe Object Detector for a person's box, the foot point the middle of the box's bottom
edge, and our own tracker (§5).** Why: the floor position is all a spaghetti diagram needs; a box is the most robust
thing a detector gives when a person is half hidden or bent over a bench; it finds any number of people in one pass;
the package is Google-maintained, Apache-2.0 end to end, and current. **Pose (B or C) is the second step**, kept behind
the same interface, for one case only: when the ankles are visible, they place the foot better than a box's edge on a
person carrying a case. No face landmarks are ever kept (B's nose and eyes are dropped as they are read).

**A server instead?** It would read faster and the same on every phone — a small GPU worker (VIDEO.md V7) reading a
20-minute clip in a few GPU minutes, pennies a clip. Against it: the footage would leave the device — some 80–150 MB
for 20 minutes at 0.5–1 Mbps, over the cloud's 50 MB file limit; a new processor of personal data (a data processing
agreement, a DPIA that now covers a transfer, possibly outside the UK); a service to deploy, secure and pay for, which
the static Vercel site and one edge function cannot hold; and the floor's signal. **On the device the video never
leaves the phone, costs nothing a clip and works offline.** The interface (`Detector.detect(frame) → boxes`) is the
same either way, so a server can be added later behind it without touching the tracker, the calibration or the record.

## 4. The floor calibrated — a homography from four marked points

**The maths.** The floor is a plane, so a pixel (u, v) and a floor point (X, Y) in metres are related by one 3 × 3
matrix H, up to scale: s·[X, Y, 1]ᵀ = H·[u, v, 1]ᵀ. H has eight unknowns; each pair of points gives two equations
(X·(h₃₁u + h₃₂v + h₃₃) = h₁₁u + h₁₂v + h₁₃, and the same for Y), so four floor points whose metres are known, no three
in a line, fix it (the direct linear transform: stack the eight rows, take the null vector by SVD, after normalising
both point sets — Hartley's conditioning). With more than four it is a least-squares fit and its residual is a check
on the tape. On the floor: four marks taped as a rectangle of known size (4 × 3 m), or four things whose distances are
measured (two columns, two corners of a guard); the person taps them on a still frame and types the metres — the same
gesture as the board's scale (two taps and a length), with two more points.

**The error grows towards the far side**, because a pixel covers more floor the further away it is. Worked on a camera
3 m up, tipped 30° down, 70° across, 1280 × 720 (worked in plain Python for this document; V1's independent cases reproduce it): a pixel is
about **5 mm** of floor at 2.5 m, **11 mm** at 4.7 m, **21 mm** at 7 m along the view (4–8 mm across it). With the four
taps each ±2 px, the tape ±2 cm and the foot point ±3 px, a 4 × 3 m rectangle taped 4–7 m away places a person, at 95%:

| Where | Inside the taped rectangle (4.5 m) | Its far edge (7 m) | Beyond it (10 m) | Far beyond (14 m) | 10 m away, 3 m to the side |
|---|---|---|---|---|---|
| ± (95%) | **0.09 m** | 0.15 m | 0.31 m | 0.81 m | 0.42 m |
| Same, rectangle 6 × 8 m (4–12 m) | 0.09 m | 0.14 m | 0.24 m | 0.46 m | 0.28 m |

So: **calibrate over the area walked**, never extrapolate far beyond it, and say where it is extrapolating. The
foot-point error in practice is larger than 3 px (a box's bottom edge is not a heel), so V2 measures it and the table is
redone with what was measured.

**How the uncertainty is said.** On the frame, a light grid of the floor in metres drawn back through H (the person sees
at once whether it lies flat on the floor), and a ± map by Monte Carlo — H re-solved a few hundred times with the taps,
the tape and the foot point perturbed by their ±, the spread at each point of a coarse grid — drawn as three bands:
*within 0.2 m*, *0.2–0.5 m*, *over 0.5 m — distances here are rough*. Every distance carries its ± in words ("41 m, ±2 m
— the far end is outside the taped area"). The calibration is kept with the camera's steadiness: after a stretch the
steady check calls *moved* (`steady.ts`), the homography is void from that moment and the page asks for it to be set
again on a frame after the move; points after it are not turned into metres until it is.

**Lens.** Phone main cameras are corrected well enough for this; a wide or ultra-wide lens bends straight lines and
the homography fails at the edges. The filming advice says the main lens; V1 tests a straight taped line drawn back as
straight, and refuses the calibration in words when the residual says the lens is bent.

**Zones mapped to the spaghetti's places.** A zone is drawn on the frame as a polygon (four or more taps) and named
— *film store*, *line*, *case store* — then carried to the floor through H. On the floor it is the spaghetti's
**place**: its name is the walkers' place name, its centre (or a pin the person sets — "the point you would walk to")
is the place's metres east and north, exactly what `board.ts` `eastNorth` writes. Better still, the calibrated floor can
**be** the board: a top-down picture of the floor made from the footage's **median background** (the median of many
frames removes everyone who moves, so the picture holds the layout and no people), warped through H to metres, laid
under the spaghetti board — the "photo under the board" FC-004 part 3 left out, given a true scale for free. Zones
drawn on that board and on the frame are the same zones.

## 5. Tracking, several people, occlusion — and saying when it is unsure

**The tracker is ours, small and pure** (`src/tools/video/track.ts`, tested like `detect.ts`): a constant-velocity
Kalman filter a person on the floor in metres (not pixels — so near and far move alike), detections associated each
frame by the Hungarian method on distance in metres, high-confidence boxes first and low-confidence ones second
(ByteTrack's idea, MIT, reimplemented — a few hundred lines), a track born after three hits and kept through up to
**3 s** of misses on its predicted path, then ended. No appearance model and no re-identification across studies: who
a track is never leaves the study, and a track is a temporary label — *Person A* — never a name (`VideoZone.track`'s
rule). Afterwards a smoother (Rauch–Tung–Striebel) gives the positions used for distance.

**What goes wrong, and how it is shown:**

| Failure | Cause | Shown as | The person's correction |
|---|---|---|---|
| **Feet hidden** | Behind a conveyor, a pallet or a guard — the box's bottom is a hip, so the floor point is metres too far | A detection whose bottom edge sits on a drawn **occluder** (the person paints machines once, like a zone), or whose box is far shorter than a standing person at that spot → *feet hidden*; no floor point made, the path drawn dashed through it | None needed; a gap is not walked metres |
| **A gap** | Missed for a moment (turned, bent, dark) | The predicted path dotted; under 3 s joined, over it a new track | *Join* two tracks |
| **ID swap** | Two people crossing or passing behind one machine | Every crossing within 1 m, and every gap that two tracks end and begin in, flagged **check who is who** on the timeline | *Swap from here* — the two tracks exchanged from the playhead on |
| **A ghost** | A coat on a hook, a reflection, a poster | A track that never moves (> 90% of its time within 0.3 m) or lives under 2 s → listed apart, not counted | *Not a person* |
| **One missed person** | Never detected | Nothing to show — said in the footage check: *people seen in the scan: 3; tracked: 2* | *Add a person* by tapping their feet on a few frames; interpolated between taps |
| **Moved camera** | Knocked | The steady check's *moved* (§4) | Calibrate again from the move |

Each point keeps its **confidence** (the detector's score, the tracker's covariance in metres, the calibration band)
and the track's own word: *followed*, *predicted*, *feet hidden*, *check who is who*, *corrected by a person*. Figures
are worked out from followed and corrected stretches only; the share predicted is said beside every figure ("Person A
followed for 94% of 18 min; 6% predicted across gaps"). A track is a **candidate** until a person accepts it, as an
event is; accepting a track accepts its moves, not its every point.

## 6. From track to spaghetti — code, never the AI

1. **Moves between places.** A track's place at each moment is the zone its foot point is in, with hysteresis: in after
   **1 s** inside, out after 1 s outside (no flicker on a zone's edge). Between zones it is *walking*. Each change of
   place is a **move**, with its start, end, and from → to. A pass through a zone shorter than the hysteresis is not a
   visit. Moves inside one zone are not moves (standing still is not a move — `cleanWalker`'s rule).
2. **Metres, two ways, said apart.** (a) **Place to place** — the straight line between the two places' points, as the
   board gives it today and marked *straight*; (b) **as walked** — the length of the smoothed path between leaving one
   place and reaching the next, marked *walked from the footage* with its ±. Why both and why smoothed: summing a raw
   track's steps adds its noise — a person standing still with 5 cm of jitter read 5 times a second "walks" about
   **27 m a minute** (300 steps × 1.77 × 0.05 m). So path length is only ever taken from the smoothed track, only
   between places, and checked against the straight line (as walked can never be shorter; much longer is said:
   *around the machine, or noise — look*). A measured metres typed by a person still wins, as now.
3. **Into the spaghetti record.** The walkers' boxes are filled the way `boardInputs` fills them — each walker a
   track's label, each place by name, each move's metres — so `walkersFigures`, `walkersShift` and their money do every
   sum, and the paper is the spaghetti's own paper. **Many rounds, one record:** a 20-minute track holds many rounds,
   and a walker holds twelve places. So the reading finds the **repeated journeys** — the from → to pairs counted over the
   clip, and the round that repeats (the most frequent closed sequence that starts and ends at the line) — and offers it
   as the walker's round, with *rounds seen: 7 in 18 min* to fill *rounds a shift* (scaled to the shift, said so). A
   person chooses the round or picks a stretch of the timeline by hand. Holding *every* move of a long clip, a from–to
   chart, is a change to the calculator's scope (FC-212 / FC-004 part 4) — a decision, not built here.
4. **Repeated and unnecessary movement.** The reading counts and ranks (the routes walked most, back-tracking — A → B → A
   with nothing done at B for under 5 s, a place visited with no dwell); **whether a move was necessary is a person's
   call**, a tick on the move (*needed · could be removed · not sure*), never the reading's and never a model's — the
   same as VA · NE · NV on the value stream. The share *could be removed* and its metres go to the money the
   calculator already says.

## 7. Time and motion from the same track

- **Dwell a zone**: each visit's start and end and its minutes; a zone's share of the person's time; walking time and
  pace between places (metres ÷ seconds). All **observed**, never rated (FC-021: pace is a person's judgement; footage
  cannot show it).
- **Into the line balance** (`tools/linework`): a person's dwell at their station, a walk to the film store and back,
  offered as **observed element times** with their ± and how many visits they rest on, as the video study already offers
  its station cycles (`balanceLink` `studyBalance`) — the rating asked where the timing ends, the allowance the site's.
- **Into the spaghetti's pace:** the walking speed measured on the track fills `PaceKind 'timed'` — the minutes a
  shift then rest on the people's own pace, said *timed from the footage*.
- **Into work sampling** (`tools/sampling`): the track can supply **where** each person was at random moments, as
  candidate observations; **what they were doing** is still tapped by a person (a zone is not an activity). Offered,
  never filled.
- **Not claimed:** waiting (no movement is not waiting — D2), effort, ergonomics, elements inside a cycle (that is
  `docs/VIDEO.md` V5 and a close-up camera, not this one).

## 8. Processing — on the phone, live or in chunks

Two modes, the same reading:

- **Live as it films** (preferred, as the long study proved for motion): the detector on each sampled camera frame, at
  **5 a second** — a person at 1.3 m/s moves 26 cm between samples, well inside what the tracker follows; no decoding,
  and the footage can be cut to clips. Needs the detector under about 150 ms a frame on the phone, with headroom.
- **Afterwards, in chunks** of 30 s, resumable (`runner.ts`'s pattern, one job per study under `navigator.locks`), the
  signal kept as it goes. The current reader seeks each frame (about 90 ms a frame on the build server — 29 s for 320
  frames); `requestVideoFrameCallback` playback at reduced rate replaces seeking for this reading.

**A 20-minute clip, estimated:** 6,000 frames at 5 a second (over the motion reading's 2,400 limit in `validate.ts`,
which the tracking reading sets for itself). At 40–80 ms a frame for detection *(to confirm on the phone)* plus 20–90 ms
to get the frame: **some 6–17 minutes afterwards**, or nothing extra if read live. The tracker and smoother are
milliseconds for the whole clip. **Battery: unknown** — continuous GPU or WASM inference on a mid-range phone is
estimated at a tenth to a fifth of the battery for 20 minutes, which is exactly the figure not to trust from a desk.
**The measured plan:** add a *Track people* probe to *Can this phone film a long study?* (`phoneRun.ts`): the model
loaded (its download size and time), its cost a frame at 320 px with each delegate, frames dropped at 5 a second, the
phone's heat (the browser does not give temperature — frames dropped over time stands in), the battery a minute
(already logged), for 2 and 20 minutes on a mid-range Android (a Samsung Galaxy A-series) and an iPhone (11 or later).
The thresholds of §5 and the 5-a-second choice are set from those results and written here with their date.

## 9. Privacy, consent and retention

Footage of people at work is personal data under UK GDPR and the Data Protection Act 2018; a track derived from it is
personal data while anyone can tell who it was. The ICO's guidance on monitoring workers (October 2023) applies.

- **Who is responsible.** The factory is the controller of its workers' data; Rowland, filming as its consultant, is
  most likely its processor (or a joint controller if he decides what is filmed and why). *For Rowland to decide with
  each client* — the study names the client and who agreed it.
- **Lawful basis: legitimate interests** (Art. 6(1)(f)) — improving the work — with a short legitimate interests
  assessment kept by the site. **Not consent as the basis**: in employment consent is rarely freely given (the ICO says
  so). The **consent card** is still shown — as notice and agreement, honoured: before tracking starts, a card the
  people filmed are shown or read (what is filmed, why, that nobody is identified, what is kept and for how long, who
  to ask, that they can say no). A person who says no is not filmed: the area is filmed when they are not in it, or
  they are masked (painted out as a zone never read). The study records *notice given · by whom · when · how many
  told · anyone who declined* — never their names.
- **A DPIA** — systematic monitoring of workers with video analytics is the ICO's example of high-risk processing. A
  one-page DPIA template ships with V2 (`knowledge/` — what is processed, the necessity, the risks, these measures);
  the site completes it before the first tracked study.
- **No identification, ever.** No faces analysed or stored; no face, gait or appearance recognition; no
  re-identification across studies; tracks are *Person A*, reset each study. Not being used to identify, the data is
  not biometric special-category data (Art. 9) — and must stay so: the detector's output is a box, pose points below the
  shoulders only, and nothing else is kept. The model never names anyone and the conversational model never sees the
  frames for tracking (§11).
- **Blurring.** The review draws a blur over the top fifth of every person's box as it plays; every still and clip that
  leaves the device (the paper, the cloud, the assistant) is made blurred; the floor picture is the median background,
  which holds no people.
- **On the device, then deleted.** Footage stays on the phone that filmed it by default (not synced for a tracking
  study unless the person chooses to). When the study is reported — or at its retention date, whichever is first — the
  footage is deleted on the device and everywhere (`footage.ts`'s deletion, `facts.videoGone`), and **the track, the
  moves, the figures and the report are kept**. Retention is said on the study and on its paper ("footage deleted on
  15 Nov; tracks kept with the study"). *Proposed:* footage at most **30 days**, the track **with the study** (some
  0.4 MB for three people for 20 minutes at 5 a second; or at 1 a second once accepted).
- **Not used about a person.** The study's purpose is the layout and the work, not an individual's performance; the
  reports say walkers by label and in aggregate, and the notice says it will not be used for discipline. *For Rowland
  and each site to agree.*
- **Unions and worker representatives.** Where a union is recognised, or there is an information and consultation
  body, it is told before filming starts and sees the notice and the DPIA; some agreements require it. A site outside
  the UK (a works council in Germany, for one) may need its agreement first — asked per site.
- **Hygiene and safety** as the video study's advice already says: the phone outside the product zone, in a cleanable
  case, the tripod off walkways and clear of trucks.

## 10. Proving accuracy

Nothing is claimed until measured; the measured table goes in this file with its date and reading version, as
`docs/VIDEO.md` does.

1. **Synthetic, for the parts after detection** (`scripts/vision-eval.mjs`, on `video-eval.mjs`'s pattern, not
   pass/fail): walkers on known floor paths in metres (from S3's packing line — film store, line, case store, scale),
   projected through a known camera, detections made from the truth with chosen noise, misses, ghosts, occluders and
   crossings. Scored: position error in metres (median, 95th, by distance band); **ID switches and IDF1**; zone entry
   and exit time error; the move sequence against the truth (edit distance); metres place to place and as walked, each
   against the truth; repeated journeys counted. A detector cannot be fooled by drawn figures, so this scores the
   calibration, the tracker and the moves — exactly the code that is ours.
2. **Real, for the detector and all of it.** A taped floor (a 1 m grid on a section), colleagues who agreed walking
   scripted routes between taped places with a known sequence, filmed from 2.5–4 m at three angles, with a person
   crossing, one bending behind a bench, one behind a pallet. The truth: the scripted sequence and the taped metres, and
   two people marking each person's feet frame by frame on a sample (their agreement written down as the limit). Then a
   permissioned clip from a site, timed by hand by the `docs/VIDEO.md` protocol (tuning and held-out sets, scored once
   per reading version).
3. **What a figure lets the app say:** distances said as measured only where the held-out clips show the walked metres
   within 10% (or 2 m) and the move sequence exact in 95% of rounds; otherwise *rough — check on the footage*. Public
   tracking datasets (MOT17 and the like) are non-commercial licences — usable to sanity-check internally only, never
   shipped or quoted as our accuracy.

**The review screen.** The footage plays with each track drawn over it in its walker's own style (graphite, teal,
dashed, dotted — `WALKER_STYLES`, never a state colour), the zones outlined and named, the ± bands faint on the floor.
Under it a lane a person on the timeline: followed solid, predicted dotted, feet hidden hatched, every *check who is
who* a mark to tap. Beside it the rectified floor with the same paths, and the moves listed (from → to, when, metres
straight and walked). The actions: *Accept the track*, *Swap from here*, *Join*, *Split here*, *Not a person*, *Add a
person*, drag a point, *This move could be removed*. What the reading proposed is kept beside what was decided, as on
every event. Accept every track still to review, as the video study offers.

## 11. AI Mode's part

The vision is **code, not the conversational model**: no frames go to Claude for tracking, distances or counts.
AI Mode (`docs/AI-MODE.md`) reaches it only through capabilities, like everything else:

- **`start_video_study`** (write, confirmed): a video study on a line with the objective *Walking and movement*,
  opening its filming plan and the consent card on the phone — the person sets the tripod and films.
- **`video_study_state`** (read): how far a reading has got, what is left to review, what the footage check said.
- **`spaghetti_from_video`** (write, confirmed): from a study whose tracks a person has **accepted**, fill a spaghetti
  diagram's walkers through the same function the review's button calls — refused in words while any track is still a
  candidate or the calibration is void. The colleague then reads the calculator's own sentence back.

So "observe this operator and produce a spaghetti diagram" becomes: the colleague starts the study, the person films and
reviews, the colleague makes the diagram from what was accepted — and every metre is the homography's and every sum the
calculator's.

## 12. The slices (each live on its own; V-numbers here are this document's, distinct from `docs/VIDEO.md`'s staged path)

| Slice | What ships | Proved by |
|---|---|---|
| **V1 — The floor calibrated and zones** | On a video study: four floor points tapped and their metres typed (more allowed, least squares), the metric grid drawn back, the ± bands by Monte Carlo; void after a *moved* stretch; zones and occluders drawn as polygons and named; the median-background floor picture under the spaghetti board, to scale. No tracking yet | Independent cases (plain Python, `scripts/knowledge/cases-vision.py`: H from known points, the table in §4); `calibrate.test.ts`; an acceptance on a frame drawn through a known camera; the paper's floor picture read back |
| **V2 — One person tracked, on the device** | The consent card and notice record before tracking; the detector loaded on demand (pinned, cached, offline); one person's track, smoothed, over the frame and on the floor; the review (accept, split, join, drag, not a person); blur in review; footage retention and deletion with the track kept; the *Track people* probe on the phone check | `track.test.ts` on synthetic detections; `vision-eval.mjs` synthetic; the probe run on a mid-range Android and an iPhone (written here); a taped-floor clip scored by hand |
| **V3 — From track to spaghetti** | Moves between zones with hysteresis; metres straight and as walked, said apart; repeated journeys and the round offered; the walkers' boxes filled and the calculator's sentence, money and paper; *could be removed* ticks; the *Walking and movement* objective moves to partly | An acceptance like `spaghetti-board.mjs` from a track that reproduces S3 (278 m, Operator 1 130 m, the line 5 times, £14.85 a shift); `walkers.test.ts` unchanged |
| **V4 — Several people** | Up to four tracks; crossings and shared gaps flagged *check who is who*; *Swap from here*; ghosts apart; a declined person masked | `vision-eval.mjs` IDF1 and switches on crossings and occluders; a real clip with three people |
| **V5 — Time and motion, and live** | Dwell a zone, walking time and pace; the timed pace into the spaghetti; observed element times offered to the line balance (rating asked); candidate moments for work sampling; tracking live as it films | Acceptances on the line balance and the spaghetti from a reviewed track; the live mode on the phone check for 20 minutes |

Each slice through the `faultline-tool` skill (a specification from `knowledge/specs/TEMPLATE.md` before code),
`knowledge/STANDARD.md`'s bar, the fast gate, and Rowland's go.

## 13. What Rowland must decide

1. **Go at all, and when** — nothing is built until he says (`CLAUDE.md`, "Nothing new is built until Rowland says go").
2. **On the device or a server** — recommended: on the device (§3); a server only if the phone probe shows the phones
   cannot keep up.
3. **The consent card's wording and the notice** — a draft ships with V2 for him (and each site's HR) to change; and
   whether his role is processor or joint controller, client by client.
4. **Retention** — footage at most 30 days and deleted when the study is reported (proposed); the track kept with the
   study; or shorter.
5. **Whether footage of a tracking study ever leaves the phone** — off by default (proposed).
6. **Many rounds** — whether the spaghetti diagram grows to hold every move of a long clip (a from–to chart, FC-212 /
   FC-004 part 4), or a walker stays one round chosen from the clip (proposed for V3).
7. **The not-for-performance promise** — that tracks are never used about an individual, written on the notice.
8. **A real test day** — a taped floor and colleagues who agree, for the detector's accuracy (§10.2).
