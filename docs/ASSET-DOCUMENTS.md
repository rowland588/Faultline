# Asset documents — the register, the manuals, and what they say (13 November, design)

Rowland, 13 November: *"upload documentations, like asset registers … I get the manuals, drawings, wherever it may be. I upload it to
Luna. She digests it. I'm able to tell her to create a preventive maintenance list based on what the OEM has stipulated … specification
documentation for assets … the plate speed, how fast it can go, what its limitations are, what products it's made for, whatever the
documentation is saying … If there's a possibility to do it through code as well … so it doesn't involve heavy AI costs … take the
appropriate design."*

## 1. What is already built (docs/FACTORY-KNOWLEDGE.md F1–F5) — kept, extended, never duplicated

- A machine is one record on its line with its **kind, model, serial and maker**, each saying how it is known (reported · from a document, with the quote).
- A **CSV equipment register is read by rules, no AI** (`colleague/factoryRegister`): each row a machine proposed on the factory draft, approved line by line, conflicts with what is recorded shown side by side.
- A **PDF, Word or text file's words are read in code** (`tools/story/briefText`); a photo or scan is typed out by the gateway (`factory-read`).
- A document is **kept as a factory source** with its file, its words and what was taken from it, each item with its quote.
- **Planned maintenance** exists as a tool (FC-063: due, done on time, backlog) and **CILT checks** (FC-062); a machine's **plate speed** is Line capacity's.

## 2. What is missing

| Gap | Today |
|---|---|
| An **Excel** register | refused — "save it as CSV" — though the app now has its own workbook reader |
| A document **belonging to a machine** (its manual, its drawing, its spec sheet) | a source sits on a line; a machine's page has no "documents" of this kind |
| **Asking what a document says** (plate speed, limits, products) | not possible — a source's words are kept but nothing searches them |
| **A PM list from the OEM's manual** | not possible |

## 3. The design — code first, the model only for reading prose, every fact with its page and quote

1. **One library of documents per customer, each tied to what it is about.** A document is the existing *factory source* record, given
   what it is (register · manual · drawing · specification · certificate) and **which machine or line it is about**. It shows on that
   machine's page (*Documents*), on its line, and in the Library. No new kind of record.
2. **The words are extracted in code, page by page, once, on the device** (PDF, Word, text; Excel through the workbook reader). No AI.
   The pages are kept with the source so they are never read twice.
3. **Finding is code.** A search over those pages by the words asked for — *speed, rate, capacity, per minute, max, min, range, format,
   product, lubricat-, grease, inspect, replace, clean, every N hours / daily / weekly / monthly / annually* — returns the **passages**
   with their page numbers. Free, instant, works offline.
4. **Facts with units are read by rules where the document is regular** (a spec table: *Max speed … 120 packs/min*; a maintenance table:
   *Task · Interval*). A rule either reads it exactly or does not claim it.
5. **The model is asked only for what rules cannot read, and only the passages found** — never the whole manual. It must quote; a value
   not in its quote, or a quote not on the page, is dropped (the check `factory-read` already applies). So a 200-page manual costs the
   few pages that mention maintenance, not 200 pages.
6. **Nothing becomes a record without the person's word.** Specifications go on the machine as *from a document* (never *verified*),
   each with its page and quote; a specification that disagrees with what is recorded is shown side by side. A PM list is a **draft** of
   the Planned maintenance tool for that machine — task, interval, what the OEM said, page — approved line by line, then made through
   the tool's own function. The OEM's interval is the OEM's; nothing is invented where the manual is silent, and that is said.
7. **Luna uses the same doors**: *list the documents on the Bagger · what does the manual say about speed · build the PM list from
   it* — each a capability over the code above, so asking in conversation and pressing the button give the same answer.

## 4. Slices, each live on its own

| | What | AI |
|---|---|---|
| **D1** | An Excel register read like the CSV one — rows to an asset list on the draft, approved line by line | none |
| **D2** | Documents on a machine: upload from the machine's page (manual · drawing · spec · certificate), pages extracted in code and kept, listed on the machine, its line and the Library | none |
| **D3** | Find in a machine's documents: the passages with page numbers; Luna's `find_in_documents` | none |
| **D4** | Specifications: rules for spec tables, then the model on the found passages only; proposed on the machine with page and quote; plate speed offered to Line capacity | small |
| **D5** | The PM list from the OEM manual: rules for maintenance tables, then the model on the found passages; a Planned maintenance draft, approved line by line | small |
| **D6** | Scanned manuals and drawings (pictures): typed out by the model page by page, on request, with the cost said first | larger — asked first |

## 5. Not decided / not proved

- Real OEM manuals vary enormously; the rules in D4–D5 will be built on real ones Rowland uploads, and what they cannot read is said.
- A drawing is a picture: its title block can be read (D6); its geometry is not interpreted.
- The cost of the model per manual is measured on the first real one, not estimated here.

## What is built — 13 November (the manual → PM list path, first)

Rowland the same day: *"They will be pdf the oem manual is pdf. Luna reads the pdf and user ask luna to create a pm list based on the oem
information."* So the PDF path went first, cutting across D2, D3 and D5:

- **Kept and read in code** (`src/lib/manual/pages` — pdf.js, page by page; `store` — a `source` record on the machine's line with
  `facts.manual` and the file in `facts.docPhotos`). Attached through Luna's own attach control: a PDF offers *A machine's manual, drawing
  or specification* (line, machine, what it is) beside the factory-register reading, which stays. No request is sent to the AI.
- **Read by rule** (`src/lib/manual/manual` — `pmTasksOf`): a task with its own interval ("…every 500 operating hours"), or tasks under a
  heading that is an interval ("Daily", "Weekly"). A line with no interval is never made a task. Monthly is held as 30 days, quarterly 91,
  six-monthly 182, annually 365, the manual's own word kept beside it.
- **Luna's four functions** (`src/capabilities/manuals`): `list_documents`, `find_in_document` (topic or words → passages with the page;
  "says nothing a search finds" when it does not), `draft_pm_list` (the rules' tasks, plus any she adds — each kept only if its words and
  its interval's words are on the page she names; the rest dropped and said), `make_pm_list` (a card; a Planned maintenance log on the
  line for the machine, a check a task, its criterion quoting the manual with the page; no hours a task invented).
- **Where it shows**: the machine's page, *Its documents* (`ui/MachineDocs`), and the log on the line's Logs as any Planned maintenance.
- **Proved** by `scripts/acceptance/machine-manual.mjs` on a MADE-UP four-page manual written as a real PDF.
- **The paper to hand over — the Maintenance schedule** (13 November, Rowland: *"dont build the tick sheet make it a report, based on what
  a PM should look like i give the report to the buienss"*): the PM list's Report ▾ › *Maintenance schedule* (`tools/checks/pmSchedule`,
  `pmSchedulePaper`) — every task under its interval, the manual's own words for it and the page. No Excel, and no tick list on Luna's
  card: a task is left out by telling Luna, or taken off on the list's page.
- **The rules, corrected on a mock manual the same day** (a made-up 13-page bagger manual written to test with; kept out of the repo):
  a table cell that wraps ("Every 500" / "operating hours") is read; a page is read as the things it says — wrapped lines joined, a run
  of sentences one sentence at a time — so the tail of a wrapped sentence ("after 6000 operating hours.") is never taken for a heading
  and its interval given to the sentences after it (it had been: three tasks with an interval the manual never stated); a heading's
  interval ends at a section title or at a line with an interval of its own; a task said twice at one interval (the table, then its
  section) is one task. Still as printed: a table row's other columns stay in the task's name ("… Operator 7.2").
- **An SOP or a work instruction from the manual** (13 November — Rowland: *"turn it into something meaningful, like a SOP, or one-page
  work instructions"*; *"with the page cited per step"*; *"go"*): `lib/manual` `proceduresOf` reads the procedures a manual gives as
  NUMBERED steps (a run 1, 2, 3… under a title; a step whole, over a wrapped line and over a page; the section's WARNING lines; a list
  that does not start at 1 is not one). Luna's `list_procedures` says them with their pages; `make_procedure` (a card) makes one a
  **Standard operating procedure** (FC-225) or a **task instruction** (FC-223) on the machine's line through the document's own record —
  a step a row in the manual's own words, its new *From* box saying the manual and the page (printed as a column on the paper), the
  warnings under Notes. A DRAFT: who keeps it, the photos, the care a step needs and a key point's reason are the person's. It lands on
  the line's page under *What we produced*. On the mock manual: five procedures read whole (start-up 6 steps, stopping 3, clearing a jam
  4 with its warning, the reel change 8, the size change 8). **Not built:** a procedure the manual gives in prose or a table (said so, and
  found with find_in_document); a fault-finding instruction; putting a document on another line; a manual kept on a line with no machine.

**Not proved, and said plainly:** no real OEM manual has been through it. Real manuals put maintenance in tables whose cells pdf.js may
return in an order the rules do not expect, split a task over lines, or are scans with no words at all (said as "pages with no words to
read"; D6). Where the rules read too little, Luna is told how many places speak of maintenance and reads those passages — that is the AI
cost, bounded to the passages. Operating hours are counted by the log as clock hours, and the card says so. Still to build: the Excel
register (D1), upload from the machine's page and the Library listing (rest of D2), specifications onto the machine with plate speed
offered to Line capacity (D4), scans (D6 — cost asked first).
