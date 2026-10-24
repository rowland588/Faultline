---
id: packaging.seal-integrity
name: Seal integrity — strength on a one-sided limit, leaks as pass or fail
aka: [seal strength, peel test, leak test, bubble test, dye penetration, burst test, seal verification, ASTM F88]
discipline: packaging
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — ASTM F88/F88M-23 (seal strength by tension) and ASTM F2096 (gross leaks by internal pressurisation, the bubble test) confirmed online 22 Oct 2026 (scope and edition; texts not read); ASTM F1929 (dye penetration) and F2095 (pressure decay) named from knowledge; the statistics as `spc.capability-measured` and `spc.zero-failure-demonstration`; the worked case computed in `scripts/knowledge/cases-operations.py`
needs: []
next: [spc.capability-measured, spc.zero-failure-demonstration]
alternatives: []
related: [spc.capability-attribute-proportion, stats.doe-factorial, packaging.map-residual-oxygen, msa.gauge-rr]
---
# Seal integrity — strength on a one-sided limit, leaks as pass or fail

## Purpose and principle
A pack's seal has two questions: how strong (a measured peel force on a
strip, against a minimum the pack must hold through distribution), and
whether it leaks (a pass/fail test on the whole pack — bubbles under
water with the pack pressurised, dye drawn through a channel, pressure
decay). Strength is a one-sided measured capability; leaks are a
proportion where the only acceptable count is zero, so the question
becomes how many tested with none leaking shows a low enough rate. Both
are destructive, so every sample costs a pack, and the sample sizes are
chosen with that in mind.

## Questions it answers
- Is the seal strong enough, with margin, against its minimum?
- What leak rate can we claim from n packs tested with none leaking?
- Which settings make the seal (temperature, dwell, pressure — the
  factorial)?
- Did a film or jaw change move the strength or the leak rate?

## Inputs and minimum conditions
- Strength: strips cut to the standard width (15 mm or 25 mm; F88 says
  which), pulled at the standard rate on a tester (its gauge R&R known,
  `msa.gauge-rr` — a nested study, the test is destructive); the minimum
  agreed (N per 15 mm) from the pack's distribution tests; 20–30 strips
  per check for a capability, 5 per hour for a chart.
- Leaks: whole packs, the test method and its sensitivity (bubble tests
  find gross leaks, roughly 50–250 µm channels; dye finds smaller;
  pressure decay smaller still), the count tested and the count leaking.
- The seal's conditions logged with each sample (jaw temperature, dwell,
  pressure, film reel) for the cause.

## Procedure and calculation
- **Strength**: mean, s, the one-sided Ppl = (x̄ − L)/3s with its lower
  bound (Bissell, `spc.capability-measured`); the readings on an
  individuals chart over the run (`spc.control-charts-variables`); the
  failure mode noted (peel, tear, delamination — F88 records it).
- **Leaks**: k leaking of n tested → the rate's upper bound
  (`spc.capability-attribute-proportion`); with k = 0 the 95% upper bound
  is 1 − 0.05^(1/n) ≈ 3/n (`spc.zero-failure-demonstration`): 59 packs
  with none leaking → at most 5%; 299 → at most 1%; to claim 0.1% needs
  about 3,000 — which no destructive test does, hence the role of the
  in-line checks and the seal's own capability.
- **Settings**: the factorial on temperature, dwell and pressure
  (`stats.doe-factorial`) finds the window; the strength's response
  surface its best point and its slack.
- A high residual oxygen on a MAP pack with a leak is the seal's
  (`packaging.map-residual-oxygen`).
- Money: leakers × their cost (a returned pack, a complaint, a shortened
  life — `knowledge/MONEY.md`, Q and C); the destructive samples × a pack
  (the test's own cost); a seal run hotter than the window needs (E).

**Worked case** (`cases-operations.py`): seal strength on thirty strips,
minimum 10 N/15 mm — mean 14.41 N, s 0.47, Ppl 3.15 (95% lower bound
2.46): capable with wide margin; the window could run cooler. Leaks: 0
of 59 packs in the bubble test → at most 5.0% leak at 95%; 0 of 299 → at
most 1.0%. A claim of "under 1% leakers" needs 299 packs tested with
none leaking — or the capability of the seal's settings, held on the
chart, to stand in for the count.

## Assumptions, limits and misuse
- Strength and leaks are different failures: a strong seal can channel
  (a fold, a contaminant in the seal area); a weak one can be tight.
  Both are tested.
- Destructive tests on the same pack are impossible, so the strength
  tester's repeatability is nested in pack-to-pack variation — said so
  in the gauge study.
- A bubble test's sensitivity is gross leaks only; "no leaks found" is
  "no gross leaks"; the method's sensitivity is stated with the result.
- Zero leaks in 20 packs proves almost nothing (at most 14%); the n is
  chosen for the claim.
- Strips cut off-centre or pulled at the wrong rate scatter the strength;
  the standard's method is the method.
- The minimum strength comes from the pack's distribution trial (drop,
  vibration, altitude), not from a round number.

## Reading the result
"Seal strength 14.4 N against a 10 N minimum — Ppl 3.2, capable; 0 of
59 leaked in the bubble test, so at most 5% could — to claim under 1%
we test 299 or hold the settings on the chart." Money: the samples cost
59 packs; a leak rate of even 1% on 50,000 packs a shift is 500 leakers
× their cost (`knowledge/MONEY.md`, Q, C).

## When not to use it — and instead
The seal's settings found by experiment → `stats.doe-factorial`. The
measured capability → `spc.capability-measured`. The proportion and the
zero-failure count → `spc.capability-attribute-proportion`,
`spc.zero-failure-demonstration`. Oxygen in the pack → `packaging.map-residual-oxygen`.

## In food and FMCG manufacturing
Flow-wrap and tray-seal lines, MAP packs, pouches and sachets, bag-in-
box; the seal check after every jaw change and film reel; the
distribution complaint ("burst in transit") traced back to the strength
and the window.

## References
- [standard] ASTM F88/F88M-23, *Standard Test Method for Seal Strength of Flexible Barrier Materials* — scope and edition confirmed online 22 Oct 2026; text not read.
- [standard] ASTM F2096-11(2019), *Detecting Gross Leaks in Packaging by Internal Pressurization (Bubble Test)* — confirmed online 22 Oct 2026; text not read.
- [standard] ASTM F1929 (dye penetration), ASTM F2095 (pressure decay) — named from knowledge.
- [textbook] Robertson, G.L., *Food Packaging: Principles and Practice*, 3rd ed., 2012 — heat sealing and seal testing (from knowledge).

## In Faultline
Not built as its own tool (FC-165): a capability study can hold seal
strength on a one-sided limit or pass/fail leak tests and says what the
count proves (`src/tools/capability`, parts 1 and 4 of the capability study); FC-165 adds
the seal's conditions logged with each sample, the two tests side by
side on the line's program, and the leak claim's n said before the test.
