# Luna, the conversational colleague — what she can do today, and the laptop demonstration

*12 November 2026. Rowland: "people should be able to talk to Luna about their business, and she should be capable of helping them
understand and improve it … a laptop demonstration next week to a senior business leader … 'Good morning, Luna' … a natural spoken
conversation … then a real business question investigated with real information … Do not claim a capability works until it has been
tested."* This page answers the eight questions asked, says what was built for the demonstration, what is proved and how, and what is not.

## 1. The eight questions, answered from the code

| # | Question | Answer, before this work (12 November) |
|---|---|---|
| 1 | How conversational is she? | Her voice and manner were well defined (`COLLEAGUE_SYSTEM`: WHO YOU ARE, HOW TO TALK — plain British English, brief, one question back, challenge assumptions, no stock phrases). Every rule after that was about work. |
| 2 | Everyday conversation, or tasks only? | Tasks only, by design of the rules. Nothing told her how to answer a greeting or small talk, and the task-led rules ("resolve the line, run understand_task") pulled her towards tools at the first sentence. Nothing stopped her pretending to a weekend. |
| 3 | Context across a conversation? | Yes. The whole conversation is sent each turn (up to 600 turns, `TALK_LIMITS`), with its threads (current and parked, each with its aim, decisions and open questions), the subject's context, the notebook of the client's words, the files in the register and the results made. |
| 4 | Casual to business? | Possible, but not guided — and the greeting on screen said "Good morning, rowlandglew35" (the e-mail's first part), which is not how a colleague greets anyone. |
| 5 | Analysis during conversation? | Substantial and real: findings (the brain's homework), outcomes and history, query_data and query_workbook (over every row, by code), explain_change (what changed between two periods and where), join_results (budget against actual by label), work_out, charts, reports and slides. Every figure is the app's; a figure in her words that nothing worked out is marked *Check this*. |
| 6 | Excel, honestly? | A workbook of any size (proved to 57 MB, 1.4 million rows) is read on the device; workbook_profile maps every sheet and finds the connections between them from the values; query_workbook answers across sheets with lookups and sums per row; workbook_rows gives the cells behind a figure. **Missing: plan against actual.** "Why is there a variance?" could only be answered by several questions put together by the model — no capability found where a plan-against-actual variance sits. |
| 7 | What stops the laptop demonstration? | (a) No everyday conversation; (b) the wrong name in the greeting; (c) no variance analysis; (d) voice proved only with the browser's parts played by a script — never on a laptop's real microphone and speakers, where her own voice can be heard back; (e) nothing proved the whole conversation with the real model. |
| 8 | The smallest set that makes it convincing | The five below — each additive, through the same engine, data, calculations and permissions. Nothing of Manual Mode changes. |

## 2. What was built

1. **Everyday conversation** — a section of her rules (`EVERYDAY CONVERSATION` in `COLLEAGUE_SYSTEM`): a greeting answered in a sentence;
   small talk short and natural with a light question back; **no capability run, no thread opened, no menu on a greeting**; never a
   pretended feeling or life ("All good here, thanks — ready when you are"); introduced once at most; into the work without ceremony; the
   thread of the conversation kept and used, never recited; **the role sets the depth, never the truth** — an operator what to check, an
   engineer the mechanism and the evidence, a manager the gap, cause, money and owner, a director two or three sentences.
2. **The greeting's name** (`lib/greetName`): the brand's first name, else the name said on the actions, else an e-mail only when it is
   plainly a first name (`rowland.glew@…`), otherwise no name. Never a sign-in.
3. **Plan against actual — `explain_variance`** (`lib/data/variance`, `capabilities/dig`): the plan and the actual as two columns of one
   sheet or two sheets matched by the fields they share (or the ones the person says are the same); the totals, the variance and its %,
   above or below plan (adverse or favourable only when told which way is good); for every field, each value's plan, actual and variance,
   ranked by its share; **the field that concentrates it judged against each value's own share of the plan** — so Line 3, a third of the
   plan carrying 56% of the shortfall, is read before Nights, half the plan carrying 56%; then within that value the next field down. A
   value planned with no actual, or made with no plan, is named; a field on one side only is named, never guessed. Kept as a result to
   chart and report. It says *where*, never *why*.
4. **The investigation rule** — "WHY IS THERE A SIGNIFICANT VARIANCE?": find the plan and the actual from the map (ask if there are two
   candidates); explain_variance; then the *why* from the other sheets (the downtime log, rejects, changeovers) for the same line, period
   and shifts; money by a lookup from the master; then brief it as an analyst — the size, where it sits, the figures with their sheets,
   what is **established**, what is a **hypothesis** (and how much of the variance it accounts for, by the app's figures), what the
   workbook **cannot** tell, and **one** next step. Never a correlation called a cause.
5. **The demonstration workbook** (`scripts/workbook/make-demo-workbook.mjs`): October 2026 — *Production* (a row a day, shift and line:
   planned and actual packs, a title above the header), *Downtime log* (451 stops: line, area, machine, reason, minutes), *Products* (rate
   and contribution a pack). Its totals are kept as it writes: plan 6,006,000, actual 5,529,584, **−476,416 packs (−7.9%)**; Line 3
   −266,568 (56%); within Line 3, Nights −167,818; Line 3's stop minutes led by the **Bagger** (1,677.5 of 2,317) in the **Packing** area,
   mostly *bag presentation* from the 13th; 243,481 packs of Line 3's shortfall are the stops at the product's rate and **23,087 are not
   explained by any stop** — the part a good analyst says is not accounted for; £55,508.58 of contribution.
6. **The real-model demonstration run** (`scripts/eval/luna-demo.mjs`): the conversation typed into the real app, every ask to the live
   service through its check door, each turn marked by code — greets back and runs nothing; small talk short, no feelings, no second
   introduction; the workbook attached through the composer; the variance question — workbook_profile, explain_variance, the downtime
   sheet asked, the size said, Line 3, the Bagger or packing, no *Check this*, established kept apart from hypothesis; how much is the
   stops and what it cost; the managing director's two sentences.

## 3. How it is proved

| What | Proof |
|---|---|
| The variance, against figures it did not make | `src/capabilities/__tests__/variance.test.ts` — the generated workbook read by the device's own reader: totals, Line 3 first with 56%, within Line 3 Nights, the Bagger first in the downtime log, the contribution by lookup and calc, a field on one side named, a period without a date field refused |
| explain_change unchanged by the new rule of concentration | `src/capabilities/__tests__/dig.test.ts` (the old ordering is the default) |
| The greeting's name | `src/lib/__tests__/greetName.test.ts` |
| The rules sent, the lean cut still holding | `src/tools/colleague/__tests__` |
| **With the real model** | `scripts/eval/luna-demo.mjs` — results in §5 below. Only after the gateway carries the new rules and schema (deployed on merge to `main`). |

## 4. Voice on a laptop — what is known and what is not

The voice is the same engine as the text (`colleague/VoiceMode`, `speech`, `voicePrefs`; docs/VOICE.md): the browser's speech recognition
writes the words, a pause ends the turn (its length a setting), her reply is said a sentence at a time in the device's best British voice,
and Interrupt stops her at once.

| Part | On a laptop | Status |
|---|---|---|
| Hearing (speech to text) | Chrome and Edge offer it (Google's or Microsoft's service, over the network). Safari's is weaker; Firefox has none. | **Proved only with the browser's part played by a script.** Not tried on a real laptop microphone. |
| Speaking (text to speech) | Edge on Windows offers Microsoft's *Natural* voices (e.g. *Sonia*, British) — the best available to a web page; Chrome offers *Google UK English Female*. Ranked first automatically (`voiceRank`). | Ranking proved by test; how it sounds is not. |
| End of a turn | A pause after the last words (default ~1.2 s; a pause after "and" is not taken as the end). | Proved by script. |
| Interruption | **With laptop speakers and no headset, the microphone is closed while she speaks** (talk-over is *with a headset* by default), so she is interrupted with the **Interrupt** button or a key, not by voice. With a headset, speaking over her stops her. Her own voice heard back is guarded (`echo.test.ts`). | Proved by script; the echo of real speakers into a real microphone is not. |

**For the demonstration, until it is tried on the laptop itself:** Edge on Windows (or Chrome), a USB or Bluetooth headset or a
conference speakerphone with echo cancellation; *Before you walk the floor* (More ▾ in AI Mode) run first; typed conversation as the
fallback if the room's network or microphone lets it down — the same Luna, the same answers. **Voice on the laptop is not claimed to work
until it has been run on that laptop.**

## 5. The real-model runs

*(Each run's turns, steps, marks and times are kept by the script; summarised here as they are run.)*

## 6. The demonstration, as it is meant to go

1. AI Mode open. "Good morning, Luna." — she greets back by name, in a sentence.
2. A word of small talk — answered as a colleague answers, nothing pulled up.
3. "Here's October's production workbook…" — attach it (+ in the composer); she says in a few sentences what it holds.
4. "There's a significant variance against plan. Can you find out why?" — where it sits (Line 3, nights), what the downtime log says (the
   Bagger, bag presentation, from the 13th), how much of the shortfall the stops account for and how much they do not, what is established
   and what is not, and one next step (watch the Bagger on nights, time it).
5. "What has it cost us?" — the contribution, by the master's rates, worked by the app.
6. "Two sentences for the managing director." — the same findings at the director's depth.
7. If asked to show it: a chart of the variance by line (make_chart), and a report (build_report) — both from the kept results.

What not to show yet: workbooks held on the server (not decided), production-system connections (switched off), anything voice-only on
an untried microphone.
