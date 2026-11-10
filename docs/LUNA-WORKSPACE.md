# One working environment — conversation and the work together (an assessment, not built)

Rowland, 10 November: *"conversation becomes the primary way of interacting with Faultline, with the actual operational work visible and
accessible alongside it … if I'm discussing a downtime investigation, I should be able to see the investigation taking shape as we talk …
one intelligent working environment, not a chat window bolted onto a traditional manufacturing application. However, the existing Manual
Mode must remain fully functional."* And: *"Do not start redesigning or implementing yet."* This page is the assessment and the direction
recommended. It builds on docs/LUNA-FIRST.md (the entry, the dock, workspaces — concepts on the design canvas) and replaces nothing in it.

## 1. What is there today, as a person meets it (inspected 10 November)

| Part | Where | What a person experiences |
|---|---|---|
| The conversation | `#/ai`, `screens/AiModeScreen` (≈1,500 lines) | A page of its own: conversations · the conversation · the context panel. Reached from **Ask Luna** in the top bar, which opens it on the line or project you were on. |
| Its live state | inside that screen component: the round being answered, the cards waiting (`waits`), voice (`VoiceMode`, `speech`), the measurement strip, timers | **Leave the page and it stops.** A record's chip (`RefChips`) navigates away to Manual Mode; the conversation is left behind and must be reopened. |
| The work | `WorkPane` — an iframe (`lib/pane`, `fl-work`) of the app's own page | At a desk ≥1,100 px a third column (conversation · context 280 px · work); on a phone a full-screen sheet over the chat. Opened when a capability returns `show`, else by *Show the work*. It is a **second copy of the app** in a frame. |
| What it is on | `ContextPanel`: Now on (aim, task, *Over to you*, kind of work, points, notes with how known), Being built (drafts), the notebook, Parked, Sources | The closest thing to a case file — but only inside `#/ai`, and Manual Mode never sees it. |
| What it made | inline in the turns: write cards, charts, reports, the figure check | Outputs live in the chat stream; the record they landed in is a chip. |
| Voice | `VoiceMode`, a full screen over the chat | Immersive, but the work is hidden while talking. |
| Manual Mode | every page, the frame (`ui/Frame`), tabs per scope | Complete with AI off (`colleague/aiMode`); pages have no idea Luna exists. |

The engine is right — capabilities over the real functions, one record per thing, writes on a card, connectors for every tool, the figure
check. **The seam is the shell**: the conversation is a destination with its own page, the work is a framed copy beside it, and the case
being built is visible only inside the chat page.

## 2. The direction recommended — Luna lives in the frame; the page is the work

One product, two ways of driving it. **The page you are on is always the work.** Luna is a panel of the frame, open or closed, that goes
with you from page to page. Manual Mode is the same app with the panel closed — nothing to switch, nothing lost.

```
┌ top bar: Faultline · where you are · ⌘K "go to or ask" · ＋Problem · ◉ Luna · you ─────────────────────┐
├ rail ┬ CASE BAR: "Line 7 downtime — Measure · 3 of 5 questions answered · 2 waiting on you" (when a case is on) ┤
│      │                                                         │                                         │
│ Today│   THE WORK — the real page: the investigation board,    │  LUNA — the conversation, the box,      │
│ Fact.│   the study filling, the document, the report preview.  │  voice bar; receipts that point at the  │
│ Proj.│   What Luna changed is marked on it: "Luna added 3 stops│  work, never a copy of it; cards to     │
│ Tools│   · said 14:22"; her drafts dashed until accepted.      │  confirm; the case file folds in here   │
│      │                                                         │  on a narrow screen                     │
└──────┴─────────────────────────────────────────────────────────┴─────────────────────────────────────────┘
```

**The case** is the organising thing: the subject Luna and the person are working on (today's *thread* — aim, task, method step, notes
with how known, points: questions open and answered, decisions, drafts, the records touched). It becomes visible **in both modes**: a case
bar under the top bar on every page that belongs to it, and the case file (the context panel, grown up) beside the work. A project or a
problem worked by hand shows the same file. No new record: a case is a thread on a conversation, pointing at the project, problem, line or
study it is about.

## 3. The six questions

**1. How AI Mode should evolve.** From *a chat page with a side pane* to *a panel of the frame over real pages*:
- the conversation runtime (the loop, cards waiting, voice, measurement, timers) moves out of the screen into a provider in the frame, so a
  question keeps being answered while you move;
- `#/ai` stays — Luna full width, the conversation list, for thinking and asking with no page beside;
- the iframe work pane retires on the desk (the page itself is the work; on a phone it stays the way to peek without leaving the chat);
- voice becomes a **voice bar** over whatever page is open (the orb small, the words heard, Mute, Interrupt, End), the full-screen voice kept
  for the phone in a pocket and the headset;
- the context panel becomes the **case file**, one component used by Luna's panel and by Manual Mode's project and problem pages.

**2. Together — yes, weighted by what you are doing.** Building or capturing (an investigation, a study, a document): the work wide, Luna
narrow beside it. Asking and exploring (figures, files, "why"): Luna wide, results as cards that open their page. On the floor, on a phone:
one at a time — the work full screen with Luna as a bar at the foot (say it, see it land), or Luna full screen with a strip of the work
("Stops timed · 5 captured · last: Jam 14:22").

**3. How things appear and update during a conversation.**
- **One source.** Everything lands in its real record and is seen on its real page; the chat carries a **receipt** — a compact card saying
  what landed where ("3 stops added to Line 7's stops · Open") — never a second copy of the content.
- **Live.** Pages already redraw on every write (`onDataChange`); Luna's writes therefore appear as she makes them. What is new is a mark:
  a light highlight and a provenance line on what Luna just changed (who, when, how known), fading after a moment and kept in the record's
  own history.
- **Drafts are visibly drafts.** A method answer, a study field, a report section Luna proposes shows dashed, with *Accept · Edit · Not this*,
  until the person accepts — through the page's own save.
- **Progress lives in the case file**: the method's steps (where it is), evidence gathered (each with how known — measured · counted ·
  reported · observed · imported), questions open and answered, actions with who and when, what is still missing. The case bar says it in
  one line.
- **Evidence** is gathered where it belongs (a photo filed to a machine, a stop on the line) and listed in the case file; a report is a live
  preview that redraws as its results refresh (`refresh_report`), downloaded when the person says.

**4. Moving between conversational and manual working.** There is nothing to move between: the panel opens and closes; the URL is always
the page's. A record's chip opens its page **as the work, keeping Luna open** — never navigates her away. A manual edit made while Luna is
open is seen by her on the next turn ("you changed the target to 75") through the records she reads, never by watching the person. *Over to
you* (a step only a person can do on the screen) becomes the page itself with the step marked. AI off, no signal or allowance spent: the
panel says so in a line, every page works as now.

**5. Navigation, layout, interaction.** Keep the frame (docs/ENTERPRISE-UX.md, docs/LOOK.md) and add four things to it: **Today** first on
the rail (docs/LUNA-FIRST.md U1); **Luna** in the top bar as the panel's toggle (Ask Luna becomes it), with ⌘K one box for go-to or ask; the
**case bar**; and one set of shared patterns — receipt, draft-in-place, provenance mark, the five state colours with their words.
Nothing is removed from the menu; no scope's tabs change. The phone keeps its five-button bar; Luna is a sheet with a voice button.

**6. What is reused and what genuinely needs redesign.**

| Reused as it is | Redesigned |
|---|---|
| `src/capabilities` (registry, connectors, every capability), the gateway, the figure check, the notebook, the exam | **The conversation runtime** — lifted from `AiModeScreen` into a frame-level provider (the one real refactor; everything else hangs off it) |
| The conversation record (`talk` + `facts.colleague`), threads, actions, drafts, outputs | **The layout of `#/ai`** — it becomes Luna full width; the three-column grid with the iframe retires on the desk |
| `WriteCard`, `ChartCard`, `ReportCard`, `MeasureStrip`, `TaskCard`, `DraftBox`, `FactoryDraftBox`, `RefChips`, the composer | **`ContextPanel` → the case file** — the same pieces, a component of its own that Manual Mode's pages can show |
| `VoiceMode`'s engine (`speech`, `voice`, `voicePrefs`, the turn-taking) | **Voice presentation** — a bar over any page, the full screen kept for the pocket |
| Every page, tool workspace (docs/TOOLS-DESIGN.md), method page, report page, the frame, `PageHeader`, `ui/Lean` | **New shared parts**: the receipt card, draft-in-place on method and tool pages, the provenance mark, the case bar |
| `lib/scope` (what page you are on), `AiDoor`'s scope passing, `lib/pane` on the phone | **Chips that navigate away** — they open the page as the work instead |

## 4. Risks and dependencies

1. **The runtime lift is the dependency for all of it** — an answer in flight, a card waiting, voice and a measurement must survive a page
   change; tested by the AI acceptance scripts (`ai-mode`, `ai-operate`, `ai-task`, `voice`, `ai-investigate`) passing unchanged.
2. **Width.** A panel of 380–420 px beside a tool workspace leaves ~900 px at 1,440: the tool pages must hold at that width (most are
   designed to 1,280 — docs/TOOLS-DESIGN.md); below ~1,200 the panel overlays instead.
3. **Highlights need to know what Luna changed** — read from the conversation's own steps (each done step's refs), never by diffing pages;
   a field-level mark needs the page's help, a record-level line does not. Start with the record level.
4. **Manual Mode untouched with the panel closed** — every Manual-Mode script (smoke, inventory, journeys, the 70+ acceptance scripts) runs
   with it closed and must pass as now; the journeys must not get longer.
5. **Cost and honesty** — nothing calls the model on a page change; suggestions are code; the figure check and cards stand.
6. **Clients** read only: the panel offers reads; drafts in place offer no Accept.
7. **Two windows** (desk and phone in the same session) — the conversation is a record, so both see it; a card answered on one shows done
   on the other through sync, as today.

## 5. The order recommended — each slice live on its own, on Rowland's word

| # | Slice | What it proves |
|---|---|---|
| W1 | Lift the conversation runtime into a frame provider; `#/ai` unchanged on screen | every AI acceptance script unchanged |
| W2 | The Luna panel in the frame on line, machine, project, tool and method pages; chips open the page as the work; the iframe kept only on the phone | the investigation journey (`ai-investigate`) walked with the page beside her |
| W3 | Receipts in the chat; the record-level "Luna changed" line on the page | a study filled while talking, seen filling |
| W4 | The case file and case bar, shared with project and problem pages | the same file read by hand and with Luna |
| W5 | Draft-in-place on method pages, then tool pages | DMAIC filled progressively, nothing kept unaccepted |
| W6 | The voice bar | talk while watching the study fill; the phone in a pocket as today |
| W7 | Today (LUNA-FIRST U1), then the home on his word (U5) | the entry |

W1 is invisible and carries the risk; W2 is where it starts to feel like one product.

**Built, 10 November: W1–W7** (docs/STATE.md, Luna in the workspace). U5 — `#/` becoming Today — waits for Rowland's word.
