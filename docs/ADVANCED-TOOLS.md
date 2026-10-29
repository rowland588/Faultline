# Advanced tools — 29 October

Rowland, 29 October (~19:02 UTC): *"I also need you to start thinking about
advanced tools … walk the line we have a claude api on that I think another
tools that we can video people and the evidence tool I think are advanced
tools but check that I am correct only line walk has api tho … now we have
the moat we want advanced tools."*

Checked in the code the same evening. Read with
[`docs/DIRECTION.md`](DIRECTION.md) (the only AI is the voice and the camera)
and [`docs/FAULTLINE-FAULT-MODEL.md`](FAULTLINE-FAULT-MODEL.md) (the fault is
the moat). Where this page and an older note disagree about which screen
calls a model, this page wins: it names the call.

---

## 1. What “advanced” means here

Two kinds of tool, kept apart.

**Ordinary tools** are industrial engineering and Lean. A person counts,
times, taps or types; a formula answers; the sentence and the money come
from the line’s own facts. Line capacity, the line balance, SMED, a shift’s
losses, capability, Stops timed. An OEE board can imitate a sum. It cannot
hold a fault: see it on the line, quantify it, agree who does what by when,
prove it on the same number or on a program test
(`docs/FAULTLINE-FAULT-MODEL.md`).

**Advanced tools** are how a fault is *seen*. An OEE figure has no walk, no
film of the people, and no picture kept against the problem. That is the
set: **walk the line**, **film the people**, and the **evidence** those two
leave. They do not replace the formulas. They feed the fault’s evidence
field. The sums stay ordinary.

AI stays what Rowland kept on 20 October: **the voice and the camera**. It
is never the app’s driver, never a builder of methods, and never a new
provider. Claude answers Line Talk and, when a person asks, names the work
in a video study’s frames. Gemini hears a voice note into a form. Nothing
else calls a model.

---

## 2. The correction — the walk has no API

The walk is not the Claude call, and it is not the only call.

**Walk the line calls no model.** `src/snag/` (Walks, Walk the line, the
Evidence list, a marked frame) and `src/screens/CaptureScreen.tsx` (Stops
timed) do not invoke `assist`, and they do not call Claude or Gemini.

**Claude is the `assist` gateway, two tasks**
(`supabase/functions/assist/index.ts`). A signed-in person, the key
server-side, an allowance a person a day, the answer checked before it is
kept, nothing written until a person decides. Any other task is refused in
words (the method builder’s tasks went on 20 October).

| Task | Called from | What it does |
|---|---|---|
| `talk` | `src/tools/talk/talkAsk.ts` → `supabase.functions.invoke('assist')` | Line Talk: the conversation, photos, a document when one is asked for (`docs/LINE-TALK.md`) |
| `video-label` | `src/tools/video/providers.ts` `assistLabeller` | Video study: *Name the work from the frames*, off until the person ticks it (`docs/VIDEO.md`) |

`supabase/functions/keycheck` answers 410 and reaches no model. `remind` and
`share` are not assistants.

**Gemini is the voice note only.** `api/voice.ts` (`GEMINI_API_KEY`) is the
one file under `api/`. The phone posts a recording to `/api/voice`
(`src/lib/voice.ts`); the model fills the fields of the form the person is
already on — `fix`, `found`, `test`, `install`, `problem`, `whys` — and the
screen shows them beside what they would change. It never writes the record.
*Better wording* (`api/wording`) was deleted on 20 October. Line Talk’s
hearing left Gemini the same day: the phone’s own speech recognition writes
into the box (`src/tools/talk/hearing.ts`, `docs/LINE-TALK.md`).

So the model calls are **Line Talk** and **the video study’s optional
naming**. The walk, the evidence list, and the voice note’s hearing on Line
Talk are not among them.

---

## 3. The set, as the code has it

| Tool | Route | Claude? | Phone camera? | Gemini? | Status |
|---|---|---|---|---|---|
| **Walk the line** — the filmed walk, punch list (FC-081) | `#/w/:ws/snags` Walks (film or upload); `#/w/:ws/line` machine by machine; `#/w/:ws/walk` walkthrough; `#/w/:ws/segment/:id` and `#/w/:ws/asset/:id` a clip and a marked frame. From the line’s page: More ▾ **Film the line** → `#/w/:ws/snags?manage=1` | No | Yes — *Film the walk* in the app (`VideoRecorder` on Walks) | No | **Built** — catalogue `available`. Acceptance `snags.mjs`, `lines.mjs` |
| **Evidence** — the walk’s punch list and the photo block. Not its own catalogue entry | `#/w/:ws/snaglist` titled **Evidence** (`src/snag/SnagListScreen.tsx`). Same page is Stops timed’s Evidence tab (`src/screens/AppShell.tsx` `STUDY_VIEWS`). **Evidence** on Walks and on Walk the line. Paper: Evidence cards (`ui/ReportsSheet`). Photos and clips on a problem, a test or a fix: `ui/EvidenceDoors` (Camera · Video · On the phone) | No | Yes — camera, in-app video, or photos already on the phone | No | **Built**, as part of the walk (FC-081) and of tests and fixes. It is not a third product |
| **Video study** — people’s work read from footage (FC-021) | `#/video`, `#/video/:id` (`?line=` from the line’s Tools). *Can this phone film a long study?* is `#/video-check` | Yes, optional — task `video-label`, off until *Name the work from the frames* is ticked. Times and boundaries are read on the device (`src/tools/video/detect`); the model names what the work looks like and never moves a boundary | Yes — footage filmed or uploaded | No | **Partial** — catalogue `partial`: accuracy is measured, not guaranteed (`docs/VIDEO.md`); changeovers are not read from footage yet. Acceptance `video-study.mjs`, `video-fit.mjs`, `video-check.mjs` |
| **Line Talk** — talk on the line (FC-202) | `#/talk`, `#/talk/:id` (`?line=` on one line). Factory page: *Start a Line Talk* | Yes — task `talk`. Hearing is the phone’s speech recognition, not Claude | Photos — camera or gallery into the box (`TalkScreen`, no `capture` lock). The microphone is hearing, not the camera | No | **Built** — catalogue `available`. Acceptance `line-talk.mjs`, `line-talk-assistant.mjs`. A talk is kept with the assistant off |
| **Waste walk** — eight wastes classed and costed (FC-005) | No page of its own. Catalogue: a mode of the filmed walk, `where: ['/snags']` | No | Only what the walk already films | No | **Partial** — the walk records the problem, the photo and the film. It does not yet say which waste each is, nor its cost |
| Voice note in a typed box | Not a tool. `POST /api/voice` from `src/ui/Voice.tsx` | No | No — a recording of speech | Yes — Gemini Flash | **Built**, and kept (`docs/DIRECTION.md`). It fills a form. It is not one of the advanced tools |

Beside them, and ordinary: **Stops timed** (`#/w/:ws/capture` — Capture ·
Analyse · Evidence · Meeting) is a stopwatch. Its Evidence tab opens the
walk’s punch list, which is why the walk and the stopwatch feel like one
place. **Gemba freshness** (FC-199, `src/lib/gemba.ts`) says how many days
since someone looked. It is partial, it has no camera and no model, and it
is not an advanced tool.

---

## 4. How they sit on a fault

A fault today is a **problem** on the line’s register, or a **case** on a 6M
board (`docs/FAULTLINE-FAULT-MODEL.md` §2). Its evidence field is not a new
record and not a new tool. It is what was already taken:

| Seen by | What is kept | Where it anchors |
|---|---|---|
| Walk the line | A frame marked on a machine, a pin, a problem with its journey | The machine on the line (`#/w/:ws/line`, `#/w/:ws/asset/:id`) |
| Video study | Events a person accepted on the footage; cycles and the balance worked out from those events | The station’s work. A person reviews every piece; the model, if asked, only names it |
| Line Talk | What was said, typed and photographed; a document when one was asked for; a card only if a person adds it | The line’s records, which the talk is told. It never saves a problem by itself |
| Evidence list | Those problems with their pictures, counted, filtered, printed as cards | `#/w/:ws/snaglist` — the fault’s pictures in one list |
| Voice note | Fields the person confirmed on the form they were already on | That problem, test or fix |

Then the ordinary tools quantify, Actions say who owes what by when, and
proof is the same number again or a program test. The walk, the film and
the talk are the seeing. They are not the fault, and they are not the proof.

---

## 5. Next slices — doors and copy

Design only. No new model, no new provider, no Claude on the walk. Three
slices, each a door or a sentence on a page that already exists.

**A. See it, on the line.** *Film the line* sits in the line page’s More ▾
(`src/screens/ProductionLineScreen.tsx`). The video study and Line Talk are
rows under Tools. Put one short row on the line’s Overview, three doors:

- **Walk the line** → `#/w/:ws/line` when frames are marked, otherwise
  `#/w/:ws/snags?manage=1` (Film the line).
- **Film the work** → `#/video?line=` (the line’s video studies).
- **Talk it** → `#/talk?line=`.

The line under them: *How this line is seen. The sums stay in the tools.*

**B. Evidence stays the punch list.** Do not add an Evidence tool to the
catalogue or the menu. On the line’s Problems, a problem that already has a
marked frame or a photo says so in the row — *marked on the walk*, or
*photographed* — and opens the picture. The page titled Evidence keeps its
name and its empty line (*Evidence comes off a walk*).

**C. Each door says whether a model is in it**, so nobody waits on an API
the walk does not have:

- Walk — you mark the frame; nothing is sent to a model.
- Video study — the times are read on the phone; *Name the work from the
  frames* stays off until it is ticked, and then it is Claude.
- Line Talk — the answer is Claude through the app; what was said is kept
  either way.

Later, and still formulas: class a walk’s problem as one of the eight wastes
and price it from the line’s cost model (FC-005). That is ordinary depth on
the walk, not an AI slice.
