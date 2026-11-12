# LUNAR's analytical brain — what is built, what is next

*12 November. Rowland's mandate (*"LUNAR — the complete evolution of its intelligence"*): **"Lunar does its homework before the question
is asked."** Three parts working together — the analytical brain (absorbs, examines, finds patterns and relationships, investigates
causes, produces evidence-based findings), Luna (understands, interprets, reasons, talks), and the knowledge infrastructure (persistent,
structured, connected). The most important requirement: **Luna must understand why things happen** — explain the events that created the
performance, not read out the KPIs; keep the recorded explanation apart from the evidence-based one; never invent a root cause; say when
the evidence is insufficient. Production data stays held until the business data model, identities, traceability and validation are
agreed (docs/STATE.md §2), so the brain starts on what LUNAR already holds.*

*His message reached us cut off in §6 (the learning loop, at "…it should retain the analytical method and the conditions under which that
analysis was useful"); everything after that point is still to be read.*

## 1. What already existed (before B1) and is reused, not rebuilt

| Need in the mandate | Already in LUNAR |
|---|---|
| Absorb Excel and files without sending them to a model | the on-device workbook reader (`lib/workbook`, 50 MB+), the sources register (`lib/data/sources`), `query_data` over workbooks and the line's own tables |
| Analytical methods | `lib/ie` — descriptive statistics, intervals, Welch, Mann–Whitney, paired tests, proportions, rates, control charts, capability, regression and relations, ANOVA/groups, distribution fitting, gauge studies, DOE, response surfaces; `lib/data/change` — what changed and where (decomposition) |
| Financial impact from one model | `lib/cost`, `lib/problemCost` (labour, packs, contribution; the bottleneck's rule), `tools/losses` contribution, `knowledge/MONEY.md` |
| Persistent knowledge Luna retrieves | studies synced to Supabase under the line's policies; the notebook of meanings; kept results, charts and reports on conversations |
| Provenance | every capability's result says how a figure is known; AI never works out a figure (`work_out`, the figure check) |

What was missing: **nothing did the work before the question**, and **nothing kept findings as knowledge** — every analysis ran when asked.

## 2. B1 — the homework, on a line's stops (built 12 November)

- **The engine** (`src/lib/brain/engine.ts`, pure, no AI): four questions on a line's timed stops, each run only when the records can bear it —
  *where* the stop time went over 28 days (Pareto by machine and reason, the vital few), *changed* — the last 7 days against the 21
  before (exact conditional test of two Poisson rates, checked against SciPy), *recurs* — the same reason on the same machine three or more
  times in 14 days, and *recorded* — time booked to a description ("operator", "other", "unknown") said to be a description, not a cause.
- **Every finding carries** its method in words, the stops it rests on, the period, how sure it is (*measured · unlikely chance · could be
  chance · too few records*), what it cannot say (always: *a day nobody timed looks like a day with no stops*), and its money from the one
  cost model with the missing input named — never invented.
- **Kept** (`src/lib/brain/homework.ts`): one study of tool `brain` a line (`brain-<line>`; `supabase/BRAIN.sql` widened the tool check,
  applied and read back), with the engine version and a fingerprint of the records it read. Worked again only when the records change,
  the engine changes or a day passes; its state is always said — *Up to date · Out of date · Not done yet*.
- **Luna reads it first** (`findings`, a read capability): brought up to date if needed, then each finding's sentence, sureness, method,
  money and limits; her instructions say to quote them, say how sure each is, and keep a recorded reason apart from a cause.
- **On screen**: the line's Overview, first inside *More about this line* — *What LUNAR has found* (`line/brain/LineFindings`), whether it is up to date, each finding in its own words with its sureness, money and limits. Opening the line brings the homework up to date, and it follows a stop timed with no reload.
- **In the gateway**: `findings` is among the capabilities always loaded, and the rules say *LUNAR does its homework first* — read findings before saying how a line is doing or why; quote them, say how sure each is, keep a recorded reason apart from a cause, never invent a root cause.
- Proved by `src/lib/brain/__tests__/engine.test.ts` (hand-worked cases; the test against SciPy), `src/capabilities/__tests__/brain.test.ts` (the capability does the homework once, keeps it, says it) and `scripts/acceptance/line-findings.mjs` (the page against the engine, kept once, moved by a stop, the empty line, the phone). **Not yet proved with the real model**: whether Luna reads findings first in a live conversation — the next real-model run asks it.

**What B1 is not.** It does not run on a server or a schedule yet — the homework is done in the app, when a line's page is opened (and as its
records change) or when Luna reads findings; the state says when it is out of date. It reads only stops. It explains *where* and *whether it changed*, and flags patterns
and descriptions-not-causes; it does not yet relate product to line, shift, material or schedule, because LUNAR does not yet hold those
as data (products and shifts on stops are sparse; production records are held).

## 3. Next, in order (each its own slice, each proved)

1. **B2 — the server's homework**: the same engine in a Supabase function on pg_cron (nightly, and on change through a queue with
   retries), writing the same `brain` record — so it is done when nobody has the app open. Monitoring and the state on screen.
2. **B3 — more of what LUNAR holds**: loss counts (slow running, short stops by shift), problems (cost while open, age, owner), capability
   and control-chart signals, check-log failures; relationships across them (a machine's stops with its problems and its studies).
3. **B4 — "How was yesterday?"**: a day's story assembled from findings in order of money — what happened, where, what changed, what
   was present, the likely contributors with their evidence, and what to look at next — said by Luna from the findings, not from raw data.
4. **B5 — workbooks and sources absorbed on arrival**: on upload, the profile and the first findings kept as knowledge (not only answered).
5. **B6 — the learning loop** (§6 of the mandate, to be read in full): findings reviewed by a person — validated, rejected with why — kept,
   and the methods that proved useful in which conditions recorded, so the next analysis starts from them. Governed, explicit; not a
   model retraining itself.
6. **Production data** — only after the business data model, product and process identities, traceability and validation are agreed.
