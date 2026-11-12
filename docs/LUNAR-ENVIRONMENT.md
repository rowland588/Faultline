# LUNAR — the environment, with LUNA at its centre

*11 November. Rowland: "LUNAR (L-U-N-A-R) is the product, platform and intelligent operational environment. LUNA (L-U-N-A) is the AI
colleague who lives within LUNAR … two separate names with two connected identities. Do not confuse them or use them interchangeably."
And: "When I open LUNAR, I shouldn't feel as though I've opened a software application and need to decide which menu to visit. I should
feel as though I've entered an intelligent operational environment where LUNA is ready to work with me. Everything else is there,
incredibly powerful, but it sits behind her and comes into view when we need it."*

## 1. The two names

| | Is | Where it is written |
|---|---|---|
| **LUNAR** | the product, the platform, the environment — its records, tools, studies, papers | `lib/product` `PRODUCT` (name, mark, the door, the install name, a paper's foot, a file's name) |
| **LUNA** | the AI colleague within it — her conversation, her voice, her aura | `lib/product` `COLLEAGUE`; her instructions (`COLLEAGUE_SYSTEM`, `TALK_SYSTEM`: "You are Luna — LUNA, the AI colleague who lives within LUNAR … Never call the product Luna or yourself LUNAR") |

The 11 November rebrand had written *Luna* wherever *Faultline* named the product. Those places — and only those — now say *LUNAR*: found
from that change's own diff (a line where *Faultline* became *Luna* and nothing else changed), 219 of them. Where *Luna* names her, it
stays. Internal identifiers (storage keys, the database, CSS classes, the domain) are unchanged, as before.

## 2. The shape

**The front of LUNAR is LUNA.** With AI Mode on, `#/` is the environment: her conversation, the work it brings into view, and one quiet
way to everything else. `#/ai` is the same place. With AI Mode off, `#/` is the app as it was (the Story; the consultant's home with more
than one customer), so Manual Mode is complete and the old experience is one switch away.

| Layer | What it is | Built on |
|---|---|---|
| **The bar** | the LUNAR mark, the client, search (⌘K), **Everything**, For you, the account — no crumbs, no Go to, no menu | `ui/ContextBar` (`env`) |
| **The conversation** | Luna, at the centre; her greeting and presence when nothing is under way; what is happening on the lines and where you were, under it | `screens/AiModeScreen`, `colleague/WorkContext` `EnvStart` |
| **The work in context** | once the conversation has begun on a line or project, it comes into view beside her: its state in a word, its open problems worst first, its machines, the records in use — each opening the real page | `colleague/WorkContext` (the line's own records, `lib/today` `lineState`) |
| **The work** | the real page of a study, a report, a line — in the work pane beside the conversation (a desk), full screen with its way back (a phone); it takes the context's place while it is open | the existing work pane (`lib/pane`, `WorkPane`) |
| **Everything** | one layer over the environment: one box that finds a line, a project, a page or a record; the places of the app; where you were; recent work; conversations; Raise a problem | `ui/Everything` (⌘. from any page) |

Every other page keeps its address, its frame and its menu — the application *behind* her, reached from Everything, from a record she
names, from search, or the rail when you are on a page. The rail's first line is now **Luna** (`/`), and **Factory** opens the Story
(`/story`); the consultant's home is `/clients`.

## 3. The rules it keeps

- **Nothing rebuilt.** The environment is the existing AI Mode, frame, work pane, capabilities, tools, records and papers rearranged —
  no second data model, no second engine, no duplicated logic. Luna still changes nothing without a card (or within an agreed
  investigation), never works out a figure, never marks evidence verified.
- **Nothing lost.** Every page that was reachable is reachable: Everything lists every place the menu held, and more.
- **Recoverable.** AI Mode off is the old front; every address is unchanged except `#/`, whose old page is `#/story` and `#/clients`.
- **Readable.** The Aurora tokens (`docs/LUNA-LOOK.md`, Aurora): navy ground, daylight under instruments, turquoise where you are and
  for Luna, ember for what you press, the five state meanings with their words.
- **Hands-free later.** The voice conversation and the voice bar are unchanged and sit over the environment; the structure (one
  conversation, the work beside it) is the one a camera, a headset or glasses would use, and none of them is needed now.

## 4. Proved by

`scripts/acceptance/lunar-environment.mjs` (desk and phone): `#/` opens Luna with no rail or menu, the bar's Everything, the places and a
line found by typing, a page opened from Everything coming into view as the work beside her, a conversation on a line bringing the line
into view with its problem and records, a record opening as the real page, AI Mode off giving the old front, nothing off the side on a
phone and every press 44 px. The scripts that went to `#/` for the Story go to `#/story`.

## 5. Next

1. Luna's answers able to bring a chart or a result into the work pane directly (today: a record's page, a report).
2. The work in context for a machine and a problem, not only a line and a project.
3. Aurora carried through the remaining grids and boards (SMED, value stream, line standard) onto daylight.
4. The gateway redeployed with the LUNAR / LUNA instructions (needs the Supabase connection).
