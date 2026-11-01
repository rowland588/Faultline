/* GUIDES — statistical process control, capability and measurement (the discipline's tools; src/catalogue/guide.ts).
 * FC-094 and FC-118 are the two exemplars the other guides match: the page's own labels, in the order a person meets them,
 * each step said as what it means, what to do and what you get — and nothing the page does not do. */
import type { Guide } from '../guide';

export const SPC_GUIDES: Record<string, Guide> = {
  'FC-094': {
    intro: 'For a measurement a machine makes again and again — a fill weight, a seal temperature, a slice thickness — when you need to know whether it holds its limits all shift, not just on the one pack you checked.',
    steps: [
      {
        step: 'What are you measuring?',
        means: 'The thing you take readings of, and its unit — fill weight in grams, jaw temperature in °C. Naming it first tells the tool which sentences and which units to use.',
        doThis: 'Pick the kind that matches what the floor actually has: a measurement (a number on a scale or a probe), a count of rejects, faults found, a rate held, or pass or fail. Type its name and unit as the operator would say them.',
        youGet: 'A study named for what it measures, with the right boxes below — and the right words on the verdict and on the paper.',
      },
      {
        step: 'Which question?',
        means: 'The same readings can answer different questions: do they stay between two limits, at least a minimum, at most a maximum, or do items simply pass or fail. The question decides the arithmetic.',
        doThis: 'Tap the question that is in the specification or the customer’s requirement. A speed that must be at least 75 a minute has only a lower limit; oxygen in a pack that must be at most 2% has only an upper one.',
        youGet: 'Only the boxes that question needs — a one-sided question never asks for the limit it does not have.',
      },
      {
        step: 'Judged against',
        means: 'The limits, and how many readings you will take, agreed before the first one — so the verdict cannot be bent to suit the numbers afterwards.',
        doThis: 'Type the lower and upper limit from the specification (and the target if there is one), and how many readings you will take. Thirty is the usual number for a capability figure; fewer is allowed and said.',
        youGet: 'The agreed record the verdict is read against. A limit left empty on a question that needs it is refused in words.',
      },
      {
        step: 'The readings',
        means: 'The values in the order they were taken. Order matters: it is how the tool tells a steady process from one that is creeping.',
        doThis: 'Take the reading at the machine and tap it into the number pad, or paste the column from your log. A wrong one is struck, not deleted — it stays on the list, left out of the figures, and can be brought back.',
        youGet: 'The readings in order with a histogram, and the checks before capability: is it bell-shaped, is it steady, is it read finely enough. Under twenty readings the checks say they cannot be sure.',
      },
      {
        step: 'Ppk and the verdict',
        means: 'Ppk says how many times the real spread of the readings fits between the limits, counting how far off-centre it runs. 1.33 or more is capable; below 1 the process is making product outside the limits. The tool also says how sure the figure is, because thirty readings give a range, not a point.',
        doThis: 'Read the verdict sentence first, then the tiles: Ppk, Cpk, the share outside the limits and how sure the figure is. If the readings are not bell-shaped the share outside is counted as measured, not worked out from a curve.',
        youGet: 'A verdict in words — capable, not capable or not enough readings — the Ppk with its lower bound, the share outside, and an action plan with an owner and a day.',
      },
      {
        step: 'In money',
        means: 'What the finding costs: for a fill weight, the product given away above the target, said for a pack, a shift and a week from what the product costs you a kilo.',
        doThis: 'Give what the product costs a kilo, the packs a shift and the shifts a week. Every one is optional — leave any out and the page says which it is missing instead of inventing a figure.',
        youGet: 'The give-away in pounds, or the name of the one input still needed. Nothing waits on it: the verdict stands without it.',
      },
    ],
    watch: 'Agree the limits and the number of readings before you take any. A study whose limits were typed after the readings proves nothing — and the page will not let a verdict stand without them.',
  },
  'FC-118': {
    intro: 'For checking that a measuring method is good enough to trust before you judge a machine with it — do three people, measuring the same ten parts, get the same answer from the same scale?',
    steps: [
      {
        step: 'The parts',
        means: 'The things that are measured: ten parts that between them span the whole range the process makes, from the smallest to the largest you would see.',
        doThis: 'Pick ten real parts — ten packs, ten seals, ten slices — that are spread across the range, not ten that look alike. Code them 1 to 10 and type the codes, separated by commas.',
        youGet: 'The ten rows the readings will be filled in against. Parts that are all alike make the gauge look worse than it is, because there is nothing for it to tell apart.',
      },
      {
        step: 'The appraisers',
        means: 'The people who measure — the ones who will really use this gauge on the floor. The study separates what the gauge does on its own from what changes with who is using it.',
        doThis: 'Type the three operators’ names or initials, separated by commas. Use the people who do the job, not the most careful person in the building.',
        youGet: 'Three columns of readings, one for each person, so the tool can tell repeatability (one person, the same part, again) from reproducibility (one person against another).',
      },
      {
        step: 'Trials each',
        means: 'How many times each person measures each part. The parts are shuffled and the person does not see their last reading.',
        doThis: 'Choose 2 or 3. Three trials give a firmer answer; two is the usual minimum. Have each person measure all ten in a fresh random order for every trial.',
        youGet: 'The size of the grid — parts × appraisers × trials — and the number of readings still to enter.',
      },
      {
        step: 'Tolerance',
        means: 'The width of the specification: the upper limit less the lower limit. It lets the study also say how much of the tolerance the measuring method uses up, which matters when the part is judged against limits.',
        doThis: 'Type the lower and upper limit if you have them — it is optional. Leave it empty if you only want the share of the parts’ own variation.',
        youGet: 'A second figure, %GRR of tolerance, next to the first. Without limits the page still gives the first.',
      },
      {
        step: 'The readings',
        means: 'Every reading, filled against the part, the person and the trial it belongs to.',
        doThis: 'Paste the column from your sheet or type them in by cell. A reading entered twice for one part, person and trial keeps the last — said on the page.',
        youGet: 'A complete grid, or a list of the cells still empty. The figures appear once the grid is full.',
      },
      {
        step: '%GRR and ndc',
        means: '%GRR is how much of the total variation you see comes from the gauge and the people measuring, not from the parts. Under 10% is good, 10–30% is marginal, over 30% is not acceptable. ndc is the number of distinct groups the gauge can tell apart; five or more is wanted.',
        doThis: 'Read the verdict sentence, then which of repeatability or reproducibility leads. If the people differ, train them or fix the method; if one person differs from themselves, the gauge itself needs attention.',
        youGet: 'The verdict — acceptable, marginal or not acceptable — the %GRR, ndc, the split between repeatability and reproducibility, and the paper for the file.',
      },
    ],
    watch: 'A bad result is often the method, not the gauge: different positions on the pack, different pressure, a different reading point. Fix the way it is measured before you buy a new scale.',
  },
  'FC-086': {
    intro: 'For a measurement taken one reading at a time — a fill weight every twenty minutes, an oven temperature every hour — when the question is not “was that pack in specification?” but “is the process steady, and when did it change?”',
    steps: [
      {
        step: 'What is measured, and how it is judged',
        means: 'The chart is agreed once, before the readings: which kind (One reading at a time is this chart), what is measured and its unit, and — only if you have them — a target and the lower and upper specification limits. Specification limits are the customer’s or the recipe’s limits; they are drawn faintly and never used to work out the chart’s own control limits.',
        doThis: 'Choose New control chart from Tools, name what it is of (“Fill weight 400 g”) and the machine. Pick One reading at a time, type what is measured and its unit — the page never assumes one — then the target and specification limits if they are written down, and press Agree these.',
        youGet: 'A chart named for what it measures. Agree these is held until it has a name, and a lower limit at or above the upper is refused in words. What was agreed can be changed later; every reading is then read against the new agreement.',
      },
      {
        step: 'The readings',
        means: 'One number for each reading, in the order it was taken — order is what a control chart is made of, because it shows when the process moved.',
        doThis: 'Take the reading at the machine and tap it on the number pad, then ↵; or paste a column from your log (Or paste readings). When you change something — Adjusted, New reel, Restart — tap that under the last reading, or type your own words, so a jump on the chart can be explained later. A wrong reading is struck, not deleted.',
        youGet: 'Each reading as a point on the chart in order, with a count (“readings · limits from 20”) and a list, Every reading, where a struck one stays, left out of the figures, and can be brought back.',
      },
      {
        step: 'Set the limits',
        means: 'Control limits are where an ordinary reading of this process should land, worked out from its own readings: the centre plus and minus 2.66 times the average moving range (the gap between each reading and the one before). They are not the specification. Until you set them they are provisional and move with every reading, which is no use for spotting a change.',
        doThis: 'Take twenty readings from a stretch you believe was normal, then press Set the limits. After a deliberate change to the process, use Set them again from the latest 20; the old centre stays on the page as “set before”.',
        youGet: 'A centre line and an upper and lower control limit (UCL, LCL) with their values beside the chart, a moving range chart under it with its own upper limit, and a line saying who set the limits and from which readings.',
      },
      {
        step: 'The signals and the verdict',
        means: 'A point beyond a limit is the loud signal; the quieter ones are patterns inside the limits, such as eight in a row on one side of the centre. Each signal is said with the readings it covers and what it usually means on the floor. A signal is a reason to look, not a cause.',
        doThis: 'Read the verdict on the band, then the sentence and the list of signals under the tiles. For the first reading in each signal, go and ask what changed just before it — the Adjusted and New reel notes help. If the chart is attached to a project, Make it better raises a fix or a countermeasure from what it found.',
        youGet: 'A verdict — In control so far, In control, A signal or Out of control — six tiles (Readings, Centre, Limits, Signals, Since, Level), and each signal with what it usually means. Which signals are watched is set when the chart is agreed.',
      },
      {
        step: 'Next — can it hold the specification?',
        means: 'A capability figure describes a steady process and no other kind. When the chart is steady with its limits set, shows no signal, and a specification limit is known, the page offers the next question.',
        doThis: 'Press Check capability › when it appears under the sentence. A sheet, Start from these readings, opens already on that choice with a name offered; nothing is made until you press the button at its foot.',
        youGet: 'A new capability study with the readings copied and a link back to the chart; the chart itself is untouched. A chart with a signal, or with no specification typed, offers nothing.',
      },
    ],
    watch: 'Set the limits from a stretch that was normal. Limits drawn from a period that already had a problem in it are too wide, and the next problem will look ordinary. And the control limits are never the specification: a chart can sit well inside the specification and still be out of control.',
  },
  'FC-087': {
    intro: 'For checks taken in small samples at intervals — four packs weighed every hour, five seal strengths every fifteen minutes — when you want to know whether the average has moved between samples and whether the readings inside a sample have become more or less alike.',
    steps: [
      {
        step: 'Subgroups, and readings in a subgroup',
        means: 'A subgroup is the handful of readings taken close together and read as one moment. Choose Subgroups when agreeing the chart (“four packs an hour — X̄-R, and X̄-S from 11”): subgroups of 2 to 10 are charted as averages with their range (R) beneath; above 10 the spread beneath is the standard deviation (S) instead.',
        doThis: 'Pick Subgroups and type Readings in a subgroup — the number you will really take each time, 2 to 25. Name what is measured and its unit; the target and the specification limits are optional. Press Agree these.',
        youGet: 'A chart that counts in subgroups, not in readings. A size outside 2 to 25 is refused in words.',
      },
      {
        step: 'The readings, a subgroup at a time',
        means: 'You still enter single readings, in order; every m of them fill one subgroup. A paste fills subgroups in the order given and carries on from a half-full one.',
        doThis: 'Tap each reading as you measure it; the pad says how many are in the next subgroup (“2 of 4 in the next”). Take the whole subgroup close together in time, because the chart reads it as one moment. A last subgroup that is short is plotted but not judged.',
        youGet: 'One point for each full subgroup — its average on the main chart and its range (or standard deviation) in the small chart under it. The Subgroups tile reads, for example, “6 of 4”: six subgroups of four.',
      },
      {
        step: 'Set the limits',
        means: 'Limits are set from a steady stretch, as on every chart — here the first 20 full subgroups, using the standard textbook constants for that subgroup size. Until you set them they are provisional.',
        doThis: 'Take twenty subgroups from a stretch that was normal, then press Set the limits; the tile then reads “limits from 20”. After a deliberate change, use Set them again from the latest 20.',
        youGet: 'A centre (the grand average), upper and lower limits for the averages and an upper limit for the range or standard deviation, each drawn on its own chart.',
      },
      {
        step: 'Two charts, one verdict',
        means: 'The top chart asks whether the average has moved between samples; the one beneath asks whether the readings inside a sample have become more or less alike. A subgroup counts as beyond if its average is outside the limits or its range is outside its own limit.',
        doThis: 'Read the verdict, then the sentence and the signals, which name subgroups by number (“subgroups 14–21”). For a range beyond its limit, look at what makes the packs within one sample differ; for an average beyond, look at where the machine is set.',
        youGet: 'A verdict — In control, A signal or Out of control — and the same tiles and signals as the one-at-a-time chart, counted in subgroups.',
      },
    ],
    watch: 'A subgroup must be taken close together. The limits are built from how much the readings differ inside a subgroup, so if you gather packs across a whole hour and call them one subgroup, the chart will signal far too often.',
  },
  'FC-090': {
    intro: 'For finding a process that has moved even though no single reading is outside its limits — a filler creeping heavy as the hopper empties, a new reel that sits just off-centre. The signals are rules for reading patterns on a control chart.',
    steps: [
      {
        step: 'What should it watch for?',
        means: 'Eight patterns can be watched, each named in the floor’s words with its textbook name beneath: one reading far out; a step change (eight in a row on the same side of the middle); a drift (six in a row climbing or falling); over-adjusting (fourteen in a row zig-zagging); a shift starting (two of three readings well off to one side); a small shift that stays (four of five a little off to one side); too steady (fifteen hugging the middle); and two streams mixed (eight in a row off the middle, on both sides).',
        doThis: 'When agreeing the chart, leave the four that are ticked to start with unless you have a reason. Tick one more only when it answers a real question — drift if a hopper empties or a part wears, too steady if you suspect a stuck gauge or rounded readings, two streams mixed if two heads or two reels feed one chart.',
        youGet: 'A chart that watches exactly those patterns; changing them later re-reads every reading. Each extra rule also raises the chance of a false alarm on a steady process.',
      },
      {
        step: 'The signals, in words',
        means: 'Each signal is said with the readings it covers and what it usually means — for example “Eight in a row on one side of the centre (above) — readings 28–35” with “a step change — a new reel, a new operator, a set-point moved” beside it. A point beyond a limit is red; the pattern signals are amber.',
        doThis: 'Read the list under the sentence. A run is said once, from where it began, even if it goes on. Go and look at what changed at the first reading of the signal.',
        youGet: 'The list of signals, a ring round each flagged point in the picture, and the Signals tile — how many, and how many are beyond a limit.',
      },
      {
        step: 'Act on it',
        means: 'A signal tells you when to look, not why. The limits it is read against must come from a steady stretch, so a signal is only as good as the limits behind it.',
        doThis: 'Note what was done at the reading (Adjusted, New reel, Restart), look for the cause at the machine, and — if the chart is attached to a project — press Make it better to raise a fix or a countermeasure with the chart as its evidence.',
        youGet: 'A fix or countermeasure shown in the chart’s Action plan, so the signal does not stay a picture.',
      },
    ],
    watch: 'Do not turn on every rule. The more patterns a chart looks for, the more often it cries wolf on a steady process — and a signal is never proof of cause, only the chart saying “look here”.',
  },
  'FC-091': {
    intro: 'For a drift too small and too slow for any single reading to look wrong — give-away creeping up a gram at a time, seal strength falling as jaws wear — when you want to know since when. It is switched on in the chart’s agreement and drawn on the one-at-a-time chart.',
    steps: [
      {
        step: 'The shift worth catching',
        means: 'How big a move, in the chart’s own unit, would be worth acting on — 0.8 g on a fill weight, say. The CUSUM adds up each reading’s distance from the target, ignoring the part smaller than half that shift, so a small steady drift piles up while ordinary scatter cancels out.',
        doThis: 'Type it in the chart’s agreement (Change what was agreed if the chart exists) as a number above 0, in the unit. Also type a Target if there is one; with none the CUSUM runs against the chart’s centre.',
        youGet: 'A CUSUM picture under the chart — two lines, the high side and the low side, against a decision line H. Left empty, the Since tile reads “CUSUM off — turn it on to say since when”.',
      },
      {
        step: 'Draw the running level',
        means: 'The EWMA is a smoothed line through the readings that gives recent readings more weight, so a slow drift lifts it long before any single point looks wrong. It is a tick in the agreement: “Draw the running level”.',
        doThis: 'Tick it if you want the line; it needs no other input. Its weight (0.2) and width are fixed, not tunable here.',
        youGet: 'A line through the chart, and the Level tile saying “running (EWMA)”. Once the CUSUM has signalled, the Level tile shows the new level the CUSUM estimates instead.',
      },
      {
        step: 'Limits first',
        means: 'The CUSUM’s decision line H is five times the process’s own spread (σ), and σ comes from the chart’s control limits — so the limits have to be set from a steady stretch before the CUSUM means anything.',
        doThis: 'Take the first twenty readings from a normal stretch and press Set the limits, then keep taking readings. The decision line is fixed at 5σ and cannot be changed on the page.',
        youGet: 'A CUSUM measured against a spread that is the process’s own, not a guess. It is not drawn on a short-run chart that is standardised (Z-MR).',
      },
      {
        step: 'Since when',
        means: 'When either sum goes past H the chart signals, then counts back to the last time the sum was at zero to say when the drift began, and estimates the level now. The page says it as “the rise began about reading 28 (CUSUM, signalled at 38); the level now about 400.9 g”.',
        doThis: 'Read the Since and Level tiles and the CUSUM picture, where “since” is marked under the point it began. Go to that reading and ask what changed there. Treat it as an estimate, not proof.',
        youGet: 'A start point, a signal point and the level now, in the chart’s unit. The chart itself says no money; to price a creeping weight as give-away, use the capability study’s money boxes.',
      },
    ],
    watch: 'The CUSUM is built for small, lasting drifts and is slow to react to one big jump — the plain limits on the chart catch that. And “since” is the last time the sum was at zero, an estimate from the readings, not a diagnosis.',
  },
  'FC-092': {
    intro: 'For deciding whether a set-up is good enough to start — the first-off weights after a changeover — with no calculation at the machine. It judges against the specification, not against the process’s own variation.',
    steps: [
      {
        step: 'Pre-control, and both limits',
        means: 'Pre-control splits the tolerance into three zones: green in the middle half, amber in each outer quarter, red outside the limits. Five greens in a row qualify the set-up; after that the readings are read two at a time.',
        doThis: 'When agreeing the chart pick Pre-control (“approving a set-up: five greens, then pairs”), name what is measured and its unit, and type both specification limits — it will not agree with one missing. The nominal is the middle of the two limits.',
        youGet: 'The three zones drawn as bands from your limits, and a chart that counts greens instead of limits.',
      },
      {
        step: 'Set-up: five greens',
        means: 'Take readings one at a time. A green adds one to the count; an amber or a red sends the count back to zero.',
        doThis: 'Measure the first packs after the changeover and tap each reading. Adjust the machine when you get an amber or a red, and keep going until five greens in a row.',
        youGet: 'The Set-up tile (“3 of 5”, then “Qualified” with the reading it happened at) and the verdict Setting up, then Qualified.',
      },
      {
        step: 'Running: pairs of readings',
        means: 'After the set-up qualifies, readings are taken two at a time. Both green, or one green and one amber, carry on. Two ambers on the same side: adjust toward the nominal, then re-qualify with five greens. Two ambers on opposite sides: stop — the spread has grown. Any red: stop, find why, re-qualify.',
        doThis: 'At each check take two readings and tap both; the page pairs them in order. Do not decide from a single reading.',
        youGet: 'Each pair said in words — “both green — carry on”, “both amber on the high side — adjust toward the nominal, then re-qualify”, “a red — stop, find why” — with the Pairs and Red tiles and the verdict Qualified, Adjust or Stop.',
      },
    ],
    watch: 'Pre-control is a set-up rule, not a control chart and not a capability study — the page says so. Its own record in the library says it is comfortable only on a process already known to be capable (Cp of 1.33 or more); on a marginal process it keeps sending you to adjust.',
  },
  'FC-093': {
    intro: 'For a line that makes many products on one machine in a day, each with too few readings for a chart of its own — ten pack sizes on one filler. One chart across all of them, so the machine is watched even while the product keeps changing.',
    steps: [
      {
        step: 'Many products on one chart',
        means: 'In the chart’s agreement, under One reading at a time, there is a tick: “Many products on one chart — each reading says its product and nominal”. With it on, each reading is plotted as its distance from its own product’s nominal, so a 250 g pack and a 500 g pack can sit on one line.',
        doThis: 'Pick One reading at a time, name what is measured and its unit, and tick the box. Each product’s nominal is typed with its readings, not here.',
        youGet: 'A chart in units of “from the nominal”: the centre and the limits are said that way.',
      },
      {
        step: 'Product, and its nominal',
        means: 'With the tick on, the number pad gains two boxes, Product and Its nominal — what that product is supposed to weigh or measure. Every reading carries them, so the chart knows which product it belongs to.',
        doThis: 'Type the product (“Finest Red 2kg”) and its nominal (“250”) once; they stay for the readings that follow until you change them, and the products already used are offered. The ↵ key stays off until both are given. Pasted readings take the product and nominal typed above.',
        youGet: 'Each reading listed with its product and, where the product changes, a faint line across the chart with the new product’s name: a changeover boundary.',
      },
      {
        step: 'Pooled or standardised',
        means: 'If the products spread alike, the deviations are simply pooled (deviation from nominal). If they spread differently — a big pack is naturally more variable — each reading is divided by its own product’s spread instead (Z-MR) and the limits become −3 to +3. The page decides with Levene’s test and says which it used.',
        doThis: 'Nothing to choose: read the end of the band’s sentence — “3 products on one chart — Levene p 0.83: the spreads are alike, so the deviations are pooled”, or “…differ, so each product is standardised (Z-MR)”. A product with fewer than two readings is left out of the comparison.',
        youGet: 'The mode said in words with its evidence. In Z-MR a product’s own spread is used from its 20th reading; before that the pooled spread stands in.',
      },
      {
        step: 'Set the limits, then read the signals',
        means: 'Limits are set from a steady stretch, as on every chart: take the first twenty readings across a normal mix of products and press Set the limits. The moving range is not taken across a changeover, because that would compare two different set-ups.',
        doThis: 'Press Set the limits after twenty readings, then keep taking them. When a signal shows, look at which product each flagged reading is — the list names it — and then at what the products have in common: the filler, the operator, the shift.',
        youGet: 'The same verdict, tiles and signals as the one-at-a-time chart, across every product.',
      },
    ],
    watch: 'The pad will not take a reading without its product and nominal, so type them before the first reading. In Z-MR the CUSUM and the running level are not drawn.',
  },
  'FC-097': {
    intro: 'For anyone about to quote a Ppk. A capability index is only as good as three things it takes for granted: the readings come from one steady process, they spread roughly like a bell, and they were read finely enough to show the spread. The checks are said under the capability sentence.',
    steps: [
      {
        step: 'The readings, in order, from 20',
        means: 'The three checks are said from 20 readings, in the order taken — the order matters for the steady check. Under 20, one line says how many are in so far.',
        doThis: 'Take at least twenty, thirty if you can (the Ppk itself is said from 25), and enter them in the order they were taken. Do not sort them or re-type them.',
        youGet: 'Under the sentences, a block headed Before capability with up to three lines — quiet when a check passes, amber when it does not. A pass-or-fail study has no such block.',
      },
      {
        step: 'Is it bell-shaped?',
        means: 'The capability index assumes the readings follow a normal (bell) curve, so the share outside the limits can be worked out from the curve. The check is D’Agostino–Pearson’s test: a p-value of 0.05 or more is bell-shaped enough. If not, the page says whether the readings lean to one side or have heavier tails than a bell.',
        doThis: 'Read the first line: “Bell-shaped enough (D’Agostino–Pearson p 0.41)”, or “Not bell-shaped — they lean high (skew 1.2, p < 0.001): the share outside is read from the readings, not the bell.”',
        youGet: 'When the readings are not bell-shaped the capability sentence is never green: it says how many were outside as measured, instead of working it out from a curve, and the index is read as rough.',
      },
      {
        step: 'Is it steady?',
        means: 'A steady process stays in one place all through the study. The check draws the individuals chart’s limits on the study’s own readings and looks for a run of eight on one side of the mean; if either shows, the Ppk describes a mixture and may not hold.',
        doThis: 'Read the second line: “Steady across the run”, or “Not steady — readings 14 and 22 are outside 398.1–401.9 and 9 in a row sat above the mean from no. 20”. Then look at what happened at those readings — a hopper running down, a new reel, a changeover.',
        youGet: 'An amber line when it is not steady, and a Next line under the answer offering Chart these readings, to see when the process moved and whether it settled.',
      },
      {
        step: 'Read finely enough?',
        means: 'If the scale steps in whole grams and the spread is two grams, most readings land on a handful of values and the spread is hidden. The check counts the different values read: five or more is fine enough.',
        doThis: 'Read the third line: “Read finely enough — 14 different values”, or “Only 3 different values were read — the scale is too coarse to show the spread; the shape and the index are rough.” If it is too coarse, read the instrument to more places if it offers them.',
        youGet: 'A plain amber warning instead of a confident index built on a scale that cannot see the spread.',
      },
    ],
    watch: 'These checks do not make the Ppk; they say how far to trust it. An amber line is a reason to look at how the readings were taken, not a reason to drop the study. Whether each reading leans on the one before is a separate check (readings taken too close together).',
  },
  'FC-101': {
    intro: 'For reading several capability studies at once instead of one at a time: which products or machines are weak, and whether capability is getting better or worse month by month. It is a table above the Capability study list, and on that list’s paper.',
    steps: [
      {
        step: 'The capability studies behind it',
        means: 'The table adds no readings of its own; it is built from the capability studies you have already made, each with its own verdict. It appears once two studies have something to say — a study with no readings yet is left out.',
        doThis: 'Make a capability study each time you want a new point — a month, a product, a machine — rather than reusing an old one, and name the machine when you start it. A row is labelled by the study’s product when it has one, else the machine you named, else the study’s name.',
        youGet: 'Nothing to fill in here: the table builds itself above the list as the studies accumulate.',
      },
      {
        step: 'A row for each product, a column for each month',
        means: 'Each cell is the figure of the study started in that month — Ppk 1.52 for a measurement, “0.80% rejected” for a reject-rate study, “3 of 20 met” for a rate held, or the readings so far — coloured by that study’s own verdict. If two studies fall in one month the later one shows, marked ×2.',
        doThis: 'Scan the Latest column first, then along a row for the trend. A cell is a link: press it to open that study.',
        youGet: 'A grid in which a weak product stands out by its colour and its word, and a trend you can read across a row.',
      },
      {
        step: 'The sentence over the table, and the paper',
        means: 'One line says how many products and machines and how many months are in the table, and names any whose latest study is not capable. Open the list from a line and the table shows only that line’s studies.',
        doThis: 'Read it before the grid: “3 products and machines over 4 months — Finest Red 2kg is not capable in the latest study”, or “none is failing in the latest study”. For the meeting, press Report ▾ on the list.',
        youGet: 'The paper “Capability study — every one shown”, which puts Capability over time first and then a page for each study.',
      },
    ],
    watch: 'A cell is the latest study of that month, not an average of the month’s studies, and a product with studies in only one month shows no trend yet.',
  },
  'FC-102': {
    intro: 'For putting a reject rate or a count of faults on the same footing as a measured capability, so one page can compare them. It is said under the sentence of a rejects study and of a faults-on-each-item study.',
    steps: [
      {
        step: 'Opportunities an item',
        means: 'The number of different places on one item where a fault could occur and would be counted — a label could be missing, skewed or misprinted, which is already three. A rate “per million” only means something against this count. It is optional, and typed on the faults study.',
        doThis: 'When agreeing a faults study, type Opportunities an item — count only what the inspector really checks, because inflating it flatters the result. Leave it empty and the study is judged on its rate per 100 items as before.',
        youGet: 'Nothing changes until you give it: the per-million line below appears only once it is typed.',
      },
      {
        step: 'Per million',
        means: 'Faults divided by items times opportunities, scaled to a million. Three faults on 100 items of 6 opportunities each is 3 in 600, which is 5,000 per million opportunities.',
        doThis: 'Count the faults by kind on each inspection as usual; the page does the division.',
        youGet: 'A line under the capability sentence: “5,000 per million opportunities (6 an item)”.',
      },
      {
        step: 'Z and the sigma level',
        means: 'The same rate restated as Z — how many standard deviations of a bell curve would leave that share in the tail — so that it can sit beside a measured Ppk (Z divided by 3). The sigma level adds 1.5 by the Six Sigma convention; that shift is an assumption, not something measured, and the page says it is used.',
        doThis: 'Use Z to compare — a reject rate shows as “Z 2.27, about Ppk 0.76 (a comparison only)” — never as a verdict on its own. The rate and its bounds are the plain statement.',
        youGet: 'Z and its equivalent Ppk on a rejects study; Z and the sigma level, with the 1.5-shift convention named, on a faults study that has its opportunities.',
      },
    ],
    watch: 'The 1.5 shift is a convention, not a measurement, and per-million figures with inflated opportunities flatter the result. Quote the plain rate first and the sigma level second.',
  },
  'FC-103': {
    intro: 'For looking at a set of readings before testing them: a mean on its own hides whether the readings are tight or scattered, lopsided or two-humped. The picture and figures appear on a capability study and on Analysis when it is asked “How sure am I of this figure?” about a mean.',
    steps: [
      {
        step: 'The readings',
        means: 'Any column of measured numbers — thirty fill weights, twelve seal temperatures — in the order they were taken. Describing them comes first, before any test.',
        doThis: 'Type or paste them on a capability study, or on Analysis under How sure am I of this figure? with A mean — measured readings. The histogram and the median are drawn from the second reading; an interval on the mean needs eight.',
        youGet: 'A histogram of the readings and the figures under it, drawn as the readings go in.',
      },
      {
        step: 'The histogram',
        means: 'The readings sorted into bars — about as many bars as the square root of the count, on a round width — with the count above each bar. It shows at a glance whether they pile up in the middle like a bell, lean to one side or have two humps. On a capability study the limits and the target are drawn on it, and a bar holding a reading outside the limits is red.',
        doThis: 'Look at the shape before the numbers. Two humps usually mean two streams — two heads, two shifts, two reels; a long tail on one side is a lean.',
        youGet: 'The picture itself, with the count in each bar.',
      },
      {
        step: 'Centre, spread and lean',
        means: 'The mean is the average; the median is the middle reading and is not pulled by a stray one. The spread (s) is how far readings typically sit from the mean. The middle half is the range holding the middle 50% of the readings. Lean is one number: 0 is even, positive leans to high values with a long tail on the right, negative to low.',
        doThis: 'Read the line under the histogram on a capability study — “Median 401.20 g · middle half 400.80–401.60 g · lean 0.14” — or the Mean and Spread tiles and the “Middle half …” line on Analysis. If the mean and the median are far apart, the readings are lopsided.',
        youGet: 'Mean, median, spread, range, middle half and lean, in the unit of the readings.',
      },
      {
        step: 'Readings beyond the fences',
        means: 'A reading far outside the middle half — more than one and a half times the width of the middle half beyond either end — is flagged for a look. It is never removed: that is your decision once you know why it is there.',
        doThis: 'On Analysis read the amber line “Readings: 2 readings beyond the fences (… at reading 14) — look at them; none is removed.” On a capability study the flagged reading is ringed. Ask what happened at that reading — a jam, a mis-key — and strike it only if it was not a real reading.',
        youGet: 'A struck reading stays on the list, left out of the figures, and can be brought back, so nothing is lost by a wrong call.',
      },
    ],
    watch: 'A mean alone is not a description. Look at the picture, the median and the middle half too — and remember that a figure that looks tidy on thirty readings is still only an estimate (see How sure am I of this figure?).',
  },
  'FC-104': {
    intro: 'For a figure worked out from a sample — a mean of thirty packs, a reject rate from one morning’s count, stops in forty hours — when somebody is about to treat it as exact. It puts a margin on the figure and says how sure it is. It is the first question on the Analysis page.',
    steps: [
      {
        step: 'How sure am I of this figure?',
        means: 'A figure from a sample is only an estimate of the truth. This question puts a margin round it: “we can be 95% confident the true mean is between 399.91 and 400.31 g”. It is the first question under Can I trust this number?',
        doThis: 'On Analysis choose New analysis, name what it is of, and tap How sure am I of this figure? Type what is measured (“Fill weight”) and its unit if it has one.',
        youGet: 'A page that asks for the readings or counts and gives the margin as they are typed.',
      },
      {
        step: 'What is it?',
        means: 'Three kinds of figure get three different margins: a mean (measured readings — weights, temperatures), a share (counted, out of what was made — 7 rejected out of 600) and a rate (counted over time — 12 stops in 40 hours).',
        doThis: 'Tap the one that matches how the number was got. For a rate, put the time unit in the unit box (“hours”) so the sentence says per hour.',
        youGet: 'The right boxes: a pad for a mean, and Made and Rejected (or Time counted over and Counted) for the other two.',
      },
      {
        step: 'How sure — the confidence level',
        means: 'How sure the page claims to be when it gives a margin: 90%, 95% or 99%. A higher level gives a wider margin, because it is claiming more.',
        doThis: 'Leave 95% unless the customer or your procedure names another level.',
        youGet: 'Every margin and sentence on the page said at that level.',
      },
      {
        step: 'The readings or the counts',
        means: 'For a mean, the readings in the order taken; an interval needs at least eight. For a share or a rate, one or more runs — what was made and how many were rejected, or the time counted over and what was counted — which add up.',
        doThis: 'Tap the readings on the pad and press ↵, or paste a column. For counted figures type the two numbers and press Add the run. A wrong reading is struck, not deleted.',
        youGet: 'A picture with the margin drawn on it, and the figures listed under Every reading, in the order taken.',
      },
      {
        step: 'The margin in words, and what it does not say',
        means: 'The page gives the figure and its interval, for a mean also the spread and the middle half, and then says what it does not claim. An interval is how sure the mean is from these readings — not a range the packs will fall in.',
        doThis: 'Read the sentence — “7 of 600 — 1.2% reject rate: we can be 95% confident the true figure is between 0.47% and 2.4%” — then the last line, What this does not say. For a count of none, note that none found is not none there.',
        youGet: 'A verdict naming the margin (Sure to ± 0.20 g, or Between 0.47% and 2.4%), tiles, and for a share both the exact interval and Wilson’s beside it.',
      },
    ],
    watch: 'A margin says how sure the figure is, not whether it is acceptable — that is the limit’s to say. And a small sample gives a wide margin: for a mean, eight readings is the least that will give an interval at all.',
  },
  'FC-105': {
    intro: 'For any figure that has to be believed before somebody acts on it — a mean from thirty packs, a reject rate from one morning, a fix that “worked”. Analysis asks one question first, takes the readings, and answers in words with its margin and with what the answer does not say. Several of its questions have a guide of their own.',
    steps: [
      {
        step: 'What do you want to know?',
        means: 'The question comes first because it decides the arithmetic. Twelve are offered under three headings. Can I trust this number? — how sure am I of this figure, how many readings do I need, which shape do the readings follow, is this gauge fit, how much of what we see is the measurement, do inspectors agree. Did it change or differ? — did it really change (before and after), do two ways of measuring agree, do these groups differ, how fast is a new job being learned. How are things linked? — is one thing linked to the other (counts in a table), does one thing move with another.',
        doThis: 'Choose New analysis on the Analysis page, name what it is of, and tap the question that matches the decision you are about to make. Each has a line in the floor’s words (“Did my fix work? — compare before and after”), and the one you tap shows an example. Type what is measured and, if it has one, its unit.',
        youGet: 'The boxes that question needs and no others. It is asked once, before the readings; the answer is worked out as they are typed.',
      },
      {
        step: 'What kind of figure, and which way is better?',
        means: 'Some questions ask one more thing so the arithmetic fits the figures. How sure asks whether it is a mean (measured), a share (counted out of what was made) or a rate (counted over time). Did it really change asks whether the figures were measured or counted, and Which way is better? — lower, higher or no view — which only chooses the words: the page says it never changes the test.',
        doThis: 'Pick what matches how the numbers were got: weights and temperatures are measured, “7 rejected out of 600” is counted. For a fix, say whether lower or higher is better so the verdict can say it moved the right way or the wrong way.',
        youGet: 'The right way to put the figures in, and a verdict that reads Moved the right way or Moved the wrong way instead of just Changed.',
      },
      {
        step: 'How sure — the confidence level',
        means: 'How sure the page claims to be when it gives a margin: 90%, 95% or 99%. A higher level gives a wider margin, because it claims more. A result is called shown when its p-value is below one minus that level — 0.05 at 95%.',
        doThis: 'Leave 95% unless the customer or your procedure names another level.',
        youGet: 'Every interval and every “we can be 95% confident” sentence on the page said at that level.',
      },
      {
        step: 'The readings',
        means: 'The readings or counts that answer the question, in the order taken. What goes in depends on the question: a column of numbers, a run of made and rejected, pairs, groups, a table of counts, or rows of drivers.',
        doThis: 'Tap numbers on the pad and press ↵, or paste a column. For Did it really change?, tap Before or After first — the chip counts what is in each — and put at least 3 on each side; for counted figures type how many were Made and how many Rejected in a run on each side and press Add the run. A wrong reading is struck, not deleted.',
        youGet: 'A picture that comes with the first readings, and Every reading, in the order taken, where a struck reading stays on the list, left out of the figures, and can be restored.',
      },
      {
        step: 'The answer in words',
        means: 'A sentence with the figure, its margin and its p-value, then the tiles, a line of detail and, last, What this does not say. The p-value is how often chance alone would give a result this large; the verdict is Moved the right way, No change shown, Borderline, or the margin itself.',
        doThis: 'Read the verdict on the band, then the sentence — “Before 411.4 g, after 405.5 g: it fell by 5.9 g — we can be 95% confident it fell by between 4.1 and 7.7 g (p < 0.0001)” — and What this does not say before you quote it to anyone.',
        youGet: 'A verdict, a picture with the intervals, a closing line, and — for a change — the reminder that the test says the number moved, not why.',
      },
      {
        step: 'Checks on the readings',
        means: 'Quiet notes on whether the readings can carry the arithmetic: bell-shaped enough (checked from 20 in a group), whether readings in one column lean on the one before (from 30), any reading beyond the fences (looked at, never removed) and groups with too few readings. When the readings are not bell-shaped the page lets a rank test lead — Mann–Whitney, Wilcoxon or Kruskal–Wallis — and says so.',
        doThis: 'Read any amber line before you trust the answer. Where the page changes which test leads, it says which and why.',
        youGet: 'Short lines such as “Readings: not bell-shaped — the rank test leads”, each tied to the readings it is about.',
      },
      {
        step: 'Act on it, or change the question',
        means: 'An answer is a reason to do something: the Action plan lists what has been raised from it. Change what was agreed re-reads every reading against a changed confidence level or names.',
        doThis: 'If the analysis is attached to a project and found something to put right — a move the wrong way, or two ways that differ by more than matters — press Make it better to raise a fix or a countermeasure from it.',
        youGet: 'A fix or countermeasure with the analysis as its evidence, or the same readings answered at the new level.',
      },
    ],
    watch: 'Not finding a change is not the same as finding no change: “No change shown” means these readings cannot tell a change from chance. And whatever moved the number is the fix’s to explain — the test only says that it moved.',
  },
  'FC-106': {
    intro: 'For when two ways of measuring the same thing disagree — the line checkweigher and the QA bench scale on the same packs, or a probe and the lab — and you need to know whether the difference is real and whether it matters.',
    steps: [
      {
        step: 'The two ways',
        means: 'The two methods that measured the same items. “The first way” and “The second way” are just names for the words — Checkweigher 1, Checkweigher 2 — and the sentences say which reads higher.',
        doThis: 'On Analysis tap Do two ways of measuring agree? (under Did it change or differ?), name what is measured with its unit, and type the names of the first and second way.',
        youGet: 'A page that takes pairs, and sentences such as “Checkweigher 2 reads 0.3 g higher than Checkweigher 1”.',
      },
      {
        step: 'Largest difference that does not matter',
        means: 'How far apart the two ways can be before anyone would mind — 0.3 g, say. It is optional, but without it the page can say whether they differ and never whether they agree.',
        doThis: 'Agree the number with whoever uses the figures, before measuring, in the unit.',
        youGet: 'A verdict that can be Agree (green: the difference is no more than that), Differ, or Differ, within what matters — red only when the difference is beyond it.',
      },
      {
        step: 'Pairs, item by item',
        means: 'Measure the same item both ways, one after the other. The page takes the first way’s reading, then the second way’s on the same item; the pair is what is tested.',
        doThis: 'Weigh a pack on the first scale and press ↵, weigh the same pack on the second and press ↵ — or paste two numbers to a line (Or paste pairs). Use different packs, not one pack repeatedly. Six pairs is the least; from 20 the page can also check the differences are bell-shaped.',
        youGet: 'Every pair listed, as “12.1 g → 12.4 g”, and a Pairs tile counting them.',
      },
      {
        step: 'The answer',
        means: 'The mean difference with its interval, from a paired t-test and — beside it — Wilcoxon’s signed-rank test, which does not assume a bell shape. Which one leads depends on whether the differences are bell-shaped.',
        doThis: 'Read the verdict first, then the sentence — “we can be 95% confident the difference is no more than 0.50 g, which is the most that does not matter (mean difference 0.29 g …)” — then the Higher tile, which counts the pairs in which the second way read higher.',
        youGet: 'The verdict, the interval, and What this does not say: that the two differ is not the same as which one is right — that needs a reference of known value.',
      },
    ],
    watch: 'Not finding a difference is not showing the two agree — type the difference that does not matter and the page will judge it. And agreeing on average is not agreeing pack by pack: look at the listed differences.',
  },
  'FC-107': {
    intro: 'For when one filler head, lane, shift or supplier is suspected but nobody has tested it — three or more groups measured the same way — and you want to know whether they really differ and which ones.',
    steps: [
      {
        step: 'What the groups are',
        means: 'The things you are comparing — shifts, heads, lanes, oven zones, suppliers. The word you give (shift, head) is used in the sentences, and Which way is better? only chooses the words; it never changes the test.',
        doThis: 'On Analysis tap Do these groups really differ?, name what is measured with its unit, type one word for the groups (“shift”), and say whether lower or higher is better, or no view.',
        youGet: 'A page that takes readings group by group, and a verdict that can name the worst one.',
      },
      {
        step: 'A group at a time',
        means: 'Each group is a chip with its count; you name a new one and put its readings in.',
        doThis: 'Name the first group and press Add the shift, then type its readings on the pad (↵ after each) or paste a column; then name the next. A group needs at least 3 readings and there must be two such groups to compare. From 20 in a group the page can also check bell shape.',
        youGet: 'A dot for every reading on its group’s line, with the group’s average and its interval. A group with fewer than 3 is listed as Too few and left out until it has more.',
      },
      {
        step: 'Do they differ?',
        means: 'A one-way ANOVA asks whether the groups’ averages differ by more than chance would make them; η² says what share of all the variation is between the groups. Tukey’s test then compares each pair with intervals that hold together across all the pairs, so a long list of pairs does not produce false alarms.',
        doThis: 'Read the verdict — The shifts differ, Nights is the worst, or No difference shown — then the pair sentences: “Nights is above Days by 0.90 g (between 0.64 and 1.16 g)”. Pairs that are not shown to differ are listed too.',
        youGet: 'The tiles Shifts, Readings, Widest gap, p and Between the groups (the η² share), and a sentence for every pair that differs.',
      },
      {
        step: 'Which test leads',
        means: 'If the groups’ spreads differ (Levene’s test) or a group of 20 or more is not bell-shaped, Kruskal–Wallis — a rank test — leads and the ANOVA is shown beside it; Tukey’s intervals are then only indicative.',
        doThis: 'Read the Spreads and Shape lines under Checks on the readings. An amber line is the page saying which test it is leaning on and why.',
        youGet: 'The p-value from the test that leads, named on its tile (one-way ANOVA or Kruskal–Wallis).',
      },
    ],
    watch: 'A group not shown to differ is not shown to be the same. And the test says that groups differ, not why: if they do, the cause is still the next job.',
  },
  'FC-108': {
    intro: 'For when faults seem to come from one lane, jaw or shift but it could be chance — counts in a table, such as seal failures by lane. It asks whether the counts are spread across the table the way chance alone would spread them.',
    steps: [
      {
        step: 'The rows and the columns',
        means: 'A table of counts: what you counted down the side and across the top — fault type by lane, rejects by shift. The words you give for the rows and the columns are used in the sentences.',
        doThis: 'On Analysis tap Is one thing linked to the other?, then type what the rows are (one word: “Lane”), the rows (“Lane 1, Lane 2, Lane 3”), what the columns are (“Fault type”) and the columns (“Underweight, Leaker, Misprint”), separated by commas. Two to eight names each, none repeated.',
        youGet: 'An empty table ready to count into. Names that are too few, too many or repeated are refused in words.',
      },
      {
        step: 'Counting into the table',
        means: 'Pick a row, pick a column, type how many and press Add to the count; each press adds to that cell. Or paste the whole table in one go, a line for each row.',
        doThis: 'Count from the reject bin or the check sheet. To paste, put the counts in the order of the rows and columns; a count that is not a whole number is left out and listed.',
        youGet: 'The table with each cell’s count, what chance alone would give beneath it, and the row and column totals.',
      },
      {
        step: 'Linked or not',
        means: 'χ² (chi-square) measures how far the counts are from what chance would give. Cramér’s V says how strong any link is in words — negligible, small, medium or large. For a 2 × 2 table with a small expected count Fisher’s exact test leads instead.',
        doThis: 'Read the verdict — Linked, No link shown or Counts too small — then the cells marked more or fewer: those further than 2 standard residuals from the chance figure. “Lane 3 has more Leaker than chance would give (16 against 10.6)” says where the link is.',
        youGet: 'The tiles Counted, χ² (or Fisher’s exact), p, Cramér’s V and Sure, and the cells that stand out named in the sentence.',
      },
      {
        step: 'When the counts are too small',
        means: 'The χ² only works if most cells expect at least 5 and none expect less than 1. When that fails the page says Counts too small, shows its p-value as an approximation and says not to trust it.',
        doThis: 'Merge categories that mean the same — two similar fault types — or count more before acting on it.',
        youGet: 'An amber verdict instead of a confident one, with the share of cells that expect fewer than 5.',
      },
    ],
    watch: 'A link is not a cause: the test says the counts are not spread the way chance alone would spread them — not why. One big cell is often carrying the whole result, so read the cells that stand out.',
  },
  'FC-109': {
    intro: 'For when two measures seem to move together and nobody has plotted them — jaw temperature and seal strength, line speed and give-away — and you want to know how closely, and by how much.',
    steps: [
      {
        step: 'The result and its one driver',
        means: 'Two measures you suspect move together. The driver is the one you can change or that changes by itself; the result is what you care about, typed as What is measured. With one driver the page draws a scatter and a straight line through it.',
        doThis: 'On Analysis tap Does one thing move with another — and by how much? (under How are things linked?). Type What is measured — the result, “Seal strength”, with its unit — and one driver with its unit in brackets, “Jaw temperature (°C)”.',
        youGet: 'Two boxes for each pair, one for the driver and one for the result.',
      },
      {
        step: 'The pairs',
        means: 'A pair is one pack or one trial with both numbers recorded together. ↵ moves from the driver box to the result box and, from the last box, adds the pair.',
        doThis: 'Measure both on the same item, type the driver then the result and press Add the pair; or paste rows of two numbers to a line (Or paste rows). Four pairs is the least for a line, and ten or more before it is firm — below that the page calls it a hint.',
        youGet: 'A scatter of the points as they go in, each pair listed as “170 → 4.6 N”, and a line once there are four.',
      },
      {
        step: 'The link and the line',
        means: 'r (Pearson’s correlation) runs from −1 to +1: near either end the points sit close to a straight line, near 0 there is no straight-line link. Spearman’s ρ is the same idea on ranks, which one stray reading cannot bend. The fitted line says how much the result changes for each extra unit of the driver, with an interval, and R² is the share of the variation that goes with the driver.',
        doThis: 'Read the sentence — “Seal strength rises … N for every extra 1 °C of jaw temperature — we can be 95% confident the true change for each is between … and … N” — then the tiles Pairs, Link, Per unit, Explained and Shape.',
        youGet: 'A verdict of Linked, Linked, not straight or No link shown, with r, ρ, the line’s equation and its standard error.',
      },
      {
        step: 'Does a straight line fit?',
        means: 'A line is the wrong shape if the relation bends. The page looks at how the points fall above and below the line; too few stretches means the line is too straight for them. It also warns when r and ρ disagree by more than 0.2 — one or two points, or a curve, are pulling the line.',
        doThis: 'Read Checks on the readings: Shape, Outlier and Residuals. Look at any point flagged as more than three standard errors from the line; none is removed.',
        youGet: 'An amber line saying “the relation bends, so do not trust the line at the ends”, or a quiet one saying there is no sign the line is the wrong shape.',
      },
      {
        step: 'What does the line give at …',
        means: 'A box under the picture: type a value of the driver and the line gives the result there, with two intervals — one for the average at that value and one for a single new reading.',
        doThis: 'Type a value inside the range you measured. Outside it the page gives no interval: beyond the readings the line is a guess. With fewer than 20 pairs it says the answer is rough.',
        youGet: 'A sentence such as “At 180 °C the line gives … N: we can be 95% confident the average there is between … and …, and a single new reading would fall between … and ….”',
      },
    ],
    watch: 'A link is not a cause: the page says the two move together in these readings — not that one makes the other move, and not beyond the range measured.',
  },
  'FC-110': {
    intro: 'For when a result varies and several things might be driving it — give-away against product temperature and line speed, seal strength against temperature and dwell — and you want to know how much each one counts, with the others held still.',
    steps: [
      {
        step: 'The drivers',
        means: 'Up to five things that might drive the result, named by you; the tool never picks them. Each has its unit in brackets so the sentences can use it. With more than one driver the page fits a regression rather than a single line.',
        doThis: 'On Analysis tap Does one thing move with another — and by how much?, type What is measured (the result) and The drivers, separated by commas: “Jaw temperature (°C), Dwell (s)”.',
        youGet: 'A box for each driver and one for the result, in every row you enter.',
      },
      {
        step: 'Rows: five for each driver, and five more',
        means: 'One row is one pack or one trial with every driver and the result recorded together. The more drivers, the more rows the fit needs: 15 for two, 20 for three, 25 for four, 30 for five.',
        doThis: 'Measure every driver and the result on the same item and type them in the boxes (↵ moves along; the last ↵ adds the row), or paste rows with one number to a box. Vary the drivers separately if you can, rather than together.',
        youGet: 'Each row listed as “170, 0.8 → 4.6 N”, and until there are enough a line saying how many are needed for that many drivers.',
      },
      {
        step: 'The effect of each driver',
        means: 'For each driver, how much the result moves per unit of it with the others held still, with an interval; R², the share of the variation the drivers explain together; and a p-value for the whole fit.',
        doThis: 'Read the verdict — Drivers found or No link shown — then the sentence: “Seal strength goes with the drivers — we can be 95% confident they move it together (F …, p …; R² …). Per unit of each, the others held: Jaw temperature +… N (… to …); Dwell +… N (… to …)”. Any driver “not shown to matter once the others are in” is named.',
        youGet: 'The tiles Rows, Explained (with the adjusted share), p, Strongest and Worst VIF, and the intercept with its caution that it may lie far outside the readings.',
      },
      {
        step: 'Drivers that move together',
        means: 'If two drivers rise and fall together in your rows — speed and temperature both high on the same shift — the fit cannot say which is doing the work. The variance inflation factor (VIF) measures it, and the page warns above 10.',
        doThis: 'Read Drivers move together. If it is above 10, keep one driver, or vary them separately in the next trial. Drivers that move exactly together, or one that is the same in every row, are refused with a sentence saying which.',
        youGet: 'A quiet line when the drivers are far enough apart, or an amber one and the verdict Drivers move together.',
      },
    ],
    watch: 'Only straight-line effects, added up: the page does not look for drivers that work together or for curves. A link is not a cause, and the fit is good only inside the range you measured.',
  },
  'FC-113': {
    intro: 'For planning, before anything is measured: studies are too often run with whatever number of readings was convenient. This works out how many readings or counts a question needs, and what they will cost in time and in a person’s pay.',
    steps: [
      {
        step: 'How many readings do I need?',
        means: 'The question is answered from what you expect, not from readings you already have, so it can be asked before a study starts. It sits under Can I trust this number?',
        doThis: 'On Analysis tap How many readings do I need?, name what is measured with its unit, and leave the confidence level at 95% unless your procedure names another.',
        youGet: 'A What to size panel under the band, with a sentence that updates as you fill it.',
      },
      {
        step: 'What to size',
        means: 'Six choices. A mean to ±: know an average to within an amount of the unit, such as a fill weight to ±0.3 g. A difference between two groups: be able to see a change, such as 0.5 g between shifts. A share to ±: pin a reject rate to a few points. Two shares apart: tell 10% from 5%. Zero failures to show: how many to test in a row, none failing, to show a share is good. Cycles to time: how many cycles a time study needs.',
        doThis: 'Tap the one you are planning. For cycles, first type the cycles you have already timed as readings; the page says how many more.',
        youGet: 'Only the boxes that choice needs.',
      },
      {
        step: 'The spread, and what you need to see',
        means: 'For a mean or a difference the biggest unknown is the spread (s) of the readings, so you guess it. The other boxes say what you need: Within ± (the unit), Difference that matters, Share expected (blank means 0.5), Within ± as a share, Before and After shares, or Share allowed to be bad.',
        doThis: 'Guess the spread from a few earlier readings or a similar line — or type eight or more readings on the pad (“Readings to take the spread from”) and the page takes it from them. Type the precision or difference that would change what you do. One batch of — optional — lowers the count when you are sampling from one batch of that size.',
        youGet: 'If something is missing, the sentence says so in words — “A guess of the spread (s) — or at least 8 readings to take it from” — instead of giving a number.',
      },
      {
        step: 'Power',
        means: 'For a difference or two shares: power is the chance of seeing the difference if it is really there. 80% is the usual; 90% needs more.',
        doThis: 'Leave 80% unless missing a real difference would be expensive.',
        youGet: 'A count per group at that power, and a line saying what difference you could see with a quarter, half and all of that count.',
      },
      {
        step: 'Seconds a reading, and the count',
        means: 'How long one reading takes turns the count into minutes. If the line has a labour rate, it also gives the pounds of one person’s time. Both are optional.',
        doThis: 'Type the seconds a reading. Read the sentence — “To know the mean to within ± 0.3 g at 95% confidence, take about 38 readings (spread 0.90 g, a guess)” — and the line below it, which gives the counts by the simpler normal method for comparison.',
        youGet: 'The count the study needs, in the verdict (38 readings, 52 a group), and — with seconds given — “about 35 minutes at 20 seconds a reading”, and the pounds of one person’s time when the line has a labour rate.',
      },
    ],
    watch: 'The count is only as good as the spread guessed: a spread twice as big needs four times the readings. And a share needs far more counted than a mean needs measured — say so before promising a precise rate from one morning’s count.',
  },
  'FC-114': {
    intro: 'For when a tail estimate is needed and the normal curve does not fit — residual oxygen, minutes between short stops, a strength with a hard floor. It tries four shapes on your readings and says which, if any, describes them.',
    steps: [
      {
        step: 'What is measured, and a limit that matters',
        means: 'Name the readings (“Residual oxygen”) and, if a limit decides what is acceptable, type it: A lower limit that matters or An upper limit that matters. Both are optional; with one typed the page says how many would fall beyond it.',
        doThis: 'On Analysis tap Which shape do these readings follow? (under Can I trust this number?), name what is measured with its unit, and type the limit if there is one — an upper limit for oxygen, a lower one for strength.',
        youGet: 'A page that takes readings, and — once a limit is typed — a count beyond it.',
      },
      {
        step: 'The readings, in the order taken',
        means: 'A shape is fitted from 20 readings; 30 or more is better, and 50 tells a lognormal from a Weibull. Before that the answer is a hint, and the page says so.',
        doThis: 'Type or paste them in the order taken. Readings on the floor are often rounded; the page notes when they are too coarse for its goodness test.',
        youGet: 'The answer as soon as there are 20, with a Size note until there are 50.',
      },
      {
        step: 'Which shape fits',
        means: 'The page tries a normal (a bell), a lognormal (a long tail to the high side, like oxygen), a Weibull (times between failures, with wear) and an exponential (no memory). Each is tested against the readings with Anderson–Darling, which rejects it below p 0.05; of those that fit, the one with the lowest AIC — a score that rewards fit and penalises complexity — leads.',
        doThis: 'Read the verdict — Bell-shaped, Follows a Weibull, No shape fits — then the table Every shape tried, which lists each shape’s fit, p, AIC, median, 99.865th point and Ppk.',
        youGet: 'The leading shape named, with its parameters in the floor’s words (“Weibull: shape β … (above 1: gaps that wear out)”), and the shapes that do not fit named too. Two shapes can fit about equally and the page says so.',
      },
      {
        step: 'The tail and the count',
        means: 'The 99.865th point is the value the fitted shape says all but 1.35 in 1,000 readings fall below — its version of three sigma. With a limit typed the page says how many would fall beyond it, and puts what was actually counted beside it with a bound.',
        doThis: 'Prefer the count as measured to the model’s tail unless you have 50 or more readings: from 30 the far tail is a model’s reach, not a measurement. Read “as counted, 3 of 40 are over 2 % (we can be 95% confident the true share is fewer than 19 in 100)”.',
        youGet: 'The tiles Readings, Shape, Fit, 99.865th point and Beyond the limit, and — with a limit — a percentile Ppk beside the bell’s Ppk.',
      },
      {
        step: 'The probability plot',
        means: 'A picture of each reading against where the leading shape expects it. Points along the straight line fit; a curve away from the line says the shape does not.',
        doThis: 'Look at the ends of the plot, where the tail lives, before you trust the shape for a tail estimate.',
        youGet: 'The plot, headed “Expected under the …” with the shape’s name, beside the table of every shape tried.',
      },
    ],
    watch: 'Steady first: a shape fitted to readings that drifted or mixed fits nothing honestly, and the page says “Not steady — look at the order first”. A shape is the nearest of four, not the process’s law.',
  },
  'FC-115': {
    intro: 'For catching a capability or an interval that looks better than it is because the readings were taken too close together. Consecutive packs from one filler head tend to be alike; when each reading leans on the one before, the same information is counted twice.',
    steps: [
      {
        step: 'Readings in the order taken, 30 or more',
        means: 'Independence can only be judged from readings kept in the order they were taken, and from 30 of them. Under 30 the page says it is too few to judge.',
        doThis: 'Type or paste the readings in the order taken, on a capability study or on Analysis (How sure am I of this figure?, a gauge study or a shape study). Do not sort them. The control chart does not make this check.',
        youGet: 'On Analysis, asked How sure am I of this figure? about a mean, an Order tile that reads Independent, Linked or Too few to judge; for a gauge study or a shape study, a line under Checks on the readings.',
      },
      {
        step: 'The Order check',
        means: 'The page works out how much each reading depends on the one before it (r₁, the lag-1 autocorrelation) and compares it with a band of plus or minus 2 divided by the square root of the count. Inside the band the readings are independent enough.',
        doThis: 'Read the Order tile and its line. Independent: “each reading is independent enough of the last (r₁ 0.12, inside ±0.32)”. Linked: “Readings in order lean on the one before (r₁ 0.76, outside ±0.32) — limits and intervals drawn from them are too tight by about 51%”.',
        youGet: 'On a capability study, the same warning as an amber note under its sentences, with how much too tight the limits and intervals are.',
      },
      {
        step: 'How far apart to sample',
        means: 'The page tries every 2nd, 3rd, 4th reading of what you have and says the smallest spacing at which the thinned readings fall inside their own band, keeping at least ten.',
        doThis: 'Next time, take readings at that spacing — every 3rd pack, say — and repeat the study. If no spacing within this set clears it, the page says to take readings further apart.',
        youGet: 'A sentence such as “sample every 3rd (thinned, r₁ 0.32 is inside ±0.53)”, and readings that count for what they are worth.',
      },
    ],
    watch: 'A step or a drift in the readings also reads as dependence, so check that the process was steady first (Before capability). Linked on readings that moved is the steady check’s finding before it is this one’s.',
  },
  'FC-116': {
    intro: 'For a pack made of several deposits — a ready meal of rice, sauce, vegetables and garnish — whose finished weight varies more than expected. The deposits are typed on a capability study, which works out the pack’s spread from them, where its target should sit and which deposit is worth tightening.',
    steps: [
      {
        step: 'Several deposits in one pack',
        means: 'An optional box on a capability study agreed as sold by weight, or as a measurement with a lower limit: one line for each deposit — its name, its mean and its spread (standard deviation). The pack is the sum of its deposits.',
        doThis: 'Weigh each deposit on its own, 20 to 30 readings, and type a line for each: “Rice, 120, 3.0”. Two to twelve lines, each with a mean and a spread above 0, none with the same name.',
        youGet: 'The note appears as soon as the deposits are agreed, before any pack is weighed. A line that is not a name and two numbers, a single deposit, more than twelve or a repeated name is refused in words and Agree these is held.',
      },
      {
        step: 'The pack’s mean and spread',
        means: 'The pack’s mean is the sum of the deposits’ means. Its spread is not the sum of their spreads: independent spreads add as squares, so the pack varies far less than the worst case, and the biggest deposit dominates.',
        doThis: 'Nothing to take: read the first sentence of the note under the study’s sentences.',
        youGet: '“4 deposits make 300.0 g: the pack’s spread is 4.64 g — the deposits’ spreads add as squares, not as a sum (the worst case, every deposit at its 3σ at once, 27.0 g, almost never happens).”',
      },
      {
        step: 'The target it needs',
        means: 'At that spread, where must the pack’s average sit? On a sold-by-weight study it is the lowest target that keeps the three packers’ rules — the average, the 1-in-40 and the none-below-twice rules — and the note says which one binds. On a measurement with a lower limit it is the floor plus 3.09 times the spread, which keeps 999 packs in 1,000 over it; that 1 in 1,000 is a Faultline choice, not a law.',
        doThis: 'Compare the deposits’ average with the target. Amber means they average short of it: raise a deposit or tighten them.',
        youGet: 'The target in the study’s unit, which rule binds, and by how much the deposits’ average sits above or below it.',
      },
      {
        step: 'Where to tighten',
        means: 'Each deposit’s share of the pack’s spread, and what halving the biggest deposit’s spread would buy: grams a pack saved and, with packs a shift and £ a kilo given, kilos and pounds a shift because of the give-away. On a sold-by-weight pack the average rule often binds, and then a tighter spread buys nothing legal — the note says so.',
        doThis: 'Give Packs a shift, Shifts a week and £ a kilo in the study’s money boxes if you want it in pounds; each is optional and the note names whichever is missing. Money is worked only for a weight in g or kg.',
        youGet: '“Rice holds 42% of the spread; halving its spread brings the pack’s to 3.84 g … — about … kg and £… a shift because of the give-away.”',
      },
      {
        step: 'The pack’s own readings have the last word',
        means: 'From 25 pack readings the note puts the pack’s measured spread beside the one worked out from the deposits. Wider means the deposits may move together or something else adds; tighter means the deposits’ spreads may be overstated.',
        doThis: 'Weigh finished packs as the study normally takes them, and read the last sentence of the note.',
        youGet: 'A sentence saying the packs spread about what the deposits give, wider than they give, or tighter — and that the pack’s own spread is the final word.',
      },
    ],
    watch: 'The figures assume the deposits are independent — one deposit’s over-fill not causing another’s. They are typed in, not read from each deposit’s own study, so they are only as good as the weighings behind them.',
  },
  'FC-119': {
    intro: 'For checking that a scale or checkweigher is fit for the tolerance it judges before you trust it — one reference of known value, one operator, one day, weighed again and again. It is the first gauge question on Analysis.',
    steps: [
      {
        step: 'Is this gauge fit, and how is it checked?',
        means: 'The question asks whether the gauge reads a reference of known value correctly (bias), reads it the same way every time (repeatability), and whether that is good enough for the tolerance it is used to judge. The first way of checking is One reference, read again and again — a 500 g test weight weighed 25 to 50 times: the Type 1 study.',
        doThis: 'On Analysis tap Is this gauge fit for what it judges? (under Can I trust this number?), name the gauge (“Bench scale”), set the unit, and pick One reference, read again and again.',
        youGet: 'Boxes for the reference and for what the gauge judges.',
      },
      {
        step: 'The reference’s true value',
        means: 'The number on the test weight’s calibration certificate. Bias is measured against it, so it is required.',
        doThis: 'Type the certificate value in the unit — 500 for a 500 g weight. Use a reference in the middle of the range the gauge works in.',
        youGet: 'Without it the page asks for it in words (“the number on its certificate”) and works nothing out.',
      },
      {
        step: 'What it judges — the limits',
        means: 'The tolerance of whatever the gauge is used to judge: a checkweigher that rejects below 495 g and above 505 g judges a 10 g tolerance. With only one limit, type the Target it is measured from and the tolerance is twice the distance.',
        doThis: 'Type the lower and upper limit the gauge works to on the line. Fold open “The slice, the Cg wanted and the money” only if your customer or procedure names other values than the defaults.',
        youGet: 'A tolerance for the arithmetic. Without one the page says what is missing instead of guessing it.',
      },
      {
        step: 'Read the reference again and again',
        means: 'Weigh the same reference over and over as the operator normally would and type each reading in order. A study is worked out from 10 readings, and called firm from 25; 25 to 50 is usual.',
        doThis: 'Weigh, record, and where that is how the gauge is used take the weight off and place it again each time, so every reading is a fresh measurement. Tap each on the pad or paste the column. A wrong reading is struck, not deleted.',
        youGet: 'A picture of every reading’s distance from the reference, with the gauge’s spread beside the share of the tolerance it may use.',
      },
      {
        step: 'Fit, biased or not fit',
        means: 'Cg is the gauge’s repeatability against the tolerance: 20% of the tolerance divided by six times the spread of the readings (6s). Cgk also counts the bias: 10% of the tolerance less the bias, divided by 3s. Both are wanted at 1.33 or more. The 20% and the 1.33 are the automotive practice’s defaults, changeable where it was agreed.',
        doThis: 'Read the verdict — Fit, Biased — correct it, Not fit, or Nothing to test — then the tiles Readings, Bias, Cg, Cgk, Uses of tolerance and In money. The Least count line says whether the gauge steps finely enough: under 5% of the tolerance.',
        youGet: 'A sentence such as “repeats well (Cg …) but reads … g high: correct the bias before it judges anything”, or “Repair or replace it before any study that depends on it”.',
      },
      {
        step: 'In money',
        means: 'A weight gauge that reads low makes the packs set by it heavier than they read — that is give-away. One that reads high makes them lighter — short weight, which is not a saving and is never priced.',
        doThis: 'Open the folded box and give Packs a shift, Shifts a week and £ a kilo. Each is optional, and the page names whichever is missing.',
        youGet: 'Kilos and pounds a shift and a week “because of the bias” for a low reader; for a high reader, the words “short weight — not priced”.',
      },
    ],
    watch: 'One reference, one operator, one day: this says how the gauge behaves on this reference — not who uses it (that is a gauge R&R), not its whole range, and not that the reference itself is right.',
  },
  'FC-120': {
    intro: 'For a scale or probe that reads right at one weight and wrong at another, or that drifts over a week. Two ways of checking sit under Is this gauge fit for what it judges?: references across its range (bias and linearity), and one reference checked day after day (stability).',
    steps: [
      {
        step: 'How is it checked?',
        means: 'References across its range uses several references of different sizes — a probe at 0, 20, 40, 60 and 80 °C, ten readings each. One reference, checked day after day uses the same reference on a schedule — the daily check weight.',
        doThis: 'On Analysis tap Is this gauge fit for what it judges?, name the gauge, set the unit, and pick the way. For the range, type the limits it judges if you have them; for day after day, type the reference’s true value if you want the bias said.',
        youGet: 'The boxes for that way and nothing else.',
      },
      {
        step: 'References across the range',
        means: 'Bias is how far the average of repeated readings sits from the true value. A scale can have no bias at 100 g and a large one at 1,000 g, so the study reads several references.',
        doThis: 'Type the first reference’s value and press Add the reference, then type its readings on the pad or paste them — 5 at least, 10 usual. Add the next reference, until you have four or more (five is usual).',
        youGet: 'A chip for each reference with its count, and a table, Each reference — its bias and whether it is real: reference, readings, mean, bias, t, p and Real?.',
      },
      {
        step: 'Does the bias change with size?',
        means: 'A line is fitted to each reference’s average bias. If the slope is real the bias grows or shrinks with size and one offset will not fix it; if there is bias but no slope, one offset fixes it.',
        doThis: 'Read the verdict — Reads true, Bias shown, no line yet, The bias changes with size, or One offset fixes it — and the tile Changes with size.',
        youGet: 'The scatter of bias against reference with the fitted line and its band, the largest bias as a share of the tolerance, and the slope with its interval.',
      },
      {
        step: 'The limit that matters',
        means: 'The value a decision hangs on — a CCP’s critical limit, a legal minimum. The line of bias is read there, to say what a reading of that value really means.',
        doThis: 'Type it in the optional box, inside the references you measured; outside them the page says to add a reference at the limit.',
        youGet: '“At 75 °C, the limit that matters, the line gives +0.13 °C: a reading of 75 means product at 74.8695 °C.” The page does not move the limit; guarding it is the team’s.',
      },
      {
        step: 'One reference, checked day after day',
        means: 'The first checks set the limits for what normal looks like — the average plus and minus 2.66 times the average moving range, an individuals chart; later checks are held against them with the four Western Electric tests.',
        doThis: 'Type or paste each day’s reading in the order taken. Eight checks are the least to draw limits and 20 usual; “Limits from the first … checks” lets you use fewer if you know only the early ones were good.',
        youGet: 'A chart with the limits drawn from the first checks, and the tiles Checks, Limits, Centre, Signals from and Trend.',
      },
      {
        step: 'Reading a drift',
        means: 'A signal means the readings of the reference moved, not why — the gauge, the reference, the room or the person. The trend is Sen’s slope and Kendall’s τ over all the checks.',
        doThis: 'Read the verdict — Steady, or Drifted from check 30 — and the sentence. Product measured since the check before the first signal is worth reviewing. A Baseline line warns if the first checks themselves signalled, so the limits are too wide.',
        youGet: '“Check weight drifted up … From check 30 it signals — 9 checks are beyond the upper limit. Product measured since check 29 is worth reviewing.”',
      },
    ],
    watch: 'This page says what a reading means; it does not move a limit, and it does not hold or release product. Calibration due dates and routine checks are on the line’s Calibration checks log, not here.',
  },
  'FC-121': {
    intro: 'For when QA and the line disagree about what a bad seal or a bad bake looks like — a judgement made by eye, pass or reject. The study asks whether each inspector agrees with themselves, with each other and with the expert reference.',
    steps: [
      {
        step: 'The pieces',
        means: 'The packs the inspectors will judge, each known to them only by a code. Use at least ten — 30 to 50 is usual — chosen to span the borderline: some clearly good, some clearly bad, and plenty of hard calls.',
        doThis: 'On Analysis tap Do inspectors agree with themselves and the standard? (under Can I trust this number?), name what is being judged (“Seal wrinkle check”) and type the codes separated by commas: “P01, P02, P03 …”.',
        youGet: 'A grid of pieces. Fewer than ten is refused in words.',
      },
      {
        step: 'The inspectors, and looks each',
        means: 'The people who judge — two or three — and how many times each looks at every piece (2 or 3). Each look is blind and in a fresh random order.',
        doThis: 'Type the inspectors’ initials and pick the looks. The app does not shuffle the pieces for you: run the study blind, in a new random order for each look, on the floor.',
        youGet: 'The size of the job: pieces × inspectors × looks.',
      },
      {
        step: 'Reference first',
        means: 'An expert, or a measurement, decides pass or reject for every piece before anyone else judges. The Judgments tab stays locked until every piece has its reference.',
        doThis: 'On the Reference tab pick a piece and press Pass or Reject for the expert’s verdict; each piece gets a ✓ and the tab counts them.',
        youGet: 'The truth each inspector is judged against.',
      },
      {
        step: 'Judgments',
        means: 'Each inspector’s pass or reject on each piece on each look. The page says which cell is next — “Piece P01, inspector A, look 2 of 2”.',
        doThis: 'Switch to Judgments, pick the piece and the inspector and press Pass or Reject; or paste lines of piece, inspector, look and pass or reject, one to a line. Lines it cannot read are listed.',
        youGet: 'A count — Judgments 24 of 60 — and the answer once the grid is full.',
      },
      {
        step: 'Fleiss κ and each inspector’s κ',
        means: 'Kappa measures agreement beyond chance: two inspectors who both pass 90% of packs would agree 82% of the time by luck alone. Fleiss’ κ is for everyone together; each inspector also gets a Cohen’s κ against the reference. 0.75 or more is good, 0.4 to 0.75 marginal, under 0.4 poor — a common guide, not a standard.',
        doThis: 'Read the verdict — Good, Marginal or Poor agreement — and the sentence that lists each inspector: “C: κ 0.47 vs reference (100% with self) — misses 25% of rejects, false alarms 25% of good”. Then the pieces to review.',
        youGet: 'The tiles Fleiss κ, All agree, All right, Lowest κ and To review; a table, Each inspector, with Self, Both right, κ vs ref, Misses and False alarms; and the pieces they disagree on.',
      },
      {
        step: 'False alarms in money',
        means: 'A good pack wrongly rejected is wasted materials. The money here is false alarms only; a missed reject has its own cost that is not priced.',
        doThis: 'Open False alarms in money — optional, and give Materials a pack and Packs a shift.',
        youGet: '“In money: about 2000 good packs a shift wrongly rejected — £240 a shift in materials at £0.12 a pack.” Without Packs a shift the page asks for it; without Materials a pack there is no money line.',
      },
    ],
    watch: 'A poor κ for one inspector is usually a standard that is not clear, not a careless person: the page says to retrain on the limit samples and repeat. Blind, random order is the floor’s job — the app does not enforce it.',
  },
  'FC-122': {
    intro: 'For making sure probes, scales and checkweighers are checked against a reference on a schedule — and that when one fails, everything it judged since its last good check is in doubt until it is reviewed. It is a check log on a line.',
    steps: [
      {
        step: 'New calibration check log',
        means: 'A list of gauges, each a check on an interval against a reference: a 500 g weight on the bench scale every week, the ice point on the cook probe every day. A log always belongs to a line.',
        doThis: 'From the check logs, choose Calibration checks and press New calibration check log. Pick the line, optionally name the Gauge it is filled in for, and tick the starter checks you want. The starter list is a starting point to edit, not the standard.',
        youGet: 'A log with a card for each check, on the Round tab, ready to do.',
      },
      {
        step: 'The checks as agreed',
        means: 'What each check is, how often, who does it and what passes. A reading is judged against a band around the reference: a 500 g weight allowed ±0.3 g is lowest 499.7, highest 500.3. With no limits the reading is recorded and trended but not judged.',
        doThis: 'Open The checks tab and Edit each check: How often, Who does it, Lowest allowed and Highest allowed from the reference and the allowed error on its certificate, the Unit, What to do if it fails, the priority of the problem a failure raises, and whether a failure holds the product made since the last good check.',
        youGet: 'Each check showing “Limits: at least 499.7 g, at most 500.3 g” and how it is judged. The tab also says what the list rests on and what is still to confirm against your own plan.',
      },
      {
        step: 'The round',
        means: 'The Round tab shows what is due now, what is done and what is done when something happens. Each card says when the check is due in words and colour: Due soon, Due now, Overdue, Done or Failed.',
        doThis: 'Weigh or read the reference on the gauge, type the reading into its card and press Record. The card tells you before you record if it will fail — “Above the upper limit 500.3 g — this will be a failure”.',
        youGet: 'A result stamped with who and when, kept, with Undo.',
      },
      {
        step: 'A failure, before it is recorded',
        means: 'A reading outside the band asks for one thing: what happened, and the packs made since the last good check if you counted them. It says what it holds before you record it, because everything the gauge judged since its last good check is in doubt.',
        doThis: 'Read what it holds, add a note, then press Record the failure. Follow What to do: tag the gauge out of use, review what it judged since the last good check against the product limit, service or replace it, and check it again before use.',
        youGet: 'A problem on the register at the check’s priority, the packs held, and the log marked failed until the gauge is checked again. A second failure on the re-check adds a step to the first problem instead of a second one.',
      },
      {
        step: 'History and the verdict',
        means: 'The History tab shows each check’s record: due, done on time, missed and the longest gap; readings against their limits; the failures and what each held; and every result, any of which can be struck and put back.',
        doThis: 'Read the verdict on the band first — checks failed, overdue or due — then the tiles Done on time, Missed, Failed and Product held. Missed checks are the first thing to chase.',
        youGet: 'A page that says what is due, what is overdue and what failed, and the paper for the file.',
      },
    ],
    watch: 'The log records checks and states the team’s rules; it never decides a release — whether product is held, reworked or released is the site’s call. The reference’s certificate is not stored here.',
  },
  'FC-123': {
    intro: 'For saying how sure a single reading is — the ± on a weight or a temperature — when it sits near a limit and nobody knows how much to trust it. It combines the gauge’s resolution, its repeatability and its calibration certificate into one figure.',
    steps: [
      {
        step: 'Gauge and unit',
        means: 'The gauge’s name only words the sentence (“Bench scale”, “Cook probe”). The unit is used on every source, so all the figures must be in the same one: g, °C, mm.',
        doThis: 'From the calculators, in the Measurement systems group, open Measurement uncertainty budget and press New. Type the gauge and its unit.',
        youGet: 'A calculation that works out as you type, with the answer beside the figures.',
      },
      {
        step: 'Resolution, the smallest step',
        means: 'What the display steps by — 0.01 g on many scales. A display cannot show a difference smaller than its step, so even a perfect scale has some uncertainty from it, taken as a flat spread over one step.',
        doThis: 'Read it off the display or the manual: the value of the last digit.',
        youGet: 'One of three sources in the budget, shown with its share.',
      },
      {
        step: 'Repeatability s, and readings averaged',
        means: 'How much repeated readings of the same thing scatter — the standard deviation s from a Type 1 study or from daily checks on one reference. Readings averaged is 1 for a single reading; 10 if the result you quote is the mean of ten, which shrinks this source by the square root of 10.',
        doThis: 'Take s from your gauge study or your daily check-weight readings. Leave Readings averaged at 1 unless you really average; the page marks the default as a choice, not a measurement.',
        youGet: 'The second source in the budget. Averaging brings the ± down, and the page shows what a single reading would have been.',
      },
      {
        step: 'Certificate expanded U, and k',
        means: 'The calibration certificate says how sure the calibration was: an expanded uncertainty U at a coverage factor k, usually 2, about 95%. The page divides U by k to get the standard part.',
        doThis: 'Copy U from the certificate, in the same unit, and its k. If the certificate does not say, 2 is assumed and the page marks that as a choice.',
        youGet: 'The third source, and a combined uncertainty from all three.',
      },
      {
        step: 'Lower limit to meet, and Tolerance',
        means: 'Two optional boxes. A lower limit — the legal minimum weight or a CCP floor — gives a guard band: the reading must be at least the limit plus U to be sure. A two-sided tolerance gives the test uncertainty ratio, tolerance divided by 2U; 4 or more is the usual rule.',
        doThis: 'Type either or both if they apply. State expanded U at k stays at 2, about 95%, which is the usual; the page marks it as a choice.',
        youGet: '“To be sure a pack is above 400 g, the reading must be at least 400.17 g (limit plus U)”, and a TUR with “fit by the usual rule of 4 or more”, or a warning that the guard band eats much of the tolerance.',
      },
      {
        step: 'The answer: the ±, and what dominates',
        means: 'The sentence gives the ± and the biggest source: “Bench scale reads to ±0.17 g (k = 2) on a single reading — 91% of that is repeatability”. The tiles show the expanded uncertainty, the combined uncertainty, the dominant source, the guard and the TUR; How it is worked out lists each source.',
        doThis: 'Improve the biggest source first if the ± must shrink: the closing line names it. Read Check these and What this does not say before you quote the figure.',
        youGet: 'A figure you can state with its ±, and the reason it is that size.',
      },
      {
        step: 'What if…, and Save as before',
        means: 'What if… moves one figure and shows the answer now beside the answer if, so you can see what a better scale or more readings would buy; nothing is saved until you press Make it so. Save as before keeps the figures so that later tiles say what moved.',
        doThis: 'Pick a figure under What if…, type the new value and read the change. Press Make it so to adopt it, or Clear. Press Save as before before you change something real.',
        youGet: 'A before-and-after of the ±, tile by tile.',
      },
      {
        step: 'In money — all optional',
        means: 'The guard band on every pack checked to the limit is product given away. Give a lower limit in grams and the cost a kilo and the page prices it a pack.',
        doThis: 'Open In money and give the cost a kilo. Leave it blank and the answer is still given, with a line saying what to add.',
        youGet: '“The guard band of 0.17 g on every pack checked to the limit is give-away — about £… a pack at £… a kilo.” Other units than grams are not priced.',
      },
    ],
    watch: 'Sources you leave out make the ± too small: list only what you have evidence for, and remember that temperature, the operator and drift since calibration are not in this sum. The guard band is a decision rule; the team still applies the product limit and the HACCP plan.',
  },
};
