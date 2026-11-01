# FC-021 — Video time study: the work read from footage: the specification

**Catalogue:** FC-021 (its mode FC-233 micro-motion study stays not built) · **Knowledge:** `ie.video-time-study` (full, practice), with
`ie.time-study`, `ie.allowances`, `ie.line-balancing`; designs `docs/VIDEO.md`, `docs/VIDEO-DESIGN.md`, `docs/VIDEO-FEASIBILITY.md` · **Asked for:**
Rowland, 18 October 2026 — *"upload a production video, describe the analysis they want in natural language, and receive a structured,
reviewable manufacturing study with measurements, findings, calculations and a professional report"*; finished to the standard on 1 November
(*"I want all tools made that get used in the projects"*) · **Status:** built; the specification written 1 November against what was built, with the
pace and the allowance added the same day.

## 1. Purpose
Timing by stopwatch misses cycles and nobody can check it afterwards. A phone film is read on the device, every piece of work found is
a *candidate* a person reviews on the footage itself, and the accepted boundaries become element times with their ±, the line balance against
takt, and — once a person has rated the pace and the site has agreed an allowance — the basic and the standard time. The sentence it lets one side
say to the other: **"From 14 cycles of footage the bagger’s work is 41.2 ± 0.4 s; against a 40 s takt it is over by 1.2 s and sets the pace —
anyone can replay the cycles."**

**Scope.** Covers: the footage’s fitness before and after reading (`assess`), the movement reading in zones (`detect`, `runner`), the review (accept,
reject, move a boundary, split, merge, add by hand), the cycle and work figures per station with their ± and the cycles still needed, the line
balance and takt, **the reviewer’s pace rating per station and the site’s allowance giving a basic and a standard time and a planned rate an hour,
and the allowance in money**, the report, the footage kept or deleted with what was found kept, the camera’s optional *Name the work from the frames*
(off until ticked, through the `assist` gateway only, never a figure). Does **not** cover: **changeovers** (not measured from footage — the fit check
says so and sends the person to SMED, FC-036); **micro-motion / therbligs** (FC-233, not built); a rating *suggested* by the app (a person
judges pace — the app never rates); a standard for a station with fewer than five whole cycles (said, not refused); the money of the pace-setter over
takt (that is the line balance’s, `lib/…balanceLink`).

## 2. Users and scenarios
The industrial engineer at a desk reviewing; the line lead filming on a phone; the OEM and site reading the same replayable evidence. (1) *A packing
hall:* two minutes of a side-on, raised film of three stations; ten cycles accepted; the pace-setter named. (2) *A disputed standard:* both sides
re-read the same film and rate the pace themselves. (3) *A new line’s first cycles* kept for the OEM discussion.

## 3. Method selection
Work measurement from film (Freivalds & Niebel; Barnes). **Alternatives:** a standard with rating on the spot → `ie.time-study` (Line balance);
long-period shares → work sampling; motion level → micro-motion (FC-233); whether the phone can film it at all → the feasibility check.
**Unsuitable when** the footage is not fit (shake, light, station out of view, too few cycles — said by `assess`) or the work is not visible
(a changeover; waiting that cannot be told from checking).

**Established · assumed · chosen.**
- *Established:* time-study arithmetic — mean, Student’s t interval at n − 1, cycles needed n′ = (t·s/(0.05·x̄))² (the line balance’s `cyclesNeeded`, minimum five);
  basic time = observed × rating ÷ 100 on the BS 3138 scale, standard time = basic × (1 + allowance) (Niebel; ILO) — the line balance’s own definitions.
- *Assumed:* movement in a station’s box is work (the person reviews every event); a gap with no movement is **not** called waiting; footage cannot
  rate pace, so a station never rated is **taken at 100 and said so**, never silently; waiting is time observed — never rated, never given an allowance.
- *Chosen (Faultline’s):* a person’s rating per station (one number, 100 = standard pace); the allowance typed by the site as named parts (the ILO’s
  structure, **no figure supplied**); the standard is shown beside the balance, which stays the observed work; ±5% at 95% for cycles needed (as the line balance).
- *Measured, not claimed:* the reading’s accuracy against footage with known times — `scripts/video-eval.mjs`, `docs/VIDEO.md`.
- *Money (`knowledge/MONEY.md` §4 FC-021, as FC-019):* the allowance is rest the job needs, not waste — its seconds in a piece × the line’s hourly rate
  (Line capacity’s, else the line’s wage × on-costs): a pack and an hour at takt; the missing rate is named, nothing waits.

## 4. Inputs
The footage (MP4, MOV, WebM ≤ 20 minutes), the question, the stations (label, who, where each ends), the takt (how many in how many minutes), the
pace per station (optional, a number > 0), the allowance parts (optional, named, a percentage each, the sum under 100). Read from the line: the hourly rate.

## 5. Data suitability
Five whole cycles to say how much a station varies, the cycles needed for ±5% said per station; footage fit checked check by check; events inside
shaking or a light jump are flagged and their ± widened; a cycle half again as long as usual is flagged as perhaps missed.

## 6. Calculations
Per station: whole cycles’ lengths → mean x̄, sd s, 95% half-interval t·s/√n; cycle = start to start; waits = gaps; ± on a length from its two ends.
**Standard:** `basic = x̄ × rating ÷ 100`; `standard = basic × (1 + a)`, `a` = Σ parts ÷ 100; planned an hour `= ⌊3600 ÷ standard⌋`; allowance seconds in a
piece `= Σ standard × a ÷ (1 + a)` over the timed stations; money a pack `= seconds × rate ÷ 3600`.

**Independent worked cases.** (1) The record’s: eight cycles read against truth, mean error +0.14 s, 27 cycles needed for ±0.5 s at s = 1.32 s —
`video.test.ts` and `scripts/video-eval.mjs`. (2) *Hand-worked standard* (`standard.test.ts`; the acceptance script on the seeded study): Station 1’s
whole cycles are 4.0 s; rated 110 → basic 4.4 s; allowance personal needs 5 + basic fatigue 4 + standing 2 = 11% → standard 4.884 s → 737 an hour;
Station 2 (6.0 s) never rated → basic 6.0 s, standard 6.66 s, and the allowance is 11 ÷ 111 of the two standards (1.14 s of every piece). On the
acceptance study (4.1 s cycles): basic 4.51 s, standard 5.0061 s, 719 an hour.

**Sentences** (the module’s; screen, paper and the script read these): *Pace is not rated: footage cannot show how hard someone is working, so these
are observed times, not a standard. Give each station the pace you judge on the film (100 is the standard pace, BS 3138) to work out the basic and the
standard time.* · *Workstation 1: pace rated 110 by the reviewer — basic 4.5 s (observed 4.1 s × 110 ÷ 100), standard 5.0 s with 11% allowance, about 719
an hour planned.* · *Not rated yet, so taken at 100: Workstation 2, Workstation 3.* · the allowance in its parts (the line balance’s words) · *The allowance is
x s of every piece — £y of labour a pack, £z an hour at takt. It is rest the job needs, not waste.*

## 7. Outputs
**On screen** (`tools/video/VideoScreen`): the fit check, the review timeline, the station table with its ± and cycles needed, the workload, the stacks against
takt, *Pace and allowance* beside *Takt*, *What it says* with every line labelled Measured · Worked out · Proposed — not measured · Not known yet.
**The report.** The video study report (`reportPdf`) reads the same module: the band and tiles, the fit check, how it was read, each station, the stacks,
*What it says* (so the pace, the standard and the allowance’s money print as the screen says them), every event on the footage with its ± and how it was decided,
reports made, the footage deleted and by whom. Money is one output beside the seconds, never the verdict.

## 8. Manufacturing usability
Filmed on a phone and read on it; the review is a tap per event on the footage; the pace is one number per station; phone and desk, nothing off the side.

## 9. Failure handling
Footage not fit → said, with the phone’s place; no whole cycle → no figure and the reason; the footage deleted → the study keeps what was found and says it;
a client reads only (`can.edit` gates every control, including Pace and allowance); offline reads and writes the device and syncs.

## 10. Integration
The study is a `balance` study with `facts.video` (a JSON bag: the pace and the allowance sit in it — no migration) and `facts.vevents`; it feeds the line
balance, takt and the line’s Tools; on a project it is the project’s; the paper is the study’s only. `docs/PAGES.md`.

## 11. Verification
Unit: `src/tools/video/__tests__` — `video.test.ts` (detection, review, figures by hand), `assess.test.ts`, `footage.test.ts`, `steady.test.ts`,
`kinds.test.ts`, `gateway.test.ts`, `phoneCheck.test.ts`, `standard.test.ts` (the pace, the allowance, the money by hand). Acceptance: `video-study.mjs`,
`video-fit.mjs`, `video-check.mjs`, `video-standard.mjs`; accuracy: `scripts/video-eval.mjs`.

**Acceptance criteria.**
1. The footage is checked from its facts and, once read, every frame; the fit verdicts are the module’s — `assess.test.ts`; `video-fit.mjs`.
2. Footage with known times is read and the reading is measured against the truth; an event’s ends carry their ±; shaking widens it — `video.test.ts`;
   `video-study.mjs`; `scripts/video-eval.mjs`.
3. A person reviews on the footage (accept, reject, move, split, merge, add), keeping what was proposed — `video.test.ts`; `video-study.mjs`.
4. Station figures (work, ±, cycles, cycles needed, waits, utilisation) equal the hand-worked cases — `video.test.ts`.
5. The line balance and takt are the line balance’s own, from the accepted events, and unchanged by the pace and the allowance — `video.test.ts`,
   `standard.test.ts`; `video-study.mjs`.
6. A station not rated is taken at 100 and the study says so; a rated station’s basic, standard and planned an hour, and the allowance in its parts and in
   money (or the missing rate named), equal the hand-worked case 737 an hour / 719 an hour — `standard.test.ts`; `video-standard.mjs`.
7. The report is downloaded and read back: the figures, *What it says* with the pace, the standard and the allowance — `video-study.mjs`; `video-standard.mjs`.
8. The footage is deleted with what was found kept; it plays on another device — `video-study.mjs`; `sync-two-devices.mjs` (scenario: footage).
9. The phone: nothing off the side; the camera’s AI is off until ticked and says what it sends — `video-study.mjs`; `video-standard.mjs`; `video-check.mjs`
   (what the phone can film).
Not yet proved: the full gate and paper parity (the lead runs them). Not in scope, said on the screen: changeovers from footage; FC-233.

## 12. Maintainability
`src/tools/video/` (record, study, assess, review, runner, reportPdf, VideoScreen). Left for later: FC-233 micro-motion; a changeover read from footage;
the money of the pace-setter over takt on the video report (the line balance says it); a suggested pace.
