---
id: lean.tps-foundations
name: Toyota Production System foundations — Just-in-Time and jidoka
aka: [TPS, Ohno, just in time, JIT, jidoka, autonomation, two pillars, pull production, muda mura muri]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-11-23 — the two pillars (Just-in-Time and jidoka), their wording and the role of kanban, andon and kaizen confirmed online in Toyota Motor Corporation (global.toyota, production-system page, November 2026); Ohno's pull and jidoka origin confirmed in excerpt from Gemba Academy's summary of Ohno (1988) ch. 1; Sakichi Toyoda's automatic loom as jidoka origin confirmed in Lean Enterprise Institute *Lean Lexicon* entry on TPS — the book's text not read
needs: []
next: [lean.takt-time, lean.kanban-supermarket, lean.poka-yoke, lean.standard-work]
alternatives: [lean.value-stream-mapping]
related: [lean.seven-wastes, lean.heijunka-epei, lean.andon, changeover.smed, capacity.theory-of-constraints]
---
# Toyota Production System foundations — Just-in-Time and jidoka

## Purpose and principle
Taiichi Ohno's *Toyota Production System* (1988) is not a bag of tools: it is
two pillars that every later lean method hangs on. **Just-in-Time** means making
**only what is needed, when it is needed, and in the amount needed** — the
downstream process pulls from the upstream one instead of the first process
pushing to a plan that keeps changing. **Jidoka** (*automation with a human
touch*) means building in the ability to **detect an abnormality and stop**
immediately so defective work does not flow on — quality is built in at the
process, not inspected out at the end. Together they aim to deliver what the
customer asks for quickly, at low cost and with high quality, by eliminating
**muda** (waste), **mura** (unevenness) and **muri** (overburden) through
daily kaizen.

## Questions it answers
What are the roots of pull, kanban, poka-yoke and andon? Why does lean insist
on stopping the line? How does JIT differ from a mass-production schedule that
every process "makes and moves"? What must be in place before automation is
worth adding?

## Inputs and minimum conditions
For JIT on a line: customer demand (or the schedule derived from it) in packs or
cases for the period; available working time in that period; each process's
capacity and changeover time; agreement on what "needed" means (the SKU, the
lot, the ship window). For jidoka: a defined **normal** way to do the work by
hand first; a clear signal for abnormality (bad part, wrong count, machine
fault, delay); someone who will respond when the process stops.

## Procedure and calculation
**Just-in-Time — the pull chain**
1. Fix the period and demand: available minutes ÷ demand = **takt** (the customer
   rhythm — `lean.takt-time`).
2. The **last** process takes from the one before only what it will use next
   (the supermarket or kanban signal — `lean.kanban-supermarket`).
3. Each upstream process makes only to replenish what downstream withdrew — no
   lot sizes "because the oven is warm" unless levelling justifies them
   (`lean.heijunka-epei`).
4. Level where mix would otherwise swamp a step (heijunka); shorten changeovers
   where mix change is unavoidable (`changeover.smed`).

**Worked case (independent — `scripts/knowledge/cases-lean.py`, § TPS foundations):**
a packing line has 2,250 available minutes in a shift and demand 4,500 trays —
takt = 0.5 min a tray (30 s). The tray sealer pulls trays from the filler; if
the sealer's kanban holds two hours of trays (240 trays at takt), the filler
replenishes 240 when the kanban returns empty, not the filler's plate speed
maximum. If the filler kept running at full rate while the sealer stopped for
twenty minutes, WIP would grow by 40 trays at a 2-min cycle — pure inventory
waste with no customer benefit; JIT stops that push.

**Jidoka — stop, fix, don't pass defects**
1. Do the operation correctly by hand; remove waste until anyone can repeat it
   (`lean.standard-work`).
2. Build **mistake-proofing** where a wrong setup or wrong part can be caught
   before value is added (`lean.poka-yoke`).
3. On abnormality: **stop** (machine autostop, andon, or operator stop cord —
   `lean.andon`); call the responsible person; fix cause before restart.
4. Only then mechanise — machines inherit the same stop-on-abnormal rules
   (Toyota's wording: human wisdom added to automation).

**How the pillars meet TOC:** JIT starves upstream when downstream cannot take
more — which is **subordinating** non-constraints to the system's pace
(`capacity.theory-of-constraints`). Jidoka prevents good minutes at the
constraint from being wasted on scrap or rework.

## Assumptions, limits and misuse
- JIT without reliable quality becomes expediting: stopping is as important as
  pulling.
- Pull without stable standards (times, methods, changeovers) breaks every day
  at the weakest takt step.
- Jidoka is not "no automation" — it is automation that **cannot** run blind
  through defects.
- Ohno's examples are automotive; food FMCG still uses the same logic on filler
  lines, ovens and case packers, with hygiene and allergen controls layered on.

## Reading the result
"This site runs on the two pillars: the case packer **pulls** what despatch
needs each shift (JIT); every line has **stop-on-defect** at the checkweigher
and metal detector with andon to the team leader (jidoka). The gap to world
class is uneven changeovers (mura) — heijunka and SMED are the next work, not
more WIP."

## When not to use it — and instead
Mapping material and information flow for a whole value stream →
`lean.value-stream-mapping` or Womack's full lean map (gap record
`lean.lean-thinking-map` when built). Choosing measures for the floor →
`visual.performance-measures`. Finding which step limits output → Line capacity
and `capacity.theory-of-constraints`.

## In food and FMCG manufacturing
Chilled and short-life products **are** JIT by nature: make to despatch window,
minimise WIP in chillers. Jidoka maps to CCP stops, reject systems on fillers,
checkweigher kick-offs and line clears after allergen change — stop the line,
hold the lot, fix the cause. Retailer OTIF is the pull signal; giving away and
yield losses are the price of running faster than pull or past a stopped
quality device.

## References
- [textbook] Ohno, T. (1988), *Toyota Production System: Beyond Large-Scale Production*, Productivity Press — the origin of JIT pull and jidoka on the shop floor; text not read; chapter 1 pull logic confirmed online 23 November 2026 via Gemba Academy summary excerpt.
- [practice] Toyota Motor Corporation — *Toyota Production System* (vision and philosophy), global.toyota, accessed 23 November 2026 — the two pillars defined: jidoka as automation with a human touch; Just-in-Time as only what is needed, when needed, in the amount needed; andon when equipment or work stops.
- [practice] Toyota Motor Corporation — *75 Years of Toyota*, history of kanban adoption (1963 in plants, suppliers from 1965), heijunka and andon at Kamigo (1966); confirmed online 23 November 2026 via toyota-global.com history excerpt.
- [practice] Lean Enterprise Institute — *Lean Lexicon*, entry "Toyota Production System" — Sakichi Toyoda's automatic loom stopping on thread break as jidoka origin; confirmed online 23 November 2026.

## In Faultline
The line's **takt** and Line capacity's target encode the JIT rhythm; the Line
standard and SMED encode repeatable work before mechanisation; problems and
stops on the line record what jidoka surfaced. Nothing on a screen is called
"TPS" — the methods above are how the app implements the pillars. Record added
23 November 2026 (shelf wave W-S2, `knowledge/SOURCES.md`).