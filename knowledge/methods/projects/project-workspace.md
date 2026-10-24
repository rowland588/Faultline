---
id: projects.project-workspace
name: The project is the workspace — everything done inside it lands in it
aka: [project workspace, project, everything in the project, project actions, in project, the three kinds of change]
discipline: projects
kind: faultline
evidence: decision
depth: full
checked: 2026-10-24 — `docs/PROJECTS.md` (Rowland, 21 October: "a project is the project and everything is inside the project"); the slices P1–P4 built (`lib/inProject`, `?project=` on the address, `src/lib/projectActions.ts`); `docs/STRUCTURE.md` (the three scopes — factory, line, project — since B2); proved by `scripts/acceptance/project-workspace.mjs` and `scripts/acceptance/actions.mjs`; no arithmetic — the record says the rule
needs: []
next: [visual.action-tracking]
alternatives: []
related: [commissioning.stage-gate, rca.fishbone-5whys, visual.kpi-tree, visual.action-tracking]
---
# The project is the workspace — everything done inside it lands in it

## Purpose and principle
Faultline's unit is a change to a line, and the record of a change is
the **project** — one word, never *job* on a screen or paper. Open a
project and the app is that project: its method (one of the three kinds
of change — the stage gate for new equipment, the 6M for a running line
made to perform better, the lever tree for one outcome worked down to
its levers), its tools, its problems, its **Actions** (who is doing
what, why, where, by when, with its priority), its reports, its Line
Talk. Whatever is done inside it lands in it with no "use it for"
question: a SMED, a capability study, a problem, a talk made from the
project's rail are the project's and open in it. The factory stays
shared — a project points at its lines, asked and chosen — and work
done on a line with no project stays on its line and can be moved into
a project with a tap. The control room, above, sees every project's
actions at once. Every page is in one scope — the factory, a line or a
project — with that scope's rail, phone bar and context bar.

## Questions it answers
- Is everything for this project in one place — its tools, problems,
  actions and papers?
- Which lines does it point at, and what is on them?
- What does the project owe — who, what, by when (`visual.action-tracking`)?
- What was done on a line outside any project, and should it be moved
  in?

## Inputs and minimum conditions
- A project started from the situation (the front door's question
  first; the kind picked from the three), pointing at its lines from
  the factory.
- The tools' records carrying the project they were made in (the
  address's `?project=`, the record's own field).
- The register's problems taken for the project; the plan's items; the
  project's own actions and checks.

## Procedure and calculation
None — the rules: a record made from a project's rail wears that
project; a record on no project opens on none and is moved in with a
tap; a project's Actions reads every thing owed to it (the plan's rows,
the critical problems and risks, the register's problems for it, its
own actions and checks) as one list by who, when and where
(`src/lib/projectActions.ts`); the control room's Every action reads
every project's and every line's own problems under no project; a
project's papers are its method's (the stage gate's status and full
report, the 6M report, the lever tree's) plus every tool's own; a
problem is offered only to somebody who may change the project's work
(a client is offered none — `src/lib/access.ts`).

**Worked case**: none computed; the acceptance scripts are the worked
cases — a SMED, a problem, a Line Talk and a Line capacity made inside a
project are the project's with no question asked and open in it; a
record on no project opens on none; the project's Actions as the records
say, by who, when and where, on paper for the meeting and each person.

## Assumptions, limits and misuse
- A "change" noun beside the project, or a second list beside the
  Actions, is the drift the rule forbids: one record, read many ways.
- A tool that asks "for a project?" inside a project is a defect.
- The factory is never a project's: lines are shared, a project points
  at them.
- Work on a line with no project is not lost and not forced into one;
  it stays on its line until somebody moves it.
- The three kinds of change are three methods, not three apps; a tool
  never becomes a method and never sits beside a change.

## Reading the result
A project's front page says where it is, why it is not where it should
be, and what is being done about it — the three questions — with its
tools, problems and actions one tap away. Money: each tool's finding in
money (`knowledge/MONEY.md`) carried into the project's Actions and
papers; the project's worth where its kind has one (the stage gate's
case, the 6M's countermeasures, the lever tree's gap).

## When not to use it — and instead
The methods themselves → `commissioning.stage-gate`, `rca.fishbone-5whys`
(the 6M), `visual.kpi-tree` (the lever tree). The Actions' rules →
`visual.action-tracking`. Work with no project → it stays on its line.

## In food and FMCG manufacturing
A new line's commissioning with the OEM; a running line's output
problem worked as a 6M with its studies inside; a cost-a-pack target
worked as a lever tree — each one project, everything inside it.

## References
- [decision] `docs/PROJECTS.md` — Rowland, 21 October; the slices P1–P4 and what each has built.
- [decision] `docs/DIRECTION.md` and `docs/BLUEPRINT.md` §2 — one home per real thing; the record is the project.
- [decision] `docs/STRUCTURE.md` — the three scopes, one rail per scope, one context bar (B0–B8).

## In Faultline
Built (FC-214): P1 one word; P2 tools inside the project
(`src/lib/inProject.ts`, `?project=`); P3 the project's Actions
(`#/project/:id/actions`, `src/lib/projectActions.ts`); P4 Every action
(`#/actions`). Proved in every gate by `scripts/acceptance/project-workspace.mjs`
and `actions.mjs`.
