# The case for the change — and what it was worth

> **Declined and taken off, 17 October.** Rowland: "This is a tool for a one
> man consultant — if we do all 6 it becomes a full business tool, so don't
> do any of them." Slice A was live for an evening and is off the screens and
> papers; the empty `projects.business_case` column stays. This page is the
> design, kept as the record (BLUEPRINT §6).

BLUEPRINT §6, 12. Rowland, 17 October, with a list of forty
project-management practices: "at its core faultline is a project
management system ... what we could introduce into faultline that would
make it more powerful". The first of the six it was missing: **a job says
when it hands over, never what it is for in money** — and after the
handover nothing says whether it paid.

The sentence it lets one side say to the other — the lead to the sponsor:
*"Line 2's new wrapper is for the 4-pack contract: from 0 to 120 a minute,
£18.4k a week of margin from 1 December. Measured since: £14.2k a week —
77% of the case."*

## Placed on the blueprint (§8)

- **Layer:** jobs.
- **Record:** the job — `projects.business_case` (jsonb), the owner's like
  every agreed field (`supabase/BUSINESS_CASE.sql`: the column, and
  `faultline_keep_agreement` keeping it for anyone but the owner). No new
  noun: the case is the job's own words and numbers, beside its handover
  dates.
- **Reads:** the one cost model — each of the job's lines from Your factory
  (its shifts less their breaks, its margin a pack: `lib/lineLoss` lineDay)
  — and the job's own measure on each line (`lib/measures` lineSeries: its
  readings and its target).
- **Replaces:** nothing. The job's description stays (what the job *is*);
  the case is what it is *for*.

## What is asked — once, by the owner

1. **What it is for** — a sentence in the business's words.
2. **Each line: from and to** — the rate a minute before the change and the
   rate it is for. Offered, never assumed: *to* from the job's target on the
   line (its per-minute measure), else the line's rated speed in Your
   factory; *from* from the line's first reading on the job, else typed (a
   new line makes 0 today — typed, not guessed).
3. **The days it runs a week** — asked, never assumed (the SMED rule).
4. **When it should start paying** — a day; the agreed handover offered.

## What is worked out (`lib/businessCase`, pure)

- **A day** of a line: (to − from) × its running minutes a day × its margin
  a pack. **A week:** × the days it runs. The job: the lines added.
- **Measured** — once the start day has come and a reading is taken on or
  after it: (latest − from) × the same; and its share of the case.
- Missing an input: the line named with what to give and where (its shifts
  and margin in Your factory; its from or to in the case) — never a blank,
  never an invented figure.

## Where it shows — screen and paper together

| Place | Screen | Paper |
|---|---|---|
| The job's front page | *The case*, a line under the band (not a sixth tile — the one-page status must stay one page): what it is for, £ a week of what, once started what it is measured at and its share; the owner's *Write the case* / *Change the case* opens the editor | — |
| The one-page status | — | *The case for the change* under where we are: the same words |
| The client report | — | the same, under where the job is (a row a line, from → to, a day, a week, measured — slice B) |
| The control room | slice B: what the running jobs are for, a week, beside what their slips cost | slice B |
| A 6M job | slice B: the gap closed is the case; its front page and the 6M report | slice B |
| The handover | slice B: the case and what was measured, on the handover paper | slice B |
| The close (§6, 14) | reads *measured* — did it deliver | |

Colour: the case is the work, neutral. Measured at or above the case is
green; under it after the start day is amber (still climbing — waiting on
the line); no figure is red, since a climb is not a failure.

Access: the owner writes it (`can.agree`); the team and a client read it.

## Slices

- **A** — *built 17 October* (`scripts/acceptance/business-case.mjs`): the column (applied and read back), the type, the mapper and the
  schema test; `lib/businessCase` and its tests; the editor; the stage-gate
  front page line under the band; the one-page status and the client report.
- **B** — the control room and its paper; the 6M job and its report; the
  handover paper.
