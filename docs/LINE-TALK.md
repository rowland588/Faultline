# Line Talk — talk on the line, and it makes the reports

The design, agreed with Rowland on 20 October. **Nothing is built yet**:
building waits on his go.

Rowland, 20 October: *"Consultant in a line speaking into his phone, the AI
listening to everything, allows pause, continue speaking, it remembers
everything like Claude chat. Then turn it into reports, summaries etc."*
Asked how: one voice; **free** — "it needs to be free, understand the
context", no fixed menu of what it makes; the recording kept, **viewed like a
chat and continued from the chat**; and a name chosen for it — *Line Talk*.

## Where it sits (docs/DIRECTION.md)

- **It is the AI tool.** Faultline is its tools and its three kinds of change
  on the line, worked out by formulas; the AI is one tool among them, used
  when someone chooses to — never the app's driver, never a builder of
  methods, templates or tools.
- **Layer:** on the line — a tool, opened on a line from its page or from
  Tools, or inside a project (a stage gate, a 6M, a lever tree).
- **Record:** no new noun. A Line Talk is a **study** (`studies`, tool
  `talk`), as a video study is a line balance study: one use of a tool, on a
  line, attachable to a job. Its turns, recordings, photos and documents ride
  in `facts`, merged by id between devices as the video study's events are.
  The database's list of tools (`studies_tool_check`, supabase/STUDIES.sql)
  takes `talk` — one migration, `supabase/LINE_TALK.sql`, applied and read
  back before the screen ships.
- **Replaces:** nothing. The voice note on a form stays as it is.

## What it is, on the phone

**A conversation, like a chat, about one line.**

1. **Start it** on a line (or in a project). The phone keeps its screen awake.
2. **Talk.** Pause and Continue as often as wanted. Take a photo at any
   moment — it sits in the conversation where it was taken. Type when talking
   will not do.
3. **It hears it.** Each piece is written into the conversation as it is
   heard, and can be corrected; what was said is kept as said.
4. **It remembers everything.** The whole talk is one conversation: each new
   piece is understood with everything before it ("same as the last one", "the
   machine after the sealer").
5. **Ask it anything, in words.** "Write the walk report." "Give me a
   one-page summary for my manager." "Make the punch list for the OEM." "What
   did I say about the wrapper?" "Turn the changeover bit into a one-point
   lesson." It is free: the request decides what it makes, not a menu. A few
   chips at the end of a talk are only shortcuts to typing.
6. **Come back to it.** Every Line Talk is listed on its line, newest first;
   opened, it is the conversation as it was left — the recordings, the photos,
   the words, the documents — and carries on from there, today or next week.

## What it knows (the context it is given)

The line as Faultline holds it: its name, its machines in flow order and who
made them, its crew and shifts, its open problems, the latest figures its
tools worked out (Line capacity's bottleneck and cost a pack, the loss
count's biggest losses, SMED's changeover…), the project when it is in one,
and today's date. And the whole talk so far.

## What comes out

- **Documents** — written in the conversation, edited there, kept with the
  talk, and put on paper by the report engine (`lib/report`) in the house
  look, or attached to a project as a file.
- **Records, proposed — never made by it.** When it finds problems or
  actions in what was said ("the guard on the infeed is bent", "Dave to change
  the belt by Friday"), they appear as cards in the conversation — the line,
  the machine, the photo, the owner, the day, a suggested priority — each with
  *Add to the line's problems* (or the project's), editable first. Added, it
  is a normal Faultline record under the person's own access, with Undo, and
  says it came from the talk.
- **Figures said, offered as readings** ("the changeover took 12 minutes")
  — confirmed by the person, so every number is still measured by a person.

## What it never does

- Works out a figure. A number in what it writes is either something said in
  the talk or one of Faultline's own figures, and says which; one it was not
  given is refused before it is shown (the grounded check the method
  assistant's *Ask* already does).
- Saves a record itself, passes a gate, or changes anything without a tap.
- Identifies anyone in a photo.

## How it is built (for the developer)

- **Hearing:** the phone records the talk in pieces (as the voice note does
  today, up to two minutes a piece), kept on the phone until each is heard.
  The server's existing voice service (`api/voice`, the key server-side, only
  for someone signed in) writes each piece down. Offline, recording carries
  on and hearing waits for signal.
- **Replying:** one conversation call through a server-side gateway with the
  talk and its context; its proposed records come back in a fixed shape the
  app checks before it shows them. Which model hears and which replies is
  chosen when it is built — one provider if it can do both well.
- **Keeping:** the recordings, photos and documents go to the cloud as
  footage does (`lib/video/footage`'s rules: a row names the file before it
  is uploaded; the size limit said at once), so the talk plays on another
  device.
- **Cost:** every call logged, a monthly cap, the cost of a talk shown on it.
- **Off or unreachable:** recording, photos and typing still work and are
  kept; the talk says it will be written up when the service is back.

## How it is proved (the acceptance, before it ships)

A talk recorded in the test from speech with known words and two photos;
paused and continued; heard into the conversation; a report asked for and
written; two problems proposed and added to the line; the line's page and the
control room counting them; the report on paper; the page reloaded and the
talk continued from where it was. The assistant's answers recorded for the
gate; then one real Line Talk on Rowland's floor, measured — how much of what
was said was heard right in the noise, and what it cost.

## The slices

1. Record and keep — the conversation: talk, pause, continue, photos, typing,
   heard and corrected, kept and reopened; the migration.
2. Ask it — free requests, answers and documents in the conversation; paper.
3. Into Faultline — problems, actions and readings proposed and added.
4. Inside a project — a stage gate's punch list, a 6M's causes, a project's
   documents.

**The recordings are kept for good** (Rowland, 20 October), with the talk,
as footage is. Open before slice 1: whether the phone keeps recording with
the screen locked — tested on Rowland's phone first, as the video check did.
