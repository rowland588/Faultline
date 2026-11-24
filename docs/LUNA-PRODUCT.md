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
| **Make a report** | `build_report` from this conversation’s chart or figures | The finished report’s **home** is Artifacts (§2), not the chat |
| **Send this report** | `send_email` on a confirm card (`docs/LUNA-MAIL.md`) | Same, from Artifacts and from a schedule |
| **Overnight job** | G6: a job handed over at five is done by morning (`docs/LUNA-G6-SERVER.md`) | Microsoft poll, server `readQuietly`, server-side writes |
| **Standing / scheduled work** | G7 weekly digest at **Set up › Standing briefings** (`standing_jobs`) — not a list in Luna’s drawer | **Visible schedules** in Luna: “run this report, send it to this person, daily” — a list the person can see, pause and stop |

A schedule is Luna acting on her own. It is not a Faultline Action, not a Gantt, and not a method step.

## 2. Artifacts — the home for what she makes

**Being built.** Chat is the **birthplace**, never the home.

Each dashboard (and similar generated output) lives in an **Artifacts** place as a **card**: its title, when it was made, the key
metrics it tracks. Open the card to see it. The conversation that made it keeps a receipt, not the only copy.

Dashboards are **ephemeral outputs of a monitoring ask** (“keep an eye on yield”). They are built from data Luna already has and
**regenerated from live numbers each open** — never a template catalogue, never a stale saved page.

**Live today:** charts, reports and packs stay on the conversation and in the work pane (`colleague/AiOutputs`). There is no
Artifacts section in the ☰ drawer.

## 3. Workspaces, not projects

**On Luna’s screen the word is workspace** — a named folder of **data and chats**. Never “project”. Never a Faultline method
(6M, PDCA, DMAIC, catalogue tools).

How it is meant to work:

1. An Excel upload or a live connector **starts in the chat**.
2. The person can say “move that into a workspace” and **name it**.
3. That **workspace owns** the uploads, live connectors, and chats moved into it.
4. A chat **in** a workspace talks **only about that workspace’s data**. A chat not in a workspace sees only itself.
5. Nothing from another workspace or another chat leaks in. The customer guard still holds.

**Live today** (24 November, `colleague/lunaFolder`, proved by `luna-projects.mjs`): the machinery is those work folders — isolation,
library, customer stamp — but the **heading on screen is still Projects** and the button is still **New project** in the ☰ drawer.
That copy is ChatGPT-drawer leftover. **Rename to Workspaces / New workspace is being built**; until then `PAGES.md` and inventory
must say **Projects**, because that is what is drawn.

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
| **Artifacts** | Home of dashboards and similar outputs she made (**being built**) | A chat turn; a Faultline Saved copies library |
| **Schedules** | Visible autonomous jobs (**being built**) | Faultline Actions; Set up › Standing briefings (that page is live, the Luna list is not) |
| **Personal Luna** | That **person’s** chats, jobs, reminders, mail (SaaS plan) | A **workspace**. Never call the person’s home a workspace **on screen** — Rowland’s word *workspace* is the data folder |

Faultline’s own **Projects** page (`#/projects`) is unchanged: methods, Actions, catalogue tools. Luna does not build those.

Factory `workspaces` in the database remain **lines**. Do not rename the table for this. On Luna’s screen, never say “workspace” for a
line.

SaaS tenant plan: `docs/luna-saas-tenants.md` in the agent store (plan only). There a **tenant** buys Luna; a **person** has a
personal Luna; a **workspace** on screen is still the named data folder inside that Luna.

## 6. Drawer — live copy vs direction

ChatGPT-shaped ☰ (`colleague/LunaDrawer`, `docs/LUNAR-ENVIRONMENT.md`):

| Live (must match the screen) | Direction (being built) |
|---|---|
| New chat | New chat |
| Chats | Chats |
| **Projects** (Luna work folders) | **Workspaces** |
| Library | Library |
| — | **Artifacts** |
| — | **Schedules** |
| Back to Faultline | Back to Faultline |

Empty Luna stays orb + name + box — no Faultline suggestion chips (`docs/LUNA-LOOK.md`).
