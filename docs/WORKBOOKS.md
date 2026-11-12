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
- **The header** is found as the first row that is mostly words with data under it, and said; a sheet laid out differently (headers of
  numbers such as years, several tables on one sheet) may be read with the wrong header — the profile says the row it used and the colleague
  is told to ask. Several tables on one sheet are read as one.
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
