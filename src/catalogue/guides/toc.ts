/* GUIDES — Theory of Constraints: the tools that keep a line's constraint fed and its losses at the constraint (src/catalogue/guide.ts).
 * Each says, in the page's own labels and the order a person meets them, what the step means, what to do and what you get. */
import type { Guide } from '../guide';

export const TOC_GUIDES: Record<string, Guide> = {
  'FC-046': {
    intro: 'For a line where one machine stops and the next one stalls — the filler stops and the bagger starves, the bagger stops and the case packer blocks. It says how long the conveyor or table between them can cover a stop, how long it takes to come back, and which stops ran past it.',
    steps: [
      {
        step: 'Can collect after',
        means: 'How many packs, trays or bags can sit on the conveyor or accumulation table between this machine and the next one without either of them having to stop. It is the room that lets a short stop pass.',
        doThis: 'On each station of the Line capacity sheet, type what can collect after it, in that station’s own unit — worked from the conveyor’s length and the pitch of the pack, or counted when it is full. Leave it empty where nothing can collect.',
        youGet: 'The buffer the block works from. With none written down, the block only says what to write — it will not guess a buffer.',
      },
      {
        step: 'The stops',
        means: 'The stops the floor timed in Capture on each machine over the last four weeks. The block reads them; there is nothing to type here. A changeover is the whole line’s planned stop and a wait is a neighbour’s, so neither counts as that machine’s own.',
        doThis: 'Keep timing stops at the machine in Capture as you do now, naming the machine the same way as on the sheet. Five or more stops on a machine are wanted before a buffer is sized from them.',
        youGet: 'A list of each machine’s own stops with their lengths, which the buffer is tested against.',
      },
      {
        step: 'Holds',
        means: 'The minutes of the bottleneck’s work that what can collect covers: the packs that can sit there divided by how fast the bottleneck eats them. A stop shorter than this costs the bottleneck nothing.',
        doThis: 'Read it against the machine’s usual stops. If the buffer holds 6.7 minutes and the machine often stops for ten, the buffer is too small for the stops you really have.',
        youGet: 'A number of minutes per machine beside the bottleneck, and the weakest link named — the smallest cover.',
      },
      {
        step: 'Back in',
        means: 'How long the buffer takes to refill after it has been run down — the packs it holds divided by how much faster the stopped machine runs than the bottleneck. A buffer that is not back before the next stop gives less cover next time.',
        doThis: 'Compare it with how often the machine stops, which the page works out when the planned hours a week are on the sheet. If it takes longer to come back than the machine goes between stops, the buffer is never full: the fix is the margin (how much faster the machines either side run), not a bigger buffer.',
        youGet: 'Minutes to come back, and a plain sentence saying whether it is back before the next stop.',
      },
      {
        step: 'Ran past',
        means: 'How many of the logged stops were longer than what the buffer holds, so the bottleneck starved or blocked for the rest, and what that cost: the minutes, the packs not made and the pounds.',
        doThis: 'Read the count first — 4 of 10 — then the packs. Those are the stops to attack (shorter stops) or to cover (a bigger buffer). It is amber only when stops ran past the cover.',
        youGet: 'The minutes, the packs and, with a margin on the line, the pounds the bottleneck lost to stops its buffer could not cover.',
      },
      {
        step: 'Would hold',
        means: 'The buffer that would have covered the machine’s usual long stop — the stop that 9 in 10 were shorter than — worked as that length times the bottleneck’s speed. It needs five or more logged stops.',
        doThis: 'Compare it with what is written under Can collect after. If it is far bigger than the room you have, shorten the machine’s long stops instead.',
        youGet: 'A number of packs: the buffer that would cover the usual long stop, and how many more than today’s it is.',
      },
      {
        step: 'In money',
        means: 'What the starved minutes cost: a minute lost at the bottleneck is a minute of the whole line, so it is the packs not made times what a pack earns. If it can be made up later, it is not a loss.',
        doThis: 'Give the line a margin a pack in Set up the line (or the product its price and materials). Both are optional — leave them out and the page still says the packs and names the one thing missing.',
        youGet: 'The pounds of contribution lost to stops the buffer could not cover, said “if it cannot be made up”.',
      },
    ],
    watch: 'A buffer sized for the average stop is too small for the long ones — and the long ones are the ones that cost output. Size it against the longest usual stop, and check it comes back before the next one.',
  },
  'FC-056': {
    intro: 'For a line that runs, but slower than it should — and nobody can say by how much, or whether it is slow running or lots of tiny stops. It splits the two, says which costs more, and what each would be worth.',
    steps: [
      {
        step: 'The count',
        means: 'A shift counted on the Loss count: the planned minutes, the good packs made, the rejects, and the plate speed of the machine that sets the pace. The stops timed in Capture for that window are read in for you.',
        doThis: 'Count the shift as you do now — good packs and planned minutes at the end of the shift. Nothing extra is typed for the speed loss to appear.',
        youGet: 'The minutes lost against the plate speed, with the stops, changeovers and rejects taken out. What is left over is the speed loss: slow running and short stops together.',
      },
      {
        step: 'The running speed — timed while it runs',
        means: 'How fast the machine really goes when it is running, with no stop in the way. Count the packs off it for a timed minute. It is the one measurement that tells slow running from short stops.',
        doThis: 'While the machine is running, count the packs it makes in a minute (or 60 seconds) and add the timing. A second timing on another product or setting makes the figure firmer. Do not time it right after a stop.',
        youGet: 'A running speed, and the split of the speed loss: slow running (the speed it runs at) and short stops (stops too short to time). Without it the two stay one lump and the page says so.',
      },
      {
        step: 'Slow running and short stops',
        means: 'Slow running is time lost because the machine runs below its plate speed. Short stops are the jams and mis-feeds too short to write down — a few seconds each, many an hour. They need different fixes.',
        doThis: 'Read the sentence first: it says each in minutes and packs, which costs more and what that means. Slow running costs more: look at the speed setting or the product. Short stops cost more: count the jams by reason.',
        youGet: 'The two in minutes and in packs at the plate speed, the running speed as a share of the plate, and which one is the bigger — or that they cost about the same.',
      },
      {
        step: 'Short stops counted',
        means: 'How many of those tiny stops you counted over a stretch of running, and for how long you watched. From that the page works out how often they come and how long each lasts.',
        doThis: 'Tap them as they happen on a reliability study for the machine (a count called Short stop or Jam), then press Use these on the Loss count — or type how many you counted and in how many minutes of running. A watched hour, repeated, is enough.',
        youGet: 'The short stops an hour and how long each lasts — about 6 an hour at 50 seconds each — so you know if it is a few long jams or many tiny ones.',
      },
      {
        step: 'In money',
        means: 'What each loss costs: a minute lost on the machine that sets the pace is a minute of the whole line, so it is the packs not made times what a pack earns. The idle crew is a second figure, kept apart.',
        doThis: 'Give the line a margin a pack and its crew and wage in Set up the line. Both are optional — leave them out and the page still says the minutes and packs, and names what to add.',
        youGet: 'The lost contribution and the idle labour for slow running and for short stops, said as “if it cannot be made up”, and what running under the plate does to the crew’s labour a pack.',
      },
    ],
    watch: 'A running speed timed once, for one minute, on one product is one reading. Time it again when the product or the setting changes — and never time it straight after a stop.',
  },
  'FC-039': {
    intro: 'For the start of an improvement project on a packing line, when you know where the time goes but not what a realistic cut is worth. Slide a share off each top loss and see, a shift and a week, the hours, the packs and the pounds that come back — and where they do not.',
    steps: [
      {
        step: 'The losses',
        means: 'The line’s biggest losses from the shifts counted over the last six weeks — each stop reason on a machine, and the changeovers — as the waterfall of the loss count ranks them.',
        doThis: 'Nothing to type: count shifts on the Loss count as you do, and log the stops in Capture. The page needs at least one counted shift with stops, and the line’s Line capacity so it knows which machine holds the line.',
        youGet: 'Up to six levers, biggest first, each with the minutes a shift it costs and a tag where it is on the machine that holds the line.',
      },
      {
        step: 'Take down by',
        means: 'The share of a loss you think a project could really remove — a fifth off breakdowns, half off changeovers. It is a what-if, not a promise.',
        doThis: 'Slide a loss down by the share you believe, in tens. Try the cautious figure and the hopeful one. The sliders write nothing: leave the page and they reset.',
        youGet: 'The minutes that would come back a shift, and below the sliders the plan in one sentence: a shift, a week, hours, packs and pounds.',
      },
      {
        step: 'At the constraint, and off it',
        means: 'The constraint is the machine that holds the whole line. A minute got back there is a minute of output for the line. A minute got back anywhere else is only a minute — the line makes no more, because it is held at the constraint.',
        doThis: 'Look at the tag on each lever. For one off the constraint the page says “not one more pack” and names where the prize is. Aim the project at the losses on the constraint first.',
        youGet: 'Packs only for the losses that cost the line output, and a plain note on the rest — which stops the team spending months fixing something that gives nothing back.',
      },
      {
        step: 'A week in money',
        means: 'The packs and pounds a week the plan is worth, kept in two figures that are never added: the contribution the packs earn (only at the constraint) and the idle labour the crew costs while the line stands.',
        doThis: 'Give the line a margin a pack and its crew and wage in Set up the line, and set how the line runs (shifts a day, days a week) on its SMED. All optional — leave one out and the page names it instead of guessing.',
        youGet: 'Hours, packs and pounds a week for the plan, each said “if it cannot be made up”, and what to give for anything still missing.',
      },
      {
        step: 'Recovery plan on paper',
        means: 'The plan as it stands on screen, as a page for the project meeting: the levers chosen, where the line is held, where the prize is and how it is known.',
        doThis: 'Press Recovery plan on paper once the sliders say what you would take to the meeting. It prints what you see; slide again and press again for another version.',
        youGet: 'A one-page paper with the plan’s sentence, each lever’s line and the number of shifts it stands on — the basis for a project’s target.',
      },
    ],
    watch: 'A share is a what-if. The minutes only come back if the cause is fixed, and a minute at the constraint is only output if there is demand for the packs and the line is not then held somewhere else.',
  },
  'FC-045': {
    intro: 'For a shared station that product waits for — the spiral freezer, the wrapper, the metal detector — when the answer people reach for is to run it harder. It shows why the wait explodes near full load and what less variability, or a little less load, would buy.',
    steps: [
      {
        step: 'The station and its machines',
        means: 'The one place work waits for, and how many identical machines take from the same queue. Two wrappers fed from one conveyor are one station of 2 machines; machines that do different jobs are separate stations.',
        doThis: 'Name the station so the sentences read right, and type how many identical machines share the queue (1 unless you say more).',
        youGet: 'A station the page can work out the wait for, named in the answer.',
      },
      {
        step: 'Work arriving',
        means: 'How many units reach the station an hour — what really arrives, not the rated speed of what feeds it. Together with how long each takes, it says how busy the station is.',
        doThis: 'Count what arrived over a few ordinary hours and divide. If the figure is more than the station can do, the page refuses to give a wait and says so: there is no steady queue, only a growing pile.',
        youGet: 'The utilisation: the share of its time the station is busy, as a percentage.',
      },
      {
        step: 'How its own time is known',
        means: 'The station’s effective time for one unit, and how much that time varies. Either you timed its cycles, or it runs a fixed cycle and stops — in which case its stops make the variability, and the page works it out from them.',
        doThis: 'If you timed cycles, type the average time for one unit with its stops and slow running in (not the plate’s), and how much it varies — the spread of the timed cycles divided by their average, from tens of timings. If it runs a fixed cycle, choose that and give its cycle, how long it is up, and how long an average stop lasts.',
        youGet: 'The station’s effective process time and its variability, said as low, moderate or high.',
      },
      {
        step: 'How much the arrivals vary',
        means: 'Whether work arrives steadily or in lumps. Batches arriving together make a station queue far more than the same number arriving evenly.',
        doThis: 'Take the gaps between units arriving, and divide their spread by their average. A conveyor fed by one steady machine arrives much like that machine’s own variability. Do not guess: with no figure, the page will not work out the wait.',
        youGet: 'The second of the two variabilities that the wait is made of.',
      },
      {
        step: 'Wait in the queue',
        means: 'How long a unit waits before the station starts it — variability times utilisation times the process time — and, by Little’s law, how many units stand in front of it. The curve shows why: the wait bends sharply up as the station nears full load.',
        doThis: 'Read the sentence, then the curve with the station marked on it. Then the lines under it: what a little less load buys, and what halving the variability buys. Slide one figure in the what-if and watch the curve.',
        youGet: 'The wait in minutes and in process times, the time through, the units waiting, and what changing load or variability would do.',
      },
      {
        step: 'In money',
        means: 'The two ways of paying for the wait, side by side: the waiting stock tied up (and what holding it costs a year) and the spare capacity of the people who stand at the station when it waits for work.',
        doThis: 'Give what a unit has cost by now, the cost of holding stock for a year (finance has it), the people at the station and what one costs an hour. All optional — leave one out and the page names it instead of guessing.',
        youGet: 'The queue in pounds, the crew standing, and what running at 85% would cost in idle time against the wait it saves.',
      },
    ],
    watch: 'It is an approximation for one station in a steady state: close below about 90% busy, and it understates the wait above that. Use the effective process time with the stops in — the plate speed makes the station look less busy than it is.',
  },
  'FC-179': {
    intro: 'For the planner on Monday with a list of orders and a question: will every one make its day? You type the orders in the order the line will run them and it lays them on the constraint with the changeovers between them.',
    steps: [
      {
        step: 'The week starts',
        means: 'The first day the line runs. The week is as long as the line runs — five days Monday to Friday, six to Saturday, seven every day — taken from how the line runs on its SMED.',
        doThis: 'Leave it on today, or pick the Monday you are planning. If the page says the running pattern is not set, set it on the SMED first — the week is never guessed.',
        youGet: 'The days and minutes the orders are laid on, and the rate the line is planned at (what four shifts in five proved, not the plate speed).',
      },
      {
        step: 'Add the order',
        means: 'One order is a product, a quantity and the day it is due. The products are the ones that have a Line capacity, because that is where the speed comes from.',
        doThis: 'Pick the product, type the quantity in packs and the day it is due, then Add the order. Add the rest in any order, then move them with ▲ ▼ into the order the line will run them.',
        youGet: 'A numbered list in the order given, each with when it starts and ends and whether it is on time.',
      },
      {
        step: 'The sentence',
        means: 'The answer in one line: the hours of running and of changeovers, the hours the line runs, whether it all fits with how much is spare or over, and which orders are late against their day.',
        doThis: 'Read it first. Amber is an order late; red is a week that does not fit. Then move an order, change a date or a quantity and watch it change.',
        youGet: 'A yes or no for the week, and the orders to move.',
      },
      {
        step: 'Changeovers',
        means: 'The minutes taken off the constraint between two different products, from what the SMED agreed as the standard for the product changed into. It says how each is known.',
        doThis: 'If a changeover is not timed the page says so and takes nothing off for it — time it on a SMED and agree it as the standard.',
        youGet: 'The changeover time in the week, and with a margin a pack, the packs and pounds it costs if it cannot be made up.',
      },
      {
        step: 'The money',
        means: 'What not fitting costs, in two parts that are never added: the contribution of the packs not made, and the crew’s time to make them all at its normal rate.',
        doThis: 'If the page asks for a margin a pack or the crew and a wage, give them in Set up the line. The hours and packs are said without them.',
        youGet: 'Pounds beside the hours, each saying what it is and that it is "if it cannot be made up".',
      },
      {
        step: 'The week’s plan on paper',
        means: 'The same sentence and one line a run on a page, for the planning meeting.',
        doThis: 'Press The week’s plan on paper once the orders are in the order you mean.',
        youGet: 'A page to put on the wall: each run, when it starts and ends, what is late, and how it is known.',
      },
    ],
    watch: 'The order you type is the order that is laid — it is not sorted for you, so a late order is a question about the order, not a fault in the sum. Which order is best is yours to choose.',
  },
  'FC-043': {
    intro: 'For a line with one constraint that must never wait for work. Drum, buffer, rope: the constraint sets the beat, a time buffer protects it, and work is released a buffer ahead of when the constraint needs it. It tells you which order to chase before anyone shouts.',
    steps: [
      {
        step: 'The buffer',
        means: 'How many hours of the constraint’s running time are held ahead of it — the film, trays, labels, kit and product for a run staged that far ahead. It is counted in the constraint’s own hours, not the clock.',
        doThis: 'Type a start: about half the time it now takes from release to the constraint. It is tuned later from what actually arrives.',
        youGet: 'Each order’s place in the buffer, and the stock it holds in front of the constraint.',
      },
      {
        step: 'Done',
        means: 'How far through the run the constraint is. The drum’s place now is the first order not done, that far through.',
        doThis: 'At the start of the shift type the percent done on the order running; an order finished leaves the list at 100.',
        youGet: 'Where the drum is, so every later order shows how close it is.',
      },
      {
        step: 'Plenty, Watch, Expedite',
        means: 'Plenty is under a third of the buffer gone, Watch a third to two thirds, Expedite two thirds or more and the work has not arrived. Each says so in words as well as colour.',
        doThis: 'Chase the Expedite orders first — find what each is waiting for upstream. Watch ones need no push yet.',
        youGet: 'A red list of what to chase now, and what a hole in the drum would cost if it never arrived.',
      },
      {
        step: 'Release',
        means: 'The rope: an order is released when the drum is a buffer’s length from starting it — not earlier, which piles up stock, and not later, which leaves a hole.',
        doThis: 'Release each order at the point the row says, in the drum’s words, such as "when Tesco is 29% done".',
        youGet: 'When to release the next order, without a clock.',
      },
      {
        step: 'Arrived',
        means: 'Work has reached the front of the constraint. The page notes how much of the buffer was gone when it came.',
        doThis: 'Tap Arrived on the order when its material and product are staged at the constraint.',
        youGet: 'The record the buffer is tuned from.',
      },
      {
        step: 'Tuning',
        means: 'After ten arrivals, mostly in plenty of time and almost none red, the buffer is longer than it needs to be and holds extra stock; if many came in the red, it is too short or something upstream is late.',
        doThis: 'Try the length it suggests for a few weeks, then look at the arrivals again. Under ten arrivals it will not suggest a change.',
        youGet: 'A buffer length the arrivals support, and less stock when it can shorten.',
      },
    ],
    watch: 'A week of arrivals proves nothing — wait for about ten before changing the buffer. And the percent done and the arrivals are taps from the floor: the page cannot see the machine.',
  },
};
