# Handover — the end of a Stage Gate job — audit

Rowland, 9 October: audit the handover, from Commission to "Handed over".
Findings first.

Who it is for (Rowland, the same day): "The client could be the team. It's
also an internal tool, not an outside business tool — it is for a team to
ensure things are done correctly inside their own factory." So the handover
here is the project team handing a line to the people who will run it,
inside one factory, and the person who signs off may well be on the team.
The proposal below is written that way. Nothing is changed until he has seen them, and then the
handover's improvements and the gates' Needs you buttons (STAGEGATE.md,
flagged item 4) are built together.

Audited 9 October in Chromium at laptop (1360) and phone (390) width, as
owner, team and client (the app's development switch,
`faultline.access.force`). Three jobs were built at the end of the method:

- **Line 4**, four machines, each ending differently:
  - the **flow wrapper** has every gate done and all five hand-over lines
    ticked, with one fix still open (the jaw heater, Ilapak, 19 Oct);
  - the **checkweigher** has Install and Set up done, **no Commission test
    at all**, and all five hand-over lines ticked;
  - the **case packer** has Commission passed and 3 of 5 hand-over lines
    done: training is late and the client sign-off is still ahead;
  - the **coder** is all done, with nothing open.
- **Line 5**, one machine, all done, nothing open. It was handed over on
  7 Oct, a day before the agreed 8 Oct.
- **Line 6**, two machines, every gate done, one fix still open (a worn
  sealing jaw, Ilapak, 16 Oct).

Every place a job's end shows was read: the control room, the front page,
the Hand over and Commission screens, Fixes, the plan, the day, and the
status and client reports, downloaded from their buttons.

## Against the seven questions

**1. Can each machine be handed over today, and what stops it — in one
place?** No.
- **The Hand over screen sees only its own list.** It says "All 5 steps
  done" for the flow wrapper (a fix still open) and for the checkweigher
  (never tested).
- **Commission sees only its tests.** Its header says "4 of 4 passed" and
  its Needs you says "Nothing", while the checkweigher has no test at all.
  The checkweigher's row does say "0 of 6 usual tests".
- **"Where each machine is" calls both "Handed over".** The rule
  (`lib/install` `journeyNow`): a machine is handed over when no gate is
  open or still ahead. A gate with nothing kept does not hold it back, and
  open fixes are not looked at. So "Handed over" on a machine means "its
  hand-over list is ticked", not "it was proved, and nothing is left".
- **The client report prints the gap.** "Checkweigher · done · done ·
  nothing kept · done · Handed over". A client reads that as handed over
  untested.

**2. Is it judged against what was agreed, and does that stay fixed?**
Half.
- **Each test is judged against what was agreed.** Every test prints its
  "Passes if" beside its result.
- **What was agreed stays fixed.** The handover dates, the stage lists and
  a written "passes if" stay with the owner, on screen (`can.agree`) and in
  the database (`faultline_keep_agreement`).
- **But handover is not tied to Commission.** All five hand-over lines can
  be ticked before any test has run, and nothing says so.
- **The actual handover date is hard to find.** It is the last hand-over
  line's day, and only the full report's second sentence says it.

**3. Handed over with things still open — kept, with an owner and a date,
and still seen?** The open things are kept and seen. "Handed over with
these open" is never said.
- **Line 6's open fix is followed properly.** It is in Needs you, Fixes and
  the status report ("Waiting on: Fixes still to do — 1 open · Ilapak UK").
- **But the job says four things about where it is, and two of them
  contradict each other:**
  - "Handed over" on both machines and on the job's chip;
  - "On target · handover Wed 7 Oct as agreed · nothing late";
  - "2 days past handover" on its front page;
  - "Line 6 is 2 days past its expected handover", in the control room's
    sentence.
- **There is no list the client accepted at handover.** The open things
  after handover are simply the open fixes and hand-over lines.

**4. Is there one page to sign the line over on?** No.
- **The status report, sent first, never says the job was handed over.**
  For Line 5 it says "On target — handover Thu, 8 Oct as agreed".
- **The full client report gives two dates for one event.** It says the
  same verdict, then on the next line: "Handed over on Wed, 7 Oct, 1 day
  before the date agreed — the machine through all four gates, nothing
  outstanding."
- **"Client signed off" is a tick and a date.** It does not record who
  signed or what they accepted, and there is nowhere to sign. Each line
  prints its own "Hand-over item card — PDF".

**5. Does handing over one machine while others carry on work?** On
screen, yes: "3 handed over · 1 at Hand over", each machine in its own
row, and the plan's machine band reads "Handed over 1 Sep – 7 Oct". But
"handed over" carries question 1's weak meaning. Nothing says on what day
each machine was handed over, and nothing prints a machine's handover on
its own.

**6. After handover — said everywhere, out of the live work, reopenable?**
No.
- **The finished job still counts as running.** The control room says "3
  jobs running", counting Line 5.
- **The front page and the day never say it is finished.** Both read "On
  target — handover Thu, 8 Oct as agreed".
- **The front page shows "1 days past handover" in red** on a job that was
  handed over a day early. Red means the day has gone (the visual rules),
  and the grammar is wrong too.
- **Archiving exists, and nothing offers it.** A project can be archived
  and brought back (`db/projects` `archiveProject`), but the handover never
  suggests it. A job is reopened by unticking a line.

**7. Who can mark a machine handed over, and who signs?**
- **Anyone on the team can tick the sign-offs.** They can press "Done
  today" on "Client signed off" and "Safety sign-off (PUWER)". The
  database allows it: a stage's outcome is work, not something agreed. For
  a tool used inside one factory, where the person signing off is often on
  the team, that is right.
- **What the tick does not keep is the sign-off itself.** It keeps the day
  and the name on the line ("who"), which was typed when the line was
  planned. It does not keep what was still open when it was signed, so
  afterwards nobody can tell what was accepted with it.
- **Someone invited as a client can only read,** as the access rules
  intend. **The owner can do everything,** as intended.

**Small words:**
- **"1 days past handover"** should be "1 day".
- **Commission's header says "0 weeks to go"** with three days to go
  (`screens/TestsScreen`).
- **One line has three names.** It is a "Hand-over item" in Needs you and
  on its card, a "Hand over stage" in its drawer, and a "step" in "18 of 20
  steps done".

## Proposed, for your decision — nothing built yet

Each item says where it shows on the screen and on paper, together (house
rule 2), and what it hangs off (rule 3). No new noun: the open things are
the fixes and hand-over lines already kept, and the sign-off is the "Client
signed off" line already on every job's list.

1. **"Handed over" means one thing.** A machine is handed over when its
   hand-over list is done **and** Commission has passed. A machine whose
   list is ticked with nothing proved reads "Hand over done — nothing
   tested" in red on the Hand over and Commission Needs you. The flagged
   alternative is to keep "Handed over" with "no test kept" beside it, for
   a job whose tests live outside the app.
   - **Screen:** the front page's "Where each machine is", Hand over,
     Commission, the plan's machine band and the control room.
   - **Paper:** the client report's machine list and the plan pages.
   - **Open fixes do not block it.** They are said beside it: "Handed over
     · 1 fix open".
2. **A finished job says so, in one sentence, everywhere.** The sentence
   the full report already has becomes the verdict: "Handed over Wed 7 Oct
   — 1 day before the agreed Thu 8 Oct".
   - **The tile** "days past handover" becomes "handed over 1 day early"
     (or "on the day", or "N days late" in red only when it was).
   - **Screen:** the front page, the day, and the control room row and
     sentence.
   - **Paper:** the status report (its top block), the client report and
     the control room report.
   - **The control room counts it apart** ("2 jobs running · 1 handed
     over"), the finished job below the live ones, with an offer to
     archive it.
3. **Handed over with things open is said, not contradicted.** When every
   machine is handed over but fixes or lines are open, the job reads
   "Handed over with 1 open — Replace the worn sealing jaw · Ilapak UK · 16
   Oct". It never reads "past its expected handover". The list is the open
   fixes and lines, as kept now.
   - **Screen:** the front page, Needs you, the control room and Fixes.
   - **Paper:** the status report's "what we are doing about it" and the
     client report's Fixes.
4. **A sign-off keeps what it accepted.** Whoever on the team ticks
   "Client signed off" or "Safety sign-off (PUWER)" does it as now, and
   the line keeps who and the day. The tick also writes down what was still
   open on that machine at that moment, e.g. "Signed off with 1 open:
   Replace the worn sealing jaw · Ilapak UK · 16 Oct". If the line has no
   name on it, ticking it asks who signed.
   - **No role restriction and no database change.** It is written into
     the line's own account, which every report already prints whole.
   - **Screen:** the line's drawer and the Hand over grid. **Paper:** the
     client report's hand-over account and the handover page (item 5).
5. **A handover page — the line signed over** (a new document, yours to
   say yes to). One A4 page per job, or per machine when machines go one at a
   time. It would say:
   - each machine: its tests passed against what each had to show, and its
     hand-over list with dates;
   - what is still open, with an owner and a date;
   - the sign-off: who signed, and when, or lines to sign when printed
     (handed over by, taken over by, safety).
   It is the record a team inside the factory keeps that the line was
   handed over correctly.

   It is read off the same records as the client report, so the two cannot
   disagree. It would be printed from Hand over and Reports, and checked by
   the report stress test like every other report.
6. **The small words** above, fixed.

## The second improvement, to build alongside: Needs you buttons on the gates

STAGEGATE.md flagged item 4. Install, Set up and Hand over have no button
on their Needs you rows, where Commission has one. Rowland, 9 October:
implement it with the handover. The safe version adds no new behaviour. It
puts each stage's own drawer buttons on its Needs you row, in Commission's
exact markup and place (`nd-acts`, a small button at the row's right), for
`can.edit` only, so a client sees none:

- **A late stage → "Done today".** The drawer's own Done today, the same
  write. On a sign-off line it keeps what was still open, as item 4
  says.
- **A stage that hit a problem → "Plan a fix".** The drawer's own "Plan a
  fix for this stage", the same form.
- **A part said to have failed → no button,** as now. A part is re-done by
  saying its next status on its own line, which opens with the stage.

On paper nothing changes: Needs you is the screen's to-do list, and the
reports already list what is late and what is open.
