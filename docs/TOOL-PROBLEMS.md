# Problems raised from inside a tool, and held there

**Asked for:** Rowland, 11 November 2026, on a live test at a customer (Cellox) using *Stops across workstations* (FC-241) — *"I'm using a tool, I see
something, and I go, I've got to capture that. So I raise a problem and link it to the tool, because at the moment you can't … inside the tool, you
should be able to raise a problem from inside the tool, because it could be a specific station or a specific place, specific asset, where it's then held
within the tool. Yes, you'll see it on a problem page, of course, and you'll see it on main problems, but it also will be held inside the tool itself."*
*"Yes build it."*

**Status:** slice 1 (Stops across workstations, a workstation at a time) and slice 2 (every tool record, the whole record) built 11 November.

## 1. What this is

From inside any tool record — and, where the tool has parts, from one part of it (a workstation of the stops chart) — a person raises a **problem**:
the same problem as the frame's *Problem* button makes, on the register, on the line's Actions, For you and every paper that lists problems. What is new
is that the problem **remembers the tool record (and part) it came from**, and the record **holds it**: the part's tile counts it, the record lists it under
*Problems raised here*, and the record's paper prints it. A problem raised elsewhere can be **linked** to a record afterwards, from either end.

Placed on `docs/BLUEPRINT.md` §8: **layer** — on the line (a problem; a tool's record); **record it writes** — none new: the problem's own row
(`snags`), a tag in its `linked_obs_ids`; **where it shows** — below (§4); **what it replaces** — nothing (the frame's *Problem* button, *Make it better* on a
project and the attachments sheet stay as they were).

## 2. The model — no new record, no column

`Snag.tools?: ToolLink[]` (`src/snag/toolLink.ts`) — `{ studyId, part?, raised? }`: the tool record, the part (the same target ids the pictures use —
`w03`, `lib/attachments`), and whether it was **raised** there or **linked** afterwards. In the cloud the links ride in the row's existing
`linked_obs_ids` beside the waste tag (`waste:<kind>`) and the waits-for links (`after:<id>`):

| tag | meaning |
|---|---|
| `raised:<studyId>` | raised from the whole record |
| `raised:<studyId>:<part>` | raised from one part of it |
| `study:<studyId>` | linked to the whole record |
| `study:<studyId>:<part>` | linked to one part of it |

`cloud/mappers` adds them going up and takes them out coming down, so `linkedObsIds` (the Pareto's observations) never sees one
(`src/snag/__tests__/toolLink.test.ts` round-trips all four beside `waste:` and `after:`). A study id holds no colon (`lib/ids uid`), so the part is what
follows the first. The tool reads the same list the other way (`problemsOn`) — the two ends cannot disagree.

**Pictures carry over by reference.** Raised from a part, the sheet starts with the part's pictures and clips (its `facts.attach`) already in it — the
same `blobKey`, never a copy (as the factory walk's `file_photo` does); one tapped is taken off before saving.

## 3. The parts

- **`ui/ToolProblems`** — `raiseProblemHere(study, part?)` opens the one problem sheet (`snag/QuickSnag`, `openQuickSnag(undefined, from)`) with the
  record's line and project, the part as the machine (else the study's machine), its pictures, and *Raised from …* said at the top; whose and by when
  are asked on it. `PartProblems` — a part's count, *1 problem open*, red only when one is late or critical and open (with the word); one opens the
  problem in the panel, several scroll to the list. `ToolProblems` — *Problems raised here*, shown only once the record holds one: rows that are doors
  (words; the part; priority · whose · due · where it stands), closed ones kept and said Closed, Unlink with Undo, *Raise a problem here*, *Link a
  problem…* (the line's open problems not held here, never another line's; which part). `toolProblemMenu` — More ▾'s *Raise a problem here* and
  *Link a problem…* on every tool record: `ui/StudyActs` StudyBand adds them for every tool on the study shell, and `ui/Commentary` (every tool's
  notes) draws `ToolProblemsHere` — the list and the Link sheet — under the notes, so a tool needs no code of its own (slice 2). `ToolLinksBlock` — on the problem (its editor on Problems and the panel): *Raised from …* / *Linked to …*,
  each a door to the record (`?part=` scrolls to the part), Unlink with Undo, *Link to a tool record…* (the line's records, then the part).
- **`ui/AttachSheet`** — a part's sheet (Take a photo · Film a clip · Photos or videos · A link) adds *Raise a problem here*.
- **`lib/toolPart`** — `partName`, `partsOf`, `toolPartSaid` ("Stops across workstations — Cellox trial › Sealer"), `raisedFromSaid`, `toolReader`;
  the attachments paper names a part the same way.
- **`lib/report/toolProblemsPaper`** — `problemsTail(study)`: *Problems raised here* under each part's name, hung on the one tail every tool's paper
  ends with (`studiesPdf notesTail`, before the pictures), so no tool needs paper code of its own; `preloadToolProblems()` reads the problems before
  the paper is poured (`drawStudies`, the line report, the area report).

## 4. Where it shows (CLAUDE.md rule 5)

| place | how |
|---|---|
| the tool's page | a part's tile counts its problems (a door); *Problems raised here* near the notes; More ▾ › Raise a problem here · Link a problem… |
| a part's pictures sheet | *Raise a problem here* |
| the tool's paper (and so the line report's and the area report's section for it) | *Problems raised here*, a part at a time |
| Problems — the register's row | *Raised from …* / *Linked to …* under its words |
| Problems — one open, its editor; the problem in the panel | TOOL RECORDS — each link a door, Unlink, Link to a tool record… |
| the Problems report | *Raised from …* in the row's notes |
| a problem's card | a TOOL RECORD block |
| the line's Actions, its Gantt, For you, Today | the problem as any problem (it is one) — no word of the tool yet (§6) |

## 5. Who may

Every control that writes — Raise, Link, Unlink, Link to a tool record — shows only to somebody who may change the work (`useAccess(projectId)` `can.edit`
on a project's record; the problem sheet refuses a project this person may only read, as it always has). A client sees the counts, the list and the
links, and takes the paper.

## 6. Left for later

- The line's Actions row and its Gantt bar, For you and Today do not yet say *Raised from …* (the panel they open does).
- Parts on tools other than the stops chart: a station of Line capacity, a person of the line balance, a step of the process flow chart — when their
  parts get the pictures button (docs/ATTACHMENTS.md A3), they take *Raise a problem here* from the same sheet with no more code.
- A seeded record holding a problem, so the page inventory checks the list on every gate (it is checked by `tool-problems.mjs` meanwhile).

## 7. Proof

`src/snag/__tests__/toolLink.test.ts` (the tags, the round trip, the list), `src/lib/report/__tests__/toolProblemsPaper.test.ts` (the tail), and
`scripts/acceptance/tool-problems.mjs` (raised on the Sealer with its photo, held, linked both ways, unlinked with Undo, after a reload, on paper and on
the Problems report, a client, the phone; slice 2 on a capability study).
