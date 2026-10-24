---
id: ergonomics.push-pull
name: Pushing and pulling — trolleys and pallet trucks
aka: [push pull, RAPP tool, trolley forces, Snook tables, Liberty Mutual tables, initial force, sustained force]
discipline: ergonomics
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — HSE's RAPP tool (INDG478, Risk Assessment of Pushing and Pulling) for the factor-scored screen and HSE L23's guideline figures for pushing and pulling forces (quoted from memory — about 20 kg / 15 kg to start or stop and 10 kg / 7 kg to keep moving, men / women — and marked to confirm against the text); Snook & Ciriello (1991) for the population tables; the rolling-resistance check is elementary mechanics; from knowledge, texts not read from here; the worked forces in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [ergonomics.hse-mac-art]
alternatives: [ergonomics.hse-mac-art]
related: [ergonomics.niosh-lifting, lean.spaghetti, ergonomics.layout-from-to]
---
# Pushing and pulling — trolleys and pallet trucks

## Purpose and principle
Moving a rack of trays, a tote, a pallet truck or a bin is a manual
handling task whose load is not lifted but pushed or pulled, and the
risk is in the force it takes — to **start** it (the initial force,
the highest), to **keep it moving** (the sustained force) and to stop or
steer it — against what the population can exert without injury, and in
the route's factors: the floor (wet, uneven, a ramp), the distance, the
frequency, the posture, the handles' height and the equipment's state
(wheels, bearings). The forces are measured with a hand-held force
gauge by a person, on the real route, loaded as the floor loads it, and
compared with the published guideline figures (HSE's L23 for a quick
screen; Snook and Ciriello's tables for the share of the population that
can do it); HSE's RAPP tool scores the whole task's factors in colour
bands like MAC. The surest fix is usually mechanical — wheels, bearings,
the ramp — and the measurement before and after proves it.

## Questions it answers
- Is moving these racks a risk — by the measured forces against the
  guidelines?
- Which factor drives it — the load, the wheels, the floor, the ramp, the
  frequency?
- What would new wheels or a level route save in force, and does the
  task then pass?
- How often and how far, and by whom?

## Inputs and minimum conditions
- The forces measured with a force gauge: initial (to start), sustained
  (to keep moving), on the real route at its worst point (the ramp, the
  threshold), with the real load, several repeats.
- The route (distance, slopes, surfaces, obstacles), the frequency a
  shift, the people (and whether the task is one person's or two).
- The equipment's state (wheel size and type, bearings, handle height).

## Procedure and calculation
- Measured forces against the guideline figures (L23's quick figures,
  marked to confirm; or Snook & Ciriello's tables for the frequency and
  distance, giving the share of men and women for whom the force is
  acceptable).
- RAPP: the task's factors (load, posture, hand grip, work pattern,
  travel distance, obstacles, floor, other) each in a colour band with
  its score; the total ranks tasks; red factors are the actions.
- A mechanics check on the sustained force: F ≈ m g (μ cos θ + sin θ)
  for a load m on wheels with rolling resistance μ up a slope θ — a 3°
  ramp more than doubles the flat force on a 450 kg rack; this says
  which lever (the ramp, the wheels' μ, the mass) matters.
- After a change (new wheels, a level route, a smaller load), re-measure;
  before → after on the gauge is the evidence.
- Frequency × distance a shift from the standard or a count; the
  spaghetti diagram (`lean.spaghetti`) shows the route.

**Worked case** (`cases-projects-people-ergo-sust.py`): a 450 kg rack
of trays up a 3° ramp — measured initial force 310 N, sustained 140 N;
against L23's quick figures (about 200 N to start, 100 N to keep moving,
for men — to confirm) both are over. The mechanics agree: with rolling
resistance 0.03 the flat sustained force is about 130 N, and the ramp
takes it to about 360 N — the ramp is the factor. Level the route or
fit a powered tug; re-measure.

## Assumptions, limits and misuse
- Measuring once on a clean, dry, level floor misses the ramp, the wet
  patch and the worn wheel that cause the injury; the worst point of
  the real route.
- Guideline figures remembered from training are not the text; L23's
  and Snook's are the authorities and this record's figures are marked
  to confirm.
- A force gauge pulled at the wrong height or angle reads wrong; the
  method in the HSE guidance.
- Two-person pushing does not halve the force each exerts reliably.
- A pass on force with a red on frequency or posture is still a risk;
  the RAPP's factors are read together.

## Reading the result
"Initial force 310 N on the ramp — high against the guideline; the ramp
doubles the force: level the route or fit a tug, then re-measure."
Money: an injury's cost (`knowledge/MONEY.md`, C and L) against the
wheels or the tug; the time saved by an easier route (L).

## When not to use it — and instead
Lifting and carrying → `ergonomics.hse-mac-art`, `ergonomics.niosh-lifting`.
The route's distance and layout → `lean.spaghetti`,
`ergonomics.layout-from-to`.

## In food and FMCG manufacturing
Rack trolleys in bakeries and cook-chill; pallet trucks across
thresholds and ramps; tote bins of ingredients; roll cages at despatch.

## References
- [guidance] Health and Safety Executive, *Risk assessment of pushing and pulling (RAPP) tool*, INDG478 (2016) (from knowledge; not read from here).
- [guidance] Health and Safety Executive, *Manual handling: Manual Handling Operations Regulations 1992 — Guidance on Regulations*, L23, 4th ed. (2016) — the guideline figures for pushing and pulling (from knowledge; figures to confirm).
- [peer-reviewed] Snook, S.H. and Ciriello, V.M. (1991), "The design of manual handling tasks: revised tables of maximum acceptable weights and forces", *Ergonomics*, 34(9), 1197–1213 (from knowledge).

## In Faultline
Not built (FC-211, research first: the guideline figures and tables are
HSE's and Liberty Mutual's, to be taken from the texts). When built: a
task on a line with its measured forces, the route's factors, the
guideline comparison, the mechanics check and the re-measure as before →
after.
