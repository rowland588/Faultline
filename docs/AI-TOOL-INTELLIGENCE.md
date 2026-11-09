# The tool intelligence layer (10 November)

Rowland, 10 November:

> *"Access to an application's underlying function does not automatically mean that the AI can operate the complete tool reliably
> through conversation … The AI must understand what each tool does, what it needs, how evidence can be obtained, what can be done
> conversationally and what still requires the user."*

> *"We keep losing time because bags aren't presenting properly on Line 3 … The AI must not simply create a Pareto from the user's
> statement."*

This sits on `docs/AI-MODE.md` (capabilities, the gateway), `docs/AI-OPERATING.md` (a connector for every tool, live measurement, the
work pane) and `docs/AI-TASK.md` (the task leads). What it adds is the AI's knowledge **of each tool**: what it can answer and what it
cannot, when it is the wrong tool, what it needs, how that can be got, how much is enough, and operation by operation what can be done
in conversation and what is the person's. It is built inside the existing assistant. It is not a second chatbot, a second data model
or a registry the person ever sees.

## 1. What each tool says about itself — `src/capabilities/intel/`

There is one definition per tool, keyed as its connector is (`capabilities/connectors CONNECTORS`). There are 35 of them, and the test
refuses a connector without one. Each definition carries:

| Part | What it holds |
|---|---|
| Purpose | `does` (what it actually does) · `answers` · **`cannot`**, the questions it must never be used for |
| Applicability | `when` · `notWhen` · `instead` (another tool, and when to use it instead) · `stage` (where it sits in an investigation) · `dependsOn` |
| Requirements | `fields`: each input, required or optional, its routes in order of preference, and whether the tool works it out (`derived`, never asked for) · **`enough`** (how much evidence, with why: 20 stops over a week, 30 readings, 100 observations a person) · `assumptions` · `quality` |
| Evidence routes | `acquire`: conversation · records · live · page timer · manual · spreadsheet · document · photo · video · drawing, each **supported**, **unavailable** or **future**, and either how (the capability or page) or why not |
| Operations | `ops`: each with its own **level** |

### The four levels, per operation

| Level | Meaning | What a definition must give (the test checks it) |
|---|---|---|
| 1 | Fully conversational | The capabilities that do it, each in the registry |
| 2 | Conversational, with evidence | The capabilities, and `needs`: the evidence it needs |
| 3 | Assisted human interaction | What the person does (`interaction`: draw, drag, position, select on screen, review footage, film, measure a distance, observe, inspect), on which `page`, the `handover` words, what is read back `after`, and `why` the AI cannot |
| 4 | Not supported today | `why`, and the manual way |

Of the 204 operations, 164 are level 1, 16 level 2, 18 level 3 and six level 4 — what is genuinely not possible today, each with why
and the manual way: reading stops from a machine's own signals (Faultline is measured by people, not sensors), timing a changeover from
footage, taking a reading off a photo of a gauge, laying out a line standard from a photo, working out walks from footage or a photo, and
watching footage in the conversation.

A level is said of an operation, never of a whole tool. For example, the line standard's people are **level 1** (`place_people`), but
placing them on the board is **level 3** (drag and position). A capability study's readings are **level 2** (`add_readings`, which
needs readings measured on the product). A video study's review is **level 3**, because the AI is not given the footage and never
claims to have watched it.

### Held to the code — `src/capabilities/__tests__/intel.test.ts`

- Every connector has a definition, and no definition is of a tool that does not exist.
- Every definition is substantive: it says what it does, what it answers, what it cannot answer and when to use it, names a required
  input, has a supported route in, and has more than one operation.
- Every level 1 or 2 operation names capabilities that `registry` runs, and every level 2 says what it needs.
- Every level 3 gives its interaction, page, hand-over words, what is read after, and why. Every level 4 says why.
- No level 1 or 2 operation is a visual act: the AI never draws, drags, places or films.
- Every supported route names a capability that exists, or the page where it is done. A **live** route exists only where a measure
  adapter exists (`connectors/measure MEASURE_TOOLS`), and every adapter is some tool's live route.
- A photograph or footage is never claimed as a measurement.

## 2. How evidence is known

`HowKnown` now has nine kinds: **observed · reported · measured · imported · calculated · estimated · hypothesised · verified ·
unknown**. `imported` and `estimated` were added on 10 November. The AI never sets *verified*. Every note, draft value and problem
keeps its kind, and the gateway is told never to present one kind as another, never to add one into another, and never to fill a gap
with an estimate.

## 3. The capabilities

| Capability | Kind | What it does |
|---|---|---|
| `tool_intel` | read | A tool's definition in words: what it does and cannot do, when to use it and what instead, what it needs, what is enough, the routes (and which are not possible yet), and each operation's level with its hand-over |
| `assess_evidence` | read | For a tool on a line: what is already held (for the stops, the Pareto as it stands; for any other tool, its records, their age and its own finding), what it still needs, whether that is enough, and the best way to get the rest: the records when they are there, a live measurement before typing by hand |
| `pareto` | read | The Pareto from every source there is, each kept apart (§4) |
| `import_table` | read | The downtime files attached in the conversation and read in code: the columns found, the rows read, the rows left out and why |
| `hand_over` | local | A level 3 step: the person's page opened beside the conversation, the step kept on the subject (`ColleagueThread.awaiting`), and exactly what to do and why the AI cannot |
| `handover_state` | read | Whether the record has moved since the step was handed over. This is read from the record, never assumed |

**AI Mode** shows a handed-over step in the context panel as *Over to you*: what to do, *I can't do this part on the screen*,
*Open the page* and *I've done it*, with 44 px presses. A CSV or Excel file attached in the composer that holds a reason column and
minutes or counts is **read in code** (`intel/pareto downtimeTable`, `csvRows`; `lib/xlsxRead`). It is kept on the conversation
(`facts.imports`) as imported evidence and never written into the line's timed stops or sent to a model. Any other file is a factory
document, as before. The gateway's focus names the task, the step handed over and the files read.

**The colleague** (`tools/colleague/colleagueAssist` KNOW THE TOOL, AND WHAT YOU CAN AND CANNOT DO WITH IT):

- Read `tool_intel` before choosing how to get evidence.
- Run `assess_evidence` before asking for any figure.
- Keep each kind of evidence for what it is.
- A Pareto needs reasons with a quantity. Frequency is not duration. Never draw a Pareto from the problem as said.
- A file is read by Faultline, never by the AI.
- Level 3 belongs to the person: hand it over, say why, and read the record back once they say it is done.
- When blocked, say what it can do, what it cannot, why, what the person must do, and what happens next.

## 4. The Pareto — the reference implementation (`intel/pareto.ts`, pure)

Evidence comes in **sources**, each of one kind, and sources are never merged:

| Source | From | Ranks |
|---|---|---|
| measured | Stops timed by stopwatch: live in AI Mode, or on the stops screen | Time lost, and how often |
| reported | Stops typed after the fact, and figures said in the conversation (`pareto`'s `reported`, passed as said) | Whatever was given |
| counted | Stops tapped as instants | **How often only**. There are no minutes |
| imported | A downtime file read in code | Whatever columns it has |

The source that **leads** is the best there is: measured, then imported, then reported, with counted used only for how often. The
others are said as *kept apart, not added in*. The statement includes:

- where and when, the total, the leader (its minutes, stops, share and minutes a stop) and the next reason;
- the vital few, and each line's own leader when there are several lines;
- the movement against the period before;
- **how sure**, from `lib/intelligence/confidence`: thin under 7 days or 20 stops, fair under 21 days or 60, solid beyond that;
  reported is never more than reported;
- **what more would make it enough**, for example *17 more stops, 6 more days*.

The checks on the evidence:

- **Frequency without duration** is said as such: only how often is known, never the time.
- **Duration without frequency** is said as such: cannot tell many short stops from a few long ones.
- When ranking by time and by count disagree, both are said.
- **Conflicts** are said, never averaged away: two sources that put different reasons first, the same reason at shares 20 points
  apart, or the same reason said twice with different figures (*which is right?*).
- With nothing to rank it **refuses**, says how to get the evidence, and says never to draw a Pareto from the problem as said.

A downtime file's reason column is matched by name (reason, category, cause, fault, …). Minutes are found by duration, downtime or
time lost, with hours and seconds converted. Counts are found by stops, occurrences or frequency. Line and date columns are optional.
`h:mm:ss` is read. A value that is not a number is left out and named, never guessed.

## 5. How it is proved

- `src/capabilities/__tests__/intel.test.ts`: every definition true to the code (§1).
- `src/capabilities/__tests__/intel-ops.test.ts`: every tool, as the assistant meets its limits, through the real capabilities —
  `tool_intel` says each of the 35 tools with every operation and its level; every level 1 or 2 operation is refused a hand-over
  (the AI does it); every level 3 is handed over with its page, what to do, *I can't do this part* and what is read back; every level 4
  is refused with *That is not supported yet* and the manual way; and "why this line is struggling" is read as lost time with one next
  step.
- `src/capabilities/__tests__/pareto.test.ts`: **the ten scenarios**, each worked by hand:
  1. History: 66 stops over 22 days, solid, 154 of 198 minutes.
  2. Figures said: reported, never timed.
  3. The live stopwatch: start, stops said, ranked; thin with 17 more stops and 6 more days.
  4. A spreadsheet read in code: imported, kept apart, the unreadable row named, the line's stops untouched.
  5. Not enough data.
  6. Conflicting figures: the stopwatch against what was said, and a reason said twice.
  7. Frequency without duration.
  8. Duration without frequency, from an hours column.
  9. Several lines, each with its own leader.
  10. Different periods: from and to, against the period before.

  Plus: nothing to rank, a figure with no quantity refused, `assess_evidence`, and `hand_over` with `handover_state`.
- `scripts/acceptance/ai-pareto.mjs`: Rowland's sentence in the browser, the gateway played by the script.
  1. Nothing yet: refused and nothing written.
  2. The operators' 45 minutes: reported.
  3. Timed live: three stops and one undone; the stopwatch leads, thin, what more is needed, and the said figure kept apart.
  4. A downtime CSV attached: read in code, the bad row named, ranked as imported, the line untouched.
  5. A level-3 step handed over: the line's Actions in the pane, *Over to you* in the panel, not done and never assumed.
  6. The phone.
  7. The stops on the line's own page in its own words.

## 6. Not yet — visual intelligence, prepared for and not pretended

- The AI is given **no photograph's or footage's content** except where a model already reads it and says so: Line Talk's photos,
  the video study's *Name the work from the frames* (ticked on its page), and a brief's scan. It never claims to have looked at
  anything else.
- Drawing, dragging and placing (the line standard's board, the spaghetti board, the SMED grid, the Gantt's links), filming, judging
  footage, measuring a distance, and confirming a cause on the floor are **level 3**. They are handed over and read back.
- Future routes are marked `future` in the definitions. They include plate speeds from an OEM manual, readings and stops from a
  spreadsheet into the tools' own records, a whiteboard photo into the line standard, and a changeover read from footage. Each becomes
  `supported` only when the code does it, and the test then requires the capability.
- A downtime file is kept on the conversation as imported evidence. Turning it into the line's own records is a decision for
  Rowland. It would need its provenance kept on every row.
