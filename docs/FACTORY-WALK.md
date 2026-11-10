# The factory walk and the camera — 10 November

Rowland: *"I move around the factory, Luna moves with me."* Then his two decisions and his go:

> 1. Departments: A department should be a proper record in the Factory Knowledge Model, even if it has no production lines, machines or
> equipment registered yet. For example, Dispatch should exist as a department in its own right. Its structure can be populated
> progressively as we learn more about the factory. Do not force the creation of child records.
>
> 2. Photographs: Yes. A photograph that hasn't been formally filed should remain part of the factory walk and remain accessible in its
> original context. Where it has a confirmed relationship to a line, machine or department, it should also be visible from those relevant
> pages. Use relationships to the original photograph rather than creating duplicate copies. Luna should be able to suggest filing or
> linking photographs to problems, investigations, projects or assets later. Never guess an uncertain relationship.

## What is built

| Part | Where | What it does |
|---|---|---|
| **A department** | `lib/departments`, `db/departments`, `supabase/DEPARTMENT.sql` | A study record, tool `department` (the one record every tool's use and the story already are — synced, guarded by the studies' own row-level security), holding the client, site and name in the same three words the lines carry. Found by its words, never doubled. Nothing is made under it. An area of `lib/areas` is the lines that say it **and** the department of the same words. |
| On the Factory's Lines tab | `screens/WorkspaceHome` | A department with no line is its own section — *A department of its own — no lines in it yet*. **＋ A department** adds one by hand (Manual Mode, no AI). |
| On its page | `line/area/AreaScreen` | `#/area?site=…&area=…` says **DEPARTMENT** when it is one, *No lines in it yet* when empty, and its walk photos. |
| From onboarding | `capabilities/factoryDraft`, `factoryBuild` | An area said with no line is made as a department on *Make it* (was: held on the draft). A site with nothing in it is still held. |
| **Where you are** | `lib/walk`, `capabilities/walk` `set_position` (local, no card) | `facts.position` on the conversation: a department or area, a line, a machine — said by the person, never guessed — with the time; `facts.walk` the stops in order (60 at most, the same stop twice not repeated). **A move is not a new subject**: the threads stay; the open threads whose place is here are offered, switched only on the person's word. A place not in Faultline is kept as said and named as such. |
| The panel | `screens/AiModeScreen` ContextPanel | *Where you are* above *Now on*: the place, since when, the walk's last stops. |
| The gateway | `colleague/conversation` focusText | *Where the person is* (or *not said — never guess it*), the walk so far, and every photo with where and when it was taken and whether it is filed. |
| **The camera** | `AiModeScreen`, `tools/video/VideoRecorder` `photoOnly` | The composer's camera and *Take a photo* open the app's own live camera full screen (the attach sheet's), pictures only; each snap kept at once, the camera staying open. Where the browser has no live camera, the phone's own camera through the file box. The gallery (*Photos*) as before. |
| **The stamp** | `AiModeScreen` addPhotos | Each photo turn carries `where` — the position at the moment it was taken — and its time. *Taken at …* under the photo. |
| **Filing** | `capabilities/walk` `file_photo` (a card) | Links one photo to a **line, a machine on a line, a department, a problem or a project** — a `filed` link on the photo's own turn (who, when, why in the person's words, `how: 'confirmed'`), never a copy. A problem also lists the same blob key among its pictures (as `add_photo_to_problem`). A record that is not there is refused before any card ("a photo is never filed to a guess"). What the photo shows is the person's observation, never verified. |
| **On the pages** | `ui/WalkPhotos` over `lib/walk walkPhotosFor` | *Photos from walks* on a line's page (filed to it or a machine on it), a machine's page and a department's page — read from the conversations, only by a confirmed link, never by where a photo was merely taken. Each opens full size; *The walk ›* opens the conversation. |
| The walk read | `walk_state` (read) | The position, the stops with the photos taken at each, the photos taken before any place was said, which are filed to what. |
| Luna's instructions | `tools/colleague/colleagueAssist` WALKING THE FACTORY | Where they are vs what they talk about; offer an open thread here; suggest a home only from what the person said; never from the stamp; ask or leave it on the walk. |

**Not stored as observations.** A walk photo is never an `Observation` — the line's stop Pareto counts observations, and a photo is not a stop.

**Customer separation.** A department carries its client's words; the Lines tab shows a picked client's departments only; `set_position` and `file_photo` resolve only records on this device's own lines, departments, problems and projects, under the person's access (`mayEdit`; a client is refused every write).

## Proved by

- `src/capabilities/__tests__/walk.test.ts`: a department never doubled with nothing under it; a move keeps the subject and offers the open thread here; filing by card only, a guess refused, the same blob key on the problem, a page reading only confirmed links.
- `src/capabilities/__tests__/factoryOnboarding.test.ts`: an area with no line made as a department on *Make it*.
- `scripts/acceptance/factory-walk.mjs`: the whole walk in Chromium with its fake camera — the move, the panel, the gateway's focus, the live camera, the stamp, the card, Dispatch as a department, a gallery photo left on the walk, the pages, ＋ A department by hand, the phone.
- `scripts/acceptance/factory-onboarding.mjs`: the draft's *Departments with no line yet*.

## Later — not built

- AI Mode answering by itself when the signal returns (Line Talk does; AI Mode says *Ask again*), with a catch-up of what was said offline.
- Photos from camera glasses or the phone's gallery placed on the walk by their EXIF time; a PWA share target to send a photo straight into a walk.
- Live video from glasses — no web API reaches them (level 4).
- Clips (video) on a walk: the camera is pictures-only on a walk, because Luna is sent pictures, not footage.
