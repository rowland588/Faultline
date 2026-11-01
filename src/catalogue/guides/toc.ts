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
};
