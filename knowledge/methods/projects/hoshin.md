---
id: projects.hoshin
name: Hoshin kanri — policy deployment and the X-matrix
aka: [hoshin kanri, policy deployment, X matrix, catchball, strategy deployment, breakthrough objectives, bowling chart]
discipline: projects
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Akao (1991) *Hoshin Kanri: Policy Deployment for Successful TQM* and Jackson (2006) *Hoshin Kanri for the Lean Enterprise* for the X-matrix and catchball; from knowledge, texts not re-read; the method has no arithmetic beyond the matrix's correlations and the bowling chart's monthly plan-against-actual
needs: []
next: [visual.kpi-tree, projects.ci-programme]
alternatives: [visual.kpi-tree]
related: [projects.ci-programme, visual.performance-measures, visual.daily-management]
---
# Hoshin kanri — policy deployment and the X-matrix

## Purpose and principle
A site has more good ideas than it can do; hoshin chooses the few that
matter and makes sure every project and every measure traces to one of
them. The **X-matrix** has four edges: the three-to-five-year
**breakthrough objectives** (south), this year's **annual objectives**
(west), the **improvement priorities** or projects (north), and the
**measures and targets** (east), with owners along the side; the
corners mark which items relate to which (a dot where a project serves
an annual objective, where a measure tracks a project), so a project
with no dot to an objective is questioned and an objective with no
project is unowned. **Catchball** is the back-and-forth between levels
as the objectives are set — the site proposes, the lines say what they
can do and need, the plan is revised — so the targets are agreed, not
announced. The monthly review reads the **bowling chart** (each
measure's plan and actual by month, red or green) and the projects'
state.

## Questions it answers
- Do our projects add up to the site's objectives — and which objective
  has none?
- Which measures track each project, and are they on plan this month?
- Who owns each objective, project and measure?
- Was the plan agreed through catchball, or handed down?

## Inputs and minimum conditions
- The breakthrough objectives (few — three to five) and this year's
  annual objectives derived from them.
- The projects proposed, each with its owner and the objective it
  serves; the measures with monthly targets.
- The catchball rounds recorded (what the lines said they could do and
  needed).

## Procedure and calculation
- The matrix: objectives × projects × measures with their correlation
  dots (strong/weak); a project with no strong dot to an annual
  objective is dropped or justified; an annual objective with no project
  is a gap; a measure tracking nothing is noise.
- Counts: projects per objective (a load check — one owner with six
  projects is the plan's bottleneck); objectives per owner.
- The bowling chart: each measure's monthly plan and actual, red where
  actual misses plan; a measure red two months running triggers a
  countermeasure (an A3 — `rca.a3`).
- The monthly review: each red's owner, cause and countermeasure; the
  annual review's reflection feeds next year's objectives.
- Deployment: each annual objective becomes a line's or a department's
  own matrix (the second level), with its own catchball.

**Worked case**: none computed — the method is a structure and a
review rhythm. An illustration: three breakthrough objectives (cost a
pack −10% in three years, zero customer food-safety incidents, OTIF
98%); five annual objectives; nine projects — one annual objective
(yield +2 points) has no project and is the gap the review raises;
Line 3's team leader owns three projects and is the load check's
finding.

## Assumptions, limits and misuse
- Too many objectives: a matrix with twelve breakthroughs deploys
  nothing. Three to five.
- No catchball: targets announced are targets resented; the rounds are
  the method.
- The matrix filled once and framed; the monthly bowling chart is where
  it lives.
- Measures chosen because they are easy to count rather than because
  they track the objective (`visual.performance-measures`).
- Hoshin is for the site's few breakthroughs; the daily work's problems
  belong to daily management (`visual.daily-management`).

## Reading the result
"Nine projects serve four of the five annual objectives; yield has
none — a gap; three measures are red two months running, each with an A3
owner." Money: the objectives' worth where they are money (cost a pack,
yield) by the model (`knowledge/MONEY.md`), and the projects' proven
savings against them (`projects.ci-programme`).

## When not to use it — and instead
One number worked down to its levers → `visual.kpi-tree`. The ideas and
projects' flow and savings → `projects.ci-programme`. The measures'
design → `visual.performance-measures`. The daily rhythm →
`visual.daily-management`.

## In food and FMCG manufacturing
Site-wide annual plans; a group's manufacturing strategy deployed to
sites and lines; the monthly site review with the bowling chart on the
wall.

## References
- [textbook] Akao, Y. (ed.) (1991), *Hoshin Kanri: Policy Deployment for Successful TQM*, Productivity Press (from knowledge).
- [textbook] Jackson, T.L. (2006), *Hoshin Kanri for the Lean Enterprise*, Productivity Press — the X-matrix (from knowledge).
- [textbook] Dennis, P. (2006), *Getting the Right Things Done*, Lean Enterprise Institute (from knowledge).

## In Faultline
Not built and not planned (FC-219, research): Faultline's unit is the
project on a line, and the control room sees every project's actions
at once (`#/actions`). A site's X-matrix above the projects would be a
page that reads the projects and their measures; whether Rowland's team
wants it is his call.
