/* GUIDES — capacity, throughput and bottlenecks, and the losses that cost output (the discipline's tools; src/catalogue/guide.ts).
 * Written from each tool's real page: the page's own labels, in the order a person meets them, each step said as what it
 * means, what to do and what you get — and nothing the page does not do. */
import type { Guide } from '../guide';

export const CAPACITY_GUIDES: Record<string, Guide> = {
  'FC-032': {
    intro: 'For work done by people, step by step — assembly, hand packing, sandwich building — when someone is overloaded while someone else waits, and you need to know who sets the pace and what that costs a pack.',
    steps: [
      {
        step: 'Start the line balance',
        means: 'A line balance times what each person on a product does, then stacks it against takt. Takt is the pace the line must keep — one piece every so many seconds to meet the target.',
        doThis: 'Open the product’s Line balance and tap Start the line balance. If the line standard already has people on its map, they come across as the first names; otherwise you type them. Timing never waits for a takt.',
        youGet: 'An empty balance for the product with its people ready to be given steps.',
      },
      {
        step: 'Add a person, and what they do',
        means: 'Each person is a stack of steps (elements) — Tape and stack the case, Check the seal. The steps are what get timed, and they can be moved from one person to another.',
        doThis: 'Under Add a person, type who (Op 1, or a name) and the first thing they do, in the floor’s words. Add the rest with Another step. Where Line capacity has stations, pick where they work and their time is read in that station’s unit, against that station’s takt.',
        youGet: 'A person with their steps listed. Each step starts as Not timed yet.',
      },
      {
        step: 'Time them, or type it',
        means: 'The timer is a full-screen stopwatch for one person’s cycle. You tap Lap as each step ends, so each lap is the time since your last tap, and the steps are read at the speed they were really done.',
        doThis: 'Tap Time and the person’s name (for example Time Op 1), then Start as the first step begins and Lap as each step ends, cycle after cycle. Undo the last lap if you mistapped, Skip a step not done this cycle, Foreign for an interruption you want left out. A step you cannot watch can be typed in seconds under or type it. At the end the page asks How was the pace? — 100 is the standard pace; leave a step and it is taken at 100 and says so.',
        youGet: 'A time for every step with its number of cycles and whether that is enough for about ±5%. A step with too few cycles is flagged short and the page says to time more.',
      },
      {
        step: 'Work, Walk, Wait, Machine',
        means: 'Not all time is work. A step can be work, walking, waiting, or a machine’s own run that goes on while the person carries on. Waiting is room for more work; walking is a layout problem; a machine step is never rated.',
        doThis: 'Tap Edit on a step and choose its kind, or change whose it is. On a laptop you can drag a step by its grip to another person. Leave a step as Work unless it is plainly something else.',
        youGet: 'Each step drawn by its kind: filled for work, hatched for walking, hollow for waiting. The page names who is waiting and who is walking and for how long a cycle.',
      },
      {
        step: 'The takt',
        means: 'The line’s pace for one piece, in seconds — what the target needs, not what the people happen to do. It follows Line capacity’s target, so the line and its people are read against the same number.',
        doThis: 'Normally do nothing: the takt comes from Line capacity’s target. With no target yet, tap Give Line capacity a target, or Agree a takt here instead — type seconds a piece, or what is needed a shift in the minutes available. Add an allowance if rest is to be built in.',
        youGet: 'Takt in the tiles with where it came from. Agreed by hand and then a target set, the page offers Take the takt from Line capacity.',
      },
      {
        step: 'Against takt',
        means: 'The Yamazumi: each person’s steps stacked in a bar, with takt as a dashed line across. A bar over the line is a person who cannot keep up; a short bar is someone with room. Balanced is how evenly the people’s time is used, against the longest.',
        doThis: 'Read the sentence first, then the tiles: People (what the work needs at this takt against how many are working), The bottleneck, Labour a pack and Lost a minute. If it can, Suggest a balance shows a ghost set of bars; Use it moves the steps to match.',
        youGet: 'Who is over takt and by how much, the fewest people the work needs, the percentage balanced, and in money what the bottleneck person costs a pack and each minute.',
      },
      {
        step: 'Set as the standard',
        means: 'Setting it as the standard freezes the takt, the people and the figures as a receipt, and the line standard’s map and card then read it. The next timing, after a fix, is compared against it.',
        doThis: 'When every step is timed, a takt is in and the project’s owner is happy with it, tap Set as the standard. Reopen to time again if the work changes.',
        youGet: 'A dated receipt with your name and the sentence it closed on, and the paper for the file.',
      },
    ],
    watch: 'Time several cycles of every step — one lap is a guess. The page says how many cycles it wants for ±5% and flags the steps short of it. And say how fast the person worked (the pace) honestly: a step rated 100 when the operator was rushing makes the balance look better than the line is.',
  },
  'FC-033': {
    intro: 'For when rebalancing people by hand keeps breaking the order of the work — the base has to go on before the filling. You say what must follow what, and the page proposes who does which steps with that order kept.',
    steps: [
      {
        step: 'Open Order of work',
        means: 'One of the five views of the same line balance, beside Against takt, Times, Person and machine and Improve. It reads the same steps and times; it only adds the order.',
        doThis: 'On the Line balance, tap the Order of work tab. Every step must already be timed, and the balance needs a takt, before a balance can be proposed. Waiting steps are left out.',
        youGet: 'A list of every step with its person and time, and a note saying what is still missing if anything is.',
      },
      {
        step: 'Must follow',
        means: 'For each step, the steps that have to be done before it. A step with nothing listed is free to go anywhere. It is a list of what comes after what, not a drawn diagram.',
        doThis: 'Tap Change on a step and tick the steps it must follow. A tick that would make a circle — A after B after A — is greyed with the reason. Only list true rules of the work; every rule you add removes a choice.',
        youGet: 'Each step reading “Must follow …” and its weight, which is its own time plus every step that has to come after it. If a circle gets in, the page names the steps round it.',
      },
      {
        step: 'A balance that keeps the order',
        means: 'Heaviest step first, a person’s stack is filled until the next step would pass takt, then the next person starts — ranked positional weight. It is a good balance the order allows, never a proof that no better one exists.',
        doThis: 'Read the sentence first: how many people cover the work, how that compares with those working now, and the fewest anyone could manage. Check each person’s steps and work against takt in the table.',
        youGet: 'A table of Person, Steps and Work against takt, and the sentence “Keeping the order, n people cover the work at a … s takt”. A step longer than takt on its own is said so.',
      },
      {
        step: 'Use it',
        means: 'Applying the proposal moves every step to the person the proposal gave it to. Nothing is timed again; only whose it is changes.',
        doThis: 'Tap Use it if you accept it, then go back to Against takt to see the bars. Try it first on paper with the people who do the work — they will know a rule you forgot to write.',
        youGet: 'The steps moved, the Yamazumi redrawn, and the people needed read again. With no order given the proposal simply fills steps in the order listed.',
      },
    ],
    watch: 'The proposal is only as good as the rules you gave it. A missed “must follow” gives a balance the line cannot run; a rule invented to be safe takes room away. And it will not propose a balance where a machine’s run is a step, or where people count different units, because those are not a person’s to move.',
  },
  'FC-034': {
    intro: 'For when the line will not make its target and nobody agrees which machine holds it. Put the stations in the order product goes through them, with how fast each runs, and the page says what the whole line can make and which station sets the pace.',
    steps: [
      {
        step: 'What the line should do',
        means: 'The target is what the line has to make, in the unit of its first station — bags a minute, say. Everything below is read against it, so the page can say how far short or how far over the line is.',
        doThis: 'Type the Target in the line’s unit a minute — the rate the order or the plan needs, not the best the line has ever done. Planned running hours a week is optional: it is used only to suggest how much of the time a station really runs, and nothing is changed for you.',
        youGet: 'A target the tiles and sentence are read against. With none set the page still gives what the line makes, and says to set a target to read it against.',
      },
      {
        step: 'The stations, in order',
        means: 'A station is one machine, or one person or crew, that the product passes through. Put them in the order the product goes through, from the front of the line to the palletiser; the page works out what arrives at each from the one before.',
        doThis: 'Tap Add a machine or Add a person or crew, and name it as the floor does — Bagger, Basketer, Carrier. With no station typed yet and machines already listed on the line, Start from the line’s machines, in flow order does it in one tap. Arrows move a station earlier or later.',
        youGet: 'A card for each station, numbered in flow order. Add one like this copies a station’s unit, people and speed so you only rename it.',
      },
      {
        step: 'It counts in, and each one holds',
        means: 'Every station counts in its own unit — bags, baskets, pallets — and the page puts them all in the first station’s unit so they can be compared. “Each basket holds 12 bags” is the conversion that makes that possible.',
        doThis: 'Under It counts in, type the unit. From the second station on, type how many of the one before make one of these. A line of 70 bags a minute into baskets of 12 is a basket every 10 seconds or so — count it the way the floor says it.',
        youGet: 'A chain read back to you — for example 1 pallet = 36 baskets = 360 bags — so a wrong number in the chain shows here, not three tables later.',
      },
      {
        step: 'How fast it runs, and how that is known',
        means: 'A machine goes by its plate speed (the nameplate); a person by their timed standard time. Running below the plate is a loss to be counted elsewhere, not a lower plate. How the speed is known — On the plate, I timed it, The line balance, A guess — is said on the sheet.',
        doThis: 'Pick How many in a time (70 bags a minute) or How long one takes (a basket every 8 seconds), and the unit of time. For a person use the pace they can keep up all shift, not their best lap; the page adds the 9% rest allowance, and one tap uses the Line balance’s timed cycle. Set Running — % of the time for the station’s own stops and Good — % passed on for the share it rejects, and say how the speed is known.',
        youGet: 'A line under each station saying what it does a minute and what arrives, and whether it keeps up — for a person, in seconds a piece, and how many people it would take.',
      },
      {
        step: 'What the sums say',
        means: 'The bottleneck is the station that can do the least once its own stops and rejects count. The line cannot beat it, so the sentence names it, says what the line makes, and says what is short of the target. The tiles beside it are The line makes, Target, Against the target, Labour a pack and People.',
        doThis: 'Read the sentence first, then The line, drawn and What each station can do beside the inputs — the lowest bar is the bottleneck. Open Check the numbers before you trust any of it: it flags a bottleneck far short of the target (under 75%), a V steeper than twice the bottleneck, and a person’s rest counted twice.',
        youGet: 'The bottleneck named with its margin to the next station, and a list of things to check, each one tap from the station it is about. On a project’s line with a board, Raise an action on the bottleneck sends it to the board with the sentence as its why.',
      },
      {
        step: 'The V-curve and the capacity sheet',
        means: 'The V-curve shows every station as a share of the bottleneck, in flow order: the bottleneck is the point of the V and stations either side should be faster. The capacity sheet is the same line as a table in Toyota’s format — speed, own stops, good share, per minute, per hour, share of the bottleneck and what the target needs.',
        doThis: 'The owner can set the V’s margin — about 10% faster a step away from the bottleneck is the usual starting point, a convention rather than a law. Read which stations fall under the V, and which row needs more than 100% of its station to meet the target.',
        youGet: 'The V in columns coloured by how close each station runs to the bottleneck, and the sheet with a row a station. A station under the agreed V is marked in words as well as colour.',
      },
      {
        step: 'What a pack costs in labour',
        means: 'The people on the whole line, at an hourly rate each, over the good packs the line makes an hour, give labour a pack. Because the bottleneck sets the output, it also sets this cost: slower line, more labour in every pack.',
        doThis: 'Type People on the line — all of them, and £ an hour, each. If you leave either, the page stands in the line standard’s head count or the line’s own crew and wage, and says which. Both are optional.',
        youGet: 'The cost a pack, the extra a pack because of the bottleneck, and where it can be worked out, whether one more person at the bottleneck lowers or raises the cost. Without the inputs the page says which one is missing; the capacity still stands.',
      },
    ],
    watch: 'A speed typed wrongly is the commonest fault — “5 pallets a minute” when it takes five minutes to do one pallet. The page says what your number comes to in words as you type it, and asks if a rate reads like a time. Believe the sentence under the box before you believe the bar.',
  },
  'FC-035': {
    intro: 'For two or more lines that run side by side and merge into one wrapper, case packer or palletiser, when nobody knows whether the shared station keeps up with all of them together.',
    steps: [
      {
        step: 'How many lines feed in?',
        means: 'The first question the page asks on a new capacity: one line, or several running side by side that come together at one place. One line is the ordinary case; pick 2 or more only when product from several lines really arrives at the same station.',
        doThis: 'Tap the number of lines — 1 to 6 are offered on the page. If a line is already typed, your stations are kept: more lines start as copies of the first, and one line again joins them back.',
        youGet: 'That many lines (named Line A, Line B and so on; rename them to the floor’s names), each with a place for its own stations.',
      },
      {
        step: 'Where do they meet?',
        means: 'The merge is the station from which the lines share one chain. Stations before it belong to each line; the station it names, and everything after, is the one shared station or chain that all the lines pour into.',
        doThis: 'Choose After <station> for the last station each line has to itself, or They do not meet — each line ends on its own. The choice moves stations between each line’s own and the shared chain, and keeps what you typed.',
        youGet: 'A sentence under the choice saying how many lines and where they meet, and the line drawn the same way beside the inputs.',
      },
      {
        step: 'Each line’s stations, then the shared ones',
        means: 'Each line has its own list of stations, in order, and the stations after the merge are one chain for every line. While the lines are alike, you type one and the others follow.',
        doThis: 'Type the first line’s stations — Make the lines different when one line really has a different speed or an extra station. Add another line, like <the one before> copies it; Remove this line takes one away. Then type the shared stations once, after the merge.',
        youGet: 'Each line’s stations with its own speeds, and a shared chain labelled where they all come to. A change on alike lines is made on every line.',
      },
      {
        step: 'The target, for all of them',
        means: 'The target is for the lines together, because it is what the shared station and the customer see. Each line’s own V is read against its own bottleneck.',
        doThis: 'Type the Target for the whole — the unit of the shared stations a minute. Planned hours a week is optional, as on any Line capacity.',
        youGet: 'A target the merged result is judged against, and Against the target on the tiles.',
      },
      {
        step: 'The merge, read',
        means: 'Each line’s rate to the merge is worked out on its own, then summed and set against what the shared station can take. If the shared station is slower than the lines together it holds them; if not, the lines hold themselves and the shared station has room.',
        doThis: 'Read the sentence: “X holds Line A and Line B to N together — M arrive at it”, or the lines’ own limits. Read each line’s V and sheet, then After the lines merge — what they send against what the shared stations take. Lines that are the same are drawn once, as Each line.',
        youGet: 'A V and sheet for each line, one for the merge, the shared station’s load, and the way to the target — who is added where. Lines that are copies of one another get the same extra person together.',
      },
    ],
    watch: 'While the lines are alike, a change made to one is made on every line. Use Make the lines different before you type a station or a speed that only one line has — and remember that lines of different lengths merge at the first line’s point.',
  },
  'FC-036': {
    intro: 'For when the line is short of its target and options are argued without numbers — a second packer, a faster labeller, twelve to a basket. Copy the line, change one thing, and see what it buys before anyone spends anything.',
    steps: [
      {
        step: 'What if',
        means: 'A what-if is a copy of the line, kept beside it on the same record, with one thing changed. The line as run stays untouched; you compare the two.',
        doThis: 'Tap + What if beside the As run tab, then name the change in the box that opens — New basketer, 12 to a basket, second packer. On a phone, swiping left past the last tab makes a new one.',
        youGet: 'A new tab with the whole line copied into it, and the words “The same as the line as run” until something is changed.',
      },
      {
        step: 'Change one thing',
        means: 'Change a station’s speed, crew, unit or running share — or add a station — in the copy, not in the line as run. Change one thing at a time, so you can say what bought what.',
        doThis: 'Open a station on the what-if tab and change the figure. If the target should differ for the what-if, change it there.',
        youGet: 'A list of exactly what is different from the line as run, so the comparison is explicit.',
      },
      {
        step: 'What the what-if buys',
        means: 'The page works the copy out as it works the real line, then compares the two in a sentence: what the line would do instead, whether the old bottleneck still limits it, and whether it meets the target.',
        doThis: 'Read “With <your what-if>, the line would do N instead of M (+d). X no longer limits it; Y does.” and the target line after it. A change that moves the limit to a station that is no better has bought nothing — the sentence says “changes nothing” when it is within 1%.',
        youGet: 'The what-if’s rate, its limiting station and its labour a pack in the same tiles as the line as run, so the two read side by side.',
      },
      {
        step: 'The way to the target',
        means: 'When the line is short, the page works out for you who to add, where, and in what order. It adds one person (or another machine beside it) at the station that holds the line, works the line again, and repeats until the target is met.',
        doThis: 'Read The way to <target> a minute: each step is a station, its crew from-to, and what the line then makes. It stops and says why if a station already has 12, or one more makes no difference because something after it holds the line. A machine is “another beside it”, never a faster one.',
        youGet: 'An ordered list of additions with the line’s rate after each, and a sentence such as “2 more people… The line then makes N.” Make it so — put these crews in applies the crews to the line as run.',
      },
      {
        step: 'Make it so',
        means: 'On a project’s line, a what-if you decide to do becomes an action on the project’s board with the prediction as its why. Later the board’s own proof judges whether it worked.',
        doThis: 'On the what-if tab, tap Make it so, check what to do, choose the bone it belongs to, give an owner and a due date, and Raise. Only available where the project has a board.',
        youGet: 'An action on the board carrying the comparison as its reason; the what-if tab then shows its state — to do, waiting or done.',
      },
    ],
    watch: 'A what-if is arithmetic on the speeds you typed, not a trial. If the line as run is wrong, every what-if is wrong with it — walk the bottleneck first. And it does not show a cost until the people and rate are given on the line.',
  },
  'FC-037': {
    intro: 'For when the plate speeds say one machine is the bottleneck and the floor says another. Walk the line a few times through the shift and tap each station — working, starved, blocked or down — and the taps point to where product is really waiting.',
    steps: [
      {
        step: 'Walk the line',
        means: 'The bottleneck walk sits under Line capacity’s sheet, on the product’s page, as The bottleneck, walked. Starting it makes a work sampling study whose “people” are the line’s stations, with its moments drawn at random through an 8-hour shift, the first one now.',
        doThis: 'On the product’s Line capacity, tap Walk the line. It needs at least two stations on the capacity. Keep the page open on the phone you will carry; it asks at each moment.',
        youGet: 'A Bottleneck walk study on the product’s line, opened at its first moment, and the same study counted on the product’s Line capacity afterwards.',
      },
      {
        step: 'Tap each station',
        means: 'At each moment you really walk the line and note what each station is doing right now. Working is running; starved is waiting for its input; blocked cannot pass its output on; down is stopped.',
        doThis: 'At each moment — Walk 3 of 12, say — tap one word for every station. Strike a mistap while it is fresh. If you are on the line anyway, Walk the line now takes one more walk besides the ones the phone asks.',
        youGet: 'A tap for every station at that moment. No clock and no counting on the floor; the sums are done afterwards.',
      },
      {
        step: 'Where the arrows meet',
        means: 'A station often blocked points downstream — the bottleneck is after it. One often starved points upstream — the bottleneck is before it. The bottleneck is where the arrows meet; walked again and again it also shows a bottleneck that shifts.',
        doThis: 'Walk at least five times before trusting it — under five the page says “Too early”. Walk at different times, including after a changeover and near the end of a shift, rather than five times in a quarter of an hour.',
        youGet: 'A sentence such as “Walked 9 times: Packer was starved or blocked 8% of the time, the stations before it were mostly blocked — the bottleneck is Packer”.',
      },
      {
        step: 'Against the sums',
        means: 'The walk is the proof of the capacity sheet. If the station the walk points to is the station Line capacity calculated, the speeds you typed are right. If not, either a speed is wrong or stops — not speed — are what hold the line.',
        doThis: 'Read the end of the sentence: “as the sums say” or “the sums say <station> — check the speeds typed, or stops not speed hold the line”. Then go back to that station’s speed and its stops.',
        youGet: 'An agree or disagree between what you saw and what was calculated, on the walk’s page and under the capacity sheet, with Walk the line again to repeat it.',
      },
    ],
    watch: 'One walk is the bottleneck of the moment, not the bottleneck. Walk through the shift, and do not tap what you expect to see — tap what the station is doing as you reach it.',
  },
  'FC-038': {
    intro: 'For when effort goes into losses that do not make the line make more. The constraint is the one station that sets the line’s output; a minute lost there is lost to the whole line, a minute lost anywhere else is a mirage unless it starves or blocks the constraint.',
    steps: [
      {
        step: 'Know where the line is held',
        means: 'The constraint is Line capacity’s bottleneck for the product. Every loss ranked anywhere in the app is read against it, so it must be worked out first — the Pareto and the line’s capacity page both say if it is not known.',
        doThis: 'Fill in a product’s Line capacity on the line so it names its bottleneck. Where products on one line have different bottlenecks the page says so, and a loss on any of them is treated as on the constraint for the products it holds.',
        youGet: 'The line’s constraint named, and “Held at the <station>” on the line’s capacity page.',
      },
      {
        step: 'Name the machine on every stop',
        means: 'A stop is counted as on the constraint when the machine it was logged against is the constraint’s station, by name. A stop of the whole line stops the constraint too, so it counts as on it.',
        doThis: 'When you time a stop, pick the machine from the line’s list rather than typing a variant. On the capacity page, put the exact name the stops are logged under in the station’s “Stops logged as” box so they match.',
        youGet: 'Stops that can be read as on or off the constraint. A machine named differently looks like a different machine and is read as off the constraint.',
      },
      {
        step: 'Read on or off the constraint',
        means: 'Under the Pareto on the line’s Analyse page, each of the biggest causes is said to be on the constraint when half or more of its minutes are on the constraint’s machine, and not the constraint otherwise. On the capacity page, each band of Where the time went and each row of the stops grid carries the same word.',
        doThis: 'Read the sentence at the top (“n% of this lost time is on the constraint”), then each row: on the constraint, or “not the constraint — fixing it makes no more”. Aim at the rows on the constraint first.',
        youGet: 'Each ranked loss labelled with where it sits, and the minutes on and off the constraint added up.',
      },
      {
        step: 'The prize, and the what-if slider',
        means: 'On the line’s capacity page, “What if we took some of it back?” lets you slide a loss down by a percentage. Minutes recovered on the constraint come back as output at the line’s ideal speed; minutes recovered elsewhere make no more and are shown as 0 packs.',
        doThis: 'Move a loss’s slider and read what comes back a shift and a week. Do not plan a saving on a row marked as off the constraint unless the stop starves or blocks the constraint — then log it against the constraint’s machine.',
        youGet: 'Packs and, where the line’s cost is known, pounds that would come back, only where they truly would. Where the line’s running pattern is not set, the week is not shown.',
      },
    ],
    watch: 'Off the constraint does not mean harmless. A stop upstream that starves the bottleneck, or one downstream that blocks it, costs output; log it against the constraint’s machine. And what is the constraint can change: when a fix works, the next station becomes the constraint, so read the capacity page again.',
  },
  'FC-040': {
    intro: 'For when orders arrive and nobody knows until Thursday that the week will not fit. Type the week’s orders per product and the page says how many hours they need against the hours the line runs.',
    steps: [
      {
        step: 'The line’s week',
        means: 'The hours the line has are its running pattern: the shifts and days it runs. The page does not assume them — it reads them from how the line runs on its SMED.',
        doThis: 'Set how the line runs (shifts a day, hours, days a week) on the line’s SMED. Until you do, the page says “The hours the line has are not known” and still tells you the hours the orders need.',
        youGet: 'The hours available for the week, shown with the week it is for.',
      },
      {
        step: 'Type or paste next week’s orders',
        means: 'One number per product: how many packs are wanted. No order system is read; you type what the plan says.',
        doThis: 'Open Will next week’s orders fit? on the line’s capacity page. Type each product’s orders in its box, or open Paste from a sheet and paste a line per product — Maris Piper 2kg, 12000 — and tap Use these. Products are matched by name.',
        youGet: 'An hours figure beside each product it can be worked out for. A product with no speed in its Line capacity is left out and named.',
      },
      {
        step: 'The rate each is planned at',
        means: 'Each product’s hours are its orders divided by its speed at the bottleneck, taken at the share of that speed the counted shifts proved four times in five. Without enough counted shifts the speed as worked out is used and said so.',
        doThis: 'Nothing to type. Count shifts with the loss count so the page can plan on what the line proved, not on its plate.',
        youGet: 'The basis in the sentence: “at 82% of each product’s speed — what four shifts in five proved”, or “no shifts counted to plan on yet”.',
      },
      {
        step: 'Fits or does not fit',
        means: 'Headroom is hours available less hours needed. Positive is spare; negative is hours over, and the page turns it into packs short.',
        doThis: 'Read “It fits — n h spare, about N more packs” or “It does not fit — n h over, about N packs short”. If the line’s margin a pack is set, an over week also says how much contribution is at risk. Decide early which orders move.',
        youGet: 'Headroom or overflow in hours and packs, and in pounds when the margin is known; the constraint is named alongside.',
      },
    ],
    watch: 'This is the load against the hours, not a schedule — the changeovers between products are not taken off the week. A week that fits here can still fail on changeovers.',
  },
  'FC-041': {
    intro: 'For when capacity is quoted at the plate and demand is planned against it. It splits one shift into what the line was built to make, what it can really make once planned losses are out, and what a counted shift actually made.',
    steps: [
      {
        step: 'A shift',
        means: 'Capacity a shift is the time of a shift less the breaks and the changeovers, at the bottleneck’s speed once its own stops count. Breaks come from the line’s settings; changeovers from the SMED timed into this product.',
        doThis: 'Nothing to type here: set the shifts and breaks in the line’s settings and time the changeover into the product with SMED. A break not set, or a changeover not timed, is said so and left out of the sum.',
        youGet: 'A table of Shift, Its time, Breaks, Changeovers, Making and packs a shift, with “with none” beside it for what it would make without changeovers.',
      },
      {
        step: 'Built to make → can really make',
        means: 'Design capacity is the bottleneck’s plate speed × every minute of the shift. Effective capacity is what the shift can make after the breaks, the changeovers and the line’s own stops and rejects. The gap is three things in packs that add up exactly.',
        doThis: 'Read The three numbers table across: Built to make, minus Breaks, minus Changeovers, minus Stops & rejects, equals Can really make. The share of design is shown beside it.',
        youGet: 'A plan you can believe — the effective number, not the plate. The headroom between design and effective is a plan, not a loss, and is not priced.',
      },
      {
        step: 'What a counted shift made',
        means: 'The third number is actual: the good packs a counted shift made, taken from the loss count. It is a person’s count, not a sensor’s.',
        doThis: 'Count a shift on the line’s loss count. The page then picks up its newest count and sets it beside the other two; the link “Where the shift’s packs went” opens it.',
        youGet: 'Three ratios: utilisation (made ÷ built to make), efficiency (made ÷ can really make) and loading (what the target asks ÷ can really make).',
      },
      {
        step: 'Reading the ratios',
        means: 'They answer different questions. Utilisation is how much of the asset was used — a decision about shifts and orders. Efficiency is how well the planned time ran — the floor’s. Do not use one for the other.',
        doThis: 'Low utilisation and high efficiency is a planning question; low efficiency is a floor question, so go to the loss count’s waterfall. Loading above 100% means the target does not fit in the effective capacity.',
        youGet: 'Packs short, and in pounds when the line’s contribution a pack is known — priced only for the gap from effective to made, as “if it cannot be made up”.',
      },
    ],
    watch: 'This is one shift, not the whole 24 × 7 week; how well the orders fit the week is the orders question’s, and the cost of an extra shift is not worked out here. And effective capacity is only as good as the stops and changeovers behind it — a changeover not timed is left out, not guessed.',
  },
  'FC-042': {
    intro: 'For when the constraint cannot make everything that is asked and the mix is chosen by habit. It ranks products by what a minute of the constraint earns, fills the week in that order, and says what is left unmade and what it was worth.',
    steps: [
      {
        step: 'Orders for the week',
        means: 'The mix needs to know how much of each product is wanted. It uses the same orders as Will next week’s orders fit?.',
        doThis: 'Type or paste each product’s orders on the line’s capacity page. A product with no orders is left out and named.',
        youGet: 'A product list with orders, ready to be ranked.',
      },
      {
        step: 'Price and materials a pack',
        means: 'Throughput a pack is the price less the truly variable cost — materials and packaging — never labour or overhead. It is the money that reaches the business each time the constraint makes a pack.',
        doThis: 'In Which first when the line is full?, type each product’s Price a pack and Materials a pack. Leave them blank and the line’s margin a pack stands in for every product, and the page says the ranking is then by speed alone.',
        youGet: 'A throughput a pack for each product, marked its own or the line’s margin. Every input is optional; the page names what is missing.',
      },
      {
        step: 'The ranking',
        means: 'Each product is ranked by £ a constraint minute: throughput a pack × packs a constraint minute. A fast, low-margin product can beat a slow, high-margin one — or lose to it.',
        doThis: 'Read the numbered list: each product with its £ a constraint minute and the minutes it needs. The week’s minutes are filled in that order, up to each product’s orders.',
        youGet: 'The order to run, how much of each is made, and the packs left unmade by name with what they were worth.',
      },
      {
        step: 'The money',
        means: 'The week’s throughput in this order, what running by margin a pack (the habit) would have earned instead, and what a minute at the constraint costs or earns.',
        doThis: 'Read the money lines. “A minute lost at the constraint costs £x” appears only when the week is full; while it has room the page says a lost minute is not output lost yet.',
        youGet: 'The throughput of the week in pounds, how much the ranking earns over the habit, and the figure that prices a stop on the constraint.',
      },
    ],
    watch: 'The changeovers between products are not taken off the week yet, and this is one constraint on one line. A ranking that ignores a long changeover may favour a product that costs more to switch to than it earns.',
  },
  'FC-044': {
    intro: 'For when product sits in chillers, racks or on a belt and nobody knows how long. Count what is in progress and how fast it flows out, and the page works the waiting time out — no stopwatch on every item.',
    steps: [
      {
        step: 'What do you want to know',
        means: 'Little’s law ties three numbers together: the work in progress, how fast it flows out, and how long each piece spends in progress. Give any two and the third follows. Most often you know the first two and want the third.',
        doThis: 'Choose How long it waits (the lead time), How much is in progress, or How fast it flows. Start a New calculation first — name it for what it is of, such as Cooked product in the chiller, and pick the line.',
        youGet: 'The boxes for the two figures you need. The third is the answer.',
      },
      {
        step: 'Count what is in progress, and what flows out',
        means: 'Work in progress is everything between where it goes in and where it comes out — in the chiller, on the racks, on the belt. The flow is what came out over the same window, not the rated speed of the machine.',
        doThis: 'Walk the boundary you mean and count: type it under Counted in progress, naming what is counted (trays, cases) so the sentence reads right. Under Flowing out, type what actually came out in an hour over the same period. If you counted several times, type the average.',
        youGet: 'Both figures saved with the calculation, ready for the sum. Counted in one place it is that place’s lead time; over a whole line it is the line’s — count the boundary you mean.',
      },
      {
        step: 'Over the period, the pile',
        means: 'The law holds for averages in a steady system, where what went in came out. If the pile grew or shrank during the count, the answer is only rough.',
        doThis: 'Say whether the pile Stayed about the same, Grew or Shrank. It starts as steady until you say otherwise. If it grew or shrank, count again over a longer window or take the average pile.',
        youGet: 'The answer marked rough, with a warning, when the pile moved. Never silently trusted.',
      },
      {
        step: 'Shelf life and money',
        means: 'Optional extras. The shelf life says how much of the time the product keeps is spent waiting. What one unit has cost by now puts the stock in progress in money, and the cost of holding stock puts a price on holding it.',
        doThis: 'Type the Shelf life in hours, What one unit has cost by now (materials and labour so far, £ a unit), and the Cost of holding stock for a year as a percentage — finance will have the business’s figure. The page never fills it in; the industry quotes 15–35% a year.',
        youGet: 'Shelf life used as a share, what the stock stands at, and what holding it costs a year. Leave any out and the page says which it is missing; the lead time stands without them.',
      },
      {
        step: 'The answer',
        means: 'The verdict is the lead time (or the work in progress, or the flow), with a sentence in the floor’s words and five tiles: Lead time, In progress, Flow, Shelf life used and Stock held. A wait longer than the product keeps is red.',
        doThis: 'Read the sentence, then the tiles. How it is worked out shows the division. Note the line “halve the work in progress and, at the same flow, the lead time halves” — that is the whole of what the law lets you promise.',
        youGet: 'A verdict such as 3 hours lead time, the money tied up in the stock, and a paper to show it. It says how long product waits, not why.',
      },
      {
        step: 'What if, and before and after',
        means: 'What if… changes one figure and shows the answer without touching your count. Save as before keeps these figures, so that after a change you can count again and see the lead time move.',
        doThis: 'Pick a figure under What if…, type a new one and read the new answer; Make it so keeps it. After the improvement, count again and use Save these as the new before to compare.',
        youGet: 'The effect of a change worked out before you make it, and later the lead time before and after beside each other.',
      },
    ],
    watch: 'Use what came OUT over the same window you counted the pile in, in the same unit — not the machine’s rated speed, and not what went in. A rated speed makes the lead time look shorter than the product really waits.',
  },
  'FC-049': {
    intro: 'For the end of a shift that made less than it should when nobody can say where the time went. You count the shift by hand — the packs, the rejects, the breaks — and the page lays out where each planned minute went, in minutes, packs and pounds.',
    steps: [
      {
        step: 'The shift and the day',
        means: 'A loss count is for one shift (or a window you type) on one line. Everything is read against the planned time of that window, so the window comes first.',
        doThis: 'Start a New loss count on the line, choose Which shift (or Type the window and enter From, To and Breaks, min — the breaks the line stops for), and set The day. If the line has shifts set, their breaks come with them.',
        youGet: 'Planned minutes worked out as the shift less its breaks, said in words. Change for the day lets you override it, with a reason kept beside it, such as stood an hour, no orders.',
      },
      {
        step: 'Packs made, rejects and the rate',
        means: 'The rate is the ideal speed — what the line should have made each minute: the plate speed of the slowest station, or a person’s standard time, from Line capacity. The expected packs are the planned minutes at that rate.',
        doThis: 'Type Good packs made and Rejects from the shift’s count at the end of the line. Rate a minute is filled from Line capacity where it can; tap use <the plate speed> to take it, or type your own. The line under the box says where the rate came from.',
        youGet: 'The count saved with Save the count: “The shift should have made N at R a minute; made M — X minutes lost”. Nothing is saved on each keystroke.',
      },
      {
        step: 'The stops are already there',
        means: 'You do not type the stops again. Every stop timed on the line in Stops timed through the shift is read from there, by the minute, for the window of the count; overlapping stops are counted once.',
        doThis: 'Time the stops during the shift in the line’s stopwatch log as they happen. The count’s tile Stops timed says how many were found in the window.',
        youGet: 'A bar for each cause of stop, plus changeovers and rejects (the rejects converted to the minutes they took to make at the rate).',
      },
      {
        step: 'The running speed, timed',
        means: 'Minutes nobody logged are either slow running (the line ran below its ideal speed) or short stops too quick to log. Timing the packs off the line for a spell while it runs tells the two apart.',
        doThis: 'While the line runs, count the packs off it for a timed spell and type Packs and In seconds, then Add the timing — several, at different moments, are pooled. A wrong one is struck, not erased.',
        youGet: 'The minutes that nobody logged split into slow running and short stops. Until it is timed, the page names them together as slow running and short stops.',
      },
      {
        step: 'Where the minutes went',
        means: 'The waterfall steps down from planned minutes to the good packs made: stops by cause, changeovers, rejects, and the rest. Top causes ranks them. Each cause says whether it sits on the line’s constraint, because a minute lost elsewhere does not cost output.',
        doThis: 'Read the sentence under What it means first, then the tiles — Good packs, Lost, Stops timed, Rejects and What it cost. Tap a bar to open everything behind it.',
        youGet: 'The shift’s losses in minutes and packs. What it cost is idle labour (crew × wage × on-costs) and lost contribution (the line’s margin a pack); a missing input is named and nothing waits on it.',
      },
      {
        step: 'Make it better, and close',
        means: 'A bar is where the next improvement starts. Closing keeps these figures as a receipt, so the shift’s record stands as it was and can be compared with the next one.',
        doThis: 'On a count that belongs to a project, tap a bar and Make it better — a countermeasure on a 6M project, a fix elsewhere — to raise it in the bar’s own figures. When the count is complete, Close — keep these figures. Reopen needs a reason.',
        youGet: 'An action tied to the loss that caused it, the trend shift by shift in Good packs, and a one-page paper of the count.',
      },
    ],
    watch: 'A count is only as good as its rate. If Rate a minute is a guess, so is every minute lost. Take it from Line capacity’s plate speed or a timed standard, and if the shift made more than expected the page says to check the rate or the count rather than showing a negative loss.',
  },
  'FC-051': {
    intro: 'For every stop on a line, however small — weigher blockages, film breaks, label jams. A person times each one with the machine and the reason, so the floor has a record of every loss, not only the big ones written on the shift sheet.',
    steps: [
      {
        step: 'Which machine?',
        means: 'The machine that stopped, picked from the line’s machines in flow order. Whole line is for a loss that is not one machine. The name matters: it is how the stop is later read as on or off the constraint.',
        doThis: 'Tap the machine. If the machine is missing, Add a machine or area… puts it on the line’s list, so every tool offers it from then on. If the same stop keeps coming, Again? offers the reasons you logged lately as one tap each.',
        youGet: 'The machine set for the next stop. A stop with no machine named cannot be read against the constraint.',
      },
      {
        step: 'What did you see?',
        means: 'The reason in the floor’s own words: a category, and optionally a more particular kind under it. These become the bars of the Pareto, so they should be specific — “jam at the infeed”, not “mechanical”.',
        doThis: 'Tap a category under What did you see?; add one if it is missing. Then, if useful, pick Which kind? (optional). Choose Which shift? if the line has shifts — the clock picks it for you and a tap overrides.',
        youGet: 'The category, kind and shift set. The stop will rank under them in the Pareto and the stops grid.',
      },
      {
        step: 'Put a time to it',
        means: 'Timing is the point. Start timing starts a stopwatch that survives the app closing; Stop & log ends it. The stop runs from the machine stopping to it running again.',
        doThis: 'Tap Start timing when the stop begins and Stop & log when the machine is running again; Discard throws a mistaken one away. If you were not there at the start, Type a time (minutes and seconds) and Log; Log now notes it without a time.',
        youGet: 'A stop in the list with its machine, reason and minutes. While it runs, a ticker shows what it is costing in labour — and in packs, if the machine is the one that stops the line — when the line’s wage and speed are known.',
      },
      {
        step: 'Cause, and evidence',
        means: 'On a 6M project, a stop can be tagged with the bone of the fishbone it points to — People, Machine, Method, Material, Measurement or Environment. A photo, a video or an upload on the stop is evidence anyone can look at later.',
        doThis: 'After logging, tap one bone under Cause, if you know it — or skip. Attach a Photo, Video or Upload before you log, and it goes with the next stop.',
        youGet: 'A stop carrying its likely cause and its proof, so the Pareto bar can later open the clip that shows it.',
      },
      {
        step: 'Logged on this line',
        means: 'Every stop lands in the line’s log, newest first, and is the record the Pareto, the stops grid and the loss count are all drawn from. Overlapping stops are counted once, not twice.',
        doThis: 'Check the list at the end of the shift. Tap a row to change its machine, reason, minutes or note; × deletes it. See all shows every entry.',
        youGet: 'The count of entries and the total minutes, and a log that every other stops tool reads — no one types the stops again.',
      },
    ],
    watch: 'Choose reasons and machines carefully, not quickly. The log is only as good as its words: “other” and a machine name spelled three ways will each become their own bar, and the Pareto will point at nothing.',
  },
  'FC-052': {
    intro: 'For when everyone has a different view of what loses the most. The Pareto ranks the losses timed on the line by the minutes they cost, and later — run again — shows whether the one you went after got smaller.',
    steps: [
      {
        step: 'Time the stops first',
        means: 'The Pareto is drawn only from the stops timed in the app on the project’s lines, the last four weeks against the four before. There is no spreadsheet to upload.',
        doThis: 'If the page says Nothing timed on the line in the last four weeks, tap Time a stop on <the line> and log stops with their category as they happen.',
        youGet: 'A ranking that builds itself from the stopwatch log and updates as stops are added.',
      },
      {
        step: 'The finding',
        means: 'The first line says how few categories carry most of the loss: “2 of 9 categories carry 83% of the lost time”. These are the vital few — the categories that make up the first 80% — shaded in the table and named with the words, not the colour alone.',
        doThis: 'Read the sentence before the table. It tells you where to aim: the vital few first, and a smaller loss is usually just done, as an action.',
        youGet: 'The count of the vital few and their share of the lost time, plus the total minutes and stops it is drawn from.',
      },
      {
        step: 'Against the four weeks before',
        means: 'A second Pareto over the same period is the same measurement twice, not movement. The page only claims a change when the two windows differ, and says why when it cannot.',
        doThis: 'Look for “Measured against <period> — the four weeks before. The right-hand column is the change.” Read the last column for each category: down, up, flat, new or gone. A change under 8% is called flat — the ordinary breathing of a factory, not progress.',
        youGet: 'Proof that the category you went after got smaller, or didn’t, in the same units the decision was made in.',
      },
      {
        step: 'The table',
        means: 'Each row is a category with its Minutes lost, its Share, the running share down the ranking (Cum.), the number of Stops and Min/stop. The profile says whether it is a few long stops or many short ones — which is a different problem.',
        doThis: 'Read down the Cum. column to see where the 80% line falls. Compare Stops and Min/stop: many short stops need the operators’ checks and the machine restored; a few long ones need a root cause.',
        youGet: 'A ranked table with a bar for each category and the vital few marked in words.',
      },
      {
        step: 'Open a row',
        means: 'Each row is a door to the drill behind it. It opens the line that lost the most minutes to the category, and from there the machines, kinds and shifts. There you can rank by Lost time or Frequency, and choose 4 wks, 12 wks, Year or All.',
        doThis: 'Tap a row — “on Line 7”, or “mostly on Line 7, also Line 2”. If two lines lost the same minutes the page asks Which line?. In the drill, tap a bar to walk in; the breadcrumb walks you back.',
        youGet: 'The same ranking by machine, by kind or by shift. Where the line has a crew and a labour rate each bar also shows its pounds, and the packs lost where the stop stops the line.',
      },
      {
        step: 'Turn a bar into work',
        means: 'On a 6M project, a bar in the vital few offers Find the root cause, which opens a problem with the bar as the head of the fish. A smaller bar offers Just do it, an action on the board, with the root cause quietly behind it. A bar that already has a problem goes to its fishbone.',
        doThis: 'Press the one the row offers. You need to be someone who may change the work.',
        youGet: 'A problem or an action with the loss in its words, and the same loss never twice.',
      },
    ],
    watch: 'A Pareto of minutes does not say what costs output: a big bar off the constraint may make nothing more when fixed. Read it with the Pareto read beneath the drill, which says which bars are on the constraint and which come back week after week.',
  },
  'FC-053': {
    intro: 'For a machine that seems to stop most days but only shows up in the totals. The grid puts every machine against the last four weeks, day by day, so a daily nuisance and a single bad Tuesday look different.',
    steps: [
      {
        step: 'Log every stop against its machine',
        means: 'The grid is made from the line’s stops log: each cell is the minutes a machine was stopped that day, with overlapping stops counted once. Without a machine named on a stop, it cannot appear.',
        doThis: 'Pick the machine on every stop as you time it. Machines appear in the line’s flow order, and any not on its list follow, the most stopped first.',
        youGet: 'A row for every machine with at least one minute of stops in the last four weeks.',
      },
      {
        step: 'Where and when it stops',
        means: 'On the line’s capacity page, a grid with a row a machine and a column a day, four weeks ago to today. A cell is darker the more minutes were lost; a blank cell is a day with no stops. It is neutral ink, never a state colour.',
        doThis: 'Look across a row for a band — a machine stopped on most days — and down for a single dark cell, one bad day. The word constraint beside a machine means it is the machine that holds the line. Tap a cell to open the stops behind it.',
        youGet: 'A band across the grid is a chronic loss; one dark cell is a one-off. A tapped cell lists that day’s stops, each with its minutes and reason.',
      },
      {
        step: 'The grid’s sentence',
        means: 'The picture is never the only carrier: the sentence under the heading names the worst cell and the machine stopped on the most days.',
        doThis: 'Read it: “The worst day: the Flow wrapper on Tue 14 Oct — 85 min. The Flow wrapper stopped on 18 of 28 days — a chronic loss, not a bad day.” A machine stopped on at least 14 of the 28 days is called chronic.',
        youGet: 'A decision about method: a chronic machine needs restoring and its checks; a bad day needs a root cause.',
      },
    ],
    watch: 'A day with less than a minute of stops shows as a blank cell, and a machine with no stops logged against its name does not appear at all. An empty row can mean a quiet machine or one nobody logged.',
  },
  'FC-054': {
    intro: 'For choosing what to do about a loss. Effort goes into last week’s bad day instead of the loss that is there every week; the page labels each ranked loss chronic, recurring or a one-off, so you pick the right approach for each.',
    steps: [
      {
        step: 'Keep the log by week',
        means: 'The label is worked out from the stops log over the last six weeks: in how many of them did this loss appear at all? It needs a few weeks of stops with reasons to say anything useful.',
        doThis: 'Time every stop with a specific reason, week after week. Loose reasons like “mechanical” merge a chronic jam with a one-off breakdown, and the label then means nothing.',
        youGet: 'A log from which each cause’s weeks can be counted.',
      },
      {
        step: 'Read the label on each loss',
        means: 'On the line’s Analyse page, the reading under the Pareto gives each of the biggest causes a label. Chronic is four or more of the last six weeks; recurring is two or three; a one-off is one week only.',
        doThis: 'Read the words beside each cause: “chronic — 5 of the last 6 weeks”, “recurring — 3 of the last 6 weeks”, “one week only”, or “not in the last weeks”. Read them with the on-the-constraint words beside them.',
        youGet: 'Each ranked loss told apart by how often it comes back, not only by how big it is.',
      },
      {
        step: 'Choose the approach',
        means: 'The three need different responses. A chronic loss is usually small, frequent and accepted as how the machine is; it is removed by restoring the machine to its basic condition and by the operators’ own checks. A one-off, large, noticed loss needs a root-cause look. A recurring one needs watching for a pattern first.',
        doThis: 'Chronic: restore the machine and set the operators’ checks. One-off: find the root cause once. Recurring: stratify before choosing — the same shift, product, reel or person? After a fix, read it again later to see if it held.',
        youGet: 'The right method for each loss. A chronic loss investigated as a one-off wastes the investigation on a symptom, and a one-off merely “restored” comes back.',
      },
    ],
    watch: 'Six weeks is the window the app uses, so a seasonal loss needs a longer look than it gives. And chronic is a word about frequency: whether it is accepted is for the people to decide.',
  },
  'FC-055': {
    intro: 'For short stops — jams, film tracking, label faults — that are too quick to log one by one and add up to the biggest loss. Watch the machine run, tap a button each time it happens, and the page gives how often and, if you time them, how long.',
    steps: [
      {
        step: 'What are you counting?',
        means: 'A study counts one thing or several on the same watch, each with its own button. For short stops you add the short stop; a stop, jam or failure can sit beside it. Each thing counted gets its own MTBF (the mean running time between them), failure rate and cost.',
        doThis: 'On New reliability study, under Add something to count, tap short stop (or type your own — Your own — e.g. bottle down) and Add. Optionally set MTBF wanted, minutes and Minutes the line stands each time. The project’s owner sets this up before the watch starts.',
        youGet: 'A button for each thing counted, named in the floor’s words, ready for the watch.',
      },
      {
        step: 'Count only, or time each one',
        means: 'Counting alone gives how often. Timing each stop also gives how long, and so the minutes lost. A timed one takes the machine out of running: its minutes come off the watched time, so the MTBF is of running time.',
        doThis: 'Under More about it, set Timing to Count only, or to Time each one — a stop (help arrived, running again). With timing, add the reasons (jam, film break…) — they become the buttons on the stopwatch. Do not time something that does not stop the machine.',
        youGet: 'Either a plain tap, or Stopped — reason … Running again buttons, and a time said (90 s, 1:30) as a way to put right one you could not watch.',
      },
      {
        step: 'Start the watch and tap',
        means: 'The watch counts only the time you are actually watching the machine run. Stop it while the machine is down or no one is looking, so the rate is of running time, not of the clock on the wall.',
        doThis: 'Press Start the watch when you begin watching the machine run, tap the short-stop button each time you see one, and Stop the watch when you leave. A tap can be undone, and a note added on the spot. A watch left on all night is asked about.',
        youGet: 'A list of every tap with its time, the watched time, and the count in watched hours.',
      },
      {
        step: 'How often and how long',
        means: 'MTBF is the average running time between short stops: the watched time divided by the count. The failure rate is its reverse, stops an hour. The page gives a range it is 90% sure of, because a short watch gives a rough answer.',
        doThis: 'Read the tiles — MTBF, Failure rate, Watched, Short stops and What it costs — and the sentence. Watch long enough for the range to narrow. Where stops were timed, Repair times shows the minutes lost, and what the stops were by reason.',
        youGet: 'How many short stops an hour, how long between them, and with durations the minutes lost in total, and what they cost where the line’s cost is known.',
      },
    ],
    watch: 'A stop counted but never timed is taken as long as the timed ones, and the page says how many that was. Time enough of them, or the minutes lost are an estimate, not a measurement.',
  },
  'FC-057': {
    intro: 'For when projects are chosen by who shouts, not by where the money is lost. Type a period’s losses in pounds by kind and by process, and the page ranks them and says what a project aimed at one would return and how fast it pays back.',
    steps: [
      {
        step: 'Name the period',
        means: 'The matrix is for one period — a week, say. The name only names the paper; the sums do not depend on it.',
        doThis: 'Start a New calculation and type the Period, for example Week ending 12 Oct. The page’s sentence speaks of a week, so type one week’s pounds in the cells.',
        youGet: 'A named calculation to keep, compare with the next period and put on paper.',
      },
      {
        step: 'The loss matrix',
        means: 'A grid of five kinds of loss against four processes. The kinds are Breakdowns, Changeover, Short stops, Rejects and Give-away; the processes are bagger, filler, case packer and checkweigher. Each cell is the pounds that loss cost at that process in the period.',
        doThis: 'Type pounds into the cells you know. Each is already converted from minutes or packs — take them from the loss count, SMED and the capability study’s give-away, which are costed there. Leave a cell empty rather than guess; at least one is needed.',
        youGet: 'The total and each loss’s share. Empty cells stay empty; nothing is filled in for you.',
      },
      {
        step: 'Causal move (optional)',
        means: 'A loss often shows at one process and is caused at another: starvation at the filler may be caused by the bagger. A causal move shifts value from where the loss is seen to where it starts, so the money lands on the real cause.',
        doThis: 'Pick Causal move — loss type, From process, To causal process and the Amount to move in pounds. It can move no more than is in the From cell; an over-large move is refused and said.',
        youGet: 'The same total, with the money moved to its cause — and a line in the sentence saying what was moved.',
      },
      {
        step: 'A project (optional)',
        means: 'To see which project would buy most, name the loss it would attack, the share of that loss it is expected to recover, and what it costs. The page works out the weekly return and the payback.',
        doThis: 'Choose Project — which loss, type Recovery expected (% of that loss) and Project cost, £. Payback uses 4.33 weeks to the month, as the page says.',
        youGet: 'Tiles Project return a week and Payback in months — for example 60% of changeover recovered returns £1,140 a week and pays back £28,000 in about 5.7 months.',
      },
      {
        step: 'Read the ranking',
        means: 'The verdict gives the total and the top loss, the sentence names the biggest two, and the closing line says which to chase first with its share of the money. It ranks money, not minutes.',
        doThis: 'Read “Losses total £10,100 a week: Breakdowns £3,000 (30%), then Give-away £2,200”, then the tiles Total, Top loss, Project return and Payback. Change the recovery or the loss under What if… to try another project before you pick one.',
        youGet: 'The ranked losses by cause in pounds and the project that buys most, on paper for the people who decide.',
      },
    ],
    watch: 'This is a calculator over figures you type, not a plant-wide system: shift losses and SMED do not fill the matrix for you yet, the four processes are fixed, and a cell wrongly priced misranks everything. Use the same prices as the loss count so the numbers agree.',
  },
};
