# Luna’s product shape — 24 November 2026

Rowland, 24 November (voice): housekeeping to the vision. **This page is the product law for Luna’s shell.** Where an older Luna
document disagrees on the words on screen or on where work lives, this wins. The agent ladder, figures-in-code, two modes, and the
customer guard still live in `docs/LUNA-AGENT.md`, `docs/DIRECTION.md` and `CLAUDE.md`.

**Live vs being built.** A line marked **live** is on `main` and in the app today. A line marked **being built** is the direction —
do not write it into `docs/PAGES.md` as if a person can press it, and do not describe it as live in a handoff.

## 1. She acts, not just answers

Luna is graded as an agent (`docs/LUNA-AGENT.md`): jobs finished alone, work done without being asked. Conversation is how a person
hands work over — not a report she recites.

| Act | Live today | Being built |
|---|---|---|
| **Remind me** | `remind_me` on `#/ai` (`docs/LUNA-ACTS.md`). Honest: it shows when Luna is opened; it does not fire while the app is shut. | Push / overnight remind while shut |
| **Make a report** | `build_report` from this conversation’s chart or figures; its card appears in Artifacts (§2) | Independent artifact storage and live dashboard regeneration |
| **Send this report** | `send_email` on a confirm card (`docs/LUNA-MAIL.md`) | Automatic sending from a schedule, after server authorization |
| **Overnight job** | G6: a job handed over at five is done by morning (`docs/LUNA-G6-SERVER.md`) | Microsoft poll, server `readQuietly`, server-side writes |
| **Standing / scheduled work** | Daily or weekly briefings in **Luna › Schedules** (`standing_jobs`); run, pause, resume, remove when Luna opens | Server-run jobs and scheduled report delivery while the app is closed |

A schedule is Luna acting on her own. It is not a Faultline Action, not a Gantt, and not a method step.

## 2. Artifacts — the home for what she makes

**Partly live.** Chat is the birthplace; the Artifacts drawer lists its saved charts and reports as cards and opens them in their conversation. Chats with outputs are hidden rather than destroyed on removal, so those cards persist. The data still lives in that conversation record.

Each dashboard (and similar generated output) lives in an **Artifacts** place as a **card**: its title, when it was made, the key
metrics it tracks. Open the card to see it. The conversation that made it keeps a receipt, not the only copy.

Dashboards are **ephemeral outputs of a monitoring ask** (“keep an eye on yield”). They are built from data Luna already has and
**regenerated from live numbers each open** — never a template catalogue, never a stale saved page.

**Still to build:** an independent artifact record, scheduled report delivery, and dashboards that regenerate from live numbers. Today's saved charts use the result worked out when they were made.

## 3. Workspaces, not projects

**On Luna’s screen the word is workspace** — a named folder of **data and chats**. Never “project”. Never a Faultline method
(6M, PDCA, DMAIC, catalogue tools).

How it is meant to work:

1. An Excel upload or a live connector **starts in the chat**.
2. The person can say “move that into a workspace” and **name it**.
3. That **workspace owns** the uploads, live connectors, and chats moved into it.
4. A chat **in** a workspace talks **only about that workspace’s data**. A chat not in a workspace sees only itself.
5. Nothing from another workspace or another chat leaks in. The customer guard still holds.

**Live now** (`colleague/lunaFolder`, proved by `luna-projects.mjs`): the machinery is those work folders — isolation,
library, customer stamp. The drawer says **Workspaces** / **New workspace**. Chat and file menus can move them between workspaces, with customer checks.

A chat already keeps everything that happened in it (messages, uploads, graphs, papers, attachments).

## 4. Natural feminine Luna

Luna is a **live, humanistic person** — a colleague across the table, not a report and not a menu. She is female; her spoken voice
is the device’s own female British voice (`docs/VOICE.md`, `docs/LUNA-ACTS.md`). Lead with the thing they asked. Never “In summary”,
never “Key findings”, never a recap of what they just said. Spoken: the first sentence is its own phrase so the phone starts talking
at once.

## 5. One word per thing (do not mix)

| Word on Luna’s screen | What it is | What it is not |
|---|---|---|
| **Workspace** | Named data folder: owns uploads, live connectors, chats | A Faultline **project** (PDCA / 6M / …). A factory **line** (`workspaces` table). A person’s whole Luna (SaaS “personal Luna”) |
| **Chat** | One conversation. Birthplace of an artifact. Keeps what happened in it | The home of dashboards and reports |
| **Library** | Files this chat can use — the chat’s own, or the open workspace’s | Every file of the customer; another chat’s files |
| **Artifacts** | Cards for saved reports and charts, currently stored on their conversation | A Faultline Saved copies library |
| **Schedules** | Visible daily and weekly briefings that run while Faultline is open | Faultline Actions |
| **Personal Luna** | That **person’s** chats, jobs, reminders, mail (SaaS plan) | A **workspace**. Never call the person’s home a workspace **on screen** — Rowland’s word *workspace* is the data folder |

Faultline’s own **Projects** page (`#/projects`) is unchanged: methods, Actions, catalogue tools. Luna does not build those.

Factory `workspaces` in the database remain **lines**. Do not rename the table for this. On Luna’s screen, never say “workspace” for a
line.

SaaS tenant plan: `docs/luna-saas-tenants.md` in the agent store (plan only). There a **tenant** buys Luna; a **person** has a
personal Luna; a **workspace** on screen is still the named data folder inside that Luna.

## 6. Drawer

ChatGPT-shaped ☰ (`colleague/LunaDrawer`, `docs/LUNAR-ENVIRONMENT.md`):

The drawer contains New chat, Chats, Workspaces, Library, Artifacts, Schedules, and Back to Faultline. Artifacts and Schedules are expandable sections. A cloud tick now marks due schedules and can push the owner to open Luna; the briefing text is built on the device when Luna opens. Outlook delivery also needs the device open. The cloud tick had a broken URL until the 24 November cron repair; no enabled live schedule has yet proved the full path.

Empty Luna stays orb + name + box — no Faultline suggestion chips (`docs/LUNA-LOOK.md`).
