# Faultline's manufacturing knowledge and tool-building system

Rowland, 22 October: *"Faultline should know what methods exist, understand
when and why to use them, know how they apply to food manufacturing, and have
a disciplined, persistent way of turning that knowledge into working,
verified software. Every future tool should benefit from the work that has
already been done."*

Four things, kept apart on purpose:

| | What it is for | Where |
|---|---|---|
| **The knowledge library** | the engineering: each method, its formulas, assumptions, misuse, food use, references and how strong they are | `knowledge/methods/<discipline>/<slug>.md` |
| **The catalogue** | every tool Faultline could have, each with a stable number (`FC-001` …), its twelve fields and its *true* status; the backlog is the order to build in | `src/catalogue/` (entries, `problems.ts`, `backlog.ts`); summed up in `knowledge/SUMMARY.md` |
| **The directory** | what a person on the floor uses to find a tool by their problem, not its name | in the app: *Every tool* (`#/tools`, from the front door), reading the catalogue — by the problem in the floor's words, the status, the discipline, or a number; `scripts/acceptance/tools-directory.mjs` |
| **The standard and the skill** | how a tool is specified, built, proved and released, every time | `knowledge/STANDARD.md`, `knowledge/specs/`, `.claude/skills/faultline-tool/SKILL.md`, `CLAUDE.md` |

Read `docs/DIRECTION.md` first, as `CLAUDE.md` says: the catalogue is the
full opportunity, not a plan to build it all — *"deep, not wide ... a new tool
is added when a real problem on the line needs it."* The backlog weighs that.

## Finding things

```
node scripts/catalogue.mjs search too many rejects     # problem routes, then entries
node scripts/catalogue.mjs show FC-098                 # one entry: its fields, records, code, spec, status
node scripts/catalogue.mjs show "SMED"                 # by name — lists candidates if several
node scripts/catalogue.mjs next 3                      # the backlog's next three
node scripts/catalogue.mjs method spc.capability-measured
node scripts/catalogue.mjs summary --write             # rewrite knowledge/SUMMARY.md after any change
node scripts/catalogue.mjs check                       # the catalogue's and the library's tests
```

Or grep: every record is plain Markdown with the same ten headings.

## A method record

`knowledge/methods/<discipline>/<slug>.md`, id `<discipline>.<slug>`. Front
matter (one line each, lists in `[ ]`): `id`, `name`, `aka`, `discipline`,
`kind` (established · adaptation · emerging · faultline), `evidence` (the
strongest source: standard · law · textbook · peer-reviewed · practice ·
decision), `depth` (full · summary), `checked` (what was checked, against
what, when — say "from knowledge" when it was not checked against a source),
and the relations `needs` (do first), `next`, `alternatives`, `related` — the
map of methods. Then ten headings, in order: *Purpose and principle ·
Questions it answers · Inputs and minimum conditions · Procedure and
calculation · Assumptions, limits and misuse · Reading the result · When not
to use it — and instead · In food and FMCG manufacturing · References · In
Faultline*. Each reference line starts with its kind in brackets and says how
it was checked. `src/catalogue/methodRecord.ts` parses it;
`src/catalogue/__tests__/methods.test.ts` fails on a missing heading, an
unknown relation, or a backticked path that no longer exists.

Established facts, Faultline's adaptations and Faultline's own decisions are
told apart by `kind` and `evidence`, never mixed. Nothing written by an
assistant is promoted to `standard` or `textbook` without the source being
read — say "from knowledge; edition to confirm" until it is.

## A catalogue entry

`src/catalogue/types.ts` `Entry`: the number, name, discipline and
subdiscipline, the problem, the questions, the method, inputs, outputs, a
food example, what it depends on, complexity, value and why, **status**,
**form** (a tool of its own · a mode of another · a part several share · a
way through several tools · a report · research first), the knowledge records
it rests on, the floor's search words, scenarios, and — once built — where it
opens, its code, its unit tests and its acceptance scripts.

**Statuses mean what the test checks** (`src/catalogue/__tests__/catalogue.test.ts`):

| Status | Words on screen | Requires |
|---|---|---|
| `available` | Available | code, unit tests and an acceptance script that exist and are in the gate |
| `partial` | Partly | code that exists, and its limits said |
| `specified` | Planned | a specification in `knowledge/specs/` |
| `to-build` | Not built yet | the method understood; nothing built |
| `research` | Research first | a gap said in `knowledge/GAPS.md` |
| `left-out` | Left out on purpose | the decision quoted, who and when |

Numbers are never reused or renumbered. A new entry takes the next free
number (`node scripts/catalogue.mjs summary` shows the count; the highest
number is in `src/catalogue/entries/operations.ts`). An entry retired is
marked `left-out` with the reason, not deleted, so its number stays meaningful.

## How it grows

- A tool asked for → `.claude/skills/faultline-tool/SKILL.md` (the skill),
  which follows `knowledge/STANDARD.md`.
- A method the work needs and the library lacks → write its record first,
  with its sources and what still needs checking; then the spec.
- Something learned while building (a misuse found, a limit, a better
  default) → into the record's *In Faultline* or *Assumptions* — and into
  `knowledge/GAPS.md` if it is still unverified.
- After any change: `node scripts/catalogue.mjs summary --write` and the
  tests.

## What this replaces, and what it does not

Nothing is removed. `docs/OPEX.md`, `docs/LEAN40.md`, `docs/TOOLKIT.md` and
`docs/CAPACITY.md` stay the design records of the tools Faultline built — the
library points at them from *In Faultline*. The library is per method; those
documents are per tool. `knowledge/TOOLSET-AUDIT.md` is the audit this was
built from (Phase A, 22 October).
