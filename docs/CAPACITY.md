# Line capacity and a shift's losses — what the practice says

The knowledge behind Line capacity, the loss count and SMED, the way
`docs/OPEX.md` is the knowledge behind the running-line method. Written 12
October after Rowland: "the fact that you're having to ask me tells me that
you don't know enough about the line capacity model ... the information's
out there". Every answer below is the established practice, with where it
comes from; the app follows it and does not ask a person to decide it again.
Measured by people, never by sensors — so where the practice reads a
machine, the app has a person count, time, tap or walk instead.

## 1. Speeds: plate speed, and a person's standard time

- **A machine's speed is its plate speed** — the nameplate (design, rated)
  rate the maker states. Rowland, 12 October: "we go by plate speed ... of
  course, unless human". It is the ideal the losses are measured against;
  nameplate capacity "assumes conditions that never persist: no breakdowns,
  no changeovers, no minor stops, no slow running, no defects". Running
  below it is a loss (slow running), never a lower plate.
- **A person's speed is their standard time** — what a trained person
  sustains, not their best lap: the observed time × the pace rating, plus
  the allowances (the time study, tool 3, `lib/ie/balance` `element`). Where
  a person has been timed, the standard time is their speed; until then a
  typed time, said so.
- **Units.** Every station counts in its own unit (bags, baskets, cases,
  pallets) with the conversion from the one before ("1 basket = 12 bags");
  the chain puts every speed in the line's unit, at the start of the line,
  rejects put back (`lib/capacity`, already) — the like-for-like figure the
  bottleneck is found on. What a station *makes* is its own speed in the
  line's unit, nothing put back: the Bagger at 100 bags 100 a minute, though
  the weigher before it rejects 2% and its like-for-like figure is 102. So
  the line's speed a stop's packs are counted at (SMED, the loss count) is
  the bottleneck's own, and capacity a shift is the good off the end of the
  line (audit, 13 October).

**A person, as the floor says them** (Rowland, 13 October: "8 units in a
tray ... a tray every 8 seconds ... very strange numbers"; "70 a minute ...
how many go into a basket? 10 ... so one basket goes to a human every X").
A person's station asks its speed the way a person is timed — *one tray every
8 seconds* — and says it back at once ("= 7.5 trays a minute each · 60 bags a
minute"), so a slip shows where it is typed. Never "so many a second". After
the first station, how many of the one before make one is asked, never taken
as one. **What reaches a station** is worked out the moment it says its unit
and that number — before it has a speed: the slowest station before it, put
into its unit ("a tray reaches them every 6.9 s — 8.75 a minute: the bagger
does 70 bags a minute, 8 to a tray"). With a speed, whether it keeps up — for
a person in seconds a piece ("they take 8 s a tray — 8.7 s with 9% rest — 1.9 s too slow") — and,
when short, how many people would (⌈what arrives ÷ one person's pace⌉), one
tap to make it so (`lib/capacity` `arrivals`, `paceSays`).

Sources: nameplate vs real capacity (Fabrico); ISO 22400-2 "planned run
time per item" as the design speed; Toyota standard work, part 1 (All About
Lean).

**A person's pace — the science** (Rowland, 14 October: "because you bring a
human into it, we don't talk about plate speeds ... we also need to bring in
science when it comes to humans ... a human having to keep up with machines
... research that science and build it in"; and the pace to plan on, asked
and chosen: *the timed pace plus the allowances, nothing more taken off*).

- **The time to plan on is the time timed, plus a rest allowance.** Work
  measurement rates a person against the standard — 100 on the BS 3138
  scale, the pace a qualified worker keeps naturally over a working day
  without over-exertion (75 is steady and unhurried) — and adds allowances
  for what no one can avoid over a shift. The ILO's **constant allowances**
  go on every job: **5% personal needs and 4% basic fatigue — 9%**. On top,
  **variable allowances** for the job's own strain: standing, an awkward
  posture, force or weight lifted, poor light or air, close attention,
  noise, mental strain, monotony, tedium (ILO, *Introduction to Work Study*).
  So a person's station carries a **rest allowance, 9% unless changed**: "a
  basket every 6 s" is planned as one every 6.5 s, said so on the card
  ("They take 6 s a basket — 6.5 s with 9% rest") and on the paper ("a
  basket every 6 s + 9% rest"). The person adds the variable part, never the
  app. A **standard time from the time study already carries its
  allowances** (`lib/ie/balance` `element`), so none is added again; a
  machine has none (`lib/capacity` `allowanceOf`, `planPerMinute`).
- **Nothing more is taken off the pace.** A "65% efficiency over a shift" is
  a measure of a whole shift — pace, waiting, stops and changeovers in one
  number. The loss count measures that lost time itself (§5), and Line
  capacity's running % holds a station's own stops; taking an efficiency off
  the pace as well would count the same minutes twice. The pace is what a
  person keeps up while working, with the rest that keeps them at it.
- **A person fed straight by a machine can't match it piece for piece.** A
  person's cycles vary, one to the next; a machine's do not. With nothing
  collecting between them, every slow cycle is a piece missed or a stop,
  never made up on the next — and machine pacing is itself a cause of
  strain and error (Salvendy & Smith, *Machine Pacing and Occupational
  Stress*). The same holds for a person fed straight by another person. The
  practice is to plan a paced person below their pace — a line balance
  loads a person to 85–95% of what they can do, never to all of it — or to
  give a slow cycle somewhere to be made up: a table, a stretch of
  conveyor. So when a person is fed straight, nothing set to collect before
  them, and what reaches them is over **90%** of their pace (rest
  included), the card says so in amber: "Fed straight by the Bagger with
  nothing collecting between — loaded to 99% of their pace. A person can't
  match a machine piece for piece: plan them at 80–90%, or let some collect
  before them." It is advice, not a stop: the sums still say they keep up
  (`PACED_LOAD_MAX`, `paceSays`).
- **Timed in the unit they handle.** A palletiser is timed per basket, not
  per pallet. Rowland: "it's making me put a rate in myself, but all I did
  is do the division of 70 a minute". So a person whose unit holds several
  of the one before is timed per either — *Timed per pallet · basket* — and
  the card works the rest out: "= 10 baskets a minute each · a pallet every
  3 min 36 s (36 baskets) · 100 units a minute". Switching keeps the speed;
  what reaches them is said per basket and per pallet ("A basket reaches
  them every 8.6 s — 7 a minute; a full pallet of 36 every 5 min 9 s"), and
  whether they keep up per basket.
- **A time typed in minutes, and a rate that reads like a time.** Rowland:
  "counts in pallets, each pallet holds 36 baskets ... 5 ... it says 5
  pallets a minute ... it isn't ... it takes 5 minutes to do one pallet."
  The cycle only took seconds, so a time in minutes went into the rate's
  box. Now the speed is asked two ways, named for what they are — *How many
  in a time* and *How long one takes* — and how long one takes is in
  seconds or minutes ("a pallet every 5 min", kept in seconds underneath;
  the number typed stays when the unit is changed). A speed under one a
  minute is said back an hour ("15 pallets an hour"). And a rate many times
  what reaches the station, whose reading as one every N is close to what
  reaches it, is asked about — "5 pallets a minute is 1,800 units a minute —
  26 times what reaches them. One pallet every 5 minutes?" — with *Make it a
  pallet every 5 min* one tap away; never changed by itself
  (`lib/capacity` `rateAsTime`).
- **The chain said where it is typed.** Under "Each pallet holds 36
  baskets": "1 pallet = 36 baskets = 360 units" — the conversion carried all
  the way to the start of the line, so a wrong number in it shows at once
  (`chainWords`).
- **Left out, on purpose, for now:** a fatigue curve by hour of the shift
  (longer shifts, twelve hours especially, show measurable falls in
  alertness and performance — NIOSH, *Plain Language About Shiftwork* — but
  the rest allowance is the practice's planned answer, and a curve would be
  a guess per person); and a **lifting check** — the revised NIOSH lifting
  equation (ISO 11228-1) on what a palletiser lifts, and repetitive actions
  a minute (OCRA, ISO 11228-3). Those are the next piece: they answer "can a
  person do this all shift safely", which the pace alone does not.

## 2. Capacity's three numbers

- **Design capacity** — plate speed × planned production time.
- **Effective capacity** — design capacity less the planned losses
  (planned changeovers, cleaning, breaks the line stops for).
- **Actual output** — counted. Utilisation = actual ÷ design; efficiency =
  actual ÷ effective; loading = demand ÷ effective — and demand ÷ a
  station's capacity can exceed 100%, which is how the overloaded station
  shows (`lib/ie/mix` `threeNumbers`, already).

Toyota's **production capacity sheet** (the first of the three standard-work
forms) works capacity a shift per process from the machine time, the manual
time and the tool change spread over its interval: 27,600 s ÷ (24 s + 60 s
every 300) ≈ 1,140 a shift. Line capacity is that form, for a packaging line:
a row per station in flow order. The other two forms are already in the app:
the **combination table** (the people's work against takt — the People view)
and the **standardized work chart** (who stands where — the line standard).

**Capacity a shift, in the app.** Under the sheet, on a product's standard:
each of the line's shifts (its settings — the clock times and the breaks
the line stops for, relief 0), less its changeovers into this product
(SMED's minutes — the standard's agreed ones, else as timed, said which — ×
how many a shift the SMED says), at the bottleneck's speed once its own
stops count — in good packs off the end of the line, every station's
rejects off. Worked by hand: 8 h less 30 min of breaks is 450 min; 3
changeovers of 42 min take 126; 324 min × 100 bags a minute = 32,400 bags a
shift — 45,000 if it never changed over. With the packers keeping 95% on,
95 good a minute: 30,780 a shift, said "(95 good off the end of the line)";
a weigher rejecting before the Bagger changes nothing it makes. A changeover stops the whole line,
so it comes off the shift once, never also off a station's running share.
A break not said, or a changeover not timed or not counted, is said so and
left out of the sum — never assumed.

## 3. The bottleneck

- **Worked out:** the station with the lowest effective capacity in the
  line's unit is the bottleneck; adding capacity there raises the line's
  until the next station takes over — the bottleneck moves, and a person's
  basket size can move it (`lib/capacity`, already, with what-ifs).
- **Walked:** the **bottleneck walk** (Roser, Lorentzen and Deuse, 2015; in
  use at Bosch) finds it on the floor with no clock: walk the line and note
  each station — working, **starved** (waiting for input) or **blocked**
  (cannot pass on), and each buffer full or empty. A blocked station or a full
  buffer points downstream; a starved station or an empty buffer points
  upstream; the bottleneck lies where the arrows meet. One walk gives the
  bottleneck of the moment; repeated walks (work sampling's method) give the
  picture over a shift — the shifting bottleneck. It needs no calculation,
  statistics or time measurement: made for a phone at the line. The
  calculated and the walked bottleneck agreeing is the proof; disagreeing
  says the speeds typed are wrong, or stops not speed hold the line.

## 4. The V-curve — protecting the critical machine

- **The critical machine** is typically the slowest and often the costliest
  on an accumulation line (the filler, the bagger): its speed is the line's
  pace, and it should never stop for its neighbours.
- **The V:** the machines next to it run about 10% faster when recovering,
  and each further machine about 10% more — speeds rising away from the
  critical machine both ways, drawn as a V. The 10% step is a convention
  (LineView, Foodmach), a starting point to improve on, not a law — so the
  margin is the owner's, recorded on the line.
- **Accumulation** between machines lets a short stop on one side pass
  without stopping the critical machine. A buffer adds no speed; it absorbs
  stops. Sized from the minor stops' length and how often, the restart, and
  the speed difference — a rule of thumb is 2–5 minutes of production. A
  first estimate: the typical minor stop × the critical machine's rate is
  what the buffer must hold. Undersized, the critical machine starves;
  oversized only delays it.
- **Speeding a non-critical machine adds nothing** to the line's output.

## 5. A shift's losses — the time model

The six big losses (TPM) on the time model (ISO 22400-2's planned busy time
and actual production time; the OEE loss tree), counted by hand:

| From | Less | Gives | The loss |
|---|---|---|---|
| The shift | planned stops — breaks the line stops for (not breaks covered by relief), planned cleaning, meetings, no demand | **planned production time** | not a loss: excluded |
| Planned production time | breakdowns and stops logged | | availability: breakdowns |
| | changeovers — last good piece to first good piece at full rate, the run-up included | **run time** | availability: set-up and adjustment |
| Run time × plate speed | what was made, good and rejected | | performance: **slow running and short stops** — the rest |
| Packs made | rejects, start-up rejects included | **good packs** | quality: defects and start-up |

- **Planned production time is the shift less its planned stops** — so a
  line's shifts carry their planned breaks (and whether the line stops for
  them or relief keeps it running); the count's planned minutes are worked
  out, not typed down from the whole window.
- **The rest is performance loss, and it has a name.** With stops logged by
  hand above a threshold, what the stops, changeovers and rejects do not
  explain is **slow running and short stops** — running below plate speed,
  and stops too short to log. It is not "unknown": it is these two, not yet
  told apart. They are told apart by **timing the running speed** — count
  the packs in a timed minute while it runs. The packs run, good and
  rejected, at that speed took the **net operating time** — packs ÷ running
  speed (Nakajima, *Introduction to TPM*; JIPM's loss structure): **short
  stops** are the run time less it, **slow running** it less the same packs
  at the plate speed (packs ÷ plate). Worked: 37,100 packs at 98 a minute
  took 378.6 of the 380 min run, and take 371 at 100 — 7.6 min of slow
  running, 1.4 of short stops. (Run time × (plate − running) ÷ plate, the
  first form here, runs the line at the timed speed through its short stops
  too: at 80% of the plate it says 40 min of slow running where 37.5 is.)
- **Changeovers** are their own loss (set-up and adjustment), measured from
  the last good piece to the first good piece at full rate — the run-up is
  part of it (SMED, `docs/TOOLKIT.md` §6). A stop logged as a changeover in
  Capture is one.

## 6. What a loss costs

- **At the bottleneck, or on a line that is sold out, lost time is lost
  output:** lost units × contribution (price less the materials and other
  truly variable costs), plus the idle labour of the crew paid to stand.
- **Away from the bottleneck, lost time costs the labour** and nothing in
  output — unless it starves or blocks the bottleneck long enough to stop it.
- So the pounds of a line's loss are said in two parts — idle labour, and
  lost contribution when it cannot be made up — never one blended figure;
  and with no cost on the line, no pounds at all. Cost deployment (WCM) is
  the same pounds over weeks, ranked, each pointed at its cause.
- **As built for the stopwatch's stops** (14 October; Rowland: "capacity
  loss units and labour"): every screen that put a £ on lost time — the
  stopwatch's ticker and its toast, the Pareto, the board's machines, the
  one-page Report, Trend, the meeting, a Case's proof, the line map's heat,
  the line's facts and its settings — says its labour in pounds and its
  capacity lost in packs (`lib/lineLoss`). The packs are the minutes of the
  stops that stopped the line × its rated speed: a stop on its bottleneck
  (the station its Line capacity says limits it, product by product), on
  the whole line, or on no machine named. A stop on another machine costs
  its labour and no packs — the line runs round it. With no Line capacity
  the bottleneck is not known, every stop is counted, and the screen says
  so. The packs are not priced here: the margin a pack prices them in a
  shift's loss count and in SMED, where the count says if they can be made
  up. Until then, one "£/hr while it is down" added the two and charged the
  lost output on every machine's stops.

**What a pack costs in labour** (Rowland, 13 October: "provide an hourly
rate ... how much we run in a minute equals how much we run in an hour. If I
put two people there ... is my cost per pack higher or lower?"). The direct
labour cost of a unit is the crew's cost an hour over the units the line
makes an hour: *people × pounds an hour ÷ (good output a minute × 60)* — the
standard costing practice (labour cost per unit = rate × hours ÷ units).
Eight people at £12.50 is £100 an hour; a line making 409 bags an hour costs
24.4p a bag in labour. The people are those on the line standard's map until
typed; the rate the line's, with its on-cost, until typed — each said where
it came from. **One more person at a people bottleneck** is the question the
floor asks: it raises the line to what the next-slowest station allows
(never past it), adds one rate an hour, and the answer is the cost a pack
against today's — lower when the packs it adds outweigh what it costs. Only
at the bottleneck: a person added anywhere else adds cost and no packs, so
it is never offered there. It is labour only — materials, overhead and
contribution stay in the loss count's pounds above, and the app never adds
the two into one figure.

## 7. The product mix

When the bottleneck cannot make everything asked, make first what earns the
most per **minute of the bottleneck**: throughput per unit (price less
materials) × units per bottleneck minute (Goldratt's throughput accounting;
Martin's worked problem: $235 a unit at 15 min = $15.67 a minute beats $300
at 30 min = $10.00). Fill the bottleneck's week in that order; say what is
left unmade (`lib/ie/mix`, already — its inputs are a price and a materials
cost a pack, not a margin typed by feel).

## 8. Acceptance of a new line

For a stage-gate job's performance run: the packaging machinery standard for
efficiency and availability is **EN 415-11:2021** (it replaced DIN 8743:2014,
itself the successor of VDI 2674) — a time model and a quantity model agreed
by both parties *before* the acceptance test. The app's performance run is
already agreed before it is run; its words follow this time model (§5).

## What changes in the app because of this

- **The loss count (tool E):** the rate is the critical machine's **plate
  speed** in the line's unit (Line capacity's station marked "on the
  plate"), else typed and said so; the planned minutes are the shift less
  its planned breaks (shifts gain their breaks); the rest is **slow running
  and short stops**, split when a running speed is timed; the pounds in two
  parts (idle labour · lost contribution when it cannot be made up).
- **Line capacity:** machines at plate speed, people at their standard time
  from the time study, or a time typed plus the ILO's 9% rest; a person
  timed in the unit they handle, the chain said; a person fed straight past
  90% of their pace said so; the production capacity sheet and the V-curve with
  the owner's margin; the **bottleneck walk** on the phone, its tally against
  the calculated bottleneck; each buffer's accumulation against the minor
  stops at its neighbour.
- **The V, drawn:** a column a station, as tall as its share of the
  bottleneck once its stops count, the rest while running hatched on top;
  coloured by how close it runs to the bottleneck (graphite at it, teal lighter
  with room to spare), amber under the agreed V; the same as bars on a
  phone and on paper.
- **SMED:** the changeover from the last good piece to the first good piece
  at full rate; its minutes × how many a shift come off each shift in Line
  capacity's capacity a shift.
- **The mix:** price and materials a pack, not a typed margin.

## Sources

- Overall equipment effectiveness and the six big losses — https://en.wikipedia.org/wiki/Overall_equipment_effectiveness ; https://teeptrak.com/en/six-big-losses-2026/
- Planned production time and the OEE time model — https://www.fabrico.io/blog/planned-production-time-vs-operating-time/ ; https://www.fabrico.io/blog/oee-time-model-manufacturing/
- The 16 losses (start-up, set-up and adjustment) — https://industryforum.co.uk/wp-content/uploads/sites/6/2015/05/The-16-Losses.pdf
- Nameplate vs real capacity; run rate vs design rate — https://www.fabrico.io/blog/nameplate-capacity-vs-real-capacity-manufacturing/ ; https://www.fabrico.io/blog/run-rate-vs-design-rate/
- Toyota standard work, the production capacity sheet — https://www.allaboutlean.com/toyota-standard-work-1/
- The bottleneck walk — https://www.allaboutlean.com/bottleneck-walk2/ ; https://www.bvl.de/lore/all-volumes--issues/volume-8/issue-1/reliable-shop-floor-bottleneck-detection-for-flow-lines-through-process-and-inventory-observations-the-bottleneck-walk
- The V-curve — https://foodmach.com.au/resources/v-curve-theory-oee ; https://lineview.com/en/is-the-v-curve-theory-the-best-option-for-setting-accumulation-line-speed
- Accumulation — https://packmedia.net/node/11887 ; https://www.packaging-mag.com/automation-and-accumulation-systems-what-often-goes-unnoticed/
- The demand/capacity curve — https://www.industryweek.com/operations/understanding-demandcapacity-curve
- Cost of downtime at and away from the bottleneck — https://oxmaint.com/industries/manufacturing-plant/bottleneck-equipment-reliability-throughput-manufacturing ; https://shoplogix.com/machine-downtime-calculator/
- Throughput per constraint minute — https://maaw.info/TOCClassProblem1.htm
- EN 415-11 / DIN 8743 — https://6sku3uaup9f9.din.de/en/standard/din-8743/70366120
- Rating, the BS 3138 scale and allowances (constant 5% personal + 4% basic fatigue; the variable table) — Kanawaty, G. (ed.), *Introduction to Work Study*, 4th ed., ILO, Geneva, 1992; BS 3138:1992
- Machine pacing — Salvendy, G. and Smith, M. J. (eds), *Machine Pacing and Occupational Stress*, Taylor & Francis, 1981
- Long shifts and performance — NIOSH, *Plain Language About Shiftwork*, DHHS (NIOSH) Publication No. 97-145, 1997
- Lifting and repetitive work (the next piece) — Waters, T. R. et al., "Revised NIOSH equation for the design and evaluation of manual lifting tasks", *Ergonomics* 36(7), 1993; ISO 11228-1 and ISO 11228-3
