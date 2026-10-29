# The direction — 20 October

Read this before anything else. It overrides every earlier document where
they disagree (docs/AI-VISION.md, docs/PLATFORM-REVIEW.md, docs/VIEWS.md and
the "new product" passages of docs/BLUEPRINT.md §3 are history now).

## What happened

From 18 October Faultline was being turned into an AI platform: describe any
need in words and the assistant designs a method, its forms, its tools and
its checks, and the app runs it. Rowland, 20 October, after a critical review:

> "That's massively complex to do ... right now you're making the fishbone ...
> but the AI should have made that ... I just don't think we're going to get
> there ... in manufacturing, Lean and Six Sigma and industrial engineering
> tools are required and useful. What's hard is the calculating bit ... then
> usually you just want to be able to put whatever you find into some sort of
> project and just drive through to the actions."

> "I think possibly the AI itself is just not required ... the whole AI thing
> coming in at the moment and build your own is pointless. It's almost caused
> more friction than we actually want."

What the code showed (20 October): the method engine and its screens had
grown to about 11,400 lines (25 analysis blocks, 12 library methods) inside
an app of 124,000 lines and 69 screens; it was rebuilding what Faultline
already had (stage gate twice, the 6M twice, a second fishbone); and the
assistant's usage table was empty — no design had ever been asked for by a
real user. Every proof of it ran on recorded answers.

## What Faultline is

**For Rowland's team first; sold later.** So the measure of every change is
whether the team uses it on the line, not whether a market would admire it.

**29 October — Rowland, go:** **faultline.opexelevate.co.uk** is **fault-centric
Gemba CI** — faults on program, machine, area (or any combo), tools that
quantify, 6M for deep line performance, **programs and tests on the line** as
the prove loop. Full model: [`docs/FAULTLINE-FAULT-MODEL.md`](FAULTLINE-FAULT-MODEL.md).

**A manufacturing improvement system, built on the line.** Three parts:

1. **The tools** — fast, correct calculation on what people measure on the
   floor: Line capacity, the line balance, the line standard, SMED, the
   shift's losses, work sampling, capability, the value stream map, the
   stopwatch, the video study — and the filmed walk with its snags, where
   Faultline began.
2. **Two engines** (not three equal heroes): **Performance** — 6M + tools when
   a running line is off target; **Prove** — programs and tests on the line
   (pass/fail, criteria, re-test). **Installation project** (stored as
   `commissioning`) is optional gates/handover for rare formal installs —
   not the default promise. **Lever tree** is parked (hidden from New project).
3. **The control room** above them: problems, actions, who owes what by when,
   and the reports from records.

**What makes it different** (checked against Minitab Engage, SafetyCulture
and the video time-study tools, 20 October): not the number of tools — those
products have years on it. It is that **the line knows itself**: a line's
shifts, rates, crew and margin are set once and every tool reads them, so
every finding comes out in money without retyping; **prove on the line** with
programs and tests; and evidence → cause → action → proof on the same line's
numbers. **Commissioning narrative papers** (commissioning report, cards,
handover as the default client story) are **out of the default product** —
slice 1 hides them from Report ▾; see the fault model doc. Every change
strengthens the Gemba thread or it waits.

**Deep, not wide.** A tool earns its place only when it answers a question
the floor asks, gives the answer in a couple of minutes on a phone, reads the
line's facts instead of asking again, says the result in money, prints, and
has one door into a project. A new tool is added when a real problem on the
line needs it — never to fill a catalogue.

## The AI — one tool: Line Talk

Rowland, 20 October: *"Isn't AI a tool? ... I see it as being a tool rather
than a main driving function of the app."* So the AI is **one tool among the
others**, used when someone chooses to, never the app's driver and never a
builder of methods, templates or tools. That tool is **Line Talk**
(docs/LINE-TALK.md): one person talks on the line into their phone — the
words come up in the box as in a chat, then Send (21 October), photos — and
it remembers the whole talk like a chat,
and makes whatever is asked of it in words (a report, a summary for the
manager, an OEM's punch list, a one-point lesson), knowing the line as
Faultline holds it. The talk is kept, viewed like a chat and carried on
later. What it finds in what was said — problems, actions, figures — it
offers as cards a person adds; it never saves a record, never works out a
figure, never passes a gate.

Everything else is formulas: every calculation, and the sentences that say
what the figures mean. The voice note on a form stays as it is. Which of the
walk, the video study and the evidence actually call a model is
[`docs/ADVANCED-TOOLS.md`](ADVANCED-TOOLS.md) (29 October).

## The only AI: voice and the camera — 20 October, later the same day

Rowland: *"Are we removing the AI generation tool and report system? I think
we should — the only AI is the voice and the camera video system."* Asked
which pieces and how, he chose (20 October): **delete** the method builder,
*Better wording* and the AI answers in *Ask*; keep voice, the camera's AI and
Line Talk as designed (its reports included — not chosen for removal).

What the live database said first: 0 methods and 0 method records — the
builder was never used; nothing stored is lost.

| AI in the app | Decision |
|---|---|
| Voice — the voice note in typed boxes (`api/voice`) | **kept** — on Gemini, which hears it and fills the boxes |
| Line Talk hearing what is said | **the phone's own speech recognition** since 20 October ("Use the phone's own speech recognition instead of Gemini"; `tools/talk/hearing`, docs/LINE-TALK.md *How it hears*) — no AI service, no key; since 21 October it writes into the box, as a chat's dictation does, and nothing is recorded ("I see my words come up on the interface. I simply press send"; docs/LINE-TALK.md *The box, like a chat*) |
| The camera — the video study's *Name the work from the frames* (`assist` gateway, task `video-label`) | **kept**, shown again (it was parked) |
| Line Talk (docs/LINE-TALK.md), its slices as designed | **kept** — its answers and documents (slice 2) on Claude through the `assist` gateway, task `talk` |
| The method builder — *Describe what you need*, the design studio, the assistant's proposals and *Ask about it*, Methods of one's own and Faultline's library of methods, the method engine and a project on a method | **deleted** |
| *Better wording* under typed boxes (`api/wording`; asked for on 6 October) | **deleted** |
| The AI answers in *Ask* on the line and Line capacity (`ask` function) — the app's own answers, worked out by formulas, stay | **deleted** |

How it is taken out (in `main` only once the full gate passes):

1. *Ask*'s AI answers: `lib/askAi` and its call. The `ask` function had
   never been deployed (the server held `remind`, `share`, `assist` and
   `keycheck`), so its folder simply goes. `keycheck` — a diagnostic made
   for the builder's assistant that relayed requests to the API with the
   saved key — is redeployed refusing everything.
2. *Better wording*: `api/wording`, `lib/wording`, `ui/BetterWords` and the
   offer in every typed box (`ui/Draft`'s `better`); the voice note stays.
3. The method builder: `lib/flow`, `ui/flow`, `db/flow`, the Methods,
   Method, Design and method-project screens, the "own method" kind of
   project (`lib/planModel` 'flow'), its rows in the control room, its
   report, the steps that asked a tool for a study (the tools stay as they
   were before 18 October), its seeds, its four acceptance scripts
   (methods, methods-design, designed-tool, pack-weights — the features they
   proved are gone; nothing they proved about the tools is lost: the tools'
   own scripts stay) and the parked pages of the inventory; the switch
   (`lib/parked`) goes with it. The `assist` function keeps only
   `video-label`. The database's `methods`, `flow_records` and
   `activity_log` tables stay, empty and no longer synced — dropping them is
   a migration for another day, if ever.
4. The front door keeps its question, what is under way, the three kinds of
   change and the tools.

## What was parked (20 October) — deleted later the same day (above)

Off the screens behind one switch (`lib/parked` — *Show the parked builder
and assistant on this device*, at the foot of the front door); the acceptance
scripts turn it on, so what was proved stays proved:

- *Describe what you need* — on the front door, the control room and New job;
- the design studio (`#/design`), its clarifying questions and proposals;
- Methods of one's own (`#/methods`) and Faultline's library of methods —
  "build your own", by hand or by the assistant;
- the assistant's *Ask about it* and its proposed changes on a method's
  project;
- the video study's *Name the work from the frames*.

(Not built yet: the switch exists and only the front door reads it — the
work stopped on 20 October so the design could be agreed first.)

A project already running on a method keeps running and opens as before.

On the session branch (`claude/faultline-connection-1vx7kt`), never merged:
`86ed965` the assistant designing in two passes (deployed to the gateway as
version 8, 19 October — it stays deployed, unused), `bcfc1d6` the server
re-reading every gate pass (`supabase/GATE_CHECKS.sql` never applied),
`a44e700` views and links in the method engine, `376c486`/`aebac56` the
views' data, half-built. The assistant's key stays saved in Supabase until
Rowland revokes it.

## What comes next, in order

**Fault moat slice 1 is live on `main` after 29 October go** — docs, New project
(Performance first, lever tree hidden), commissioning narrative papers demoted
in menus. Slice 2: fault record, routing, legacy paper cleanup.

Earlier sequence (still true where not superseded):

1. ~~Park the builder and the assistant behind the switch~~ — done, then
   **deleted** the same day at his word (above): the builder, *Better
   wording* and *Ask*'s AI answers.
2. ~~The filmed walk reachable from a line's own page~~ — done: *Film the
   line* on the line's page.
3. Line Talk (docs/LINE-TALK.md): slice 1, record and keep, is built; slice
   2, ask it — the conversation answered by Claude through the gateway, with
   the line's records, photos and documents on paper — built on his go the
   same day ("a simple, reliable, ChatGPT-style manufacturing assistant
   inside Faultline, powered by our existing Claude API integration"); and
   its hearing moved off Gemini onto the phone's own speech recognition at
   his word the same evening; and on 21 October its box made a chat's — talk,
   the words come up in the box, Send — the recorder taken off at his word,
   and then a conversation, not a form: it talks back as a colleague does,
   asks him back and builds on his answers, its reply appearing as it is
   written ("like I do with you here, we ask questions to each other in
   natural language, none scripted" — on screen, like this chat, his choice).
   Next, Rowland tries it on his phone on the floor — how well the phone
   hears in the noise, and whether his phone's browser listens or the
   keyboard's microphone is the way in.
3b. **The project is the workspace** (docs/PROJECTS.md — agreed 21 October,
   go given): one word, *project* (*job* goes); open a project and the app is
   that project, its tools inside it, everything done there landing in it;
   every project's **Actions** — the team's action tracker, who is doing
   what, why, by when — and the same across every project in the control
   room. The factory stays shared; work with no project stays on its line.
   Built in four slices (P1–P4), each live on its own.
4. Use Faultline for real for two or three weeks on Rowland's lines with his
   team; write down every place it is slow, confusing or missing.
5. Then deepen the tools that were used, close the evidence → cause → action
   → proof thread where it breaks, and add a tool only when a real problem
   needs one.
