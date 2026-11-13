# Where we are — 12 November 2026 (the product is LUNAR; its AI colleague is Luna; reliability first)

The one page that says exactly where the product stands, for whoever picks it up next (Rowland, 6 November: *"I want
to get Cursor involved … I need everything in the repo so it can understand where we are exactly."*). **Kept current:
a session that ships something updates this page in the same commit.** The rules are `CLAUDE.md`; the product is
`docs/DIRECTION.md`; this is the state.

## 1. What is live (main at the look's L0 commit, 6 November, Vercel production READY, faultline.opexelevate.co.uk)

- **Reliability first — 12 November** (Rowland: *"prioritise reliability and the actual working experience rather than simply adding
  more features"*). **The work pane on the live site:** `X-Frame-Options: DENY` made every page opened beside Luna a browser error page
  (only *Open the page* worked); now `SAMEORIGIN` / `frame-ancestors 'self'`, guarded by `frameHeaders.test.ts`. **The charter:** its home
  worked out by code (`capabilities/documentHome` — none: start the charter document; one: fill it; two: ask which, nothing written),
  `answer_method` no longer takes a charter, its description no longer says it holds one, Luna's instructions say documents are records
  and never to claim a change a step did not make; the packing exam tightened, not loosened (`docs/LUNA-EVAL.md` §5). **Real model, 12
  November 07:11:** run 1 put the charter in the charter document and the correction to Priya Shah in it, 12 turns answered; the rest of
  that run, runs 2–3 and the bagger benchmark were cut off by the exam account's 400-answers-a-day allowance — re-run scheduled. **The
  work beside Luna:** results, charts and reports drawn in the work pane; the machine and the problem in context
  (`docs/LUNAR-ENVIRONMENT.md` §5, `luna-work-pane.mjs`). **Production data held** (below, §2). **The database read back:** the business,
  people and permissions migrations are all applied (§1, the organisation entry). Advisors: 23 security-definer functions callable by
  `anon` and 34 by signed-in users (most are trigger functions), and leaked-password protection off — pre-existing, listed for a
  security pass, nothing changed.
- **Sunrise — the colour of the whole app, 12 November** (Rowland: *"looking at a beautiful new morning sky. Light, colour, depth and
  possibility"*). One token layer in `styles.css` (`html[data-luna]`, the `--lu-*` names kept): light sky blues on airy backgrounds, a
  soft blue → turquoise → green for Luna and where you are, gold, ember and coral placed with care; no heavy navy, no AI purple (the
  chart palette's violet replaced). The five state meanings and their words unchanged; paper stays light. `docs/LUNA-LOOK.md` (Sunrise
  first, Aurora marked superseded). Proved by smoke (235 screens), the inventory (1,513 things), calm (none busier, 30 calmer) and the
  look-sensitive acceptance scripts.
- **LUNAR's knowledge — findings, outcomes, history and the factory as one loop, K1–K4, 12 November** (`docs/LUNAR-KNOWLEDGE.md`;
  Rowland: *"Luna must learn from evidence and experience, not simply accumulate opinions … retain contradictory evidence … rather than
  quietly rewriting history"*). An append-only ledger (`supabase/KNOWLEDGE.sql`, applied and read back — the database keeps an entry as
  first written; no delete): the brain's findings as claims with identities, a new version only when a claim changes, the old kept and a
  lapse said; every fix's outcome by code (stops per watched day, 28 days before and after, the exact test, held or came back after 8
  weeks; a 6M proof or a countermeasure's own study as measured); what people say kept as accounts and reviews with how it is known, never
  as evidence; a claim's standing with evidence over opinion; the history of a machine; the same pattern across one customer's lines.
  Luna: `findings` (with standing and versions), `outcomes`, `history`, `note_knowledge` (a card), `raise_problem` carrying its finding.
  Screens: the line's What LUNAR has found (Agree · Disagree… · Investigate, Did the fixes work?, Across this customer's lines), the
  machine's What has been tried. Proved by unit tests on hand-worked cases and `scripts/acceptance/knowledge.mjs`. Not yet: the real
  model's use of it; overnight work on the server; loss counts, check logs and studies read into findings.
- **Two marks, never one — 12 November**: LUNAR's mark a crescent moon, Luna the sunrise orb (`docs/LUNA-LOOK.md`).
- **LUNAR does its homework — the analytical brain, B1, 12 November** (`docs/LUNAR-BRAIN.md`; Rowland: *"Lunar does its homework
  before the question is asked"*). `lib/brain/engine` (pure, no AI) works four questions on each line's stops — where the time went
  (28 days), whether it changed (7 days against 21, an exact test checked against SciPy), what recurs, and time booked to a
  description rather than a cause — each finding with its sureness, the stops it rests on, its money from the cost model and what it
  cannot say; kept as one `brain` study a line (`supabase/BRAIN.sql`, applied and read back), worked again only when the records
  change. Luna's `findings` capability (always loaded) and the rule *read findings first; a recorded reason is never a cause*;
  the line's *What LUNAR has found* inside More about this line. Not yet: the server's nightly homework (B2), more of what LUNAR holds
  (B3), "how was yesterday" (B4), workbooks absorbed on arrival (B5), the learning loop (B6 — Rowland's §6 arrived cut off).
- **LUNAR — the environment, with LUNA at its centre; the Aurora look; Luna's voice delivery (11 November,
  `docs/LUNAR-ENVIRONMENT.md`, `docs/LUNA-LOOK.md`, `docs/VOICE.md` Delivery).** Rowland: *"LUNAR (L-U-N-A-R) is the product, platform
  and intelligent operational environment. LUNA (L-U-N-A) is the AI colleague who lives within LUNAR … Do not confuse them"*; the acronym
  *Learning, Understanding, Navigation, Analysis & Reasoning* on the landing page (`lib/product` `PRODUCT.expansion`, the door's letters).
  With AI Mode on, `#/` is the environment: Luna's conversation, the bar's **Everything** (⌘. — every place, line, project, record and
  conversation, `ui/Everything`), the work in context once a conversation is on a line or project (`colleague/WorkContext`), the real
  page in the work pane. The rail's first line is **Luna**; **Factory** opens the Story at `#/story`; the consultant's home is
  `#/clients`; old links (`#/start`, `#/methods`, `#/design`) land on the Story. AI Mode off, `#/` is the app as it was. The Aurora tokens
  (navy ground, daylight under instruments, turquoise for where you are and for Luna, ember for what you press, her aura by state). Her
  voice: `colleague/delivery` — units, money, ranges, dates and plant words said in full (ppm, OEE spelled, LUNAR as a word, HACCP),
  sentences joined into natural phrases, a breath between them by punctuation, figures slower, questions lifted, natural voices ranked
  first, a pitch setting and *Hear her with these settings* — the phone's own engine only, nothing new sent anywhere. Her instructions
  name both (`COLLEAGUE_SYSTEM`, `TALK_SYSTEM`) — live in the gateway by the Deploy server functions workflow on the push to main
  (12 November, run 6). `lunar-environment.mjs`; the scripts that went to `#/` for the
  Story go to `#/story`.
- **Luna the front door, and AI Mode calm (11 November, F1–F2 — Rowland: *"Luna becomes the primary way people interact … this does NOT
  mean that everything becomes a chatbot … As Luna becomes more capable, the user experience should become simpler"*).** F1: Today
  (`#/today`) with AI Mode on opens with Luna — the header's one line asks what the person wants to understand or get done, then her box
  with voice beside it (`colleague/lunaPanel talkToLuna`: the voice bar at the foot of Today) and two or three suggestions worked out by
  code from the real state (`lib/today suggestionsFor`); sending opens her beside Today; AI Mode off, Today is as before. F2: AI Mode at
  a desk opens on the conversation and the work alone — Conversations and Show context each one press (kept per device), Parked, Sources
  and What your words mean folds in the context. No menu item added, nothing removed. `luna-front-door.mjs`; scripts reading the context
  open it first (`scripts/lib/lunaContext.mjs`); calm's Today entry lowered (desk 4 → 1 boxes).
- **Problems raised from inside a tool, and held there (11 November, `docs/TOOL-PROBLEMS.md`).** Rowland, at Cellox: *"raise a problem from inside the tool … a specific station … held within the tool itself"*. A workstation's sheet on Stops across workstations and every tool record's More ▾ raise the one problem sheet with the line, project, machine and the part's pictures (the same files) filled in; the problem remembers the record and part (`raised:`/`study:` tags in `linked_obs_ids`, no column — `snag/toolLink`), the tile counts it, *Problems raised here* lists it, the tool's paper prints it; linked or unlinked from either end with Undo; the problem's editor, panel, row, report and card say *Raised from …*. `tool-problems.mjs`.
- **One active client everywhere (11 November, `docs/CONSULTANT-WORKSPACE.md` C1).** Rowland: *"move between these businesses without
  losing context or mixing their information"*. `lib/activeClient` is the one source of the client the app shows (the device's
  `faultline.client`, the Lines tab's key); with two or more clients named on the lines the top bar says it (`ui/ClientSwitch`,
  *Branston ▾* — each client and All clients) and Today, Problems, Actions and its paper, Projects, the control room and its paper,
  the Tools counts and every tool's list, the bell, search, Go to ▾, Machines, the Story and Luna's context follow it; All clients names
  whose each row is; a page of another client's line or project moves the bar to that client. With one client nothing changes but the
  greeting (*Good morning, Rowland* once Your brand names him). No database change. `scripts/acceptance/active-client.mjs`.
- **Customers — added, archived, continued (11 November, C2a).** A customer is added by name before any line (Set up › Customers, or the
  top bar's ＋ A new customer…) and made the active client; a line or department made under it takes its name; **Archive** hides it and
  everything under it everywhere (Luna's lookups too) with nothing deleted or changed, **Continue** brings it back as it was. The anchor
  is the customer's Story record (`agreed.story.archivedAt`, `site`) — no migration. `scripts/acceptance/customers.mjs`.
- **Visits and the consultant's home (11 November, C3).** *Start a visit* (the home's primary, the client menu, the Story's More ▾): a
  customer — one of yours or ＋ a new one by name — a site if known and what you were asked at the door; the top bar says *Business B ·
  Visit 11 Nov ▾* (open it, End the visit). A visit is an entry on the customer's Story record (`facts.visits`, merged by id) — no
  migration; what was captured on it is READ from the customer's lines in its hours (`lib/visits visitRecords`), never copied. A
  customer with no line yet gets a holding place on the first ＋ Problem (*Business B — not yet placed*, type *Not yet placed*), and the
  problem is placed on its line later with a tap. `#/visit/:id` lists the day's problems with their money, photos, measurements and
  talks; *Make the visit report* is the client-facing paper (`lib/report/visitPaper`), kept under Saved copies. With more than one
  customer `#/` is **your home** — your customers as rows, what is owed across them, recent visits — and `#/story` the Story of the client
  you are in. `scripts/acceptance/visits.mjs`, `src/lib/__tests__/visits.test.ts`.
- **The library (11 November, C4).** Rowland: *"Where is my overall library of work? … I don't want reports disappearing into individual
  projects … distinguish between my own internal working documents and finished client-facing reports"*. Every PDF made is now a
  synced record (`kept_papers`, IndexedDB v22, `src/db/rows` KeptPaperRow, `cloud/mappers` kept_papers — its PDF in the `media` bucket)
  carrying its line, project, record, **customer**, **kind** (read from the page — `lib/library` paperKindOf) and **audience**
  (client-facing for the Story, visit, line, area and project reports; internal for everything else — changeable). **#/library**
  (`screens/LibraryScreen`, reached from Factory reports at the rail's foot and every Saved copies sheet — nothing added to the menu):
  Papers (newest first, the active customer's or every customer's naming whose; search, and in a fold who it is for and what paper;
  ⋯ Download · Mark client-facing/internal · Rename · Take off with Undo), Photos (the customer's tool attachments, problem photos and
  walk photographs, each opening its record) and Working records (the customer's studies and documents). Copies kept on a device
  before it are offered once (*Keep these 12 copies in your library?*). **`supabase/KEPT_PAPERS.sql` is written, NOT yet applied**
  (the table, its rev, RLS as a study's — maker, line members, project members, a client read-only — and the media rule widened by
  one clause): until it is, the kind waits (`isMissingTable`) and every paper stays on its device as before.
  `scripts/acceptance/library.mjs`.
- **My templates (11 November, C5).** A document, a check log's list or a custom capture sheet is saved as the consultant's OWN template
  (More ▾ › *Save as my template* — the words written kept, or only the structure; names, dates, figures, photos and results never) and
  offered first on that kind's New sheet at any customer (*Start from*), the line the active customer's by default; **My templates**
  (`#/templates`, from the Tools page's last fold and the account menu) lists them with Start one from it, Change and Take off (Undo).
  Stored as a study of the same tool on no line and in no project with `facts.template` — the cloud's "own studies" policy keeps it the
  consultant's and syncs it to their devices; **no migration**. Every list, count, report, search, the Story and Luna's reads leave it
  out (`db/studies listAllStudies`); `listTemplates` is the one reader. Luna: `list_templates`, `start_from_template` (a card) — the
  gateway copy synced, **not deployed** (`deploy_edge_function` of `assist` needed for Luna to call them). `scripts/acceptance/templates.mjs`.
- **Luna knows the customer and the visit (11 November, C6).** Each turn tells her the client the person is in and the visit in hand
  (customer, site, day, brief). Four capabilities (`src/capabilities/visits`): `start_visit` (one card — a new customer by name and its
  visit, the brief in the person's words), `end_visit` (a card), `visit_state` (read — what was captured on the visit, that customer's
  records only), `switch_client` (no card — *"I'm back at Branston"*). The gateway's copy of the schemas and instructions is synced
  (`scripts/sync-assist.mjs`) — **the `assist` function needs deploying** for the gateway to accept the four.
  `scripts/acceptance/luna-visits.mjs`, `src/capabilities/__tests__/visits.test.ts`.

- **The model for each AI task (9 November).** Rowland: *"we want quality output but lowest cost"*. Each task of the `assist`
  gateway has its own model setting (`supabase/functions/assist/index.ts`, the top): Line Talk (`ASSIST_TALK_MODEL`), the Story
  (`ASSIST_STORY_MODEL`), a brief read from a photo (`ASSIST_BRIEF_READ_MODEL`) and a factory document (`ASSIST_FACTORY_READ_MODEL`) on
  **Claude Sonnet 5.5** ($2 / $10 a million tokens); a brief split into asks (`ASSIST_BRIEF_ASKS_MODEL`) and video labels
  (`ASSIST_MODEL`) on **Claude Haiku 5.5** ($0.10 / $0.50); AI Mode's colleague (`ASSIST_COLLEAGUE_MODEL`) on **Claude Opus 5.5**
  ($4 / $20) until Sonnet is proved on it. A Haiku call sends no refusal fallback (Haiku takes none). The cost of each is on the
  AI usage page (`#/ai/usage`) by task; a task whose words fall short is raised by its setting, no code change.
- **Conversational data (10 November, `docs/CONVERSATIONAL-DATA.md`).** Rowland: *"I should be able to talk to Luna about a factory, a production problem, a test, an experiment or a set of figures … request graphs, build reports and change direction naturally."* A file is a record of its own (`source`, `supabase/SOURCES.sql` applied and read back): its name (the person's, or Luna's suggestion said so), original filename, when, what it holds, what it is about — two that could be meant are asked between, never the newest picked (the workbook capabilities' silent default removed). The line's stops, program trials, a study's readings and the problems are asked as tables (`lib/data/table`, the workbook query's semantics; not recorded never zero; a field not held answered "cannot be said" with what is held). Results are kept on the conversation; charts are drawn from them by code with versions (percentages, left out, only, top n, target, compare, back to the original) and PNG/SVG; reports and presentations are built section by section — a finding names its results, a figure none holds is marked Check this, a recommendation is a view — and download as PDF (kept under Saved copies) and slides. Proved by `src/lib/data/__tests__/data.test.ts`, `src/capabilities/__tests__/data.test.ts` and `scripts/acceptance/conversational-data.mjs`.
- **The factory walk and the camera (10 November, `docs/FACTORY-WALK.md`).** Rowland: *"I move around the factory, Luna moves with me."* A **department** is a record of its own (`lib/departments`, a study of tool `department`, `supabase/DEPARTMENT.sql` applied and read back) — Dispatch with no line is listed on the Lines tab, has its page (DEPARTMENT, *No lines in it yet*), is added by hand (**＋ A department**) or by Luna (`add_department`, a card), and onboarding makes an area said with no line into one; nothing is made under it. In AI Mode, **where you are** (`set_position`, no card) is kept apart from the subject — a move never changes the thread, the open thread there is offered; the trail is the walk (`walk_state`). The composer's **camera** is the app's own live camera (pictures only); every photo is stamped with where and when. **`file_photo`** (a card) links the one photograph to a line, a machine, a department, a problem or a project — never a copy, never a guess; *Photos from walks* on the line, machine and department pages read only those confirmed links (`ui/WalkPhotos`). Proved by `walk.test.ts` and `scripts/acceptance/factory-walk.mjs`.
- **Luna does not hear herself (10 November).** The phone's own microphone (Android: *Headset earpiece*) is no longer taken for a headset, so on the speaker the microphone is closed while she speaks; her words heard back while she speaks or just after are checked against everything she said lately and cut from the recogniser; the microphone reopens 600 ms after she stops (`docs/VOICE.md`, Luna does not hear herself).
- **Luna in the workspace, W1–W7 (10 November, docs/LUNA-WORKSPACE.md — Rowland: *"one coherent Faultline application, with Luna available wherever the user is working"*).** W1 her runtime mounted once beside the router (`colleague/LunaHost`) and moved between slots, never remounted — answers in flight, waiting cards, voice and measurements survive navigation; W2 her panel beside any page (`colleague/lunaPanel`, a 420 px column on a desk, a sheet with a foot bar on a phone), a chip opening the page as the work; W3 receipts for capture steps inside an investigation the person agreed with **Work within** (`capabilities/scope` — kept on the conversation's own `agreed` list, Stop in the panel; everything consequential still a card) and *Luna changed* on the page; W4 the case bar and file on a project's or line's pages (`colleague/CaseFile`, Continue with Luna); W5 her answers on a method's sheet marked until kept (`colleague/lunaAnswers`, LunaMark); W6 the voice bar over any page (VoiceMode `bar`, Full screen kept); W7 **Today** at `#/today`, first in the menu — the briefing worked out by code (`lib/today` from the Actions page's rows and the register), Luna's box, the lines in words, carry on, projects by method; AI Mode off shows it whole without the box. Closed, Manual Mode is exactly as before. Proved by `luna-persist`, `luna-panel`, `luna-scope`, `luna-case`, `luna-draft`, `luna-voice-bar`, `today`. The `#/` home stays the Story until Rowland says (U5). **The gateway is version 31 (10 November)** — `work_within` and its instructions deployed from the repo and read back: rules `6ef40eb81a3edc5c`, colleague `d47b1308210bfcc0` (equal to the repo's), a call with no person refused (401). Also live the same evening: the Lines tab with the areas and lines first (each area its own card), the Story home's welcome with four doors (the lines, Today, Projects, Ask Luna), and Luna's voice a woman's when none is chosen (`colleague/voice` pickVoice).
- **The bagger investigation exam (10 November, docs/LUNA-EXAM.md)** — thirteen turns of a real investigation said to the live Luna (the deployed gateway, the same loop, capabilities and turn rules as AI Mode — `colleague/turnRules`, lifted out of AI Mode so the two cannot differ), on two practice lines of its own, every turn marked by code; on `#/ai/exam`, run by Rowland. Building it found and fixed two real faults: a finished stop corrected was lost (now put right in place), and pence said were not read as pounds. **Not yet run against the live Luna** — that score is the next measure.
- **Luna, the next evolution (10 November, docs/LUNA-NEXT.md)** — L1 every figure in a chat answer checked on the device against what Faultline worked out in it (to the rounding written; ids never lend digits), marked in her words and counted under the answer, `work_out` for her arithmetic; L2 `explain_change` (what changed and where, the next field down); L3 the notebook of what a client's words mean (`note_meaning`, `notebook`, `forget_meaning`; `NOTEBOOK.sql` applied and read back); L4 `join_results`; L5 a chart's finding drawn on it, `refresh_report` and `earlier_reports`; L6 the exam — the engine exam in vitest, the live exam at `#/ai/exam` (run by the person, writes nothing). The interface evolution is proposed, not built: docs/LUNA-FIRST.md (U1–U6 wait for Rowland's word).
- **The gateway is version 30 (10 November)** — Luna's next evolution (docs/LUNA-NEXT.md): explain_change, join_results, work_out, the notebook (note_meaning, notebook, forget_meaning), refresh_report and earlier_reports in the schemas, and her rules (every figure checked, think like an analyst, their words); read back: rules `6ef40eb81a3edc5c`, colleague `5ef9b8b7589c878f`, a call with no person refused (401). Deployed with the app that runs them (b07ed09f).
- **The gateway is version 29 (10 November)** — the whole workbook understood: workbook_profile's map of every sheet and the connections found from shared values, query_workbook's lookups (a value from another sheet by what a row holds) and calcs (a row sum), the instructions to say what each sheet is and which an answer used; read back: rules `6ef40eb81a3edc5c`, colleague `f11bf001e2426230`, a call with no person refused (401). Deployed after the app that reads lookups was live (5d9a9904), so a lookup was never asked of an app that would drop it.
- **Vercel builds main only (10 November).** A release sat queued for 11 minutes: the project builds one deployment at a time, every push to the working branch made a preview build of the same commit seconds before main's, and each build runs the whole check (`npm run build`: the schema check, tsc, eslint, all of vitest, then vite — about 10 minutes). `vercel.json` `ignoreCommand` now skips every branch but main, so a release never waits behind a preview nobody opens; the gate on this machine is what proves a branch.
- **The gateway is version 28 (10 November)** — the factory walk (set_position, walk_state, file_photo, add_department) and conversational data (list_sources, resolve_source, name_source, source_fields, query_data, make_chart, refine_chart, build_report, outputs_state) and their instructions, deployed from the repo and read back: rules `6ef40eb81a3edc5c`, colleague `6168903d38bfa3a1`, a call with no person refused (401). The check from the database now needs the anon key as a Bearer header beside `x-check-key` (verify_jwt is on). Deployed by a fresh helper agent: the 11 files (~290 KB) are pasted whole into one deploy call, too large for a long session — a Supabase access token saved in the environment would let a deploy go straight from disk. The ＋ menu's third item is now **A file or spreadsheet** (Excel or CSV figures to ask about, or a factory document) — Rowland: *"I can't see in Luna upload excel files"* — the same file picker, its types widened so a phone offers .xlsx. Each earlier conversation has **⋯ Open · Rename · Delete** (Rowland: *"earlier conversations can't delete them, need options"*) — the person's name wins over the subject's (`facts.named`), Delete is asked first and offered back with Undo, and what the conversation made stays where it is (`ai-mode.mjs` step 4).
- **Calm by design (10 November, permanent — `docs/DESIGN.md`).** Rowland: *"Faultline … should feel remarkably simple to use. The complexity should exist underneath the interface."* Live: the Factory (lines first, the control room in one fold), a line's page (tiles, Carry on into each record, problems, machines, the rest in *More about this line*), a tool's list (Carry on first), the Tools library (one list, the rest in folds) and a tool's page, a method project (the section in hand open), tool records (reliability's and SMED's deeper readings folded; an empty plan or notes one line), the project pages (Tools in use first, Results' readings, the 6M board's filters and Now's days ahead folded; Actions and Projects as hairline rows). Nothing removed — PAGES.md says where each fold is. Measured by `scripts/calm.mjs`: no page busier, 50 calmer, the baseline lowered. Then (11 November) the method boards above a method project's sections — DMAIC's phases, the A3's blocks, PDCA's quarters, the Kaizen event's days and check, the Kata's cells and experiments, the five focusing steps, the 8D's parts — each opening on the step in hand, the rest one line in `ui/Fold` (`shapes/BoardFold`, `method-boards-calm.mjs`; boards 40–80% shorter, the DMAIC page 5,315 → 4,064 px at a desk). Not yet: the video study (folding its claims made its reading count a duplicate event — reverted, cause unknown), the 8D report.
- **Luna (10 November, permanent).** The AI colleague is called Luna — Faultline is the system, Luna its AI colleague: her identity in the system instructions Claude is sent for AI Mode and Line Talk (`luna.test.ts`; the gateway's check returns a `colleague` fingerprint), *Ask Luna* and her name on the AI Mode, voice and Line Talk screens, the voice unchanged (`docs/AI-MODE.md`, Luna).
- **Workbooks in the conversation (10 November).** Rowland: *"Attach an Excel workbook to the conversation and start talking to Faultline about the business information inside it."* `docs/WORKBOOKS.md`: an .xlsx of any size attached through AI Mode's own attach control is read **on the device** in a background worker (`src/lib/workbook` — the zip read from its end, ZIP64 too, each part inflated and scanned as it streams into a column store in the browser's private file storage), never uploaded and never sent to the model; its profile (header found, column types, blanks, words in number columns, formulas with no saved value, errors, repeated rows, a name written two ways, hidden sheets and columns, tables, names, links between sheets, what is not read — pivot caches, external links, connections, a data model, macros) and every question worked over every row by code with its source cells (`workbook_profile`, `query_workbook`, `workbook_rows`). Follow-ups on the device that read it; another device is told to attach it there. Measured in `docs/WORKBOOKS.md`. `workbook.test.ts` (both), `scripts/acceptance/workbook.mjs`.
- **The tool intelligence layer (10 November).** Rowland: *"The AI must understand what each tool does, what it needs, how evidence can be obtained, what can be done conversationally and what still requires the user."* `docs/AI-TOOL-INTELLIGENCE.md`: a definition for every tool (`src/capabilities/intel/tools.ts`, 35, held to the code by `intel.test.ts`) — purpose and what it cannot answer, when and what instead, inputs and their routes (supported · unavailable · future), how much is enough, and each OPERATION's level (1 by conversation · 2 with evidence · 3 with the person on the page · 4 not supported); `tool_intel`, `assess_evidence`, `pareto` (timed, typed, counted, imported and said kept apart; frequency never passed off as time; how sure and what more; conflicts; lines; periods), `import_table` (a downtime CSV or Excel read in code as imported), `hand_over` and `handover_state` (*Over to you* in AI Mode's panel, read back, never assumed); `imported` and `estimated` as kinds of evidence. `pareto.test.ts` (the ten scenarios), `scripts/acceptance/ai-pareto.mjs`.
- **The task-led application (10 November).** Rowland: *"The user describes the work. Faultline works out how to support it."* `docs/AI-TASK.md`: `understand_task` (the person's words read as a task — *lost production time* added to the floor's words — its route in the method's order, each step known · old · not done from the line's own records, ONE next step with its reason, never a menu), `keep_task` (the task on the subject, its goal the aim and title), `task_state` (progress read from the records, what was done since the task began, the next step); `plan_work` recommends instead of asking which tool; *The task* in AI Mode's context panel, read live; the colleague told THE TASK LEADS. `src/capabilities/task.ts`, `task.test.ts`, `scripts/acceptance/ai-task.mjs`.
- **AI Mode operates the application — the tool connectors (10 November).** Rowland: *"I want to be able to talk to Faultline about an operational problem and have it intelligently use the entire application to do the work with me"*; his decisions: Line Talk's documents and diagrams brought into AI Mode (one colleague), a live measurement confirmed once. `docs/AI-OPERATING.md`: a connector for every tool (`src/capabilities/connectors` — describe · fill · capture · read · report, each the tool's own code), the six kinds of work said apart (report · fill · measure · calculate · analyse · investigate), fifteen capabilities (`src/capabilities/operate.ts`: tool_guide, read_record, run_analysis, show_work, make_report, write_document, draw_diagram, add_readings, start/capture/undo/correct/end_measurement, measurement_state, plan_investigation), live capture for Stops timed, Reliability, Work sampling, SMED and Stops across workstations (`connectors/measure.ts`), the real page shown in AI Mode's work pane (`lib/pane`, the data signal across windows in `db/core`), every study's paper made on arrival (`?save=1` through StudyBand), a made draft filled straight into its record, Line Talk's Make it and AI Mode's draw_diagram one module (`tools/talk/diagramRecord`). `operate.test.ts`, `scripts/acceptance/ai-operate.mjs`. **Then every tool filled** (`src/capabilities/fill.ts`, AI-OPERATING §2a): start_study (capability, chart, analysis, loss count, holds, any scored register, the board, line standard, Line capacity, Line balance), add_readings of every shape, count_shift, fill_register, raise/decide_hold, record_check, time_elements, set_capacity, place_people, add_cause, fishbone_state, add_journey_step, answer_method; the Line balance's stopwatch a sixth capture; **confirm once a record** (a write into a record said yes to runs with no card); at a desk the work pane keeps the context and puts the list behind its button. **One investigation end to end** (§10): `fill.test.ts`, `scripts/acceptance/ai-investigate.mjs`.
- **Voice — dictation and the two-way voice conversation (9 November).** Rowland: *"evolve the existing assistant into a natural, immersive, two-way voice experience"*. `docs/VOICE.md` (the decision: the web app over Chrome's own recognition and the phone's own voice — a native Android bridge only if his phone shows it is needed, the four seams it would plug into). Dictation's Cancel and Done; the box's **Voice** button opening `colleague/VoiceMode` — the same conversation through the same Send with `spoken: true` (the gateway's SPOKEN_NOTE), the end of a turn found by `turnEnd` (a thinking pause waited out), the reply said sentence by sentence (`nextChunks`, the voice's queue), interrupt at once, talk-over with a headset with its own echo ignored, the states moved by real events (`voiceStep`), the orb, settings kept on the device (`colleague/voicePrefs`). `speech.test.ts`, `scripts/acceptance/voice.mjs`. The gateway is version 24 (9 November), deployed from the repo with `spoken` and SPOKEN_NOTE, the AI-context rules and the five capabilities, and read back (a call with no person refused, 401). Needs Rowland's Samsung for how it hears, sounds and routes to his headset.
- **The colleague understands Faultline (9 November).** Rowland: *"an intelligent manufacturing colleague that understands the application it operates within, understands the user's intentions and knows how to connect conversational work to the correct application records"*. `docs/AI-CONTEXT.md`: the record kinds and their relations by field and the floor's words for kinds of work (`src/capabilities/appModel.ts`); five capabilities (`src/capabilities/understand.ts`) — `describe_faultline` (the app read live, each capability with this person's access), `plan_work` (the kind of work, what is known and exists, one question), `resolve_record` (areas, lines, machines, projects, problems, tool records; "that one", "yesterday's"; never another client), `update_context` (aim; just talk · standalone · in a project; corrections move the drafts), `link_to_project` (a card; same line only); duplicate checks on start_draft, make_record, start_project and raise_problem; the destination said on the card; the subject's aim, mode and points in the focus and the context panel; the gateway's rules. `understand.test.ts`, `scripts/acceptance/ai-context.mjs` (the twelve journeys).
- **AI Mode as a chat (9 November).** Rowland: *"When I click the AI, I would expect … a user interface much like I have with you. So wide open text screen, and then … add a picture, add a document at the bottom … much like WhatsApp"*. Presentation only — no capability, record or gateway change: the box one rounded card at the foot (the words grow as typed; **＋** a menu — Take a photo, Photos, A factory document; a photo; the microphone; a round Send), the empty conversation a greeting by name over three example cards, the turns centred and wider, at a desk **Hide context** for a wide page (kept on this device), on a phone the conversation the whole screen — the menu's bar gives way as a chat's does, the way out the top bar's Back. `ai-mode.mjs` step 6, `structure.mjs` (the AI page's phone bar exempted, said why).
- **Back, to where you were (9 November, live).** Rowland: *"never send you back to where you was .. instead of the classic back"*. The top bar's **Back** walks this session's own trail of pages (`state/navHistory`) as a browser's Back does — shown only when there is somewhere to go back to; ‹ Factory / ‹ Projects still go up; on a phone the arrow alone, the up crumb giving way, the bar fitting 375 px. `scripts/acceptance/back.mjs`.
- **The brief uploaded from Start the story (9 November, live).** *Upload a brief* beside Start the story: the file starts the story and goes to the brief's own reader. `story-brief.mjs` step 11.
- **Areas on the Factory, and the area report (9 November, live).** Rowland: *"we now have areas
  in set up. So on factory page we need area.. then each area will have lines in them we need area reports show everything
  happening in the area"*. An area is a group of the factory's lines by the words on them (`lib/areas` — no record, no database
  change, never a fourth scope). The Lines tab (`#/room`) is an area a section — its sentence, *Open the area ›*, *Area report* —
  with *No area yet* for the rest; the area's page `#/area?site=…&area=…` (Factory › site › area, the Lines tab lit) says it in a
  sentence and tiles, its lines as the board's cards, what needs doing and the programs to prove across its lines (each row naming
  its line and opening its record, live), its projects, the tools used, its machines line by line; **Report ▾ › Area report**
  (`#/area/report`, made on arrival) is the line report's parts one after another — a dual line once — then *The area together*
  (`src/line/report/areaBundle`, `areaBundlePdf`, `AreaReportScreen`; `scripts/acceptance/areas.mjs`).
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

- **The tools' workspaces T5–T7 (8 November).** The value stream map and the line balance in one order (figures, the picture, What
  it says); a check log's *last four weeks* as a calendar beside the round (`tools/checks/calendar`); a document's reading *As it
  reads*, a lifted page held in view beside the boxes. With T1–T4 every family of tool now has its workspace (docs/TOOLS-DESIGN.md §4).

- **The Story (8 November, docs/STORY.md S2).** Rowland: *"the story so far is a continuous journey … I run an update and it pulls it all
  into a beautiful report … you take the wheel and design everything for me."* One record a client (`tool: 'story'`, `supabase/STORY.sql`
  applied and read back): the brief, and a chapter each Run an update — the snapshot frozen from the Factory page's own readers
  (`lib/useFactoryRead`, shared with the four questions), what changed since by the records' ids, the words assembled from the modules'
  sentences and his to edit, a stray figure marked *Check this*, approved and printed (`lib/report/storyPaper`, the cover with who it is
  for and who prepared it). The Story was a tab on the Factory at `#/story` until S5 made it the home (below). **S3 (8 November):** Run an update asks the assistant — Claude
  through the `assist` gateway, task `story` (deployed, version 19; the rules shared by `scripts/sync-assist.mjs` from `tools/story/storyAssist`)
  — for the headline and paragraphs; the assembled draft shows first and is kept when the assistant refuses, is off or has no signal; a
  figure not in the snapshot is marked *Check this*; 20 chapters a day the allowance; an AI toolbox card says it. **S4 (8 November):**
  the chapter as slides (`lib/report/storyDeck`, pptxgenjs, eight 16:9 slides from the same snapshot), from Report ▾ and on each chapter,
  kept under Saved copies. S5 is built (below).

- **Home is the Story (8 November, docs/STORY.md S5).** Rowland: *"we also need to change the factory page.. we need a page for me
  possibly the story page … you take the wheel and design everything for me."* `#/` renders the Story (`screens/StoryScreen`; `#/story`
  stays as an alias) — the consultant's page opened in front of the client is the home. The board of lines (`screens/WorkspaceHome` —
  the line cards, Needs you now, what's going wrong, the client · site · area groups, the chips) is unchanged and is the Factory's
  **Lines** tab at `#/room`; the Factory's tabs are Story · Lines · Set up and the menu's *Factory* goes to `#/`. **Present**
  (`#/?present=1`) is the Story full screen with no frame — the four figures large, the latest chapter readable across a room — Escape
  or × back to `#/`. With no story yet the page offers *Start the story* and *See the lines ›*. Proved by the smoke, the inventory,
  the journeys, structure and `story.mjs`; PAGES.md's home rows say it.

- **The one-product Line capacity paper is one page again (8 November).** The drawn line's bars (4 November) had put every station's speed on the paper three times — the drawn line, the V and the capacity sheet — and the ordinary seed's product ran to two pages (red in `report-stress` on `main` since). `drawCapacityPaper` now tries the paper's forms in order (full · without the sheet and the V · without the three numbers · without both) and takes the first that fits a page, the fullest otherwise (`CapacityPaper.noSheet`); the words are unchanged. Three acceptance scripts caught up with shipped changes: the factory's three tabs (`structure`, `front-door`, the inventory), the K1 boxes on a line's row (`factory`), the V's navy bottleneck (`line-capacity`).

- **Your brand on every paper (8 November, docs/STORY.md S1).** Rowland: *"is the first page our app name and business name and name of
  consultant"*. The account menu's *Your brand* — name, business, strapline, contact line, logo (`ui/BrandSheet`), kept on the profile
  (`supabase/BRAND.sql`: `profiles.brand`, written through `set_my_brand`, applied and read back) and cached on the device (`lib/brand`);
  every paper's foot says *Rowland Glew · Streamline Synergy* (`reportKit stampBrand`); the line's full package cover says who it is for
  and who prepared it (`lib/report/cover`). The Story — the client's continuous journey, S2–S5 — is designed in `docs/STORY.md`.

- **Client, site and area on the lines (8 November, docs/CONSULTANT.md K1).** Faultline is Rowland's consultant's tool; the factory is
  the client's. Each line says its client, site and area (`supabase/CLIENT_SITE_AREA.sql`, applied and read back — three text columns
  on `workspaces`, words like its type, no new record), typed on Set up the lines and on a line's own Set up, the boxes offering the
  words already used; the Factory page is titled by the client when every line is one client's, shows the lines under their
  *site › area*, and with two clients offers *Every client* and each (kept on this device). Next, when he asks: K2 the engagement.

- **AI Mode — the colleague (8 November, docs/AI-MODE.md).** Rowland: *"We are building intelligence around the application I
  have, not building another application around the intelligence"*; then the mandate, *"Take the wheel … Two modes … Manual Mode …
  AI Mode … Both modes must use the same underlying records, business logic, permissions and capabilities."* Built in this
  session's slices: **two modes over one application** — Manual Mode the app as it was, AI Mode at `#/ai` (`screens/AiModeScreen`,
  `src/colleague/`), a conversation typed or spoken in which Claude operates the app only through **capabilities**
  (`src/capabilities/` — `registry.ts` runCall: validate → the person's access → a write only when confirmed → run; `schemas.ts`
  the tool definitions; reads `find`, `line_state`, `list_problems`, `overdue_actions`, `project_state`, `story_state`,
  `list_calculators`, `run_calculator`, `tool_records`; locals `set_focus`, `park_focus`, `record_observation`, `start_timer`,
  `open_page`; writes `raise_problem`, `update_problem`, `start_project`, `save_calculation`, `add_photo_to_problem`). The gateway's
  task `colleague` (signed in, 120 calls a day, every call checked against the schemas, an audit row in `ai_actions` —
  `supabase/AI_ACTIONS.sql`, additive); the conversation a `talk` study with `facts.colleague`, its threads (current · parked ·
  closed, every note saying how it is known, verified only by a person) and its actions. The AI never deletes, never marks
  evidence verified, never works out a figure and never builds methods, templates or tools. Voice is the phone's own, in and out.
  The Story's brief uploaded and split into asks (S6–S7, tasks `brief-read` and `brief-asks`) beside it. Proved by
  `scripts/acceptance/ai-mode.mjs` and `story-brief.mjs`. Off by the device's switch or `ASSIST_COLLEAGUE_ENABLED` on the server.
- **AI Mode's memory — phase 5a (8 November, docs/AI-MODE.md §9).** *Personal*: **How I work** — the person's words, methods,
  report style and anything to always remember, four boxes of at most 1,900 characters in all, kept on the profile
  (`supabase/PREFERENCES.sql` — `profiles.preferences` and `set_my_preferences`; applied and read back 8 November) and cached on the
  device (`lib/preferences`); the sheet `ui/PreferencesSheet` from the account menu and AI Mode's More ▾; sent with every question
  and placed by the gateway beside the threads (`colleagueAssist` readColleagueAsk / colleagueMessages — the gateway is version 21, 9 November); the write capability `remember_preference` adds a line when the person says yes to its card. *Project*: the read
  capability `recall` searches earlier AI Mode and Line Talk conversations in code, best and newest first, never across clients.
  *Technical*: `knowledge/` and the calculators. Recording is not training. Unit tests: `src/lib/__tests__/preferences.test.ts`,
  `src/capabilities/__tests__/memory.test.ts`, the gateway's and the loop's.
- **Building tools in conversation — A populate · B adapt · C create (8–9 November, docs/AI-MODE.md; DIRECTION.md rule 5).**
  Rowland: *"The conversation itself should become the mechanism through which the application is populated."* A draft on the AI
  Mode conversation (`facts.drafts`) fills a tool from what is said — every calculator, document, check log, the box-ranked registers
  and SMED — its fields read from the tool's own definition, each value with how it is known and the earlier value kept when
  corrected; *Being built* in the context panel says what is captured and what is missing; `adapt_draft` adds fields to that record
  only; `create_sheet` makes a custom sheet (a `doc` record with its structure in `facts.customDef`, metrics worked by code — sum,
  average, ratio, difference, count); `make_record` (confirmed) makes it through each tool's own New (`newCalcStudy`,
  `newChangeoverStudy`, `newDocStudy`, `newScoredStudy`, `newLogStudy`), so Manual Mode opens and edits it. Proved by
  `scripts/acceptance/ai-build.mjs` (Rowland's 42 → 25 minute changeover conversation becoming a SMED study).
- **Factory knowledge F1–F2 (8–9 November, docs/FACTORY-KNOWLEDGE.md).** Rowland: *"Faultline must understand the factory it is
  working in."* A machine's kind, model and serial, each with how it is known (`supabase/MACHINE_KNOWLEDGE.sql` on
  `commission_assets` and `workspaces.known`, applied and read back), shown and edited on the machine's page and printed on its
  report; the capabilities `factory_map` and `resolve` and the gateway's rule *never assume* — one match used, several asked, none
  said not known.
- **Factory knowledge F3–F5 (9 November, docs/FACTORY-KNOWLEDGE.md §6¾) — built on branch `factory-f345`, not merged yet.** Rowland:
  *"We're onboarding a new customer … let's start with packaging"*; *"Document upload … trace extracted information back to its
  source"*; *"That machine has now been replaced … never rely on outdated documentation without checking"*. A **factory draft** on the
  AI Mode conversation (`facts.drafts`, kind `factory`) holds the client's sites › areas › lines › machines as said
  (`add_to_factory_draft`, local) or read from a document, each value reported with the words or from its document with the exact
  quote; *Being built* shows the tree, what is new against what Faultline holds for that client only (matched, never doubled), a
  value that differs from the recorded one side by side with a pick, a document older than a recorded change flagged; `make_record`
  makes the lines through `addLineToFactory` (client · site · area words, how known) and the machines through `machineOntoLine` and
  `setMachineIdentity`. A document uploaded in AI Mode (the box's document button) is kept as a **factory source** (the custom-sheet
  shape of a `doc` record, its file as media, its words, what was taken from it); a CSV register is read by rules in code, a PDF / Word
  / text file's words in code and asked of the gateway's new task **`factory-read`**, a photo or scan read by it — every quote checked
  against the words on the server and again on the device; an .xlsx is refused in words (no spreadsheet reader in the app — save as
  CSV). `replace_machine` (write, confirmed) puts the new machine in the old one's place on the line and keeps the old record with
  `replaced_by`. No database change. The gateway carries the `factory-read` task, the colleague's new rules and two capabilities
  (deployed; since 10 November it is version 27 — the operating capabilities, every fill capability, the value stream walk, the task-led capabilities, the tool intelligence, the workbook capabilities and Luna's identity in AI Mode's and Line Talk's instructions; read back: a call with no person refused, 401, and both fingerprints equal to the repo's — Line Talk's rules 6ef40eb81a3edc5c, AI Mode's instructions and capabilities 4cdedb41e0d384ac). Proved by
  `scripts/acceptance/factory-onboarding.mjs` (Customer X Foods onboarded, a register read, a bagger replaced).
- **Voice on the floor — phase 4 (8 November, docs/AI-MODE.md §7).** The phone's own microphone first (no headset needed): the screen
  kept on, Listening… and Speaking… said, a card answered by "yes, do it" / "not now" in code, *Before you walk the floor* checks the
  phone; a headset's button works where the phone passes it on. What needs a real phone to prove is listed in §7.
- **How AI Mode is used — learning and cost (8 November, phase 5b, docs/AI-MODE.md §9).** Rowland: *"we learn what was done and we
  actually want to replicate it with code as much as possible — this keeps AI costs lower"*; *"nothing should automatically become
  production code"*. `#/ai/usage` (`screens/AiUsageScreen`, from AI Mode's More ▾ and a link under the AI toolbox on Tools) reads the
  person's own `assist_usage` and `ai_actions` rows (no new table, nothing written): the last 30 days' answers and cost by task and
  by day, an answer's cost, a colleague request's only where the device holds the requests (said as at most), today against each
  allowance; dollars as the gateway prices them, pounds only when `VITE_USD_TO_GBP` is set. Then what the colleague did (proposed ·
  done · declined · failed · refused, the share of writes accepted, the refused calls) and **candidates for code**
  (`src/colleague/learning` — the same steps, calculator or question three times or more, a write mostly declined), each with its
  evidence, a native home and Copy as a note — proposals only. Unit-tested (`colleague/__tests__/learning`, `usage`); in the
  inventory; no browser acceptance script yet (the seed has no cloud — signed out, the page says so in a line).
- **The AI toolbox (8 November).** Rowland: *"Go ahead with a AI toolbox"*. Tools has a shelf of its own — every place a model is used
  (Line Talk; talking a process flow chart, spaghetti diagram or value stream in; the video study's Name the work from the frames; the
  voice note in a form), each saying what it does, what it sends and to whom, and what it never does; those tools wear an AI mark on
  their cards and own pages (`src/catalogue/aiTools`, `scripts/acceptance/ai-toolbox.mjs`). The tools that link (docs/AI-TOOLBOX.md §2)
  wait for his choice.

- **Every tool in plain English, and four calculators out as tools (8 November).** Rowland: *"the tool needs enough information, as in
  description, next to it, for the user to understand this tool will help me do this. In plain English"*; *"calculators in there that
  are obviously hidden that's not the purpose"*. Each tool's line on the Tools page and its own page now starts *Use it to …*; the
  **process flow chart, spaghetti diagram, stops across workstations and micro-movements** are tools of their own (a card, a picture,
  a row on a line's Tools reading only their own records — `src/catalogue/calcTools`), still kept as calculators' records, nothing
  stored changed. 32 tools a person can open (`knowledge/SUMMARY.md`).

- **The video study's workspace (8 November).** Presentation only (`.ws-video`): each part a lifted panel, full width in its order (the
  footage, the check of it, the reading, the review, the line balance); the review's list of events scrolls inside its own box under the
  timeline at a desk, so the line balance is no longer 2,000 px down (the page 6,200 → 5,100 px at 1440); *What it says* a panel of its
  own, a row a finding with its tag. The check of the footage was tried in a side column and kept full width: its table is too wide.

- **The tools' workspaces T3–T4, first passes (8 November, docs/TOOLS-DESIGN.md).** Work sampling and SMED: the canvas first,
  What it says a panel with its dots. Every register record: *The register at a glance* — the module's own table as the `.dt` table
  (the standard's data table, first drawn here), a row jumping to its card.

- **The phone review, first pass (8 November, docs/ENTERPRISE-UX.md X8).** 450 screens audited: nothing off the side, no words
  cut, every sheet closes; small controls 199 → 86, the shared ones a thumb's height.

- **For you — the bell (8 November, the enterprise basics: notifications).** In the top bar on every page: asked once, on this
  device, which name is yours on the actions (they name people as typed); then a count of what is yours late or due by tomorrow
  (red when late) and a panel — Late, Due today or tomorrow, The rest of this week — from the Actions page's own rows, each opening
  its record. `lib/forYou`, `ui/ForYou`, `scripts/acceptance/for-you.mjs`. Pushed to a phone when closed is not built yet (the
  push channel exists for notes' reminders, `supabase/functions/remind`).

- **Who changed what on a problem — the audit trail (8 November, the enterprise basics).** `supabase/PROBLEM_HISTORY.sql`, applied
  live and read back: a table written only by a trigger on the problems (security definer, never callable by a device), the person,
  the moment and for each field a person sees what it was and became; a sync's own touch is not a change; a line's members read
  their line's, nobody writes, edits or deletes it; a failure in it never stops a problem being saved (proved in a rolled-back
  transaction). The problem panel's **History** says it in sentences (`snag/problemHistory`). Kept from 8 November 2026.

- **Search across records (7 November — the enterprise basics).** The top bar's search (⌘K) finds the factory's machines (opening
  their page on the line) and its problems by their words (opening in the panel over the page), beside the lines, projects,
  products and tools; a problem only once something is typed and only on a real match of its words (`lib/jumpTo`, `ui/JumpTo`).

- **Lists to Excel (7 November — the enterprise basics).** A line's action tracker and the Actions pages carry *— Excel* in Report ▾
  beside their paper: the same rows as a real workbook (frozen header, a filter on every column, dates as dates), by the app's own
  writer (`lib/xlsxWrite`, `lib/listXlsx`). The whole-app export (`lib/exportAll`) stays as it was.

- **Actions as a board (7 November, docs/ENTERPRISE-UX.md X4).** The factory's and a project's Actions add *Board* beside Who ·
  When · Where: four columns by when, a card an action opening its record.

- **A problem opens in the panel over the page (7 November, docs/ENTERPRISE-UX.md X3).** From a line's tracker, its Overview,
  the Factory's lists and Actions, a problem opens in the right-hand drawer — its words, status, priority, whose, due, the plan,
  the latest, what it waits for and its journey edited in place — and × puts you back; *Open the full record ›* goes to Problems.
  `src/snag/ProblemPanel.tsx`.

- **What waits for what on a line's actions (7 November — Rowland: *"build in dependencies from the gantt or the problem page,
  either one populates the other, give options to the user if both ways are allowed"*).** One link kept on the action that waits
  (`Snag.after`, carried as `after:<id>` in `linked_obs_ids` — no column); set from a tracker row's *Link* (both ways round), by
  dragging a bar's end onto another bar (which first?), or in the problem's editor; drawn as arrows on the Gantt, a day that cannot
  be kept said in amber words, a loop refused; on the tracker's paper. `src/line/actions/depends.ts`, `line-actions.mjs` step 5b.

- **X2 the line page and X5 the Problems register (7 November, docs/ENTERPRISE-UX.md).** The line's doors a row of buttons
  under its header, Spread what works and Eyes on the line side by side, the tools in use a table; the register's groups one
  bordered list with hairline rows. Presentation only.

- **The line page, simpler (10 November — Rowland: *"the line pages are difficult also, busy … Tools obvious. Continue obvious.
  Everything is too busy"*).** The Overview is the header and its doors, the four tiles, **Carry on** (the records in use on the
  line, newest first, each one tap into that record — `toolSaysOf` now also says which record, its link and when it changed),
  Problems, the machines, then **More about this line** — one `ui/Fold`, shut by default, holding Programs, Spread what works,
  Eyes on the line, Photos from walks, Tools, Logs, Projects and The line unchanged — and the closing line. Nothing removed; the
  other tabs as before. `scripts/acceptance/line-simple.mjs`; scripts that read inside the fold open it (`scripts/lib/lineMore.mjs`).

- **Reports polished and words kept off words (7 November, docs/ENTERPRISE-UX.md X7 first pass).** Every paper's band, figures,
  headings, tables, badges and closing line to an Office finish, the lean page kept; the fishbone's causes wrap to two lines and
  keep their tags off the bones; the plan's Today never on a month's name; the closing line's red mark is "!", not a cross.

- **The business, its people and who sees which lines (11 November, docs/ORGANISATION.md O1–O3) — LIVE: `ORGANISATIONS`, `ORG_PEOPLE`, `ORG_VISIBILITY` and `BUSINESS_SUMMARIES` applied 11 November and read back 12 November (one business, one member — the owner — and every line in it).**
  `organisations` and `organisation_members` synced kinds (IndexedDB v23, `src/org` — organisation, orgData, orgStore, orgRole;
  `workspaces.org_id`); Set up opens with **Your business** (name, your role, People ›); **#/business** People — invite by email with
  a role (admin · leader · manager · team · viewer) and sites/areas, change a role or scope where it sits, remove with Undo, only the
  administrator; a viewer is a client on the project ladder (`lib/access`). Database in order: `ORGANISATIONS.sql` (tables, policies,
  backfill: one business an owner, id = their user id, their lines in it), `ORG_PEOPLE.sql` (allowed_emails scope 'org', the invite
  trigger, can_start_projects), `ORG_VISIBILITY.sql` (is_ws_member widened once to the business and its scope, from PROJECT_WALK.sql's
  body; viewers' writes refused by restrictive policies on eleven line tables; late-joiner re-stamp) — proved by
  `supabase/tests/org_visibility_test.sql` (rolled back). The app must not reach `main` before ORGANISATIONS.sql is applied (a line's
  org_id would wait). `scripts/acceptance/organisation.mjs`.

- **Luna's look, Spectrum (11 November, `docs/LUNA-LOOK.md`)** — AI Mode and the voice screen on a night canvas, amber press
  colour, an aura that follows Luna's real states (listening green, thinking a turning field, speaking amber to red); the work panel
  opens only once there is work. The rest of the app follows slice by slice.

## 2. In flight and next — in this order, each waiting on Rowland's go unless said

**Production data connections — built 11 November, HELD (12 November) (`docs/DATA-CONNECTIONS.md`).** Rowland, 12 November: *"Do not
activate production data connections yet. I want to establish the business data model, product and process identities, source
traceability and validation requirements before we start feeding production data into Luna."* Read back that day: `PRODUCTION_DATA.sql`
had been applied and `ingest` deployed (version 2), with the pull scheduled every 15 minutes — no connection and no production row, so
nothing had flowed. Now held: `supabase/PAUSE_PRODUCTION_DATA.sql` pauses the scheduled pull (nothing dropped, read back `active = false`),
and `lib/production/switch` (`PRODUCTION_DATA_LIVE = false`) makes Set up › Data connections say *Not switched on yet* with no Add a
connection or file import. The ingest function stays deployed but has no connection or token to accept. Switching on is one line and
one `cron.alter_job`, on Rowland's word, after the business data model.

**LUNA — the direction from 11 November (read `CLAUDE.md`'s first section).** The product is Luna; the buyer is the manufacturing
business, every role; consultants one route in. Rowland leads the business and product decisions; the technical execution is led here
without asking. In order: **(1)** C3–C6 live (visits and the consultant's home, the library — `KEPT_PAPERS.sql` applied 11 November and
read back — my templates, Luna knowing the customer and the visit); **(2)** Luna proved with the real model (`docs/LUNA-EVAL.md`: the
gateway's check door asks the colleague; `scripts/eval/luna-real.mjs` runs the real app against the live service — run from the
*Faultline* cloud environment, which allows the Supabase host; results in §4 of that doc); **(3)** speed — streaming Luna's reply, the
tools loaded on demand, the instructions trimmed, each measured against (2); **(4)** the Luna name (`docs/LUNA-BRAND.md` R1: screens,
papers and the landing first, then Luna's own instructions once her baseline is measured; R2 the mark; R3 the domain, Rowland's call);
**(5)** the organisation (`docs/ORGANISATION.md` O1–O5); **(6)** voice on Rowland's Samsung (his test; the native bridge only if it
shows the screen-on limit is not acceptable). **Rowland's open decision:** whether businesses send production data in (a daily MES/ERP
export Luna reads) so *"why did we miss target yesterday?"* can be answered beyond what people count.


**Phone, the other scopes** (E7, 6 November — on `main`, live): at a viewport of 719px and under, Factory home, Set up, a line’s Overview, Projects and Problems stack their panels and stay inside the frame. The one thumb bar is the same. The tools gallery keeps the sideways scroll from the tools slice.

**Parallel improvement plan** (domains, agent streams, hygiene): `docs/IMPROVEMENT-ROADMAP.md` — planning only; does not replace this ordered list.

0. **The look** (`docs/LOOK.md` — L0–L7 live, 7 November; the rule in §0, *the journey is the product*, applies to every page touched from here): every page laid out on the four questions
   (what's going wrong · what needs doing · who's responsible · did it work) in look E — the Factory's greeting hero
   and four question cards first (L1), then a line (L2), a project (L3), a problem and the register (L4), the tools'
   tiles as icon cards with their change (L5), the papers' tokens (L6), the phone (L7). Each slice its own gate and
   its own merge; `docs/STATE.md` §1 says which is live (L0–L7 live — the look is built; the rule in §0 applies to every page touched from here).

0b. **Narrowed, 8 November — the look, not the machinery.** Rowland: *"It was more about the look and feel of an enterprise model rather
   than the fully loaded components ... We do not need push notifications ... user and team admin. Keep it very basic for myself right
   now. This isn't going to be a sellable product immediately. It's for myself. So I need to keep it simple and slick."* So **not built**
   (do not start them without his word): user and team admin, push notifications to a closed phone, SSO, the onboarding demo factory,
   AI as a selling point. What was built of the basics stays as it is (Excel export, search, the audit trail, the bell). **What remains is
   presentation only**: the tools' workspaces T4–T7 and the video study — **all done 8 November** (docs/TOOLS-DESIGN.md — layout, never what
   a tool does; every tool in it is already built and working); left, a light polish where a page is cluttered.

0d. **A consultant's instrument, not a floor system — 8 November.** Rowland: *"I'm a consultant that goes into factories ... only going
   to be a single use, or maybe a few people ... not people who are operating this on the ground floor."* So the catalogue's entries
   for **planning and scheduling** (FC-180–186 but the built week's schedule), **the daily boards** (FC-196, 197, 200, 203), **food
   safety** (FC-168, 173, 174, 176), **product quality** (FC-126, 127, 136, 137, 145) and the **lever tree** (FC-213, hidden, not a
   method) are *left out* with his words. **Wanted, when he says go:** ergonomics and manual handling to the HSE's own tools (FC-208
   MAC, FC-209 ART, FC-210 RULA/REBA, FC-211 pushing and pulling, FC-212 layout — with the line balance's repetitive work in mind),
   yield and mass balance by stage (FC-159–161, a process map by yield), lean flow (FC-002, 010, 011, 012) and energy (FC-226–228).
   **Maybe:** FC-029, 030, 048, 070, 219, 220, 221. **Enterprise means the look and the intelligence**: an AI toolbox of its own and
   tools that link — designed in `docs/AI-TOOLBOX.md`, waiting for his choice.

0c. **The enterprise programme — "do them all go" (Rowland, 7 November; narrowed by 0b above).** Asked whether the app is a credible global
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
4. **Video intelligence, Phase 6 — designed, not built (8 November)** — a spaghetti diagram and time and motion from a camera on a tripod: `docs/VISION.md` (on-device person tracking recommended, a floor homography, consent, retention, slices V1–V5, Rowland's decisions in §13); nothing built until he says go.
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


## 12 November — the AI budget and the first code answer

- **The month's AI ceiling** (about £20, `ASSIST_MONTHLY_USD` 25, counted from 12 November for its first month) is live in the gateway; the administrator's account menu shows what is left (`lib/aiBudget`, `ui/AiBudgetRow`, gateway task `budget`).
- **Answered in code** (`colleague/fastPath`, `AiModeScreen` answeredInCode): while stops are timed, a tap said out loud asks no AI. Only Stops timed so far; changeover, sampling, workstation stops and reliability are next. `scripts/acceptance/ai-fast.mjs`.
- **The focus (Rowland, 12 November):** he is the only user — the consultant walking the floor with a headset, in the boardroom, sending the report. The customer-as-business migration, roles, tiers and billing are parked, nothing removed; no client person is invited beyond one project or line until they are done.
- **In hand:** the review of every tool for that use (task R1). **Blocked:** the real-model demo run and usage counts — the Supabase connector needs re-authorising.

- **A visit's headline** (`lib/visitLoss`, live 12 November): the visit page and the visit report open with where the time went and what it cost, from the line's one cost model; never a rate or a week from a few hours' watching. The **what-if** (weeks of the same, with the stop-projection's range) is asked for and not built yet.
- **The first look at a workbook** (`lib/workbook/firstLook`, `scripts/acceptance/ai-first-look.mjs`): worked in code the moment a workbook is read, shown as Luna's turn, no AI asked — the table, the result column said as a choice, the months, what stands out, codes said by their description, flags counted, the tables beside it, the gaps. Shaped on two real workbooks Rowland supplied (read in the session, never committed). 0.2 s on 10,000 rows; 15 s on 1.4 million. Made to read a large, messy workbook the same evening (docs/WORKBOOKS.md, last section): the data sheet found despite error cells, several result columns listed and asked about (the notebook's answer leads), shifts always said, part-months from the dates, a working copy and report sheets told apart, a short receipt, and never silence. Seen working on the 137 MB workbook the same evening (Rowland: "really impressed"). **A trend is a picture** (`colleague/autoChart`): a series over time worked out in a turn, or a graph asked for, is drawn by the app itself through make_chart when Luna answers in words — no second request. Built the same night (docs/AI-MODE.md, last section): the graph drawn for patterns and rankings and offered otherwise, "show that as a graph" answered in code; who is in the room greeted, kept on the conversation and told back each turn — the room NOT yet rehearsed against the real model. **The cost of the AI service** (docs/AI-COST.md, 12 November — the audit and Rowland's "I agree proceed"): cache reads priced as Anthropic bills them (a twentieth on Opus 5.5 and Sonnet 5.5 — the budget bar had overstated), the rules, tools and history cached for an hour (`ASSIST_COLLEAGUE_CACHE_TTL`), every request recorded in its parts with its conversation and customer (`supabase/ASSIST_USAGE_DETAIL.sql` — **written, NOT yet applied: the Supabase connector needed re-authorising; the gateway falls back to the old row until it is**), and a clock time no longer lends the figure check a number (a turn stamped at :45 seconds had let an unbacked "about 45" pass unmarked). Next there, each on the real-model exam: tools on demand, the router and three tiers. **Following the workbook's own formulas** is built (13 November, docs/WORKBOOKS.md last bullet): each result column says how many formulas on other sheets and how many pivots use it, and the one the reports rest on leads, confirmed with the person. (It was listed as: following the workbook's own formulas and pivots to tell which column the business manages by.) (As asked 12 November: charts pre-empted for patterns and rankings ("what's hurting every shift") with a code-answered "show that as a graph"; Luna knowing who is in the room ("we've got Jason here, the COO" — greeted, kept on the conversation, addressed); and following the workbook's own formulas and pivots to tell which column the business manages by.) Next for Excel, in order: headings the reader cannot find named by the person; a finished pack from the first look; the same workbook next month (what changed); cell colours as a column.
- **What a real boardroom session costs:** four questions on a 35 MB workbook on 10 November were 13 calls and $0.99.

## 13 November — the factory overview (V1)

Rowland: *"a collective customer-facing factory overview … a living picture … retaining the original baseline … I do not want to enter
information twice"*, then *"take ownership of the design."* Built: **`#/overview`, the Factory's first tab** (Overview · Story · Lines ·
Set up) — `lib/overview` (a pure view over the Factory's and the Story's own readers, the findings engine, the knowledge outcomes, Line
capacity's bottleneck and the visits; nothing typed, nothing stored), `screens/OverviewScreen` (Present full screen, every row a door),
`lib/report/overviewPaper`. The Story stays: its first approved chapter is the baseline. No database change. `docs/OVERVIEW.md` holds
the decisions, what each section reads, and the next slices (V2 a wider snapshot per update, V3 every tool's finding in one form, V4
pounds for a proved fix). Proved by `scripts/acceptance/overview.mjs` and `src/lib/__tests__/overview.test.ts`; **no full gate run**.
