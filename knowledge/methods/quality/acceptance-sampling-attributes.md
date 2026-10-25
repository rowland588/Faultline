---
id: quality.acceptance-sampling-attributes
name: Acceptance sampling by attributes — the OC curve, AQL and the lot's risk
aka: [acceptance sampling, sampling plan, OC curve, AQL, LTPD, LQ, single sampling, n and c, ISO 2859, ANSI Z1.4, plan design]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-25 — RESEARCHED for FC-129. Read this session (web SEARCH excerpts only — the container refuses itl.nist.gov, Wikipedia, publishers and standards stores, so no page body was fetched): NIST Dataplot's single-sample-plan reference (alpha producer's risk, beta consumer's risk, binomial and hypergeometric OC), the ANSI webstore listing of ISO 2859-1:1999 (scope, purpose, switching rules, OC curves), the notices that cancelled MIL-STD-105E (1995, 2001, 2008) and the ANSI/ASQ Z1.4 and ISO 2859-1 third-edition status in trade-press excerpts. NOT read: any table or clause text of ISO 2859-1, ANSI/ASQ Z1.4 or MIL-STD-105E; the NIST e-Handbook chapter itself; Montgomery ch. 15 and Schilling & Neubauer (from knowledge, editions to confirm). Every formula and every number in "Researched, 25 October 2026" is computed independently in `knowledge/research/cases-research-2-sampling.py` (SciPy, exact integer sums and Monte Carlo; 35 checks, all passing); the earlier worked case is in `scripts/knowledge/cases-quality.py`
needs: []
next: [quality.supplier-quality]
alternatives: [spc.zero-failure-demonstration, quality.acceptance-sampling-variables]
related: [stats.confidence-intervals, spc.capability-attribute-proportion, msa.attribute-agreement]
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

**What can be built honestly (researched 25 October 2026).** The OC curve
and the design of a plan from two stated points are *mathematics* — the
binomial and hypergeometric distributions — and are free to use. The
*tables* of ISO 2859-1 (and ANSI/ASQ Z1.4, which is the same family) are
copyright and are what a licence buys: the lot-size ranges, inspection
levels, code letters and the (n, Ac, Re) printed for each AQL. Faultline
therefore offers **"design a plan from the quality you will accept, the
quality you will not and the risks you will take, and see its curve"** —
never **"the ISO 2859-1 plan for this lot"**. A person whose contract names
a plan types its n and c from their own copy of the standard and reads what
it protects (FC-131); Faultline does not hold the table.

## Questions it answers
- With this plan, what is the chance of accepting a lot that is 1%
  defective? 5%? 8%?
- What n and c give the protection wanted at both ends?
- What is the outgoing quality after sorting rejected lots (AOQ), and the
  total inspection it costs (ATI)?
- What does a plan quoted in a contract actually protect?

## Inputs and minimum conditions
- The lot size N (only matters when n is a tenth of N or more); the
  sample n drawn at random from the whole lot; c the acceptance number.
- Both parties' points: the AQL p₁ with the producer's risk α (5% is the
  usual choice) and the limiting quality LQ (LTPD) p₂ with the consumer's
  risk β (10% is usual). *The risks are the business's choice, said on
  screen as such; no standard is being quoted when they default.*
- A clear definition of a defective, and inspectors who agree
  (`msa.attribute-agreement`).
- Random drawing: the sample is taken across the whole lot (every layer,
  every pallet), or it is not a sample.

## Procedure and calculation
- OC curve: Pa(p) = Σ_{d=0}^{c} C(n, d) pᵈ (1 − p)ⁿ⁻ᵈ (binomial; the
  hypergeometric with N when n/N > 0.1 — a smaller Pa).
- **Design from two points.** Find the smallest n, and its c, with
  Pa(p₁) ≥ 1 − α and Pa(p₂) ≤ β. For a fixed c, Pa falls as n rises, so the
  feasible n form a range [n_β(c), n_α(c)] and n_β(c) rises with c; the
  first c whose range is not empty gives the smallest n. (Proved against a
  brute-force search over every (n, c) in the cases script.)
- Average outgoing quality (rectifying inspection, rejected lots sorted
  100% and defectives replaced): AOQ(p) = p·Pa(p)·(N − n)/N; its maximum
  over p is the AOQL — the worst average quality that can leave.
- Average total inspection: ATI(p) = n + (1 − Pa(p))·(N − n).
- Double and multiple plans cut the average sample for the same curve;
  switching rules (normal → tightened after two lots in five rejected; →
  reduced after ten accepted, with conditions — *the rule counts quoted from
  knowledge; the standard's text not read*) protect the user from a
  supplier who has slipped. Their tables and rules are the standard's; the
  curve of any plan they give is computed as above.
- c = 0 plans: the zero-failure relation n = ln β / ln(1 − p₂)
  (`spc.zero-failure-demonstration`) — small n, but Pa at the AQL is poor
  (good lots rejected often).

**Worked case** (`scripts/knowledge/cases-quality.py`): n = 125, c = 3. Pa:
0.996 at 0.5%, 0.963 at 1%, 0.759 at 2%, 0.481 at 3%, 0.124 at 5%, 0.008 at
8%. At an AQL of 1% the producer's risk is 3.7%; the LQ (Pa = 0.10) is 5.3%.
With N = 3,000 under rectifying inspection the AOQL is 1.5% (at p ≈ 2%) and
the ATI at 2% is 819 of 3,000. The smaller plan n = 50, c = 1: Pa 0.911 at 1%
(producer's risk 8.9%), LQ 7.6% — cheaper, looser at both ends. A small
lot: N = 200, n = 50, c = 1 at 5% defective: hypergeometric Pa 0.237
against the binomial's 0.279 (both recomputed 25 October with exact sums).

### Researched, 25 October 2026 — what is public, what is not

| Piece | Status | Source and how it was checked |
|---|---|---|
| OC curve of a plan (n, c): binomial; hypergeometric for a finite lot | **Public mathematics** | NIST Dataplot's single-sample reference describes the OC as acceptance probability against percent defective with binomial and hypergeometric variants (search excerpt); computed here with exact sums, SciPy and Monte Carlo — all three agree |
| Producer's risk α = 1 − Pa(AQL); consumer's risk β = Pa(LQ) | **Public** | the same Dataplot reference's definitions (excerpt) |
| Designing (n, c) from (p₁, α) and (p₂, β) | **Public mathematics** — the search and its minimality are proved here, not taken from a table | `knowledge/research/cases-research-2-sampling.py` section A |
| AOQ, AOQL, ATI | **Public** (Dodge's rectifying inspection; Montgomery ch. 15 — from knowledge) | recomputed |
| The c = 0 relation | **Public** | recomputed |
| ISO 2859-1:1999 tables — code letters by lot size and inspection level, (n, Ac, Re) by AQL, normal / tightened / reduced, the OC and LQ tables | **Copyright (ISO)** | the ANSI webstore listing says the standard gives an AQL-indexed system with switching rules and OC curves; the text is sold. *Not reproduced. Not read.* A third edition was reported at final draft in December 2025 (trade-press excerpt; publication not confirmed) — one more reason never to copy a table |
| ANSI/ASQ Z1.4-2003 (R2018) tables | **Copyright (ASQ)** | named in search excerpts; not read |
| MIL-STD-105E (1989) | A US Government document: cancelled by Notice 1 (1995) pointing to ANSI/ASQC Z1.4-1993; Notice 2 (2001) cancelled it without replacement, pointing to MIL-STD-1916; Notice 3 (2008) allows reference to MIL-STD-1916 or ANSI/ASQ Z1.4 | the three notices are listed on everyspec.com (search excerpt); the tables were **not** read. US Government works are generally not copyrighted in the US (17 U.S.C. §105 — from knowledge, not legal advice, and silent on other countries). *Faultline does not transcribe it:* search excerpts disagree on how closely 105E, Z1.4 and ISO 2859-1 (1999) match (one says the 1999 revision changed some accept/reject pairs), so a transcribed 105E plan would be passed off as "the standard" without being it |

**What a computed plan will and will not match.** A designed plan is not an
ISO plan. It may happen to coincide with one (125 and 3 is a plan the ISO
table is understood to contain — from knowledge, unchecked); it is never
described as one. Tables such as Cameron's (1952, from knowledge) give plans
that meet the two points *approximately*: for AQL 1% / LQ 6% a plan of
n = 89, c = 2 is often quoted, and computed it meets the consumer's point
(Pa = 0.092) but has a producer's risk of 6.0%, not 5%. The strict design is
n = 110, c = 3 (Pa 0.975 at 1%, 0.098 at 6%). So the screen states the risks
**as computed**, not as asked.

**Designed plans, α = 5%, β = 10%** (all verified by brute force):

| AQL | LQ | n | c | Pa at AQL | Pa at LQ |
|---|---|---|---|---|---|
| 1% | 6% | 110 | 3 | 0.975 | 0.098 |
| 1% | 8% | 65 | 2 | 0.972 | 0.099 |
| 1% | 5% | 132 | 3 | 0.956 | 0.099 |
| 0.65% | 4% | 166 | 3 | 0.976 | 0.098 |
| 2.5% | 10% | 78 | 4 | 0.954 | 0.099 |
| 4% | 15% | 60 | 5 | 0.968 | 0.097 |
| 1% | 20% | 18 | 1 | 0.986 | 0.099 |

Plan 110/3 in lots of 3,000 under rectifying inspection: AOQL 1.70%, ATI at
2% defective 627 of 3,000. With c = 0, an LQ of 5% at 10% risk needs n = 45,
but a lot at the 1% AQL is then rejected 36 times in 100.

**Finite lots and the whole-unit trap.** For a lot of N the defectives in it
are whole units: D = round(N·p). Designed by the hypergeometric, AQL 1% / LQ
6%: a lot of 500 needs n = 83, c = 2 (not 110/3); a lot of 200 gives n = 76,
c = 2 — but there the AQL is *two* bad units in the lot and c is 2, so a lot
at the AQL can never be rejected (Pa = 1.000 shown). A percentage of a
small lot is not a rate; the screen must say "at 1% of 200 = 2 bad packs"
and warn whenever D₁ ≤ c.

## Assumptions, limits and misuse
- "AQL 1%" is not a promise that lots are 1%; it is the rate at which
  most lots are accepted. The LQ says what gets through.
- A sample not random (the top layer of the pallet) is not a sample.
- Sampling cannot inspect quality in: a 2% process stays 2%; sampling
  decides lots, SPC and capability fix processes.
- Small lots: the binomial overstates Pa; use the hypergeometric (above).
- Do not call a designed plan "ISO 2859-1", "AQL 1.0 level II", "per
  ANSI Z1.4" or "compliant". Say "designed from your AQL, LQ and risks
  (binomial)". Do not default a plan from a lot size and a level: that is
  the table.
- Defectives found in an accepted lot are still defectives — the plan's
  risk is explicit, and the money of a false accept is the complaint's.
- Independence: items in a lot are not independent when the defect is
  clustered (a roll of bad film); the binomial's Pa is then optimistic.
  The OC curve assumes defectives are scattered at random through the lot.

## Reading the result
"Plan 110/3: take 110 packs at random from the lot; accept if 3 or fewer are
bad, otherwise reject. A lot that is 1% bad is accepted 97.5 times in 100
(2.5 good lots in 100 are rejected); a lot that is 6% bad is accepted 9.8
times in 100." The money: the inspection's labour (n × minutes × rate,
`knowledge/MONEY.md` L) and any packs destroyed against the defectives let
through × their cost downstream (Q, C) — the trade the plan sets. A
re-stated 125/3 reading: "The 2% lot of film accepted on Tuesday had a 76%
chance of passing."

## When not to use it — and instead
A measured characteristic → `quality.acceptance-sampling-variables`
(smaller n for the same curve). A supplier's rate over many lots →
`quality.supplier-quality`. Our own process's rate → `spc.capability-attribute-proportion`.
None allowed in the sample → `spc.zero-failure-demonstration`. A defect
that is clustered or continuous (a stream, not a lot) → control charts.

## In food and FMCG manufacturing
Incoming packaging (film, trays, lids, cartons — print, dimensions,
seal-ability), incoming ingredients by attribute (damaged, foreign
matter), positive-release of a finished batch on a visual standard, a
rework lot before it goes out.

## References
- [standard] ISO 2859-1:1999 + Amd 1:2011, *Sampling procedures for inspection by attributes — Part 1: Sampling schemes indexed by acceptance quality limit (AQL) for lot-by-lot inspection* — scope, purpose and the existence of switching rules and OC curves confirmed from the ANSI webstore listing (search excerpt, 25 Oct 2026); tables copyright, **not read, not reproduced**. ISO 2859-2 (isolated lots, indexed by limiting quality) named by the same listing.
- [standard] ANSI/ASQ Z1.4-2003 (R2018) and MIL-STD-105E (cancelled; Notices 1–3) — status confirmed from search excerpts (everyspec.com notices; trade-press history); tables **not read**.
- [manual] NIST Dataplot, *Reference Manual — single-sample acceptance plan* (itl.nist.gov, Dataplot auxiliary reference): alpha producer's risk, beta consumer's risk, OC with binomial and hypergeometric variants — read as a search excerpt only. The NIST/SEMATECH e-Handbook's chapter on lot acceptance sampling is the natural free reference; its page text was not returned by the search tool and was **not read**.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 15 — lot-by-lot acceptance sampling for attributes: OC, AOQ, ATI, switching (from knowledge; edition to confirm).
- [textbook] Schilling, E.G. and Neubauer, D.V., *Acceptance Sampling in Quality Control*, 3rd ed., CRC, 2017 (from knowledge).
- [paper] Cameron, J.M. (1952), "Tables for constructing and for computing the operating characteristics of single-sampling plans", *Industrial Quality Control* 9(1), 37–39 (from knowledge; to confirm) — the usual source of table-made two-point plans.

## In Faultline
**Verdict, 25 October 2026: CAN BE BUILT — as "design a plan", not "quote the
ISO plan".** FC-129's entry still says *ISO 2859-1 single sampling plans by
AQL and inspection level, inputs lot size, AQL, inspection level*; that
cannot be built without the licensed tables, and the entry should be re-worded
to *a single sampling plan designed from the AQL, the limiting quality and
the two risks, by the binomial or hypergeometric* when it is specified
(`src/catalogue/entries/quality.ts` — not changed here). It shares one module
with FC-131 (the OC curve of a typed plan), which is the same arithmetic
without the search.

**Minimal honest build.**
- Inputs: AQL p₁, producer's risk α (5%), limiting quality p₂, consumer's
  risk β (10%), the lot size N (optional — typed gives the hypergeometric
  plan), what is a defective (words, printed on the card). Optional money:
  minutes a check, rate (Line capacity's), a destroyed pack's materials, a
  complaint's cost (typed).
- Outputs: the smallest plan (n, c) — "take n at random, accept on c or
  fewer"; Pa at the AQL and at the LQ *as computed*; the OC curve with both
  points marked and the plan's n and c in its title; a table of Pa at 0.5%,
  1%, 2%, 3%, 5%, 8%, 10%; AOQL and ATI if rejected lots are sorted; the
  inspection cost per lot. A "record the result" step: defectives found d →
  accept if d ≤ c, reject otherwise, said in one sentence with the lot's
  number and date (the lot's result is kept; the plan's risks printed with it).
- Verdict wording ideas: "Accept (2 bad found; the plan allows 3)." / "Reject
  (4 bad found; the plan allows 3). A lot as good as your AQL is rejected 2.5
  times in 100 by this plan, so a rejected lot is evidence, not proof." /
  warning: "At 1% of 200 packs the AQL is 2 bad packs, and this plan allows 2:
  a lot at your AQL is never rejected. For a small lot, say how many bad packs
  in the lot you will accept, not a percentage."
- Deliberately not offered: a lot-size × inspection-level lookup; code
  letters; normal / tightened / reduced tables; ISO 2859-1 or Z1.4 named as
  the source of a computed plan.

**Independent cases** (all in `knowledge/research/cases-research-2-sampling.py`,
35 checks): the seven designed plans above against a brute-force search; the
earlier n = 125 / c = 3 curve from exact sums; the hypergeometric Pa
(0.2368) against SciPy and the binomial (0.2794); the lot-of-500 design
(83, 2); the c = 0 relation; Monte Carlo of 400,000 lots against the exact Pa
(0.5787 against 0.5793 at 3%); the looser 89/2 plan's risks (6.0% / 9.2%).

**Must not claim.** That the lot is *proved* good or bad (a sample decides a
lot at stated risks); that a plan is ISO / ANSI / MIL compliant; that an
accepted lot is "1% defective"; that a rejected lot is bad; that the
defectives were found by a method the inspectors agreed on unless the
attribute agreement was checked; anything about the process behind the lot.

**Still to confirm before it is called standard practice** (`knowledge/GAPS.md`):
the NIST e-Handbook chapter's own wording (not read); Montgomery's and
Schilling's current editions; Cameron's table.
