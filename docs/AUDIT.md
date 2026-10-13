# The audit — the bar every screen meets

Rowland, 13 October: *"we need to run, I think, multiple audits to explore
elements that are missing, not functional properly, gaps basically ... the
amount of gaps that I'm finding are quite simple but important things ...
on the line standard, when I click on the PDF, I can't get out of it. There's
no X mark ... I'm always asking for reports, or cards ... there are still
quantification issues we've yet to even look at ... basic functionalities,
basic user interfaces, basic user experiences, flow, fluency, simplicity ...
run the audits, find the gaps and implement the improvements at pace."*

Placed (BLUEPRINT §8): every layer, every record, every place — it is the
floor under §3 and §4, not a new feature. Each gap found is written below,
fixed in a slice that ships live on its own, and held by a check so it
never comes back.

## The bar — what every screen does

1. **A way out of everything that opens.** Every sheet, drawer, viewer and
   preview shows an × (or Close / Done) on the screen at all times — not
   only a dimmed strip around it — and Escape and the back button close it.
2. **Every record edited and deleted where it sits.** Wherever a record is
   listed or opened, the person allowed to (lib/access) can change its words
   and delete it, with Undo; a delete says what goes with it.
3. **Paper wherever there is a list.** A page that lists records offers its
   report; a record that has a card offers the cards for all that are shown,
   as well as one at a time. The preview of either closes (1).
4. **Every number right, and said how it is known.** Each figure is the
   practice's figure, worked by hand in a test; its name is the practice's
   name; it says how many it came from and whether that is enough.
5. **The phone.** At 390 px nothing is off the side, no words are cut off,
   nothing to press is smaller than a fingertip.
6. **No dead ends.** Every page says where it is and has a way back; an empty
   page says what to do first.
7. **Simple with detail.** Where we are, why we are not where we should be,
   what we are doing about it — the rest one tap away (docs/SIMPLE.md).

## How it is checked

- `scripts/audit.mjs` drives every screen smoke opens, at a desk and on a
  phone: it presses each button that opens something and checks a way out is
  in view and Escape closes it (1); measures the phone (5); lists the pages
  with records and no paper (3) and the edit and delete words on each page
  for reading by hand (2). It deletes nothing and answers every confirm no.
- (3), once a list has its paper: `scripts/acceptance/list-paper.mjs`
  presses each button, saves the PDF and reads it back against the module
  that makes the screen's words; `scripts/report-stress.mjs` checks the new
  reports at every size (off the page, overprinted, near-empty, lost).
- (4) is checked module by module, against the practice, with hand-worked
  tests.
- (2), (6) and (7) are read by hand from the audit's tables, page by page.

## Findings, 13 October

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 1 | 1 | every sheet (`ui/Sheet`) | No × at all — only the dimmed strip, Escape and back. A tall sheet (the line standard PDF's preview, a long editor) grew to 16 px from the top, leaving nothing to tap: no way out on a phone. | Fixed: the sheet's head (title and ×) stays at its top as it scrolls. |
| 2 | 4 | capability study (`lib/ie/sample`) | What the app calls **Cpk** is worked from the overall spread of the readings (sample standard deviation) — the practice calls that **Ppk** (AIAG SPC; ISO 22514), or Cmk for a machine's run. Cpk is from the spread within — run to run, the moving range ÷ 1.128 for single readings. On a run that drifts the two part, and the drift is what a commissioning test must see. | Fixed: Ppk (overall) carries the verdict — the same number as before, its right name; Cpk from the moving range beside it; "it drifts across the run" when they part. Hand-worked tests. |
| 3 | 3 | line standard card | Square and tall boards squeezed into a wide frame; marks half as big again as the screen's; names crossing; the note over the people; 3 of 10 named. | Fixed (677c03e). |
| 4 | 2 | Line capacity, Line standard | No delete of a Line capacity anywhere; no rename or delete on either list; a map's delete took its capacity. | Fixed (6435d91). |
| 5 | 3 | Control room problems | Cards for one, a few, a group — never for all shown. | Fixed (7215d1f). |
| 6 | 3 | Line capacity — a product's page, and the list (`#/balances`) | A product's capacity — the sheet, the bottleneck, the V, a shift's make, what a pack costs — was on no paper of its own, and the list printed nothing. | Fixed: **PDF** on its page — one page: what limits the line and the module's sentence (where we are); the V, the bottleneck walked, the capacity sheet, only what is wrong to check (why); a shift, a pack's labour, the what-ifs tried, the people's work against takt (what we do) — `lib/capacityPaper`. **PDF (all shown)** on the list: a front saying every product shown in a row each, then each product's own. `report-stress` (tiny, ordinary, huge); `list-paper.mjs` 1–2. |
| 7 | 3 | Line standard — the list (`#/standards`) | Cards came one line's or one job's at a time — never for everything the list shows. | Fixed: **PDF (all shown)** — the line standard card for every product shown, each under its line's or its job's name (`lib/standardPdf`, `ui/ToolPapers`). `list-paper.mjs` 3; `report-stress` counts the cards. |
| 8 | 3 | Materials — a job's What we are waiting on | A list with no paper of its own; the client report carried only what is not in. | Fixed: **Materials report** — one page: how many are here; the late, how late, from whom and why their dates moved; what is still coming by the day; what has no date agreed; what is in, named once (`lib/materialsReport`, `lib/materialsPdf`). The list's "3 days late" words now come from the same module. `list-paper.mjs` 4. |
| 9 | 3 | Commission, Install, Set up, Hand over | Every test and every step has a card; the boards offered none for all of them. | Fixed: **Test cards** on Commission (every test on the board — its latest attempts, as the board counts them) and **Step / Item cards** on each gate — machine by machine, the card each record prints; each card numbers its own pages (`lib/trialCardPdf` numbers from the card's first page — a lone card unchanged). `list-paper.mjs` 5. |
| 10 | 3 | 6M board, lever tree, wins, next steps | Lists inside a job with no button of their own. | Has paper: the rail's **Reports** door — the client report prints the board by bone, the tree, the wins and what is next. Nothing added: a second door to the same report would be one thing in two places. |
| 11 | 3 | Programs — a job's and a line's | — | Has paper: the Programs report on both. A program has no card of its own, so none for all. |
| 12 | 3 | A line's page — its machines and the line itself | The line on one page (its facts, machines, programs, problems, tools); labels for a line's machines. | Open, planned: BLUEPRINT §6.5 — the line report comes with the line as the hub (Stage 3). Its problems already print (report and cards); a machine label needs the machine's own page to point to, which a line's machine does not have yet. |
| 13 | 3 | Notes | — | Not paper, by design: private preparation, left out of every document (`screens/NotesScreen`). |
| 14 | 3 | The studies' lists (Capability, Value stream, SMED, Work sampling, Loss count) | — | In hand in a separate slice. |
| 15 | 4 | Line capacity — the V-curve | A station thousands of times faster than the bottleneck (a unit or a rate typed wrong) drew the V's grid in steps of 40 to millions of lines: the tab ran out of memory. Found by the random capacity seeds that prove the new paper. | Fixed: past 400% the grid's step grows with the span — a handful of lines whatever is typed; a share past what a number holds draws no grid rather than looping for ever (`ui/VCurve`). `report-stress --seeds`. |
