# Conversational data — any source, one way; results, charts and reports in the conversation — 10 November

Rowland: *"I should be able to talk to Luna about a factory, a production problem, a test, an experiment or a set of figures. I should be
able to ask questions, explore the information, challenge the results, request graphs, build reports and change direction naturally …
We are building intelligence around the Faultline application, not building another application around the intelligence."*

The assessment that came before it (what worked, what did not) is in the session record; this page is what was built and how it fits.

## The one layer

```
the person's words
  → resolve the source        resolve_source (files by name, description, when) · list_sources (a line's own records)
  → establish what it holds   source_fields (every field, how many rows record it, what is worked out, what cannot be held)
  → work it out               query_data — lib/workbook/query for a file, lib/data/table for Faultline's records, the same
                              QueryResult either way; kept as a RESULT on the conversation
  → draw it                   make_chart / refine_chart — a CHART drawn only from results, kept as versions
  → write it up               build_report — a REPORT or PRESENTATION, sections in order, figures checked against results
  → hand it over              the cards in the conversation: PNG/SVG, PDF (kept under Saved copies), slides
```

| Part | Where | What it does |
|---|---|---|
| **The register** | `lib/data/sources`, `capabilities/data` registerFile, `supabase/SOURCES.sql` | A file is a study record of tool `source` (synced, row-level security as every study): its name as the person calls it (or Luna's suggestion, said so — `named`), its original filename, when it came in, its size, its sheets and fields as the reader found them, what could not be read, what it is about (line, project, client, machine). Found by its contents' id, never doubled. A workbook's cells stay on the device that read it (`lib/workbook`); another device is told so and asked to attach it, never given a figure. |
| **Resolution** | `resolveSource`, `resolve_source` | One file meant, the ones to ask between, or none. Two files whose own names match every word said are always asked between; a date said ("last week") narrows by when it came in. The workbook capabilities no longer fall back to the newest workbook: with several in the conversation and none named, they refuse and say ask. |
| **Faultline's records as tables** | `lib/data/datasets` | A line's **stops** (day, hour, machine, category, detail, shift only when said, minutes only when timed, how known, cause family), its **program trials** (program, machine, product, day, outcome, speed set, aim, minutes, packs, rejects; net rate, reject % and short of aim worked out only when their inputs were written), a study's **readings**, the **problems**, an **imported** downtime file. Each says what it cannot hold (`limits`). |
| **The engine** | `lib/data/table` | The workbook query's semantics over in-memory rows: filters, three groups, day/week/month/year, sum/avg/min/max/count/distinct. A value not recorded is `null`: never summed as zero, a group of it named "(not recorded)", a sum of nothing `null`. A field the source does not hold is refused with the fields it holds. A worked-out field says how. A `contains` filter says it is words, not a classification. |
| **Availability** | `query_data`, `source_fields`, the prompt | "Cannot be answered from …: it holds no 'downtime class' — it holds …" with the dataset's limits; nothing kept, nothing drawn. Available, calculable, missing, ambiguous, not recorded and cannot be established are told apart in Luna's instructions (ANY FIGURES, FROM ANY SOURCE). |
| **Results** | `lib/data/outputs` DataResult, `facts.results` | The source, the question as asked, the figures, the cells or records each group came from, and the result it was asked from (`from`). Never changed: a follow-up is a new result. |
| **Charts** | `outputs` ChartSpec/seriesOf, `lib/data/chartSvg`, `colleague/AiOutputs` ChartCard | Column, bar, line, pie, Pareto; percentages of what is shown; left out; only; top n; a target; a second result to compare. Every refinement a new version; back to previous or original. The picture is drawn by code from the result (no generated images), a value not recorded drawn as a gap "n/r", every series in a key with words; its notes say what was left out. Downloads: PNG, SVG. |
| **Reports and presentations** | `outputs` ConvReport/applyReportOp, `lib/data/reportFiles`, ReportCard | Sections in order: summary, finding, chart, table, recommendation, text; add, replace, remove, move; report or presentation (the same sections). A finding must name its results; a figure in a finding or summary that none of them holds (to the rounding written) is marked **Check this**, on the card and on paper. A recommendation is printed as a view (Luna's or the person's). The PDF is poured by the report engine (`lib/report/flow`) and kept under Saved copies; the slides by pptxgenjs, as the Story's deck. The last page or slide says what every figure rests on: source, question, rows, worked by Faultline's code. |
| **Continuity** | `colleague/conversation` focusText | Each turn tells Luna the files in the register (name, filename, when, what it holds, id) and what this conversation has made (results, charts with their versions, reports with their sections), newest first — what "that", "the previous graph" and "the other file" point at. Never a cell. |
| **Luna's instructions** | `colleagueAssist` ANY FIGURES, FROM ANY SOURCE | Find the source, never assume the newest; check what it holds; tell the six states apart; follow-ups as new results; charts only from results; reports keep what was approved; Check this said, not hidden. |

## Security and customer separation

Every new capability runs through the registry (validate → access → a write only once confirmed). The only write is `name_source` (a
card; a client is refused). Results, charts and reports live on the conversation, which syncs and is guarded as every conversation is.
`list_sources` narrows files to the line's client. Workbook cells never leave the device; the gateway is sent names, fields and results.

## Proved by

- `src/lib/data/__tests__/data.test.ts` — the engine (not recorded never zero, "(not recorded)" groups, ISO weeks, a missing field
  refused), the stops' limits, a trial's net rate only from written inputs (59.5 and 15.5 short on the 3,600 / 30 / 60 case), charts
  (percentages, left out, compare, n/r), versions in words, unbacked figures, report operations, file resolution.
- `src/capabilities/__tests__/data.test.ts` — through the registry on a fake database: cannot-be-answered, the four chart versions,
  a report built and flagged, two files asked between, a name by card, a client refused, a file whose cells are elsewhere.
- `scripts/acceptance/conversational-data.mjs` — the whole conversation in Chromium against the seeded stops and the workbook
  generator's own totals, the PDF and the slides read back, the phone.

## Not built yet

- Program trials and readings reach Luna as tables; a tool's own deeper structure (SMED elements, a loss count's waterfall) is read
  through `read_record` as before, not yet as a table.
- Workbook cells do not travel between devices (a decision about cloud storage and size, Rowland's).
- A report is kept on the conversation and as its PDF under Saved copies; it is not yet a Line Talk document record with its own page.
