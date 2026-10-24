---
id: equipment.chronic-sporadic
name: Chronic or one-off — a loss that keeps coming back
aka: [chronic loss, sporadic loss, recurring loss, repeat failure, loss recurrence, restore vs investigate]
discipline: equipment
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the chronic/sporadic distinction as Juran (the Pareto of chronic waste against sporadic spikes) and TPM practice (Nakajima; JIPM) frame it (from knowledge); Faultline's own rule on six weeks in `src/lib/intelligence/recurrence.ts`, worked in `scripts/knowledge/cases-operations.py`
needs: [equipment.downtime-log]
next: [rca.fishbone-5whys]
alternatives: []
related: [equipment.downtime-log, maintenance.autonomous-maintenance, maintenance.criticality]
---
# Chronic or one-off — a loss that keeps coming back

## Purpose and principle
A loss that happens every week is a different thing from one that
happened once, even when the minutes are the same. Chronic losses are
small, frequent and accepted as "how the machine is" — a jam an hour, a
reel that always splices badly — and they are removed by restoring the
machine to its basic condition and by the operators' own checks.
Sporadic losses are sudden, large and noticed — a motor fails, a belt
splits — and they get a root-cause investigation. Telling the two apart
decides which method a loss gets; the Pareto alone does not, because a
chronic loss and a sporadic one can carry the same total.

## Questions it answers
- Is this loss chronic (restore, and keep restored), recurring (watch
  and find the pattern) or a one-off (investigate)?
- Which chronic losses are being tolerated, and what do they cost a
  year?
- Did the fix hold — has a chronic loss stopped recurring?

## Inputs and minimum conditions
- The downtime log by reason and machine over several weeks
  (`equipment.downtime-log`), with each stop's week.
- At least six weeks of record for the rule below; fewer and the
  verdict is "too early to say".

## Procedure and calculation
- Faultline's rule (`src/lib/intelligence/recurrence.ts`): over the last
  six weeks, count the weeks in which the loss appeared — in most (4 or
  more of 6): **chronic**; in one: **one-off**; in between (2–3):
  **recurring**.
- Chronic: the method is restoration and prevention — the machine's
  basic condition, the operators' checks and tags
  (`maintenance.autonomous-maintenance`), the standard — and the measure
  is the loss's weekly minutes falling to zero and staying there.
- Sporadic (one-off, large): the method is root cause
  (`rca.fishbone-5whys`, `rca.eight-d`) and the measure is "never again".
- Recurring: watch the pattern — the same shift, product, reel, person,
  temperature? — stratify (`rca.stratification`) before choosing.
- A chronic loss's yearly cost = its weekly minutes × 48 × the
  bottleneck's rate × margin (`knowledge/MONEY.md`, T) — usually the
  number that ends the tolerance.
- After a fix: the rule re-run on the weeks since; a chronic loss that
  reappears in 2 of the next 6 is "recurring", the fix did not hold.

**Worked case** (`cases-operations.py`): six weeks of the bagger's log.
"Jam at the infeed" appears in 5 of 6 weeks → chronic (restore: the
guide rails and the operators' start-of-shift check). "Belt split" in 1
of 6 → one-off (investigate: why did it split?). "Label skew" in 3 of 6
→ recurring (watch: which reels, which shift?). The jam's 40 minutes a
week at 120/min and 4p margin is £9,200 a year — tolerated.

## Assumptions, limits and misuse
- Six weeks is Faultline's window, chosen for a monthly rhythm with
  margin; a seasonal loss needs a longer one and says so.
- A chronic loss investigated as a one-off wastes an investigation on
  a symptom (the cause is "no standard"); a sporadic one "restored" comes
  back.
- Reasons coded loosely ("mechanical") merge a chronic jam with a one-
  off breakdown; the log's reasons must be specific.
- "Chronic" is a judgement about *acceptance* as much as frequency; the
  rule names the frequency, the people name the acceptance.
- A loss not in the log (short stops nobody times) is chronic by
  definition and invisible (`equipment.short-stops-speed`).

## Reading the result
"The infeed jam is chronic — in 5 of the last 6 weeks, 40 minutes a week,
£9,200 a year accepted as normal: restore the guides and put the check on
the start-of-shift sheet. The belt split is a one-off: find out why."
Money: the chronic loss's yearly cost (`knowledge/MONEY.md`, T) is the
sentence that turns tolerance into a job.

## When not to use it — and instead
The log and the Pareto themselves → `equipment.downtime-log`. The root
cause of a one-off → `rca.fishbone-5whys`. The operators' restoration
routine → `maintenance.autonomous-maintenance`. Which machines first →
`maintenance.criticality`.

## In food and FMCG manufacturing
The jam everyone clears without logging; the splice that fails on one
film supplier's reels; the checkweigher that false-rejects on Mondays;
the belt that split once in a year — four losses, three methods.

## References
- [textbook] Juran, J.M., *Managerial Breakthrough*, McGraw-Hill, 1964 — chronic waste against sporadic spikes; control versus breakthrough (from knowledge).
- [textbook] Nakajima, S., *Introduction to TPM*, 1988; Suzuki, T. (ed.), *TPM in Process Industries*, 1994 — chronic losses and restoration (from knowledge).

## In Faultline
Built: the six-week rule (`src/lib/intelligence/recurrence.ts`, FC-054)
says chronic · recurring · one-off on a line's losses, proved by its
tests. Not yet: the yearly cost of a chronic loss said beside the verdict,
and the fix's hold re-checked by the rule.
