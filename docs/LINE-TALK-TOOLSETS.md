# Line Talk toolsets — walk and talk, and the tool's own diagram and report come out

**Asked for:** Rowland, 6 November 2026 — *"the live talk system is one where we need to heavily invest in. It has its own tool set.
A general walk on the line could be one tool set, which is already built. But what if I want to do a flow diagram while I'm talking,
or a spaghetti diagram … an FLT driver moving a box, the micro movements, an individual doing micro movements … I have 4 operators
on the line, operator 1 goes to X, goes to X, goes to X, operator 2 goes to X … it would literally create a spaghetti diagram for me
based on the commands … the flow diagram, a bit larger … and the value stream as well — a value stream actually gets created as I
talk; we already have it, so it generates the same report. It's a big piece of work. Build the plan and let's make it."**
**Status:** planned 6 November; T0–T1 specified in `knowledge/specs/FC-202-toolsets.md`. Nothing here is built until its slice says so.

## 1. What this is, in one sentence

A talk gets a **toolset**: the person says which kind of walk it is (a general walk, a flow diagram, a spaghetti diagram, a value
stream, micro-movements), and as they talk Line Talk **listens for that tool's things** (steps, places, who goes where, how long),
**draws the tool's own picture live**, and when the person taps *Make it* the **tool's own record exists on the line** — with the
tool's own figures, page and paper. The report is never a third kind of paper: it is the spaghetti diagram's, the process flow
chart's, the value stream map's.

## 2. Where it sits (placed on `docs/BLUEPRINT.md`, §8)

- **Layer:** on the line. **Record it writes:** none of its own — it fills the *existing* tool's record (a calculator's boxes, the value
  stream's steps) through the tool's own code. **Where it shows:** the talk (the live picture and its card), the line's Tools (the made
  study, wearing *From a talk*), the line report, the project's tools when talked inside a project.
- **Direction (`docs/DIRECTION.md`, 20 October, stands).** The only AI is the voice and the camera; Line Talk *never works out a figure,
  never saves a record itself, never drives the app*. This design keeps all three: the assistant only **writes down what was said**
  in the tool's own terms (the same job as the voice note in a typed box, one step further); **every figure is the tool's formula's**
  (distance, minutes, shares, lead time) — the assistant is told never to give one that was not said; **nothing is kept until the person
  taps *Make it*** (docs/LINE-TALK.md already says records are *proposed, never made by it*: this is that card, for a whole study).
  It builds no method, template or tool — the tools are fixed in code.
- **What it replaces:** nothing. The general walk (the documents) stays exactly as built; a toolset adds to it.

## 3. How it works (the mechanism, once)

1. **Pick the set.** Starting a Line Talk (or a chip row in the talk) offers *Walk & report* (today's) · *Flow diagram* · *Spaghetti* ·
   *Value stream* · *Micro-movements*. One tap, changeable mid-talk, kept on the talk. A tool's own page and a line's Tools offer
   *Talk this* — the same talk opened on that set.
2. **Listening is the same hearing** (`tools/talk/hearing` — the phone's own speech recognition into the box, then Send). Nothing new
   is recorded. A set adds only what the assistant is told to listen for, and what it answers with.
3. **The answer gains a `capture`** beside `reply` and `document`: the set's draft **as it now stands, whole** (like a rewritten document —
   no merging): the steps / the places each person went to / the stream. Each set has its **own small schema**, chosen by the talk's
   set (a large grammar is refused by the API, so never one schema for everything). The person's edits to the draft are sent back
   with the next turn, so the assistant builds on *their* version.
4. **The picture is drawn at once** by the tool's own drawing code (the same functions as its page and its paper) from the draft, and
   its figures worked out by the tool's module — on the talk's screen beside the conversation (a tab on the phone: *Talk · Diagram*).
5. **The assistant asks back, as a colleague does** — "Operator 2: from the packing line, or from the scale?", "How far was that, or
   shall I leave the metres out?" — one question, the one that moves the diagram on. It **never fills a distance, a time or a count that was
   not said**; a gap is shown on the draft ("no metres said for leg 3") exactly as the tool says a missing input.
6. **Make it** creates the tool's record on the talk's line (or project) through the tool's own create path (`putStudy` with the
   calculator's `Inputs`, or the value stream's steps), marks it *From a talk* with a link back, opens it in the tool, and gives Undo.
   The talk keeps a card: *Made: Spaghetti — Packing, 4 people (open)*. Talk again after making and *Update it* sends the changes to
   that same record (never a second).
7. **The report is the tool's** (screen and paper from the one module, `docs/LEAN-PAGE.md`): the made study is on the line's Tools and in
   the line report like any other. The talk's document can still be asked for on top ("write that up for my manager").

Access: `can.edit` to make or update; a client reads the talk and the made study, changes nothing. Allowance: the same per-person day as
Line Talk's (`assist_usage`); a capture answer is one answer.

## 4. The sets

### 4.1 Flow diagram (process flow chart — FC-003, built)
**Says:** "the cases come off the line to the pallet wrapper, wait for the pallet, get wrapped, move 40 metres to the store, sit in it."
**Draft:** the steps in order, each with its ASME class (operation · transport · inspection · delay · storage), minutes and metres *only
if said*. **Made as:** a Process flow chart (a calculator, the shared shape) with its boxes filled — one box per step. **Report:** the
chart's own paper (the five symbols, the step table, time and distance by class, the sentence "14 steps: 4 change the product …").
Smallest set, the tool is a 1 : 1 fit — **built first to prove the pipeline.**

### 4.2 Spaghetti diagram (FC-004, built for one person; *several people* is new)
**Says:** "Operator 1 goes to the film store, back to the line, to the case store, back, to the scale. Operator 2 goes to …"
**Draft:** *walkers* — each a label (Operator 1 … never a name; same rule as the video study) and the places in the order walked, each
leg's metres / trip name only if said. **The tool gains** (its own spec, FC-004 part 2): **several walkers in one record**, drawn on one
layout in a line style + label each (never a state colour; the graphite/teal family and dashes, as the line standard tells people apart),
the figures **per walker and together** (metres a round, rounds a shift, minutes, the trips ranked across everyone, who walks most), the
sentence and the paper from the same module. **The layout:** places have positions only when given (typed, or later from the line
standard's board); without them the diagram is a **schematic — places arranged for reading, legs labelled with the metres said, plainly
marked "not to scale"** — and becomes to-scale the moment positions or metres make it true. Never a drawn distance that was not given.
Small motions (a forklift driver moving a box from one area to another) are the same set at a finer grain — places a metre or two apart,
named as the person says them — and hand on to 4.4 when the question is the body's motion, not the route.

### 4.3 Value stream (FC-001, built)
**Says:** "orders come in, planning schedules it, the film's pulled from stores, the packer packs for 4 minutes, it waits for QA 2 hours,
QA checks, it goes to the pallet …" — who does it, where, the kind of step, the time, the wait.
**Draft:** the stream's steps (`FlowStep`: what, kind, who, where, seconds, wait, VA · NE · NV when said). **Made as:** a Value stream
record on the line, its steps filled; the grid, the lead-time figures, the money and the paper are the tool's own. Classing a step
(VA/NE/NV) is **only ever what the person said** — the assistant never classes a step for them; unclassified is shown as the tool shows it.

### 4.4 Micro-movements (FC-233 — the tool is built (7 November, `knowledge/specs/FC-233-micro-movements.md`, `/calc/micro-movements`, exports `inputsOfElements`); **this set is not built (T4)**)
**Says:** "he reaches for the box, grips it, lifts, turns, walks two steps, sets it down, releases." For an individual's hands, or a
forklift driver's cycle. **Draft:** the elements in order, each classed by Gilbreth's therblig (reach, grasp, move, position, release,
hold, inspect, delay …) and, only if timed or said, its seconds; hands as two columns (the two-handed chart). **Figures:** the cycle's
timed total, the share of the cycle that is value-adding motion vs. holding / delaying, by class — arithmetic of what was timed. **No
predetermined-time tables (MTM-1, MOST) are shipped** — they are licensed; the tool takes times from the stopwatch or the video study
(FC-021), and a time is never supplied. Built last, because it is a new tool, not a fill-in.

### 4.5 Walk & report (the general walk — built)
Unchanged. It is the default set, and its documents now follow the 1-2-3 lean rules (status · problem · action — 6 November).

## 5. Rules every set keeps

- **Nothing said is lost** (docs/LINE-TALK.md): the talk keeps every turn; the draft is derived, the talk is the source.
- **No figure from the assistant.** A distance, minute or count in a draft is one the person said, said back to be confirmed; the grounded
  check (`unsureFigures`) runs on the capture too. A picture read off a sign is a reading, asked to confirm.
- **Gaps are shown, never filled**; the assistant asks one question, not a list.
- **People are labels** ("Operator 1"), never names, never identified from a photo.
- **Seen in three seconds** (6 November): the made study and its report follow the lean page — the status first, the problem, what is being done.
- **One record per thing:** *Update it* edits the made study; *Make it* twice offers the first to open (as the line watch does).
- **Phone first:** the diagram is a swipe away from the talk; Send, Make it and Undo are thumb-sized; nothing off the side.
- **Offline:** the talk works as built (words kept, an answer waits); the draft appears when the answer does.

## 6. Slices (each live on its own; each held to `knowledge/STANDARD.md`)

| slice | what | proof |
|---|---|---|
| **T0** | the pipeline: a toolset on a talk (kept, changeable, chips), the set's schema and instructions in the gateway, `capture` read and checked, the live picture pane, *Make it* / *Update it* / Undo, *From a talk* on the made study, the grounded check on a capture | unit: capture reader, schema size, set choice; `talk-toolsets.mjs` |
| **T1** | **Flow diagram** on the pipeline (process flow chart: capture → the calculator's `Inputs`) | the record's tray talked step by step = the typed chart's figures; paper read back |
| **T2** *(built 6 November)* | **Spaghetti, several people**: the tool's part 2 (walkers, per-walker and together figures, schematic and to-scale pictures, paper), then its set | hand-worked 2–4 walker cases (`scripts/knowledge/cases-kaizen.py`); the talk of the Rowland example = the typed record |
| **T3** | **Value stream** on the pipeline (capture → steps; who/where lanes from what was said) | a stream talked end to end = the map's lead time, VA share and paper |
| **T4** | **Micro-movements**: FC-233's specification and tool (therbligs, two-handed chart), then its set | independent cases; the FLT cycle talked and timed |
| **T5** | Toolsets hub: *Talk this* on each tool's page and the line's Tools, the chooser's wording, the line report listing talk-made studies, docs and gate lines | journeys not longer; structure |

Order: T0+T1 first (one pipeline, the 1 : 1 tool), then T2 (Rowland's main example), T3, T4, T5. Each slice ends: unit tests, an acceptance script
(the assistant answered by the script, as `line-talk-assistant.mjs` does), `docs/PAGES.md` and the CLAUDE.md gate lines, the gateway redeployed
(`scripts/sync-assist.mjs` then all five files) and **read back with the `rules` fingerprint**, then merged — and a **real answer asked of the
live gateway** (as done 6 November) before it is called done.

## 7. Decisions made for him (change by saying so)

1. **Capture is proposed, made on a tap** — consistent with "never saves a record itself". (If he wants it to make the study as he talks,
   it is one setting away, but then Undo is the only guard.)
2. **Spaghetti without positions is drawn as a schematic, marked not to scale** — never a made-up scale.
3. **Operators are labels** — "Operator 1 … 4".
4. **No MTM/MOST times shipped** — licensed; times come from the stopwatch or the video study.
5. **A set per talk, changeable** — not inferred silently (a suggestion to switch is a later nicety).

## 8. Not covered (said, not hidden)

Reading a person's real movement from the video automatically (FC-021's reading measures *time*, not paths — a separate piece of work);
inferring the layout from a photo; anyone's identity; any figure the assistant works out.
