# How to add a tool of each shape — written 25 October 2026 from the builders' reports

`docs/TOOLS-BUILD-BRIEF.md` is the standard every builder works to; this file is the **mechanics** of the two
shapes already built, so the next builder adds a definition and not a mechanism. Read the shape's code first
(`src/tools/calc/`, `src/tools/checks/`); `knowledge/BUILD-SHAPES.md` says which shape each catalogue entry is.

## A calculator (shape built by FC-235; `src/tools/calc/`)

A calculation is a study of tool `calc`: `agreed.calc = { key, inputs, src?, before? }`. Nothing derived is stored.
Each calculator is one definition file found by `import.meta.glob`; the shape owns the page, form, what-if, saved
before, paper, the line report row, the wiring and the proof. No migration.

1. `node scripts/catalogue.mjs show FC-nnn`. Write `knowledge/specs/FC-nnn-<name>.md` from `TEMPLATE.md` **before any
   code**; name `calc-shape.mjs` in its acceptance criteria.
2. Arithmetic in `src/lib/ie/<name>.ts`, with a unit test against independent cases. Add the cases to
   `scripts/knowledge/cases-calc.py` (SciPy, or a textbook figure with its source named).
3. Create `src/tools/calc/defs/<key>.ts`, a default-exported `CalcDef` (copy `kanban.ts`): `key` (lower-case,
   hyphens), `fc`, `title`, `says`, `question` (ends with ?), `group`; `inputs: Field[]` (id, label, unit, kind
   number|choice|text, min/max/integer, help, optional, `money: true` — always optional —, `showIf`, `from: {source,
   where, words, times?}` to offer a figure from the line, `default` only with `chosen:` saying whose choice);
   `check(v)` → `Problem[]` (`block: true` stops the answer, otherwise a warning); `compute(v)` → `{verdict, tone,
   sentence, more?, tiles, working, caveats (≥1), money: {text?, figures?, missing[]}, picture?, closing}` — tiles
   may carry `n`, `better`, `fmt`, `counted` so the shape can say what moved since the before; use `format.ts`
   helpers (fmt, gbp, pct, duration); `examples[]` (≥2) with `expect: {verdict, tone, sentence, tiles, money?,
   warns?}` written from the independent source, each with a `source`; `refused[]` (≥1, with `blocked:` words);
   `see[]` links sibling calculators.
4. Edit its catalogue entry **in place**: `form: 'tool'`, `kind: 'study'`, `built.where: ['/calc/<key>']`, `code:
   [...CALC_CODE, defFile, arithmeticFile]`, `tests: [...CALC_TESTS, yourTest]`, `acceptance: ['calc-shape.mjs']`,
   spec, limits, and **no `app` face** (FC-235 carries the hub's). `calc.test.ts` fails otherwise.
5. `node scripts/catalogue.mjs summary --write`; `npx vitest run src/tools/calc src/catalogue`; `calc-shape.mjs`.
   Add a record to the `seed.ts` calc block only if smoke should open one. No change to the router, registry, hub,
   paper, the test or the script.

Limits of the shape: a result is tiles, a working table, caveats, money and **one picture** (an x/y description —
lines, guides, dots — drawn the same on screen and paper); anything else (a scored table input, bars, heat maps)
needs a shape extension first, said to the integrator. The before is one saved copy of the figures inside the record.
Results are recomputed from the definition as it is now. `can.agree` is unused (nothing in a calculation is
agreed). Money inputs are optional; nothing assumes a carrying rate.

## A check log (shape built by FC-236; `src/tools/checks/`)

A log is a study of tool `log`: its checks are `agreed.log`, its results `facts.results` merged by id (a strike is
kept, never a delete). Due, done, failed, missed and nothing-due are worked out, never stored. A failure raises ONE
problem on the register (`store.ts recordFailure` → `addSnag`, linked by `problemId`); a re-check that fails again
holds nothing more and adds a step to that problem's journey. What a failure holds is said before it is recorded
(packs typed, else Line capacity's rate × the window since the last good check, else the line's rated speed, else
the input named); `holdFor(study, resultId, ctx, def)` is the seam for FC-135 (Product on hold — built).

1. Write `src/tools/checks/defs/<key>.ts` exporting `def: LogDef` (type in `def.ts`), found by `import.meta.glob`:
   `key`, `fc`, `title`, `noun`, `says`, `group`, `standard {rests, confirm[]}` (clause numbers **TO CONFIRM** —
   never quote one not read), `kinds`, `starterChecks`, `reactionWords`, `whereLabel`, `holds`, `priority`,
   optionally `scale`/`scoreRule` (scored) or `tags`, `limits[]`, `examples[]`.
2. At least one hand-worked `examples` entry with `expect` numbers from an independent source (the knowledge record,
   or extend `scripts/knowledge/cases-checks.py`); `figures.test.ts` and acceptance S4 run each through the module
   and then the page.
3. Spec from `TEMPLATE.md`; name `log-shape.mjs` in the acceptance criteria; established / assumed / chosen; TO
   CONFIRM; quote no clause not read.
4. Catalogue entry: `status`, `spec`, `built: logBuilt('<key>')` (from `src/tools/checks/built.ts`), `limits`;
   **no `app` face**.
5. `node scripts/catalogue.mjs summary --write`. A record's "In Faultline" note that names an FC number needs that
   entry to name the record.
6. Nothing else: `defs.test.ts` (lints the definition and its entry), `figures.test.ts`, the table-driven
   `log-shape.mjs` (S1–S4, S7, S9; S3 drives the phone round for each definition) and the inventory hub row pick it
   up. `SKIP=S1,S3 node scripts/acceptance/log-shape.mjs` runs only the sections named.

Limits of the shape: one check kind per check (pass/fail, value, scored, count — `count` has unit tests only, no
definition yet); no photo on a result (a photo goes on the problem); no scheduling by clock slot (it uses "no gap
longer than the interval"); a log is on one line; a kind added extends `LogCheckKind` (`lib/study.ts`), `checks.ts`
and `RoundParts.tsx` — a shape change, say so to the integrator. A food-safety log records and states the team's
rules; **it never decides a release.** Any per-line tile added anywhere must be added in **both** the line page
(`ProductionLineScreen`) and the line report (`LineReportScreen`) — they build their `LineReading` separately.

## Both

- A new **Analysis question** bumps `scripts/acceptance/analysis.mjs`, `analysis-relations.mjs` and
  `analysis-gauge.mjs` (they assert the list: ten today). A new tool in the rail bumps `registry.test.ts` and
  `rail.test.ts`.
- `knowledge/SUMMARY.md` is regenerated, never hand-merged. Conflicts in `CLAUDE.md`'s gate block, `PAGES.md`,
  `scripts/inventory/pages.mjs`, `src/styles.css`, `src/dev/seed.ts` are adjacent additions: keep both sides — and
  when both sides of a hunk open a `{`, check the braces (a merge once left a CSS block unclosed).
- The entry chunk is over 2 MiB (docs/OPEN.md §6): do not import a whole paper module into the app's first load.
