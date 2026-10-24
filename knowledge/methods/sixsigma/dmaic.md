---
id: sixsigma.dmaic
name: DMAIC — define, measure, analyse, improve, control
aka: [DMAIC, Six Sigma project, Lean Six Sigma, tollgate review, sigma level, DMADV]
discipline: sixsigma
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — ISO 13053-1:2011 *Six Sigma — Part 1: DMAIC methodology* (current, confirmed 2022 — checked online on 22 October); the phases' deliverables and the sigma-level convention (the 1.5 σ shift) from knowledge; the worked tollgates in `scripts/knowledge/cases-sixsigma-visual.py`; Faultline's running-line method is the 6M (`docs/SIXM.md`), which runs the same loop without DMAIC's gates
needs: [sixsigma.charter]
next: [sixsigma.sipoc, sixsigma.voc-ctq, spc.capability-measured]
alternatives: [rca.fishbone-5whys, rca.a3]
related: [commissioning.stage-gate, msa.gauge-rr, stats.doe-factorial, spc.control-charts-variables, sixsigma.dpmo-sigma]
---
# DMAIC — define, measure, analyse, improve, control

## Purpose and principle
A project in five phases, each closed by a review (the tollgate) on
evidence before the next begins. **Define**: the problem and the
customer's requirement (charter, SIPOC, VOC → CTQ). **Measure**: the
baseline of the CTQ with its capability, and the measurement system
proved fit to measure it (gauge R&R) before any data are believed.
**Analyse**: the root causes found with data — stratification,
hypothesis tests, regression, the five whys on what the data point at.
**Improve**: the solution designed (a DOE where several factors
interact), piloted and proved on the CTQ. **Control**: the gain held by
a control chart, a control plan row, the standard and the handover to
the process owner. The sigma level is its common currency — defects per
million opportunities converted to a Z value, by convention with 1.5 σ
added for long-term shift — useful for comparing processes, misleading
when the convention is forgotten.

## Questions it answers
- Is the project ready to pass this tollgate — on what evidence?
- Is the measurement system good enough to see the improvement it is
  looking for?
- What are the root causes, and how does the data show them?
- Did the improvement work, and is it held — by what chart and plan?

## Inputs and minimum conditions
- A charter with a measurable goal (`sixsigma.charter`).
- Data: the CTQ's baseline readings (`spc.capability-measured`), the
  gauge study (`msa.gauge-rr`), the stratified data for analysis.
- A team with the time; a sponsor for the tollgates; a process owner
  for control.

## Procedure and calculation
- Define: the charter signed; SIPOC; CTQs with limits.
- Measure: baseline Ppk (or DPMO for attributes — `sixsigma.dpmo-sigma`)
  with n; %GRR under 10% good, 10–30% acceptable by the purpose, over
  30% unfit (`msa.gauge-rr`); the data-collection plan.
- Analyse: stratification and its tests (`rca.stratification`), the
  Pareto, correlation and regression (`stats.correlation-regression`),
  the verified causes.
- Improve: the DOE (`stats.doe-factorial`) where factors interact; the
  pilot's before → after with its test (`rca.pdca`); the solution's
  cost against the charter's worth.
- Control: the control chart at the point of control
  (`spc.control-charts-variables`), the control plan row
  (`quality.control-plan`), the standard, the holding period (eight
  weeks is common) and the handover.
- Sigma level: Z = Φ⁻¹(1 − p) for the defect share p; "sigma level" =
  Z + 1.5 by convention — say which is quoted.

**Worked case** (`cases-sixsigma-visual.py`): the give-away project.
Define — charter, SIPOC, CTQ "mean give-away ≤ 2 g; no pack under the
nominal", signed. Measure — baseline Ppk 0.6 on 120 packs; the
checkweigher's %GRR 12%, acceptable; the data plan. Analyse — by head,
head 3 is 2 g heavy (p < 0.001); five whys to feed-tray vibration.
Improve — a 2³ DOE on feed rate, vibration and dwell; the pilot takes
4.1 g to 2.3 g (p < 0.001). Control — an X̄-R chart at the weigher, the
control plan row, the standard, eight weeks held. The 1.2% of packs
light before the project is a long-term Z of 2.26 — a "3.8 sigma"
process by the 1.5-shift convention, said as the convention it is.

## Assumptions, limits and misuse
- Heavy for small problems; a floor problem fixed in a week belongs to
  the 6M or an A3, not five tollgates.
- Tollgates as paperwork — slides approved without the evidence — are
  the common decay.
- Skipping the gauge study: an improvement smaller than the gauge's
  noise cannot be seen.
- The sigma level quoted without its convention compares nothing.
- Control handed to nobody: the chart stops being read in a month.

## Reading the result
"Measure complete: baseline give-away 4.1 g, Ppk 0.6, gauge %GRR 12% —
passed to Analyse." Money: the charter's worth a year, and at Improve the
pilot's effect × the model's rate (`knowledge/MONEY.md`) against the
solution's cost.

## When not to use it — and instead
A running line's problem found and fixed on the floor → the 6M
(`rca.fishbone-5whys`, `rca.a3`). A new equipment project with its gates
→ `commissioning.stage-gate`. The capability arithmetic →
`spc.capability-measured`; the sigma conversion → `sixsigma.dpmo-sigma`.

## In food and FMCG manufacturing
Give-away, yield and waste projects; a chronic seal-failure rate; a
start-up loss across a range of products — where the cause is in the
data and several factors interact.

## References
- [standard] ISO 13053-1:2011, *Quantitative methods in process improvement — Six Sigma — Part 1: DMAIC methodology* (current; confirmed 2022).
- [standard] ISO 13053-2:2011, Part 2: Tools and techniques (from knowledge).
- [textbook] Pyzdek, T. and Keller, P. (2014), *The Six Sigma Handbook*, 4th ed., McGraw-Hill (from knowledge).
- [textbook] Montgomery, D.C. (2013), *Introduction to Statistical Quality Control*, 7th ed., Wiley — chapter 1, DMAIC (from knowledge).

## In Faultline
Not built as a method of its own: the 6M (`docs/SIXM.md`, `src/lib/sixm.ts`)
runs define–measure–analyse–improve–control's loop as problem → causes
with evidence → countermeasures → proof → holding, without tollgates,
and the tools (capability, gauge R&R to come, ANOVA, before → after) are
its phases' instruments. A DMAIC project would be a 6M with its five
gates named — a decision for Rowland, not a build.
