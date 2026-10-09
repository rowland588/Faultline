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

## Proposed, for your decision

Items 1 to 6 were agreed on 9 October and are built — see "Decided and
built" below. Item 7 is still open.

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

## Decided and built — 9 October

Rowland: "Go ahead with 1 to 5, and the report." What changed, where it
lives, and what it does on the screen and on paper together (house rule 2):

1. **One count for late.** A 6M or lever tree job's late is now everything
   its own Needs you lists: the board's open actions and the materials and
   programs not in yet (`lib/portfolio` `pacedOwed`). The control room, the
   rail (`ui/Frame`), the job's header and Needs you
   (`screens/ProjectDashboardScreen`) and the control room report all read
   that one list. Line 7 says "5 late" in every one of them. The job's
   sentence still talks about its board, so it counts the board's actions
   ("N actions open — N late"). A Stage Gate job already counted its
   materials and programs, so its numbers do not move.
2. **One word for late.** "Late" everywhere on screen and paper: "past its
   day", "past their day", "overdue" and "the day has gone" are gone from
   the control room, the 6M board and its bones, the lever tree, the
   meeting, the snags list, the plan's key and the 6M, client, plan and
   snag-card PDFs. A date stays where it helps ("was 3 Oct"). Nobody owning
   something is "No one named" everywhere, and the sentence reads "81 of
   them with no one named" (it said "Nobody named's").
3. **The sentence names the most urgent job first.** A job already past
   its expected handover (or, on a running line, its date) leads: "Line 11
   is 2 days past its expected handover · Line 2B hands over next, in 26
   days". Before, it named only the next handover.
4. **A job's row says why in one line.** The date against what was agreed
   and the counts: "handover expected Thu, 5 Nov, 8 days after the agreed
   Wed, 28 Oct · 4 late · 1 high risk" (`lib/onTarget` `brief`). The
   paragraph (every late item, the critical, the risk and its cost) is one
   tap away: it opens with the row, under the verdict. Hovering the line
   shows the paragraph too. The chips stay.
5. **This week is a list, not a strip.** Late first, grouped by job, the
   first eight with "Show all N", and the same for "No date agreed" and the
   reminders (`ui/JobsBoard` `WeekList`). Who owes what shows the first five
   parties, then "and N more" opens the rest. With ten jobs the strip was
   145 cards across. Now it is eight rows, plus the opener.
6. **The control room report** — "Control room report — 1 page", a door
   under the board's numbers (`lib/controlRoomReport`, drawn by
   `lib/controlRoomPdf` through the report engine). One A4 page in four parts:
   - the board's own sentence and its counts;
   - every job: its name and kind of change, its verdict pill in its colour,
     the one-line why, its critical in red and what is owed next;
   - who owes what across the jobs, split by job;
   - what is late and what is due this week: job, what, who, when.

   It reads `lib/portfolio`, the same reading as the board, so the page and
   the screen cannot disagree. Every job is always on it. The lists step down
   until it fits, each saying "and N more — on the control room". On a board
   too busy for any list, a job's critical joins its reason as a count. Proved
   one page with three jobs, with twelve busy jobs and with twelve random
   ones, by `scripts/report-stress.mjs` from its real button, and by
   `src/lib/__tests__/controlRoomReport.test.ts`.

Item 7, settled 9 October:
- **Clients keep seeing Notes, the day's plan and "Needs you"** (Rowland:
  yes to all).
- **The live database was read back** once the connector was back. The
  policies on projects, tests, test items, assets, materials and programs
  (member reads, editors only write) and the `faultline_keep_agreement`
  trigger on every table match the repo and the screens.
- **The team writes the report commentary too.** The live read-back
  showed no database change was needed: the team may change the project
  row, and `faultline_keep_agreement` keeps only the agreed fields for the
  owner, which do not include the commentary. Only the screen held it to
  the owner; now the team writes it and a client reads it.
