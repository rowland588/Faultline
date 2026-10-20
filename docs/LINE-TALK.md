# Line Talk — talk on the line, and it makes the reports

The design, agreed with Rowland on 20 October; his go the same day ("keep
for good, go"). **Slices 1 and 2 are built** (record and keep; ask it —
below, *Built*); slices 3–4 are not.

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
  given is said beside the answer to be checked before it is used (a
  grounded check, as the method assistant's *Ask* made before it was deleted
  on 20 October). Built in slice 2 as *said*, not refused: a figure read off
  a gauge in a photo is the one figure it may give, as its reading, asking
  for it to be confirmed — refusing it would refuse the photo.
- Saves a record itself, passes a gate, or changes anything without a tap.
- Identifies anyone in a photo.

## How it is built (for the developer)

- **Hearing:** the phone's own speech recognition writes the words down as
  they are said (Rowland, 20 October: "Use the phone's own speech
  recognition instead of Gemini" — below, *How it hears*), and the phone
  records beside it; the talk is kept in pieces about a minute long.
- **Replying:** one conversation call through a server-side gateway with the
  talk and its context; its proposed records come back in a fixed shape the
  app checks before it shows them. Built (slice 2): **Claude replies**
  (`supabase/functions/assist`, task `talk`); **the phone hears** — no other
  AI is in Line Talk.
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

## Built — slice 1, record and keep (20 October)

- **Where:** `#/talk` (every Line Talk; `?line=` for one line, with *Start a
  Line Talk on* it) and `#/talk/<id>` (`screens/TalkScreen`); Line Talk in
  Tools on the rail and on the line's page, whose tile says its latest talk
  in a line (`lib/talk` talkSaid).
- **The record:** a study, tool `talk` (`lib/study` STUDY_TOOLS); its turns in
  `facts.turns` (`lib/talk` TalkTurn — `said` with its recording, `photo`,
  `typed`), merged by id between devices like the video study's events.
  A correction is kept in `text` beside what was `heard`; a strike is a mark,
  never a delete — **nothing in a talk is erased**, and every recording and
  photo, struck or not, is named for the cloud (`talkMediaKeys`) so it goes
  up and stays, as footage does.
- **Recording:** the browser's MediaRecorder, cut into pieces about a
  minute long (`PIECE_SECONDS`) so a long stretch is kept as it is said; the
  screen kept awake (Wake Lock) while it listens. The phone taking the
  microphone ends the piece — kept — and the talk says so and offers
  Continue.
- **Hearing** (as built in slice 1 it was the voice service, `api/voice`
  on Gemini; replaced the same day — below, *How it hears*).
- **Database:** `supabase/LINE_TALK.sql` — `talk` added to the studies'
  tools, and the media rule taking a talk's recordings and photos.
- **Proved:** `scripts/acceptance/line-talk.mjs` (Chromium's fake
  microphone, the phone's recogniser played by the script),
  `lib/__tests__/talk.test.ts`, `lib/__tests__/hearing.test.ts`; seeded for
  the smoke test and the page inventory (`dev/seed.ts` talkId).
- **Still open:** whether a phone keeps recording with its screen locked —
  tried on Rowland's phone first.

## Built — slice 2, ask it (20 October)

Rowland, 20 October: *"a simple, reliable, ChatGPT-style manufacturing
assistant inside Faultline, powered by our existing Claude API integration
… talk or type naturally, ask questions about my manufacturing work, upload
photographs, and ask the assistant to produce useful reports and documents."*
Built on slice 1 — nothing of it replaced: the recording, the hearing, the
corrections, the strikes, the pieces kept offline and the sync are as they
were.

- **Asking:** the bar's box takes typing at any time; *Send* adds it as a
  typed turn and asks, *Reply* asks about what was said since the last
  answer. Four chips (*Line-walk report*, *Summary for my manager*, *Punch
  list for the OEM*, *Engineering report*) only put words in the box to be
  changed before they are sent. *Photo* takes or picks pictures (several at
  once), each labelled P1, P2 … in the order taken, struck ones keeping
  their number.
- **The answer is a turn** (`lib/talk` kind `reply`) in the same list as
  everything else, merged by id between devices — no new record and no
  migration. It holds its words, the document if one was asked for, the
  figures to check (`unsure`) and the model that wrote it; while it waits it
  says so (*Line Talk is answering…*). It is kept even when it fails: *No
  signal* — answered by itself when the signal comes back; anything else —
  why, in words, with *Ask again*. What was said, typed and photographed is
  never lost to a failed answer.
- **What it is told** (`lib/talkContext`, from `screens/useTalkContext`):
  the line's own sentences, laid out under headings and never worked out
  again — its machines in flow order and makers, shifts, crew and cost; its
  open problems in priority order (owner, due, plan, latest step); its
  programs not proved yet; what each of its tools last found, in the words
  the line's page says them (`ProductionLineScreen` `toolSaysOf`, `stopsOf`,
  shared, not copied); its jobs and their verdicts; the job the talk is on.
  Shown on the talk as *What Line Talk knows*, opened to read whole. Then the
  whole conversation — every turn with its time and how it came, a
  correction as corrected, earlier answers and their documents as words —
  and today's date. Pictures: the newest ten photos (`photosToSend`), each
  drawn at 1,280 px at most and under 450 KB (`lib/talkPictures`); older
  ones by their label alone.
- **The gateway** (`supabase/functions/assist`, task `talk`; the core
  shared word for word with the app, `lib/talkAssist` →
  `assist/talk/talkAssist.ts` by `scripts/sync-assist.mjs`): the key stays
  there; a signed-in person only; the request held to its limits
  (`TALK_LIMITS`: 600 turns, 240,000 characters, 10 pictures); the
  instructions the gateway's own (`TALK_SYSTEM` — the three kinds of
  knowledge kept apart: what was observed, Faultline's records, its own
  assessment; never invent or calculate a figure; never identify anyone;
  never change a record); the answer held to a small JSON schema
  (`TALK_SCHEMA`, the document first so the reply says what it holds) and
  read again (`checkTalkAnswer` — a picture must be one of the talk's);
  every figure not in what was said, the records or today's date returned
  as `unsure`. An allowance a person a day — 60 answers and $5
  (`ASSIST_TALK_DAILY_CALLS`, `ASSIST_TALK_DAILY_USD`) — kept in
  `assist_usage` apart from the camera's. The model and effort are
  configuration (`ASSIST_TALK_MODEL`, `ASSIST_TALK_EFFORT`, medium). The
  conversation is cached up to its newest turn, so a long talk is not paid
  for twice.
- **A document** is a card in the conversation (its kind, title, sections,
  photos, *edited* once changed) that opens `#/talk/<id>?doc=<reply>`
  (`screens/TalkDocView`): every title, heading, paragraph, point, owner,
  due date and caption edited where it stands, a point or a photo taken out,
  each point saying where it comes from (*Observed · Faultline record ·
  Assessment*); *As Line Talk wrote it* puts back the first version, kept
  beside it (`docFirst`). *Save as PDF* (`lib/talkDocPdf`, the report
  engine's blocks in the house look): the band, the key to where each point
  comes from, the sections, the photos at their size with their labels and
  captions, the figures to check said first. Nothing it writes becomes a
  Faultline record — the person adds what should be one.
- **Proved:** `lib/__tests__/talkAssist.test.ts`, `talk.test.ts`,
  `talkContext.test.ts`, `video/__tests__/gateway.test.ts` (the gateway's
  copy the same as its source); `scripts/acceptance/line-talk-assistant.mjs`
  — the assistant answered by the script and what it was asked read back:
  a typed question answered, a photo sent as its picture, a failure kept with
  *Ask again*, no signal waiting and answered when it comes back, a document
  opened, edited, put back and printed with its photo, the answers carried
  in the next question, a reload; and the line-talk slice 1 script unchanged
  in what it proves. **Live, 20 October** (the gateway's check entry — the
  database's own key, no person, nothing logged; `assist` v11, its rules
  fingerprint the repo's): a line-walk report from two spoken notes and
  Line 7's records, machine by machine in flow order, each point marked
  observed, record or assessment, no figure invented, the two figures heard
  asked to be confirmed — 17.7 s, $0.04; a photo of a checkweigher infeed
  described (the label, a rail with a step, *412 g* read off the display and
  asked to confirm, `unsure` 412) and placed in an engineering report with
  its caption — 17.6 s, $0.03, the instructions read from the cache; and a
  follow-up to the walk ("what did I say about the bagger? … a punch list
  for the OEM: Dave owns the guard, due Friday") answered from the earlier
  turns, Dave and Friday on the guard alone and the others *Owner not named
  yet* — 13.4 s, $0.03. The first try, before the document came first in
  the schema, wrote a reply describing three machines over a document of
  one section; the order was changed and the walk asked again.
- **Still open:** slice 1's phone test (the screen locked, a signal lost)
  and the first answers on Rowland's own phone; the camera and gallery
  pickers on iOS and Android; slices 3 and 4. (Gemini hearing: replaced by
  the phone's own the same evening — below.)

## How it hears — the phone's own speech recognition (20 October)

Rowland, 20 October, asked whether to keep Gemini for hearing: *"Use the
phone's own speech recognition instead of Gemini."* So Line Talk has no AI
but Claude, and the hearing costs nothing and needs no key.

- **What does it:** the browser's speech recognition (the Web Speech API —
  Chrome and Edge on Android and at a desk, Safari on an iPhone), in British
  English, wrapped once in `lib/hearing` (`Ear`). It listens while the
  person talks and writes the words as they come: the words it is sure of
  in ink, the ones still forming lighter, under Pause (`.tk-live`). A
  stretch it is sure of is kept as a sentence — a capital and a stop, no
  word changed (`sentence`). On Chrome on Android it writes one sentence a
  session (a long session there repeats words); every phone ends sessions
  by itself, and the Ear opens the next, a moment later each time one fails
  at once. Where the words go: Chrome sends the sound to Google's speech
  service, Safari to Apple's or does it on the phone — the phone's own
  service either way, never Faultline's.
- **A piece:** the words written while it was said, and its recording
  beside them; cut about a minute in **at a pause in what is said** (never
  mid-sentence, unless it runs on fifteen seconds more); words still forming
  at a cut finish in the next piece. A tap, a breath and nothing written is
  not a piece.
- **What it cannot do, said in words** (`notHeardWhy`, `troubleSaid`):
  - *no signal* — said as it happens; the recording carries on, and the
    piece is kept *Not written down*, with why;
  - *a browser with no speech recognition* (Firefox, some in-app browsers) —
    recorded, not written;
  - *refused* — the phone's settings named;
  - *write a recording down afterwards* — it only hears live, so a piece
    not written down is never written later: the person plays it and types
    the words over it with **Correct** (they stand as the piece's words; the
    talk stops counting it as not written down). *Hear it again* went with
    Gemini.
  - *the line's machine names* — it cannot be told them, so a name may come
    out misheard; the person corrects it, and Line Talk's assistant is told
    the words came by speech recognition and has the line's machines in its
    records.
- **A phone that will not record and hear at once** (it refuses the
  microphone to the hearing while recording, or records silence while it
  hears): the words win — the recording stops, the piece is kept with its
  words, the talk says so, and the phone remembers it (`fl-talk-hear-only`):
  its later talks write the words and record nothing. A silent recording is
  told from the recording itself once it is made (`recordingPeak`), asked
  only of a piece with words in it — someone spoke, so a recording that
  heard them is never near silent.
- **What went:** Line Talk's form in the voice service (`api/voice`, form
  `talk`) and what was said before each piece (`earlierOf`, `talkText`),
  and the state *waiting to be heard* (a piece recorded on an older copy of
  the app reads *Not written down*). The voice note in the forms' boxes
  (`ui/Voice`, `api/voice` — fix, found, test, install, problem, whys) is
  unchanged: Gemini hears it and fills the boxes.
- **Proved:** `lib/__tests__/hearing.test.ts` (a recogniser that behaves as
  a phone's: words forming then final, sessions ended by itself, no signal,
  refused, the microphone taken, a language not offered, stopped twice) and
  `scripts/acceptance/line-talk.mjs` (live words, a session ended by the
  phone, a cut at a pause a minute in, no signal and the words typed over,
  the microphone taken, a phone that will not do both, a silent recording, a
  browser without it, a reload; nothing sent to a voice service).
- **On a real phone** (not provable here): how well it hears in the noise of
  Rowland's line; whether an Android phone and an iPhone record and hear at
  once, or fall back to words only; what a locked screen does. Out of sight
  (the screen locked, another app in front) a browser stops its hearing:
  the Ear waits that out — a refusal then is never taken as one — listens
  again the moment Faultline is back, and the talk says that what was said
  meanwhile was not written down (the recording has it, where the phone
  records).
