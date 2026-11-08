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

**Home (S5, built 8 November):** `#/` is the Story page (`screens/StoryScreen`; `#/story` stays as an alias) — Rowland: *"we also need
to change the factory page.. we need a page for me possibly the story page … you take the wheel and design everything for me."* The
board of lines (`screens/WorkspaceHome` — the line cards, Needs you now, what's going wrong, the client · site · area groups, the
chips) is the **Lines** tab beside it at `#/room`, Set up the third: the Factory's tabs are **Story · Lines · Set up**. The menu's
*Factory* lands on the Story. **Present** is `#/?present=1` — the Story full screen with no frame, the four figures large, the latest
chapter readable across a room, × or Escape back to `#/`. With no story yet the page offers *Start the story* and *See the lines ›*. Every page's size stays the same on day 365: the chapters fold to the latest three, *All chapters ›*.

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
| **S5 · Home is the Story** — built 8 November | `#/` renders the Story (`#/story` an alias); the board of lines at `#/room` is the Factory's **Lines** tab, the tabs Story · Lines · Set up; the menu's Factory goes to `#/`; Present (`#/?present=1`) the Story full screen with no frame, Escape or × back; the empty state's *Start the story* and *See the lines ›*; the inventory's rows and PAGES.md follow | smoke, the inventory, journeys, structure, `story.mjs` |

Each lands on its own, green, merged to `main`, live. Nothing in the tools, the records or their papers changes to make it.

## 7. The brief — uploaded, read into asks, and every finding assigned to it (S6–S9; designed 8 November)

Rowland, 8 November, opening the Story: *"it says write down the brief. So here's two intelligent things that need to happen. One, if a
brief is available to upload, allow a brief to be uploaded … then use AI for possible steps … any information within the tools … assign it
directly to the brief … Here's the proof. Here's the evidence … If we can build it with code, of course, build it with code. If not, then
not."* And the rule over it: *"don't let this be any stopper … I don't always get all the information I need. So if I don't have a brief, I
don't have a brief … It'll tell me no brief … nothing happens, nothing builds."*

**What is code and what is Claude — settled.** Everything that can be a rule is a rule: reading a PDF, a Word file or a text file into words
(pdf.js, mammoth, plain text, in the browser); typed lines as asks; matching every record to an ask by the line, machine, product and tool it
carries and a name in the ask's words; what is found, being done, proved and still missing for each ask; the chapter, the paper and the slides
laid out by ask. Claude, through the `assist` gateway and never writing a figure, in exactly two places: **reading a photo or a scanned page
of a brief into text** (task `brief-read`), and **splitting a prose brief into asks** (task `brief-asks`, three to eight, each quoting the
sentence it came from) — both shown to the consultant and kept only when approved. With the gateway off or no signal, the lines are typed and
everything else is unchanged.

**No brief is never a stopper.** The Story says *No brief yet* in one line and works exactly as S2–S5 built it: the four figures, the
chapters, the report, the slides, all from the records. A brief adds the layer *asked → found → done → proved* on top; nothing waits on it.

### 7.1 The record
`AgreedStory.brief` stays the text. Added: `briefFile?: { mediaId, name, mime, bytes, readBy: 'code' | 'assistant' | 'none' }` (the file as media
on the story record, the same store the tools use — `docs/ATTACHMENTS.md`); `asks?: StoryAsk[]` — `{ id, text, from?: string (the sentence quoted
from the brief), order, lines?: string[], machines?: string[], products?: string[], tools?: string[], done?: boolean }`. An ask's scope is picked
once (chips: the client's lines, their machines and products, the tools) or read from its words by `askScopeFromWords` — a line's or machine's
name appearing in the ask. Nothing else is stored: the evidence is worked out from the records every time (`askEvidence`), never written down.

### 7.2 The page
Under the brief: **Write it · Upload it** (PDF, Word, text, a photo). An uploaded file shows its name and *Read as text* with the words in a box
to check; a photo or a PDF with no text layer offers *Read it with the assistant* (said as AI, the AI toolbox card). **The asks**: a list under
the brief, each a row — its words, its scope chips, and the four counts in words (*3 found · 2 being done, 1 late · 1 proved · the wrapper
not measured yet*); *Split the brief into asks* (the assistant, approved line by line) or *＋ Add an ask*; drag to reorder, edit in place,
delete with Undo. A row opens the ask: what we found (the records, each opening), what is being done (actions with who and when), what is
proved (before → after), **what is still missing** — the tool that would show it, named (*no measurement on the wrapper — Line capacity or
SMED would show it*), with *Start it on Line 2A ›*. **Also found**: every record matching no ask, one tap to assign. The four figures at the
top stay the whole engagement's.

### 7.3 The papers
The chapter's draft, the story report and the slides gain a section an ask, in the asks' order: *Asked* (the quoted sentence) · *Found* ·
*Being done* · *Proved* · *Still to show*. The assistant's draft (S3) is given the asks and their evidence as part of the snapshot and told to
write by ask; its figures are checked the same way (`unsureStory`). A story with no asks prints as today.

### 7.4 The slices
| Slice | What ships | Proof |
|---|---|---|
| **S6 · The brief uploaded** — built 8 November | *Write it · Upload it* under the brief (`screens/StoryBrief` BriefPanel); the file kept on the device (`db putBlob`, key `story-brief-<id>`) and named on the story (`briefFile`, `readBy` code · assistant · none); text read in code by `tools/story/briefText` — pdf.js 4.10.38 (the text layer), mammoth 1.8.0 (`extractRawText`), plain text — both loaded only when a file is uploaded; a photo or a PDF with no text layer drawn as up to four JPEGs and offered (*Read it with the assistant · uses AI*, `tools/story/briefAsk` readBriefPages → task `brief-read`), the words shown in a box to check before *Use this as the brief*; *No brief yet — the story works on the records alone* in one line; the story starts with no brief (*Start the story with no brief*); the header and Present say the brief's first sentence (`clientStory briefLine`) | `story-brief.mjs` steps 1–4, `storyAsks.test.ts` (briefText) |
| **S7 · The brief as asks** — built 8 November | `asks` on the record (`lib/study` BriefAsk); ＋ Add an ask; *Split the brief into asks · uses AI* (`briefAsk splitBrief` → task `brief-asks`; a quote not in the brief is dropped, each proposal ticked, edited, nothing kept until *Keep these*); edited in place, ↑ ↓, Delete with Undo; scope chips (lines, machines, products, tools) and `lib/storyAsks askScopeFromWords` — the chips picked win, else the names in the ask's words | `story-brief.mjs` steps 5–6, `storyAsks.test.ts` |
| **S8 · The evidence by rules** — built 8 November | `lib/storyAsks askEvidence` over `lib/storyAskRecords askRecordsOf` (the snapshot's findings and proved fixes, every action with its problem, every study by its frame key, a product's Line capacity): found · being done (late said) · proved · still to show (the tool the ask's words want, on each of its lines with none, from the registry — *Line capacity would show what holds Line 3*, *No measurement on the Wrapper yet — … would show it*, with *Start it on <line> ›*); *Also found* with *Ask n* to assign (the record's machine, else its line, joins the ask); `storyAsksState` the asks in words for the AI colleague | `story-brief.mjs` steps 7–8, `storyAsks.test.ts` (askScopeFromWords, askEvidence, assignTo) |
| **S9 · The papers by ask** — built 8 November | the chapter's snapshot carries `asks` (`withAsks`, frozen by `freezeAsk`); the assembled draft a paragraph an ask (`askParagraph`); `storyPaper` a section an ask (Asked · FOUND · BEING DONE · PROVED · STILL TO SHOW) and `storyDeck` a slide an ask; `storyAsk snapshotText` sends THE CLIENT'S ASKS to the assistant; a story with no asks prints as before. Still to do: the gateway's `story` instructions told to write by ask, and the AI toolbox card for the brief (not this slice's files) | `story-brief.mjs` step 9, `story.mjs` (no asks, no ask sections), `storyAsks.test.ts` (the snapshot and snapshotText) |

