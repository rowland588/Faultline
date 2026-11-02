/* GUIDES — operations: check logs, calculators, the cost model's parts, visual and daily management, and the project's
 * ways through (the discipline's tools; src/catalogue/guide.ts). Each is written from the tool’s real page — its own
 * labels, in the order a person meets them — as what a step means, what to do there and what you get; nothing the page
 * does not do. The check logs share one shape (FC-236); each kind’s guide says what is particular to it. */
import type { Guide } from '../guide';

export const OPERATIONS_GUIDES: Record<string, Guide> = {
  'FC-236': {
    intro: 'For any check that has to be done on a schedule or when something happens — metal detector test pieces, an allergen clean, an ATP swab, a 5S or GMP walk, a motor temperature — when you need to know that every one was done when it was due, and what a failure put in doubt. Every kind of log is this same page with its own starter list.',
    steps: [
      {
        step: 'Start a log',
        means: 'A check log is one list of checks for one line, started from a kind’s starter list. The Check logs page groups the kinds (Food safety, Lean, Maintenance, Packaging and more) and says, for each, how many logs are here and how many checks are overdue, failed or due now.',
        doThis: 'Open Check logs, pick the kind and press New … log. Choose the line (a log is always a line’s: its machines, its rate and its problems are the line’s), type the detector, machine or area if the checks are all in one place, name it if you like, and tick the starter checks you will really do. Press Start it.',
        youGet: 'A log of its own on the line, opening on its Round with the checks you ticked. The line’s page lists it under Logs, with its state in words.',
      },
      {
        step: 'The checks as agreed',
        means: 'The list the log is judged against: what is checked, where, by whom, how often, what passes, any limits, and what to do if it fails. It is agreed before the checks are done, so a result cannot be bent afterwards. The starter list is a starting point to edit, never the standard; each kind says what it rests on and what is still to confirm.',
        doThis: 'Open The checks and read “What this list rests on” and “To confirm”. Then Edit each check to match your own validated plan: How often (Every … minutes, hours, shifts, days or weeks; At start-up; After a changeover; When something happens), the kind of answer it takes (Pass or fail, A number against a limit, A scored checklist, A count in a slot), What passes or the limits, What to do if it fails, and the priority of the problem a failure raises. Take off a check you do not do, or Add a check. The owner edits; everyone else reads.',
        youGet: 'A list that is yours. A check taken off keeps its results and is no longer due, and Undo puts it back. A result is never erased.',
      },
      {
        step: 'The Round',
        means: 'What wants doing now, a card for each check: Due now first, then Done, then When it happens. A check made every so often is due that long after it was last done; it is on time if done within a quarter of the interval after that (never less than 5 minutes, never more than 12 hours) and missed after. Doing one early counts, and the next follows from it. A check done when something happens is counted when done and is never overdue.',
        doThis: 'Open the Round at the start of the shift and work down Due now. Each card says where, who and how often, what passes, and how it stands in words and colour: Done (green), Due soon or Due now (amber), Overdue or Failed (red), When it happens (grey). A check made every shift counts a shift as eight hours.',
        youGet: 'The most overdue first, so the list is the order to deal with it. When two or more pass-or-fail checks are due together, a Pass all due button appears.',
      },
      {
        step: 'Pass, record or audit',
        means: 'Each check is answered the way its kind asks: tap ✓ Pass or ✗ Fail; type a Reading and press Record against its limits; press Start the audit for a scored checklist; or type what was Counted this slot. A pass or a reading is one tap with an Undo.',
        doThis: 'Do the check at the place, then answer on its card as you do it, not at the end of the shift. Pass all due · N names the checks first and records nothing until you press Pass N checks; one Undo takes them all back. A reading, a count or an audit is never passed in bulk, and a failed check is checked again on its own card.',
        youGet: 'A result stamped with the time and your name. A reading outside its limits is said before it is recorded (“Above the upper limit … this will be a failure”) and opens the failure sheet.',
      },
      {
        step: 'A failure, and what it holds',
        means: 'A failed check puts in doubt everything made since the last good one, for a check that holds product. The sheet says what that is before you record it: the minutes since the last pass, the packs made in them, and what those packs cost in materials. The page states the rule; whether product is held, re-run, released or scrapped is the site’s decision, never the page’s.',
        doThis: 'Tap ✗ Fail. Read what is held and what to do. Say what happened, and if you counted the packs made since the last good check, type them; otherwise the page works them out from the line’s rate. Press Record the failure, then check again as soon as you can: a pass clears it. A re-check that fails again adds a step to the first problem, not a second one.',
        youGet: 'The failure in History with what it held, and a problem raised on the register at the check’s priority, so it counts in Problems and in the action plan. The packs need the line’s rated speed (or Line capacity’s rate) or your count, and the money needs the line’s materials a pack; each is optional and the sheet names whichever is missing.',
      },
      {
        step: 'Done on time, Missed, Failed',
        means: 'The tiles at the top, each of what it should be and since the 7 days before: checks done on time of those due in the last 7 days, due moments that passed with no check, checks failed and, for a kind that holds product, the packs held. A scored log adds its latest score.',
        doThis: 'Read the sentence under the tiles first, then the tiles; only the abnormal number is coloured, and a zero is grey. The closing line at the foot is what to say at the meeting. For a program to be judged by this log, set “Results in a row, every check, that must pass” under its name: the program then reads the latest results of every check, none failing, which stays true where “up to date” turns overdue with the clock.',
        youGet: 'A verdict on the band (Up to date, N due, N overdue or N checks failed), the tiles, the sentence and the closing line.',
      },
      {
        step: 'History',
        means: 'Was each check done when it was due, what failed and what each failure held, how a reading is moving against its limits, how an audit’s score is moving, and every result ever recorded.',
        doThis: 'Open History. The compliance table gives each check its Due, On time, Missed, Done and Longest gap, which is the longest the line ran with it not done. Read each reading’s picture against its limits and each audit’s scores in order. Under Every result, Strike a wrong result: it stays on the list, left out of the figures, and Put back restores it.',
        youGet: 'The table for the meeting, the failures with what each held, and a record that is only ever struck, never edited. After 20 pass-or-fail checks with none failed the page says at most about 3 in n could still fail, 95% sure (1.5% for 200). That is a bound, not a guarantee.',
      },
    ],
    watch: 'A failure stands until that same check is done again and passes. And the starter list is not your standard: edit it to your own validated plan before the first round, or the log is a tick-list that holds you to someone else’s.',
  },
  'FC-170': {
    intro: 'For every metal detector and X-ray unit on a line, usually a critical control point: the test pieces put through at the times your plan says, and what a missed one puts in doubt. It works as every check log does; this is what is particular to the detector.',
    steps: [
      {
        step: 'The test pieces, and when',
        means: 'Each test piece is its own check: a ferrous, a non-ferrous and a stainless-steel piece, hourly, and all three again at start-up, after a changeover and at the end of the run. The sizes, where they go through the aperture, the sensitivities and the frequency are your validated plan; the starter list sets none of the sizes.',
        doThis: 'Open Check logs, Metal detection checks, New metal detector check log. Pick the line, type the detector as the line calls it and tick the checks you run. Then in The checks Edit each one: how often, and What passes in your words, with the piece size and position from your procedure. Read “To confirm”: it lists your retailer’s code of practice and the detector’s validation, which this page has not read.',
        youGet: 'A log with a check for each piece. The hourly ones come due each hour; the start-up, changeover and end-of-run checks sit under When it happens and are never overdue.',
      },
      {
        step: 'Detected and rejected',
        means: 'A pass is two things at once: the detector found the piece, and the reject removed the pack. A piece that was detected but not rejected is a fail, because the pack would have gone on.',
        doThis: 'Put each piece through in the pack, at the worst position your procedure names, then tap ✓ Pass or ✗ Fail on that piece’s card. When the three hourly pieces go through together, Pass all due · 3 names them and records them at one moment when you confirm.',
        youGet: 'The card turns Done and says when the next is due. A missed hour shows as Missed, and History gives the longest gap the detector ran unchecked.',
      },
      {
        step: 'A miss: stop, tag, hold',
        means: 'A missed piece puts in doubt everything made since the last good check. The sheet works the window out, the time since the last pass at the line’s rate, and says it before you record it.',
        doThis: 'Tap ✗ Fail. The sheet says what to do: stop the line, tag the detector, hold everything made since the last good check and run it through a working detector, and check it again before the line restarts. Say what happened (for example, the reject arm air line) and, if you counted the packs made since the last good check, type them. Press Record the failure, then re-check and tap ✓ Pass.',
        youGet: 'The failure in History, worded like “Held: 60 min since the last good check — 6,600 packs (at the line’s rated speed)”, and a Critical problem on the register. The packs need the line’s rated speed or your count, and the money the line’s materials a pack; each is optional and the sheet names whichever is missing. Hold, re-run, release or scrap is the site’s call; the page only records it.',
      },
      {
        step: 'A clean record, and what it cannot show',
        means: 'After 20 or more pass-or-fail checks with none failed, History says how many could still fail: at most about 3 in n, 95% sure (200 clean checks: at most 1.5%). It is a bound, not a guarantee, and it cannot see a detector drifting toward its threshold because the signal strength on each piece is not recorded.',
        doThis: 'Look at History each week. The compliance table shows whether the checks were done as often as the plan says, and “Failures and what each held” lists the misses. Start-up, changeover and end-of-run checks are counted when done, not scheduled, so a skipped one is not known: look at them on the Round.',
        youGet: 'The weekly proof for an audit: checks done on time, the longest gap, every failure with what it held and the problem it raised.',
      },
    ],
    watch: 'The starter list sets none of the piece sizes. Type the sizes and positions from your validated plan into What passes, or the log only records that someone tapped.',
  },
  'FC-171': {
    intro: 'For every allergen changeover — nut, sesame, milk, gluten — once the validated clean has been done and you need to show it was verified before the next product starts. The validation itself (allergen testing after worst-case cleans) is kept outside this log; this verifies each changeover.',
    steps: [
      {
        step: 'The changeover list',
        means: 'Five checks done after a changeover: a visual check of the product-contact areas, three swabs at the hardest-to-clean sites, and Release signed. They sit under When it happens and are counted when done, never overdue. The swab method and limits are your validation’s, not the page’s.',
        doThis: 'Open Check logs, Allergen changeover verification, New allergen verification check log. Pick the line and type the Site. In The checks Edit each swab: name your real hardest sites instead of “hard-to-clean site 1”, and say in What passes which swab is used, an allergen-specific swab kit or ATP only where you validated ATP as a proxy for that allergen on that line. Read “To confirm”.',
        youGet: 'A log whose checks are your sites and your swab, ready for the next changeover.',
      },
      {
        step: 'Visual, then the swabs',
        means: 'After the validated clean and before the next product: look at the contact surfaces for residue and previous product, then swab the hardest sites and read each swab against the limit for your kit.',
        doThis: 'Tap ✓ Pass on the visual check when the surfaces are clean and free of previous product. Then tap ✓ Pass on each swab as it reads within your limit, or ✗ Fail on one that does not. Do this on every allergen changeover.',
        youGet: 'A card for each check showing when it was last done and by whom, kept under When it happens.',
      },
      {
        step: 'Release signed',
        means: 'The last check: release is signed only when every check before it passed. It records who signed and when, so the next product starts on a recorded pass.',
        doThis: 'Tap ✓ Pass on Release signed only when the visual and every swab have passed. If anything failed, do not sign; see the next step.',
        youGet: 'A result stamped with your name and the time. The page does not stop you tapping it early: it records the team’s rules, and release is your decision, never the page’s.',
      },
      {
        step: 'A check that fails before release',
        means: 'A failure here raises a Critical problem. The sheet tells you not to start the next product, to re-clean to the validated procedure, to re-swab the failed sites, and to sign release only when every check passes.',
        doThis: 'Tap ✗ Fail on the visual or swab that failed, say what happened and press Record the failure. The sheet also works a hold out from the last time that same check passed, which for a changeover check is the last changeover. If the next product had not started, type 0 (or the packs you counted) in “Packs made since the last good check”, so the page does not guess from the line’s rate. Re-clean, re-swab and tap ✓ Pass on each as it passes.',
        youGet: 'The failure in History, a Critical problem on the register, and a clean pass on the re-check that clears it. ATP verifies an allergen only where the site validated it as a proxy.',
      },
    ],
    watch: 'This log never shortens the validated clean and never decides a release. It records that the verification was done and who signed; the matrix of which changes need the full clean is not built here.',
  },
  'FC-172': {
    intro: 'For checking that a clean worked before production starts: product-contact sites swabbed and read on a luminometer, each against a limit you set. It shows which sites keep failing, which says where the cleaning method or the design is wrong.',
    steps: [
      {
        step: 'The sites',
        means: 'Each swab site is a check, taken after the clean and before the line runs. The starter list has the filler hopper, the conveyor belt, the slicer blade guard and the depositor nozzle, each once a day, read in RLU.',
        doThis: 'Open Check logs, Cleaning verification (ATP), New ATP swab log. Pick the line and tick the sites. In The checks Edit them to the product-contact sites that are hardest to clean on your line, and Add the ones that are missing.',
        youGet: 'A log with a daily pre-op check for each site, with the Site (the surface) on every card.',
      },
      {
        step: 'Each site’s limit, from your baseline',
        means: 'ATP is bioluminescence: the luminometer reads relative light units (RLU), and the more organic residue on the surface, the more light. What counts as clean is not a universal number. It is set for each site from swabs on surfaces you know are clean, and the starter list sets none.',
        doThis: 'Swab each site after a clean you trust, several times, and keep the readings. In The checks Edit the site and type Highest allowed in RLU, the fail limit. The page’s own note says a common practice is to pass under the baseline’s 95th percentile and fail at twice that, and that the luminometer maker’s defaults are only a start. If a caution reading should also be re-cleaned, set the fail limit at the caution level: the log has one upper limit, not three bands.',
        youGet: 'Readings judged against a limit. With none typed, the reading is recorded and trended and the page says it is not judged.',
      },
      {
        step: 'The swab',
        means: 'One reading in RLU for each site, taken after the clean and before production starts. The person who swabbed types the number; the luminometer is not connected to the app.',
        doThis: 'On the Round, type the number from the luminometer in the Reading (RLU) box on that site’s card and press Record. A number above the limit is said before it is recorded (“Above the upper limit … this will be a failure”) and opens the failure sheet.',
        youGet: 'A recorded reading with the time and your name, and under Readings against their limits a picture of each site’s readings against its limit.',
      },
      {
        step: 'A fail: re-clean and re-swab',
        means: 'A reading over the limit means the site was not clean enough to start. The sheet tells you to re-clean the site to the hygiene method, re-swab, and not start production on that line until the reading passes the limit you set. A pre-op swab holds no product, because none has run.',
        doThis: 'Press Record the failure, say what happened, then re-clean and re-swab. Record the new reading: a pass clears the failure. A caution reading released as a pass under time pressure is misuse, so write the site’s rule on the check.',
        youGet: 'The failure in History and a High priority problem on the register. The page does not price the wait for the re-clean.',
      },
      {
        step: 'Which sites keep failing',
        means: 'A site that fails again and again points at the method (a different brush, more time, a dismantle) or the design, not at the person swabbing.',
        doThis: 'Open History. Read each site’s picture of readings against its limit and the list “Failures and what each held”; the compliance table shows whether every site was swabbed every day.',
        youGet: 'The sites to re-method, and the evidence that cleans are signed off with a number. ATP shows residue, not pathogens; environmental monitoring answers the other question.',
      },
    ],
    watch: 'ATP measures organic residue, not microbes and not allergens, unless you validated it as a proxy for that allergen on that line. A limit you did not set from your own baseline is only a guess.',
  },
  'FC-177': {
    intro: 'For the walks and audits a site runs itself — a daily GMP walk by the team leader, a weekly hygiene audit by a manager, a layered process audit — when you want a score, the findings actioned, and the ones that come back marked. It scores your own walk; it does not grade a certification audit.',
    steps: [
      {
        step: 'The walk and who does it',
        means: 'A fixed checklist, walked at a set frequency by different levels. The starter list has a GMP walk by the team leader every day and a GMP and hygiene audit by a manager every week, each of 20 questions under five headings: People, Premises and equipment, Cleaning and hygiene, Foreign body control and Records.',
        doThis: 'Open Check logs, Scored audits, New audit log. Pick the line and type the Area. In The checks Edit the audit: the questions are one a line, a heading then a bar then the question (“People | Visitors are signed in”), so change them to your own GMP rules and your customers’ audit questions. Type a Score to reach, in %, if you have agreed one.',
        youGet: 'A log whose audits are due daily and weekly, with your questions. The starter questions are written for Faultline; they are not any standard’s or any customer’s checklist.',
      },
      {
        step: 'Start the audit',
        means: 'Each question is answered on one scale: 0 Not met, 1 Partly met, 2 Met, or N/A when it does not apply to the area. The same questions every time are what let one audit be compared with the one before.',
        doThis: 'Press Start the audit on the Round and walk the area with your phone, answering as you see each thing. The top says how many are answered and the score so far. Finish stays off until every question has an answer, and a note on the audit is optional.',
        youGet: 'A running count as you go (for example “12 of 20 answered · 88% so far”) and the audit kept as it was asked, so editing the list later never re-scores an old audit.',
      },
      {
        step: 'Findings, raised as problems',
        means: 'Every answer below Met is a finding. Each can be raised as a problem on the register with an owner and a day, so an audit turns into actions. A finding that was also below Met in the audit before is marked as having come back.',
        doThis: 'Press Finish. With findings, the page says the score, the number of findings and how many came back; tick the ones to raise and press Save the audit and raise N problems. With none, the audit is saved at once. Close each with evidence, and look for the cause in the system (the record, the schedule, the design) in a finding that has come back, not another re-training.',
        youGet: 'A problem for each ticked finding, at the check’s priority (Low on the starter audits) and High when it came back, in Problems and the audit’s action plan.',
      },
      {
        step: 'The score and the weakest heading',
        means: 'The score is the share of the maximum: the points scored divided by the most that could have been scored on the questions that apply, overall and for each heading. N/A questions are left out of both sides. A walk of 36 points out of 40 is 90%.',
        doThis: 'Read the Latest score tile (against the audit before) and the line under What it means that names the weakest heading (“… is the weakest at 80%”). In History the table gives each heading’s score and marks the weakest.',
        youGet: 'Where to put the effort first. The number matters less than its direction and the heading that is weakest.',
      },
      {
        step: 'Falling, and coming back',
        means: 'A fall two audits running is the signal. A repeat is the same question below Met twice running, which means the last fix treated the symptom.',
        doThis: 'Open History: Audits, in order shows the scores and says “Fallen 2 audits running” when they have. Findings that came back are marked beside each question. Take those to the meeting first.',
        youGet: 'The trend of the audit and the findings that repeat, which are the ones that need a different kind of fix.',
      },
    ],
    watch: 'A finding’s severity is the priority you give the problem it raises; the page does not classify it. A repeat is the same question twice, not the same fault asked in another question. It does not grade a certification audit; the standard’s grading bands are not built.',
  },
  'FC-234': {
    intro: 'For the warning signs a machine gives before it fails — a motor running hotter, a bearing, a belt wearing, a noise that is not normal — read by a person along a route and watched for the direction they are heading. Nothing is read from a sensor: every number is typed.',
    steps: [
      {
        step: 'The route',
        means: 'Each point on the route is a check: the place you hold the thermometer, the gauge or your ear. The starter list has a motor, a bearing and a gearbox temperature each day, a belt wear gauge each week and “Noise — normal for this machine?”.',
        doThis: 'Open Check logs, Condition checks on a route, New condition reading log. Pick the line and tick the points. If they are on different machines leave the place box empty, then in The checks Edit each point: name it as a person walking the route would find it (“Conveyor 2 drive motor”), say how often and give the unit (°C, mm). Add a point for every one you walk. A route can mix numbers with pass-or-fail checks like the noise one.',
        youGet: 'A log with a card for each point on the Round, the ones due first at the top.',
      },
      {
        step: 'A limit for each reading',
        means: 'A reading means little without the line it must not cross. Lowest allowed and Highest allowed come from the machine maker’s data or your fitter, and the starter list sets none. With neither, the reading is recorded and trended and the page says it is not judged; with both, it can also say how near the limit it is.',
        doThis: 'Before the first round, Edit each point in The checks and type Lowest allowed and Highest allowed (either, or both) with the unit. Take them from the maker’s instructions or ask the fitter; a typical figure from memory is not a limit.',
        youGet: 'A pass or fail on every reading, and for a point with both limits, how much room is left.',
      },
      {
        step: 'Take the reading',
        means: 'One number for each point, read by a person: an infrared thermometer on a motor or bearing, a wear gauge on a belt, your ear for a noise. It is typed on the card; nothing is read from the machine.',
        doThis: 'Walk the route and at each point type the number in the Reading box on its card and press Record. For the noise tap ✓ Pass if it sounds as it always does, or ✗ Fail if it does not. A number outside its limits is said before it is recorded and opens the failure sheet.',
        youGet: 'A reading kept with the time and who took it, and a line on the card such as “70 °C — 14% of the band from the upper limit — rising 1.31 °C a reading” (limits 40 and 75, eight daily readings).',
      },
      {
        step: 'Nearing its limit',
        means: 'A reading can be inside its limits and still be heading for one. The page calls it nearing when it is within 15% of the band between the two limits from either of them (Faultline’s choice, said on the page). It is a reason to look today, not an alarm.',
        doThis: 'Read the line on each card and, in History, Readings against their limits. A nearing reading is amber with how much of the band is left. If a reading is outside a limit, record the failure: the sheet says to tell the fitter and not to wait on a climbing reading, and raises a High problem on the register. A condition reading holds no product.',
        youGet: 'The points nearing their limit at the top of the list of things to look at, before any of them has failed.',
      },
      {
        step: 'The trend by point',
        means: 'From eight readings the page says which way a point is heading. It uses the Mann–Kendall test, which asks whether the readings rise or fall steadily rather than wander, and Sen’s slope, which gives the typical change a reading. One odd day moves neither much. A trend is said only when it is clearly there (p under 0.05).',
        doThis: 'Take each point at the same time and place so the readings can be compared, and let eight build up. Then read the line under the point’s picture: “rising …” or “falling …” a reading, or nothing said. A steady climb inside the limits is the warning this log exists for.',
        youGet: 'A direction and a rate for each point. It is a reason to look, not a prediction of the day it will cross the limit.',
      },
    ],
    watch: 'A limit that did not come from the maker or the fitter is a guess. This log records and trends; it does not plan the fitters’ work and it does not rank machines.',
  },
  'FC-183': {
    intro: 'For a material the line cannot run without — film reels, trays, labels, a long-lead ingredient — when running out stops the line and you need to know how much to hold and when to reorder. It sizes one item at a time, ordered when stock falls to a reorder point.',
    steps: [
      {
        step: 'What is it of?',
        means: 'A calculation is a named, saved set of figures for one situation. Naming it for the material, and the line if you know it, lets the line’s figures be offered later and puts it in the line’s report.',
        doThis: 'On Calculators pick Safety stock and reorder point and press New calculation. Type what it is of (for example Film reels for the packer), choose the line if you know it (optional) and press Start it.',
        youGet: 'A saved calculation that works out the answer as you type, with nothing to press.',
      },
      {
        step: 'Use and delivery, as they really run',
        means: 'Four figures describe the item: how much is used a day on average, how much that swings from day to day (the standard deviation of the daily use), the days from order to delivery on average, and how much that swings. The swings are what the safety stock is held against.',
        doThis: 'Use the days the line ran, not the days in the week. Count the daily use over a few weeks and put the spreadsheet’s STDEV of those days in “How much a day’s use swings”. For delivery, measure the days from orders you actually placed (a contract’s promised days are not a measure) and type how much they swing. Zero is right only if the item always arrives on the day promised.',
        youGet: 'The use while an order comes (use × days) and the spread over that time, ready for the service level.',
      },
      {
        step: 'Chance an order arrives before you run out',
        means: 'The service level is the share of orders that arrive before stock runs out: 90, 95, 97.5, 98, 99 or 99.5 in 100. A higher level needs more safety stock. 95 is Faultline’s starting point, a choice and not a rule.',
        doThis: 'Choose by what running out costs, not by habit: a film reel that stops the line is not a box of spare gloves. The right level weighs what running out costs against what holding more costs, for this item.',
        youGet: 'The safety factor z for that chance (how many spreads of cover it takes) and the safety stock, z times the spread of use over the lead time.',
      },
      {
        step: 'Reorder point and safety stock',
        means: 'The reorder point is what is used while the order comes plus the safety stock, rounded up. Order when stock falls to it. The safety stock is the part held only against the swings.',
        doThis: 'Read the sentence, then the tiles: Reorder point, Safety stock, Used while it comes, Service and Holding it. Read which source gives most of the spread and what the safety stock would be if it varied half as much. Under Check these, a warning appears when the swing is more than half of what is used while the order comes: the bell-shaped model then understates the stock.',
        youGet: 'A figure such as “Reorder when stock falls to 21 reels: 12 are used while the order comes, and 8.5 more are held so that about 98 orders in 100 arrive before it runs out”, and the working line by line under How it is worked out.',
      },
      {
        step: 'In money — all optional',
        means: 'Holding the safety stock costs money every year, and each stock-out costs too. The page puts a pound figure on both from your own figures so the service level can be weighed.',
        doThis: 'Open In money and give what you can: the units in an order, the days a year the line runs, what one unit costs, the cost of holding stock for a year in % and what running out costs each time. Finance has the holding rate (the industry quotes 15–35%, but the page never fills it in). Leave any out.',
        youGet: 'What holding the safety stock costs a year and, at this level, how many orders a year run short and what that costs, or a line naming the figure still missing. The reorder point stands without any of them.',
      },
      {
        step: 'What if, and before → after',
        means: 'Change one figure and watch the answer move without keeping it, or save the figures as the before so a change reads as a before → after.',
        doThis: 'Under What if… pick a figure (the supplier’s swing, the service level) and type another; the answer and the money show beside the present ones and Make it so keeps it. Press Save as before first if you want the next figures read against these.',
        youGet: 'The effect of steadier deliveries or a different service level in units and pounds. Steadier deliveries or steadier use come straight off the safety stock.',
      },
    ],
    watch: 'It assumes use over the lead time is bell-shaped. For slow or lumpy items, some days nothing and some days a lot, it understates the stock needed. The service level is the chance an order arrives before you run out, not the share of demand filled.',
  },
  'FC-191': {
    intro: 'For a spend that looks small until someone asks what it saves: a splice table, a SMED kit, a guard. It says how soon the spend pays for itself and what it is worth over its life, from a saving a tool measured, so a small fix can be funded.',
    steps: [
      {
        step: 'How the saving is known',
        means: 'The saving a week is the heart of it, and it can come three ways: you know it already, you know a loss and the share a fix should recover, or the fix gives back hours of labour.',
        doThis: 'Pick one: “I know the saving a week” (from the tool that measured it), “A loss and the share the fix recovers” (the way SMED or the loss count says it) or “Hours saved at the wage”. Name what is being bought if you like; it only names the sentence.',
        youGet: 'Only the boxes that way needs.',
      },
      {
        step: 'The saving',
        means: 'What the fix gives back each week the line runs, in pounds. It should be a figure a tool measured, not one invented for the form: the loss count’s idle labour or lost contribution, SMED’s changeover cost, a capability study’s give-away.',
        doThis: 'Type the Saving a week; or the loss now a week and the share the fix recovers; or the hours saved a week and one person’s cost an hour (the line’s wage with on-costs is offered if the calculation is on a line that has one). Savings in lost time away from the bottleneck are labour, not contribution.',
        youGet: 'A saving a week and how it was made, for example 60% of a £1,900 loss is £1,140 a week.',
      },
      {
        step: 'Weeks a year, and years counted',
        means: 'The saving is only earned in the weeks the line runs, and only counts for the years the fix lasts. Both are the business’s policy and are asked, never assumed.',
        doThis: 'Type the weeks a year the line runs (48, 50 and 52 give different years) and the years the saving is counted for: the machine’s life, or the business’s policy; three to five years is usual.',
        youGet: 'The saving a year, and the length of life the NPV is worked over.',
      },
      {
        step: 'The investment and the discount rate',
        means: 'The investment is what it costs once. The discount rate is the business’s own yearly return on money; it is what lets a saving next year be set against a cost today. Finance has it, and the page never fills it in.',
        doThis: 'Open In money. Type the cost: price, fitting, training and any production lost to fit it. Type the discount rate as a number of percent, 10 for 10%; the page warns on one that looks like a fraction. Either is optional and the page says which it still needs.',
        youGet: 'The tiles that need them: payback, NPV and return.',
      },
      {
        step: 'Payback, NPV and IRR',
        means: 'Payback is the running weeks for the saving to repay the cost. NPV, net present value, is the saving over the years discounted at the business’s rate, less the cost: above zero it is worth more than the money would earn. IRR is the rate at which the NPV would be zero; set it against the business’s hurdle rate. Return a year is the saving a year divided by the cost.',
        doThis: 'Read the sentence, then the tiles: Payback, Saving a week, NPV, Return a year, IRR and Spend. Red appears only by arithmetic: an NPV below zero, or a payback longer than the years counted. Never green.',
        youGet: 'For example a £4,800 splice table saving £310 a week, over 48 weeks a year for 3 years at 10%: pays back in 15.5 weeks of running, NPV £32,204.',
      },
      {
        step: 'How firm is it',
        means: 'The saving is expected, not banked, until the tool that measured the loss measures it again after the spend. The page tests two worse cases.',
        doThis: 'Read “With the saving halved” and “With the cost up a quarter”: each says the new payback and whether the NPV still pays. Then book the saving only when the loss has been measured again after the spend, and use Save as before to keep these figures for the comparison.',
        youGet: 'A decision that survives a worse case, and the before → after against the measured loss.',
      },
    ],
    watch: 'It takes a constant saving a week and a cost all up front, with each year’s saving at its year end. An uneven cash flow is not built, and the saving is only as good as the tool that measured it.',
  },
  'FC-207': {
    intro: 'For lifting done by hand all shift — cases onto a pallet, ingredient sacks into a hopper — when nobody has assessed it. It screens one two-handed lift with the revised NIOSH equation and says which factor makes it a risk. It is a screen for a trained assessor, not a risk assessment.',
    steps: [
      {
        step: 'The load',
        means: 'The weight in the hands at the start of the lift. Include the box or the sack, not just the product.',
        doThis: 'Weigh the case as it is lifted, in kilograms, and type it in Load lifted. Name the task (for example palletising cases) if you like; it only names the sentence.',
        youGet: 'The load the lifting index is worked against.',
      },
      {
        step: 'Where the hands are',
        means: 'The reach and height of the hands at the start of the lift, and how far they travel. These set the horizontal, vertical and distance multipliers, each between 0 and 1: the further out, the lower the limit.',
        doThis: 'Measure with a tape at the start of the lift: Hands from mid-point between ankles (the horizontal reach, in cm; under 25 cm counts as 25 cm), Hands above floor at start (floor to knuckles, in cm) and Vertical travel of the lift (origin to destination, in cm). Add Twist from straight ahead in degrees if the body turns; leave 0 if the person faces the load.',
        youGet: 'The geometry of the lift, which fixes most of the limit.',
      },
      {
        step: 'How often, and for how long',
        means: 'The same lift is harder all shift than once in a while. The frequency multiplier comes from how many lifts a minute and how long lifting goes on.',
        doThis: 'Type Lifts a minute as an average over the task, and pick Lifting goes on for: up to 1 hour, up to 2 hours or up to 8 hours (a shift). Pick the one that matches how long the task really goes on.',
        youGet: 'A frequency multiplier from the manual’s table; a task with too many lifts for too long is outside the equation.',
      },
      {
        step: 'Hand coupling',
        means: 'How well the hands can hold the load. A load with handles is easier to lift safely than a loose sack.',
        doThis: 'Pick Good (handles or cut-outs), Fair (a box without handles) or Poor (a loose or awkward grip, sacks, slippery cartons).',
        youGet: 'The coupling multiplier: 1.0 for good, 0.95 or 1.0 for fair depending on height, 0.90 for poor.',
      },
      {
        step: 'The limit and the lifting index',
        means: 'The recommended weight limit, RWL, is 23 kg times the six multipliers. The lifting index, LI, is the load divided by that limit. Up to 1 is nominal risk, above 1 increased risk and above 3 high risk (NIOSH, as the record gives it).',
        doThis: 'Read the verdict, then the tiles: Recommended limit, Lifting index, Load and Biggest limit. How it is worked out shows each multiplier. Outside the equation is said when the hands are more than 63 cm out, start above 175 cm, travel further than 175 cm, twist beyond 135° or lift too often.',
        youGet: 'For example 13 kg against a limit of 11.5 kg is an index of 1.14, increased risk, with the vertical height at the start as the biggest limit.',
      },
      {
        step: 'What to change',
        means: 'The biggest limit is the multiplier that cuts the limit most. The closing line names it as the first multiplier to improve.',
        doThis: 'Change the figure for the factor named (What if… moves one figure and keeps nothing until Make it so), see the index move, and save the figures as the before to compare. Which control to pick is for the assessor; the page does not say.',
        youGet: 'An index you can show falling after the change. There is no money on this calculator: NIOSH gives risk only.',
      },
    ],
    watch: 'One two-handed lift at a time. Carrying, pushing, team lifts and jerking loads are not covered, and UK sites often assess with the HSE manual handling charts instead.',
  },
  'FC-187': {
    intro: 'For the staffing question: what does a pack cost in labour, and would one more person at the bottleneck pay for themselves? It sits in Line capacity and uses the line’s one cost model, so every tool that says a cost a pack in money says it the same way.',
    steps: [
      {
        step: 'People on the line — all of them',
        means: 'Everyone paid to be on the line, not only the people at stations of people. It is the headcount the labour is paid for whatever the line makes.',
        doThis: 'In the product’s Line capacity find What a pack costs in labour (it says bag, tray or whatever the line counts in). Type People on the line; or leave it and the page uses the people placed on the product’s line standard, else the line’s crew from Set up the line. It says which: typed here, placed on the line standard, the line’s crew or not said yet.',
        youGet: 'The headcount the cost is worked from, and where it came from, so a stand-in is never mistaken for a decision.',
      },
      {
        step: '£ an hour, each',
        means: 'What one person costs the business an hour. The wage is not the whole cost: employer NI, pension and holiday cover sit on top, which finance can turn into a multiplier (the page’s note says typically 1.25 to 1.4 in the UK).',
        doThis: 'Type the pounds an hour for each person, or leave it and the page uses the line’s own rate: its People on the line and £/hr per person in Set up the line, times the optional on-costs multiplier. It says “the line’s rate, with its on-costs” when it does.',
        youGet: 'The rate the cost is worked from. With either missing the page says what to give, and where.',
      },
      {
        step: 'What a pack costs',
        means: 'Labour a pack is the people times their rate, divided by the good packs the line makes an hour: the bottleneck’s rate with the rejects taken off.',
        doThis: 'Read the line under the boxes: for example “34p a bag — 8 people × £12.50 = £100.00 an hour; the line makes 295 bags an hour”, with the rate a minute after it. Change a station in Line capacity and it moves with it; a what-if says its own (“Labour: 2 people more, 30p a bag against 34p as run — 4p lower”).',
        youGet: 'Labour a pack in pence, and the same number everywhere else the app says a labour cost a pack.',
      },
      {
        step: 'One more person at the bottleneck',
        means: 'When people set the pace, another person there lifts the line only as far as the next station lets it, but costs an hour’s pay. The page works both out and says whether a pack gets cheaper or dearer.',
        doThis: 'Read the sentence “One more person at …”: the packs an hour then, the cost an hour and a pack, and whether it is lower (they pay for themselves) or higher (the packs they add do not pay for them). Make it N at the station puts them on the sheet. If the bottleneck is a machine, the page says another person there adds an hour’s cost and no packs.',
        youGet: 'The answer to “is it worth another person?” in pence a pack.',
      },
    ],
    watch: 'This is labour only. Overheads are not charged per pack, and a person added anywhere but the bottleneck adds cost and no packs.',
  },
  'FC-188': {
    intro: 'For the question the cost a pack raises: how much dearer is every pack because one station holds the whole line back, and what does each minute of it cost? It is read off Line capacity and the Line balance. There is nothing extra to type.',
    steps: [
      {
        step: 'The people and their rate',
        means: 'The people on the line are paid by the hour whatever the line makes, so the station that holds the line sets what a pack costs. To say that in money the page needs the people and what one costs an hour.',
        doThis: 'Give them where Cost a pack in labour asks: People on the line and £ an hour, each in Line capacity, or the line’s crew, wage and on-costs in Set up the line. The Line balance counts the people you put on it and takes the rate from Line capacity, else the line’s own. Until a rate is given it says: “Give the line an hourly rate in Line capacity to see what the bottleneck costs a pack and a minute.”',
        youGet: 'The cost sentences below, with where the rate came from said under them.',
      },
      {
        step: 'On Line capacity: because of the bottleneck',
        means: 'Under What the sums say, the page compares the line as it runs with the line without this bottleneck: against the target when the line is short of it, else against the next station’s limit, which is as far as fixing this one would lift the line. The same people over more packs cost less a pack, and the difference is “because of” the station.',
        doThis: 'Read the sentence under the sums, for example “Packer holds the line to 44 bags a minute against the 60 target: labour 34p a bag instead of 25p — 9p a bag because of Packer.” It is red when the line is short of its target. When the line meets its target it says instead what lifting the station to the next limit would do.',
        youGet: 'Pence a pack and pounds a minute, named for the station: “Each minute £… of labour is paid for bags not made”.',
      },
      {
        step: 'On the Line balance: What it costs',
        means: 'On the people’s work, the bottleneck is the person whose work a cycle is longest against takt, the time each pack is allowed. The page says what that pace costs, in the client’s words, the abnormal first.',
        doThis: 'Read What it costs under the balance once takt is given and the work is timed. It says who holds the line, the packs a minute lost against takt, the labour a pack as it runs against at takt, and each minute’s labour paid for packs not made and for the others’ time waiting. When the people keep up with takt it says the labour a pack at takt and any time paid with no work in it.',
        youGet: 'The cost of an unbalanced line in pence a pack and pounds a minute, ready for the meeting.',
      },
      {
        step: 'Contribution: what the lost packs were worth',
        means: 'Packs not made also lose the contribution they would have earned. That needs the line’s margin a pack, and it is said beside the labour, never added to it.',
        doThis: 'Give the line £ margin / pack in Set up the line (open “Know your line speed? Count the packs a stop costs”). Without it the Line balance says contribution lost needs the line’s margin a pack, and the labour is still given.',
        youGet: '“… of contribution is lost” each minute, added to the sentence.',
      },
    ],
    watch: 'The labour paid for packs not made and the contribution lost are two costs side by side, never one figure. “Because of” means what the same people cost on fewer packs, not an extra bill on top.',
  },
  'FC-189': {
    intro: 'For making a shift’s lost time felt: stops are reported in minutes and nobody feels them, so the loss count says what each cause cost in two parts, the crew standing idle and the packs not made. It is part of the loss count.',
    steps: [
      {
        step: 'The crew and the wage',
        means: 'Idle labour is the crew paid to stand: the people on the line times what one costs an hour. It is the undeniable part of a loss, because it is paid whatever the line makes.',
        doThis: 'On the line’s page press Set up the line and, under Cost of downtime, type People on the line and £/hr per person. If finance gave you an on-costs multiplier (employer NI, pension, holiday cover; the page says typically 1.25 to 1.4), open the refine link and type it. Without a crew and a wage the count still works and says what to give.',
        youGet: 'Idle labour an hour for the line, shown as “= £… /hr labour while this line is down”.',
      },
      {
        step: 'Count the shift',
        means: 'The loss count compares what the shift should have made at the bottleneck’s speed with what it made; the minutes lost are the gap at that rate. The causes come from the stops timed in Capture inside the shift’s window.',
        doThis: 'In the loss count fill End of shift — the count: which shift, the day and window, the breaks, the good packs made, the rejects and the rate a minute. Press Save the count.',
        youGet: 'The minutes lost, and where they went in Top causes: stops by cause, changeovers, rejects, and the slow running and short stops left over.',
      },
      {
        step: 'Idle labour, a cause at a time',
        means: 'In Top causes each cause carries the crew’s pay for its minutes, wherever on the line it happened: a stop on a machine the line runs round still has people standing.',
        doThis: 'Read the Idle labour column and the Lost total at its foot; tap a cause to see its stops and what it cost. It is proportional to the time, so the biggest cause in minutes is the biggest in pounds of labour.',
        youGet: 'Pounds of idle labour for each cause and for the shift.',
      },
      {
        step: 'Lost contribution, only where it counts',
        means: 'Packs not made are lost only if they cannot be made up. A stop on a machine the line runs round costs its labour, and its packs are made up unless it starved the bottleneck, which a stopwatch cannot see. The table marks which causes are on the constraint.',
        doThis: 'Read the Lost contribution column with the tag beside each cause: “constraint” or “off the constraint”. It is the packs not made at the rate times the contribution a pack (see Contribution a pack). The foot of the table says “lost only if it cannot be made up”.',
        youGet: 'The second part of the loss in pounds. With no margin the column is not drawn and the What it cost tile says what to give.',
      },
      {
        step: 'Two parts, never one',
        means: 'The sentence and the What it cost tile give the pounds in two parts, such as “£107 idle labour · £340 lost contribution if it cannot be made up”, and never add them into one figure: one is money spent, the other money not made.',
        doThis: 'Say both at the meeting, labour first. When you raise a fix or a countermeasure from a cause (Make it better), it carries both figures with it so the next shift’s count can be held against them.',
        youGet: 'A loss in the business’s language that cannot be double-counted.',
      },
    ],
    watch: 'Lost contribution is the packs not made at the rate you typed. Check the rate a minute and the good packs before you quote a pound figure.',
  },
  'FC-190': {
    intro: 'For pricing lost output at a figure the business owns instead of a made-up one: what is a pack worth when it is not made? The loss count, the bottleneck’s cost, SMED and the ranking of which product to run first all use this one figure.',
    steps: [
      {
        step: 'The line’s margin a pack',
        means: 'What the line earns on a pack, as one typed figure. It is what the loss count, the bottleneck’s cost and SMED use for lost packs, and the fallback for any product with no price of its own.',
        doThis: 'On the line’s page press Set up the line, open “Know your line speed? Count the packs a stop costs (optional)” and type £ margin / pack in pounds (3p is 0.03) beside the packs a minute. Ask finance for it; the page never fills it in.',
        youGet: 'A contribution for the line. Without it the Lost contribution column is not drawn and the tile says what to give.',
      },
      {
        step: 'A product’s price and materials',
        means: 'Contribution a pack is price less materials: what a pack sells for, less what it costs in materials. It is more exact than a line’s margin because it is the product’s own, so it is used where products are compared.',
        doThis: 'On the line’s Line capacity, in “Which first when the line is full?”, find What each product earns a pack and type Price a pack and Materials a pack for each product, in pounds, from the price list and the bill of materials. A product with a price but no materials of its own uses the line’s materials a pack from Set up the line.',
        youGet: 'A figure for that product, marked “its own” beside the boxes (“line’s margin” where it falls back), and a ranking of which product earns most from a minute of the constraint.',
      },
      {
        step: 'The rule',
        means: 'The page takes price less materials when both are known and the price is above the materials; else the line’s margin a pack; else it says which is missing. Nothing is invented and nothing waits.',
        doThis: 'Check the “How known” line under a loss count: “contribution £0.35 a pack (the line’s margin)”, for example. If it is not there, the count says to give the line its crew, wage and margin.',
        youGet: 'One figure for every tool, with where it came from said beside it.',
      },
    ],
    watch: 'Contribution is what a pack earns after its materials, not a cost a pack; and a lost pack is only lost if it cannot be made up, which the tools that use it say.',
  },
  'FC-193': {
    intro: 'For the person who has to answer “am I in control?” across every line and every project. The Factory page is the one board of the lines with their state, what is late, who owes what and what the slips cost. You open a line from here; nothing is typed on this page.',
    steps: [
      {
        step: 'Lines',
        means: 'One card for each production line, in floor order, saying in words and colour where it stands: red for a critical or late problem, amber for problems open, green for nothing late. Colour is never the only carrier.',
        doThis: 'Look for the card that needs you: the state (“2 late · 1 critical”, “3 problems open”, “Nothing late”), its worst problem and who has it, the programs still to prove, how fresh the looking is and the projects on it. Tap a card (it says Open Line 7 ›) to open the line. Set up the lines adds or changes lines.',
        youGet: 'The line to go to first, and from there its machines, problems, programs and tools.',
      },
      {
        step: 'The headline and its tiles',
        means: 'Under the lines the control room says in one sentence where everything stands, then counts it: Projects running, Late, Critical (only when there is one) and This week, and The slips cost in margin for stage-gate projects behind their agreed handover. Each tile says what it is of, and only the abnormal is coloured.',
        doThis: 'Read the sentence, then tap a tile: Late and Critical list those things right there, with Copy as a list for the meeting; Projects running and This week scroll to the projects and the week. If The slips cost shows a dash, it says what to give and where.',
        youGet: 'The numbers for the room. Late here is the same late as on a project’s own page and in Actions.',
      },
      {
        step: 'Who owes what',
        means: 'Every open thing across the projects and the lines’ own problems, grouped by the person or company who owes it: a company by name, “The site” for the team’s own, and “No one named” for what nobody has.',
        doThis: 'Look at the names with the most late and tap one to list what they owe. If one company is typed two ways the page says so (“look like one company”) with a button to call it one. Give a name to everything under “No one named”.',
        youGet: 'The people and companies to chase, with the count each owes and how many are late.',
      },
      {
        step: 'This week, across every line and project',
        means: 'What is late or due in the next 7 days, late first, from every project and line. Reminders set on notes, and fixes booked with no date agreed, have their own strips above it.',
        doThis: 'Work down the list at the weekly meeting and tap a row to open its record. Chase the ones under “No date agreed” until each has a day.',
        youGet: 'The list to chase, in the order to chase it.',
      },
      {
        step: 'The projects, and the paper',
        means: 'Each project as a row on a time axis, with its state in words and the dots of what is booked: done, ran but didn’t pass, late, still ahead. Tap a dot to see what it is.',
        doThis: 'Tap a project to open it here. For a paper, Report ▾ gives the Control room report — 1 page, for the business, every project and line on one A4 with where each is, why and who owes what; Every report lists the factory’s, each line’s and each project’s papers. Carry on where you were, below, takes you back to where you were.',
        youGet: 'A one-page answer you can hand to the business, made from the same figures as the screen.',
      },
    ],
    watch: 'Green means nothing is late on the records. Fresh looking does not mean a healthy line, and a walk nobody wrote down is not counted.',
  },
  'FC-194': {
    intro: 'For the weekly improvement meeting: who is doing what, why, where and by when, for a project or for the whole factory. Actions is read, not typed: it gathers everything owed from wherever it was raised, so nothing agreed in a meeting is forgotten.',
    steps: [
      {
        step: 'Where an action comes from',
        means: 'Every thing the project owes, from wherever it was raised: a stage, a test, a fix, a part of the plan, the board’s actions, a check that keeps a gain, what it waits on, the open critical problems and high risks, and the register’s problems taken for the project. The factory’s Actions adds each line’s own problems.',
        doThis: 'Raise the action where the work is (a problem on the register, a countermeasure on the board, a plan step) and give it an owner and a day there. It appears in Actions by itself. Tap a row to change it where it is kept.',
        youGet: 'One list of what is owed, read the same way Needs you reads it, so late here is late everywhere.',
      },
      {
        step: 'The tiles',
        means: 'Six counts: Open (with what it is made of), Late, This week, Nobody yet, No date and Done this week. Only the abnormal is coloured; a zero is grey.',
        doThis: 'Read Open first, then look at Nobody yet and No date: an action with no owner or no day is not yet an action.',
        youGet: 'The state of the list in six numbers, and a closing line such as “6 open, 2 late — Dave has 2; 1 with no one named”.',
      },
      {
        step: 'Seen by Who, When or Where',
        means: 'The same rows grouped three ways: by the person who owes them, by the day they are due, or by the place they are on. The factory’s Actions adds Project.',
        doThis: 'Pick Who at the meeting to go round the table. Pick When to see the week. Pick Where to go machine by machine. Each group says how many are open and how many late.',
        youGet: 'The list in the order the meeting needs it.',
      },
      {
        step: 'Which: Everything, Late, Critical and high, Nobody yet',
        means: 'A filter on the list. Late is past the day agreed; Critical and high is the priority tag on the action; Nobody yet is the ones no one owns.',
        doThis: 'Press Late before the meeting to chase, and Nobody yet to assign. Tap a row to open its record, where it is changed; that is the only door to each record.',
        youGet: 'The few things that matter now. Each row shows its priority pill, its kind, where, why, who and when, in words beside the colour.',
      },
      {
        step: 'Paper for the meeting',
        means: 'The list on paper, and each person’s own list to take away.',
        doThis: 'Open Report ▾ and press The action list for the meeting. In Who view, press Their list on a person’s group for their own page.',
        youGet: 'A page for the room and a page for each person with what they owe by when.',
      },
    ],
    watch: 'An action with no name and no day is counted, but it is not owned. Give every one an owner and a day where it is raised, not here.',
  },
  'FC-195': {
    intro: 'For anyone who needs to know what they owe before somebody chases them. Needs you is the list, on a project’s front page and on its gates, of everything owed, worst first, read from the records themselves, so there is no separate list to keep.',
    steps: [
      {
        step: 'What is on it',
        means: 'Everything the project owes, read from the records: install, set-up and hand-over steps, tests, fixes, materials, programs, the board’s actions, checks, reminders and problems. A critical problem or a high risk always leads, whatever its date, in solid red, with where it is, what it means for the business and how it stands.',
        doThis: 'There is nothing to type: give a thing an owner and a day where it is raised and it appears here. The panel’s heading says the answer first, for example “1 critical · 5 late · late first”, “nothing late · 2 due within 3 days” or “nothing owed”.',
        youGet: 'The list in the order you would deal with it: critical first, then everything past its day (the oldest first), then what falls due within 3 days, then the next thing booked.',
      },
      {
        step: 'Read a row',
        means: 'Each row says what it is, its kind and who has it (or “nobody yet”), and when, in words beside the colour so it survives a black-and-white print: late in red, due soon in amber, the next one booked in indigo.',
        doThis: 'Look for rows with “nobody yet”, and for the day: “due today”, “due tomorrow”, “due Fri” or how long ago it was due. A row under another (the study still needed to prove it) shows as a line beneath it.',
        youGet: 'Who owes what by when, row by row.',
      },
      {
        step: 'Open a row',
        means: 'Each row is the door to its own record, where it is changed. The list itself has no edit boxes, so there is one place to change each thing.',
        doThis: 'Tap a row. A step, test or fix opens in the drawer over the page; anything else opens its own page. Change the owner or the day there and the row here follows.',
        youGet: 'The record open, with the owner and the day to change.',
      },
      {
        step: 'The foot of the list',
        means: 'Only the first rows are shown. The foot counts the rest so nothing is hidden: how many more are late, how many more are booked, and how many have no date agreed.',
        doThis: 'Read the foot line, for example “3 more late · 2 more booked · 1 with no date agreed”, and follow the door beside the heading to the full list (the plan or the board). Agree a date for the ones with none.',
        youGet: 'The whole of what is owed, counted, and the way to the full list.',
      },
      {
        step: 'Lines not looked at lately',
        means: 'Under the list a note appears for each of the project’s lines nobody has looked at lately. It is not an owed item, so no count moves because of it.',
        doThis: 'Tap the note to open the line, then go and see: time a stop, film the line or raise a problem there.',
        youGet: 'A prompt to go to the line, and nothing added to what is owed.',
      },
    ],
    watch: 'Needs you, Actions, the band and the control room read the same records the same way, so late here is late there. A thing with no owner or no day is counted but not yet owned.',
  },
  'FC-199': {
    intro: 'For the silence that hides a line’s problems: nobody has looked at it for days, and nothing says so. The Gemba walk part of the app makes that visible, a line at a time and a machine at a time, in words and colour. You do not enter anything for it; going to the line and recording what you see is what keeps it fresh.',
    steps: [
      {
        step: 'Eyes on the line',
        means: 'On a line’s page, under the tiles, one sentence says when anyone last looked at the line and how, for example “Line 7 looked at yesterday — a stop timed.” Fresh is up to 7 days, fading is 8 to 14, and stale is more than that or never. The level is in words as well as colour.',
        doThis: 'Read the sentence. If it says fading or stale, go and see. The same line appears on the Factory board’s card for the line, as a note in a project’s Needs you for each line that is fading or stale, and as the Gemba walk row on a project’s method page.',
        youGet: 'The days since the last look, and what the look was: a stop timed, a filmed walk, a frame marked or a problem raised.',
      },
      {
        step: 'What counts as a look',
        means: 'A look is someone at the line leaving a mark in the app: a stop timed, a clip filmed on a walk, a frame marked on a walk, or a problem raised on the spot (pinned on a frame or from the quick problem button). A problem raised from the Pareto board at a desk is not a look.',
        doThis: 'Time a stop in Capture, film the line, mark a frame or raise a problem while you are standing there. That is the whole of it; the freshness is worked out from those records.',
        youGet: 'Every look counted by what was recorded. The page says it counts what was recorded in the app: a walk nobody wrote down is not here.',
      },
      {
        step: 'Machines not looked at lately',
        means: 'The line is judged as a whole and so is each machine on its list. A line can be looked at today and still have a machine nobody has looked at for a fortnight.',
        doThis: 'Read “Not looked at lately”, which names the stalest machines first (never-looked-at ones first of all) and up to three of them. Go to those machines next.',
        youGet: 'A short list of machines to visit, such as “Wrapper (never), Filler 12 days”.',
      },
      {
        step: 'The rhythm, and what the looking found',
        means: 'Whether looking is a habit and whether it turns up anything: on how many of the last 14 days someone looked, and how many problems were raised on looks in the last 4 weeks, how many were closed and the age of the oldest one still open.',
        doThis: 'Read “Looked at on N of the last 14 days” and the line under it. Press Film the line to go and add a look.',
        youGet: 'The habit in numbers, and whether the looking is producing problems that get closed.',
      },
    ],
    watch: 'Fresh looking does not mean a healthy line. It counts the looking that was recorded, not the state of the line.',
  },
  'FC-202': {
    intro: 'For the things that happen on the line and are said, not written: a shift handover, an OEM punch list, a one-point lesson, a walk. Talk or type into a conversation about one line, add photos, and ask it to write the report. Its answers come from what you said and what Faultline holds about the line, and it works out no figure of its own.',
    steps: [
      {
        step: 'Start a Line Talk',
        means: 'A Line Talk is one conversation about one line, kept for good. Put on a line, it knows the line; inside a project it knows the project and what it makes is the project’s.',
        doThis: 'From the Factory press Start a Line Talk, or open Line Talk from the line’s page and start one there (it says Start a Line Talk on Line 7). Pick the line if asked. A talk begun without a line can be put on one later with “Put it on a line, so Line Talk knows the line”.',
        youGet: 'A talk named for the line and the day, with a box at the foot. Every talk is listed on its line, newest first, and carried on any day.',
      },
      {
        step: 'What Line Talk knows',
        means: 'The line as Faultline holds it, as its own pages say it: its machines in flow order and who made them, its crew and shifts, its open problems, the latest findings of its tools, its projects and today’s date, then the whole talk so far. It is told to keep what you said, what the records show and its own reading apart, to use no figure it was not given and to work nothing out.',
        doThis: 'Open “What Line Talk knows” to read exactly what goes with every question. If something is wrong there, fix it on its own page, not in the talk.',
        youGet: 'Answers that are about your line and say where they come from.',
      },
      {
        step: 'Talk or type into the box',
        means: 'The phone’s own speech recognition writes your words into the box as you speak, free and with no recording. You put anything right, then Send. A photo sits in the conversation where it was taken, labelled P1, P2 and so on.',
        doThis: 'Tap the microphone and say what you see. Correct the words in the box if needed and press Send. Add a photo with the camera button, or several at once. Where the browser will not listen, the page says to use the keyboard’s own microphone. Typing works at any time.',
        youGet: 'What is sent is kept as sent. A correction after it is kept beside what was heard, and Strike marks a turn out without erasing it.',
      },
      {
        step: 'Ask for a document',
        means: 'You can ask it anything in words: what did I say about the wrapper, write the walk report, make the punch list for the OEM. Four chips only put words in the box for you to change: Line-walk report, Summary for my manager, Punch list for the OEM and Engineering report.',
        doThis: 'Press Send. The answer appears as it is written. A document opens with Open — edit and print, where you change it and print it as a paper.',
        youGet: 'A written answer or a document, with the photos beside what they show. If it cannot answer it says why and keeps your words; Ask again tries once more.',
      },
      {
        step: 'Check what it says',
        means: 'It is a colleague that listens, not a calculator. A figure it was not given, by you or by Faultline’s records, is flagged for you to check before you use it.',
        doThis: 'Read any line saying “Check before you use it” and confirm those figures against the source. Correct or strike a turn that was misheard.',
        youGet: 'A document you can stand behind. Everything said, typed and photographed is kept even when the assistant is off or there is no signal; the answer waits.',
      },
    ],
    watch: 'Line Talk never works out a figure, saves a record or passes a gate. What it writes is words from your talk and the records, to check, not a source of numbers.',
  },
  'FC-204': {
    intro: 'For reading any report or tool page in the app, which are all laid out the same way: where are we, why, and what are we doing, on one page, on screen and on paper alike. Learn the eight parts once and every page reads the same.',
    steps: [
      {
        step: 'The band',
        means: 'The top of the page: what this is, its title, the line and the day, and the verdict in a few words. It is a pale band with a teal edge, on screen and on paper, so it prints.',
        doThis: 'Read the verdict first, for example “1 check failed”, “Up to date”, “Index 1.14 — increased risk”.',
        youGet: 'The answer in a phrase, before any number.',
      },
      {
        step: 'The tiles',
        means: 'A few big numbers, each of what it should be (“40,900 of 45,000 · 91%”) and, when there is a record before it, since then (“▲ 4,400 on 15 Oct”). A dash means it cannot be said yet and the tile says what to give.',
        doThis: 'Look for the coloured tiles: only an abnormal number is red or amber and a met one is a quiet green; the rest are plain, and a zero is grey. The change is always worded as well as coloured, so it survives a black-and-white print.',
        youGet: 'Where we are, against what it should be and against last time.',
      },
      {
        step: 'The trend and the picture',
        means: 'The tool’s own picture of the thing (a waterfall, a bar chart, a grid, a fishbone) and, with two or more records of the same kind on the same line, the trend of the headline number. There is never a second chart of the same thing.',
        doThis: 'Read the picture for why, and the trend for where it is going.',
        youGet: 'Why, shown, and the direction.',
      },
      {
        step: 'What it means',
        means: 'Three to six sentences the page’s own module says, only what the figures justify. Each is marked: ✕ for what is wrong (red), ! to watch (amber), ✓ for what is right (green) and a dot for information.',
        doThis: 'Read the ✕ and ! lines first. These are the things to say at the meeting.',
        youGet: 'The reading of the numbers, with the abnormal first.',
      },
      {
        step: 'The action plan and the closing line',
        means: 'The action plan lists Action, Owner and Due for what has been raised from this record, late first, with “nobody yet” or “no day” where they are missing. The closing line is the one sentence at the foot: what one side can now say to the other.',
        doThis: 'Check every action has an owner and a day; if there are none the page says so and where to raise one. Read the closing line aloud.',
        youGet: 'Who does what by when, and the verdict.',
      },
      {
        step: 'The same page on paper',
        means: 'Report ▾ at the top of a page lists every paper it has, each named for what it is. The paper is made from the same figures and sentences as the screen by the same model, so the two cannot disagree.',
        doThis: 'Open Report ▾ and pick the paper. A tool with several lists its papers each by what they are, never by “PDF” or “Print”.',
        youGet: 'A PDF that says what the screen said, laid out on pages that never cut a block in half.',
      },
    ],
    watch: 'The tiles are counted figures — packs made, minutes lost, stops timed — counted by people and never read from a machine, and no single effectiveness score is built from them by design.',
  },
  'FC-205': {
    intro: 'For the person who needs the project’s records in Excel: a group engineering team, a start-up workbook, a data check. It builds one workbook from what is in the app, worded for the project, with the column headings of the Excel start-up tool so it is that tool’s starting data.',
    steps: [
      {
        step: 'Where to press it',
        means: 'Every project lists everything printable in one place, and the spreadsheet is the last item. The control room’s Every report lists it under each project’s name.',
        doThis: 'Open the project, press Reports (the On paper list), and choose Spreadsheet. For a project that is not a stage gate it builds that project alone; for a stage gate it is the start-up record of every project.',
        youGet: 'An .xlsx file saved to your device, named Faultline- then the project’s name and the day, or, where the device offers sharing instead, a file ready to send.',
      },
      {
        step: 'What is in it',
        means: 'One sheet for each list, with a Read me sheet first that counts them: Projects, Machines, Tests, Issues (fixes and problems together; the Type column says which), Notes, Materials, Programs and Line standard, one row for each person on each product’s map.',
        doThis: 'Open the Read me and check the counts. A running line’s project exports what it waits on (materials and programs), its line standards and the problems on its walks. Its numbers, problems and board are on the client report, not here.',
        youGet: 'Dates as real Excel dates so formulas can compare them with today, and a project column on every row, because the Excel tool keeps every project in one workbook.',
      },
      {
        step: 'What stays behind',
        means: 'A workbook cannot carry photographs, video or documents, and a link to a phone’s own storage would open nothing. So they stay in the app and each row says how many it has, for example “2 photos (in the app)”.',
        doThis: 'When a row says it has photos or files, open the record in the app. Training is empty on purpose: the Excel tool keeps it from here on.',
        youGet: 'A workbook where nothing is silently lost: what could not come across is counted.',
      },
    ],
    watch: 'It is a way out for the data, not a second place to edit it. Changing the workbook changes nothing in the app.',
  },
  'FC-206': {
    intro: 'For a quick question about a line that would otherwise mean digging through its pages: will an extra order fit, where is the biggest loss, what changed, where is the line held. The answers are worked out by the app’s own formulas from the line’s counted shifts. A question outside those shapes is said to be outside what it answers.',
    steps: [
      {
        step: 'What the line can make',
        means: 'At the top of a line’s Line capacity page one sentence says what the line can make, with three speeds: Theoretical (the ideal speed each counted shift was judged against), Demonstrated (a typical counted shift) and Plannable (the speed four shifts in five reached). Ask answers from these.',
        doThis: 'Count some shifts first: the speeds come from the shifts counted in the loss count over the last weeks, so a line with none says to count a shift. Five counted shifts are wanted to plan on one figure; fewer gives a range. Tap a figure to see the shifts behind it.',
        youGet: 'The speed to plan on, not the best day’s, and the shifts it was worked out from.',
      },
      {
        step: 'Ask about the line',
        means: 'A box that takes a question in your own words, “Ask about Line 7”. It recognises the shapes it can answer and says so when yours is not one of them. Nothing is sent to an assistant.',
        doThis: 'Type a question and press Ask. It answers will an extra order fit (“Can it take another 40 pallets on Thursday?”), the biggest loss (“What’s the biggest loss?”), what changed (“What changed this week?”), where the line is held (“Where is the line held?”) and what it can make.',
        youGet: 'An answer in words, or, for another kind of question, the list of questions it can answer.',
      },
      {
        step: 'Will an extra order fit?',
        means: 'It turns the order into the line’s own unit, works out the hours it takes at the speed you can plan on, and sets them against next week’s spare hours.',
        doThis: 'Say how many and of what (“another 40 pallets”). It needs to know how many of the line’s unit make one pallet, from Line capacity, and the week’s orders and running hours, which you put in on the page (Paste from a sheet takes orders). Without the orders it says how long the order takes and that whether it fits depends on them. It speaks for the week; the day’s plan is not in the app.',
        youGet: 'A Yes or No with the hours it takes and the hours spare, and, when it does not fit, how many more hours it needs: an extra shift, or less lost at the constraint.',
      },
      {
        step: 'Biggest loss, what changed, where it is held',
        means: 'The biggest loss is the largest band of the counted shifts’ planned time, with its pounds in two parts and whether it is on the constraint. What changed is the moves this week against the usual (half again and 30 minutes more, with two weeks before). Held at is the constraint, with a note if it has moved.',
        doThis: 'Ask each in your own words. A biggest loss that is “not the constraint” is said so: fixing it makes no more output, and the prize is at the constraint.',
        youGet: 'The one thing to look at first, with the figures behind it.',
      },
      {
        step: 'The figures used',
        means: 'Under every answer a fold lists the figures it used, in words, so the answer can be checked.',
        doThis: 'Open “The figures used”. Tap Theoretical, Demonstrated, Plannable or a change above to see the shifts or stops behind it.',
        youGet: 'An answer you can trace to counted shifts and timed stops, not a guess.',
      },
    ],
    watch: 'It answers only from shifts that were counted. A line with few counted shifts gets a range or a request to count one, never an invented figure.',
  },
  'FC-213': {
    intro: 'For a number that has to be hit, such as cost a tonne down by 3 pence: draw the outcome at the top, what has to be true for it underneath, the conditions under those and the work at the bottom. It is a thinking surface first, so every box and its colour are yours unless you bind a box to one of the project’s numbers. It is partly built.',
    steps: [
      {
        step: 'Start with the outcome',
        means: 'One box at the top: what this project has to deliver. Everything else hangs off it.',
        doThis: 'Open the project’s Tree. On an empty tree press Start from Line 7 (or Start from the N lines) to get the outcome and one box for each line, or Add the desired outcome to type your own. Only the project’s owner and team can draw; a client reads.',
        youGet: 'The first box, in the project’s own words, for example “Line 7 hits its packs per minute target”.',
      },
      {
        step: 'Four levels',
        means: 'Desired outcome, What needs to be true, Required conditions and Required actions. Each box is a statement that must be true for the box above it; the tree is how you check you have thought of everything.',
        doThis: 'Tap a box and type. Use Add another below for a sibling and Add the next level to its right for what must be true for this one. Move up and Move down reorder a box, and Move this box somewhere else then Put it here moves a branch.',
        youGet: 'The tree on screen, with a legend of the levels across the top.',
      },
      {
        step: 'Set a box’s state',
        means: 'Where a box has got to: Not started, In progress, At risk, Late or Done. It is set by hand by whoever holds the pen, and the page never overrides the colour you chose.',
        doThis: 'Open the Status list on a box and pick one. A box filled from the board takes the board’s state instead, and says “from the board”.',
        youGet: 'A tree that shows at a glance what is off track, in words as well as colour.',
      },
      {
        step: 'Bind a box to a number',
        means: 'A box can take its colour from one of the project’s own numbers instead: the line’s latest reading against its target. “Line 2B holds 60 packs a minute” is a number before it is anything else.',
        doThis: 'Press Bind to a number on the box and pick a measure for a line in Which number…. The box then shows the figure (“52 vs 44 packs a minute”) and says On target, Behind target, No target set or Nothing measured yet. Go back to setting the state by hand with the link on the box.',
        youGet: 'A box that changes colour when the number does, with the figure beside it.',
      },
      {
        step: 'Put the board’s work under it',
        means: 'The project’s board holds the countermeasures. Link a box to the board once and its actions arrive by themselves, each with the state the board gives it, so there is nothing to copy.',
        doThis: 'Press Fill this from the board on a box, or Put them on the tree when the page says N actions on the board are on no box. The page counts any action it could not place and says why, so nothing is lost quietly.',
        youGet: 'The work at the bottom of the tree kept in step with the board.',
      },
      {
        step: 'Fold, zoom and print',
        means: 'A large tree is read by folding and zooming, and printed whole.',
        doThis: 'Use Hide actions to fold the bottom level away, the zoom controls to fit it to the screen, and Report ▾ then The tree — printed for paper.',
        youGet: 'One sheet showing the outcome, what has to be true for it and the work underneath.',
      },
    ],
    watch: 'The colour is yours until you bind it. A tree drawn by hand shows what you believe; only a bound box shows what the readings say.',
  },
  'FC-214': {
    intro: 'For running a piece of improvement work from start to finish in one place. A project holds its method, its tools, its problems, its actions and its reports, and whatever is done inside it lands in it by itself, so the work is not scattered across tools and lines.',
    steps: [
      {
        step: 'Open the project',
        means: 'A project is one of eight methods (PDCA, DMAIC, 8D, A3, Stage gate, Kaizen event, Improvement Kata or Theory of Constraints) and its front page is the method: its question, then its sections in order. The lines are the factory’s and shared: a project points at them and holds no copy.',
        doThis: 'Open Projects and tap the project, or start one with New project and pick its method. Read the question at the top and the numbered sections under it.',
        youGet: 'The method page, with the project’s own tabs along the top: Journey, Actions, Problems and Tools, then Notes, Reports and Details.',
      },
      {
        step: 'Use a tool inside it',
        means: 'Under each section the method lists the tools that fit it by default, each saying how often it has been used in this project, and saying honestly whether it is built, is a mode of another tool, or is not built yet. Any tool can be added to any section.',
        doThis: 'Press New beside a tool, or Add a tool and pick one. It starts in the project, on the project’s line, with no “For a project?” question to answer: it is the project’s from the first tap.',
        youGet: 'A record that belongs to the project, counted on its section, listed under Tools and reachable from the project’s tabs. A tool used that the method does not list appears under Also used here.',
      },
      {
        step: 'Whatever you find lands in Actions',
        means: 'Problems and Actions are where everything found inside the project goes: a problem raised on a study, a countermeasure, a fix, a plan step. Actions reads them all with who, why, where, by when and priority.',
        doThis: 'Raise the problem or action where you find it and give it an owner and a day. Then open Actions to see who is doing what by when, and Needs you on the front page for what is late.',
        youGet: 'One list for the project, with nothing to copy across from the tools.',
      },
      {
        step: 'Work that belongs to no project yet',
        means: 'Work done on a line with no project stays on its line: nothing is lost and nothing is forced into a project.',
        doThis: 'When it belongs in a project, open the record and use its place line (On Line 7 · in … · Change) to put it in the project.',
        youGet: 'The record in the project from then on, its history with it.',
      },
      {
        step: 'Journey and Reports',
        means: 'The Journey is the project day by day: what was done, what is next, your commentary and the tools being used, for any range of dates. Reports lists everything printable for the project in one place.',
        doThis: 'Open Journey, choose this week and next or pick a range, and write the commentary for today. Press Reports for the client report, the Journey report and the spreadsheet.',
        youGet: 'A paper for whoever you report to, made from what is in the project.',
      },
    ],
    watch: 'Start the tool from inside the project, with its New or from the project’s Tools page. A tool started from the factory’s Tools page belongs to no project and stays on its line until you move it in.',
  },
  'FC-021': {
    intro: 'For timing the work at each station from film instead of a stopwatch, when a stopwatch misses cycles and nobody can check it afterwards. You film the line on a phone, say what you want to find out, review what the app finds on the footage itself, and the cycles, the line balance and takt are worked out from what you accept. It is partly built; changeovers are not measured from footage yet.',
    steps: [
      {
        step: 'What do you want to find out?',
        means: 'A video study starts from a question, never from the footage. Put in your own words, or pick from the examples, it chooses the study (line balance, cycles at each box, waiting periods and others) and says what footage can and cannot tell you for it.',
        doThis: 'Press New video study. Type what you want to find out, or tap an example, then check The study it chose. If you know roughly how long one cycle takes, type it in One cycle takes about (seconds). A study Faultline does not measure from footage yet says so, and what to use by hand meanwhile.',
        youGet: 'How to film it: where the phone goes, what must be in the picture, how long to film (for a line balance, at least 10 whole cycles of the slowest station and one either side), the phone’s settings, the light and the people.',
      },
      {
        step: 'The footage',
        means: 'The film is read on your device; nothing is sent anywhere to read it. A steady, side-on, raised view with every station in the picture and at least ten whole cycles of the slowest station is what makes the reading good. People are labels such as Operator A, never names, and nobody is recognised by face.',
        doThis: 'Film as the plan says, with the phone fixed on a stand and not in the hand, sound off, and keep going without pausing. Choose the file (MP4, MOV or WebM up to 20 minutes) and say Where was the phone?. Tell the people what the film is for before you start.',
        youGet: 'Is this footage fit for the study?: each check Fine, Watch or Not fit, such as camera shake and the light, with what was found and what it means, and what this footage can tell you, measured, worked out, only interpreted or not from footage.',
      },
      {
        step: 'Stations in view',
        means: 'A station is a place in the picture: a box with the person who works there labelled. The app reads the movement in each box.',
        doThis: 'Start the study (Which line, For a project, Its name), then under Stations in view, left to right say how many stations are in view, name each and label who works there, and set where each ends. Press Read the footage. Name the work from the frames is off until you tick it and says what it sends: a few small frames of each station, no sound, through the app’s gateway to the assistant, told never to identify anyone.',
        youGet: 'A reading of when work starts and stops at each station, with a progress bar and a Stop. Lower the Sensitivity under How the footage is read if it finds too little.',
      },
      {
        step: 'Review what was found',
        means: 'Each piece of work the app finds is a candidate until you accept it. You play it on the footage itself, so the study can be checked by anyone afterwards. Only what is accepted is counted.',
        doThis: 'Under What was found — review it on the footage tap a time to play from it. Accept or Reject each, move a boundary with Start here and End here at the playhead, Split here, or Merge with the next. Add work at a station for something it missed. Accept every one still to review takes the rest at once, once you are satisfied.',
        youGet: 'A timeline of events with each end’s ± shown, and a mark on any event inside shaky footage. Whether a gap with no movement is waiting is for you to say; the app never calls it waiting on its own.',
      },
      {
        step: 'The line balance',
        means: 'From what you accepted: each station’s work a cycle with its spread, how many cycles it rests on, a cycle every, the time with no movement between and how much of the time is working. The station with the most work a cycle sets the pace.',
        doThis: 'Read the table, then give the Takt: how many to make, of what, in how many minutes a shift or day. Use the two buttons to count from Accepted only or With those to review (provisional). Under What it says, read which station is over takt and by how much. A station “of N needed” has too few cycles to trust.',
        youGet: 'Work a cycle with ±, the pace, each person’s work stacked against takt and the sentences of What it says, each labelled Measured, Worked out, Proposed — not measured or Not known yet.',
      },
      {
        step: 'Pace and allowance — the standard time',
        means: 'Footage shows how long work took, not how hard someone was working, so a time is observed until a person rates it. You give the pace at each station (100 is normal), the site adds its allowance in named parts (personal needs, fatigue, standing), and the standard time is worked out from them. Nothing is rated for you and no allowance is assumed.',
        doThis: 'Under the line balance, type the Pace at each station, then Add an allowance part for each the site has agreed, with its percent, and press Work out the standard. A station you leave unrated is taken at 100 and said so.',
        youGet: 'Basic time and standard time at each station, how many an hour that plans, the allowance in its parts, and the report saying which times are rated and which are only observed.',
      },
      {
        step: 'Report, and the footage',
        means: 'The reports made from the study say how many events were accepted and how many were still to review. The footage can be removed while what was found in it stays.',
        doThis: 'Make the report from Report ▾. Press Delete the footage when you are finished with the film: it goes from this device and the cloud, and the events, figures and reports are kept and say the footage was deleted.',
        youGet: 'A report for the client that can be checked on the footage, and the film gone from the floor’s devices.',
      },
    ],
    watch: 'Footage cannot judge pace, so a time stays observed, not a standard, until a person rates it and the site’s allowance is typed. How accurate the reading is depends on the footage and is measured, not promised.',
  },
  'FC-117': {
    intro: 'For the number a team already keeps each week, such as yield, give-away or labour per tonne, and never sees the trend of. It records the weekly value for each line against its target and, from eight readings, says in words which way it is going.',
    steps: [
      {
        step: 'What the project measures',
        means: 'A measure is a name, a unit and which way is good: packs per minute, waste, first-pass yield, whatever the business counts. Which way is good matters, because a falling waste figure is a win and a falling rate is not.',
        doThis: 'The project’s owner sets the measures, and their targets, on the project’s Details page; the Numbers page offers Set the measures up when none are set.',
        youGet: 'A chart for each measure and line against its target.',
      },
      {
        step: 'Record a reading',
        means: 'One reading is the day and the value, for a line. A week nobody measured is simply not in the list.',
        doThis: 'On the project’s Results, in Numbers, open Record a reading, pick the line and the measure, set On, type the value and, if you like, a Note (what was different about it), then press Add reading. A reading can be corrected from Readings, and removed by the owner. When the project measures a rate a minute, a shift counted in the loss count is offered under Counted on the line as a reading in one tap.',
        youGet: 'A point on the chart and a line in Readings, newest first, with the day and who took it.',
      },
      {
        step: 'The trend in words',
        means: 'From eight readings the page says whether the number is rising or falling, how fast, and whether that is the right way for this measure. It uses Sen’s slope for the rate, the Mann–Kendall test for whether the trend is steady rather than a wobble, and the runs about the median for a shift or a pattern the slope alone would miss.',
        doThis: 'Read the sentence under the chart, for example “Trend over 12 readings: falling about 0.2 % a week (Sen), Mann–Kendall p 0.004 — the right way for this measure.” “No steady trend found” is also an answer. Record on the same day each week so the readings compare.',
        youGet: 'The direction, the rate a week and a verdict on the right way or the wrong way, in colour and words. Before eight readings it says nothing, rather than guess.',
      },
      {
        step: 'Against the target',
        means: 'The chart draws each reading with the line’s target as a dashed line, so you see how far it is from where it should be and not only which way it is going.',
        doThis: 'Read the header of the chart: the latest value and how it stands against the target, and the legend that says whether higher or lower is better for this measure.',
        youGet: 'The gap to the target, in words beside the colour.',
      },
    ],
    watch: 'The trend reads on the screen only. It is not yet on the client report’s paper.',
  },
  'FC-201': {
    intro: 'For the question a team asks after a change: did our number move, and was it for a reason or just luck? It splits the line’s weekly readings at the day the change landed, compares the two halves and gives a verdict that is allowed to say no.',
    steps: [
      {
        step: 'The day the change landed',
        means: 'The readings before the change and the readings after it are counted, never typed. A change needs at least two readings on each side of its day.',
        doThis: 'There are two doors. Close a countermeasure on the board: the day it closed splits the readings and the action carries a Did it work? badge. Or log a win, press Prove it from the readings, pick the line and measure, then pick When the change landed from the dates offered, which are only those with two readings either side.',
        youGet: 'Before and after halves of the line’s own readings for the measure the project leads on.',
      },
      {
        step: 'The verdict',
        means: 'Proven means the number is better by at least 1.5% and a test (Welch’s, one-sided) says a change this size would come up by chance fewer than 10 times in 100; the page says how many. Not yet proven means better but it could be chance, or there are too few readings. No change is under 1.5%. Worse is shown exactly as loudly as a win.',
        doThis: 'Read the badge, the sentence (“44 → 52 packs a minute · +18.2% · 6 before · 6 after”) and the line under it that says how likely chance is. Which way is good comes from the measure, so a falling waste figure reads as better.',
        youGet: 'Proven, Not yet proven, No change or Worse, with both counts so nobody has to ask out of how many.',
      },
      {
        step: 'Too soon to say',
        means: 'A change with fewer than two readings since it landed is too soon to judge, and fewer than three readings on a side is too few to test at all.',
        doThis: 'Keep recording the weekly number. When the readings arrive the badge and the sentence follow by themselves.',
        youGet: 'Too soon to say, with how many readings are in, rather than a verdict built on one.',
      },
      {
        step: 'Call it',
        means: 'Calling a win freezes its numbers, because readings keep arriving and a claim read out in a meeting must not move afterwards.',
        doThis: 'Press Call it (or Record it anyway when the verdict is Worse). Later readings will not change what you called.',
        youGet: 'A receipt on the win that prints on the report exactly as it was called.',
      },
    ],
    watch: 'It says the line’s number moved, never that this action did it. A line can be changed by six things at once; the verdict is the evidence, not the cause.',
  },
};
