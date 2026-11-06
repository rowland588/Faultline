# Where we are — 6 November 2026

The one page that says exactly where the product stands, for whoever picks it up next (Rowland, 6 November: *"I want
to get Cursor involved … I need everything in the repo so it can understand where we are exactly."*). **Kept current:
a session that ships something updates this page in the same commit.** The rules are `CLAUDE.md`; the product is
`docs/DIRECTION.md`; this is the state.

## 1. What is live (main at the look's L0 commit, 6 November, Vercel production READY, faultline.opexelevate.co.uk)

- **The factory, its lines and machines.** Factory › Line › Machine, every machine on a line, dual lines
  (`docs/MAP.md`, `docs/STRUCTURE.md`). Problems (the register, priorities, journeys, cost, the eight wastes),
  Actions, Programs and tests (the Prove engine, on the line with no project), the reports and the line's full package.
- **The eight methods as projects** (`docs/METHODS.md`): PDCA, DMAIC, 8D, A3, Stage gate, Kaizen event, Improvement
  Kata, Theory of Constraints — each with its own board, its questions, its tools inserted where they belong, its
  dashboard and its project report (`scripts/acceptance/method-*.mjs`, `method-report-*.mjs`).
- **The tools** (`knowledge/SUMMARY.md`, generated — 29 tools a person opens on a page of their own, 119 methods
  inside them; 165 catalogue entries available, 14 partial, 42 not built, 11 research, 7 left out): Line capacity,
  Line standard, Line balance and the time study, SMED, the value stream map, the loss count, work sampling,
  capability (every mode), control charts, the analysis (every question), reliability (with the line watch), the
  check logs, the calculators, the scored registers, the documents, 6M (fishbone, why tree, countermeasures),
  video studies, FC-233 micro-movements (live today), and their papers. Every tool opens from a line, a machine or a
  project; everything says its money or names the missing input.
- **Tools library — gallery and detail** (`#/tools`, `#/tools/:key`, 6 November, ENTERPRISE-UI E7 slice, `scripts/acceptance/tool-page.mjs`): each catalogue card’s **head row** — kind (one word), FC id, status in words and whether the tool has been used; denser grid on desk; tool page — **meta under the title** (FC · kind · status · used), **What it looks like** on `ep-panel`; on a phone the gallery **scrolls sideways** (a full card and the next card’s edge — TG1).
- **Line Talk** (`docs/LINE-TALK.md`, `docs/LINE-TALK-TOOLSETS.md`): the phone's own speech recognition into the
  box, Claude's answers through the `assist` gateway, documents with their PDFs kept in the app; and the **toolsets**
  — talk a *flow diagram* (process flow chart), a *spaghetti diagram* (up to four walkers), a *value stream* (the
  Value stream tool's own map) and Make it / Update it / Undo makes the tool's own record. Gateway **v18**, rules
  fingerprint `08f542070ed1de5c` (must equal the repo's; see §4).
- **The look, L2 — a line's page on the journey** (`docs/LOOK.md` §0–1, 6 November): the Overview in the journey's
  order — what's going wrong (the problems priced a day, the line machine by machine), what needs doing (the programs
  and their days), did it work (the fixes proved, or "none yet" and what proves one), then the ways of seeing and the
  facts.
- **The look, L1 — the Factory on the four questions** (`docs/LOOK.md` §0–1, 6 November): the greeting hero, the four
  cards each a door, the answers under them (problems by cost, actions with who and by when, the lines, the fixes
  proved by their before → after); `lib/factoryQuestions` the one reader. The rule over every later slice is §0,
  *the journey is the product*.
- **The look, L0 — the shell** (`docs/LOOK.md`, 6 November): look E's frame — the navy rail with the mark, the tagline,
  an icon a menu line, the page you are on in blue, the *Factory online* chip (`ui/SyncChip`); the navy phone bar with
  the raised ＋; Inter; blue as the press colour; the cool canvas, white cards, the new neutrals as tokens. Every page
  wears it; the pages themselves are not yet laid out on the four questions (L1–L7 below).
- **Cursor's slices of 6 November, all on `main`**: the phone's other scopes (E7), the study chrome (E6), the empty
  states, the lean line summary (`#/lines/:ws/report` Summary and its paper), the daily full gate on GitHub Actions.
- **Attachments**: pictures, videos and links on a workstation of the stops chart, on its paper, with the app's own
  live camera (`docs/ATTACHMENTS.md`, A0–A1 built; proved on Chromium's fake camera only, not yet on a real phone).

## 2. In flight and next — in this order, each waiting on Rowland's go unless said

**Phone, the other scopes** (E7, 6 November — on `main`, live): at a viewport of 719px and under, Factory home, Set up, a line’s Overview, Projects and Problems stack their panels and stay inside the frame. The one thumb bar is the same. The tools gallery keeps the sideways scroll from the tools slice.

**Parallel improvement plan** (domains, agent streams, hygiene): `docs/IMPROVEMENT-ROADMAP.md` — planning only; does not replace this ordered list.

0. **The look, L1–L7** (`docs/LOOK.md` §4 — go given 6 November, in flight): every page laid out on the four questions
   (what's going wrong · what needs doing · who's responsible · did it work) in look E — the Factory's greeting hero
   and four question cards first (L1), then a line (L2), a project (L3), a problem and the register (L4), the tools'
   tiles as icon cards with their change (L5), the papers' tokens (L6), the phone (L7). Each slice its own gate and
   its own merge; `docs/STATE.md` §1 says which is live (L0–L2 live; L3 a project next).

1. **Spaghetti talk accuracy** (Rowland, 6 November: *"it's going to struggle with what I'm saying … there needs to be
   improvements, guaranteed"*). Tested on his own sentence: the order of moves is right, "left"/"right" become place
   names, two pickups merge into one place silently, "drives the truck" is not drawn. The plan proposed, not yet
   given go: places keep their identity (new place / back to a place, merge or split with a tap); left and right
   anchored once (facing the machine); a leg says carrying or empty, walking or driving, a vehicle its own mover;
   a floor plan or photo to drag the places onto with one known distance setting the scale (the metres from the
   calculator, never the assistant); replay (a dot walks the path, a sentence a leg); and a test set of ~20 real
   narrated walks with hand-drawn answers, scored, before it is called good.
2. **T4 — the micro-movements Line Talk set**: the FC-233 calculator is live; its talk set (instructions, schema,
   reader, a `TalkMicro` view, make/update, `talk-micro.mjs`, gateway redeploy and a real answer checked) is not built.
   The definition exports `inputsOfElements` for it.
3. **T5 — the toolsets hub**: "Talk this" on a tool and on the line's Tools, the chooser's wording, the line report
   listing talk-made studies.
4. **Lean 3-2-1 reports across every paper** (Rowland, 6 November: *"having lean principle reports is important for
   us … as a priority"*): the one-second · two-second · three-second reading (`docs/LEAN-PAGE.md`) applied to every
   report that is not yet the lean page. The **line summary** (`#/lines/:ws/report`, Summary, and its paper
   `lineBundlePdf` — not the full package) is the first: band, tiles, where on the line as the one picture, what it
   means, who owes what, the closing line, then the records. Live since 6 November. Other papers
   are unchanged.
5. **Attachments A2+** — pictures, videos and links on every tool (`docs/ATTACHMENTS.md`); Rowland: a nice-to-have.
6. Smaller: spoken number words ("forty") are flagged *unsure* by the grounded check (phones usually write digits);
   the tests' and fixes' evidence doors still use the phone's own camera, not the live one; FC-233's therblig names
   and groups are from knowledge, not checked against Barnes or Niebel (`knowledge/GAPS.md`).

## 3. Decided, and not to be reopened without Rowland

- No AI builds methods, templates or tools; AI is the voice and the camera only; Claude only (20 October,
  `docs/DIRECTION.md`). Measured by people, not sensors; no OEE (10 October). The product is an operational
  improvement system, never a project-management system; the brand is Faultline · Opex Elevate (31 October).
- The methods are the projects (31 October); 6M is a tool; tools and Prove live on the line, a project is one way to
  organise work (1 November). The line is home (27 October). One home, one menu, tabs across the top (23 October).
- Money everywhere from one cost model (17 and 24 October, `knowledge/MONEY.md`). The visual-management colours and
  light paper (15 and 17 October). The quality standard for every tool (22 October, `knowledge/STANDARD.md`).
- Housekeeping (6 November): the tree holds only what runs, is proved and is explained; branches go once their
  patches are in `main` (`CLAUDE.md`, *Housekeeping*).

## 4. What lives outside the repo — and how it is reached

**The connections are in the repo.** Supabase and Vercel are reached through MCP: Claude Code reads `.mcp.json`,
Cursor reads `.cursor/mcp.json` (both point at the same Supabase project; Cursor's adds Vercel). Sign in once when
the editor asks; after that `apply_migration`, `execute_sql`, `deploy_edge_function`, `get_deployment` and the rest
work from either tool, so an agent in Cursor can deploy the gateway, run a migration and read a build's state itself —
never say "I cannot operate production" before checking those tools are on. The secrets never pass through either.

| Thing | Where | How |
|---|---|---|
| Production | Vercel project `faultline` (team `rowlandglew35-7130s-projects`), builds `main` | done only when the production deployment is READY; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are its environment variables |
| The database | Supabase project `eqdigvzbljofxznqtfia` ("Faultline") | a schema or policy change is `supabase/<NAME>.sql` in the house shape, applied as a migration under that name, **read back** (`pg_policies`, `pg_get_functiondef`, `pg_indexes`) before it is reported; the files are a history, never replayed |
| Line Talk's gateway | Supabase edge function `assist` (Deno, `verify_jwt` on), source `supabase/functions/assist/` | edit `src/tools/talk/{talkSets,talkAssist}.ts` and `src/tools/video/*`, run `node scripts/sync-assist.mjs`, deploy **all six files** (index.ts, talk/talkSets.ts, talk/talkAssist.ts, video/gatewayUsage.ts, video/record.ts, video/visionCore.ts); then prove it: the live `rules` fingerprint (first 16 hex of SHA-256 of `talkRulesText()`) must equal the repo's, and a real answer is run through the check path — `net.http_post` from SQL to the function with `x-check-key` = `push_keys.cron_key` and the anon JWT, read back from `net._http_response` |
| Secrets | Supabase function secrets `ANTHROPIC_API_KEY` (Rowland's), `ASSIST_*` model and allowance settings | never in the repo, never in a file; the app works with the assistant off |
| The voice note in typed boxes | `api/voice.ts` (Vercel function, Gemini — the one place it is left) | its key is a Vercel environment variable |
| The daily full gate | GitHub Actions **Daily full gate** (`.github/workflows/daily-full-gate.yml`): 05:46 UTC (same wall time as 05:46 Europe/London when UK is on GMT), checks out `main`, one dev server on 5191, `scripts/gate.sh full` with the same tree for change and live — uploads `summary.txt` and step logs as a workflow artifact; **manual**: Actions → Daily full gate → Run workflow | Optional Rowland task: a scheduled run on Claude Code may still report by push and e-mail — a red full gate on `main` is the first job of the next session either way |
| Branch pruning | the `Prune branches` GitHub action (`.github/workflows/prune-branches.yml`) | run by hand from the Actions tab |

## 5. How to work here, in one breath

Read `AGENTS.md`. Start the dev server with the fake Supabase values (README). Place the change on the blueprint
(`docs/BLUEPRINT.md` §8): which record, where it shows, what it replaces. For a tool, the `faultline-tool` skill and
the standard — spec first. Build on a branch; prove with the checks and the acceptance scripts the change touches
(or `scripts/gate.sh fast`); write `docs/PAGES.md`, the gate line, this page; merge to `main`; confirm the Vercel
production build; then say it is done. Never edit the checkout while its gate runs. Push after every commit.
