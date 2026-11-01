# FC-152 — Fault tree analysis: the combinations that cause the top event (a tree on the scored shape)

**Catalogue:** FC-152 Fault tree analysis (reads nothing; its barriers are the FMEA's and the control plan's). **Knowledge:** `rca.fault-tree` (`knowledge/methods/rca/fault-tree.md`; IEC 61025). **Programme:** `docs/METHODS.md` §11 (8D D4, A3 Analysis). **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the projects."* **Status:** built 1 November 2026 (branch `t8-3`).

## 1. Purpose
A serious, rare event — metal reaching a consumer, an under-cooked pack leaving the line — is not explained by a list of causes but by the combinations of failures that let it through: a hazard present *and* every barrier failing. The tree states the top event, works down through AND and OR gates to basic events, and gives the minimal cut sets, the probability of the top event and which event matters most. The sentence it lets one side say to the other: *"Metal reaches a consumer by nine combinations, none a single event; 0.12% a year; most of it runs through the screen breaking and the detector being bypassed."*

**Scope.** A tree on the scored shape (`/scored/fault-tree`, one per line or project): rows with a parent (none: the top event), a name, a gate (AND or OR) where it has causes below it, a probability (0 to 1, for the same period) where it is a basic event, and for a basic event the other basic event it is the **same** as (one cause under two gates). The page says the number of minimal cut sets and basic events, the fewest events that can cause the top event and any single point, the exact probability of the top event beside the rare-event sum and the upper bound, the importance of each event, and the expected cost where what one occurrence costs is given. Not in scope: voting, inhibit and priority gates; a drawn diagram (an indented outline is drawn, on screen and paper); dependent failures other than a shared event; estimating a probability; building the tree from the 5 Whys.

## 2. Users and scenarios
The quality lead and the engineer round a table with the metal-detection verification and the FMEA in front of them. (1) Metal in a pack: three ways in, three ways past the detector. (2) A cause shared by two branches — one maintenance error. (3) A tree with no probabilities yet: the cut sets still answer which combinations matter.

## 3. Method selection
`rca.fault-tree`: top-down expansion to **minimal cut sets** (MOCUS: OR unions the children's cut sets; AND takes their cross-product; absorption keeps the minimal ones); **top-event probability** exact for independent basic events by Shannon factoring over the cut sets, beside the **rare-event sum** (Σ P(cut set)) and the **min-cut upper bound** (1 − Π(1 − P(cut set))); **Birnbaum** importance (P(top | the event certain) − P(top | impossible)) and **Fussell–Vesely** (the share of the top probability that runs through the cut sets holding the event).
*Alternatives and when not:* a chronic problem with many causes → the fishbone and the 5 Whys; the order of failures in a process → the FMEA; a hazard's critical limits → the HACCP plan.

**Established · assumed · chosen.**
*Established:* IEC 61025:2006 (symbols, gates, cut sets — from knowledge, the standard not read); the gate arithmetic for independent inputs (OR: 1 − Π(1 − p); AND: Π p); MOCUS and absorption; the Birnbaum and Fussell–Vesely measures; every figure checked against a brute-force enumeration of all 2ⁿ states of the basic events in `scripts/knowledge/cases-t8-3.py` (no cut-set algebra), including a cause shared by two branches and a single point beside a pair.
*Assumed:* basic events are independent except where one is marked the same event; every probability is for one period and is typed from records or judgement; the tree is complete.
*Chosen by Faultline:* AND and OR only; a tree with more than 4,000 minimal cut sets or 60 basic events is refused ("split it") rather than approximated; a single point is amber (a place to look, not a failure); the page reads as an outline (indented rows) rather than a diagram. None put to Rowland.
*Money (`knowledge/MONEY.md` FC-152):* none of its own; the top event's cost (D) when known — what one occurrence costs, typed — is said beside the probability as probability × cost, with the period; a missing cost is named, nothing waits.

## 4. Inputs
*Agreed:* the tree's name and line (the top event is the first row); per row name, parent, gate, probability, same-as; the period (text) and what one occurrence of the top event costs (£) — each optional. A client reads and changes nothing (`can.edit`).

## 5. Data suitability
Exactly one top event; no loops; the top must have causes below it; a probability between 0 and 1, else it is not a probability and the event is listed as lacking one (the cut sets still stand). Too large: refused in words.

## 6. Calculations
`src/tools/faulttree/fault.ts`: `buildTree`, `identity`, `cutSets`, `topProbability`, `faultAnalyse`. **Independent cases** (`scripts/knowledge/cases-t8-3.py`, `src/tools/faulttree/__tests__/fault.test.ts`): the metal tree — 9 minimal cut sets (six of two events, three of three), P(top) = 0.0012006918, rare-event sum 0.001225, upper bound 0.0012243877, Fussell–Vesely 0.577184 for the screen breaking, 0.288592 for the part left in, Birnbaum 0.03413297; a shared cause — cuts {e}, {x,b}, {x,d}, P 0.0918 (0.09693 if the shared cause were counted twice), FV x 0.479303; a single point beside a pair — P 0.06094, FV of the pair 0.984575.

## 7. Outputs
The lean page: the band (*n single points*, else *Top p*), five tiles (Basic events · Cut sets · Single points · Top event · Weakest link), the sentence, its money line, *Which events matter most*, the tree outline, the cut sets as a table, *What this does not say* and the limits, the closing line.

**The report.** The paper (`src/lib/report/scoredPaper.ts`, the report engine): the band and tiles, the sentence, the cut sets as a table (# · the events that must all happen · how many · probability), the money line, *Which events matter most*, what it does not say and the limits. It reads the same module as the screen.

## 8. Manufacturing usability
Indented cards that lose their indent on a phone (a left rule instead); + Add a cause under this on each row; a probability typed with its percentage said back; controls a thumb's size.

## 9. Failure handling
No top, two tops, a loop, nothing under the top, too many combinations: each said in words; a basic event with no probability: named, the probability waits; a probability outside 0–1: said, not used; a client's view: read only; taking a row off takes the causes below it and Undo brings them back.

## 10. Integration
Record: `ToolStudy` of tool `scored`, `agreed.scored` `{ key: 'fault-tree', rows, eventCost?, period? }` with a `tree` per `ScoredRow` (`TreeData`) — inside the existing JSON, **no migration**. Shows: the Scored registers hub, a line's and a project's Tools (app tool *Fault tree*, `/scored/fault-tree`), the method pages (8D D4, A3 Analysis), the directory. Not yet raised from the 5 Whys, nor on the line's page or Needs you (limits said).

## 11. Verification
Unit tests `src/tools/faulttree/__tests__/fault.test.ts`; acceptance `scripts/acceptance/fault-tree.mjs`; `scored-shape.mjs`, `fmea.mjs`, `control-plan.mjs`, `hold.mjs` (unchanged); `catalogue.test.ts`, `registry.test.ts`, `rail.test.ts`, `guides.test.ts`, `methodTools.test.ts`.

**Acceptance criteria.**
1. The metal tree's cut sets, exact probability, bounds and importance as the second implementation prints them; the shared cause counted once; the single point named — `fault.test.ts` and `fault-tree.mjs` step 2.
2. A tree built through New fault tree with the real boxes — the top event, an AND gate, an OR gate, basic events with probabilities; the sentence follows each step and equals the module's — `fault-tree.mjs` step 3.
3. A cause marked the same as another: counted once, its probability the first's — `fault-tree.mjs` step 4.
4. Probabilities missing: the cut sets stand, the probability waits and the events are named; the period and the cost typed price it — `fault.test.ts` and `fault-tree.mjs` step 5.
5. A row taken off with its causes, brought back whole with Undo; a tree with no causes or two tops refused in words — `fault-tree.mjs` step 6.
6. The paper downloaded and read back: the cut sets table, the money, the weakest links, what it does not say; the list row says what the page says — `fault-tree.mjs` steps 7–8.
7. Kept after a reload; a client changes nothing; the phone has nothing off the side and its controls are a thumb's size — `fault-tree.mjs` step 8.
*Not yet proved:* the refusal sizes (4,000 combinations, 60 events) are Faultline's; the tool has not been used on a real hazard analysis; no diagram is drawn.

## 12. Maintainability
Code: `src/tools/faulttree/fault.ts` (the logic, the words), `FaultEditor.tsx` (the outline), `src/tools/scored/defs/fault-tree.ts` (definition and example), `RegisterEditor.tsx`, the `register` branch of `scored.ts`, `ScoredScreen.tsx`, `scoredPaper.ts`. Left: voting and inhibit gates; a drawn diagram; the tree raised from the 5 Whys or an 8D; a barrier's probability read from the check log's failure share.
