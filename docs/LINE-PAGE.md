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
| 1 | The card, its reader, *What we found* and *What we produced*; figures for calculators (Stops across workstations with its bars), control chart, analysis, capability, value stream and Line capacity (with its bars) | built 13 November |
| 2 | Figures and the tool's own picture for the rest, tool by tool: loss count (waterfall), reliability (stop bars), work sampling, SMED, line balance, video study; the control chart's and capability's own pictures | next |
| 3 | Problems as short rows; the machine strip a count and a severity, never the problem's text again | next |
| 4 | The line drawn at the top; the four question headings give way to grouping by kind; the fold's contents rehomed | next |
| 5 | The same cards on an area's page (the reader already takes records, not a line) | later |

**Said plainly:** after step 1 a tool not yet in the list above shows its sentence on its card and no figures or picture. None is made up.
