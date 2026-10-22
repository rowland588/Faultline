# Faultline's toolset, audited — 22 October

Phase A of the knowledge and tool-building system (`knowledge/README.md`).
Rowland, 22 October: *"Inspect the actual codebase and existing tools ...
Produce a practical, evidence-based assessment ... Identify tools that are
too narrow, incomplete, misleading or incorrectly named relative to what they
actually do."* Read for it: `docs/DIRECTION.md` (first), `CLAUDE.md`,
`docs/BLUEPRINT.md` §6, `docs/TOOLKIT.md`, `docs/OPEX.md`, `docs/LEAN40.md`,
`docs/CAPACITY.md`, `docs/BUILD.md`, every module in `src/lib/ie/` and
`src/lib/intelligence/`, the rail (`src/ui/rail.ts`), the front door
(`src/screens/StartScreen.tsx`), a line's tools
(`src/screens/ProductionLineScreen.tsx`), the router
(`src/state/useRoute.ts`), every test under `src/lib/**/__tests__` and every
script in `scripts/acceptance/`. Where a claim below says "verified", it
names the test or the acceptance script that proves it; where it says "not
driven", no acceptance script exercises it.

## 1. What already existed for this initiative

**Manufacturing knowledge — written, but per tool and in prose.**
`docs/OPEX.md` (what Lean/TPS, IE, TOC, TPM, WCM, Six Sigma and Shingo say;
the six-move loop; how each family is evidenced; what is left out),
`docs/LEAN40.md` (the principles, the toolkit agreed 10 October, the IE
arithmetic appendix, sources), `docs/TOOLKIT.md` (how a tool lives, the five
layers, the honesty rules, thirteen tools designed), `docs/CAPACITY.md`
(plate speed, capacity's numbers, the bottleneck, the V-curve, a shift's
time model, what a loss costs, EN 415-11). Missing: an index by *method*
(a method appears wherever a tool happened to need it), a record of how
strong the evidence is for each, the methods Faultline has *not* touched,
and a list of what still needs checking.

**An engineering standard — strong, but not per tool.** `CLAUDE.md` (the
gate, done = live, the five rules of a change, visual management, money in
every finding), `docs/BUILD.md` (separated pieces, the ten-point checklist,
an acceptance script per release), `docs/TOOLKIT.md` Part 1 (the honesty
rules: enough? how known? what it does not claim). Missing: a written
specification before a tool is built (method chosen against alternatives,
data suitability, failure handling), and independent worked cases as a
rule — the practice exists (`src/lib/ie/ergo.ts` is proved by the CCOHS
worked example; `src/lib/ie/mix.ts` by its own arithmetic) but nothing
requires it.

**Claude Code set-up.** `CLAUDE.md` only. `.claude/skills/` holds two
third-party Supabase skills; there is no project skill, no `settings.json`
and no hooks (`.claude/launch.json` is the preview's dev server). So a
project skill adds to what is there; nothing competes with it.

**The tool registry in code** — four lists that must agree: the rail's
`toolPlaces` (eleven tools, `src/ui/rail.ts`), the front door's `TOOL_SAYS`
(`src/screens/StartScreen.tsx`), a line's `TOOLS`
(`src/screens/ProductionLineScreen.tsx`, ten) and `STUDY_TOOLS`
(`src/lib/study.ts`, twelve — four of them, `time`, `cycle`, `ergonomics`
and `layout`, reserved in the database check with no screen).

**A directory** — the front door lists the eleven tools with a line each.
It answers "what can it do" for what is built; nothing about what is next,
and nothing found by the problem ("too many rejects").

## 2. The tools, one by one

| Tool (where) | What it answers | Methods | Verified by | Known limits |
|---|---|---|---|---|
| Line capacity (`#/balances`) | what each station can make, which limits the line, people needed, £ a pack in labour, what-ifs, several lines merging, the way to the target | Toyota's process capacity sheet, plate speed, the V-curve, the constraint, ILO rest allowance | `capacity*.test.ts` (12 files), `line-capacity.mjs`, `list-paper.mjs`, `report-stress.mjs` | accumulation between machines not driven by an acceptance check; stops not simulated |
| Line balance (`#/linebalance`) | each person's timed work against takt, the Yamazumi, the bottleneck's cost | stopwatch time study (BS 3138 rating in the arithmetic), allowances, Yamazumi, balance loss | `balance.test.ts`, `balanceLink.test.ts`, `work-balance.mjs` | rating is in `lib/ie/balance` but never asked on screen (every element at 100); the suggestion follows flow order only (no precedence diagram); the number of cycles needed is not said; no person–machine chart |
| Line standard (`#/standards`) | who stands where, drawn as the line looks | standard work chart | `standard*.test.ts`, `line-standard.mjs` | no walking distances (spaghetti) |
| Capability (`#/capability`) | do readings meet agreed limits; Ppk and Cpk | Pp/Ppk (overall), Cp/Cpk (moving range ÷ 1.128), normal tails, the packers' three rules | `sample.test.ts` (20), `audit-ie-sample.test.ts` (14), `ecosystem-capability.mjs`, `audit.mjs` | **the pilot (§3)** |
| Value stream (`#/value-stream`) | the line's steps, who, where, waits, lead time, value-adding share, future state | value stream mapping | `steps.test.ts`, `value-stream.mjs` | no inventory counts → Little's law; no supermarket, kanban or pitch design |
| SMED (`#/smed`) | a changeover element by element, Shingo's stages, what changeovers cost a shift to a year | SMED | `changeover*.test.ts`, `changeover.mjs` | sequence-dependent changeovers (allergen order) not modelled; the interval (EPEI) partly |
| Work sampling (`#/sampling`), the bottleneck walk | what people are doing at random moments, shares with margins | activity sampling | `sampling.test.ts`, `walk.test.ts`, `work-sampling.mjs` | — |
| Loss count (`#/losses`) | where a shift's time went at the bottleneck's speed, in packs and pounds | the time model, the six big losses by hand | `losses.test.ts`, `shift-losses.mjs` | OEE deliberately not shown (10 October); short-stop durations not measured |
| Reliability (`#/reliability`) | MTBF, failure rate and their 90% bounds, several counts at once | exponential MTBF with χ² bounds, the Laplace trend test, B10 | `reliability.test.ts` (33), `reliability.mjs` | no repair times (MTTR, availability); no Weibull; no reliability growth |
| Video study (`#/video`) | the work at each station read from footage | time study from video (a Faultline adaptation) | `video-study.mjs`, `video-fit.mjs`, `video-check.mjs`; `video-eval.mjs` measures accuracy, not pass/fail | accuracy depends on the footage (`docs/VIDEO.md`); changeovers not measured from footage |
| Line Talk (`#/talk`) | talk on the line; it answers and writes reports | Claude through the `assist` gateway | `line-talk*.mjs` | never works out a figure — by design |
| The line's stops, Pareto, heat map, chronic or one-off, the constraint, recovery levers, load against demand, Ask (by formulas) | where and when the line stops, what to go after, will next week fit | Pareto, TOC (the mirage), recurrence | `intelligence.test.ts`, `paretoFromLog.test.ts`, `upgrade.mjs` | — |
| Stage gate (a kind of change) | new equipment to handover: tests, programs, performance run, ramp-up, pace, materials, handover, the filmed walk | stage gate, acceptance testing, burn-down | `stagegate-*.mjs`, `programs.mjs`, `commissioning-report.mjs` and others | an operational-readiness list is not offered |
| 6M (a kind of change) | a running line made to perform better: fishbone, five whys, countermeasures, proof, holding | cause and effect, five whys, PDCA | `sixm*.test.ts`, `sixm-evidence.mjs` | — |
| Lever tree (a kind of change) | a number worked down to what has to be true | driver tree | `smoke.mjs`, `front-door.mjs` only | **not driven by an acceptance script** |
| Problems, Actions, control room, reports | who owes what by when; am I in control | visual management | `snags.mjs`, `actions.mjs`, `control-room.mjs`, `report-relevance.mjs` | — |
| Measures and proof (`lib/measureProof`, `lib/impact`) | did the team's own weekly number move, for a reason | Welch's one-sided test | `measures.test.ts`, `impact.test.ts` | **not driven by an acceptance script** |
| Arithmetic with no screen | ergonomics (`lib/ie/ergo`, NIOSH, proved by the CCOHS example), capacity's three numbers and the product mix (`lib/ie/mix`) | NIOSH lifting equation; throughput per constraint minute | `ergo.test.ts`, `mix.test.ts` | **nobody can reach them** |

## 3. Findings

**Too narrow, or named for less than it does — the capability study.**
One number per item or a ✓/✗ is all it takes. A one-sided limit is possible
but the screen never offers it ("either can be left blank"). *Ticks* is not
a word anyone on the floor would use, gives no rate, no capability and no
paper (`capabilityBlocks` returns nothing for it). Rejects counted out of
packs made, and faults counted on an item, have nowhere to go — so a reject
rate, the most common question on a food line, cannot be studied. Ppk is
worked out without first asking whether the readings are bell-shaped or
steady, and there is no histogram. The unit box takes eight characters. No
money. The front door says "with Cp and Cpk" while the verdict stands on
Ppk. Rowland, 22 October: *"surely we can do a process capability on
rejection rate ... It needs to be quite vast."* It is the pilot (Phase D).

**Shared arithmetic duplicated.** A normal tail (`lib/ie/sample`
`upperTail`), χ² bounds (`lib/ie/reliability`) and a proportion's margin
(`lib/ie/sampling`) are each worked out in their own module. Attribute
capability needs all three plus exact binomial bounds. Recommended: one
module of distributions (`src/lib/ie/dist.ts`) built with the pilot and
used by it; the reliability and sampling modules keep their own until a
change to them is asked for — working code is not moved for tidiness.

**Not driven, or not reachable.** The lever tree and measures/proof have
no acceptance script; ergonomics and the product mix have no screen; the
time study's rating is never asked. Each is "partly" in the catalogue with
the reason, not "available".

**Money missing** (BLUEPRINT §6): capability (rejects, give-away), the value
stream, the line standard, the problems register, a 6M countermeasure.

**No register of what was left out on purpose** outside the documents that
decided it: no OEE (10 October), no sensors or IoT (10 October), no
method builder or AI-built tools (20 October), none of the six
project-management pieces (17 October). The catalogue carries each as
*left out*, with the decision quoted, so a later request meets the reason
first.

## 4. What was built from this (Phases B–E)

1. **The knowledge library** — `knowledge/methods/`, one record a method,
   with its evidence and what still needs checking (`knowledge/GAPS.md`).
2. **The catalogue** — `src/catalogue/`, every tool Faultline could have,
   each with a stable `FC-` number and its true status; the backlog and the
   summary derived from it (`knowledge/SUMMARY.md`).
3. **The standard** — `knowledge/STANDARD.md`, the specification template
   (`knowledge/specs/TEMPLATE.md`), the project skill
   (`.claude/skills/faultline-tool/SKILL.md`), a section in `CLAUDE.md`, and
   a test (`src/catalogue/__tests__/catalogue.test.ts`) that fails when the
   catalogue, the library and the code disagree.
4. **The directory** — *Every tool* in the app, found by the problem, the
   discipline or the method: **not built yet** (the next slice). Until then
   the catalogue is searched with `node scripts/catalogue.mjs search`.
5. **The pilot** — the capability study, specified and built through the
   standard (`knowledge/specs/FC-094-capability.md`): part 1 built 22
   October — one limit in words, the checks before capability, how sure a
   Ppk is, pass or fail with how many may fail and what it proves, the
   histogram, screen and paper (`scripts/acceptance/capability-kinds.mjs`).
   Validating it changed the specification once: the shape test is
   D'Agostino–Pearson, not Anderson–Darling, because whole-number readings'
   ties throw AD (the record `spc.normality-checks` has the evidence).
