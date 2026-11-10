# FC-034 part 5 — Line capacity: the products of a line, on one capacity

**Catalogue:** FC-034 (Line capacity); FC-042 (product mix, which reads each product's speed). **Knowledge:** `docs/CAPACITY.md`;
Goldratt (the constraint depends on the product — a different mix of speeds moves it); a routing's product-specific cycle
times (Hopp & Spearman, *Factory Physics*: each product has its own processing time at each station; the line's rate for a
product is the least station capacity for that product). **Asked for:** Rowland, 5 November — *"it's all about titles … you
can have lines that operate the same, but as soon as you put a product down, bottlenecks could be created … 1.25 kg, 1.75
kg, 2 kg … I've opened up capacity one time and I can do everything within there … swiping left"*. **Status:** specified and
built 5 November.

## 1. Purpose
A line made three products as three separate Line capacities, each typing the same stations again. The stations are the line's;
only the speeds (and sometimes the crews, the yields and the target) change with the product. The sentence it lets one side
say to the other: **"On Line 2 the 1.25 kg is held by the wrapper at 50 a minute, the 1.75 kg by the sealer at 36, the 2 kg by
the sealer at 30 — and the 2 kg is 20 short of its 50."**

**Scope.** (1) A **product** is a named variant of the line's capacity, stored as the what-if mechanism stores one: only what
it changes against the line's stations (a speed, a crew, a yield, a target), so a station added or moved on the line follows
into every product (`syncWhatIfs`). (2) The page's tabs name them — the line's own product first, then the others — with
**＋ Another product** and a swipe left past the last one making a new product from a copy of the one on the screen; a product
has its own name box, its own target, its own bottleneck, sentence, drawn map and labour. (3) **All products** — one card,
a row each: what it makes, what holds it, its target met or short. (4) The paper says the same: the table, then each
product's drawn map. **Not in this build:** a product-specific line count or feed (the lines and the feed are the line's);
per-product price and orders for the product mix (they stay on each product's line standard); retiring the existing
what-if (it stays beside, for trying a change).

## 2. Users and scenarios
(1) Line 2 runs 1.25 kg, 1.75 kg and 2 kg through a filler, a bagger, a sealer and a wrapper; the sealer is slower on the
2 kg. (2) A person types the stations once, adds the products, changes the speeds that differ. (3) A new machine is added to
the line: every product has it.

## 3. Method selection
**Established · assumed · chosen.** *Established:* for each product, a serial chain's rate is its least effective capacity in a
common unit (existing `analyse`); a product-specific processing time changes which station is least. *Assumed:* one product
runs at a time (capacity is per product; the mix across products is FC-042's). *Chosen:* a product is a stored difference
against the line's stations, never a second full copy; its target defaults to the line's.

## 4. Inputs
Per product: a name (required to show on the paper), optionally a target; the station fields it changes. Stored as a
`WhatIf` with `product: true` inside the capacity's one jsonb — no column, no sync change.

## 5. Data suitability
A product with no name is shown as "Product 2". A product with no differences reads as the line's own. A station with no
speed in a product is named, as in the line.

## 6. Calculations
Product p: `analyse(whatIfCapacity(cap, p))`. **Independent worked case** (by hand): stations filler 120, bagger 100, sealer
S_p, wrapper W_p, all in one unit, 100% running and good. 1.25 kg: S = 90, W = 50 → rate 50 (wrapper). 1.75 kg: S = 36, W = 50 →
36 (sealer). 2 kg: S = 30, W = 50 → 30 (sealer). Targets 60, 40, 50 → 10 short, 4 short, 20 short. A station added to the
line (a labeller at 45) is in every product: the 1.75 kg becomes 36 (still the sealer), the 1.25 kg stays 45 → 45 (the
labeller now holds it).

## 7. Outputs
The page: tabs, the name and target of the product on the screen, the line's tiles, verdict, drawn map and bars for it, and
an **All products** card (a row each: name · makes · held by · against its target). **The report.** The paper's *Where it is
limited* gains **Products on this line** — the same rows as the card — then each product's drawn line under its own name,
compact; a single-product line prints exactly as before.

## 8. Manufacturing usability
Phone first: the tabs scroll sideways, a swipe moves between products (as between what-ifs today), a swipe left past the
last makes a new product; the All products card is a list of rows, not a wide table; controls 44 px; nothing off the side.

## 9. Failure handling
No products: the page and paper are unchanged. A deleted product is undone with Undo. A product whose speeds make a station
unusable says which (as the line does).

## 10. Integration
Reads: the line's stations (as run) and each product's stored differences. Shown: the page tabs and All products card, the
product's own sentence and tiles, the paper, the line package's Line capacity section (the same paper blocks). Labour: a
product has the line's people and rate (its crews follow its stations). Access: `can.edit` / `can.remove` as the what-if.

## 11. Verification
Unit: `src/tools/linebalance/__tests__/capacityProducts.test.ts` (the case in §6, the rows, a station added reaching every
product, no products → no rows). Acceptance: `scripts/acceptance/line-products.mjs`.

**Acceptance criteria.**
1. The §6 case equals the hand-worked rates, bottlenecks and shortfalls — *proved by* `capacityProducts.test.ts`.
2. A line with no products reads exactly as before — the existing capacity tests.
3. On the page, **＋ Another product** makes a product, named through its box, one speed changed through the real boxes,
   its bottleneck moving as §6 says — `line-products.mjs`.
4. **All products** shows a row each with the module's words — `line-products.mjs`.
5. A station added to the line appears in every product — `line-products.mjs`.
6. The paper carries Products on this line and each product's map, read back — `line-products.mjs`.
7. The phone: tabs reachable, a swipe changes product, nothing off the side — `line-products.mjs`.
Not yet proved: the full gate and paper parity.

## 12. Maintainability
One place a product is read (`productRows`); the scenario mechanism is shared with what-ifs.

### The paper, product by product (10 November)
**Asked for:** Rowland, 10 November, on his dual line (P- 09 All rounder 2kg on Line A and Line B, with P - 05, P - 06 and P - 10): *"On the HTML, it's really nice because it does the drawing, the line drawing, then it just basically gives a really small section of exactly what's happening … But then the report does all the drawings separately, and then all of the bar graphs separate as well. You can't really tell what belongs to what graph … I want each page to have its own line drawing and explanation, so what each station can do, then with the commentary. Very simple, very clean, very cut … identical"* to the screen.

**Scope.** (1) The first product's page as its tab: the band and tiles, *The line, drawn*, *What each station can do* straight under it, then what it means and the action plan. (2) **Each other product on a page of its own** (a hard page break, never under the last of the one before): its name, its sentence as the All products card says it, its line drawn and its bars — the three together. (3) A drawn line made of several lines keeps each line's V and capacity sheet at the back, under *The figures, station by station* — every figure kept, none in the way; a line not drawn keeps them where they were. **Chosen:** the order the screen shows; the sheet at the back rather than dropped (CLAUDE.md rule 1 — nothing removed).

**Acceptance criteria.** 1. Each other product on its own page with its sentence, *The line, drawn* and *What each station can do* — `line-products.mjs` 6c. 2. Every row of the All products card still on the paper — `line-products.mjs` 6b. 3. The papers of a single line and of split lines unchanged in what they carry — `capacity-paper-line.mjs`, `split-lines.mjs`, `list-paper.mjs`, `report-stress.mjs`.
