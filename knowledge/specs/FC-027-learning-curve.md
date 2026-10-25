# FC-027 — the learning curve: how fast a new job is being learned (a question of the Analysis tool): the specification

**Catalogue:** FC-027 Learning curve — new starters and new products (a mode of
FC-105 the Analysis tool). **Knowledge:** `knowledge/methods/ie/learning-curve.md`
(full, peer-reviewed), `knowledge/MONEY.md` §4 (FC-027: causation **P** — the
extra time to reach standard × the wage). **Asked for:** the catalogue
(`knowledge/BUILD-SHAPES.md`: *"fit on times against cumulative units; a readings
question, not a calculator"*), 25 October (`docs/TOOLS-BUILD-BRIEF.md`).
**Status:** built 25 October on branch `build-time`.

## 1. Purpose
New starters and new products are planned at the standard from day one. This
says how fast the time is actually falling, when it will reach the standard, and
what to plan the first runs at: *"Each time the runs double, the time falls to
85.6% of itself; the 40 s standard arrives at about run 11 (between 10 and 12);
plan the first eleven runs at 48 s a pack on average, not 40."* So the team can
say to the sponsor what a seasonal crew's first fortnight will produce, and to the
line that a standard set on run 3 is a standard nobody will meet until run 11.

**Scope.** One more question in the Analysis tool (`kind: 'learn'`): the time each
run took, in the order made; the curve Tₙ = T₁·nᵇ fitted by ln T on ln n; the
learning rate 2ᵇ with its interval; the run at which a standard the person gives is
reached (with the interval the slope allows); what to plan the early runs at; the
extra time to the standard and, with the units a reading stands for and the line's
wage, its cost; the picture (runs, the curve, the standard); the paper. Left out,
each its entry: the cumulative-average form of Wright's curve (the record says which
form is fitted — the unit form is, so it reads straight from cycle times);
forgetting after a break (a break is a new curve — the page says so); a skills
matrix of who has reached standard (FC-222, staff data — the owner's decision); the
stopwatch time study's own laps as the readings (FC-019 — a step's laps are a
steady-state timing, not a learning series).

## 2. Users and scenarios
The industrial engineer or shift manager planning a seasonal intake, a new
product's first runs or a new line's operators in commissioning, at a desk after
the first week. Food first: agency staff on a hand-pack line (time per case by
run); a new pack format's first eight runs.

## 3. Method selection
Wright (1936): the time falls by a fixed share each time the count doubles; the
log-linear fit is the standard reading (Yelle 1979; Freivalds & Niebel). The
alternatives are the cumulative-average form (said, not built), Stanford–B and
plateau models (not claimed): the page says when the log-linear curve is the wrong
shape (the runs test on the residuals the line already carries) and that a plateau
above the standard says the method or the station limits it, not the person.

**Established · assumed · chosen.**

*Established:* Tₙ = T₁·nᵇ with b = log₂(rate) (Wright 1936; `ie.learning-curve`);
the fit by regression of ln T on ln n, the slope's t interval (Student's t at n − 2
degrees of freedom — `lib/ie/relate`, proved against SciPy), R², the runs test on the
residual signs; the run reaching a standard n* = ⌈(S ÷ T₁)^(1/b)⌉; the independent
case in `scripts/knowledge/cases-time.py` §8 and §8b (the record's eight runs 68, 58,
53, 49, 47, 45, 44, 43 with a 40 s standard: T = 67.69 × n^−0.22394, rate 85.622%,
R² 0.99759, interval 84.97% to 86.28%, the standard at run 11, between 10 and 12).

*Assumed*, said on the page: one person (or crew) on one job — pooling two is two
curves averaged into nonsense; a change of method or equipment starts a new curve;
the runs are in the order made; the curve measures time, not quality.

*Chosen* (the builder, 25 October — the owner asked not to be asked), each said on
the screen where it is read:
1. **A curve is fitted from five runs** (the record: five or six spanning a doubling
   or two); under eight it is said weak.
2. **The run reaching the standard** is the fitted curve's, rounded up; its interval
   allows for the slope's interval alone (T₁ is held), said in the words; the first run
   actually read at or under the standard is said beside it.
3. **A projection past three times the runs read is called a guess** (the record: "run
   1,000 from eight is a guess").
4. **A struck run keeps its place** (run numbers are cumulative counts) and counts for
   nothing.
5. **"Plan at"** is the average of the fitted times to the standard's run (or the runs
   read when no standard is given), the record's "plan at the average, not the standard".
6. **Money (P/L):** the fitted time above the standard, run by run to the standard's run,
   × the units each reading stands for × the wage ÷ 3,600 — only with the wage (the
   line's), the units and times in seconds or minutes; the missing one is named in a
   sentence of its own and nothing is withheld. No default is supplied.

## 4. Inputs
| Field | Unit / type | Required | Validation | Default |
|---|---|---|---|---|
| What is timed | text | yes | non-empty | — |
| Unit | s or min (other: no money) | no | — | s |
| The standard it is heading for | a time above 0 | no | > 0 | none: "give the standard" is said |
| Units each reading stands for | a number above 0 | no | > 0 | none: money names it |
| The times | one number a run, in order | from 5 | each > 0 (a nought is refused in words) | — |
| Confidence | 90 / 95 / 99% | no | — | 95% |

Read from the line: the wage and on-costs (`labourPerHour`, one person). Agreed before
measured (`can.agree`): what is asked, the standard, the units; the times are the work's.

## 5. Data suitability
Five runs minimum; under eight weak; a time of 0 or less refused; every run the same
refused ("nothing has been learned"); a time not falling said ("not shown to be falling",
amber) with the interval; the residual runs test says the curve is the wrong shape
(plateau, steps); a far projection a guess.

## 6. Calculations
y = ln T, x = ln n over the live runs (run numbers kept when one is struck); slope b,
intercept a, R² and the slope's interval from `relate`; T₁ = eᵃ; rate = 2ᵇ with the
interval 2^(b ± t·se); falling when the slope's upper bound is below 0; n* =
⌈(S ÷ T₁)^(1/b)⌉ and by the interval ⌈(S ÷ T₁)^(1/b_lo)⌉ to ⌈(S ÷ T₁)^(1/b_hi)⌉; the fitted
total/average of the first n* runs; extra = Σ max(0, T₁kᵇ − S) over k ≤ n*; pounds = extra ×
units × wage ÷ 3,600. Independent cases (`cases-time.py` §8, §8b → `learn.test.ts`): the
eight runs above; run 16 36.379 s and run 32 31.148 s; the first 11 average 48.030 s; extra
88.768 s a unit, 29.59 hours and £443.84 at 1,200 units and £15 an hour; an exact 80% curve
(100 × n^log₂0.8) gives 80.0000%.

## 7. Outputs
Screen: the five tiles (Runs · Learning rate with its interval · Explained · Standard reached ·
Plan the first runs at), the sentence ("8 runs: each time the runs double, the time falls to
85.6% of itself — we can be 95% confident the rate is between 85.0% and 86.3% … The 40.0 s
standard is reached at about run 11 (between run 10 and run 12 …)"), the lines beneath (plan,
projections, learning's cost or the input it needs, the curve's equation), what it does not say,
the checks, the picture (the runs as points, the fitted curve, the standard as a dashed line).

**The report.** The Analysis paper (`lib/studiesPdf` analysisBlocks) carries the same: the
tiles, the sentence and its lines, what it does not say, the picture drawn with its curve and
standard, the checks, every run in the order taken, and the line "Agreed: …". It reads the same
module as the screen; Greek and symbols go through `san`.

## 8. Manufacturing usability
The times are entered as the analysis tool enters readings: the pad and Enter at the line, or a
column pasted; one hand, phone first; the question is one of eight asked first.

## 9. Failure handling
Too few, a zero, all equal, not falling, a wrong-shaped curve, a far projection, the missing wage /
units / unit — each said in its own sentence; a client reads and changes nothing; a struck run is
restored in one tap.

## 10. Integration
The record is the Analysis study (`tool: 'analysis'`, `agreed.analysis.kind = 'learn'`, readings with
a value and no side); no migration (the study's JSON). Shows wherever an analysis shows: the
Analysis list's row ("how fast it is learned · 8 runs"), the line's and project's Tools lists, the
analysis's paper, the line report; Make it better raises a countermeasure from it as any analysis's.
Cost via `labourPerHour`.

## 11. Verification
Unit tests: `src/tools/analysis/__tests__/learn.test.ts` (the cases above, struck, too few, zero, equal,
not falling, far, the missing inputs, the words and tiles). Acceptance: `scripts/acceptance/learning-curve.mjs`.

**Acceptance criteria.** (script = `scripts/acceptance/learning-curve.mjs` unless a unit test is named)
1. The rate, T₁, R², the interval and the standard's run match the independent case (the record's eight
   runs) — unit test *the record's eight runs* and script step 2.
2. Fewer than five runs says too few; a nought is refused; all equal is refused; five to seven is weak —
   unit tests; script step 1 (too few on the page).
3. A struck run keeps its place — unit test *a struck run*; script step 4.
4. The page's sentence, tiles and closing line equal the module's — script step 2.
5. The picture has the runs, the curve and the standard — script step 3.
6. Money names the missing input, then says the pounds with the wage and the units — unit test and script
   step 5.
7. The paper, downloaded and read back, carries the sentence, the picture's standard, every run — script step 6.
8. Kept after a reload; a client changes nothing; the phone has nothing off the side — script steps 7–9.
9. The other analysis questions still pass — `scripts/acceptance/analysis.mjs` run, unchanged.

## 12. Maintainability
Code in `src/tools/analysis/learn.ts` (figures, sentences, tiles, plot) wired into `analysis.ts`, the
screen's question list and form, the paper's plot. Left for later: the cumulative-average form; forgetting
(FC-222's skills matrix would carry who is back at standard); a learning curve read from a step's laps across
timings on the Line balance.
