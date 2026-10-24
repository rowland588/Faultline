# FC-058 — money on the Reliability study: what the failures cost, in two parts, where they stop the line

**Catalogue:** FC-058 Reliability — MTBF and failure rate, several things
counted at once (the money part; the watch, the counts, the MTBF, its bounds,
the trend and the papers are built and unchanged). **Knowledge:**
`knowledge/methods/maintenance/mtbf-failure-rate.md` (the figures),
`knowledge/methods/cost/line-cost-model.md` (the one cost model),
`knowledge/methods/equipment/time-model-losses.md` (lost time in two parts,
only at the constraint for output), `knowledge/MONEY.md` §2 causation **D**
(a failure's lost minutes → L, and T where it is at the constraint) and §4
FC-058. **Asked for:** Rowland, 24 October — the rule for every tool: the
cost one of the outputs, by the industry's calculations, nothing blocked
when an input is missing; 14 October — the two parts never blended.
**Status:** specified and built 24 October. The tool said money before this
(21–22 October); this part brings it to the model: the two parts said apart,
contribution not margin, output lost only where the machine stops the line.

## 1. Purpose
A Reliability study already says what a count's failures cost: the minutes
the line stands an hour of running (the rate × the minutes a failure stands
the line), the crew's time for them, and the packs not made. Three things
were not to the model: the row and the tile added the labour and the margin
into one "£ an hour" (two parts blended); the packs were priced at the
line's margin straight, not through the one contribution rule (price −
materials, else margin); and the packs were counted lost wherever the
machine was, although output is lost only where a stop stops the line — the
machine the bottleneck Line capacity found, or the whole line. So the money
is now the loss count's: *"6 min stood an hour of running · £6.00 of the
crew's time · 360 packs not made at the Labeller, the bottleneck (£36
contribution) — a day of its shifts (7.5 h): £45 labour · £270
contribution"*, and on a machine that is not the bottleneck: *"… · no packs
lost — the Wrapper is not the bottleneck, so the line runs round it"*.

**Scope.** The money of a Reliability study: each count's cost an hour of
running and a day of the line's shifts, in the two parts (labour; packs and
contribution), where the study's machine stops the line; on the tiles, the
sentence, the side-by-side row, the closing line and the paper. Left out:
repair cost (D's second half — a fitter's rate and spares, FC-059 repair
times, not counted yet); the cost over the study's whole watched time (a
rate × the hours watched is a sample, not a loss; the hour and the day are
what the floor reads).

## 2. Users and scenarios
A fitter watching a labeller for a shift; the engineering manager reading
two labellers side by side; Rowland putting the number on the capital case
for a new infeed. Food first: micro-stops on a labeller at the end of the
line (the bottleneck — every minute is packs); film breaks on a wrapper
upstream of a buffer (the line runs round it — labour only).

## 3. Method selection
Maintenance economics prices a failure's downtime by the time model (`docs/
CAPACITY.md` §5–6): lost minutes cost the crew's labour wherever they are,
and lost output only at the constraint, valued at contribution (throughput
accounting, Goldratt). The study's machine is the one the study names
(`ToolStudy.machine`); the bottleneck is Line capacity's for a product on
the line (`lib/lineLoss` neckOf); the loss count's `stopsTheLine` rule
decides. No new causation.

**Established · assumed · chosen.**
- *Established:* minutes stood an hour of running = rate (failures an hour)
  × the minutes one failure stands the line (typed on the count); labour an
  hour = that ÷ 60 × crew × wage × on-costs (`lib/cost` labourPerHour);
  packs an hour = minutes stood × the line's rated packs a minute, only
  where the machine stops the line (`lib/lineLoss` stopsTheLine);
  contribution = packs × contribution a pack (price − materials, else
  margin — `tools/losses` contributionOf). A day = the line's shifts less
  their breaks (`lib/lineLoss` lineDay).
- *Established:* the bottleneck not known (no Line capacity on the line) →
  counted as stopping the line and said so, as the loss count says it.
- *Assumption:* the minutes a failure stands the line are the count's one
  typed figure, an average; the study has no repair times (FC-059).
- *Chosen (24 October rule):* every input optional — the minutes stood, the
  line, its crew and wage, its speed, its margin — each named when missing
  ("the line's crew and wage (Set up the line)"), the rest still said.
- *Chosen:* the two parts never blended: the row and the tile say "£6.00
  labour · £36 contribution", never their sum (Rowland, 14 October).
- *Chosen:* one module, `tools/reliability/reliability` relCost and
  costWords, read by the tiles (`reliabilityLean` relTiles), the closing
  line, the side-by-side rows, the screen and the paper alike.

## 4. Inputs
Nothing new typed. Read: the count's minutes a failure stands the line
(`RelCount.downMin`, typed in *Change what was agreed*); the study's machine
(`ToolStudy.machine`); the line's crew, wage, on-costs, rated speed, margin
(or price and materials), shifts (`Workspace`, *Set up the line*); the
line's standards for its bottleneck (`neckOf`). No database change.

## 5. Data suitability
Said once there is a rate (an event in watched time) and the minutes stood.
With no event the rate is an "at most" and no money is said.

## 6. Calculations
Symbols: λ failures an hour of running; d minutes one stands the line;
c, w, b crew, wage, on-costs; v packs a minute; k contribution a pack;
S = 1 where the machine stops the line (the bottleneck, no machine named,
or the bottleneck unknown), else 0; H hours in a day of the line's shifts.
- Minutes stood an hour M = λ × d. Labour an hour L = M ÷ 60 × c × w × b.
- Packs an hour P = S × M × v; contribution an hour C = P × k.
- A day: L × H, P × H, C × H.
- Missing: d → nothing in money, d asked; no line → the line asked; c·w → L
  absent, the crew and wage asked; S = 1 and no v → P absent, the speed
  asked; P and no k → C absent, the margin asked.

**Independent cases** (`scripts/knowledge/independent-cases.py`, "what a
machine's failures cost"; `src/tools/reliability/__tests__/reliability.test.ts`,
"what it costs — the one cost model"): 4 stops in 2 watched hours, 3 min a
stop, crew 4 at £12 × 1.25, 60 a minute, 10p a pack, one shift of 8 h with a
30 min break:
1. The machine the bottleneck → 6 min stood an hour; £6.00 labour; 360
   packs; £36 contribution; a day of 7.5 h: £45 labour, 2,700 packs, £270
   contribution.
2. The machine not the bottleneck → £6.00 labour, no packs, no
   contribution; "no packs lost — … is not the bottleneck, so the line runs
   round it".
3. The bottleneck not known → as case 1, "counted as stopping the line".
4. No wage → labour absent, "the line's crew and wage (Set up the line)";
   no speed → packs absent, the speed asked; no margin → contribution
   absent, the margin asked. 5. No minutes stood → nothing in money.
6. The row says "£6.00 labour · £36 contribution", never £42.

## 7. Outputs
The *What it costs* tile (the labour an hour its value; the contribution,
the packs and where, beside); the sentence under the graphs; the
side-by-side table's last column in two parts; the closing line's money.

**The report.** `lib/studiesPdf` reliability section: the tiles, the
sentence and the closing line are the module's and move with it; the
side-by-side table (`lib/report/reliabilityTable`) prints the two parts in
its last column, the columns widened for it. Nothing else on paper changes.

## 8. Manufacturing usability
Nothing new to type; the words say where the packs are counted and why.

## 9. Failure handling
No line → the line asked; a machine named that no standard knows → not the
bottleneck once one is counted (labour only), counted until then.

## 10. Integration
Reads: the study, the line, the line's standards. Writes nothing. Shows: the
study's page and paper, the list row (unchanged — it carries the verdict).

## 11. Verification
Unit tests on the six cases; the acceptance script reads the screen's tiles,
sentence and side-by-side rows against the module with the line's cost model
and the bottleneck.

**Acceptance criteria.** In `scripts/acceptance/reliability.mjs`:
1. Every tile, the sentence under the graphs and the closing line equal the
   module's with the study's machine and the line's bottleneck (stories 3,
   4, 6 as they stand — the truth is read with the machine and the
   bottleneck); the side-by-side rows carry the two parts (story 8's paper).
2. Story 11 (new): the seeded study given its line's cost model and a
   machine that is not the line's bottleneck — the sentence says labour and
   "the line runs round it"; the machine made the bottleneck's — the packs
   and the contribution said; the row's last cell the two parts, never a
   sum; the paper carries the sentence.
3. No console errors.
Proved by: `node scripts/acceptance/reliability.mjs` (in the gate), `npx
vitest run src/tools/reliability`.

## 12. Maintainability
One module; a change to `lib/cost`, `lib/lineLoss` or `contributionOf`
changes the study with the loss count and the register. The catalogue entry
names this spec; FC-058 leaves `AVAILABLE_BEFORE_STANDARD`.
