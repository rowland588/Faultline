---
id: rca.horizontal-deployment
name: Horizontal deployment — a proved fix offered to every line with the same machine
aka: [yokoten, horizontal deployment, best practice sharing, read across, lessons learned, replication]
discipline: rca
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Toyota's yokoten as Liker (2004) and practice describe it: a countermeasure proved in one place shared sideways, each receiving place checking it works there; from knowledge; the worked offer in `scripts/knowledge/cases-rca.py`; Faultline's factory knows every line's machines (`src/lib/lineRecords.ts`)
needs: [rca.fishbone-5whys, rca.pdca]
next: []
alternatives: []
related: [rca.pdca, rca.eight-d, lean.standard-work, visual.action-tracking]
---
# Horizontal deployment — a proved fix offered to every line with the same machine

## Purpose and principle
A countermeasure proved on one line — a splice guide on one wrapper, a
cleaning interval on one weigher head, a start-up sequence on one
depositor — is worth as much again on every other line with the same
machine or the same failure mode, and a factory that leaves it on the
line that found it pays for the same problem several times. Yokoten
(Toyota's word, "across everywhere") is the discipline of offering the
proved fix sideways, with its evidence, to every place it could apply,
and of each receiving place checking that it works there (its own
before → after), because a fix copied without checking is a rumour. The
measures are plain: the lines it could apply to, the lines that took it,
the lines where it was proved, and the worth at each.

## Questions it answers
- Where else does this fix apply — which lines have the same machine or
  the same failure?
- Which of them have taken it, and have they proved it there?
- What is each line's potential (its own rate of the problem) — the
  order to offer in?
- How long from proof on one line to proof on the last?

## Inputs and minimum conditions
- The fix as proved: the countermeasure, the number it moved, the
  before → after (`rca.pdca`), the standard written.
- The factory's lines with their machines (makes and models) and their
  failure records, so the places it could apply are listed by the app,
  not by memory.
- Each receiving line's own rate of the problem for its potential.
- An owner per receiving line and a day (`visual.action-tracking`).

## Procedure and calculation
- Candidates: lines with the same machine, or the same failure mode on
  a different machine (the register's problems by words and machine).
- Offered → taken → proved as three states per line; the share of
  candidates in each; days from the source proof to each.
- Each line's potential = its own rate of the problem × the fix's
  effect (the source's ratio, e.g. 0.36) × its cost rate — ranks the
  offers; a line whose rate is low gets the offer later.
- Proof on each line by its own before → after (a smaller sample is
  acceptable where the mechanism is identical; the check is that it
  moved, not a new discovery).
- A line that declines records why (a different model, a different
  product) — a decline with a reason is complete; an unanswered offer is
  open.
- The standard updated once for all (`lean.standard-work`), and the
  FMEA's or control plan's entry where one exists (`quality.fmea`).

**Worked case** (`cases-rca.py`): a splice guide proved on Line 3 — 5
fewer film breaks a shift, each 4 minutes: £33 of crew labour a shift
and 2,200 packs where the wrapper is the bottleneck. The same wrapper is
on Lines 1, 4 and 7. Offered to all three; taken on Line 1; proved on
none yet. The lines' own break rates (Line 7 six a shift, Line 1 four,
Line 4 two) rank the offers: 7 first, then 1, then 4 — Line 7 stands to
gain most and has not taken it.

## Assumptions, limits and misuse
- Copying without checking: the fix that worked on Line 3 may not on
  Line 7 (a different film, a different speed); each line proves it.
- Offering without a list: "everyone knows about it" deploys nothing;
  the candidates are named and each has a state.
- The fix is the standard, not the device alone: the setting, the
  check, the training travel with it.
- A source line's proof on eight shifts is the minimum; the receiving
  lines' proofs add to the evidence.
- Yokoten of a half-proved fix spreads a half-fix.

## Reading the result
"Splice guide proved on Line 3 (−64% breaks); same wrapper on Lines 1,
4 and 7 — taken on 1, open on 4 and 7; Line 7 stands to gain most, six
breaks a shift." Money: each candidate's potential by the model's row
(`knowledge/MONEY.md`, T and L), the sum of the open offers being what
the factory is leaving on the floor.

## When not to use it — and instead
The proof on the source line → `rca.pdca`. The cause before the fix →
`rca.fishbone-5whys`. The customer-facing report that carries the
prevention step (D7) → `rca.eight-d`. The standard the fix becomes →
`lean.standard-work`.

## In food and FMCG manufacturing
The same wrappers, weighers, sealers and metal detectors across several
lines; a group's sites with the same equipment; a cleaning method proved
on one slicer.

## References
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill — yokoten as part of learning (from knowledge).
- [textbook] Liker, J.K. and Meier, D. (2006), *The Toyota Way Fieldbook*, McGraw-Hill — sharing countermeasures (from knowledge).
- [practice] Automotive 8D practice — D7, prevention of recurrence across similar processes (from knowledge).

## In Faultline
Not built (FC-155). The factory knows every line's machines
(`src/lib/lineRecords.ts`) and the 6M holds a countermeasure's
proof (`src/lib/sixm.ts`); FC-155 adds the offer — the
candidate lines listed by machine and failure, each line's state and
potential, the proof on each — on the proved countermeasure and on the
control room.
