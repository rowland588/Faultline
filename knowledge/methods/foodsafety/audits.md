---
id: foodsafety.audits
name: Audits — findings, their closure, and the ones that repeat
aka: [internal audit, BRCGS audit, customer audit, GMP audit, audit findings, non-conformances, corrective action closure]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — audit practice as BRCGS Food Issue 9 (grading by majors and minors; internal audit programme clause 3.4) and retailer audits run it (from knowledge; the grading bands quoted are from memory and are to be confirmed against the standard); the worked case in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [visual.action-tracking]
alternatives: [lean.five-s]
related: [visual.action-tracking, quality.nonconformance-hold, rca.eight-d]
---
# Audits — findings, their closure, and the ones that repeat

## Purpose and principle
An audit — the certification body's, a customer's, the site's own
internal programme — produces findings: non-conformances graded by
severity, each needing a correction, a root cause and a corrective
action closed by a date with evidence. The site's grade follows from the
count and severity of findings; its real health shows in two other
figures: whether findings are closed on time, and whether the same
findings come back year after year — a repeat is a system that fixed
the symptom. Faultline's part is the actions: every finding is an action
with an owner and a day on the site's board, closed with evidence, and
counted when it repeats.

## Questions it answers
- What did the audit find — how many, how severe, in which clauses?
- Are the findings closed on time, and with what evidence?
- Which findings repeat from the last audit (the system failures)?
- Is the internal audit programme being done to its schedule?

## Inputs and minimum conditions
- The audit's findings: clause, severity (critical, major, minor, or
  the site's scale), the finding's words, the evidence.
- Per finding: the correction, the root cause, the corrective action,
  owner, due date, closure evidence, verified by whom.
- The previous audits' findings for the repeat check; the internal
  audit schedule and its completions.

## Procedure and calculation
- Findings by severity and clause; the grade by the standard's rule
  (BRCGS Issue 9, from memory and to confirm: AA with 0–5 minors, A with
  6–10, B with 11–16 or 1 major and up to 10 minors, C and D below —
  the standard's table is the authority).
- Closure: findings closed on time ÷ findings; mean days to close; open
  past due in red (`visual.action-tracking` — the same rows as any
  action).
- Repeats: a finding in the same clause or on the same subject as a
  previous audit's → marked repeat; repeats ÷ findings — the measure of
  whether corrective actions reached the cause (`rca.eight-d`'s root
  cause, not a re-training).
- Internal audits: scheduled ÷ done per period; their findings tracked
  the same way, so the external audit finds what the internal one
  already fixed.
- Trend across audits: findings by severity, closure rate, repeat rate.

**Worked case** (`cases-planning-foodsafety.py`): a BRCGS audit — 1
major, 7 minors → grade B (by the bands as remembered); 3 of the 7
minors repeat last year's (the glass and brittle-plastic register, the
calibration records, the pest-control contractor's proof) — the repeats
are the system failure, each needing a root cause this time. Internal
audits: 24 scheduled, 21 done (88%); 38 findings, 29 closed on time
(76%), mean 18 days to close.

## Assumptions, limits and misuse
- Closing a finding by re-training the person is the usual way to earn
  a repeat; the root cause is the system (the record, the schedule, the
  design).
- Findings closed without evidence are open; the evidence is the
  closure.
- An internal audit programme that finds nothing is not looking; its
  findings should pre-empt the external audit's.
- The grade is the certificate's business; the repeats and the closure
  are the site's.
- The grading bands above are from memory; the standard's current table
  is the one to cite when it matters.

## Reading the result
"Audit grade B: 1 major, 7 minors; 3 minors repeat last year's — glass
register, calibration records, pest proof — root causes this time, not
re-training. Internal audits 88% done, findings closed on time 76%."
Money: the grade's commercial consequence (a retailer's listing — C);
the corrective actions' cost (L, M) against the repeat they prevent.

## When not to use it — and instead
Tracking the actions themselves → `visual.action-tracking`. A serious
finding's root cause → `rca.eight-d`. Workplace order audits → `lean.five-s`.
Product found non-conforming during an audit → `quality.nonconformance-hold`.

## In food and FMCG manufacturing
BRCGS, FSSC 22000 and retailer audits; the internal GMP and hygiene
audit programme; the unannounced audit's findings on the board the same
afternoon.

## References
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022) — the grading protocol and clause 3.4 (internal audits) (from knowledge; the grading bands to confirm against the text).
- [standard] ISO 19011:2018, *Guidelines for auditing management systems* (from knowledge).
- [standard] ISO 22000:2018, clause 9.2 — internal audit (from knowledge).

## In Faultline
Built 25 October (FC-177, `knowledge/specs/FC-177-scored-audits.md`) as a check log on the shared shape (FC-236,
`defs/scored-audit.ts`): a daily GMP walk and a weekly hygiene audit, each question answered Not met, Partly met or Met
(0 to 2) with a running score, the score overall and by heading, each answer below Met a finding, each one ticked at
the end of the audit raised as its own problem (High when it came back from the audit before), the repeats marked against the audit before, the audits in
order with the falls in a row. The standard's grading bands are not built (to confirm). The closure and repeat rates
across the factory are not drawn yet. Proved by `log-shape.mjs`.
