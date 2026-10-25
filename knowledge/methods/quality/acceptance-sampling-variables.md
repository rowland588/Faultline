---
id: quality.acceptance-sampling-variables
name: Acceptance sampling by variables — the k-method on a measured characteristic
aka: [variables sampling, k-method, M-method, ISO 3951, ANSI Z1.9, MIL-STD-414, acceptance by measurement, plan design]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-25 — RESEARCHED for FC-130. Read this session (web SEARCH excerpts only — itl.nist.gov, Wikipedia, publishers and standards stores are refused by the container, so no page body was fetched): catalogue and preview listings of ISO 3951-1:2022 (ANSI webstore, EVS, AFNOR, SCC — scope, edition, one characteristic, normal and in control, limits L / U / both, combined control of a double limit under one AQL); a Wikipedia mirror's and a calculator's statement of the known-sigma n and k and the (1 + k²/2) approximation for sigma estimated; Lawson's open acceptance-sampling text (bookdown) saying that with sigma estimated the quantiles become t and n is found by iteration, with an example of 63 against 172 attribute and 21 sigma-known. NOT read: any ISO 3951-1, ANSI/ASQ Z1.9 or MIL-STD-414 table or clause; Lieberman & Resnikoff (1955); Montgomery ch. 16 and Schilling & Neubauer (from knowledge, editions to confirm). The exact sigma-estimated design (noncentral t), the fraction-nonconforming estimate and every number in "Researched, 25 October 2026" are computed independently in `knowledge/research/cases-research-2-sampling.py` (SciPy and Monte Carlo; 35 checks, all passing). The earlier worked case carried a wrong comparison, corrected below
needs: [spc.normality-checks]
next: [quality.supplier-quality]
alternatives: [quality.acceptance-sampling-attributes]
related: [spc.capability-measured, stats.sample-size-power, msa.gauge-rr]
---
# Acceptance sampling by variables — the k-method on a measured characteristic

## Purpose and principle
When the characteristic is measured (seal strength, fill weight, Brix),
each reading carries far more information than good/bad, and a much
smaller sample gives the same protection — about a seventh to a quarter of
the attribute plan's n if σ is known, two-fifths to a little over a half if
it is estimated, for the same two points (computed below). The k-method
accepts a lot when the sample mean sits at least k standard deviations
inside the limit; k and n are chosen from the same two points as an
attribute plan (the AQL with its α, the LQ with its β). The price is an
assumption: the characteristic is normal within the lot — and the lot's
spread is either known or estimated from the sample.

**What can be built honestly (researched 25 October 2026).** The k-method
for **one specification limit** is public mathematics from end to end — the
design is two normal quantiles (σ known) or a noncentral t search (σ
estimated), the decision is "is (x̄ − L)/s at least k", the plan's OC curve
is a noncentral t probability. None of ISO 3951-1:2022's tables (sample-size
code letters, n and k by AQL, the p* maxima) is needed, and none is copied.
Faultline therefore offers **"design a plan for one limit from your AQL, LQ
and risks, take that many measurements, and decide"** — never **"the ISO
3951-1 plan"**. **Two limits** (the M-method / combined control) are *not*
offered yet: the standard's p* maxima are tabulated, and the exact OC of a
two-limit plan depends on the lot's mean and spread separately, a design
that is Faultline's own and has not been researched (see "Not yet").

## Questions it answers
- Can the lot be accepted from a small measured sample?
- What n and k give the protection both sides want?
- What fraction of the lot is beyond the limit, as the sample says?
- What does the plan in use actually protect (its curve)?

## Inputs and minimum conditions
- A single measured characteristic with **one** specification limit (lower
  or upper), normal within the lot — checked from the process's history
  (`spc.normality-checks`, `stats.distribution-fitting`), because a sample of
  20–30 cannot verify normality well; a lot that mixes two streams is not
  one lot.
- The two points (p₁, α) and (p₂, β); whether σ is known (from history,
  stable, current — the σ-method) or estimated from the sample (the
  s-method). *When in doubt, estimate: an old σ makes a loose or needlessly
  tight plan.*
- A random sample of exactly n from the lot, measured with a fit gauge
  (`msa.gauge-rr`), each reading to a resolution fine against the spread.

## Procedure and calculation
- One-sided lower limit L (upper U alike, with the sign flipped): Q = (x̄ − L)/s
  (or /σ if known); accept if Q ≥ k.
- **σ known** (closed form; matches the textbook, the Wikipedia mirror and
  the calculators the search returned): with z_p = Φ⁻¹(1 − p),
  k = (z_p₁·z_β + z_p₂·z_α)/(z_α + z_β) and n = ((z_α + z_β)/(z_p₁ − z_p₂))²,
  rounded up. Pa(p) = Φ(√n·z_p − k√n).
- **σ estimated — exact.** The statistic √n·(x̄ − L)/s is noncentral t with
  n − 1 degrees of freedom and noncentrality √n·z_p, so
  Pa(p) = P(T′ ≥ k√n). For each n, k must lie in [k_lo, k_hi] with
  k_lo = nct⁻¹(1 − β; n − 1, √n z_p₂)/√n and k_hi = nct⁻¹(α; n − 1, √n z_p₁)/√n;
  the smallest n with k_lo ≤ k_hi is the plan, k anywhere in the range (the
  middle is Faultline's choice). The closed-form shortcut
  n ≈ ((z_α + z_β)/(z_p₁ − z_p₂))²·(1 + k²/2) is an approximation and is not
  used.
- **The fraction beyond the limit** from a sample: the naive Φ(−Q) is biased
  high (mean 0.0338 for a true 3% at n = 20). The minimum-variance unbiased
  estimate (Lieberman & Resnikoff 1955 — from knowledge, proved unbiased
  here by simulation, mean 0.0300) is the incomplete beta
  p̂ = I_x((n − 2)/2, (n − 2)/2) with x = max(0, ½ − Q√n/(2(n − 1))), and is
  exactly 0 whenever Q ≥ (n − 1)/√n.
- Two limits: not offered (see above). Each characteristic needs its own plan;
  a lot is accepted only on all.

### Researched, 25 October 2026 — what is public, what is not

| Piece | Status | Source and how it was checked |
|---|---|---|
| The k-method with one limit, σ known: k and n | **Public mathematics** | Wikipedia mirror, a calculator page and Lawson's text (search excerpts) agree on the formulas; recomputed (k = 1.809, n = 10.09 → 11) |
| σ estimated: n and k | **Public mathematics** — noncentral t (Owen 1968, from knowledge); Lawson's text says t quantiles and iteration | designed exactly and by Monte Carlo (below) |
| The OC curve of (n, k) | **Public** | noncentral t; 200,000-lot simulation agrees to 0.001 |
| The unbiased fraction nonconforming (beta form) | **Public** (Lieberman & Resnikoff 1955, from knowledge) | proved unbiased by simulation; the formula itself was not read in the paper |
| ISO 3951-1:2022: the code letters, n and k per AQL, p* maxima, switching | **Copyright (ISO)** | edition and scope confirmed from catalogue listings (third edition, published 2022-08-18, replacing 2013; ISO/TC 69/SC 5); tables **not read, not reproduced** |
| ANSI/ASQ Z1.9 tables (and BS 6002) | **Copyright** | named by the AQLSchemes package's manual (search excerpt) as the same family; not read |
| MIL-STD-414 (1957) | Lineage: the military dropped 105E and 414, ANSI and ISO adopted them with few changes to the central tables (AQLSchemes manual, search excerpt) | not read; US-government work but **not transcribed** |

What the 2022 listings say of ISO 3951-1 (excerpts, not the text): single
sampling plans, lot-by-lot, indexed by AQL; a continuing series of lots of
discrete items from one producer and one process; one quality characteristic
measured on a continuous scale; the process assumed in statistical control and
the characteristic approximately normal; a lower limit L, an upper limit U or
both, a double limit treated as one *combined* control under one AQL.

**Designed plans, α = 5%, β = 10%** (exact; Monte Carlo agrees):

| AQL | LQ | attributes (n, c) | σ known n | σ estimated n, k range |
|---|---|---|---|---|
| 1% | 6% | 110, 3 | 15 | 42, 1.90–1.91 |
| 1% | 8% | 65, 2 | 11 | 28, 1.82–1.83 |
| 2.5% | 10% | 78, 4 | 19 | 43, 1.58–1.59 |
| 4% | 15% | 60, 5 | 17 | 33, 1.36 |

**Worked case, corrected** (`knowledge/research/cases-research-2-sampling.py`):
seal strength must be ≥ 10 N; AQL 1% at α 0.05, LQ 8% at β 0.10. σ known:
k = 1.809, n = 11 (Pa 0.957 at 1%, 0.090 at 8%). σ estimated, exact: n = 28,
k between 1.817 and 1.825 (take 1.821: Pa 0.9515 at 1%, 0.0980 at 8%;
200,000 simulated lots: 0.9517 and 0.0990). *The earlier record said n = 27
and compared it with an attribute plan of 125; both were wrong:* n = 27 with
k = 1.809 has a consumer's risk of 10.9%, and the attribute plan for these
two points is 65 with c = 2 (125 and 3 has an LQ of 5.3%). The honest saving
is 28 measurements against 65 inspections, a little under a half — not a
fifth. A sample of 20 cannot use the n = 28 plan: another n is another plan
with other risks (the screen recomputes, never reuses k).
A sample of 20: x̄ 12.93 N, s 0.67 N, Q = 4.37 — its unbiased fraction under
10 N is 0 (Q is beyond (20 − 1)/√20 = 4.25); the naive Φ(−Q) is 6×10⁻⁶.

## Assumptions, limits and misuse
- **Normality within the lot is the whole basis, and its failure is large,
  not slight.** The n = 28, k = 1.821 plan on a lot with the same fraction beyond
  the limit but skewed (gamma, skew 1): skewed *toward* the limit, an 8%-bad
  lot is accepted 27.4 times in 100 instead of 9.8 (the consumer's risk nearly
  triples); skewed *away*, a 1%-bad lot is accepted 21.6 times in 100 instead
  of 95.1 (the producer's risk goes from 5% to 78%). Show the sample's shape
  and ask for the process history; refuse "the lot is accepted" as
  a verdict if the shape check fails or is not available.
- A sample of 20–30 cannot verify normality; the assumption rests on the
  process's history. A bounded or two-stream characteristic breaks it.
- σ "known" must be stable and current.
- A destructive test (seal strength) makes every sample a cost; that is
  the reason to use variables, and the reason to keep n honest.
- Several characteristics each need their own plan; the lot is accepted
  only on all.
- Do not call a designed plan "ISO 3951-1", "Z1.9" or "compliant"; do not
  look an n and k up by lot size and AQL (the table).
- Gauge error inflates s and moves x̄: a variables plan is as good as the
  gauge study behind it.

## Reading the result
"28 seals pulled: mean 12.9 N, spread 0.67, 4.4 standard deviations above the
10 N minimum (the plan needs 1.82) — accept. Essentially none would be under
10 N (estimated 3 in a billion)." A lot only just accepted (Q = k = 1.82) is
estimated 3.1% beyond the limit — between the AQL and the LQ, which is what the
plan means by "accept"; say so. If rejected: "mean 10.4 N, spread
0.8, 0.5 standard deviations above the limit (the plan needs 1.82) — reject;
about 1 in 3 packs may be under 10 N." Money: n destructive tests × the pack
and the minutes against the attribute plan's inspections
(`knowledge/MONEY.md` L, Q) — the saving that pays for the gauge study.

## When not to use it — and instead
Good/bad only → `quality.acceptance-sampling-attributes`. The process
rather than the lot → `spc.capability-measured`. The characteristic not
normal and not transformable → the attribute plan on the limit. Two limits →
not yet (attribute plan on either, or a capability study of the process).

## In food and FMCG manufacturing
Incoming film's seal strength or thickness; a batch's fill weight before
release; Brix or pH of a delivered syrup; net weight of a co-packed lot;
seal strength of a rework lot — anywhere the test is a measurement and
often destructive.

## References
- [standard] ISO 3951-1:2022, *Sampling procedures for inspection by variables — Part 1: Specification for single sampling plans indexed by acceptance quality limit (AQL) for lot-by-lot inspection for a single quality characteristic and a single AQL* — edition, committee, scope and the L / U / combined-control wording confirmed from catalogue listings (search excerpts, 25 Oct 2026); tables **not read, not reproduced**.
- [standard] ANSI/ASQ Z1.9 and MIL-STD-414 — lineage from a search excerpt of the AQLSchemes manual; not read.
- [textbook] Lawson, J., *An Introduction to Acceptance Sampling and SPC with R*, ch. 3 "Variables Sampling Plans" (open text, bookdown) — the k-method, σ known and unknown, a comparison with the attribute plan; read as a search excerpt only.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 16 — variables sampling: the k-method, the M-method, design from two points (from knowledge; edition to confirm).
- [textbook] Schilling, E.G. and Neubauer, D.V., *Acceptance Sampling in Quality Control*, 3rd ed., 2017 (from knowledge).
- [paper] Lieberman, G.J. and Resnikoff, G.J. (1955), "Sampling plans for inspection by variables", *Journal of the American Statistical Association* 50, 457–516 (from knowledge; to confirm) — the plans behind MIL-STD-414 and the unbiased estimate of the fraction nonconforming.
- [paper] Owen, D.B. (1968), "A survey of properties and applications of the noncentral t-distribution", *Technometrics* 10(3), 445–478 (from knowledge; to confirm) — the OC of the s-method.

## In Faultline
**Verdict, 25 October 2026: CAN BE BUILT for one specification limit; CANNOT
YET for two.** Re-word the entry (`src/catalogue/entries/quality.ts`, not
changed here) from *ISO 3951-1:2022: accept when (limit − x̄)/s ≥ k, inputs
the plan's n and k* to *a single-limit variables plan designed from the AQL,
the LQ and the risks, then the decision from measurements*. It builds as a
mode of the capability study (it takes the same readings, the same shape
check) or beside the attribute plan designer.

**Minimal honest build.**
- Inputs: which limit (lower or upper) and its value; AQL p₁ and α (5%); LQ p₂
  and β (10%); σ known (a number and where it comes from — the capability
  study's long-term σ, flagged "must be stable") or estimated; then the n
  readings, typed or pasted, each to its resolution.
- Outputs: the plan — "measure n, accept if (x̄ − L)/s ≥ k" with k to three
  places; its Pa at the AQL and the LQ as computed; the OC curve against the
  fraction beyond the limit; after the readings: x̄, s, Q, the decision, the
  unbiased fraction beyond the limit with its meaning, the sample's normal
  probability plot, the gauge's resolution; the n of the attribute plan for
  the same points beside it and the saving in tests and minutes.
- Verdict wording ideas: "Accept: the mean is 4.4 standard deviations inside
  the 10 N minimum; the plan needs 1.82." / "Reject: only 0.5 standard
  deviations inside." / refusals: "You typed 20 readings; this plan needs 28.
  A plan for 20 would be a different plan (k = …, risks …) — see it?" and
  "The readings do not look bell-shaped: this plan cannot decide the lot. Use
  the attribute plan on the limit."
- Not offered: ISO 3951-1 / Z1.9 lookups; the p* form; two limits; switching
  rules; sequential variables plans.

**Independent cases** (`knowledge/research/cases-research-2-sampling.py`,
section B): known-σ k and n (1.809, 10.09 → 11) and its Pa from the normal
CDF; the exact noncentral-t design (28; k 1.817–1.825) and Pa at both points
against 200,000-lot Monte Carlo (0.9517 / 0.0990 against 0.9515 / 0.0980);
the table of four designs; the (1 + k²/2) approximation's miss (27 fails the
consumer's point: Pa 0.109); the unbiased estimate's mean over 60,000 samples
(0.0300 for a true 0.03) against the naive Φ(−Q) (0.0338), and at the accept boundary for n = 28 (Q = k = 1.821) an estimate of 3.1%; Q ≥ (n−1)/√n giving
exactly 0; skewed lots (accepted 27.4% at an 8%-bad lot when skewed toward the
limit).

**Must not claim.** That the lot is normal; that the fraction beyond the limit
is known (it is an estimate, and 0 means "none seen by this estimator");
anything about an individual pack's fitness; ISO compliance; that a plan
designed for one limit protects the other.

**Not yet** (what two limits need): the exact OC of a two-limit rule depends
on the lot's mean and σ jointly; the design is Faultline's own (a simulation
of the combined estimate p̂_L + p̂_U against a maximum), the ISO form uses the
tabulated p* — neither researched here. Until then, two-limit characteristics
(net weight with a minimum and a legal maximum) are sampled by attributes on
each limit. See `knowledge/GAPS.md`.
