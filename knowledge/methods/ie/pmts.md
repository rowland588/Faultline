---
id: ie.pmts
name: Predetermined motion time systems — MTM and MOST
aka: [PMTS, MTM, MTM-1, MTM-2, MOST, BasicMOST, TMU, predetermined times, synthetic times]
discipline: ie
kind: established
evidence: practice
depth: full
checked: 2026-10-25 — researched again (FC-023), by web-search excerpts only (this container cannot fetch pages: mtm.org and Wikipedia are refused). Confirmed in excerpts - the TMU as 0.00001 h = 0.0006 min = 0.036 s; MTM released in 1948 from Westinghouse work by Maynard, Stegemerten and Schwab, its copyrights since held by the MTM Association; the family MTM-1, MTM-2 (1965), MTM-3 (1970, now obsolete), MTM-UAS, MTM-MEK and SAM; BasicMOST's four letter-coded sequence models and index-sum-times-ten rule; that the MTM data cards carry a printed copyright notice with reprinting forbidden, that the MTM Association's training platform restricts its data cards to registered, authorised users, that it runs a seal of approval for software and that third-party software ships the cards locked against user edits. NOT found - the MTM Association's or H.B. Maynard's actual licence terms for software or for typing table values. Not read - any data card or Zandin's book. MTM-1 and MOST as the IE texts describe their structure (from knowledge, as on 24 October); the TMU unit and the systems' shape worked in `scripts/knowledge/cases-ie.py`; **their data tables are licensed by the MTM Association and the MOST licence holders and are not reproduced here** (`knowledge/GAPS.md`)
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
  trained analysts. Faultline does not reproduce them (GAPS). **What is
  public, and what is not (25 October 2026).** Public as concept: that
  motion times can be summed; the unit (1 TMU = 0.00001 h = 0.0006 min =
  0.036 s, so 1 minute is about 1,667 TMU); the family and its dates; the
  *shape* of BasicMOST (General Move A B G A B P A, Controlled Move with
  M, X and I added, Tool Use; each parameter takes an index and the indices
  sum, times 10, to TMU); the idea that no rating is applied. Not public:
  the MTM data cards (copyright notice printed on them, reprint forbidden;
  access in the MTM Association's training system limited to registered,
  authorised users), the MOST index tables that turn a distance, a weight or
  a placement into an index (Zandin; H.B. Maynard's licensed material), and
  the analysts' certification. One fact quoted elsewhere in the library, the
  MTM-1 walking element (5.3 TMU a foot, about 1.6 m/s), is a single value
  from a data card; it is arithmetic-consistent (5.3 TMU is 0.19 s a foot)
  but its source was not read; the string diagram can take a walking pace
  typed by the floor instead (`lean.spaghetti`).
- Unverified from knowledge, to settle only with a card: the MTM-2 category
  count and names listed above, the pace of the tables ("about 83 BS
  points"), the MOST index scale (0, 1, 3, 6, 10, 16 …).
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
- [practice] The MTM Association e.V. — the data cards and training: https://mtm.org/en/about-mtm/data-cards/mtm-1 (page listed in search results, not opened), the training platform https://training.mtm.org/?lang=en (data cards only for registered, authorised users, as an excerpt says), the software seal of approval https://mtm.org/en/brands/sealofapproval (authorisation to use the MTM brands; data-use terms not stated in what was seen), and the licence course for MTM-1 at https://training.mtm.org/catalog/course/license-course-mtm-1-64.html . The licence terms themselves were not found; ask the association.
- [practice] MTM overview and TMU conversion, seen as excerpts of secondary pages only (https://en.wikipedia.org/wiki/Methods-time_measurement and https://www.onlineclothingstudy.com/2013/12/comparison-of-mtm-1-mtm-2-and-mtm-3.html ); BasicMOST's models, seen in a trade page and informal slide decks (https://scott-grant.co.uk/terms-and-techniques/most-technique/ ) — informal, hence not relied on for any table value.

## In Faultline
**Researched 25 October 2026 (FC-023). Verdict: LEAVE OUT as a tool of its
own (the same footing as the other licensed methods).** Reasons: the
value of MTM and MOST is the tables and the analyst who is certified to
read them, and Faultline can have neither; the unit and the shape are
public but a tool made only of those is a calculator for sums an analyst
already does in licensed software (TiCon and its like ship the cards);
what the owner's team does not have — a time before the line exists — has
an honest route the app already plans without a licence: the site's own
timed elements, reused (`ie.standard-data`), the video study's
elements, and the OEM's own claim tested against them.

**What would reopen it, and the one narrow piece that is honest even
then:** only if Rowland says his team has a licensed, certified analyst
(or buys the licence) *and* wants their results kept in the app. The
build would not contain a table. It would be a *synthetic time ledger*,
a mode of standard data, not a method beside it:
- *Inputs, all typed by the analyst from their own licensed analysis:* an
  element's name, the system the analyst used (MTM-1 · MTM-2 · MOST ·
  other), the analyst's name and licence reference, the element's time in
  TMU (or seconds), whether it is machine-paced.
- *Calculation:* TMU × 0.036 = seconds (the public unit, tested against
  the figures above); the sum for a method; the allowances typed (`ie.allowances`);
  the comparison with any timed element of the same name, with the gap
  said in seconds and percent and the caveat that a gap means the written
  method is not the one done.
- *Outputs and verdict ideas:* a method's synthetic time against takt and
  against the timed standard; the saving of a proposed change in TMU and
  seconds (the money from the one cost model); "agrees within X%" or "does
  not agree: check the method written". It never checks the analyst's
  coding, because it never holds a table.
- *Must not claim:* that Faultline analysed the motions; that a time is
  "MTM" or "MOST" unless an analyst with the licence typed it and said so;
  that the pace is standard in any system's sense beyond what the analyst
  states; any table value, code or index as its own.
- Until then: the entry stays *Research first* in the catalogue's honest
  reading, which means *left out on purpose* once Rowland confirms it. The
  moving of the status is his, not the builder's.
