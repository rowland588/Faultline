---
id: rca.is-is-not
name: Is / is not — specifying the problem (Kepner–Tregoe)
aka: [is is not, Kepner Tregoe, KT problem analysis, problem specification, distinctions and changes, what where when extent]
discipline: rca
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Kepner & Tregoe, *The Rational Manager* (1965) and *The New Rational Manager* (1981): the specification (what, where, when, extent — is and is not), distinctions, changes, possible causes tested against the specification; from knowledge, texts not re-read; the worked specification in `scripts/knowledge/cases-rca.py`
needs: []
next: [rca.fishbone-5whys]
alternatives: [rca.fishbone-5whys]
related: [rca.stratification, rca.eight-d, quality.defect-concentration]
---
# Is / is not — specifying the problem (Kepner–Tregoe)

## Purpose and principle
A sharp problem — a sudden change from how things were — is found by
describing it precisely before anyone proposes a cause. Four
dimensions, each asked two ways: **what** it is (the object, the
defect) and what it could reasonably be but **is not**; **where** it is
seen (which line, lane, head, position on the pack) and where it is
not; **when** it is seen (since, at what times, at what point in the
cycle) and when not; **extent** (how many, how much, the trend) and
what it is not. The **distinctions** — what is true only of the "is"
side — and the **changes** that happened at or before the "when" point
at the cause, and every candidate cause is tested against the whole
specification: a true cause explains every is and every is not. It is
the fastest method for a sudden spike and the wrong one for a chronic,
many-caused problem.

## Questions it answers
- Exactly what, where, when and how much is the problem — and what,
  where, when and how much is it not?
- What is distinctive about the "is" side, and what changed?
- Which candidate causes survive the test against every line of the
  specification?
- What is the one thing to check first?

## Inputs and minimum conditions
- Facts about the occurrences: the defect, the lane, the shift, the
  time, the count — from records and the floor, not memory.
- Facts about non-occurrences: the lanes, products, shifts and times
  that could have shown it and did not.
- The change log: what was fitted, adjusted, changed in material or
  people, and when (the register's and the machines' histories).

## Procedure and calculation
- The specification as a table: What · Where · When · Extent, each
  with IS and IS NOT in the facts' own words and numbers.
- Distinctions: for each IS, what is true of it that is not true of
  its IS NOT (lane 3 has a new jaw; nights have a different crew).
- Changes: in, on or around each distinction, what changed and when;
  a change that lines up with the WHEN is the lead.
- Candidate causes listed; each tested: "if this were the cause, how
  would it explain the IS and the IS NOT?" — a cause that needs an
  extra assumption to explain one line is marked; the one that explains
  all with none is the most probable cause.
- Verify the most probable cause by a check on the floor (measure the
  jaw's temperature, swap the part between lanes and see the problem
  move) before acting.
- The extent's trend (steady, rising, cyclic) is part of the
  specification and a test too.

**Worked case** (`cases-rca.py`): leaking seals. WHAT — IS: leaking seals
on 400 g trays; IS NOT: 200 g trays, flow-wrap packs. WHERE — IS: lane 3
of the tray sealer; IS NOT: lanes 1, 2, 4. WHEN — IS: since Tuesday
14:00, every shift; IS NOT: before Tuesday, not only at start-up. EXTENT
— IS: 3.2% of lane-3 packs, steady; IS NOT: 0.3% on the other lanes, not
rising. Distinction: lane 3 only, from Tuesday afternoon. Change: a new
sealing jaw fitted on lane 3 on Tuesday at 13:30. Candidate "film batch"
fails the test — the film is shared by all four lanes; candidate "the
new jaw's heater reads low" explains every line if the new jaw's heater
differs — check it first.

## Assumptions, limits and misuse
- Filled with opinion instead of facts, the table proves whatever the
  room believes; every entry has a source.
- The IS NOT column is where the method lives; a specification with
  only IS lines is a complaint.
- Chronic problems with many small causes do not have one distinction;
  they belong to the fishbone and stratification.
- A change found is a lead, not a verdict; the verification on the
  floor is the step most often skipped.
- The method finds the cause of a deviation from a previous good state;
  a problem that was always there has no "since".

## Reading the result
"Leakers on lane 3 only, since Tuesday 14:00, 3.2% against 0.3%; the new
jaw fitted Tuesday 13:30 is the only change that fits every line — check
its heater before anything else." Money: the extent × the pack's cost
(`knowledge/MONEY.md`, Q) a shift, and the hold while it is open (H).

## When not to use it — and instead
Many possible causes to explore → `rca.fishbone-5whys`. Finding which
stratum first → `rca.stratification`. The formal customer report
around it → `rca.eight-d`. Where on the pack the defect sits →
`quality.defect-concentration`.

## In food and FMCG manufacturing
Sudden spikes in rejects, leakers or complaints; a weight shift on one
head; a taste complaint from one depot; a stop that began on one shift.

## References
- [textbook] Kepner, C.H. and Tregoe, B.B. (1981), *The New Rational Manager*, Princeton Research Press — problem analysis (from knowledge).
- [textbook] Kepner, C.H. and Tregoe, B.B. (1965), *The Rational Manager*, McGraw-Hill (from knowledge).

## In Faultline
Not built (FC-149). The register holds a problem's words, line, machine
and time (`src/snag`) and the machines carry their change histories;
FC-149 is the four-by-two table on a problem, the distinctions and
changes beside it (the machine's history offered), each candidate cause
tested line by line, and the first check named — feeding the 6M's
problem statement.
