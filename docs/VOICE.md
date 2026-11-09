# Voice — dictation and the two-way voice conversation (9 November)

Rowland, 9 November: *"We are evolving one assistant … Functionality A — microphone input within the existing chat …
Functionality B — full two-way voice conversation … It must not create a new conversation engine … The user primarily accesses
Faultline on a Samsung Android phone."*

Not to be confused with `docs/VIDEO.md` (the video study) or the forms' voice note (`api/voice`, Gemini — unrelated and untouched).

## 1. What was already there

AI Mode (`screens/AiModeScreen`, `docs/AI-MODE.md`) already had:

- **The microphone in the box** — `tools/talk/hearing` `Ear` over the browser's Web Speech API (`SpeechRecognition`), British
  English, words written into the box as they are said (interim and final), then Send. Line Talk's own hearing, proved by
  `line-talk.mjs`.
- **Speak replies** — `colleague/voice` over the browser's `speechSynthesis` (on Android, the phone's text-to-speech engine),
  British English first, markdown taken out.
- **Conversation** (Phase 4, `colleague/floor`) — after a reply is spoken the microphone opens again; the screen kept on (Wake
  Lock); a headset's button (Media Session) starts, sends and stops; barge-in (words heard while speaking stop it); a write card
  answered by "yes, do it" / "not now", matched in code; *Before you walk the floor* checks.

What it did **not** have: the end of a turn found by itself (the person pressed Send or the headset button), a dedicated voice
screen with its states, the reply said sentence by sentence as it is written, voice and speed and pause settings, a cancel for
dictation, telling its own voice from the person's, talk-over with a headset, and a reply written for the ear.

## 2. The decision — the web app, not a native Android wrapper (yet)

| | Web app (Chrome on Android) | Native bridge (Capacitor + an Android plugin) |
|---|---|---|
| Recognition | `SpeechRecognition` — in Chrome on Android, Google's speech service; on-device where Chrome offers it (`SpeechRecognition.available({processLocally})`, Chrome 139+, detected at run time) | `android.speech.SpeechRecognizer` — the device's default service (Samsung's or Google's), `EXTRA_PREFER_OFFLINE`, `isOnDeviceRecognitionAvailable` |
| Speech | `speechSynthesis` — the phone's own TTS engine (Samsung's or Google's) and its voices | `TextToSpeech` — the same engine, plus audio focus and `UtteranceProgressListener` |
| Bluetooth | follows the phone's routing — a connected headset plays Faultline; the headset's microphone is the phone's choice; no page can pick either | can request SCO / communication device routing |
| Screen off / background | **not possible** — a page stops listening when the phone locks or another app is in front | possible with a foreground service and its notification |
| Delivery | live the moment `main` is built — the same app, the same updates | an APK built, signed and installed or published; a second release path for every change |
| Effort and risk | done on the existing engine, testable here | a new build chain (Android SDK, Gradle, signing) that cannot be built or tested in this environment, and no Samsung phone to prove it on |

**Chosen: the web app**, because it reaches Rowland's phone today with no second app or release path, uses the phone's own
recognition and voices, and every part of it can be tested here. Its two real limits are said on the screen, never hidden:
**no listening with the screen off**, and **the phone, not Faultline, decides the speaker and microphone** (a connected headset is
used when the phone routes to it).

**When to add the native bridge:** if Rowland's physical tests show that (a) he needs Faultline to listen with the phone in a pocket
and the screen off, or (b) Chrome on his Samsung will not use his headset's microphone. The voice layer is built so that this is an
addition, not a rewrite: everything the screen needs goes through four seams — the `Ear` (start, stop, words heard, trouble), the
voice (`speak`, `queueStart/queuePush/queueClose`, `stopSpeaking`, `onSpeaking`, `onPulse`), `colleague/voicePrefs` (voices,
on-device status, audio route) and the states (`colleague/speech` `voiceStep`). A Capacitor plugin would implement those same seams
over `SpeechRecognizer` and `TextToSpeech`; the voice screen, the turn-taking, the conversation engine and the gateway would not
change.

## 3. What was built

**Functionality A — dictation in the chat.** The box's microphone (as before) now shows *Listening…* with **Cancel** (the box put
back as it was) and **Done** (the words left to edit), then Send through the same conversation. No recognition in this browser,
a refusal, a busy microphone or no signal are each said in words with the keyboard's own microphone as the way round.

**Functionality B — the voice conversation** (`colleague/VoiceMode`, opened by the box's **Voice** button):

- **One engine.** What is heard goes into the same conversation through the same `send()`; the reply comes from the same gateway
  with the same capabilities, permissions and threads, and is written in the chat as ever. The request carries `spoken: true`, so
  the colleague answers for the ear (`SPOKEN_NOTE` in `tools/colleague/colleagueAssist`: two to four short sentences, the most
  important first, no lists or ids, one question at most). Chat closes the screen; Voice again resumes the same conversation.
- **The states** (`colleague/speech` `VOICE_STATES`): idle · initialising · listening · transcribing · processing · preparing ·
  speaking · interrupted · recovering · error · ended — moved only by real events (`voiceStep`): the recogniser starting and giving
  words, the end of the turn, the gateway's words, the voice starting and ending, a tap, a trouble.
- **The end of a turn** (`turnEnd`): nothing still forming, and quiet for the pause the person chose (a moment · two seconds ·
  longer); **longer after a word a sentence does not end on** ("…and", "…so the", "um"), shorter after a whole short answer ("yes",
  "stop"). The silence is measured from the recogniser's last words — never a decorative timer.
- **Said sentence by sentence** (`nextChunks`, the voice's queue): each round's finished sentences are said while the colleague is
  still working; `forSpeech` takes out markdown, ids, links, JSON, the *Suggestions* line and step names.
- **Interruption**: the orb or **Interrupt** stops the voice at once and every piece waiting with it (one `stopSpeaking`), then
  listens; with a headset (or *Always*) the microphone stays open while Faultline speaks, so the person can just talk over it —
  words that are Faultline's own voice coming back (`isEcho`) are ignored. "Stop" said alone clears; "end the conversation" ends.
- **The screen**: an orb in the middle whose movement is the state — breathing while listening, a turning arc while thinking,
  pulsing with each word said (the voice's boundary events) — the state in words under it, a waveform from the same events, the
  words heard or being said, a note when something changes (a headset gone, the microphone refused, out of sight), and four presses:
  Mute · Talk / Interrupt · Chat · End. Light, as every Faultline screen.
- **Settings** (on this device only, `faultline.voice`): the phone's own voices (each saying if it needs signal), speed, how long
  a pause is waited, talk over (with a headset · always · never), writing words down on the phone itself where Chrome offers it
  (with *Fetch the phone's model* when it can be downloaded), and where the sound goes — said, not picked.
- **On the floor**: the screen kept on and the headset's button taken while the voice screen is open (as Conversation does); a
  headset paired or dropped said; out of sight — paused and said, carried on with a tap.

## 4. Privacy — where speech goes

- **The sound of the voice** goes only to the browser's speech service: in Chrome on Android, Google's (usually over the network);
  on the phone itself when on-device recognition is offered and chosen. **Faultline never receives, records or keeps audio**; no
  microphone stream is opened by Faultline itself.
- **The words** (the transcript) go to Faultline's `assist` gateway as the conversation's turns, as typed words do, and are kept in
  the conversation (the person's own records, under RLS).
- **Faultline's voice** is the phone's own text-to-speech; the reply's words are not sent anywhere to be spoken.
- The Claude key stays server-side in the gateway; nothing of this changes the security model.

## 5. How it is proved

- `src/colleague/__tests__/speech.test.ts` — `forSpeech`, `speechChunks`, `nextChunks`, `turnEnd` (thinking pauses, short answers,
  a phone that never finalises), `voiceCommand`, `isEcho`, `voiceStep` (a whole turn, interrupted, muted, recovered, an error, late
  events, closed), and the voice's queue on a fake synthesis (in order, closed, one stop cutting all).
- `scripts/acceptance/voice.mjs` — in the browser with the phone's recognition and voice played by the script: dictation with
  Cancel and Done, no recognition and a refusal said; the voice conversation — listening, a pause after "and" not taken as the end,
  sent into the same conversation with `spoken: true`, the first sentences said while the next round is being worked out, nothing
  but words said, listening again by itself, interrupted at once with nothing more said, mute and unmute, "stop", a refusal as an
  error, across voice and text in one conversation, the settings kept, out of sight paused, the phone at 390.

**Not proved here — needs Rowland's Samsung** (the script plays the phone's parts): how well Chrome's recognition hears him on the
floor and through noise; which voices his phone offers and how they sound; whether his Bluetooth headset's microphone is used by
Chrome's recognition (the phone decides); what an incoming call, battery saver or a locked screen do to a session on his phone;
whether on-device recognition is offered by his Chrome version. *Before you walk the floor* (More ▾ in AI Mode) checks the
microphone, recognition, a British voice, the screen kept on and the headset's button on the phone itself.
