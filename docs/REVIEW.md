# What is built, and what is actually missing

*2 October 2026, after the lean plan's ten slices and the line-study access
fix. Judged against CLAUDE.md's own contract: see, understand, commit, prove,
show; start a change from the situation; a measured before and after on every
change; one view above all changes. Every "built" line below was driven in a
browser this week; every "missing" line is backed by the code or the live
database, not by memory.*

## The contract, line by line

| The app must… | Built | Proved how |
|---|---|---|
| Start a change from the situation | Yes. Projects → "What are you trying to do?" picks the method; nobody has to know what a lever tree is. | Driven; smoke `projects?new=1` |
| Keep one view above all changes | Yes. Home lists every job on every method with where it is, what it owes, what is late; the Verdict card says it in a sentence. | Driven, laptop and phone |
| Give every change a measured before and after | 3P and lever tree: measures, periods, targets, readings, per line, with "Did it work?" proof on a closed action. Stage gate: the agreed rate proved or not in Testing. | Seeded readings; the proof card |
| See | Stopwatch and Pareto on a line's study; the filmed walk with frames and snags; the line standard; the plan (Gantt) with every date, move, walk snag and reminder on one lane. | Driven |
| Understand | Pareto ranked by cost; line balance (where the line is limited); the lever tree; the why-chain on a Case. | Driven |
| Commit | One action list per project with People/Plant/Process, owner, due date; the board; materials and programs with dates and why they moved. | Driven |
| Prove | Tests against what was agreed; fixes as tests; evidence pinned to a fix; wins with a measured claim. | Driven |
| Show | Client report per method (stage gate, 3P per project and per line, tree sheet), the day, the trial card, the step card, the line standard, evidence cards, the one-page line report, the spreadsheet — one Reports door, every button says PDF. | Every PDF opened this week |

## The three methods

| | Stage gate | 3P | Lever tree |
|---|---|---|---|
| Front page says where the job is | Yes — journey strip per machine, gates, late in red | Yes — lines at target, actions open and late | Yes — same as 3P plus the tree |
| The working lists | Install · Set up · Commission · Hand over · Fixes · Materials · Programs · Notes · Evidence | Board · Lines · Numbers · Wins · Evidence · Materials | the 3P set plus Tree and Pareto |
| The report | New stage-gate client report; the day; trial and step cards; line standard | Client report, per project and per line | Client report with the tree sheet |
| Measured before and after | Agreed rate proved in Testing | Measures and readings per line | Measures and readings per line |
| Tools inside it | Filmed walk, line standard, tests | Line study (stopwatch, Pareto, walk), line balance | Line study, Pareto |

## The plumbing

| | State |
|---|---|
| Offline first, every record on the device | Yes — 26 stores, everything works with the network off (the smoke test blocks Supabase outright) |
| Sync | 21 record kinds sync, last-write-wins by the row's own clock; the push chooses rows by a change flag, never by comparing clocks across devices |
| Who can see what | Row security on every table, no open policy; a project's members see its lines, their studies, their walks and their media (fixed today) |
| Sign-in | Invite-only; the super admin adds an email, the person signs in |
| The gate | tsc, lint ceiling 69 (only comes down), 936 unit tests, build, smoke of 66 screens with seeded data |
| Database changes | From the session, through the migration tool, read back before reported |

## What is actually missing

Ranked by how much it hurts someone on the floor. The first two are defects
in the sense CLAUDE.md uses the word: a thing that silently does not do what
the screen implies it does.

*Update, 2 October, evening: items 1 to 5 are built and live. 1 — the walk
link is on the project row (`PROJECT_WALK.sql`). 2 — the account row counts
and names refused rows. 3 — `scripts/check-live-schema.mjs` runs in the gate,
the build and CI. 4 — `supabase/functions/remind`, called every fifteen
minutes by pg_cron, pushes to every device that said yes
(`PUSH_REMINDERS.sql`, `cloud/push.ts`, `public/push-sw.js`). 5 — the loser
of a merge is told by name in the account sheet. Items 6 to 8 stand.*

*Update, 2 October, night: 7 and 8 are live too. 7 — a lever's colour can
follow a number: bind a box to a measure on a line and its colour is the
latest reading against the period's target, with the figure and the state in
words on the box, the report sheet and the PDF; the hand-typed colour stays
for every unbound box. 8 — the owner's add is the invite
(`OWNER_INVITES.sql`): a project or line-study owner adding an email puts it
on the front door and the people list in one call, and the screen says the
true thing. 6 — checked against the live database at the end of the day:
nothing has synced from a device since the fixes, so the first open with a
signal will push everything up; re-check then. Also added: the plan says
whether it is current ("Up to date as of 09:12", amber after a day), on the
screen and the PDF.*

1. **A stage-gate job's filmed walk lives on one device.** The link from a
   project to its walk workspace is kept in the device's `meta` store
   (`db/pace.ts`, `walkKey`) and never syncs. The walk's frames and snags sync
   fine, but the laptop cannot find which workspace is this project's walk,
   so it makes a second, empty one. The Evidence tab, the Install screen's
   frames, the client report's walk section and the Reports door all read
   that link. A 3P line's study does not have this problem — its link is on
   the line row, which syncs. **Fix:** write the walk's id into
   `projects.workspaceIds` (already a synced column, already covered by
   today's access rule) and read it back from there before falling back to
   `meta`. Small, and it connects to a record that already exists.

2. **Nothing on screen says a push was rejected.** For nine days every
   workspace write was refused by the database and the app showed nothing
   — the same silent failure class as schema drift, which has now bitten
   five times. The sync keeps a per-row changed flag; a count of "rows on
   this device the cloud has refused" in the account sheet, with the
   table's name, would have surfaced it in an hour. **Fix:** record the
   last error per kind in the sync loop and draw it where "Synced 2 min
   ago" is drawn now.

3. **Live schema drift is only caught by hand.** The schema test compares
   the mapper with the SQL files; nothing compares either with the live
   database, which is where the drift actually bites. **Fix:** a script in
   the gate that fetches PostgREST's OpenAPI document with the anon key and
   checks every mapper column is in it. Cheap, needs no secret beyond what
   the build already has.

4. **Reminders only ring while the app is open.** `ui/Reminders.tsx` checks
   every fifteen minutes and uses the browser's Notification API. A phone
   with the app closed hears nothing. Real push needs a server (an edge
   function and web push subscriptions) — a day's work, and a yes from
   you, because it is the first server-side code in the app.

5. **Two people editing one row offline: one of them loses, silently.**
   Last-write-wins by the row's clock. It is the right default for this
   team's size, but the loser is never told. A cheap improvement: when a
   pull overwrites a row this device changed, say so once ("Rob's edit to
   *Second operator on the infeed* replaced yours").

6. **Studies made between 24 September and today stayed on the device that
   made them.** They should push on that device's next sync now the policy
   is back. Worth checking next week: the live `workspaces` count was 11
   today, newest 21 September.

7. **The lever tree's RAG is by hand.** A condition can bind to board
   actions (`treeBind`) and takes their state, but the tree's own
   red/amber/green is typed. That is a choice, not a defect — the tree is
   drawn by people — and it stays until a measure can be bound to a lever
   the way an action can.

8. **Invites are the super admin's job only.** A line owner cannot invite
   a colleague who is not yet in the app; the message says to ask the
   administrator. Fine while that is you; a limit the moment it is not.

Nothing in this list is a new noun. Items 1, 2 and 3 are the ones to do
next, in that order: they are small, they close silent failures, and they
touch records that already exist.

## What was retired this week, for the record

Guide, Portfolio, the deck with no project, the Workspaces list, the line
study's bottom bar and "More" menu, Log, Present, Trend, Settings and People
as pages (each folded into the page that owned it), eleven ways of saying
"PDF", and the Export button on the Projects page. Every old link lands where
the page went. Nothing was removed without its replacement being named.
