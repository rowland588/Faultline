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

## Measured

(filled in from the acceptance runs)
