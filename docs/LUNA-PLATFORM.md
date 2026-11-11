# Luna as the platform — four layers, and how the app maps onto them (11 November)

Rowland, 11 November: *"Luna becomes the primary intelligence, conversational interface and access point to the platform's capabilities
… this does NOT mean that everything becomes a chatbot … The human performs the physical observation. Luna manages the intelligence and
information flow … As Luna becomes more capable, the user experience should become simpler."*

| Layer | What it is | In the code |
|---|---|---|
| **LUNA** — intelligence and conversational access | understands intent, context, the person and what the work needs | the AI service's `colleague` task (`supabase/functions/assist`, `src/tools/colleague/colleagueAssist.ts`); the conversation record (threads, task, drafts, focus — `src/colleague/conversation.ts`); voice (`docs/VOICE.md`); Luna's panel on every page (`colleague/LunaHost`) |
| **EXECUTION** — the operational capabilities | the tools, calculations, workflows, capture screens and papers, unchanged | `src/capabilities` (each capability calls the app's own functions — never a second copy); the connector of each tool (`src/capabilities/connectors`: describe · fill · capture · read · report); the real page shown beside the conversation (`lib/pane`) |
| **DATA** — connected information | structured records and their relationships, history, sources from outside | Supabase with row-level security and two-device sync (`src/cloud`); every record on its line, machine, project, problem; the sources register (`list_sources`, `resolve_source`, workbooks and files read on the device) |
| **HUMAN** — observation and judgement | what only a person can see, time, count, verify or decide | the card before any write; the focused capture screens; *Over to you* hand-overs read back, never assumed (`hand_over`, `handover_state`); verification by a person only; each tool operation's level 1–4 (`src/capabilities/intel/tools.ts`) held to the code by a test |

**Who does what is decided by the operation's level** (`intel/tools.ts`): 1 Luna does it (a Pareto from recorded stops, a calculator,
a report); 2 Luna does it on a yes (starting a study, a project, a record); 3 the person does it with Luna preparing and reading it (timing
a changeover, work sampling, drawing the line standard, linking on the Gantt); 4 nobody in the app (reading a machine's signals). A
physical measurement is always level 3: Luna opens the capture screen, the person times or counts, Luna reads it and analyses.

## Where it falls short, and the evolution (in the order of `docs/STATE.md` §2)

1. **Luna is not yet the front door.** AI Mode is a menu item; Today is the home. → Today opens with Luna's box first; no new screen.
2. **Business-wide reads run on the device.** Every read capability works over what the device has synced — right on the floor (fast,
   offline), wrong for a director's question across a business of thirty lines. → read-only summaries worked out in the database under
   the same row-level security (a view or function per question family: losses by line and period, problems by area, actions owed),
   called by Luna's read capabilities when the question spans the business; writes stay on the device through the app's own functions.
   Built with the organisation (`docs/ORGANISATION.md` O4).
3. **Focused capture covers seven tools** (stops, line balance, value stream, SMED, work sampling, reliability, workstation stops).
   Others are filled through the conversation. → each tool whose physical capture matters gets its capture entry in the connector, in
   the order the floor uses them.
4. **Outside systems.** *Production data: designed and built 11 November — `docs/DATA-CONNECTIONS.md` (push and pull from the business's
   MES/ERP, kept as `system` evidence).* Excel and CSV are read on the device; SharePoint and business databases are not connected. → the sources register
   gains server-side connectors (Microsoft Graph for SharePoint and OneDrive files; a scheduled import for an MES/ERP export), each source
   kept as *imported* evidence with its date — after the organisation, and shaped by Rowland's decision on production data.
5. **AI Mode has grown panels.** → a calm pass (`docs/DESIGN.md`): the conversation, the work beside it, and nothing else in the first view.

What does not change: the tools, their records and their papers; one data model; the code works every figure; nothing written without
the person's yes; manual use complete without Luna.
