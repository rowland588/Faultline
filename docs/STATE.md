# Where we are — 6 November 2026

The one page that says exactly where the product stands, for whoever picks it up next (Rowland, 6 November: *"I want
to get Cursor involved … I need everything in the repo so it can understand where we are exactly."*). **Kept current:
a session that ships something updates this page in the same commit.** The rules are `CLAUDE.md`; the product is
`docs/DIRECTION.md`; this is the state.

## 1. What is live (main at the look's L0 commit, 6 November, Vercel production READY, faultline.opexelevate.co.uk)

- **The landing page, modern and minimal (7 November).** Rowland: *"a new landing page something really modern but
  minimalistic"* — white, a faint dot field, the mark and *How it works* at the top, the name large on the mark's trace
  drawn once, the methods as pills, the five stages numbered, the sign-in a plain card beside them (`screens/Landing`,
  `scripts/acceptance/landing.mjs`). **The tools' workspaces, T1–T2 (7 November, `docs/TOOLS-DESIGN.md`)**: the measurement
  tools and the calculators — presentation only, every calculation kept.
- **Every line has its own action tracker (7 November).** Rowland: *"every line has its own action tracker. Action tracker
  automatically populates a Gantt chart … a really classic, simple action tracker … automated by problems"*. A line's
  **Actions** tab (`src/line/actions`): every problem on the line a row at once — what, who, due, status, priority, edited where
  it sits as the problem's own (no new record) — and the Gantt drawn from the same rows (raised → due, late red with its tail to
  today, today's line); *Add an action* raises a problem on the line; Report ▾ › Action tracker is the project's meeting paper for
  the line (`scripts/acceptance/line-actions.mjs`).
- **Documents as a template library (7 November).** Rowland: *"you see the templates visible like a library ... that's the
  library that you want to pick ... it could be very, very powerful"*. The Documents hub shows every form as a template card —
  a small page drawn from its own parts, what it is for, Use this template — with Find a template (`src/tools/doc/DocScreen`
  DocThumb, `doc.css` dl-*). Presentation only; the ten forms are as they were. **Next, at his word: more forms, in his scope
  only** — operations and continuous improvement: Lean, Six Sigma, industrial engineering, communication and leadership (*"I'm
  not a health and safety individual … it's all about operational and continuous improvements"*): no H&S risk assessments or
  technical/food-safety assessments. Each new form goes through the `faultline-tool` skill (a definition in
  `src/tools/doc/defs/`, its spec and worked examples, `doc-shape.mjs` walks it with no change).
- **The Tools page, tools only (7 November).** Rowland: *"you've split down every single functionality within its tool and
  then called each functionality a tool"*. 28 tools (Problems and Actions are the menu's pages; 6M is a tool), each card saying
  what it holds; Line Talk and 6M as doors; *What we have and what we need to build* tool by tool — 119 ways of using them built,
  4 to build inside them, 38 new tools planned and not started, 32 parts of the app, 11 research, 7 left out
  (`src/catalogue/counts` holdings). FC-017 (the Kata) brought up to what was built: partly built, as the Improvement Kata
  project. The live Claude gateway checked the same day: a chat, a report and a flow-diagram walk answered correctly, its
  instructions the repo's (`08f542070ed1de5c`).
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
- **The look, L7 — the phone** (7 November): every page of L0–L6 checked at 390 px — the navy bar with the raised ＋,
  the hero stacking, the cards two-up, the rows wrapping, nothing off the side; no page needed more than it had.
- **The look, L6 — every paper on the new tokens** (7 November): the press colour blue, the frame navy, the cool neutrals,
  light as ever; the five state colours, people's colours and the mark untouched. Known red on `report-stress`: the
  ordinary product's Line capacity paper runs to 2 pages (pre-existing, on `main` too).
- **The look, L5 — the tools' pages** (7 November): the lean page's tiles, panels and closing line in the card language.
- **The look, L4 — a problem on the journey** (6 November): its editor's boxes under the three questions — what's going
  wrong (words, priority, where, evidence, waste, cost), what needs doing (the plan, whose, by when, its root cause),
  did it work (where it stands, closed with its proof, the journey); the register's rows in the card language.
- **The look, L3 — a method project's dashboard** in the card language (6 November): the sentence with its state edge, the
  journey strip with *you are here*, what the tools are showing, what needs attention, the next step.
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

- **The spaghetti diagram drawn on a board (7 November, FC-004 part 3 — Rowland: *"a blank page … put people there and click the
  person to the objects I have on the map, as I do that lines are created"*).** On the several-walkers diagram: draw areas,
  place pins, the Line standard's icons and people; a scale by two taps and a length; tap a person, Walk, then the places — each
  tap a move and a line. It fills the calculator's boxes, so the figures, money and paper are the same; a measured metres typed
  over a move wins. Doors: the one-person list's *Draw it on a board*, a Line standard's More ▾ › *Walk on this map*. A photo
  under the board is not built yet. `knowledge/specs/FC-004-spaghetti-board.md`, `scripts/acceptance/spaghetti-board.mjs`.

- **The Microsoft 365 shell and the Factory (7 November, docs/ENTERPRISE-UX.md X1 — Rowland: *"we want the app to look like how
  Microsoft would look like if it built it"*).** A white top bar with the search in the middle, a narrow white icon rail, the
  phone's bar white; the Factory as Microsoft 365's home — a soft wash behind the greeting, the figures, *Needs you now* (three
  cards), the Lines as a table, the three answers side by side, the projects' board last. Next: X2 a line (its doors as buttons
  at the top, machine cards as a simple header, Tools redone), then the record panel, planning (the projects' board), problems
  and projects, the tools, reports, phone review.

- **What waits for what on a line's actions (7 November — Rowland: *"build in dependencies from the gantt or the problem page,
  either one populates the other, give options to the user if both ways are allowed"*).** One link kept on the action that waits
  (`Snag.after`, carried as `after:<id>` in `linked_obs_ids` — no column); set from a tracker row's *Link* (both ways round), by
  dragging a bar's end onto another bar (which first?), or in the problem's editor; drawn as arrows on the Gantt, a day that cannot
  be kept said in amber words, a loop refused; on the tracker's paper. `src/line/actions/depends.ts`, `line-actions.mjs` step 5b.

- **X2 the line page and X5 the Problems register (7 November, docs/ENTERPRISE-UX.md).** The line's doors a row of buttons
  under its header, Spread what works and Eyes on the line side by side, the tools in use a table; the register's groups one
  bordered list with hairline rows. Presentation only.

- **Reports polished and words kept off words (7 November, docs/ENTERPRISE-UX.md X7 first pass).** Every paper's band, figures,
  headings, tables, badges and closing line to an Office finish, the lean page kept; the fishbone's causes wrap to two lines and
  keep their tags off the bones; the plan's Today never on a month's name; the closing line's red mark is "!", not a cross.

## 2. In flight and next — in this order, each waiting on Rowland's go unless said

**Phone, the other scopes** (E7, 6 November — on `main`, live): at a viewport of 719px and under, Factory home, Set up, a line’s Overview, Projects and Problems stack their panels and stay inside the frame. The one thumb bar is the same. The tools gallery keeps the sideways scroll from the tools slice.

**Parallel improvement plan** (domains, agent streams, hygiene): `docs/IMPROVEMENT-ROADMAP.md` — planning only; does not replace this ordered list.

0. **The look** (`docs/LOOK.md` — L0–L7 live, 7 November; the rule in §0, *the journey is the product*, applies to every page touched from here): every page laid out on the four questions
   (what's going wrong · what needs doing · who's responsible · did it work) in look E — the Factory's greeting hero
   and four question cards first (L1), then a line (L2), a project (L3), a problem and the register (L4), the tools'
   tiles as icon cards with their change (L5), the papers' tokens (L6), the phone (L7). Each slice its own gate and
   its own merge; `docs/STATE.md` §1 says which is live (L0–L7 live — the look is built; the rule in §0 applies to every page touched from here).

0b. **The enterprise programme — "do them all go" (Rowland, 7 November).** Asked whether the app is a credible global
   enterprise SaaS product, the answer was *not yet — deep and correct, but inconsistent in finish*; four steps were proposed and
   he said do them all, in this order, each slice merged live on its own with its before/after pictures:
   1. **Finish the look** — `docs/ENTERPRISE-UX.md` X2 (the line page: its doors as buttons at the top, simple machine cards,
      Tools redone, short labels in place of paragraphs), X3 record panel, X4 planning, X5 projects and problems, X8 the phone;
      `docs/TOOLS-DESIGN.md` T3–T7 (timed studies, registers, maps and boards, logs, documents). Cut the words: labels, not
      sentences, where a sentence is not the finding.
   2. **Headline tool graphics** — one hero picture per tool at the control chart's and the Gantt's standard.
   3. **Enterprise basics** — user and team admin, notifications, an audit trail, search across records, Excel export,
      onboarding with a demo factory (SSO waits on Rowland's choice of provider).
   4. **AI as a selling point** — his decision first: it would change the 20 October rule (the voice and the camera only).

1. **Line Talk is finished as it stands — no new voice work (7 November).** Rowland: *"we can leave the spaghetti as it
   is, and we just leave now the line talk with what we've already made, as long as what we've made is completed."* So
   the voice work stops where it is: Line Talk (talk or type on the line, photos, answers, documents and their PDF) and
   its three sets — flow diagram, spaghetti diagram, value stream — stay, checked complete that day (`line-talk`,
   `line-talk-assistant`, `talk-toolsets`, `talk-spaghetti`, `talk-valuestream` all pass; the live `assist` gateway
   the repo's file for file). **Dropped, not parked:** the spaghetti talk-accuracy plan (the board, FC-004 part 3, is
   how a spaghetti is drawn now), the micro-movements talk set (T4; FC-233 stays a typed tool) and the toolsets hub
   (T5, "Talk this" on every tool). Nothing new is built for voice unless Rowland asks again.
2. **Lean 3-2-1 reports across every paper** (Rowland, 6 November: *"having lean principle reports is important for
   us … as a priority"*): the one-second · two-second · three-second reading (`docs/LEAN-PAGE.md`) applied to every
   report that is not yet the lean page. The **line summary** (`#/lines/:ws/report`, Summary, and its paper
   `lineBundlePdf` — not the full package) is the first: band, tiles, where on the line as the one picture, what it
   means, who owes what, the closing line, then the records. Live since 6 November. Other papers
   are unchanged.
3. **Attachments A2+** — pictures, videos and links on every tool (`docs/ATTACHMENTS.md`); Rowland: a nice-to-have.
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
