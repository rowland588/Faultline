---
id: maintenance.reliability-growth
name: Is the new machine getting more reliable? — reliability growth (Crow-AMSAA)
aka: [reliability growth, Crow-AMSAA, Duane plot, NHPP power law, bedding in, infant mortality curve, growth tracking]
discipline: maintenance
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the power-law (Crow-AMSAA) model, its time-truncated MLEs, the Cramér–von Mises fit test and the Laplace trend as MIL-HDBK-189C (2011) and IEC 61164:2004 give them (from knowledge; texts not read — the C² critical value quoted is from memory of the handbook's table, to confirm); the worked case computed independently in `scripts/knowledge/cases-maintenance.py`
needs: [maintenance.mtbf-failure-rate]
next: [commissioning.acceptance-tests]
alternatives: []
related: [commissioning.ramp-up, maintenance.weibull, spc.held-at-rate]
---
# Is the new machine getting more reliable? — reliability growth (Crow-AMSAA)

## Purpose and principle
A new line stops often in its first weeks and less as faults are found
and fixed; an old one stops more as it wears. An MTBF over the whole
period hides both. The Crow-AMSAA model fits the cumulative failures
against cumulative running time as a power law, N(t) = λt^β: β < 1 means
the failure rate is falling (growth — the fixes are working), β = 1 a
steady rate, β > 1 rising. From it come the *instantaneous* MTBF now
(not the average since day one), the growth rate, and the hours of
running needed to reach the MTBF the contract or the plan wants. It is
the honest way to track a commissioning's reliability and to tell an OEM
whether their fixes are taking.

## Questions it answers
- Is the failure rate falling, steady, or rising?
- What is the MTBF *now*, as against since the start?
- At this rate of improvement, when will it reach the MTBF agreed?
- Did the last round of fixes change the slope?

## Inputs and minimum conditions
- Every failure's cumulative running time (hours the machine ran up to
  that failure — not clock time; stops and idle excluded), in order,
  from a start point; the total running time T at the end.
- At least 8–10 failures for a β worth quoting; 20+ to see a change of
  slope.
- One machine (or a fleet of like machines with pooled time), one
  definition of a failure kept throughout.

## Procedure and calculation
- Time-truncated test (observation ends at time T, not at a failure):
  β̂ = n / Σ ln(T/tᵢ); λ̂ = n / T^β̂. (Failure-truncated: the sum over the
  first n − 1 and n − 1 in the numerator.)
- Cumulative MTBF at T = T/n; **instantaneous** MTBF at T =
  1 / (λ̂β̂T^(β̂−1)) — the figure to quote for "now"; the growth rate is
  1 − β̂.
- Unbiased β̄ = (n − 1)/n · β̂ for small n.
- Fit: Cramér–von Mises C² = 1/(12n) + Σ[(tᵢ/T)^β̄ − (2i − 1)/(2n)]²;
  against the handbook's critical value (about 0.218 at n = 14, 5%) — a
  larger value means the power law does not fit (a step change, two
  phases).
- Trend without a model: the Laplace test U = (Σtᵢ/n − T/2) /
  (T√(1/(12n))); U < −1.645 is improving at 90%, > +1.645 worsening
  (`maintenance.mtbf-failure-rate` already uses it).
- Projection: the running time to reach a wanted instantaneous MTBF M:
  T_M = (1/(M·λ̂·β̂))^(1/(β̂ − 1)) — valid only if the growth continues at
  the same rate (it will not without continued fixing).
- The Duane plot (log cumulative MTBF against log time) is the same model
  drawn; a change of slope marks a change in the fixing effort.
- Confidence bounds on β and on the instantaneous MTBF from the
  handbook's tables or the Fisher matrix when the decision is close.

**Worked case** (`cases-maintenance.py`): a new wrapper's first 2,000
running hours, 14 failures at 12, 35, 61, 102, 148, 230, 310, 420, 560,
720, 980, 1,250, 1,600, 1,900 h. β̂ = 0.51 — improving fast (growth rate
0.49); λ̂ = 0.295. Cumulative MTBF 143 h; instantaneous MTBF at 2,000 h
281 h — twice the average, the number that describes the machine today.
C² = 0.027 (fits); Laplace U = −2.63 (improving at 90%). To reach a 400 h
instantaneous MTBF at this rate: about 4,100 running hours — another
2,100 h, if the fixing keeps pace.

## Assumptions, limits and misuse
- Running time, not calendar time; a week idle is not a week of growth.
- Fixes must be real: growth comes from corrective action, not from
  time; a flat β near 1 with many "fixes" means the fixes were not.
- Mixed machines or a changed failure definition break the fit; the C²
  test and the plot say so.
- The projection assumes the same effort continues; quote it as "if".
- Early in a test (n < 8) β swings wildly; wait.
- A rising β (> 1) on a new machine is a design or installation problem,
  not bedding in.

## Reading the result
"The wrapper is bedding in: failures are coming half as fast as at the
start (β 0.5); its MTBF now is about 280 h against 140 h averaged since
install; at this rate it reaches the agreed 400 h after about 2,100 more
running hours." Money: each hour of MTBF short of the target is stops ×
the line's lost minutes (`knowledge/MONEY.md`, T) — and the growth curve
says what the next round of fixes is worth.

## When not to use it — and instead
A steady machine's rate and its bounds → `maintenance.mtbf-failure-rate`.
How a specific part's failures spread with age → `maintenance.weibull`.
The climb of *output* to rate (not failures) → `commissioning.ramp-up`.
Whether the rate was held in a test → `spc.held-at-rate`.

## In food and FMCG manufacturing
A new line's first months (the OEM's warranty argument settled with a
slope, not an anecdote); a rebuilt machine's first weeks; a line after a
major changeover of product or film; a fleet of identical fillers across
sites.

## References
- [standard] MIL-HDBK-189C (2011), *Reliability Growth Management* — the Crow-AMSAA model, MLEs, goodness-of-fit, projection (from knowledge; text not read).
- [standard] IEC 61164:2004, *Reliability growth — Statistical test and estimation methods* (from knowledge).
- [paper] Crow, L.H. (1974), "Reliability analysis for complex, repairable systems", in *Reliability and Biometry*, SIAM, 379–410 (from knowledge).
- [paper] Duane, J.T. (1964), "Learning curve approach to reliability monitoring", *IEEE Trans. Aerospace* 2(2), 563–566 (from knowledge).

## In Faultline
Not built (FC-061). The reliability study already records failures
against watched time and says the Laplace trend in words
(`src/tools/reliability`); FC-061 adds the power-law fit on a study
carried across days, the instantaneous MTBF beside the cumulative, the
growth rate, the projection as an "if", and the plot — on the study and
on the stage-gate project's commissioning paper.
