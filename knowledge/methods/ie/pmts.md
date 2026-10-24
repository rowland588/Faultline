---
id: ie.pmts
name: Predetermined motion time systems — MTM and MOST
aka: [PMTS, MTM, MTM-1, MTM-2, MOST, BasicMOST, TMU, predetermined times, synthetic times]
discipline: ie
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — MTM-1 (Maynard, Stegemerten & Schwab 1948) and MOST (Zandin, 3rd ed. 2003) as the IE texts describe their structure (from knowledge); the TMU unit and the systems' shape worked in `scripts/knowledge/cases-ie.py`; **their data tables are licensed by the MTM Association and the MOST licence holders and are not reproduced here** (`knowledge/GAPS.md`)
needs: []
next: [ie.standard-data]
alternatives: [ie.time-study]
related: [ergonomics.layout-from-to, ie.micro-motion, lean.standard-work]
---
# Predetermined motion time systems — MTM and MOST

## Purpose and principle
A time for a job that does not exist yet, or a time with no stopwatch
and no rating: break the method into basic motions (reach, grasp, move,
position, release …), look each up in a table of times measured once on
thousands of people at a defined pace, and add them. MTM-1 does it at
the finest level (about 10 motions a second of work); MTM-2 and MOST
aggregate into sequences (a "general move" in MOST is one line with
indexed parameters) and are fast enough for ordinary work. The time
unit is the TMU, 0.036 s. Because the pace is built into the tables there
is no rating, and because the method is written motion by motion the
systems also design the job — a long reach or an awkward position shows
up as TMU before anyone is hurt.

## Questions it answers
- What will this job take before the line exists, or the method is
  changed?
- Is the proposed layout or fixture worth it (TMU saved per cycle)?
- Does the observed time agree with the synthetic one (a check on the
  study, or on the method being followed)?

## Inputs and minimum conditions
- A written method at motion level (MTM-1) or sequence level (MTM-2,
  MOST) with distances, weights and difficulty conditions.
- A trained analyst with a licensed copy of the tables (the MTM
  Association's; the MOST data); the training is days to weeks.
- Allowances added afterwards as for any basic time (`ie.allowances`).

## Procedure and calculation
- MTM-1: each motion coded (R30B — reach 30 cm, case B; G1A; M20C;
  P1SE; RL1) and its TMU read from the table; the sum is the basic time
  in TMU; × 0.036 for seconds (1 TMU = 0.0006 min); simultaneous motions
  of the two hands take the longer (with the simo table's limits).
- MTM-2: ten categories (GET, PUT, REGRASP, APPLY PRESSURE, EYE ACTION,
  FOOT, STEP, BEND & ARISE, CRANK, WEIGHT) with distance and case
  classes; about a third of MTM-1's analysis time.
- MOST (BasicMOST): three sequence models — general move
  (A B G A B P A), controlled move (A B G M X I A), tool use (A B G A B P
  … A) — each parameter given an index (0, 1, 3, 6, 10, 16 …) from its
  table; the indices summed × 10 = TMU; a sequence takes seconds to
  write.
- The result is a basic time at the systems' defined 100% pace (MTM's
  pace is often taken as about 83 BS points, a detail analysts argue);
  allowances then as usual.
- Validation: against a time study of the same method on a few cycles;
  a large gap means the written method is not what is done.

**Worked case** (`cases-ie.py`, the shape only): 1 TMU = 0.036 s; a
sequence summing to 420 TMU is 15.1 s of basic time at the system's
pace, with no rating; a MOST general move with indices 1 0 1 1 0 1 0 sums
to 4 → 40 TMU = 1.44 s. The tables that turn a motion into its index are
the associations' and are not in this library.

## Assumptions, limits and misuse
- The tables are licensed; using them in software needs the licence and
  trained analysts. Faultline does not reproduce them (GAPS).
- A synthetic time describes the written method; if the floor does it
  differently the time is of the wrong job.
- Fine-grained MTM-1 on a 40-second cycle is hours of analysis; MOST or
  a time study is proportionate.
- Process-controlled elements (a machine's run, a seal dwell) are not
  motions; they are timed or taken from the machine.
- Learning, fatigue and skill are outside the tables; the first weeks
  take longer (`ie.learning-curve`).
- The pace embedded in the tables differs between systems; mixing MTM
  and MOST times in one standard without saying so mixes paces.

## Reading the result
"The proposed case-packing method is 1,180 TMU — 42.5 s basic, 48 s
with allowances — 75 cases an hour; moving the tape dispenser to the
bench saves 60 TMU (2.2 s) a case." Money: the saving × cases × labour a
second (`knowledge/MONEY.md`, L), the fixture's price against it.

## When not to use it — and instead
A job that exists and can be timed → `ie.time-study` (cheaper, and it
measures what is done). Reusable element times from the site's own
studies → `ie.standard-data`. The two-hand analysis at motion level →
`ie.micro-motion`.

## In food and FMCG manufacturing
Designing a new hand-assembly station (sandwiches, selection packs)
before the line is built; comparing two layouts for a packing bench;
a cost-down proposal's labour claim checked synthetically; the OEM's
"one operator can run it" claim tested at motion level.

## References
- [textbook] Maynard, H.B., Stegemerten, G.J. and Schwab, J.L., *Methods-Time Measurement*, McGraw-Hill, 1948 — MTM-1 (from knowledge).
- [textbook] Zandin, K.B., *MOST Work Measurement Systems*, 3rd ed., Marcel Dekker, 2003 — BasicMOST, MiniMOST, MaxiMOST (from knowledge).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014, ch. 13 — predetermined time systems (from knowledge).
- [practice] The MTM Association (UK/International) — the licensed data cards and training (from knowledge).

## In Faultline
Research first (FC-023): the tables are licensed. Faultline's own route
to a time without a stopwatch on the day is the standard-data library
built from its time studies (`ie.standard-data`) and the video study's
elements; a PMTS mode is possible only with a licence, and then as a
method-level entry (MOST sequences) whose tables the site's analyst
holds.
