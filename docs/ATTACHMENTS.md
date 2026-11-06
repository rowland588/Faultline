# Pictures, videos and links on every tool

**Asked for:** Rowland, 6 November 2026 — *"Stops across Workstation: add ability to put pictures and videos to any work station. Ensure they are on the
report; if video, create URL links. It's actually something we need to add across the app — URL links and the ability to add videos and pictures across
all of the tools. Plan to do this, but do the stop workstation first. Also on the app, if a video is there you can't see any image or even the classic
play arrow — all we have is a very slight line box. Make videos visual on the app."**
**Status:** A0 (videos seen) and A1 (workstations of the stops chart) built 6 November; A2 onward planned below.

## 1. What this is

One way, on every tool, to put **a picture, a video or a link** on the thing the tool is about — the whole record or a **part** of it (a workstation, a
station, a step) — and to have it **on the report**. Pictures print whole with their caption. A video cannot be printed, so it prints as what it is: its
first frame, its name and a **real link in the PDF that opens it in Faultline**. A link prints as its address, also clickable.

Placed on `docs/BLUEPRINT.md` §8: **layer** — on the line (a tool's record); **record it writes** — none new: the study's own `facts.attach`; **where it shows** —
the tool's page (the part's button and sheet), the tool's paper, the line report and the full package, the project report; **what it replaces** — nothing
(the document tool's photos, a problem's media and the test media stay as they are and are named below).

## 2. The model (one list, every tool)

`facts.attach: Attachment[]` on the study — `lib/attachments`:

| field | meaning |
|---|---|
| `id`, `at`, `by` | an id-keyed list merged across devices like every list of facts; the person and the time |
| `kind` | `photo` · `video` · `link` |
| `target` | the part it is about (`w03`, a tool-specific id); absent = the whole record |
| `blobKey`, `thumbKey`, `mime` | photo/video: the file in the media store and its small picture (a video's first frame) |
| `url`, `title` | link: an `http(s)` address (never `javascript:`/`file:`), what to call it |
| `caption` | what it shows — printed with it |
| `struck` | removed (kept, never erased; Undo brings it back) |

No column and no new noun. The cloud's bucket takes a file only once a row names it — `supabase/ATTACHMENTS.sql` (applied and read back 6 November)
widens `faultline_can_see_media` by the one clause for `facts.attach`; `cloud/mappers` names the keys.

## 3. The parts (each built once, used by every tool)

- **`ui/AttachSheet`** — `AttachButton` (a few small pictures and a count, on a part) opening the sheet: *Take a photo* · *Photos or videos* · *A link*, a caption for each,
  *Take off* with Undo, *Copy link* on a video, the viewer for a photo or clip. `?media=<id>` on a tool's own address opens that attachment — what a video on
  paper links to. Reads `can.edit`: a reader sees what is there and cannot add or remove.
- **`lib/report/attachPaper`** — `attachTail(study)`: *Pictures, videos and links*, each part under its own name; hung on the one tail every tool's paper
  already has (`notesTail`), so a tool needs **no paper code of its own**. `preloadAttachPictures` reads the pictures before a paper is poured
  (`drawStudies`, the line report, the full package do).
- **`lib/videoPoster` + `ui/Evidence`** — a clip's first frame is made when it is saved and, once, for a clip saved before; the tile draws it with a **solid
  play disc** (the old arrow was an outline a hair thick, white on a pale tile — invisible). This fixes every list of evidence in the app at once
  (problems, tests, fixes, the line walk), not only the new sheet.

## 4. What the paper says for a video (and its honest limit)

`https://<app>/#/calc/workstation-stops/<id>?media=<id>` — a link to the **record with the clip asked for**. The reader signs in to Faultline as for any
record (the bucket is private; no clip is public). The paper says so under the link. A public, expiring "share a link" for a clip exists for tests
(`ui/ShareLink`) and is the natural next step for a paper that goes outside the factory — **not built here**; the choice is Rowland's (it makes a clip
reachable by anyone holding the link).

## 5. The slices

| slice | what | proof |
|---|---|---|
| **A0** | videos *seen* everywhere evidence tiles are drawn: poster at save, poster for old clips, a solid play disc | `workstation-media.mjs` (4); `ratchet` |
| **A1** | the shared model, sheet, paper tail and cloud rule — put to work on **each workstation of Stops across workstations** (FC-241) | `attachments.test.ts`; `workstation-media.mjs`; spec `FC-241-workstation-media.md` |
| **A2** | the **whole-record** sheet (a *Pictures, videos and links* row under every tool's page header, More ▾ › Add pictures…) for every tool built on the study shell: calculators, documents' extra, capability, control chart, analysis, reliability, SMED, loss count, work sampling, value stream, checks | one table-driven acceptance script over every tool the seed holds a record of (as `tool-notes.mjs` does for notes) |
| **A3** | **parts** on the tools that have them: a station of Line capacity, a person of the line balance, a step of the process flow chart and the value stream, a check on a log, a test of a program | per tool, in its acceptance script |
| **A4** | the **line report, the full package and the project report** carry them (the tail is in; each report's own composition is checked against its script); `Copy link` for a public expiring link on a paper that leaves the factory (Rowland's choice, §4) | `line-report.mjs`, `line-package.mjs`, `method-report.mjs` |
| **A5** | **Line Talk**: a talk's photos already travel with it; a flow-diagram/spaghetti draft can take a picture or clip per step with the same sheet | `talk-toolsets.mjs` |

The document tool's own photos (`facts.docPhotos`, a photo per box) stay as built; A2 offers the same sheet beside them and they print once each.

## 6. Rules every slice keeps

- **Nothing said is lost** — a removal is struck; Undo brings it back; the file stays in the store.
- **A part's name on paper is the tool's own** (`tileName`), never an id.
- **Offline first** — a photo or clip is kept on the device at once and reaches the cloud when it can (the bucket rule above); the paper says "on another
  device" for a picture it does not hold, never a blank.
- **Phone first** — buttons 44 px, the sheet a sheet, a clip converted on the way in so it plays on other devices (`lib/media pickExistingMedia`).
- **Seen in three seconds** (`CLAUDE.md`, visual management) — a picture or clip is shown as itself, never as a filename or a faint box.
- **No AI** in any of it.
