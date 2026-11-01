/* GUIDES — the Kaizen event's Observe tools: the waste walk, the process flow chart, the spaghetti diagram and the video time study
 * (src/catalogue/guide.ts). Each says, in the page's own labels and the order a person meets them, what a step means, what to do there
 * and what you get — and nothing the page does not do. FC-021, FC-117 and FC-201 beside them: FC-117 and FC-201 are written elsewhere. */
import type { Guide } from '../guide';

export const KAIZEN_GUIDES: Record<string, Guide> = {
  'FC-005': {
    intro: 'For a walk of the line with the team — going to see, then saying which kind of waste each thing seen is, where it is and what it costs, so the list is ranked by money and not by who shouted loudest.',
    steps: [
      {
        step: 'Write the problem where you see it',
        means: 'A waste is a problem like any other on the register: a thing seen on the line that adds cost without changing the product. You do not make a second list for wastes — you write the problem, and say which kind it is.',
        doThis: 'Press Problem (or ＋ on a phone) at the machine, say what you see — “pallets wait for QA release” — take a picture if it helps, and put it on its line and machine. Do it on the walk, not afterwards from memory.',
        youGet: 'A problem on the register with its photo, its line and its machine, ready to be classed. Nothing yet says which waste it is.',
      },
      {
        step: 'Which waste is it?',
        means: 'Ohno named seven wastes and Liker added an eighth: transport, inventory, motion, waiting, over-production, over-processing, defects and unused talent. The class is for pointing at the right tool and the right cause — it is not for arguing which of two it is.',
        doThis: 'Open the problem and tap the one chip that fits best. A pallet standing for QA release is Waiting; film walked from the store is Transport; a second label check is Over-processing. If it is not a waste at all — a safety hazard, a breakdown — tap Not a waste. The page shows what the kind means and an example for food.',
        youGet: 'The problem carries its class and shows it on its row. A problem you have not classed stays “not classed yet”; one you tapped Not a waste is left out of the count.',
      },
      {
        step: 'Size it',
        means: 'A waste needs a size or it cannot be priced. Time wastes (waiting, transport, motion, over-processing) are sized in minutes a day; defects and over-production in packs thrown away a day; inventory in packs held. These are the three boxes already on the problem.',
        doThis: 'Type the minutes a day it costs the line, or the rejects a day because of it, or the packs on hold — one or more. An estimate from the walk is fine; the page will say it is an estimate. Leave a box empty if you do not know — nothing waits on it.',
        youGet: 'Under the boxes, the problem’s cost in the line’s own money: labour for the minutes, packs and contribution lost only if it stops the line, materials for rejects, and product held as money tied up.',
      },
      {
        step: 'By waste',
        means: 'The Problems page can group everything by kind. It ranks the kinds by what is lost a day, with the money in its parts — labour, packs lost, contribution, materials — never added into one number that hides which is which.',
        doThis: 'On Problems, tap By waste. Narrow it first to one line, one project or one person if you want that walk alone. Read the sentence at the top, then the rows from the biggest down.',
        youGet: 'A sentence like “7 open problems classed as waste. The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k contribution a day, most of it at Packer”, a row for each kind seen and the problems grouped under them.',
      },
      {
        step: 'Where they are',
        means: 'The same wastes by place — the machine each one is on. A place with several wastes of small size can matter as much as one big one, so the places are ranked too.',
        doThis: 'Read the line that starts “Where:”. Each machine shows how many wastes it has and what they cost a day. A problem on no machine counts as “the line”.',
        youGet: 'The places in order, biggest first — where to send the team first.',
      },
      {
        step: 'Where each one points',
        means: 'Each kind has its usual cure and the tool that measures it: waiting points to the stops Pareto and Andon calls; transport and motion to the spaghetti diagram and the process flow chart; inventory to kanban sizing. The page says if a tool is not built yet.',
        doThis: 'Read the line “… points to …” for the biggest kind and open that tool to measure it properly. The size on the problem was an estimate; the tool replaces it with a measurement.',
        youGet: 'The next tool to use, named, with its catalogue number — and a plain “not built yet” where there is none.',
      },
      {
        step: 'Put it right, and see it go',
        means: 'A waste walk that never closes anything is theatre. When a waste is put right, close the problem: it leaves the money and is counted as put right in the last four weeks.',
        doThis: 'Give the problem an owner and a day, do the fix, and close it with the proof. Come back to By waste after a week.',
        youGet: '“Last 4 weeks: 7 wastes raised, 3 put right, 4 still open” — the walk after the walk.',
      },
      {
        step: 'On paper',
        means: 'The Problems report carries the same walk, so the meeting sees what the page shows, and each problem’s report card names its waste.',
        doThis: 'Open Report ▾ on Problems and choose the Problems report. The block “The eight wastes seen” comes after the tiles. Print a card for any problem to put on the board.',
        youGet: 'A page that says the biggest waste, what each kind costs, where they are and what to use next — and the cautions: estimates are indicative, and waste is in the process, not the person.',
      },
    ],
    watch: 'Do not name a person as the waste. Waste is in the process; a walk that blames people ends the walks. And storage and inspection that the law or the HACCP plan requires are not waste to remove — they may be waste to shorten.',
  },
  'FC-004': {
    intro: 'For following one person’s round — the packer fetching film, cases and a scale — and seeing how far it is, how much of the shift it takes and which trips make most of it.',
    steps: [
      {
        step: 'Whose round',
        means: 'The diagram is of ONE person’s round (or one trolley’s): the places walked in order, back to where it started. Name whose it is so the sentence reads right.',
        doThis: 'Press New calculation under Spaghetti diagram, name the round — “Packer, flow-wrap line” — and follow the person on the floor with the phone, not from what they say they do.',
        youGet: 'A saved diagram ready for its first place. Nothing is made up: it stays empty until you type a place.',
      },
      {
        step: 'Place 1 and the places after it',
        means: 'Each place is somewhere the person stops — the line, the film store, the scale. Each leg is the walk from the place before; the metres are what was actually walked, paced, wheeled or taped.',
        doThis: 'Type the first place, then each next place with the metres walked to it and, if you like, what the trip is for (“Fetch film”). Legs with the same words become one trip, so the trips can be ranked. Come back to the first place to finish the round.',
        youGet: 'The next place’s boxes appear below as you name one, up to twenty; a leg with no length is named and left out of the sums, never given one.',
      },
      {
        step: 'Where it is on the layout',
        means: 'Optionally give each place its position on the plan — metres east and north of one corner — and the round is drawn to scale. Where a leg has no walked metres, the straight line between two positions stands in for it, and the page says so.',
        doThis: 'Measure from one corner of the plan or the floor. Give both numbers for every place, or leave them out and just type the metres walked.',
        youGet: 'The round drawn with each leg a line and each place a dot and a name, one metre the same length across and up, so the tangle is the real distance.',
      },
      {
        step: 'How many rounds a shift, and the pace',
        means: 'The shift’s walking is one round times the rounds in a shift, at a walking pace. The pace moves the minutes by about a quarter, so the page starts at the careful 1.3 m/s (loaded or crowded) and says what 1.6 m/s unloaded would give.',
        doThis: 'Type the rounds: packs a shift divided by packs a round, or count the rounds in a timed hour and scale up. Pick the pace that fits the walk, or time one on your floor and type it.',
        youGet: 'The sentence — “158 m a round; 36 rounds a shift is 5.7 km, 73 min of walking” — the tiles, the trips ranked by distance and the other pace’s minutes.',
      },
      {
        step: 'In money',
        means: 'The walking is the person’s paid time: minutes a shift at their hourly cost with on-costs, and a week from the shifts they work it.',
        doThis: 'Open In money and type the hourly cost (the line’s own is offered) and the shifts a week. Every box is optional; the page names any it still needs.',
        youGet: 'Labour a shift and a week spent walking — or the one sentence saying what to add. The distance never waits on it.',
      },
      {
        step: 'Question each trip, then compare',
        means: 'The diagram is the record; the improvement is asking of the longest trips whether what is fetched could come to the person — staged at the line — or be shared, shortened or taken out.',
        doThis: 'Press Save as the before. Change the legs to the new layout — the film trolley 6 m away instead of the store 42 m — and watch each tile say how much less.',
        youGet: 'A before → after on the same diagram: metres, minutes and pounds a shift, each in words.',
      },
      {
        step: 'On paper',
        means: 'The round drawn on a page to the same scale, with the trips, the working leg by leg, the money and what it does not say.',
        doThis: 'Open Report ▾ and take the paper to the layout; mark the trips to remove with a pen.',
        youGet: 'A page for the team and the sponsor, the same figures as the screen.',
      },
    ],
    watch: 'One person’s one round may not be typical: follow several and say the range. A straight line is a floor, not the way walked — type the metres where it is further. And walking is not all waste: some of it carries needed material.',
  },
  'FC-003': {
    intro: 'For following one thing — a tray, a pallet, an ingredient — from where it starts to where it ends, and seeing how many of its steps change it and how many only move it, check it or let it wait.',
    steps: [
      {
        step: 'What is it of?',
        means: 'The chart is of ONE thing’s path: one tray, one pallet, one batch of an ingredient. Name it by where it starts and ends, so anyone who opens it knows which path it is.',
        doThis: 'Press New calculation under Process flow chart and type the path’s name — “Tray, oven to despatch”. Pick the line it is on if you want the line’s wage offered later. Then follow the thing on the floor with the phone, not from the written procedure.',
        youGet: 'A saved chart with its name, ready for its first step. Nothing is made up: it stays empty until you type a step.',
      },
      {
        step: 'Step 1 is a',
        means: 'Every step is one of five kinds, drawn with its own symbol: an Operation changes the product (mixed, baked, packed); a Transport moves it; an Inspection checks or counts it; a Delay holds it unplanned (waiting for a forklift); a Storage holds it by design (a chill, a proving time).',
        doThis: 'For each thing that happens to the product, in order, tap the one kind that fits. If you cannot decide between Delay and Storage, ask whether it was meant to wait: a planned chill is Storage, a pallet nobody collected is a Delay.',
        youGet: 'The step is on the chart with its symbol, and the next step’s boxes appear below it.',
      },
      {
        step: 'Step 1 takes, and moves it',
        means: 'How many minutes the step took, and — for a transport only — how many metres the product was moved. These are the figures the whole chart is added up from.',
        doThis: 'Time the step with a clock or take it from the standard, and type the minutes; a transport also takes its metres, paced out on the floor or read off the layout. Leave a box empty if you do not know yet — the step still counts, and the page tells you which are missing.',
        youGet: 'Under the boxes, a plain warning for any step with no time or any transport with no distance — never a figure the page made up.',
      },
      {
        step: 'The chart and what it says',
        means: 'The steps down the page in the order they happen, each with its symbol, its words, its minutes and its metres — and above them one sentence and five tiles: how many steps, how much of the time is operations, how much is waiting, how far it travels.',
        doThis: 'Read the sentence first. Then look at the longest delay and the longest transport it names: those are the first things to ask “why is that there?” about. A chill that is meant to be there is counted as waiting but shown separately, so it does not hide the real delays.',
        youGet: 'A sentence like “14 steps: 4 change the product … 3.9% of the time is operations and 93% is waiting”, the chart, and a second share with the planned storage set aside.',
      },
      {
        step: 'In money',
        means: 'What the moving, checking and waiting cost: a person’s minutes on the transports and inspections at their hourly cost, and what holding the product costs while it waits, at the yearly rate finance uses for stock.',
        doThis: 'Open In money and type how many times a day the path is followed, the hourly cost of the person (the line’s own is offered), what one load is worth and the yearly holding rate. Every box is optional — leave any empty and the page says which one it still needs.',
        youGet: 'Labour a day on the moves and checks and what holding a load through its waits costs a day — or the one sentence saying what to add. The chart’s answer never waits on it.',
      },
      {
        step: 'Question it, then compare',
        means: 'The chart is the record; the improvement is the questioning after it. For every step that is not an operation ask why it is there, whether it can go, be combined with another, be moved, or be made simpler — then draw the path again as it would be.',
        doThis: 'Press Save as the before on the chart as it is. Then change the steps to the questioned path — take a delay out, shorten a transport — and look at the tiles: each says how many steps, minutes and metres fewer than the saved before.',
        youGet: 'A before → after on the same chart: steps fewer, time in operations up, waiting and metres down, each in words.',
      },
      {
        step: 'On paper',
        means: 'The same chart drawn on a page for the team and the sponsor: the symbols, every step’s words, minutes and metres, the sentence, the money and what the chart does not say.',
        doThis: 'Open Report ▾ on the chart and take the paper. Put it on the wall next to the line while the team questions the steps.',
        youGet: 'A page you can mark up with a pen — circle the delays, strike the transports that could go — and bring back to type the questioned path.',
      },
    ],
    watch: 'Draw what the product really does, not what the procedure says it should do — and do not call a planned storage waste. The delays and the long transports are the questions; the chill that the product needs is not.',
  },
};
