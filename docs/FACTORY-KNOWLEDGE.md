# Factory knowledge — the AI understands the factory it is in (8 November)

Rowland, 8 November: *"Imagine … you walk into a factory and simply say: 'Faultline, let's investigate this line.' … it cannot guess
which factory, area, production line, machine or process I am talking about … I want Faultline to develop a structured knowledge
of every business it works with … Do not create a duplicate factory database."*

The factory knowledge provides the context, the conversation the interaction, the AI the intelligence, Faultline the structure
and execution. This page says what already holds that knowledge, what is added, and in what order.

## 1. What already exists — and is kept as the one model

| Level | Where it lives today | Notes |
|---|---|---|
| Business (client) | `workspaces.client_name` — words on each line (K1, `CLIENT_SITE_AREA.sql`) | the Factory page titles and filters by it; recall never crosses it |
| Site / factory | `workspaces.site_name` | |
| Area / department | `workspaces.area_name` | the Factory page groups lines under site › area |
| Production line | `workspaces` (a line of the factory); `made_of` for a dual line | membership and RLS are per line (`is_ws_member`) |
| Machine / equipment | `assets` — one record a machine (`ONE_MACHINE_RECORD.sql`), on its line (`workspace_id`), `name`, `oem`, `note`, `docs` (pictures, files), `state`, dates, `merged_into` | every Machine box offers the line's list (`machineOntoLine`) |
| Process / operation | Line capacity's stations in flow order; the line standard's areas; a process flow chart's steps | a station names its machine |
| Product | programs (`products`), Line capacity's products | |
| People / roles | the line standard's people, the line's crew, the project's members and access levels | names only where the team typed them |

So the hierarchy **business › site › area › line › machine**, with processes and products on the line, is already the app's own.
Nothing here becomes a second table of the factory.

## 2. What is added (small, additive, reviewed)

1. **What a machine is** — on `commission_assets` (the machines' table; `Asset` in the app): `kind` (the equipment type in the factory's words: scale, mixer, checkweigher, metal
   detector, case packer…), `model`, `serial`. A machine called "Scale 3" can then be found when someone says "the scales".
2. **How each thing is known** — `known jsonb` on `commission_assets` and `workspaces`: per field, `{ how, source, at, by }` where `how` is
   *confirmed* (a person said it is right) · *reported* (said in a conversation) · *from a document* (with the document and the
   exact words) · *inferred* (proposed, not confirmed). Missing is simply absent and said as unknown — or *recorded* for a value typed into Faultline with nothing said of how. Only a person makes a fact
   *confirmed*.
3. **A machine replaced** — `replaced_by` on `commission_assets` (text, as the table's ids are — a line's own record is
   `mc-<line>-<name>`): the old record is kept (never deleted), the new one names what it
   replaced; the line's list carries the new name; studies, problems and programs on the old record stay on it, read as history.
4. **Source documents** — an uploaded equipment register, layout, asset list, SOP or organisation chart is kept as a *Factory
   source* document record (the existing document shape, `studies` tool `doc`, on the line it describes, its file as media):
   its text read in code (PDF, Word, Excel/CSV — the brief's readers), a photo or scan read by the `assist` gateway. Every fact
   taken from it points back to it and the words it came from.
5. **Areas and sites before their lines** — held on the onboarding draft until a line is made in them (a site with no line yet
   has nothing to do). If an empty area is ever needed on the Factory page, it becomes a line-less row of the same words, not a
   new record kind — decided when it is needed.

Migration `supabase/MACHINE_KNOWLEDGE.sql` (additive columns, nullable, no data changed; RLS unchanged — the rows are the
line's), with the mappers and the sync-schema test in the same commit, under the full gate. The mappers send each new column
**only once a record carries it** (`''` cleared on a device is `null` in the cloud), so a device on the new build pushes as
before until somebody describes a machine — but the migration is applied before the build reaches `main`, so that first
description is never refused.

## 3. How knowledge gets in — four ways, one draft

All four end the same way: a **factory draft** in the AI Mode conversation (the same draft mechanism as conversational tool
population — `facts.drafts`, kind `factory`), shown as *Being built*: sites, areas, lines, machines with kind, model and how each
is known; what conflicts with what is already recorded; what is missing. **Make it** (confirmed) writes through the functions
Manual Mode uses (`lib/lines` add a line, its client/site/area, `machineOntoLine`, the machine's record) — never around them.

- **A. Manual** — Set up the lines, the line's Machines tab, a machine's page: as built, plus the new fields.
- **B. Conversation** — "We're onboarding Customer X Foods … two factories … let's start with packaging": the colleague asks
  one useful question at a time and fills the draft.
- **C. Documents** — uploaded in the conversation or on the Factory page; the gateway's `factory-read` task proposes entities and
  relations, each with the exact words it came from; nothing is kept until approved line by line.
- **D. Combined** — the register fills the draft, the conversation corrects and adds; each value keeps its own source.

## 4. How the AI uses it

- `factory_map` (read): the client's sites › areas › lines › machines with kind, model and how known — only the client of the
  line or project in hand, never another's.
- `resolve` (read): turns words ("the scales", "the mixer", "Line 2", "packaging", "the changeover") into candidates from the
  map — exact name, kind, area, synonyms — and says *one* (use it), *several* (ask which, naming them) or *none* (say it is not
  known, offer to add it). The gateway's rules: never assume a machine, line or process exists; resolve first; say how each thing
  is known.
- The conversation's context (its current thread's line, project, machine) narrows `resolve` before anything is asked.

## 5. Conflicting and outdated knowledge

- A value carries its source and day. A newer document never silently overwrites a confirmed fact: the draft shows *recorded*
  against *the document says*, and the person picks.
- A document older than a confirmed change is flagged when it is read ("this register is from March; the filler on Line 2 was
  replaced in June").
- "That machine has now been replaced" → `replace_machine` (write, confirmed): the new record, `replaced_by` on the old, the line's
  list renamed, how known = reported, by whom and when.
- Separation: every read is scoped by the client of the lines the person may see (RLS by line membership, plus the client
  filter in code, as `recall` already does). No knowledge is shared between clients, ever.

## 6. Wearables and vision, later

Nothing is built now. Nothing blocks it: a frame from glasses would be a photo turn in the conversation (the shape Line Talk and AI
Mode already keep), labelled by the gateway into words, and those words go through the same `resolve` against the same map — the
camera adds observations, never a second model of the factory.

## 6½. What is built (F1–F2, 8 November)

- **Types** — `Known`, `KnownFact`, `KnownHow` in `src/types.ts`; `Asset.kind · model · serial · known · replacedBy`
  (`src/lib/testing.ts`); `Workspace.known`.
- **`src/lib/factoryKnowledge.ts`** (pure) — `factoryMap(lines, assets, { client?, jobLines? })` the map client › site › area ›
  line › machines (the demo, archived, deleted and merged aside; a replaced record kept under the one that replaced it, never a
  machine of the line), each machine's kind, model, serial and maker as `{ value, how, said }`; `howSaid` / `howWord` the words;
  `KINDS` (checkweigher its own kind, never a scale; metal detector, case packer, scale, mixer, conveyor, bagger, filler, sealer,
  labeller, wrapper, palletiser, each with what people also say) and `kindOf(name)` — a kind guessed from a name, only ever
  *inferred*; `kindWord` keeps a typed kind as the known one ("Palletizer" → palletiser) or as typed; `resolveWords(map, words,
  { lineIds })` — a line by name or number ("Line 2", "line two", "2a"), a machine by its name or kind ("the scales" is every
  scale; "Scale 1" only that one), "… on line 2b" only there, an area or site by its words, the conversation's line first;
  `replacedOf`, `identityFacts`. A line that names no client is only ever with others that name none (`sameClient`).
- **The machine's page** (`line/MachineIdentity`, on `line/LineMachineScreen` after its picture) — *What it is*: Kind, Model,
  Serial, each with `howSaid`; *Change* edits the three (db/lineRecords `setMachineIdentity` — each changed field confirmed by
  the person, today; Undo); a guessed kind offers *Yes, it is a …*; *Replaced by … on …* / *Replaces …*; the old name's page
  says what replaced it. The Machine report prints *Kind · Model · Serial* among its facts (lib/machineDetail).
- **Capabilities** (`src/capabilities/factory.ts`) — `factory_map` and `resolve`, reads, scoped to the client of the line or
  project in hand (a client named that is not the line's is refused); with none in hand, every client whose lines the person
  can see, each its own group, each candidate saying whose. **The gateway's rules** (`COLLEAGUE_SYSTEM`, *THE FACTORY — NEVER
  ASSUME*): resolve first; one → use it, several → ask which naming them, none → say it is not known and offer to add it;
  say how each fact is known.
- Built since (§6¾): `replace_machine` (F5) sets `replaced_by`; F3's make writes the workspaces' `known`.

## 6¾. What is built (F3–F5, 9 November)

- **The factory draft** (`src/capabilities/factoryDraft.ts`, pure; its shape `FactoryDraftBody` in `capabilities/types`) — a draft of
  kind `factory` on the AI Mode conversation's `facts.drafts`, beside the tool drafts: the client, and a flat list of nodes (site,
  area, line, machine) each with its parent, its name and — a machine — its kind, model, serial and maker, every value a
  `FactoryFact` (`reported` with the words said, or `document` with the document, its day and the exact quote), a correction keeping
  what it replaced. `applyFactoryOps` — add (parents named in the same breath are added; a machine with no line is refused: "a
  machine is on a line, always"), set, rename, move, remove (from the draft only — never a record), keep, leave out (a document's
  proposal, a machine kept keeping its line, a line left out leaving its machines), pick. `factoryView` — the draft against
  `factoryMap` for **this client only**: a line matched by its name ("Line 2" and "line two" one; "Packaging Line 1" and
  "Packaging Line 2" two), a machine by its name on that line — matched, never doubled; a value that differs from the recorded one a
  **conflict** (recorded and offered side by side, each with where it came from and its day) that holds Make it until picked; a
  document dated before a recorded change **flagged**; a machine the document names that was replaced since **out of date**, never
  made; sites and areas with no line **held** on the draft. `toMake` — the new lines, the new machines on lines that exist, the matched
  ones to bring up to date.
- **The capabilities** (`src/capabilities/factoryBuild.ts`) — `add_to_factory_draft` (local; the first call names the client and
  starts the draft); `make_record` on a factory draft (write, confirmed; a client-level person refused): the lines through
  `lib/lines addLineToFactory` with their client · site · area words and `Workspace.known` (reported or from a document), the
  machines through `machineOntoLine` and `db/lineRecords setMachineIdentity` — which now takes how each field is known (never
  *confirmed* from a conversation) and the maker (`oem`); a matched machine gets only what it lacks, or what the person picked;
  `replace_machine` (write, confirmed): `db/lineRecords replaceLineMachine` — the new record in the old one's place in the flow, its
  kind · model · serial · maker reported, the old record kept with `replacedBy` and `known.replacedBy` (who, when, the words), the
  line's list carrying the new name; the new name must differ (its model, say), so both pages stand. `draft_state` on a factory says
  the tree against Faultline. The conversation's drafts are read and written by `capabilities/draftStore` (shared with the tool
  drafts).
- **Factory sources** (F4) — the box's document button in AI Mode (`colleague/AiFactory` FactoryDocSheet: whose factory, its date) →
  `colleague/factorySource readFactoryDocument`: a **CSV register read by rules** (`colleague/factoryRegister` — the header row naming
  a Line and a Machine / Equipment / Asset column, then Type, Make, Model, Serial, Site, Area; each row one machine, the row itself its
  quote; a row with no line said and left out; a "Date: …" line before the header the register's day); a **PDF, Word or text file's
  words read in code** (the brief's readers, `tools/story/briefText`) and asked of the gateway's **`factory-read`** task; a **photo or
  scan** read by it (it types the pages out and quotes from what it typed). `capabilities/factoryRead` (shared with the gateway by
  `scripts/sync-assist.mjs`) holds its rules, schema and `checkFactoryRead` — an item whose quote is not in the words, or a value not
  in its quote, is dropped, on the server and again on the device. An **Excel workbook is not read** — no spreadsheet reader is in the
  app; the person is told to save it as CSV. `takeDocument` keeps the document as a **factory source**: the custom-sheet shape of a
  `doc` record (`FACTORY_SOURCE_DEF` — whose factory, the file, its date, how it was read, its words, *What was taken from it* a row an
  item with its quote), the file itself as the record's media (`facts.docPhotos`, field `source-file`, which the cloud's media rule
  already takes — no SQL), so the document's page, list, paper, rename and delete read it unchanged; it is put on the first line made
  from it. The custom shape was chosen over a new definition in `tools/doc/defs` because a definition would be a tool in the catalogue
  with worked examples for `doc-shape.mjs`; a source is a record of evidence, not a tool. Its items go on the client's factory draft
  as proposals **from a document, waiting for the person's word**, each keep or leave out (or *Keep all*), approved line by line
  before Make it.
- **Being built** (`colleague/AiFactory` FactoryDraftBox, in AI Mode's context panel and the phone's sheet) — the client, the counts
  (new lines, new machines, already in Faultline, waiting, made), the tree site › area › line › machine, each with its state in a word
  (New · In Faultline · Made · From a document — keep it? · Left out · Out of date), how it is known and the words it came from, a
  machine's facts with a corrected value struck; a conflict as *Faultline holds …* against *You said / The document says …* with *Keep
  … · Take …*; a flag in words; what is held; *Before it can be made*; Make it (the same write card) — its buttons go through
  `add_to_factory_draft` and `make_record`, the colleague's own door.
- **The gateway's rules** (`COLLEAGUE_SYSTEM`, *ONBOARDING A FACTORY*, *FACTORY DOCUMENTS*, *A MACHINE REPLACED*): one useful question
  at a time; never invent a site, line or machine or a fact not said; resolve before adding; offer make_record when a level is
  complete; say what a document gave with its words and never that anything is kept until it is; an older document said so;
  replace_machine proposed as a card. `factory_map` / `resolve` for a client with no line yet say *Nothing of … is in Faultline yet*
  (they refused it before).
- Not built: a document uploaded from a line's Set up (only AI Mode's box takes one); reading `.xlsx`; an empty area on the Factory
  page (an area is held on the draft until it has a line, §2.5). Proved by `scripts/acceptance/factory-onboarding.mjs` and
  `src/capabilities/__tests__/factoryOnboarding.test.ts`.

## 7. The order

| Slice | What | Depends on |
|---|---|---|
| F1 | `MACHINE_KNOWLEDGE.sql`, mappers, the machine page's kind · model · serial and how known — **built 8 Nov; the SQL to apply, then the full gate** | full gate (touches sync) |
| F2 | `factory_map` and `resolve` capabilities + the gateway rules — **built 8 Nov; the gateway to redeploy** | F1 |
| F3 | factory drafts (conversation onboarding) and Make it through `lib/lines` — **built 9 Nov (branch `factory-f345`)** | the tool-population drafts |
| F4 | Factory sources: upload, read in code / by the gateway, extract with quotes, approve — **built 9 Nov; the gateway to redeploy** | F3 |
| F5 | replace a machine; conflicts and outdated documents — **built 9 Nov** | F1–F4 |

Each slice ships live on its own with its acceptance script.
