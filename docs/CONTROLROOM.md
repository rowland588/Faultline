# The control room, and who can do what — audit

Rowland, 9 October: audit the control room (the page above every job), and
check what each person can do on a Stage Gate job — owner, team, client.
Findings first; nothing is changed until he has seen them.

Audited 9 October in Chromium at laptop (1360) and phone (390) width, with
three seeded jobs (one of each method), with one job, and with ten jobs
(five Stage Gate, four 6M, one lever tree, names long and awkward on
purpose). Every tile, chip, card and row was clicked. Roles were walked with
the app's own development switch (`faultline.access.force`): every Stage
Gate screen, panel and drawer, as owner, team and client, laptop and phone,
recording every control that can change something.

## The control room, against the eight questions

**1. In three seconds: which job is in trouble, why, and who owes what?**
Mostly yes with three jobs: one sentence ("3 jobs running · Line 2 hands
over first, in 27 days. 7 things late."), four numbers, a "Behind target /
On target" pill on every job, and who owes what across them all. Where it
fails:
- The sentence names the next handover, not the most urgent job. With ten
  jobs it said "Line 12 … hands over first, in 26 days" while Line 11 was
  already two days past its expected handover.
- With most late items unowned it read "108 things late — 92 of them
  Nobody named's".
- "Why" is a paragraph on every Stage Gate row: every late item, the
  critical, the risk and its cost, in one block of small text. The same
  facts then repeat underneath as chips ("1 critical"), a "Critical: …"
  line and a "Next: …" line.

**2. Does each job say what its own front page and report say?**
- **Not on late.** A 6M job counts only its board's actions: Line 7 says
  "2 late" on the control room, in the rail and in its own header, while
  its own Needs you says "5 late — 2 actions, 2 materials, 1 program". A
  Stage Gate job counts its materials and programs. So the control room's
  "7 things late" leaves out three of Line 7's.
- **Not in words.** One state wears five words: "late" (rail, sentence,
  chips), "past their day" / "past its day" (6M and lever tree rows and
  front pages), "overdue" (a lever tree condition), "the day has gone"
  (the timeline's key), and "was 3 Oct" (cards). Line 2B shows "1 late"
  and "1 overdue" side by side. Nobody owning something is "No one named"
  on a chip and "Nobody named" in the sentence.
- Line 2's own numbers do agree everywhere: 16 outstanding, 4 late, and
  the 16 adds up exactly from what each party owes on that job.

**3. Does "who owes what" lead to the items?** Yes. A party opens "What
Ilapak UK owes — 11" across every job, each row opening its record, with
"Copy as a list" to read down the phone. With ten jobs the parties ran to
thirteen chips over seven rows.

**4. Is the timeline readable, saying where each job is and what's next?**
Yes for a single row: each job shows its gate spans with their dates, today,
its handover flag, and a "Next: …" line; a row opens in place into the job's
own plan with the doors to it. It costs height: each Stage Gate row is as
tall as its paragraph, so ten jobs made a 4.9-screen page. A 6M row's
calendar is mostly empty beside a tall list of counts.

**5. One job, and ten.**
- One job: 1.2 laptop screens, clear.
- Ten jobs: 4.9 laptop screens and 5.6 on a phone.
- "This week, across every job" is one sideways strip of cards: 22 cards
  with three jobs, 145 with ten (34,500 px wide, five visible at a time).
  A second strip, "No date agreed", appears beside it. Neither can be read
  as a list, so the one view stops being one view at scale.

**6. Do Stage Gate, 6M and lever tree jobs read alike?** The pill ("Behind
target" / "On target") and its colours are the same on every method. Each
method's second line is its own, as intended (gates, bones, the tree). What
is not alike is what "late" counts and what it is called (question 2).

**7. Is there one paper for the business, covering every job?** No. Every
report is a job's own. The page whose purpose is to show the business you
are in control has nothing to hand over.

**8. On a phone?** It works: the sentence, numbers, parties, the strip and
each job's card, with the calendar left out and each job opening in place.
At 2.4 screens for three jobs and 5.6 for ten, the same scale problems
apply. The phone bar carries the first three jobs, the rest are under More.

## Who can do what — the roles check

**Client — reads it and takes the reports.** On every Stage Gate screen,
panel and drawer, laptop and phone, no control that changes anything is
offered. What is left opens a record, filters a list, opens a fold or
downloads a PDF.
- The machine panel, the stage list and the usual tests open read-only,
  with only Close.
- The day's "Go to a day" box only navigates.
- Folds opened and program rows expanded show no boxes and no buttons.

**Team — does the work; what was agreed and deleting stay with the
owner.** Exactly what the rules say goes:
- every delete: stage, test, fix, problem, machine, line-standard map, the
  day's plan items, lines, and the project itself;
- both stage lists and the usual tests (read-only);
- Commission's handover "Dates";
- the project's details;
- the report's commentary.

Everything the work needs stays: Edit, Done today, Hit a problem, verdicts,
fixes, parts, materials, notes. A written "passes if" or "done means" is
shown as text in Edit. A blank one can be written — and the database's own
rule (`faultline_keep_agreement`, `supabase/ACCESS_LEVELS.sql`) allows
exactly that, protecting the field only once something is in it. Screen and
database agree.

**Not proved here:**
- **The live database.** The Supabase connector did not connect in this
  session, so the live policies and trigger were not read back. The repo's
  SQL matches the screens; a live read-back is still owed.
- **"New project" for someone invited only to a project.** It is decided by
  the database (`can_start_projects`), which needs a real invite to try.

**Questions for you, not defects:**
- A client can read the job's **Notes** (what to raise at the next meeting)
  and **the day's internal plan**. The rule says a client "reads it" — is
  that everything, or should those two stay with the team?
- **Only the owner can write the report's commentary.** Should the team be
  able to as well?
- A client is shown **"Needs you"** on screens where they owe nothing.

## Proposed, for your decision — nothing built yet

1. **One count for late.** Late on every job is everything past its day that
   the job's own Needs you lists — a 6M job's materials and programs too —
   so the control room, the rail, the job's header and its report agree.
2. **One word for late.** "Late" everywhere ("past their day", "overdue" and
   "the day has gone" become "late"), with the date where it helps ("was 3
   Oct"); "No one named" everywhere; the sentence's grammar mended.
3. **The sentence names the most urgent job first** — a job past its expected
   handover before the next one due.
4. **A job's row says why in one line** — its first abnormal thing, "and N
   more" — with the chips kept; the paragraph's detail stays one tap away in
   the opened row.
5. **"This week" as a list, not a strip** — late first, grouped by job, the
   first eight with "Show all N"; the same for "No date agreed". The parties:
   the first five, then "and N more".
6. **A control room report** — one page, every job: its verdict, why, and
   who owes what by when, read off the same numbers as the board
   (`lib/portfolio`), from a Reports door on the control room. This is a new
   document, so it is yours to say yes to.
7. **Roles** — your answers to the three questions above, and the live
   database read-back when the connector is back.
