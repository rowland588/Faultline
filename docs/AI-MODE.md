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
| read | `recall` | searches the earlier conversations (AI Mode's and Line Talk's) in code — never across clients (§9) |

| read | `factory_map` | the client's sites › areas › lines › machines, each machine's kind, model and serial with how each is known — only the client of the line or project in hand (docs/FACTORY-KNOWLEDGE.md F2) |
| read | `resolve` | words the person said ("the scales", "line two", "packaging") into one, several or none of the client's lines, machines, areas or sites — used before acting on anything named; none is said, never assumed |
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
| local | `add_to_factory_draft` | a client's sites › areas › lines › machines as said, into the conversation's factory draft — add, set, rename, move, remove, keep or leave out a document's proposal, pick recorded or new; never invents, a machine always on a line (docs/FACTORY-KNOWLEDGE.md F3) |
| write | `raise_problem` | raises a problem on the register, on its line |
| write | `update_problem` | changes a problem's words, owner, due day, priority or state (never deletes) |
| write | `start_project` | starts a project of one of the eight methods on a line |
| write | `save_calculation` | keeps a calculator's figures as a record |
| write | `add_photo_to_problem` | puts a photo from the conversation on a problem |
| write | `remember_preference` | adds a line to the person's own How I work (§9) — a card saying exactly what will be added |
| write | `make_record` | a draft made a record through the tool's own New — or, made already, updated with only what the conversation changed; a factory draft made as its lines (`addLineToFactory`, client · site · area) and machines (`machineOntoLine`, `setMachineIdentity`, how each is known), matched not doubled, held while a document's proposal waits or a difference is unpicked |
| write | `replace_machine` | a machine on a line replaced: the new record in its place, the old kept with Replaced by and how that is known (F5) |

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
The model is `COLLEAGUE_MODEL` (`ASSIST_COLLEAGUE_MODEL`, Claude Opus 5.5 — the most judgement of any task; see docs/STATE.md, the model for each task), low effort for chat, Claude tool use with the schemas, the instructions cached. The
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

### On the floor — Phase 4 (8 November)

Rowland walks a factory with a Bluetooth headset, the phone in a hand or a pocket, and talks. **The honest limit: a web
page cannot listen with the phone locked or Faultline out of sight**, and the page says so (`FLOOR_LIMIT`). What the web
platform allows is built in `src/colleague/floor.ts`, each part detected and said in words where the phone does not
offer it; the parts that touch the phone take an `env` so the tests hand them a fake one.

- **Conversation** (More ▾, a device setting) is the session. While it is on: after each reply is spoken the
  microphone opens again — only when the reply was said **to the end** (`reopenAfterSpeech`; a reply cut short by
  typing, Send, a tap or a press opens nothing — `speak` tells `finished`), and Speak replies is turned on with it.
- **Screen kept on** — the Screen Wake Lock (`ScreenKeeper`) held while Conversation is on, taken again on
  `visibilitychange` when Faultline is back in sight (a phone lets it go when the page is hidden), let go when
  Conversation ends. A line under the header says *Screen kept on*, or *This phone will not keep the screen on — keep
  it awake yourself*.
- **The headset's button** — the Media Session API (`HeadsetButton`): `play`, `pause`, `nexttrack` and `previoustrack`
  (each where offered) are one press; a silent looping sound (a WAV of zero samples made in code, `silentWav`) makes
  Faultline the phone's media for the moment, stopped and the handlers cleared when Conversation ends. A press
  (`pressAction`): listen; while listening, stop and **send** what was heard (only stop when nothing was heard or
  Faultline is working); while a reply is spoken, stop it and listen; while a card waits, open the microphone for the
  answer; otherwise nothing, said. The line under the header says *Headset button: press to talk, press again to send*,
  *tap the screen once to wake it* (a phone that wants a touch before a sound may play — the next touch wakes it), or
  *This phone does not pass a headset's button to a web page — tap the microphone*.
- **Listening, seen and heard** — *Listening…* with a pulse drawn in CSS (no second microphone stream, no level
  meter), the words so far in the box; *Speaking…* with *Stop and talk*; a short tone (120 ms, quiet, WebAudio —
  rising as listening starts, falling as it stops), switchable as **Sounds** in More ▾ (`faultline.aiEarcon`, on by
  default).
- **Barge-in** — words heard while a reply is spoken stop it at once (`shouldBargeIn`, cancelling the speech); a press
  or a tap of the microphone does the same. The microphone is not held open while Faultline speaks — on a loudspeaker it
  would hear itself — so on the floor barge-in is the button.
- **Hands-free confirm** — while a write card waits and Conversation is on, the colleague says what it has said so far
  and the card's sentence, ending **"Shall I do it?"** (`cardPrompt`), and the microphone opens. The words said back
  are matched **in code**, never by the model, on a strict list of whole phrases (`spokenAnswer`, case and punctuation
  aside): **yes, do it · do it · go ahead** confirm; **no · not now** decline; anything else — "yes", "do it later",
  "go ahead and check the wrapper" — answers nothing and says which words do. The card then shows **Said: yes, do it**
  (`Used.said`, kept on the turn). The rest of the reply after the card is spoken without repeating what was said
  (`unspoken`).
- **Before you walk the floor** (More ▾) — run when asked (`floorCheck`): microphone allowed (the permission, else the
  microphone opened for a moment), speech recognition present, a British voice present (naming the voice it would use),
  the screen kept on (a lock taken and let go), the headset button (the media session offered) — each yes or no in a
  sentence with what to do, and the limit above.

**Needs a real phone to prove** (no script can): the wake lock holding on Android Chrome and iOS Safari; a Bluetooth
headset's button reaching the page through the silent sound — and whether the phone's speech recognition taking the
microphone pauses that sound and hands the button back to another app; the tone being audible and short in the
headset; a British voice on the device.

## 8. Cost

A router puts native first: what a capability or a page answers is answered without a model where it can be. The
gateway's allowance caps a person's day, and every call is logged to `assist_usage` — read back on `#/ai/usage` (§9). Before a budget is set we measure
the cost per turn and per task, how well the cached instructions are reused, and how fast the context grows over a
long conversation.

## 9. Memory and learning

Three kinds of memory, each kept where it already lives — none of them a model's.

- **Personal — How I work** (built 8 November, phase 5a). The person's own words in four boxes: *The words I use* ("the
  line" for a production line, the CW for the checkweigher, a machine's nickname), *How I like to work*, *How I like a
  report*, *Always remember* — at most 1,900 characters in the boxes, 2,000 with their labels. Kept on the profile
  (`profiles.preferences`, written only through `set_my_preferences`, security definer, the caller's own row —
  `supabase/PREFERENCES.sql`, the shape of `BRAND.sql`) and cached on the device (`lib/preferences`, read from the
  profile by `cloud/admin` useProfile; a profile read before the column exists leaves the device's copy alone). Typed in
  the **How I work** sheet (`ui/PreferencesSheet`) from the account menu and from AI Mode's More ▾; or added a line at a
  time when the person says "remember I call the checkweigher the CW" — the colleague proposes `remember_preference`, a
  **write**: its card says exactly what will be added and under which box, and nothing is kept until Do it. The colleague
  is sent it with every question (`preferences` on the request; the gateway's `readColleagueAsk` holds it to 2,000
  characters and `colleagueMessages` puts it after the newest turn, beside the threads, as *HOW ROWLAND WORKS — his own
  words; follow them unless they conflict with the rules*). It is what he told it, never a fact about a factory, and
  Manual Mode never reads it.
- **Project — the records, and recall.** Problems, studies, actions, the Story: the colleague reads them through the
  capabilities and keeps no second copy. What was *said* is the conversations themselves — AI Mode's (`talk` studies with
  `facts.colleague`) and Line Talk's — and **`recall`** searches them in code (no model, no index): each subject's title,
  its notes with how each was known, the person's own turns, and Line Talk's turns, scored by the search box's own
  `matchScore` (`lib/jumpTo` — a real match, never scattered letters; for a question with other words, the words of
  three letters and more that matter), best first and newest first among equals, each with its day, its conversation
  and a link to open it (`/ai?c=<id>`, or the Line Talk). **Never across clients**: when the conversation in hand is on
  a line (its current subject's line or project), only conversations about that client's lines come back — a subject on
  another client's line is left out, a conversation's turns only when every line it touched is this client's — and a
  conversation about no line is the person's own and comes back. The conversation in hand is never searched. The
  colleague is told to use it whenever the person refers back ("what did we say about…", "last week").
- **Technical — the methods and the industry** — is `knowledge/` and the calculators (`list_calculators`,
  `run_calculator`): the figures are always theirs.
- **Recording is not training.** Nothing said in AI Mode or Line Talk changes a model, and retrieving a record is not
  learning. **A task done often** may be proposed as a new native capability, and becomes one only through review: the
  tool standard, its tests, the gate and Rowland's approval.

**Learning — built 8 November (phase 5b), `#/ai/usage` (`src/screens/AiUsageScreen.tsx`).** Rowland: *"when we ask to
do something in the app, we learn what was done and we actually want to replicate it with code as much as possible —
this keeps AI costs lower and the app becomes more intelligent over time"*; and *"nothing should automatically become
production code … recording conversations is not the same as training a model."*

- **What is recorded** — nothing new. The gateway already writes `assist_usage` (every answer: task, model, tokens,
  cost in millionths of a dollar, read or not) and `ai_actions` (every call proposed, refused, done, failed or
  declined); the conversations are the `talk` studies on the device. A person reads only their own rows (RLS).
- **What is measured** (`src/colleague/usage.ts`, pure, tested) — answers and cost by task and by day over 30 days,
  an answer's cost, today against each task's allowance (the gateway's defaults), and a colleague request's cost only
  where the device holds the requests (said as at most — `assist_usage` has no request id, so answers from another
  device are in the cost and not the count). Money in dollars as the gateway prices it; pounds only when
  `VITE_USD_TO_GBP` is set on the build — never a guessed rate.
- **What is found** (`src/colleague/learning.ts`, pure, tested on hand-built rows) — the same capability steps in the
  same order (locals left out), the same calculator by key, the same question (its words normalised), each three times
  or more in 30 days; and a write declined more often than not (the colleague proposing it wrongly). Each is said in a
  sentence with its count and evidence and a native home: a page, a saved view, a calculator's kept figures, a new
  capability, or the colleague's instructions. **Copy as a note** is the only action.
- **How a candidate becomes code** — by a person: it is written up as a proposal, built through the tool standard
  (`faultline-tool` and `knowledge/STANDARD.md` for a tool; `src/capabilities` with its schema, its tests and its card
  for a capability), proved by its tests and the gate, and shipped only on Rowland's approval. Nothing on the page
  writes, and nothing is ever turned into code by itself.

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
the record* and *Open it ›*. `scripts/acceptance/ai-build.mjs` proves it. A **factory** being onboarded is a draft of its own kind
(docs/FACTORY-KNOWLEDGE.md §6¾): a tree of sites, areas, lines and machines, filled by `add_to_factory_draft`, read from a document
uploaded with the box's document button (the gateway's `factory-read` task where code cannot read it), and made by `make_record`;
`scripts/acceptance/factory-onboarding.mjs` proves it.

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
- **Semantic search** — no embedding provider without Rowland's word; `find` reads names and `recall` reads words.
- **Computer vision** beyond the video study's *Name the work from the frames*. The video study's motion reading is
  the foundation; a spaghetti diagram from video needs a person tracked and the floor calibrated, and rules for
  consent and how long footage is kept, before anything is built.
- **Video intelligence (Phase 6)** — a spaghetti diagram and time and motion from a fixed camera: designed in
  `docs/VISION.md` (on-device person tracking, a floor homography, consent and retention, slices V1–V5); not built.

## Understanding the app and where work belongs (9 November)

Read `docs/AI-CONTEXT.md`: the application model (`src/capabilities/appModel.ts`), `describe_faultline`, `plan_work`, `resolve_record`, `update_context` and `link_to_project` (`src/capabilities/understand.ts`), a subject's aim and kind of work (just talk · standalone · in a project), the duplicate checks and the destination on every card. `scripts/acceptance/ai-context.mjs` proves the twelve journeys.
