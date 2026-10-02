# The lean plan for the whole app

*2 October 2026. From a sweep of every screen (66 routes, laptop and phone) and
every PDF (client report, plan, day, step card, trial card, line standard,
deck, line deck, evidence cards), against the two rule sets in CLAUDE.md:
visual management and simplicity.*

Rowland: "simplicity is what makes the app powerful — simple, effective and
efficient."

## The test every screen has to pass

Stand across the room from it. In three seconds:

1. Can you tell what is normal and what is not?
2. Can you tell who owes what, by when?
3. Is there anything on the screen you have to look past to do the job?

Question 3 is lean waste, and it is where the app still fails most. The waste
takes seven shapes here, and every finding below is one of them:

| Waste on a line | Waste on a screen |
|---|---|
| Overprocessing | The same thing drawn twice — a count and a filter, a grid and a list |
| Transport | Two ways to get around (the project's row of tabs; the line study's bottom bar) |
| Inventory | Screens from an earlier design still in the app |
| Motion | Editors open on every row when you are working on one |
| Defects | Words that are no longer true ("from the tracker", "THE EYES") |
| Waiting | A page that sends you somewhere else to do the thing |
| Overproduction | Twelve printed outputs, twelve different buttons |

## What the app is, in one table

Every screen, by what it is for. The ones marked ✕ are inventory.

| Job | Screens |
|---|---|
| **The control room** (am I in control?) | Home · Projects · Project details |
| **Stage gate** | Project page · Install · Set up · Commission · Hand over · Fixes · Materials · Programs · one step · one test · the day · step card · trial card · Line standard (list, map) · Meeting notes · Client report |
| **3P** | Project page · Board · Lines · Lines & people · Numbers · Wins · Evidence · Materials · a line (overview, actions, success, evidence, numbers, line balance) · deck · line deck |
| **Lever tree** | the 3P set, plus Tree and Pareto |
| **The line study** (a tool, under a line) | Capture · Log · Analyse · Present · Meeting · Case (A3) · Trend · History · Walks · a clip · a frame · Evidence list · one-page report · Settings · People |
| **Inventory** ✕ | Guide (describes the first version) · Portfolio ("Improvement work, everywhere", £0/yr) · deck with no project chosen · the Workspaces list |

Numbers from the sweep, for the record:

- 66 routes; about 52 distinct screens.
- Visible buttons on one screen: project page **97**, line-study Settings **64**,
  Home **60**, line balance **57**, Materials 39, Capture 36.
- Phone: no screen scrolls sideways (good). Longest pages on a phone: Lines &
  people, Materials, Settings, the project page.

## Done today

- **Visual management, everywhere.** One colour per meaning on screen and
  paper; done recedes, late stands out; only the abnormal number is coloured;
  lost time is one neutral colour; the state in words beside the marks.
- **Simplicity, first two slices.** Evidence counts are its filters; tree tools
  come out on the box you are on; one Actions tab per line; one Reports door in
  the meeting; one-line ledes; duplicate "All evidence" button gone; the
  record id gone from action cards; "from the tracker" gone.
- **The ten slices, all live** (2 October, in the order below):
  - *1, 3, 4, 7* — Home is the control room and Projects is the archive and
    the "New project" door; Materials and Programs drawn once each with the
    week strip on the row, Programs shown once per job; line balance, Lines &
    people, the add forms and finished sections fold until wanted; the words
    fixed ("THE EYES", "THE PROOF", "LINE HEALTH", "workspace", the tab names).
  - *2 and 5* — one way to get around: the line study has the crumb bar and
    the same row of tabs the project has (Capture · Analyse · Evidence ·
    Meeting); the Log is Capture's list, Present is the Meeting's second act,
    the trend is a fold on Analyse, Settings and People are one Set-up sheet;
    Guide, Portfolio, the deck with no project and the Workspaces list are
    gone and every old link lands where the page went.
  - *6* — one door to paper: a Reports sheet on every project page lists the
    client report (and each line's), Today, the line standard, the evidence
    cards and one-page report of each line's study, and the spreadsheet of
    everything (moved off the Projects page). Every screen's own print button
    says one word: **PDF**. "This line's deck" is the line's client report.
  - *8* — the 3P front page's door reads "Open the board".
  - *9* — Pareto with nothing timed offers "Time a stop on ‹line›", which
    makes the line's study and opens the stopwatch; the trend with no history
    offers "Time a stop".
  - *10* — the phone pass: 58 routes re-shot at 390px, none scrolls
    sideways, none throws. The two longest were cut: a line's actions list
    shows one line per action and opens the editor on the row you tap (four
    screens became one); a line's numbers fold the reading form to a row.

## The findings, by waste

### Overprocessing — the same thing drawn twice

1. **Projects page and Home.** Home lists every project with Archive · Details
   · Open; the Projects page lists the same cards with the same three buttons.
2. **Archive on every card.** A destructive action always on show, on every
   card, on two pages — and it is also inside Project details ("Put this
   project away").
3. **Materials: the grid and the list.** "Are we covered?" (a week grid) and
   "What is holding us up" (the list) are the same seven records, one you look
   at and one you edit. Programs: the same again ("Can we run it?" and "What is
   going to bite").
4. **Programs in two places on a 3P job.** Under Materials and under Set up.
5. **3P front page and the Board tab.** The front page draws the whole board
   again, read-only, with a button to the Board.
6. **Log and Capture.** The Log is the list Capture already shows at the bottom
   ("See all 12").
7. **Present and the Meeting.** Present is the Analyse Pareto full-screen; the
   Meeting's act 2 ("Where it hurt") is the same chart, drillable.
8. **People, three times.** Line-study People page, the same block inside
   line-study Settings, and the project's People on Project details.
9. **Doors to the next tab.** Capture has "See where the line's losing time ›"
   (that is the Analyse tab); Analyse has "Run the meeting ›" (the Meeting
   tab); Trend has "One-page report" (the Reports door).

### Transport — two ways to get around

10. A project screen has the crumb bar and a row of tabs across the top. A
    line-study screen has the crumb bar and a bottom bar (Capture · Analyse ·
    Evidence · Meeting · More) with seven more screens behind "More". The
    line study is a tool under a line (CLAUDE.md), but it still moves like a
    separate app.

### Inventory — screens from an earlier design

11. **Guide** ("How it works", 7,000px): the story of the first version, with
    pictures of screens that no longer exist.
12. **Portfolio** ("Improvement work, everywhere"): one number, £0/yr. Home is
    the portfolio now.
13. **Deck with no project** ("A deck is a report on one project. Pick which…").
14. **Workspaces list** (reached from Portfolio).
15. **Settings** for a line study: name, people, cost of downtime, categories,
    sub-categories. Each piece has a better home (below).
16. **History with no frame** falls through to the Capture screen.

### Motion — editors open when you are not using them

17. **Line balance**: every station's full editor (eight boxes) open at once;
    57 buttons.
18. **Lines & people**: project details, method, extra tools, lines, add a line,
    measures, add a measure — all open, 2,900px.
19. **Add forms at the top** of Numbers, Materials, Programs and Notes push
    the list down the page every visit; the Board's "+ Add" row at the foot of
    a column is the pattern that works.
20. **One step / one test**: four numbered sections, evidence, fixes and files
    all open, including the ones already done.

### Defects — words that are not true, or not Rowland's

21. "THE EYES" (Evidence list), "THE PROOF" (Trend), "LINE HEALTH" (one-page
    report), "Improvement work, everywhere", "workspace" wherever a person
    sees it (it is a line), "pace" in a URL and a file name, "Lines" in the
    tab row for a page called "Lines & people".
22. Twelve ways to say "give me this on paper": Download PDF, Send as a PDF,
    Print / PDF, Print all, Print A3, Day report (PDF), Evidence cards, This
    line's deck, One-page report, Print, CSV, Export to Excel.

### Waiting — the empty state sends you elsewhere

23. Pareto on a job with nothing timed: a card and a button to "Open the
    lines". Trend: "Not enough history yet". Both right in substance; both
    could carry the one action that starts the data (time a stop; film a walk)
    rather than a door to another page.

### Three "meetings"

24. The line study's Meeting (five acts), the 3P board's "Run the meeting off
    the board", and Meeting notes. Three uses of one word for three things.

## The plan — slices, each live on its own

Each slice names the screens it touches, the record it reads (nothing new is
stored), what it does to the PDF, and whether it needs your yes before it is
built (anything that removes a page does).

| # | Slice | Screens | Record | PDF | Your yes? |
|---|---|---|---|---|---|
| 1 | **Home is the control room.** The Projects page becomes the archive and the "New project" door; Archive leaves the cards (it stays in Project details). Home's project cards keep Details · Open. | Home, Projects, Project details | projects | — | **Yes** — removes a page |
| 2 | **One way to get around.** Line-study screens get the crumb bar and the same tab row the project has: Capture · Analyse · Evidence · Meeting. Behind it: Log folds into Capture; Present folds into the Meeting's act 2; Trend becomes "Is it getting better?" inside Analyse; History is reached only from a frame; the line study's People goes to Project details (one place to invite); Settings is split — categories already live under Capture's "+", cost of downtime already has its door on Analyse, the name is the line's name. The bottom bar and "More" go. | all `/w/…` screens | workspace, observations, snags | one-page report unchanged | **Yes** — removes six pages |
| 3 | **Materials and Programs, once each.** One list per page with the week strip drawn on the row; the four tiles become one sentence plus what is late (the pattern every other page uses). Programs shown once on a job: under Set up on a stage-gate job, under Materials on a 3P job. | Materials, Programs, Set up | materials, programs | A3 grids unchanged — they already print the grid | Light — nothing removed |
| 4 | **Fold what is not being worked on.** Line balance: one row per station, editor opens on the one you tap (as the tree does now). Lines & people: folds (Project · How it runs · Lines · Measures). Add forms become a "+ Add" row at the foot of the list. One step / one test: sections already done fold to one line. | line balance, Lines & people, Numbers, Materials, Programs, Notes, one step, one test | — | — | No |
| 5 | **Inventory out.** Guide, Portfolio, the deck-with-no-project page and the Workspaces list are retired. "How this works" survives as the one paragraph per method already on Project details. | Guide, Portfolio, pace-report, Workspaces | — | — | **Yes** |
| 6 | **One door to paper.** A "Reports" sheet on every project page listing everything printable with one line each: Client report · The plan · Today · Line standard · Evidence cards · One-page line report · Spreadsheet. Each screen keeps its own button for the thing it shows, and the button says one thing: **PDF**. | project page, every page with a print button | — | every PDF, unchanged | Light |
| 7 | **Words.** "THE EYES" → Evidence; "THE PROOF" → Is it getting better?; "LINE HEALTH" → the line's name; "workspace" → line; "pace" never shown; the tab says what the page is called. | wherever each appears | — | the one-page report's eyebrow | No |
| 8 | **One word for the meeting.** The 3P board's button reads "Open the board" (that is what it does). The line study keeps "Meeting" — it is one. "Meeting notes" stays. | 3P front page | — | — | Light |
| 9 | **Empty states carry the first action.** Pareto with nothing timed: "Time a stop" opens Capture on this line. Trend: "Film a walk" / "Time a stop". | Pareto, Trend | — | — | No |
| 10 | **Phone pass** after 2–4: every page re-shot at phone width; no page longer than it needs to be. | all | — | — | No |

Suggested order: 1, 3, 4, 7 (no removals; a day or two), then 2 and 5 together
(the big one — the line study joins the project's shape), then 6, 8, 9, 10.

## What it adds up to

| Measure | 2 Oct, before | After the ten slices |
|---|---|---|
| Distinct screens | ~52 | ~40 |
| Ways to get around | 2 | 1 |
| Most buttons on one screen | 97 | under 40 |
| The same records drawn twice on one page | 5 places | 0 |
| Words for "on paper" | 12 | 1 ("PDF") plus the Reports door |
| Pages describing the first version | 2 | 0 |

Nothing in the plan removes a capability. Every record keeps every way it is
read and written; what goes is the second route to it, the editor open when it
is not in use, and the page whose job another page already does.
