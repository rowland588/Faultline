---
id: capacity.three-capacities
name: Design, effective and actual capacity — utilisation and efficiency told apart
aka: [design capacity, effective capacity, actual output, utilisation, efficiency, plannable capacity, nameplate capacity]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the three capacities and the two ratios as Stevenson's *Operations Management* defines them (from knowledge; 14th ed. to confirm); Faultline's arithmetic in `src/lib/ie/mix.ts` (threeNumbers) with its test; the worked week computed in `scripts/knowledge/cases-capacity.py`
needs: [capacity.line-capacity]
next: [capacity.load-vs-demand]
alternatives: []
related: [equipment.time-model-losses, capacity.v-curve, equipment.oee]
---
# Design, effective and actual capacity — utilisation and efficiency told apart

## Purpose and principle
"The line can do 120 a minute" is three different numbers depending on
who says it. Design capacity is what the machines could make running
flat out every minute of the week; effective (plannable) capacity is what
the line can be *planned* to make — at the standard's rate, in the hours
it is staffed, less the changeovers and breaks the plan knows about;
actual output is what it made. Two ratios follow and must never be
confused: utilisation (actual ÷ design — how much of the asset is used,
a decision about shifts and demand) and efficiency (actual ÷ effective —
how well the planned hours ran, the floor's measure). Reading the first
as the second is how a line that ran well is told it is at 12%.

## Questions it answers
- What can this line make a week if planned sensibly — and at the very
  most?
- Of the hours we planned, how much came out (efficiency)?
- Of the hours there are, how many do we use (utilisation) — is there a
  shift of headroom?
- Where did the gap between effective and actual go (the time model's
  losses)?

## Inputs and minimum conditions
- The line's plate speed and the bottleneck's rate (`capacity.v-curve`,
  `capacity.line-capacity`); the standard's plannable rate (the V-curve's
  margin applied, or the agreed standard).
- The hours in the week (design: 24 × 7; effective: the shifts staffed,
  less planned breaks, planned maintenance and the changeovers planned).
- The actual output for the same week, from the counts.

## Procedure and calculation
- Design capacity = plate (or bottleneck) rate × every minute of the
  period (24 h × 7 d).
- Effective capacity = plannable rate × planned running minutes (shifts
  staffed − breaks − planned maintenance − planned changeovers).
- Actual output = packs made (good packs, say which).
- Utilisation = actual ÷ design; efficiency = actual ÷ effective.
- The gap effective − actual, in packs and minutes, is read by the
  shift's time model (`equipment.time-model-losses`): stops, slow
  running, rejects — the loss count's waterfall.
- Headroom = design − effective, in shifts: what more staffing could add
  (a decision, not a loss).
- In money: the gap × margin a pack (`knowledge/MONEY.md`, T) for the
  efficiency shortfall; the headroom × margin for what another shift
  would earn, less its labour (L) — two different sums, said apart.

**Worked case** (`cases-capacity.py`): a packing line, one week. Design:
120/min × 24 × 7 = 1,209,600 packs. Effective: 100/min plannable (83% of
plate, the standard's target) × 2 shifts × 8 h × 5 days = 480,000.
Actual: 148,000. Utilisation 12.2%; efficiency 30.8%. Read as
utilisation, the line is idle most of the week — true, and a staffing
and demand decision; read as efficiency, the two shifts made less than a
third of what they were planned to — the question for the loss count.
The two sentences are about different people.

## Assumptions, limits and misuse
- Quoting one ratio as "capacity utilisation" without saying which is
  the usual misuse; the two differ by a factor of the staffing.
- Design capacity at the plate speed of the fastest machine is not
  capacity: the bottleneck sets it (`capacity.v-curve`).
- Effective capacity with the changeovers left out flatters the plan
  and makes every week "inefficient".
- Actual output counted as gross packs (rejects included) overstates
  efficiency; good packs is the measure.
- These are period figures; a week with a product mix needs the mix's
  rate (`src/lib/ie/mix.ts`).
- OEE multiplies three of these ratios into one number that hides which
  moved — the reason Faultline does not show it (`equipment.oee`).

## Reading the result
"Line 2 this week: planned for 480,000 at 100 a minute over two shifts;
made 148,000 — 31% of the plan. There is a third shift of headroom
(design 1.2 M) if demand wants it." Money: the plan's shortfall × margin
a pack for the efficiency gap (`knowledge/MONEY.md` T); the headroom
priced as a shift's contribution less its labour (L).

## When not to use it — and instead
Where the planned hours went → `equipment.time-model-losses` and the
loss count. Whether next week's orders fit → `capacity.load-vs-demand`.
The rate the line can hold → `capacity.line-capacity`, `capacity.v-curve`.

## In food and FMCG manufacturing
Every packing line's weekly review: the planner's number (effective), the
accountant's (utilisation of the asset) and the shift's (efficiency) in
one table, so the three stop arguing about one word.

## References
- [textbook] Stevenson, W.J., *Operations Management*, 14th ed., McGraw-Hill, 2021, ch. 5 — design and effective capacity, utilisation and efficiency (from knowledge; edition to confirm).
- [textbook] Slack, N., Brandon-Jones, A. and Burgess, N., *Operations Management*, 10th ed., Pearson, 2022 — capacity measurement (from knowledge).

## In Faultline
Arithmetic built (`src/lib/ie/mix.ts` threeNumbers, with its test; FC-041
partly — no page of its own). The load against demand uses the plannable
figure (`capacity.load-vs-demand`); Line capacity's shift view gives
the plannable rate. A page would put the three numbers and the two ratios
on the line's week with the loss count's gap beside them, in money.
