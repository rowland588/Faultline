# Luna conversation acts — 24 November 2026

Rowland, 24 November: *"conversation intelligence and the sound of her … What she is capable of in the conversation: make a report, she does; send the report, she does; let’s track that; remind me tomorrow, she does."*

This slice is that, on the **Luna product** only (`#/ai`, `html[data-luna-product]`). Reports and summaries are Luna. Trackers, methods, Actions and catalogue tools stay Faultline — not added here. The G6 parked-job server loop is a different slice (overnight jobs) and is not rebuilt.

## 1. How she talks

A colleague across the table, not a report. Lead with the thing they asked. Never “In summary”, never “Key findings”, never a recap of what they just said. Spoken: the first sentence is its own phrase so the phone starts talking at once.

## 2. How she sounds (phone PWA)

Still the device’s own `speechSynthesis` — no external TTS. On Android/Samsung: on-device voices ranked above network ones; Samsung / high-quality names preferred; `speechSynthesis.resume()` before each utterance (Chrome pauses after a quiet spell); voices warmed when Luna’s page loads. **MediaSession is still fully cleared on leave** (`floor.ts` `clearMediaSession`) — not regressed.

## 3. What a person can say

| Said | What the app does | Proof |
|---|---|---|
| **Remind me tomorrow** (to look at the wrapper) | `remind_me` — kept on this device, shown on `#/ai` that day. Not a Faultline action. Honest: it shows when Luna is opened; it does not fire while the app is shut. A short timer (“in twenty minutes”) is still `start_timer`. | `acts.test.ts`, `remind.test.ts`, `luna-conversation-acts.mjs` |
| **Make a report** / **put that in a report** | `build_report` from the latest chart in this conversation, else the latest result. Every figure already the app’s. Nothing yet → she says so. | same |
| **Send this report to jane@…** | `send_email` on a **confirm card**. Outlook / Graph Mail.Send as `docs/LUNA-MAIL.md`. Spoken yes: “yes, send it” / “send it”. A name without an address still goes to Luna (`find_person`). | same; mail tests unchanged |

Well-formed phrasing is answered **in code** (`colleague/acts`, `answeredInCode`) — no AI asked. Other wording still goes to Luna, whose instructions name the same three acts.

## 4. What this slice does not do

- Overnight / parked jobs on the server (G6, T-51).
- Faultline Actions, methods, catalogue tools, or a tracker.
- Sending without a card, or inventing a figure.
- Native Android TTS (still the web app — `docs/VOICE.md`).

## 5. Where it lives

`src/colleague/acts.ts`, `src/colleague/reminders.ts`, `src/capabilities/locals.ts` (`remind_me`), `src/screens/AiModeScreen.tsx`, `src/colleague/delivery.ts` / `voice.ts` / `floor.ts`.
