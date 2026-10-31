# FC-199 — Gemba walk, and how fresh the looking is: the specification

**Catalogue:** FC-199 (a *component* of the walk, FC-081; FC-200 Leader standard work stays not built) ·
**Knowledge:** `visual.gemba-walk` (full, practice), with `visual.daily-management` and
`visual.action-tracking` beside it · **Asked for:** Rowland, 31 October 2026, in the pathway of
`docs/METHODS.md` §11 — *"I want it done as fast as possible … set multiple agents"*: FC-199 is
"part-built — finish", serving the Improvement Kata (Grasp the current condition; the coaching cycle's
looking) and the Kaizen event (Observe) · **Status:** draft, built on `m5-kata` (31 October)

## 1. Purpose
Everything the app knows of a line is only as true as the last time someone stood at it. The walk's
measure is the silence: **how many days since anyone looked at this line, and at each machine on it —
and what that looking found.** Before this, the number existed only on two old screens (the stops-timed
board's status strip and the meeting's overview — `screens/AnalyseScreen`, `MeetingScreen`) and counted
two kinds of looking; the line's own page, the factory, the project and the method page said nothing.

The sentence it lets one side say to the other that it could not before — the lead to the manager, the
coach to the learner in a Kata cycle: **"Line 3 has not been looked at for 16 days, and the Sealer for
40; the last look raised a problem on the Wrapper that is still open."**

**Scope.** What this build covers: (1) *looking* read from four records that already exist — a stop
timed, a filmed-walk clip, a frame marked on a walk, and a problem raised on a look — as one list of
looks per line, each with a time and, where it names one, a machine; (2) *freshness by line* — days
since the last look and its kind, fresh / fading / stale by the house's rule (≤ 7 · 8–14 · > 14 days,
or never); (3) *freshness by machine* on the line's own list, stalest first, never-looked-at first of
all; (4) the *rhythm* — on how many of the last 14 days there was a look; (5) *what the looking found*
— problems raised on looks in the last 28 days, how many are closed, how many still open, and how long
the oldest has been open (the knowledge record's "a walk whose findings are never closed is theatre");
(6) where it shows: the line's page (and its one-page and combined papers), the factory's list of
lines (a short sentence on each card, the factory's floor order kept), the project's *Needs you* (only when
fading or stale), and the method page's FC-199 row for the project's lines. What it deliberately does not cover: **the cadence per leader and walks-against-cadence**
(*done of due* by the team leader daily, the manager weekly) — that is **FC-200 Leader standard work**,
which needs a place to keep a cadence and a leader's routine (a new record; `docs/BLUEPRINT.md` §2 is
changed first, and a migration) — so the rule stays one cadence for every line, Faultline's own;
**a walk's purpose, route and day's question** (not kept — nothing stores them); **classing and costing
what a walk sees** (FC-005 waste walk); **looking that was not recorded in the app** (a walk with
nobody typing anything is invisible — said on the screen and the paper); **any reading of a machine** and
any AI. No new record, no migration.

## 2. Users and scenarios
**Who:** the line lead or manager at a desk before the day's meeting; the Kata coach asking the five
questions at the line ("what have you found since last time?"); the Kaizen team lead in *Observe*; the
site lead reading the factory's list on a phone.

**Scenarios, food first.** (1) *Monday, a packing hall.* The manager opens the Factory: Line 1 looked at
yesterday, Line 2 nine days ago (fading, amber), Line 3 sixteen (stale, red); a tap
opens Line 3's page: "nothing looked at for 16 days — go and see", the Sealer 40 days, the Cartoner
never. (2) *A Kata project.* On *Experiment toward it* the Gemba walk row says "Line 3 not looked at for
16 days — stale"; a tap opens the line. (3) *The week after.* The coach walked it, raised two problems on
the Wrapper; the line reads "looked at today — a problem raised", looked at on 1 of the last 14 days,
"2 problems raised in the last 4 weeks, none closed" — the next meeting asks why.

## 3. Method selection
The gemba walk / *genchi genbutsu* (Womack 2011; Liker 2004 principle 12; Mann 2015 on the walk in leader
standard work): go to where the work is, ask, and turn what is seen into problems with owners.
Faultline measures only what a person recorded — "measured by people, not by sensors" — so *looking* is the
record that a person stood at the line and left a mark. **Alternatives considered** (the record's *When
not to use it*): costing the waste seen → FC-005; how the crew's day is spent → work sampling (FC-022);
the workplace's standard → 5S audit (FC-013); the leader's routine → FC-200. **Unsuitable when:** a line
is looked at but not recorded — the figure then says "nobody has recorded" and is wrong about the line; the
screen says exactly that, and never "nobody has looked". Freshness is about looking, not trouble: a fresh
line may be in trouble and a stale one fine (the record's own caution, repeated on the screen).

**Established · assumed · chosen.**
- *Established:* the practice of going to see and the purpose of a walk (Womack 2011; Liker 2004;
  Mann 2015 — from knowledge, texts not re-read, as the record says). A walk's findings must close or the
  walks stop (record, *Assumptions, limits and misuse*).
- *Assumed:* that a stop timed, a filmed clip, a frame marked and a problem raised on the spot are each
  made by a person standing at the line. A problem raised from the Pareto board (a *board action*:
  `targetCategory`, `caseId`, no frame, no media) is raised at a desk and is **not** a look. A
  deleted record is not a look.
- *Chosen (Faultline's own, from `src/lib/gemba.ts`, 24 October, kept):* fresh ≤ 7 days, fading 8–14, stale
  more than 14 or never; days are whole 24-hour blocks, `floor((now − then) ÷ 24 h)`, so "yesterday"
  means 24–48 hours ago and the same number the older screens already say. One cadence for every line.
  **Chosen here:** the look that counts for a *machine* is one that names it (a stop timed on it, a
  frame marked on it, a problem raised on it); a filmed clip names no machine and counts for the line only;
  the rhythm window is 14 days and the findings window 28 days (two cycles of the fading band and four
  weeks, the line's page's stops window). Rowland has not named these windows; they are said on the
  screen and are one constant each in the module.
- *Money:* none. `knowledge/MONEY.md` §4 row FC-199 is — : freshness is "the risk of not knowing" (the
  record); no cost causation is invented. What a walk finds carries its own money through the problems it
  raises (FC-154), which the register already prices.

## 4. Inputs
Read from existing records, nothing asked: `Observation` (`startedAt`, `asset`, not deleted); `Segment`
(`createdAt`); `SnagAsset` (`createdAt`, `name`); `Snag` (`raisedAt`, `status`, `closedAt`, `archivedAt`,
`assetId`, `targetAsset`, `media`; a look only when pinned on a frame or a quick snag); the line's list of
machines (`Workspace.assets`, "Whole line" excluded). The reference time is "now". A machine name is
compared as the app compares them (`machineKey`: case and spacing never make two).

## 5. Data suitability
No minimum — one look is enough to say "yesterday". Nothing recorded says **"nothing recorded"** (stale),
never a date invented. A time in the future (a clock set wrong) reads as today (days never below 0). A
machine on the list named by no look says *never*, which is a statement about the record, not the machine.

## 6. Calculations
`days(t) = max(0, floor((now − t) ÷ 86 400 000))`. Line: `last = max over looks`, `days = days(last)`,
`level = fresh if days ≤ 7, fading if ≤ 14, else stale` (never = stale). Machine: the same over looks
naming it. Rhythm: the number of **distinct** values of `days(t)` below 14 over the line's looks (a day
counts once however many looks it had). Found: of the snags that are looks, `raised` = those with
`days(raisedAt) < 28`; `closed` = of those, `status = closed`; `open` = all looks' snags that are not
closed and not archived (any age); `oldestOpen` = the greatest `days(raisedAt)` among them.

**Independent worked cases** (a second implementation in `scripts/knowledge/cases-sixsigma-visual.py`,
*Gemba freshness*; the unit test uses the literals):
| case | looks | days | level |
|---|---|---|---|
| A | a stop 2 d 3 h ago | 2 | fresh |
| B | a filmed clip 9 d 5 h ago; a problem on the Wrapper 12 d ago | 9 | fading (rhythm 2 of 14: days 9 and 12) |
| C | a problem on the Wrapper 16 d 1 h ago; a stop on the Sealer 40 d ago | 16 | stale; machines: Cartoner never, Sealer 40, Wrapper 16 |
| D | nothing | never | stale |
| boundary | 6 · 7 · 8 · 14 · 15 days | | fresh · fresh · fading · fading · stale |

**Sentences** (the module's; the screen, the papers and the acceptance script read them):
fresh — "*Line 1* looked at yesterday — a stop timed."; fading — "*Line 2* last looked at 9 days ago (a
filmed walk) — fading, go and see."; stale — "*Line 3* not looked at for 16 days (a problem raised) —
stale, go and see."; never — "*Line 4*: nothing recorded of anyone looking at it — stale, go and see."
Machines — "Not looked at lately: Cartoner (never), Sealer 40 days, Wrapper 16 days." (the first three,
"and n more"); none to say when every machine is fresh. Rhythm — "Looked at on 2 of the last 14 days."
Found — "Last 4 weeks: 3 problems raised on looks, 1 closed, 2 open; the oldest open 16 days." and "No
problem raised on a look in the last 4 weeks." Footer, always: "Counts what was recorded in the app — a walk
nobody wrote down is not here."

## 7. Outputs
**On screen** (`tools/gemba/LookedAt`): the line's sentence with its tone — only the abnormal carries
colour: fading amber, stale red, fresh neutral — beside the eye icon and always in words; on the line's page
also the machines sentence, the rhythm, what it found and the door *Film the line* (the walk itself, FC-081)
and *Time a stop*. On the factory's board: one short sentence on each line's card (`lookingShort`), the cards kept in the
factory's floor order — the factory's order is the floor's, not a ranking. In the project's *Needs you*: only a line that is fading or stale, as a row-less note under
the list (it is not an owed item and changes no count — `docs/STEADY.md` one number). On the method page:
the FC-199 row says the project's stalest line and opens it.

**The report.** The line's **one-page report** and the **combined line report** carry the sentence: a
*Last looked at* fact in the band (`9 days ago — fading`) and, under the tiles, the line's sentence and what
it found, from the same module as the screen. The page is the lean page's order: the band, the closing line;
nothing is a tile (the tiles stay the four the inventory counts). Not a paper of its own: freshness is one
sentence of the line's papers, never a third kind of paper. It does not claim that a fresh line is healthy.

## 8. Manufacturing usability
Zero taps to read it (it is on the page the line opens on); one tap to the line from the factory, the
method row or the project note. Phone first: the strip wraps, nothing off the side, 44 px doors.

## 9. Failure handling
Nothing recorded → "nothing recorded … stale". A line not on the device → no strip. A client reads the
strip and the papers and writes nothing (it has no control that writes). Offline: reads the device.

## 10. Integration
Reads `observations`, `segments`, `snag_assets`, `snags` and the workspace's `assets` — all synced
already; writes nothing; no migration; no new noun (BLUEPRINT §2 unchanged: it is a read over existing
records, as the freshness on the stops-timed board always was). Shows wherever its parent (the line) shows:
the line's page (overview), its one-page and combined papers, the factory's lines, a project's *Needs you*
(6M and lever-tree front page) and the method page. Not on the stage-gate Now page (its Needs you is the
stage-gate's owed list and is walked by the one-number gate; the stage gate's line is one tap away from
its Machines tab). `docs/PAGES.md` and `scripts/inventory/pages.mjs` gain the line's strip.

## 11. Verification
Unit: `src/tools/gemba/__tests__/looking.test.ts` on the worked cases above (A–D, the boundaries, the
rhythm, found, the sentences, board actions and deleted records not counting, a future time). Acceptance:
`scripts/acceptance/gemba.mjs` (the gate line to add to `CLAUDE.md`'s list is the lead's).

**Acceptance criteria.**
1. Days, level and kind of the last look for lines A, B, C and D equal the independent cases, and the
   boundaries 6/7/8/14/15 days give fresh/fresh/fading/fading/stale — *proved by* `looking.test.ts`
   (`worked cases`, `boundaries`).
2. A board action, a deleted observation and a deleted snag are not looks; a clip names no machine —
   *proved by* `looking.test.ts` (`what counts as a look`).
3. Machines are listed stalest first, never-looked-at first, "Whole line" never a machine; rhythm and found
   equal the cases — *proved by* `looking.test.ts` (`machines`, `rhythm`, `found`).
4. The sentences are exactly the words in §6 — *proved by* `looking.test.ts` (`says`) and read back from the
   page and the paper by `gemba.mjs` (steps 1–3, 6).
5. The line's page shows the sentence, machines, rhythm and found as the module says them, fading amber and
   stale red with the words beside the colour, and the four tiles unchanged — *proved by* `gemba.mjs`
   step 1; a fresh line neutral, step 1b.
6. The factory's board shows each line's short sentence on its card, the floor order unchanged —
   `gemba.mjs` step 2.
7. A 6M project on lines shows the note in *Needs you* only for a fading or stale line, and a fresh one
   shows none; the late count of that panel is the same with and without it — `gemba.mjs` step 3.
8. A Kata or Kaizen project's FC-199 row on the method page says the project's stalest line and opens that
   line — `gemba.mjs` step 4.
9. A new look moves the line without a reload (a stop timed → "looked at today") — `gemba.mjs` step 5.
10. The one-page line report and the combined line report, downloaded and read back, carry the *Last looked
    at* fact and the line's sentence as the module says them — `gemba.mjs` step 6.
11. The phone: nothing off the side on the line's page and the method page — `gemba.mjs` step 7.
12. Existing behaviour unchanged: the older strips on the stops-timed board and the meeting still say what
    they said (`src/lib/gemba.ts freshness` unchanged) — `looking.test.ts` (`one rule`) and the gate's smoke.
Not yet proved: the full gate and the paper-parity comparison (the lead runs them after merging); FC-200.

## 12. Maintainability
`src/tools/gemba/looking.ts` (pure), `useLooking.ts` (the hook), `LookedAt.tsx` + `looking.css` (the
strip). `src/lib/gemba.ts` is kept and its rule exported once (`levelOfDays`) so there is one rule. Left
for later: cadence and walks-against-cadence per leader (**FC-200**, needs a record and a migration), the
walk's purpose and route (nothing stores them), the walk's wastes classed and costed (**FC-005**), and
check rounds as looks (a check log's round is a person at the machine; not counted until Rowland says so).
