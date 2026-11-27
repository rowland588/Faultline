# Luna conversation acts — 24 November 2026

Rowland, 24 November: *"conversation intelligence and the sound of her … What she is capable of in the conversation: make a report, she does; send the report, she does; let’s track that; remind me tomorrow, she does."*

This slice is that, on the **Luna product** only (`#/ai`, `html[data-luna-product]`). Reports and summaries are Luna. Trackers, methods, Actions and catalogue tools stay Faultline — not added here. The G6 parked-job server loop is a different slice (overnight jobs) and is not rebuilt.

**Product around these acts (`docs/LUNA-PRODUCT.md`):** make-a-report is live in the conversation; saved HTML lives in **Artifacts**. Remind-me is live on this page when Luna is opened, for the **signed-in person**. **Schedules** are first-class jobs in **Luna › Schedules** — not a chat card, not a trigger list. Chat is where the person asked her, in ordinary language. She uses `send_email` with a rhythm when that is what they meant. Confirmed email runs through Resend while the app is shut. G7 weekly digest at Set up is the same list, not a second home.

## 1. How she talks

A colleague across the table, not a report. Lead with the thing they asked. Never “In summary”, never “Key findings”, never a recap of what they just said. Spoken: the first sentence is its own phrase so the phone starts talking at once.

## 2. How she sounds (phone PWA)

Still the device’s own `speechSynthesis` — no external TTS. On Android/Samsung: on-device voices ranked above network ones; Samsung / high-quality names preferred; `speechSynthesis.resume()` before each utterance (Chrome pauses after a quiet spell); voices warmed when Luna’s page loads. **MediaSession is still fully cleared on leave** (`floor.ts` `clearMediaSession`) — not regressed.

## 3. What a person can say

| Said | What the app does | Proof |
|---|---|---|
| **Remind me tomorrow** (to look at the wrapper) | `remind_me` — kept for the signed-in person, shown on `#/ai` that day. Not a Faultline action. Honest: it shows when Luna is opened; it does not fire while the app is shut; it does not notify anyone else. A short timer (“in twenty minutes”) is still `start_timer`. | `acts.test.ts`, `remind.test.ts`, `luna-conversation-acts.mjs` |
| **Make a report** / **put that in a report** | `build_report` from the latest chart in this conversation, else the latest result. Every figure already the app’s. Nothing yet → she says so. | same |
| **Send this report to jane@…** | `send_email` on a **confirm card**. One-off: Resend if ready, else Outlook / Graph Mail.Send as `docs/LUNA-MAIL.md`. Spoken yes: “yes, send it” / “send it”. A name without an address still goes to Luna (`find_person`). | same; mail tests |
| **A report on a rhythm, in their own words** | Luna uses `send_email` with `repeat` — a confirm card, then a **schedule** in Luna › Schedules (what, when, who, last run, next run). Not a keyword the person has to hit. Resend sends the report as it stands while the app is shut — not Outlook, not rebuilt from a later workbook. A briefing with no report still rebuilds from synced lines and open problems. Honest if Resend or the domain is unset. | `mail.test.ts`; `standingJob` schedule tests; `luna-conversation-acts.mjs`; `standing-job.mjs` |
| **Make me a training document for X** / **the document I just uploaded — turn it into an SOP** | In code (`colleague/conversationalDocs`). A library method (5S, SMED, DMAIC) is written from `method_knowledge`; any other X from general operational knowledge, said so. A **chat-uploaded** PDF/doc is bound by its source id (`make_procedure_from_source`) — not the machine-manual path. Format chips only when they did not say SOP vs work instruction vs training vs slides. Site-specific X asks for a source once; nothing is invented. | `conversationalDocs.test.ts`, `manuals.test.ts`, `luna-knowledge-documents.mjs` |
| **File this with Night shift** / put this in a workspace | `move_into_workspace` — Luna takes the intent (not a magic phrase), creates or matches this customer’s workspace and moves this chat and its files into it. Without a name, she asks once. Never another customer’s, never archived. The drawer uses the same path. | `acts.test.ts`, `lunaWorkspace.test.ts`, `luna-projects.mjs` |
| **Hello, Luna** then **show me top losses** / **what happened last week compared to the week before** | Meeting hello in the app. The look-up runs on the customer in hand; if they have not named graphs, a table or a report she asks once how they would like it (`colleague/presentAsk`). Choosing Graphs draws the app’s result. Named form: she does it and does not ask again. | `presentAsk.test.ts`, `hello.test.ts`, `luna-client-office.mjs` |

Well-formed remind / make-a-report / one-off send phrasing is answered **in code** (`colleague/acts`, `colleague/conversationalDocs`, `answeredInCode`) — no AI asked. A schedule in ordinary language goes to Luna, who uses `send_email` with a rhythm — not a keyword router. Who she is, and filing a chat into a workspace, go to Luna — her colleague voice and `move_into_workspace`, not a classifier.

**27 November · conversational documents.** Luna is conversational: after an upload she offers “Do you want it as an SOP or a work instruction?” with chips, then does it. Follow-ups in the same chat (“and slides”, “HTML”, “Make this an SOP”) change that draft. Hello and fast-chat never swallow a training or last-upload ask.

**27 November · client-office meeting.** On `#/ai`, “Hello, Luna” is a person meeting a person — warm, short, in the app (`colleague/hello`). A named guest in the room, or “Hello, I’m Sarah”, is greeted by name with no Sign in and no new page. Empty Luna stays orb + name + box. Then “show me top losses” / “what happened last week compared to the week before”: she starts the look-up through `query_data` on the customer in hand and, when they have not named the form, says “No problem — I’ll get on it now. How would you like it? Graphs, or another way?” with chips (`colleague/presentAsk`). Choosing Graphs draws the app’s result. If they already said graphs, a table or a report, she does that and does not ask again. Hello never swallows a data ask. Every figure is the app’s. Proof: `presentAsk.test.ts`, `hello.test.ts`, `luna-client-office.mjs`.

## 4. What this slice does not do

- Overnight / parked jobs on the server (G6, T-51) — a different slice from a standing schedule.
- Faultline Actions, methods, catalogue tools, or a tracker.
- Sending without a card, or inventing a figure.
- Rebuilding a conversation workbook report from cloud bytes while the app is shut (the scheduled send is the report as it stands).
- Native Android TTS (still the web app — `docs/VOICE.md`).

## 5. Where it lives

`src/colleague/acts.ts`, `src/colleague/conversationalDocs.ts`, `src/colleague/hello.ts`, `src/colleague/moveIntoWorkspace.ts`, `src/capabilities/manuals.ts` (`make_procedure_from_source`), `src/colleague/reminders.ts`, `src/capabilities/locals.ts` (`remind_me`), `src/capabilities/lunaWorkspace.ts` (`move_into_workspace`), `src/screens/AiModeScreen.tsx`, `src/colleague/delivery.ts` / `voice.ts` / `floor.ts`.
