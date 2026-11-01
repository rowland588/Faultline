# FC-135 — Product on hold: non-conformance and release (a register of cards on the scored shape)

**Catalogue:** FC-135 Product on hold. **Knowledge:** `quality.nonconformance-hold` (`knowledge/methods/quality/nonconformance-hold.md`). **Programme:** `docs/METHODS.md` §11 (8D D3 Contain). **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the projects."* **Status:** built 1 November 2026 (branch `t8-3`).

## 1. Purpose
Product that may not be right is held until someone with the authority decides what becomes of it — and every day it sits it costs: money tied up, shelf life running out, space, the chance of the wrong decision. The record says what was held, why, how much, where, who may release it, who decided and on what grounds. The sentence it lets one side say to the other: *"Two holds are open — 6,000 packs, the oldest six days, one decision past its day; £3,180 is tied up (not lost); the four decided holds lost £3,145; seal checks have held product three times — an 8D is worth opening."*

**Scope.** A holds register on the scored shape (`/scored/hold`, one per line or project): a card a hold with what is held, packs, lot, hold label, where, a tick that it is segregated and labelled, why, the cause (for the Pareto), who raised it and when, **who may release it**, the day the decision is due, the shelf life in all; then the fate — released, released under concession, reworked, regraded or destroyed — with who decided, when, on what grounds and the corrective-action reference, and the fate's typed money parts (hours, materials added, price lost a pack, disposal). The page says what is open, the oldest, the decisions late or with no day, what is not segregated or has no authority, the money tied up and the money lost (never added), the shelf life gone, and the holds by cause. Not in scope: segregating or labelling product, deciding for the authority, raising a hold from a failed check or problem, the cost-of-poor-quality total, HACCP holds' own rules.

## 2. Users and scenarios
The quality lead raising and deciding holds at a desk; the shift lead typing one at the line on a phone. (1) A failed seal pull: 4,800 packs held, the cage, the label, the decider and a day. (2) A re-test shows the check was in error: released with the grounds and the hours. (3) A missed metal-detector test piece: destroyed, disposal typed, the 8D referenced. (4) End of the month: the holds by cause.

## 3. Method selection
`quality.nonconformance-hold`: identify, segregate, record, decide against the specification and the risk, close with the disposition, quantities, cost and the corrective-action reference. Days held = decision day − raised day (today while open). Money by `knowledge/MONEY.md` causation H (held product tied up and carried) and Q (downgraded or scrapped product).

**Established · assumed · chosen.**
*Established:* the control of nonconforming output (ISO 9001:2015 clause 8.7; BRCGS Food Issue 9 clause 3.8 — from knowledge, texts not read); the worked case of the record — 4,800 packs, 6 days, £0.42 + £0.11 a pack: £2,544 tied up, £4,224 if destroyed (+ £1,680 margin not earned), the carrying charge at 12% a year £5.02, 6 of 21 days of life (28.6%) — recomputed by a second implementation (`scripts/knowledge/cases-t8-3.py`).
*Assumed:* the quantities are packs; the cost to this point is typed (materials and labour) and the same for every hold of the register; the segregation tick is true; the named authority is the person allowed to decide.
*Chosen by Faultline (not the standards'):* the five fates and what each loses — released: the review's hours × £ an hour; concession and regrade: packs × the price lost a pack; reworked: hours × £ an hour + the materials added; destroyed: packs × (cost to this point + margin) + disposal; a **missing input leaves the figure out and names it** (a release with no hours is not priced as nothing); **tied up** while open, **lost** once decided, the two never added; a cause counted **three** times is called repeating; an open hold with no decision day, no authority, no raised day or not segregated is listed as having something unsaid. None of these has been put to Rowland.
*Money (`knowledge/MONEY.md` FC-135):* held product tied up and carried (H); downgraded or scrapped product (M); the hold's days of life. Inputs: cost a piece, carrying rate, materials, margin, £ an hour. A missing one is named in one sentence; nothing waits on it.

## 4. Inputs
*Agreed:* the register's name and line; the four prices (cost to this point, margin, £ an hour, carrying rate — each optional); per hold the fields above. A client reads and changes nothing (`can.edit`).

## 5. Data suitability
A hold is read when named; packs a positive whole number; a raised day an ISO date, else the days are not counted and the card says so; a decided hold with a fate but no decided day counts days to today.

## 6. Calculations
`src/tools/hold/hold.ts`: `readHold` (parts unsaid, days, late, no day, tied up, carried, life used, what a decided hold lost and the inputs it lacked), `holdAnalyse` (the open, the decided, the Pareto, the sentence, tiles, money, table). **Independent cases** (`scripts/knowledge/cases-t8-3.py`, `src/tools/hold/__tests__/hold.test.ts`): the record's case (£2,544 tied up, £4,224 destroyed, £5.0183 carried, 28.5714% of life); the six-hold register read on 1 November — two open (6,000 packs, oldest 6 d, £3,180 tied up, £5.4365 carried), four decided (destroyed £2,790, released £50, regraded £160, reworked £145 = £3,145); Seal three holds, 8,100 packs.

## 7. Outputs
The lean page: the band (*n on hold* / *None on hold*), five tiles (On hold · Packs held · Oldest · Tied up · Lost, decided), the sentence, its money lines, *Holds by cause*, the cards, *What this does not say* and the limits, the closing line.

**The report.** The paper (`src/lib/report/scoredPaper.ts`, the report engine): the band and tiles, the sentence, the register as a table — # · hold and lot and label · packs · where and segregation · why and cause · raised · days · who may release · state and decision · money — open first oldest first, then the decided newest first; the money lines; *Holds by cause*; what it does not say and the limits. It reads the same module as the screen.

## 8. Manufacturing usability
A card a hold that stacks to one column on a phone; a hold typed at the line with the minimum (name, packs, why, the authority) and the rest later; the prices folded and the margin and wage offered from the line; controls a thumb's size.

## 9. Failure handling
Nothing named: says what to name. Gaps: listed per hold. A late decision: red, once. A missing price: named, the figure left out. A client's view: read only. Nothing open: green, "Nothing is on hold".

## 10. Integration
Record: `ToolStudy` of tool `scored`, `agreed.scored` `{ key: 'hold', rows, rate?, costToDate?, margin?, carryPct? }` with a `hold` per `ScoredRow` (`HoldData`) — inside the existing JSON, **no migration**. Shows: the Scored registers hub, a line's and a project's Tools (app tool *Product on hold*, `/scored/hold`), the method pages (8D D3), the directory. Not yet on the line's page, Needs you or the control room, and not raised from a failed check or the problems register (limits said).

## 11. Verification
Unit tests `src/tools/hold/__tests__/hold.test.ts`; acceptance `scripts/acceptance/hold.mjs`; `scored-shape.mjs`, `fmea.mjs`, `control-plan.mjs` (unchanged); `catalogue.test.ts`, `registry.test.ts`, `rail.test.ts`, `guides.test.ts`, `methodTools.test.ts`.

**Acceptance criteria.**
1. The record's case and the six-hold register as the second implementation prints them (tied up, carried, life used, lost by fate, the Pareto) — `hold.test.ts` and `hold.mjs` step 2.
2. Tied up and lost are separate tiles and never added; a missing input is named and the figure left out — `hold.test.ts` and `hold.mjs` steps 2 and 5.
3. A register made through New holds register and a hold typed through the real boxes — the parts unsaid fall away as each is said; the sentence equal to the module's — `hold.mjs` step 3.
4. A decision: the fate picked, who, when and the grounds; the card reads Released/Destroyed and the lost money; an open hold past its day is red and says so; a hold with no decision day is named — `hold.mjs` step 4.
5. The prices typed in the register's own boxes price it — `hold.mjs` step 5.
6. A hold taken off and brought back with Undo — `hold.mjs` step 6.
7. The paper downloaded and read back: the table, the money, holds by cause, what it does not say; the list row says what the page says — `hold.mjs` steps 7–8.
8. Kept after a reload; a client changes nothing; the phone has nothing off the side and its controls are a thumb's size — `hold.mjs` step 8.
*Not yet proved:* the five fates' money, the three-hold cut and the decision-day rule have not been put to Rowland; the tool has not been used on a real line's holds; a hold is not raised from a check or a problem.

## 12. Maintainability
Code: `src/tools/hold/hold.ts` (the reading, the words), `HoldEditor.tsx` (the cards), `src/tools/scored/defs/hold.ts` (definition and worked example), `RegisterEditor.tsx`, the `register` branch of `scored.ts`, `ScoredScreen.tsx`, `scoredPaper.ts`. Left: a hold raised from a failed check (FC-236) or a problem (the register's held packs, `lib/problemCost.ts`); the line's page and Needs you; the cost-of-poor-quality roll-up (FC-150); the 8D opened from a repeating cause.
