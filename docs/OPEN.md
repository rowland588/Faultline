# What is genuinely unfinished — outside the catalogue's tools

Written 25 October 2026 at `47ad141`, from an audit of the docs against the code
(each item checked by grep or `git`; the live database could not be read that
day, so nothing here is about live tables). The catalogue's own backlog is
`knowledge/SUMMARY.md` and `docs/TOOLS-BUILD.md`; this is everything else.

Not unfinished, so not listed: the Steady plan (S1–S4), the structure slices
(B0–B8, bar the walk), the project slices (P1–P4), the journey (J1–J3) and the
lean-page slices 1–7 — all built on `main`. Declined by Rowland and so not
open: the six project-management pieces (17 Oct), the people list, a budget
against spend, OEE and sensors.

**Nothing new is built until Rowland says go** (`docs/DIRECTION.md`). He gave go
for the whole catalogue on 24 October; the items below that are not catalogue
tools still wait for his word.

## 1. Waiting for Rowland — only he can do or decide these

| What | Where it is written |
|---|---|
| Walk the structure on his phone and laptop (no slice is "done" until walked) | `STRUCTURE.md` §18, §20 B8 |
| Use Faultline for real for two or three weeks on his lines and write down every slow, confusing or missing place — this gates "deepen the tools that were used" | `DIRECTION.md`, What comes next |
| Line Talk on a real phone on the floor: how it hears in noise, whether his browser listens at all, how the replies read | `LINE-TALK.md` |
| Video: run the phone check (2-minute and 1-hour) and send the results back; give permissioned footage with hand-timed events (V2); one video study named through the gateway while signed in | `VIDEO.md`, `VIDEO-FEASIBILITY.md` |
| Decisions: a third "materials scrapped" part in the loss count's rejects pounds; the pass-or-fail confidences 90/95/99 (our choices, never put to him one by one); who a line's team is, before a line-level access role; whether J1 on a phone at 8 taps (target 7) and J8 at 13 (target 8) matter; the toolkits' names, whether a toolkit may be his own, a combined paper (W11); whether to revoke the assistant's saved key | `AUDIT.md` 4.6, `GAPS.md`, `UPGRADE-AUDIT.md` S6, `STRUCTURE.md` B8, `TOOLS-BUILD.md` §3 |
| Knowledge to confirm against sources the container cannot fetch (publishers answer 403): ISO 22514, EN 415-11, ISO 7870-2, ISO 2859/3951, BRCGS clauses, the FMEA Action Priority table, emission factors; 152 of 179 method records say "from knowledge". MTM/MOST need a licence | `knowledge/GAPS.md` |

## 2. Promised in a design doc, not built

| What | Evidence it is not built | Where |
|---|---|---|
| **Stops timed** (Capture, Analyse, Pareto, Meeting) has no page shell: no More/Report menu, no Belongs to; its one-page report button still says "Print / save PDF" and uses `window.print()`. None of its screens are on the lean page either | `ReportScreen.tsx:80` | `STRUCTURE.md` §20 B3/B4 "left for B6" |
| Actions rows cannot be edited in place (who, when, done) on the project's or the factory's Actions page | `ActionsScreen.tsx` says "Tap one to change it where it is kept" | `PROJECTS.md` P3 |
| "Make it an action" on a finding, problem or stage that has none | no match in `src` | `PROJECTS.md` P3 |
| Names offered as you type; the factory-wide Actions page's tiles and a filter by line (probably open) | not found in code | `PROJECTS.md` P3, P4 |
| Links from inside a project's own pages (6M Evidence lens, a stage's line standard, the fishbone's "Count a shift") still open the line's list, not the project's | — | `PROJECTS.md` P2 |
| Line Talk slice 3 (propose problems, actions, readings as cards a person adds) and slice 4 (inside a project: punch list, 6M causes, documents) | no commits | `LINE-TALK.md`, `PROJECTS.md` After P4 |
| Video V2 and V4–V7 (SMED from footage, motion inside a cycle, waiting and the constraint, a worker for long footage), count line, zones, several cameras; a video study linked to a product's Line capacity | declared "partly / not yet" in `lib/video/objectives` | `VIDEO.md`, `VIDEO-DESIGN.md` |
| Blueprint Stage 4: the project's own line balance (`pace_ppm.capacity`) moved into the line's capacity; the project's line page folded into the line page; reports still print the project's own line names | `PaceLineRow.capacity` and `ProjectLineScreen.tsx` still exist | `BLUEPRINT.md` §5.8, §6, §7 |
| Blueprint Stage 6: drop the retired cloud tables `pace_snapshots`, `project_targets`, `project_actuals` (0 rows) and their local stores | `db/core.ts` still creates them; no drop migration | `BLUEPRINT.md` §7 |
| The product mix (`lib/ie/mix`) and the NIOSH lifting arithmetic (`lib/ie/ergo`) have no screen, though BLUEPRINT §6 says the mix "says money now" — that sentence is untrue today | no importer outside tests/catalogue | `BLUEPRINT.md` §6; FC-042, FC-207 |
| B7 tint scale: 77 tints and shades in `styles.css` have no token | ratchet at hex 108 / rgba 125 | `STRUCTURE.md` §20 B7d |
| A 6M hold's "standard updated" is a tick, not a link to the line standard or SMED; the 6M status page does not carry what the project waits on | `ProblemCard.tsx:650` | `SIXM.md` Next |
| The capability study's rate Ppk still says "95% sure" while pass-or-fail says "95% confident" (trivial) | `tools/capability/{sample,sampleLean,modes}.ts` | `GAPS.md` |
| Content-Security-Policy is report-only | `vercel.json` | `UPGRADE-AUDIT.md` S9 |
| **Possible defect in a live tool:** the sold-by-weight allowed-shortfall lookup `tneFor` (`tools/capability/sample.ts`) cites Schedule 2 where the table is Schedule 3, stops at 10 kg though the table continues to 15 kg and over, and does not round a percentage allowance up to a tenth of a gram (150 g gives 6.75; the Schedule says 6.8). Found 25 Oct from search excerpts of SI 2006/659 — **to be confirmed against the legislation itself before any change** | `tools/capability/sample.ts`; `knowledge/methods/packaging/average-quantity-system.md` | Research 1, `knowledge/GAPS.md` |
| The lean page is not on: the video study's screen, Line Talk, the line standard page (band verdict only), the lever-tree board, the tools directory, the Projects list | — | not planned anywhere |
| Value-stream cells and the verdict needing a timed-or-typed mark (parked); the old walk screen deletes a video with no Undo (parked) | — | `UPGRADE-AUDIT.md` C12, `AUDIT.md` 2.12 |

## 3. Parked branches (none to be merged without a decision)

- **`claude/faultline-connection-1vx7kt`** — 8 commits not on `main`: the AI method builder's two-pass design, the server re-reading gate passes (`GATE_CHECKS.sql` never applied), the method engine's views, early notes. Parked by decision: the builder was deleted 20 October.
- **`board`** — WIP board (footprints, sizes, icons). Parked.
- **`progaudit`** — its code is on `main` (3cf8ca9); only `docs/PROGRAMS-AUDIT.md`, which `AI-VISION.md` cites, never reached `main`.
- Older branches (`work-cap`, `capacity-fix`, `work-next`, `cap-review`, `hotfix-assist-two-pass` and several `claude/*`) look superseded; four were checked against `main` and their content is there.
- The assist gateway's two-pass version stays deployed unused, and the assistant's key stays saved until Rowland revokes it.

## 4. Documentation that has fallen behind (fix when next touched)

- `LEAN-PAGE.md` slices 4 and 6 say money is "still to come"; it was built 24 October. `BLUEPRINT.md` §6 says the same.
- `CLAUDE.md` "Steady comes next" (S1–S4 are built) and "the 6M report and Problems next" (done).
- "Front door" is gone since 23 October but is still named in `CLAUDE.md`, `knowledge/README.md`, `PAGES.md` and several gate-block lines; `DIRECTION.md` "What was parked" still describes the deleted switch.
- `PLATFORM-STATUS.md` still opens "read this first at the start of every session" though it describes the deleted method builder; `PLATFORM-REVIEW.md`, `AI-VISION.md`, `CAPABILITY-CHECK.md` are history.
- `TOOLS-BUILD.md` intro still counts 167 entries not available (now 132).
- `AUDIT.md` 3.7 says the line report is "Open, planned" (built 23 October). `BUILD.md` says shifts have no breaks (they do). `BLUEPRINT.md` §10 is a 13 October snapshot.
- `PROJECTS.md` "the front door opens the project you were last in" is moot — Home has "Carry on where you were".
