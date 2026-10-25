# FC-116 — Several deposits in one pack: the stack-up of means and spreads (W3c, builder F3)

**Catalogue:** FC-116 several deposits in one pack — tolerance stack-up (a part several tools share). **Knowledge:**
`stats.tolerance-stackup`. **Programme:** `docs/TOOLS-BUILD.md` W3, slice c. A fold into the capability study's *Sold by weight* (FC-162) and
its measurements with a lower limit (FC-094): no new page, the study's own agreement gains one optional box and its notes one note. **Asked for:**
Rowland, 25 October (`docs/TOOLS-BUILD-BRIEF.md`): *"go through everything"*; the judgement calls are the builder's, written here. **Written 25 October
2026, builder F3**, with the arithmetic proved against NumPy (`scripts/knowledge/cases-w3c.py`).

## 1. Purpose
A ready meal is four deposits; a selection box twelve. The pack is the sum of its deposits, so its mean is the sum of their means — but its
spread is *not* the sum of their spreads: independent spreads add as squares, so the pack varies far less than the worst case and the biggest
deposit dominates. That decides where the target sits and which deposit is worth tightening. The sentence it lets one side say to the other: *"Four
deposits make 300 g with a spread of 4.6 g; the rice holds 42% of it — halve the rice's spread and the 1-in-1,000 target falls 2.5 g a pack, £221 a shift."*

**Scope.** On a **sold-by-weight** study (FC-162) and on a **measurement with a lower limit**, the deposits typed — a line each: name, mean, spread — and a
note that says: the pack's mean (the sum), its spread (the root sum of squares) against the worst case; the target the packers' three rules need at that
spread (sold by weight) or that keeps 999 in 1,000 over the floor (a lower limit), and whether the deposits' means reach it; each deposit's share of the
variance and the biggest named; what halving the biggest buys, in grams a pack and, with packs a shift and £ a kilo, in kilos and pounds; and, from 25
pack readings, the pack's own spread beside the deposits' with the last word to the readings. **Not in this build:** deposits that move together (a
correlation between deposits — the record's caution is said, not computed); a product of factors (a count × a unit weight); reading each deposit's mean and
spread *from its own study* (the record's idea — there is no link from one study to another's figures; typed here, from a study of each deposit); a multihead
weigher's combination logic (FC-158 reads its heads); worst-case stack-up as a target (said to be wrong, not offered).

## 2. Users and scenarios
The process engineer at a desk with four deposit studies done; the ops lead asking where the give-away on a ready meal is. (1) A 300 g meal: rice 120 (s 3.0),
sauce 80 (2.5), vegetables 60 (2.0), garnish 40 (1.5). (2) The same, sold by weight under ℮: the rules bind at the average and the page says halving a
deposit buys nothing legal. (3) A 290 g minimum the customer holds to 1 in 1,000: halving the rice saves 2.5 g a pack.

## 3. Method selection
The record: mean of a sum = Σμᵢ; spread of a sum of independent variables = √Σσᵢ²; each deposit's share σᵢ²/σ²_pack; the target m + z·σ_pack for a floor;
the worst case Σ3σᵢ almost never happens and must not set the target. Alternatives (the record's *When not to use it*): one deposit → the capability study
directly; the legal rules on the pack → the average-quantity system (which this uses for the sold-by-weight target); the weigher's combination → its own tool.

**Established · assumed · chosen.**
*Established* (textbook, with the independent case of §6): the mean and variance of a sum of independent random variables (Montgomery and Runger, ch. 5); root
sum of squares against worst case (Creveling, *Tolerance Design*, 1997); the packers' three rules as `lib/ie/dist` fillTargets holds them (FC-157, W1).
*Assumed* — the deposits independent (one deposit's over-fill not caused by another's: said on the note, checked against the pack's readings from 25); each
deposit's mean and spread from its own 20 to 30 readings (said at the box). *Chosen by Faultline* (the builder, 25 October — the owner asked not to be asked): the floor
is kept to **1 in 1,000** (z = Φ⁻¹(0.999) = 3.0902, the record's own example) — a practice choice, not a law, said on the note; two deposits at least, twelve at most; the pack's
own spread is called **wider** than the deposits give above 1.25× and **tighter** below 0.8×; on a sold-by-weight study the target is the packers' rules' (so the
saving from tightening is often nothing, and the page says "the average rule binds"). *Money* (`knowledge/MONEY.md` FC-116, causation M): the grams a pack saved × packs a
shift × £ a kilo — the give-away FC-156 already prices — for a weight in g or kg only; a missing input is named and nothing waits.

## 4. Inputs
*Agreed before measuring:* the deposits (optional): a line each — name, mean, spread — in the study's unit (a textarea, "Rice, 120, 3.0"); the study's own nominal or lower limit,
packs a shift, shifts a week and £ a kilo (the study's money boxes, FC-156). *Measured:* the pack's own readings, as the study already takes them. Nothing is read from a machine.

## 5. Data suitability
Two to twelve deposits, each with a mean and a spread above 0; the stack-up works with no pack readings at all (it needs the deposits). The pack's own spread is compared
from 25 readings. **Refused, in words:** a line that is not a name and two numbers above 0, one deposit, more than twelve, two with the same name. **Said, not refused:** the
deposits' means short of the target the rules need; the pack's readings spreading wider or tighter than the deposits give.

## 6. Calculations
Printed by NumPy/SciPy (`scripts/knowledge/cases-w3c.py`, `stackup`), each a unit test (`src/tools/capability/__tests__/stackup.test.ts`). The record's ready meal — rice 120 g (s 3.0),
sauce 80 (2.5), vegetables 60 (2.0), garnish 40 (1.5): pack mean 300 g; spread √(9 + 6.25 + 4 + 2.25) = 4.63681 g against the worst case 27 g (the RSS 3σ is 13.91 g); shares 41.9%, 29.1%, 18.6%, 10.5%;
halving the rice: 3.84057 g. For a floor of 290 g at 1 in 1,000: target 304.3288 g, halved 301.8683 g — 2.4606 g a pack, 12.303 kg, £221.45 a shift at 5,000 packs and £18 a kilo, £2,214.5 a week at 10 shifts.
Sold by weight, 300 g (TNE 9 g, Schedule 3 as `tneFor` holds it — the Schedule itself was not read from here): the three rules need 300.0880 g at 4.6368 g (the 1-in-40 rule binds) and 300.0 at 3.8406 g (the average rule binds): 0.0880 g a pack,
£7.92 a shift at 5,000 packs and £18 a kilo. (The record's "1.6% under 290 g at a 300 g target" is the share Φ((290 − 300)/4.6368) = 0.0155.)

## 7. Outputs
A note under the study's sentences (`modeNotes`, kind `stack`), on the page and on the paper from the same module: "4 deposits make 300.0 g: the pack's spread is 4.64 g — the deposits' spreads add as squares, not as a sum (the worst
case, every deposit at its 3σ at once, 27.0 g, almost never happens). At that spread the lowest target that keeps the three rules is 300.1 g (the 1-in-40 rule binds); the deposits average 300.0 g, 0.1 g short of it — raise a
deposit or tighten them. Rice holds 42% of the spread; halving its spread brings the pack's to 3.84 g and the target to 300.0 g — 0.1 g a pack saved — about 0.4 kg and £7.92 a shift because of the give-away." Amber when the deposits' means
fall short of the target; neutral otherwise; never red or green. **Never claimed:** that the deposits are independent; that a pack's spread from the deposits is its true spread (the readings have the last word); a legal compliance.

**The report.** The paper is the capability study's (`src/lib/studiesPdf.ts` through `modeNotes`): the note in the study's notes with the same words. It reads the same module as the screen.

## 8. Manufacturing usability
One box, optional, on the study's agreement; the note appears as soon as the deposits are agreed, before any pack is weighed.

## 9. Failure handling
A deposit line that is not understood, one deposit, a duplicate name, a mean or spread of 0 or less: said at the box with Agree held. No packs a shift, or no £ a kilo: named in the note, nothing blocked. A unit that is not a weight: no money line.

## 10. Integration
The record: `agreed.readings.deposits` — an optional list on the capability study's agreement, in the existing jsonb; **no new noun, table or migration**. Shown wherever the study shows (its page, its paper, the list's paper). Access: `can.agree` to change it. `docs/PAGES.md`, `scripts/inventory/pages.mjs`.

## 11. Verification
The unit tests (`stackup.test.ts`); the acceptance script `scripts/acceptance/capability-kinds.mjs` step 17; the inventory; the gate.

**Acceptance criteria.**
1. The mean, the root sum of squares, the worst case, each share, the target by the three rules and by the floor, the halved spread and the saving, and the money are NumPy's — `stackup.test.ts`.
2. The sentences, tones, the average-rule-binds case, the money with a missing input named, the pack's readings beside the deposits', and the refusals — `stackup.test.ts`.
3. The page: a sold-by-weight study with the four deposits typed shows the note before any reading; the figures as the module says; a malformed line held at Agree; a lower-limit study shows the floor note — `capability-kinds.mjs` step 17.
4. The paper carries the same note — `capability-kinds.mjs` step 17.
5. A study without deposits, a counted mode and an "at most" study carry none; every earlier step of `capability-kinds.mjs` passes unchanged.
6. The catalogue: FC-116 *available* — `catalogue.test.ts`; `docs/PAGES.md` and the inventory are green.
7. The gate.

*Not yet proved:* use with real deposit studies; correlated deposits; Schedule 3 (the TNE) against the legislation (see `knowledge/GAPS.md`, Research 1 and the 25 October note).

## 12. Maintainability
`stackFigures` and `stackSays` in `src/tools/capability/modes.ts`, called by `modeNotes`; the box in `StudyScreen`. Left for later: correlated deposits (a pair's correlation read from two deposit studies), a deposit read from its own study's figures, a product of factors, the weigher's heads as deposits (FC-158).
