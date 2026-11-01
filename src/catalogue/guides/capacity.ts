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
        doThis: 'When every step is timed and you are happy with the takt, tap Set as the standard. Reopen to time again if the work changes.',
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
        youGet: 'The line’s rate, the limiting station and the labour a pack for the what-if beside the line as run, in the same tiles.',
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
};
