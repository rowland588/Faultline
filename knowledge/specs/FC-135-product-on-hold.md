# FC-135 — Product on hold: non-conformance and release — the specification

**Catalogue:** FC-135 · **Knowledge:** `quality.nonconformance-hold` (full, practice) · **Asked for:** `docs/METHODS.md` §5 (8D's D3, *Contain*:
"product held, sorted or reworked; the customer protected"); Rowland, 1 November: *"I want all tools made that get used in the projects"* ·
**Status:** built on `m6-registers`, 1 November — the builder's choices are under *chosen*.

## 1. Purpose
Product that may not be right sits on hold with no clear owner, reason or cost, and nobody can say how long it has sat there. The register makes
each hold a record on its line: a number on its label, the product and lot, how much, why, who decides and by which day — and, when it is decided,
the fate of every part of it, who decided, on what grounds and what it cost. It lets quality say to production, and the line to the client:
*"Three holds are open — 12,400 packs, £6,900 tied up; the oldest four days; one is past the day to decide; six of this month's nine holds were
the seal check on Line 2, so an 8D is open."*

**Scope.** What this build covers: **a register a line** (a study of the tool `ledger`, `agreed.holds`, its holds in `facts.holds`); **raising a hold**
(product, lot, quantity in packs · cases · trays · pallets · kg, where it is, why, who decides, the day to decide by, the cost of a piece, the
shelf life) by hand, from a **failed check** on the line (the check logs' failures not yet held, with the packs since the last good check) or
from the register's problems; **deciding** it — release, concession, rework, regrade or destroy — **in part or in full**, each decision with a
quantity, who, on what grounds and, for the priced fates, what it cost; the days held, the day-to-decide-by, the tied-up money, the carried money
at a typed rate, what each fate lost; the holds **by reason** with the repeat rule (an 8D); **who may decide** (a typed list; a decision by anyone
else is flagged, not stopped); Undo on everything; the lean page and its paper. What it does **not** cover, said on the page and the paper: any
physical segregation or label (the site's); allergen and food-safety holds' own rules (the site's HACCP plan); a hold split by lot; deciding what
becomes of the product (it records, never decides); a link from a hold to the 8D report (**FC-150**, not built); the supplier's lot trace
(**FC-136**, **FC-169**, not built).

## 2. Users and scenarios
The quality technician who raises and decides holds, the shift leader who sees what is held on the line, the quality manager who owns the
authority list, and the auditor. (1) *A failed check:* the label sensor fails its test (FC-014) and the line's log says 46,200 packs since the last
good test; on the register, the failed check is offered — *Put it on hold* — with those packs, and the hold is H-001. (2) *A seal failure:* 4,800 packs
of a pouch on hold for six days: £2,544 tied up; released after a re-test, or destroyed — £2,544 lost and £1,680 of margin not earned, said apart.
(3) *A part decision:* 4,500 released and 300 destroyed; the hold closes when every pack has a fate. (4) *Production releases under pressure:* the
register lists who may decide; a release by someone else is recorded and flagged amber on the page and the paper. (5) *The same cause again:* three
holds for one reason in 28 days say an 8D is the next step.

## 3. Method selection
Non-conformance control (`quality.nonconformance-hold`): identify, segregate, decide on the specification and the risk, record — ISO 9001:2015 clause
8.7 as the requirement, and food-safety standards (BRCGS) as they expect it. Alternatives from the record's *When not to use it*: the cause goes to the
5 whys and the 8D; the gauge whose failed check raised the hold goes to calibration; the totals by bucket are the cost of poor quality (**FC-128**);
shelf-life decisions are food safety's.

**Established · assumed · chosen.**
- *Established* (`quality.nonconformance-hold`, practice, **from knowledge — ISO 9001 clause 8.7 and the BRCGS clause were not re-read**): a hold is
  identified, segregated and decided by someone with the authority; the options are release, concession, rework, regrade, destroy, each with who,
  when and grounds; **days held** = decision date − raised date; **tied up** while held = quantity × (materials + labour to this point) and is *not a
  loss*; **carrying** = tied up × annual rate ÷ 365 × days; by fate — release: the review's hours only; concession and regrade: the price lost; rework:
  labour again; destroy: materials + labour + the margin not earned + disposal; a hold with no decision date is a slow destroy; release by production
  under pressure is the failure the authority rule exists for. The worked case of the record (`scripts/knowledge/cases-quality.py`): 4,800 packs held
  6 days, £0.42 materials + £0.11 labour a pack, £0.35 margin, 12% a year, a 21-day life → **£2,544 tied up; destroyed £2,544 and £1,680 margin; £5.02
  carrying; 29% of the life gone.**
- *Assumed:* the cost of a piece to this point is the business's own figure, typed on the hold; for packs, the line's materials a pack stands in for
  it (materials only — said on the card) when none is typed.
- *Chosen* (the builder): one register a line (a register on no line is not offered — "every machine on a line", CLAUDE.md); quantities are held in one
  of five units and never added across units; a hold closes when its decisions cover its quantity, and a struck decision puts the quantity back on
  hold; the **repeat rule** is three holds for one reason (case and spacing ignored) in 28 days; a decision's grounds are required for a release and a
  concession (a release without grounds is a guess) and optional otherwise; **the authority list is typed and advisory** — a decision by a name not on
  it is flagged, never refused ("never block"); margin not earned is shown only for destroyed **packs** at the line's margin a pack, and is **never added
  to what was lost** (the two-parts rule, CLAUDE.md); the hold's number is the next on the register (H-001 …); no clause number of a standard is quoted.
- *Money* (`knowledge/MONEY.md` §4, FC-135): causation **H** (tied up and carried) and **M** (what a fate lost). Inputs, all optional: the cost of a piece
  (typed on the hold, else the line's materials a pack for packs), the carrying rate (typed on the register), the price lost / rework cost / disposal cost
  (typed on the decision), the line's margin a pack. A missing one is named in one sentence — *Give the cost a piece on the hold (or the line's materials a
  pack in Set up the line) to say what is tied up* — and nothing waits for it.

## 4. Inputs
A **hold**: product (required), lot, quantity (> 0, required) and its unit, where it is, why (required), who decides, decide-by day, cost a piece (£),
shelf life (days); and where it came from (a failed check: the log, the check and the result; or a problem). A **decision**: the fate, the quantity
(0 < q ≤ held), who decided (required), grounds (required for release and concession), and the typed £ for concession / regrade / rework / destroy. The
**register's agreement**: who may decide; the carrying rate (%, 0–100). Read from the line: materials a pack, margin a pack; from the check logs: the
failures and the packs they held (`tools/checks/figures`); from the register: nothing is copied.

## 5. Data suitability
No minimum: a register of one hold works. Quantities of different units are not added. A hold raised with no cost, no owner or no decide-by day is
allowed and the gap is said (amber, in words). Dates are days (YYYY-MM-DD) read on the device's clock.

## 6. Calculations
As §3. Worked here and in `src/tools/hold/__tests__/hold.test.ts` (the figures are the record's, worked by hand, not read from the module):
- **Case 1 — the record's case.** 4,800 packs, 0.53 a pack, raised 20 Oct, today 26 Oct: days held **6**; tied up 4,800 × 0.53 = **£2,544**; carried
  2,544 × 0.12 ÷ 365 × 6 = **£5.02**; life used 6 ÷ 21 = **29%**. Destroyed in full: lost **£2,544**, margin not earned 4,800 × 0.35 = **£1,680**
  (their sum is the record's £4,224). Released after a re-test: **£0**.
- **Case 2 — a part decision.** 4,500 released + 300 destroyed: held 0, closed; lost 300 × 0.53 = **£159**; margin not earned 300 × 0.35 = **£105**;
  days held to the last decision. 1,800 released of 4,800: 3,000 still held, £1,590 tied up.
- **Case 3 — the line's figure stands in.** No cost on the hold, the line's materials a pack £0.42: tied up 4,800 × 0.42 = **£2,016**, said to be
  materials only; kilos have no stand-in (the line's figure is a pack's) — the missing input is named and no figure made.
- **Case 4 — the repeat rule.** Three holds for "Seal check failed" (spacing and case varying) inside 28 days: repeat; two, or three over more than 28
  days: none.
- **Case 5 — past the day.** Decide-by 23 Oct, today 26 Oct: late, red, "3 days past its decide-by day".

## 7. Outputs
Tiles: **On hold now** (n · the quantity), **Tied up** (£ — "waiting, not lost"), **Oldest** (days), **Past decide-by** (n of open), **Lost to decisions**
(£). The sentence (`holdSays`): *"3 holds open — 12,400 packs, £6,900 tied up; the oldest 4 days, 1 past the day to decide by."* Red when any open hold
is past its day, amber when any is open, green when nothing is, grey with none yet; the state always in words beside the colour. The money lines
(`holdMoney`): tied up (not lost), carried, what the decisions lost by fate, the margin not earned apart, and each missing input named. The cards
(on hold now, decided), the holds by reason with the repeat sentence, who may decide, the action plan (each open hold: *Decide H-007 …*, who, by when,
late first) and the closing line. Nothing is stored that is worked out.

**The report.** The register on paper, from the same module (`holdPaper`), laid out by the report engine under the study paper's band, tiles, "What it
says", action plan and closing line: **On hold now** (number, product and lot, quantity, why, since and days, who decides and by when, tied up), **Decided**
(each decision: number, product, quantity and fate, who and when, grounds), **By fate** (holds, quantity, lost, margin not earned), **In money** (the
module's sentences, missing inputs named), **Why holds happen** (the reasons and the repeat sentence), **Who decides** (the list and any decision by
someone not on it) and **What this register does not do** (the limits). Read back with `pdftotext` in `product-hold.mjs`.

## 8. Manufacturing usability
On a phone at the hold cage: *Raise a hold* is the one primary button; a card is a tap to *Decide*; the fates are five chips with their meaning under
the one tapped; the quantity is prefilled with what is still held; a failed check is one tap from the register. Controls are 44 px.

## 9. Failure handling
No product / quantity / reason: the sheet says which, and does not save. A decision for more than is held: refused in words. No cost a piece: the money
names the input. A name not on the authority list: recorded and flagged. A hold struck: left out of the figures, put back with Undo. A decision taken
back: the quantity is held again. A client reads the register and changes nothing; a team member raises and decides; only the owner strikes a hold
or changes who may decide (`can.remove`, `can.agree`).

## 10. Integration
A study of tool `ledger` on a line (and a project when started inside one), found by `registerKeyOf` (`tools/registers/kinds`), listed at `#/holds`,
opened at `#/holds/:id`, the app tool *Product on hold* (kind register; the Tools page, the rail's tool list, Jump to and a method's section — **8D's
D3 Contain** opens it). It reads the check logs' failures (`tools/checks`, FC-170/FC-014 …) and the register's problems; the line's page carries its
sentence; the line report carries it; Undo on every change. No new noun (`docs/BLUEPRINT.md` §2): a hold is a row of a register on a study. No database
change: the tool key `ledger` is already allowed (`supabase/SHAPE_TOOLS.sql`) and `facts.holds` is merged entry by entry by id.

## 11. Verification
Unit: `src/tools/hold/__tests__/hold.test.ts` (Cases 1–5, the missing inputs, the authority list, the tones). Acceptance: `scripts/acceptance/product-hold.mjs`
(the register started on a line; a hold raised and the record's case read on the page; part decided and closed; the money; a failed check offered and
raised once; the authority flag; the paper read back; a client; the phone).

**Acceptance criteria.**
1. Case 1 and Case 2 are reproduced by the module (`hold.test.ts`) and by the page: £2,544 tied up, 6 days, £159 lost and £105 not earned after the part
   decision — `product-hold.mjs` H2, H3.
2. The sentence, tiles, money lines and closing line on the page equal the module's — `product-hold.mjs` H2.
3. A hold is raised with its number, product, quantity, reason, owner and day; one with no product, quantity or reason is refused in words —
   `product-hold.mjs` H1.
4. A decision for part of a hold leaves the rest open; one for all closes it; a decision for more than is held is refused; a taken-back decision puts
   the quantity back — `product-hold.mjs` H3.
5. A failed check on the line is offered once as a hold with its packs and, raised, is not offered again — `product-hold.mjs` H4.
6. A decision by a name not on the authority list is flagged on the page and the paper and not refused — `product-hold.mjs` H5.
7. The paper carries the open and decided holds, the fates, the money and the limits, equal to the module's sentences — `product-hold.mjs` H6.
8. A client reads and changes nothing; the phone has nothing off the side and 44 px controls — `product-hold.mjs` H7.
9. It opens from 8D's D3 Contain in a project and lands on its start sheet; the catalogue's test and the method page hold it — `src/catalogue/__tests__/catalogue.test.ts`,
   `src/project/method/__tests__/methodTools.test.ts`, `scripts/acceptance/methods.mjs` 5b.
*Not proved:* two phones raising holds at once (the merge is the sync's, by id; the number can repeat); a real hold cage; iOS Safari.

## 12. Maintainability
`src/tools/hold/hold.ts` is the arithmetic and the sentences; `holdLean.ts` the tiles; `holdPaper.ts` the paper and the study's sentence; `HoldScreen.tsx`
the page; `store.ts` the writes; the shared shell, kinds and dispatch are `src/tools/registers/` (four tools use them). Costs read the line's model; a
lot-level split, a link to the 8D report (**FC-150**) and the supplier trace (**FC-136**) are the next slices.
