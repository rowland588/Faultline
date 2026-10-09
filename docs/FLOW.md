# Does the app flow? — a simplicity audit

Rowland, 9 October: "Next audit is simplicity — of the actual flow,
process, connections. Does the app flow, is it easy to use." Findings first;
nothing is changed until he has seen them.

Walked 9 October in Chromium, laptop (1360) and phone (390), on the ordinary
Stage Gate job (Line 2: a wrapper, a checkweigher and a coder, with tests,
fixes, programs, problems and a day's plan). The everyday jobs were done
through their real controls, each tap counted with where it went. Each main
screen was measured (controls, words, screens tall). One stage and one fix
were followed to everywhere they appear, to see whether tapping them opens
them. Back was pressed after every record opened.

## The everyday jobs, tap by tap

| The job | Laptop | Phone | |
|---|---|---|---|
| What needs me, and act on it — from the control room's "This week" | **1** | **1** | Opens the record with exactly its actions (Passed · Didn't pass · Didn't run · …) |
| …the same through the job's front page and Needs you | 2 | 3 | |
| Mark a stage done, at the machine | 4 | 5 | Job → Install → the stage → Done today (phone: the job's row, Open the job, Install, the stage, Done today) |
| A stage hit a problem, written up | 4 + typing | 4 + typing | Only "what happened" is needed — the form does not say so (below) |
| A fix done | 4 | 5 | Job → Fixes → the fix → Fixed |
| A test passed | 4 | 6 | On the phone Commission is behind More |
| The status report, as a PDF | 3 | 4 | |
| Everything about one machine | — | — | **There is no such place** (below) |

**What flows well, and must stay:**
- **Every record opens in the one drawer** with the actions that fit it.
- **Back always returns to the screen behind** (4 of 4 checked).
- **The rail keeps the job** when you step out to an app-wide tool.
- **The four gates have one shape:** Needs you, then machine by machine.
- **From the control room, the first late thing is one tap away.**

## Where it does not flow

**1. One door, broken in three places.** A record should open the same way
wherever it shows. Following the weigher's "Sensors and controls checked"
and the regulator fix:

| Where it shows | The stage | The fix |
|---|---|---|
| Control room | opens it | (beyond the first 8 of the week) |
| Front page | opens it | opens it |
| Install / Fixes | opens it | opens it |
| **The plan** | **goes to the Install screen**; you find it again there | not shown |
| **The day** | **listed 3 times, none opens it** | **listed 3 times, none opens it** |
| **Status report screen** | **a late line under "why" does not open** | opens it |

**2. There is no place for a machine.** On the floor the unit is the
machine ("what is left on the weigher?"). Its life is spread over Install,
Set up, Programs, Commission, Hand over, Fixes and the plan. Tapping its
name does different things on each screen:
- **Front page, Commission, Programs:** nothing.
- **Install:** opens a panel with its install steps only.
- **The plan:** goes to Install.

The handover report already tells each machine's whole story on paper; the
screen never does.

**3. The way around is wide.**
- **The laptop rail has 19 entries on a Stage Gate job:**
  - 4 app-wide tools: Control room, Snags, Line standard, Line balance;
  - the job;
  - its 5 gates;
  - 4 work pages: Fixes, Materials, The plan, The day;
  - 2 lines (Line 7, Line 8 — line pages, from the line tools);
  - Reports, Notes and Details.
- **The top bar has a search box that does nothing** ("Search — comes in a
  later update"). It is a control that is not true yet.
- **The phone's bar is Control room · This job · Install · Fixes · More.**
  Commission, the heart of the method, is under More, and so are Set up and
  Hand over, wherever the job actually is.
- **On the phone, getting into a job depends on last time.** You tap the
  job's row on the control room, then "Open the job". The row remembers
  whether it was left open, so the same tap sometimes opens it and
  sometimes closes it.

**4. The day is the heaviest screen.** It runs to 805 words, 47 controls,
3.1 laptop screens and 4.6 on a phone. It is three things at once:
- today's plan (the huddle), with Edit and Delete on every row;
- what is due today;
- the day's story: every problem found, every fix booked, the gates' bars,
  the critical and the risk.

It also opens with a long paragraph that repeats the front page's verdict.
The rest of the screens weigh 1 to 1.6 laptop screens.

| Screen | Controls | Words | Laptop screens | Phone screens |
|---|---|---|---|---|
| Control room | 38 | 459 | 2.1 | 2.9 |
| Front page | 25 | 383 | 1.4 | 2.1 |
| Install / Set up / Hand over | 22–24 | 142–176 | 1.0 | 1.5–1.6 |
| Programs | 30 | 243 | 1.3 | 2.0 |
| Commission | 43 | 288 | 1.3 | 2.4 |
| Fixes | 15 | 315 | 1.4 | 2.2 |
| The plan | 20 | 324 | 1.0 | 1.3 |
| **The day** | **47** | **805** | **3.1** | **4.6** |
| Status report screen | 12 | 432 | 2.0 | 2.1 |

**5. The problem form looks long at the machine.** "Hit a problem" opens
six sections before Save:
- what the problem is (five categories);
- what happened;
- a picture;
- a flag (high risk or critical);
- what it cost (hours, or a new finish);
- book it in as a fix.

Only "what happened" is needed; Save works with that alone. But nothing
says so, and on a phone it reads as a form to fill in.

**6. Small things:**
- **Fix rows are not announced as buttons.** They are buttons marked as
  list items, so a keyboard or screen reader does not hear them as
  something to press.
- **Repeated routes, kept by your 9 October decision:** "The plan ›" is on
  the front page twice; "Read the day" is on every gate; and the day is in
  the rail and on the front page.

## Proposed, for your decision — nothing built yet

Each item hangs off what is already there, and says where it shows.

1. **One door, everywhere.** A stage or test on the plan, every line on the
   day and every line under "why" on the status report screen opens its
   record in the drawer, as everywhere else. Back returns to where you were.
2. **A machine is a place.** Tapping a machine's name, anywhere it shows,
   opens one machine panel. It is the machine's own record (no new noun),
   in the same drawer:
   - its gates in order, with every stage and test (state, day, who);
   - its open fixes and problems, and its programs;
   - its arrival dates;
   - each line opening its record.

   It is the screen's version of what the handover report already prints
   per machine.
3. **A shorter way around.**
   - **The rail leads with the job:** its front page, its five gates, then
     Fixes, Materials, the plan and the day. Snags, line standard, line
     balance and lines go under one "Tools" group at the foot. Reports,
     Notes and Details stay.
   - **The dead search box goes** until search exists.
   - **The phone's bar carries the gate the job is at,** so the work is one
     tap: Control room · This job · the gate it is at · Fixes · More.
4. **Into a job in one tap on the phone.** On a phone, a job's row on the
   control room opens the job. The in-place opening stays on the laptop,
   where there is room for it.
5. **The day, in the order it is used.**
   - **The day's plan first**, with tools only on the row being worked on.
   - **Then what is due today.**
   - **Then the story, folded** under one line ("What happened today — 12
     things ›").
   - **The verdict as its one line**, not a paragraph.

   The PDF keeps all of it.
6. **The problem form: say it, save it.** "What happened" and Save come
   first. The category, picture, flag, cost and the fix fold under one line
   that opens when wanted. At the machine it is type, then Save; everything
   else is still a tap away.
7. **Small things:** fix rows announced as buttons. The repeated routes
   stay, unless you say otherwise.
