# AI operating Faultline — the tool connectors (10 November)

Rowland, 10 November: *"I want to be able to talk to Faultline about an operational problem and have it intelligently use the
entire application to do the work with me."* With his two decisions the same day: **Line Talk's report writing, documents and
voice-drawn diagrams come into AI Mode** (one colleague, not two AI systems — Line Talk's screen stays for use by hand), and **a
live measurement is confirmed once when it starts**; after that, spoken events are captured directly, and every one can be
corrected, undone and reviewed.

And his principles: don't build new tools — make the ones there are usable by the AI; one capability architecture for the
existing tools and every future one; the AI tells the kinds of work apart; **show the actual work**, never a chat summary
pretending to be the application; reports and dashboards from the real data and the app's own calculations; the camera kept on
the same architecture for later, without distracting from the core.

This builds on `docs/AI-MODE.md` (the capabilities, the gateway, the audit) and `docs/AI-CONTEXT.md` (understanding the app and
where work belongs). The rules there stand: the AI works only through capabilities, never deletes, never marks evidence
verified, never works out a figure, and every write is confirmed (a live measurement once, at its start).

## 1. The audit it rests on (10 November)

32 tools a person can open (`src/catalogue/registry` APP_TOOLS less the two menu pages, plus 6M), 18 calculators, 10 document
kinds, 13 check-log kinds, 10 scored registers, 24 statistics and engineering modules (`src/lib/ie`), about 33 paper makers, the
combined reports (line, full package, area, project, method, client, 6M, Story), and the video study. Before this slice the AI
could find tools and plan work (`describe_faultline`, `plan_work`), run calculators, and draft calculators, documents, check logs,
two registers, SMED and custom sheets. It could not write a report, fill most studies, capture a live measurement, analyse a
record's data, or produce a combined report — and Line Talk's documents and diagrams were a second AI of their own.

## 2. The architecture — a connector for every tool

`src/capabilities/connectors/index.ts` holds **one entry a tool**, keyed by its registry key, saying which of five parts it has.
Each part is **the tool's own code**, never a copy:

| Part | What it is | Where it comes from |
|---|---|---|
| **Describe** | what the tool is for, what it needs, what it gives | the catalogue entry (`src/catalogue`) |
| **Fill** | a structured record filled from the conversation | a draft of the tool's own shape (`capabilities/drafts`), a diagram said aloud (`tools/talk/diagramRecord` — Line Talk's own Make it), or readings added (`add_readings`) |
| **Capture** | a live measurement | an adapter in `connectors/measure.ts` writing exactly what the tool's capture screen writes |
| **Read** | the record's finding and data | the tool's own sentence (`lib/studyLinks studyLine`) and its readings and notes (`readRecord`) |
| **Report** | the tool's paper | made on arrival at its page (`?save=1`, `ui/StudyActs` StudyBand → `lib/useSaveOnArrival`), or its page's Report ▾ |

A part a tool does not have is said (`byHand`: how it is done on the page), never claimed. **A new tool is one entry here** (and
its catalogue entry): `tool_guide` and `describe_faultline` tell the colleague of it, and the same capabilities run its parts. The
unit test fails if a tool a person can open has no connector, or a connector claims a capture with no adapter.

## 3. The kinds of work — said apart

`INTENTS` in the connectors, and the colleague's instructions (`tools/colleague/colleagueAssist` THE KINDS OF WORK):

| Kind | What the person wants | Capabilities |
|---|---|---|
| report | a report or document from what is known | `make_report` (record · project · client · six-m · line · line-package · area · story) — the app's own paper; `write_document` — a document written from the conversation, kept as a Line Talk |
| fill | a study with an existing tool, filled as they talk | `start_draft` · `fill_draft` · `make_record`; `draw_diagram` (flow · spag · vs); `add_readings` |
| measure | a live observation | `start_measurement` (confirmed once) · `capture_event` · `undo_capture` · `correct_capture` · `measurement_state` · `end_measurement` |
| calculate | a calculator on given figures | `run_calculator` · `save_calculation` |
| analyse | data already in Faultline | `read_record` · `run_analysis` (the Analysis tool's own statistics: sure · change · paired · groups · relate) |
| investigate | several tools on one problem | `plan_investigation` → `start_project` → each tool in turn → `make_report` project |

## 4. Live measurement

A measurement is one authorised session of one capture tool, kept on the AI Mode conversation (`facts.measures`). Five tools
capture today, each adapter writing what its screen's buttons write:

- **Stops timed** (line): *stopped* (machine, reason) starts the line's stopwatch (`activeTimer`, as the capture screen's
  Stopped); *running* keeps the observation with its time; *count* a stop with no time.
- **Reliability**: the watch started and stopped (`facts.watch`), *event* (which count, reason) a `RelEvent`, *running* closes a
  timed stop, *pause* / *resume*.
- **Work sampling**: *moment* (people and their activities) — a moment taken by hand (`takeNow`) and a tap a person.
- **SMED**: *begin* at the last good piece, *element* (the element just finished, by name) a timed `ChangeoverStep`, *finish* at
  the first good piece.
- **Stops across workstations**: *stopped* / *running* on a workstation — its minutes and one stop, as its own button does.

**Time**: each event is stamped at the moment the person's words were heard (`CapCtx.saidAt`, their turn's time), not when the
reply came back. **Undo** strikes or takes back what the event wrote, as the tool's Undo does; **correct** takes it back and writes
it again as said at the same moment; **review** lists every event with its time. The screen shows a strip while it runs — what,
since when, how many, the last one — with Show, Undo, Review and End, which call the same capabilities with no AI. Only the
session's own events go in without a card, only into its own record, only by somebody who may change it; one session at a time.

## 5. Show the actual work — the work pane

`lib/pane`: AI Mode opens the real page of what it is working on — the tool's page, its capture screen, its report made on
arrival — in a frame beside the conversation (on a phone, over it with *Conversation* to go back). The page in the frame is the
same app on the same device data, drawn with no menu and syncing nothing of its own; `db/core` tells every window of each write
(`BroadcastChannel 'faultline-data'`), so the page redraws as the conversation writes, and a tap on the page reaches the window
that syncs. A capability's result carries `show` (the record or page); the screen opens it. A draft already made fills
straight into its record (confirmed when made), so the person watches it update.

## 6. Reports and dashboards

Every output is the app's own: a study's paper (`useStudyPaper`) made on arrival at its page, kept under Saved copies; the line
report and the full package (`?full=1`), the area report, the project report (`/project/:id/method-report`, every tool's own
sentence and paper blocks), the client and 6M reports, the Story's chapter. A document written in the conversation is Line Talk's
document (`write_document`) — its page to edit, its PDF — with any figure not said in the conversation marked to check.

## 7. The camera

The video study has its connector (`video`: describe · read · report, `camera: true`) — the AI finds it, reads what its reviewed
events found and opens it. Filming, reading the footage and reviewing the events stay on the video study's page. Capture from the
camera through the conversation is the next part of this architecture, not built.

## 8. How it is proved

- `src/capabilities/__tests__/operate.test.ts` — every tool has a connector; tool_guide's kinds; each capture adapter writing
  what its screen writes, undo, correct at the original moment, one session at a time, a client refused; run_analysis equal to
  the Analysis tool's own sentence; add_readings, read_record; draw_diagram equal to Line Talk's Make it and keeping the person's
  other figures on update; write_document a Line Talk with its figures to check; make_report's addresses; plan_investigation.
- `src/capabilities/__tests__/drafts.test.ts` — a made record filled as it is talked about.
- `scripts/acceptance/ai-operate.mjs` — in the browser with the gateway played by the script: a measurement started with one card,
  the line's capture screen in the pane, events captured with no card and on the line, the strip's Undo, Review and End; readings
  into a study shown in the pane; the Analysis's own sentence; a report made and kept; a document and a flow diagram made and
  shown; an investigation planned; the phone.

## 9. Not yet

- Fill for Line capacity, the loss count, the line balance's timings, the line standard's board, FMEA and the other card
  registers — said by `tool_guide` as done on the page (`byHand`).
- The line balance's stopwatch and the value stream's stopwatch as capture adapters.
- The camera as a capture.
