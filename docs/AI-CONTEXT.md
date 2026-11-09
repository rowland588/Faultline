# The colleague understands Faultline — application awareness and conversational context (9 November)

Rowland, 9 November: *"I want to take Faultline beyond a conversational AI interface … an intelligent manufacturing colleague
that understands the application it operates within, understands the user's intentions and knows how to connect conversational
work to the correct application records … Not every conversation is a project … It must never silently attach work to an
incorrectly identified record … Never create duplicate records simply because the AI cannot find an existing one."*

This page says what was built on top of AI Mode (`docs/AI-MODE.md`) and the factory knowledge (`docs/FACTORY-KNOWLEDGE.md`) to do
that, where it lives, and how it is proved. It is one layer inside the one conversation — no second chatbot, no second data model.

## 1. What was already there (inspected first)

- **Capabilities** (`src/capabilities/`): typed reads, locals and writes over the same `src/db` functions the pages use; the
  registry runs every call (validate → access → confirmation for a write → run); the gateway (`supabase/functions/assist`, task
  `colleague`) refuses any call not in `schemas.ts`.
- **The conversation** (`src/colleague/conversation.ts`): a `talk` study with `facts.colleague` — its turns, its **threads** (one
  current, others parked, each with a scope of line · project · problem · story, notes saying how each is known, refs), its actions
  and its **drafts** (tools being filled; nothing is a record until `make_record` is confirmed).
- **Factory knowledge**: `factory_map` and `resolve` (lines, machines, areas, sites; never another client's), onboarding drafts,
  sources, replacement.

What was missing: a way for the colleague to know what the app holds and can do without a giant prompt; a reading of *what the
person wants to do* that asks only what is needed; resolution of projects, problems, tool records and "that one"; the
standalone / linked / just-talk distinction; linking an existing record to a project; duplicate checks; and the destination said
before a record is made.

## 2. What was added

| Piece | Kind | What it does |
|---|---|---|
| `src/capabilities/appModel.ts` | pure | **The record kinds and how they relate**, each relation named by the field that holds it (a problem: `workspace_id`, `target_asset`/`asset_id`, `project_id`, `program_id`, `after`; a tool record: `workspace_id`, `project_id`, `machine`, `uses`; a project: its lines in `pace_ppm`; client · site · area are words on lines, not records; an action is a problem's owner and day). **The floor's words for a kind of work** (`ACTIVITIES`: observe, downtime, changeover, output, people, quality, motion, flow, cause, checks, hold, document, sum) → the app tools that do it (catalogue registry keys, held to the registry by a test) and the one question that tells them apart. |
| `describe_faultline` | read | The app as it is now, **read when asked**: the record kinds, every capability from the registry with its schema's description and required inputs and **whether this person may use it here** (a write checked with `mayEdit` / `mayStartProjects`), every tool from the catalogue registry with what it needs and gives, the eight methods. A new capability, tool or method is known the moment it is in its list. |
| `plan_work` | read | "I want to carry out an observation analysis": the activity, the tools, what the conversation already knows (line, machine, project, mode, aim), what already exists (records of those tools on the line, the line's projects, drafts in hand, open problems that sound the same) and **one question** — the line (naming the lines, each with its client when two are in sight), which tool (when they differ), the machine (from the line's list), carry on an existing record, or project-or-standalone (only when the line has a project and nothing is settled). None when it is just talk. |
| `resolve_record` | read | Areas, lines, machines, projects, problems, tool records — **from the conversation's own subjects first** ("that line", "the existing project", "the previous investigation"), from the person's other conversations for a day said ("the machine we looked at yesterday"), then by name; a line's own projects or records for "the project" / "the investigation" with a line in hand. One · several · none, only within the client in hand (`factory.scopeOf`), never another client's. |
| `update_context` | local | The current subject's **aim**, **mode** (`talk` · `standalone` · `project`), line, project, machine, record, and its **points** (decision · assumption · question, a question later answered). A **correction** of line or project moves the drafts not yet made with it and drops a project not on the new line, saying so; a project not on the subject's line is refused. |
| `link_to_project` | write | A tool record or a problem put into a project, as the study's *Attach to a job* and the problem's project do — **only a project on the same line**; moving it out of another project is said on the card; a client cannot. The subject working on it becomes linked. |
| Duplicate checks | — | `start_draft` carries on the draft of the same tool for the same place rather than start a second; `make_record`'s card names records of the same tool on the line alike in name; `start_project` refuses a second project of the same name on the same line and its card names the ones there; `raise_problem`'s card names an open problem that says the same. |
| Destination on the card | — | `make_record` says the line with its site › area and the project, or *standalone — in no project, as you said*, or *in no project (not in "X")*; `raise_problem` says *in no project* when it is. |
| The focus the gateway reads | — | `focusText` now carries each subject's aim, kind of work, machine, record, decisions, assumptions, questions to answer and answered, the records touched, and the parked subjects with their place and mode. |
| The context panel | screen | Under *Now on*: the aim, the kind of work as a chip (*Just talking — nothing kept* · *Standalone — in no project* · *In the project* · *Not settled — project or standalone*), the machine, the record, and what was decided, assumed and is still to answer. |
| The rules (`src/tools/colleague/colleagueAssist.ts`) | gateway | New sections: *Understanding what they want*, *Which one they mean*, *Not everything is a project*, *Where a record goes*, *What Faultline can do* — plan_work first, one question, resolve before use, corrections without starting again, modes respected, the destination said, search before create, never claim a capability that is not available. |
| `set_focus` | local | Its own title first, then a subject on the same place; a subject that is only its place so far (opened on a line, nothing said) takes the new subject's name, so "back to the Filler changeover" finds it. |
| AI Mode's page | screen | Arriving on a different line or project while AI Mode is open starts a new conversation on it — never the one in hand carried on under a place it was not about. |

Nothing deletes, nothing is marked verified, no figure is worked out by the colleague, every write is still a card. RLS and the
client separation are unchanged: every read is over what the device holds (the person's lines) and filtered to the client in hand.

## 3. How it is proved

- `src/capabilities/__tests__/understand.test.ts` — the model held to the registry; describe as owner and as a client; plan_work's
  questions (no line; tools told apart; standalone never asked again; machine from the line; carry on an existing record; talk);
  resolve_record (an area, several lines, never another client, "the existing project", a record by name, "yesterday");
  update_context and link_to_project (standalone draft, linked later, a project on another line refused, made then linked by its
  card, a client refused, a correction moving a draft and dropping the project, a question answered); duplicates.
- `scripts/acceptance/ai-context.mjs` — Rowland's twelve journeys in the browser, the gateway played by the script: what Faultline
  does with each call, what the panel and the cards say, what is in the database and in Manual Mode afterwards.

**What is not proved here:** the model's own judgement — whether Claude, given these rules and capabilities, asks the right one
question in good words — can only be seen on real calls, signed in on a device. The acceptance script proves everything Faultline
does with the calls; the wording is the model's, held by the rules.

## 4. Adding to it

- **A new tool** needs nothing here: `describe_faultline` lists it, `plan_work` finds it by the catalogue's search; add it to an
  activity in `appModel.ts` when the floor has a word for the work it does (the test holds the key to the registry).
- **A new capability**: the registry and `schemas.ts` as ever; `describe_faultline` lists it with its access. If it makes or reads a
  kind of record, add it to that kind's `madeBy` / `readBy` (the test checks the name exists).
- **A new kind of record or relation**: the blueprint's §2 first, then `RECORD_KINDS`, with the field that holds the relation.
