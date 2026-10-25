# The books behind the library — what was read, what was not

The method records cite their sources line by line (`knowledge/README.md`, *A
method record*). This file is the shelf: the books Rowland has put in front
of the builder, what each holds, what the library takes from it and into
which records, and — honestly — how much of it was checked against the text.
A book is never quoted from memory as if read: a `checked` line says
"confirmed online", "from knowledge" or "text not read", and `knowledge/GAPS.md`
carries what is still to confirm.

**The builder cannot open most of the web.** This container's network policy
refuses publishers, Google Books, Wikipedia, the Internet Archive and
library catalogues (checked 24 October 2026: a 403 from the proxy on each; the
Google Books API answers but with a quota of zero). What *can* be done is a
web search whose results carry excerpts, so a book's structure, its
publisher's description and its reviewers' summaries can be confirmed; its
pages cannot. Where a formula or a list is given below "from knowledge", it
is the builder's knowledge of the text, confirmed where a secondary source
quoted the same thing, and it is said so.

## Rowland's three, 24 October 2026

Rowland, 24 October (three photographs): *"These are 3 books search the
Internet for them and get all information from these book as part of our
calculation knowledge base."*

### 1. Maskell, B.H. (1991), *Performance Measurement for World Class Manufacturing: A Model for American Companies*

Productivity Press, Cambridge MA, 389 pp.; ISBN 0-915299-99-2 (reissued by
CRC Press / Routledge; some listings give 429–432 pp.).

**Confirmed online (24 October):** the twelve chapters — 1 World class
manufacturing and the need for new performance measures · 2 Characteristics
of the new performance measures · 3 Traditional management accounting · 4
Measurement of delivery performance and customer service · 5 Process time ·
6 Production flexibility · 7 Quality performance · 8 Financial measures · 9
Measuring social issues · 10 Performance targets · 11 Producing the measures
· 12 Alternative cost and management accounting techniques; the six
measurement areas; the example measures of chapters 4 and 5 (vendor delivery
performance, schedule adherence, order and schedule changes, customer service
level, lost-sales analysis; manufacturing cycle time, delivery and production
lead time, set-up times, material availability, distance material moves,
machine uptime, customer service time) as the Gale abstract and the
*National Productivity Review* review list them; that the measures are
non-financial, strategy-related, varying by location and over time, simple,
fast in feedback and for improvement rather than monitoring (two secondary
summaries); that chapter 12 covers activity-based costing and life-cycle
costing.

**From knowledge, not confirmed:** the exact wording and count (seven) of the
chapter 2 characteristics; the example measures for flexibility, quality,
financial and social; whether chapter 12 treats throughput accounting.

**Where it lands:** `knowledge/methods/visual/performance-measures.md`
(new, full depth) — the test every measure on a Faultline page should pass,
and the six areas; `cost.inventory-carrying-cost` already carries Maskell's
later lean accounting (Baggaley and Maskell 2003). For the money model it
gives the first rule: the floor's measures are minutes, packs and counts;
money is worked out from them, never typed as the measure
(`knowledge/MONEY.md` §1).

### 2. Clements, R.B. (1991), *Handbook of Statistical Methods in Manufacturing*

Prentice Hall, Englewood Cliffs NJ, 420 pp.; ISBN 0-13-372947-8.

**Confirmed online (24 October):** author, publisher, year, pages, ISBN; a
review by R.M. Brugger in *Technometrics* 34(3), 1992, pp. 360–361 (paywalled —
its text not read); a practitioner forum's recommendation of it for SPC in a
job shop.

**Not confirmed — nothing found:** its table of contents, its chapters, which
methods it treats and how. No listing online carries them, and the book
cannot be opened from here. **So nothing in the library is attributed to it
yet.** Its subject — statistical methods for manufacturing: control charts,
capability, sampling, designed experiments, reliability are the usual span of
such a handbook — is covered in the library's `spc`, `stats`, `msa`,
`quality` and `maintenance` records from other named sources (Montgomery;
Wheeler; AIAG; ISO 7870, 22514, 2859, 3951). When a copy is to hand, each of
those records can be checked against the handbook's chapter and the
reference added where it agrees; until then, the handbook is on the shelf
and not in the records.

Not to be confused with **J.A. Clements (1989)**, "Process capability
calculations for non-normal distributions", *Quality Progress* 22(9) — the
percentile ("Clements") method in `spc.capability-nonnormal`; a different
author.

### 3. Pound, E.S., Bell, J.H. and Spearman, M.L. (2014), *Factory Physics for Managers: How Leaders Improve Performance in a Post-Lean Six Sigma World*

McGraw-Hill Education, New York; ISBN 978-0-07-182250-3 (listings give 304
or 384 pp.). The management restatement of Hopp and Spearman's *Factory
Physics* (Irwin/McGraw-Hill 1996; 2nd ed. 2000; 3rd ed. 2008, Waveland).

**Confirmed online (24 October):** the chapter list — 1 Science: use it or
lose · 2 the nature of business · 3 Practical science for leaders · 4
Practical math for managers · 5 Profit, cash flow and Factory Physics
science · 6 Operations strategy and planning · 7 implementing tactics,
controls and measures · 8 leadership, measures and culture change · 9
examples from industry · 10 a final word (one listing); the publisher's
description — the three key equations that govern a supply chain's
behaviour: **Little's law**, **the VUT equation** and **the variance of
replenishment-time demand**; the three and only three buffers — **inventory,
time, capacity**; sections on the cycle time against utilisation graph,
Little's law and efficient frontiers, best-case performance and the effect of
variability; the utilisation factor u ÷ (1 − u) and its steepness (a
secondary review); Factory Physics Inc.'s own deck (Pound 2013): safety
stock = z × SD(replenishment-time demand), the efficient frontier as the
least inventory for a given fill rate. The underlying formulas — critical
WIP W_0 = r_b T_0, the best, worst and practical worst cases, Kingman's
G/G/1 form — confirmed against lecture material taken from the first edition
of *Factory Physics* and online copies of the text.

**From knowledge, not confirmed:** the multi-server VUT form (Sakasegawa),
the departure-variability and effective-process-time formulas, the exact
wording of the laws of lead time, rework and "pay me now or pay me later";
how the 2014 book words any of it.

**Where it lands:** `capacity.flow-benchmarks` (new, full) — r_b, T_0, W_0,
the three cases, the laws; `capacity.kingman-vut` (summary → full) — the VUT
forms, the three buffers; `capacity.littles-law` (summary → full);
`planning.safety-stock` (summary → full) — the variance of replenishment-
time demand and the efficient frontier; `cost.inventory-carrying-cost`
already cites Hopp and Spearman for Little's law. For the money model it
gives the causation of waiting: a queue is the inventory buffer the line
chose by running a variable station near full, and it costs what inventory
costs (`knowledge/MONEY.md` §2, C4).

## Public sources for four "research" entries, 25 October 2026

Not books: public law and public guidance, for FC-232, FC-175, FC-178 and
FC-229 (`knowledge/GAPS.md`, *Research 1*). **None could be opened** — the
container refused legislation.gov.uk, gov.uk, ghgprotocol.org, ehedg.org,
eur-lex.europa.eu, the Food Standards Scotland, Campden BRI and Chilled Food
Association sites and the BSI/ISO stores (a DNS failure from the fetch tool, a
403 from the proxy). Everything below was confirmed from the excerpts a web
search returns, never from a page; a figure carries "seen in excerpts" until a
session that can fetch has read it. Public law and government guidance are not
copied; the records give the numbers the law states (facts) and say where the
text is.

| Source | Edition | What the records take | Checked how |
|---|---|---|---|
| Weights and Measures (Packaged Goods) Regulations 2006, SI 2006/659 — Schedule 2 (reference test), Schedule 3 (TNE) — legislation.gov.uk | as made 2006, with later versions; current consolidated text to read | the plans and the TNE table in `packaging.average-quantity-system` | several excerpts of the schedule pages and a third-party copy; constants recomputed |
| Council Directive 76/211/EEC, Annex II (EUR-Lex) | consolidated text exists (2019 version listed) | the method the UK Schedule follows | listed, not read |
| WELMEC 6.3 (2024) Part 4; WSTA *A guide for importers* (2025); Business Companion *Packaged goods: average quantity* | 2024 / 2025 / current | the inspector's reference test described; the TNE table agreed | excerpts |
| Food Standards Scotland, *Shelf-life guidance* | January 2025, v1.2 March 2025 | validation and verification, reasonably foreseeable conditions | excerpts |
| FSAI, *Guidance Note 18: Validation of product shelf-life* | Revision 5, 4 November 2022 | study steps; durability against challenge | excerpts |
| Chilled Food Association, *Shelf life of ready to eat food in relation to L. monocytogenes* | v1.1.1, 23 March 2010; new guidance 2026 | the 100 cfu/g and "not detected in 25 g" logic, worked examples, the 10-day rule | excerpts |
| EURL *Lm* technical guidance; DG SANTE *Listeria* guidance | v4, 1 July 2021 (amendment 1, 2026 per a listing) | challenge tests, three batches, durability studies verify | excerpts |
| Campden BRI, *Evaluation of product shelf-life for chilled foods* (Betts, Brown, Everis) | 2004; 2nd ed. 2019 *Evaluation of microbiological shelf-life of foods* | the trial approach | excerpts; paid |
| Regulation (EC) 2073/2005 and (EU) 2024/2895 | 2024/2895 applying from 1 July 2026 in the EU | the *Listeria* criterion 1.2 | secondary; GB position unsettled |
| EHEDG Guideline 8, *Hygienic design principles* | fourth edition, December 2025 (free); third edition March 2018 | the principles to be written in our own words | listings and announcements only |
| EHEDG Guideline 58, *Hygienic design risk management* | 2025 | the method named | listing only; sold |
| BS EN 1672-2:2020; EN ISO 14159:2008 | 2020 (published 31 January 2021); 2008 | scope; the three areas; nothing quoted | store listings and a preview excerpt; paid |
| GHG Protocol Corporate Standard (2004) and Scope 2 Guidance (2015) | revised edition; revision under way | scopes; location- and market-based | excerpts and secondary guides |
| DESNZ, *Greenhouse gas reporting: conversion factors* with methodology and major-changes reports | 2024, 2025 (10 June 2025), 2026 (11 June 2026) | the factors and how to use them | secondary guides quoting the workbooks |
| UK *Environmental reporting guidelines including SECR* | March 2019; 2026 review | scope 1 and 2 and an intensity ratio required | excerpts |

## Adding a book

Record it here (edition, what was confirmed and how, what was not), write or
raise the records it feeds with honest `checked` lines, and put what is still
unverified in `knowledge/GAPS.md`. Never promote a record's `evidence` to
`textbook` on the strength of a listing — that needs the text.
