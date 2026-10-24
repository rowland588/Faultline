---
id: msa.attribute-agreement
name: Do inspectors agree? — attribute agreement analysis (kappa)
aka: [attribute MSA, attribute agreement, Cohen's kappa, Fleiss's kappa, inspector agreement, visual inspection repeatability]
discipline: msa
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-24 — Cohen's κ (1960) and Fleiss's κ (1971) by their formulas; the study design as the AIAG MSA manual's attribute study (from knowledge; text not read); the worked case (three inspectors, two looks, fifty packs, a reference) computed independently in `scripts/knowledge/cases-msa.py`; the κ bands (0.75 good, under 0.4 poor) a common guide, not a standard
needs: []
next: [spc.capability-attribute-proportion]
alternatives: [msa.gauge-rr]
related: [quality.sensory-difference, quality.check-sheet]
---
# Do inspectors agree? — attribute agreement analysis (kappa)

## Purpose and principle
When the judgement is pass/fail by eye — a seal's wrinkle, a label's
skew, a bake's colour, a foreign-body find — the "gauge" is a person.
The study gives the same pieces to several inspectors, twice each, with a
reference verdict from an expert, and asks three things: does each agree
with themselves, with each other, and with the truth? Kappa corrects the
agreement for what chance alone would give (two inspectors who both pass
90% agree 82% by chance), so 85% agreement on a mostly-good sample is not
mistaken for skill.

## Questions it answers
- Does each inspector repeat their own verdict?
- Do the inspectors agree with one another and with the reference?
- Which way do they err — passing rejects (misses) or rejecting good
  packs (false alarms) — and who most?
- Is the visual standard clear enough, or does it need better limit
  samples?

## Inputs and minimum conditions
- 30–50 pieces (50 usual), about a third to a half of them rejects
  spanning the borderline — not obvious ones; identified only by a hidden
  code.
- 2–3 inspectors, 2 looks each in random order, blind; a reference verdict
  per piece by an expert or a measurement.
- The acceptance standard they are judging against, written and with
  limit samples.

## Procedure and calculation
- Within-inspector agreement: share of pieces where both looks agree.
- Inspector vs reference: share where both looks match the reference.
- Between inspectors: share where every look by everyone agrees; and all
  right (agrees with the reference).
- Cohen's κ between any two sets of verdicts: κ = (p_o − p_e)/(1 − p_e),
  p_o the observed agreement, p_e = p₁q₁ + (1 − p₁)(1 − q₁) the chance
  agreement from each one's reject rate.
- Fleiss's κ for many raters over N pieces: P̄ the mean per-piece
  agreement, P̄_e = Σ p_j² over categories; κ = (P̄ − P̄_e)/(1 − P̄_e).
- Miss rate = rejects passed ÷ rejects; false-alarm rate = good rejected ÷
  good (per inspector, against the reference) — the two errors the floor
  cares about, with different costs.
- Reading κ (a common guide): ≥ 0.75 good; 0.4–0.75 marginal, work on the
  standard; < 0.4 poor. Agreement with the reference under 90% (with the
  errors named) is the usual trigger to act.

**Worked case** (`cases-msa.py`): 50 packs (20 rejects by the reference),
inspectors A, B, C, two looks each. A agrees with self 88%, right on both
looks 88%, κ vs reference 0.88; C 86%, 86%, 0.83; B 66%, 62%, 0.50. All
six looks agree on only 44% of packs; Fleiss κ 0.57. B's errors: misses
30% of the rejects and rejects 20% of the good. Verdict: A and C are fit;
B is not yet — and B's misses are the costly way round. Action: B
retrained on the limit samples, the borderline samples added to the
standard, the study repeated for B.

## Assumptions, limits and misuse
- A sample of obvious good and bad pieces gives everyone 100%; the study
  must be built on the borderline.
- Rater fatigue and memory: random order, a gap between looks, hidden codes.
- κ depends on the reject share in the sample; compare κ between studies
  only with similar mixes.
- A "reference" that is itself one person's opinion is a reproducibility
  study with a king; where a measurement exists, use it.
- Agreement is not accuracy: two inspectors can agree and both be wrong
  against the reference.

## Reading the result
"A and C judge seals to the standard (κ 0.88, 0.83); B misses 3 rejects in
10 and rejects 1 good pack in 5 (κ 0.50) — retrain on the limit samples
and add the three borderline cases to the standard." Money: the misses ×
the cost of a reject reaching the customer (a complaint, a withdrawal —
`knowledge/MONEY.md`, C); the false alarms × the good pack's materials and
labour (Q). The two said apart.

## When not to use it — and instead
The characteristic can be measured → measure it and run `msa.gauge-rr`.
A sensory difference (taste, texture) → `quality.sensory-difference`. The
reject rate itself, once the inspectors are fit → `spc.capability-attribute-proportion`.

## In food and FMCG manufacturing
Visual seal inspection, label and print checks, bake colour against limit
samples, foreign-body screening on a belt, pack presentation, X-ray and
metal-detector operator verdicts on flagged packs — anywhere a person says
good or bad.

## References
- [paper] Cohen, J. (1960), "A coefficient of agreement for nominal scales", *Educational and Psychological Measurement* 20(1), 37–46 (from knowledge).
- [paper] Fleiss, J.L. (1971), "Measuring nominal scale agreement among many raters", *Psychological Bulletin* 76(5), 378–382 (from knowledge).
- [paper] Landis, J.R. and Koch, G.G. (1977), "The measurement of observer agreement for categorical data", *Biometrics* 33(1), 159–174 — the κ bands (from knowledge).
- [manual] AIAG, *Measurement Systems Analysis*, 4th ed., 2010, ch. III section C — attribute measurement systems study (from knowledge; text not read).

## In Faultline
Not built (FC-121). When built: the pieces coded, the inspectors' verdicts
tapped on the phone in the study's random order, the reference typed once,
the agreements, κ and each person's two error rates said in words, with the
money of each error — and the result carried to the register's reject
counts so a reject rate says who judged it and how well.
