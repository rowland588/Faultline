# FC-nnn — the tool's name: the specification

*Copy this file to `knowledge/specs/FC-nnn-short-name.md` before any code is
written (knowledge/STANDARD.md, step 3). Every heading stays, in this order —
the catalogue's test checks them. Write in the floor's words; put a formula
where there is one. Where a decision is Rowland's to make, say so under the
heading it belongs to and stop: it is not guessed.*

**Catalogue:** FC-nnn (and any entries this covers) · **Knowledge:** the
`knowledge/methods/…` records it rests on · **Asked for:** who, when, in
their words · **Status:** draft / agreed (by whom, when) / built (commit)

## 1. Purpose
The manufacturing question or decision it supports, in one or two
sentences, and the sentence it lets one side of the project say to the
other that they could not say before (CLAUDE.md: "the test for any addition").

## 2. Users and scenarios
Who uses it, where (on the line on a phone, at a desk, in a meeting), under
what conditions (gloves, noise, signal), and the two or three real
scenarios it must handle — food ones first.

## 3. Method selection
Why this method answers the question; the alternatives considered (from the
record's *When not to use it*) and why not; what it must refuse to do. Name
the knowledge records; if one is missing, write it first.

## 4. Inputs
Every field: name on screen, unit, type, required or not, validation rule,
default — and what is read from the line instead of asked again (the line's
facts: rates, shifts, crew, margin). Agreed-before-measured fields marked.

## 5. Data suitability
Minimum sample sizes and why; measurement conditions; assumptions (stable,
independent, normal …) and how each is checked; what is said when they fail.

## 6. Calculations
Every formula with its symbols, the intermediate figures, rounding rules,
and independent worked cases with known answers (a textbook example, a
standard's table, or a second implementation — `scripts/knowledge/`), each
becoming a unit test.

## 7. Outputs
The figures, the picture, the sentences (exact wording, with their tones),
the verdict, what it does not claim, the next step it offers — on screen
**and** on paper together (CLAUDE.md, rule 2) — and the money.

## 8. Manufacturing usability
The workflow on the floor: taps to get an answer, phone first, one hand,
what is seen at the machine, the lean page's order (band, tiles, picture,
says, action plan, closing line).

## 9. Failure handling
Missing or invalid values, too few readings, unsuitable data, a reading
struck, offline, a client's read-only view, and each foreseeable misuse —
with what the screen says in each.

## 10. Integration
The record it reads and writes (no new noun unless BLUEPRINT §2 changes
first), where it shows (every place its parent shows — CLAUDE.md rule 5),
access (`can.edit`, `can.agree`, `can.remove`), sync, the database (a
migration only if the shape the cloud checks changes), PAGES.md, the
inventory, smoke, reports.

## 11. Verification
The unit tests (with the independent cases), the acceptance script and its
stories, the screenshots to compare, and the gate line it adds to CLAUDE.md.
The definition of done is knowledge/STANDARD.md's.

## 12. Maintainability
Where the code lives, what is shared and with whom, what was deliberately
left for later (each with its catalogue number), and how the next extension
fits in without a rewrite.
