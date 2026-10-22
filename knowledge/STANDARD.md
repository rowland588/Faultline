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
a calculation produces a number or the interface looks polished."*

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
verification, maintainability. Set the entry to `specified` with its `spec`.
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
  downloads the paper and reads it back, and does it on the phone.
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

- **Available** only when: the arithmetic's unit tests pass with independent
  cases; an acceptance script in the gate drives it end to end, screen and
  paper and phone; the entry names its code, tests and scripts (the catalogue
  test checks they exist and are gated); it is live.
- **Partly** when it works and its limits are said — each one, plainly, on the
  entry; never "available with caveats".
- Generated code, a rendered page, a passing unit test or a specification is
  none of these on its own.

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
