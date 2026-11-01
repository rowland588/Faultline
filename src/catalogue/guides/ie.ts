/* GUIDES — industrial engineering and work measurement (the discipline's tools; src/catalogue/guide.ts).
 * Written from each tool's real page. Several are parts of the Line balance (its Times, Person and machine and Improve
 * tabs): each guide says the steps of its own part, in that part's labels. Every figure is a person's — timed, rated,
 * counted or typed — and a missing input for the money is named on the page, never invented. */
import type { Guide } from '../guide';

export const IE_GUIDES: Record<string, Guide> = {
  'FC-019': {
    intro: 'For finding how long a job should take at a standard pace, with rest built in, so staffing, balancing and costing stand on a measured time and not an argument. It is the line balance’s timing: each person’s work split into steps, timed lap by lap, rated and allowed.',
    steps: [
      {
        step: 'The people and their steps',
        means: 'The job is split into steps, each with a clear start and end you can see or hear — the seal closes, the tray drops. Timing a vague step gives a vague time, so name each one by what ends it.',
        doThis: 'On the product’s Line balance press Start the line balance; the people on the line standard’s map come across. Add what each does in order (“Another step — e.g. Check the seal”), or press Add a person with what they do and where they work.',
        youGet: 'A block for each person with their steps in order, and the work stacked against takt once there are times.',
      },
      {
        step: 'Time them',
        means: 'You stand at the line with the phone, and every tap is a lap: the time since the last tap. Several cycles of the same steps are timed, because one cycle tells you little.',
        doThis: 'Press Time Op 1. Press Start — as the first step begins, then Lap as each step ends; the next is marked Now and the cycle runs on. Foreign — leave this out is for an interruption, Skip this step for a step not done this cycle, Undo the last lap for a slip. Stop timing when you have enough.',
        youGet: 'Laps on each step. A lap is never struck by the app: one far from the rest is flagged “far from the rest” for you to keep or strike.',
      },
      {
        step: 'How was the pace?',
        means: 'Rating is your judgement of how fast the person worked compared with a standard pace. 100 is the standard pace (BS 3138): what a qualified worker keeps up steadily, with the effort and care the job asks, with no rest. 110 is quicker, 90 slower.',
        doThis: 'When timing stops the page asks; tap 75, 90, 100, 110 or 125 for each step you just timed. Rate only on the scale you were trained on. Leave a step and it is taken at 100 and says “not rated”. A machine’s run is never rated.',
        youGet: 'A pace on each step, or an honest “not rated — taken at 100”.',
      },
      {
        step: 'Times: observed, basic, standard',
        means: 'Observed is the mean of the laps. Basic is observed × the pace ÷ 100 — the time at standard pace. Standard is the basic time plus the allowance for rest, and is the time to plan on.',
        doThis: 'Open the Times tab. For each step read Cycles, Observed, Pace, Basic and Standard. Change a pace there if you judge it differently; the chips offer 90, 100, 110 and 120.',
        youGet: 'A table by person and step, and under it the task: “Op 1’s task: standard 31.6 s — 114 an hour planned”.',
      },
      {
        step: 'Are there enough cycles?',
        means: 'The time of a step is only as sure as the number of cycles behind it. The page works out how many cycles bring the mean to within ±5% at 95% sure, never fewer than five, and says it as “4 of 15 cycles”.',
        doThis: 'Look at the Cycles and ± at 95% columns. A step in amber is short: go back and time more cycles, the same way. A step with one lap says “one lap”.',
        youGet: '“enough” on a step that has the cycles it needs, or how many are still wanted.',
      },
      {
        step: 'Set it as the standard',
        means: 'Once every step has a time and the takt is agreed, the balance can be set as the standard: the line standard’s map and its card then read these times.',
        doThis: 'On the Against takt tab press Set as the standard (the project’s owner agrees it). To change it, Reopen to time again.',
        youGet: 'A receipt saying the day it was set and what the balance said then, and a standard time each person’s work is held to.',
      },
    ],
    watch: 'Rating is a judgement. An untrained rating makes the standard arbitrary, and the page gives no scale of descriptions — rate only on the scale you were trained on. Time a normal person working normally, not your quickest, and not fewer cycles than the page asks for.',
  },
  'FC-020': {
    intro: 'For ending the argument about whether a task was timed enough. Type the cycles you have already timed and the page says how sure the mean is now, and how many more cycles you need to be sure to the precision you want.',
    steps: [
      {
        step: 'How many readings do I need?',
        means: 'One of the Analysis tool’s questions, asked before you time any more. It sizes a study rather than judging one: how many readings are enough for the precision you want.',
        doThis: 'Open Analysis, start a new one and pick How many readings do I need? under Can I trust this number?. The project’s owner agrees what is asked, once, before the readings.',
        youGet: 'A study that works its answer out as the cycles are typed in.',
      },
      {
        step: 'Cycles to time',
        means: 'Of the things it can size, this one is for a timed step: how many cycles of it to time. The others size a mean, a difference, a share or zero failures.',
        doThis: 'Under What to size choose Cycles to time. Name what is timed in What is measured (“Seal and place”), type s as the unit, and pick how sure: 90, 95 or 99%.',
        youGet: 'The question set for cycles, with the right boxes.',
      },
      {
        step: 'Within ± (share of the mean)',
        means: 'The precision you want, as a share of the average time. 0.05 means the mean to within ±5% — the usual ask for a time study.',
        doThis: 'Type 0.05 for ±5%, or a different share if the standard has to be tighter or can be looser. Agree it before you look at the timings.',
        youGet: 'The target the cycles are judged against.',
      },
      {
        step: 'The timed cycles',
        means: 'The times of the cycles you have already timed, in seconds. At least two are needed to see how much they vary, and it is the spread of the cycles that decides how many more you need.',
        doThis: 'Copy each lap of one step from the stopwatch (or from the Line balance’s Laps) and tap it into the pad, or paste the column. They are typed in, not read from the time study. Time the same step the same way each time.',
        youGet: 'A list of cycles in the order taken, each of which can be struck if it was a slip.',
      },
      {
        step: 'Enough yet?',
        means: 'The page sizes the study with Student’s t, which is honest about how little a few cycles tell you, and shows what the plain normal curve would say beside it. The margin now is how far the mean may be from the truth.',
        doThis: 'Read the sentence, which for example says “5 cycles timed — the mean is sure to ± 8.2% at 95%. To be sure to ± 5% time 14 in all: 9 more.” Then the tiles Timed, Needed, Still to time and Margin now.',
        youGet: 'The number of cycles still to time, or “you have enough”, and the margin in seconds and as a share.',
      },
    ],
    watch: 'More cycles shrink the margin only if each is timed the same way, at normal pace, on the same step. Cycles of a different step, or of someone hurrying, make the answer worse, not better.',
  },
  'FC-022': {
    intro: 'For finding out where people’s time really goes without following anyone with a stopwatch all day. The phone asks at random moments of the shift, you tap what each person is doing at that instant, and the shares come with the margin they carry.',
    steps: [
      {
        step: 'Who is watched',
        means: 'The people, or the roles, whose time you are sampling — the line standard’s people if the study is on a product, or anyone you add. Each is tapped separately at every moment.',
        doThis: 'In Who, what and when, tap the people offered and add anyone else (“Team leader”). At least one is needed. The project’s owner agrees this before the first tap.',
        youGet: 'The list of people each moment will ask about.',
      },
      {
        step: 'What a tap can be',
        means: 'The activities a person can be doing at the instant you look. The first one is the work itself: the shares of everything else are read against it.',
        doThis: 'Keep the usual list — working, walking, waiting, searching, away — or write your own, separated by commas, with the work first. At least two.',
        youGet: 'One button for each activity at every moment.',
      },
      {
        step: 'The shift and the moments',
        means: 'The moments are drawn at random inside the shift, once, and kept, so every phone asks at the same instants. Random is the point: it stops you sampling when things are quiet or when you happen to look.',
        doThis: 'Check the shift (it starts on the line’s own shift, and says which), the Moments in the shift (40 to start, 5 to 400), and the margin wanted in points (±5 to start). Type a work share wanted only if a target exists. Press Start sampling.',
        youGet: 'A study with its moments fixed and the next one named in the tiles.',
      },
      {
        step: 'Answer each moment',
        means: 'When a moment comes the phone says so — the tab’s title and a buzz while the app is open — and you tap what each person is doing right then. The tap carries the moment’s own time, so a late answer does not shift the sample.',
        doThis: 'At “Moment 12 of 40” tap one activity for every person. Look up and tap at once: do not wait to see what they do next. Press Take a sample now for one more by hand, and Strike on a tap you got wrong. On a bottleneck walk the stations are tapped instead: working, starved, blocked or down.',
        youGet: 'Taps stamped with their moments, counted against the moments answered and missed.',
      },
      {
        step: 'Shares and margins',
        means: 'A share is the taps on an activity out of all of a person’s taps. Each carries a margin at 95% sure, because a sample is not the whole shift: “working 61% (±7)”. Under 30 taps the shares are not yet said.',
        doThis: 'Read each person’s line, for example “Op 2: working 61% (±7), walking 18%, waiting 14% — from 190 taps; 176 more for ±5 points”. Keep tapping until the margin is the one wanted.',
        youGet: 'Shares with their margins for each person, never one score, and how many more taps would narrow them.',
      },
      {
        step: 'The biggest share that is not the work',
        means: 'Where the time goes: the largest share that is not the work itself, for the people with enough taps, and what it costs a shift in their time.',
        doThis: 'Read the tile and the closing line. On a study attached to a project, press Make it better to raise a fix from that share; once enough taps are in, Close — keep these figures keeps the result as a receipt. For the cost, give the line a wage and on-costs; it is optional and the tile says what is missing.',
        youGet: '“Op 2 is waiting 14% of the time (±5 points, from 190 taps)” and, with the wage, the pounds of their time a shift. A bottleneck walk puts no labour figure on stations.',
      },
    ],
    watch: 'Tap what the person is doing at the instant of the prompt, not what they usually do or what they did a minute ago. A tap made later from memory is no longer a random moment.',
  },
  'FC-024': {
    intro: 'For a new pack format on a line that has already timed its other products. Instead of timing every step again, you borrow a step already timed on another product, and the new balance still gets its own allowance.',
    steps: [
      {
        step: 'Have something timed to borrow',
        means: 'The library is the steps already timed or reused on the newest balance of each other product on the same line. Without one, there is nothing to offer.',
        doThis: 'Time at least one other product’s Line balance on this line, with the steps named plainly (“Fold tape”, “Place packs”). If you see “No other product on this line has a timed step yet”, that is why.',
        youGet: 'A list of timed steps from other products, each with its basic time and the cycles it stood on.',
      },
      {
        step: 'Find a step',
        means: 'The Standard data block on the Times tab matches words in the step’s name and the product it was timed on, so what you find is steps with the same name.',
        doThis: 'Type part of the step (“fold tape”). Read each row: the step, its product, its basic time, its cycles and “(short of enough)” when the timing behind it was thin.',
        youGet: 'The matching steps, up to thirty, each with where it came from.',
      },
      {
        step: 'Use it',
        means: 'Using a step puts a copy on a person in this balance, with its basic time. This balance’s allowance is added to it, and it is marked as reused until you time the step here, which replaces it.',
        doThis: 'Choose whose step it becomes in the “for” box, check the pack matches, and press Use it. A time that grows with the pack (“place n packs”) is not worked out for you: pick the step whose pack is the same.',
        youGet: 'The step on the person with a standard time, marked “reused” and saying where it came from.',
      },
      {
        step: 'How much is borrowed',
        means: 'The share of the work that was not timed here, so you know how far to trust the balance until it has been timed on this product.',
        doThis: 'Read the line above the list: “2 of 5 steps are reused from other products’ timings — 41% of the work”. Time the steps here to replace them, starting with the biggest.',
        youGet: 'A balance that can be read now, with the reused part said and not hidden.',
      },
    ],
    watch: 'A match is by name only. Conditions that change a time — the pack, the distance, the weight — are not modelled, so you judge whether the step really is the same work.',
  },
  'FC-025': {
    intro: 'For making a standard time one a person can keep all shift. The timed work is the basic time; the allowance adds rest and small delays, and the standard time is basic × (1 + allowance).',
    steps: [
      {
        step: 'Open the allowance',
        means: 'The allowance is a share of the basic time, agreed once for the whole balance, and not for each step. Until one is agreed the page says “No allowance — the standard time is the basic time”.',
        doThis: 'On the Times tab, under The allowance, press Agree an allowance (the project’s owner agrees it). Take the figure from your site’s agreed policy; a union agreement often fixes it. The page offers no table of percentages.',
        youGet: 'A form: One figure or Built from parts.',
      },
      {
        step: 'One figure, or built from parts',
        means: 'One figure is quickest. Built from parts follows the ILO’s structure: a part for each cause, such as personal needs, basic fatigue, standing, awkward posture, load or force, heat or cold, noise, poor light, close attention, monotony and contingency.',
        doThis: 'Pick Built from parts, name each cause from the list and type the percentage your site agreed for it, then Add a part. Each part is named and each is a percentage of the basic time; together they must be under 100.',
        youGet: 'A total beneath the parts: “Together 15%”. The page supplies none of the percentages.',
      },
      {
        step: 'What it does to the times',
        means: 'Every timed or reused step has its allowance added to its basic time. A time you typed, and a machine’s run, carry none — a machine does not need rest.',
        doThis: 'Read the sentence under The allowance: “15% allowance — personal needs 5, basic fatigue 4, standing 2 …”. When it is built from parts and comes to over 25%, the page notes a rule of thumb, which is practice and not a standard: it usually says the job needs redesigning rather than a bigger allowance.',
        youGet: 'A standard time on every step that includes the allowance, and the planned rate an hour from it.',
      },
      {
        step: 'What it costs',
        means: 'The allowance is rest the job needs, not waste, and the page says so. In money it is the share of every piece that is allowance, at the line’s hourly rate.',
        doThis: 'Give the line an hourly rate in Line capacity. It is optional; without it the page names the one thing missing.',
        youGet: '“The allowance is 4.1 s of every piece — £… of labour a pack, £… an hour at takt. It is rest the job needs, not waste.”',
      },
    ],
    watch: 'Line capacity adds its own 9% rest to a person’s time at a station (5% personal needs, 4% basic fatigue). It leaves a standard time from this balance alone, so the same rest is never counted twice.',
  },
  'FC-026': {
    intro: 'For a person who loads a machine and then waits for it: how many identical machines can one person tend before the machines start waiting for them? It is read from the same steps as the Person and machine chart.',
    steps: [
      {
        step: 'Load, run and walk',
        means: 'Three times, taken from the person’s steps: loading and unloading (their Work steps), the machine’s own run (a Machine step), and the walk between machines (Walk steps). Waiting is left out.',
        doThis: 'On the Against takt tab give the person a Work step for loading, a Machine step for the run and a Walk step for the walk. Time or type each. Without a Work and a Machine step the page tells you what it needs.',
        youGet: '“How many machines can Op 1 tend?” on the Person and machine tab.',
      },
      {
        step: 'How many they can tend',
        means: 'The ideal number is (loading + run) ÷ (loading + walk). It is rarely a whole number, so the choice is between the two whole numbers either side of it.',
        doThis: 'Read the first line: “Op 1 can tend 3.3 of these machines (10.0 s loading, 40.0 s running on its own, 5.0 s walking)”. So the choice is 3 or 4.',
        youGet: 'The two whole numbers to choose between, highlighted in the table.',
      },
      {
        step: 'Who waits at each number',
        means: 'With fewer machines than the ideal the person waits; with more the machines wait for the person. The table shows the cycle, the output an hour, how long the person is idle and how long each machine waits.',
        doThis: 'Read the table and the sentence, which for these times says “with 3 the machines never wait and Op 1 is idle 5.0 s a cycle; with 4 Op 1 is never idle and each machine waits 10.0 s a cycle and they make 11% more (240.0 against 216.0 machine-cycles an hour)”.',
        youGet: 'The output of both choices side by side, so the trade is plain.',
      },
      {
        step: 'Which is cheaper',
        means: 'An idle person against idle machines. Which costs more depends on what the person and the machine cost an hour, and on whether the machines are what holds the line back.',
        doThis: 'Give the line an hourly rate in Line capacity for the person. Type The machine’s cost an hour, £ and Packs one machine-cycle makes if you want the rest. All of these are optional.',
        youGet: 'Columns for Labour a machine-cycle and With the machines, and — if the machines hold the line and the line has a margin a pack — the contribution an hour that the extra machine adds.',
      },
    ],
    watch: 'It assumes identical machines and a fixed cycle. Machines that stop at random keep a person waiting in a way this does not work out, and the walk is the walking step you typed, not a measured distance.',
  },
  'FC-027': {
    intro: 'For planning a new starter or a new product at the rate it will really run in the first weeks, instead of at full rate from day one. Type the time of each run, in order, and the page fits Wright’s learning curve.',
    steps: [
      {
        step: 'How fast is a new job being learned?',
        means: 'One of the Analysis tool’s questions. A new job takes less time each time the number of runs doubles, by a fixed share. That share is the learning rate.',
        doThis: 'Start an Analysis and pick How fast is a new job being learned? under Did it change or differ?. Name what is measured (“Time to pack a case”) and keep the unit in seconds.',
        youGet: 'A study that fits the curve as the runs are typed.',
      },
      {
        step: 'The standard and the units',
        means: 'The standard is the time per unit the job is heading for. The units each reading stands for are needed only to say what learning costs in money.',
        doThis: 'Type the standard in the unit, such as 40 s. Optionally type how many units each run makes, such as 1,200. Both are optional.',
        youGet: 'The curve can say when the standard is reached. Without it the page asks you to give one.',
      },
      {
        step: 'The runs',
        means: 'The time each run took, in the order made, with run 1 first. One curve is one person on one job: pooling two people, or two products, gives two curves averaged into nonsense.',
        doThis: 'Time each run of the same person on the same job with a stopwatch and tap it into the pad, or paste the column. Five are needed to fit a curve and eight to call it firm. A run struck keeps its place.',
        youGet: 'The runs in order. With fewer than five the page says “Too few”.',
      },
      {
        step: 'The learning rate',
        means: 'Each time the runs double, the time falls to this share of itself: 80% means to four fifths. A lower rate is faster learning, and 100% is no learning at all. It is given with an interval, because a few runs give a range.',
        doThis: 'Read the sentence: “8 runs: each time the runs double, the time falls to 85.6% of itself — we can be 95% confident the rate is between 85.0% and 86.3%”. The Explained tile is how much of the change the curve accounts for.',
        youGet: 'A learning rate with its interval and R², and the curve drawn through the runs.',
      },
      {
        step: 'When the standard is reached, and what to plan',
        means: 'The run at which the fitted time reaches the standard, and what to plan the first runs at — the average of the runs to get there, not the standard itself.',
        doThis: 'Read the line, which for the record’s eight runs says “The 40.0 s standard is reached at about run 11 (between run 10 and run 12 by the slope’s interval)”, then “Plan the first 11 runs at about 48.0 s each on average — not at the standard”. Use that in the plan for the first weeks.',
        youGet: 'A run number for reaching the standard and a time to plan the first runs on.',
      },
      {
        step: 'In money, and the checks',
        means: 'What the learning costs: the time above the standard in the runs to get there, at the line’s wage. The checks say when the curve should not be trusted.',
        doThis: 'Give the line a wage and type the units each run makes; both are optional and the page names whichever is missing. Read Checks on the readings — fewer than 8 runs, the time not clearly falling, runs that do not follow one curve, a standard reached beyond three times the runs read.',
        youGet: 'A line such as “Learning to the standard costs about 29.6 hours of one person’s time over what the standard would take — £444 at the line’s rate”, and the checks in words.',
      },
    ],
    watch: 'Beyond the last run the curve is a projection, not a reading, and a standard far past the runs read is a guess. It measures time, not quality, and a change of method starts a new curve.',
  },
  'FC-028': {
    intro: 'For questioning each timed step one by one — should it be done, joined to another, moved or made easier — and seeing what the changes would save before anything is changed. It is the Improve tab of the Line balance.',
    steps: [
      {
        step: 'Time the work first',
        means: 'Nothing can be said to save time until the steps have times. The tab says “List and time the work first” until they do.',
        doThis: 'Name and time each person’s steps on the Against takt tab. Then open Improve.',
        youGet: 'A step list for each person with their time now.',
      },
      {
        step: 'Ask the five questions',
        means: 'The critical examination, in order: Purpose (what is achieved, is it needed?), Place (why there?), Sequence (why then?), Person (why them, or the machine?), Means (is there an easier way?). The order matters: there is no point simplifying what should not be done.',
        doThis: 'Open “The five questions to ask of each step” and put them to the people who do the work. Ask quality and food safety before any check goes.',
        youGet: 'A question to ask of each step, and what each tends to lead to.',
      },
      {
        step: 'Decide each step',
        means: 'Each step gets one decision: Keep, Eliminate (stop doing it), Combine (join another step), Rearrange (another place, time or person) or Simplify (make it easier).',
        doThis: 'Tap the decision. Eliminate asks why it can go; Combine asks which step it joins and what it adds to it; Rearrange asks who takes it, or off the line, and how long it takes them; Simplify asks the time it is expected to take. Add a one-off cost in £ if there is one.',
        youGet: 'A decision on each step, with what it is expected to take afterwards.',
      },
      {
        step: 'Read the expected result',
        means: 'The balance is worked out again from the expected times. The result is expected until the work is timed again, and the page says so.',
        doThis: 'Read the sentence, which for example says “49.0 s of work → 30.0 s expected (39% less) …”, the longest stack against takt, how many people the work would need, and the flags (a check going without a reason, a Simplify with no time).',
        youGet: 'The new cycle, the saving, and whether each person fits takt.',
      },
      {
        step: 'In money',
        means: 'What the seconds saved are worth in labour: a pack, for every 1,000 packs, and an hour at takt, with the payback of any one-off cost.',
        doThis: 'Give the line an hourly rate in Line capacity, and type the one-off cost of a change. Both are optional; the page names the one it needs.',
        youGet: '“£… of labour a pack, £… for every 1,000 packs … the changes cost £… and pay back in … running hours — expected.”',
      },
    ],
    watch: 'Nothing here changes the timed work. Every figure is expected until you make the change and time the work again; only then is it a result.',
  },
  'FC-031': {
    intro: 'For a manual station that cannot keep up, or has people standing. It says how many people the station needs to keep pace with what reaches it, and what one more person does to the line and to the cost of a pack.',
    steps: [
      {
        step: 'A station of people',
        means: 'In Line capacity each station is a Machine or People. A people station counts in a unit — trays, cases — and says how many of the one before make one of these, so what reaches them can be worked out.',
        doThis: 'Add the station in flow order, switch it to People, say what it counts in (“trays”) and what each holds (“8 bags”).',
        youGet: 'A line that says what reaches this station: “A tray reaches them every 6.9 s — 8.75 a minute”.',
      },
      {
        step: 'How long one takes them',
        means: 'A person is timed, not read from a plate: how long it takes them to do one unit, at the pace they can keep up all shift, not their best lap.',
        doThis: 'Under How fast it runs choose How long one takes and type the seconds, from a stopwatch on the person, or use the time from the Line balance with one tap. The rest allowance is 9% unless you change it; more for standing, awkward posture or weight lifted.',
        youGet: 'The time to plan on, with the rest in it: “Plan on a tray every 8.7 s”.',
      },
      {
        step: 'Do they keep up',
        means: 'People needed is what reaches them divided by what one person can do in a minute, rounded up to a whole person. The page also says by how many seconds a unit they are slow or ahead.',
        doThis: 'Read the verdict: “They take 8 s a tray — 1.1 s too slow: they hold the line back. It needs 2 people to keep up.” If it does, press Make it 2 people. Only the station that holds the line is shown in red; others are said plainly.',
        youGet: 'The people needed, the seconds short or to spare, and the crew changed in one tap.',
      },
      {
        step: 'What one more does',
        means: 'One more person at the bottleneck costs an hour’s wage and lifts the line only as far as the next station lets it. So the cost of a pack may fall, or rise.',
        doThis: 'In What a pack costs in labour, check People on the line — all of them and £ an hour, each; they stand in from the line standard’s head count and the line’s crew and wage, and say which. Both are optional.',
        youGet: '“One more person at Packer: the line makes … an hour instead of … — 34p a bag instead of 40p: 6p a bag lower — they pay for themselves”, or higher, or the machine that holds the line.',
      },
    ],
    watch: 'A person fed straight by a machine with nothing collecting between them cannot match it piece for piece. The page flags a load above 90% and says to plan them at 80 to 90%, or let some collect before them.',
  },
};
