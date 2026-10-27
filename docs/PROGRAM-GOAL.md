# A program is a goal — the design, for Rowland's yes

**Status: a design. Nothing here is built.** It changes the program record and
what "proved" means, so it waits for Rowland's word (CLAUDE.md: nothing new is
built until he says go).

## What he said

Rowland, 27 October, on program 5 (Express 1.25 kg), tested on 26 and 27 October:
it failed on net packs a minute, because of lost time that had nothing to do with
the experiment — *"you can fail the overall goal, but it still means that you
passed the test. But there's no clarity on it."* Then:

> "In a test we can prove it with many tools, its like a tier structure, think of
> the program as a goal to achieve, and the test / tools we use are there to help
> us achieve the goal. we can pass a test and not achieve a goal because for
> example, we want to achieve 55ppm net ppm, but to achieve that i needs to run
> different tools / tests sometimes increments of speed, or less rejects."

And on 14 October, about the same thing from the other side: *"There is no real
pass and fail ultimate. It's just the status of what was done."*

## What the app does today (and why it reads wrong)

- A program's test aims at a **speed** (`RunAgreed.rate`), for so many minutes,
  with at most so many rejects, and a **net** rate as an optional second aim
  (`RunAgreed.net`). The test is judged on all of them together.
- **A test that passes proves the program** (`lib/programs` `programAfterTest`):
  the program's `provedOn` is that test's day.
- So the test and the program have one answer between them. A test that ran its
  speed clean but missed the net "didn't pass", and the program says the same,
  although the trial did what it was for. And a test that passes proves the
  program even when the line is still short of what production needs.

## The tiers

```
PROGRAM — the goal          what production needs: e.g. net 55 packs a minute,
   │                        at most 1% rejects, held for 60 minutes
   │                        → GOAL REACHED (dated) · WORKING TOWARDS IT (best so far) · NOT WRITTEN
   │
   ├── TEST — a step         what this trial is for: e.g. "run at 50 ppm for 30 min, rejects ≤ 2%"
   │      │                  → PASSED · DIDN'T PASS · DIDN'T RUN · BOOKED      (its own aim, its own answer)
   │      │                  → and, read against the goal: "net 48 of 55 — 7 short" / "goal reached"
   │      │
   │      └── TOOLS          the evidence for the step: capability study, control chart, reliability,
   │                         analysis … each with its own verdict, as today (Proved by)
   │
   ├── TEST — the next step  e.g. "run at 55 ppm" …
   └── …
```

- **A test is never failed by the goal.** It passes or fails on its own aim:
  what this trial set out to try. The goal is read beside it, never instead of it.
- **The program is proved only when the goal is reached:** a test whose run,
  as recorded, meets every number of the goal. A test passing its own aim
  doesn't prove the program unless its run also meets the goal.
- **Between the two, the program says how close it is:** *Working towards 55 ppm
  net — best 52.5 (test 2, 27 Oct), 2.5 to go.*

Program 5 would read:

| | Its aim | Its answer | Against the goal (net 55) |
|---|---|---|---|
| Test 1 · 26 Oct | 50 ppm for 60 min | **PASSED** — ran clean | net 48 — 7 short |
| Test 2 · 27 Oct | 55 ppm for 60 min | **PASSED** — the speed ran; 9 min lost to the infeed, not the trial | net 52.5 — 2.5 short |
| **Program 5** | | | **WORKING TOWARDS THE GOAL** — best 52.5 of 55 |

## What changes in the record

- **One new field on the program: `goal`.** It is the numbers production needs,
  in the same shape a test's aim already has (net packs a minute, the most
  rejects, the minutes it must hold, and a speed if one is set). It is stored as
  one JSON column `programs.goal`: additive, nothing removed, and every
  program written before it keeps working.
- **A program with no goal works exactly as today** (a passed test proves it),
  unless you say otherwise (question 3).
- `provedOn` stays the one fact that makes a program proved. Only the rule that
  writes it changes: with a goal, it is written by the first test whose run
  meets the goal, not by the first test that passes.
- No new noun. The goal is the program's; the steps are its tests, as now; the
  tools are the studies lined up for each test, as now.

The database change ships the house way (`supabase/PROGRAM_GOAL.sql`, applied,
read back) before the screens that use it. The Supabase connector is failing to
connect this session (`ERR_PROXY_TUNNEL`), so it may need the file pasted into
the SQL editor.

## Where it shows

The goal shows wherever the program already shows, as a branch off it:

| Place | What it gains |
|---|---|
| Programs (the project's, and a line's — in place) | the goal under the program's name; its status word (GOAL REACHED · WORKING TOWARDS IT); best so far and what is left; each test's row with its own answer and its reading against the goal |
| A machine's page | its programs: goal reached of all, and the closest one still short |
| Now — the machines | "Programs: 2 of 5 at their goal" (it counts goal reached, not tests passed) |
| Commission — the board | a program's square green only at its goal |
| Programs report, commissioning report, machine report (paper) | the goal, then every test under it — its aim, its answer, its reading against the goal — the same words as the screen |
| Set up the goal | on the program's row (Change), by whoever may change what was agreed (`can.agree`), as the agreed numbers are today |

## The decisions that are yours

1. **What a goal holds.** Net packs a minute, the most rejects, and how long it
   must hold. Anything else, such as the speed it must run at, or a number of
   shifts?
2. **Once, or more than once.** Is the goal reached by one run that meets it, or
   by two or three in a row (or on different shifts)?
3. **A program with no goal.** Keep today's rule (a passed test proves it), or
   ask for a goal before a program can be proved?
4. **Lost time that is not the trial's.** On 27 October the net was pulled down
   by stops unrelated to the experiment. Should a stop marked *not the trial's*
   be left out of the reading against the goal (said so beside it), or always
   counted?

## The build, once you say go

1. `PROGRAM_GOAL.sql` (the column), the mapper and the schema test.
2. `lib/programs`: the goal read (`goalReading` — reached, best, what is left)
   and the rule that writes `provedOn`, with unit tests on program 5's numbers.
3. The rows, the machine page, Now and the board.
4. The three papers.
5. An acceptance script: program 5 walked, two tests passed short of the goal,
   then a third reaching it, every place moving with it.
