---
name: faultline-tool
description: "Use for ANY request to build, improve, extend, fix or materially change a Faultline manufacturing tool, its analysis or its report — and for requests naming a catalogue entry. Triggers: 'build FC-012', 'build tool FC-nnn', 'build the SMED…', 'build the next three highest-priority tools', 'improve the process capability tool', 'add X to the capability study / line balance / Line capacity / loss count / reliability / SMED / work sampling / value stream / line standard', a tool's PDF or report, a new calculation, statistic, chart or verdict in src/lib/ie/ or a tool's page, 'what tools can Faultline do / support next', a Lean, Six Sigma, SPC, capability, industrial-engineering, TPM, quality, food-safety or yield method. Holds the work to knowledge/STANDARD.md's quality bar: resolves the request in src/catalogue, reads knowledge/methods, writes the specification (scope, facts vs choices, the report, acceptance criteria) before code, validates formulas with independent cases, builds the tool with its report, proves every criterion, keeps the catalogue truthful and reports honestly. Not for unrelated UI chores or project-management screens."
metadata:
  author: faultline
  version: "1.1.0"
---

# Building or improving a Faultline manufacturing tool

You are working to `knowledge/STANDARD.md` — its **quality bar** (seven
points) and its workflow. This skill is how you keep to it; read the quality
bar now if you have not this session. `docs/DIRECTION.md` and `CLAUDE.md` win
over everything here. The catalogue and what is already built are the
starting point: one tool, built or improved properly — never a rewrite,
never several tools at once unless asked.

Each step ends with a **checkpoint**. Do not go past one that is not met:
say what is missing and fix it, or ask.

## 1. Locate the tool and inspect what exists

```
node scripts/catalogue.mjs show FC-012          # by number
node scripts/catalogue.mjs show "SMED"          # by name — exit 2 and a list means: ask which
node scripts/catalogue.mjs search <the problem in the user's words>
node scripts/catalogue.mjs next 3               # "the next three highest-priority"
```

- One entry → carry on. Several, or a request that spans entries → ask which
  (AskUserQuestion with the candidates' numbers and names). None → propose a
  new entry (discipline, status `to-build`, the next free number, its
  records) and continue only when the user agrees.
- `left-out` → quote its `decided` line and stop unless the user reverses it.
- `research` → research first: the records and `knowledge/GAPS.md`, then back here.
- Read what is built: the entry's `built` files, the module in `src/lib/ie/`
  or `src/lib/`, its page and its paper (`src/lib/report/`, the tool's PDF),
  the record it reads and writes, access, sync, every place its parent shows
  (CLAUDE.md rule 5), `docs/PAGES.md`, its acceptance script, and its spec if
  it has one. Note what works and must keep working.
- "Nothing new is built until Rowland says go" (`docs/DIRECTION.md`): a
  question or an idea gets a specification and a request for go, not code.

**Checkpoint:** you can say which entry, its status and dependencies, what is
built today and what the change must not break.

## 2. Establish the method's requirements and the acceptance criteria

```
node scripts/catalogue.mjs method <record id or bare name>   # each of the entry's methods, and their needs/alternatives
```

- Decide the method by the question and the data (measured or counted; items
  or runs; stable or not), not by the tool's name. A `summary` record, or one
  that does not cover what is needed, is brought to full depth from
  authoritative sources first — with an honest `checked` line.
- Copy `knowledge/specs/TEMPLATE.md` to `knowledge/specs/FC-nnn-name.md` (or
  extend the tool's existing spec) and answer all twelve headings, including
  the four parts the catalogue test checks: **Scope.** · **Established ·
  assumed · chosen.** · **The report.** · **Acceptance criteria.**
- Design for this method — its own workflow, variants, pictures and report —
  not a copy of another tool's page. Reuse the shared parts where they fit.
- Ask the user every decision that is theirs (a threshold, a word on screen,
  scope); never guess one, never invent a formula, criterion or "standard".
- Copy the entry's row from `knowledge/MONEY.md` §4 into the spec's
  *Established · assumed · chosen*: the causation its finding is said in, the
  inputs it asks for and where they live, the sentence when one is missing.
  The cost is one output beside the tool's own units, never its verdict;
  nothing waits on a missing input (CLAUDE.md, 24 October). An entry marked
  — has no money of its own and the spec says so.
- Validate every formula against its source with independent cases (a
  textbook example, a standard's table, published critical values, or SciPy
  in `scripts/knowledge/independent-cases.py`). If a validation shows the
  specified method is wrong for the data, change the spec and say why.

**Checkpoint:** the spec has its scope, facts said apart from choices, the
report defined, and numbered acceptance criteria each naming the test or
script that will prove it — written before any code. No exceptions for "a
small change" to a calculation or a report.

## 3. Identify the parts to reuse, the dependencies and the gaps

The shared modules (`lib/ie/dist`, `lib/lean`, `ui/Lean`, `lib/report/`,
`lib/cost`), the record (no new noun unless `docs/BLUEPRINT.md` §2 changes
first), the existing Claude gateway if AI is genuinely needed (never another
provider; never AI in a figure), and anything unverified — written into
`knowledge/GAPS.md`.

**Checkpoint:** nothing is duplicated that exists; every dependency the tool
needs is built or its absence is in the scope.

## 4. Build the complete, scoped tool — with its report

Pure, tested arithmetic in the tool's own folder, `src/tools/<key>/` (docs/STEADY.md S3 — older tools still in `src/lib/ie/` until moved with `scripts/moves.mjs`), the sentences in
the module; the page and the paper from the same module; access checked
(`can.edit`, `can.agree`, `can.remove`); money from the one cost model or the
missing input named; designed empty, invalid, too-few and error states; phone
and desk. Extend the existing implementation — never replace working code
because a rewrite is easier; touch nothing unrelated.

**Checkpoint:** every part the spec's scope includes is built, the report
included — or the spec says plainly what is left and why.

## 5. Run the tests and verify the real experience and output

Unit tests on the independent cases, edge cases, invalid input and old
records; the acceptance script in `scripts/acceptance/` driving the real page
in Chromium on realistic data, checking every sentence against the module,
checking the drawn thing (readable rows, nothing over anything else), on the
phone, and **downloading the generated report and reading it back**; PAGES.md
and the inventory; `--shots`/`--compare` against live for every page that
moved; then the full gate (`CLAUDE.md`).

**Checkpoint:** every acceptance criterion has passed in a run you actually
executed. Never report a test as passed that was not run and passed.

## 6. Resolve the defects — or write down what remains

Fix what the run found, then run it again. What cannot be fixed now is said
in the entry's `limits`, the spec's *not yet proved*, and `knowledge/GAPS.md`.

## 7. Update the catalogue and the records truthfully — and release

- The entry's `status`, `built` and `limits`. **Available** only by
  `knowledge/STANDARD.md` "Done, by status" — the catalogue test refuses it
  without the spec's four parts and its acceptance script named in the
  criteria; otherwise it stays **partial** with its limits said. Never
  promote a tool because a screen exists; never demote one without evidence.
  An entry in `AVAILABLE_BEFORE_STANDARD` that you change materially comes
  off that list in the same change.
- The records' *In Faultline*; anything learned into *Assumptions*; gaps into
  `knowledge/GAPS.md`; `node scripts/catalogue.mjs summary --write`;
  `node scripts/catalogue.mjs check`; the backlog; the gate line in `CLAUDE.md`.
- Merged to `main`, Vercel ready — then, and only then, done.

## Report

What was built (entries, files), what was verified (each criterion with the
test or script that proved it, the independent cases), what is live, and
every limit left — with the catalogue numbers of what comes next. If the
library or this skill could not be read, say so — never claim the process was
followed.
