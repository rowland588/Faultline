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
};
