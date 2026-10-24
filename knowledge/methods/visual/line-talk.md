---
id: visual.line-talk
name: Line Talk — talk on the line, and it writes the reports
aka: [line talk, voice notes, shift report, AI assistant, conversation, dictation, punch list by voice]
discipline: visual
kind: faultline
evidence: decision
depth: full
checked: 2026-10-24 — `docs/LINE-TALK.md` (how it hears, the box like a chat's, talking with it, what it knows, the documents) and `docs/DIRECTION.md` (the only AI is the voice and the camera; Claude only, through the `assist` gateway, an allowance a person a day); proved by `scripts/acceptance/line-talk.mjs` and `scripts/acceptance/line-talk-assistant.mjs`; the hearing is the phone's own speech recognition (`src/tools/talk/hearing.ts`); nothing here is a formula — the record says what it is and is not
needs: []
next: [visual.action-tracking]
alternatives: [visual.ask-formulas]
related: [visual.reports, people.one-point-lesson, visual.daily-management]
---
# Line Talk — talk on the line, and it writes the reports

## Purpose and principle
A person on the line talks into their phone — the phone's own speech
recognition writes the words into the box as a chat's dictation does,
they read them, press Send — with photos labelled P1, P2 … Claude
answers as a colleague does: answers what was said, asks back, builds
on the answer, never a template, its reply appearing as it is written.
It knows the line as Faultline holds it (its machines, its problems,
today's counts — read from the line's own functions, not re-derived),
and it writes what is asked: a shift report, a summary for the OEM, a
punch list, a one-point lesson — as a document card the person edits
where it stands, keeps, and prints, every point with where it came from.
Its rules are the app's rules: it never works out a figure (the tools
do — a number it was not given is said to be checked), never saves a
record or passes a gate, and never uses any provider but Claude through
the server-side gateway with its daily allowance. Everything said,
typed and photographed is kept whether the assistant answers or not; a
talk works with the assistant off, and an answer waits or says why.

## Questions it answers
- What happened on the line — said and kept, with the photos, as it
  was said?
- Can it write the report, the summary, the punch list from what was
  said and what the line's records say?
- What did it get wrong — corrected after it was sent, with what was
  sent kept beside it?

## Inputs and minimum conditions
- What is said (the phone's recogniser, British English, live and free,
  nothing recorded) or typed; photos from the gallery or the camera.
- The line (or the project) the talk is on, so its context is the right
  records.
- The gateway up and the person's allowance left; else the talk still
  keeps everything and the answer waits.

## Procedure and calculation
None — figures stay with the tools. What the record can say precisely
is the mechanics the acceptance scripts prove: the words in the box as
they are said (those still forming too), nothing in the talk until
Send; six seconds of silence → the keyboard's own microphone offered;
typed into while listening → listening stops; a photo, a line typed,
sent as typed; a message corrected after sending with the original
kept and Undo; struck, kept and left out of what is sent, brought back;
no signal → said, the words kept, sent when it comes back; the
assistant's context the line's machines and problems as the register
reads them and today; a follow-up asked with the conversation so far;
an answer not given saying why, Ask again; a document's card edited in
place, kept, reloaded, As Line Talk wrote it and Undo; its PDF with
every point's source and each photo with its label; counted on the
talk and the line's page.

**Worked case**: none computed — this record holds no arithmetic. The
acceptance scripts are its worked cases, run in every gate.

## Assumptions, limits and misuse
- Treating its words as figures: a number in its answer that the tools
  did not give it is flagged to check; the tool's number is the number.
- It is not a search engine or a method builder; the builder and its
  assistant were deleted on 20 October at Rowland's word.
- Speech recognition is the phone's: where the browser will not listen,
  the keyboard's own microphone is the way, said on screen.
- The allowance is a person's a day; when it is spent the talk still
  keeps everything and says so.
- Nothing recorded: the voice is never stored or sent to a voice
  service; only the words.

## Reading the result
A talk reads as a conversation with a colleague who knows the line,
with documents it wrote hanging off it. Money: none of its own — a cost
it quotes is the tool's, with its source named.

## When not to use it — and instead
Any number → the tool that works it out; a question with a shape →
`visual.ask-formulas`. The report's own layout and conventions →
`visual.reports`. A lesson written from a talk → `people.one-point-lesson`.
The daily meeting's board → `visual.daily-management`.

## In food and FMCG manufacturing
Shift handovers spoken at the end of the shift; the OEM's punch list
dictated while walking the new line; a one-point lesson from a fitter's
explanation; the morning's summary for the manager who was not there.

## References
- [doc] `docs/LINE-TALK.md` — the design in full: how it hears, the box like a chat's, talking with it, what it knows, documents and their PDF, slices.
- [decision] `docs/DIRECTION.md` — 20 October: the only AI is the voice and the camera; Claude only, through the gateway.
- [code] `src/tools/talk`, `src/tools/talk/hearing.ts`, `supabase/functions/assist` (task `talk`), `scripts/sync-assist.mjs`.

## In Faultline
Built (FC-143): Line Talk on a line and in a project
(`src/tools/talk`), hearing with the phone's own recogniser
(`src/tools/talk/hearing.ts`), the assistant through the `assist` gateway, the
documents and their PDF; proved by `scripts/acceptance/line-talk.mjs`
and `line-talk-assistant.mjs`. A test on a real phone (screen locked,
signal lost) is still awaited before slice 2.
