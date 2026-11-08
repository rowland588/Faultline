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
| local | `set_focus` | makes a thread the current subject |
| local | `park_focus` | parks the current thread to come back to |
| local | `record_observation` | a note on the current thread, saying how it is known |
| local | `start_timer` | a timer on the device |
| local | `open_page` | opens a page of the app |
| write | `raise_problem` | raises a problem on the register, on its line |
| write | `update_problem` | changes a problem's words, owner, due day, priority or state (never deletes) |
| write | `start_project` | starts a project of one of the eight methods on a line |
| write | `save_calculation` | keeps a calculator's figures as a record |
| write | `add_photo_to_problem` | puts a photo from the conversation on a problem |

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
