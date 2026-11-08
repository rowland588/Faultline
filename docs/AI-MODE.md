# AI Mode — the colleague that operates Faultline (8 November)

Rowland, 8 November: *"We are building intelligence around the application I have, not building another application
around the intelligence … The AI must not simply answer questions. It must be capable of using the actual
application."* And, the same day, the mandate: *"Faultline is an operational improvement system … the ultimate vision is
a Jarvis-like manufacturing colleague … Two modes … Manual Mode … AI Mode … Both modes must use the same underlying
records, business logic, permissions and capabilities."*

The rules are in `docs/DIRECTION.md`, *The AI may operate Faultline — 8 November*. This page is the design: how the
pieces fit, what each one checks, and what is not built yet.

## 1. Two modes over one application

- **Manual Mode** is the application as built — every screen, tool, report and paper. It is complete and needs no AI.
  Nothing in it waits on AI Mode, and switching AI Mode off changes nothing in it.
- **AI Mode** (`#/ai`, `src/screens/AiModeScreen.tsx`, `src/colleague/`) is a conversation, typed or spoken, in which
  Claude operates Faultline **only through approved capabilities**. It reads what the screens read, writes what the
  screens write, and is refused what the person would be refused. It has no records, sums or permissions of its own.

## 2. The architecture

```
   Manual Mode screens                 AI Mode (#/ai)
   (pages, tools, papers)              conversation · threads · voice
           │                                │        ▲
           │                                │        │ reply · calls · suggestions
           │                                ▼        │
           │                     assist gateway, task `colleague`
           │                     (signed in · allowance · schema check ·
           │                      audit to ai_actions · Claude tool use)
           │                                │ calls (names + inputs)
           │                                ▼
           │                     src/capabilities/ — registry.runCall
           │                     validate → allowed (the person's access)
           │                     → write only if confirmed → run
           ▼                                ▼
   src/db functions · tool modules (src/tools/*, src/lib/ie/*) · report makers (src/lib/report/)
                                            │
                                   IndexedDB on the device
                                            ⇅  src/cloud/sync
                                   Supabase — row-level security, the final authority
```

The gateway sits in the middle for AI Mode only. Manual Mode never calls it; it goes straight to the same data
functions and modules.

## 3. The capability contract

A capability is a typed, tested operation (`src/capabilities/types.ts`):

```ts
export type HowKnown = 'observed' | 'reported' | 'measured' | 'calculated' | 'hypothesised' | 'verified' | 'unknown';
export interface CapRef { kind: 'line' | 'machine' | 'project' | 'problem' | 'study' | 'story' | 'action' | 'report' | 'page';
                          id: string; label: string; href: string }
export interface CapCtx { email?: string; me?: string; now: number; conversationId?: string }
export type CapResult = { ok: true; says: string; data?: unknown; refs: CapRef[] } | { ok: false; why: string };
export interface Capability {
  name: string;                 // snake_case, stable — the gateway's tool name
  title: string;                // plain words for a card: "Raise a problem"
  kind: 'read' | 'write' | 'local';
  validate(raw: unknown): { ok: true; input: any } | { ok: false; why: string };
  allowed(ctx: CapCtx, input: any): Promise<{ ok: true } | { ok: false; why: string }>;
  preview?(ctx: CapCtx, input: any): Promise<string>;   // a write: what will happen, in a sentence, before it runs
  run(ctx: CapCtx, input: any): Promise<CapResult>;
}
export interface CapCall { id: string; name: string; input: unknown }
```

- `src/capabilities/registry.ts` holds `CAPABILITIES`, `capabilityByName(name)` and
  `runCall(ctx, call, { confirmed })`: **validate** the input → **allowed** (the person's access, as the screens check
  it through `lib/access` and `cloud/access`) → a **write is refused unless confirmed** → **run**; any error is caught
  and said as `{ ok: false, why }`.
- `src/capabilities/schemas.ts` is self-contained (no imports, so the gateway copies it under Deno): the Claude tool
  definitions, JSON Schema with `additionalProperties: false`. The registry's test checks the names and kinds agree.
- **Kinds.** *read* runs at once. *local* changes only the conversation or the device (the focus, a timer, a page
  opened) and needs no confirmation. *write* creates or changes a record: shown first as a card with its preview, run
  only on Do it (the card's Not now declines); declined, the colleague is told it was declined.

### The capabilities

| Kind | Capability | What it does |
|---|---|---|
| read | `find` | finds a line, machine, project, problem or study by name |
| read | `line_state` | a line's state as its page says it — its problems, programs, tools in use |
| read | `list_problems` | the register's problems, by line, project or priority |
| read | `overdue_actions` | what is late, and who owes it, as Actions reads it |
| read | `project_state` | a project's method, where it is, what is owed |
| read | `story_state` | the Story — the brief, its asks, the four figures, the chapters |
| read | `list_calculators` | the calculators there are and what each needs |
| read | `run_calculator` | a calculator's own sums on given figures — its sentence and figures, nothing kept |
| read | `tool_records` | a tool's records on a line or project and what each found, in the tool's own sentence |
| read | `tool_catalogue` | the tools a conversation can fill — SMED, the calculators, the documents, the check logs, the registers ranked from boxes — and one tool's fields |
| read | `draft_state` | what a draft holds: each field with how it is known (and what a correction replaced), what is missing, a custom sheet's metrics as code works them |
| local | `set_focus` | makes a thread the current subject |
| local | `park_focus` | parks the current thread to come back to |
| local | `record_observation` | a note on the current thread, saying how it is known |
| local | `start_timer` | a timer on the device |
| local | `open_page` | opens a page of the app |
| local | `start_draft` | a draft of an existing tool on the conversation — never a record until made (A) |
| local | `fill_draft` | values as said, each checked against its field, with how it is known; a correction keeps what it replaced |
| local | `adapt_draft` | fields added to this record only, or its own optional ones left out (B) |
| local | `create_sheet` | a custom sheet of sections, fields and code-worked metrics (C) |
| write | `raise_problem` | raises a problem on the register, on its line |
| write | `update_problem` | changes a problem's words, owner, due day, priority or state (never deletes) |
| write | `start_project` | starts a project of one of the eight methods on a line |
| write | `save_calculation` | keeps a calculator's figures as a record |
| write | `add_photo_to_problem` | puts a photo from the conversation on a problem |
| write | `make_record` | a draft made a record through the tool's own New — or, made already, updated with only what the conversation changed |

A new capability is added in `src/capabilities` with its schema in `schemas.ts`, its unit tests and its card's
wording. It is built on the functions Manual Mode already uses — never a second data model.

## 4. The loop and the gateway

The client sends `supabase.functions.invoke('assist', { body })` with `task: 'colleague'`, the turns so far (photos
labelled P1, P2 and sent as small JPEGs, as Line Talk does), the threads as text (`focus`), today, and — after running
calls — `pending`: the colleague's previous message (opaque) and what each call gave.

The gateway answers `{ ok: true, reply, calls?, assistant?, suggestions?, unsure?, model }`, or `{ ok: false, why }`, or
`{ off: true, why }`. If there are calls, the client runs the reads and locals at once, shows each write as a card,
and sends again with `pending` — until a reply with no calls, at most six rounds, after which it says so.

On the server the gateway: answers only a signed-in person; keeps the allowance (`ASSIST_COLLEAGUE_DAILY_CALLS`, 120
a day, $8); **refuses any call whose name is not in the schemas or whose input fails them** — the call is dropped and
the model told; writes an audit row to `ai_actions` (service role) for each call proposed and each result received.
The model is `TALK_MODEL`, low effort for chat, Claude tool use with the schemas, the instructions cached. The
instructions (`COLLEAGUE_SYSTEM`, `src/tools/colleague/colleagueAssist.ts`, copied to the gateway by
`scripts/sync-assist.mjs`) make it the manufacturing colleague: natural, challenging an assumption, one useful
question back, saying how each thing is known, never inventing or working out a figure (it uses the calculator
capabilities), asking before writing anything, moving the focus when the subject changes, citing what it read.

## 5. Security at four points

1. **The gateway** — a signed-in session; every call checked against the schemas; the audit written by the server,
   never the client.
2. **The capability** — the input validated; the person's access checked as the screens check it; a write run only
   when confirmed.
3. **The database** — row-level security decides last, whatever the client or the model says. A client's rows are
   never pushed (`src/cloud/sync.ts`).
4. **The context** — what is sent is scoped to the current conversation and its threads; nothing of another person's
   conversation is sent.

`supabase/AI_ACTIONS.sql` (additive; applied by the owner with its read-back): `ai_actions(id, user_id, at,
conversation_id, call_id, capability, kind, input, status in ('proposed','refused','done','failed','declined'), says)`
— row-level security on, a person reads their own rows, nobody signed in may insert, change or delete one.

## 6. The conversation, its threads and how each thing is known

A conversation is a `studies` row of tool `talk` — no new table and no new tool name — with `facts.colleague: true`,
`facts.turns` (Line Talk's `TalkTurn`: typed, said, photo, reply), `facts.threads` and `facts.actions`:

```ts
threads: { id: string; title: string; status: 'current' | 'parked' | 'closed';
           scope: { lineId?: string; projectId?: string; problemId?: string; storyId?: string };
           notes: { id: string; text: string; how: HowKnown; at: number; photo?: string }[];
           refs: CapRef[]; at: number }[]
actions: { callId: string; name: string; title: string; status: 'done' | 'declined' | 'failed'; says: string; refs: CapRef[]; at: number }[]
```

One thread is current; a subject left for later is parked and comes back with a tap or a word. Every note says how it
is known — observed, reported, measured, calculated, hypothesised, verified or unknown — and **only a person sets
verified**. Line Talk's own screen and its `talk` task are unchanged; AI Mode reuses `tools/talk/hearing`,
`talkPictures` and the `TalkTurn` shape.

## 7. Voice

In: the phone's own speech recognition (`tools/talk/hearing`), the words in the box as they are said, as in Line
Talk. Out: the phone's own voice (the browser's speech synthesis) — no new speech provider. A conversation keeps
listening while the screen is on, not when the phone is locked. A native wrapper is built only if field-testing shows
the browser cannot do what the floor needs.

## 8. Cost

A router puts native first: what a capability or a page answers is answered without a model where it can be. The
gateway's allowance caps a person's day, and every call is logged to `assist_usage`. Before a budget is set we measure
the cost per turn and per task, how well the cached instructions are reused, and how fast the context grows over a
long conversation.

## 9. Memory and learning

- **Project intelligence is the records** — problems, studies, actions, the Story. The colleague reads them; it keeps
  no second copy.
- **Personal** — how a person likes to work — is a preferences record, later.
- **Technical** — the methods and the industry — is `knowledge/`.
- **A task done often** may be proposed as a new native capability, and becomes one only through review: the tool
  standard, its tests, the gate and Rowland's approval. Recording a conversation is not training, and retrieving a
  record is not learning.

## 10. The brief

The Story's brief (`docs/STORY.md` §7, S6–S9) is uploaded, read into text in code where it can be (pdf.js, mammoth) or
by the gateway (task `brief-read`, a photo or an image-only PDF, the words shown to approve), and split into asks
(task `brief-asks`, three to eight, each quoting the brief, approved line by line). `story_state` gives the colleague
the brief, its asks and what has been found, done and proved against each, so it can say where the engagement stands
against what was asked. No brief is never a stopper.

## Building tools in conversation (A · B · C)

Rowland, 8 November: *"The conversation itself should become the mechanism through which the application is populated …
A. Populate existing tools — select an existing template or study and populate it through conversation. B. Adapt
existing tools — add fields, questions, metrics, categories or sections. C. Create new tools and documentation —
construct new working studies, documentation, data capture structures, metric definitions and reports based on what I
describe … I must be able to add information, correct something I said, change direction, return to an earlier
investigation, ask what has been captured, ask what is still missing, ask it to organise or restructure the study, and
continue without starting again … The AI must not invent measurements … Calculations by Faultline's deterministic logic
… validated and saved through controlled application functionality … show me what it has understood and populated, and
confirm before committing."* The rule is `docs/DIRECTION.md`'s fifth.

**One mechanism, every shape.** A **draft** lives on the conversation (`facts.drafts`, `src/capabilities/types`
`ColleagueDraft`): its kind and key, its name, its line and project (the current thread's unless said), its values —
each `{ value, how, said, at, earlier[] }` — the fields added to this record, the structure of a custom sheet, and,
once made, the record's id and the values as they were made. `src/capabilities/drafts.ts` is pure:

- **The field map is read from the definition, never copied by hand** — a calculator's inputs (`tools/calc/defs`: label,
  unit, kind, range; needed unless optional, money or given a starting point), a document's sections, boxes and lists
  (`tools/doc/defs`; photos stay the page's), a check log's per-log settings and its starter checks to leave out
  (`tools/checks/defs`), a register's rows with the boxes its definition asks (`tools/scored/defs` ranked from boxes — a
  matrix or a register of cards is filled on its page), SMED's small map onto the changeover record (the minutes now,
  reported; the minutes it must come in at; how many machines and products and their names when said; the elements by
  name, a time only when said; the two products; notes), and a custom sheet's own structure. A new definition joins
  with no change here.
- `fieldsOf`, `captured`, `missing` (a log or a register also needs its line); `fillDraft` checks each value against
  its field — a number in range in the field's unit, a choice by its value or its words, a day as YYYY-MM-DD, a list's
  rows by their columns (one row adds, an array replaces) — refuses *verified*, and keeps a corrected value beside its
  replacement; `adaptDraft` adds fields to this record only and never takes off one the tool needs.
- `toRecord` makes **exactly** what the tool's New makes — `newCalcStudy`, `newDocStudy`, `newLogStudy`,
  `newScoredStudy`, `newChangeoverStudy` (the calculator's and SMED's lifted out of their screens, which now call them)
  — with what was said written in by `applyDraft`. What a tool has no box for goes into its notes in words with how it
  is known (SMED's minutes now, its machines; a field added to a calculator or a document); on a check log a field added
  is a check added to the list. **Made again**, only the fields the conversation changed since are written — what was
  edited in Manual Mode stays.

**C — a custom sheet** is a document (`agreed.doc.def = 'custom'`) whose sections, boxes and metrics are kept on the
record itself (`facts.customDef`); `tools/doc/custom` `docDefOf` turns it into the definition the document shape reads,
so its page, list (`#/doc/custom`), paper, rename and delete are the documents' own — the one additive step, and why: a
definition file is code and a custom sheet must never be. Its **metrics** are one of five kinds — sum, average, ratio
(a unit of "%" makes it a percentage), difference, count — over named boxes (a list's number column as
`list.column`), worked out by `metricValue`: no expression string, no eval, never a figure from the AI; a metric that
cannot be worked out says which box it waits on.

**The capabilities** (`src/capabilities/build.ts`): `tool_catalogue` and `draft_state` read; `start_draft`,
`fill_draft`, `adapt_draft` and `create_sheet` are local — they change only the conversation's draft; `make_record` is
a write — its card says what will be made with what, nothing is written until Do it, and a client is refused before
any card. The gateway's instructions (`COLLEAGUE_SYSTEM`) say: offer the tool in a sentence and start only on yes; fill
as the person talks, every value exactly as said with how it is known, never a value not given and never a figure
worked out; a correction is the same field again; one missing field at a time; `draft_state` for "what have we got";
`adapt_draft` for "we also need …"; a custom sheet proposed in words and built only on yes; `make_record` offered once
the essentials are there, and never said to be saved until the result says so.

**On the screen** the context (and the phone's sheet) shows **Being built** — each draft with its fields, how each is
known, a correction's earlier value struck, a custom sheet's metrics, **Still missing** as chips that start the
sentence in the box, and **Make it** (the same preview and the same `runCall` as the colleague's card) — then *Update
the record* and *Open it ›*. `scripts/acceptance/ai-build.mjs` proves it.

The gateway carries the new schemas and instructions (`node scripts/sync-assist.mjs` copies them); **the `assist`
function must be redeployed** for the colleague to use them.

## 11. Rollback

- AI Mode has a switch on each device; off, `#/ai` says so and Manual Mode is untouched.
- `ASSIST_COLLEAGUE_ENABLED` on the server turns the `colleague` task off for everyone (`{ off: true, why }`).
- `ai_actions` is an additive table; nothing else in the schema changes.
- Each slice is its own commit and can be reverted on its own.

## 12. Not built yet

- **Always listening** — a conversation that hears with the screen off or the phone locked.
- **A native wrapper** — only if field-testing shows it is needed.
- **Semantic search** — no embedding provider without Rowland's word; `find` reads names.
- **Computer vision** beyond the video study's *Name the work from the frames*. The video study's motion reading is
  the foundation; a spaghetti diagram from video needs a person tracked and the floor calibrated, and rules for
  consent and how long footage is kept, before anything is built.
