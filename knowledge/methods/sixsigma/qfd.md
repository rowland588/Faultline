---
id: sixsigma.qfd
name: QFD — the house of quality
aka: [QFD, quality function deployment, house of quality, HoQ, relationship matrix, technical importance]
discipline: sixsigma
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Akao (1990) and Hauser & Clausing (1988, *Harvard Business Review*, "The House of Quality") for the matrix and the 9-3-1 relationship weights; from knowledge, texts not re-read; the worked house in `scripts/knowledge/cases-sixsigma-visual.py`
needs: [sixsigma.voc-ctq]
next: [spc.capability-measured]
alternatives: []
related: [sixsigma.voc-ctq, quality.fmea, packaging.seal-integrity]
---
# QFD — the house of quality

## Purpose and principle
A matrix that relates what the customer wants (the rows — needs, each
with an importance weight) to the technical characteristics the design
controls (the columns — measurable things with targets), with the
strength of each relationship in the cells (strong 9, medium 3, weak 1,
none 0 by the usual convention). Summing each column — need weight ×
relationship — gives each characteristic's technical importance: where
design effort and specification tightness should go. The "roof"
records which characteristics help or fight each other (a stronger seal
and an easier peel), the right wing compares competitors, the basement
holds the targets. It is a new-product and new-pack method; on a
running line its one lesson — rank the characteristics by what the
customer values — is carried by the CTQ tree.

## Questions it answers
- Which technical characteristics matter most to the customer's
  needs, and so which specifications must be tightest?
- Which characteristics conflict (the roof), and where is the
  trade-off?
- Where does our product stand against competitors on each need?
- What targets follow for each characteristic?

## Inputs and minimum conditions
- Customer needs in their words, weighted (from interviews, complaints,
  the retailer's specification — `sixsigma.voc-ctq`; 1–5 or a
  distributed 100 points).
- The technical characteristics: measurable, with units.
- Relationship strengths agreed by a cross-functional team on evidence
  (a test that shows peel force drives "easy to open"), not by vote
  alone.

## Procedure and calculation
- Importance of characteristic j: Iⱼ = Σᵢ wᵢ × rᵢⱼ; relative importance
  = Iⱼ ÷ Σ I.
- The roof: for each pair of characteristics, + (helps), − (fights) or
  blank; a − between two high-importance characteristics is the design
  problem.
- Targets per characteristic from the needs' limits and the
  competitors' values; the ones with high importance get the tight
  specification and the capability study (`spc.capability-measured`).
- A need with no strong relationship to any characteristic is unmet by
  the design (a gap); a characteristic with no relationship to any need
  is over-engineering.
- Later houses deploy the characteristics to parts, to process
  parameters, and to production controls (the control plan) — the
  "deployment".

**Worked case** (`cases-sixsigma-visual.py`): a lidded tray. Needs and
weights: easy to open 4, stays sealed to use-by 5, looks fresh 3,
recloses 2. Characteristics: peel force, seal strength, film clarity,
zipper force, residual oxygen. With 9-3-1 relationships, the
importances: seal strength 62 (30%), peel force 41 (20%), residual
oxygen 42 (20%), zipper force 37 (18%), film clarity 27 (13%). Seal
strength and peel force carry 49% between them — and they fight on the
roof (a stronger seal peels harder): the peelable-seal specification is
the design's trade-off, and the two characteristics get the capability
studies.

## Assumptions, limits and misuse
- Large and slow for a running line's problem; its place is the new
  product, the new pack, the new line's specification.
- Relationship strengths voted without evidence make the house a
  picture of the team's opinions.
- Weights from the engineers rather than the customer rank what the
  engineers like.
- The arithmetic is linear and additive; a must-be need (safety) is
  not traded against a delighter however the numbers fall.
- A house built once and filed changes nothing; its targets become
  specifications and controls, or it was an exercise.

## Reading the result
"Seal strength and peel force carry 49% of what the customer values —
and they conflict: the peelable seal's window (strength ≥ 1.5 N/15 mm,
peel 8–15 N) is the specification to hold." Money: the characteristics'
capability on the line is where the customer's value is lost or kept
(`knowledge/MONEY.md`, Q and C — rejects and complaints); the house ranks
which to spend on.

## When not to use it — and instead
Running-line problems → the 6M. Turning the voice into measurable CTQs
(the rows' limits) → `sixsigma.voc-ctq`. Failure modes of the design →
`quality.fmea`. The seal's own tests → `packaging.seal-integrity`.

## In food and FMCG manufacturing
A new pack design (peelable lids, reclose, MAP); a new line's
specification against the retailer's requirements; a reformulation
weighed against taste, shelf life and cost.

## References
- [textbook] Akao, Y. (ed.) (1990), *Quality Function Deployment: Integrating Customer Requirements into Product Design*, Productivity Press (from knowledge).
- [peer-reviewed] Hauser, J.R. and Clausing, D. (1988), "The House of Quality", *Harvard Business Review*, May–June (from knowledge).
- [textbook] Cohen, L. (1995), *Quality Function Deployment: How to Make QFD Work for You*, Addison-Wesley (from knowledge).

## In Faultline
Not built and not planned (FC-145, research): a new-product method
outside the running-line and stage-gate work. Its one lesson in
Faultline is the CTQ with its limit on a capability study
(`src/tools/capability`): the question first, then the measure.
