# Luna’s product shape — 26 November 2026

**Subject before illustration.** A training guide explains what the method achieves, its essential practices, how to apply it, its limits and what would demonstrate improvement. Place each visual where it teaches a decision. A request about a particular workplace requires relevant, accessible material. Method knowledge, an unrelated file or a generated picture cannot establish a local condition. Identify the basis in the saved work and distinguish a worked example from measured site performance.

**Teach visually.** Show what people need to see to carry out a task. Use a before-and-after illustration for a physical standard, a sequence for a process, and a labelled comparison for genuine alternatives. Use measured charts only when the source supplies measurements. Keep illustrations, captions and source words available offline.

**Documents from operational knowledge.** A person can commission a guide, briefing or work instruction before connecting a business or uploading a workbook. A draft belongs to its conversation. An explicit HTML request saves that document to Artifacts. Data tracking belongs to source-backed dashboards. Creating guidance from general knowledge must never imply that Luna has observed conditions at a particular site.

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
| **Make a report** | Build a report from this conversation’s results and save its HTML in Artifacts | Scheduled report delivery |
| **Track a measure** | Turn saved charts into an HTML dashboard. With the person’s agreement, repeat the underlying queries against current data | Monitoring and alerts while Faultline is closed |
| **Send this report** | `send_email` on a confirm card (`docs/LUNA-MAIL.md`) | Automatic sending from a schedule, after server authorization |
| **Overnight job** | G6: a job handed over at five is done by morning (`docs/LUNA-G6-SERVER.md`) | Microsoft poll, server `readQuietly`, server-side writes |
| **Standing / scheduled work** | Daily or weekly briefings in **Luna › Schedules** (`standing_jobs`); run, pause, resume, remove when Luna opens | Server-run jobs and scheduled report delivery while the app is closed |

A schedule is Luna acting on her own. It is not a Faultline Action, not a Gantt, and not a method step.

## 2. Artifacts — the home for what she makes

**Live dashboards are a core Luna capability.** A person can ask, “Turn those graphs into an HTML dashboard.” Luna saves the selected visuals in Artifacts, explains a finding and offers to track the data when she can repeat the calculation. The chat receipt opens the same artifact on desktop and phone.

A dashboard starts as a snapshot. “Yes” connects each tracked measure to its source and retains its query, including filters, grouping and units. For an uploaded Excel file, Luna asks for a link to the original and checks that it supplies the required sheet and columns. A registered connector provides its own source identity. Customer and chat permissions apply whenever Luna reads a newer version.

A live dashboard refreshes on open and responds to changes while visible. It checks connected files for new versions every five minutes while visible. **Refresh now** checks immediately. When a source is unavailable, Luna shows the last successful result and explains the delay. “Stop tracking” freezes that result. Downloaded live HTML opens the authenticated dashboard. A downloaded snapshot contains the saved figures and works offline.

Artifacts contains saved HTML. The original Excel file stays in Library. A person can reopen, rename, download or delete an artifact with Undo. The conversation currently stores it. Independent artifact storage and unattended dashboard monitoring remain future work.

**Release check.** A fixture begins as an uploaded Excel file. The person accepts tracking and supplies its original URL. A revised workbook changes the night-shift total while the dashboard is open. The check also covers customer isolation, a source outage, the downloaded live HTML and stopping tracking. It uses the production calculation code and performs no model calls. The full gate runs it, and pull requests affecting dashboards run it separately. See [the browser check](../scripts/acceptance/luna-live-dashboard.mjs).

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
| **Artifacts** | Saved HTML dashboards, reports and presentations, linked to the conversation where they were made | A Faultline Saved copies library |
| **Schedules** | Visible daily and weekly briefings that run while Faultline is open | Faultline Actions |
| **Personal Luna** | That **person’s** chats, jobs, reminders, mail (SaaS plan) | A **workspace**. Never call the person’s home a workspace **on screen** — Rowland’s word *workspace* is the data folder |

Faultline’s own **Projects** page (`#/projects`) is unchanged: methods, Actions, catalogue tools. Luna does not build those.

Factory `workspaces` in the database remain **lines**. Do not rename the table for this. On Luna’s screen, never say “workspace” for a
line.

SaaS tenant plan: `docs/luna-saas-tenants.md` in the agent store (plan only). There a **tenant** buys Luna; a **person** has a
personal Luna; a **workspace** on screen is still the named data folder inside that Luna.

## 6. Drawer

ChatGPT-shaped ☰ (`colleague/LunaDrawer`, `docs/LUNAR-ENVIRONMENT.md`):

The drawer contains Artifacts first and open, then Workspaces, Library, Chats, Schedules, with New chat and Back to Faultline at the foot. Artifacts and Schedules can be collapsed. A cloud tick now marks due schedules and can push the owner to open Luna; the briefing text is built on the device when Luna opens. Outlook delivery also needs the device open. The cloud tick had a broken URL until the 24 November cron repair; no enabled live schedule has yet proved the full path.

Empty Luna stays orb + name + box — no Faultline suggestion chips (`docs/LUNA-LOOK.md`).

A guide starts with its learning purpose and the material that supports it. The illustrated 5S format kit is an opt-in exercise about a missing part at handover. A retrieval-time comparison tests one task. For other subjects Luna can author a table with Normal condition, Signal and Response, or comparable observations with a common unit. Its contents drive the visual. The HTML works offline and the paper and slides include the kit and its answer.
