---
id: projects.risk-register
name: Risk register — likelihood and impact, owner and response
aka: [risk register, risk log, RAID log, likelihood impact, decision log, risk matrix, mitigation]
discipline: projects
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — project-management practice (PMBOK's risk register; the probability–impact matrix; the four responses avoid/transfer/mitigate/accept); from knowledge, texts not re-read; declined for Faultline on 17 October — the issue and risk logs are the Problems register and its Critical (`docs/BLUEPRINT.md` §6); the worked scores in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: []
alternatives: [visual.action-tracking]
related: [quality.fmea, rca.fault-tree, visual.action-tracking]
---
# Risk register — likelihood and impact, owner and response

## Purpose and principle
What could go wrong on the project, how likely, how bad, who is
watching it and what will be done — a list reviewed at every steering
meeting so that the risks that become issues were seen coming. Each
risk has a **likelihood** and an **impact** on simple scales (1–5),
their product the score that ranks it; an **owner**; a **response**
(avoid it by changing the plan, transfer it by contract or insurance,
mitigate it by an action that lowers likelihood or impact, accept it
with a contingency); and a **trigger** that says when the risk has
become an issue. The RAID log adds assumptions, issues (risks that have
happened) and decisions (what was agreed, by whom, when). Faultline's
decision, 17 October: a project's risks and issues are its Problems
register's rows — a risk is a problem marked Critical with its "what if"
in words — not a second list; and a decision is a journey step on the
problem it settled.

## Questions it answers
- What could go wrong, how likely, how bad — ranked?
- Who owns each, and what is the response and its action?
- Which risks have triggered (become issues), and which closed?
- What decisions were taken on them, by whom?

## Inputs and minimum conditions
- Risks in words (cause → event → effect), each scored for likelihood
  and impact on the agreed scales with their definitions (impact 5 = the
  handover moves a month, or a food-safety incident).
- An owner, a response and its actions (`visual.action-tracking`), a
  trigger, a review date.
- The issues as they happen, with the risk they came from.

## Procedure and calculation
- Score = likelihood × impact (1–25); the matrix's red zone (say ≥ 12)
  gets a response with actions now, amber watched, green accepted; the
  thresholds are the project's choice, said.
- Exposure in money where the impact can be costed: likelihood × cost
  of the impact — the expected cost, which prices the mitigation
  (`knowledge/MONEY.md`, C).
- Trend: the top risks' scores by review; a risk whose score rises two
  reviews running is escalated; a triggered risk becomes an issue with
  its response running.
- Response actions on the action list with owners and days; a response
  with no action is a hope.
- Decisions logged on the risk they settle: what, who, when, the
  alternatives declined.

**Worked case** (`cases-projects-people-ergo-sust.py`): four risks on a
new line — OEM late (L4 × I4 = 16), power upgrade late (3 × 4 = 12),
key engineer leaves (2 × 5 = 10), film specification change (2 × 3 = 6).
The red zone at 12: the OEM and the power upgrade get responses with
actions now (a weekly OEM call with the delivery evidence; the
electrical contractor's date brought forward with a penalty). In
Faultline the two are Critical problems on the register with their
"what if" and their actions; the register's priority is the score.

## Assumptions, limits and misuse
- Registers written at the start and never read; the review is the
  method.
- Scores argued to the decimal: the scales are coarse by design, and
  the ranking is what matters.
- Risks with no response or an owner of "project team" are nobody's.
- A second list beside the problems register, in Faultline, drifts
  from it — hence the decision.
- Failure modes of equipment belong to the FMEA; combinations of
  barriers failing to the fault tree.

## Reading the result
"Two red risks — the OEM's delivery and the power upgrade — each with
an owner and actions this week; one risk triggered last month (the
engineer left) and is now an issue with its cover plan." Money: each
risk's expected cost (likelihood × impact in pounds — `knowledge/MONEY.md`,
C) against its mitigation's cost.

## When not to use it — and instead
In Faultline: the problems register and its Critical
(`visual.action-tracking`). Equipment and process failure modes →
`quality.fmea`. How barriers combine to a serious event →
`rca.fault-tree`.

## In food and FMCG manufacturing
Capital projects (new lines, extensions) with OEMs, contractors and
utilities; a product launch's risks across supply, process and
compliance.

## References
- [standard] Project Management Institute (2021), *PMBOK Guide*, 7th ed. — risk management, the probability and impact matrix (from knowledge).
- [standard] ISO 31000:2018, *Risk management — Guidelines* (from knowledge).
- [decision] `docs/BLUEPRINT.md` §6 — 17 October: the issue and risk logs are the Problems register and its Critical.

## In Faultline
Declined as a record (FC-217, left out): a project's risks are Critical
problems on the register with their words, owner, day and journey
(`src/snag`, `src/lib/projectActions.ts`); their scoring as likelihood ×
impact and their expected cost are not computed. If Rowland wants the
score, it is two fields on a Critical problem, never a second list.
