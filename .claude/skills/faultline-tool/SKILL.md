---
name: faultline-tool
description: "Use for ANY request to build, extend, fix the arithmetic of, or materially change a Faultline manufacturing tool or analysis — and for requests naming a catalogue entry. Triggers: 'build FC-012', 'build tool FC-nnn', 'build the SMED…', 'build the next three highest-priority tools', 'add X to the capability study / line balance / Line capacity / loss count / reliability / SMED / work sampling / value stream / line standard', a new calculation, statistic, chart or verdict in src/lib/ie/ or a tool's page, 'what tools can Faultline do / support next', a Lean, Six Sigma, SPC, capability, industrial-engineering, TPM, quality, food-safety or yield method. Resolves the request against src/catalogue, reads knowledge/methods, writes a specification from knowledge/specs/TEMPLATE.md before code, validates formulas with independent cases, builds, tests, updates the catalogue and records, and reports honestly. Not for unrelated UI chores, reports' layout or project-management screens."
metadata:
  author: faultline
  version: "1.0.0"
---

# Building a Faultline manufacturing tool

You are working to `knowledge/STANDARD.md`. This skill is how you keep to it.
Read `docs/DIRECTION.md` and `CLAUDE.md` first if you have not this session —
they win over everything here. The system is described in `knowledge/README.md`.

## 0. Resolve the request — never build the wrong thing

```
node scripts/catalogue.mjs show FC-012          # by number
node scripts/catalogue.mjs show "SMED"          # by name — exit 2 and a list means: ask which
node scripts/catalogue.mjs search <the problem in the user's words>
node scripts/catalogue.mjs next 3               # "the next three highest-priority"
```

- One entry → carry on. Several, or a request that spans entries → ask the
  user which (AskUserQuestion with the candidates' numbers and names). None →
  it is a new entry: say so, propose its place (discipline, status
  `to-build`, the next free number) and its knowledge records, and continue
  only when the user agrees.
- `available` already → say so and ask what is to change (it is then an
  extension, same workflow).
- `left-out` → quote its `decided` line and stop unless the user reverses it
  in this conversation.
- `research` → the work is research first: fill the gap in
  `knowledge/GAPS.md` and the records, then come back to step 1.
- "Nothing new is built until Rowland says go" (`docs/DIRECTION.md`): if the
  request is a question or an idea, specify and ask for go; build only on go.

## 1. Discover

Write down, before reading code: who asked and their words; the line,
product and decision; the sentence it lets one side say to the other. Place
it on `docs/BLUEPRINT.md` §8 (layer, record, where it shows, what it
replaces).

## 2. Select the method — from the knowledge, not the tool's name

```
node scripts/catalogue.mjs method <record id>    # for each of the entry's methods, and their needs/alternatives
```

Decide by the data and the question (measured or counted; items or runs;
stable or not). If a record is a `summary`, read its sources and bring it to
`full` before specifying. If a needed method has no record, write one first
in the house shape (`knowledge/README.md`, "A method record") with sources and
an honest `checked` line ("from knowledge; edition to confirm" until read).
**If you cannot read the library or run the script, say so to the user and
work from `knowledge/STANDARD.md` alone — never claim the full process was
followed.**

## 3. Inspect what exists

Read the entry's `built` files, the module it would extend in `src/lib/ie/`
or `src/lib/`, the shared parts (`src/lib/lean.ts`, `src/ui/Lean.tsx`,
`src/lib/report/`, `src/lib/cost.ts`, `src/lib/ie/dist.ts` once it exists),
every screen and paper where the parent record shows, `docs/PAGES.md` for the
page, and the acceptance script that drives it. Extend before you add.

## 4. Specify — before any code

Copy `knowledge/specs/TEMPLATE.md` to `knowledge/specs/FC-nnn-name.md`; answer
all twelve headings (the catalogue test checks them). Set the entry's
`status: 'specified'` and `spec:`. Ask the user any decision that is theirs
(a threshold, a word on screen, scope) — do not guess it.

## 5. Validate the method

Every formula against its source. Independent cases with known answers — a
textbook example, a standard's table or critical values, or SciPy in
`scripts/knowledge/independent-cases.py` (`pip install scipy` if missing;
paste its numbers into the tests, never the code's own output). Approximations
with their accuracy.

## 6. Build, test, review

The house rules apply in full (`CLAUDE.md`): pure arithmetic, sentences in
the module, screen and PDF together, access checks, money from the one cost
model, old records still reading as before, PAGES.md + the inventory in the
same commit, an acceptance script in `scripts/acceptance/` added to the gate
list in `CLAUDE.md`, screenshots compared. Unit tests cover boundaries,
unsuitable data and misleading-result scenarios (`knowledge/STANDARD.md` §7).

## 7. Release, and write it down where the next session looks

- The full gate, merged to `main`, Vercel ready (`CLAUDE.md`, "Finished means live").
- The entry's `status` (`available` only by the test's rule), `built`, `limits`.
- The records' *In Faultline* sections; anything learned into
  *Assumptions*; anything unverified into `knowledge/GAPS.md`.
- `node scripts/catalogue.mjs summary --write`; `node scripts/catalogue.mjs check`.
- The backlog (`src/catalogue/backlog.ts`) — the built entry leaves it.

## 8. Report

What was built (entries, files), what was verified (each test and
acceptance script by name, the independent cases), what is live, and every
limit left — with the catalogue numbers of what comes next. A tool is not
done because it renders, a number appears, or a spec exists.
