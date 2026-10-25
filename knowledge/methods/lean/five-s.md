---
id: lean.five-s
name: 5S — sort, set in order, shine, standardise, sustain — audited
aka: [5S, 6S, workplace organisation, 5S audit, red tag, shadow board]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the five S as Hirano (1995) and Osada (1991) frame them, and the audit as practice frames it (a scored checklist, layered audits, photos) — from knowledge, texts not re-read; the scoring and the two-auditor agreement worked in `scripts/knowledge/cases-lean.py`
needs: []
next: [visual.daily-management, lean.standard-work]
alternatives: [foodsafety.audits]
related: [visual.visual-management, maintenance.autonomous-maintenance, lean.poka-yoke]
---
# 5S — sort, set in order, shine, standardise, sustain — audited

## Purpose and principle
Workplace organisation is the floor under standard work and visual
control: what is not needed goes (sort — the red tag), everything that
stays has a marked place and is found in seconds (set in order — the
shadow board, the line on the floor), cleaning is inspection (shine — a
leak or a loose guard is seen while wiping), the first three are written
as the area's standard with photographs of "right" (standardise), and
the standard is kept by habit and by audit (sustain). The audit is a
scored checklist, the same questions each time, by a trained auditor who
is not the area's own; its score is a share of the maximum, by S, and
its value is the trend and the weakest S, not the number. In food
manufacturing 5S and hygiene are the same discipline: a clean, ordered
area is also the auditable one.

## Questions it answers
- Is this area at its standard, and which S is weakest?
- Is it holding — the trend over audits?
- Do two auditors see the same area the same way (is the score
  honest)?
- Which findings are open and who owns them?

## Inputs and minimum conditions
- The area's standard (the photographs of right, the layout, the
  shadow boards) agreed with the people who work there.
- A checklist per area: 3–5 questions per S, each scored on the same
  scale (0–4 is common), with the evidence that earns each score
  written so two auditors agree.
- Audits on a cadence (weekly by the team leader, monthly by a manager
  — layered), with who, when, the findings and photographs.

## Procedure and calculation
- Score per question; S score = Σ ÷ (questions × max); area score =
  Σ all ÷ (all questions × max), as a percentage.
- Trend by audit; a fall two audits running is the signal; the weakest
  S is where the next effort goes.
- Each finding under its standard an action (owner, day —
  `visual.action-tracking`); findings open past their day in red.
- Auditor agreement: two auditors scoring the same area the same day —
  the share of questions scored exactly alike and within one; under
  about 70% exact the checklist's wording or the training is the
  problem (`msa.attribute-agreement` for the full method).
- A red-tag area: items tagged with date and reason; items not claimed
  in the period disposed of — the count and the value freed is a
  measure of sort.
- Shine as inspection: abnormalities found while cleaning (a leak, a
  loose fastener, a cracked guard) logged as the TPM "fuguai" tags do
  (`maintenance.autonomous-maintenance`) — the count found and fixed.

**Worked case** (`cases-lean.py`): five S × four questions, 0–4 each,
maximum 80. Line 3 scored 52 — 65%: Sort 88%, Set in order 69%,
Shine 44%, Standardise 69%, Sustain 56%. The previous four audits read
81, 78, 75, 72 — four falls in a row (81 to 65), and shine the weakest: the
cleaning standard is not being followed, which in a food factory is a
hygiene finding before it is a lean one. Two auditors on the same area:
65% against 61%, exact agreement on 75% of the questions and within one
on all — the checklist is sound.

## Assumptions, limits and misuse
- Scores drift with the auditor; a checklist whose evidence per score
  is written, and layered audits, keep it honest.
- A high score in a tidy office and a low one on a busy line is not a
  comparison; compare an area with itself over time.
- 5S as a one-off clean-up (a "5S day") with no audit afterwards decays
  within weeks; sustain is the method.
- Scoring the people rather than the system (a league table by team)
  turns the audit into a contest and the scores into fiction.
- Hygiene audits have their own clauses and law (`foodsafety.audits`);
  5S does not replace them, and should not duplicate their questions.

## Reading the result
"Line 3 at 65%, down from 81% over five audits; shine is 44% — the
cleaning standard is not being kept, and three findings are open past
their day." Money: the minutes looking for tools and materials
(`knowledge/MONEY.md`, T — a work sampling's "searching" share,
`ie.work-sampling`), the red-tag items' value freed (H), and the
abnormalities shine catches before they stop the line.

## When not to use it — and instead
Hygiene and food-safety audits → `foodsafety.audits`. The daily routine
that reviews the audits → `visual.daily-management`. The operators'
clean-inspect-tag routine on machines → `maintenance.autonomous-maintenance`.
The standard the area works to → `lean.standard-work`.

## In food and FMCG manufacturing
Colour-coded cleaning tools on shadow boards by zone; knife and blade
control; allergen-coded utensils in their marked places; the packing
hall's film and case stations; the engineering workshop.

## References
- [textbook] Hirano, H. (1995), *5 Pillars of the Visual Workplace*, Productivity Press (from knowledge).
- [textbook] Osada, T. (1991), *The 5S's: Five Keys to a Total Quality Environment*, Asian Productivity Organization (from knowledge).
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill — 5S as a foundation of visual control, not an end (from knowledge).

## In Faultline
Built 25 October (FC-013, on the scored-audit specification `knowledge/specs/FC-177-scored-audits.md`) as a check
log on the shared shape (FC-236, `defs/five-s.ts`): twenty questions under the five S's, each scored 0 to 4, the
score the share of the maximum overall and by S, the weakest S named, every answer below 3 a finding, each one ticked at the
end of the audit raised as its own problem (High when it was below 3 in the audit before too), the falls in a row counted back from the newest, the
trend over the audits. Worked case reproduced: 52 of 80 = 65%, Shine the weakest at 44%, nine findings, four of them
repeats. Two auditors' agreement and a photograph of right beside each question are not built. Proved by
`log-shape.mjs` and `src/tools/checks/__tests__/figures.test.ts`.
