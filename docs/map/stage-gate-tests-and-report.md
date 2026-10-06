# Stage gate, part 2 — the tests, the fixes, the record and the report

The map of the Commission gate and what hangs off it on a stage-gate job (the
project type stored as `commissioning`, never shown under that name): the
tests, one test/fix/step, its card, the fixes, the line standard, and the
client report. Read from the code, then confirmed by driving every control in
Chromium at 390×844 (touch) and 1366×900 with the seeded job
(`src/dev/seed.ts`), 3 October 2026.

Conventions: `P` is the project id; "record" names the TypeScript type and
the `src/db` module that owns the store. "Control room" is Home
(`ui/JobsBoard.tsx`) and the project page (`screens/ProjectDashboardScreen.tsx`).

## One record, three faces

Everything on these screens is read off ONE table, `tests` (`lib/testing.ts`
`Test`, `db/testing.ts`), and the lines under it, `test_items` (`TestItem`).
A row's `kind` says which face it wears:

| kind | screen that lists it | words (`WORDS` / `wordsOf`) | settled when |
|---|---|---|---|
| `test` (absent) | Commission `/testing` | Test · Passes if · What happened · Done with | any outcome, or a day/result with no verdict (`hasRun`) |
| `fix` | Fixes `/fixes` | Fix · The problem · The end result · Who is doing it | `passed` only ("Didn't fix it" stays on the list) |
| `install` (+ `gate`) | Install / Set up / Hand over (other agent) | Install step / Set-up step / Hand-over item · Done means · What was done | `passed` only |

`fromTestId` is the loop: a re-test follows a test; a fix is FOR the test or
step above it (`testOfFix`, `rootTestOf`). `needsVerdict` (a day or a result
and still `planned`) is what every "needs a verdict" strip asks about. There
is no status field anywhere to disagree with these.

---

## 1 · Commission — `#/project/P/testing` (`screens/TestsScreen.tsx`)

**The sentence it lets the site say to the OEM:** *"These are the tests we
agreed, this is what each one did against what it was meant to do, and this
is the next one."*

Reads: `Test` (tests only, via `useTesting`), `TestItem` (counts), `Asset`
(machine names, `db/testing listAssets`), `Project` (handover dates,
`db/projects`), `lib/standing.ts` for the peers' counts. Writes: `Project.plannedAt`
/ `expectedAt` (`updateProject`), new `Test` rows (`planTest`), a verdict
(`patchTest`).

Control room: the project page's Verdict card (`lib/standing` sentence,
"N of M tests have run"), the "Where each machine is" fold (Commission tile
per machine, `lib/install journeyOf`), "What we're waiting on" row *Tests
still to run*, Home's job rows (late/due items link straight to
`/testing/<id>`). Report: client report section **Commission** (every test,
its expectation, result and verdict pill; `lib/clientReport.ts`,
`lib/clientReportPdf.ts`), and the Gantt's COMMISSION lane.

Controls, top to bottom:

| control | does |
|---|---|
| Spine `‹ Line 2 commissioning` / crumbs `Projects › job › Commission` | up one level / each crumb navigates (`ui/Crumbs`) |
| Peers row `Install · Set up · Commission · Hand over · Fixes · Materials` (+ open counts, red when late) | sideways to each gate's screen (`ui/Peers projectPeers`) |
| header `N of M passed` · `k didn't pass` · `k didn't run` | the latest attempt of each test (`latestAttempts`) — the same count the report prints |
| `Handover 30 Oct · 4 weeks to go` / `No handover date yet` | read off `Project.expectedAt` |
| `Dates` ↔ `Done` link | opens the two handover boxes |
| ↳ `Handover agreed — never moves` (date) | writes `Project.plannedAt` on change |
| ↳ `Handover now expected` (`ui/DateWhy`) | writes `expectedAt`; moved LATER it asks *Why has it moved?* (`ui/WhyMoved`): quick reasons, What happened, Evidence, `Save the move` (keeps the reason as a `TestItem` under `job:handover`, one Undo), `Just change the date — no reason`, `Cancel — keep the dates`. Earlier: written at once |
| `No machines named yet — add them on Install` (only with no assets) | `/install` |
| **Needs a verdict** strip (`ui/Verdicts`) — for every test with a day/result and no verdict: title (opens the test), `Did it pass?`, `Passed · Didn't pass · Didn't run` | `patchTest({outcome, ranOn: ranOn ?? today})`; toast with `Undo` puts it back to planned |
| **Next up** rows (whole row is the button; first is outlined, late is red `WAS …`) | open `/testing/<id>` |
| `+ Plan a test` → form | `What do we plan to do?` input; machine chips (multi) + `The line itself`; `Plan it` / `Plan N tests` makes one test per machine, `withWhom` pre-filled from the machine's OEM, and opens the first; `Cancel` |
| **Tests so far** rows (newest first; mark: green tick / red cross / amber ring for didn't run; `k written down · k fixes, k still to do · k pictures`) | open `/testing/<id>` |

Phone: `tw-next`/`tw-row` are 109–149px full-width buttons; the peers row
scrolls sideways. `Plan a test` (`.cw-add`) measured 42px — raised to 44
(this pass). The peers (42px) and the spine's back pill (34px) are shared
with every screen in the app — see findings.

`MachineCard` and `AddAsset` are exported from this file but mounted on
Install (other agent's area).

---

## 2 · One test / fix / step — `#/project/P/testing/<id>` (`screens/TestScreen.tsx`)

**The sentence:** *"This is what we planned, this is what actually happened
on the day, this is what we saw, and this is what we are doing about it —
and who owes it by when."*

Reads/writes: the `Test` row (`patchTest` — every write reads the row
first), its `TestItem`s (`found`, `note`), `Asset`s, `Program`s
(`lib/usePrograms`, only to offer the Program box), blobs (`db/blobs`) for
photos and files, walk frames (`db/walk framesForProject`) for pins.

Control room: the same places as the list; a fix's dot on its walk frame
(`snag/AssetScreen`). Report: client report Commission rows (test), **Fixes**
section with its frame-with-dot or first photo (fix); the Gantt lane with
`> Fix:` sub-rows; the card PDF (below). The `note` items are never printed.

| control | does |
|---|---|
| Crumbs: `… › Commission › title` (test) · `… › Fixes › title` (fix) · `… › Install/Set up/Hand over › title` (step) | the spine leads back to the list the face belongs to |
| header: title, `outcomeWord` (`No verdict yet` when owed), ran-on day, `follows "…"` (test) / `for "…"` (fix) | the links open that record |
| `Say how the test went` / `Say the fix` / `Say how it went` (`ui/Voice VoiceNote`) | records, sends to the voice API; what adds is put straight in (glows, one Undo); what would replace is asked (`VoiceReview`, `Change it`). No mic: *"The microphone is blocked…"* |
| `Test card` / `Fix card` / `Install step card` (primary) | `/testing/<id>/card` |
| `Plan the re-test` (test only) | `nextFrom`: new test carrying machine, product, expectation, `fromTestId`; opens it |
| `Back to Install — <machine>` (step) / `Back to the test — <title>` (fix) | the gate screen / the test |
| **1 · What we planned** (folded to one line + `Edit` once it has run) | |
| ↳ `What we plan to do` / `What we are fixing` (`ui/Draft DraftField`) | title, written on blur/Enter, Escape abandons |
| ↳ `Which test is it for?` / `What is it for?` select (fix only; Tests + Install/Set up/Hand over steps optgroups, `Not from a test…`) | `fromTestId` — a fix is re-pointed, not re-made |
| ↳ `Machine` select (`The line itself` + machines) | `assetId` |
| ↳ `Program` select (only when the job has programs) | `programId` |
| ↳ `Planned from` · `Last day if more than one` | `plannedFor`/`plannedTo`; a last day before the first is dropped; the finish pushed LATER on a record that has not run asks `WhyMoved` (reason kept as a `found` item with movedFrom/To, optional `Book it in as a fix`, knock-on `Move what follows on this machine`, one Undo) |
| ↳ `Done with` / `Who is doing it` (`DraftField`) | `withWhom` |
| ↳ `Product we plan to run` (test only) | `planned` |
| ↳ `Passes if — the expectation` / `The problem` / `Done means` (`DraftArea`, grows) | `passesIf` |
| **On the line** (fix only; `ui/OnTheLine`) | `📍 Pin it on the line` → sheet of walk frames → `PinImage` tap → `Pin it here` / `‹ Another frame`; pinned: frame with dot (tap → `/w/ws/asset/frame`), `Open on the walk ›`, `Move it`, `Take it off`; no frames: *Film the line on Install…* `Install ›` |
| **2 · What actually happened / What was done** (folded + `Edit` once there is a verdict) | |
| ↳ `Product we ran` (test) · `On the day` · `Last day` · `What happened` / `The end result` (`DraftArea` 5 rows) | `product`, `ranOn`, `ranTo`, `result` |
| ↳ `Did it pass?` / `Did it fix it?` / `Is it done?` + segment `Passed · Didn't pass · Didn't run · Still planned` (fix: `Fixed · Didn't fix it · Didn't happen`; step: `Done · Hit a problem · Didn't happen`) | `outcome`; stamps `ranOn` with today if empty; `Still planned` reads `No verdict yet` when a day/result exists |
| ↳ **Evidence** (`ui/EvidenceDoors`): count, grid of thumbs, `📷 Camera` (lens, `capture`), `🎥 Video` (`ui/VideoRecorder`, says so when no camera), `🖼 On the phone` (gallery, several) | appends `MediaRef`s to `test.media` via `lib/media` (sniffed, transcoded, thumbnail) |
| **3 · What we found on the day / doing it** (observations; hidden on a fix with none) | `k written down`; note *Anything that needs doing is a fix … against this test/step* |
| ↳ row (`tw-item-m`, whole row) → edit panel: `OnTheLine` (quiet), `What`, `Whose`, Evidence doors, `Delete`, `Close` | `TestItem` writes; a row shows `· fix: <title>` when it became one, `· 📍 on the line` when pinned; thumbnails shown shut |
| ↳ `What did you see?` / `What was the problem?` + `Add` | `addItem(kind 'found')` |
| **For the meeting** (`note` items, private) | tick = raised / not raised; `k to raise` / `all raised`; `Add` |
| **4 · Fixes for this test / step** | rows (Fix / Re-test tag, who, day, outcome) open the record; `+ Add a fix for this test` → `/fixes?for=<id>` with the test picked. No add-in-place on purpose |
| **Files** (`DocRef`s): `PDF <name> <size>` (opens via `lib/savePdf deliverBlob` — share sheet, download or new tab), `Remove` (Undo), `+ Attach a PDF` (hidden file input, several) | `test.docs`; bytes in the blob store |
| `Delete this test / fix / install step` | confirm names what goes (observations) and what stays (records that came out of it); `deleteTest` tombstones row, items and blobs; Undo bar restores all; lands on the face's list |
| Evidence viewer (`ui/Evidence EvidenceViewer`): `✕`, `Remove` | off the test or the observation it was on, blobs deleted; Undo puts both back |
| `?problem=1` (from Install's *Hit a problem — write it up*) | opens with the cursor in the problems box |
| Dead end `/testing/no-such-test` | *That test isn't here any more* + `Back to the tests` + `All projects`, spine kept |

Phone: every block is full width; the plan and the day fold to one tappable
line once the day has happened so what happened is above the fold; the voice
button leads. Draft fields write a beat after the last keystroke and when
the tab is hidden (`ui/Draft`), so pocketing the phone keeps what was typed.
Checked: no write per keystroke in the prose boxes (updatedAt unchanged while
typing; written on blur).

---

## 3 · The card — `#/project/P/testing/<id>/card` (`screens/TrialCardScreen.tsx`, `lib/trialCard.ts`, `lib/trialCardPdf.ts`)

**The sentence:** *"Here is the whole of that day on one page you can send to
the people who were there, or should have been."* The screen is the PDF read
before it is sent (Rowland: "I can't view it").

Reads: `trialCard(test, tests, items, assets)` — pure, tested
(`lib/__tests__/trialCard.test.ts`). Writes nothing. Control room: none of its
own — it is the test's page on paper. Report: the card IS the document; the
client report lifts the fundamentals of the same record.

| control | does |
|---|---|
| Crumbs `… › gate › title › Test card` | the title crumb goes back to the record |
| `PDF` (top and foot; `Building…` while drawing) | `drawTrialCard` → A4 landscape → `deliverPdf` (share / download / new tab); says `Sent.` / `Downloaded.` / `Opened in a new tab.`; a stale-build failure offers `Reload` |
| thumbnails in **5 · Pictures** | viewer (no Remove here — that is the record's page) |
| Dead end `/testing/no-such/card` | now the same dead end as the test's page (this pass) |

What the card prints, and which screen's record each part comes from:

| PDF part | from |
|---|---|
| band: `TEST/FIX/INSTALL STEP CARD`, project, built-at, title, machine · with · day, verdict pill (green/red/amber/blue) | `Test.title/assetId/withWhom/ranOn|plannedFor/outcome` |
| **1 What we planned / are fixing / are installing**: expectation (or `Nothing agreed in advance` / `The problem was not written down` / `Nothing written down for what done means`), product planned (test), `Planned for <window>` | `passesIf`, `planned`, `plannedFor–plannedTo` |
| **2 What actually happened / What was done**: `verdictLine` (result · `— no verdict yet` · `The day came and it did not happen`), product ran (test), `Ran <window>` / `Not run yet` | `result`, `product ?? planned`, `ranOn–ranTo`, `outcome` |
| **Where this sits**: `follows "…"` · `led to "…", "…"` | `fromTestId` both ways |
| **3 What we found** table: WHAT WE SAW · WHOSE · WHAT IT BECAME (`k filmed` under whose) — paginates, never truncates | `TestItem kind 'found'` (+ `becameTestId` → fix title, or `Not a problem` for an old decided one) |
| **4 What we do next**: WHAT · WHOSE · BY WHEN (red `WAS …` when past) · WHERE IT CAME FROM (`agreed on the day` / `an observation` / `became the next test` · `done`) | the `Test` rows whose `fromTestId` is this one (fixes and the re-test) |
| **5 Pictures from the day / The problem, and it fixed / How it was left**: up to six, first the record's own then the observations' | `test.media` + items' `media` via `lib/testReport shotsFor` |
| foot: project · lead, `n of m` | `Project` |

Checked against the screen section by section (seal test, a fix, the air
step): the same words, counts and order. One paper fault found and fixed —
see findings (the `k filmed` line printed through the next row).

---

## 4 · Fixes — `#/project/P/fixes` (`screens/FixesScreen.tsx`, `lib/fixTone.ts`)

**The sentence:** *"Here is everything that has to be put right, who is on
it, which test it came out of, and which are late."* The only door a fix
comes in by.

Reads: `Test` (`kind: 'fix'`), tests and steps to pick from, `Asset`s,
`lib/standing` counts. Writes: new fixes (`planTest(…, 'fix', fromTestId)`),
verdicts (`patchTest`). Control room: Verdict card sentence counts fixes;
"What we're waiting on" row *Fixes still to do* (`Fixes ›`); Home's job rows;
the Fixes peer badge. Report: client report **Fixes** (open first, late at
the top, with a picture; done listed under), the Gantt `> Fix:` sub-rows, the
*Fixes still to do* row of *What we're waiting on*.

| control | does |
|---|---|
| Crumbs, Peers | as above |
| header `N still to do · k late · k done` / `Nothing outstanding — k done` / `Nothing on the list yet` | `standing(fixes)` |
| key `Late · Due within 3 days · Planned · Done` (only when there are fixes) | the four colours of `fixTone` — red / amber / indigo / green |
| **Needs a verdict** strip: `Did it fix it?` → `Fixed · Didn't fix it · Didn't happen` | `patchTest`, Undo |
| `+ Plan a fix` → form: `What are we fixing?`, `Which test is it for?` / `What is it for?` select (`#fix-for`; tests newest first, steps by gate with their machine), machine chips (follow the test picked until touched) + `The line itself`, `Plan it` / `Plan N fixes`, `Cancel` | one fix per machine, `fromTestId`, `withWhom` from the machine's OEM; opens the first |
| `Say a fix` (voice) → `VoiceReview` `Plan it` | makes the fix from the ticked parts |
| `?for=<id>` | opens the form with that test or step picked |
| **Still to do** boxes (`fx-box`, whole box; top line = `fixTone.when`: `Late · was 20 Sept` / `Due today` / `Due tomorrow · 4 Oct` / `Due in 3 days · 6 Oct` / the window / `No date yet`; machine; title; `Problem …`; who / `Nobody yet`; `For "…"` / `Not from a test`; `k pictures`) | open `/testing/<id>` |
| **Done** boxes (green wash, result instead of problem) | open the fix |
| foot note `… The next one is wanted by <day>` | read off the soonest open fix |
| Dead ends | gone project says so |

Phone: boxes stack full width (150px tall), key wraps, `Say a fix` sits beside
`Plan a fix`.

---

## 5 · Line standard — `#/project/P/standard` and `/standard/<id>` (`screens/StandardScreen.tsx`, `lib/standard.ts`, `lib/standardCard.ts`, `lib/standardPdf.ts`, `ui/StandardsCard.tsx`, `db/standards.ts`)

**The sentence:** *"On this product, this is where each person stands and
what they do — put it up at the line."* A TOOL used inside the Hand over
gate on a stage-gate job (People / Lines on the other methods), never a
method.

Reads/writes: `Standard` (`standards` store: product, programId, photoKey,
marks[]), blobs for the picture, walk frames (`framesForProject`), `Program`s
to offer products. Control room: the Hand over screen's **Line standard**
strip (`ui/StandardsCard`: `Open ›` / `Make the first map ›`, one button per
map) and the project page's same strip; the project page's *On paper* sheet
(`ui/ReportsSheet`) has a `Line standard` door. Report: the client report's
last pages — one A4 landscape card per product (`drawStandards`), switchable
with the report's checkbox; and its own PDF.

Products page:

| control | does |
|---|---|
| Crumbs `… › Hand over › Line standard` (stage gate) / `… › Lines › Line standard` | spine up to the gate |
| `PDF (all products)` (only with maps) → PrintSheet | cards drawn as pictures first (`cardImage`), `PDF` (`deliverPdf`), `Print` (desk only, new tab), `A4 landscape · one page / N pages, one a product` |
| `New map` / `Make the first map` → `Which product?` sheet | program buttons (`From this job's programs`, those not yet mapped) or `The product` typed + `Make the map`; a new map starts from the last one's picture; opens it |
| product card (`ls-card`: picture with dots/shapes, name, `k people · k pallets …`) | opens the map |
| empty state `No maps yet. Start with the product you run most.` | |

Map editor (`/standard/<id>`):

| control | does |
|---|---|
| Crumbs `… › Line standard › product` | |
| eyebrow `Line standard · k people`; product name input (datalist of programs) | renamed on blur |
| `PDF` → PrintSheet for this map · `Copy to another product` → sheet (program buttons / typed + `Copy`) | `copyFor`: same picture and places, new ids; opens the copy |
| toolbar (`role=toolbar`): `↖ Select` · Rectangle · Square · Circle · Triangle · Arrow · Text · `Person` · (the chosen icon) · `＋ Icons` | the tool; the line under says what a tap or drag will do |
| `Icons` sheet: People · Materials & kit · Machines · Quality & safety (46 icons) | pick → tool |
| board: tap places a person (`Op n`, the lowest free number) or the icon and opens its sheet; drag moves (written on pointer-up); shape tool: drag draws, tap drops a default size; Select: tap selects (handles), tap again opens; corner handle resizes, arrow ends move | `marks[]` written on each change |
| mark sheet (person/icon): `Role`, `What they do`, `Done`, `Take it off` | |
| shape sheet: `Name it` / `The words`, `Colour` (Machine · Structure · Materials · Zone · Hazard), `Done`, `＋ Add an operator here` (person to its right, task `On <name>`), `Delete` | |
| `Add a picture of the line — or draw it with shapes` / `Change the picture` → sheet: `📷 Take or choose a photo`, `Or a frame from the filmed walk` thumbnails, `Use a plain board and draw it instead` | `photoKey` |
| side **Who does what**: `k people on this product`, kit line, per person `Role` input + `What they do` textarea (written on blur) | |
| `Delete this map` | confirm; `deleteStandard` (picture kept — a copy may share it); Undo bar; lands on the products |
| Stale `/standard/no-such` | falls silently to the products list — see findings |

What the card/PDF prints (`renderCard`): band `LINE STANDARD`, product,
project · printed; headcount disc (counted off the people, never typed); the
picture or a 16:9 grid with every shape then every icon and its pill label;
**WHO DOES WHAT** numbered (`and k more on the map` when it runs out);
**AT THE LINE** kit counts (six kinds at most); the note; `Agreed by ____
Date ____ · Faultline`. The preview on screen is the same JPEG.

Phone: the board is full width (16:9 when blank), the side panel drops under
it; toolbar scrolls sideways; sheets are bottom sheets. Checked: role/task
typing does not write per keystroke; one real fault found and fixed (first
letters lost when typing straight after leaving the role box — findings).

---

## 6 · Client report — `#/project/P/report` (`screens/ClientReportScreen.tsx`, `lib/clientReport.ts`, `lib/clientReportPdf.ts`)

**The sentence:** *"Here is the whole job in the order it is run — where it
is, each gate, the plan, what is broken and who owes what — drawn from what
we keep, nothing typed for it."* The lead to the client.

Reads: `Project`(s), `Asset`, `Test` (all faces), `TestItem` (found; never
notes), `Material`, `Program`, `Standard`, `WalkSnag`; `lib/standing`,
`lib/install` (journey, grids), `lib/fixTone`, `lib/gantt` + `lib/ganttPdf`,
`lib/story moveLines`. Writes nothing. Control room: the project page's *On
paper* sheet `Client report` door; the Verdict card header quotes its purpose.

| control | does |
|---|---|
| Crumbs `… › Client report` | |
| `PDF` (`Making it…`) | `buildPdf` → `deliverPdf` (`<Job>-client-report-<date>.pdf`); failure → alert |
| `Include the line standard — k products, a page each` checkbox (only with maps) | adds/removes the standard pages and the contents line; preview redrawn |
| contents list (1 Where the job is … 9 Line standard), each line saying what that part says | read-only (the same strings the PDF prints) |
| desk ≥900px: the PDF itself in an iframe, redrawn when the data changes | |

What it prints, and where each part comes from:

| page / part | from |
|---|---|
| **1 Where the job is**: name, `Led by`, printed, `Handover expected … · agreed …`; ARE WE ON TARGET? box (Behind target red / At risk amber / On target green / grey, with its reason in words); dark band with the standing sentence | `Project`, `lib/onTarget stageGateOnTarget`, `lib/standing sentence` |
| THE FOUR GATES tiles (done green wash / under way indigo / late red / a problem amber / ahead / nothing kept), each saying `k of n done · k late · k a problem · k not added yet` | `lib/install jobJourney` + the gate sections' `says` (`lateOrProblem`) |
| WHERE EACH MACHINE IS: pills per gate + AT | `journeyOf`, `journeyNow` (Install gate's machine cards) |
| **Install · Set up · Hand over** sections: the grid (machines down, the job's stages across, a cell per step: late heavy red — its day gone or hours lost, a problem that lost no time solid amber, waiting on a verdict amber wash, still to do, done green, not on this machine dashed) + key; `Late` bullets (with the hours lost) and `A problem — no time lost` bullets; Set up adds `Programs — k of n proved` and the ones not yet | `installGrid`/`usualStages` over `kind:'install'` rows; `Program`s (`lib/programs stateOf`) |
| **Commission** section: every test (planned order): title, `Passes if`, `Result`, machine · day, pill (`Passed` / `Didn't pass` / `Didn't run` / `No verdict yet` / `planned`) | `Test kind 'test'` — the counts are the latest attempt of each (a passed re-test clears a failure) |
| **The plan** (A4 landscape, one or more pages): the Gantt the project page draws — lanes MACHINES ARRIVING · INSTALL · SET UP · COMMISSION · HAND OVER · materials · programs · found on the walk; `> Fix:` sub-rows; today; `Agreed` and `Handover` lines; key; `Why the plan moved` lines | `lib/standing plan` (notes filtered out), `lib/gantt`, `lib/story moveLines` |
| **Fixes**: open (late · didn't run · soon · ahead by colour bar), problem, `when`, machine · who, picture (frame with the dot, else first photo) · **Done** list | `Test kind 'fix'`, `fixTone`, `lib/testReport pinShot/shotsFor` |
| **What we're waiting on**: OPEN · LATE · MOSTLY WHOSE per strand | `lib/standing rows` (the project page's Outstanding fold) |
| **Line standard**: one card page per product | `lib/standardPdf` |
| foot of every portrait page and the plan: `job · client report · date`, `n of m` | |

Checked against the screen: the contents list and the PDF say the same
numbers (gate lines, `4 open · 0 done`, the waiting strands, the standard).
With the checkbox off the PDF is 5 pages, on 6. The arrow in "Changeover 2kg
→ 1.25kg" prints as "to" (`reportKit san`).

---

## The documents, in one place

| document | drawn by | from | door |
|---|---|---|---|
| Test / Fix / Install step card (A4 landscape) | `lib/trialCardPdf drawTrialCard` | `lib/trialCard` | `/testing/<id>/card` `PDF` |
| Client report (A4 portrait + landscape plan + standard pages) | `lib/clientReportPdf drawClientReport` | `lib/clientReport` | `/report` `PDF`, *On paper* sheet |
| Line standard card (A4 landscape per product) | `lib/standardCard renderCard` → `lib/standardPdf drawStandards` | `Standard` | `/standard` `PDF (all products)`, a map's `PDF`, inside the client report |
| Spreadsheet (every project) | `lib/exportWorkbook exportSheets` via `lib/exportAll exportEverything` | tests, items, materials, programs, walks | *On paper* → `Spreadsheet` |
| File names | `lib/fileName pdfFileName` — `<Job>-<what>-<YYYY-MM-DD>.pdf` | | |
| Delivery | `lib/savePdf deliverPdf/deliverBlob` — share sheet first, then download, then a new tab; `loadPdfLib` fetched when a PDF screen opens; `isStaleBuildError` → `Reload` | | |

The A3 **testing** sheet (`lib/testReport buildTestReport/drawTestReport/saveTestReport`) is
still in the repo but nothing calls it — see findings. Its `shotsFor`,
`shotKey`, `pinShot`, `resolveShots` are what the cards and the client report
use for pictures.

## The modules behind the area

| module | one line |
|---|---|
| `lib/testing.ts` | the one record and its three faces: types, words per face, `needsVerdict`, `isSettled`, `isOverdue`, `latestAttempts`, `standing`, `nextFrom`, `testOfFix` |
| `lib/useTesting.ts` | the hook: assets, tests, items, `planTest`, `planSteps`, `patchTest`, `planNextFrom`, items, undo-aware removes; `useAssets` for screens that only want machines |
| `db/testing.ts` | the stores `commission_assets`, `tests`, `test_items`; every delete returns its undo; `patchTest` reads the row it changes |
| `lib/trialCard.ts` | one trial read whole, `verdictLine`, `headlineNext` |
| `lib/trialCardPdf.ts` | the card on paper; paginates, never truncates; `findingRowHeight` |
| `lib/testReport.ts` | the pictures for every PDF (`shotsFor`, `pinShot`); the uncalled A3 testing sheet |
| `lib/fixTone.ts` | the colour and words a fix wears, `DUE_SOON_DAYS = 3` — Fixes screen, walk frame, client report |
| `lib/clientReport.ts` / `lib/clientReportPdf.ts` | the stage-gate report: shape, then drawing |
| `lib/standard.ts` / `lib/standardCard.ts` / `lib/standardPdf.ts` / `db/standards.ts` / `ui/StandardsCard.tsx` | the line standard: icons, shapes, marks, headcount, copy; the card as a picture; the pages; the store; the Hand over strip |
| `lib/reportKit.ts` | PDF primitives: palette, `san` (WinAnsi — arrows → "to", control characters dropped, newlines collapsed), `fit`, `panel`, `table`, `wash` |
| `lib/savePdf.ts`, `lib/fileName.ts`, `lib/exportAll.ts`, `lib/exportWorkbook.ts` | getting a document out; one name for every PDF; the spreadsheet |
| `lib/proof.ts` | the line study's proof arithmetic (Welch t, receipts) — not used by any stage-gate screen; it belongs to the Case page |
| `ui/Evidence.tsx` / `ui/EvidenceDoors.tsx` | thumbnail + viewer; the Camera · Video · On the phone block |
| `ui/StudySetupSheet.tsx` | the line study's set-up sheet — opens from Capture/Analyse, not from any screen here |
| `ui/Verdicts.tsx`, `ui/OnTheLine.tsx`, `ui/WhyMoved.tsx`, `ui/DateWhy.tsx`, `ui/Draft.tsx`, `ui/Peers.tsx`, `ui/Crumbs.tsx`, `ui/Sheet.tsx`, `ui/Undo.tsx`, `ui/Voice.tsx` | the asking strip; the pin; why it moved; dates that ask; drafts that write on blur; sideways and up; bottom sheets; one Undo bar; the mic |

## Where the three questions have no answer

Which change, which record, where in the control room and the report:

- **`lib/testReport.ts` A3 testing sheet** — reads the tests, but no screen
  opens it since the trial card and the client report took its job. A
  document nobody can reach. Recommend deleting the drawer (keep the picture
  helpers) — a removal, so the lead's call.
- **`lib/proof.ts`, `ui/StudySetupSheet.tsx`** — line-study tools; listed in
  this brief but nothing on a stage-gate screen reads or opens them. Not part
  of this change; no action.
- **The line standard in the spreadsheet** — `exportEverything` carries
  tests, fixes, materials, programs and walks; a map is a picture and is not
  in the workbook. It reaches the client report and its own PDF, so it is
  not a bolt-on; noted because the *Spreadsheet* door says "everything".
- **`For the meeting` notes on a test** — read and written here, printed
  nowhere by design (private preparation). They reach the control room
  through `ProjectReminders` on the project page and the Notes screen.
- **A decided observation (`doneAt` → "Not a problem")** — the card and the
  PDF print it; the test screen's row shows nothing for it. A survival from
  before fixes moved to their own screen; screen and paper disagree by one
  word on old data only.
