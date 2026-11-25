# Workbooks in the conversation (10 November)

On attachment Luna now acknowledges the workbook by name and asks what to do with it. Analysis, sheet profiles and period comparisons are available when requested. Large workbooks that stay on this device and partially readable workbooks are identified in the receipt. Multiple workbooks produce one acknowledgement. Progress disappears when reading finishes.

Rowland, 10 November: *"Attach an Excel workbook to the conversation and start talking to Faultline about the business information inside
it. The complexity belongs in the infrastructure, not in the user's experience."* — for genuinely large manufacturing workbooks, 50 MB and
far beyond, through the chat's existing attach control.

## The decision: the workbook is read on the device

- **What exists.** The app's server-side code is two small Supabase edge functions; there is no worker host and no Python. The project's
  storage takes 50 MB a file (the app's own sync refuses more). A workbook of hundreds of megabytes cannot be uploaded or opened server-side
  today without a new paid host and a storage plan change.
- **So it is read in the browser, in a background worker, straight from the file on disk** — the zip's directory read from its end, each
  part inflated and scanned in pieces (`src/lib/workbook`). The whole file is never in memory, never uploaded, and never sent to Claude.
  Since 16 November the file (up to 50 MB) is kept for the person's own other devices — below.
- **What Claude gets:** the workbook's profile (sheets, columns and their types, what is wrong with the data, what could not be read) and
  the answers to the questions it asks — each worked out by Faultline's code over every row, with the cells it came from. Claude reasons
  and explains; the code counts.
- **On every device (16 November — Rowland: *"Luna cant see files uploaded from another device big problem upload on laptop must be viable
  to phone user and other way round"*).** The file itself is now kept with its record in the register (the `source` study's
  `facts.docPhotos`, field `workbook-file` — `src/lib/workbook/carry`), so the app's sync carries it to the person's other devices by the
  rule every photo and document follows (`faultline_can_see_media`: a file named by a record the person can see — one customer's workbook
  reaches only the devices of people who can see that record; no new table, policy or migration). On another device the first question
  about it brings the file down and reads it there (`profileHere`), then answers — still read on the device, still never sent to the
  model. The cloud takes a file up to 50 MB: a bigger workbook stays on the device that read it, and the attach says so. A file not yet
  arrived (the other device offline) is said in words, never a figure. `scripts/acceptance/workbook-devices.mjs` proves it.
- **What it costs:** a workbook over 50 MB is asked only on the device that read it. A phone has far less memory than a laptop; the
  limits measured are said below.
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

## The model on top of the rows — 14 November

Rowland, 14 November, asked how much Luna understood of a real KPI workbook (a customer's; its figures are kept out of the repo). Her
reader and first look were run over it unchanged and compared by hand with the workbook's own figures. She read the rows right — and
missed the model the workbook lays over them: its reports leave some rows out (a flag every report formula holds to 0), it runs in its own
weeks, and it carries a sheet of its own checks, one of which says the error cells she warned about are intended. Told the three things
that would close that — *"go do all 3"*. Each is worked in code from what the file holds, with no AI asked, and each is said as a
READING the person can overrule.

### 1 · The rows the reports leave out (`read.ts` criteriaOf, `firstLook.ts` the basis)

**What it does.** The reader already follows the formulas on other sheets to see which columns a workbook's reports draw on. It now also
reads the CONDITIONS those formulas sum under: in `SUMIFS · COUNTIFS · AVERAGEIFS · MAXIFS · MINIFS · SUMIF · COUNTIF · AVERAGEIF`, each
pair *a single column of another sheet → a constant written in the formula* (`…,Data!$E$2:$E$9000,0)`, `"Approved"`, `"<>1"`), and in
`SUMPRODUCT` the form `(Data!$E$2:$E$9000=0)`. A criterion that is a cell reference or built from one (`">="&Control!$F$5`, `$Q$2`) is the
window or the shift the person picked on the report, not a rule — it is ignored. Kept on the sheet's profile: `holds` (the other sheet,
the column by its heading, is / is not, the constant, how many formulas) and `sumsFrom` (how many formulas sum that sheet under a
condition at all).

**The rule (a choice).** A column of the lead table is the reports' basis when at least **3** formulas hold it to one constant AND those
are at least **half** of the formulas that sum the lead table under any condition — and holding it both keeps rows and leaves rows out.
Then the first look reads every figure on the same basis, and says so, with both totals: how many formulas on which sheets, the rows kept,
the rows left out and what of the lead figure they carry, and the total with them in. *"Read every row"* (answered by the app, no
request) reads them all; *"Leave them out"* goes back. Nothing is left out silently, ever.

**What it will not claim.** Why the rows are left out — the file does not say. A condition written through a named range, a table's
structured reference (`Table1[Flag]`), a helper column, a pivot's filter or a macro is not read; then nothing is left out and nothing is
said. A formula shared down a range is counted once (Excel writes its text once).

**Carried through.** The look's snapshot keeps the basis, and the same report read next time is compared only like with like (a look on
every row is never compared with one on the reports' basis — said). The pack's charts are asked on the same basis. `workbook_profile`
tells Luna the basis, so her own questions of the rows follow it unless the person asks for every row.

### 2 · The workbook's own weeks (`week.ts`, `query.ts` bucket, `firstLook.ts` the week)

**What it does.** A business week is found from the DATES, never from a heading alone: a date column whose dates all fall on one weekday
(`ColumnProfile.weekdays`, counted as the sheet is read) is a week column — a *week ending* or a *week commencing* by its heading
(`ending · w/e` / `commencing · w/c · start`), else by a second such column on the same sheet six days on (a calendar: start and end),
else by the day (a Monday starts a week; any other day ends one). The weekday most such columns agree on is the workbook's week
(`WorkbookProfile.week`: the day it ends on and the columns it was read from). A text column that names each week — one name a date,
one date a name, on the same sheet — is read as the workbook's own names for its weeks (`week.names`, the week's last day → the name,
e.g. a financial week number), a calendar's first.

**Used.** `time: { by: 'week' }` in any question of that workbook groups by ITS week — the key is `w/e 2026-07-04`, with the workbook's
name after it when it has one — and the answer's notes say so. A workbook with no week of its own is grouped by ISO weeks as before
(`2026-W27`). The first look adds, after the months: the day the weeks end on and where that was read, the latest WHOLE week by its own
name against the week before and against the average of the weeks before it (up to 12), and a week still being filled said as part.
*Week by week* is offered next.

**What it will not claim.** A financial YEAR or period — only the week and the names the workbook itself gives. Where two columns
disagree about the day, the most common wins and it is said as a reading. A calendar whose first row was taken as headings loses that
one name unless the heading is itself a date. Weeks are not read from a week NUMBER column with no dates.

### 3 · The workbook's own checks (`checks.ts`, `firstLook.ts` the checks)

**What it does.** A small sheet that is a list of *label → value* lines, named for it (*health · check · validation · reconciliation ·
control totals · integrity · audit*) or carrying status words (*PASS · FAIL · OK · STALE · FRESH*), is read as the workbook's own checks —
its first line put back when the reader took it for headings. Each line is then one of:

- **not fine, by its own word** — a status that says so (*FAIL, STALE, ERROR, WARNING, MISMATCH …*); said first;
- **agrees** — a number Luna can make from the rows, equal to within 0.005% (or 0.5 for a count): a table's rows; the rows a flag
  marks; the rows with no reason; a sum of a column of the lead table or a table beside it — over everything, over the latest whole week,
  over the four weeks to it, or over a week the line itself dates — on the reports' basis and on every row; the latest date in a table;
- **close** — within 0.5%, said with both figures;
- **a ratio** — a percentage equal (to 0.006 of a point) to one column of the lead table over another, tried only over a window another
  figure on the same line agreed in, else the latest week and everything; said as *the same as “A” ÷ “B”*, a reading;
- **cannot be made from the rows** — said plainly, with the figure: the workbook works it by its own formulas; Luna asks how it is made;
- **fine / noted** — counted, not listed.

A line that names a sheet and says it is intended (*intentional · by design · expected · known*) answers the first look's own warning
about that sheet's error cells: the warning is replaced by the workbook's own words.

**What it will not claim.** That a figure which agrees is RIGHT — only that the rows add up to what the workbook's own check says. That
a figure she cannot make is wrong. A match is by value: two different things that happen to be equal would read as agreeing, so only
counts of 10 or more and sums of 100 or more are matched, and what it was matched with is always said. Checks spread over a dashboard
(not a list) are not read. At most 50 lines.

### Proof

`scripts/workbook/make-kpi-workbook.mjs` — a KPI workbook of the same SHAPE (every name and figure made up): production rows with a flag
its report formulas hold to 0, a downtime log by week ending **Saturday** (so its week is not the ISO week), a set-up sheet with the week
calendar and each week's name, a report sheet of `SUMIFS`, and a checks sheet (row counts, a stale status, the week's packs and
efficiency on the reports' basis, a figure made by a formula the rows cannot give, an *intentional* note about the trend sheet's error
cells) — with its own totals kept as it writes. `src/lib/workbook/__tests__/model.test.ts` checks each of the three against those totals
and `criteria.test.ts` the formula reading; `scripts/acceptance/workbook-model.mjs` drives it in AI Mode with every request counted.
Checked by hand against the real workbook that prompted it (scratchpad only).

### As built — what moved from the specification, and what the real workbook taught

- **Two halves of one figure.** A real checks sheet split its operating variance into two named parts on one line; neither agreed alone
  and their sum did. So neighbours on a line that do not agree alone, and whose SUM is nearer to something the rows give than either is,
  are said together (*“Rate + Crewing”*) — agreeing or close by the same tolerances.
- **Names from the label.** Unnamed figures side by side take their names from the label place for place (*Since the start / Last 4 weeks /
  This week*, or the bracket of *Capacity used (production / downtime)*); a note after a number (*“(all matched)”*) is not part of it; a
  percentage under 1 that matches nothing is only noted.
- **The right table.** Two tables whose latest dates are equal, or a count that equals two things, are matched with the one whose name
  the line shares words with — said, as always, with what it was matched with.
- **A heading that is a row of data.** Where the reader took a calendar's first row for its headings, the week sentence says *the dates
  on “Setup”* rather than a serial number as if it were a heading, and that row's own name for its week is put back.
- **Offered next.** *Week by week* is the second thing offered under a look (three are shown), after what moved.
- **Tolerances kept as specified.** On the real workbook the two halves came to just outside *agrees* (0.005%) of the rows' figure and are said *close*, with both figures. The tolerance was not loosened to make it agree.
- **`read_workbook_as`** takes `everyRow` (true · false); *Read every row*, *Include them*, *Leave them out*, *Read it as the reports do*
  are answered by the app when that is the whole of what was said (`colleague/lookAsk`).


## Any workbook — the shapes factory workbooks come in (14 November)

Rowland, 14 November: *"excel abilities is not on just this workbook it generalistically all of them … Luna must understand any work book
.. can she?"* She could not. Measured, not guessed: sixteen made-up workbooks, each a shape factory workbooks really come in, each with
its own truth, run through her reader and first look as they stood. **2 right, 3 partly right with something missing or misleading, 4
confidently wrong, 7 an honest "I cannot tell".** The wrong ones were the worst: she added up sample numbers, added up unit prices, took
the day shift for the whole, and read stop durations as dates. Told the three steps that would close it — *"go do all 3"*.

The reader had one idea of a workbook: one table a sheet, one heading row in its first thirty, a row a record, every number a thing to
add up. This section replaces that with **the shapes**, each recognised from the cells (never from a sheet's name alone), each said in
words when it is used, and each a READING the person can overrule. No AI is asked in any of it.

### Step 1 · Never a wrong figure

- **Total rows** (`read.ts`). A row whose label is a total — *Total*, *Grand Total*, *Subtotal*, *Line 2 Total* — and that holds a
  number is the sheet's own adding-up, not a record. It is left out of the rows and said: how many, with examples. *Not claimed:* that
  the total is right; a product whose name starts with the word (*Total Greek Yoghurt*) is not taken for one.
- **What is added up, and what is not** (`firstLook.ts` kinds). A column of numbers is one of:
  - *to add up* — as before (a result, time lost, money, volume);
  - **a number that only counts the rows** — whole numbers, each once, running in step (a sample number, a row number): never a figure;
  - **a limit or a level** — named for it (*limit, spec, tolerance, nominal, LSL/USL, reorder, min, max*), or the same one or two
    values down twenty rows or more: never added up; used to judge the column beside it;
  - **a price for one** (*unit cost, price, each, £/kg*): never added up; where a quantity sits on the same row the two are
    MULTIPLIED row by row and that value is offered as the figure (*“Qty on hand” × “Unit cost £”*), said as a choice;
  - **a measurement** — a weight, a temperature, a thickness: values that sit close round one level (spread under a quarter of the
    average) beside limits, or under a heading that names a property. Said by its average, its lowest and highest and its spread —
    and, where limits are on the row, how many rows are outside them, below and above;
  - **a rate** — a percentage (by the cell's own format or its heading: *%*, *efficiency*, *OEE*, *yield*): averaged over the rows,
    never added, and said to be a plain average in which every row counts the same.
  The lead figure is still something to add up where the sheet has one; then a value, then a measurement, then a rate.
- **Durations kept as times** (`read.ts`). A cell formatted as a time whose format is an elapsed one (`[h]:mm`), or whose heading says
  it is time lost (*duration, downtime, stop, delay, lost, elapsed*), is read as MINUTES — a figure to add up — not as a date. A clock
  time (a start, a finish) stays a time.

### Step 2 · The shapes

- **Headings far down** (`read.ts`). Lines of notes above the headings (rows with one cell) no longer use up the thirty rows the
  reader looks through; up to 400 are passed over.
- **Numbers and dates typed as words.** A column where nine in ten cells read as a number with its unit (*“45 min”*, *“1,250”*,
  *“£108.00”*, *“85%”*) or as a date (*12/04/2026*, *12-Apr-26*) is read as numbers or dates; the cells that do not read are left as
  words and counted. A code with a leading zero is never made a number. Day/month order is British unless a day over 12 says otherwise.
- **A name written once, then left blank** — or merged down its rows. The first columns of a table, where each name is written once
  with blanks under it (or a merged cell covers them), are filled down, so every row carries its line, its product, its week.
- **Two rows of headings.** When the heading row repeats itself (*Packs, Downtime, Packs, Downtime*) and the row above names the
  groups (*Days*, *Nights*), each column is named by both (*Days · Packs*) and the sheet is read as rows — one a record a group —
  with the group as a column of its own.
- **Periods across the top.** Three or more number columns headed by months, weeks, dates, quarters or years are a grid: it is read
  as rows — one a line (or whatever the first columns hold) a period — with the period a date where it reads as one, and the figure
  named by the title above the grid, else the sheet. A *Total* / *YTD* / *Average* column of the grid is not one of its periods.
- **The same table on many tabs.** Tabs with the same headings whose names run in a series (*Wk 15, Wk 16 …*, *Jan, Feb …*,
  *Line 1, Line 2 …*) or whose dates do not overlap are one table, read together with the tab as a column. Tabs with the same
  headings and the SAME dates are a copy, as before: said, and not added.
- **Several tables on one sheet.** A new heading row after a gap — all words, over columns that held numbers until then — starts a
  table of its own, named by the title above it (*Summary › Downtime by reason*).
- **What a table is made from is said**, in a sentence, in the first look and in the profile Luna reads, and every answer's cell
  references still name the ORIGINAL sheet and cell.

### Step 3 · Workbooks with nothing to add up

- **A register of words** — an action log, an audit, a snag list: rows with names, dates and a status but no figure. The figure is
  the COUNT of rows: by each thing it splits by (status, owner, area, priority), by month raised; and, where a column is a due date
  and a status says what is closed (*closed, done, complete, resolved*), how many are past their date and not closed, as of today.
- **A form** — labels down one column, answers beside them, of mixed kinds. Read as one record and said answer by answer. Three or
  more tabs that are the same form are a table — a row a tab, a column a label — and read like any other. A sheet of the workbook's
  own checks (above) is a form with status words, and is read the same way.

### What it will not claim

That a shape it did not recognise is not there; that a reading is the meaning (a count of open actions says nothing of whether they
matter). **Not read:** tables side by side on the same rows are left as one wide table (it reads correctly today, by its headings);
a grid with periods DOWN and names across; three or more rows of headings; forms laid out in two or more pairs of columns; text
numbers in a column where fewer than nine in ten read. A table made from sheets is made when the workbook is read: saying afterwards
where one tab's headings are does not remake it — attach the workbook again. Old `.xls` and `.xlsb` are refused in words, as before.

### Proof

`scripts/workbook/make-shape-workbooks.mjs` writes the sixteen — seventeen as built — (every name and figure made up) with their truths;
`src/lib/workbook/__tests__/shapes.test.ts` holds each to its truth — the right table, the right figure, the right total, and the
sentence that says how it was read; `scripts/acceptance/workbook-shapes.mjs` attaches a handful through Luna's attach control with every
request counted. The earlier generators and their tests still pass unchanged, bar the checks sheet's headings (it is read as a form now).

### As built — what moved from the specification, and what is and is not proved

- **Where the work is.** `textCells.ts` reads a cell of words (a number with its unit, a date, a total label, a period heading).
  `read.ts` finds the headings (notes passed over), leaves the total rows out, reads typed columns and durations, fills names down,
  names two rows of headings, and starts a table of its own at a new heading row (`SheetProfile.partOf`, `fromRow`). `shapes.ts` is the
  **normalising pass**, run once when the workbook is read: it writes the MADE tables into the same store as extra sheets of the
  profile (`derived: { how: 'unpivot' | 'stack' | 'forms', from, said }`), marks the sheets they were made from (`readAs`), and keeps
  for every made row the sheet, row and column it came from — so `query_workbook` and `workbook_rows` answer from a made table with
  references to the ORIGINAL cell (`Output!C5`, `Wk 16!A2`). `firstLook.ts` knows a figure by its kind (`Figure`: summed, averaged,
  counted, or a value worked row by row) and says each its own way; `formLook` says a form.
- **The number itself is said** (found by the browser script, not the specification): the sentence that names the figure now carries
  it — *“Downtime (mins)” as the figure that matters: 13,024 over 240 rows* — for a sum, an average and a value alike. Before, a first
  look gave the splits and never the whole.
- **A small table beside the main one** moved from *not read* to *left out and said*: columns to the right of a gap in the headings,
  filled on under half the rows, are not the log's and are named as left out. They are still not read as a table of their own.
- **A sheet of words only is now counted** where it was met with "I cannot tell" (`firstLook.test.ts` changed to say so); one with
  nothing to count by — every name once, no date — still says nothing rather than guess.
- **The workbook's own checks sheet is a form** (labels with answers), so its first line is a line and not a heading; the checks are
  read from it as before (`model.test.ts`, one assertion changed).
- **Luna is told** (`capabilities/workbook.ts` `readSaid`, the colleague's instructions): which table the app made and to ask that
  one, which sheet is a form, which table sits on which sheet, what total rows were left out, and for a column that it was typed as
  words, kept as a time, a percentage or filled down; and never to add a rate, a measurement or a price, and to count a register.
- **Limits, as built.** A grid is read as rows up to 3,000,000 made rows; a form up to 120 lines; a column is read as typed numbers
  or dates only when nine in ten of its cells read; tabs are stacked only when their headings are the same AND their names run in a
  series or their dates do not overlap; a table made from sheets is made at read time (saying afterwards where a tab's headings are
  does not remake it).
- **What the real workbook taught** (the KPI workbook of the section above, run through the new reader by hand; none of it in the
  repo). Three things the sixteen did not show, each now a rule and a test on a seventeenth made-up workbook (`17-report-on-log`):
  - *A report is not data.* Leaving a Total row out of a report sheet tipped it over the line into "a table of rows", and its
    figures — the lead table's own, summed by formulas — were offered beside the lead table. Now a small sheet whose own formulas add
    up another sheet (three or more, and half its rows or more; `SheetProfile.sumsFrom`) is that sheet's report and never a table
    of its own, unless the person points at it.
  - *A total row's formulas are still the report's.* The rule the reports sum under was read from fewer formulas once total rows
    were left out. The formulas of a row left out are followed all the same (`read.ts` `follow`).
  - *A weight times a standard time is not a value.* On a product master the value rule multiplied a pack weight by standard hours
    a pack. It now needs a COUNT of things (a quantity, a stock — never a weight or another property) and a price in MONEY; any
    other per-unit column is said as "a figure for one, not a total" and left alone.
  With those, the first look of the real workbook is the same as before this work, figure for figure.
- **Speed.** The same 57 MB, 1.4-million-row workbook read by the reader as it was and as it is, in Node on this machine: 18.6 s
  before, 19.6 s after — about 5% slower, for the extra work on each cell. Its first look: 10.5 s before, 12.8 s after — one more pass over
  the rows, to say the number itself.
- **Proved:** the seventeen made-up shapes, each to the truth it was written from — in code (`shapes.test.ts`, 23 tests;
  `textCells.test.ts`, 13) and thirteen of them in the real page with no request to the AI service (`workbook-shapes.mjs`, 38
  checks); the earlier workbook tests and browser scripts still pass.
- **Not proved, said plainly.** The seventeen are the bench this was built against, so they measure that these shapes are read, not
  that every workbook is: a real workbook will bring a shape, or a mixture of shapes, that is not among them, and the honest fallback
  — "I cannot tell which sheet holds the figures; tell me" — stays. What the real model does with a made table (does she ask it, and
  say the reading) is written into her instructions and her profile but has NOT been run against the live model: no real-model run
  was made for this work.

## Any workbook, round two — mixtures, and the shapes round one left unread (14 November, evening)

Rowland, told where the first round stopped: *"yes do it"*. Eleven more made-up workbooks (18–28 of
`scripts/workbook/make-shape-workbooks.mjs`), harder than the first seventeen — mixtures of shapes, and the ones listed as not read —
were written and run through the reader **before any of it was changed**: **3 right** (a mixture of four first-round shapes on one
sheet; a tab a line; an audit of Pass and Fail), **1 partly** (a row of units under the headings — the total right, the units row
counted as a row), **6 wrong**, **1 an honest "I cannot tell"**. The wrong ones: lines across the top (Line 1 taken for the whole);
three rows of headings (one column taken for the whole); a form in two pairs of columns (read as a table); headings repeated down
the sheet as a printed report repeats them (each page read as a copy of the first — 1,444 of 13,024); an outline pasted from a
pivot table (the lines and their reasons added together); quantities in mixed units (kg, packs and litres added up). What is
built for them, each recognised from the cells and SAID:

- **Headings repeated down the sheet** (`read.ts`). A row that says the headings again, word for word in the same columns, is the
  heading printed again and is passed over — one table, and how many times it was repeated is said.
- **A row of units under the headings** (`read.ts`). A row straight under the headings whose cells are all units (*mins, packs, £,
  kg, %, hrs …*) over columns of numbers is taken into the headings — *Downtime (mins)* — and is not a row of data.
- **Names across the top** (`shapes.ts`). Three or more number columns whose headings run in a series (*Line 1, Line 2 …*,
  *Head 1 … Head 12*) or are all shifts are one figure by that name: read as rows, the name a column of its own (*Line*), like
  periods across the top. A heading row may hold dates (a day a column) — it is still the heading row when words head the first
  column.
- **Three or more rows of headings** (`read.ts`, `shapes.ts`). Every row of groups above the headings is kept — *Granola 500g ·
  Days · Packs* — and the sheet is read as rows with a column for EACH level of group.
- **A form in pairs of columns** (`read.ts`, `shapes.ts`). Label, answer, label, answer across a row is still a form: every pair is
  an answer.
- **An outline** (`shapes.ts`). Rows whose figures are each the sum of the rows under them — a pivot table pasted as values, a
  report with its group rows — are the group's own adding-up: the rows under them are read as the table, the group a column, and
  the group rows left out and said. Only when EVERY number column agrees, for two groups or more.
- **Quantities in mixed units** (`firstLook.ts`). A quantity beside a column that says what each row is counted in (*UoM*, or a
  column whose values are all units), with two units or more, is never added across them: its total is said unit by unit, and the
  rows are counted for everything else.
- **A tab a line.** The column a stack of tabs gets is named for what the tabs are — *Line*, *Week*, *Month*, *Shift* — and *Tab*
  only when that cannot be told.

**Not claimed:** an outline three levels deep is read by its lowest level only where every level adds up; a units row is taken only
when every cell in it is a unit; mixed units are told from a unit column, never guessed from the size of the numbers. **Proof:**
`shapes.test.ts` (round two), `workbook-shapes.mjs` (round two attached in the page). As built, below.

### As built — round two

- **After:** all eleven read to their truth (`shapes.test.ts`, 36 tests in all now), and the first seventeen still do. In the real
  page `workbook-shapes.mjs` attaches twenty-one of the twenty-eight through Luna's attach control — 55 checks, no request sent.
- **Where the work is.** `read.ts`: `headingAgain` (a row equal to the headings by column is passed over; `headingsRepeated`), the
  units row (`UNIT` in `textCells.ts`; `unitsRow`), every row of groups above the headings (`ColumnProfile.groups`), a heading row of
  dates (words head the first column, the dates run forward, plain numbers under them — a row of milestone dates, with dates under
  it, is not one), a form in pairs (the answers DOWN a column must be of mixed kinds, so a four-column table is not taken for one).
  `shapes.ts`: `outline`, names across the top inside `unpivot`, a column for each level of group, `dimName` naming a stack of tabs.
  `firstLook.ts`: `Roles.byUnit`, and of two columns that read as time lost the minutes lead a count of stops.
- **Moved from the specification.** A stack of week tabs now gets a column called *Week* (it was *Tab*); the first-round test and
  browser script say so. A column named only *Minutes* beside a count of *Stops* is read as the time those stops lost.
- **The real KPI workbook** (by hand, none of it in the repo): its first look is the same as before round two, sentence for
  sentence — one wording fixed on the way (a date the reader took for a heading is said as "the dates on …", never quoted as a name).
- **Still not read, said plainly:** an outline three levels deep; a grid whose periods run DOWN the first column with names across
  AND a second set of names beside them; a units row where only some cells are units; mixed units with no unit column (told only by
  the size of the numbers — never guessed); a form whose labels sit ABOVE their answers; a sheet where two tables sit side by side
  and both are full length (read as one wide table — its figures are right by their headings, but the two are not told apart).
- **Not proved.** The twenty-eight are still a bench of my own making: they show that these shapes are read, not that every
  workbook is. No real-model run was made, so what the live model does with a made table is in her instructions and her profile
  but untested.

## The reading — what a person tells Luna about a workbook, kept for that customer's report (15 November)

Rowland, 14 November: *"where is the excel ceiling — Luna will always need some help to understand the sheet and that's fine, even
you do."* Then, told the ceiling is **meaning and cheap correction, not shapes**: *"Do it."* A workbook is one site's habit: which
column they manage by, which rows do not count, that *Score* is a percentage. No reader can know that from the cells. What the
reader CAN do is make being told cost one short sentence, apply it in code, and **never need telling twice** — next month's copy of
the same report is read the way the person said, and says so.

**What was there before this (13–14 November).** A person could already say the sheet to start with, the row the headings are on, a
column's name, the column that is the result or the date, and "read every row". Each was applied in code — but kept only on the
conversation. A new conversation, or next month's file, started from nothing.

### What can be said, and what the code does with it

Each is the whole of a short sentence, answered in code with no request sent (`colleague/lookAsk`); said any other way it goes to
Luna, who has the same capability (`read_workbook_as`) and the same fields. Every one names a column or a sheet **of the workbook**,
checked before anything changes — a name that is not there is refused in words with the names that are.

| Said | Field | What the code does |
|---|---|---|
| "Start with “Data”" | `sheet` | that sheet leads, even when it does not look like a table *(13 Nov)* |
| "The headings are on row 3" | `headerRow` | the columns take that row's words; the rows above stop being data *(13 Nov)* |
| "Column M is the variance" | `rename` | the column is called so *(13 Nov)* |
| "“Var £” is the result" · "Column C is the date" | `result` · `date` | the lead figure · what dates each row *(13 Nov)* |
| "Read every row" · "Leave them out" | `everyRow` | the rows the workbook's own reports leave out, in or out *(14 Nov)* |
| "“Score” is a rate" · "“Score” should be averaged" | `columns: average` | never added up: averaged wherever it is asked; if it is the result, the look leads with its average |
| "Never add “Std hrs”" · "“Std hrs” is not a figure" | `columns: never` | out of the figures; listed with what is not added, "you said so" |
| "“Count” is a total" · "“Count” is added up" | `columns: add` | a figure to add up, whatever its heading made of it (a rate, a level, a number that looked like a code) |
| "“Idle” is time lost" · "“Charge” is money" · "“Made” is output" | `columns: lost · money · volume` | the column is that kind — which decides what leads and how it is written (£, min) |
| "Ignore “Notes ref”" | `ignore` | not a figure, not something to split by |
| "Leave out rows where “Type” is “Trial”" | `leaveOut` | every question of the lead sheet is asked without those rows; the look says how many rows that is and what they carry |
| "Only rows where “Site” is “Hull”" | `only` | every question of the lead sheet is asked on those rows only; said the same way |
| "What have I told you?" | `told` | the reading in words, with the file and day each thing was first said on |
| "Forget what I told you" | `forget` | the reading is put away (kept, marked forgotten, never applied again) and the workbook is read as Luna would by herself |

What a column IS is said as a statement about it. The bare "average Score" or "add up the packs" asks for a figure — it is
Luna's question, never a change to how the report is read for good. A value in a row rule must be one the column holds (compared as the query engine compares: spelling variants and case alike); a
rule that would leave no rows is refused. Two things said in one sentence go to Luna, who sends both fields in one call.

### Where it is kept, and when it is used again

- **The reading** (`lib/workbook/reading.ts` — `Reading`): the list above as data, with the day each was said. It is the
  **person's instruction on how to read a report** — not a record of the factory, not evidence, never a figure.
- **Kept twice, as the look's snapshot already is:** on the conversation (`KeptLook.asked`, so the pack and a re-read in the same
  conversation follow it) and on the **file's own record in the register** (`facts.source.look.reading`, beside the snapshot and the
  customer) — which is what crosses conversations, devices and months.
- **Used again** when a workbook is read for the **same customer** and is the **same report** as one a reading was said about: the
  sheet the reading led with is there by name, and — after the heading row the reading names is taken — four in five of its
  headings are the same (the rule `sinceLast` already uses for "what changed since last time"). The newest reading that fits and is
  not forgotten is applied before the first look is worked. A reading whose column is no longer in the file is applied without that
  part, and the look says which part could not be applied.
- **Said every time.** The look opens, after what the workbook is, with *"Read the way you told me (14 November, on “Shift report
  March.xlsx”): …"* and each thing in words, and how to undo it. A reading is never applied silently.
- **Added to, not replaced.** Something new said about April's file is added to the reading carried from March's and kept on
  April's record; the newest wins from then on.
- **Never another customer's.** A reading is looked for among this customer's files only (the same rule and the same field as the
  snapshots): Business B's workbook of the same name and headings is read from nothing.

### What it changes in the look and after it

- The lead sheet's roles are worked as before, then **the person's word is laid over them** (`firstLook.ts` `layReading`): kinds,
  what is never added, what is ignored, the result, the date. The reader's own finding is not thrown away — the look says *"I would
  have added “Score” up; you said it is a rate"* the first time, and thereafter only what it is read as.
- **Row rules** are filters on every question of the lead sheet, exactly as the rows the reports leave out are (the basis) — so the
  months, the weeks, the splits, what moved and the pack all follow them; the snapshot's basis says them, so a month read with a
  rule is never compared with a month read without it as if they were alike.
- **The pack** carries "How it was read" in *What this workbook holds*, without the sentences that ask the reader anything.
- **Luna** is sent the look, which says the reading; her instructions say a reading is the person's word, to be followed in her own
  questions of the workbook (average what was said to be a rate; apply the row rules), and that a correction is `read_workbook_as`,
  never a note in her own words.

### What it will not claim

- **Not structure.** "The months run across the top", "these three tabs are one table", "this sheet is a form" are not corrections
  that can be said yet: the shapes are worked when the file is read (`shapes.ts`), and a reading is laid over what was read. The
  two rounds of 14 November made those shapes read by themselves; where one is still read wrong, attaching it again does not fix
  it, and the look's own "how it was read" is the place it shows. Named here as the next piece, not built.
- **Not meaning.** That red means a missed hour, that a code is a product family — the notebook of meanings (`note_meaning`),
  unchanged.
- **Not a rule about values.** "Anything over 60 minutes is a breakdown" is a question for Luna each time, not a reading.
- **Not across customers, and not across reports** of one customer that merely share a sheet name.
- **Not proved against the live model** — the sentences answered in code are proved; what Luna does when it is said another way is
  in her instructions and untested until a real-model run is agreed.

### Proof

- `src/lib/workbook/__tests__/reading.test.ts` — on two made-up months of one report (`scripts/workbook/make-reading-workbooks.mjs`,
  every name and figure made up, each month with its truth **as read unaided and as read once told**): unaided, the figures the
  generator says a reader gets wrong ARE wrong; told, each is the generator's; the second month read with the first's reading is
  right first time; a reading with a column the file no longer has says so; forgotten is not applied; another customer's is not
  found.
- `src/colleague/__tests__/lookAsk.test.ts` — each sentence in the table, and sentences that must go to Luna.
- `scripts/acceptance/workbook-reading.mjs` — in the real page, the gateway played by the script and every request counted: March
  attached, told four things in four sentences (no request), each look the generator's figures; a new conversation, April attached
  — read the way March was, said so, April's figures, no request; "What have I told you?"; a correction added on April; "Forget
  what I told you" and the unaided look back; a third month attached after forgetting read from nothing; the pack's PDF read back
  saying how it was read; a sentence said another way goes to Luna (one request, the look sent, never a cell); the phone.

### As built — the reading (15 November)

- **Where the work is.** `lib/workbook/reading.ts` (the reading as data: `mergeReading`, `readingSaid`, `toldSaid`, `fits`,
  `heldTo`, `ruleFilters`); `firstLook.ts` (the person's word laid over the roles after they are worked; the row rules a filter on
  every question of the lead sheet; the `told` part of the look, said before the figure); `capabilities/look.ts`
  (`carriedReading` — the newest reading of this customer that fits, its heading row tried without keeping it (`amend.ts` `dry`)
  before it is taken; `workLook` keeps the reading on the look and on the file's record; `read_workbook_as` with `columns`,
  `ignore`, `leaveOut`, `only`, `told`, `forget`); `colleague/lookAsk.ts` (the sentences answered in code); Luna's schema and
  instructions (`schemas.ts`, `colleagueAssist.ts`, copied to the gateway).
- **Moved from the specification.** The bare *"average Score"* and *"add up the packs"* are NOT taken as a reading: they ask for a
  figure, and a lasting change to how a report is read must be said as a statement about the column (*"Score is a rate"*). What
  was said to be averaged is said with its average in the look (*"“Score” averages 76.55 over the rows read"*), not only listed
  as not added. A column named as the result that is a rate or a measurement is averaged, where before it was added up (a wrong
  figure the 13 November work left possible). A period of one month is said as *"March 2026"*, not *"March 2026 to March 2026"*.
- **What a made-up report showed.** Unaided, the three months of `make-reading-workbooks.mjs` are read wrong FOR THE SITE and
  right for a stranger: the packs lead (4,059,757 over 186 rows in March), and the score, the standing minutes, the crew and the
  charge are four more figures to add up. Told five things, March reads as the site reads it (9,273 standing minutes over 171
  rows, the 15 trial rows carrying 2,270; the score averaging 76.55) — and April and May do by themselves. The copy with a
  details strip above its headings is read with the strip AS the headings unaided (its figure a column called "Prepared by"):
  told the row once, next month's copy has its strip passed over without a word from the person.
- **Proved** by `capabilities/__tests__/reading.test.ts` (9 — through the registry: unaided wrong by the generator's unaided
  figures, told right, next month right first time and saying so, added to, another customer's never found, forgotten never
  applied, refused in words, the heading row carried, a column the file lacks left out and said), `colleague/__tests__/
  lookAsk.test.ts` (the sentences, and those that must go to Luna) and `scripts/acceptance/workbook-reading.mjs` (49 checks in
  the real page, one request in all — the sentence said another way). The older workbook tests and browser scripts pass
  unchanged in what they assert.
- **Not proved, said plainly.** What the LIVE model does when a correction is said another way — her instructions and schema say
  to pass it to `read_workbook_as`, and no real-model run was made. A reading is matched by sheet name and headings — and, since 20 November (docs/CONNECTED-LUNA.md X3), a sheet
  renamed each month ("Shift log", then "April shifts") is matched by its headings alone when exactly one sheet has four in five of them
  both ways, and the look says the sheet was renamed; two that would fit are never guessed between. Structure (months across, tabs that are one table) still cannot be said. And the reading sits on the file's
  record, which syncs as any record does — two devices telling different things about one report on the same day keep the
  newer.


### A production log read as a manager reads it (20 November)

The workbook exam's dry run (`src/colleague/exam/workbook.ts`, docs/CONNECTED-LUNA.md X4) attached an ordinary production log — a row a
line a shift, Packs, Target, Downtime (min), a reason, an Efficiency percentage, a Product column of "500g bag", "1kg bag" — and the
first look, before any AI was asked, read three of its columns wrong: the Product column was turned into numbers and led the look as
"the figure that matters: 54,378"; "Downtime (min)" was taken for a limit (the *min* of minimum); and with a limit on the sheet, Packs
became "a measurement" against it. Three rules, each with its test: a number with a word after its unit is a name, not a quantity
("500g bag" — `textCells` NUM; "120 kg/hr" and "45 packs per hr" still numbers); a column headed as a name (Product, Item, SKU,
Description, Code …, `textCells` NAMING) is never turned into numbers; and *min* or *max* in brackets is a unit, never a limit, and a
column of time lost is never a limit (`firstLook` REFERENCE, isReference). The look now leads with the 13,029 minutes lost, averages the
efficiency, says October is part of a month and names the minutes with no reason (`workbookBook.test.ts`).
