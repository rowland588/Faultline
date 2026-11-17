> 17 November structural review supersedes the older menu order below: **Factory · Tools · Testing · Projects · Luna**. Today is removed from normal navigation; Factory owns attention work. The phone bar stays Factory · Tools · Problem · Projects · More, with Testing and Luna in More. The legacy daily briefing URL remains readable. Everything has distinct jumps; duplicate Lines → Factory is removed, Testing is added. See WORKSPACES.md.

## Current authority — 17 November: separate workspaces

Rowland explicitly requested organisation, simplicity and power throughout the app, with clear separation between Tools, Testing, Projects, Factory and optional Luna. `docs/WORKSPACES.md` is the current structure. Tools is a direct global home with Library and Saved work; Testing has its own direct home. Factory tabs keep Lines, Reports and Set up; a line/project still shows its own work. Luna keeps normal navigation. Existing links remain useful evidence and ownership, rather than forcing navigation into another workspace. This supersedes earlier hidden global Tools and fullscreen assistant-shell rules below.

# Getting around — the same tabs on every place, two reports a place (16 November)

Rowland, 16 November: *"we have been here time and time again with the user interface … I couldn't even get onto tools properly. I was
lost. I couldn't then get onto the correct reports … multiple doors are opening, multiple interfaces open to a different door, that opens
a different door … Customers like simple reports that they can simply look at something and understand … I want this fixed."* Asked, he
chose **the same tabs everywhere** and **two reports a place**.

## The rules

1. **A place is the Factory, an area or a line.** Each has tabs across the top, in the same order, and Tools and Reports are always tabs
   of the place you are on — never a menu, never a button somewhere else.
   - **Factory:** Lines · Tools · Reports · Set up (its board is a card an area, so *Lines* stays its name)
   - **An area:** Overview · Tools · Reports
   - **A line:** Overview · Machines · Problems · Programs · Tools · Reports · Set up — the action tracker is a view inside Problems
     (*Problems · Action tracker*), not a tab of its own.
2. **Tools** on a place = the tools used there, each opening its record, and *Start a tool here*. The whole library is one door inside it
   (*All tools*), and at the Factory the tab is the library.
3. **Reports** on a place = exactly two:
   - **Summary** — one page for the customer: what is wrong, what it costs, what is being done, what has improved. No explanation of the
     method, nothing that carries no weight.
   - **Everything** — the full package: every record on the place, every problem and its card, every program and test, every machine,
     each tool's own paper, behind a cover. Untick what should not go.
   - and below them, the papers already made there (*Saved copies*).
4. **No other doors to the same thing.** The Report ▾ menus on place pages, the second Tools door on the Factory page, and the left
   menu's Tools and Factory reports go. The left menu is **Luna · Today · Factory · Projects**. A tool's own record keeps one button for
   its own paper — printing one study is still one press.
5. **Nothing is deleted.** Every old address still opens (an old link to `#/tools`, a line's `?view=actions`, the report pages); only the
   duplicate doors leave the screen. `docs/PAGES.md` says where each thing went.

## Built in slices, each live on its own

| Slice | What | State |
|---|---|---|
| N1 | A line: the Reports tab with Summary and Everything; Actions inside Problems; the Report ▾ off the line's page | built 16 November |
| N2 | An area: its own tabs (Overview · Tools · Reports); the Factory: Lines · Tools · Reports · Set up; the board's Report ▾ and Tools chip off | built 16 November — an area's Reports holds Everything; its Summary comes with N4 |
| N3 | The left menu: Luna · Today · Factory · Projects; the phone's bar to match | built 16 November — the phone's bar Factory · Projects · ＋ · Today · More; inside a project its papers stay at the menu's foot as *Project reports* |
| N4 | The Summary rewritten plain for the customer — line, area and factory | line: built 16 November — headed SUMMARY, its sections *What is wrong · What is being proved · What we measured (five at most) · What is being done*, every "and n more" pointing to the full report; the area's and the Factory's Summary to come |
