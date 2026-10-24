---
id: quality.sensory-difference
name: Can people tell the difference? — the triangle test and its kin
aka: [triangle test, duo-trio, tetrad, sensory discrimination, difference test, similarity test, ISO 4120]
discipline: quality
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the triangle test's binomial with p₀ = 1/3, its one-sided test, the proportion of distinguishers (Abbott's formula) and the similarity design as ISO 4120:2021 and Lawless & Heymann (2010) give them (from knowledge; ISO 4120's edition — 2021 replacing 2004 — and its tables to confirm, text not read); the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: []
next: [quality.control-plan]
alternatives: [msa.attribute-agreement]
related: [stats.sample-size-power, foodsafety.shelf-life, stats.confidence-intervals]
---
# Can people tell the difference? — the triangle test and its kin

## Purpose and principle
A cheaper ingredient, a new supplier, a changed oven profile, a pack at
the end of its life: does the product taste (look, feel) different? Each
assessor gets three samples, two alike and one odd, and must pick the odd
one; guessing gets it right a third of the time, so the count of correct
picks against the binomial with p = 1/3 says whether a difference was
perceived. The same design, run with enough assessors, can also show
*similarity* — that no more than a small share could tell.

## Questions it answers
- Is the changed product perceptibly different from the current one?
- What share of people can tell (the proportion of distinguishers)?
- Is the change similar enough to go ahead (a similarity test with the
  power to show it)?
- Has the product changed by day 14 of its life?

## Inputs and minimum conditions
- Two products, prepared and presented identically (temperature, size,
  coded with random three-digit codes, order balanced across the six
  possible arrangements AAB, ABA, BAA, BBA, BAB, ABB).
- Assessors: 24–36 for a difference test (ISO 4120's minimum 18 at α 0.05
  with moderate power); 60–100 for a similarity test; naive or trained as
  the question needs, not the people who made the change.
- Booths or a quiet place, no talking, water between samples, a forced
  choice (no "no difference" allowed).

## Procedure and calculation
- x correct of n; one-sided binomial test against p₀ = 1/3:
  p = P(X ≥ x | n, 1/3) = Σ_{k=x}^{n} C(n, k)(1/3)ᵏ(2/3)ⁿ⁻ᵏ; a difference is
  shown at 5% when p < 0.05 — the minimum x for n is the 95th percentile
  of Binomial(n, 1/3) plus one (n = 24: 13; n = 36: 18; n = 18: 10).
- Proportion of distinguishers (Abbott): p_d = (p_c − 1/3)/(2/3), with
  p_c = x/n; its upper confidence bound from the binomial bound on p_c.
- Similarity: choose the largest p_d acceptable (say 0.3 — 30% could
  tell), the risk β of missing it, and n for the power; the test
  "passes" when the 90% (or 95%) upper bound on p_d is below the
  threshold — not when the difference test fails to reach 5%, which with
  few assessors proves nothing.
- Power: for n assessors and a true p_d, P(X ≥ critical | n, 1/3 +
  2p_d/3); the figures below show why 24 is not enough for similarity.
- Kin: duo-trio (a reference plus two; p₀ = 1/2, less powerful); tetrad
  (two of each, pair them; p₀ = 1/3, more powerful than the triangle for
  the same n); 2-AFC when the direction is known (p₀ = 1/2).
- Thurstonian d′ for comparing across methods (beyond this record).

**Worked case** (`cases-quality.py`): 24 assessors, 12 correct: p = 0.068
— not shown (13 needed). 13 of 24: p = 0.028 — shown. 36 assessors, 17
correct: p = 0.058 — not shown, p_d = 0.21 with a 90% upper bound of 0.39
— so this failed difference test does *not* show similarity to a 0.3
threshold either. Power to detect 30% distinguishers at 5%: n 24 → 0.55;
36 → 0.72; 60 → 0.92; 90 → 0.99. A similarity claim needs 60 or more.

## Assumptions, limits and misuse
- "Not significant" with 24 people is not "the same"; similarity needs
  its own design and its own n.
- Any cue other than the product (temperature, colour of the cup, order)
  makes the test one of the cue.
- The same assessor twice is not two assessors; replication inflates n.
- A difference perceived is not a difference disliked: preference and
  acceptance are other tests (hedonic scales), run only after a
  difference is shown.
- Trained panels are more sensitive than consumers; say which, and do not
  promise consumers cannot tell from a panel that can.

## Reading the result
"36 people, 17 picked the odd sample (p = 0.06): a difference is not
shown, but about 21% may be able to tell (up to 39%) — not similar enough
to claim; run 60." Money: the saving the change was for (an ingredient's
£/tonne × tonnes) against the risk a perceptible difference carries
(complaints, lost sales — `knowledge/MONEY.md` C); the test's cost is
small against either.

## When not to use it — and instead
Which is preferred or liked → a hedonic or preference test (not in this
library yet). Inspectors judging good/bad against a standard →
`msa.attribute-agreement`. A measured attribute (salt, Brix, colour by
instrument) → measure it and use `stats.two-sample-tests`.

## In food and FMCG manufacturing
Ingredient and supplier substitutions, recipe cost-downs, process changes
(oven, fryer, cook profile), packaging changes that may affect taste
(film, MAP gas), shelf-life end points (day 0 against day n), a second
site making the same product.

## References
- [standard] ISO 4120:2021, *Sensory analysis — Methodology — Triangle test* — named from knowledge; edition and tables to confirm, text not read.
- [textbook] Lawless, H.T. and Heymann, H., *Sensory Evaluation of Food: Principles and Practices*, 2nd ed., Springer, 2010, ch. 4 — discrimination tests, the proportion of distinguishers, similarity testing (from knowledge).
- [textbook] Meilgaard, M.C., Civille, G.V. and Carr, B.T., *Sensory Evaluation Techniques*, 5th ed., CRC, 2016 (from knowledge).
- [standard] ISO 8586, ISO 8589 — assessor selection and the test room (from knowledge).

## In Faultline
Not built (FC-137). When built: the two products and the question typed,
the serving order generated and printed per assessor, each verdict tapped,
the binomial test said in words with the distinguishers' share and its
bound, the similarity design offered with the n it needs before the test
is run, and the result kept on the product's record.
