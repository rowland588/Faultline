/* GUIDES — lean manufacturing and waste (the discipline's tools; src/catalogue/guide.ts).
 * Written from each tool's real page, in the page's own labels and in the order a person meets them; the money a tool
 * says is always optional, and a missing input is named on the page, never invented. */
import type { Guide } from '../guide';

export const LEAN_GUIDES: Record<string, Guide> = {
  'FC-001': {
    intro: 'For a line where a product takes far longer to get through than the work in it should — it sits in holds, queues and between departments, and nobody can say where the time goes. Walk the line once, end to end, and the map shows it as a grid.',
    steps: [
      {
        step: 'Name the ends and the demand',
        means: 'Where the stream starts and finishes, and what the customer takes. From the demand and the hours worked the page works out takt — the pace one piece has to leave at to meet the customer — and it needs the demand to turn a pile of waiting pieces into days.',
        doThis: 'Press Name the ends and the demand under the title (once agreed it reads Change what it is held against, in More ▾). Type where it starts (the order released, film from stores) and where it ends (pallet away, the customer), what the customer takes a day from the order book or the despatch figures, and the hours the line works in a day. The page shows the takt as you type.',
        youGet: 'A sentence on the page “From … to …”, a Takt card, and every cycle held against takt. Left empty, the page says “No demand agreed yet” and waits are not turned into days.',
      },
      {
        step: 'Time the steps',
        means: 'You walk the line with the phone from the work starting to the pallet leaving. The time of each step is the time between your taps, so the stream is measured, not remembered.',
        doThis: 'Press Time the steps, then Start — as the first step begins. Say what happens, who does it and where, and pick Operation, Move or Check. When the step ends, tap what it was — VA, NE or NV — and that one tap saves it with its time and starts the next. Last step — finish ends the walk; Undo the last step takes back a mistap.',
        youGet: 'A column in the grid for each step, timed, and a running tally on the clock: “3 VA · 1 NE · 2 NV so far”.',
      },
      {
        step: 'Type the waits and the steps you did not watch',
        means: 'A stopwatch cannot see an order sitting for two days, so a wait is typed. A wait can be typed as a time, or as the pieces waiting — then the page works the time out from the customer’s daily demand.',
        doThis: 'Press + Add a step. Say what is done, who does it (one or more) and where. Pick the kind — Operation, Move, Check, Wait or Store. Type how long the work takes (“6 s”, “20 min”) and how long it waits after (“40 min”, “2 d”), or the pieces waiting after it: 600 cases waiting at 300 a day is two days.',
        youGet: 'The step in the grid with its work and its wait. The box reads your time back (“= 40 min”) or tells you it is not a time.',
      },
      {
        step: 'VA · NE · NV',
        means: 'VA adds value: the work changes the product the way the customer wants it. NE is necessary but adds no value: a legal check, a changeover. NV (non-value adding) is waste: the re-pack, clearing a jam, walking for cases. Only an operation can be VA; a wait or a store is NV by definition and has no buttons.',
        doThis: 'Tap a step’s letter in the Classification row. Its panel opens with three big buttons: tap one and it goes on to the next step nobody has classified; tap the lit one again to clear it. Next unclassified › skips ahead; on a desk the keys are V, E, N and the arrow keys.',
        youGet: 'A coloured letter on every step. When none is left, the panel ends on the counts, the share of the lead time that adds value and the lead time.',
      },
      {
        step: 'The grid and what it says',
        means: 'Lead time is every step’s work plus what waits after it, from start to customer. % value added is the time that adds value divided by that lead time. A step with no time yet makes the lead time “at least”, and the page says so.',
        doThis: 'Read the sentence under the cards first: the lead time, the biggest wait, and the longest cycle against takt. Start with the biggest wait. Switch Lanes by Who does it or Where; tap any square to open the step; More ▾ plays the journey or shows only the waste.',
        youGet: 'Cards for Adds value, Necessary, Non-value adding, % value added, Cycle time, Lead time and Takt; the grid with its Cycle time, Wait and Lead time so far rows; and a closing line that names where to start.',
      },
      {
        step: 'In money',
        means: 'Two costs, kept apart: the labour spent on waste work each day, and the product sitting between steps — what is tied up in it and what carrying it costs a day.',
        doThis: 'Give the line’s wage on its page. In the same form as the demand, the In money box takes what a piece has cost by the time it waits and the carrying rate a year (the page notes that many sit between 15 and 35%). Every input is optional.',
        youGet: 'Cards for Waste work (£ a day in labour) and Waiting product (£ tied up and £ a day to carry). A missing input is named on the card, such as “give the line’s wage on its page to say the labour”.',
      },
      {
        step: 'Plan the future and make it better',
        means: 'The future state is today’s map copied and changed, so the two can be read as before and after. A step that is waste or has a wait can be sent into the project as a fix.',
        doThis: 'In More ▾ press Plan the future — copy today’s steps, then change the steps and times you expect. Switch between Today and The future. On a map in a project, open a red step and press Make it better to raise the fix; after the change, Time the steps again walks the steps carried from before.',
        youGet: '“Today → the future”: lead time before and after, the share that adds value and the steps added or removed. The fix is marked on its step.',
      },
    ],
    watch: 'Walk the stream yourself, once, end to end — not at a desk from what people say. Waits are the biggest time and the stopwatch cannot see them, so type them, or the lead time comes out far too short; the page says “at least” until every step has a time.',
  },
  'FC-006': {
    intro: 'For agreeing, on one page per product, who stands where on the line and what each of them does — and for marking where the line is held. It is Toyota’s standard work chart: the picture the other line tools hang off.',
    steps: [
      {
        step: 'Which product?',
        means: 'One map for each product, because the line does not move between products but the people do. Packing-line roles, hygiene and QA positions all differ product by product.',
        doThis: 'Press New map. Pick a product from the programs, or type it the way the floor says it (“Maris Piper 2kg — Tall”), then Make the map. Start with the product you run most.',
        youGet: 'A map for that product, listed as a card on the Line standard page. A new map starts from the picture of the last one.',
      },
      {
        step: 'The picture of the line',
        means: 'The board you place people on. It can be a real photograph of the line or a plain board you draw with shapes; nothing else is drawn for you.',
        doThis: 'Press Add a picture of the line — or draw it with shapes. Take or choose a photo, or pick a frame from a walk of the line. Or keep the plain board and choose its shape (Wide, Square or Tall), then draw Rectangles, Circles, Arrows or Text for the areas.',
        youGet: 'The board for this product. Full screen gives it the whole screen when the surface is too small.',
      },
      {
        step: 'Place the people and the kit',
        means: 'Each person is an icon standing where they work on the picture, with the kit and checks that go with their place.',
        doThis: 'Pick Person in the bar and tap the board where someone stands. Tap an icon already placed to give it a Role (Op 2, Line lead), say What they do on this product, and pick their colour; drag it to move it. Icons offers the kit and the checks.',
        youGet: 'People on the board in their own colours, counted in the box at the right: “3 people on this product”.',
      },
      {
        step: 'Who does what',
        means: 'The list beside the board: every person with their role and what they do on this product, written out in full, because the board can only carry short names.',
        doThis: 'Fill in each person’s Role and What they do in the box beside them, as the people on the line would say it. Names on the map offers Short, Full or Numbers when the board is crowded.',
        youGet: 'The words that go on the card. A long description is summed up by its first paragraph on the board and printed in full in the notes.',
      },
      {
        step: 'Mark the bottleneck',
        means: 'The bottleneck is the person or area that sets the pace of the whole line — the slowest, where everything behind it waits. You mark it; this page does not work it out.',
        doThis: 'Press The bottleneck? beside the person, or tick This area is the bottleneck on an area or a machine. To find where the line really is held, use Line capacity — open it from the line below the board.',
        youGet: 'A Bottleneck tag on the map and a note first on the right: “Op 2 — packs the trays”. An area can be faded in its colour so the eye lands on it.',
      },
      {
        step: 'What they cost',
        means: 'The people on the board, counted for you and priced at the line’s labour rate, then spread over the packs a minute the line makes. It is one output beside the count, never the headline.',
        doThis: 'Place the people. Give the line a wage in Set up the line, and map its Line capacity (or give the line a rated speed) to say the cost a pack. Every input is optional.',
        youGet: 'One sentence: “3 people placed: £… an hour at the line’s rate — £… a pack at … a minute”. When something is missing it names it and the board still works.',
      },
      {
        step: 'The card and the other tools',
        means: 'The board is a branch with doors off it: the same product’s Line capacity, its Line balance (each person’s work timed against takt), and the changeover into it.',
        doThis: 'Open Report ▾ for the Line standard card, an A4 landscape page of the map followed by its notes in full. Use Open its Line capacity › and Time the work › to go on to the other two, or See it all together ›.',
        youGet: 'A card to put on the line, and the line’s capacity and the people’s times read beside the map.',
      },
    ],
    watch: 'Keep it as the line is actually run, not as the procedure says. A standard nobody revises is only a document; every change to the work should start from this board.',
  },
  'FC-007': {
    intro: 'For a person who loads a machine and then does other work, walks or waits while it runs — a tray sealer, a flow wrapper. It lays the person and the machine on one time scale against takt, so you can see who is waiting for whom.',
    steps: [
      {
        step: 'Give each step its kind',
        means: 'The chart tells four kinds of time apart: Work (the person’s own), Walk (their walking), Wait (their standing idle) and Machine (the machine’s own run). A machine step starts when the step before it ends and carries on while the person does the steps after it.',
        doThis: 'On the Against takt tab, give the person’s steps their names, including loading the machine. Add the machine’s run as one of that person’s steps, open its Edit and pick Machine under What kind of time. Mark the walk between machines as Walk.',
        youGet: 'Steps wearing their kind in words and fill, ready for the chart. A machine’s run is never rated and carries no allowance.',
      },
      {
        step: 'Time the person, type the machine',
        means: 'The person’s steps are timed with the stopwatch, lap by lap. The machine runs by itself, so its run is its own time and is typed in.',
        doThis: 'Press Time Op 1 and tap Lap as each of their steps ends. For the machine’s run, type the seconds in the “or type it” box under the step, from a stopwatch on the machine from start to stop.',
        youGet: 'Every step with a standard time — timed, or marked typed — so the cycle can be laid out.',
      },
      {
        step: 'The Person and machine chart',
        means: 'One lane for the person and one for the machine, on a time scale. Their own work, their walking, their waiting and the machine running each have their own fill, named in the key under the chart, and the dashed line is takt. The cycle is the longer of the two lanes’ ends.',
        doThis: 'Open the Person and machine tab. Read each person who has a machine step: where their lane ends, where the machine’s ends, and where the dashed takt line falls across them.',
        youGet: 'A chart for each person with every step listed by its start and end second, and a “waits” bar on whichever lane ends first.',
      },
      {
        step: 'Who waits for whom',
        means: 'The gap between the two lanes is somebody standing idle. If the machine runs longer, the person waits for it; if the person is slower, the machine finishes and waits for them.',
        doThis: 'Read the sentence under the chart: the cycle against takt, the person’s own work and walking, the machine’s share of the cycle, then who waits for whom. A person who waits is room to take on more work.',
        youGet: 'A sentence such as “Op 1: 36.6 s a cycle … waits 14.0 s for the machine”, or “neither waits for the other”. Red when the cycle is over takt.',
      },
      {
        step: 'The waiting in money',
        means: 'What a person’s waiting for the machine costs in pay: the seconds at their hourly rate, and what share of the cycle they spend idle.',
        doThis: 'Give the line an hourly rate in Line capacity. It is optional; without it the page names the one input it needs and the chart is unchanged.',
        youGet: 'A line under the chart: “Op 1’s 14.0 s waiting for the machine costs £… a cycle — 38% of their pay”.',
      },
    ],
    watch: 'It draws one machine’s run beside one person. Two people sharing a machine are not drawn, and a step’s time is its standard time with the allowance for a person and none for a machine.',
  },
  'FC-008': {
    intro: 'For knowing how fast the line has to go to meet demand, so that each person’s or station’s work can be read as fitting or not. Takt is the yardstick the line balance and the capacity sheet are both read against.',
    steps: [
      {
        step: 'Where the takt comes from',
        means: 'Takt is the time available divided by what the customer wants in it — one piece every so many seconds. On a product’s line balance it follows Line capacity’s target: 60 divided by the target a minute.',
        doThis: 'Give Line capacity a target in packs a minute from the order. The balance takes it by itself and says “Takt … from Line capacity’s target”. If there is none the page says “No takt yet” — you can still time people meanwhile.',
        youGet: 'A Takt tile and a dashed takt line across every chart, set once for the product.',
      },
      {
        step: 'Agree a takt here instead',
        means: 'When there is no target to hold the line to, the project’s owner can agree the pace by hand. It is agreed before the work is read against it, so no timing can move it.',
        doThis: 'Press Agree a takt here instead. Type the takt in seconds a piece, or what is needed a shift and the minutes available: 2,000 in 420 minutes is a takt of 12.6 s. Only the project’s owner can agree it.',
        youGet: 'The takt on the page, marked “agreed here”. If Line capacity’s target later disagrees, the page offers it beside yours and lets you take the takt from Line capacity.',
      },
      {
        step: 'Each person against their own takt',
        means: 'A person who works in trays has a takt of the line’s takt times the packs in a tray: a tray of 8 at a 3 s takt is 24 s. A takt typed by hand is seconds a piece of whatever each person does.',
        doThis: 'Put each person at their station of Line capacity with the “at” box beside their name, so their time is in that station’s unit and held to its own takt.',
        youGet: 'Each person’s figure said against their own takt: “31.6 s of 24.0 s a tray takt — over by 7.6 s”.',
      },
      {
        step: 'Read the stacks against takt',
        means: 'Each person’s timed work is stacked as a bar against the dashed takt line. Over the line is red. The fewest people the work needs is the total work divided by takt, rounded up.',
        doThis: 'Read the sentences under the tiles: who is over takt, how many people the work needs against how many are working, who has time to spare. Then decide whether to rebalance or to question the work.',
        youGet: 'Tiles for People, Takt and The bottleneck, a stacked chart, and a closing line on what the bottleneck costs a pack.',
      },
    ],
    watch: 'Takt comes from demand, not from what the machine can do. Changing the takt to fit the line turns the logic upside down. The page holds the work to the takt as set; it does not shorten it for expected stops.',
  },
  'FC-009': {
    intro: 'For a line-side material that runs out or piles up — film reels, cases, trays. It sizes the loop: how many containers belong in it, and the most the shelf should ever hold.',
    steps: [
      {
        step: 'What is it of?',
        means: 'A calculation is a saved sum for one situation. Naming it, and optionally the line it sits on, lets you find it again and lets the page offer that line’s cost figures.',
        doThis: 'Press New calculation and say what it is of (“Film reels for the packer”), pick the line if there is one, and press Start it.',
        youGet: 'A saved sizing with its figures at the left and the live answer at the right.',
      },
      {
        step: 'How many are used',
        means: 'The usage rate, from a count over a whole shift or a day. A quiet hour gives a loop too small for the busy one.',
        doThis: 'Count what the line really uses in a whole shift or day — 1,500 trays — and type it with the hours that count covers (7.5). Name what is in the container so the sentences use it.',
        youGet: 'The units used an hour; the answer appears as soon as every required box has a figure.',
      },
      {
        step: 'Time to refill a container',
        means: 'The whole wait from the card being freed to the container being back on the shelf: waiting to be collected, the queue upstream, the changeover, the run and the move — not the run alone.',
        doThis: 'Follow an empty container back to the shelf with a watch, a few times, and type the minutes. Taking only the run undersizes the loop.',
        youGet: 'The time the loop has to cover. The refill time is what sets the stock: every cut to it comes off the shelf.',
      },
      {
        step: 'Container and safety factor',
        means: 'The units in one container (a whole number), and a margin on top of the usage for a late refill or a busy hour. The safety factor is a choice, not a rule: it starts at 15%, inside the 10 to 20% Monden calls usual.',
        doThis: 'Type the units in one container, such as 60 trays to a crate. Raise the safety factor where demand or the refill is unsteady; above 20% the page warns you the real problem is the unsteadiness.',
        youGet: 'The safety factor said as a choice, with the warning if it is high.',
      },
      {
        step: 'The answer',
        means: 'Kanbans are the containers in the loop, each with a card that travels with it. The count is usage × refill time × (1 + safety) ÷ container size, rounded up; the shelf is that many containers full.',
        doThis: 'Read the sentence first: for 1,500 trays in 7.5 hours, a 2-hour refill, 60 to a crate and 15% safety it is “8 kanbans of 60 trays — a supermarket of at most 480 trays”. Open How it is worked out for the arithmetic and What this does not say for its limits.',
        youGet: 'Tiles for Kanbans, Most on the shelf, Held before safety and Cover, and a closing line: send a card back as each container empties — that is the call for more.',
      },
      {
        step: 'In money',
        means: 'What a full shelf holds in pounds, and what holding it costs in a year.',
        doThis: 'Give what one unit costs and the cost of holding stock for a year as a percentage (finance will have it; the industry quotes 15 to 35%, and the page never fills it in). Both are optional.',
        youGet: 'A line such as “A full shelf is £408.00 of trays … holding it costs about £102.00 a year”, or the one input still missing.',
      },
      {
        step: 'What if… and before → after',
        means: 'Change one figure to see its effect before changing the floor, then save the figures so the next run reads as a before and after.',
        doThis: 'Use What if… to try a shorter refill or a smaller container; the answer and money show beside the present ones. Make it so keeps the change. Save as before keeps the present figures first.',
        youGet: 'Each tile says what moved since the saved before.',
      },
    ],
    watch: 'It assumes steady demand and sizes the loop; it does not run it. If the shelf keeps running short, find the cause (a long changeover, a lost card) before adding containers.',
  },
  'FC-013': {
    intro: 'For keeping an area at its standard — sort, set in order, shine, standardise, sustain — by scoring the same questions every week and watching whether the score holds. The area is compared with itself over time, never with another.',
    steps: [
      {
        step: 'Start a 5S audit log',
        means: 'A log is one area’s audit kept going: each audit you do is added to it, so the page can show the trend. It belongs to a line, with its machines and problems.',
        doThis: 'Open Check logs, find 5S audits and press New 5S audit log. Pick the line, type the Area (“Packing hall”), name it if you like and leave the starter list ticked — it is a starting point to edit, not the standard — then Start it.',
        youGet: 'A log with one check, the 5S audit, due every week, with twenty questions: four each under Sort, Set in order, Shine, Standardise and Sustain.',
      },
      {
        step: 'The questions as agreed',
        means: 'The questions are the standard you score against. Scoring only means something if two people would give the same answer, so the evidence that earns each score belongs in the wording of the question.',
        doThis: 'Open The checks and press Edit on the 5S audit (the project’s owner agrees the checks). Reword the questions in your area’s terms, one a line with its heading and a bar (“Sort | Nothing here that is not used”). Type a Score to reach in per cent if you have one; without it the score is shown, not judged.',
        youGet: 'The list the audit is run from. The starter questions and the 0 to 4 scale are Faultline’s own start, not a published standard.',
      },
      {
        step: 'Start the audit',
        means: 'You walk the area and score each question from 0 to 4: 0 not done, 1 started, 2 partly, 3 mostly, 4 at the standard. N/A leaves a question out of the score altogether. It is best done by someone who is not of the area.',
        doThis: 'On the Round, when the audit is due, press Start the audit. Tap a level for every question; the top of the sheet counts “14 of 20 answered · 68% so far”. Add a note if you want, then Finish once every question is answered.',
        youGet: 'The audit scored: points out of the most possible, as a percentage, overall and for each S.',
      },
      {
        step: 'Raise the findings',
        means: 'A finding is any question scored below 3. One that was also below 3 on the audit before has come back, which points at the system rather than at this week.',
        doThis: 'After Finish, tick the findings you want on the register and press Save the audit and raise 3 problems (the page counts those ticked). Each becomes a problem named for the area, the question and its score, with the log’s words on what to do as its first note; Low priority, or High if it came back. Leave all unticked and press Save the audit to keep the score only.',
        youGet: 'Problems on the register, each with an owner and a day to give, and an Action plan on the log listing what was raised.',
      },
      {
        step: 'The score and the trend',
        means: 'The score is the points scored divided by the most possible, for the whole area and for each S. The number matters less than the weakest S and whether it is slipping: a fall two audits running is the signal.',
        doThis: 'Read the Latest score tile, which says what moved since the audit before, and the sentence: “5S audit: 65%; Shine is the weakest at 44%”. Open History › Audits, in order for each audit by heading and its findings.',
        youGet: 'A score with its trend, the weakest S, how many findings came back, and the audit’s own closing line.',
      },
    ],
    watch: 'Do not compare one area’s score with another’s — a tidy office and a busy line are not a league table. Compare an area with its own last audit, and judge it against the written standard, not against how it looked last week.',
  },
  'FC-015': {
    intro: 'For a line where people stop and call for help — an engineer to a jam, QA to a weight check — and nobody knows how many calls there are, for what, or how long the line waits. It is a way of counting on the Reliability study: each call is timed from the call to help arriving to the line running again.',
    steps: [
      {
        step: 'A call for help',
        means: 'Andon is calling at the first abnormality instead of passing it on. The point is not the count of calls but how fast they are answered, so each is timed in two parts: from the call to help arriving (the response), and from the call to the line running again.',
        doThis: 'On the Reliability study, in What are you counting?, name the thing counted (“call”). Open More about it and set Timing to A call for help — response and clearing (andon). Only the project’s owner sets this up.',
        youGet: 'A count that times each call. A timed call takes the machine out of running, so its minutes come off the watched time.',
      },
      {
        step: 'The reasons and the response wanted',
        means: 'The reasons become the buttons at the machine, so a call is classed in one tap, and the response wanted is the team’s own standard for how fast help should come.',
        doThis: 'Add each reason the floor really calls for (five to eight work best; the page offers film change, jam, QA check, label, material short). Type Help should arrive within, minutes if the team has a standard; it is optional.',
        youGet: 'A button for each reason, and — with a standard — a count of the calls answered in time.',
      },
      {
        step: 'Press the reason',
        means: 'The watch runs while the machine runs, and a call counts only while it does. Pressing a reason starts timing the call at once, so nobody has to remember the time afterwards.',
        doThis: 'Press Start the watch while the machine is running. When someone calls, press the reason. One call is open at a time: the line shows “Called — jam” with its clock until it is closed.',
        youGet: 'A call stamped with its reason and the moment it was made, counted so far on its button.',
      },
      {
        step: 'Help arrived, Running again',
        means: 'The two stamps that complete the call. Help arrived ends the wait for someone; Running again ends the stop.',
        doThis: 'When the fitter or QA person arrives, press Help arrived; when the line runs, press Running again. If nobody pressed at the time, set how long it took with a chip or by typing (“90 s”, “1:30”, “4” minutes). A call left open for hours is asked about.',
        youGet: 'A complete call: its response and its clearing time, and the minutes the line waited for help.',
      },
      {
        step: 'Read the calls',
        means: 'The median is the typical call; the slow end (1 in 10 over) is where the help chain fails. The page ranks reasons by the total minutes waited, not by how many, because the most frequent call is not always the one that costs most.',
        doThis: 'Read the sentence in the calls panel and the Help in and Cleared in tiles. Look at Reasons, by the minutes waited, and — where the line has two or more shifts — By shift. A reason that keeps coming is a cause to take on; Make it better raises it.',
        youGet: 'A sentence such as “14 calls: help came in 2.3 min typically … 45.5 min waited in all — QA check, 2 calls, is 16 of it”, bars for each reason, and the calls answered within the response wanted.',
      },
      {
        step: 'What the waiting costs',
        means: 'The minutes spent waiting for help, priced as a stop is: the crew’s labour, and the packs and contribution lost only where the machine is the line’s bottleneck.',
        doThis: 'Give the line its crew and wage in Set up the line; for packs and contribution, its rated speed and margin a pack. All are optional and the page names what is missing.',
        youGet: 'A line under the panel: “Waiting for help alone: … min stood an hour of running · £… of the crew’s time …”.',
      },
    ],
    watch: 'Calls are counted by reason and by shift, never by person, and the page shows no name. A call that is punished soon stops being made, so a falling count is not good news by itself.',
  },
  'FC-016': {
    intro: 'For fixing one process in a focused week with a team and checking it a month later. Faultline runs it as a project of the Kaizen event method: five sections to walk through and the tools that fit each. It does not have a charter form or a 30-day check, and says so.',
    steps: [
      {
        step: 'Start it as a Kaizen event',
        means: 'The method is the project. Choosing Kaizen event gives a project that opens on its five sections — Prepare, Observe, Improve, Standardise, Sustain — with the tools that usually fit each.',
        doThis: 'Press New project, pick Kaizen event under Which method will run it?, name it for the process (“Filler changeover”) and the line it is on. Its tabs are the ones a 6M project has — Fishbone, Board, Lines, Results — beside Journey, Actions and Problems.',
        youGet: 'A project that opens on the method page. Every tool is listed with an honest word: Built, Built with limits, A mode of another tool, or Not built yet.',
      },
      {
        step: 'Prepare',
        means: 'The charter, the team and the baseline: what the problem is, how it will be measured and what it measures today. There is no charter form here; agree the scope, target, team and sponsor in the room.',
        doThis: 'Keep the charter on the project’s Notes. Take the baseline with a tool in the section — the value stream map, the Line balance’s time study, stops timed — using New beside it, and type the measure into Results › Numbers with Record a reading so the after is read against it.',
        youGet: 'A measured baseline on the project, started from the tool’s own page, and the line’s number to prove against.',
      },
      {
        step: 'Observe',
        means: 'The waste seen on the floor, in the week itself, before anyone changes anything.',
        doThis: 'Use the section’s tools — work sampling, the waste walk, the video time study, the Gemba walk. Some, such as the spaghetti diagram and the process flow chart, are not built; the page says so rather than offering a button.',
        youGet: 'Evidence on the project of where the time goes, and problems raised on the register from what was seen.',
      },
      {
        step: 'Improve',
        means: 'Changes tried in the week and measured. Each cause is a bone of the Fishbone and each change a countermeasure on the Board with a person and a day.',
        doThis: 'Work the changes with the section’s tools — ECRS on the Line balance’s Improve tab, SMED, 5S, Impact and effort to choose which first — and record each as a countermeasure on the Board or as an Action. Re-measure with the same tool you took the baseline with.',
        youGet: 'Countermeasures on the Board with their owners, and before → after on the same number.',
      },
      {
        step: 'Standardise',
        means: 'The new way written down so it holds. A change nobody wrote down goes back to the old way within weeks.',
        doThis: 'Write the new way into the Line standard and the combination table. The standard operating procedure with photographs and the TWI job instruction are not built; the page names them as not built.',
        youGet: 'The line standard and the Person and machine chart on the project, read by everyone doing the job.',
      },
      {
        step: 'Sustain',
        means: 'Whatever could not be finished in the week stays open with an owner and a day, and a month later you look again at the number. Faultline does not book that check or compare for you.',
        doThis: 'Leave the open items on Actions and look at Journey for what is still owed. A month on, record a new reading in Results › Numbers; Wins › Did it work? judges each closed action by the line’s own numbers either side of the day it closed.',
        youGet: 'The open actions, late ones in red, and the number again beside its baseline.',
      },
    ],
    watch: 'There is no 30-day check built: nothing books it or raises it. Put the day in the diary yourself, and record the number on that day, or the gain is never tested.',
  },
};
