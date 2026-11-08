# The Story — Faultline for the consultant and the client (8 November; designed at Rowland's word, built in slices S1–S5)

Rowland, 8 November: *"the story so far is a continuous journey … I run an update and it pulls it all into a beautiful report …
yes do it … we also need to change the factory page … we need a page for me, possibly the story page? … I don't have the answers, I
need the correct build from yourself, you take the wheel and design everything for me."* And before it: *"critical element is how all
of the information is presented back to the client … are the reports correct, do we do slides? … is the first page our app name and
business name and name of consultant … what can a Claude API do for us?"*

Read with `docs/DIRECTION.md` (8 November: Faultline is his own consultant's tool, used live with a client; nothing is designed for a
second organisation) and `docs/CONSULTANT.md` (the client, the site and the area are words on the lines — K1, built).

## 1. The idea in one paragraph

An engagement with a client is **one continuous story**: he walks in, builds what he sees, finds the losses, puts them in money, drives
the fixes and proves them — over weeks. Today every one of those is recorded, but the telling is left to him. **The Story** is the
record of the telling: one per client, growing a **chapter** each time he presses *Run an update*. A chapter freezes what was true that
day — what was found, what it costs, what is being fixed, what is proved, since the last chapter — and says it in plain English, with
his brand on the cover and every figure a formula's. The report and the slides are the story printed. **Home is the Story page**: the
page he opens in front of the client.

## 2. The records

**The consultant's brand** — his, once, on every paper (S1): name, business, strapline, contact line, logo. Kept on his profile
(`profiles.brand`, jsonb — `supabase/BRAND.sql`) so his phone and laptop agree, cached on the device (`lib/brand`) so a paper made
offline still carries it. Defaults offered: *Rowland Glew · Streamline Synergy*. The landing page's brand (Opex Elevate) is not touched.

**The Story** — one per client (S2), a study record `tool: 'story'` (the one record every tool's use is — synced, kept, Saved copies
and all; `supabase/STORY.sql` adds the word to `studies_tool_check`, `lib/study` STUDY_TOOLS). Its `agreed`: `{ story: { client, brief,
startedAt, closedAt? } }` — the client's name (the lines' `clientName`), the brief in the client's words (*"Why are we losing output in
the packing hall?"*). Its `facts.chapters`: the chapters, oldest first.

**A chapter** — one update run: `{ id, at, from, to, headline, narrative: string[], snapshot, approvedAt?, kept?: { pdf?, pptx? } }`.
The **snapshot** is the point: the figures as the modules said them *that day*, kept so the story reads the same next year —
`{ lines, found: { open, priced, costWeek }, fixing: { open, late }, proved: n, findings: Finding[], actions: Action[], provedFixes:
Proved[], toolsUsed: { tool, n }[], since: { newFindings, closed, newProved, newTools } }`, every `Finding` with its own sentence,
its money and where it comes from (`lib/factoryQuestions` wrongOf, `lib/problemCost`, `tools/yokoten` provedFixes, the register, the
Actions reader — the Factory page's own readers, never a second sum). The **narrative** is the only written part: drafted (S3) by
Claude from the snapshot and the chapters before, or — with the assistant off, or before it answers — assembled from the modules' own
sentences; in either case **his to edit**, and a chapter is *approved* only when he says so. A figure in the narrative not in the
snapshot is marked *check this* beside it, as Line Talk's `unsure` is.

## 3. The Story page — Home (S2, the reshape S5)

```
Northfield Foods                                      [Run an update]  [Present]  [Report ▾]
Why are we losing output in the packing hall?  ·  since 20 October  ·  3 chapters

Found so far        Biggest loss              Being fixed            Proved
£4,820 a week       the wrapper, £2,900/wk    3 · 1 late             1 · £1,140 a week back

Since the last update (4 Nov)                          ← what Run an update will say
  2 new findings · 1 closed · 1 proved · 3 tools used

Chapter 3 · 4 November — "The wrapper is the line's limit; the changeover is fixed"
  … the narrative, his words …                                        [Report] [Slides]
Chapter 2 · 28 October — …
Chapter 1 · 21 October — …
```

- The four figures are the Factory page's four questions, read the same way, said as the client reads them (found · biggest · fixing ·
  proved). *Since the last update* is the difference against the latest chapter's snapshot.
- **Run an update** opens the new chapter: the snapshot drawn (the figures, the findings, the actions, the proved), the narrative
  drafted, the headline suggested — he edits, then *Approve*. Approving keeps the chapter and makes its report (and its slides, S4),
  kept under Saved copies on the story.
- A chapter opens to its narrative, its findings each with its sentence and money, its actions, its proved fixes — the snapshot drawn.
- **Present** (S5): the same page full screen, no frame, the figures large — the meeting itself.
- No story yet: *Start the story of <client>* — the brief asked, nothing else; a client with no name yet asked on Set up the lines.
- One story per client; the client picked on the Factory page is the story shown. A closed story (*Close the engagement*) stays and
  a new one can start on the same client.

**Home (S5):** `#/` becomes the Story page; the board of lines is the **Lines** tab beside it (`#/lines`), Set up the third tab. The
menu's *Factory* lands on the Story. Every page's size stays the same on day 365: the chapters fold to the latest three, *All chapters ›*.

## 4. The papers (S1, S2, S4)

**Every paper** — the foot of every page carries *Rowland Glew · Streamline Synergy* beside the Faultline mark (`reportKit stampBrand`,
from `lib/brand`); nothing else about the 70 papers changes.

**A cover** (`lib/report/cover`), on the papers a client is handed: the story's report, the line's full package, the project report and the
client report — the client's name and (when given) logo, the title, the date, *Prepared by <name>, <business>*, the strapline, the
contact line, and small at the foot *Made with Faultline*.

**The story report** (`lib/report/storyPaper`) — the cover; **the story so far**: the brief, the four figures today, *where the money is*
(the findings ranked by money, a bar each); **this chapter**: the headline, the narrative, each finding with its sentence, money and
how it is known, what is being done and by whom, what is proved with its before → after; **the chapters before** (headlines and
figures, one page); what the figures rest on (the tools used, a line each). A4, the lean page's blocks, every figure the snapshot's.

**The slides** (S4, `lib/report/storyDeck`, pptxgenjs, 16:9, editable in PowerPoint): the cover; the four figures; *where the money is*;
one slide a finding (sentence, money, its picture where it has one); what is being done; what is proved; next steps; the brand on
every slide's foot. The same snapshot, never a second reading.

## 5. The AI's part (S3) — Claude, through the `assist` gateway, task `story`

Rowland, 8 November, asked whether the AI may write report text: *"yes"*. So the gateway gains one task: given the snapshot (every
figure with its source), the brief and the chapters' headlines before, it returns `{ headline, narrative[] }` — plain English for a
site director, the story continuing from the last chapter, no figure that is not in the snapshot, nothing claimed that is not proved,
money first. Held to a schema; every figure in the answer checked against the snapshot (`unsureFigures`); an allowance a day as the
talk's. It lives in the **AI toolbox** (*Write the chapter · uses AI*) and the chapter says *drafted by the assistant, edited by you*.
With the assistant off, the chapter is assembled from the modules' sentences and says so. The AI never changes a figure and never
writes a record: he approves.

## 6. The slices

| Slice | What ships | Proof |
|---|---|---|
| **S1 · Brand** | `supabase/BRAND.sql` (profiles.brand jsonb, read back); `lib/brand` (read, cache, defaults); *Your brand* in the account menu (name, business, strapline, contact, logo); the foot of every paper; the cover on the line's full package | `scripts/acceptance/brand.mjs` |
| **S2 · The Story** | `supabase/STORY.sql`; the record; `lib/story` (the snapshot from the readers, the difference since the last chapter, the assembled narrative); the Story page at `#/story` (a tab on the Factory: Overview · Story · Set up) with Run an update → edit → Approve; the story report with its cover; Saved copies | `scripts/acceptance/story.mjs` |
| **S3 · Written by the assistant** — built 8 November | the `story` task in the gateway (`supabase/functions/assist`, deployed from the repo, version 19; `tools/story/storyAssist` the shared rules, synced by `scripts/sync-assist.mjs`; `tools/story/storyAsk` the app's side), the assembled draft shown at once and the assistant's headline and paragraphs taking its place when they come (*Written by the assistant — check it, then approve*), a figure not in the snapshot marked *Check this*, a refusal or no signal leaving the records' words, an allowance of 20 a day; the AI toolbox card *Write the chapter* | `story.mjs` (the assistant answered by the script), `ai-toolbox.mjs`, `tools/story/__tests__/storyAssist.test.ts`, `gateway.test.ts` (the copies equal) |
| **S4 · Slides** — built 8 November | pptxgenjs 4.0.1 (`lib/report/storyDeck`, eight 16:9 slides from the chapter's snapshot — the same figures as the paper); Report ▾ › *Story slides — the latest chapter* and *Slides* on each chapter; kept under Saved copies with the paper | `story.mjs` (the deck read back: its slides, the headline, the brand, the money) |
| **S5 · Home is the Story** | `#/` the Story, Lines a tab (`#/lines`), Present full screen; the scripts and PAGES.md follow | smoke, inventory, journeys, structure |

Each lands on its own, green, merged to `main`, live. Nothing in the tools, the records or their papers changes to make it.
