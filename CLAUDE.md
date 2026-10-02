# Faultline — how work gets delivered here

## What this is

**Faultline is a control room for change on production lines.** Decided with
Rowland, 1 October, and it is his own wording from the start — the Verdict
card's header quotes it: *"show the business a formal process, to show that I
am in control of the project."*

- **The unit is a change to a line.** New equipment, a line that has to
  perform better, a number that has to be hit. Many changes happen on a line
  at once, and the ops lead has to be in control of all of them and able to
  show it. That is the problem this solves, and it is the moat.
- **The three methods are three kinds of change**, not three apps (below).
- **Everything else is a tool used inside a change** to see, decide or prove
  — the stopwatch, the Pareto, the filmed walk, the line standard, the tests.
  A tool never becomes a method, and never sits beside a change.
- **The record is the project.** Do not add a "change" noun beside it.

What it must always do, in this order — see, understand, commit, prove, show:
start a change from the situation (not from a method picker); give every
change a measured before and after; and keep one view above all changes that
answers "am I in control?" across every line and job.

**Before building anything, say which change it belongs to, which record it
reads or writes, and where it shows up in the control-room view and the
report.** If it has no answer, it is a feature, not part of the control room.

## The three methods

Running projects on a factory floor, three ways. Rowland, 30 September:

> "I've built three individual project methods ... I want to be able to use
> this in multiple business scenarios, because my work is so diverse."

- **Stage gate** — new equipment taken through its gates (install stages,
  tests against what was agreed, fixes, what it waits on) to handover, with
  the OEM. Stored as `commissioning` on the project; never shown under that
  name — commissioning is one gate in the middle, not the method.
- **3P** — a line's improvement run week by week on the board, actions
  sorted People · Plant · Process. Kept entirely in the app: the actions are
  the project's next steps with a People / Plant / Process tag and a due date
  (`src/lib/actions.ts`). Rowland, 1 October: "There will be no Excel that
  needs to be uploaded ... this is about now fully using the app." Nothing in
  3P asks for a workbook.
- **Lever tree** — one outcome worked down to what has to be true for it.

They are separate methods, not one loop pretending to be cohesive; each is
defined once, the same way, in `src/lib/planModel.ts` (the question, when to
use it, how it is organised, rhythm, done, what it prints). A fourth method is
one more entry there. Tools (Pareto, the filmed walk, a line study) are
instruments a method uses, never methods of their own.

Rowland, 24 September:

> "We are close, but it still feels like a gimmick."

So every change is measured against one question before it is built: does it
help the people on the project agree what has to be done or proved, see what
is and what is not, and know who owes what by when — or is it a feature? A
screen that shows information without saying what it means for the project is
a gimmick, however well it is drawn. A report that lists records instead of
telling the story of the project is a gimmick. A field nobody is asked to fill
in is a gimmick. The test for any addition is the sentence it lets one side of
the project say to the other — the site to the OEM, the lead to the sponsor,
the team to the client — that they could not say before.

## Finished means live, not pushed

`main` is what Vercel builds. A push to any other branch changes nothing that
Rowland can see: the site keeps serving the last build of `main`, silently and
correctly, and the work looks done from the terminal while being invisible from
the app.

That has already cost a whole session once — 21 commits sat on a branch for a
day while each one was reported as "pushed". Pushed was true. Live was not, and
those are not the same claim.

So the definition of done is:

1. the gate passes (below),
2. the change is merged into `main` and pushed,
3. and only then is it reported as done.

If something genuinely cannot be merged — a spike, a half-finished refactor, an
explicit request to hold it on a branch — say so in the same breath as
"finished", in plain words: *this is on a branch and will not reach the app
until it is merged.* Never let "pushed" stand in for "you can see it".

Working on a feature branch and merging at the end is fine. Leaving it there is
not.

## The gate

Run all of it before merging. It is what CI runs, plus the two things CI cannot:

```
npx tsc --noEmit
npx eslint src --max-warnings 69      # a ratchet, not a target — see below
npx vitest run
npx vite build
node scripts/smoke.mjs                # needs a dev server on 5191, or SMOKE_BASE
node scripts/check-live-schema.mjs    # the LIVE database against the mapper — needs .env
```

The lint number is a **ceiling that only ever comes down**. The remaining
warnings are a backlog (mostly non-null assertions), not a standard. If a change
removes some, lower the number in `package.json` and `.github/workflows/checks.yml`
in the same commit. Never raise it to get green.

`scripts/smoke.mjs` loads every screen in the app with realistic seeded data and
fails on any console error. It has caught crashes that no unit test would have.
Its fixtures live in `src/dev/seed.ts` — **TypeScript on purpose**, because two
earlier attempts wrote plain objects in the `.mjs` and both were the wrong shape,
manufacturing two "bugs" in the app that were really bugs in the harness.

## Verifying in the app, not just in the terminal

For anything a person sees, drive it in a real browser before calling it done —
Chromium is at `/opt/pw-browsers/chromium`, Playwright is configured to find it.
Seed data, click the actual controls, read the actual DOM.

Four separate defects in the commissioning screen were invisible to every test
and to reading the code, and turned up in the first thirty seconds of using it:
no way to create a machine at all, a number box that turned `12` into `102`, a
database write on every keystroke, and no way to delete a mistyped row.

On the deployed app, the Home screen prints `Build <timestamp>`. That is the
one-glance answer to "is the fix actually live", and it is why it exists.

## Database changes ship from here, like code

The Supabase connector is connected with its write tools allowed (checked 2
October: `execute_sql` and `apply_migration` both go through; the project is
`eqdigvzbljofxznqtfia`, "Faultline"). So a schema or policy change is not a
file handed to Rowland to paste into the SQL editor. It is:

1. the SQL written to `supabase/<NAME>.sql` in the house shape — a header
   saying what it is for and why, "Run ONCE. Safe to re-run", every statement
   create-if-missing or create-or-replace, and a `select` at the end that
   prints back what it did;
2. applied to the live database with `apply_migration` under the same name,
   so the migration history matches the file;
3. **read back** — `pg_policies`, `pg_get_functiondef`, `pg_indexes` — before
   anything is reported, because a tool result that says "cancelled" or
   "success" is not the database;
4. and only then the app change that depends on it is pushed to `main`, so a
   sentence on a screen is never true before the database makes it true.

The connection drops (`ERR_PROXY_TUNNEL`) and comes back; a failed call is
retried, not reported as "no access". If a write comes back "cancelled" it is
the connector's per-tool permission, set under the connector's Tools at
claude.ai/customize/connectors, and the fallback is the file above pasted
into the Supabase SQL editor — in the same breath as "finished", never later.

**The app has one piece of server-side code**: `supabase/functions/remind`,
an edge function pg_cron calls every fifteen minutes (`PUSH_REMINDERS.sql`)
to push a note's reminder to every device that said yes. It is deployed with
`deploy_edge_function` from the file in the repo — the repo copy is the
source, never the dashboard — and its keys are made by the function itself
on its first run, so no key ever passes through a person or a file. It is
checked by calling it from SQL (`net.http_post`) and reading
`net._http_response`.

**The files in `supabase/` are a history, not a playbook.** Never replay them
all. Four of them move the database backwards if run today: `WORKSPACE_TEAMS`
and `PROJECT_TEAMS` overwrite the membership function with an old version,
`TEAM_UPGRADE` reopens every table with `true` policies, and `FRESH_START` is
for an empty project. The question "is the live database missing anything?"
is answered by a diff, not a re-run: parse every file for the objects it
intends (columns, tables, indexes, triggers, publication, constraints,
functions), hand the list to the database in one `with want(...) as (values
…)` query against `information_schema` and `pg_*`, and read the check
constraints and `pg_policies` by hand. Done 2 October: nothing was missing,
and nothing was run. Supabase's migration history (36 entries) is shorter
than the file count (46) because the early files were pasted by hand; from
here each new file goes through `apply_migration`, so the two move together.

## Things that will bite

- **A policy test that reads a null as `true`.** `SECURITY_RLS.sql` part C2
  meant to drop any policy whose rule was literally `true`, but tested
  `coalesce(with_check, 'true')` — null for every SELECT policy — and silently
  dropped the workspaces' select and insert. For nine days no line study could
  be read or created through the API, and nothing on screen said so.
  `LINE_STUDY_ACCESS.sql` restored them. When a migration drops policies by
  pattern, read `pg_policies` back for every table it touched, and remember a
  select policy has no `with_check` and an insert policy no `qual`.

- **Schema drift is silent.** The app's mapper and the SQL migrations are two
  descriptions of the same columns. When they disagree the push is rejected, the
  cursor never advances, the row never leaves the device, and nothing on screen
  says so. This has happened four times. `src/cloud/__tests__/sync-schema.test.ts`
  compares both sides and runs on every commit — when it fails, the fix is a
  migration, never an edit to the test.
- **The PWA caches aggressively.** `registerType: 'autoUpdate'` means an installed
  app fetches a new build and swaps to it on next launch. In a dev browser, a
  hard reload. Stale UI is usually this, not a broken build.
- **Supabase env vars are baked in at build time.** `scripts/check-env.mjs` prints
  whether both were present, in the host's build log. A build missing them ships
  a working-looking app with no sign-in.

## How a change gets made here

Rowland, after a run of work where each piece was good on its own and the app
still read like a workbook:

> "When we build things, we must be cohesive with the entire app. We don't
> build something without any regard for anything else. These rules we must
> follow. We must incorporate what we have and then fully understand what
> we're trying to build, before we remove something that was perfectly fine."

So, four rules, and they apply to every change from here:

1. **Nothing is removed until we can say why it was there.** If it was fine, it
   stays until there is a replacement AND a sentence saying why the replacement
   is better. "It looked dated" is not that sentence.
2. **Every change states its effect on the screen AND on the PDF, together.**
   Not one and then the other. A person types into a box and then watches what
   it becomes — that is one job, and designing the two halves apart is how the
   report ended up not carrying what the screen held.
3. **Additions connect; they do not sit beside.** If a new thing neither reads
   from nor feeds what is already here, it is a bolt-on and it is wrong. The
   test: name the existing record it hangs off, and the document it reaches.
4. **The whole shape is designed before any of it is built**, then built in
   slices that each ship live on their own.

A FIFTH CONCEPT IS ALMOST ALWAYS THE WRONG ANSWER. `src/lib/testing.ts` says it
about tests and it holds everywhere: if something needs a new noun to explain
it, look again — four of this app's five lists already carry dates, owners and
states, and most "we need to store X" turns out to be "we have never drawn X".

## Visual management — the rules every screen and PDF follows

Rowland, 2 October: "follow the lean visual management principles throughout
the app." The test is the one a board on the floor passes: from across the
room, in three seconds, can you tell what is normal, what is not, and who owes
what by when?

1. **One colour, one meaning, everywhere — screen and paper.** Red
   (`--st-r`) is the day that has gone, or a failure. Amber (`--st-a`) is
   waiting on somebody, or due soon. Indigo (`--st-w`) is under way or still
   ahead. Green (`--st-g`) is done. Grey (`--st-n`) is not started. Brand blue
   is for what you press, never a state. Nothing else wears these hues: the 3P
   columns are told apart by place and name, not colour. The PDFs use the same
   five values.
2. **Normal recedes, the abnormal stands out.** Done is a quiet green wash,
   never the loudest thing on the screen. Late gets a heavier red border and
   tint, and a failure or problem is solid red. If the eye lands on a green box
   first, the screen is wrong.
3. **Only the abnormal number carries colour.** "11 outstanding" is the work
   and stays neutral. "4 late" is red. A zero is grey.
4. **The state in words beside the marks.** For example "4 open · 1 past due
   · 3 closed". Colour is never the only carrier, so it survives a
   black-and-white print and colour-blind eyes.
5. **One lane, merged markers, tap for detail.** Busy information is merged
   (days into weeks) rather than piled up. The plan never grows a row per item
   of evidence.

## Simplicity — lean, applied to the screen

Rowland, 2 October: "simplicity is what makes the app powerful — simple,
effective and efficient." Waste on a screen is the same as waste on a line:
anything the person has to look past to do the job.

1. **One thing, one place.** A state, a number or an action appears once. The
   Evidence counts *are* its filters, not a row above a second row saying the
   same words.
2. **Tools come out where the work is.** Controls appear on the box being
   worked on, not on every box at once (the lever tree). The state always
   shows; the editing tools come when they are wanted.
3. **No word that is not true.** A label from an older design ("from the
   tracker") is waste and misleads. Fix it the moment you see it.
4. **Simplify by merging, not by deleting.** Rule 1 of "How a change gets made
   here" still holds. A simplification keeps every capability and removes
   only the duplicate route to it.

## The word is CLIENT, not GM

The report goes to whoever is being reported to — Rowland's General Manager by
default, and sometimes the OEM. `GM` was parochial and made the document sound
internal. It is the **client report**, and the person is the **client**,
whichever of them is reading it. When you find an older `GM` in the code or on
a screen, change it.
