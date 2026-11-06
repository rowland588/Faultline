# FC-242 — Spaghetti diagram, several people: the specification

**Catalogue:** FC-242 (a calculator of the shared shape; FC-004's part 2 — one person's round stays FC-004, `spaghetti`, so every record made before it is exactly as it was) · **Knowledge:** `knowledge/methods/lean/spaghetti.md`, `knowledge/specs/FC-004-spaghetti-diagram.md`, `docs/LINE-TALK-TOOLSETS.md` §4.2 · **Asked for:** Rowland, 6 November: *"I have 4 operators on the line … operator 1 goes to X, goes to X, operator 2 goes to X … it would literally create a spaghetti diagram for me."*

## 1. Purpose
A spaghetti diagram of a line is rarely one person: several operators walk the same few places, and the question is where their paths cross, who walks most and which place everyone keeps coming back to. This puts up to four people's paths on one diagram, so the same record can be typed on the floor or filled by talking (Line Talk's spaghetti set).

**Scope.** (1) Up to **4 walkers**, each a label (*Operator 1* — a label, never a name), each up to **12 places** in the order walked; (2) the metres walked into a place **only if given** — a move with no length is counted as a move and never given one; (3) an optional **layout** of up to 12 places with their position (metres east and north of a corner): the diagram is **to scale only when every place walked has a position**, else a **schematic** — places arranged on a circle for reading, drawn and captioned "not to scale"; (4) optional **rounds a shift**, a **pace** (as FC-004) and **what an hour costs** — said only when every move has a length; (5) the figures **for each walker and together**. Not in scope: a person's body motion (micro-movements, FC-233), the from–to chart across a whole layout (FC-212), reading where anybody went (nothing does).

## 2. Users and scenarios
A line lead or engineer following several operators for a few minutes, with a phone or by talking. (1) *Four operators on a flow-wrap line:* the film store, the case store, the scale, back to the line — who fetches what, and which two walk the same route. (2) *Said, not measured:* "Operator 1 goes to the film store, back to the line, to the case store …" with no distances — a schematic and the moves counted, the metres asked for later. (3) *On a plan:* every place positioned, so the paths are drawn to scale and the metres are the straight lines.

## 3. Method selection
The spaghetti diagram (a string diagram) is the walkers' paths over one layout; the figures are counts and sums of what was seen.

**Established · assumed · chosen.** *Established:* a move is from one place to the next; a round's metres are the sum of its moves' metres; a shift is rounds × a round; minutes = metres ÷ pace ÷ 60; labour = minutes ÷ 60 × the hourly cost (FC-004, MONEY.md labour L). *Assumed:* every walker walks the same number of rounds a shift (one box, said); the metres typed or said are what was walked; the places named alike are the same place (matched ignoring case and spacing). *Chosen:* **who walks most** is by metres when every move of everyone has a length, else by the **number of moves**, and the sentence says which; the **busiest place** is the place most often arrived at, counted over everyone (where a round starts is not an arrival); a **shared route** is two places joined by a move walked by **two or more different people** in either direction — where the diagram's lines cross; a place repeated straight after itself is standing still, not a move; walker line styles are graphite solid · teal solid · graphite dashed · teal dashed (never a state colour), each named beside the picture; money is the walking's labour only, with the missing input named, never invented.

## 4. Inputs
Each walker: a label and the places in order, each after the first with the metres walked into it (optional). The layout: a place's name as written above, metres east and north (optional). Then rounds a shift, the pace (loaded or crowded 1.3 m/s, unloaded 1.6 m/s, or timed — as FC-004), what an hour of a person walking costs (offered from the line's wage) and shifts a week — all optional. A place appears once the one above it is named.

## 5. Data suitability
A walker with one place has not walked yet and is left out, said. Moves with no length are counted, not guessed; some lengths and not others are said ("the length is known for 6 of 10 moves"). Places on a layout that do not match a place walked are ignored. Positions for some places and not all give a schematic, said. One round of each walker may not be typical.

## 6. Calculations
Per walker: moves = places − 1; metres = Σ the moves that have a length. Together: the sum. Who walks most: max metres (all moves have lengths) else max moves. Arrivals per place: count of times a place is the destination of a move; ranked, ties in the order first met. Shared routes: unordered pairs of places joined by moves of two or more different walkers; their metres Σ over those moves. Shift: Σ metres × rounds; minutes ÷ pace ÷ 60; money minutes ÷ 60 × rate; a week × shifts. Schematic: the places on a circle, the first met at the top, clockwise; each walker's moves nudged sideways by (k − (W − 1)/2) × 0.06 of the circle's radius so two people on one route are two lines.

**Independent worked case S3** (`scripts/knowledge/cases-kaizen.py`, plain Python): three operators from the packing line — Operator 1: film store (40 m), line (40), case store (25), line (25) = **130 m**; Operator 2: scale (9), line (9), film store (40), line (40) = **98 m**; Operator 3: case store (25), line (25) = **50 m**. Together **10 moves, 278 m a round**; Operator 1 walks most (47%); the line is arrived at **5** times, the film store and case store 2 each, the scale once; the line and film store route is walked by Operators 1 and 2 (**160 m, 58%** of 278), the line and case store route by Operators 1 and 3 (**100 m, 36%**). At 10 rounds a shift and 1.3 m/s: **2,780 m, 35.6 min** (16.7 · 12.6 · 6.4 a person), **£14.85** a shift at £25 an hour, **£74.25** over 5 shifts. The same names with **no metres**: 10 moves, Operator 1 makes the most (4 of 10, 40%), the same busiest place and shared routes, no minutes or money (named missing). **S3b:** on a plan with the line at (30, 0), the film store (0, 0) and the scale (30, 16): 60 m + 32 m = **92 m**, Operator 1 65%.

## 7. Outputs
The verdict (the shift's metres when given, else the round's, else the moves), the sentence, the tiles (*Together*, *Walks most* or *Walkers*, *Busiest place*, *Shared routes* or *Places*, and *Walked a shift* and *Labour a shift* when the shift is given), the shared routes and the shift in the lines under it, the working (a line per walker with the route and metres, a line per shared route), the caveats, the money or what is missing, the closing line, and the picture.

**The report.** The shape's calculation paper from the same result: the band and verdict, the tiles, *What it says*, the figures put in, the picture with each walker's line style named in a row under it and "not to scale" in the caption and the axis when it is a schematic, the working, the caveats, the money or what is missing, the closing line — from the same description the screen draws, so the two cannot part.

## 8. Manufacturing usability
Phone first: boxes appear one at a time as the one above is named; a walker appears once the one before has a name or a place; every control 44 px; nothing off the side. The picture is inside its box; the legend wraps. Said in the floor's words: *moves*, *arrived at*, *walked by more than one person*.

## 9. Failure handling
No walker with two places is refused in words ("A walk needs at least two places"). A walker with one place is left out, said. Missing lengths are counted, never filled; the shift waits for them and says so. A negative or non-number length is refused by the box. Names that do not match a layout place are ignored, said by the schematic note.

## 10. Integration
A `ToolStudy` of tool `calc` with `agreed.calc = { key: 'spaghetti-walkers', inputs, before? }` (no new record). On a line (Calculators row), in a project, in the line report and its full package by the shape; the notes and the pictures-and-videos tail on its paper. Line Talk's *Spaghetti* set (`tools/talk/talkSets`, set `spag`) fills these boxes from a spoken walk — each box marked as said — and *Make it* creates this calculator on the talk's line; part 1's `spaghetti` stays for one person's round.

## 11. Verification
Unit: `src/tools/spaghetti/__tests__/walkers.test.ts` (case S3, S3b, the no-metres case, standing still, straight lines, to scale only when every place is positioned, the schematic) and the shape's `calc.test.ts` (the definition's examples and refusals).

**Acceptance criteria.**
1. Each walker's moves and metres, the total, who walks most, the busiest place and the shared routes of case S3 equal the hand-worked figures — *proved by* `walkers.test.ts` and the definition's example in `calc.test.ts`.
2. The shift (2,780 m, 35.6 min, £14.85, £74.25 a week) equals the hand-worked figures — `walkers.test.ts`, `spaghetti-walkers.mjs`.
3. The same names with no metres count moves, not metres, say so, and give no minutes or money — `walkers.test.ts`, `spaghetti-walkers.mjs`.
4. A schematic is captioned "not to scale"; every place walked positioned makes it to scale, one missing makes it a schematic — `walkers.test.ts`, `spaghetti-walkers.mjs`.
5. Case S3 typed through the real boxes gives the page's sentence, tiles and money; the picture draws one line per move in each walker's style and names each walker; the paper read back carries the sentence, each walker and the shared routes — `spaghetti-walkers.mjs`, `calc-shape.mjs`.
6. Refused in words: no places, one place — `calc.test.ts`.
7. FC-004 (one person) is unchanged — `spaghetti.mjs`, `calc-shape.mjs`.
8. The phone: nothing off the side, controls 44 px — `spaghetti-walkers.mjs`.
Not yet proved: the full gate and the paper-parity comparison.

## 12. Maintainability
The figures live in `src/tools/spaghetti/walkers.ts` and nowhere else; the definition is the boxes, the words and the picture; Line Talk's set maps a spoken capture onto the same boxes with `inputsOfWalkers`. Adding a fifth walker is `WALKERS_MAX` and its boxes. A layout read from the line standard's board is a later slice.
