---
id: lean.maturity-assessment
name: Lean and operational-excellence maturity assessment
aka: [lean assessment, maturity model, Shingo model, lean audit, operational excellence assessment, OpEx assessment]
discipline: lean
kind: emerging
evidence: practice
depth: full
checked: 2026-10-24 — many proprietary models (the Shingo Institute's model and its guiding principles; consultancies' and groups' own frameworks); no single public standard; the scoring and agreement arithmetic here is generic; from knowledge, texts not read — the licensing of any named model is unverified and is in `knowledge/GAPS.md`
needs: []
next: [projects.ci-programme]
alternatives: []
related: [lean.five-s, visual.daily-management, msa.attribute-agreement]
---
# Lean and operational-excellence maturity assessment

## Purpose and principle
A structured judgement of how far an operation's practices and
behaviours have come — daily management, problem solving, standard
work, visual management, leader behaviours, and more — against a
model's levels (typically five, from "not started" to "a way of life"),
with evidence for each, so that a site or a group chooses what to
develop next and sees whether it is moving year on year. Every model is
somebody's: the Shingo Institute's is built on guiding principles and
behaviours rather than tools; groups and consultancies have their own
with their own dimensions. The arithmetic is simple and the judgements
are the hard part: two assessors must see the same evidence the same
way, or the score is theirs rather than the site's.

## Questions it answers
- Where is this site strong and weak, by dimension, against the
  model's levels?
- Has it moved since the last assessment?
- Do two assessors agree (is the score reliable)?
- What is the next level's evidence in each weak dimension — the
  development plan?

## Inputs and minimum conditions
- A chosen model with its dimensions, its level descriptions and the
  evidence each level needs — and the right to use it.
- Trained assessors (two or more), a day on the floor and in the
  records, the evidence noted against each criterion.
- The previous assessment for the trend.

## Procedure and calculation
- Each dimension scored at the level whose evidence is fully met (not
  partly); the mean across dimensions is a summary only — the profile
  by dimension is the result.
- Assessor agreement: the share of dimensions scored exactly alike by
  two assessors, and within one level; under about 70% exact, the
  descriptors or the training need work before the score is reported
  (`msa.attribute-agreement` for the full method with κ).
- The trend: each dimension against the previous assessment; a rise
  that two assessors agree on is a move.
- The development plan: for each weak dimension, the next level's
  evidence as actions with owners (`projects.ci-programme`).
- The tools' own numbers (the loss count, the capability, the audits)
  are the evidence for several dimensions; a high maturity score with
  poor numbers is a model problem.

**Worked case** (`cases-lean.py`): five dimensions, two assessors.
Daily management 2 and 2; problem solving 3 and 2; standard work 2 and
3; visual management 3 and 3; leader behaviours 2 and 2. Exact
agreement on 3 of 5 (60%) — below the 70% that would let the score
stand; the two disagreements are reconciled on the evidence before the
profile is reported. Mean level 2.4 of 5; the profile says daily
management and leader behaviours are the development plan.

## Assumptions, limits and misuse
- Models differ and are often proprietary; a group's model may be used
  only within the group, and the Shingo model's assessment is the
  Institute's. Licensing is unverified here (`knowledge/GAPS.md`).
- Scores are judgements; without two assessors and their agreement the
  number is one person's opinion.
- A maturity score as a target produces assessment theatre; the
  numbers on the floor are the target, the maturity is how they are
  achieved.
- Comparing sites on different models, or on one model with different
  assessors, compares the assessors.
- An assessment a year is a photograph; the daily management system is
  the film.

## Reading the result
"Daily management level 2 of 5, problem solving 3, standard work 2,
visual management 3, leader behaviours 2 — assessors agreed on three of
five; the plan is daily management and leaders' routines." Money: none
of its own; its value is where it points the programme whose tools carry
the money (`knowledge/MONEY.md`).

## When not to use it — and instead
For a line's numbers, use the tools themselves. The programme the
assessment feeds → `projects.ci-programme`. Workplace order →
`lean.five-s`. The daily routine → `visual.daily-management`.

## In food and FMCG manufacturing
Group-wide manufacturing excellence programmes assessing each site
yearly; a site's own self-assessment before a group's; the development
plan in the site's hoshin.

## References
- [practice] Shingo Institute (Utah State University), *The Shingo Model* — guiding principles, systems, tools and results; the Shingo Prize assessment (from knowledge; text not read).
- [textbook] Liker, J.K. and Convis, G.L. (2012), *The Toyota Way to Lean Leadership*, McGraw-Hill — leadership behaviours as the measure (from knowledge).
- [practice] Various group and consultancy models (proprietary; not cited).

## In Faultline
Research first (FC-018): which model, with what right to use it, and
whether a generic five-level frame of Faultline's own would serve
Rowland's team better than a licensed one — a question for him. When
built: the dimensions, two assessors' levels with evidence, their
agreement, the profile and its trend, and the development plan as
actions.
