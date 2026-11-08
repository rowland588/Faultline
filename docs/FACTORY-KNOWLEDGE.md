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
- Not built yet: `replace_machine` (F5) — `replaced_by` is read and shown, but nothing in the app sets it yet; the workspaces'
  `known` is carried by the sync but nothing writes it yet (F3's drafts will).

## 7. The order

| Slice | What | Depends on |
|---|---|---|
| F1 | `MACHINE_KNOWLEDGE.sql`, mappers, the machine page's kind · model · serial and how known — **built 8 Nov; the SQL to apply, then the full gate** | full gate (touches sync) |
| F2 | `factory_map` and `resolve` capabilities + the gateway rules — **built 8 Nov; the gateway to redeploy** | F1 |
| F3 | factory drafts (conversation onboarding) and Make it through `lib/lines` | the tool-population drafts |
| F4 | Factory sources: upload, read in code / by the gateway, extract with quotes, approve | F3 |
| F5 | replace a machine; conflicts and outdated documents | F1–F4 |

Each slice ships live on its own with its acceptance script.
