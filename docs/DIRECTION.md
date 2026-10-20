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

**A manufacturing improvement system, built on the line.** Three parts:

1. **The tools** — fast, correct calculation on what people measure on the
   floor: Line capacity, the line balance, the line standard, SMED, the
   shift's losses, work sampling, capability, the value stream map, the
   stopwatch, the video study — and the filmed walk with its snags, where
   Faultline began.
2. **The three kinds of change** that drive what the tools find to actions
   and proof: the stage gate (new equipment), the 6M (a running line made to
   perform better), the lever tree (a number to hit).
3. **The control room** above them: problems, actions, who owes what by when,
   and the reports.

**What makes it different** (checked against Minitab Engage, SafetyCulture
and the video time-study tools, 20 October): not the number of tools — those
products have years on it. It is that **the line knows itself**: a line's
shifts, rates, crew and margin are set once and every tool reads them, so
every finding comes out in money without retyping; commissioning new
equipment machine by machine; and evidence → cause → action → proof on the
same line's numbers. Every change strengthens that thread or it waits.

**Deep, not wide.** A tool earns its place only when it answers a question
the floor asks, gives the answer in a couple of minutes on a phone, reads the
line's facts instead of asking again, says the result in money, prints, and
has one door into a project. A new tool is added when a real problem on the
line needs it — never to fill a catalogue.

## The AI

Not part of the product. Formulas do every calculation, and the app already
says what its figures mean in sentences written from them. The one kept use
is **voice**: a problem said on the floor is written up, and the words said
are kept whatever happens. Any other use comes back only where the input is
speech, photographs or a great deal of free text — never where a number has
to be right — and only after it is measured on real use.

## What is parked (20 October) — nothing deleted

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

A project already running on a method keeps running and opens as before.

On the session branch (`claude/faultline-connection-1vx7kt`), never merged:
`86ed965` the assistant designing in two passes (deployed to the gateway as
version 8, 19 October — it stays deployed, unused), `bcfc1d6` the server
re-reading every gate pass (`supabase/GATE_CHECKS.sql` never applied),
`a44e700` views and links in the method engine, `376c486`/`aebac56` the
views' data, half-built. The assistant's key stays saved in Supabase until
Rowland revokes it.

## What comes next, in order

1. The filmed walk and its snags reachable from a line's own page — no job
   needed (it is stored by line already; the line page had no door to it).
2. Use Faultline for real for two or three weeks on Rowland's lines with his
   team; write down every place it is slow, confusing or missing.
3. Then deepen the tools that were used, close the evidence → cause → action
   → proof thread where it breaks, and add a tool only when a real problem
   needs one.
