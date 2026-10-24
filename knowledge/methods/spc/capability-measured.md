---
id: spc.capability-measured
name: Capability and performance of measured data — Cp, Cpk, Pp, Ppk
aka: [process capability, capability index, Cpk, Ppk, process performance, capability study]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — ISO 22514-2:2017 scope read online (continuous characteristics only, eight distribution models, under revision); formulas as the AIAG SPC manual and Montgomery give them; the confidence bound is Bissell (1990); Faultline's arithmetic proved in src/tools/capability/__tests__/sample.test.ts and src/lib/__tests__/audit-ie-sample.test.ts
needs: [spc.normality-checks, spc.control-charts-variables, msa.type1-gauge]
next: [quality.control-plan, stats.doe-factorial, spc.control-charts-variables]
alternatives: [spc.capability-nonnormal, spc.capability-attribute-proportion, spc.capability-attribute-defects, spc.machine-capability, packaging.average-quantity-system]
related: [stats.confidence-intervals, yield.giveaway, spc.zero-failure-demonstration]
---
# Capability and performance of measured data — Cp, Cpk, Pp, Ppk

## Purpose and principle
Whether a process whose output is *measured on a continuous scale* (grams,
newtons, °C, millimetres, packs a minute) produces inside limits that were
agreed before anything was measured — and, from its spread, how much of it
would fall outside if it carried on as it is. The indices compare the room
the specification allows with the room the process takes up: 6σ of spread
against the width between the limits, and 3σ against the distance from the
mean to the nearer limit.

Two families, and the difference matters:
- **Performance (Pp, Ppk)** uses the *overall* standard deviation of every
  reading — what the process actually did across the study, drift included.
- **Capability (Cp, Cpk)** uses the *within* standard deviation — the
  short-term variation from one reading to the next (or within subgroups) —
  what the process could do if nothing shifted between readings.

A process that drifts has Cpk well above Ppk. A stable process has the two
close together.

## Questions it answers
- Will this filler, weigher, sealer or oven hold the specification all shift?
- Which limit will it fail on first, and how much would fall outside?
- Is the problem the spread (Cp low) or the centring (Cp fine, Cpk low)?
- Is the process drifting across the run (Cpk well above Ppk)?
- Is a change to the machine an improvement (before → after on the same limits)?

## Inputs and minimum conditions
- Individual readings **in the order taken**, each with its time (the order
  is what the within spread is worked from).
- The unit, and the limits: a lower (LSL), an upper (USL), or both — from
  the specification, the customer or the law, **never from the data**.
  One limit is a one-sided study ("at least 12 N", "at most 2% O₂").
- Measurement fit for the job: resolution no coarser than a tenth of the
  tolerance as a rule of thumb, and a gauge whose own error is small against
  the spread (`msa.type1-gauge`, `msa.gauge-rr`).
- Enough readings: the AIAG manual's capability study works from about 25
  subgroups (around 100 readings); practice for individual readings is 50 to
  100; below about 30 the index's confidence interval is so wide that the
  figure is a rough guide only. Faultline says the index from 25 readings and
  says how sure it is.
- The process in statistical control over the study (`spc.control-charts-variables`).

## Procedure and calculation
With readings x₁…xₙ, mean x̄:
- Overall spread s = √(Σ(xᵢ − x̄)² / (n − 1)).
- Within spread for individual readings: σ̂w = MR̄ / d₂, MR̄ the mean of
  |xᵢ − xᵢ₋₁|, d₂ = 1.128. For subgroups of size m: R̄ / d₂(m) or s̄ / c₄(m)
  (constants in `spc.control-charts-variables`).
- Pp = (USL − LSL) / 6s;  Ppu = (USL − x̄) / 3s;  Ppl = (x̄ − LSL) / 3s;
  Ppk = min(Ppu, Ppl). One limit: Ppk is that side's alone; Pp is not defined.
- Cp, Cpu, Cpl, Cpk: the same with σ̂w in place of s.
- Share expected outside (normal model): Φ(−3·Ppl) below plus Φ(−3·Ppu) above.
  Ppk 1.00 ≈ 1,350 per million on the near side; 1.33 ≈ 32; 1.67 ≈ 0.3.
- How sure (approximate one-sided lower bound, Bissell 1990):
  Ppk_low = P̂pk − z·√(1/(9n) + P̂pk²/(2(n − 1))), z = 1.645 for 95%.
  For Cp/Pp the χ² interval: P̂p·√(χ²(α/2; n−1)/(n−1)) to P̂p·√(χ²(1−α/2; n−1)/(n−1)).
- Common thresholds: 1.33 for a running process; 1.67 for a new process or
  a safety- or law-critical characteristic (AIAG PPAP practice). Faultline:
  capable from 1.33, just capable from 1.00.
- Round the indices to two decimals; the mean and spread to one more place
  than the readings were taken to, never more.

## Assumptions, limits and misuse
- **Stability first.** An index from an unstable process describes the past
  and predicts nothing. Check the readings over time before believing it.
- **Normality.** The share outside comes from the tails of a normal curve.
  Skewed data — anything bounded at zero (residual oxygen, leak rate, time
  to failure), anything sorted (packs after a checkweigher has thrown out
  the light ones), anything from a combination weigher choosing at or
  above target — makes the normal tail wrong, usually optimistic
  (`spc.capability-nonnormal`).
- **Independence.** Readings taken too close together (consecutive packs
  from one head) are autocorrelated: the moving range shrinks and Cpk is
  inflated (`stats.autocorrelation`).
- **Mixtures.** Several heads, lanes, cavities or products in one study give
  a lumpy distribution and a meaningless index — stratify first.
- **Measurement error** adds to s: a poor gauge makes a good process look
  incapable. Coarse resolution makes ties that fail every normality test.
- **Limits from the data** (mean ± 3s) make every process "capable".
- **Counted data** — rejects, defects, percentages — are not measured data;
  Cpk on a reject percentage is a misuse (`spc.capability-attribute-proportion`).
- Small samples give confident-looking numbers with wide uncertainty; say
  the bound.

## Reading the result
- Ppk and its bound against the threshold; the side it is nearer; the share
  that would fall outside, said as "about 2 in 1,000 light".
- Cp ≫ Cpk: centre it (a setpoint change is cheap). Cp < 1: the spread is
  too wide for the limits whatever the setting — the machine, the method or
  the material, not the setpoint.
- Cpk ≫ Ppk: it drifts — look at what changed across the run (hopper level,
  temperature, operator, reel change) with a control chart.
- Before → after on the same limits and the same measurement: "the number
  moved"; what moved it is the fix's to say.

## When not to use it — and instead
- Good/bad or counted data → `spc.capability-attribute-proportion`, `spc.capability-attribute-defects`.
- A pass/fail demonstration with few items → `spc.zero-failure-demonstration`.
- Readings not bell-shaped → `spc.capability-nonnormal`.
- The machine alone over a short run (acceptance) → `spc.machine-capability`.
- Packs sold by weight or volume under the law → `packaging.average-quantity-system`
  (its rules, not Cpk, decide legal compliance).
- Not yet stable → `spc.control-charts-variables`, find the special causes first.

## In food and FMCG manufacturing
Fill weight against a customer's give-away ceiling and the legal floor;
seal strength (at least, ASTM F88 peel); core temperature after cooking (at
least); residual oxygen in a modified-atmosphere pack (at most — skewed,
bounded at zero); slice thickness; label position; salt or moisture %; a
machine's speed counted each minute (at least, or at most its rated top).
A multihead weigher's output is often not normal (it chooses a combination
at or above target), so check the shape before trusting the tail.

## References
- [standard] ISO 22514-2:2017, *Statistical methods in process management — Capability and performance — Part 2: Process capability and performance of time-dependent process models* — scope checked online 22 Oct 2026; under revision.
- [standard] ISO 22514-4:2016, *Part 4: Process capability estimates and performance measures* — from knowledge; edition to confirm.
- [manual] AIAG, *Statistical Process Control (SPC) Reference Manual*, 2nd ed., 2005 — capability and performance chapter.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, Wiley, 8th ed., 2019 — process capability chapter.
- [paper] Bissell, A.F. (1990), "How reliable is your capability index?", *Applied Statistics* 39(3), 331–340.
- [textbook] Kotz, S. and Johnson, N.L. (1993), *Process Capability Indices*, Chapman & Hall.
- [practice] NIST/SEMATECH *e-Handbook of Statistical Methods*, §6.1.6, process capability.

## In Faultline
`src/tools/capability/sample.ts` works out Pp/Ppk from the overall spread and Cp/Cpk
from MR̄ ÷ 1.128, the share outside from the normal tails (`upperTail`),
says the drift when Cpk − Ppk ≥ 0.2, gives indices from 25 readings, and
calls 1.33 capable and 1.00 just capable; the page is
`src/tools/capability/StudyScreen.tsx`, the paper `src/lib/studiesPdf.ts`. Since 22
October (`knowledge/specs/FC-094-capability.md`, part 1): one limit is
offered in words (*At least*, *At most*); Bissell's 95% lower bound is said
beside Ppk (`ppkLowerBound` in `src/lib/ie/dist.ts`); the checks before
capability are said with it (`spc.normality-checks`) — a capable index on
readings not steady or not bell-shaped is never green, and on readings not
bell-shaped the share outside is the count as measured, not the normal
tail; the histogram is drawn on the page and the paper. Catalogue: FC-094,
FC-095.
