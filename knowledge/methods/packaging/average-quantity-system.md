---
id: packaging.average-quantity-system
name: The average quantity system (℮) — the packers' three rules, and the inspector's reference test
aka: [average system, e mark, packers rules, TNE, tolerable negative error, T1, T2, weights and measures, short weight, reference test, inspector's test]
discipline: packaging
kind: established
evidence: law
depth: full
checked: 2026-10-25 — UK law seen only as search-result excerpts of legislation.gov.uk (SI 2006/659 Schedule 2 "The reference test" and Schedule 3 the tolerable negative error table) and of the Business Companion, WSTA and WELMEC guides; legislation.gov.uk, EUR-Lex and the guides could not be fetched from this container (DNS and proxy refused), so no schedule was read whole; the single and destructive plans, the TNE table and its rounding note were each given by more than one excerpt, the mean-check constants were reproduced by computation (t at 0.995 over the square root of n, SciPy), the double plan is seen for one band only and the rule for batches under 100 differs between excerpts; Directive 76/211/EEC Annex II and OIML R 87 from knowledge; Faultline's tneFor in src/tools/capability/sample.ts compared with the table
needs: []
next: [yield.giveaway, spc.capability-measured]
alternatives: []
related: [packaging.checkweigher-verification]
---
# The average quantity system (℮) — the packers' three rules, and the inspector's reference test

## Purpose and principle
Packs sold by weight or volume under the average system must meet three rules:
(1) the actual contents on average are not less than the nominal; (2) no more
than a small proportion (1 in 40, 2.5%) are short by more than the tolerable
negative error (TNE) — below T1; (3) none is short by more than twice the TNE —
below T2. The TNE depends on the nominal.

The packer proves the rules by their own checks. An inspector of weights and
measures does not weigh every pack: they run the **reference test** (Schedule 2
of the Regulations) on a **batch** — a sample drawn at random by a sampling
plan, and two checks, one on the count of packs below T1 (rule 2) and one on
the sample's average against the nominal allowing for its spread (rule 1). The
batch passes only if both checks are met. The test is public law, so a packer
can run exactly the test an inspector would, in advance — that is what FC-232
would be. It is a rehearsal; the verdict that counts is the inspector's.

## Questions it answers
Is this batch legal? How close to the rules is the filler running? Would
this batch pass the test an inspector would run on it?

## Inputs and minimum conditions
Pack weights (net) of a sample; the nominal and unit. For the reference test
also: the batch size, the sample **drawn at random** from the batch (the
pack's order on the line is not random), whether the weighing opens the pack
(destructive: volume, drained weight) or not, and a measurement good enough —
the Regulations allow an error in measuring one pack of no more than one fifth
of the TNE (seen in one excerpt; to confirm), so the scale's resolution and the
tare must be said.

## Procedure and calculation
**TNE** (g or ml; Schedule 3 of SI 2006/659 — *not* Schedule 2, which this
record and the code cited before 25 October). Seen as the same nine bands in
the legislation.gov.uk excerpt and in the Business Companion table:

| Nominal Qn (g or ml) | TNE |
|---|---|
| 5 to 50 | 9% of Qn |
| 50 to 100 | 4.5 g or ml |
| 100 to 200 | 4.5% of Qn |
| 200 to 300 | 9 g or ml |
| 300 to 500 | 3% of Qn |
| 500 to 1,000 | 15 g or ml |
| 1,000 to 10,000 | 1.5% of Qn |
| 10,000 to 15,000 | 150 g or ml |
| over 15,000 | 1% of Qn |

Where the TNE is a percentage the figure is **rounded up to the nearest tenth
of a gram or millilitre** (the note under the Schedule 3 table, seen in one
excerpt; also the Directive's wording, from knowledge). T1 = Qn − TNE; T2 = Qn
− 2·TNE. Which band a nominal of exactly 50, 100 … falls in (the table's "not
more than") is to be read from the table itself; the ranges above are as the
excerpts printed them.

**Rules 1–3** as the packer's checks: mean ≥ Qn; fewer than 1 in 40 below T1;
none below T2. (The reference test's sampling plans count packs below T1; a
single pack below T2 is a breach of the third rule by itself — what the
Schedule says about an inadequate pack found in a sample is to be read.)

**The reference test** (Schedule 2, "The reference test"; its three plans were
given by more than one excerpt of the legislation.gov.uk page; every number
below is to be checked against the whole Schedule before it reaches a screen):

- *Batch.* All packs of the same nominal quantity, type and production run,
  packed in the same place, which are to be inspected. Checked at the end of
  the line, the batch is the line's maximum hourly output; in other cases it
  is limited to 10,000 (the importers' guide: "10,000 packs or one hour's
  production").
- *Two checks, both must pass:* (i) the **number of defective packs** in the
  sample — a defective pack has actual contents below Qn − TNE (T1) — against
  an acceptance and a rejection number; (ii) the **average** of the sample
  against Qn − c·s, where s is the sample's standard deviation and c depends on
  the sample size. The smaller sample of check (ii) is drawn from the larger of
  check (i).
- *Single sampling plan, non-destructive* (check i), number in batch → sample
  / accept up to / reject from: 100–500 → 50 / 3 / 4; 501–3,200 → 80 / 5 / 6;
  3,201 and over → 125 / 7 / 8.
- *Single sampling plan, destructive* (opens or destroys the pack; not
  generally applied under 100): any batch of 100 or more → 20 / 1 / 2.
- *Double sampling plan, non-destructive*: a first and a second sample; a count
  between the first acceptance and rejection numbers calls for the second
  sample and is judged on the aggregate. One excerpt, from a garbled copy,
  gave one band (batch 100–500: first sample 30, second 30, aggregate 60;
  accept 1 then 4, reject 3 then 5). **The other bands are unread.**
- *Average check*: accept when x̄ ≥ Qn − c·s, reject otherwise; sample sizes
  30 (batch 100–500), 50 (501–3,200), 80 (over 3,200) non-destructive, and 20
  destructive. The constants seen in one garbled excerpt are c = 0.503, 0.379,
  0.295 and 0.640. They are **reproduced** by c = t(0.995; n−1) ÷ √n — n = 30:
  0.5032; 50: 0.3790; 80: 0.2951; 20: 0.6397 — and the excerpts say the Schedule
  uses the Student t at the 0.995 level with n−1 degrees of freedom, so the
  constants and the formula agree. Still to read: the whole paragraph.
- *Under 100 packs*: the non-destructive test is on **every** pack and the
  average is checked with n = the batch. One excerpt, from a third-party copy,
  gave "acceptable if the defective packs do not exceed 5%"; 5% sits oddly
  beside rule 2's 2.5%. **Unresolved — read the paragraph, or leave batches
  under 100 out of the first build and say so.**

**Independent cases** (computed, for the builder's tests; the plans'
operating characteristics follow from the binomial and are not in the law):
Qn = 400 g → TNE 12 g, T1 = 388 g, T2 = 376 g; n = 50 and s = 3.0 g → average
threshold 400 − 0.379 × 3.0 = 398.863 g. Nominal 150 g → TNE 6.75 → 6.8 g
(rounded up). Chance that a batch with 2.5% of packs below T1 passes the
single non-destructive plan: 50/3 → 96.4%; 80/5 → 98.5%; 125/7 → 98.6%;
destructive 20/1 → 91.2%; with 8% below T1: 42.5%, 37.5%, 20.9% and 51.7%.

## Assumptions, limits and misuse
- Net weight: tare must be right; the measuring error must be small against
  the TNE (one fifth, to confirm).
- A sample's pass on the packer's own plan is not the inspector's reference
  test; the reference test needs a **random** sample sized by the batch, and
  rehearsing it on the first packs off the line, or the best ones, says
  nothing. A tool can only count what it is told; it cannot see how the sample
  was drawn.
- The plans are **the law's, not the packer's**: a pass here is "would pass if
  the inspector drew a sample like this and found the same", never "complies".
  The inspector's batch, sample and measurement are theirs.
- Rule 3 stands apart (above).
- Volume packs checked by weight need the density at temperature.
- The Regulations have been amended since 2006 (the Schedule 2 page carries
  versions — made 2006, 2015 and later); the current consolidated text is the
  one to read, and the version read is said on the screen.
- ISO 2859 and OIML R 87's own plans are not this test (WELMEC 6.3 says R 87's
  plan is not comparable with Annex II), so the tool never mixes them.

## Reading the result
"Average 401.2 g, above 400 ✓ · none more than 12 g short ✓ · none more than 24 g short ✓ — Passed."

For the reference test, in the same plain order: "Batch of 2,400 → the plan
asks for 80 packs; 4 of 80 were below 388 g (up to 5 allowed) ✓ · average
399.6 g against 398.9 g needed ✓ — an inspector drawing a sample like this
would pass the batch. Drawn at random? Said by you."

## When not to use it — and instead
Give-away in money → `yield.giveaway`. The filler's spread → `spc.capability-measured`.

## In food and FMCG manufacturing
Every pre-packed product marked ℮ (or sold by quantity in the UK).

## References
- [law] The Weights and Measures (Packaged Goods) Regulations 2006 (SI 2006/659), legislation.gov.uk/uksi/2006/659 — Schedule 2 (the reference test) and Schedule 3 (tolerable negative error). Public law, Crown copyright under the Open Government Licence; seen as search-result excerpts only, 25 October 2026.
- [law] Council Directive 76/211/EEC on the making-up by weight or by volume of certain prepackaged products, Annex II (the reference method the UK Schedule follows); the EUR-Lex consolidated text was in the search results and was not read.
- [guidance] Business Companion (Trading Standards), *Packaged goods: average quantity* — the TNE table and the three rules; excerpt only. WSTA, *A guide for importers* (2025) — the inspector's reference test on a batch and the 1979 Packers' Guide; excerpt only.
- [guidance] WELMEC 6.3 (2024), *Guidance for the harmonised implementation of Council Directive 76/211/EEC*, Part 4 (Annex II) — not read.
- [standard] OIML R 87:2016, *Quantity of product in prepackages* — from knowledge; paid.

## In Faultline
The capability study's *Sold by weight* (`src/tools/capability/sample.ts`, FC-162 — the three rules,
proved by `capability-kinds.mjs` steps 3 and 14); since 24 October a volume pack checked by weight
(FC-163, W1 — `sample.ts` packersTne, `modes.ts` densitySays): the nominal in millilitres and the density
typed, the nominal kept in grams, the TNE the volume table's at the nominal in ml converted by the density,
the rules said in grams (`capability-kinds.mjs` step 14b).

**Findings against that code (25 October, research 1 — nothing changed there):** `tneFor` in
`src/tools/capability/sample.ts` cites "Schedule 2" (the TNE is Schedule 3); it returns nothing above
10 kg where the table goes on (150 g or ml to 15 kg, then 1%); and it does not round a percentage TNE
up to the next tenth (150 g gives 6.75, the Schedule says 6.8). For pack sizes to 10 kg the difference
is a tenth of a gram on the 4.5% and 3% bands. To correct, with a test, when FC-232 is built.

**FC-232 — CAN BE BUILT.** It rests on public law, after one reading of the whole of Schedule 2 and
Schedule 3 on legislation.gov.uk by a session that can fetch it (this one could not). A minimal build, as a
mode of the sold-by-weight study rather than a tool of its own: *Run the inspector's test.* Asked: the batch
size (and the line's hourly output when checked at the end of the line), whether the weighing is
destructive, the scale's resolution. The plan's sample size is then said ("weigh 80 packs picked at
random from this batch"), the weights typed, and the two checks and the verdict given in the words above
with the plan's row shown. Verdict wording: "would pass", "would fail", "would be referred to the second
sample" — and always "the inspector's sample and measurement decide, not ours"; never "complies" or "legal".
Offered first: the single non-destructive plan and the destructive plan; the double plan only once its
table is read in full; batches under 100 held back until the 5% question is read. The batch caps (an hour
or 10,000) are said, not enforced. Independent validation: every band edge of the lookups, c = t(0.995,
n−1)/√n against SciPy, the average threshold, and the binomial pass chances above. What it must **not**
claim: that a pass is a legal pass; that the sample was random; anything about rule 3 beyond counting
packs below T2; any plan of OIML R 87 or ISO 2859.
