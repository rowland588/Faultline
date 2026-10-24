---
id: quality.acceptance-sampling-attributes
name: Acceptance sampling by attributes — the OC curve, AQL and the lot's risk
aka: [acceptance sampling, sampling plan, OC curve, AQL, LTPD, LQ, single sampling, n and c, ISO 2859, ANSI Z1.4]
discipline: quality
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the binomial/hypergeometric OC curve, AOQ, ATI and the producer's and consumer's risks as Montgomery ch. 15 gives them (from knowledge); ISO 2859-1:1999 (with its 2011 amendment) named from knowledge — its tables are copyright and not reproduced here (`knowledge/GAPS.md`); every figure in the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: []
next: [quality.supplier-quality]
alternatives: [spc.zero-failure-demonstration, quality.acceptance-sampling-variables]
related: [stats.confidence-intervals, spc.capability-attribute-proportion]
---
# Acceptance sampling by attributes — the OC curve, AQL and the lot's risk

## Purpose and principle
A lot arrives (a delivery of film, a pallet of lids, a batch of packs
before release); n are inspected, each good or bad; the lot is accepted
if the bad ones are c or fewer. The plan (n, c) is a bet with two risks,
and the operating characteristic (OC) curve states them exactly: the
chance of accepting a lot at each true defective rate. A plan is honest
only when both sides have read the curve — the supplier at the AQL, the
user at the quality they will not tolerate.

## Questions it answers
- With this plan, what is the chance of accepting a lot that is 1%
  defective? 5%? 8%?
- What n and c give the protection wanted at both ends?
- What is the outgoing quality after sorting rejected lots (AOQ), and the
  total inspection it costs (ATI)?

## Inputs and minimum conditions
- The lot size N (only matters when n is a tenth of N or more); the
  sample n drawn at random from the whole lot; c the acceptance number.
- Both parties' points: the AQL p₁ with the producer's risk α (usually
  0.05) and the limiting quality LQ (LTPD) p₂ with the consumer's risk β
  (usually 0.10).
- A clear definition of a defective, and inspectors who agree
  (`msa.attribute-agreement`).

## Procedure and calculation
- OC curve: Pa(p) = Σ_{d=0}^{c} C(n, d) pᵈ (1 − p)ⁿ⁻ᵈ (binomial; the
  hypergeometric with N when n/N > 0.1 — a smaller Pa).
- Design: find the smallest n and c with Pa(p₁) ≥ 1 − α and Pa(p₂) ≤ β
  (search c = 0, 1, 2 …; for each, the n that meets p₂ and check p₁).
- Average outgoing quality (rectifying inspection, rejected lots sorted
  100% and defectives replaced): AOQ(p) = p·Pa(p)·(N − n)/N; its maximum
  over p is the AOQL — the worst average quality that can leave.
- Average total inspection: ATI(p) = n + (1 − Pa(p))·(N − n).
- Double and multiple plans (ISO 2859-1's) cut the average sample for the
  same curve; switching rules (normal → tightened after 2 of 5 lots
  rejected; → reduced after 10 accepted) protect the user from a supplier
  who has slipped. Their tables are the standard's; the curve of any plan
  they give is computed as above.
- c = 0 plans: the zero-failure relation n = ln β / ln(1 − p₂)
  (`spc.zero-failure-demonstration`) — small n, but Pa at the AQL is poor
  (good lots rejected often).

**Worked case** (`cases-quality.py`): n = 125, c = 3. Pa: 0.996 at 0.5%,
0.963 at 1%, 0.759 at 2%, 0.481 at 3%, 0.124 at 5%, 0.008 at 8%. At an
AQL of 1% the producer's risk is 3.7%; the LQ (Pa = 0.10) is 5.3%. With
N = 3,000 under rectifying inspection the AOQL is 1.5% (at p ≈ 2%) and the
ATI at 2% is 819 of 3,000. The smaller plan n = 50, c = 1: Pa 0.911 at 1%
(producer's risk 8.9%), LQ 7.6% — cheaper, looser at both ends. A small
lot: N = 200, n = 50, c = 1 at 5% defective: hypergeometric Pa 0.237
against the binomial's 0.279.

## Assumptions, limits and misuse
- "AQL 1%" is not a promise that lots are 1%; it is the rate at which
  most lots are accepted. The LQ says what gets through.
- A sample not random (the top layer of the pallet) is not a sample.
- Sampling cannot inspect quality in: a 2% process stays 2%; sampling
  decides lots, SPC and capability fix processes.
- Small lots: the binomial overstates Pa; use the hypergeometric.
- ISO 2859-1's tables are copyright; the app computes the curve of a plan
  but does not reproduce the tables (GAPS).
- Defectives found in an accepted lot are still defectives — the plan's
  risk is explicit, and the money of a false accept is the complaint's.

## Reading the result
"Plan 125/3: a 1% lot is accepted 96 times in 100; a 5% lot 12 in 100.
The 2% lot of film accepted on Tuesday had a 76% chance of passing." The
money: the inspection's labour (n × minutes × rate, `knowledge/MONEY.md`
L) against the defectives let through × their cost downstream (Q, C) —
the trade the plan sets.

## When not to use it — and instead
A measured characteristic → `quality.acceptance-sampling-variables`
(smaller n for the same curve). A supplier's rate over many lots →
`quality.supplier-quality`. Our own process's rate → `spc.capability-attribute-proportion`.
None allowed in the sample → `spc.zero-failure-demonstration`.

## In food and FMCG manufacturing
Incoming packaging (film, trays, lids, cartons — print, dimensions,
seal-ability), incoming ingredients by attribute (damaged, foreign
matter), positive-release of a finished batch on a visual standard, a
rework lot before it goes out.

## References
- [standard] ISO 2859-1:1999 + Amd 1:2011, *Sampling procedures for inspection by attributes — Part 1: Sampling schemes indexed by AQL for lot-by-lot inspection* — named from knowledge; tables copyright, not read here.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 15 — lot-by-lot acceptance sampling for attributes: OC, AOQ, ATI, switching (from knowledge; edition to confirm).
- [textbook] Schilling, E.G. and Neubauer, D.V., *Acceptance Sampling in Quality Control*, 3rd ed., CRC, 2017 (from knowledge).

## In Faultline
Research first (FC-129) because of the tables; the OC curve of any typed
plan (FC-131) can be built now from the binomial above — n, c and the lot
typed, the curve drawn, both risks said in words, the plan found for two
points — and the inspection's labour against the defectives let through
said in money.
