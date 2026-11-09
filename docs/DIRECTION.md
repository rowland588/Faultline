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

## 31 October — Faultline is an operational improvement system; a project is one part of it, and a project is a method

**What it is — Rowland's correction, 31 October, the same day:** *"operational improvement system, not a project management system … the projects are just one part of the process. The real product is the complete improvement lifecycle: identifying opportunities, diagnosing problems, applying methodologies, organising delivery and verifying results."* Faultline is **not** a project-management system and is never described as one on a screen, a paper or the landing page. **The brand (31 October, Rowland):** product **Faultline**; parent brand **Opex Elevate**; descriptor **The Operational Improvement System**; domain **faultline.opexelevate.co.uk**. The landing page, the page title and share preview (`index.html`, `public/og.png` by `scripts/brand-assets.mjs`), the install name (`vite.config.ts`) and `public/llms.txt` say it; the company is written *Opex Elevate*, never *OpEx* or *OPEX Elevate*. Its lifecycle, and where each part lives: **identify** opportunities (the Factory board, the line's losses, the problems register) · **diagnose** problems (the technical tools — capability, reliability, capacity, losses, analysis, root cause) · **apply** a methodology (the eight methods below) · **organise** delivery (projects, actions with who and by when, programs and tests on the line, the journey) · **verify** results (a before and after on the same number, every finding in money, the papers). A project is the *delivery* part, no more.

Rowland, 31 October, on the methods: *"the method equals the project … build the
methods first … and we simply insert the tools where required."* His earlier wording that day ("a project management system that provides the essential tools to understand the line's faults … the technical tools and the process to solve the problems") is superseded by the correction above.

So (the map is [`docs/METHODS.md`](METHODS.md); where an older document
disagrees, this wins):

- **A project is a method.** There are eight, agreed 31 October: **PDCA · DMAIC ·
  8D · A3 · Stage gate · Kaizen event · Improvement Kata · Theory of
  Constraints**. A method fixes the project's sections, in order; each section
  has default tools from the catalogue, and any tool can be added to any section.
- **6M is a tool, not a method** — the fishbone with evidence on each cause, the
  five whys and the countermeasure board, used inside the methods' cause-finding
  sections. "A project is a 6M board" is history.
- **Stage gate comes back as one of the eight.** The 29–30 October decision
  (New project offers Performance (6M) only; stage gate demoted) is superseded
  once the build reaches New project (slice M3). Until then the app is as built.
- **The methods are fixed and ours** — shipped in code, picked by a person. Not a
  method builder; nothing is built by an assistant (the 20 October rule stands).
- **The tools follow the methods.** What is built next is read off
  `docs/METHODS.md` §11 (the pathway), not the old wave order alone.
- Built in slices M0–M5 (METHODS.md §12): the record in the repo · the methods as
  data · the project's `method` field · New project and the sections · stage
  gate's doors · the tools.

## The AI may operate Faultline — 8 November

Rowland, 8 November: *"We are building intelligence around the application I have, not building another application
around the intelligence … The AI must not simply answer questions. It must be capable of using the actual
application."* Faultline has **two modes over one application**: **Manual Mode** — the application as built, complete
and needing no AI — and **AI Mode** — a conversation, typed or spoken, in which the AI **operates Faultline through
approved capabilities**: typed, tested operations in `src/capabilities/`, built on the same data functions, tool
modules and report makers Manual Mode uses, each with validated inputs, a defined result, a permission check, error
handling and an audit record.

1. **The AI acts as the signed-in person, never as more.** Every capability checks the person's access as the screens
   do, and the database's row-level security remains the final authority.
2. **Reading is free; writing is confirmed.** Anything that creates or changes a record is shown first and done only
   when the person confirms — automatic confirmation may later be switched on capability by capability, only at
   Rowland's word.
3. **The AI never deletes a record and never marks evidence Verified.** Every item it records says how it is known —
   observed, reported, measured, calculated, hypothesised, verified or unknown — and only a person sets verified.
4. **The AI never works out a figure.** Sums are the calculators' and the tools' modules', as in Manual Mode.
5. **The AI may populate, adapt and create working records** — a tool filled from the conversation, fields added to
   one record, a custom sheet of sections, fields and code-worked metrics — always as a draft shown with how each value
   is known, saved only when the person confirms, through the same functions Manual Mode uses; it never changes the
   app's code, its tools' definitions or its methods, and a repeated pattern becomes native code only through the tool
   standard, its tests, the gate and Rowland's approval. Rowland, 8 November: *"The conversation itself should become
   the mechanism through which the application is populated … A. Populate existing tools … B. Adapt existing tools —
   add fields, questions, metrics, categories or sections. C. Create new tools and documentation — construct new
   working studies, documentation, data capture structures, metric definitions and reports based on what I describe …
   The AI must not invent measurements … Calculations by Faultline's deterministic logic … show me what it has
   understood and populated, and confirm before committing."* (It replaced "the AI never builds methods, templates or
   tools", the same day; `docs/AI-MODE.md`, Building tools in conversation.)
6. **Claude only, through the `assist` gateway** — the key on the server, an allowance a person a day; no new AI,
   speech or embedding provider is added without Rowland's word.
7. **AI Mode is switched off without touching Manual Mode**, and Manual Mode never waits on it.

**The AI is Luna (Rowland, 10 November — "This is now the permanent AI identity for Faultline: Luna").** Faultline is the
operational improvement system; Luna is its AI colleague, in AI Mode and in Line Talk — her name in the instructions Claude is sent,
not only on the screen (`docs/AI-MODE.md`, Luna).

The design is [`docs/AI-MODE.md`](AI-MODE.md).

## The AI — one tool: Line Talk

*Superseded in part, 8 November (above): the AI may now operate Faultline through approved capabilities. Line Talk
stays as built and its engine is reused by AI Mode; "never works out a figure" and "never a builder of methods,
templates or tools" stand.*

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

*History: since 8 November the AI also drafts the Story's chapter (S3), reads and splits a client's brief (S6–S7) and
operates Faultline in AI Mode. The deletions recorded here stand.*

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

## How a tool is really used — 8 November

Rowland, 8 November, the scenario: *"The site director says to the user, go into that area and find out why we are losing so much
output ... Nobody knows what's going on. So the user goes to the area, they open up the app ... the line, what they're looking at,
and then they go, right, as I stand here observing, what tools do I have available to show this is what's happening? I can see over
there that people are stopping. I can see over there that machines are stopping. I can see over there that material's not good ...
I can see machines that are broken."* And: *"sometimes you get told ... I want to go do a SMED activity ... a process flow map ...
value stream mapping. So, of course, these tools are also very much independently"*; *"observing, using the tools to gather
information, which then make reports, which then ... we can start building actions"*; *"when I say root cause, I don't mean
everything needs to go down a fishbone ... We can't tie everything into a linear approach ... Sometimes it's about just discovery.
Sometimes it's about quantification and saying, look, these are our problems ... where we're losing ... why we're losing. Doesn't
necessarily always lead to do a root cause analysis."*

So, for every design from here:

1. **Two ways in, both first-class.** *At the line, observing* — the line open, the question "what am I seeing?" (people stopping,
   machines stopping, material not good, a machine broken, people walking, product waiting …) answered with the tools that show it;
   and *by name* — "I'm here to do a SMED", straight to the tool, alone or on the line. Neither goes through the other.
2. **Not a funnel.** Discovery, quantification, a report and actions are each an end in themselves. Root cause (6M, the five whys,
   a fault tree) is offered when it is wanted, never the step the app pushes everyone towards.
3. **Gather → report → act.** What was gathered on the line becomes the line's report (the one-page, the summary, the full package)
   and its actions, from wherever the tools were used, in whatever order.
4. **The user is the person observing** — a consultant or an engineer in the area, one person or a few, not the operators.

**The same day, after a "What are you seeing?" chooser was proposed — no chooser, and nothing locked.** Rowland: *"I'm not after a
redesign of the app ... we don't have to structure the app into ... ask the question, what are you here for? ... It's just using
them categories ... As long as ... the tool needs enough information, as in description, next to it, for the user to understand this
tool will help me do this. In plain English"*; *"if we've got calculators in there that are obviously hidden that's not the
purpose"*; *"If they're doing a DMAIC ... if they want to jump to measure, it's up to them ... We don't lock them in. If we lock
anybody in on anything, it loses its power"*; *"You see a tool ... link that tool ... I'm going to use these three tools within
this area ... all the reports become synchronized ... you can remove, you can put them back ... adaptable, agile, fluid. It's not
constraining anybody."* So: the tools stay in their categories; each says in plain English what it will help you do; a tool hidden
inside another (the calculators that are tools in their own right) comes out; no method, step or gate ever stops a person doing
another first; any tool is linked to a line or a project, taken off and put back, and every report reads what is linked.

## Faultline is Rowland's own consultant's tool — 8 November (real, not a scenario)

Rowland, 8 November: *"Until I say differently, fault line is for me. I'm a consultant. It is for me to go into businesses and operate
efficiently and wow them with how I do my job. It's a tool for me ... everything you see right now in Faultline is actually a live
client ... I've been using Faultline now for 3 weeks ... I wouldn't feel comfortable opening up the factory page in front of the
current client ... I think it's too busy. I think it is relatively confusing. Doesn't look anything really like a Microsoft interface
would ... It's more like a library of everything that's happening ... it feels as if the entire thing needs a bit of a reshape to
service me. Rowland Glew, Faultline, designer and owner. My business is Streamline Synergy. That's who I am. Faultline is my tool."*

So, until he says otherwise:

1. **The user is Rowland, a consultant in a client's factory** — one person, his tool, used live with clients. Not a team product,
   not a factory's own system; nothing is designed for a second organisation.
2. **Every page must be one he would open in front of the client** — calm, clear, few things, the client's own story; never a
   library of everything that has happened. A page's size does not grow with a year of records: the current and the open first,
   the rest one tap away.
3. **The reshape is designed before it is built** — shown on Faultline's own screens as options for him to react to (he has said he
   cannot describe it yet), the same way the look was chosen on 6 November; nothing is removed until the shape is agreed.
4. **His business is Streamline Synergy**; Faultline is his tool. (The brand on the landing page — Opex Elevate — is not changed until
   he says.)

The canvas of the reshape, the same day: `claude.ai/artifact/6bEZavbkRCTJbtmRpXoYYp` — three shapes for the first page, on placeholder
figures (no client's data): **A · The engagement** (home is the client: found so far in money, the three findings that matter, the lines
being studied, what happens next), **B · Today on the floor** (home is the working cockpit: which line, carry on, the tools reached for
most, the open findings), **C · Present** (one tap turns the work into the client's story: what was found, what it costs, being fixed,
proved, where the money is). Waiting for his pick; nothing is built until then.

He answered *"No ... we need to think bigger"*: the shape under the pages comes first — the client, the site and its areas, the engagement, the benefits register and real client reporting, in `docs/CONSULTANT.md`.

## The task-led application — 10 November

Rowland: *"The user should not have to navigate Faultline to find the functionality they need … They should simply tell Faultline
what they are doing, what they have observed, what they want to investigate, or what they want to achieve … The application should
adapt to the user's task, rather than forcing the user to adapt to the application's structure."* And: *"One application, one
intelligence"* — the application stays the system of record; the AI is the primary way in, using its real functions, never
simulating, inventing data, bypassing its logic or making disconnected copies; Manual Mode and every page keep working on the same
records. So AI Mode **leads with the task**: it understands it from the line's own evidence, says what is known and what is not,
recommends the one next step with its reason — never a menu of tools — keeps the task and its progress across the conversation, and
carries it to an outcome. `docs/AI-TASK.md` is the design; `src/capabilities/task.ts` the code.

