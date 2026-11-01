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
};
