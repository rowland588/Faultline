# FC-034 part 4 — Line capacity: one feed splitting into several lines

**Catalogue:** FC-034 (Line capacity). **Knowledge:** `docs/CAPACITY.md`; Goldratt, *The Goal* and the five focusing
steps (the constraint, and what is not the constraint waits on it); Hopp & Spearman, *Factory Physics* (a station's
effective rate = rate × availability; in a network the system rate is the least of each station's capacity divided by the
share of the flow that passes through it). **Asked for:** Rowland, 5 November — *"one feed feeding products into multiple
packing areas … each of them could actually have their own bottleneck … almost a process map of bottlenecks"*; *"keep the
UI simple, and the PDF — lean principles"*. **Status:** specified and built 5 November.

## 1. Purpose
Line capacity could merge lines into shared stations after them; it could not split one feed into lines. A filler feeding
three packing lines had nowhere to put the filler except "after the lines merge", which made the page muddle. The sentence
it lets one side say to the other: **"The filler can supply 120 a minute; Line A takes up to 68 (held by the palletiser),
Line B up to 40; together 108 — the lines hold it, the filler has 12 to spare."**

**Scope.** (1) A third zone, **Before the lines split** (shared stations the whole flow goes through first), then the
lines (each its own chain, people and rate), then **After the lines merge** (as now). (2) A **split rule**: *whichever line
can take it* (default) or *fixed shares* (typed percentages). (3) The map of bottlenecks: each line's own limit named, the
system's limit named, on the page, the drawn line and the paper. (4) Labour counted for the new zone like any part.
**Not in this build:** more than one split in a line; a split after a merge; stochastic blocking between zones (the
buffers tool covers stops between machines); a feed that sends different products to different lines.

## 2. Users and scenarios
The engineer with a filler feeding two or three packing lines. (1) Filler 120 a minute, Line A (bagger → palletiser,
bottleneck 68.25), Line B (bottleneck 40): lines hold it at 108.25. (2) Filler 80: the filler holds it, lines have room.
(3) Fixed 60/40 shares against lines of 68 and 40: Line B binds. (4) A wrapper after the merge.

## 3. Method selection
**Established · assumed · chosen.** *Established:* a serial chain's rate is its least effective capacity expressed in one unit
at the same point of the flow, upstream rejects thinning what reaches a station (existing, `analyseChain`). For a split:
with the flow free to go where it can be taken, the system rate is min(feed capacity, Σ line capacities); with fixed shares
pᵢ it is min(feed capacity, minᵢ capacityᵢ / pᵢ) (Hopp & Spearman, flow through a network). *Assumed:* steady state, no
blocking between the feed and a line beyond the capacities themselves; when the feed is the limit and the rule is *whichever
can take it*, it is shared in proportion to the lines' capacities (equal utilisation) — said on the page. *Chosen:* the
default rule; shares typed as percentages and normalised to 100%.

## 4. Inputs
Stations of the feed zone are stations like any other (`Station.lane = FEED_ZONE`); `Capacity.split = { rule, shares }`.
Each zone's first station says how many of the unit before it make one of its own (`contains`), as the merge does.

## 5. Data suitability
A feed with no counted last station, or a line whose first station cannot be converted, is named and the split waits.
Shares that do not sum to anything usable fall back to equal shares, said. One line only: a split is meaningless and the
zone reads as the front of an ordinary chain.

## 6. Calculations
`F` = feed zone good output in its last station's unit (`goodOut / factor_last`). `cᵢ` = line i's capacity with an
unlimited feed, in the feed's last unit. Rule *any*: `T = min(F, Σcᵢ)`, `tᵢ = cᵢ` if `F ≥ Σc` else `T·cᵢ/Σc`. Rule *shares*:
`T = min(F, minᵢ cᵢ/pᵢ)`, `tᵢ = pᵢ·T`. What the lines send on = Σ tᵢ × (their good fraction); the shared stations after the
merge are compared with it as today, and the whole is put back to the start of the feed (`T·factor_last / good fraction of
the feed`) for the target. **Independent worked cases** (by hand): (A) Filler 120 a min (one unit throughout); Line A
machines 160 and a palletiser at 68.25; Line B a machine at 40; F = 120, Σc = 108.25, T = 108.25 — the lines hold it, the
filler has 11.75 spare. (B) Filler 80: T = 80, t_A = 80·68.25/108.25 = 50.44, t_B = 80·40/108.25 = 29.56; the filler holds
it. (C) Shares 60/40 with F = 120: T = min(120, 68.25/0.6 = 113.75, 40/0.4 = 100) = 100 → t_A = 60, t_B = 40; Line B binds,
Line A has 8.25 to spare. (D) Feed with a 95% good station: F_good = 0.95 × feed rate. (E) A wrapper after the merge at 90:
whole = 90.

## 7. Outputs
Per zone: its limit and what it makes; the system's limit named; a sentence in the form of the purpose above. **The report.**
The paper's drawn line (`The line, drawn`) shows the three zones — the feed, a pill saying what it supplies, a column a
line each with its own pace-setter tagged, the merge, the bottleneck, what the line makes — and *What each station can do*
opens with a group *Before the lines split*; each line's bar group says *can send N — fed M*. One home per thing: no second
table repeats them, so the paper stays short (two pages for two lines in the acceptance script). Nothing else moves.

## 8. Manufacturing usability
Phone first. *Before the lines split* is one quiet button under the first line ("＋ A shared feed before the lines"); when
used, the zone has the same station cards. The split rule is one pair of chips (*Whichever line can take it* · *Fixed
shares*); shares are boxes only on the second. The arrival notice is set apart in style from the boxes and says "worked out
from the station before — not typed".

## 9. Failure handling
Missing speed or broken chain in any zone: that station named; the rest still counted. A share of 0 or blank: equal shares,
said. A split with one line: ordinary chain.

## 10. Integration
No new record or column: `Station.lane` takes the feed marker and `Capacity` gains `split` and `labourFeed` inside the
capacity's one jsonb. Read by `analyse` (so the V, the sheet, the what-ifs, labour, the screen, the lean tiles read it), the
drawn line (`capacityFlow`), the page and the paper. Labour: the feed zone is a part like the lines (people from its
stations unless typed, its own rate). Access: `can.edit`.

## 11. Verification
Unit: `src/tools/linebalance/__tests__/capacitySplit.test.ts` (cases A–E, refusals, an old record unchanged, labour of
the zone). Acceptance: `scripts/acceptance/split-lines.mjs`.

**Acceptance criteria.**
1. Cases A–E equal the hand-worked figures — *proved by* `capacitySplit.test.ts`.
2. Records without a feed zone read exactly as before — the existing capacity and lane tests.
3. A feed added to two lines through the page: the sentence, each line's limit and the system limit equal the module's —
   `split-lines.mjs`.
4. The split rule chips change the result as case C says — `split-lines.mjs`.
5. The drawn line and the paper carry the three zones and the table, read back from the PDF — `split-lines.mjs`.
6. The phone: nothing off the side, controls 44 px — `split-lines.mjs`.
Not yet proved: the full gate and paper parity.

## 12. Maintainability
One place a station's zone is decided (`zoneOf`); one place the split is worked (`analyseSplit` inside `analyseLanes`);
the words in `capacityWords`/the sentence in the module.
