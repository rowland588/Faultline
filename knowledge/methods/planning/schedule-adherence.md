---
id: planning.schedule-adherence
name: Schedule adherence — was the plan made, run by run?
aka: [schedule attainment, plan attainment, production to plan, PTP, schedule compliance, on-time runs]
discipline: planning
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — schedule attainment as manufacturing-planning practice (from knowledge; the min(actual, plan) form as APICS and lean practice use it); the worked week in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [quality.pareto]
alternatives: []
related: [visual.daily-management, capacity.load-vs-demand, planning.forecast-accuracy]
---
# Schedule adherence — was the plan made, run by run?

## Purpose and principle
Output against plan says the week made 95%; schedule adherence says
which runs were made as planned and which were not — because making
4,000 extra of one product does not make up for 7,000 short of another
the customer ordered. Attainment credits each run only up to its plan,
so over-production earns nothing; the misses are listed by reason; and
the measure sits on the daily board (`visual.daily-management`) as the
planner's and the line's shared number. It is the schedule's quality,
not the line's volume.

## Questions it answers
- What share of the plan was made as planned (never more than 100%)?
- Which runs missed, by how much, and why?
- Is the plan unrealistic (misses on every product) or the line
  unreliable (misses on random products) — or the forecast wrong
  upstream (`planning.forecast-accuracy`)?

## Inputs and minimum conditions
- The plan per run (product, quantity, the day or shift) frozen at the
  planning horizon (not re-written to match what was made).
- Actual good output per run; the reasons for each miss from the line's
  records (the loss count, the register, materials).

## Procedure and calculation
- Attainment = Σ min(actual, plan) ÷ Σ plan over the period — over-
  production capped at plan; by run, by day, by line.
- Plain output ÷ plan beside it, so the two are seen apart (over-
  production shows as the gap between them).
- Runs on time (made in the shift planned) ÷ runs; a run made a day
  late is a miss for the day and a hit for the week — say which window.
- Misses listed: product, short by, reason (changeover over-ran,
  material short, breakdown, people short, plan changed) — the Pareto
  (`quality.pareto`) of reasons over the month; a reason that is the
  plan's (a changed plan, an unrealistic rate) is planning's to fix, one
  that is the line's goes to the loss count's causes.
- Money: a missed run's packs × margin where the customer's order is
  lost or expedited (`knowledge/MONEY.md`, T, C); over-production's
  stock (I).

**Worked case** (`cases-planning-foodsafety.py`): plan 60, 45, 30, 24
(thousand); actual 64, 38, 30, 20. Attainment Σ min ÷ Σ plan = 93.1%;
plain output ÷ plan 95.6% — the 4,000 over on Maris flatters the plain
figure. Misses: Tesco −7,000 (a changeover over-ran), Baby −4,000 (film
short); 2 of 4 runs on time. The over-run is SMED's; the film shortage
is materials'.

## Assumptions, limits and misuse
- A plan re-written on Thursday to match the week makes 100% every
  time; the plan judged is the one frozen at the horizon.
- Over-production counted as attainment hides the miss; the min() rule
  is the point.
- Attainment with no reasons is a score; with reasons it is a list of
  work.
- A low attainment on a plan built at plate speed is the plan's fault
  (`capacity.load-vs-demand`); the measure finds it.
- Adherence is not the customer's service level (orders filled on
  time) — that is downstream of it and measured there.

## Reading the result
"Plan attainment 93%: Tesco 7,000 short (the changeover over-ran),
Baby 4,000 short (film arrived late); 4,000 over on Maris earns
nothing. Two of four runs on time." Money: the short packs where the
order was lost or expedited (`knowledge/MONEY.md`, T, C); the
over-production as stock (I).

## When not to use it — and instead
Whether the plan could fit at all → `capacity.load-vs-demand`. Why the
line lost time → the loss count, `equipment.downtime-log`. The forecast
behind the plan → `planning.forecast-accuracy`. The board it sits on →
`visual.daily-management`.

## In food and FMCG manufacturing
Every line's daily and weekly board; the retailer's service level
traced back to the runs that missed; the planning–production meeting's
one shared number.

## References
- [practice] APICS/ASCM practice on schedule attainment; lean daily-management practice (from knowledge; no single public text).
- [textbook] Vollmann, T.E. et al., *Manufacturing Planning and Control for Supply Chain Management*, 6th ed., 2011 — shop-floor control measures (from knowledge).

## In Faultline
Not built (FC-185). The plan's runs are the line's programs and the
loss count holds the output and the stops (`src/line`, `src/tools/losses`);
FC-185 adds the frozen plan per run, attainment by the min rule beside
plain output, the misses with their reasons from the records, and the
money of the misses.
