/* GUIDES — equipment, maintenance, changeovers and commissioning (the discipline's tools; src/catalogue/guide.ts).
 * Written from the pages themselves, in their own labels and in the order a person meets them: what a step means, what to do
 * there and what you get. A mode (partOf) is written only where its steps differ from its parent's; the rest are covered by
 * the parent's guide. Matches the two exemplars in spc.ts. */
import type { Guide } from '../guide';

export const EQUIPMENT_GUIDES: Record<string, Guide> = {
  'FC-241': {
    intro: 'For a row of workstations in front of you, each stopping now and then, when you want to know which lost the most in kilos or units. Press once when one stops and once when it runs again.',
    steps: [
      {
        step: 'How many workstations',
        means: 'The number of workstations you are watching, up to thirty. The page shows a set of boxes for exactly that many, each called Workstation 1, 2, 3 unless you name it.',
        doThis: 'Press New calculation, name the session (“Packing hall, 10:00 to 11:00”), then type how many workstations are in front of you. Type a name for any you want to call by its floor name.',
        youGet: 'A box for each workstation, with its name, minutes stopped and number of stops.',
      },
      {
        step: 'What is lost, and at what rate',
        means: 'Each minute a workstation is stopped costs you what it would have made in that minute. Choose the unit the floor counts in — kilos, units, packs, trays, cases or your own word — and say whether the rate is every minute or every hour.',
        doThis: 'Pick the unit and type the rate lost: kilos a minute at that workstation, or units an hour. If the workstations differ, choose Each its own and give a rate under each. Change the unit later and only the word changes.',
        youGet: 'The rate every stop is multiplied by, in the unit you chose.',
      },
      {
        step: 'Stopped and Running again',
        means: 'The button under a workstation’s minutes times its stop. Press Stopped when it stops; the clock runs; press Running again when it restarts and the minutes are added to that workstation and one stop is counted.',
        doThis: 'Press Stopped on the workstation that has just stopped, and Running again when it restarts. Do it for as many as are stopped at once. Or type the minutes and stops if you timed them another way.',
        youGet: 'The workstation’s minutes and stops, growing with every press-pair, and the loss worked out beside it.',
      },
      {
        step: 'Watch, then carry it forward',
        means: 'What you have seen is a sample. The time you have watched is how big the sample is, and the longer it is, the surer any figure carried forward can be. Pick 2, 3, 5, 10 hours, a week or your own hours and the sample is carried forward in proportion, with the range we are 95% confident of — and a word for how firm it is: Firm, Fair or Rough.',
        doThis: 'Press Start watching when you begin and Pause when you leave. Come back later, open the same calculation and press Start watching again — the time adds on and the range closes in. Pick the hours to carry it over; for a week, say how many hours the line runs in a week. Change how sure to be (90, 95 or 99%) if the business uses another level.',
        youGet: 'The kilos (or units) lost over that time with their range, a chart of the line with the range either side, and how many more stops — roughly how many more hours of watching — would make it firm.',
      },
      {
        step: 'What it says',
        means: 'One sentence: how many workstations stopped, for how long, what it cost in your unit and which workstation lost the most. The tiles give the totals, the worst workstation and, if you gave the time you watched, the share of it spent stopped.',
        doThis: 'Read the sentence, then the order of what each lost. Give what one lost unit is worth to see it in money. Report ▾ makes the paper.',
        youGet: 'The workstation to look at first, with the figure to say it by.',
      },
    ],
    watch: 'It counts only what was timed, and the loss is the rate you typed times the minutes — a workstation that is not the constraint may catch up, so treat it as a ceiling there.',
  },
  'FC-058': {
    intro: 'For a machine that keeps stopping, jamming or needing help when nobody can say how often, or whether it is getting better. You stand at it with a phone, run a watch while it runs and tap each event as you see it — nothing is read from the machine.',
    steps: [
      {
        step: 'Which machine?',
        means: 'A reliability study is of one machine, or of every machine on a line watched on one clock. Saying the line and the machine lets the page offer the line’s own machines and price what the stops cost.',
        doThis: 'From Reliability press New reliability study. Pick the line (leave it as no line for a quick session), say what it is of — “Filler 2 stops” — and pick the machine from the list or type another. To watch every machine at once pick The whole line, press Next — the machines, tick the ones you will watch, say what is counted at each and press Start the line watch.',
        youGet: 'A study on that machine opening at What are you counting? — or, for a whole line, one study a machine, all sharing one watch, with a strip across the top showing every machine’s count and verdict.',
      },
      {
        step: 'What are you counting?',
        means: 'The things you will tap at the machine — a stop, a failure, a jam, a pick, or your own word. Each gets a button of its own, all on the one watch, and its own MTBF: the mean time between them, which is the running time divided by how many you counted.',
        doThis: 'Tap the offered words or type your own and press Add. For each, type the MTBF wanted in minutes if you have a target (leave it empty if not) and the minutes the line stands each time one happens, if you know it. Press Set it up. The folded More about… holds timing each one, a call for help (andon), growth and a part that wears.',
        youGet: 'A button for each thing counted and the agreed record the verdict is read against. Change what was agreed later: taps already made keep their count, and a count taken off keeps its taps and can be brought back.',
      },
      {
        step: 'The watch and a button for each',
        means: 'The watch measures the running time and the buttons count the events inside it. A tap counts only while the watch runs, so the MTBF is events per hour of watched running, not per hour on the wall clock.',
        doThis: 'Press Start the watch while you are watching the machine run, then tap the button each time you see one. Undo is there for ten minutes after a tap, with a box to say what you saw. Stop the watch while the machine is down for long, at a break or when you leave; start it again another day and the time and taps add up.',
        youGet: 'The time watched, a tally on every button, and figures that firm up with each tap. A watch left running past twelve hours is asked about — Stop it at the last tap ends it where the watching really ended.',
      },
      {
        step: 'MTBF and the verdict',
        means: 'MTBF is the running time between events; the failure rate is the same thing the other way up, events an hour. Because a short watch gives a range, not a point, the page says how sure it is: “90% sure 27–55 min” means the true MTBF lies in that range nine times in ten. Under five events it says rough.',
        doThis: 'Read the sentence first, then the tiles: MTBF, Failure rate, Watched, the count and What it costs. With several things counted, Counted side by side gives a row each — tap a row or its chip to open that one in full. With an MTBF wanted typed, the sentence says whether it is met.',
        youGet: 'The MTBF with its 90% range and the rate an hour. Against an MTBF wanted the tile is green only when even the low end of the range meets it, amber while the range still straddles it, red when even the high end falls short of it; with no target it stays grey, for the team to judge.',
      },
      {
        step: 'What it means',
        means: 'Three pictures and a few sentences read the pattern behind the average. Events against watched hours is a straight line for a steady rate and bends up if they come faster; Running time between one and the next shows how long it runs between events; MTBF, day by day shows whether it is getting better.',
        doThis: 'Look at the pattern, not only the number. Gaps that come round fairly regularly point at something that comes round — a reel, a refill, a part that wears; gaps that come in bursts mean one brings the next. Whether they are coming more or less often is said from four events, and a pattern in the gaps from five gaps.',
        youGet: 'Sentences such as the chance of an hour’s running with none, the typical gap, and whether they are coming more or less often (90% sure), plus the day-by-day table and a trend against the MTBF wanted.',
      },
      {
        step: 'In money',
        means: 'What the events cost, said in two parts that are never added together: the crew’s time stood while the line is stopped, and — only where this machine is the line’s bottleneck — the packs not made and their contribution. A machine that is not the bottleneck costs labour only, because the line runs round it.',
        doThis: 'Give the minutes the line stands each time one happens (in What are you counting?; the timed minutes replace it once three are timed) and set up the line with its crew, wage, rated speed and margin a pack. Every one is optional — the page names the one it is missing and never invents a figure.',
        youGet: 'The What it costs tile in pounds an hour of running, as labour and, at the bottleneck, as contribution with the packs, and a day of the line’s shifts. Nothing waits on it: the MTBF stands without it.',
      },
      {
        step: 'Keep it or close it',
        means: 'A study can be carried on another day, or closed when its question is answered. Closing keeps a receipt: the figures as they stood.',
        doThis: 'Strike a mistap or a stretch from Every tap and Every stretch of the watch — it stays on the list, left out of the figures, and can be restored. Write what you saw in Commentary. Where the study shows something to put right on a project, Make it better raises a fix; watch again after it for the proof. Press Close — keep these figures when done.',
        youGet: 'A record that keeps its history, a commentary on the paper and, once closed, a receipt. Reopen asks why and keeps the reason with the study.',
      },
    ],
    watch: 'Stop the watch when nobody is watching and when the machine is down for long. Time left running with no one tapping makes the MTBF look better than it is — the page asks, but only after twelve hours.',
  },
  'FC-059': {
    intro: 'For when stops are counted but not how long each one takes to clear. Time each stop at the machine and the study says the typical repair, the worst, whether the time goes on waiting or fixing, and how available the machine is.',
    steps: [
      {
        step: 'Time each one',
        means: 'A count can be timed instead of only counted: each tap becomes a stop with a start, a moment help arrived and a moment the machine was running again. A timed stop takes the machine out of running, so the MTBF becomes the MTBF of running time.',
        doThis: 'In What are you counting? open More about… and under Timing choose Time each one — a stop. Add the reasons you meet — jam, film break, sensor, material short — and they become the buttons on the stopwatch; add a fitter’s rate in pounds an hour if you want the repairs in money. Do not time something that does not stop the machine.',
        youGet: 'A button for each reason on the watch page, in place of the one plain button. A reason met mid-test can be added on the watch with Add a reason, or Add and stop.',
      },
      {
        step: 'Press the reason',
        means: 'At the machine, the reason you press is the stop: it starts timing at once. Only one stop of a count is open at a time.',
        doThis: 'With the watch running, press the reason the moment the machine stops. The stop shows on the watch with its clock running, and again under Not yet running again. When a fitter or engineer arrives press Help arrived there; when the machine runs again press Running again.',
        youGet: 'A row under Not yet running again for each open stop, with how long ago it started and when help came. A stop open for more than four hours is flagged — say how long it took, or strike it.',
      },
      {
        step: 'Or say how long it took',
        means: 'Short stops are over before there is time to stamp them. You can say the length afterwards instead; a time said is marked with a ~ and counted as said, not clocked.',
        doThis: 'On the open stop tap one of the chips — 10 s, 30 s, 1 min, 2 min, 5 min — or type it as 40 s, 90 s, 1.5 min, 1:30 or 2 h and press Set. A bare number is minutes. A time before help arrived is refused. Any stop can be given its time later from Every tap.',
        youGet: 'A stop with a length. The page counts how many were said, not clocked, and says so beside the figures.',
      },
      {
        step: 'Repair time and Available',
        means: 'Repair time is the typical time to clear a stop, as the median because a few long ones pull the mean up. Available is the share of time the machine is up: MTBF divided by MTBF plus the repair time (MTTR, the mean time to repair).',
        doThis: 'Read the Repair times panel: the sentence, the Repair time tile with its 90% range, and Available. The range appears from five stops timed and “1 in 10 over” from ten; under five it is called rough. Compare the mean with the typical — a mean well above it means a few long ones.',
        youGet: 'The typical repair, the mean, the longest, the Available percentage with its range, how many minutes are lost every hour of running, and what halving the repair time would give back.',
      },
      {
        step: 'Waiting or fixing',
        means: 'Whether the time goes on waiting for help or on the repair itself decides what to chase. The Help arrived stamp is what separates them; fixing includes finding the fault.',
        doThis: 'Stamp Help arrived on each stop. From three stamped stops the page says waiting apart from fixing, and draws a bar for each stop: amber for waiting, then fixing. Most of the time waiting means look at who is called and how fast; mostly fixing means look at the repair itself.',
        youGet: 'The share of the time spent waiting, the typical wait and the typical fix, a bar for each of the last stops, and the reasons ranked by the minutes they cost.',
      },
      {
        step: 'In money',
        means: 'Once three stops are timed, their mean replaces the typed minutes the line stands in the cost of the events, and the fitter’s time can be priced from the repairs.',
        doThis: 'Type A fitter costs, £ an hour when you set the count up. Without it the page says to give a fitter’s rate to say the repairs in money. Every input is optional; nothing waits on it.',
        youGet: 'A line saying what a repair costs and what it costs an hour of running, using the fixing time where help is stamped, else the whole time.',
      },
    ],
    watch: 'Time only what really stops the machine. A stop that leaves the machine running would take running time off the watch and make the MTBF look worse than it is.',
  },
  'FC-060': {
    intro: 'For a part that is changed when it fails — a sealing-jaw tape, a knife, a belt, a heater — when you need to know whether it wears out, so changing it before it fails would pay, or fails at random, so it would not.',
    steps: [
      {
        step: 'A part that wears',
        means: 'One count is one failure mode of one part. Weibull is the method that reads the ages at which such a part failed and says whether the chance of failing rises with age.',
        doThis: 'In What are you counting? open More about… and tick A part that wears. Say what its age is counted in — hours, cycles or packs — or tick Use this study’s gaps between one event and the next as the parts’ lives, when the part is replaced at each event. Keep one failure mode to a count.',
        youGet: 'A How the part wears panel on the study. It fits from 6 failures; a first guess shows until 20.',
      },
      {
        step: 'The lives',
        means: 'A life is how old a part was when it failed — or how old it is now and still running. The still-running ones matter: a part changed before it failed tells the fit that it lasted at least that long.',
        doThis: 'For each part type its age and choose Failed or Still running, add a note if you like and press Add the life. List the parts you changed before they failed as Still running — leaving them out biases the shape high and the change interval too early. A wrong one is struck and can be restored.',
        youGet: 'A list of lives, marked failed or still running, and a count of how many came from the watch’s own gaps.',
      },
      {
        step: 'Shape β',
        means: 'β says how failure depends on age. Above 1 the part wears out — the older it gets, the likelier it fails; below 1 it fails young, which points at fitting or commissioning, not wear; near 1 age makes no difference.',
        doThis: 'Read the sentence and the Shape β tile. The page says wears out or fails young only when its 90% range is clear of 1; otherwise it says age makes no difference that can be told, and may add which way it leans. If the two fits differ, or the plot is not straight, believe the warnings: split the failure modes before trusting the shape.',
        youGet: 'β with its 90% range, a Weibull plot of the lives, and a table of the shape, characteristic life, B10 and B50.',
      },
      {
        step: 'B10 life',
        means: 'B10 is the age by which a tenth of the parts have failed; B50 is the age by which half have. It is a planning age, not a promise.',
        doThis: 'Read the B10 life tile with its 90% range, and the mean life. To judge one part in the machine now, type its age and the stretch ahead in the two boxes after A part that has run, and the page says its chance of failing in the next stretch.',
        youGet: 'B10 and B50 in your unit, and the chance a part of a given age fails in the next stretch, as a percentage and as “1 in n”.',
      },
      {
        step: 'Change at',
        means: 'If the part wears out, changing it at an age before it fails can cost less than running it to failure — worked from what a planned change costs against what a failure costs.',
        doThis: 'Type A planned change costs, £ and A failure costs, £ (the part, the labour and the line’s lost time) when you set the count up. Both are optional; without them the page asks for them.',
        youGet: 'An age to change it at, what that costs per 1,000 hours (or cycles, or packs) against running to failure, and the saving. None is given if the part does not clearly wear out, or a failure costs no more than a planned change.',
      },
    ],
    watch: 'List the parts you changed while they were still working as Still running. Leaving them out is the commonest way to get a shape that is too steep and an interval that is too early.',
  },
  'FC-061': {
    intro: 'For a new machine or line that stops a lot at first, when you need to know whether the fixes are working fast enough — and whether it will reach its MTBF by handover.',
    steps: [
      {
        step: 'Track growth',
        means: 'Reliability growth reads failures against running time on a new machine. If the failures come further apart as the running goes on, the fixes are working.',
        doThis: 'In What are you counting? open More about… and tick Track growth for the count of failures. Watch the machine through its first weeks, start the watch whenever it runs and tap each failure. Put the MTBF wanted in so the page can say when it will be reached.',
        youGet: 'A Reliability growth panel and an MTBF now tile on the study. Growth is fitted from 8 failures, and called rough until 20.',
      },
      {
        step: 'β — better or worse',
        means: 'β is the shape of the curve of failures against running time. Below 1 the failures are coming slower as the running goes on, so it is getting better; above 1 they are coming faster; 1 is steady.',
        doThis: 'Read the sentence at the top of the panel. The page says it is getting better or worse only when the 90% range on β is clear of 1; otherwise it says no sign yet, and which way it leans. Worse means a design or installation problem, not bedding in.',
        youGet: 'β with its 90% range and a picture: the failures as they came, the fitted curve and a steady rate.',
      },
      {
        step: 'MTBF now',
        means: 'The average MTBF since the start hides the improvement. The MTBF now is where the curve stands at the end of the running — what the machine is doing today.',
        doThis: 'Compare the MTBF now tile with the average since the start. It is an estimate with no range of its own, and the running time counted is running time, not the clock on the wall.',
        youGet: 'The MTBF now beside the average since the start, and the growth rate, 1 − β.',
      },
      {
        step: 'Will it reach it?',
        means: 'If it is clearly improving and an MTBF wanted is typed, the curve can be carried forward to say how much more running it takes.',
        doThis: 'Read the last sentence of the panel and the table’s Reaching it row. It gives “about 400 h more running, if the fixing keeps pace”, or already there, or not within sight at this rate. It makes no projection until the improvement is beyond doubt.',
        youGet: 'A forecast of the running still needed, with the assumption said — or the reason none is given. The handbook’s test of fit is not run; judge by eye whether one smooth curve fits.',
      },
    ],
    watch: 'A step change — a big fix part way through — can look like growth or hide it. Judge the picture as well as β, and remember it is running hours, not days.',
  },
  'FC-062': {
    intro: 'For the operators who run a machine all day: a short written check — clean, inspect, lubricate, tighten — done by a tap on the phone, and a tag for every abnormality found, so basic condition does not slip unnoticed.',
    steps: [
      {
        step: 'Start the log',
        means: 'A log is a list of checks on a machine, each with how often it is due. It belongs to a line, because the machines, the rate and the problems are the line’s.',
        doThis: 'Open Check logs, find Operator care checks (CILT) under Maintenance and press New operator check log. Pick the line, say the machine, and tick the checks you want from the starter list — guards, leaks, belts and chains, build-up on sensors and jaws, fasteners, lubrication points. The starter list is a place to begin: edit it to the maker’s instructions and your fitter’s plan.',
        youGet: 'A log on the line with its checks ready to do. The page lists what the starter list rests on and what is still to confirm against your own plan.',
      },
      {
        step: 'The checks as agreed',
        means: 'What is checked, by whom, how often and what passes — written down once so everyone judges the same way. The owner agrees it.',
        doThis: 'Open The checks. Add a check or Edit one: what is checked, the machine, who does it, how often (every shift, day or week, or when something happens), what passes in words and what to do if it fails. Take off a check that does not apply — it can be put back.',
        youGet: 'The list the round is built from, each check with its frequency and its pass rule, and a line saying how many hours a shift is for “every shift”.',
      },
      {
        step: 'The round',
        means: 'The Round shows what is due now and what is done, one big card a check. Done earlier counts, and the next one follows from it.',
        doThis: 'On each card press ✓ Pass or ✗ Fail. A pass is one tap with Undo. A fail shows what it will hold and what to do and asks what happened; Record the failure then raises a problem on the line’s register. Pass all due passes everything due in one go after naming which.',
        youGet: 'A card for each check in Due now, Done and When it happens, and a problem on the register for each failure; failing the same check again adds a step to that problem rather than a second one.',
      },
      {
        step: 'Tag an abnormality',
        means: 'A tag marks something abnormal you found, whether or not the check failed. Red means it needs the fitter; white means you fix it. Each tag is a problem on the register against the machine.',
        doThis: 'On the card press Tag an abnormality, choose Red — needs the fitter or White — I fix it, say what you saw — “jaw guard bracket loose” — and press Raise the tag. The log must be on a line.',
        youGet: 'A problem on the register: red goes in high, white in low. Its age, and whether it is closed, are the register’s.',
      },
      {
        step: 'Done on time and the history',
        means: 'The page counts what fell due in the last seven days. A check is on time if done within a quarter of its interval of its due moment — at least five minutes, at most twelve hours — and missed after that.',
        doThis: 'Read the tiles Done on time, Missed and Failed, each against the seven days before, then open History for the table by check, the abnormality tags and every result. A check tagged again in 28 days is named: the fix may be a wipe with the source still there.',
        youGet: 'Compliance by check, tags open and how old they are, repeat abnormalities, and an Action plan of the problems raised. Strike a wrong result and it stays on the list, left out of the figures.',
      },
    ],
    watch: 'A tag is not the same as a failed check, and a wipe is not a fix. If the same place is tagged again within 28 days, go and look for the source.',
  },
  'FC-063': {
    intro: 'For the fitters’ planned maintenance — tasks that fall due on a schedule — when planned work slips and nobody sees it until a breakdown. It is a log: each task is passed when it is done, and the page counts what was done on time and what is owed in crew-hours.',
    steps: [
      {
        step: 'Start the log',
        means: 'A log is the list of planned tasks on a line, each with how often it falls due. It belongs to a line, because the machines and their problems are the line’s.',
        doThis: 'Open Check logs, find Planned maintenance under Maintenance and press New PM task log. Pick the line, say the machine if the log is for one, and tick the tasks you want from the starter list — a monthly wrapper inspection, a quarterly filler gearbox oil, a weekly checkweigher reference check. They are examples to replace with your own plan.',
        youGet: 'A log on the line with its tasks ready. The page lists what the starter list rests on and what is still to confirm against your own plan.',
      },
      {
        step: 'The tasks as agreed',
        means: 'What each task is, on which machine, how often, what counts as done, and how many crew-hours it takes. Written once so that everyone judges the same way; the owner agrees it.',
        doThis: 'Open The checks and Add a check, or Edit one: the task, the machine, how often (Every … weeks, or when something happens), what passes in words — “Oil changed to spec” — and Standard hours, the crew-hours the task takes. Take the interval from the maker’s instructions, the law or the wear-out age of the part, and write down why.',
        youGet: 'A task list with an interval and standard hours on each. Standard hours are what the backlog is counted in; a task without them still shows overdue but adds no hours.',
      },
      {
        step: 'The round',
        means: 'The Round shows what is due now and what is done, one card a task. Done earlier than due counts, and the next one follows from the day it was done.',
        doThis: 'When the fitter has done a task press ✓ Pass on its card. Press ✗ Fail if it was tried and not completed to what passes: the sheet asks what happened and raises a high-priority problem on the line’s register, with the words to book it for the next stop or shutdown and say why it slipped.',
        youGet: 'Each task in Due now, Done or When it happens, a one-tap Pass with Undo, and a problem on the register for each failure.',
      },
      {
        step: 'Done on time and the backlog',
        means: 'A task is due an interval after the last time it was done, and is on time if done within a window of that — a quarter of the interval, but never more than 12 hours. After the window it is missed and overdue. The backlog is the overdue tasks added up in their standard hours.',
        doThis: 'Read the tiles: Done on time (such as 3 of 4, with the percentage, against the 7 days before), Missed, Failed, and Backlog when there is one — “2.5 h, 1 overdue PM task at standard hours”. Do the overdue task, or book it.',
        youGet: 'Compliance for the last 7 days, the missed count in red, and the crew-hours owed. History gives the table by task: how often, due, on time, missed, done and longest gap.',
      },
      {
        step: 'What reads it',
        means: 'Maintenance measures reads this log for PM compliance, backlog and planned hours, so the figures there are the ones on this page.',
        doThis: 'Keep the log current on the line: pass each task the day it is done. Strike a wrong result in History — it stays on the list, left out of the figures, and can be put back.',
        youGet: 'A board on the same line that shows PM compliance and the planned hours of the last 30 days with nothing re-typed.',
      },
    ],
    watch: 'The window to be on time is short: at most 12 hours past the due moment, however long the interval. A monthly task done two days late is missed and shows red.',
  },
  'FC-064': {
    intro: 'For deciding where scarce maintenance effort, spares money and engineering time go first. Score each machine on how much it would hurt if it failed and how likely that is, and the app ranks them into classes A, B and C.',
    steps: [
      {
        step: 'New ranking',
        means: 'A ranking is a review of one line’s machines, made once a year and after any change of product, speed or layout. It is kept on the line.',
        doThis: 'Open Equipment criticality and press New ranking. Name it — “Line 2 — October review” — pick the line and press Start.',
        youGet: 'A ranking on the line, ready for its machines.',
      },
      {
        step: 'Score each machine',
        means: 'Consequence is the worst credible failure, taken as the highest of four scales from 1 to 5: Production, Safety, Quality and Repair. Likelihood is how likely it is to fail, 1 to 5.',
        doThis: 'Press + Add a machine, name it and score the five boxes with the people who know the line. The page does not set the anchors, so agree them first — one way: for production, 5 stops the bottleneck or the whole line for a shift or more and 1 has no effect on output; for likelihood, 5 fails monthly or more, 3 about yearly and 1 is not in memory. Likelihood is typed — it is not read from the reliability study.',
        youGet: 'A row for each machine, with a Score and a Class beside it. A machine with no likelihood, or none of the four consequence scales filled, is named in a warning and left out of the order.',
      },
      {
        step: 'CCP and Standby',
        means: 'Two ticks override the score. A device that is a critical control point for food safety (CCP) is class A whatever it scores, and so is anything scoring 5 on Safety. A machine with a full standby drops one class.',
        doThis: 'Tick CCP on the metal detector and the checkweigher that guard a critical limit. Tick Standby only where a spare can really take over at once.',
        youGet: 'The class as the method says it: a checkweigher that scores 10 is still class A because it is a CCP.',
      },
      {
        step: 'Class A, B and C',
        means: 'Score is consequence times likelihood, 1 to 25. In the app a score of 15 or more is class A, 8 to 14 is class B and under 8 is class C. A is where RCM, spares at a high service level and the first planned-maintenance hours go; B is planned maintenance to schedule with lower spares; C can run to failure.',
        doThis: 'Read the sentence and the three tiles. Agree the A list with the team before it is handed on to spares and planned maintenance. Three or more class A turns the verdict red; one or two is amber.',
        youGet: 'The count in each class, the class A machines named, and a closing line saying where the maintenance budget protects the line.',
      },
    ],
    watch: 'Scores argued without anchors are opinions. Read the scale out loud first, and score the worst credible failure, not the usual one.',
  },
  'FC-066': {
    intro: 'For deciding how many spares of a part to keep on the shelf, so that a failure does not wait weeks for a part and the stores are not full of the wrong ones. It turns a failure rate and a lead time into a number to hold.',
    steps: [
      {
        step: 'The part and its failure rate',
        means: 'Demand for a spare comes from failures. The MTBF of one part, in hours, and how many are installed give the failures expected an hour; the part’s name only goes into the sentence.',
        doThis: 'Open Critical spares and press New calculation: say what it is of, pick the line if it is on one and press Start it. Then type the part, the MTBF of one part in hours — from a reliability study on the machine or the supplier’s figure — and how many are installed (every one that can fail and need replacing). The page warns if the MTBF is under a day: check it is one part’s, not the machine’s.',
        youGet: 'The working: the failure rate for one part and the demand over the lead time, shown under How it is worked out.',
      },
      {
        step: 'The lead time',
        means: 'The stock has to cover the time it takes to get another — order, ship, customs and fit — because that is the period in which a failure has nothing to be replaced from.',
        doThis: 'Type the lead time in hours, measured on the last deliveries and not the contract’s promise alone. 21 days is 504 hours.',
        youGet: 'The number of parts expected to be needed over one lead time.',
      },
      {
        step: 'Chance of not running out',
        means: 'The service level is how often a lead time should pass with no stock-out. 95 in 100 is the starting point — a choice, not a rule. A part that stops the line deserves a higher level than a consumable.',
        doThis: 'Pick 90%, 95%, 97.5%, 98%, 99% or 99.5%. Each chip says how many lead times in 100 would still run short at that level.',
        youGet: 'The verdict, such as Hold 4, with the sentence: about 1.8 expected over 21 days, and 4 gives 96.1% of lead times with no stock-out.',
      },
      {
        step: 'Stock held now',
        means: 'What is on the shelf today, to read back how exposed you are at that stock.',
        doThis: 'Optionally type the stock held now. Leave it empty and the page still says what to hold.',
        youGet: 'A Risk now tile — the share of lead times that would need more than you hold — and how many more would reach the level you chose.',
      },
      {
        step: 'In money',
        means: 'What holding the stock costs a year, and what a stock-out would cost, so the stock can be weighed against the risk.',
        doThis: 'Optionally give what one part costs, the cost of holding stock for a year (finance will have the business’s rate — it is never filled in for you) and what one stock-out costs over the lead time. Each is optional; the page names what is missing.',
        youGet: 'The yearly cost of holding the stock and the expected yearly cost of the stock-outs that remain. Use What if… to try another service level, and Save as before to compare.',
      },
    ],
    watch: 'This is for random failures. A part that wears out on age should be changed on a schedule — hold the scheduled parts plus a little for the random ones.',
  },
  'FC-067': {
    intro: 'For the engineering manager’s monthly question — is maintenance getting better? — answered from the planned-maintenance log and the reliability studies already on the line, so nothing is typed twice.',
    steps: [
      {
        step: 'New board on a line',
        means: 'A board reads one line. It takes the line’s planned-maintenance log and every open reliability study on that line.',
        doThis: 'Open Maintenance measures and press New board. Name it — “Line 2 — October maintenance” — pick the line and press Start. Make sure the line has a planned-maintenance log and reliability studies, or the tiles will say what to start.',
        youGet: 'A board that says at the foot how many logs and reliability studies on the line it reads.',
      },
      {
        step: 'Reactive hours',
        means: 'Planned share is planned hours over planned plus reactive hours. The planned hours come from the standard hours of the tasks passed in the last 30 days; the reactive hours are the crew-hours spent on breakdowns, which no study feeds yet.',
        doThis: 'Type the crew-hours of reactive work in the last 30 days in the Reactive hours box. Take them from the work orders or the fitters’ own record.',
        youGet: 'The Planned share tile, planned hours over planned plus reactive — 210 planned against 190 reactive is a little over half.',
      },
      {
        step: 'PM compliance and backlog',
        means: 'PM compliance is the share of the planned tasks due in the last 30 days that were done on time. Backlog is the overdue tasks in crew-hours.',
        doThis: 'Read the PM compliance and Backlog tiles. Compliance is green from 80%, amber from 60% and red below. If a tile says to start a planned-maintenance log, that is the one thing missing.',
        youGet: 'Compliance and backlog straight from the planned-maintenance log, and the verdict colour for the whole board.',
      },
      {
        step: 'Machines watched and shortest MTBF',
        means: 'Each reliability study on the line contributes its MTBF. The board does not merge them; it counts the machines watched and points at the one with the shortest.',
        doThis: 'Read Machines watched and Shortest MTBF, then open that machine’s reliability study to see what is stopping it. Planned share is green from 80% and amber from 50%.',
        youGet: 'The sentence — PM compliance, planned share, backlog and the shortest MTBF — and a closing line saying whether to protect planned tasks on the critical machines first.',
      },
    ],
    watch: 'The board only reads what has been recorded. Planned hours come from standard hours on the tasks, and the reactive hours are typed, so a share built on guesses is a guess.',
  },
  'FC-068': {
    intro: 'For a changeover that takes too long and eats the shift. SMED is Shingo’s method for separating what has to be done with the line stopped from what could be done while it runs, then shrinking both. It works one changeover from one product to the next.',
    steps: [
      {
        step: 'Which two products?',
        means: 'A changeover is from the last good piece of the product the line ran to the first good piece of the next product at full rate. The two names say which one this is.',
        doThis: 'Press New SMED. Pick the line if there is one, type the product it ran in From which product? and the one it changed to in To which product?, and press Start it. A product with a line standard on the line is where the finished sequence can be set as the standard later.',
        youGet: 'A SMED named from one product to the other, open at Record. Change the products from the link under its name if you got them wrong.',
      },
      {
        step: 'Record: lap it as it happens',
        means: 'Every element of the changeover, in order, with who does it — and the adjustments and the run-up to full rate are elements too, typically half of the time, the page says.',
        doThis: 'At the line press Lap. Name the element, say who does it, choose Internal — the line stopped or External — could be done while the line runs, press Start — at the last good piece and then Next — this one is done as each ends; Last — first good piece at rate finishes. Or press + Type an element and give its minutes. Tag each element with the kind of work to see where the time goes: prepare and check, remove and fit, set and adjust, trial run and run-up.',
        youGet: 'The elements in a grid, a lane for each person, and the Now tile with the minutes from last good to first good.',
      },
      {
        step: 'Separate',
        means: 'Internal elements need the line stopped; external ones could be done before it stops or after it runs again. Work that is done with the line stopped only out of habit is the first to move out.',
        doThis: 'Open the Separate stage and mark each element internal or external — the grid shows internal solid and external hatched.',
        youGet: 'Inside the stop: the minutes the line really stands, with the external work moved out of the stop.',
      },
      {
        step: 'Convert and streamline',
        means: 'Convert asks of each internal element whether it could be done before the line stops — prepared in advance, standardised, or with an intermediate jig. Streamline works on what is left: do it in parallel, fit quick-release clamps, or take the adjustment out.',
        doThis: 'In Convert press → E Convert to external on an element and say how: prepare in advance, standardise the function or an intermediate jig. In Streamline choose ↓ Streamline, ✕ Eliminate or Keep for each element left inside the stop; for Streamline say how (in parallel, quick-release clamps, no adjustment) and give a target time, and for parallel work pick the element it runs beside and who does it. On a project, Make it better on an element raises a fix.',
        youGet: 'The ladder — Now, Separated, Converted, Streamlined — each bar against the target of single-digit minutes, which the page takes as under ten minutes, with the plan view of the grid.',
      },
      {
        step: 'How the line runs',
        means: 'What the changeovers cost depends on how long the line runs and how many changeovers there are, so they are asked, never assumed. A line that runs seven days is not a five-day line.',
        doThis: 'Press Say how the line runs: shifts a day, hours a shift, breaks the line stops for, days a week (5, 6, 7 or typed), weeks a year, the changeovers a shift, day or week, and the line’s speed in packs a minute. Use the line’s shifts if it has them. Everything is optional, and the page names what it is missing.',
        youGet: 'What the changeovers cost a shift, a day, a week and a year, in time stopped, packs, idle labour and contribution (lost only if the packs cannot be made up), and what each stage buys back.',
      },
      {
        step: 'Standardise and prove',
        means: 'The agreed sequence becomes the standard: what is prepared before the line stops, what is done with it stopped, what after it runs again. A fix is proved by timing the changeover again.',
        doThis: 'In Standardise mark each element Before or After. Once every element has a time press Set as the standard to write it onto the product’s line standard; the study closes as a receipt. Reopen to time again. Where a fix is being proved, the elements carried from before are timed again one by one.',
        youGet: 'A checklist in three parts, the standard on the product, and a before → after against the plan.',
      },
    ],
    watch: 'Time the whole changeover to the first good piece at full rate, not to the moment the line starts moving. The run-up and adjustments are where most of the time hides.',
  },
  'FC-069': {
    intro: 'For when shorter changeovers were bought but the batches did not get smaller. It works out how often the line can make every product, today and once the external work is moved out of the stop.',
    steps: [
      {
        step: 'Time the changeover',
        means: 'The interval is read from the minutes of the changeover itself, so it needs a SMED with its elements timed first.',
        doThis: 'Record and time the changeover on the SMED page. The interval takes the time now and the time inside the stop once the external work is done outside.',
        youGet: 'The Now and Inside the stop minutes the interval is worked from. Until they exist the page says to time or type the changeover.',
      },
      {
        step: 'How the line runs',
        means: 'The minutes the line runs a day are the time available to produce and to change over.',
        doThis: 'Press Say how the line runs and give the shifts, their hours and the breaks the line stops for.',
        youGet: 'The line runs a stated number of minutes a day, shown under How often can each product run?.',
      },
      {
        step: 'List the products',
        means: 'Every product the line runs, with how long each takes to make in a day. The time left after that is what the changeovers can use.',
        doThis: 'Press List the products. For each give what the customer takes a day and the line’s rate a minute — or its minutes a day if you know them. Add any product not on the list. The rate can come from the product’s line capacity.',
        youGet: 'A run time a day for each product, and the minutes free for changeovers once they are all run.',
      },
      {
        step: 'Read the interval',
        means: 'One cycle makes every product once, so it costs one changeover for each. The interval is that time divided by the time free each day: how many days it takes to get round the whole range.',
        doThis: 'Read the sentence under the tiles — “Five products at 42 min run every 1.4 days; at 27 min, every 0.9 days — daily”. If it says a daily interval needs a changeover of so many minutes or less, that is the target to set for the SMED.',
        youGet: 'The interval now and with the external work moved out, and the changeover time a daily cycle needs. If the products fill the day it says there is no time free for changeovers.',
      },
    ],
    watch: 'The page takes every product’s changeover as this one. If a pack-size change is quick and an allergen clean is not, time them separately.',
  },
  'FC-071': {
    intro: 'For the moment after a changeover and before the line is released: line clearance and the first-off checks that must pass before the first good pack ships. A wrong label is a recall, and a restart before the checks are done hides a changeover’s true length.',
    steps: [
      {
        step: 'Start the log',
        means: 'A first-off log is the release list for one line. It is a check log: each item is passed or failed, and every pass or fail is kept with when and by whom.',
        doThis: 'Open Check logs, find First-off release under Changeovers and press New first-off check log. Pick the line, say the machine or area, and tick the checks from the starter list. The starter list is a place to begin, not your standard.',
        youGet: 'A log on the line with nine release checks: line clearance, allergen clean verified, packaging matches the plan, date and lot code, first packs weight, seal, metal detector, checkweigher and release signed.',
      },
      {
        step: 'Make the list yours',
        means: 'A list that is the same for every change is either too long or too short. A like-for-like change and an allergen change need different lists.',
        doThis: 'Open The checks and Edit each one to your plan: what passes, who does it, and the line. The starter checks are written for “Line 7”, so change that to your own line. Take off the checks that do not apply and add your own.',
        youGet: 'Your release list, each check with what passes in words. Who may sign release, and which clauses of your standard apply, are for your site to confirm.',
      },
      {
        step: 'The release round',
        means: 'The checks are done after a changeover, so they sit under When it happens rather than being due on a clock.',
        doThis: 'After each changeover pass each check on its card with ✓ Pass in order, and ✗ Fail one that does not. Pass last of all Release signed, once every check above it has passed.',
        youGet: 'A pass or fail against each check, each stamped with its time in History, so the time from the first check to the release signature can be read off. The checks are counted when they are done, never shown overdue.',
      },
      {
        step: 'A failure stops release',
        means: 'A failed check means the line is not released. A critical problem is raised on the register, and the check is done again after the fix.',
        doThis: 'Press ✗ Fail, say what happened and Record the failure. Do not release. Fix it and run the check again; passing it clears the failure. If it fails again no second problem is raised — a step is added to the first.',
        youGet: 'A critical problem on the line’s register with the check’s name, and the tiles Failed and Missed on the log. The page states your rules and records the result; it never decides to release.',
      },
    ],
    watch: 'Release is the site’s decision. This log records the checks and who signed — it does not shorten the list, and it does not time the changeover itself (that is SMED).',
  },
  'FC-073': {
    intro: 'For new equipment taken from delivery to handover, when the OEM, the site and production disagree about what is done. A stage-gate project takes each machine through four gates — Install, Set up, Commission and Hand over — and answers “where are we, what is late and who owes what” from what is recorded, not from what is said. The tests, programs, runs, climb, pace, materials and handover each have a guide of their own below.',
    steps: [
      {
        step: 'Start the project',
        means: 'A stage-gate project is the new equipment on a line, taken to the day it is handed over to production. Its handover date is agreed once and never moves; the date now expected can.',
        doThis: 'Open Projects, press New project and pick Stage gate. Type its name, who leads it, which lines of the factory it is on, and — if there is one yet — Handover agreed. Press Create and add the machines.',
        youGet: 'A project that opens on Install, on its lines, with a handover date to be judged against.',
      },
      {
        step: 'Bring the machines in',
        means: 'The unit on the floor is the machine. Each one is on a line, and is a single record however many projects pass through it.',
        doThis: 'On Install add each machine: tap one the line already has, or type the name and who supplied it — or paste a list, one a line, with the supplier after a comma. For a machine that has not landed, open its Edit and give Expected on site; it reads “due on site” until it is here.',
        youGet: 'A row for each machine on Install, in the Machines tab and on its line, each with a place: due on site, or the gate it is at.',
      },
      {
        step: 'Plan the four gates',
        means: 'Install is the weeks from landing to running (positioned and levelled through to the dry run); Set up is programs, settings and guards; Commission is the tests each machine is proved by; Hand over is what production takes with it. Each stage is a step with a day and a person.',
        doThis: 'Give each machine the usual list of every gate in one tap — “every gate’s list at once” — then date each step and say who is doing it. Edit the list to the project: the usual stages are a guess, not a standard.',
        youGet: 'A grid of machines against stages, a square for each step, the timeline and the next two weeks filled from it.',
      },
      {
        step: 'Now',
        means: 'The front page. In the order a board is read: are we on target, what blocks handover, where each machine is, what is coming and what you owe.',
        doThis: 'Open Now. Read Are we on target? first — behind, at risk, on target — with the pace beside it. Then Blocking handover, The machines, Today and the next two weeks, and What you owe. Tap any row and it opens in a drawer.',
        youGet: 'The project’s state in one screenful, every figure the same as the Actions page, the report and the control room.',
      },
      {
        step: 'Run the day',
        means: 'A step is done, hit a problem, or did not happen; a test passed, did not pass or did not run. Everything else — late, blocked, handed over — is worked out from those.',
        doThis: 'Open the step or test from the grid or Now. A step: Done today (a sign-off asks Who signed it off?), Not yet, or Hit a problem. A test: Passed, Didn’t pass or Didn’t run. When something goes wrong press Hit a problem, then plan the fix with who and by when; fixed, plan the re-test.',
        youGet: 'A record that keeps what happened and who did it, a problem on the register with a fix attached, and the re-test planned from the failed one.',
      },
      {
        step: 'Hand over and tell people',
        means: 'A machine is handed over when its hand-over list is done and signed; the project is done when every machine is. Production can accept a line with things still open — the record says what.',
        doThis: 'Work through Hand over for each machine, then make the paper the reader needs from Report ▾ — the one-page status for the client every week, the full client report, the programs report, step and test cards.',
        youGet: 'A project that reads Handed over, with what it went with said beside it, and papers made from the records and never typed.',
      },
    ],
    watch: 'The record is the answer. A stage ticked in the app is done on the day it was ticked; a date moved later asks why and keeps the reason. Do not keep a second status in a spreadsheet.',
  },
  'FC-074': {
    intro: 'For tests that were being run without agreed criteria and argued about afterwards. Each acceptance test — FAT at the supplier, SAT on site — states what it passes on before it is run, and every attempt is recorded.',
    steps: [
      {
        step: 'Plan the test',
        means: 'A test is something done to prove a machine, on a day, against what was agreed. Commission shows every test machine by machine as a square each.',
        doThis: 'On Commission tap a machine’s + square for one of the usual tests — safety functions proven, runs with product at the agreed speed, packs to spec, rejects and checks proven, changeover in the agreed time, performance run at the agreed rate — or press Plan a test that is not one of the usual ones, say what you plan to do and pick the machines.',
        youGet: 'A test on each machine, booked for a day and open in the drawer.',
      },
      {
        step: 'Passes if — the expectation',
        means: 'The criterion, written before the day, that the result is measured against. Once written it moves only by the owner, so the verdict cannot be bent to suit the day.',
        doThis: 'In What we planned type the test, the machine, the day and Passes if — the expectation, and who it is Done with (the OEM, for a FAT). Make it measurable: “Seals at 60 a minute, no leaks over 100 packs”.',
        youGet: 'An agreed record on the test. Without one the card says “Nothing agreed in advance”, and the verdict has nothing to stand on.',
      },
      {
        step: 'What happened',
        means: 'The day it really ran is a separate field from the day it was planned, because the gap between them is usually the story. The verdict is one of four words.',
        doThis: 'Type the date it ran, what ran and the result, then press Passed, Didn’t pass or Didn’t run. A test that has run with no verdict is asked: Did it pass? — until someone answers. Photos and film go in as What we found on the day.',
        youGet: 'A verdict in words and colour on the board, the day it really ran and what was found.',
      },
      {
        step: 'What we do next',
        means: 'A test that does not pass is not the end of the record. The fix and the re-test hang off it and carry the machine, the product and the expectation forward.',
        doThis: 'Press Hit a problem and plan the fix with who and by when, then More ▾ › Plan the re-test. The re-test is a new attempt of the same test; the earlier one stays.',
        youGet: 'Every attempt of a test in order, with Follows and Led to links between them, and the board showing the latest.',
      },
      {
        step: 'Test cards and the report',
        means: 'The floor and the OEM need what each test had to show, on paper.',
        doThis: 'Report ▾ on Commission makes Test cards — a card for every test on the board — and the Programs report. A test’s own record makes its card too.',
        youGet: 'A card a test, each saying what it had to show and what it did, numbered by page.',
      },
    ],
    watch: 'Write Passes if before the day, not after. A criterion typed once the numbers are in is an opinion.',
  },
  'FC-075': {
    intro: 'For programs — the product settings and recipes a machine has to run — that are said to be proved without the runs to show it. Each program is tested at a speed, again if need be, and the page keeps every attempt in order.',
    steps: [
      {
        step: 'Add the program',
        means: 'A program is what a machine runs for a product. Programs sit under their machine on the Programs page, or on a line with no project at all.',
        doThis: 'On Programs press Add a program, or use + Add a program to the machine under that machine. Type its name or number — “PR-12 Express 1.25 kg” — and say which machine it is for.',
        youGet: 'A row for the program, with its status in words and colour. Chips along the top filter by where programs stand: Needs you, Failed, Late, No program, Not tested, At baseline, To do and Passed or done.',
      },
      {
        step: 'Test it',
        means: 'A test says how a run went. It aims at a speed — the speed the machine is set to run at — and may carry a net rate to achieve as a second, optional aim. The net rate it actually made is worked out afterwards.',
        doThis: 'On the row press Test it. Choose Passed, Didn’t pass or Didn’t run. Type Aiming for and Aiming to run, and after the run Set at, Ran for, Packs and Rejects. Add What was seen and the day it ran, then Save. Not run yet? Book it for a day instead.',
        youGet: 'A test on the program, and Commission’s board showing it. Each attempt reads in words: what it aimed at (“aiming 55 ppm for 60 min”), then what it did (“set at 50 ppm · ran 30 min · 1,480 packs · 12 rejects · netted 48.9 ppm”).',
      },
      {
        step: 'The journey',
        means: 'Programs are not passed or failed once. A program is tested at 50 a minute, passes, and is then tested at 55: each attempt is kept, with its own aim and its own result.',
        doThis: 'Press Go again for the next attempt. It starts from the aim as it stands. Open any attempt to see what it met and what it missed — a test can miss its net rate and still have met its speed, length and rejects.',
        youGet: 'Every attempt in order. A pass proves the program on the day it ran; a later attempt that does not pass leaves that proof standing.',
      },
      {
        step: 'Proved, or judged on criteria',
        means: 'Proved always needs a day and what showed it. A program can instead be judged by criteria you pick — a run test, a capability study, a reliability study, a changeover time — and signed off by two names when all pass.',
        doThis: 'On a row, Prove asks the day and what showed it: in words, or a study on the line. For criteria, + Pick its criteria, make or pick the studies, then sign off once each passes.',
        youGet: 'A program that reads Proved with its day, or “0 of 2 criteria passed” until it is signed. The Programs report prints the lot, machine by machine.',
      },
    ],
    watch: 'A program proved by a pass at 50 a minute is proved at 50. If the line must run it at 55, test it at 55 — the page keeps both.',
  },
  'FC-076': {
    intro: 'For the acceptance moment: did the line run at the agreed rate, with the rejects the contract allows? Each product is run, the numbers off the machine are typed in, and the page works out the net rate and the verdict.',
    steps: [
      {
        step: 'Plan the run',
        means: 'A performance run is a test that holds a list of products. Several products are run on the day, so you plan them ahead and fill the numbers in on the line.',
        doThis: 'On the performance run test press + Add a product run. For each product type the Product, the Net rate in packs a minute, how long it is to run For in minutes, and Rejects at most as a percentage. Press Save and the form is ready for the next, with the agreed numbers carried over.',
        youGet: 'A row for each product, planned and waiting. The agreed numbers are written once by the team and then kept by the owner.',
      },
      {
        step: 'What it did',
        means: 'On the day type what the counter and the clock said. The net rate is good packs — packs made less rejects — over the minutes run; you do not type it.',
        doThis: 'Open the row and fill Ran for, Packs made, Rejects, Ran at and Stood. Add What was seen.',
        youGet: 'The Net rate worked out, the reject percentage, and each agreed number judged on its own.',
      },
      {
        step: 'Passed or didn’t pass',
        means: 'A product passes when every agreed number is met. The test’s verdict follows from its products: all met is passed, any short is didn’t pass. You can overrule it, and the page says so when you do.',
        doThis: 'Read the line over the list — “2 of 3 products run — 1 passed, 1 didn’t pass” — then each row, where only the number that missed is red and says how far, such as 1.6 ppm short. A product short on its rate offers Run it again.',
        youGet: 'A verdict from the numbers, a pass or didn’t pass for each product, and the gaps in words.',
      },
      {
        step: 'In money',
        means: 'A product short on its rate left packs unmade. Priced at the line’s margin a pack, that is the contribution it cost over the run.',
        doThis: 'Set up the line with a margin a pack. Without one the page still says the packs short and asks for the margin; nothing waits on it.',
        youGet: 'A line such as “3 ppm short: 180 packs over the 60 min run — £90 contribution”, and a day of the line’s shifts at that shortfall. Rejects over the allowance are counted, not priced here.',
      },
    ],
    watch: 'Agree the rate, the length and the reject allowance before the run. The numbers typed on the day are judged against what was written, not against what looks reasonable afterwards.',
  },
  'FC-077': {
    intro: 'For the question production asks of a new line — when will it be at rate? Each run of a product is a dot on a climb, and the page says when the climb meets the agreed rate.',
    steps: [
      {
        step: 'Agree the rate and run it',
        means: 'The climb is made from the runs themselves: each product on each machine, in the order it ran. Nothing new is typed.',
        doThis: 'Plan each performance run with its agreed rate and give every run its day and its numbers. Run the product again after each fix; Run it again on a product that fell short repeats it.',
        youGet: 'The runs, dated, with their net rates — the points of the climb.',
      },
      {
        step: 'Read the climb',
        means: 'Each run’s time per pack falls by a steady share every time the number of runs doubles, so the curve flattens as it goes. The page fits that and says where it meets the agreed rate: a projection, never a promise.',
        doThis: 'Under the run’s products read each climb — “Finest Red 2kg: 52 → 56 → 58 a minute over 3 runs — at this climb, the agreed 60 about Fri 14 Nov (run 5)”. Two runs say too early to say when; from three it is fitted.',
        youGet: 'A picture — the runs as dots, the agreed rate dashed, the fitted curve dotted — and a sentence: at the agreed rate, climbing, too early, or not climbing.',
      },
      {
        step: 'What the climb has cost',
        means: 'Every run below the agreed rate left packs unmade. Added over the runs that know their minutes, that is what the climb has cost so far.',
        doThis: 'Give each run its minutes, and the line a margin a pack. Without a margin the page still says the packs and asks for it.',
        youGet: 'A line such as “The climb so far: 1,200 packs below the agreed 60 over 3 runs — £600 contribution”. A run before 24 October with no minutes is not counted.',
      },
    ],
    watch: 'A flat or very slow climb is said as not reaching the rate, with no date. Take that as the signal to fix something, not to wait.',
  },
  'FC-078': {
    intro: 'For when the handover date is a hope. Nobody types the forecast: the pace the project has actually kept makes it, and the page says when Hand over lands at that pace.',
    steps: [
      {
        step: 'Where it shows',
        means: 'The pace is said beside “Are we on target?” on the front page, the day and the client report, and as a marker on the timeline. It never moves a date and never changes the verdict; it is said beside them.',
        doThis: 'Open Now. The line under Are we on target? reads “At the pace so far, Hand over lands about Fri 14 Nov — 3 days after the date agreed”, with its working: “8 stages and tests done in the last 2 weeks · 7 to go”.',
        youGet: 'A forecast date, how many days it is from the date now expected (or the date agreed), and the count it came from.',
      },
      {
        step: 'What it counts',
        means: 'The rate is the stages and tests done in the last two weeks divided by the days counted; the work left is every stage and test not yet done. It counts what was done on the day, never what was planned — so a slipped plan cannot hide.',
        doThis: 'Keep the record honest: tick each step the day it is done. A fix is found work and is not counted; every stage weighs the same.',
        youGet: 'A pace that moves as the work does, in calendar days, weekends included.',
      },
      {
        step: 'When it will not say',
        means: 'It says so rather than guess. Under five done or under a week since the first day it says too early; with nothing done in the last two weeks it says so and gives no date.',
        doThis: 'If it says it can’t say when yet, read why: a machine with nothing on its list, or with no arrival date. Add its stages and its date. A machine still to arrive holds the forecast back, at the pace.',
        youGet: 'A named reason and the machine to fix, or a forecast once the lists are complete.',
      },
      {
        step: 'Acting on it',
        means: 'The handover date agreed never moves. The date now expected can, and a later date asks why.',
        doThis: 'On Commission the owner presses Dates, and when the forecast shows a slip moves Handover now expected, giving the reason when asked.',
        youGet: 'An expected date with the reason kept, and the forecast measured against it.',
      },
    ],
    watch: 'It is a count, not a schedule. Eight easy stages and two big tests weigh the same, so read it as a pace, and add the big ones as separate steps.',
  },
  'FC-079': {
    intro: 'For the part, film or section that stops the installation because nobody chased it. A list of what the project is waiting for, with the day each is due and whether it has arrived.',
    steps: [
      {
        step: 'Add what you need',
        means: 'A material is three facts: what it is, when it is due, and whether it is here. It is not a stock system — no quantities to keep right, no receipting.',
        doThis: 'On Materials open Add what you need. Type What it is — “TESC03163A Finest Red 2kg” — How much in your own words (“10 reels”), the Due day, which line it is For and who it is From. Leave the day empty when none has been agreed.',
        youGet: 'A row for each, in the order of what is holding you up: late first, then what is coming, then what nobody has dated, then what is in.',
      },
      {
        step: 'Mark it in',
        means: 'When it arrives the row is marked in on the day it came. Nothing is locked: a wrong day is changed, and Not in after all puts it back.',
        doThis: 'Press Mark it in, check the day and press It’s in. To move a due date later, change the date; the page asks why and keeps the reason.',
        youGet: 'A green row with the day it came, and a week strip running from the week it was due.',
      },
      {
        step: 'Late, waiting, no date',
        means: 'Late is past the day it was due and not here; waiting is due and not yet; no date means nobody has said when, which is itself a problem.',
        doThis: 'Read the tiles — Here, Late, Waiting with the next due, No date — and the closing line. Chase the late ones first, and get a date on the ones with none.',
        youGet: 'How many are here of how many needed, how many days late each one is, and the Materials report, one page, from Report ▾.',
      },
    ],
    watch: 'A thing with no date looks fine in a count and holds a project up all the same. The No date tile is amber for that reason.',
  },
  'FC-080': {
    intro: 'For the end of a project: production takes a line with things still open and no record of what. Each machine has a hand-over list, signed by someone and dated, and the record says what was open when it was signed.',
    steps: [
      {
        step: 'The hand-over list',
        means: 'What production takes with the machine. The usual list is a place to start: manuals and drawings handed over, operators and engineers trained, spares list agreed, safety sign-off (PUWER) and client signed off. Each item is a step like any other, with a day and a person.',
        doThis: 'On Hand over give each machine its list and date each item. Edit the list to the project. If the line has line standards, they are handed over here too, product by product.',
        youGet: 'A grid of machines against hand-over items, and tiles Done, Late, Problems and Not added yet.',
      },
      {
        step: 'Sign it off',
        means: 'A sign-off is a hand-over line that asks who accepted it. The record also keeps what was still open on the machine at that moment, so afterwards anyone can read what was accepted.',
        doThis: 'Open an item. A sign-off asks Who signed it off? and you press Signed off today; other items are Done today; Not yet says what you are waiting for and whose it is. Hit a problem raises one against it.',
        youGet: 'The item done, with who and when, and “Signed off 3 Nov with 2 still open — Fix: …” written into its account.',
      },
      {
        step: 'Handed over, with what open',
        means: 'Nothing is blocked: a machine reads Handed over when its hand-over list is done, and what it was handed over with is said beside it — tests not passed, steps not done, fixes open.',
        doThis: 'Read the page’s tiles — Done, Late, Problems, Not added yet — and on Now the machine’s place, which reads Handed over with what it went with beside it. Close what can be closed; the rest is on record for whoever takes the line.',
        youGet: 'The project done when every machine is handed over, and the line standards handed over with it. Item cards are made from Report ▾; the handover paper itself is not offered in the menu now, though its address still opens.',
      },
    ],
    watch: 'Production can accept a line with things open. The point is that the record says which, who accepted, and when.',
  },
  'FC-081': {
    intro: 'For problems seen on a walk that get forgotten or lost in notebooks. Film the line, freeze a frame at each machine, and pin each problem on the picture — it lands on the problems register with its place, its priority and its journey.',
    steps: [
      {
        step: 'Film the walk',
        means: 'A walk is the line filmed from infeed to outfeed, in clips if the line is long, kept in walk order. It is the picture every problem is pinned on.',
        doThis: 'From a line’s tools, or on Install under The line, filmed, open the walk and press Film the walk. Or Upload videos you filmed on your phone. Name each clip and put them in walk order.',
        youGet: 'Segments in walk order, converted so they play on a laptop as well as a phone.',
      },
      {
        step: 'Mark each machine',
        means: 'Marking freezes the frame where a machine is clearest and gives it a name, so the footage and the line’s machine list are one spine.',
        doThis: 'Open a clip, scrub to a machine and press Mark a machine. Pick it from the line’s machines or type a new one (it joins the line’s list), add its code if it has one, and press Save & add problems, or Save & mark another.',
        youGet: 'A still for the machine with a marker on the clip’s timeline, and the machine listed under Machines marked in this clip.',
      },
      {
        step: 'Pin the problem',
        means: 'A problem has a place: the spot on the picture. Pinned, it shows as a dot on the frame and the frame shows the problem.',
        doThis: 'On the machine’s picture press Add evidence — or Raise a fix here, on a project — or tap the picture where the problem is. Say what is wrong, a proposed solution, who owns it and by when, and add a close-up photo. Make it a fix turns it into one with an owner and a day.',
        youGet: 'A problem on the register, priced and tracked, with its photo and its pin; open ones counted on the clip and on the machine.',
      },
      {
        step: 'Close the loop',
        means: 'A problem is closed with what was done and, ideally, an after photo, so the walk can be shown again later and the difference seen.',
        doThis: 'Open the problem, set its status, the day it closed, a note of what was done and the After photo. Through time shows a machine’s frames side by side.',
        youGet: 'A journey of improvement on each problem, and cards and reports from the Problems page for the meeting.',
      },
    ],
    watch: 'Film the line in the order the product flows. Marked in walk order, the frames tell the story from infeed to outfeed; marked out of order, they do not.',
  },
};
