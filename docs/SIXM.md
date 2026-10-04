# The 6M method — a running line's root cause system

Rowland, 4 October: "We can actually build our own fishbone, and then a root
cause analysis … the fishbone is the journey, just like the Gantt chart is in
stage gate … it should auto-populate … you can click on it, it's interactive,
it all comes alive … a full operational system."

It replaces "3P" (People · Plant · Process). The knowledge behind it is
`docs/OPEX.md`. This file is the design every part is built to.

## The method in one line

**The gap → the problem (the head of the fish) → its causes on six bones,
each drilled with the five whys → countermeasures with a prediction → proof
on the same number → holding.**

The six bones (`src/lib/sixm.ts`), traditional Ishikawa in plain words:

| Bone | Means | Rule of thumb |
|---|---|---|
| **People** | who runs it, and whether they can | skills, crew, leadership, engagement |
| **Machine** | the equipment that does the work | breakdowns, minor stops, wear, sensors that run the machine |
| **Method** | the way the work is done | changeovers, standards, cleaning, scheduling |
| **Material** | the product, and what it is made and packed with | film, splices, labels, product size/shape/quality, supplier |
| **Measurement** | how we check and count | checkweigher, metal detector, vision, calibration — and the data itself (stops not logged, wrong rated speed) |
| **Environment** | the conditions around the line | heat, humidity, dust, hygiene conditions, lighting |

## How it flows (and where each existing tool feeds it)

1. **Gap** — the line's measure against its target (measures/targets, built).
2. **Priority** — the Pareto (where the time goes) and the line balance (the
   constraint). The biggest bar, or the constraint, becomes **the head of the
   fish**, carrying its number: "Bagger minor stops — 3.2 h a week".
3. **The fishbone fills itself** (`lib/fishbone.ts`, derived, never stored
   until accepted):
   - the timed stops inside the bar → by `Observation.causeM` when the floor
     tapped one, else guessed from category + reason (`boneOfStop`) and said
     to be a guess; concentrations become suggestions ("11 of 18 on nights" →
     People);
   - walk snags on that machine → Machine;
   - the line standard's crew → People;
   - the line balance's limiting station → Machine or People;
   - materials late / programs not proved → Material / Method;
   - gaps in the stop log or readings → Measurement ("4 days with nothing
     logged — the Pareto may be short");
   - notes mentioning heat, humidity, dust → Environment;
   - your own observations — "I saw…" — onto any bone.
4. **Verify** — every cause carries how it is known (measured · counted ·
   observed · reported) and a status (suspected · confirmed · ruled out).
   Only measured causes get a share of the gap.
5. **Five whys** on each confirmed cause, down to a root. A second line of
   reasoning is a second cause on the bone. A why that ends at a person
   prompts "What let that happen?" (`blamesAPerson`). The "therefore" chain is
   read back automatically from root to head.
6. **Countermeasures** — actions on the board, on their bone, pointing at the
   cause (`causeRef`) and saying what they should change (`expect`). A small
   obvious fix needs no fishbone: a "just do it" action.
7. **Proof** — the problem's own number (its Pareto scope's hours a week, or
   the line's measure), before and now; each countermeasure's prediction
   against what happened.
8. **Hold** — when it worked: the standard updated, and one check (what, who,
   how often). The problem reads **Holding** or **Slipped back**.

Phases, in words and in the house colours: Finding the cause · Acting on it ·
Checking it worked (indigo, under way) · Holding / Closed (quiet green) ·
Slipped back (red).

## Records — no new table

| Record | What it carries now |
|---|---|
| `cases` (the problem) | + `project_id`, `line_id`, `source` (gap / pareto / constraint / observed), `causes` (the bones, merged by id), `hold` |
| `pace_todos` (actions) | `pillar` now holds the six bones (old People/Plant/Process read across: Plant → Machine, Process → Method); + `cause_ref`, `expect` |
| `observations` (timed stops) | + `cause_m` — one optional tap when a stop is timed |

`supabase/SIXM.sql` — applied live and read back 4 October. Wins, notes,
snags, standards and capacity are unchanged and feed the fishbone.

## Screens

- **The journey: the fishbone.** On a 6M job the line's page leads with it,
  as stage gate leads with its plan. The head is the problem and its number;
  six bones, causes as tappable marks with their grade and status;
  suggestions shown faint with "Add to the fishbone". Phone: the bones stack
  as lanes (an empty one folds to one line). Laptop: the drawn fish.
- **A cause, tapped:** its evidence and where it came from (opens the Pareto
  bar, the snag's frame, the standard, the station), status, the five whys,
  the "therefore" read-back, its countermeasures and "Add a countermeasure".
- **The board:** the six bones as lanes; one action editor with every field
  (bone, line, who, due, what it should change, the cause it is for, photos,
  notes, outcome). The old next-steps list is the same actions as a list.
- **Pareto bar → "Find the root cause"** opens a problem with that bar as
  the head. **Capture** gains the optional six-chip cause tap. **"I saw…"**
  adds an observation onto a bone from anywhere on the line.
- **Home / control room:** a 6M job's row says its problems by phase and its
  open countermeasures by bone; the drawer leads with the gap.
- Access levels apply everywhere (`useAccess`): the team works the fishbone;
  only the owner closes a problem or deletes; a client reads — the causes on
  the fish, never the data's suggestions, which are offers to whoever works
  it. "It worked — close it" only once something was done (a countermeasure);
  before that the button says "Close it".

## The client report (screen and paper together)

Built on the report engine (`src/lib/report/`), proved by
`scripts/report-stress.mjs`. It tells the story:

1. **The gap** — where the line is against its target, in one sentence.
2. **Where the loss is** — the Pareto, and the constraint.
3. **Each problem**: the fishbone drawn (head, six bones, the causes, roots
   marked), the why-chains of the confirmed roots with their evidence, the
   countermeasures with what they were expected to do and what they did, and
   whether it is holding.
4. **The board by bone** — every action, its owner and due, late in red.
5. **What was seen on the line** — walk evidence.

## Built in parallel, shipped together

| Part | Owner |
|---|---|
| Foundation: `lib/sixm.ts`, `lib/problems.ts`, types, mapper, `SIXM.sql` (live) | lead — done |
| Engine + data: `lib/fishbone.ts`, `lib/useProblems.ts`, db helpers, tests | agent |
| The interactive fishbone and the cause sheet (`ui/Fishbone.tsx`, `ui/CauseSheet.tsx`) | agent |
| Screens and flow: the journey screen, line and dashboard, Pareto → problem, capture cause tap, "I saw…" | agent |
| Board, actions, the 3P → 6M rename everywhere, access checks | agent |
| The 6M client report on the engine, report seeds, stress coverage | agent |
| Seeds, smoke (the fishbone in six states), integration, the gate, live | lead |
