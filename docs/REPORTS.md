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
5. **Big content scales by structure, not by shrinking type.** Huge lists
   get a count in the heading ("Fixes — 30 open, 12 late"), late-first
   order, and repeat headers; type never drops below the readable floor
   (7 pt for labels, 8.5 pt for text).

### 3. One set of design tokens

Type sizes, leading, gaps, rules and the five state colours live in one place
(`src/lib/report/tokens.ts`), shared with `reportKit`. Every report draws from
them, so a client report, a card and the day report are visibly one family.

### 4. Proved at every size, every time

`scripts/report-stress.mjs` builds the tiny, ordinary and huge jobs
(`src/dev/reportSeeds.ts`), downloads every report from its real button and
reads every page back. It fails on:

- **off the page** — a word outside the safe margin;
- **overprinted** — two words drawn over each other;
- **near-empty** — a page, not the last, less than a fifth used;
- **lost** — any record's title, or the last words of any long field, not
  found on the paper (taken from the job's own data, not a hand-picked list).

It runs in the gate beside `smoke.mjs`. A report change is not done until
all three sizes pass.

## Effect on the screen and on paper (house rule 2)

The screen does not change: the reports are built from the same records and
the same sentences (`lib/clientReport`, `lib/trialCard`, `lib/day`), so what a
screen says and what the paper says stay one statement. On paper, every
report keeps its sections, order and wording; what changes is that nothing is
cut, nothing overlaps, empty sections stop printing, and small and huge jobs
both come out as composed documents.

## Slices — each ships live on its own, with the stress check green

1. **The engine and the client report.** `src/lib/report/` (blocks, flow,
   tokens); the client report poured through it; the stress check's "lost"
   test taken from the job's data.
2. **The test and fix cards.** Fields never capped; a card continues onto a
   second page rather than cutting a sentence; long titles wrap.
3. **The day report and the plan pages.** The day's lists through the
   engine; the Gantt pages compress a small overflow, and a short plan sits
   on the page before it rather than taking a landscape page of its own.
4. **The 3P and lever tree report, the evidence card and the line standard**
   — the largest renderer (3,100 lines) last, once the engine has carried the
   others.
