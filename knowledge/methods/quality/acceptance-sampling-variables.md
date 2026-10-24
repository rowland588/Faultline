---
id: quality.acceptance-sampling-variables
name: Acceptance sampling by variables — the k-method on a measured characteristic
aka: [variables sampling, k-method, M-method, ISO 3951, ANSI Z1.9, acceptance by measurement]
discipline: quality
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — ISO 3951-1:2022 current (replaces 2013), scope checked online 22 Oct 2026: single sampling by AQL, one normally distributed characteristic; the k-method's design equations as Montgomery ch. 16 gives them (from knowledge); the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: [spc.normality-checks]
next: [quality.supplier-quality]
alternatives: [quality.acceptance-sampling-attributes]
related: [spc.capability-measured, stats.sample-size-power]
---
# Acceptance sampling by variables — the k-method on a measured characteristic

## Purpose and principle
When the characteristic is measured (seal strength, fill weight, Brix),
each reading carries far more information than good/bad, and a much
smaller sample gives the same protection — about a fifth to a third of
the attribute plan's n. The k-method accepts a lot when the sample mean
sits at least k standard deviations inside the limit; k and n are chosen
from the same two points as an attribute plan (the AQL with its α, the LQ
with its β). The price is an assumption: the characteristic is normal
within the lot.

## Questions it answers
- Can the lot be accepted from a small measured sample?
- What n and k give the protection both sides want?
- What fraction of the lot is beyond the limit, as the sample says?

## Inputs and minimum conditions
- A single measured characteristic with one or two specification limits,
  normal within the lot (checked: `spc.normality-checks`; a lot that mixes
  two streams is not one lot).
- The two points (p₁, α) and (p₂, β); whether σ is known (from history,
  stable — the σ-method) or estimated from the sample (the s-method).
- A random sample of n from the lot, measured with a fit gauge
  (`msa.gauge-rr`).

## Procedure and calculation
- One-sided lower limit L (upper U alike): Q = (x̄ − L)/s (or /σ); accept
  if Q ≥ k.
- Design (σ unknown): z_p₁, z_p₂ the normal quantiles of the two
  defective rates, z_α, z_β of the risks;
  k = (z_p₁·z_β + z_p₂·z_α)/(z_α + z_β);
  n = ((z_α + z_β)/(z_p₁ − z_p₂))² · (1 + k²/2) (σ known: without the
  bracket).
- Two-sided limits: the M-method — the estimated fraction beyond each
  limit from Q_L and Q_U (via the beta distribution for the s-method, the
  normal for σ known), summed and compared with the maximum M the standard
  tabulates for the plan; or, simply, both Q ≥ k and the estimated total
  fraction ≤ the LQ's.
- The implied fraction nonconforming from the sample: about Φ(−Q) (exact
  for σ known; the s-method uses the beta form).
- ISO 3951-1's tables index n and k by lot size and AQL with the same
  switching rules as ISO 2859-1; a plan's curve is computed from the
  normal as above.

**Worked case** (`cases-quality.py`): seal strength must be ≥ 10 N; AQL
1% at α 0.05, LQ 8% at β 0.10. k = 1.809; n = 27 with σ unknown (11 with
σ known) — against n = 125 for the attribute plan with the same points.
A sample of 20: x̄ 12.93 N, s 0.67 N, Q = 4.37 ≥ 1.81 → accept; the
implied fraction under 10 N is about 1 in 100,000.

## Assumptions, limits and misuse
- Normality within the lot is the whole basis; a bounded or two-stream
  characteristic breaks it, and the plan then accepts lots with a heavy
  tail. Check the shape on each lot's sample (a probability plot) or use
  the attribute plan.
- A sample of 20 cannot verify normality well; the assumption rests on the
  process's history (`stats.distribution-fitting`).
- σ "known" must be stable and current; an old σ makes a loose or
  needlessly tight plan.
- A destructive test (seal strength) makes every sample a cost; that is
  the reason to use variables, and the reason to keep n honest.
- Several characteristics each need their own plan; the lot is accepted
  only on all.

## Reading the result
"20 seals pulled: mean 12.9 N, spread 0.67, 4.4 standard deviations above
the 10 N minimum (k 1.81) — the lot is accepted; about 1 in 100,000 would
be under 10." Money: 20 destructive tests × the pack and the minutes
against 125 attribute inspections (`knowledge/MONEY.md` L, Q) — the saving
that pays for the gauge study.

## When not to use it — and instead
Good/bad only → `quality.acceptance-sampling-attributes`. The process
rather than the lot → `spc.capability-measured`. The characteristic not
normal and not transformable → the attribute plan on the limit.

## In food and FMCG manufacturing
Incoming film's seal strength or thickness; a batch's fill weight before
release; Brix or pH of a delivered syrup; net weight of a co-packed lot;
seal strength of a rework lot — anywhere the test is a measurement and
often destructive.

## References
- [standard] ISO 3951-1:2022, *Sampling procedures for inspection by variables — Part 1: Specification for single sampling plans indexed by AQL for lot-by-lot inspection for a single quality characteristic and a single AQL* — scope checked online 22 Oct 2026; tables not read.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 16 — variables sampling: the k-method, the M-method, design from two points (from knowledge; edition to confirm).
- [textbook] Schilling, E.G. and Neubauer, D.V., *Acceptance Sampling in Quality Control*, 3rd ed., 2017 (from knowledge).

## In Faultline
Research first (FC-130). The k-method's design and decision are a short
calculation on readings the capability study already takes; it could be
built as a mode of that study (the two points typed, n and k said, the
lot's sample read, accept or reject in words with the implied fraction)
once the normality check is on the lot's sample.
