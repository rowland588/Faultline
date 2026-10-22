# The engineering standard for a manufacturing tool

Every new manufacturing tool, and every material change to one, follows
this — whoever builds it, in whichever session. The skill
(`.claude/skills/faultline-tool/SKILL.md`) is how a Claude Code session is
held to it; `CLAUDE.md` points every session here. It sits on top of the
house rules, never instead of them: `docs/DIRECTION.md` (deep, not wide; no
AI in a calculation), `CLAUDE.md` (the gate, done means live, the five rules
of a change, visual management, money in every finding), `docs/BUILD.md` (the
ten-point checklist) and `docs/TOOLKIT.md` Part 1 (the honesty rules).

Rowland, 22 October: *"understand the method, understand the manufacturing
problem, design the right tool, build it properly, and verify that it works
... A tool is not complete merely because the page renders, the buttons work,
a calculation produces a number or the interface looks polished."* And, the
same evening, the quality standard this document now carries: *"every tool
must be technically trustworthy, functionally appropriate, professionally
presented and properly reported. Completion must be demonstrated by evidence,
not claimed by appearance."*

## The quality bar — what every tool built or improved must meet

The catalogue (`src/catalogue/`) and what is already built are the starting
point: a request builds or improves one tool, never a rewrite, never the
catalogue at large.

1. **Designed around its method, not a template.** Before code, the
   specification establishes the real problem and user; the method's
   accepted principles, terms and applications; inputs, units, assumptions
   and data checks; the calculations or decision logic; the variants, limits
   and when the method is unsuitable; the outputs and decisions a competent
   practitioner needs; the pictures, interpretation and report; and the
   tools it relates to. Where the knowledge records fall short, the method is
   researched from authoritative sources and the record brought up to it.
   Established facts, assumptions and Faultline's own choices are said apart,
   each with its source. No formula, interpretation, acceptance criterion or
   "standard" is invented; where the right method depends on context, the
   choice is made explicit and explained on screen. A capability study, a
   time study, an FMEA, a control chart, SMED and a mass balance do not share
   one interface or one calculation shape — the shared parts (`lib/lean`,
   `ui/Lean`, `lib/report/`, `lib/cost`, `lib/ie/dist`) are reused where they
   fit and never bent to make a method fit them.
2. **Substantive.** More than a form, a sum and a result: what the method
   needs — guidance into the right inputs, its real variants, entry, editing
   and persistence (import where the floor has the data elsewhere), units and
   validation, the analysis and its interpretation, pictures that are
   evidence, next steps the method justifies, and plain words for limits,
   uncertainty and data that is not enough. Nothing added to look complete;
   a tool deliberately narrow says its scope on screen and on paper.
3. **Reported from the first build.** The report is specified before code
   (the spec's *The report*) and shipped with the tool, on the existing
   report engine (`src/lib/report/`, `docs/REPORTS.md`) and the lean page:
   purpose, scope and context; the data, dates, units and assumptions; the
   method and its results; the charts and tables; interpretation, findings,
   limits and only the recommendations the method justifies — in a layout a
   factory manager, an engineer or QA can act on. It reads the same verified
   module as the screen; nothing missing is made up. The generated file is
   downloaded and read back in the acceptance script — never only the
   preview.
4. **A professional product.** One credible suite, each tool shaped for its
   task: clear hierarchy and workflow; the house's type, spacing and visual
   management (`CLAUDE.md`); phone and desk; usable tables, forms and charts;
   designed empty, loading, validation, success and error states; labels,
   units and explanations; keyboard and screen-reader basics. No placeholder,
   no decorative chart posing as analysis, no dead control, no completion
   mark the evidence does not support. Looking finished is not being finished.
5. **The application protected.** Its current code, shared parts, record,
   persistence, sync, access (`can.edit` · `can.agree` · `can.remove`) and
   reports are read before anything changes; it is extended, not replaced;
   nothing unrelated is touched; no new dependency without need. AI only
   through the existing Claude gateway, and only where the direction allows
   it (`docs/DIRECTION.md`) — never Gemini or another provider, never in a
   figure.
6. **Done by evidence.** Acceptance criteria are written in the spec before
   code, each testable and each named to the test or script that proves it.
   Numbers are proved against independent cases, never the code's own output;
   edge cases and invalid inputs are tested; the workflow, phone, charts,
   exports and printed report are driven in a real browser; existing
   behaviour is regression-tested by the full gate. Nothing is reported as
   passed that was not run and passed; what is unverified or outstanding is
   said, and written where the next session looks.
7. **The catalogue kept truthful.** IDs, taxonomy, dependencies, build order,
   problem routes and decisions to leave out are kept. A status changes only
   on evidence (below), never because a screen exists; a left-out entry stays
   out unless Rowland reopens it.

## The workflow

**1. Discover — the problem and the decision.** Who asked, in their words;
the line, the product, the decision it serves; the sentence it lets one side
say to the other. Resolve the request against the catalogue
(`node scripts/catalogue.mjs show …` / `search …`). If it matches several
entries, or none, ask which — never build the wrong variant. Place it on
`docs/BLUEPRINT.md` §8 (which layer, which record, where it shows, what it
replaces).

**2. Select the method.** Read the entry's knowledge records and their
`needs` and `alternatives`. Decide by the question and the data — measured or
counted, one item or runs, stable or not — not by the tool's name. If the
method has no record, write it first (`knowledge/README.md`), with sources
checked and what is still unverified said.

**3. Specify.** Copy `knowledge/specs/TEMPLATE.md` to
`knowledge/specs/FC-nnn-name.md` and answer all twelve headings: purpose,
users and scenarios, method selection, inputs, data suitability,
calculations, outputs, usability, failure handling, integration,
verification, maintainability — including the four parts the catalogue's
test requires: **Scope.** (what it covers and deliberately does not),
**Established · assumed · chosen.** (each fact with its source), **The
report.** (what the paper carries) and **Acceptance criteria.** (numbered,
testable, each with the test or script that proves it). No code before
they are written. Set the entry to `specified` with its `spec`.
A decision that is Rowland's — scope, a threshold, a word on screen he has
not agreed — is asked, not guessed (`docs/DIRECTION.md`: nothing new is built
until he says go).

**4. Validate the method.** Before code: every formula checked against its
source; independent worked cases written down with their known answers — a
textbook example, a standard's table or published critical values, or a
second implementation (`scripts/knowledge/independent-cases.py`, SciPy). An
approximation says its accuracy. A threshold says whose it is (a standard's,
practice's, or Faultline's decision).

**5. Design.** Inspect what exists first: the module in `src/lib/ie/` or
`src/lib/` it extends, the shared parts (`lib/lean`, `ui/Lean`,
`lib/report/`, `lib/cost`, `lib/ie/dist`), the screens that show its parent
record (CLAUDE.md rule 5: every place the parent shows). Extend before adding;
a new record only if BLUEPRINT §2 changes first. Screen and paper designed
together. The lean page's order.

**6. Build.** Pure arithmetic in `src/lib/ie/` (or `src/lib/`), worked out
on every render, nothing derived stored; the sentences in the module, so the
screen, the paper and the acceptance script read one source. Access checked
(`can.edit`, `can.agree`, `can.remove`). Money from the one cost model, or the
missing input named.

**7. Test.**
- Unit tests of every formula with the independent cases (step 4) — not
  numbers copied from the code's own output.
- Statistical tools also: boundary values (n at and below each threshold, a
  zero, a single reading, all readings equal), unsuitable inputs (skewed,
  drifting, coarse, mixed), misleading-result scenarios (a small sample that
  looks capable; a percentage fed to a Cpk), and old records still reading
  as before.
- An acceptance script in `scripts/acceptance/` that drives the real page in
  Chromium on realistic food data, checks every sentence against the module,
  downloads the paper and reads it back, and does it on the phone — and
  checks the drawn thing (rows that can be read, nothing over anything
  else), not only that a control can be clicked. Every acceptance criterion
  in the spec is proved by a named test or a step of this script.
- PAGES.md lines and the inventory for what the page must show; smoke for
  the routes.

**8. Review.** Re-read the diff adversarially (what would make the gate
reject it, what would mislead a user); take the screenshots on live and on
the change (`--shots`, `--compare`) and look at every page that moved.

**9. Release.** The full gate (`CLAUDE.md`), merged to `main`, Vercel ready
— then, and only then, done. Update the catalogue entry's status and
`built`, the knowledge records' *In Faultline*, `knowledge/GAPS.md`,
`node scripts/catalogue.mjs summary --write`, `docs/PAGES.md`, and the gate
line in `CLAUDE.md`. Report what was built, what was verified (with the
test and script names), and every limit left.

## Done, by status

- **Available** only when its intended functionality, acceptance criteria,
  tests and report are verified: a specification with its scope, its report
  and its acceptance criteria; the arithmetic's unit tests passing on
  independent cases; an acceptance script in the gate that proves the
  criteria end to end — screen, phone and the generated paper read back —
  and is named in the spec's criteria; the entry naming its code, tests and
  scripts; the full gate green and the change live.
  `src/catalogue/__tests__/catalogue.test.ts` refuses *available* without
  the spec, its four parts and its script named there. The tools that were
  available before this standard (22 October, assessed from their
  acceptance scripts) are listed in `AVAILABLE_BEFORE_STANDARD`
  (`src/catalogue/index.ts`); the list only shrinks — the next material
  change to one of them goes through the standard and takes it off.
- **Partly** when it works and its limits are said — each one, plainly, on the
  entry; never "available with caveats". It stays partly until the evidence
  above exists.
- Generated code, a rendered page, a passing unit test, a specification or a
  good-looking screen is none of these on its own.

## The rules a calculation keeps

- Deterministic, pure and tested; no AI in any figure (`docs/DIRECTION.md`).
- Agreed before measured: limits, counts and what may fail are set before
  readings go in, and a reading never moves them.
- Enough? said as a count ("12 of 30 in"); figures withheld below their
  minimum, with the minimum said.
- How sure? said beside every estimate from a sample.
- What it does not claim: a prediction is said as one; "the number moved",
  never "the fix did it".
- Unsuitable data said in words (not bell-shaped, not steady, too coarse,
  too few) — the tool never hides a warning in a colour alone.
- Money from one model; a missing input named, never invented.
