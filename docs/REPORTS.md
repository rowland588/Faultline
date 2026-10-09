# The report system — one way every PDF is laid out

Rowland, 4 October:

> "Information can flex — it can be a small amount, or a vast amount ... I
> feel as if there'll always be a problem with the report. We need the
> correct system built: a report system that can handle large and small and
> still look beautifully designed, regardless of how much has been pulled
> into it."

## Why there was always a problem

Every PDF was drawn by hand. Seven renderers (about 5,500 lines) each kept
their own `y`, decided their own page breaks, guessed their own row heights
and cut their own lists short. So every fix was local and the next size of
job found the next fault. Measured on 4 October with `scripts/report-stress.mjs`
against a tiny job, the ordinary seed and a huge one:

| what went wrong | why, structurally |
|---|---|
| A long machine name wrapped onto the row below and both printed over each other | rows had a fixed height; text was never measured |
| "Passes if" and "What happened" stopped mid-sentence on the test card; the title ended "…" | each box was capped at 6 lines, silently |
| The "late or a problem" list stopped at 12, programs at 20 | `slice(0, n)` with no "and n more" |
| A one-step job printed three pages: empty headings ("Nothing kept at this gate yet" ×3, "No tests planned yet" twice, "Fixes 0 open · 0 done") and a landscape plan page holding two rows | sections printed whether or not they had anything to say |
| "Within ±1.5 g" printed as "Within" | the font had no ± and nothing checked it (fixed 4 Oct; `pdfFonts.test.ts`) |

None of these is a bug in one report. They are the same missing system,
showing in different places.

## The system

Every report becomes **a list of blocks poured into pages by one engine**
(`src/lib/report/`). A report says *what* is on it; the engine decides
*where*.

### 1. Blocks measure themselves

A block knows its height at a given width, using the real font
(`splitTextToSize` with the embedded face) — never a fixed row height:

- **Heading** — title, the one-line answer under it, a rule. Always kept with
  the first piece of what follows (never alone at a page foot).
- **Band** — the dark "where the job is" sentence; grows with the words.
- **Text** — a paragraph or a label-and-value field; wraps, never caps.
- **Table** — columns with widths; every row as tall as its tallest cell;
  splits *between rows* with the header repeated and "continued" in the
  heading; a single row taller than a page splits between its lines.
- **Grid** — machines down, stages across (the gate checklists and "where
  each machine is"): the name column wraps, the row grows to fit.
- **Cards** — the fix list, the found list: each card measured, cards
  never split, a run of cards breaks between cards.
- **Legend** — the colour key, wrapping onto a second line when it must.

### 2. One engine pours them

`flow(blocks)` places blocks top to bottom and starts a page when the next
one will not fit, by these rules:

1. **Nothing is ever cut.** No `slice(0, n)`, no `maxWidth` that truncates,
   no "…". A list prints whole. Where a document must stay one page (a card
   pinned on the line), it continues onto a second page with its header
   repeated, rather than losing the end of a sentence.
2. **Nothing prints that has nothing to say.** A block with no content is
   not drawn. Gates with nothing kept collapse into one line — "Not started
   yet: Set up, Hand over" — instead of a heading each saying "nothing".
3. **A heading never ends a page**, and a table never leaves one row
   stranded on either side of a break.
4. **Small overflow is absorbed, not paged.** If the last page would hold
   less than a fifth, the engine re-pours at the compact density (tighter
   leading and gaps, same type sizes) and keeps it if that saves the page.
5. **A section says whose it is on every page it runs onto.** A block may
   carry a run heading (`runHead`): when it starts a page part-way through
   its section, the heading is drawn above it — "Problem 3 — … (continued)".
   A section that a page can hold asks for it (`keep`) and starts the next
   page rather than breaking, when the page it leaves is already a quarter
   used (so that page is never near-empty).
6. **Big content scales by structure, not by shrinking type.** Huge lists
   get a count in the heading ("Fixes — 30 open, 12 late"), late-first
   order, and repeat headers; type never drops below the readable floor
   (7 pt for labels, 8.5 pt for text).

### 3. One set of design tokens

Type sizes, leading, gaps, rules and the five state colours live in one place
(`src/lib/report/tokens.ts`), shared with `reportKit`. Every report draws from
them, so a client report, a card and the day report are visibly one family.

### 4. Proved at every size, every time

Rowland, 4 October: "how do you know that you built it correctly ... that it
will work every single time?" Four layers, each catching what the one before
cannot:

1. **The engine's rules, on 4,000 random reports** —
   `src/lib/report/__tests__/flow.test.ts` pours reports nobody hand-picked
   (1 to 30 blocks; paragraphs of up to 90 lines; tables of up to 120 rows,
   some rows and boxes taller than a page; landscape inserts, some floating)
   through the real engine and blocks into a stand-in document that records
   where every line and row landed, and checks on every one: nothing past the
   foot; every line and row drawn exactly once, in order; no heading ending a
   page; no row stranded when it could have been helped; no blank page; the
   dry run agrees with the drawing; and a floating insert moves no page break.
   **The test is tested**: each rule was broken on purpose in the engine
   (twelve mutations) and the test failed every time.
2. **Every report from its real button** — `scripts/report-stress.mjs` builds
   the tiny, ordinary and huge jobs (`src/dev/reportSeeds.ts`), downloads
   every stage-gate PDF and reads every page back. It fails on:
   - **off the page** — a word outside the safe margin;
   - **overprinted** — two words drawn over each other;
   - **near-empty** — a page, not the last, less than a fifth used;
   - **lost** — accuracy: the app's own models (`lib/clientReport`,
     `lib/trialCard`, `lib/day`) are built in the page exactly as the screens
     build them, and every sentence, name, count and date they hold must be on
     the paper — character for character as sent, and every letter and digit
     as typed (the second is what caught the font dropping "Ł" from Łukasz).
     It prints how many facts it checked per report, so a check that found
     nothing to check cannot pass quietly.

   The control room report is downloaded from the control room's own door,
   with the ordinary seed's three jobs and a board of twelve, every method,
   both long jobs among them. The board's sentence and every job's name and
   verdict must be on the paper, and it must be one page.
3. **Random jobs** — `report-stress.mjs --fuzz 40` makes forty jobs of random
   size and shape — no machines or sixteen, nothing written or pages of it,
   names from across Europe, a 60-character part number, quotes, `<`, `&`,
   emoji, pasted line breaks, `±`, `≤`, `€` — and runs every check on each;
   and for each number a random 6M job too (`seedRandomSixMJob`: no line or
   four, no measure, no problem or eight, fishbones empty or crowded, old
   whys, removed problems, days in words), its project report and its first
   line's deck. `--seeds 5,17` re-runs the ones that failed.
4. **The fonts** — `src/lib/__tests__/pdfFonts.test.ts` asks `san()` about
   every character there is and fails if it would let through one the PDF
   fonts cannot draw (jsPDF drops the rest of the line when it meets one).

What the random jobs found on 4 October, all fixed: names with Polish,
Czech, Romanian or Turkish letters printed without them; "≤ 0.5 mm" printed
as "0.5 mm"; a reason written for a test that did not happen was replaced on
the card by a stock sentence; a tie for "mostly whose" named whichever owner
came first; a gate marked done with no steps read "nothing kept" in a green
box; and the plan's landscape pages stranded one line on the page before them.

What is not proved by any of this: how a person reads the page. That is
still done by eye, on the PDFs the stress run leaves behind.

It runs in the gate beside `smoke.mjs`. A report change is not done until
all three sizes and the random jobs pass.

## Effect on the screen and on paper (house rule 2)

The screen does not change: the reports are built from the same records and
the same sentences (`lib/clientReport`, `lib/trialCard`, `lib/day`), so what a
screen says and what the paper says stay one statement. On paper, every
report keeps its sections, order and wording; what changes is that nothing is
cut, nothing overlaps, empty sections stop printing, and small and huge jobs
both come out as composed documents.

## Slices — each ships live on its own, with the stress check green

Progress, 4 October — `report-stress.mjs`: 11 of 11 stage-gate reports clean
at all three sizes (it began at 9 of 11 with checks that missed the cuts), and
155 of 155 across forty random jobs with every fact reconciled.
Client report: tiny 3 → 2 pages, ordinary 6 → 4, huge 25 → 15. Slices 1–3
are live; slice 4 is next.

1. **The engine and the client report.** `src/lib/report/` (blocks, flow,
   tokens); the client report poured through it; the stress check's "lost"
   test taken from the job's data.
2. **The test and fix cards.** Fields never capped; a card continues onto a
   second page rather than cutting a sentence; long titles wrap.
3. **The day report and the plan pages.** The day's headline and details
   print whole; the plan's rows are measured (labels wrap), a small overflow
   is absorbed by tightening the rows' air (never the type), a plan too long
   to read folds — each stage one lane with every machine's mark, marks on
   the same days merged with a count — and the handover labels sit under the
   chart. The plan's landscape pages float: they wait for the next page
   break the flow makes anyway and go there, so no page is left short to make
   room for them.
4. **The 3P and lever tree report, the evidence card and the line standard**
   — the largest renderer (3,100 lines) last, once the engine has carried the
   others.
