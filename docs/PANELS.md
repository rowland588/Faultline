# A stage's panel: one for all, a library, or between — audit

Rowland, 10 October: "On the stage gate, we can input any name, yes? So
every time you open a stage, you always have the same sort of template ...
For example, documents signed off and drawings delivered. It really should
be just a yes or a no. At the moment it's done or you hit a problem, and
then you have to go through the problem statement rather than just saying,
well, no — commentary, it's late, whatever it may be — or even upload the
documents: yes, here they are ... What if we had an expansive default, and
the user interfaces were built more specifically for each of the defaults
rather than a generic? But the generic might be okay." Findings first;
nothing is changed until he has seen them.

Walked 10 October in Chromium, on a laptop (1360) and a phone (390), on the
ordinary Stage Gate job (Line 2: a wrapper, a checkweigher and a coder). The
code walked was `main` that morning. Flow slice 1, which shortens the problem
form, went live later the same day; where it changes a
count, that is said. Each stage was opened and its real job done through the
real controls, with every tap and every character counted. Then the record,
the square, the day, the front page and the client and handover reports
were read for what it left behind:
- Positioned and levelled, done with a reading;
- Air and power connected, not yet;
- Electrically complete, not yet, with a new day;
- Drawings delivered, added as a stage of its own, with two PDFs;
- Documents signed off, at Install and at Hand over;
- Safety sign-off (PUWER) and Client signed off;
- a sign-off and the programs stage, each renamed;
- the performance run, one product's numbers;
- Weight accuracy, a test with a "passes if".

## The answer, in short

**Between, and close to the generic.** Keep the one panel. Give every stage
the "no" it is missing: **Not yet**, beside Done today. Then give each stage
an **answer**, a small fixed set of ways "yes" is said: done, paperwork,
sign-off, a reading, and the two the app already has (programs and the run).
The stage's name suggests the answer from a short word list. The owner
confirms or changes it once, on the stage list. It is a property of the
stage, not a new list. **Not** a large library of named stages, each with a
panel of its own.

## What the floor says, and what the panel offers

| The stage | What the floor says | What the panel offers | Taps | What reaches paper |
|---|---|---|---|---|
| Positioned and levelled | yes, level to 0.5 mm | Done today; the reading only as words, in Edit | 4 + 45 characters | the words, in the client report |
| Air and power connected | not yet, the air main goes in Friday | Hit a problem | 3 + 61 | "a problem, no time lost" |
| Electrically complete | not yet, Wednesday | Edit → the finish → "Why has it moved?" | 4 + a date + 54 | "late, finish moved 4 days" |
| Drawings delivered | yes, here they are (2 PDFs) | Attach a PDF (12th of 15 controls), then Done today | 3 + picking | "done"; the files on no report |
| Documents signed off, at Install | signed, and by whom | Done today | 2 | a plain "done"; nobody signed |
| Safety sign-off (PUWER) | signed by K. Ahmed | Done today | 2 | signed by "The site" |
| Performance run | the numbers | five boxes a product | 5 + 10 | the run, judged by itself |
| Weight accuracy | passed, mean 401.3 g | Passed; the reading only as words | 1, then 3 + 44 | the words |

On the phone the taps are the same. Attach a PDF sits 876 px down a sheet
760 px tall, below the first screen. The problem form is 828 px tall in that
same sheet.

## What flows well, and must stay

- **One panel for every record.** A stage, a test and a fix open to the same
  five lines (what, planned → done, who, done means, changed). Anything
  tailored goes inside this panel, never in a second one.
- **Done today is two taps from the grid**, and a column does it for every
  machine at once.
- **The performance run** is a panel built for its job. You type five
  numbers per product, and the app says passed, or short by how much. It is
  the model for anything tailored.
- **A stage's parts.** Each is a line with a tick, a who, a day and a status
  with what was seen. A stage that holds many of something already has its
  list (MANUFACTURING IS MANY).
- **"Why has it moved?"** keeps the reason for a moved finish with the plan.
- **A sign-off writes down what it accepted**, for example "Signed off 10
  Oct with 12 still open — …".

## Where it does not

**1. Every stage gets the same 15 controls, whatever its name.**
Positioned and levelled, Drawings delivered and Safety sign-off (PUWER)
open the same panel, word for word apart from the title and the dates. A
stage not yet done runs to 113 words. It offers two answers: Done today
and Hit a problem. Everything else is in Edit, or at the foot.

**2. There is no "no" that is not a problem.**
- **"Hit a problem" marks the stage failed.** Air and power, which was only
  waiting on the air main, now reads:
  - "Problem" on its square;
  - "1 problem, no time lost: Domino coder — Air and power connected" in
    the front page's verdict;
  - a line under the problems on the client report.

  The form has 19 controls and 69 words. Flow slice 1 folds it to "what
  happened" and Save, but the stage is still filed as a problem.
- **The right answer exists, but inside Edit.** "Not yet, a new day, and
  why" is: Edit, change the finish, Save, and then "Why has it moved?"
  asks. That is four taps, and nobody looking at "Is it done?" would find
  it. The reason is kept as something found, so the Fixes page lists it
  with the open problems (read from the code).
- **"Didn't happen"** is one of a stage's four words, and no button offers
  it.

**3. "Yes, here they are" leaves the files behind.** Attach a PDF is the
12th of the 15 controls, under the pictures. The two drawings attached to
"Drawings delivered" reach one place, the workbook export, as a count. The
record's card counts them but its PDF does not print the count. They do not
reach:
- the square;
- the day, which says "Drawings delivered — done (Domino UK).";
- the client report, where a done stage with no words gets no line;
- the handover report, which prints a line's title, state, who and words.

Nothing on paper can say the drawings came, or which ones.

**4. A reading is just words.** "Level to 0.5 mm" and "mean 401.3 g" go in
Edit's "What was done", for 3 more taps and 44 characters. Nothing checks
them against the limit. Only the run compares a number with what was agreed.

**5. The app already changes the panel by name in three places, and each
one breaks quietly.**

| What changes | How it decides | What it does |
|---|---|---|
| Sign-off | a Hand over stage with "sign" in its name (`isSignOff`) | asks "Who signed it off?" when the line has no name; writes what it accepted |
| Programs | a Set up stage with "program" in its name (`isProgramsStage`) | its parts become "Programs on this machine", tied to the Programs page and report |
| The run | a test named speed, rate, performance, ppm, throughput or output, or one with numbers kept (`isRunTest`) | the run block |

Besides these, `SITE_WORK` starts four of the usual names with the site.
What breaks:
- **"Who signed it off?" is never asked on the usual lines.** Since 9
  October every new line starts with a name: the machine's supplier, or
  "The site". The question only comes when the line has no name, which now
  means a machine with no supplier written on it.
  - **Safety sign-off (PUWER):** one tap on Done today, and no question.
    The handover report says "The site" signed it.
  - **Documents signed off at Hand over** was signed as "Ishida Europe",
    the supplier.
  - The question came only after the name was cleared in Edit, which takes
    three more taps. It was the same on the phone.
  - "Done today on all left", on a sign-off's column, signs off every
    machine without a name (read from the code).
- **The gate decides, not the words.** "Documents signed off" at Install
  is a plain stage, with no who and no record of what it accepted.
- **A rename loses it.**
  - "Client signed off" renamed "Production acceptance" asks nothing and
    writes nothing.
  - "Programs loaded" renamed "PLC software downloaded": the four program
    lines fall back to "Part of the plan". The Programs page then tells the
    wrapper "No programs stage on this machine yet. Add Programs loaded to
    it".
- **Some names match by accident** (read from the code). "Signal tower
  checked" or "Signage fitted" at Hand over would be sign-offs. "Training
  programme agreed" at Set up would be the programs stage. A test called
  "Output conveyor interlock proven" would get the run block.

Only the run survives all of this: it also looks at what the record holds.

**6. The record already holds every answer.** It has files (`docs`),
pictures (`media`), who (`withWhom`), words (`result`), numbers (`run`,
`runs`), dated lines owed (parts), what done means (`passesIf`), and a moved
finish with its reason. Nothing is missing in what can be stored. What is
missing is a panel that asks for the right answer first.

**7. A big list has been tried.** `lib/testing` records that the model
replaced "a 28-item library to pick what a machine must prove", among other
things, because "every one of those was a concept the job does not have".

## How others do it

- **Procore inspections:** every item on a template has a response type —
  pass / fail / N/A, a number, a date, text, or a set of answers of your
  own ([release notes](https://support.procore.com/tc/procore/Legacy/Release_Documentation_Archives/2019/Inspections%3A_New_Inspections_Response_Options)).
- **Fieldwire checklists:** every line is ticked, crossed or N/A, with who
  ticked it and when ([help](https://help.fieldwire.com/hc/en-us/articles/360000095686)).
- **SafetyCulture:** the basic question is Yes / No / N/A, and "No" opens a
  note and pictures, not an incident form
  ([help](https://help.safetyculture.com/en-US/000093)).
- **Commissioning sheets** (pre-functional checklists, FAT and SAT): each
  line has what was expected, what was found, initials and a date, with a
  comment when the answer is no.

They share one pattern. The line is named freely; its answer comes from a
small fixed set, chosen once on the template; a "no" asks for a note, not a
failure report. None builds a screen per line.

**It fits here without a fifth noun.** The answer is a property of a stage
on the usual list, beside "with the supplier / with the site", kept where
those already are: `gate_stages` on the project, which the database already
keeps for the owner. No database change, no new table. **The cost:** each
answer drawn everywhere a stage shows (listed below), one rule in place of
three regular expressions, and, for a reading, a limit agreed first.

## Proposed, for your decision — nothing built yet

Each item hangs off a record that is already there and says where it shows,
on screen and on paper.

**1. Not yet, on every stage.** It goes beside Done today, before Hit a
problem. It asks three things:
- what we are waiting for, in one line, with four quick picks: the
  supplier, the site, parts, not started;
- whose it is, filled in with who the stage is with;
- by when, if anyone knows.

It is kept as one of **the stage's parts**: a line with a who and a day.
That is the record "what's next, agreed" was made for (no new noun). If the
day is after the stage's finish, it offers to move the finish, with this
line as the reason (the move "Why has it moved?" already keeps).

The stage is not marked failed:
- its own colour stays as it was (indigo booked, grey no day, red once its
  day has gone);
- the line says "waiting — Fri" under it in amber, the colour for waiting
  on somebody;
- when the stage is done, it asks once whether to tick the line too.

**Shows on** everything that already reads a stage's dated parts: the
square and its phone card as a branch, the plan as a nested row, Needs you,
the control room's who owes what, the day, and the client and status
reports. Hit a problem stays for what went wrong (hours lost, a flag, a fix).

**2. A sign-off asks who, every time.** The box offers the names on the job
and starts empty, so the supplier's name is never taken as the signer's. A
picture of the signed sheet is one tap. What it accepted is still written
by itself. A sign-off's column, "Done today on all left", asks the name
once for every machine. This fixes the walk's defect. **Shows on** the
drawer's Who line
("signed by"), the phone card, the day, and the handover report's line.

**3. Files are part of the answer.** Once a stage has files, they are
listed in the drawer's five lines, under Who, each one opening. **Shows on**
the square ("2 files", a branch like the parts), the day ("— 2 files: GA
drawings rev C, Electrical schematics"), the client report's account of the
stage, and the handover report, where each file is printed under its line.

**4. Every stage has an answer.** These are the answers:

| Answer | What the panel asks | What "no" looks like | The square | On paper |
|---|---|---|---|---|
| **Done** (the default) | Done today | Not yet: what, whose, by when | its day; "waiting — Fri" under it | done on its day; the waiting line with who and when |
| **Paperwork** | **Here they are**: pick the files (one or several), and it is done in the same go. "Done, no file" still works and says so | Not here yet: who is sending it, by when | its day · "2 files" | each file by name |
| **Sign-off** | **Signed**: who signed it (always asked), and a picture of the sheet if there is one | Not signing yet: what they are waiting for, whose, by when | its day · "signed"; the name on a phone | "signed by K. Ahmed, 10 Oct — accepted with 12 open: …" |
| **Reading** | **What did it read?** A number against the limit agreed. Inside the limit, it is done | outside the limit: Hit a problem opens with "1.4 mm, limit 1 mm" written; not taken yet: Not yet | its day · "0.5 mm", red if outside | "read 0.5 mm, limit 1 mm" |
| **Programs** (built) | the machine's programs, each passed, at baseline or failed, with what was seen | a program failed, with what was seen | as now | as now: the Programs section |
| **Run** (built) | each product's numbers; the verdict is worked out | a product short, and by how much | as now | as now |

Several of anything are the stage's parts, on every answer. Expected
documents are lines, each ticked by attaching its file. Readings at several
points are lines, each with its own number. A test keeps its Passed,
Didn't pass and Didn't run; the answer only changes what goes with them.

**The starting map**, from the usual lists:
- **Install:** all six are Done. Positioned and levelled becomes a Reading
  once the owner writes a limit such as "level to 1 mm".
- **Set up:** Programs loaded is Programs; the other four are Done.
- **Commission:** the two runs are Run; Changeover in the agreed time is a
  Reading in minutes; the rest are tests with their verdict.
- **Hand over:** Manuals and drawings handed over and Spares list agreed
  are Paperwork. Operators and engineers trained is Done, with the people
  as parts when wanted. Safety sign-off (PUWER) and Client signed off are
  Sign-off.

**How a typed name gets its answer**, in this order:
1. **What the owner chose for that name at that gate on this job.** It is
   kept in `gate_stages`, keyed the way "who it is usually with" is, so it
   covers a stage of its own as well as one on the list.
2. **What the record already holds.** Numbers kept make it a Run, and
   program lines make it Programs, so a rename on one machine never loses
   what is on it.
3. **A short word list, in whole words, at any gate:**
   - Sign-off: sign, signed, sign-off, accept, acceptance, approval;
   - Paperwork: drawing, manual, document, docs, certificate, declaration,
     datasheet, schematic, O&M, pack, report;
   - Programs: program, only at Set up;
   - Run: today's rate words, only on tests.

   About twenty words in all. Whole words means "Signal tower" and
   "Training programme" no longer match. A Reading is never guessed,
   because it needs a limit agreed.
4. **Otherwise, Done.**

**Who may change it.** An answer is part of what was agreed, so changing it
is the owner's (`can.agree`). The owner changes it on the stage list, beside
"with the supplier / with the site", or in a stage's Edit for a stage of its
own. A reading's limit is agreed like a "passes if": the owner's, and the
team may write it once while it is empty. The team answers (`can.edit`). A
client reads.

**Existing and renamed stages.** No record is rewritten. Every existing
stage gets its answer from the map and the word list the day this lands, so
the usual lines behave as today, except that a sign-off now asks who. A
rename made on the stage list carries its answer with it, as "who it is
with" already does. A rename made on one machine takes the answer of its new
name, and keeps anything already on it.

**5. Programs and the run become answers**, chosen the same way. The three
regular expressions go, and the word list takes their place, so a rename or
an accidental word changes nothing.

**6. The Reading answer last, and only if you want it.** It is the one that
asks the owner for something new (a limit). It needs no new storage: each
reading is one of the stage's parts, marked passed or failed, with the
number as what was seen; the limit sits with the answer in `gate_stages`
and shows as the stage's "Done means". Until then, a reading stays as words
in the account, as now.

### The walk's examples, after

| The job | Now | After |
|---|---|---|
| Drawings delivered, with 2 PDFs | 3 taps; files on no report | 2 taps (the stage, Here they are, then pick); each file by name on the day, client and handover reports |
| Air and power not yet, or drawings not here yet | 3 taps + typing, filed as a problem; "1 problem" on the front page | 3 taps + typing (the stage, Not yet, Save); "waiting — Ilapak UK, Fri" in amber, owed on Needs you, not a problem |
| Electrically complete, not yet, Wednesday | 4 taps through Edit | 4 taps, from Not yet; the move and its reason kept as now |
| Safety sign-off (PUWER) | 2 taps, signed by "The site" | 3 taps + the name; "signed by K. Ahmed" on the handover report |
| Documents signed off, at Install | 2 taps, a plain "done" | a sign-off by its name: 3 taps + the name |
| Positioned and levelled, with a limit agreed | 4 taps + 45 characters, as words | 2 taps + 3 characters; "0.5 mm, limit 1 mm" on the square and the paper |
| Programs loaded, renamed | the program lines lost from the Programs page | kept |
| Performance run | 5 boxes, judged by itself | unchanged |

### Slices, each live on its own

1. **Not yet**, a sign-off that always asks who, and files said on screen
   and paper. No new storage. The biggest change, and it fixes the defect
   the walk found.
2. **The answer** on the stage list, the word list, Paperwork and Sign-off,
   and the squares' marks. Programs and the run join it, and the regular
   expressions go. Kept in `gate_stages`, so no database change.
3. **Reading**, if wanted.

## What I recommend against, and why

- **A large library of named stages, each with its own panel.**
  - The floor names stages its own way ("Drawings delivered", "GA drawings
    in", "docs pack received"), so any list misses, and a rename falls off
    it, as two of today's three rules already do.
  - Each panel would have to be drawn on the square, the phone card, the
    plan, Needs you, the day and three reports: hundreds of panels times
    eight places.
  - It is the fifth concept the rules warn about, and the app has already
    deleted a library like it once.
  - What differs between stages is not the panel. It is what "yes"
    carries and what "no" says, and that is a handful of things.
- **A form builder** (custom boxes per stage). It turns the owner into a
  form designer, and every box nobody fills in is a gimmick.
- **"Waiting" as a fifth outcome.** A dated line owed by someone already
  exists, and is already coloured, counted and printed.
- **Blocking Done until a file or a name is given.** It is an internal
  tool: nothing is blocked, and the status is shown ("done, no file kept",
  in grey).

## Not proved here

- **Files reaching another device.** The walk attached them on one device
  with the cloud blocked.
- **The live database's rules for `gate_stages`.** They were read from
  `supabase/ACCESS_LEVELS.sql`, not from the database.
- **iOS Safari's file picker.**

## Decided and built — slice 1, 10 October

Rowland: "do panel slice 1 next, after flow slice 2."

1. **Not yet, on every stage.**
   - It sits beside Done today, before Hit a problem. It asks what we are
     waiting for (four quick answers: the supplier by name, the site,
     parts, not started), whose (starting as who the stage is with), and
     by when, if anyone knows.
   - It is kept as one of the stage's parts, a line owed with a who and a
     day, so it shows wherever parts already show: the square ("1 part")
     and phone card, the plan, Needs you, who owes what, the client
     report.
   - The reason is kept on the day it was said, followed as that line
     (`becameItemId`, the way a problem is followed as its fix).
     - The stage's history labels it **Waiting**, in amber.
     - The day says "Dry run — not yet: Waiting on the site (Ishida
       Europe), by Fri, 23 Oct".
     - Fixes no longer lists it as a problem with no fix.
   - A day after the stage's finish offers to move the finish, ticked,
     with this as the reason. The plan then shows the slip, and the stage
     reads late by the rule of 7 October.
   - **The stage is not marked failed.** Hit a problem stays for what went
     wrong (`ui/NotYet`).
2. **A sign-off asks who, every time.**
   - Done today on "Safety sign-off (PUWER)" or "Client signed off" asks
     "Who signed it off?". The box starts empty and offers the names on the
     job.
   - A sign-off's column asks once for every machine, and its button waits
     for the name.
   - Needs you opens a sign-off rather than ticking it.
   - The drawer then says **Signed by K. Ahmed**, and so does the handover
     report ("signed by K. Ahmed"). What it accepted is still written by
     itself. This fixes the defect the walk found.
3. **Files are part of the answer.** Once a stage has files:
   - in the drawer they sit under its five facts, each one opening, not at
     the foot;
   - its square and phone card say "2 files" beside its parts;
   - the day prints them by name under the line;
   - the client report's account of the stage prints them on screen and
     paper, and a done stage with files and no words now gets an account;
   - the handover report prints them under each test and hand-over line.

   Words: `lib/testing` `filesSaid`.

Proved in Chromium, laptop and phone:
- Not yet on a stage, moving its finish, and nowhere marked failed;
- a sign-off's column waiting for a name;
- the drawer asking with an empty box, and "Signed by K. Ahmed" on the
  handover report;
- a PDF attached, then on the square, the day and the handover report's
  own PDF.

`scripts/report-stress.mjs` reconciles every file name on the client and
handover reports. The seeds now carry files: nine long names on one
machine, and random ones on the fuzz jobs. Unit tests:
`src/lib/__tests__/panels.test.ts`.

## Decided and built — slice 2, 10 October

Rowland: "do panel slice 2 next."

4. **Every stage has an answer.** It is one of Done, Paperwork, Sign-off,
   Programs (Set up only) or, on a test, Run (`lib/install` `answerOf`).
   One rule decides, in this order:
   1. what the owner chose for that name at that gate on this job;
   2. what the record already holds: numbers kept make a run, and
      programs with a status said make the programs stage;
   3. whole words of the name;
   4. otherwise Done.
   - **Where it is chosen.** On the stage list, beside "with the supplier /
     with the site", one chip each. For a machine's own stage, the owner
     chooses in its Edit. It is the owner's (`can.agree`); the team and a
     client see the panel it gives, not the control.
   - **How it is kept.** In `gate_stages` `usualAnswer`, keyed like
     `usualWith`. Only a choice that differs from what the name gives is
     kept. No database change.
   - **The usual lists' starting answers.** The two sign-offs are
     Sign-off; "Manuals and drawings handed over" and "Spares list agreed"
     are Paperwork; "Programs loaded" is Programs; the runs are Run; the
     rest are Done.
   - **What the drawer opens to.**
     - Paperwork: **Here they are** (pick the files, kept and done in one
       go) or **Done, no file**.
     - Sign-off: **Signed** (who signed, always asked).
     - The rest: Done today.
     - Not yet and Hit a problem stay on all of them.
   - **What the square says.** A sign-off done says "signed" (and, on a
     phone, by whom). A paperwork stage done with nothing attached says
     "no file". The handover report prints "No file kept" under it.
   - **Needs you opens a sign-off or a paperwork stage**, rather than
     ticking it.
5. **The three name rules ask the one rule.** `isSignOff`,
   `isProgramsStage` and `isRunTest` take the job's answer wherever the job
   is known: the drawer, the grids, Needs you, the Programs page, the
   client report and the handover report. Elsewhere they read whole words,
   so:
   - "Signal tower checked" is no longer a sign-off, and "Training
     programme agreed" is not the programs stage;
   - "Documents signed off" at Install is a sign-off, since the words
     decide at any gate, not only at Hand over;
   - "Programs loaded" renamed "PLC software downloaded" keeps its
     programs on the Programs page, because programs with a status said on
     it hold it;
   - numbers kept on a test always keep it a run.

Proved in Chromium, laptop and phone:
- the Hand over list's starting answers;
- the owner making "Operators and engineers trained" a sign-off, with only
  that choice kept, and its stage then opening to Signed;
- a machine's own stage made Paperwork in its Edit, then "Here they are"
  keeping the file and marking it done in one go;
- "no file" on a paperwork square;
- no answer control for the team.

Unit tests: the answer rule in `src/lib/__tests__/panels.test.ts`. The one
expectation that held the old rule (a sign-off only at Hand over) is
updated in `handover.test.ts`.

Slice 3, **Reading** (a number against an agreed limit), waits for your
word.
