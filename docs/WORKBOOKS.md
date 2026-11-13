# Workbooks in the conversation (10 November)

Rowland, 10 November: *"Attach an Excel workbook to the conversation and start talking to Faultline about the business information inside
it. The complexity belongs in the infrastructure, not in the user's experience."* — for genuinely large manufacturing workbooks, 50 MB and
far beyond, through the chat's existing attach control.

## The decision: the workbook is read on the device

- **What exists.** The app's server-side code is two small Supabase edge functions; there is no worker host and no Python. The project's
  storage takes 50 MB a file (the app's own sync refuses more). A workbook of hundreds of megabytes cannot be uploaded or opened server-side
  today without a new paid host and a storage plan change.
- **So it is read in the browser, in a background worker, straight from the file on disk** — the zip's directory read from its end, each
  part inflated and scanned in pieces (`src/lib/workbook`). The whole file is never in memory, never uploaded, and never sent to Claude.
  A client's workbook does not leave the laptop it was attached on.
- **What Claude gets:** the workbook's profile (sheets, columns and their types, what is wrong with the data, what could not be read) and
  the answers to the questions it asks — each worked out by Faultline's code over every row, with the cells it came from. Claude reasons
  and explains; the code counts.
- **What it costs:** follow-up questions work on the device that read it. Opened on another device, the assistant says the workbook was read
  elsewhere and asks for it to be attached there. A phone has far less memory than a laptop; the limits measured are said below.
- **The way to grow it** (`docs/DIRECTION.md`, long-term direction): a server worker can later take the same file and keep the same
  profile and query shapes behind the same capabilities, so nothing in the conversation changes. It is not built: nothing is provisioned.

## How a workbook is read — `src/lib/workbook`

| Part | What it does |
|---|---|
| `zip.ts` | The zip's end record (ZIP64 too) and central directory read from the file's end; each part inflated as a stream from its own slice |
| `xml.ts` | A streaming scanner for a sheet's rows and cells (value, type, style, formula, inline text), shared strings, entities |
| `read.ts` | The workbook: sheets and their state (hidden, very hidden), the date system, defined names, tables, styles' date formats; each sheet's columns, hidden columns, merged cells; what is listed but not read (pivot tables and their sources, external links, connections, a data model, macros, charts) |
| `store.ts` | Each sheet's cells kept by column in chunks of 32,768 rows — kept in the browser's private file storage (OPFS), in memory in tests |
| `profile.ts` | The header row found and said, each column's type (number, text, date, yes/no, mixed), blanks, errors, formulas and those with no cached value, repeated rows, the same name written differently, columns that link sheets |
| `query.ts` | Filters, groups (and a date by day, week or month), sums, counts, averages, minimums, maximums and distinct counts over every row; the rows behind any answer with their cell references; values that could not be used counted and named, never dropped silently |

Formulas are never recalculated: the value Excel saved with the file is used and said to be Excel's; a formula with no saved value is
counted and named. `.xls` (the old binary format) and `.xlsb` are refused in words — they are different file formats.

## In the conversation

- Attach as any document. A `.xlsx` or `.xlsm` is read as a workbook, with its progress shown in the conversation and a Stop; a small one
  that is a downtime table is also read as imported downtime, as before (`docs/AI-TOOL-INTELLIGENCE.md`).
- Capabilities (`src/capabilities/workbook.ts`): `workbook_profile` (what it contains and what is wrong with it), `query_workbook` (a
  question as a filter, groups and measures), `workbook_rows` (the source rows behind a finding, by cell). Kept on the conversation as
  `facts.workbooks` (the summary only); the cells stay on the device.
- The colleague is told: ask rather than guess what a column means, its unit or a business definition; say the header row it used; never
  call a partial read complete; every figure from `query_workbook`, quoted with its cells.

## Proved by

`src/lib/workbook/__tests__` against workbooks written by an independent generator that keeps its own totals as it writes
(`scripts/workbook/make-workbook.mjs`); `scripts/acceptance/workbook.mjs` attaching generated workbooks of increasing size in the browser,
measuring time and memory. The sizes reached are recorded below.

## Measured (10 November)

Workbooks written by the generator (a downtime log of nine columns — dates, text, numbers, formulas with saved values — a products sheet,
a hidden lookups sheet), attached through AI Mode's attach control in Chromium on this machine (4 cores, 15 GB), each answer checked against
the generator's own totals. Memory is the browser's renderer processes, measured from outside.

| Workbook | Rows | Read in | Renderers at most (before) | Every figure equal to the generator's |
|---|---|---|---|---|
| 57 MB | 1,400,000 | 13 s | 1.15 GB (0.68 GB) | yes — by reason, by month, by line, the 933 “n/a” cells named |
| 143 MB | 3,500,000 | 33 s | 1.24 GB (0.77 GB) | yes |
| 286 MB | 7,000,000 | 65 s | 1.41 GB (0.57 GB) | yes |
| **575 MB** | **14,000,000** | **120 s** | **1.47 GB (0.68 GB)** | **yes** — the largest read |

About 4.8 MB of workbook a second; memory grows little with size, because cells go to storage a chunk at a time. The same reader in Node
read the 575 MB file with its own memory flat at about 1 GB at most. Asking a 14-million-row sheet a question takes seconds.

**Proved in the browser** (`scripts/acceptance/workbook.mjs`): the 57 MB workbook read, asked by reason, month and line, the rows behind a
finding with their cells; no request carried the file (the largest to the gateway 6 KB); asked again after a reload with no second attach;
said not on this device when its storage was cleared; a read stopped part way said partial; a read left by a reload said interrupted; two
tabs reading two workbooks at once, each right; an old .xls refused in words; the phone.

## What it does not do, and the limits found

- **A private (incognito) window.** The browser keeps its storage in memory there; a workbook of hundreds of megabytes can fill it (in the
  tests a 575 MB one stopped at 99% in such a window). A storage write that is not answered within a minute fails the read in words, saying
  to use a normal window — never a hang. A reader the browser stops (out of memory) is caught by its heartbeat stopping and said the same.
- **Another device.** The cells stay where they were read; on another device the workbook is said to be read elsewhere, to attach it there.
- **A phone.** Measured on a laptop-sized machine only; a phone has much less memory and storage. Not measured.
- **Formulas are not recalculated** — the value Excel saved is used and said to be Excel's; a formula with no saved value counts as blank and
  is counted. A workbook saved by a program that saves no values (some exports) is said to have formulas with no saved value.
- **Not read:** pivot tables' own layouts (their source data is), external links' targets, data connections, a Power Pivot data model,
  macros, charts, comments — each listed by the profile. `.xls` and `.xlsb` are refused in words.
  Cell colours painted by hand ARE read since 13 November (last section); colours set by a rule, and font colours, are not.
- **The header** is found as the first row that is mostly words with data under it, and said; a sheet laid out differently (headers of
  numbers such as years, several tables on one sheet) may be read with the wrong header — the profile says the row it used and the colleague
  is told to ask. Several tables on one sheet are read as one. Since 13 November the person says the row and the look is read by it (last section).
- **Repeated rows** are counted in the first 4,000,000 rows of a sheet and said so beyond that; distinct values of a text column up to
  200,000, after which the column's top values and variants are not given.


## The first look — worked in code when a workbook is read (12 November)

`src/lib/workbook/firstLook.ts`. The moment a workbook is read, a dozen or so sums over every row give Luna's first turn with no AI asked: the sheet worth analysing (the most rows with a date, a figure and something to split by) and the dated tables beside it; the figure taken as the one that matters — a RESULT is a money column whose values run below and above zero, or whose heading says profit, variance or saving — said as a choice with the other candidates named; each month with its days, a part-month said as part and compared a day; the splits that stand out (one losing while the whole earns, or a spread a quarter of the total); a code said by the description another sheet lists it under (found by the reader from the values; a name with a space says itself); a 0/1 column counted as a flag with what it carries, never added up; the biggest mover between the last two whole months (`lib/data/change`); and what would mislead — a filter hiding rows, a figure on rows where the line or product is not said (blank, 0), time lost with no reason or every reason "Unclassified", formulas with no saved value, error cells on the workbook's own summary sheets. It does not interpret: why is Luna's work and the person's. Measured: 0.2 s over 10,000 rows, 15 s over 1.4 million. Proof: `firstLook.test.ts` against `scripts/workbook/make-hourly-workbook.mjs`'s own totals; `scripts/acceptance/ai-first-look.mjs` in the browser.


## The first look, made to read a large, messy workbook — 12 November (evening)

Rowland attached two real workbooks (17 MB and 137 MB; neither they nor their figures are in the repo). What they taught, each kept as a
case in `scripts/workbook/make-hourly-workbook.mjs` (made-up figures) and `firstLook.test.ts`:

- **A data sheet is not thrown out for its error cells.** They were counted against the sheet's ROWS; a table of 87,000 rows with a few
  cost-per-pack columns dividing by zero was rejected whole and Luna said nothing. They are now counted against its cells.
- **Never silence.** No table to lead with, or a look that fails: `noLook` says so, names the biggest sheets and asks where to start.
- **Several columns can read as a result.** Each is summed and the rows it is filled on counted; the lead is the one the notebook of
  meanings names, else the best-named of those filled on most rows; a column filled only under a flag is said so and never leads by
  itself; the question "which one does the business manage by?" is asked.
- **Small groupings are always said** (the shifts), "none stands out" when none does.
- **Part-months are read from the dates** (a first month starting after the 3rd, a last month stopping more than three days short).
- **A working copy** (a sheet with the same headings) is said and not added in; the opening line counts data sheets apart from reports.
- **Rates and copies are not figures**: CPP, CPT, PPM, OEE, targets, and a heading the reader numbered "(2)".
- **The receipt** of a workbook with more than four sheets names its three largest and counts the rest; the source code is not shown.

- **Where the workbook's own reports get their numbers** (13 November — Rowland: *"you'll find … the business is using this as its main
  metric because I can see the way everything flows towards it"*). The reader follows each sheet's formulas to the COLUMNS of other
  sheets they use (`SheetProfile.drawsOn` — `SUMIFS('RAW data'!$M:$M, …)` counts one for that column, said by its heading; a range more
  than six columns wide is a lookup and left out) and reads what each pivot table adds up (`WorkbookProfile.pivotSums`, from the data
  fields' names; layouts still not read). The first look says it beside each result column ("24 formulas on Board report draw on it")
  and leads with the one the reports plainly rest on — three uses or more and twice the next — asking the person to confirm; when two
  columns are used about equally (the real 17 MB workbook: 229 against 230) it falls back to the rows filled and still asks. It will not
  help where summaries are typed-in numbers, and a shared formula is counted once, not once a cell.


## The Excel work, finished — 13 November

Rowland, 13 November, on going into a business as its production manager: *"I can sit next to the manufacturing manager and go, check this
out. This is what's happening currently in the business."* — then, told four things were still listed as next: *"I didn't realise that the
Excel system wasn't fully completed, so you drive that through to completion immediately."* The four, each built on what was there (the
reader, the first look, the conversation's own reports) and each worked in code, with no AI asked:

- **The headings, as the person says them** (`lib/workbook/amend`, capability `read_workbook_as`). The reader takes the opening row that is
  mostly words as the headings; a details strip above them, or no headings at all, is read wrong. The person says *the headings are on row
  5*, *column M is the variance*, *start with “RAW data”*, *“Fin var £” is the result*, *“Week ending” is the date* — and the workbook
  ALREADY READ on this device is understood that way: each column takes the row's words (a column the row says nothing over stops being
  named), the rows down to it stop being data (kept in the store, read by no question — `SheetProfile.dataFrom`), and what was said is
  kept on the sheet (`amended`). Then the first look again, by that. The file is never changed. **Limit:** rows ABOVE the header the
  reader chose were never kept, so a heading row above it needs the workbook attached again — said in words. When the reader finds no
  table to lead with, the three biggest sheets are offered as *Start with “…”*.
- **A finished pack from the first look** (`lib/workbook/lookPack`, capability `workbook_pack`). *Make this a pack* is the first thing
  offered under a first look. It lays the look out as one of the conversation's own reports (`lib/data/outputs` — so it downloads as a PDF
  and as slides through the code that already made those, and `build_report` adds to it): **In short** (the lead figure over the period,
  where it sits most, what moved, a figure already read that changed), what the workbook holds, the lead figure month by month as a chart
  with what the look said of the period, what changed since it was last read, the lead figure by each thing it splits by as a chart with
  the look's sentence where one stood out, what moved, the tables beside it, the colours, and what to know before trusting it. Every
  chart is drawn from a RESULT asked of the rows and kept on the conversation, so the paper's last page says what each figure rests on.
  On paper the look asks nobody anything (`forPaper` takes off "say if it is another", "tell me and I will remember it"); a sentence that
  also says a derived figure (a day's average) is printed as plain text, never flagged.
- **The same workbook, next month** (`lib/workbook/sinceLast`). Every first look leaves a snapshot — the lead figure's total, each month,
  each split's groups; a few dozen numbers — on the file's record in the register (`facts.source.look`, synced as every record is). A
  workbook whose lead sheet has the same name and four in five of the same headings as one read before **for the same customer** is
  compared with it: the rows added, the new months, a part month now whole, and a WHOLE month whose figure is not what it was — *"Figures
  already read have CHANGED"*, with both figures and the plain statement that the file does not say why. A file that replaces the last
  (no month in common) is compared by its totals and its biggest mover. A different lead column is said and not compared. One customer's
  snapshot is never used for another's workbook; the earlier file's cells are not needed (it may be on another device, or gone).
- **Cell colours as a column** (`lib/workbook/colours`, `read.ts`). A cell style's SOLID fill — by its rgb, by a theme colour and its
  tint, by the old indexed palette — is read as one plain word (red, orange, yellow, green, blue, purple, pink, grey, black; white and no
  fill are no colour). A row whose cells all wear one fill is **Row colour**; otherwise each painted cell is its column's **Colour of
  ‹heading›**. They are columns like any other: split by them, filter on them. A fill on nearly every row is decoration and is not kept.
  The first look says each with its counts, that what a colour MEANS is not in the file (Luna asks, and keeps the answer in the
  notebook), and that colours put on by a rule (conditional formatting) are not in the cells and are not read. **Not read:** font
  colours, gradient and patterned fills, the colours of a table style.

**Charts of figures below zero** were wrong and are put right (`lib/data/outputs` findingOf, `lib/data/chartSvg`), found by reading the
pack's own paper: a chart of losses said *"Line 2 is the biggest: −8,586"* of the line that lost least, its scale ran in ticks from the raw
lowest value, and the bars' figures were cut off at the edge. A series that runs below zero now names the LOWEST (with its share of the
whole when every value is below zero, and the highest too when some are above), is drawn on round steps through a zero line, and labels
each bar at its own end. A month's key is written as a month (*Aug 2026*). Nothing above zero is said or drawn differently. On the report's
paper and slides a section's kind is printed only where it tells the reader what weight to give it (finding, summary, recommendation,
table) — not TEXT or CHART.

**Answered by the app, no request sent** (`colleague/lookAsk`): *Make this a pack*, *Start with “Sheet”*, *The headings are on row 5*,
*Column M is the result* — when that is the whole of what was said and the conversation holds one workbook. Said another way it goes to
Luna, who has the same two capabilities.

**Proof.** `src/lib/workbook/__tests__/marked.test.ts` (17) and `src/capabilities/__tests__/look.test.ts` (4) against
`scripts/workbook/make-marked-workbook.mjs` — a hand-kept shift report (every name and figure made up) with a strip above its headings,
painted rows and cells, and the same report a month later with one figure quietly changed — checked against the generator's own totals;
`src/colleague/__tests__/lookAsk.test.ts`; in the browser `scripts/acceptance/workbook-finish.mjs` (55 checks: each of the four with no
request to the gateway, the pack's PDF and slides downloaded and read back, the phone).

**Not proved.** Luna's own use of `read_workbook_as` and `workbook_pack` against the real model (no real-model run was made — Rowland's
word); a real site's workbook with these features (the generator's is the shape, not the mess); colours and the pack on a workbook of
millions of rows (measured only on hundreds); a phone reading a large workbook, as before.
