# The product experience — one system, two ways of working, every role

*12 November 2026. Rowland asked for "a proper product experience architecture — not another technical architecture document": what
Faultline, LUNAR and Luna are; how an operator, an engineer, a manager and a director experience the same system; what stays manual,
what becomes conversational, how the two complement each other, and how the interface evolves without disrupting what works. This is
that document. It describes the product as a person meets it. Where it proposes something not yet decided, it says **Decision** and
leaves it to Rowland. Technical companions: `docs/LUNAR-ENVIRONMENT.md` (the shape), `docs/AI-MODE.md` (Luna's contract),
`docs/LUNAR-KNOWLEDGE.md` (what she knows), `docs/DESIGN.md` (simple to use), `docs/ORGANISATION.md` (roles and scope).*

---

## 1. The three names

**LUNAR is the product.** The intelligent operational environment a manufacturing business subscribes to and uses from the floor to the
boardroom. Everything a person sees, holds and prints is LUNAR's: the lines and machines, the problems and actions, the tools and
studies, the methods and projects, the papers, and the knowledge LUNAR builds up about the factory over time.

**Luna is the colleague who lives inside LUNAR.** She is not the product and not a feature of one page. She is a way of working with
the whole of it: you talk, she reads what LUNAR holds, works through LUNAR's own tools, shows you the real page, and changes nothing
until you say so. She has a name, a voice and a presence (the sunrise orb). She never claims to be the system, and the system never
speaks as her.

**Faultline is where it came from.** It was the product's name until 11 November, and it is still the name inside the code, the
database and the web address. What Faultline built — the records, the tools, the methods, the papers, the rule that every figure is
worked out by code — *is* LUNAR's foundation, unchanged. On screen and on paper the name has gone.

> **Decided (Rowland, 12 November): *"Faultline can retire."*** The name is gone from every customer-facing place for good. It stays
> only where changing it would break something and nobody sees it — storage keys, database objects, the capability id, the repository —
> and the web address moves when convenient (`docs/LUNA-BRAND.md`).

> **And the weight of the two names (Rowland, the same day): *"LUNAR is merely the product name. Luna is the real product."*** LUNAR is
> the name on the box — what is subscribed to, what the papers and the install icon carry. What a person actually buys, meets and comes
> back for is **Luna**: the colleague they talk to about their business. So the experience is designed from Luna outwards — she is the
> front of the product for everyone — and the pages, tools and papers are what she works with and shows, complete on their own for
> anyone who prefers to work by hand.

The marks follow the names: **LUNAR is the crescent moon** (the frame, the papers, the install icon); **Luna is the sunrise orb** (her
conversation, her voice, her presence). They never stand in for each other.

---

## 2. The promise, in one paragraph

A person in a factory should be able to say what is going on — or ask — and have the system already understand the line, know what has
been found and tried before, do the searching, counting and organising, show the evidence as it is (measured, counted, seen or merely
said), and turn the conversation into real improvement work — a problem raised, a study filled, a project run, a report made — that
lands in the same records anyone else would open by hand. The person decides. The code does the arithmetic. The history is never
rewritten.

---

## 3. Two ways of working over one system

| | **The application** (Manual Mode) | **The conversation** (Luna) |
|---|---|---|
| What it is | pages, tools, forms, boards, papers — the system laid out | talking or typing to Luna, who works the system for you |
| Best for | doing precise work with your hands: timing, placing, drawing, checking, agreeing, signing off; seeing a whole board at once | asking, finding, explaining, starting, filling from what you say, pulling things together, deciding what to do next |
| Where it lives | every page, every address, the menu | beside any page (a panel), at the centre of LUNAR's front (AI Mode on), in your ear (voice) |
| What it writes | the record, directly | the same record, through the same functions, after you confirm |
| Without the other | complete — LUNAR works with Luna switched off | incomplete by design — Luna always ends on the real page |

**The one rule that makes them complementary rather than competing: there is one set of records.** Nothing Luna does lives anywhere
except where the application keeps it, and nothing the application holds is hidden from her. Anything started in one can be finished in
the other — a SMED study Luna began from what you said opens on its own page to be refined by hand; a problem you raised by hand is the
one she reads, prices and chases.

### 3.1 What remains manual — and why

These stay with a person, on the page, on purpose:

| Stays manual | Why |
|---|---|
| **Measuring** — timing a stop, a cycle, a changeover; counting rejects; taking readings | every number in LUNAR is counted, timed or tapped by a person (*measured by people, not by sensors*). Luna can hold the stopwatch for you by voice ("wrapper's stopped… running again") — but the event is still the person's |
| **Placing and drawing** — the line standard's board, a spaghetti walk, a fishbone's shape, a Gantt link | a hand on the screen is faster and truer than words; Luna hands these over and reads them back, and never claims she did them |
| **Agreeing and signing off** — what was agreed, a program proved, a study's verdict called, a document approved | accountability belongs to a named person on a day |
| **Saying something is verified** | evidence is verified by people with evidence, never by the AI |
| **Deleting** | never by Luna |
| **Choosing the method** — PDCA, DMAIC, 8D and the rest | the methods are fixed in code and chosen by a person; Luna can recommend, never invent one |
| **Judging a cause** | Luna says what the evidence supports and what it cannot say; a recorded reason is not a cause, and an opinion is kept as an opinion |

### 3.2 What becomes conversational

| Becomes conversational | What it feels like |
|---|---|
| **Asking** | "How's Line 3?" "What's late?" "Did the guide change work?" — answered from LUNAR's own findings, outcomes and history, each thing with how it is known |
| **Finding** | "The changeover study we did on the bagger in October" — found by name, meaning or place, never guessed |
| **Starting** | "We need to look at changeovers on the packer" — the right tool recommended (one, with its reason), started on the right line and project after a yes |
| **Filling** | describing a changeover, a walk, a flow, a set of readings — the tool's own fields filled as you speak, each marked as said, corrected in words |
| **Capturing live** | "start timing stops on Line 2" — confirmed once, then each event said is captured with no further cards |
| **Pulling together** | "put that in a report for the MD" — a chart, a result, a report or slides built from the records, every figure checked by code |
| **Remembering** | "Dave thinks it's the film supplier" — kept as Dave's view, attributed, beside the evidence, never as proof |
| **Deciding what next** | "what should we look at next?" — the biggest unexplained or recurring loss, what was already tried and whether it worked, one recommendation |

### 3.3 How a moment moves between them

```
  say it ──► Luna understands ──► proposes (a card: what will happen, where it lands) ──► you confirm
     ▲                                                                                       │
     │                                                                                       ▼
  ask about it ◄── LUNAR knows it (findings, outcomes, history) ◄── the record, on its real page ◄── refine it by hand
```

Three guarantees hold at every hand-off:

1. **You can always see the real thing.** Whatever Luna made or is talking about opens beside her as the real page — never a copy, never
   a summary in its place.
2. **You can always take over.** Every card has *Not this*; every record is editable by hand afterwards; switching AI Mode off loses
   nothing.
3. **She always knows where you are.** On a page, Luna starts from that page's line, project or record; in a conversation, the page she
   shows is where the work is.

---

## 4. The same system, four people

The business has one LUNAR. Each person meets it at the level they work at, within the scope their role gives them (`docs/ORGANISATION.md`
— a team leader in Packing does not see what a managing director sees). The records are the same; what comes first, and how they ask,
differ.

### Sam — operator, on the floor, phone in a pocket

- **Arrives at:** their line. One tap from the phone's home screen.
- **First sees:** the line in a word, what is wrong now, what is theirs to do.
- **Does by hand:** times stops, taps a check, raises a problem with a photo (＋ is always one tap away), films the issue.
- **Does by talking:** voice, hands busy — "the wrapper's jammed again", "start timing", "what am I supposed to check next?"
- **Never has to:** find a menu, choose a tool, understand a method.
- **What LUNAR gives back:** their stops and photos turn up in the engineer's analysis and the manager's report with their name on them.

### Priya — engineer or team leader, between the floor and the office

- **Arrives at:** Today — what is late, what is hers, what changed on her lines overnight.
- **Does by hand:** runs the studies (capability, SMED, reliability, line capacity), works the fishbone, links the actions, agrees what was
  proved.
- **Does by talking:** "what have we tried on the bagger jams?", "start a SMED on the packer from what I just told you", "is the guide
  fix holding?", "Dave reckons it's the film — note that."
- **What LUNAR gives back:** the history of every machine, whether each fix held, the same problem on other lines, and a draft of the
  report she would otherwise spend Friday afternoon writing.

### Mark — manager (production, engineering, CI), at a desk and on the floor

- **Arrives at:** the Lines board and Actions — every line's state, who owes what by when, what is late.
- **Does by hand:** starts and steers projects by method, agrees targets, signs off, reviews actions in the meeting from the paper.
- **Does by talking:** "why did we miss target yesterday?", "what are the biggest losses this month and are they being worked?", "build
  me the weekly pack for Thursday."
- **What LUNAR gives back:** losses in money from one cost model, what is being done about each, and whether the work so far has
  actually moved the number.

### Helen — director, at the boardroom table, mostly listening

- **Arrives at:** the Story (or, with AI Mode on, Luna) — the business's improvement story in plain sentences and four figures: found,
  biggest loss, being fixed, proved.
- **Does by hand:** reads, takes the paper, rarely anything else.
- **Does by talking:** "how was performance yesterday?", "what's changed this week?", "which improvements have actually paid off?"
- **Never sees:** a tool's workings unless she asks for them.
- **What LUNAR gives back:** the operational story, not the KPIs: the events behind the result, what is known and what is merely said,
  and what she should ask her team next.

**One question, four depths.** "Is the bagger problem fixed?" gets:

- Sam: *"It's been better since the new guide."*
- Priya: the outcome with its counts, and the two earlier fixes that came back.
- Mark: the money it is still costing on the other line where it recurs.
- Helen: one sentence and whether it is proved.

Luna shapes the answer to the person and their scope. Every answer comes from the same records, by the same code.

> **Decided (Rowland, 12 November): no page of its own for each role.** Everyone opens the same product at the same place — Luna —
> and she shapes what she says to who they are and what they may see. A role changes the depth of the answer and the scope of the
> records, never the front door. The pages stay where they are, one layer away, for anyone who wants them.

---

## 5. How the experience is organised

Four layers, the same on every device. Only how much of each is in view changes.

| Layer | What it holds | Phone | Desk |
|---|---|---|---|
| **The place** | where you are — the business, a site, a line, a machine, a project | the top bar's name, ‹ Back | the top bar, the place's tabs |
| **The work** | the real page — a board, a study, a list, a paper | the whole screen | the main column |
| **Luna** | the conversation about the place and the work | a bar at the foot, a full screen when talking | a panel beside the work |
| **Everything** | every place, record and tool, one search away | Everything / ⌘K | Everything / ⌘K and the menu |

Design rules that hold across all of it (from `docs/DESIGN.md` and `docs/LOOK.md`):

- **Every page answers in the same order:** where am I, what matters, what needs doing, did it work.
- **The essential first;** the rest in one fold.
- **One primary action a page.**
- **Five state colours, each with its word;** paper stays light.
- **Luna's presence is the orb and nothing else.** No AI sparkle on the application's own pages.
- **Nothing drawn to admire.** Every row is a door to the next step.

---

## 6. Evolving the interface without disrupting it

The application works and people rely on it. The rule for every change: **add a way in, never take a way away.** Concretely:

1. **Manual Mode stays complete.** Switching AI Mode off gives the application exactly as it was; every address keeps working. The whole
   gate (every screen, 1,500+ page checks, the papers against what is live, the journeys) is the guarantee, and runs on every change.
2. **Luna arrives beside, before instead of.** She appears as a panel on a page before she replaces any page's first view; a page becomes
   conversation-first only when the conversation does that page's job better for most people who use it. Measured by the journeys
   (taps to finish), not by enthusiasm.
3. **Every new capability lands on a page first.** If Luna can do it, a person can do it by hand somewhere, and can see the result on
   the record's own page. A conversational feature with no page is not finished.
4. **One slice at a time, each live on its own, each reversible.** No big-bang redesign; the calm baseline (`scripts/calm.mjs`) fails a
   page that gets busier, and the inventory fails a page that loses something.
5. **Names, marks and colours change in one place.** `lib/product` for names, the token layer for colour; never page by page.
6. **Real people, real model.** A change to how Luna behaves is proved with the real model on real tasks (`docs/LUNA-EVAL.md`), not only
   with scripted checks; a change to a page is walked on a phone on the floor.

### 6.1 The path from here, by experience rather than by feature

| Step | What a person notices | What does not change |
|---|---|---|
| **E1 — One front door: Luna** (decided 12 November — no page per role) | everyone opens on Luna; she greets them as a colleague and answers at their role's depth and within their scope; the pages one layer away | every page and address |
| **E2 — Luna knows the history** (built 12 November, being proved) | "what have we tried?", "did it work?", a person's view kept as theirs — on the line and machine pages and in conversation | the problems, actions and studies themselves |
| **E3 — The morning story** | "how was yesterday?" answered as events, not KPIs, from what LUNAR already worked out overnight | the line and the Story pages |
| **E4 — From finding to work in one move** | a finding becomes a problem, a study or a project with everything carried over, and its outcome comes back to it | the methods and the tools |
| **E5 — Voice on the floor as the operator's normal** | hands-free capture and questions on the line with a headset, the page there when they look | the capture screens |
| **E6 — The papers write themselves** | the weekly pack, the client report, the board story built and kept current; the person edits and approves | every paper's own design |

Each step is designed, shown on the app's own screens at desk and phone, agreed, built in slices and walked. None removes a way of
working that people use today.

---

## 7. What we hold ourselves to

- A person can always tell what LUNAR **knows** from what someone **said**.
- A person can always see the **real record** behind anything Luna says.
- Nothing is **changed without a yes**; nothing is **rewritten after the fact**.
- **Every role** gets an answer at its own depth from the **same** truth.
- The application is **complete without Luna**, and **better with her**.
