---
id: capacity.theory-of-constraints
name: Theory of Constraints — the five focusing steps and the mirage
aka: [TOC, constraint, bottleneck, five focusing steps, POOGI, process of ongoing improvement, exploit subordinate elevate, the mirage]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-11-23 — the five focusing steps (identify, exploit, subordinate, elevate, return to step 1 and do not let inertia become the constraint) and POOGI wording confirmed online 23 November 2026 at Goldratt Research Labs (goldrattresearchlabs.com/introduction-to-toc) and Theory of Constraints Institute (tocinstitute.org/five-focusing-steps); the inertia warning confirmed in Wikipedia *Theory of constraints* excerpt and in Goldratt (1990) as quoted in an Internet Archive excerpt of *Theory of Constraints* — not the paid book read line by line; Faultline's mirage rule unchanged, proved by `scripts/knowledge/cases-toc.py` and intelligence tests
needs: [capacity.line-capacity]
next: [capacity.dbr-buffer, capacity.throughput-accounting]
alternatives: []
related: [equipment.time-model-losses, cost.line-cost-model, ie.work-sampling, lean.tps-foundations]
---
# Theory of Constraints — the five focusing steps and the mirage

## Purpose and principle
A system's output is set by its **constraint** — the weakest link that limits
progress toward the goal (for a factory, usually **throughput**: good product
out the door that contributes margin). Goldratt's **five focusing steps**
(also called **POOGI**, process of ongoing improvement) are the cycle for
managing that link: find it, get everything possible from it before spending,
align the rest of the system so it is never starved or drowned in WIP, add
capacity only when exploitation and subordination are exhausted, then **start
again** because the constraint moves — and **do not let inertia** (old policies,
old batch sizes, "keep everyone busy") become the new constraint.

Faultline adds one shop-floor rule on top: an hour **saved off** the constraint
is an hour of output lost; an hour saved **elsewhere** is a **mirage** for
throughput (it may still save labour).

## Questions it answers
Which step limits the line today? Which losses actually cost packs and
contribution? What should we fix first — and what is wasted effort? When is it
worth adding people, speed or equipment?

## Inputs and minimum conditions
The goal in countable units (packs, cases, tonnes a shift); which resource
limits that count today (from Line capacity, a bottleneck walk, or running
data); losses classified **on** vs **off** the constraint; policy facts (batch
sizes, overtime rules, scheduling that pushes WIP).

## Procedure and calculation
**Step 1 — Identify** the system's constraint. List candidates; the one whose
extra hour would add the most goal units is the constraint (often one machine,
oven, hand-pack station or the slowest changeover family). Few links matter —
trivialities are not constraints.

**Step 2 — Exploit** the constraint. Use its existing capacity: eliminate idle
time at it, quality losses on it, setups that steal its minutes, and "stops
that only happen because upstream sent junk." Do **not** buy capacity yet.

**Step 3 — Subordinate** everything else. Release work to the constraint at the
rate it can consume — not at upstream's fastest rate. Protect it with buffer
where needed so it is never starved; do not overproduce into stock that the
constraint will never clear (`lean.tps-foundations` pull aligns here).

**Step 4 — Elevate** the constraint. When steps 2–3 are done, add capacity:
speed, people, hours, equipment, training — the expensive step.

**Step 5 — Return to step 1** when the old constraint is broken. **Warning
(Goldratt):** do not allow **inertia** to cause a system constraint — policies
that made sense for yesterday's bottleneck (big batches, utilisation targets on
non-bottlenecks) often become tomorrow's lock.

**Mirage arithmetic (Faultline):** recovered minutes **on** the constraint × its
rate = extra good output; recovered minutes **off** it = **0** extra output at
the pace-setter (labour may still be saved). See `scripts/knowledge/cases-toc.py`
§ FC-039: breakdown 40 min on constraint at 120/min, 20% back → 8 min, 960 packs;
jams 30 min off constraint, 100% back → 0 packs.

## Assumptions, limits and misuse
- The constraint moves with mix, season and every fix — one identification is
  not permanent.
- "Bottleneck by plate speed" may differ from the **running** constraint when
  labour or changeovers bind.
- Elevating before exploit/subordinate raises cost and risk for little gain (TOC
  Institute's common warning).
- Several near-equal constraints → treat as a system problem (`capacity.simulation`
  or explicit multi-constraint planning), not a single lever.

## Reading the result
"Capper is the constraint at 120 packs/min. Twenty minutes lost there is 2,400
packs; twenty minutes at the labeler is a mirage for output. Exploit first:
changeovers at the capper and micro-stops on it; subordinate: stop running the
depositor two hours ahead; elevate only after that."

## When not to use it — and instead
Several bottlenecks with no clear order winner → `capacity.simulation`. Pricing
decisions at the constraint → `capacity.throughput-accounting`. Drum-buffer-rope
scheduling detail → `capacity.dbr-buffer`.

## In food and FMCG manufacturing
The oven in baking, the filler or checkweigher in bottling, hand packing on
promotional SKUs, the slowest allergen changeover family — typical constraints.
Food safety stops **on** the constraint are doubly expensive: lost packs plus
hold and rework risk. Retail OTIF failures often trace to exploiting the wrong
step (warehouse labels fast, line starved).

## References
- [textbook] Goldratt, E.M. and Cox, J. (1984), *The Goal: A Process of Ongoing Improvement*, North River Press — constraint thinking in narrative form; edition on shelf 2004 (SOURCES); five steps formalised in later works.
- [textbook] Goldratt, E.M. (1990), *What Is This Thing Called Theory of Constraints?*, North River Press — the five focusing steps and the inertia warning; excerpt read online 23 November 2026 (Internet Archive host carrying publisher PDF excerpt).
- [practice] Goldratt Research Labs — *Introduction to Theory of Constraints*, five steps listed (identify, exploit, subordinate, elevate, go back to step 1); confirmed online 23 November 2026.
- [practice] Theory of Constraints Institute — *The Five Focusing Steps (POOGI)*; exploit before elevate; subordination and WIP; confirmed online 23 November 2026.

## In Faultline
`src/lib/intelligence/constraint.ts` (the constraint and the mirage), `src/lib/intelligence/levers.ts` (recovery levers),
the loss count's constraint (FC-038, FC-039). Since 1 November the line's capacity page says the **plan** the levers chosen
buy (`src/lib/intelligence/leversPlan.ts`, `knowledge/specs/FC-039-recovery-levers.md`): each lever's minutes, packs and
money a shift and a week — the lost contribution only at the constraint, the idle labour wherever the stop is, never summed —
where the prize is whatever share is chosen, and **Recovery plan on paper** (`src/lib/report/leversPaper.ts`). Proved by
`scripts/acceptance/recovery-levers.mjs` and `leversPlan.test.ts` against the case in `scripts/knowledge/cases-toc.py`.
Not yet: a plan kept as a record and carried onto a project's target; the five focusing steps as a project of their own
(the Theory of Constraints method, `docs/METHODS.md` §10, opens the tools that serve each step).

18 November correction: recovery totals state a monetary component only when every selected lever has that component priced. A non-constraint zero does not turn an unpriced constraint recovery into a £0 total. Known per-lever prices remain available; minutes and packs remain calculable. Mixed missing/partial/explicit-zero cases are verified in `leversPlan.test.ts`, with the mixed missing-cost screen and downloaded PDF in `recovery-levers.mjs`.

Record deepened 23 November 2026 — W-S2 shelf wave; five focusing steps aligned to public TOC excerpts (`knowledge/SOURCES.md`).