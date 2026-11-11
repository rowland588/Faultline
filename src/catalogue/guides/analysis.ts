/* GUIDES — the analysis and control methods of DMAIC, 8D and PDCA (stratification, designed experiments, the process FMEA, the control plan,
 * the response surface). The exemplars the others match are in spc.ts (FC-094, FC-118): the page's own labels, in the order a person meets
 * them, each step said as what it means, what to do and what you get — and nothing the page does not do. */
import type { Guide } from '../guide';

export const ANALYSIS_GUIDES: Record<string, Guide> = {
  'FC-153': {
    intro: 'For a problem that shows in the total — too many rejects, too much give-away — when you need to know whether it is everywhere or in one shift, line, machine, product or supplier, before you go looking for a cause.',
    steps: [
      {
        step: 'Where does the problem live?',
        means: 'The question this page answers. You give it the same counts or readings, tagged with where each came from, and it splits them by each tag to see whether one place carries the problem or whether it is spread about evenly.',
        doThis: 'Pick “Where does the problem live — which shift, line, machine or product?” from the questions. Use it when you already have the data tagged — a tally sheet with the shift and the product on every line is the usual start.',
        youGet: 'A page that asks what was counted or measured and how it was split, then works out the answer as you add records.',
      },
      {
        step: 'How was it taken?',
        means: 'Counted means a number rejected out of a number made — the reject bin’s tally. Measured means a reading each time — a weight, a temperature, a time. They are split with different tests, so the page needs to know which you have.',
        doThis: 'Tap Counted if each record says how many were made and how many were rejected. Tap Measured if each record is one reading. Name what you are measuring (“Rejects”, “Give-away”) and, for readings, the unit.',
        youGet: 'The right boxes for the records, and the right words — rates for counts, means for readings.',
      },
      {
        step: 'Split by',
        means: 'The factors the data is tagged with — the ways you want to slice it. Shift, line, machine, product and supplier are offered; type the floor’s own (weigher head, film lot) if you have them. Up to four.',
        doThis: 'Tap the factors you tagged the data with, or type them separated by commas. Only name a factor you really have on every record: a record without its tag cannot be placed, and is left out of that split and said.',
        youGet: 'A chip row for each factor on the entry, so every record gets its place as you add it.',
      },
      {
        step: 'The records',
        means: 'One line of the tally: the level of each factor (Nights, Product A) and, counted, how many were made and how many rejected — or, measured, the reading. Whole-number counts, never more rejected than made.',
        doThis: 'Tap the level of each factor — or name a new one — then type Made and Rejected and Add the record. If the data is already in a sheet, paste the rows instead: the levels in the order above, then the numbers, separated by tabs or commas. A wrong record is struck, not deleted.',
        youGet: 'The records listed in the order taken, each with its tags; rows that could not be used are listed, never silently dropped.',
      },
      {
        step: 'Where it lives',
        means: 'The answer in words. For each factor the page tests whether the places differ more than chance, and names a place only when it has enough in it — five or more rejected — and stands out beyond chance. It divides the level by the number of splits tried, because split enough ways and something always looks different by luck.',
        doThis: 'Read the sentence first: which place carries the problem, its share of the rejects against its share of what was made, and its rate against the rest. Then the tiles, and the checks underneath — they say if counts are too small to trust, or if two factors run together.',
        youGet: 'A verdict — Lives in Night, Not in one place, Too few — in amber when a place stands out (it is a place to look, not a failure), with the test, its p-value and how strong the link is.',
      },
      {
        step: 'The tables, and the two together',
        means: 'Each factor as a table — made, rejected, rate with its range, share of the rejects against share of what was made — and then the two strongest factors crossed, because the usual find is a combination: nights are bad, but only on one product.',
        doThis: 'Look down “Against chance” for the places marked more or fewer, then at the cross for the cell that stands out. Read “too few to judge” as exactly that — more records will settle it.',
        youGet: 'The place, or the combination, to take to Is / is not and the fishbone — and a picture of every place with its interval.',
      },
      {
        step: 'What one reject costs',
        means: 'An optional figure that lets the page say the gap in money: how many rejects there would have been in the worst place had it run at the rate of the rest, times what one reject costs you.',
        doThis: 'Under “Change what was agreed”, type what a reject costs — the pack’s materials and the labour wasted. Leave it empty if you do not know: the page says what is missing and the answer stands without it.',
        youGet: 'The excess in pounds, or the name of the one input still needed. It is the gap to the rest, not a saving promised.',
      },
    ],
    watch: 'A place found is where the problem shows, not why it happens. When two factors run together — one product only made on one line — the page cannot tell which one it is, and says so.',
  },
  'FC-111': {
    intro: 'For finding out which machine settings really drive a result — and whether they work together — by changing them on purpose in a planned pattern, instead of one at a time. Seal temperature, dwell and pressure on a tray sealer is the classic.',
    steps: [
      {
        step: 'Which settings drive the result?',
        means: 'The question this page answers. Changing one setting at a time misses the case where temperature only matters when dwell is short. A designed experiment sets every combination of low and high, and reads each setting’s effect from all the runs together.',
        doThis: 'Pick “Which settings drive the result — and do they interact?” Use it when you can really change the settings and make the product at each combination. If you only have running data and nothing was changed on purpose, use “What moves with what” instead.',
        youGet: 'A page that plans the runs, asks for the response of each, and says which settings matter.',
      },
      {
        step: 'What is measured',
        means: 'The response — the number that tells you whether a run was good: seal strength in newtons, give-away in grams, moisture in per cent. It must be measured well enough: a gauge that wobbles buries the effect.',
        doThis: 'Type the name and unit of the response. Say which way is better (higher seal strength, lower give-away) — it is used only to pick the best settings at the end, never to change a test. If you are not sure the gauge is good enough, run Gauge R&R first.',
        youGet: 'The words for the sentences and the paper, and the direction used when the best settings are named.',
      },
      {
        step: 'The factors',
        means: 'The settings you will change, each at a low and a high value that you can really run. Choose them wide enough to show an effect and safe enough to run. Two to five factors.',
        doThis: 'For each factor type its name, its unit and its low and high setting (the high must be above the low). Add a factor with the button; take one off with Take off. Use the settings the operators already use at the edges of the working range, not extremes that spoil product.',
        youGet: 'The size of the experiment: every combination of low and high, so three factors is eight runs and four is sixteen.',
      },
      {
        step: 'Times each corner is run, and centre runs',
        means: 'Running every combination more than once lets the page measure the noise from the runs themselves, which is what makes an effect provable. Centre runs set every factor halfway; they show whether the result bends between low and high.',
        doThis: 'Choose 2 or more times each if you can afford it; one run each still works, but then the page can only judge the effects against each other. Add two or three centre runs if you suspect a bend. The page says how many runs that is in all, and what they cost if you give the packs a run makes and what a pack’s materials cost.',
        youGet: 'A run list in a random order, shuffled from a seed that is kept and shown — so a line that warms up through the day cannot pass itself off as a factor.',
      },
      {
        step: 'The runs',
        means: 'The runs in the order to make them, each with the settings to set. The order is random on purpose. You can print this table as the run sheet for the floor before anything is made.',
        doThis: 'Print the paper (Report ▾) to take to the line, or work from the page. Make the runs in this order; do not tidy it up to save time on resets. Reset the machine between runs, so each is a real run.',
        youGet: 'The run sheet: run number, the settings in your units, and a blank column for the response.',
      },
      {
        step: 'The responses',
        means: 'After each run, the one number you measured. The page always says which run is next and what to set, and keeps count of how many are done.',
        doThis: 'Set the line as the page says, make the run, type the response and press Enter. Or paste a column of responses in run order. A wrong one is struck, not deleted — then the experiment is one short and the page says which combination.',
        youGet: 'The effects are worked out as soon as every combination has the same number of readings.',
      },
      {
        step: 'The effects',
        means: 'An effect is how much the response changes when the setting goes from low to high. An interaction is how much that change depends on another setting. The page says which are real — beyond the noise from the replicates, or, with one run each, beyond Lenth’s margin of error — and which are not.',
        doThis: 'Read the sentence first: the settings that matter, by how much, and the ones not shown to matter. Then the picture (each effect with its range, on a zero line) and the interaction read as two numbers. The settings that do not matter can be left where they are cheapest.',
        youGet: 'The real effects with their intervals, the share of variation the model explains, and — if you gave a direction — the settings the model puts best, with the expected result.',
      },
      {
        step: 'Confirm before you change the standard',
        means: 'The best settings are a prediction from the runs made, inside the ranges tried. A bend between low and high, or an effect that only holds in the trial, would not show until you run there.',
        doThis: 'Run the line at the settings named, a few times, and compare with the expected value and its range. If the centre runs show a bend, the next step is a response surface to find the best setting between the levels.',
        youGet: 'A result you can trust enough to put in the standard — or the reason not to yet.',
      },
    ],
    watch: 'Do not skip the random order. Making the runs in the order that is quickest lets a drift — a warming machine, a changing reel — look like the factor you changed last.',
  },
  'FC-132': {
    intro: 'For going through a process step by step before it fails — a wrapper, a new film, a changeover — to write down what could go wrong, rate it, and decide which failure modes need action first. Done by the people who run it, not by one person at a desk.',
    steps: [
      {
        step: 'New FMEA',
        means: 'A register for one process or line step, kept as a card for each way it can fail. FMEA means failure mode and effects analysis: what could fail, what that would do, why, and whether it would be caught.',
        doThis: 'Press New FMEA, name it for the process (“Line 2 wrapper — October review”) and pick the line. Do it round a table with the operator, the engineer and quality — the failure modes that matter are the ones the operators have seen.',
        youGet: 'A register with one blank card. Add a card for each failure mode with “+ Add a failure mode”.',
      },
      {
        step: 'Failure mode, effect and cause',
        means: 'The failure mode is what goes wrong (“Seal does not hold”). The effect is what the customer or the next step gets (“A leaker reaches the customer”). The cause is why it would happen (“Jaw temperature drifts”). One failure mode can have several causes: give each its own card.',
        doThis: 'Fill in Failure mode, Process step, Effect and Cause in plain words. Take the failures from the problems register, the loss count and the complaints, not only from memory.',
        youGet: 'A card that says one thing that could go wrong, why, and what it would do — ready to be rated.',
      },
      {
        step: 'Prevention now and detection now',
        means: 'The controls already in place. Prevention stops the cause happening (a set-point check each start). Detection catches the failure before it leaves (a seal pull every 30 minutes). Rate what is really done today, not what the procedure says should be.',
        doThis: 'Write the prevention and the detection that exist now, as the operators would describe them. If there is nothing, write “none” — that is a finding, not a gap in the form.',
        youGet: 'The controls the ratings will be judged against, and later the rows of the control plan.',
      },
      {
        step: 'Severity, occurrence and detection',
        means: 'Three ratings from 1 to 10. Severity: how bad the effect is (10 is a consumer harmed or the law broken). Occurrence: how often the cause happens with the prevention in place (10 is more than 1 in 10; 1 is it cannot happen). Detection: how well the control now would catch it (10 is nothing checks; 1 is the failure cannot pass).',
        doThis: 'Pick the line that fits best on each scale; the anchor under your pick says what it means in food-manufacturing terms. Argue the anchor, not the number. The scales are listed under “The rating scales”.',
        youGet: 'A rated failure mode. A card with fewer than all three ratings is not ranked and is counted as “not rated yet”.',
      },
      {
        step: 'The priority',
        means: 'High, Medium or Low, read from the three ratings by a stated rule: how bad the effect is comes first, then how well the controls hold it back. A severity of 9 or 10 is never Low. The rule is Luna’s own, shown in full under “How the priority is decided” — it is not the handbook’s table, and the three ratings are never multiplied.',
        doThis: 'Read the word on the card and the reason under it. High means do something — or write down why the controls now in place are enough. Medium means it should have an action. Low may. If your team holds the AIAG-VDA handbook, set the priority by hand from its table: the card says so.',
        youGet: 'A register ranked High first, then by severity — and a sentence naming the High modes and how many still have neither an action nor a reason.',
      },
      {
        step: 'Action, and the priority from a handbook',
        means: 'What will be done about it, who does it and by when. Prevention comes first (lower the occurrence), then better detection; severity only moves with a design change. If there is no action, the reason the controls are enough is written, not assumed.',
        doThis: 'Open the section and write the action, who, and the day. For a High mode with no action, write why instead. Optionally type what one occurrence costs: it is said beside the priority and never used to rank it. Tick “A food-safety hazard” on any row that is one — it belongs in the HACCP plan too.',
        youGet: 'An action with an owner and a day; an action past its day shows red, once, in the sentence and the closing line.',
      },
      {
        step: 'After the action',
        means: 'When the action is in place and checked, rate the card again. The priority should come down; if it does not, the action did not do what it was meant to. A rating made before the action is done is a prediction, so it is not counted.',
        doThis: 'Enter the day under “Done on”. The three ratings appear again: set the occurrence and detection as they are now, and write how it was checked. Re-open the register at every change, complaint and new failure.',
        youGet: 'The priority now beside the priority then — “Now Low, down from High” — and the evidence kept with the card.',
      },
    ],
    watch: 'A rating is a judgement, not a measurement, and an FMEA written by one person at a desk lists only what that person knows. Rate with the operators and the scales in front of you, and never read a threshold off the product of the three numbers.',
  },
};
