# The 6M journey on screen — the map

The map of a 6M job's root-cause journey (the project type stored as `board`;
docs/SIXM.md is the design, docs/OPEX.md the knowledge behind it). Read from
the code, then checked by pressing every control in Chromium at 390×844
(touch, isMobile) and 1366×900, as owner, team and client
(`localStorage["faultline.access.force"]`), with the seeded job "Line 7 pace"
(`src/dev/seed.ts`). Seeded: Line 2A has a line balance, timed stops and two
problems, "Basketer minor stops" (acting) and "Line 2A below its rate target"
(holding). Line 7 has an old-style Case, "Reject bin full by 10am", with its
five whys and no causes. 4 October 2026.

Conventions: `P` is the project id, `L` a line id, `C` a problem (Case) id.
"Record" names the TypeScript type and the `src/db` module that owns its store
(all re-exported through `src/db.ts`). "Control room" means Home
(`ui/JobsBoard.tsx` fed by `lib/portfolio.ts`) and the project page
(`screens/ProjectDashboardScreen.tsx`). "The report" is the 6M client report:
the page `SixMReportScreen` in `screens/PaceExecReport.tsx`
(`#/pace-report?project=P`) and the PDF `lib/sixmReportPdf.ts`, both built
from one `SixMReport`, so they carry the same sections.

**Which change:** every screen here belongs to a running line being made to
perform better (the 6M method). The unit is one *problem* on one line.

## The records

| record | type · store | what it is here |
|---|---|---|
| Problem | `Case` · `db/cases.ts` (`cases`) | the head of the fish: `title`, `projectId`, `lineId`, `source` (gap / pareto / constraint / observed), `causes[]` (the bones, merged by id), `hold` (the check that keeps the gain), `status`, `baselineMsWeek`, `deletedAt` (removed by mistake). A Case from before 6M may carry only `whys: string[]` and live in a line's workspace with no project on the row. |
| Cause | `Cause` (in `Case.causes`) · `lib/sixm.ts` | `m` (bone), `text`, `grade` (measured · counted · observed · reported), `status` (suspected · confirmed · ruled out), `whys[]`, `root`, `source`, `by`, `at`, `media[]` |
| Countermeasure | `PaceTodoRow` · `db/pace.ts` (`pace_todos`) | an action on the board with `pillar` = the bone, `causeRef` = `"C:causeId"`, and `expect` (what it should change) |
| Timed stop | `Observation` · `db/observations.ts` | a line's log, plus `causeM` (the floor's one-tap bone) |
| Fed from (read only) | `WalkSnag` (`lib/walkSnags`), `Standard`, `PaceLineRow.capacity`, `Material`, `Program`, `Reading`/`Measure`/`Target`, action notes | the suggestions on each bone (`lib/fishbone.ts suggestionsFor`) |

**Control room.** The project page leads a 6M job with the compact fishbone
(`FishboneLead`). Home shows the job's open countermeasures by bone
(`lib/portfolio.ts`) but **not its problems by phase**, though docs/SIXM.md
says it should (see findings).
**The report.** "Each problem": the fishbone drawn, the why-chains of the
confirmed roots, the countermeasures with expected and actual, and the hold.
"The board by bone": every action, with "For: <cause> (problem n)".

---

## 1 · The journey — `#/project/P/fishbone?line=L&problem=C&open=1`

`screens/FishboneScreen.tsx` → `FishboneScreen` wraps `FishboneJourney`. The
line page's Fishbone lens is the same `FishboneJourney`, held to one line.

**Purpose (the sentence it lets the lead say to the sponsor or client):**
"This is the problem on this line, how big it is, what we know causes it and
how sure we are, what is being done about it, and whether it has held."

**Reads:** `useProblems(P)` (every Case on the job, plus the data the bones
are filled from), `usePaceLines`, `useMeasures` and `useLineStops` (for the
doors), `useProject`. **Writes:** Case (create, causes, close/reopen, hold
check, remove, old whys) through `lib/useProblems.ts` and `db/cases.ts`;
PaceTodoRow through `ui/ActionSheet`; a line's workspace on first "Time a stop".
**Shows up:** the project page's fishbone lead, the line page's Fishbone lens,
and the report's "Each problem".

| control | does | access |
|---|---|---|
| Crumbs: Control room › P › Fishbone (phone: "‹ P") | Home, the project page | all |
| Peers row: Fishbone · Board (n, late) · Lines · Numbers · Wins · Evidence · Materials | the 6M job's other pages (`methodPeers`) | all |
| AccessNote | "You can read this…" for a client or team, naming the owner | — |
| Line chips (only when the job has more than one line) | `?line=L`, clears `?problem` | all |
| Problem chip (title + phase word) | `?problem=C` | all |
| "+ Open a problem" | opens **Open a problem** (1a) | can.edit |
| `?open=1` | opens 1a on arrival (from the project page), then clears the key | can.edit |
| Stale `?problem=` | says "That problem isn't on this job any more — this is the line's main one." | all |
| Empty state: "Open a problem" | 1a | can.edit |
| **Head card** — phase · "from <source>" · title · sentence · counts · "moved the right way/wrong way" · "Kept by …" | words only | all |
| "It worked — close it" / "Close it" (no countermeasure yet) | **Close it — and keep the gain** (1b) | can.agree |
| "Reopen" (closed) | status open | can.agree |
| "Checked today" (closed with a hold) | `hold.lastChecked` = today | can.edit |
| "Remove this problem" (quiet, red words, right-hand end) | soft delete (`removeCase`); Undo toast for 8 s: "Removed "T" — its n countermeasures stay on the board"; Undo puts it back and shows it | can.remove (owner) |
| **Written before the fishbone** card (old whys only) | the old chain read "a → b → **c** the root" | all |
| "Put it on a bone" → six bone chips · Cancel | one Cause on that bone (`causeFromOldWhys`), and `Case.whys` cleared in the same write | can.edit |
| "I saw…" | **I saw…** (3) | can.edit |
| "Time a stop on <line>" | `#/w/<line ws>/capture` (the workspace is made the first time) | can.edit |
| **The fishbone** | see 2 | — |

**Phone notes:** the problem chips go full width. Every control in `.fj` is at
least 44 px tall (checked).

### 1a · Open a problem (sheet)
Four doors, each worked out from the line: **The line's gap** (its headline
measure is off target), **The top Pareto bar** (the four weeks' biggest
category and the machine it is mostly on), **The constraint** (the line
balance's limiting station), and **Something seen** (a text box plus "Open
it"; Enter works too). A door with nothing behind it is drawn dashed and says
why ("Packs per minute is at target", "The line balance is not counted yet").
A door already open says "Already open — go to it" and goes there rather than
opening a duplicate. Writes a Case (`createProblem`: workspace, path,
baseline).

### 1b · Close it — and keep the gain (sheet)
"What is checked" (required for "Close it"), "Who checks it", "How often"
(every day, week, fortnight or month), "The standard is updated…", and "Close
with no check", "Cancel" or "Close it". Writes status, closedAt and hold.

## 2 · The fishbone — `ui/Fishbone.tsx` (+ `ui/fishbone/*`)

**Purpose:** "These are the causes on each of the six bones, how each is
known, and which one is the root." It has three shapes, chosen by its own
width: **drawn** (820 px and over), **lanes** (a phone), and **compact** (the
project page).

| control | does | access |
|---|---|---|
| Cause mark (drawn) / row (lanes) — glyph (solid confirmed, ring suspected, struck ruled out), ROOT tag, grade meter | opens **the cause** (4); hover or focus shows the whole text (drawn) | all |
| Suggestion mark/row (faint, dashed, italic, ⊕) | opens 4 as a draft: "Suggested by the data" | can.edit (a client never sees suggestions) |
| "+ Add" on each bone label or lane header | opens 4 as a blank cause on that bone | can.edit |
| Lanes: small fish at the top — bone labels are buttons | scroll to that bone's lane | all |
| Key under the fish | words only | — |

**Compact (project page):** at narrow widths the head carries the problem's
number now, in its unit, with the phase, "was" and target on the line above.
At wide widths the head carries phase, title and number. The whole picture is
one link to the journey (`.fj-lead-fish`, Enter works too). The sentence is
its caption, under it.

## 3 · I saw… — `ui/SawSheet.tsx`

From the journey's tools, or the line page's header (on every lens but
Fishbone, which carries its own).
**Purpose:** "I saw this on the floor, on this day — here it is on the bone,
with a photo." **Writes:** a Cause (`grade: observed`, `by` = signed-in name,
`source.kind: observation`, `media`) on the chosen open problem. If "the gap
to target (opened for it)" is chosen, a gap Case is created first.

| control | does |
|---|---|
| Six bone chips (44 px) | pick the bone (required); a blurb under them |
| "What you saw" | text (required) |
| "On which problem" | this line's open problems, plus the gap option when the line has no gap problem open. It starts on the page's problem only when that one is open. |
| Evidence: Camera · Video · On the phone; thumb → viewer | photos and clips on the cause |
| Cancel · "Put it on the fishbone" | close · save, then show that problem |

## 4 · The cause — `ui/CauseSheet.tsx`

**Purpose:** "This is how we know it, how sure we are, why it happens down to
the root, and who is doing what about it." Nothing is written until Save.
**Writes:** the Cause (`saveCauseOn`, merged by id) or removes it
(`removeCauseFrom`).

| control | does | access |
|---|---|---|
| The cause (a line that wraps; Enter = save) | text | can.edit |
| On the bone: six radio chips | `m` | can.edit |
| How it is known: four grades | `grade` | can.edit |
| How sure: Suspected · Confirmed · Ruled out | `status` | can.edit |
| Where it came from · "Open it ›" | Pareto bar (`/pareto?bar=`), the snag's frame (or the snag list), the line balance, the standard, Materials, Programs, the line's Numbers. Not shown for something seen, which is its own evidence. | all |
| Evidence (its photos; Camera · Video · On the phone; thumb → viewer → remove) | `media` | view all · add/remove can.edit |
| Why chain: each why (Enter = next or new), "How known?" select, × | `whys[]`; a why that blames a person asks "What let that happen?" | can.edit |
| "+ Ask why" / "+ Ask why again" (off while the last is blank) | adds a why | can.edit |
| "This is the root" checkbox (off when ruled out) | `root`; "Still suspected…" if not confirmed | can.edit |
| Read it back, from the root up | the "therefore" chain | all |
| Countermeasures list (state words, past due in red) | words | all |
| "+ Add a countermeasure" | saves the cause if changed, then **ActionSheet** with bone, line, `why` = cause, `causeRef`; afterwards the cause opens again with the new one listed | can.edit |
| Remove (confirm) | takes the cause off | can.edit + can.remove |
| Cancel (confirm if changed) · Save / "Add to the fishbone" | — | can.edit; a client gets Close |

## 5 · A countermeasure — `ui/ActionSheet.tsx` (the one action editor)

The countermeasure path: what, why, **FOR THE CAUSE** (`CauseLine`: the
cause's words — its problem; or "a cause on the fishbone" when its problem is
not on this device; or "'T' — its problem was removed" / "its cause was taken
off the fishbone"), "Open the fishbone ›" (not shown for a removed problem),
bone chips, line, who, due, when, what it should change, where, photos, what
happened, state, how it ended, Delete (owner, with Undo), Cancel, and "Add
it"/Save. The board's card says the same: "for: <cause>", "on the fishbone",
or the gone words (`lib/actions.ts useCauseNames`, `GONE_WORDS`).

## 6 · Doors into the journey from elsewhere

| where | control | does | access |
|---|---|---|---|
| Pareto `#/project/P/pareto` (`screens/ParetoScreen.tsx`) | "Find the root cause ›" on a bar (44 px on touch) | opens (or finds) a pareto-sourced problem for that bar on its line, on its main machine, then goes to its fishbone | can.edit |
| | "Its fishbone ›" | goes to the open problem for that bar | all |
| Capture `#/w/WS/capture` (`screens/CaptureScreen.tsx`) | "Cause, if you know it": six chips after a stop is logged; a second tap clears; × skips | `Observation.causeM`; the feed shows "· Machine". **Only on a 6M job's walk.** | — |
| Line page `#/project/P/line/L` (`screens/ProjectLineScreen.tsx`) | Fishbone lens (the default on a 6M job) | `FishboneJourney` held to L | all |
| | "I saw…" in the header (not on the Fishbone lens) | 3 | can.edit |
| Project page (`ProjectDashboardScreen.tsx` `FishboneLead`) | "Open the fishbone ›" / "Open the journey ›"; the compact fish; "Open a problem" (empty) | the journey, at the main problem; `?open=1` | all; Open a problem needs can.edit |

## The modules behind it

- `lib/sixm.ts`: the six bones, grades, statuses, `boneOfStop`, `blamesAPerson`.
- `lib/problems.ts`: the contract (`ProblemView`, `Phase`, `PHASE_WORD`, `ProblemsApi`).
- `lib/fishbone.ts`: the engine, pure: scope, suggestions, measure, phase, view, `therefore`, `causeFromOldWhys` / `oldWhysOf`.
- `lib/useProblems.ts`: loads everything and keeps it live; writes (`createProblem`, `saveCauseOn`, `removeCauseFrom`, `closeProblem`, `reopenProblem`, `checkedProblem`, `putOldWhysOnBone`).
- `db/cases.ts`: Case store; `patchCase` (read live row, change, stamp); `removeCase`/`restoreCase` (soft delete and Undo); `getCaseEvenRemoved`.
- `lib/actions.ts`: `parseCauseRef`, `useCauseNames` (cause words, or gone).
- `ui/fishbone/layout.ts`: where every mark on the drawn fish goes (pure, tested); `orderItems`, `boneWords`.
- `ui/fishbone/marks.tsx`: glyph, grade meter, ROOT tag.
- `ui/fishbone/LineField.tsx`: a one-line answer that wraps.
- `ui/fishbone/useWidth.ts`: the box's own width; `coarsePointer`.
- `ui/Undo.tsx`: the one Undo bar.

## Findings (where the answer is "no", or a decision is needed)

- **Home does not show a 6M job's problems by phase**, which docs/SIXM.md
  promises ("a 6M job's row says its problems by phase"). It shows open
  countermeasures by bone only. This belongs to the control-room owner.
- **"Holding" with nothing to show for it.** A problem closed with a hold
  check reads Holding (green) when its number has not been measured since
  (`moved` undefined), even with every countermeasure still open
  (`lib/fishbone.ts phaseOf`). Recommendation: Holding only when `moved` is
  `better`; otherwise "Closed — not proved yet" (indigo).
- **Material suggestions always land on Material.** "Upgraded jaw heater is 1
  day late" is equipment, but `Material` has no field saying what kind of
  thing it is (`lib/materials.ts`: what, howMuch, lineId, from, due, here),
  and its source is always Material. The record cannot tell, so this was not
  changed. Today's way round it: the suggestion's sheet already has the bone
  chips, so the person can move it to Machine before "Add to the fishbone".
  The cause is saved on Machine, and the suggestion is not offered again,
  because what has been taken is matched by source, not by bone. Add a kind to
  a material only if one more question on the Materials screen is worth it.
- **"I saw…" offers "the gap to target (opened for it)" when the line is at
  target**, and creates a gap problem titled "the gap to target" there.
  Recommendation: offer it only when the gap door has a title.
- **Two numbers for one figure** on a gap problem: the head card says "47.75
  ppm" (`say`, two decimals), while the fish's head says "48" (`num`, whole
  numbers at 10 and over). Recommendation: one formatter for both.
