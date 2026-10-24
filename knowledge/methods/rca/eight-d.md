---
id: rca.eight-d
name: 8D — eight disciplines of problem solving
aka: [8D, eight disciplines, corrective action report, containment, TOPS, customer corrective action request, CAR]
discipline: rca
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Ford's Team Oriented Problem Solving (8D, 1987) and the automotive practice around it (AIAG; VDA's *8D — Problem solving in 8 disciplines*, 2018 edition named from knowledge, to confirm); the D0–D8 steps from knowledge, texts not read; the worked timeline in `scripts/knowledge/cases-rca.py`
needs: [rca.is-is-not, rca.fishbone-5whys]
next: [rca.horizontal-deployment, quality.fmea]
alternatives: [rca.a3, rca.fishbone-5whys]
related: [quality.complaints, quality.nonconformance-hold, rca.pdca, quality.control-plan]
---
# 8D — eight disciplines of problem solving

## Purpose and principle
The structured report for a significant problem — usually one a
customer or an incident has raised — that shows the problem was
contained at once, its root cause found and verified, the corrective
action chosen, implemented and proved, and recurrence prevented in the
system, with dates for each. The eight disciplines: **D0** the symptom
and the emergency response; **D1** the team; **D2** the problem
described (the is/is-not specification); **D3** interim containment
(the product held, the customer protected, verified to work); **D4**
the root cause and the escape point (why it happened, and why it was
not caught) — verified by turning it on and off; **D5** the permanent
corrective action chosen and shown to work; **D6** implemented and
validated on the number; **D7** prevention — the system changed (the
FMEA, the control plan, the standard, the other lines); **D8** closure
and the team recognised. Its measure is that each discipline has
evidence and a date, and that the problem does not come back.

## Questions it answers
- What was contained, how much, and did the containment work?
- What is the root cause, and the escape point — and how were they
  verified?
- Does the corrective action work (before → after), and is it in the
  system (FMEA, control plan, standard, other lines)?
- How long did each discipline take, and is the report closed with
  evidence?

## Inputs and minimum conditions
- The problem's facts (the complaint, the incident, the counts) and the
  is/is-not specification (`rca.is-is-not`).
- The containment: product held (`quality.nonconformance-hold`), sorted,
  recalled or reworked, with the quantities and the verification that
  no more escaped.
- The root-cause analysis (`rca.fishbone-5whys`, `rca.stratification`)
  and its verification.
- The corrective action's before → after (`rca.pdca`); the system
  documents changed (D7).

## Procedure and calculation
- One section per discipline, each with its evidence, owner and date;
  the elapsed days from D0 to each (D3 within a day; D4 verified within
  two weeks; D8 within 30–60 days are common expectations — the
  customer's or the standard's timetable governs).
- D3's containment quantity and cost: units held × unit cost
  (`knowledge/MONEY.md`, H); the containment's verification — checks on
  the held product and on what reached the customer after.
- D4's verification: the cause turned on reproduces the problem and
  turned off removes it, or the stratification shows it only where the
  cause is present.
- D6's validation: the number before → after with the test
  (`stats.two-sample-tests`) and the time without recurrence — "0 in six
  weeks" said with what it proves (`spc.zero-failure-demonstration`:
  against the old rate, the expected count that did not happen).
- D7: the FMEA's occurrence or detection rating changed
  (`quality.fmea`), the control plan's check added
  (`quality.control-plan`), the standard rewritten, the fix offered
  sideways (`rca.horizontal-deployment`).
- A report with a D4 that says "operator error" and a D7 that says
  "retrained" is sent back; the system cause is required.

**Worked case** (`cases-rca.py`): leaking seals from lane 3. D0 day 0 —
the customer's complaint and the line stopped; D1–D3 day 1 — team,
is/is-not, 14 pallets held (14 × 1,200 × £0.42 = £7,056 tied up); D4
day 9 — the new jaw's heater reading 12 °C low, verified by swapping the
jaw to lane 2 (the leaks moved); D5 day 12 — a heater calibration check
at every jaw change; D6 day 19 — implemented, 0 leakers in six weeks on
lane 3 where the old rate would have given about 540; D7 day 26 — the
FMEA's detection rating changed, the jaw-change checklist in the
control plan, the check offered to the other sealers; D8 day 30 —
closed.

## Assumptions, limits and misuse
- Written to close a complaint rather than to solve the problem: a D4
  of "human error" and a D7 of "retraining" is the signature.
- Containment reported as corrective action: D3 protects the customer;
  it fixes nothing.
- A root cause not verified (turned on and off) is a hypothesis in a
  box.
- The escape point is half of D4 and usually skipped: why did the
  checks not catch it?
- 8D is heavy; a chronic internal improvement belongs to the 6M or an
  A3, not to a customer's form.

## Reading the result
"D3 contained 14 pallets (£7,056 held); D4 root cause: the new jaw's
heater 12 °C low, verified by the swap; D6: 0 leakers in six weeks
against 540 expected; D7: FMEA, control plan and the other sealers.
Closed day 30." Money: the containment (H), the rework or scrap (Q), the
customer's consequence avoided (C), and the corrective action's cost —
each said apart.

## When not to use it — and instead
Internal improvement with no customer form → the 6M, or `rca.a3`. The
specification step → `rca.is-is-not`. The cause → `rca.fishbone-5whys`.
The complaint record itself → `quality.complaints`. The hold →
`quality.nonconformance-hold`.

## In food and FMCG manufacturing
Retailer complaints and their corrective-action requests;
foreign-body incidents; a withdrawal's report; a BRCGS major's root cause
(`foodsafety.audits`).

## References
- [practice] Ford Motor Company (1987), *Team Oriented Problem Solving (TOPS)* — the original 8D (from knowledge).
- [standard] VDA, *8D — Problem Solving in 8 Disciplines*, Verband der Automobilindustrie (2018 edition named from knowledge; to confirm).
- [textbook] Rambaud, L. (2011), *8D Structured Problem Solving*, 2nd ed., PHRED Solutions (from knowledge).

## In Faultline
Not built (FC-150). The register's problem with its journey, the hold
and the 6M's cause and proof are its pieces (`src/snag`,
`src/lib/sixm.ts`); FC-150 would lay them as the eight
disciplines with their dates and evidence and print the report in the
customer's shape — one paper from records that already exist.
