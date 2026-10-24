# FC-146 — money on the 6M: what the problem costs a week, and what a countermeasure should be worth

**Catalogue:** FC-146 6M — a running line made to perform better (the money
part; the fishbone, the board, the proof and the 6M report are built and
unchanged). **Knowledge:** `knowledge/methods/rca/fishbone-5whys.md`,
`knowledge/methods/rca/pdca.md`, `knowledge/methods/rca/a3.md` (the expected
effect), `knowledge/methods/cost/line-cost-model.md`,
`knowledge/methods/equipment/time-model-losses.md`, `knowledge/MONEY.md` §4
(FC-146, FC-147: the problem's £ from its own number; a countermeasure's worth
the share of it). **Asked for:** `docs/BLUEPRINT.md` §6 — "the 6M
countermeasure (worth)"; Rowland, 17 October — "everything must derive a cost";
24 October — the rule for every tool. **Status:** specified and built 24
October under the 24 October rule; the one new question (a countermeasure's
expected share) is asked on the board, never assumed.

## 1. Purpose
A 6M problem is the head of the fish: a loss, specific and measured — hours a
week lost in its scope, before, now and a target (`lib/fishbone measureOf`).
The line's cost model already prices an hour the way the loss count prices a
stop. So the problem says what it costs a week, what has been saved since it
opened, and what the target is worth; and each countermeasure on the board,
asked how much of the problem it should remove (the A3's expected effect),
says what that is worth a week — so the team can say to the sponsor which
countermeasure to do first, in pounds, and the 6M report carries it.

**Scope.** The problem's number in money when it is hours a week (a Pareto
bar, the constraint, something seen): before, now, target, the saving so far
and the target's worth, in the loss count's two parts; a countermeasure's
worth from its typed share (0–100%) × the problem's £ when it opened; the
board's sum for the problem (over 100% said). On the fishbone page's problem
card, under its number and on each fix; on the board's countermeasure sheet
(the box); on the 6M report (the problem, each countermeasure, the Fix
part's sum). Left out, each said: a gap problem (a measure in its own unit —
ppm, %) has no money here and says nothing of it; the proof's money as a
verdict (the saving is said as arithmetic on the number, never as "the fix
did it" — the proof's own words stand); the 6M lean tiles (the band's five
stay; money in them is a later piece); the countermeasure's cost to do (I).

## 2. Users and scenarios
The 6M team at the fishbone deciding which root to act on first; the board
meeting weighing three countermeasures; Rowland showing a sponsor what the
3 h a week on the basketer costs and what the plan should bring back. Food
first: minor stops on a basketer at the bottleneck; film splices on a
bagger the line runs round; a cleandown overrun on the whole line.

## 3. Method selection
The loss count's time model (`docs/CAPACITY.md` §5–6; `lib/lineLoss`): the
crew's labour for every lost hour; packs and contribution only where the
scope stops the line — its machine the bottleneck (Line capacity's, `neckOf`),
or the whole line (a Pareto scope with no machine, the constraint). Throughput
accounting keeps contribution as a pack's value. The A3's expected effect
(Shook 2008, *Managing to Learn*; Sobek & Smalley 2008): each countermeasure
predicts its effect before it is done; its worth is that share of the
problem's cost — no causation invented, the share typed.

**Established · assumed · chosen.**
- *Established:* £ labour a week = hours × crew × wage × on-costs; packs lost
  = hours × 60 × rated packs a minute where the scope stops the line;
  contribution = packs × (price − materials, else margin) — the loss count's
  arithmetic (`lib/cost`, `tools/losses` contributionOf), two parts never
  blended (Rowland, 14 October).
- *Established:* the problem's number is `measureOf`'s — before (the baseline
  it opened with, else the four weeks before), now (the last four full weeks),
  target — all in hours a week for a Pareto, constraint or observed problem.
- *Assumption:* a countermeasure's effect is proportional: its typed share of
  the problem's hours is its share of the problem's £ (the mix of labour and
  contribution does not change with the share).
- *Chosen (24 October rule):* every input optional — the share on the
  countermeasure, the wage, speed and margin on the line — the missing one
  named, the rest still said; a gap problem says nothing of money rather
  than a guess.
- *Chosen:* the money is said beside the number and never changes the
  problem's phase, its verdict ("Did it work" stays the number's) or the
  board's order.
- *Chosen:* one module, `lib/sixmMoney` (problemMoney, counterWorth,
  boardWorth), read by the problem view (`lib/fishbone buildView`), the card,
  the report (`lib/sixmReport`) and its paper.

## 4. Inputs
One new, on the board's action (`PaceTodoRow.expectPct`, 0–100, optional —
`supabase/SIXM_MONEY.sql`, applied 24 October as `sixm_money` and read back):
**How much of the problem it should remove (%)**, typed on the countermeasure
sheet under *What it should change*. Read: the problem's measure, its scope
(`scopeOf`), its line's cost model (`Workspace`), the line's standards for
its bottleneck. Access and sync unchanged (one nullable column, the mapper
both ways, the schema test through the migration file).

## 5. Data suitability
Said once the problem has a number in hours a week; a target's worth once a
target is set; the saving once both before and now are known. A share over
100 is refused by the box and the database; the board's sum over 100% is
said as more than the whole problem.

## 6. Calculations
Symbols: h_b, h_n, h_t hours a week before, now, target; c crew, w wage, b
on-costs; v rated packs a minute; k contribution a pack; S = 1 where the
scope stops the line; s_i a countermeasure's share.
- £ an hour: L = c·w·b; P = S·60·v packs; C = P·k.
- Before = h_b × (L, P, C); now and target likewise; saved = before − now;
  target's worth = before − target.
- A countermeasure's worth = s_i/100 × before; the board's = Σs_i/100 × before
  over those that say a share, with Σs_i said.
- Missing: no c·w → the wage asked; S = 1 and no v → the speed asked; P known
  and no k → the margin asked.

**Independent cases** (`scripts/knowledge/independent-cases.py`, "what a 6M
problem costs a week"; `src/lib/__tests__/sixmMoney.test.ts`), on a line
with crew 5, £14.80 × 1.3, 60 packs a minute, 6p a pack, bottleneck the
Packer:
1. 3 h a week on the whole line → £288.60 labour, 10,800 packs, £648
   contribution a week.
2. Before 3 h, now 1.5 h, target 1 h → saved £144.30 and £324; the target
   worth £192.40 and £432 (7,200 packs).
3. 3 h at the Bagger (not the bottleneck) → labour only, "the line runs round
   it". 4. The bottleneck not known → counted as stopping the line, said so.
5. No wage → the wage asked; a wage and no speed → labour said, speed asked.
6. A gap problem, or nothing measured → no money, nothing invented.
7. A countermeasure at 40% → £115.44 labour, 4,320 packs, £259.20
   contribution a week; no share or no money → nothing; no wage → "give the
   line a wage to say what that is worth".
8. The board at 40% + 30% → 70%, £202.02 and £453.60; 80% + 40% → said as
   more than the whole problem.

## 7. Outputs
The problem card (the fishbone page, the line's page): one sentence under
the number (`.pc-money`); each fix's worth under *Should change*
(`.cs-cm-worth`). The countermeasure sheet: the box. The 6M report: the
problem's money line under its measure; each countermeasure's worth; the
Fix part's sum line — on paper and on the preview from the same model.

**The report.** `lib/sixmReport` ProblemRep gains `money`, CounterRep
`worth`, the problem `counterWorth`; `lib/sixmReportPdf` draws each where the
measure, the countermeasure and the Fix heading are. The 6M papers change by
these lines and are exempted in `scripts/paper-parity.mjs` as meant.

## 8. Manufacturing usability
Nothing new to type on the problem; one optional number on a countermeasure;
the words say what the line still lacks to price it fully.

## 9. Failure handling
A line record not found reads as no wage (the ask); a problem on no line says
the ask; a scope whose machine no standard knows is counted as not the
bottleneck only when a bottleneck is known.

## 10. Integration
Reads: `Case`, `ProblemMeasure`, `Workspace`, the line's `Standard`s,
`PaceTodoRow`. Writes: `PaceTodoRow.expectPct`. Shows: the fishbone page's
problem card, the board's sheet, the 6M report and preview. Replaces
nothing. The project's Actions and the control room may carry a
countermeasure's worth later (not in this slice).

## 11. Verification
Unit tests on the eight cases; the acceptance script drives the 6M job in
Chromium and reads the report back.

**Acceptance criteria.** In `scripts/acceptance/sixm-evidence.mjs`, story 19:
1. The seeded 6M job's problem with a baseline (3 h a week on its line, crew
   5, £14.80 × 1.3, 60 a minute, 6p): the problem card's sentence (opened from
   the fishbone's strip, as the hold is) equals the module's for the problem,
   its scope, its line and its bottleneck, and says the labour, the packs and
   the contribution; the inventory opens the card read through
   (`?view=read`) and finds it (`docs/PAGES.md`).
2. The countermeasure's sheet opened on the board, 40 typed in *How much of
   the problem it should remove*, saved: the record carries 40; the
   fishbone's fix row says its worth, equal to the module's.
3. The 6M report's text carries the problem's money sentence and the
   countermeasure's worth.
4. No console errors.
Proved by: `node scripts/acceptance/sixm-evidence.mjs` (in the gate), `npx
vitest run src/lib/__tests__/sixmMoney.test.ts`, the sync schema test.

## 12. Maintainability
One module, `src/lib/sixmMoney.ts`; the arithmetic is `lib/cost`,
`lib/lineLoss` and `tools/losses` contributionOf, so the 6M moves with the
loss count. `knowledge/MONEY.md` §4 FC-146 says built; the catalogue entry
names the spec, the module and the tests; the lean tiles and the
countermeasure's own cost are the next parts, said in the entry's limits.
