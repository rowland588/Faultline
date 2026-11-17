# Faultline — current state, 17 November 2026

## In flight: full interface and branding redesign — not live

Rowland authorised a full transformation for personal consultancy use now, with possible SaaS later. Branch `codex/ui-review-improvements`, PR #9. Production remains on `main` (`e21f9bca`); publication waits for the complete release gate and a READY Vercel build.

Rowland reviewed three desktop/phone proposals, retained the split-F mark and chose **Pop**: cream surfaces, charcoal desktop rail, lime actions/selections with dark text, olive text accents, Inter and seven-pixel corners with a small offset shadow. The app, installed icons, share image, public guide and PDF stamp share that identity; papers stay light and printable. Navigation stays consistent across scopes and device sizes. Setup saves explicitly without clobbering unrelated changes; saved tool uses remain separate and searchable by line/machine/product. Product lists have one opening row, with Rename/Delete in More. Line Talk opens a readable report with Download PDF first and editing optional. App-version updating retains local data and handles offline failure. No schema, permissions, sync format or calculation formulas changed.

Verification already completed: 438 geometry checks over 146 sections with zero layout issues or console errors; all 34 tool pictures and three guide images regenerated from the actual app; full capacity, repeated-use/setup, client isolation, landing, machine/program, video, DMAIC, A3 and line-hub journeys passed. The reported physical-phone machine typing fault was not reproduced; Chromium touch and WebKit keyboard-viewport typing/reload checks passed, so do not claim its exact cause was fixed.

The `6545b89c` release checkpoint passed core (types/lint/unit/build), smoke, inventory, structure, journeys, four acceptance shards, all 40 report fuzz seeds and the independent update/large-report stories. Remaining failures were the old live-code baseline printing zero projects before its new Reports tab finished reading, plus four harness readiness/whitespace/explicit-save assumptions. The final changes key project inputs to their actual loaded identity, gate Download on project/client readiness, and reread current data when making the control-room PDF. The comparison now observes native read transactions and waits for them to settle on both builds; all expected report facts stay unchanged. Today waits for visible streamed text, Kaizen waits for its asynchronous baseline count, and the problem-register journey uses the explicit line Save changes control.

The A3 test also found a genuine method-answer readiness race, fixed in `6545b89c`: fields wait for their own project/method answers, and older overlapping reads cannot replace newer ones. The full A3 client readback now passes. Full final verification and publication remain pending.

Pop verification: all 438 device geometry checks over 146 sections completed with zero layout issues and zero console errors. Final visual-identity checks pass at 360/820/1440, including dark-rail selection contrast, primary actions, saved uses, product lists, capacity badges and readable report routes. Typecheck, all 31 report-kit unit checks and the six style-ratchet checks pass. All 34 tool pictures, eight method pictures and three public guide images are refreshed from the actual app. Two early capture attempts reached asynchronous content too soon; waiting for every required picture element fixed both retries. Capture metadata records the actual base commit, whether the source was uncommitted, and the identity hash. The complete final-head release gate remains required before publication.

## Earlier production history and decisions

The dated entries below are historical records. The current status above takes precedence over older naming, palette and in-flight statements.

The one page that says exactly where the product stands, for whoever picks it up next (Rowland, 6 November: *"I want
to get Cursor involved … I need everything in the repo so it can understand where we are exactly."*). **Kept current:
a session that ships something updates this page in the same commit.** The rules are `CLAUDE.md`; the product is
`docs/DIRECTION.md`; this is the state.

## 1. What is live (main at the look's L0 commit, 6 November, Vercel production READY, faultline.opexelevate.co.uk)

- **Getting around, N1 of four — 16 November** (`docs/NAV.md`; Rowland: *"I couldn't even get onto tools properly. I was lost … multiple
  doors … Customers like simple reports … I want this fixed"*; chose *the same tabs everywhere* and *two reports a place*). A line's tabs are
  Overview · Machines · Problems · Programs · Tools · Reports · Set up: **Reports** holds exactly two — **Summary** (one page) and
  **Everything** (the full package, every record in by default) — and the papers already made there; the action tracker is a view inside
  Problems (*Problems · Action tracker*); the line's page has no Report ▾. **N2:** an area's tabs are Overview · Tools · Reports (its
  Reports the area report as Everything); the Factory's Lines · Tools · Reports · Set up — Reports is the Factory overview as Summary,
  every area's and line's report as Everything, the rest in one fold; the board's Report ▾ and Tools chip are gone. Old addresses still
  open. **N3:** the left menu is Luna · Today · Factory · Projects (Tools and Reports are tabs of each place; a project keeps
  *Project reports* at the foot), the phone's bar Factory · Projects · ＋ · Today · More. **N4 (line):** the line's Summary headed SUMMARY with plain sections — What is wrong · What is being proved · What we measured · What is being done. Next: the area's and the Factory's Summary.
- **A workbook on every device — 16 November** (`lib/workbook/carry`): the file is kept with its register record and read on whichever
  device asks; over 50 MB (the free plan's file cap) it stays on the device that read it and says so.
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

**Production data connections — built 11 November, held 12 November, SWITCHED ON 15 November (`docs/DATA-CONNECTIONS.md`).** Rowland, 15 November: *"yes switch on"* — `lib/production/switch` `PRODUCTION_DATA_LIVE = true`, and `supabase/RESUME_PRODUCTION_DATA.sql` applied (`resume_production_data`) and read back: `luna-ingest-pull` every 15 minutes, active; the four tables with row-level security on, the secrets and keys tables readable by the service only; `ingest` deployed (version 2). No connection made yet, so nothing flows until one is added on Set up › Data connections. The history of the hold, as it was: Rowland, 12 November: *"Do not
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
- **In hand:** the review of every tool for that use (task R1). **Blocked:** the real-model demo run and usage counts — the Supabase connector needed re-authorising that day (it worked again on 15 November).

- **A visit's headline** (`lib/visitLoss`, live 12 November): the visit page and the visit report open with where the time went and what it cost, from the line's one cost model; never a rate or a week from a few hours' watching. The **what-if** (weeks of the same, with the stop-projection's range) is asked for and not built yet.
- **The first look at a workbook** (`lib/workbook/firstLook`, `scripts/acceptance/ai-first-look.mjs`): worked in code the moment a workbook is read, shown as Luna's turn, no AI asked — the table, the result column said as a choice, the months, what stands out, codes said by their description, flags counted, the tables beside it, the gaps. Shaped on two real workbooks Rowland supplied (read in the session, never committed). 0.2 s on 10,000 rows; 15 s on 1.4 million. Made to read a large, messy workbook the same evening (docs/WORKBOOKS.md, last section): the data sheet found despite error cells, several result columns listed and asked about (the notebook's answer leads), shifts always said, part-months from the dates, a working copy and report sheets told apart, a short receipt, and never silence. Seen working on the 137 MB workbook the same evening (Rowland: "really impressed"). **A trend is a picture** (`colleague/autoChart`): a series over time worked out in a turn, or a graph asked for, is drawn by the app itself through make_chart when Luna answers in words — no second request. Built the same night (docs/AI-MODE.md, last section): the graph drawn for patterns and rankings and offered otherwise, "show that as a graph" answered in code; who is in the room greeted, kept on the conversation and told back each turn — the room NOT yet rehearsed against the real model. **The cost of the AI service** (docs/AI-COST.md, 12 November — the audit and Rowland's "I agree proceed"): cache reads priced as Anthropic bills them (a twentieth on Opus 5.5 and Sonnet 5.5 — the budget bar had overstated), the rules, tools and history cached for an hour (`ASSIST_COLLEAGUE_CACHE_TTL`), every request recorded in its parts with its conversation and customer (`supabase/ASSIST_USAGE_DETAIL.sql` — **written, NOT yet applied: the Supabase connector needed re-authorising; the gateway falls back to the old row until it is**), and a clock time no longer lends the figure check a number (a turn stamped at :45 seconds had let an unbacked "about 45" pass unmarked). Next there, each on the real-model exam: tools on demand, the router and three tiers. **Following the workbook's own formulas** is built (13 November, docs/WORKBOOKS.md last bullet): each result column says how many formulas on other sheets and how many pivots use it, and the one the reports rest on leads, confirmed with the person. (It was listed as: following the workbook's own formulas and pivots to tell which column the business manages by.) (As asked 12 November: charts pre-empted for patterns and rankings ("what's hurting every shift") with a code-answered "show that as a graph"; Luna knowing who is in the room ("we've got Jason here, the COO" — greeted, kept on the conversation, addressed); and following the workbook's own formulas and pivots to tell which column the business manages by.) **Those four — headings named by the person, the pack from the first look, the same workbook next month, cell colours as a column — are built (13 November, the section at the foot of this page).**
- **What a real boardroom session costs:** four questions on a 35 MB workbook on 10 November were 13 calls and $0.99.

## 13 November — the factory overview (V1)

Rowland: *"a collective customer-facing factory overview … a living picture … retaining the original baseline … I do not want to enter
information twice"*, then *"take ownership of the design."* Built: **`#/overview`, the Factory's first tab** (Overview · Story · Lines ·
Set up) — `lib/overview` (a pure view over the Factory's and the Story's own readers, the findings engine, the knowledge outcomes, Line
capacity's bottleneck and the visits; nothing typed, nothing stored), `screens/OverviewScreen` (Present full screen, every row a door),
`lib/report/overviewPaper`. The Story stays: its first approved chapter is the baseline. No database change. `docs/OVERVIEW.md` holds
the decisions, what each section reads, and the next slices (V2 a wider snapshot per update, V3 every tool's finding in one form, V4
pounds for a proved fix). Proved by `scripts/acceptance/overview.mjs` and `src/lib/__tests__/overview.test.ts`; **no full gate run**.

## 13 November — the product is Faultline again; Luna is its AI colleague

Rowland: *"reverse the product branding back to Faultline. Luna remains the name of the AI assistant."* Done as a rebrand, not a redesign:
`lib/product` PRODUCT is Faultline (The Operational Improvement System, by Opex Elevate), the pulse mark kept and recoloured navy into
Luna's turquoise (the moon removed), every screen, paper corner, prompt, the browser title, share image, icons, install name, llms.txt
and How it works. `docs/BRAND.md` is the audit and what did not change. The gateway redeploys with the new identity lines on merge.

## 13 November — Luna does the sum when asked (Line Talk)

Line Talk told Luna "never calculate" and gave her no arithmetic, so she sent Rowland to a phone calculator. Now each answer carries
`sums`; the gateway evaluates them with the app's code and prints *Worked out in the app — … = …* under her reply (docs/LINE-TALK.md,
Sums). Unit-tested on his hopper case; the gateway redeploys on merge; not yet run against the real model.

## 13 November — one Luna, everywhere there is AI (direction given; not built)

Rowland, after Line Talk's Luna refused a sum AI Mode's Luna can do: *"I thought that if I was speaking in Line Talk and I was using the
AI, I was speaking to Luna's brain. The way I see it is that Luna should be everywhere. If there's AI integrated into any tool, Luna
should live in there. Because I'm continuing a tool, continuing a process."* Today there are two: **AI Mode's Luna** (the colleague
engine — capabilities, records, work_out, memory of the conversation; Opus) and **Line Talk's Luna** (its own instructions and answer
shape, no capabilities; Sonnet), plus the Story's drafter. They share a name and nothing else. The sums fix of the same day closes one
gap; the direction is to put Line Talk — and any tool that talks — on the one engine, so what she can do never depends on which page she
was spoken to from. **Waiting on Rowland's word on cost** (the engine's requests are several times dearer than Line Talk's — docs/AI-COST.md).
Also that day: Luna's page gained Back and Lines in its bar (the way out — he was stuck there on a phone).

## 13 November — a machine's manual, and the PM list from it

`docs/ASSET-DOCUMENTS.md` (the design and "What is built"). A PDF manual attached in Luna's box is kept on its machine and read page by
page in the app (no AI); Luna answers from its passages with the page (`find_in_document`) and makes a Planned maintenance list from what
the maker stipulates (`draft_pm_list` → `make_pm_list`, a card), each task quoting the manual. The machine's page lists *Its documents*.
Proved on a made-up manual only (`machine-manual.mjs`) — the first real OEM PDFs Rowland attaches are the real test, and the rules are
tuned on those. No full gate was run for this change: unit tests, lint, build, smoke, inventory and the neighbouring Luna scripts.

## 13 November — the line page as evidence (step 1)

`docs/LINE-PAGE.md` (the brief in Rowland's words, his decision, how it is built, the steps). On a line's page *Carry on* is now **What
we found**: a card for each tool in use with the tool's own figures and picture, opened in place, a button to the full tool; under it
**What we produced** (documents, PM lists, manuals). Figures on a card so far: calculators (Stops across workstations with its bars),
control chart, analysis, capability, value stream, Line capacity (with its bars). The rest say their sentence only — step 2, tool by
tool. `line-evidence.mjs` holds every figure on a card equal to the tool's own page. **Held at his word:** the fault-finding
instruction and moving a document to another line wait until he has tested SOP-from-manual on a real PDF; no real-model spend until
he says. Next after the line page: SOP and work instruction from a manual, the page cited per step.

## 13 November — the maintenance schedule, and the manual's rules corrected on a mock manual

Rowland had no manual to test with (*"I need you to mock it"*), so a made-up 13-page bagger manual was written as a real PDF (kept out
of the repo). It showed two faults in `lib/manual` `pmTasksOf`: table rows whose interval wraps were missed, and "after 6000 operating
hours" — the tail of a wrapped sentence — was given to three sentences that state no interval. Both corrected with unit tests on that
shape (docs/ASSET-DOCUMENTS.md, What is built). His decisions the same day: **no Excel** (*"I don't think we should get ourselves to make
Excel files"*) and **no tick list on Luna's card** — *"dont build the tick sheet make it a report, based on what a PM should look like i
give the report to the buienss"*. So: **Maintenance schedule** on a Planned maintenance list's Report ▾ (`tools/checks/pmSchedule`,
`pmSchedulePaper`; `LogCheck.src` keeps where each task was read from). Not built, and waiting on his word: SOP and work instruction from
a manual with the page per step; a document kept on a line rather than a machine; a done-by / date box on the schedule (asked of him).
Not proved: any real OEM manual; Luna's own reading against the real model (no real-model spend until he says).

## 13 November — an SOP and a work instruction from a manual, the page beside each step

Rowland's *"go"* on what was waiting. `lib/manual` `proceduresOf`, Luna's `list_procedures` and `make_procedure`, a *From* box on a step
of the Standard operating procedure and the task instruction (docs/ASSET-DOCUMENTS.md, What is built). The gateway redeploys on merge
with the two new steps and their instruction. Proved with the gateway played by the script (`machine-manual.mjs` 5c) — **not** against
the real model (no real-model spend until he says), and on no real OEM manual. Held at his word: the fault-finding instruction and
"put it on another line", until he has seen this on a real PDF.

## 13 November — At the machine: a procedure as one clear sheet

Rowland asked whether the SOPs were clear and lean — *"We don't want clutter. We want clarity. That's the design."* Looked at as he
would see it, the SOP's paper was a record (tiles, checks, the steps twice), not a sheet for a machine. Added *At the machine — one
sheet* to the Standard operating procedure and the task instruction's Report ▾ (docs/ASSET-DOCUMENTS.md). The record's paper is
unchanged. Still to do when he says: the SOP's own page on a phone is a long form — the same clarity on screen (a *read it* view).

## 13 November — the Excel work finished: the pack, what changed since last time, the headings as you say them, cell colours

Rowland, on going into a business as its production manager and being given their Excel: *"it's about strengthening the Excel … I can sit
next to the manufacturing manager and go, check this out"*; then *"you drive that through to completion immediately."* The four things
`docs/WORKBOOKS.md` listed as next are built, each in code with no AI asked (its last section says how, the proof and the limits):

- **Make this a pack** — offered first under every first look: the look as a report of the conversation (In short, month by month as a
  chart, what changed since it was last read, each split as a chart with what stands out, what moved, what to know first), downloaded as a
  PDF and as slides; `build_report` adds to it (`lib/workbook/lookPack`, `workbook_pack`).
- **The same report read again says what changed** — rows added, new months, a part month now whole, and a whole month whose figure is
  not what it was, with both figures; for the same customer only (`lib/workbook/sinceLast`; the snapshot kept on the file's record).
- **The headings as the person says them** — *the headings are on row 5*, *column M is the result*, *start with “RAW data”*; the workbook
  already read is understood that way and the look worked again (`lib/workbook/amend`, `read_workbook_as`).
- **Cell colours as columns** — *Row colour* and *Colour of ‹heading›*, each a column to split by; what a colour means is asked, never
  guessed; a rule's colours are said not to be read (`lib/workbook/colours`).
- **Charts of losses read right** — a series below zero names the lowest, is drawn on round steps through a zero line, and its figures
  are not cut off; found by reading the pack's own paper.

Proved by `marked.test.ts`, `look.test.ts`, `lookAsk.test.ts` and `scripts/acceptance/workbook-finish.mjs` (55 checks) on a generated
shift report with its own totals. The gateway carries the two new capabilities and three instruction lines (deployed by the GitHub
Action on the merge). **Not proved:** Luna's own use of the two capabilities against the real model (no spend, at Rowland's word); a real
site's workbook; a workbook of millions of rows with colours.

## 13 November — reasons on the stops tool, and 6M a tool in the Tools list

Rowland, 13 November: *"6M is still a window … it sits weird now, we need it in the tools. So do what we need. Also the Cellox tool I'm
using for stops is great and I think the 6M tool could use similar for the Pareto — many things happening at the same time, the interface
allows me to stop many things at the same time — we need additional reasons to the stop. That all could be very powerful."*

- **Stops across workstations — why each stop happened (FC-241 part 7, `knowledge/specs/FC-241-workstation-stops.md`).** While a
  workstation is stopped, and after it runs again, its tile offers *Why?*: the reasons already used on the record (a tap) or another typed
  once. Never required. Every timed stop is kept as its own line (`stopsdone` — workstation, when, minutes, why; `tools/calc/stopReasons`)
  and listed under the grid (*Every stop timed*), where a reason is changed and a stop taken off with its minutes and count. The results
  and the paper carry **What each reason cost** — the reasons ranked by what they lost, the workstation most of each fell on, *No reason
  given* its own bar, never shared out — and the paper lists every stop. Proved by `workstationStops.test.ts` (case R, by hand) and
  `scripts/acceptance/workstation-reasons.mjs`.
- **6M is a tool like every other (`src/tools/sixm`).** A card in the Tools list with its picture and its own page (#/tools/sixm); a list
  of the 6Ms on a line (#/sixm?line=), started by naming the problem, as many a line as it has problems worth one; one 6M on its own page
  IN THE LINE's frame with Pareto · Fishbone · Countermeasures · Report as its tabs. The old 6M button on Tools and on a line's Tools is
  taken off (it opened one project a line). **The record is unchanged and no database change was made**: a 6M is the 6M-kind project it
  always was — every 6M ever started is in the tool's list, its countermeasures are still actions on the Actions pages, and its project
  address still opens it in the project's frame. Proved by `scripts/acceptance/sixm-tool.mjs` (40 checks).
  **Still as it was, said plainly:** a 6M still appears under Projects too (hiding it there needs a mark on the record, which is a
  database change — it was not made while the connector was down; the connector works again since 15 November); inside the tool each of its four parts keeps its own heading.
- **The area is the hub, and it is a board of cards (14 November — the first slice).** Decided with Rowland the same day, after a long
  look at how actions travel: *the islands stay as they are* (a tool, a problem, a Line Talk, a 6M each keep their own way of working);
  *the area is where you navigate from* — "it's a card, it's a location, a point to say these things live in this area. Click on if you
  want to then follow through" — and lines are dug into from it; *clean, not mess — clear visual navigation*. Built: the area's page
  (`src/line/area/AreaScreen`) shows, under each line, one row of small cards — a card a tool in use (the newest record, its sentence,
  its state on the card's edge), each the door to that record; a phone gets a strip to swipe. It replaces the fold that listed the same
  records as rows. Held to the calm check (no page busier) and proved by `areas.mjs`.
  **Agreed and NOT built yet, in order:** (2) the Factory's four answers (what's going wrong · what needs doing · who · did it work)
  shown for an area and for a line — today they exist only for the whole factory; (3) each card saying how its actions stand, where its
  island knows (a Line Talk: "4 actions written, none taken"); problems and failed tests as cards; (4) the area as a real thing picked
  from a list (today it is words typed on each line), every line in one, and an area able to hold its own problems, tools and actions —
  so Dispatch, an area with no lines, works. **What was found on the way** (the audit of 14 November, nothing built from it): raising a
  problem never asks who or by when; an owner is a typed name, not a person; a project has no way to be completed (only Archive);
  6M countermeasures are not on the line's action tracker; a Line Talk's written actions stay in its document; a failed test on a
  line's program raises nothing; a project can be made on no line. **Next asked for (14 November):** look at the Overview (he finds it
  messy) and the Story (is it still relevant? the brief could move to the business's set-up) — look first, change nothing until agreed.
- **The stops timed in Stops across workstations feed the line's Pareto and its 6M (FC-241 part 8, 14 November).** Under *Every stop
  timed* a record on a line offers **Put these stops on <line>'s stop log**: each timed stop is copied to the line's own stop log — its
  reason what the Pareto ranks, its workstation the machine — and kept in step from then on (a stop timed, a reason changed, a stop taken
  off). The line's Pareto, a 6M's Pareto and fishbone, the loss count and *What Faultline has found* read that one log, so every one of
  them shows the same number; a stop is never there twice. *Take them off the line's log* undoes it. Proved by `stopsToLine.test.ts` and
  `scripts/acceptance/stops-to-line.mjs`. **Not done, said plainly:** minutes typed by hand with no stop timed stay in the record only;
  a workstation's name is not added to the line's list of machines; it is the person's press, never automatic on a new record.
- **The Factory has one front page (14 November — the first slice).** Rowland: *"the overview looks a bit messy … story. I'm unsure of
  the relevance of story … the business brief can go to setup"*; shown the plan (one front page in place of three tabs), *"Yes, do it
  that way. Keep it clean."* Built: the Factory's tabs are **Lines · Set up**; the menu's Factory, the context bar's crumb and
  Everything's Factory entry land on the board (`#/room`); the Overview and the Story are no longer tabs — they are opened from the
  board's **Report ▾** (*Factory overview*, *Client update — the story so far*), each lighting Lines. Nothing was deleted: both pages,
  their papers, Present and both addresses stand; Start a visit is still in the top bar's client menu and on the Story.
  Then, the same day: **the status across the top** — at a desk the four figures sit straight under the board's name and the areas
  (each already a card: its name, its sentence, its lines, *Open the area ›*) follow; a phone keeps the areas first, as asked on 10
  November, its header's sentence being the status. And **the Story page is the client update and only that** — its welcome and four
  doors (the way in while it was the front page) are gone; the menu holds all four.
  And **the brief is in Set up, with the customer** (`ui/CustomerBrief` — the same brief panel on the same record, under Customers):
  written, uploaded and changed there; the client update reads it in one line with *Change it in Set up ›* and keeps the asks with
  their evidence; *Start the story* asks for no brief. That is the whole of what was agreed for the front page — nothing was deleted,
  both pages and both addresses stand. Proved by `story-brief.mjs`, `story.mjs`, `overview.mjs`, `front-door.mjs`, `factory-calm.mjs`,
  `where-am-i.mjs`, the smoke test, the inventory and the calm check (no page busier). **Found on the way:** `scripts/journeys.mjs`
  had been red since 13 November (the 6M opens as a tool on its line; a card on the line opens in place) — walked as the app is now,
  and J1 and J3 are written into its agreed-longer list at one tap more, with his words of 13 November as the reason.
- **A card an area on the Factory's front page (14 November).** Shown the picture of the compact card beside the board as it was,
  Rowland: *"looks good continue."* Built (`lib/areas` areaCard, drawn by `screens/WorkspaceHome`): where the factory names its areas,
  each area is one card — its name the door to the area, how its problems stand (only the late and critical red), the worst thing open
  and who has it, its programs and projects in one quiet line, and each of its lines a chip with its own state, the door to that line;
  four across at a desk, one column on a phone; the lines with no area a card of their own. **This puts each line's full row one tap
  down for a factory with areas** — onto the area's own page, which already drew it (state, worst problem, machines, programs,
  projects, last looked at) — and so changes the 27 October rule that the Factory is the board of *lines*: it is the board of
  **areas**, lines dug into from them, as agreed on 14 November. A factory that names no area keeps the board of line rows unchanged.
  The *Area report* link left the front page too; it is in the area's Report ▾. Measured calmer (the board 2,235 → 1,537 px at a
  desk, 4,242 → 3,128 on a phone; no page busier). Proved by `areas.test.ts`, `areas.mjs`, `client-site-area.mjs`,
  `factory-onboarding.mjs`, `customers.mjs`, `factory-walk.mjs`, `role-home.mjs`, `active-client.mjs`, `organisation.mjs`,
  `factory-calm.mjs`, `control-room.mjs`, the inventory and the smoke test. **Still agreed and not built:** the four answers shown
  for an area and for a line; each card saying how its actions stand; the area as a real thing that can hold its own work (Dispatch).

## 14 November — the model on top of a KPI workbook's rows: the rows its reports leave out, its own weeks, its own checks

Rowland asked how much Luna understood of a real KPI workbook he had uploaded. Her reader and first look were run over it unchanged and
compared by hand with the workbook's own figures: she read the rows right and missed the model laid over them. Told the three things that
would close it — *"go do all 3"*. Built in code, no AI asked, on a made-up workbook of the same shape (`scripts/workbook/make-kpi-workbook.mjs`);
the real one was used only to check the result here, and none of its figures are in the repo. `docs/WORKBOOKS.md`, *The model on top of
the rows*, is the specification (written first) and what each will not claim.

- **The rows the reports leave out** (`lib/workbook/criteria`, `read.ts` holds · sumsFrom, `firstLook.ts` basisOf). The reader reads the
  constants a report's `SUMIFS`-family formulas hold a column to (a cell reference is the window picked, not a rule). A column held to one
  constant by 3 formulas or more, and by half or more of those that sum the lead table, is the reports' basis: the first look reads every
  figure the same way and says the rule, the rows kept and left out, what they carry and the total with them. *Read every row* /
  *Leave them out* are answered by the app (`read_workbook_as` `everyRow`). The snapshot keeps the basis (a look on every row is never
  compared with one on the basis), the pack is asked on it, and `workbook_profile` tells Luna the rule.
- **The workbook's own weeks** (`lib/workbook/week`, `query.ts` bucket). A date column that keeps to one weekday is a week column; the
  weekday most agree on is the workbook's week, and a text column one-to-one with it gives its own names (a financial week). A question
  *by week* of that workbook is grouped by ITS week (`w/e 2026-06-06 (FY26 Wk 14)`) and says so; without one, ISO weeks as before. The
  first look says the latest WHOLE week by its own name against the week before and the average of up to 12 before it, a part week as
  part, and offers *week by week*; the pack draws it.
- **The workbook's own checks** (`lib/workbook/checks`). A small list sheet named for it or carrying status words is read as checks — the
  first line put back when the reader took it for headings — and each line tested against the rows: *not fine* by its own word; *agrees*
  (a row count, the rows a flag marks, the rows with no reason, a column's sum over everything / the latest week / four weeks / a dated
  week, on the reports' basis and on every row, the latest date of the right table); *close* (within 0.5%, both figures said); a
  percentage that is one column over another; two neighbours that add up to a figure the rows give; and what the rows cannot give, said
  plainly and asked about. A line that names a sheet and says it is intended replaces the look's warning about that sheet's error cells.

**Proof:** `criteria.test.ts` (4), `model.test.ts` (16), `look.test.ts` (+1), `lookAsk.test.ts` (+1); `scripts/acceptance/workbook-model.mjs`
(49 checks, every gateway request counted — none until a question for Luna); `ai-first-look`, `workbook-finish`, `workbook` re-run.
**On the real workbook, by hand (scratchpad only):** the basis found from all but one of its conditional report formulas; its week and week
names found from its calendar and downtime log; its week's packs and efficiency agree with its own check; the false alarm about its
trend sheet's error cells is gone. **Not proved:** Luna's own use of the basis and the week against the real model (no real-model run —
Rowland's word); a workbook whose rule is written through a named range, a table reference or a helper column (not read — nothing is
left out and nothing is said); the gateway carries one new field (`read_workbook_as.everyRow`), deployed by the Action on merge.

## 14 November — any workbook: the shapes factory workbooks come in

Rowland: *"excel abilities is not on just this workbook it generilisticly all of them any excel workbook … Luna must understand any work
book .. can she ?"* Measured before anything was built: sixteen made-up workbooks, each a shape a site really keeps, run through her
reader as it stood — 2 right, 3 partly right, 4 confidently wrong, 7 an honest "I cannot tell". Told the three steps — *"go do all 3"*.
`docs/WORKBOOKS.md`, *Any workbook*, is the specification (written first), what it will not claim and the as-built notes. All in code;
no AI is asked.

- **Never a wrong figure** (`lib/workbook/textCells`, `read.ts`, `firstLook.ts` kinds). The sheet's own total rows left out and said;
  numbers typed with their units and dates typed as words read as what they are; a name merged down its rows filled down; a duration
  kept as a time read as minutes; a rate AVERAGED and never added; a measurement said by its average, spread and the rows outside its
  limits; a quantity × a unit price as the value; a number that only counts the rows, a limit and a price never added up; a small
  summary beside the log left out of it. The figure sentence now says the number itself (*13,024 over 240 rows*).
- **The shapes** (`lib/workbook/shapes` — a normalising pass at read time). Months, weeks or dates across the top and two rows of
  headings are read as rows; a tab a week with the same headings is ONE table with the tab a column; tables stacked on one sheet are
  each a table of their own; headings a long way down are found. A made table is an extra sheet of the profile (`derived`, the
  originals `readAs`), each of its rows pointing back at the sheet and cell it came from, and what it was made from is said.
- **Nothing to add up.** A register of words (an action log) is counted — its rows, what is past its date and not closed, by owner,
  status, area; a filled-in form is said answer by answer (`formLook`), with no total made of it.
- **Luna is told** how each sheet was read (`workbook_profile`, her instructions), so her own questions go to the made table.
- **What the real KPI workbook taught** (run by hand, none of it in the repo; each now a test on a seventeenth made-up workbook): a
  sheet whose own formulas add up another sheet is its REPORT, never data beside it; a total row left out still has its formulas
  read; a weight times a standard time is not a value. With those its first look is as before, figure for figure. The reader is
  about 5% slower on a 57 MB workbook (18.6 s → 19.6 s in Node, same machine).
- **Proved** by `scripts/workbook/make-shape-workbooks.mjs` (seventeen, each with its truth), `shapes.test.ts` (23),
  `textCells.test.ts` (13) and `scripts/acceptance/workbook-shapes.mjs` (38 checks in the real page, no request sent). **Not proved:**
  that every workbook is read — the seventeen are the bench it was built against; and what the live model does with a made table — no
  real-model run was made.

## 14 November (evening) — any workbook, round two: mixtures, and the shapes round one left unread

Rowland, told where round one stopped: *"yes do it"*. Eleven harder made-up workbooks (18–28 of
`scripts/workbook/make-shape-workbooks.mjs`) were written and run through the reader BEFORE it was changed: **3 right, 1 partly,
6 wrong, 1 "I cannot tell"** — Line 1 taken for every line, one column of a three-row heading taken for the whole, a printed report's
pages read as copies (1,444 of 13,024), a pivot outline doubled, kg added to packs and litres, a two-pair form read as a table.
`docs/WORKBOOKS.md`, *Any workbook, round two*, is the specification (written first) and the as-built notes. All in code; no AI.

- **Built** (`read.ts`, `shapes.ts`, `firstLook.ts`): headings said again down the sheet passed over; a row of units taken into the
  headings; names across the top (a column a line) read as rows; three rows of headings, a column for each level; a heading row of
  dates; a form in pairs of columns; an outline pasted from a pivot table read by the rows under its group rows; quantities in
  mixed units never added across them, said unit by unit; a stack of tabs named for what the tabs are (*Line*, *Week*).
- **After:** all eleven read to their truth, the first seventeen still do, and the real KPI workbook's first look is unchanged.
- **Proved** by `shapes.test.ts` (36), `workbook-shapes.mjs` (55 checks, twenty-one workbooks attached in the real page, no request
  sent), the older workbook tests and browser scripts unchanged. **Not proved:** any workbook outside the bench; the live model's use
  of the made tables (no real-model run).

## 15 November — the reading: what a person tells Luna about a workbook is kept for that customer's report

Rowland, 14 November: *"where is the excel ceiling — Luna will always need some help to understand the sheet and that's fine, even
you do"*; told the ceiling is meaning and cheap correction, not shapes: *"Do it."* `docs/WORKBOOKS.md`, *The reading*, is the
specification (written first) and the as-built notes. All in code; no AI.

- **Built** (`lib/workbook/reading.ts`, `firstLook.ts`, `capabilities/look.ts`, `colleague/lookAsk.ts`): beside the sheet, the
  heading row, a column's name, the result, the date and every-row (13–14 November), a person can now say **what a column is**
  (a rate to average, a total, never added, time lost, money, output), **a column to ignore** and **which rows count** (leave out
  the rows where a column holds a value, or read only those) — each a short sentence answered in code, or through Luna
  (`read_workbook_as`). What was told is **the reading**: kept on the look and on the file's record beside its snapshot, **used
  again by itself when the same report is read for the same customer** (next month's file, a new conversation, another device),
  said every time it is applied (*"Read the way you told me (14 November, on “March.xlsx”): …"*), added to, and put away on the
  person's word (*"Forget what I told you"* — kept, marked, never applied again). Never another customer's.
- **Proved** by three made-up months of a site's shift report with their truth both ways
  (`scripts/workbook/make-reading-workbooks.mjs`), `capabilities/__tests__/reading.test.ts` (9), `lookAsk.test.ts` and
  `scripts/acceptance/workbook-reading.mjs` (49 checks in the real page). **Not proved:** the live model's handling of a correction
  said another way (no real-model run); a report whose sheet is renamed each month is not recognised as the same report.
- **Not done — public workbooks.** The second half of the same go — running her over publicly published manufacturing spreadsheets —
  could not be done from this session: its network (the *Default* cloud environment) allows the package registries, GitHub and
  Supabase only, and the sites that publish such files (a vendor's free downtime and OEE templates, Zenodo's open dataset of a
  production line's OEE and downtime) are refused by the session's proxy. A session cannot be moved onto the *Faultline*
  environment while it runs, so nothing was changed: it needs those hosts allowed in that environment's network settings before a
  session starts, or the files uploaded as the KPI workbook was.

**The database connector, 15 November.** Rowland: *"we have already done this several times."* Checked the same day with a read
(`execute_sql` on `eqdigvzbljofxznqtfia`: 120 migrations, the database's own clock) — it works. The connector's sign-in lapses from time
to time and comes back without anyone doing anything; a session must **try a read-only call before saying it needs re-authorising**,
and never carry "needs re-authorising" forward from an earlier session's notes.

## 15 November — production data switched on

Rowland, asked whether to switch the connections to a factory's own systems back on: *"yes switch on"*. The pull job is active again
(`RESUME_PRODUCTION_DATA.sql`, read back), and the app offers **Add a connection** and **Bring in a file or sample** on Set up › Data
connections (`lib/production/switch`). Nothing else changed; the business data model he wanted first (12 November) is not built — said
here so it is not forgotten. `production-data.mjs` and the page inventory now expect it on.

**The full gate, 15 November** (the daily run had been red on 13 and 14 November; its summary could not be downloaded from here). Run
here on main: **199 passed, 8 failed.** Run again one at a time, six passed as they stand (`ai-mode`, `ai-first-look`, `voice`,
`ai-context`, `luna-voice-bar`, `analysis` — slowed past their waits when four browser scripts run at once). Two were real and are fixed:
a method project's 6M row opened the line's list of 6Ms since 6M became a tool (13 November) — it opens the project's fishbone again;
and `conversational-data` sent its next words between the two rounds of a turn, so its scripted gateway fell out of step — it waits
for every planned answer now (three runs in a row clean). **Done the same day:** eleven scripts that play the AI gateway wait for every
planned answer; ai-first-look, analysis, voice and luna-voice-bar wait for what they check; `scripts/gate.sh` runs ai-mode, voice,
ai-context and luna-voice-bar after the pool, one at a time (about five minutes). The full gate on main with all of it:
**207 passed, 0 failed.**


## 15 November — areas: the four answers, the cards' actions, and an area that holds its own work

Rowland, told the three area items agreed on 14 November were still unbuilt: *"go ahead make it all"*. The design is `docs/AREAS.md`
(A2 · A3 · A4), each slice live on its own.

- **A2 — the four answers for an area and for a line (built).** `lib/useScopeQuestions` gives the Factory's one reader
  (`lib/useFactoryRead`) only the lines in view, so an area's figures are its lines' and the factory's its areas' — never a second count.
  The area's page: the four cards under its sentence, each a door to its answer; the problems by what they cost, every action open with
  who and by when (three each, *Show all n* in place), *Did it work* once a fix is proved, the owed checks folded under What needs doing;
  the five tiles off the screen (the sentence says their counts; the Area report keeps them); *Programs to prove* in a fold. A line's page:
  the four cards where the tiles stood; *What needs doing* a fold under Problems that the cards open (`ui/Fold showFold`); the tiles are
  *The line in figures* inside More about this line. Measured by `scripts/calm.mjs`: the area page calmer than before (desk 2,123 →
  1,611 px, phone 3,396 → 2,305), the line page within its limits. Proved by `areas.mjs` (the cards equal `loadScopeQuestions` over the
  same records, live after a problem is raised), `line-simple.mjs`, `line-evidence.mjs` and the inventory.
- **A3 — each card says how its actions stand (built).** `lib/cardActions`: a tool record's actions are the problems held by it (raised
  from it or linked to it, `snag/toolLink problemsOn`) — one rule for every tool; its card on the area's page says *2 actions open · 1
  late*, *1 action, done*, or nothing, late the only red. Each line's own cards come first: *Problems* (open, the late and critical, the
  worst) and *Tests that didn't pass* (programs not proved whose latest test failed as Commission reads it, or whose criteria failed),
  each a door. A Line Talk's written actions count only once raised as problems — said in `docs/AREAS.md`. Proved by
  `cardActions.test.ts` (hand-worked) and `areas.mjs` 2b.
- **A4 — an area holds its own work (built).** `lib/areaPlace`: an area gets one workspace of its own, marked by its type (*The area
  itself*, as a customer's holding place is marked — no column, no migration), named *Dispatch — the area itself* and carrying the area's
  words, made the first time something is done there and never before (with a department record when the area has no line). It is never a
  line: `lib/lines productionLines` leaves it out, its address opens the area's page. The area's page: **In <area> itself** (open on an
  area with no lines, a fold otherwise) — its problems and tools as a line's cards, **Raise a problem here** (the problem sheet offering the
  place only then, saying the problem is held in the area itself) and **Start a tool here ▾** (any tool, on the place). Its problems count
  in the area's and the Factory's four answers and as actions (`lib/useProjectActions`), the Area report prints it as a part after the
  lines; Set up's Area box offers every area, the departments among them. Proved by `areas.mjs` 2c (Dispatch with no line: no place until
  wanted, a problem raised there, a tool started there, never on the board or Set up's lines).

## 16 November — Luna was down from 13 November; fixed

Every Luna turn since the hour-long cache shipped (`0e4e4081`, 13 November) was refused by the AI service: *"a ttl='1h'
cache_control block must not come after a ttl='5m' cache_control block"* — the tools, which Claude reads first, carried a
five-minute mark and the system text after them an hour's. The last turn that worked was 12 November, 20:36. The tools now
take the system's mark (`colleagueToolsFor(…, cache)`); a unit test walks the whole request in the API's order (tools · system ·
messages) under both settings and every tools mode. Gateway version 53, live 16 November 06:01. **Why nothing caught it:** every
browser script plays the gateway, so only a real-model call proves a change to the request's shape — run the real-model check
(`docs/LUNA-EVAL.md`, a few pence) after any change to `colleagueAnswer`'s request, with Rowland's yes.

## 16 November — Luna's panel solid, and a workbook on every device

**Luna's panel is solid.** Rowland: *"I can see the app in the background like see through … makes it hard to see luna"*. The look's
white is glass (82%); her panel sits over a page, so the page showed through her words. Her panel is now the sky, opaque
(`styles.css`, after `.ai-eyebrow`); `luna-panel.mjs` checks it.

**A workbook attached on one device is read on the others.** Rowland: *"Luna cant see files uploaded from another device … upload on laptop
must be viable to phone user and other way round"*. The file is kept with its register record and carried by the sync like a document;
another device reads it on the first question (`src/lib/workbook/carry`, `docs/WORKBOOKS.md`). Up to 50 MB; bigger stays where it was
read and says so. A workbook attached BEFORE today was never kept: attach it once more on any device and it is on all of them from then.
`scripts/acceptance/workbook-devices.mjs`.

## UI review follow-up — 17 November 2026 (branch, not live until verified)

`codex/ui-review-improvements`: consistent global project navigation, narrow-phone page selector, visible Tools search, folded project review overview, task-specific report headers, client/action context on line summaries, area Summary, clearer Factory package naming and concise unanswered-field reporting. See PAGES.md UI review follow-up. Verification pending; production unchanged.

The UI follow-up also fixes saved-line context on 6M direct links and view changes. Its focused device/PDF browser check and scope/rail unit checks pass. The first full release run passed typecheck, lint, all 6,738 unit tests and build; its screen/inventory flags included stale phone-tab/Print expectations and loading/time-dependent fixtures. That run was stopped to fix the confirmed 6M context issue and seed test datasets before live readers mount. A fresh full gate is required; nothing is live yet. This is for Rowland's personal consultancy use now, with SaaS potential later.

## 17 November — full personal-use redesign authorized, in progress

Rowland explicitly authorized a full redesign, with autonomy. The current priority is **his personal consultancy work**, possible SaaS later. Setup, navigation on all devices, repeated tool uses at different places on one line, reports and updating the app itself are in scope. Do not mistake the earlier UI follow-up for the completed redesign.

On `codex/ui-review-improvements` (PR9; not live): compact setup with explicit shared details saving; atomic partial workspace edits; individual saved-use rows/search/direct opening on a line; recent uses on Overview; chart review retained behind Results and charts; searchable Start a tool; safe network version checks and worker installation instead of unregistering/clearing all caches. No schema, sync-format, formula or authentication changes. PAGES.md records destinations. Focused navigation/report regression passed; three updater unit cases passed. Expanded workflow, real installed-PWA update and full release verification still required. Existing GitHub full release run 44050245088 checks the earlier head, not these new changes.

Expanded workflow verification passed: explicit setup save/reload, concurrent cost-field preservation, factory editor, two capability uses on different machines, direct opening/search, a third use preserving both, and overview/tools/setup/factory fitting 360/820/1440. Real production PWA check passed: A→B via Account, up-to-date feedback, offline failure, retained IndexedDB and origin caches, and opening B offline. The navigation/report regression passed. Typecheck passed and lint remains at the existing 59 warnings, zero errors. The working frame is now opaque white on a cool-grey canvas with solid actions; chart cards remain in optional Results and charts. Full release gate is still pending; this remains on the branch.

The legacy Capture/Analyse setup sheet has also been simplified into named sections using the same line-details editor. Shift subfield updates now use a synchronous partial-update function inside the existing IndexedDB transaction to preserve rapid edits to other shift fields. Storage shape and sync mapping are unchanged.

On head 86b30836: GitHub's Installed app update verification passed independently (run 44065438304). The expanded clean-start workflow also passes the shared setup-sheet sections and saving shift start/end/breaks together through reload, then the repeated-use/device checks. SetupSaving's real IndexedDB test passes simultaneous partial updates to shift subfields, costs and location. The full unit sweep is still running; one existing journey performance threshold failed under concurrent browser/typecheck load and needs isolated verification. No completion or production claim is made from partial results.

Current compact setup passes the full Factory acceptance (30 stories, including reordering through More, archive/restore/merge, costs and PDFs), expanded clean-start workflow across three widths and final typecheck. The full local unit sweep passed 6,741 cases and one journey speed threshold failed under concurrent load; the unchanged journey test passed all 18 cases alone. The older CI release checkpoint (d511, intentionally cancelled as obsolete) passed core/smoke/inventory/structure/journeys but flagged many PDF assertions. Its generated PDF downloaded and read with the workspace's Poppler 25.03 contains the expected word spacing; CI's older Ubuntu extractor joins words (e.g. WHOISDOINGWHAT). Release verification now pins Poppler 25.07 for comparable inspection. This changes test tooling, not PDF rendering or assertions. Two huge-report load waits and any remaining factual losses still need validation; a clean full gate is not claimed.

Report test readiness now waits for the real report controls/download up to 60 seconds for huge fixtures under the simultaneous fuzz load; all content, geometry and page-count assertions remain unchanged. The old CI text reader also failed to strip page footers whose words it joined, producing false lost-fact checks across page breaks; the pinned inspector addresses that discrepancy. Full release verification must still finish on the current head.

## 17 November — all tools and sections explicitly included

Rowland clarified that the review must cover every section/tool, bugs and opportunities, all devices and leaving/returning, citing phone machine-name entry in capacity and Line Talk output opening as a form. The full-page/device audit is running over 146 inventory/tool entry sections (34 registered tools) at 360/820/1440; actual screenshots and structured results are under `/workspace/faultline-ui-review/all-sections`. Distinguish this from complete functional verification. No production release yet.

A read-only check of recent saved data found an unnamed first station in the latest capacity record. A local copy of that structure passes paused touch typing, focus retention, keyboard-sized viewport and reload on the current branch; this does not yet establish what happened on the user's physical phone. Optional clarification of which capacity tool is pending. Line Talk generated output now opens as a readable report with optional Edit report and one Download PDF action, retaining source labels and saved versions; focused output verification is running. Legacy tool-catalogue assertions now open the secondary options explicitly, while the main saved-use list stays the default.

Line Talk report-first output and its full legacy assistant acceptance now pass, including PDF content, saved versions, edits/reload and direct return to the talk. The main audit attempted 146 sections at three widths; fixture readiness and missing check-log/area seeds were identified and corrected, so the sweep is not claimed as complete functional proof. All 18 calculators have now been rechecked at 360/820/1440 with zero geometry issues or console errors after widening workstation inputs and making small-phone search available through More. Global search includes saved uses and prevents superseded scope reads; its scoped-route unit cases pass. A new tiny-navigation browser check is in the release gate. Full release verification remains pending and production is unchanged.

Head e4e0ede7 passes the complete multi-tool line-analysis story, including two tools started together, another capability use, machine context, combined PDF content, selective removal and dual-line grouping. The final sweep identified 36 px selection labels in Problems/the optional tool catalogue; these are enlarged to 44 px. A Safari-engine capacity entry check is being prepared; Chromium's full touch/keyboard/persistence case passes, but a physical-phone cause is not established.

The final visibility sweep completed 438 checks (146 sections × three widths), with zero horizontal overflow, clipped-control, field-width or console-error flags; explicit horizontal scrollers are recognised as such. Visual inspection separately found Today’s clipped question section and Capability over time's overlapping heading; both are corrected. Today’s complete mocked-Luna journey now passes with readiness-based waits and controls at 320–1440. The map-return regression passes all three widths, including its SVG measurement, saved person and the now-consistent product-view tabs. Phone capacity entry also passes WebKit as well as Chromium against the copied structure; this does not establish a physical-phone root cause.

An isolated inventory found all 1,578 required elements, but an earlier hook edit during that running sweep caused hot-reload page errors; a clean frozen-head rerun is required. Existing journey assertions were still expecting expandable cards and a standalone 6M from a legacy project link; they now follow the actual project Fishbone and direct saved-use rows, with the created SMED's exact identity checked. The earlier CI checkpoint read 69/70 repeatable PDFs cleanly after the inspector pin, leaving the first huge status load timing out. CI full verification is being separated into gate phases/runners to isolate heavy report work while preserving all tests, all forty fuzz seeds and final sync. Not live; a full green result is still required.

The first-huge-status timeout was traced to the browser helper: it accepted any visible Reports tab before waiting for the page's own controls, then waited for the Factory paper chooser on a project. The helper now limits that fallback to Factory/area routes and waits for project controls; the PDF content assertions remain intact. All navigation journeys now finish at or below their historical tap baselines. The isolated map regression and Today flow pass; control-chart's table/PDF/device checks pass, with one twentieth-reading screen/model assertion still requiring a focused rerun. CI's earlier unit sweep passed 6,744 cases and failed only the raw-breakpoint ratchet; the new 399 px breakpoint has been removed in favour of the existing 719 px phone breakpoint, and all six ratchet cases pass.
