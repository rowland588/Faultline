# The line page as evidence — 13 November

Rowland's brief (a PDF, 13 November), in his words:

> The line page has the right content but the wrong presentation. It does not feel alive … the page treats the most important things on
> it as small, quiet rows. This page matters because it is the one I put in front of a plant manager or client … It needs to read in
> about ten seconds and look slick, on my phone on the factory floor and on a bigger screen in a meeting.
>
> Each tool used on the line is a card that already shows its data, with the graph the tool produced sitting on the right-hand side. If
> I want more, I tap the card and get the full immersive view of the tool itself.
>
> The tools are standalone, finished templates with their own charts and logic. The cards should show what the tools already produce.
> Nothing about what a tool does or calculates should change, and every number on a card must match the number on its tool page. Luna
> … is a separate thing … should not borrow from her work pane. Documents belong on the line too, as things of their own … group by
> what things are, not by a workflow I follow.

Guard rails he set: keep everything in use working; leave the AI budget readout and Luna alone; never loosen a ratchet or a test — use
the existing colour and radius variables; small commits, one concern each, the full tests and the build after every one.

His decision on the design offered (the same day): *"A grid of cards that each open the tool's own page is the same as today in a new
layout. What I asked for is each card already showing its tool's own result, the headline figure and the graph the tool produced, so
the page reads as evidence. Tapping a card expands it in place, and a button then takes me to the full tool. Grouped by kind, yes."*
And the order: the line page first, with *What we produced* built in from the start; then SOP and work instruction from a manual with
the page cited per step. The fault-finding instruction and "put it on another line" wait until he has seen SOP-from-manual work on a
real PDF. No real-model spend until he says.

## How it is built

- **`src/line/glance/glance.ts`** — a record at a glance. Pure, and it works nothing out: each branch calls the function the tool's own
  page calls (a calculator's `studyCalc` result, `sampleTiles`, `chartTiles`, `analysisTiles`, `flowTiles`, and for Line capacity
  `capacityLean(capacityPaper(…))` and `flowModel`). It takes a record, not a line, so an area can use it for several lines' records.
- **`src/ui/EvidenceCard.tsx`** — the card. Shut: the tool, the record, its headline figure and two more, its sentence, the tool's own
  picture small. Open, in place: every figure, the picture whole, *Open … ›*. The picture is the tool's own component
  (`CalcBarsView`, `CalcPictureView`, `CapacityBars`) — never a new chart, never Luna's.
- **The line page** (`screens/ProductionLineScreen`) — *What we found* replaces *Carry on* (the same records, the same order, one
  reader `toolSaysOf`, which now hands back the record). *What we produced* under it: documents (tool `doc`), planned-maintenance lists
  and manuals (`lib/manual/store`).
- **The proof** — `scripts/acceptance/line-evidence.mjs`: every figure on a card equals the figure on its tool's page, read off both.

## Steps

| | What | State |
|---|---|---|
| 1 | The card, its reader, *What we found* and *What we produced*; figures for calculators (Stops across workstations with its bars), control chart, analysis, capability, Line capacity (with its bars) and Line Talk — each proven against its tool's page | built 13 November |
| 2 | ~~Figures and pictures for the rest, tool by tool~~ — withdrawn 13 November: no new graphs; a tool is added to the cards only when he names it, and only with what its page already shows | not planned |
| 3 | The machine strip a count and a severity, never the problem's text again | built 13 November |
| 3b | Problems as short rows | next |
| 4 | The line drawn at the top; the four question headings give way to grouping by kind; the fold's contents rehomed | next |
| 5 | The same cards on an area's page (the reader already takes records, not a line) | later |

## The rule on figures — 13 November, before it went to main

Rowland: *"every card that shows a figure needs its match check against the tool's own page, not just Stops and Line capacity. Any card
that can't be proven shows the sentence until it can."* So `line-evidence.mjs` step 7 opens every card that shows a figure, goes to the
tool's page and compares figure for figure, and FAILS on a card with figures it has no proof for. Proven and shown: calculators (Stops
across workstations and the generic ones), control chart, analysis, capability, Line capacity, and Line Talk (its counts are the talk's
own `talkCounts`, the count its sentence is written from; its latest answer is on the talk's page word for word). **Sent back to its
sentence:** the value stream — its page does not show those figures as tiles a check can read.

The same round: **Line Talk's card** (counts and the latest answer, no graph), and **the machine strip** now says a count and each
severity in one press that opens the worst problem — a problem's words are said once, under Problems (step 3, brought forward).

## No new graphs — Rowland, 13 November (this withdraws the list below)

Shown the order below, starting with a loss-count waterfall: *"They're all different metrics, all different things. We'd end up maybe
having 5 or 6 waterfalls … No, I don't think it's necessary. I'm not asking you to build more things. I'm asking you to use what we
already have."* So: **nothing new is drawn for a card.** A card may show a picture only when the tool's own page already draws exactly
that picture and the card reuses that component as it is; no chart is designed, adapted or summarised for the line page. The list
below is not a plan and nothing on it is built unless he names the tool.

## The order once offered (withdrawn — kept as the record of what was proposed)

1. **Loss count** — the waterfall of where the shift went, in minutes and pounds. The strongest single picture of a line.
2. **Control chart** — the run with its limits and the points out of control. Instantly read, even by someone who has never seen one.
3. **Capability** — the histogram against the specification limits.
4. **Reliability** — a bar for each stop, with MTBF.
5. **SMED** — the changeover before and after, internal against external.
6. **Work sampling** — the shares of what people were doing.
7. **Line balance** — each person's work against takt.
8. **Analysis** — before and after; its figures already carry it, so the picture adds least.

Each arrives with its match check, or it stays a sentence.

**Said plainly:** after step 1 a tool not yet in the list above shows its sentence on its card and no figures or picture. None is made up.
