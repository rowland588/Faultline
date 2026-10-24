# FC-156 — money in the capability study: give-away, and what the rejects cost

**Catalogue:** FC-156 Give-away in money (a mode of FC-094, the capability
study); the cost of rejects on a pass-or-fail study, the money part of
FC-098 built ahead of its reject-rate capability (which stays planned).
**Knowledge:** `knowledge/methods/yield/giveaway.md` (full, law),
`knowledge/methods/cost/line-cost-model.md`, `knowledge/methods/spc/
capability-measured.md`. **Asked for:** Rowland, 17 October — *"everything
must derive a cost in the entire app ... it's all about money"*; `docs/
BLUEPRINT.md` §6 *Money in every tool*, the capability study first; 24
October — "Go" on the money, and the two decisions below in his words.
**Status:** agreed 24 October (the decisions Rowland's, the rest the
record's), built with this slice.

## 1. Purpose
A capability study already says whether the packs are within their limits
and how sure; it says nothing about what that costs. Packs running heavy
give product away every shift; a pass-or-fail study that finds rejects has
found waste, rework or a person's recovery, and each costs something
different. This puts the finding in money, so the team can say to the
sponsor: *"this filler gives away 4.1 g a pack — £738 a shift, £3,690 a
week — because the mean sits 4.1 g over the nominal"*, or *"1 in 20 of
these packs fails; at 10,000 a shift that is 500 to waste (£125) and 500
reworked (£60) a shift."*

**Scope.** Two findings in money, on the study's page and paper and in its
tiles wherever its tiles show: **give-away** on a measured study with a
nominal in a weight (sold by weight, or a measurement with a target in g or
kg); **what the rejects cost** on a pass-or-fail study, each failed item by
what became of it. Left out, each its own entry: the lowest legal fill and
what a lower spread would save (FC-157); reject-rate capability from made
and rejected counts (FC-098, part 2 of FC-094); a Pareto of rejects by type
and money (FC-125); the year (no running pattern on a study yet — a shift
and a week, when the shifts a week are given).

## 2. Users and scenarios
The line lead at the checkweigher, a phone in one hand, agreeing a study and
then checking packs; the team in the morning meeting with the study's paper;
Rowland with the sponsor. Scenarios, food first: bagged produce on a
combination weigher running 4 g heavy on a 400 g nominal; a pass-or-fail
check of seals where the vision system rejects a pack a seal check then
passes by hand, so most "rejects" are recovered; a metal-detector check whose
rejects are pure waste.

## 3. Method selection
Give-away is arithmetic from the record: the mean fill less the nominal,
times the packs, times what the product costs a kilo. No statistic is
needed beyond the mean the study already has; the spread's part (how low the
target could sit) is FC-157's and is not claimed here. A reject's cost is not
one number — Rowland, 24 October: *"in food manufacturing you can have a
reject that is reworked = cost to rework it putting it through the process
again; then you can also have a reject but only because a machine missed it
but a human then recovered it and put it in its box or basket; then you have
a reject that you cannot rework or human recover — it's pure waste."* So
each failed item carries what became of it, and the three are costed apart,
never blended (the loss count's rule, `docs/CAPACITY.md` §6). The money
rests on the sample's failed share scaled to the packs a shift; it is said
as what the sample found, with the count it came from, never as a proof.

**Established · assumed · chosen.**
- *Established:* give-away a pack = x̄ − nominal when positive; a period's =
  that × packs; in money = kg × £ a kg (`yield.giveaway`; the average
  system's rules say when the mean is short, `packaging.average-quantity-
  system`, already on the study).
- *Established:* a failed share from a sample scaled to a shift is a point
  estimate; what the count proves about the share is already said on the
  study (`sampleSays`, FC-100) and is not repeated as money.
- *Assumption:* the sample is from the run it stands for (said: "from the
  share in this sample — 2 of 20").
- *Chosen (Rowland, 24 October):* a failed item is one of **waste · reworked
  · recovered by hand**; waste costs the pack's materials, reworked costs
  one rework, recovered costs nothing counted (a person's moment; said as a
  count, not priced). *Chosen (Rowland, 24 October, "typed on each
  study"):* the product's cost a kilo, a pack's materials and one rework's
  cost are typed on the study's agreement, not read off the line — a
  study's product and its basis differ study to study. *Chosen:* the packs
  a shift are typed on the study too, offered from the line when the line
  knows its ideal speed and a shift's planned minutes (`tools/losses
  idealOf`, `plannedOf`), never assumed. *Chosen:* a week is said only when
  the shifts a week are typed; no year.

## 4. Inputs
Agreed before the readings, on `AgreedReadings` (`can.agree`), every one
optional — the study works as before without them and the money tile says
what is missing:
- **Packs a shift** (`packsPerShift`, whole number ≥ 1) — offered from the
  line's ideal speed × a shift's planned minutes when known, with "from the
  line"; typed over freely.
- **Shifts a week** (`shiftsPerWeek`, 1–21).
- Measured with a nominal, unit g or kg: **What the product costs you a kilo
  (£, to make — not its price)** (`costPerKg`, > 0).
- Pass or fail: **A pack's materials (£)** (`materialsPerPack`, ≥ 0) and **To
  rework one pack (£)** (`reworkPerPack`, ≥ 0).
Each reading (`StudyReading`): a failed item's **fate** (`fate: 'waste' |
'rework' | 'recovered'`), set when it is marked failed (waste unless said)
and changeable on the row; absent on every reading before this slice, read
as waste.
Nothing is read from the line but the offered packs a shift. Access, sync
and the database are unchanged: the fields are JSON on the record the cloud
already carries (`studies.agreed`, `studies.facts`).

## 5. Data suitability
Give-away is said once the mean is said (one reading in; the tile marks it
rough below 20, as the study marks its own figures). A nominal in a weight
is needed for money: a unit other than g or kg says *"in money needs a
weight in g or kg"* and gives the give-away in the unit only. A mean at or
below the nominal gives no give-away ("none — the mean is under the
nominal", and the ℮ rules say the problem). The rejects' money is said from
the sample's share with the count beside it; one failed in five is said as
"1 of 5" so the reader weighs it.

## 6. Calculations
Symbols: x̄ the mean of the unstruck readings; N the nominal; P the packs a
shift; W the shifts a week; K the £ a kg; n the readings in; b the failed
items; b_w, b_r, b_h the failed by fate (waste, rework, recovered); M a
pack's materials in £; R one rework in £.
- Give-away a pack g = max(0, x̄ − N), in the unit. In kg: g/1000 for g, g
  for kg.
- A shift: kg_s = g_kg × P; £_s = kg_s × K. A week: × W.
- Rejects: the failed share s = b/n; a shift's failed = s × P, by fate in the
  sample's proportions: P_w = P × b_w/n, P_r = P × b_r/n, P_h = P × b_h/n.
  Waste £_w = P_w × M; rework £_r = P_r × R; recovered: P_h said, not priced.
  Total £ = £_w + £_r. A week × W.
- Rounding: counts to the nearest whole; kg to one decimal under 100 and
  whole above; £ as `fmtGBP` (whole pounds, en-GB).

**Independent cases** (`scripts/knowledge/independent-cases.py`, "money in
the capability study"; the unit tests in `src/tools/capability/__tests__/
sample.test.ts`, "money"):
1. The record's own: x̄ 404.1 g on N 400 g, P 10,000, W 5, K £18 → 4.1 g a
   pack, 41.0 kg and £738 a shift, 205 kg and £3,690 a week.
2. x̄ 399.6 g on 400 g → give-away none (0 g, £0), the mean under the nominal.
3. Unit mm, x̄ 12.4 on 12 → 0.4 mm a pack, no money ("needs a weight in g
   or kg").
4. Pass or fail, 20 checked, 2 failed — one waste, one reworked; P 10,000, M
   £0.25, R £0.12 → 1,000 failed a shift: 500 waste £125, 500 reworked £60,
   £185 a shift; W 5 → £925 a week.
5. 20 checked, 1 failed and recovered by hand, M £0.25 → 500 recovered a
   shift, £0 counted, said so.
6. No packs a shift → every money figure absent and the tile says "give the
   packs a shift to say it in money".

## 7. Outputs
Screen and paper together, in the study's tiles (`sampleTiles`) and under
what it says (`sampleSays` unchanged; a money sentence beside it):
- **Give-away** tile: `4.1 g` *a pack over the nominal — 41 kg · £738 a
  shift · £3,690 a week*; amber when there is give-away, grey when none or
  not yet sayable, with the missing input named: *give £ a kg to say it in
  money* / *give the packs a shift to say it in money* / *in money needs a
  weight in g or kg*.
- **Rejects** tile (pass or fail, once one has failed): `£185` *a shift —
  from 2 of 20: 500 waste £125 · 500 reworked £60*; with recovered ones
  *· 500 recovered by hand, not priced*; grey with the missing input named
  (*give the packs a shift* / *give a pack's materials and one rework's cost*).
- One sentence, the lean page's *what it means* order: *"Give-away 4.1 g a
  pack — 41 kg, £738 a shift, £3,690 a week — because the mean (404.1 g)
  sits 4.1 g over the nominal."* / *"Rejects: 2 of 20 failed — at 10,000 a
  shift, 500 to waste (£125) and 500 reworked (£60), £185 a shift."*
- What it does not claim: the share is the sample's; the year; what a lower
  spread would save (FC-157, named on the tile when give-away is said:
  *where the target could sit is FC-157, not built*).
- Where a failed item's fate is set: after ✗ Failed, three chips on the
  reading — *Waste · Reworked · Recovered by hand* — waste unless tapped;
  the readings list shows each failed item's fate and lets it be changed.

**The report.** The study's paper (`lib/studiesPdf`, the capability section
and every list that draws the study's tiles) carries the same tiles and the
money sentence under the verdict, from the same module; the agreement's
money inputs are printed with the agreement ("10,000 a shift, 5 shifts a
week, £18 a kg"); a failed item's fate is printed on its row in the readings
table. Nothing missing is made up: a missing input prints as the tile says
it. The paper is the PDF the study already offers; no new paper.

## 8. Manufacturing usability
One hand: agreeing adds at most three boxes to the form, all optional, the
packs a shift already filled from the line when it can be. Checking is
unchanged — ✓ Good · ✗ Failed, big — and a failed item's fate is three
chips that appear under the last reading, waste if nothing is tapped. The
money is read in the tiles' order: readings · failed · confident · give-away
or rejects · verdict; the sentence under them; the paper the same.

## 9. Failure handling
Missing inputs: the tile grey, the missing input named, nothing invented.
A unit that is not a weight: give-away in the unit only. Mean under the
nominal: none. A struck reading leaves the money (struck readings are out
of the mean and the counts already). Too few readings: the tile carries the
study's own "said from 20 — 7 so far" rough mark. Offline: the inputs are
on the record and sync with it. A client: reads the money, cannot agree it.
Misuse: a price typed as the cost a kilo — the label says *to make, not its
price*; a negative or zero cost refused on the form.

## 10. Integration
Record: `studies` — `agreed.readings` gains `packsPerShift`, `shiftsPerWeek`,
`costPerKg`, `materialsPerPack`, `reworkPerPack`; `facts.readings[]` gains
`fate`. JSON on the record; no migration (the cloud checks the tool name, not
the JSON — `docs/BUILD.md`). Shows wherever the study's tiles and sentence
show: its page, its paper, the studies list's paper, the line's tools page
row (`studyLine` unchanged — the verdict stays the row's word), the 6M
fishbone (unchanged). Access: `can.agree` for the inputs, `can.edit` for a
fate. PAGES.md: the capability page gains *the money tile*; the inventory
checks it on the seeded pass-or-fail and sold-by-weight studies (seed: the
sold-by-weight study gets packs a shift and £ a kg; the pass-or-fail study a
failed item to waste). Smoke unchanged.

## 11. Verification
Unit tests on the six cases above and the words (`sample.test.ts`,
"money"). The acceptance script `scripts/acceptance/capability-kinds.mjs`
gains story 9, driven on the seeded studies against the module's own words.
Gate line in CLAUDE.md: the capability-kinds line gains *"the money: give-away
a pack, a shift and a week from the typed cost a kilo; the rejects by fate
— waste, reworked, recovered by hand — at the packs a shift; a missing
input named, never a figure invented; on paper"*.

**Acceptance criteria.**
1. The six independent cases give the figures in §6 — `sample.test.ts`
   "money" (unit).
2. Agreeing a sold-by-weight study offers packs a shift from the line when
   the line knows it, and takes the cost a kilo; the Give-away tile says the
   pack, the shift and the week as `sampleMoney` words them — capability-
   kinds.mjs story 9a.
3. With no cost a kilo the tile is grey and says *give £ a kg to say it in
   money*; with a unit that is not a weight it says so — 9b.
4. On a pass-or-fail study, ✗ Failed shows the three fates, waste unless
   tapped; Reworked tapped on one, Recovered on another; the Rejects tile
   and the sentence say the three apart at the packs a shift, the recovered
   not priced — 9c.
5. The study's PDF carries the money tiles, the sentence, the inputs with
   the agreement and each failed item's fate — 9d (downloaded, read back).
6. Every existing check of capability-kinds.mjs (stories 1–8), the
   inventory and paper parity on every other paper unchanged; the capability
   papers change only by the money (MEANT in `paper-parity.mjs`).
7. A client sees the money and cannot change the agreement — 9e.
8. The phone: the three chips reachable with one hand under the last reading
   — 9f.

## 12. Maintainability
`src/tools/capability/sample.ts` gains `sampleMoney(f, a)` (the figures and
the missing-input names) and `moneySays`; `sampleLean.ts` the two tiles;
`StudyScreen.tsx` the three boxes and the fate chips; `lib/studiesPdf.ts`
the same tiles and sentence. Shared with nothing new; `fmtGBP` from
`lib/cost`. Left for later: FC-157 (the lowest legal fill and what a lower
spread saves — the spread and the TNE are already on the study, so it is a
second function beside `sampleMoney`), FC-098 (reject-rate capability from
counts — the fates and the costs here carry straight onto its runs), a year
once a study has a running pattern (SMED's `Running` is the model to share).
