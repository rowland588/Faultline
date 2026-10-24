---
id: projects.ci-programme
name: The improvement programme — ideas, projects and savings over time
aka: [CI programme, continuous improvement, ideas scheme, suggestion scheme, savings tracker, kaizen tracker, benefits tracking]
discipline: projects
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — CI programme practice as the lean literature frames it (Imai 1986 on suggestion systems; the proven-against-claimed discipline from finance's benefits tracking); from knowledge; the worked programme in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [lean.kaizen-event, lean.toyota-kata]
alternatives: []
related: [lean.kaizen-event, equipment.cost-deployment, lean.maturity-assessment, rca.pdca]
---
# The improvement programme — ideas, projects and savings over time

## Purpose and principle
A site's improvement is many small things and a few projects; a
programme keeps them in one list from raised to done, with an owner,
and counts what they saved — **claimed** when raised, **proven** when
the number moved and held (`rca.pdca`), never confusing the two. Its
health shows in the flow (ideas a month, the days from raised to done,
the share done) and in the money (proven savings against the year's
target, and against what the losses said was there —
`equipment.cost-deployment`). A programme whose claimed savings are
reported as proven loses the trust of the finance director in one
budget round; one whose ideas take six months to close loses the floor's
in a month.

## Questions it answers
- How many ideas and projects, by status — and how fast do they move?
- What did they save: claimed, proven, and the gap?
- Is the programme reaching the losses the cost deployment named?
- Who raises, who owns, who closes — and where is it stuck?

## Inputs and minimum conditions
- Each idea or project with its status (raised, assessed, in progress,
  done, declined with a reason), its owner, its line, its dates.
- The saving claimed at assessment (by the one cost model —
  `knowledge/MONEY.md`) and the saving proven at close (the before →
  after on its number, held).
- The year's target and the cost deployment's loss map for the
  comparison.

## Procedure and calculation
- Counts by status; done ÷ raised; declined with reasons tallied.
- Flow: ideas a month (trend); days from raised to done — the median and
  the 90th percentile, not the mean; work in progress and its age.
- Savings: Σ claimed, Σ proven; proven ÷ claimed; proven against the
  year's target by month (a run chart); the gap is "not savings".
- Proven only by the rule: the number before and after, the holding
  period passed, the rate from the model — the same arithmetic as the
  PDCA's check.
- Coverage: proven savings by loss category against the cost
  deployment's map — the losses the programme has not touched.
- Participation: ideas per person per year by area (a programme's
  breadth), without a league table.

**Worked case** (`cases-projects-people-ergo-sust.py`): 41 ideas, 18
done (44%); claimed £95,000, proven £62,000 (65%) — the £33,000 gap is
not savings and is said so. Ideas a month 4, 6, 5, 8, 7, 9 — rising
(ρ 0.89). Days from raised to done: median 32, 90th percentile 63 — the
tail is the sponsor's queue.

## Assumptions, limits and misuse
- Claimed savings reported as proven — the programme's one unforgivable
  error.
- Savings counted twice (two projects on the same loss) — the cost
  deployment's map is the ledger.
- A suggestion scheme paid by the idea produces ideas, not
  improvements; the measure is done and proven.
- A programme measured only in money ignores safety and quality
  improvements with no pounds; count them, and say they have none.
- The tracker is a list beside the records; where the records exist
  (a 6M's countermeasure, a kaizen's actions) the programme reads them,
  never re-types them.

## Reading the result
"41 ideas, 18 done; £62k proven of £95k claimed — the gap is open work,
not savings; the median idea takes a month." Money: proven savings by
the model's rows (`knowledge/MONEY.md`), by month against the target —
the programme's one honest figure.

## When not to use it — and instead
A single week's event → `lean.kaizen-event`. The daily small-step
routine → `lean.toyota-kata`. The losses' map in money the programme
should be chasing → `equipment.cost-deployment`. Proving one saving →
`rca.pdca`. The programme's maturity → `lean.maturity-assessment`.

## In food and FMCG manufacturing
Site CI programmes with a monthly steering review; a group's
savings-against-target report; the ideas board at the line.

## References
- [textbook] Imai, M. (1986), *Kaizen: The Key to Japan's Competitive Success*, McGraw-Hill — suggestion systems (from knowledge).
- [textbook] Robinson, A.G. and Schroeder, D.M. (2004), *Ideas Are Free*, Berrett-Koehler — idea systems and their measures (from knowledge).
- [practice] Benefits tracking as finance functions run it — claimed, validated, realised (from knowledge).

## In Faultline
Not built (FC-221). The projects' countermeasures and actions with their
proofs (`src/project`, `src/lib/sixm.ts`) and the register's problems are
the records a programme view would read; FC-221 would count them by
status and month, sum proven worth by the model and compare it to the
loss map — a page under the control room, with no second list.
