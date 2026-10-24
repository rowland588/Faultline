---
id: msa.gauge-rr
name: Gauge repeatability and reproducibility — how much of the variation is the measuring?
aka: [gauge R&R, GRR, measurement system analysis, MSA, crossed study, ANOVA R&R, ndc, number of distinct categories]
discipline: msa
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the crossed ANOVA study, its variance components, %GRR and ndc as the AIAG MSA Reference Manual (4th ed. 2010) ch. III gives them (from knowledge; the manual's pooling rule for the interaction and its 10/30% guide to confirm against the text, not read); ISO 5725-2:2019 for repeatability and reproducibility of a method (scope from knowledge); the worked case computed independently in `scripts/knowledge/cases-msa.py`
needs: [msa.type1-gauge]
next: [spc.capability-measured]
alternatives: [msa.attribute-agreement]
related: [msa.bias-linearity-stability, stats.anova, msa.measurement-uncertainty]
---
# Gauge repeatability and reproducibility — how much of the variation is the measuring?

## Purpose and principle
Every reading is the product plus the measuring. Repeatability is the
gauge's own scatter (the same person, the same piece, again);
reproducibility is the people's (different operators, the same piece).
The study measures both against the variation between pieces and against
the tolerance, so a capability figure, a control chart or a reject
decision can be read knowing how much of it is the gauge. A seal tester
with 35% GRR cannot tell a 13 N seal from a 14 N one.

## Questions it answers
- What share of the observed variation is the measurement system?
- Is it the gauge (repeatability) or the people (reproducibility)?
- Can it tell parts apart (ndc), and is it fit for this tolerance?
- Is a capability figure measured with it trustworthy?

## Inputs and minimum conditions
- 10 pieces spanning the process's range (not ten near-identical ones),
  3 operators, 2–3 trials each, in random order, blind (the operator does
  not see the piece's identity or the last reading); 30–90 readings.
- The tolerance, for %GRR of tolerance; the process's own spread (or the
  pieces chosen to represent it) for %GRR of total variation.
- The gauge already fit on a reference (`msa.type1-gauge`).

## Procedure and calculation
Two-way crossed ANOVA (parts p, operators o, trials r):
- Mean squares MS_part, MS_op, MS_part×op, MS_error (the trial-to-trial
  scatter); the interaction tested F = MS_part×op / MS_error; when it is
  not significant (the AIAG manual pools it at α = 0.25) its sum of
  squares joins the error.
- Variance components: σ²_repeat = MS_error (or the pooled error);
  σ²_part×op = (MS_part×op − MS_error)/r; σ²_op = (MS_op − MS_part×op)/(p·r)
  (with the pooled error in place of MS_part×op when pooled); σ²_part =
  (MS_part − MS_part×op)/(o·r); negative estimates set to 0.
- σ²_reprod = σ²_op + σ²_part×op; σ²_GRR = σ²_repeat + σ²_reprod;
  σ²_total = σ²_GRR + σ²_part.
- %GRR (of total variation, the σ ratio the AIAG manual reports) =
  σ_GRR / σ_total × 100; %contribution = σ²_GRR / σ²_total × 100 (the
  square — a different, smaller number, often quoted in its place: say
  which).
- %GRR of tolerance = 6σ_GRR / (USL − LSL) × 100 (the manual's 6σ
  convention; some use 5.15σ for 99%).
- ndc = 1.41 × σ_part / σ_GRR, rounded down — the number of distinct
  groups of parts the system can tell apart; ≥ 5 wanted.
- The AIAG guide: %GRR under 10% acceptable; 10–30% may be acceptable
  depending on the use, the cost and the risk — decided and written; over
  30% not acceptable. Repeatability > reproducibility points at the gauge
  or the method; reproducibility > repeatability at training, the
  procedure or the fixture.
- The range method (X̄-R, d₂ constants) gives the same components without
  the interaction; the ANOVA is preferred and is what software does.

**Worked case** (`cases-msa.py`): seal strength (N), 10 packs × 3
operators × 2 trials, tolerance 6 N. Interaction F 1.02, p 0.47 → pooled.
Variances: repeatability 0.060, reproducibility 0.125 (all operator), GRR
0.185, part 1.339, total 1.524. %GRR of total variation 34.8% (σ ratio;
%contribution 12.1%), of tolerance 43%; ndc 3; EV 0.25 N, AV 0.35 N,
PV 1.16 N. Verdict: not acceptable — and the larger part is the people
(AV > EV): operator B reads 0.35 N above A. The fix is the method (where
the strip is clamped, the pull rate), not a new tester; after it the study
is repeated.

## Assumptions, limits and misuse
- Parts that do not span the range make %GRR of total variation look bad
  (small PV) while the gauge is fine; %GRR of tolerance does not depend on
  the parts and is the steadier figure for a go/no-go on a tolerance.
- Not blind, not random: operators remember the last reading and the
  study flatters the system.
- Destructive tests (seal strength, a pull to break) cannot repeat on the
  same piece; a nested study on pieces assumed identical (consecutive from
  one reel) is used, and its repeatability includes piece-to-piece
  variation — said plainly.
- %contribution reported as "%GRR" makes a 35% system look like 12%; the
  AIAG guide's 10/30 is on the σ ratio.
- One operator (an automatic gauge, a checkweigher) has no reproducibility
  term; the study is repeatability across days or set-ups instead.
- A gauge that passes on one tolerance fails on a tighter one.

## Reading the result
"The seal tester with its three operators accounts for 35% of the
variation seen (43% of the 6 N tolerance; it can tell 3 groups of packs
apart) — not fit; most of it is between operators (B reads 0.35 N high).
Fix the clamping method and repeat." Money: the decisions at the limit —
packs within ±σ_GRR of 12 N are coin-tosses; their number a shift ×
(a good pack rejected: materials and labour; a bad pack passed: the
complaint or the recall) (`knowledge/MONEY.md`, Q and C).

## When not to use it — and instead
A pass/fail judgement by eye → `msa.attribute-agreement`. A single gauge
on a reference → `msa.type1-gauge`. A method's reproducibility between
laboratories → ISO 5725. The uncertainty on a certificate →
`msa.measurement-uncertainty`.

## In food and FMCG manufacturing
Seal-strength testers (destructive — nested); bench scales across three
shifts' operators; probe thermometers (people's placement); Brix
refractometers (reading the line); colour and texture by instrument with
operators preparing the sample; the oxygen analyser's needle placement.

## References
- [manual] AIAG, *Measurement Systems Analysis Reference Manual*, 4th ed., 2010, ch. III — the crossed study, ANOVA method, %GRR, ndc, the acceptance guide (from knowledge; pooling rule and guide to confirm, text not read).
- [standard] ISO 5725-2:2019, *Accuracy (trueness and precision) of measurement methods and results — Part 2* — repeatability and reproducibility of a standard method (scope from knowledge).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 8 — gauge capability by ANOVA (from knowledge; edition to confirm).
- [paper] Burdick, R.K., Borror, C.M. and Montgomery, D.C. (2003), "A review of methods for measurement systems capability analysis", *Journal of Quality Technology* 35(4), 342–354 (from knowledge).

## In Faultline
Not built (FC-118). When built: the run sheet (10 × 3 × 2, random, blind)
printed for the floor, the readings tapped in, the ANOVA table and the
components said in words — which of the gauge and the people, the three
percentages each named, ndc — and the verdict carried to every study the
gauge measures, so a capability study's band says "measured with a system
that takes 12% of the tolerance".
