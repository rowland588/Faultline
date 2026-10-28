# A program is proved by the criteria you pick — the design, for Rowland's go

**Status: built, 28 October, at Rowland's "Go"** — the record (`programs.criteria`, `programs.signed_off`, applied and
read back), the logic (`src/lib/programCriteria.ts`, its tests on program 5), the row (`src/ui/ProgramCriteria.tsx` on a
project's Programs, a line's own programs there and on the line's page), the machine page, Commission's sheet, the
Programs report, the Machine report and the commissioning report; proved by `scripts/acceptance/program-criteria.mjs`.

## What he said

27 October, program 5 (Express 1.25 kg): it failed on net packs a minute because of lost time that had nothing to
do with the trial — *"you can fail the overall goal, but it still means that you passed the test."*

28 October:

> "when you're doing a program and you're running other tests and using tools, specifically the SPC tools, then any
> of them actually is good enough for the entire program to pass ... I may not achieve the packs per minute, but this
> could be because of not the robot ... outside noise ... to simply say that robot passed, it got X amount of packs
> per minute net, doesn't necessarily mean it did it cleanly ... the most important thing is actually the scientific
> evidence, the tools that I use ... I need to be able to choose which one is a pass ... sometimes the tool is the goal."

And, shown the industry's way (below):

> "the program has a set role of criteria. So I choose the criteria. So it's likely I'm going to pick tools ... as I
> pick these tools, they will be my criteria. If they pass, I then need to be able to sign off. So I will sign off,
> me and my colleagues together, but just leave it as signed off, passed ... it's running tools, and then seeing if
> setting your parameters and whether or not it passes or fails. It's just as simple as that."

## The industry's way, which this follows

- **Acceptance is against criteria agreed in writing, each its own test with its own evidence**, signed criterion
  by criterion (FAT/SAT practice; `knowledge/methods/commissioning/acceptance-tests.md`). No single number accepts a
  machine.
- **The machine is judged apart from the line.** EN 415-11:2021 (which replaced DIN 8743) counts only the losses
  the machine system causes when it gives the machine's figures (from excerpts — the standard's text has not been
  read). A capability study on the machine alone (ISO 22514-3, Cm/Cmk, `spc.machine-capability`) is built to take the
  outside noise out. So the tools, not the line's net rate, say whether the machine did it cleanly.
- **The people who accept it sign, and the record keeps who and when.**

## The shape

```
PROGRAM — what it runs, its machine
   │
   ├── ITS CRITERIA — the tools you pick for it, each set up with its own parameters
   │      ├── Capability study "placement 75 ppm"   — Cmk ≥ 1.67 (set in the study)   → PASSED / NOT YET / FAILED
   │      ├── Reliability "robot faults"             — MTBF wanted 4 h               → PASSED / NOT YET / FAILED
   │      ├── Control chart "seal temp"              — in control                    → …
   │      └── A run test "75 ppm for 60 min"         — speed, minutes, rejects (net only if you give it) → …
   │
   └── SIGNED OFF — PASSED: the names of who signed (you and your colleagues), the day
```

- **You pick the criteria.** On a program, *Add a criterion* offers the tools: capability study, control chart,
  reliability, analysis, a run test (the test as it is today) — any tool the app has. Each is a study or test made
  for this program, set up in the tool with its own parameters (limits, MTBF wanted, the agreed run). Nothing new is
  invented: these are the studies already lined up on a program's tests today (*Proved by*), lifted to the program.
- **Each criterion's answer is its tool's own** — the verdict the tool already gives against the parameters you set
  (lib/studyLinks studySays: met, not met, not enough yet). A run test's answer is its own as now, with what it met
  and missed (live since 28 October).
- **Net packs a minute is just another criterion** — picked when it matters, left off when it is outside noise.
  "Sometimes the tool is the goal": then the tool is the criterion.
- **When every criterion has passed, the program is ready to sign off.** *Sign off* asks who is signing (one or more
  names — you and your colleagues) and the day, and the program reads **Signed off — passed**, with the names and
  the day. That date is the program's proved date (`provedOn`), as now.
- **The program always says what passed it:** *"Signed off — passed 28 Oct by R. Glew, J. Smith · Cmk 1.82 on
  placement (27 Oct) · robot MTBF 6.1 h (27 Oct)."* The same words on every report.

## Where it shows

| Place | What it says |
|---|---|
| Programs (the project's, and a line's in place) | under each program its criteria, a row each with its tool's answer; *2 of 3 criteria passed*; *Ready to sign off*; *Signed off — passed* with who and when |
| A machine's page, Now's machines, Commission's board | programs signed off of all, the rest *n of m criteria passed* |
| Programs report, machine report, commissioning report | each program, its criteria and their answers, and the sign-off — the same words |

## What changes in the record

- **Criteria:** an explicit list on the program, `criteria` — `{ kind: 'study' | 'run', id }`, one JSON column
  (`supabase/PROGRAM_CRITERIA.sql`). Not every study or test naming the program: program 5's net run, failed on outside
  noise, would otherwise be one, and every program tested before would need a sign-off. A study made from *Add a
  criterion* names the program (`ToolStudy.programId`); a run test is the first test of its chain, passed once any attempt
  passed. A study's answer is its tool's own verdict (lib/studyLinks studySays, an overrule taking its place) — for a
  capability study with limits that is "every reading within them", its Ppk said beside it.
- **Sign-off:** one new field on the program, `signedOff` — the names and the day (one JSON column, `programs.signed_off`,
  additive; `supabase/PROGRAM_SIGNOFF.sql`, applied and read back). Nothing takes a sign-off back by itself — a test,
  a deleted test or the floor's status leave it standing; a criterion that slips afterwards is said beside it (*Since
  it was signed off, … reads didn't pass*). The owner and the team sign off (can.edit); a client reads it.
- **Programs from before:** a program already proved keeps its date and says how (*Proved by its test*, *Signed off by
  hand*), as today. A program with no criteria picked works as today — a passed test proves it — until criteria are
  picked; then only the sign-off does.

## Left out, on purpose

- **Which stops were outside the machine** — not here; it is said in the tools that count stops (Rowland: "it'd be
  captured in other things").
- **A machine-efficiency figure** (run time ÷ time less outside stops) — belongs in a tool (the loss count or
  reliability), not in the program; a separate piece if wanted.

## The build (done 28 October)

1. `PROGRAM_SIGNOFF.sql`, the mapper and the schema test.
2. `lib/programs`: a program's criteria and their answers (`criteriaOf`), ready to sign off, signed off — with unit
   tests (program 5: the net run left off, a capability study and a reliability study picked, both passed, signed off
   by two names).
3. The program row: its criteria, *Add a criterion* (the tools), *Sign off*.
4. The machine page, Now, Commission's board.
5. The three papers.
6. An acceptance script: program 5 walked from no criteria to signed off, every place moving with it.
