# The task-led application (10 November)

Rowland, 10 November:

> *"The user should not have to navigate Faultline to find the functionality they need. They should not need to know that a
> capability study exists as a separate module, where the measurement tools are located, which analysis function to open, or how
> to generate a report. They should simply tell Faultline what they are doing, what they have observed, what they want to
> investigate, or what they want to achieve … The application should adapt to the user's task, rather than forcing the user to
> adapt to the application's structure."*

> *"A user walks onto a factory floor and says: 'I think we're losing too much production time on this line. Can you help me
> understand why?' They should not need to know where to start. Faultline should take the initiative … The user describes the work.
> Faultline works out how to support it."*

His six moves: **understand** (the task, with the business, factory, line, machine and project context), **determine** (the
capabilities, records, tools, methods and information it needs), **act** (through the existing functions, with their permissions
and confirmations), **guide** (questions, findings, what is missing, the next useful step), **maintain continuity** (the task and its
progress across the conversation, a change of direction, a return), **complete** (to a meaningful outcome, with the records,
evidence and history kept). And: one application, one intelligence — the AI uses the real functions, never simulates, never invents
data, never bypasses the app's logic; Manual Mode and every page keep working, and whatever the conversation does is in the same
records.

This sits on `docs/AI-MODE.md` (capabilities, the gateway), `docs/AI-CONTEXT.md` (understanding the app and where work belongs) and
`docs/AI-OPERATING.md` (a connector for every tool, the kinds of work, live measurement, the work pane). What it adds is the task.

## 1. What was missing (10 November)

Asked "I think we're losing too much production time on this line", Faultline read no kind of work (*losing*, *production*, *time*
were not its words), and where it did read one it asked the person to choose a tool — "Is it the whole line's stops over a shift
(stops timed, then the loss count), one machine watched for failures (reliability), or several workstations?" That is navigation by
another name. Nothing looked at what the line already held before asking, and nothing kept the task once begun.

## 2. What it does now — `src/capabilities/task.ts`

| Capability | Kind | What it does |
|---|---|---|
| `understand_task` | read | The task in the person's words, on its line: the kind of task (`appModel` ACTIVITIES — *lost production time* added), its **route** — the tools in the order the method takes them, each with why (`ROUTES`) — and, step by step, what the line already holds, read from the real records: each tool's own finding (`ProductionLineScreen toolSaysOf`, the line page's own words), the stops of the last four weeks (`stopsOf`), the 6M problems; each step **known · old (over 28 days) · not done**; the open problems and what they cost; and the **one next step** with its reason. It is told to recommend, never to offer a menu. |
| `keep_task` | local | The task kept on the conversation's current subject (`ColleagueThread.task`: goal, kind, line, steps, when it began). The subject takes the task's goal as its aim and title, so "back to the lost time" finds it; parking the subject parks the task. |
| `task_state` | read | Where the task stands, read again from the records: each step's state, which were done **since the task began**, and the next step. Progress is never stored — it is what the records say. |

**`plan_work`** no longer asks which tool: where a line is known and the work has several tools, it recommends the step the
line's evidence names ("Start with Stops timed — where the line's time goes … Shall I set it up?").

**The context panel** shows *The task* under the aim — its steps in order, each in a word (Done · Old · Not done · Next, *this task*
on what was done since it began), the line's finding beside each, and *Next: …* which puts the words in the box. It reads the records
live: a stop timed or a study made anywhere in the app moves it.

**The colleague** (`tools/colleague/colleagueAssist` THE TASK LEADS): when the person describes a problem or an outcome, resolve
the line, run `understand_task`, say what is known and what is missing in the tools' own words, recommend the next step with its
reason, and on their yes `keep_task` and start the step through its capability; after each step `task_state`, and the next step
offered the same way, to the outcome — the cause found, the fix in place, the proof on the same number, the report.

### The routes

| Task | Route |
|---|---|
| Lost production time | Stops timed → the loss count → Line capacity (the constraint) → Reliability → 6M |
| Downtime | Stops timed → the loss count → Reliability → 6M |
| Output short of target | Line capacity → the loss count → Stops timed → Line balance → 6M |
| Quality | Capability → Control chart → Analysis → 6M |
| Changeover | SMED → 6M |
| The people's work | Line balance → Work sampling → Line standard |
| An observation | Line Talk → Stops timed → Work sampling |
| Any other kind | its activity's tools, in order |

## 3. How it is proved

- `src/capabilities/__tests__/task.test.ts` — a line with nothing (every step not done, start with the stops, the reason, no
  menu); stops this week known in the line page's own words and the next step the loss count; stops older than four weeks old and
  timed again; no line asks for it; rejects start at capability; a task kept on the subject, a stop timed after it began marked done
  in this task and the next step moving on; the same goal kept again keeps its start.
- `src/capabilities/__tests__/understand.test.ts` — plan_work on a line recommends Stops timed for downtime, never "which tool".
- `scripts/acceptance/ai-task.mjs` — Rowland's sentence, in the browser, on a line nothing is known of: understood as lost
  production time, each step's state equal to the module's reading of the same records, the stops recommended with their reason;
  "yes" keeps the task with no card and starts Stops timed (one card); a stop said and its end captured with no card; *The task* in the
  panel moving with no reload, Stops timed done in this task and Next on the loss count; a change of subject parking it and coming
  back bringing it with its progress; the stop on the line's own records; the phone.

## 4. Not yet

- The routes are fixed in code (as the methods are): a new kind of task is one entry in `ROUTES` and its words in `ACTIVITIES`.
- A step's *done* is a record of its tool on the line — it does not judge whether the record is enough (thirty readings, a whole
  shift); the tool's own sentence, quoted beside it, says that.
- The task is on one line. A task across lines, or a whole area, is the next piece.
