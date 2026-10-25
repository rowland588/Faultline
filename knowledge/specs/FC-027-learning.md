# FC-027 — How fast is a new job being learned: Wright's learning curve (W3c, builder F3)

**Catalogue:** FC-027 learning curve — new starters and new products (a part several tools share). **Knowledge:** `ie.learning-curve`. **Programme:**
`docs/TOOLS-BUILD.md` W7 (people, work and the body), built early because it needs only readings in order: one more question of the Analysis tool
(`knowledge/specs/FC-105-analysis.md`: `tool: 'analysis'`, `agreed.analysis`, readings in `facts.readings`). **Asked for:** Rowland, 25 October
(`docs/TOOLS-BUILD-BRIEF.md`): *"go through everything"*; the judgement calls are the builder's, written here. **Written 25 October 2026, builder F3**
(the arithmetic, `lib/ie/learn`, was proved against SciPy first).

## 1. Purpose
New starters and new products are planned at the full rate from day one. A new job's time falls by a steady share each time the number of runs doubles;
the curve puts a number on it, says when the standard will be met and what the first runs should be planned at. The sentence it lets one side say to the
other: *"The new starter is learning at 86% a doubling: the 40-second standard arrives at run 11 — plan the first eight runs at 51 seconds, not 40."*

**Scope.** One question, **How fast is a new job being learned**: the time of each run in the order timed (one reading a run), a standard the time is heading for
(optional), what a run is called (optional), the units of work in a run (optional, for money). It fits Wright's unit-time form by least squares on ln time against
ln run and says the learning rate with its interval and R², the run at which the standard is reached (or that it was met, or that the curve has flattened above it, or
that it is not falling), the average of the runs so far to plan at, two projections beyond the runs timed, and the labour of learning in money. **Not in this build:** the
cumulative-average form (Wright's original — the record names it; this fits the unit form that reads straight from cycle times, and says so); forgetting after a break;
reading a station's cycle times by run from the line balance or the video study (they are typed or pasted — there is no link from those tools' elements to a series
of runs); several people on one chart; the skills matrix and the training record (FC-222, FC-223); a plan of the first weeks' output in packs a week (the money is
the labour of the time over the standard).

## 2. Users and scenarios
The ops lead planning a launch or a seasonal crew, on a desk or a phone. (1) A new product's first eight runs on a hand-assembly line, 68 → 43 s a pack. (2) A new
starter on packing, a day a reading. (3) A curve that stopped falling at 46 s against a 40 s standard: not a person problem.

## 3. Method selection
The record: Tₙ = T₁·nᵇ, b = log₂(rate); least squares on the logs; n* = (S/T₁)^(1/b) rounded up; the average of the first N for the plan; a plateau means the method or station limits
it, not the person. Alternatives (the record's *When not to use it*): a machine's climb to rate is a commissioning ramp-up (stops and settings, not people learning); the standard itself is the
time study; who can do what is the skills matrix.

**Established · assumed · chosen.**
*Established* (peer-reviewed, with the independent case of §6): Wright (1936), the log-linear unit-time model; least squares and the slope's t interval (any regression text); the form as
Freivalds and Niebel give it. *Assumed* — one person or crew on one method and product (a change of method starts a new curve — said); the learning roughly log-linear (R² said and a poor fit
flagged); the readings independent enough. *Chosen by Faultline* (the builder, 25 October — the owner asked not to be asked): a curve is fitted from **6** runs (the record: five or six spanning a
doubling or two), called firm from about 8; a standard reached beyond **4 times** the runs timed is "a guess, not a forecast"; the curve is said to have **flattened** when, from 8 runs, the last four
runs fall by less than **a quarter** of the overall rate of fall (the slope of ln time on ln run) while still above the standard; R² below **0.7** is flagged. *Money*
(`knowledge/MONEY.md` FC-027, causation L): the time over the standard summed over the fitted runs 1…n*, times the units of work in a run, times the line's labour rate for one person — "Give the line a wage
to say the learning in money"; it needs the time in seconds or minutes and the units a run, and each missing one is named; nothing waits.

## 4. Inputs
*Agreed before measuring:* what is timed (a name) and its unit (s or min for money); the standard (optional, above 0); what a run is called (default *run*); the units of work in a run (optional, a whole number
of 1 or more); the confidence 90 · 95 · 99%. *Measured:* the time of each run in the order timed (the pad, or a pasted column); a struck reading is kept and left out. *Read from the line:* its labour rate (the line's
wage × on-costs), never asked again.

## 5. Data suitability
A curve from 6 runs; every time above 0; some spread. **Said, not refused:** R² under 0.7; fewer than 8 runs; a standard far beyond the runs timed; a curve that has flattened above the standard; a time that is not
falling. **Refused, in words:** under 6 runs (the count and what is needed), a standard of 0 or less, a run size that is not a whole number.

## 6. Calculations
Printed by SciPy (`scripts/knowledge/cases-w3c.py`, `learning`), each a unit test (`src/lib/ie/__tests__/learn.test.ts`). The record's eight runs, 68, 58, 53, 49, 47, 45, 44, 43 s: Tₙ = 67.6864 · n^−0.22394 (SE of b 0.004495); learning rate 85.62% (95%: 84.97% to 86.28%);
R² 0.99759; run 11 at 39.56 s, run 16 at 36.38 s, run 32 at 31.15 s; the 40 s standard at n* = 10.47, run 11; the first eight average 50.875 s; the time over 40 s summed to run 11, 88.77 s a unit. A curve that flattens (68, 58, 53, 49, 47 then seven runs at 46): b −0.15525, R² 0.88595, the last four runs' slope 0.
Rounding: rates to a tenth of a percent, times to the readings' places plus one, money by `gbpWord`.

## 7. Outputs
The page is W3a's lean page: the band, five tiles (runs · learning rate · when the standard arrives · plan at · in money), the sentence, the picture, the entry, the checks, the readings, Agreed, the action plan, the closing line. Sentence — "Seconds a pack, new
starter: learning at 85.6% a doubling (we can be 95% confident between 85.0% and 86.3%; R² 0.998) — each time the runs double, the time falls to 85.6% of itself. The 40 s standard arrives at run 11. Plan the first 8 runs at about 50.9 s, the average so far, not at the standard." Tones: neutral;
**amber** when the curve has flattened above the standard, when the standard is far beyond the runs timed, or when the time is not falling; **green** when the standard has been met; **red never** (learning slowly is not a failure). The picture: the runs as points, the fitted curve carried a fifth past the run the standard arrives at, the standard as a dashed level.
**Never claimed:** that the person will keep learning at this rate; that the standard is right; anything beyond the runs timed as a measurement.

**The report.** The paper (`src/lib/studiesPdf.ts` analysisBlocks on the report engine, as W3a): the band, the tiles, the sentence and what follows, the picture drawn (points, curve, standard level), the checks, the agreement in words, every reading. Same module as the screen.

## 8. Manufacturing usability
Pick the question, name it, give the standard, then the pad or a pasted column — a run at a time, on a phone. The first reading is run 1.

## 9. Failure handling
Too few runs, a standard of 0 or less, a bad run size, a time of zero or less, a time in an unknown unit (no money line), a flat or rising series (said), a struck reading (kept, left out), a client who may read but not type (`can.edit`). A study from before has no learning agreement: not offered.

## 10. Integration
The record: `agreed.analysis.kind: 'learn'` with `standard`, `perRun` and `firstName`; readings in `facts.readings`. **No new noun, table or migration.** Where it shows: wherever the Analysis shows (Tools of every scope, the line page's cards, the list and its paper, the directory). Access: `can.edit` to type, `can.agree` to change the agreement,
`can.remove` to delete. `docs/PAGES.md`, `scripts/inventory/pages.mjs`, `scripts/smoke.mjs`, the seed.

## 11. Verification
The unit tests (`learn.test.ts`, `analysisLearn.test.ts`); the acceptance script `scripts/acceptance/analysis-learning.mjs`; the inventory; the gate.

**Acceptance criteria.**
1. The fit, the rate with its interval, R², the projections, the run the standard arrives at, the average, the time over the standard and the plateau are SciPy's — `learn.test.ts`.
2. The sentences, tones and refusals (§5, §7, §9) and the money with each missing input named are the module's — `analysisLearn.test.ts`.
3. The page (`analysis-learning.mjs`): the eight runs pasted, the sentence as the module says it, the curve and the standard level drawn, the tiles; a flattened series amber; the standard changed and the run moving; the units in a run and the wage giving pounds; too few said.
4. Persistence and where it shows: reload keeps it; the question is on the picker (ten questions); the list row says what was typed (`analysis-learning.mjs`).
5. The paper downloaded and read back — the sentence, the curve's labels, the agreement, every reading — and the phone (`analysis-learning.mjs`).
6. The catalogue: FC-027 *available* — `catalogue.test.ts`; `docs/PAGES.md` and the inventory are green; `analysis.mjs`, `analysis-relations.mjs`, `analysis-gauge.mjs`, `analysis-shape.mjs` still pass with the picker at ten.
7. The gate.

*Not yet proved:* use with a real new starter's runs; the thresholds chosen in §3 have not been put to Rowland one by one; the line's wage on a line that has one (the script uses a line's seeded wage where it exists).

## 12. Maintainability
`src/lib/ie/learn.ts` holds the arithmetic; the tool's `measure.ts` the figures and words, as for the gauge and the shape. Left for later, each with its number: the cumulative-average form; forgetting; a station's cycle times by run read from the line balance or the video study; the skills matrix and training (FC-222, FC-223).
