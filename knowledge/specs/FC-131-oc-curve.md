# FC-131 — What a sampling plan protects: the OC curve

**Catalogue:** FC-131 (FC-129 designing a plan from the AQL and risks is **not built** — left, with its research, below; FC-136 supplier quality is not built) · **Knowledge:** `quality.acceptance-sampling-attributes` (full, textbook; researched 25 October for FC-129, `knowledge/GAPS.md` "Research 2") · **Asked for:** the catalogue's problem, "a plan is in use but nobody knows what it lets through" · **Status:** built on `build-calc`. **Written before the code.**

## 1. Purpose
Read a sampling plan someone already uses — "take 50, allow 1" on incoming film — and say what it protects: how often a lot is accepted at each true share of bad units, the producer's risk (a good lot turned away) and the consumer's (a bad lot accepted) at the two qualities the team cares about. The sentence: *"Take 125 at random from the lot and accept it if 3 or fewer are bad. A lot that is 1% bad is accepted 96.3 times in 100, so 3.7 good lots in 100 are turned away (the producer's risk); a lot that is 6% bad is accepted 5.4 times in 100 (the consumer's risk)."*

**Scope.** A **single sampling plan (n, c) typed in**, read by the binomial (a lot from a steady stream) or, when the lot's size is given, the hypergeometric with whole bad units; the chance of acceptance at a grid of shares and at the AQL and limiting quality given; where the plan accepts 95 and 10 times in 100; the curve as a drawing; the labour of inspecting a lot when seconds a unit and a wage are given. **Not here:** choosing or designing a plan (FC-129 — the research says it can be built as "design from your AQL, limiting quality and risks", never "the ISO 2859-1 plan"), any table of ISO 2859-1 or ANSI/ASQ Z1.4 (copyright; **not held, not implied**), average outgoing quality and total inspection under rectifying inspection, double and multiple plans, sampling by variables (FC-130), the cost of a bad unit let through.

## 2. Users and scenarios
The quality lead or goods-in supervisor, at a desk or on a phone at the dock. (1) *Goods-in film:* 125 taken, 3 allowed — read at 1% and 6%; the curve says 5.3% bad is the worst quality it lets through only 1 time in 10. (2) *A looser plan:* 89 taken, 2 allowed — producer's risk 6.0%, the page says it is above the usual 5%. (3) *One lot of 500:* 83 taken, 2 allowed, 6% of 500 is 30 bad units — 9.7% accepted. (4) *A small lot:* 1% of 200 is 2 bad units and the plan allows 2: the page says a lot at the AQL can never be rejected.

## 3. Method selection
The OC curve is mathematics — the binomial and hypergeometric distributions — free to use, and exactly what "what does this plan protect" asks. The alternatives: a typed table lookup (refused — licensed text); a plan search (FC-129, later); variables sampling (FC-130). The hypergeometric replaces the binomial when one lot of known size is given because the binomial overstates acceptance for a small lot (0.2794 against 0.2368 for N = 200, n = 50, c = 1 at 5%). It refuses a sample larger than the lot, and an AQL no better than the limiting quality.

**Established · assumed · chosen.**
- *Established:* Pa(p) = P(X ≤ c) for X ~ Binomial(n, p), or Hypergeometric(N, D, n) with D = round(N·p) (`knowledge/methods/quality/acceptance-sampling-attributes.md`; NIST Dataplot's single-sample reference, as a search excerpt there); producer's risk α = 1 − Pa(AQL), consumer's risk β = Pa(LQ); the 5% and 10% as the *customary* choices of producer's and consumer's risk (Montgomery, from knowledge — the record's own words: "the usual choice"). Independent cases: SciPy `binom.cdf` and `hypergeom.cdf` (`scripts/knowledge/cases-calc.py` O1–O10, and `knowledge/research/cases-research-2-sampling.py`'s 35 checks).
- *Assumed:* bad units scattered at random through the lot; the sample drawn from all of it; inspectors agree on a bad unit (all said under *What this does not say*).
- *Chosen (the builder, 25 October — the owner asked not to be asked):* the verdict turns **amber only when a risk is above the customary 5% (producer's) or 10% (consumer's)** — a flag for a plan to look at, never "good" or "bad", and said as customary, not a rule; the grid 0.5, 1, 2, 3, 5, 8, 10%; the curve's axis top (the next of 1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20 … 100% above 1.5 × where it accepts 10 in 100, 1.3 × the LQ, twice the AQL); the "can never be rejected" warning when the bad units at a given share are no more than c; no money is invented — FC-131 has none of its own (`knowledge/MONEY.md` §4 "—"); the labour of inspecting a lot (units × seconds × the wage with on-costs, the line's offered) is the one cost the plan sets, optional.

## 4. Inputs
Units taken from each lot (whole ≥ 1) · Accept if this many are bad, or fewer (whole ≥ 0) · Size of the lot (optional whole ≥ 1; ≥ the units taken) · Quality you want accepted — the AQL (% bad, optional, 0.001–99) · Quality you will not accept — the limiting quality (% bad, optional, 0.001–100; worse than the AQL) · *In money, optional:* Seconds to inspect one unit; Cost of a person an hour (offered from the line's wage with on-costs, a figure typed wins).

## 5. Data suitability
A plan with c ≥ n accepts every lot — said. A share of a small lot is whole units — said at the AQL and the LQ. A clustered fault breaks the binomial's scatter — said. No minimum sample is imposed.

## 6. Calculations
Pa as above (`lib/ie/oc`: `accepts`, `hyperCdf`, `shareAt` by bisection or, for a lot, the first whole number of bad units whose Pa is at most the target, `curve`); α, β; the grid; labour = n × seconds ÷ 3,600 × wage. **Independent cases** (`cases-calc.py`, unit tests in `pull.test.ts`): O1 125/3: 0.99625167, 0.96255094, 0.7586698, 0.48140505, 0.1237847, 0.00831188, 0.00104197 at 0.5, 1, 2, 3, 5, 8, 10%; accepts 95 in 100 up to 1.10029%, 10 in 100 at 5.26632%; α 3.74%, β at 6% 5.39%; O2 50/1: 0.9106 at 1%, limiting quality 7.558%; O3 110/3: 0.97496 and 0.09803; O4 89/2: 0.0919 at 6%, α 6.03%; O5 N = 200, 50/1 at 5%: 0.23682 (binomial 0.2794); O6 1% of 200 = 2 bad, 76/2: Pa 1 exactly; O7 N = 500, 83/2: 5 bad 0.96566, 30 bad 0.09733, the first counts bringing Pa to 95 and 10 in 100 are 6 and 30; O8 45/0: 0.0994 at 5%, 36.4% of 1% lots turned away; O9 125 × 30 s at £14.70 = 62.5 minutes, £15.3125.

## 7. Outputs
Verdict "Risks 3.7% and 5.4%" (or "Take 50, accept on 1" with no points); the sentence above (or, with no points, *"A lot that is 0.7% bad or better is accepted 95 times in 100; one that is 7.6% bad is accepted only 10 times in 100."*); the curve's other reading; the lot arithmetic in use; tiles *Good lots turned away*, *Bad lots accepted*, *Accepted 95 in 100*, *Accepted 10 in 100* (the limiting quality at a 10% risk), *Inspection a lot*; the working (the grid and the two points); the money sentence or what to give; four caveats (a plan decides lots at stated risks and does not prove one; **no ISO 2859-1 / Z1.4 table is held and this is not one of their plans**; bad units scattered at random; inspectors agree); the closing line. **The picture earns its place — the curve is the answer:** Pa against the true share bad, with the AQL and LQ guides, the dots at them, and the 95 and 10 in 100 lines.

**The report.** The generic calculation paper (FC-235) with the curve drawn on paper from the same description as the screen's: the band, tiles, sentence, the picture and its caption, the figures put in, the working (the grid), the money, the caveats including the licence one, Before → after when saved. Read back by `calc-shape.mjs` step *e* (the picture's title on the paper).

## 8. Manufacturing usability
Two boxes to an answer, two more for the risks; the typed plan is whatever the contract says; the what-if tries "take 50, accept on 1" against "take 125, accept on 3" in one tap.

## 9. Failure handling
n > lot, an AQL at or above the LQ, a half unit, a zero sample: refused in words; c ≥ n, "never rejects", "can never reject a lot that bad": warnings beside a standing answer; no seconds or no wage: the labour says what to give.

## 10. Integration
`ToolStudy` tool `calc`, key `oc-curve`; `built.where: ['/calc/oc-curve']`; a project's goods-in check or a supplier line lists it in its Tools; the line report prints the curve; FC-129 and FC-136 will read the same plan. No migration.

## 11. Verification
`pull.test.ts` (the OC cases); `calc.test.ts` (examples, refusals, the picture inside its axes); `scripts/acceptance/calc-shape.mjs` (the picture drawn on screen and its title on the paper).

**Acceptance criteria.**
1. Pa equals SciPy's binomial and hypergeometric at the grid and at the two points, and the limiting qualities equal brentq — `pull.test.ts` (O1–O8); `calc.test.ts` examples 1–4.
2. The risks, sentence, tiles and money equal the stated literals through the real boxes — `calc-shape.mjs` step *b* (oc-curve).
3. n > lot, AQL ≥ LQ, a half unit and a zero sample are refused in words — `calc.test.ts` ("refuses"); `calc-shape.mjs` step *c*.
4. A risk above 5% (producer's) or 10% (consumer's) turns the verdict amber and says so; below, neutral — `calc.test.ts` example 4 (6.0%, amber) and example 1 (neutral).
5. The whole-unit trap and c ≥ n warn — `pull.test.ts` (O6: Pa exactly 1); the page's warning wording is in the definition's `check`, covered by the unit test of the example's `problems` and read on screen when typed (`calc-shape.mjs` step *b* does not type it: **unproved on screen** — listed below).
6. The curve is drawn inside its axes on screen and on paper — `calc.test.ts` ("a picture inside its axes"); `calc-shape.mjs` step *e*.
7. The licence caveat is on the page and the paper — `calc-shape.mjs` step *b* (the caveats list equals the definition's) and *e*.
8. Rename, delete, Undo, reload, phone, before → after, what-if — `calc-shape.mjs` steps *d*–*g*.
Not yet proved on screen: the small-lot warning text (unit-tested through the definition only). Not built: FC-129 (design a plan), AOQ/ATI.

## 12. Maintainability
Definition `src/tools/calc/defs/oc-curve.ts`; arithmetic `src/lib/ie/oc.ts`. **FC-129 left for a later builder:** the same module gives the design — the smallest (n, c) with Pa(AQL) ≥ 1 − α and Pa(LQ) ≤ β — as a second definition `plan-design`; the research, the seven worked plans and the "never call it ISO" rule are in the knowledge record and `knowledge/research/cases-research-2-sampling.py`. Also left: AOQ/ATI, double plans, variables (FC-130).
