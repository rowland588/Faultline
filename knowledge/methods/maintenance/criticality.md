---
id: maintenance.criticality
name: Asset criticality — which machines matter most, by consequence and likelihood
aka: [criticality analysis, criticality ranking, asset criticality matrix, ABC assets, risk ranking of equipment]
discipline: maintenance
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the consequence × likelihood matrix as asset-management practice (ISO 55000 family for context; no single standard defines the scales — from knowledge); the worked case in `scripts/knowledge/cases-maintenance.py`; the consequence side in money from `knowledge/MONEY.md`
needs: []
next: [maintenance.rcm, maintenance.spares-poisson]
alternatives: [quality.fmea]
related: [maintenance.planned-maintenance, capacity.theory-of-constraints, equipment.chronic-sporadic]
---
# Asset criticality — which machines matter most, by consequence and likelihood

## Purpose and principle
Maintenance effort, spares money and analysis time are finite; the
machines that would hurt most if they failed — and are likely to — get
them first. Criticality scores each asset on the consequence of its
failure (the line stopped or slowed, safety, food safety, quality,
repair cost, lead time to recover) and the likelihood (its failure
history), and ranks them into classes: A gets RCM, condition monitoring
and spares on the shelf; C runs to failure. It is a ranking, made once a
year and after any change, not an analysis of failure modes — that is
RCM's.

## Questions it answers
- Which machines are the critical few, and why?
- Where do the spares budget, the PM hours and the RCM study go first?
- Has a machine's criticality changed (a new bypass, a new product, a
  worse history)?

## Inputs and minimum conditions
- The asset list (the line's machines — `src/line` holds them) with
  whether each is the bottleneck or has a bypass or redundancy
  (`capacity.theory-of-constraints`).
- Each asset's failure history (stops and their minutes from the loss
  count and the register; MTBF from the reliability study) and its
  repair lead time.
- The scales written down before scoring (below), and the people who
  know the line in the room.

## Procedure and calculation
- **Consequence** C (1–5), the worst credible failure, on the highest of
  several dimensions: production (5: stops the bottleneck or the whole
  line for a shift or more; 3: slows it or stops a non-bottleneck with a
  buffer; 1: no effect on output); safety and food safety (5: a hazard
  or a CCP device; 1: none); quality (5: product at risk unseen; 1:
  none); repair (5: parts weeks away, specialist needed; 1: swapped in
  minutes). In money the production dimension is the lost contribution
  over the time to recover (`knowledge/MONEY.md`, T).
- **Likelihood** L (1–5) from the history: 5 fails monthly or more; 3
  yearly; 1 not in memory — or from the MTBF against the planning
  horizon.
- Score = C × L (1–25) or the cell in a 5×5 matrix; classes A (≥ 15,
  or any safety 5), B (8–14), C (< 8). The thresholds are the site's,
  written down.
- Overrides said in words: a CCP device is A whatever its score; a
  machine with a full standby drops a class.
- Review yearly and after a change of product, speed or layout; the
  failure history re-read each time.
- The class drives: A → RCM (`maintenance.rcm`), spares at a high
  service level (`maintenance.spares-poisson`), condition checks, first
  in the PM backlog; B → PM to the schedule, spares at a lower level;
  C → run to failure, no spares beyond consumables.

**Worked case** (`cases-maintenance.py`): the wrapper's jaws — C 5 (the
bottleneck stops) × L 4 (fails most months) = 20 → A. The checkweigher
— C 5 (a CCP device) × L 2 = 10 → B by score, **A by the safety
override**. Conveyor 3 — C 2 (a buffer behind it) × L 4 = 8 → B. The
label printer — 3 × 3 = 9 → B. The spare pump — 1 × 2 = 2 → C.

## Assumptions, limits and misuse
- Scores argued without the scales' anchors are opinions; the anchors
  are read out.
- Consequence scored on the *typical* failure understates it; the worst
  credible failure is the measure.
- A machine behind a big buffer is less critical than its size suggests;
  a small one at the bottleneck more.
- Likelihood from memory favours the dramatic; the loss count's numbers
  are the input.
- Criticality is not a maintenance plan; it says where to spend the
  analysis.
- Done once and filed, it is wrong within a year.

## Reading the result
"Six A assets on Line 2: the wrapper, the filler, the checkweigher (a
CCP), the metal detector, the chiller, the coder — they get the RCM
study, spares at 99% and first call on the PM hours." Money: the A
class's consequence in lost contribution a shift (`knowledge/MONEY.md`,
T) is the sum the maintenance budget is protecting — the sentence that
justifies the spares and the study.

## When not to use it — and instead
Failure modes and their tasks → `maintenance.rcm`. Quality failure
modes → `quality.fmea`. Which stop reason costs most this month →
`equipment.chronic-sporadic`, the loss count.

## In food and FMCG manufacturing
The line's twelve machines ranked: wrapper, filler and the CCP devices at
the top; conveyors and date coders in the middle (unless the coder is the
only one and the retailer rejects an uncoded pack — then A); the spare
pump at the bottom.

## References
- [standard] ISO 55000:2014, ISO 55001:2014 — asset management: risk-based decisions on assets (context; from knowledge).
- [textbook] Moubray, J., *RCM II*, 2nd ed., 1997 — selecting assets for analysis (from knowledge).
- [practice] Industry practice — the 5×5 consequence × likelihood matrix as used by maintenance and asset-management functions; no single public text (from knowledge).

## In Faultline
Built (FC-064): scored register `criticality` at `#/scored/criticality` (`src/lib/ie/criticality.ts`, `src/tools/scored/defs/criticality.ts`). The line's machines, their stops and the bottleneck
are already records (`src/line`, `src/tools/losses`, `src/tools/capability`);
FC-064 scores each machine on the written scales with the loss count's
history as the likelihood and the lost contribution as the consequence,
ranks them A/B/C with the overrides said, and hands the A list to the
spares and RCM records.
