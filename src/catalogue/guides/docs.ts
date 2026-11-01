/* GUIDES — the documents of the document shape (FC-240; src/tools/doc). Each step is the page's own label, in the order a person meets it,
 * said as what it means, what to do and what you get — and nothing the page does not do. FC-240 is the shape every document shares; the
 * five documents carry their own, because their boxes differ. */
import type { Guide } from '../guide';

export const DOCS_GUIDES: Record<string, Guide> = {
  'FC-240': {
    intro: 'For the pages a method asks for — a charter, a scope, what the customer needs, a corrective-action report — when you want them filled in on the page, agreed by name and day, and printed, instead of living in Word and email.',
    steps: [
      {
        step: 'Pick the kind and name it',
        means: 'Each kind of document has its own boxes — a charter asks for a goal and a date, an 8D report for the eight disciplines. Naming it says what this one is of, so it can be found again.',
        doThis: 'On Documents, tap the kind you need, press New, and say what it is of — “Give-away on Line 3”, “Slicing and packing”. Pick the line if it is on one: its wage and costs can then be offered.',
        youGet: 'A new document, a Draft, with its boxes in sections and a count of how many are needed.',
      },
      {
        step: 'Fill in the boxes',
        means: 'Each box says what to put in and where on the floor to find it. Some are needed before the document can be agreed; the rest are optional. Nothing is refused: what you type is kept as typed, and anything doubtful is said beside the box.',
        doThis: 'Work down the sections. Type, pick, or tap the date. For a list — the steps of a process, the people on a team — press Add and fill the row; Remove takes one out and Undo puts it back. Photos are taken or chosen from the phone and kept the moment you pick them.',
        youGet: 'The document saved a moment after your last key, and a reading beside it that changes as you type.',
      },
      {
        step: 'Filled in, and what is still needed',
        means: 'The count of needed boxes that have something in them, and the name of each one still blank. A document is not ready to agree while any is missing.',
        doThis: 'Read the line under the status — “To be ready for the sponsor to agree it: …” — and fill in what it names. A needed list says how many rows it still lacks.',
        youGet: 'A status that moves from Draft to Ready to agree the moment the last needed box is filled.',
      },
      {
        step: 'What it says, and what to put right',
        means: 'The one sentence the document says, the figures it works out from what you typed, the tables it builds, and any check that something does not hold together — a date that has passed, a limit the wrong way round, a customer named as nobody.',
        doThis: 'Read the sentence aloud: does it say what the team means? Then read “To put right” and fix each line, or leave it if you disagree — the document stays saved either way.',
        youGet: 'A sentence you could say to the sponsor, tiles with the counts, and tables worked out for you — the same on paper.',
      },
      {
        step: 'In money',
        means: 'Where the industry has a way of putting a cost on the finding, the document says it in pounds with its because. Where it has none, the page says so in words rather than leaving a blank or inventing a figure.',
        doThis: 'Fill the optional money boxes if you have the figures — what the problem costs a week, hours of sorting. Leave them if you have not: nothing waits on them, and the page says which one is missing.',
        youGet: 'A money sentence, or the name of the one input still needed, or the reason there is no money for this document.',
      },
      {
        step: 'Agree it',
        means: 'Agreeing a document puts a name and a day on it — the sponsor for a charter, the lead for an 8D report. Once agreed it is locked, so what was agreed cannot quietly change.',
        doThis: 'When the status says Ready, the person whose job it is types their name and presses the button — Agree the charter, Close the 8D report. To change an agreed document, they reopen it first.',
        youGet: 'The status Agreed, with who and when, on the page and on the paper.',
      },
      {
        step: 'On paper',
        means: 'The document laid out as a page you can send or print: the status, who agreed it, the sentence, each section with its boxes, the lists as tables, the photos, the working and what it does not say.',
        doThis: 'Open Report ▾ and press the document on paper. A draft prints too, with the blanks shown as blank, so the paper is the form.',
        youGet: 'A PDF to send to the sponsor or the customer — read from the same figures as the screen, so the two cannot disagree.',
      },
    ],
    watch: 'A document is a record of what the team agreed, not a formality: agree it only when the people it binds have read it, and reopen it — rather than overtype it — when something changes.',
  },
  'FC-142': {
    intro: 'For the start of an improvement project, so everyone can say what it is for and how it will be known to be done — before the work, not after.',
    steps: [
      {
        step: 'The problem',
        means: 'What is wrong, as a number — where it is now, measured, in a unit — and in words with no cause and no solution in them. “Give-away on Line 3 averages 4.1 g a pack against a 2 g target, since June.”',
        doThis: 'Say what is measured and its unit, type where it is now, and say how that was measured — by whom, with what, over how long. If you have the readings and their spread, add them for an interval round the baseline.',
        youGet: 'The baseline on the page, with how it was known; a number from memory shows itself by having no “how”.',
      },
      {
        step: 'The goal',
        means: 'The same number — where it must get to — and by when. A goal with no number and no date can be met by accident; this one cannot.',
        doThis: 'Type the target in the same unit and pick the date the sponsor can hold the team to.',
        youGet: 'The gap in the unit and as a share of today’s figure, and the days to go — red if the date has already passed.',
      },
      {
        step: 'The scope',
        means: 'What is in and what is out — lines, products, shifts, steps. It is the test for every “while we’re at it” later.',
        doThis: 'Write what is in scope and, just as carefully, what is out and why. Add constraints — no capital, no new people — if there are any.',
        youGet: 'A boundary the team can point to when the project starts to grow.',
      },
      {
        step: 'The team',
        means: 'The sponsor who agrees it and clears the way, the lead who owns it day to day, and the people who do the work with the hours they give.',
        doThis: 'Name the sponsor and the lead (the project’s lead is offered in one tap). Add each member with their role and total hours; add one person’s £ an hour or use the line’s.',
        youGet: 'The team table, and the team’s time in hours and pounds.',
      },
      {
        step: 'What it is worth',
        means: 'What closing the gap is worth a year, from the tool that measured the problem — not a figure made up for the charter. Either the £ a week that tool put on it, or the gap times the units a year times what one unit is worth.',
        doThis: 'Type what the problem costs a week and name the tool that said so; or give the units a year and what one unit of the measure is worth. Both are optional.',
        youGet: 'The worth a year, how it was worked out, the team’s time against it and how many weeks of the gain pay it back — or the sentence naming what to add.',
      },
      {
        step: 'The milestones',
        means: 'The dates of the project’s phases, in order — the DMAIC tollgates, or the steps of whichever method you run.',
        doThis: 'Add a row for each phase with its date. Keep them in date order and inside the goal date.',
        youGet: 'A table of milestones with the days from today, and a check if they run out of order.',
      },
    ],
    watch: 'Do not put the cause or the fix in the problem or the goal. “Install a new weigher” is a solution, not a goal; the Analyse phase finds the cause.',
  },
  'FC-139': {
    intro: 'For agreeing what is in and out of a project before the arguing starts — the process in four to seven steps, who supplies each and who receives what it makes.',
    steps: [
      {
        step: 'The edges of the process',
        means: 'The process’s name, where it starts and where it ends. Those two edges are the scope: whatever happens between them is in, the rest is out.',
        doThis: 'Name the process as the floor says it, then say the first thing that is in scope and the last — “raw product arrives at intake” to “the pallet leaves the despatch dock”.',
        youGet: 'The two edges written on the page and quoted under the table.',
      },
      {
        step: 'The steps, with suppliers and customers',
        means: 'Four to seven steps, each a verb. For each: who supplies what goes in, what goes in, what it makes and who receives it. More than seven steps is a map, not a scope.',
        doThis: 'Add a row a step, in order. Fill the suppliers, inputs, outputs and customers; separate several with commas. Name a customer as a person or a place — “packing”, “the retailer’s depot” — never “the business”.',
        youGet: 'The SIPOC table — suppliers, inputs, process, outputs, customers — built row by row, and counts of what you named.',
      },
      {
        step: 'Inputs to measure',
        means: 'Of everything that goes in, the inputs whose variation could be causing the problem. They are marked now so the Measure phase knows where to look first.',
        doThis: 'In the step that takes it, type the inputs the team suspects — “blade sharpness”, “slicer setting”.',
        youGet: 'A count of inputs marked and a list of them in the sentence.',
      },
      {
        step: 'The boundary',
        means: 'What is outside the scope, and why. Parked, not forgotten — and a scope that leaves out the step where the problem is caused cannot solve it.',
        doThis: 'Write what the team will not touch and the reason. If the cause may lie outside, say so here and widen the scope or change the goal.',
        youGet: 'The outside of the scope on the page and on the paper, ready for the sponsor to agree.',
      },
    ],
    watch: 'A SIPOC built by one person settles nothing. Build it with someone from each step, then have the sponsor agree it.',
  },
  'FC-140': {
    intro: 'For turning what a customer says — “easy to open”, “doesn’t leak” — into something the line can measure, with a limit, so it can be tested and held.',
    steps: [
      {
        step: 'Whose needs',
        means: 'The customer — a person, a retailer, a depot — and where their words came from: the specification, complaints, interviews, a panel.',
        doThis: 'Name the customer and say where the words came from. Keep the customer’s own words in the table below, not yours.',
        youGet: 'The customer on the page, so every need is somebody’s.',
      },
      {
        step: 'The needs, in their words',
        means: 'One row for each thing the customer asks for, said as they said it. What drives it is what on the pack or the line makes it so — a peel force makes a pack easy to open.',
        doThis: 'Add a row a need. Type their words and, if you know it, what drives it. A need you cannot yet measure still goes in.',
        youGet: 'The left of the CTQ tree, in the customer’s words.',
      },
      {
        step: 'The CTQ and its limit',
        means: 'The critical-to-quality characteristic: what is measured, in what unit, to what limit — between two limits, at least, at most, or yes or no — and where the limit comes from.',
        doThis: 'Type what is measured and its unit, pick the kind of limit, type the limit or limits, and say where they come from — the specification, a complaint, a test. A limit with no source is a guess.',
        youGet: 'Each need written as a CTQ with a limit — “peel force 8 to 15 N” — or listed as a gap if it has none yet.',
      },
      {
        step: 'Kano class',
        means: 'How the customer reacts to it: must-be (expected — angry if missing), performance (more is better) or attractive (a delight). It decides how hard the limit is held.',
        doThis: 'Pick a class if you know it — from a Kano survey or your own judgement. Leave it blank if not.',
        youGet: 'Where each CTQ goes next: a capability study and a control plan row for a must-be, a target for a performance need, a design decision for a delighter.',
      },
    ],
    watch: 'A CTQ without a limit controls nothing. “Good seal” is a wish; “seal strength at least 1.5 N per 15 mm, from the retailer’s specification” is a CTQ.',
  },
  'FC-141': {
    intro: 'For finding out which requirements a customer treats as must-haves, which as more-is-better and which as delights — by asking each of them two ways.',
    steps: [
      {
        step: 'The survey',
        means: 'What the questions are about, and who was asked and how. A dozen people is the usual floor for a requirement; fewer is an anecdote.',
        doThis: 'Say what the questions are about — a pack, a lid — and who answered, how many, how they were chosen.',
        youGet: 'The survey on the page, so its size is never a mystery.',
      },
      {
        step: 'The answers, one pair at a time',
        means: 'Each person is asked each requirement twice: how they would feel if it were there, and how if it were not. The two answers together say what kind of requirement it is.',
        doThis: 'Add a row for each person’s pair. Type the requirement the same way each time, then tap the two answers. Add who it was if you want to keep track.',
        youGet: 'Each pair classed by Kano’s published table — attractive, performance, must-be, indifferent, reverse or questionable.',
      },
      {
        step: 'Or tallied by hand',
        means: 'If the survey was already classed on paper, you do not have to type every pair — just how many people fell in each class for a requirement.',
        doThis: 'Add a row with the requirement and the count in each class. It is added to any pairs you typed for the same requirement.',
        youGet: 'The same table as typed answers, from counts.',
      },
      {
        step: 'The survey by requirement',
        means: 'For each requirement, the counts in each class, the class it is — the commonest among those asked — and two indices: better, how much satisfaction rises if you meet it, and worse, how much it falls if you miss it.',
        doThis: 'Read the class, then the split: a requirement that is mostly must-be is a limit never traded; mostly attractive is a decision. A tie says ask more people.',
        youGet: 'The classed requirements, the checks for too few answers or a tie, and the evaluation table for reference.',
      },
    ],
    watch: 'Spell a requirement the same way every time — the same words are the same requirement. And needs move: last year’s delight is this year’s expectation, so ask again.',
  },
  'FC-150': {
    intro: 'For answering a customer’s corrective-action request, or a serious incident: what was contained, why it happened, why it was not caught, and that it cannot come back — with a date for each step.',
    steps: [
      {
        step: 'D0 · The symptom and the emergency response',
        means: 'What happened, the day it was raised, where it came from, and what was done in the first hours. Every elapsed day in the report is counted from this day.',
        doThis: 'Type the day it was raised, pick the source, add the customer’s reference, describe what happened in plain words and what you did at once.',
        youGet: 'The start of the clock, and the facts the rest of the report answers.',
      },
      {
        step: 'D1 · The team',
        means: 'Who is working on it — a leader, a champion who clears the way, and a person from each place the problem touches. Typed here: the project’s members are not kept on the device.',
        doThis: 'Name the team leader (the project’s lead is offered), the champion, and add each member with their function.',
        youGet: 'The team on the report.',
      },
      {
        step: 'D2 · The problem described',
        means: 'The problem in one statement, drawn from is and is not — what, where, when, how much. What it is NOT is what points at the cause.',
        doThis: 'Add a row for each of what, where, when and how much, with what it is and what it is not. Add photos of what the customer saw.',
        youGet: 'A described problem — and a check if one of the four is missing.',
      },
      {
        step: 'D3 · Interim containment',
        means: 'What protects the customer while the cause is found: product held, sorted, recalled or reworked. It fixes nothing. Typed here, because the hold is not a tool yet.',
        doThis: 'Add each action with its owner, the day and whether it is checked as working. Say how you checked nothing more escaped. For money, give the units held, what one cost and the hours of sorting.',
        youGet: 'The containment on the report, the product held as money tied up, and the sorting as labour — kept apart.',
      },
      {
        step: 'D4 · Root cause and escape point',
        means: 'Why it happened, and why the checks did not catch it — and how you know, by turning the cause on and off. The project’s fishbone is read below the boxes.',
        doThis: 'Type the root cause, how it was verified and the day, and the escape point. A cause of “operator error” is a reason to look again for the system cause.',
        youGet: 'A verified cause and escape point, with the project’s causes listed beside them and a check on a weak cause.',
      },
      {
        step: 'D5 and D6 · The action, in and proved',
        means: 'The permanent fix chosen, put in place, and shown on the number. The project’s actions and studies are read, not retyped.',
        doThis: 'Say what was chosen and why it will work, the days chosen and in place, and how it was validated. Add the events a week before, the weeks since and the events since.',
        youGet: 'The days from D0, “0 in 6 weeks against about 540 expected”, and the project’s actions and studies listed as the evidence.',
      },
      {
        step: 'D7 and D8 · Prevention and closure',
        means: 'The system changed so it cannot come back — the FMEA, the control plan, the standard, the other lines — and the day the report was closed. Retraining alone is not a system change.',
        doThis: 'Add a row for each change with its kind, what and the day. Type the closing day and how the team was recognised, then the lead closes the report.',
        youGet: 'The days table from D0 to D8 and a closed 8D report, with who closed it and when.',
      },
    ],
    watch: 'A D4 of “human error” and a D7 of “retraining” is the mark of a report written to close a complaint, not to solve a problem. The page flags it; fix the cause, not the wording.',
  },
};
