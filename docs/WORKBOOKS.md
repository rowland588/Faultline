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
