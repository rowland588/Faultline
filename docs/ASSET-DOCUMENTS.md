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
