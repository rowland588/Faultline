---
id: equipment.cost-deployment
name: Cost deployment — the losses mapped to causes and money (WCM)
aka: [cost deployment, WCM pillar, loss-cost matrix, A/B/C/D matrices, causal and resultant losses, loss stratification in money]
discipline: equipment
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — World Class Manufacturing's cost deployment as Yamashina & Kubo (2002) describe it and as WCM programmes practise it (from knowledge; the matrices' letters and steps vary by implementation); the worked week's matrix in `scripts/knowledge/cases-operations.py`; the money by `knowledge/MONEY.md`
needs: [equipment.time-model-losses, cost.line-cost-model]
next: [projects.ci-programme]
alternatives: []
related: [quality.copq, equipment.downtime-log, capacity.throughput-accounting]
---
# Cost deployment — the losses mapped to causes and money (WCM)

## Purpose and principle
Every loss the line has — breakdowns, changeovers, short stops, speed,
rejects, give-away, waiting, logistics — is laid in a matrix against the
processes where it occurs, each cell valued in money from the line's
cost model; then each loss is traced to the process that *causes* it
(a filler's hopper stops cause the bagger's starvation) so the money
lands where the fix is; then the losses are ranked and the improvement
projects chosen by what they return against what they cost. It is the
WCM pillar that turns a factory's losses into a costed, ranked list of
projects, and it is the money-side twin of the cost of poor quality.

## Questions it answers
- What do the line's losses cost in total, by type and by process?
- Where is each loss *caused* (not only where it shows)?
- Which project returns most per pound spent, and what will the savings
  be?
- Did last quarter's projects deliver what the matrix said?

## Inputs and minimum conditions
- The losses in time and quantity from the records: the time model and
  the stop log (`equipment.time-model-losses`, `equipment.downtime-log`),
  the speed and short stops, the rejects and give-away (the capability
  study), the waste (`yield.food-waste`).
- The cost model (`cost.line-cost-model`, `knowledge/MONEY.md` §3): the
  bottleneck's rate and margin, the labour rate, materials a pack.
- Knowledge of the line to trace causal links (the team, the fishbone).

## Procedure and calculation
- **Loss matrix** (losses × processes): each cell the loss's amount
  (minutes, packs, kg) in the period.
- **Causal/resultant**: for each cell, the process that causes it; a
  resultant loss (the bagger starved) moves its value to the causal
  process (the filler) — the matrix is re-summed by cause.
- **Cost matrix**: each cell valued — time at the bottleneck × rate ×
  margin (T); labour idle (L); rejects × materials (Q); give-away ×
  £/kg (Q); waste × material cost (Y); energy (E) — each by the
  money model's causation, never a blended rate.
- **Pareto** of losses in money, by cause; the top losses and the
  processes they sit in.
- **Projects**: for each top loss the method that addresses it (SMED
  for changeover, AM for chronic stops, a capability study for
  give-away …), the expected recovery (a share of the loss, said as a
  share), its cost, and the return = recovery × periods ÷ cost; ranked.
- **Follow-up**: the loss's cell re-measured after the project; the
  saving is the difference, booked only when measured.

**Worked case** (`cases-operations.py`): one line, one week in money —
breakdowns £3,000 (bagger £2,400, filler £600), give-away £2,200
(filler), changeover £1,900 (bagger), short stops £1,900 (bagger
£1,500, case packer £400), rejects £1,100; total £10,100 a week. Causal
trace: the bagger's starvation minutes behind the filler's hopper stops
are the filler's loss, not the bagger's. A SMED project expected to
return 60% of the changeover loss: £1,140 a week, £54,700 a year —
against a £28,000 kit, a six-month payback (`cost.investment-appraisal`).

## Assumptions, limits and misuse
- A matrix filled with estimates is an argument; the cells come from
  records (the loss count, the log, the studies) or stay empty and say
  so.
- Double counting: a stop's lost contribution and its idle labour are
  two parts, never added into one "cost of downtime" (the two-parts
  rule); a reject's materials once.
- Valuing every lost minute at the bottleneck rate when the loss is
  elsewhere overstates it (the buffer's cover).
- Savings "expected" are not savings; the follow-up cell is the only
  proof.
- WCM's full seven-step cost deployment with A–G matrices is a
  programme; a line can do the loss matrix, the causal trace and the
  ranked projects in a week and get most of the value.

## Reading the result
"Line 2's losses cost £10,100 a week: breakdowns £3,000, give-away £2,200,
changeovers £1,900. Two of the bagger's losses are caused at the filler.
The SMED kit returns £1,140 a week for £28,000 — six months." Money is the
method; every cell cites its causation from `knowledge/MONEY.md`.

## When not to use it — and instead
Quality costs in the PAF buckets → `quality.copq`. The product-mix
decision on a full constraint → `capacity.throughput-accounting`. The
projects' programme and its follow-up → `projects.ci-programme`. One
loss's root cause → `rca.fishbone-5whys`.

## In food and FMCG manufacturing
The site's quarterly loss review: packing lines' stops, changeovers and
give-away, process lines' yield and energy, the warehouse's waiting —
one matrix in pounds that decides which three projects run next and what
they must return.

## References
- [paper] Yamashina, H. and Kubo, T. (2002), "Manufacturing cost deployment", *International Journal of Production Research* 40(16), 4077–4091 (from knowledge).
- [practice] World Class Manufacturing (the Fiat/Yamashina programme) — the cost deployment pillar and its matrices (from knowledge; no single public text).
- [textbook] Suzuki, T. (ed.), *TPM in Process Industries*, 1994 — loss structure and the cost of losses (from knowledge).

## In Faultline
Built (FC-057): calculator `cost-deployment` at `#/calc/cost-deployment`
— loss matrix in pounds by type and process, optional causal moves,
Pareto and one project's recovery and payback (`lib/ie/costDeployment`).
The losses are still counted in their own tools (`src/tools/losses`,
`src/tools/capability`, `src/lib/problemCost.ts`); cells stay empty until
you type or link them. Savings are booked only from the re-measured cell.
