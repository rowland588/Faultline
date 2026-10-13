# The audit — the bar every screen meets

Rowland, 13 October: *"we need to run, I think, multiple audits to explore
elements that are missing, not functional properly, gaps basically ... the
amount of gaps that I'm finding are quite simple but important things ...
on the line standard, when I click on the PDF, I can't get out of it. There's
no X mark ... I'm always asking for reports, or cards ... there are still
quantification issues we've yet to even look at ... basic functionalities,
basic user interfaces, basic user experiences, flow, fluency, simplicity ...
run the audits, find the gaps and implement the improvements at pace."*

Placed (BLUEPRINT §8): every layer, every record, every place — it is the
floor under §3 and §4, not a new feature. Each gap found is written below,
fixed in a slice that ships live on its own, and held by a check so it
never comes back.

## The bar — what every screen does

1. **A way out of everything that opens.** Every sheet, drawer, viewer and
   preview shows an × (or Close / Done) on the screen at all times — not
   only a dimmed strip around it — and Escape and the back button close it.
2. **Every record edited and deleted where it sits.** Wherever a record is
   listed or opened, the person allowed to (lib/access) can change its words
   and delete it, with Undo; a delete says what goes with it.
3. **Paper wherever there is a list.** A page that lists records offers its
   report; a record that has a card offers the cards for all that are shown,
   as well as one at a time. The preview of either closes (1).
4. **Every number right, and said how it is known.** Each figure is the
   practice's figure, worked by hand in a test; its name is the practice's
   name; it says how many it came from and whether that is enough.
5. **The phone.** At 390 px nothing is off the side, no words are cut off,
   nothing to press is smaller than a fingertip.
6. **No dead ends.** Every page says where it is and has a way back; an empty
   page says what to do first.
7. **Simple with detail.** Where we are, why we are not where we should be,
   what we are doing about it — the rest one tap away (docs/SIMPLE.md).

## How it is checked

- `scripts/audit.mjs` drives every screen smoke opens, at a desk and on a
  phone: it presses each button that opens something and checks a way out is
  in view and Escape closes it (1); measures the phone (5); lists the pages
  with records and no paper (3) and the edit and delete words on each page
  for reading by hand (2). It deletes nothing and answers every confirm no.
- (4) is checked module by module, against the practice, with hand-worked
  tests.
- (2), (6) and (7) are read by hand from the audit's tables, page by page.

## Findings, 13 October

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 1 | 1 | every sheet (`ui/Sheet`) | No × at all — only the dimmed strip, Escape and back. A tall sheet (the line standard PDF's preview, a long editor) grew to 16 px from the top, leaving nothing to tap: no way out on a phone. | Fixed: the sheet's head (title and ×) stays at its top as it scrolls. |
| 2 | 4 | capability study (`lib/ie/sample`) | What the app calls **Cpk** is worked from the overall spread of the readings (sample standard deviation) — the practice calls that **Ppk** (AIAG SPC; ISO 22514), or Cmk for a machine's run. Cpk is from the spread within — run to run, the moving range ÷ 1.128 for single readings. On a run that drifts the two part, and the drift is what a commissioning test must see. | Fixed: Ppk (overall) carries the verdict — the same number as before, its right name; Cpk from the moving range beside it; "it drifts across the run" when they part. Hand-worked tests. |
| 3 | 3 | line standard card | Square and tall boards squeezed into a wide frame; marks half as big again as the screen's; names crossing; the note over the people; 3 of 10 named. | Fixed (677c03e). |
| 4 | 2 | Line capacity, Line standard | No delete of a Line capacity anywhere; no rename or delete on either list; a map's delete took its capacity. | Fixed (6435d91). |
| 5 | 3 | Control room problems | Cards for one, a few, a group — never for all shown. | Fixed (7215d1f). |

### Bar 4 — the arithmetic of the line's tools, module by module

Checked 13 October against the practice each figure claims, every figure
worked by hand in the module's tests. *Right* rows are listed so the next
audit knows they were read, not skipped.

| # | Module | Figure | Verdict | What changed | The practice |
|---|--------|--------|---------|--------------|--------------|
| 4.1 | `lib/ie/balance` | cycles needed for ±5% at 95% | **Overclaims** at the few laps a floor times: t taken as 2 — on five laps t is 2.78, so "enough" was ±5% at under 90%. | t is Student's at n − 1 df of the laps timed (a table, the careful row between rows); the floor of five stays. 10, 11, 9, 10, 10 s now asks 16 cycles, not 8. | Freivalds, *Niebel's Methods, Standards and Work Design*, ch. 9; the ILO's and Barnes's t = 2 is the large-sample rule of thumb |
| 4.2 | `lib/ie/balance` | the suggested balance | **Wrong**: to reach ⌈work ÷ takt⌉ it piled everything left on the last person, past takt (four 7 s at 12 s: 7 · 7 · 14). | A stack closes before it passes takt and the next person opens — one more person when the order will not fit, never a stack over takt but an element longer than takt on its own. | Ranked positional weight (Helgeson and Birnie, 1961) on elements that follow one another |
| 4.3 | `lib/ie/balance` | basic time, standard time, takt, fewest people, balance | Right: observed × rating ÷ 100 (BS 3138); × (1 + allowances); ⌈work ÷ takt⌉; work ÷ (people × the longest). | Hand-worked tests added (one lap, nothing timed, a rating of nought). | ILO, *Introduction to Work Study*; BS 3138:1992; the Yamazumi |
