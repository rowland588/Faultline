# Luna first — the interface evolution (a proposal, not built)

Rowland, 10 November: *"We are moving towards a conversation-first, AI-native experience, with Luna as the primary interface to the
manufacturing intelligence system. I do NOT want a rebuild or a wholesale redesign that risks existing functionality … Do not start
replacing existing screens or components yet … Preserve the product we've built."* This page is the inspection, the direction recommended,
what changes and what stays, and the risks. **Nothing here is built**; the concepts are drawn on the design canvas *Faultline — Luna-first
interface concepts* (claude.ai artifact, seven artboards). A slice is built only on his word.

## 1. What is there today (inspected 10 November, desk 1440 and phone 390, on the smoke seed)

- **The frame** (`ui/Frame.tsx`, `ui/rail.ts`, docs/ENTERPRISE-UX.md): a white top bar — the mark, Back, the context bar and Go to, the
  search (lines, machines, problems, projects, tools), **Ask Luna** (`colleague/AiDoor`, carrying the line or project you are on), Problem,
  the bell, you; a narrow icon rail — Factory · Projects · Tools, Factory reports at the foot; each scope's pages as tabs across the top.
  On a phone, a bar of five with ＋ Problem in the middle.
- **Home** (`#/`) is **the Story** (`screens/StoryScreen`, docs/STORY.md S5): the brief, four figures, since the last update, the chapters.
  The board of lines is the Factory's **Lines** tab (`#/room`).
- **Luna** is a page of its own, `#/ai` (`screens/AiModeScreen`): conversations · the conversation · the context panel (Now on, Parked,
  Sources, Being built, what words mean); the **work pane** (`lib/pane`, an iframe named `fl-work`) shows the real page of the record she
  is working on beside her. Every action goes through `src/capabilities` (reads at once, writes on a card), with the figure check, the
  notebook and the exam (docs/LUNA-NEXT.md). AI Mode has an **off switch** (`colleague/aiMode`, this device): off, the door is hidden and
  Manual Mode is the same.
- **A line** (`#/lines/:ws`): Overview tiles, what is going wrong, machine by machine; its tabs Machines · Problems · Actions · Programs ·
  Tools · Set up. **A project**: its method's page (eight methods, `docs/METHODS.md`), Now, Actions, Reports. **Tools** (`#/tools`): the
  gallery and a tool's own page; each tool's record its single-page workspace (docs/TOOLS-DESIGN.md).
- Proved by: `scripts/smoke.mjs`, `inventory.mjs` (docs/PAGES.md), `journeys.mjs` (taps never more than `docs/structure/journeys-baseline.json`),
  `story.mjs` (home is the Story), `ai-*.mjs`, `back.mjs`, `where-am-i.mjs`, `structure.mjs`.

So the parts a conversation-first app needs are already built: the conversation, capabilities over the real functions, the work pane
showing real pages, scope carried from the page you are on. What is missing is that **Luna is a destination, not the place you arrive**,
and **the pages do not know she is there**.

## 2. The direction recommended — "Luna is the front door; the app is her workspace"

**A · Today with Luna (the entry).** `#/` greets you and shows *what moved since you were last in* — at most three things that want you
(late actions, a number that moved, a project behind), **worked out by Faultline's code, never by the model**, each a door — then
Luna's box with four suggestions, and beside it the factory in a few lines (each line's state in a colour with its word), *Carry on where
you were* and the projects under way by method. With Luna off or out of allowance the same page shows, the box hidden: the briefing is
the app's own sums. The Story stays — a tab beside Today, and `#/?present=1` as now.

**Luna docked on every page.** A panel on the right of any page (closed by default on a phone, a sheet from the bar), knowing the page
and what is selected (`lib/scope` and the page's selection), offering two or three questions **made by code from the page** ("What
changed in the stops this week?"), the conversation continuing across pages. `#/ai` stays as Luna full screen.

**Adaptive workspaces.** The existing pages, grouped by what you are doing — **Investigate** (a method page with its evidence and actions
beside it), **Measure** (a capture screen, voice and taps writing the same records), **Act** (Actions, the Gantt), **Report** (the paper
and Saved copies) — chosen by the subject Luna is on (its task, `src/capabilities/task`) or by a switch in the bar. Each is a layout of
pages that exist; no record or function is new.

**Methods filled progressively.** DMAIC, 8D, PDCA, A3, Kaizen, Kata, ToC and the stage gate stay as they are by hand. Luna's answers
arrive as **drafts in place** on the method page (a dashed box: the words, where they came from and how known, Accept · Edit · Not this),
written only on Accept through the method sheet's own save (`answer_method` exists; the draft-in-place is new presentation).

**The factory.** Alternative B (a map of areas → lines → machines as tiles, Luna docked to what is selected) is drawn; recommended as the
Factory's Lines tab later, not as the entry — the entry should say what needs you first, and a map answers *where*, not *what*.

**Not recommended — C, one prompt.** A blank page with a box is the "chatbot attached" look; it hides what is late, gives nothing when
Luna is off and costs a model call before anything is seen.

## 3. What changes, and what stays

| Stays exactly | Changes (presentation only) |
|---|---|
| Every route, record, capability, tool, method, report and paper; the Story; `#/ai`; the frame's top bar and rail; Manual Mode with AI off | A new `#/today` page (then, on his word, `#/`), the rail gaining *Today* first |
| Tools' area and each tool's single-page workspace | A Luna dock in the frame, off until opened |
| Method pages and their own saves | Luna's drafts shown in place on method pages |
| Access (`useAccess`), RLS, cards before any write | A workspace switch (Investigate · Measure · Act · Report) over pages that exist |

## 4. Risks and dependencies

1. **Home is pinned by the gate**: `story.mjs`, `smoke.mjs`, `journeys.mjs` and its baseline, `inventory.mjs`, `landing`/`front-door`
   assume `#/` is the Story. So Today ships first at `#/today` beside it; moving `#/` is its own slice with every script moved with it.
2. **AI off, no signal, allowance spent**: the entry and the dock must be complete without Luna — the briefing and the suggestions are
   code (`lib/forYou`, `lib/useStanding`, `src/capabilities/task` readers), never a model call on opening a page.
3. **Cost**: a dock that asked the model on every page would spend the allowance; suggestions are code, the model is called only when
   the person asks.
4. **The work pane is a second copy of the app in an iframe**: memory on a phone and two `onDataChange` listeners; the dock should host
   the conversation, not the pane, on small screens.
5. **One conversation across pages**: the dock needs a current conversation per person (the newest, or the subject's) — `facts.colleague`
   holds it; what scope a dock opens on must follow `lib/scope`, never guess.
6. **Taps**: the eight journeys must not get longer (docs/STRUCTURE.md §15); a dock is one more control, never one more step.
7. **The look**: docs/LOOK.md and docs/ENTERPRISE-UX.md stand — white frame, the press blue, the five state colours each with its word,
   light paper; nothing dark with white words.
8. **Clients** (read-only): the dock offers reads only; drafts in place offer no Accept.

## 5. Slices, each live on its own — on Rowland's word

| # | Slice | Proved by |
|---|---|---|
| U1 | `#/today` — the briefing (code), Luna's box, the factory in lines, carry on, projects; the rail's *Today*; AI off shows it without the box | a new `today.mjs`; smoke; inventory; journeys none longer |
| U2 | The dock — a panel in the frame on line, machine, project and tool pages, scope and selection passed, code-made suggestions, the conversation shared with `#/ai` | `dock.mjs`; ai-mode.mjs unchanged |
| U3 | Drafts in place on method pages — Accept through the sheet's own save | method-*.mjs unchanged + a draft step |
| U4 | Workspaces — Investigate · Measure · Act · Report as layouts of existing pages | journeys; where-am-i |
| U5 | (if chosen) `#/` becomes Today, the Story a tab — every script that assumes the Story moved in the same commit | story.mjs, smoke, journeys baseline |
| U6 | (if chosen) The factory map on the Lines tab | lines.mjs, line-is-home.mjs |
