/* WHAT EACH STEP OF EACH METHOD MEANS (docs/METHODS.md §15 — Rowland, 1 November 2026: "all tools must have user guidance ..
 * what's each step means").
 *
 * For each of the eight methods (src/lib/methods.ts): WHEN TO REACH FOR IT, WHEN NOT (and what to use instead), ONE WORKED
 * EXAMPLE on a food line, and — for every section of the method, named exactly as methods.ts names it and in its order —
 * WHAT IT MEANS (the step in the floor’s words, a term of art explained in passing), WHAT TO DO (what a person does in the
 * app in that step: the tools the section lists, Actions, the Journey, Problems — and where the figure comes from on the
 * floor) and WHAT YOU GET (what the person leaves the step with).
 *
 * Written by us and fixed in code, never made by an assistant (docs/DIRECTION.md, 20 October). The meaning of each method is
 * taken from its knowledge record (knowledge/methods/ — rca/pdca, sixsigma/dmaic, rca/eight-d, rca/a3, commissioning/stage-gate,
 * lean/kaizen-event, lean/toyota-kata, capacity/theory-of-constraints) and docs/METHODS.md §3–§10. Where a record says its
 * steps are "from knowledge, to confirm" (8D, A3, Kaizen event, Improvement Kata) the steps here are the ones methods.ts has,
 * and no authority is added that has not been checked.
 *
 * Honest about the app: a tool is named as something to open only where it is built. A tool the section lists that the page
 * marks "Not built yet" has no button, so the step says what to keep in its place (an Action or a note) without naming
 * what is or is not built — the words stay true when the tool arrives. The same tests that hold the tool guides hold these
 * (__tests__/methodGuide.test.ts): every section of every method has its three parts, in order, and no old word. */
import type { MethodKey } from './methods';

export interface SectionGuide {
  /** The section’s name, exactly as methods.ts names it. */
  section: string;
  /** What the step is, in the floor’s words; any term of art explained in passing. */
  means: string;
  /** What a person does in the app in this step, and where the figure comes from on the floor. */
  doThis: string;
  /** What the person leaves the step with. */
  youGet: string;
}

export interface MethodGuide {
  /** When to reach for the method. */
  whenToUse: string;
  /** When not to — and what to use instead. */
  notFor: string;
  /** One worked example on a food line. */
  example: string;
  /** One guide for each section, in the method’s order. */
  sections: readonly SectionGuide[];
}

const PDCA: MethodGuide = {
  whenToUse: 'Reach for PDCA when one number has to move and you want to know, afterwards and with figures, whether your change moved it and whether it stayed moved: film breaks on a wrapper, rejects at a seal, give-away on a filler. It suits a change small enough to try on one line and measure within a few shifts.',
  notFor: 'Not for finding a cause nobody knows yet: work the 6M tool’s fishbone and five whys first, then bring the cause into Plan. Not for a change with no number to move (find the number first), a daily routine of small steps toward a far-off goal (Improvement Kata), a customer’s corrective-action request (8D) or a focused week with a team released from the work (Kaizen event).',
  example: 'Film breaks on a biscuit wrapper. Before: eight shifts, 56 breaks, 7.0 a shift. Plan: a new splice guide, predicted to cut breaks by 30%. Do: fitted on one wrapper, each step an Action with an owner and a day. Check: eight shifts after, 20 breaks, 2.5 a shift, 64% fewer, beyond the noise and twice the prediction (the guide also stopped the reel-end snatch nobody had counted). Act: written into the line standard, offered to the other wrappers, and a control chart on the after shifts says that a shift at 8 breaks or more means it has slipped.',
  sections: [
    {
      section: 'Plan',
      means: 'Writing down, before you touch anything, the number you want to move, where it is against where it should be, the cause you suspect, the one change you will make and the effect you expect, in figures. A prediction written after the result is not a prediction.',
      doThis: 'Make a Problem in the register with its line, machine and priority, so the plan has a place. Take the number from the tool that measures it: the Loss count for where a shift’s time went, Capability for a measurement or a reject rate, the Defect Pareto for faults by type. Take 8 to 20 shifts or days of readings before you change anything, so the number’s normal swing is known. For the cause, open the 6M tool (fishbone and five whys) and rank the possible changes with Impact and effort. Then write the change and the effect you expect, in figures, as the reason on its Action.',
      youGet: 'A written plan: the number with its readings from before, the suspected cause, the one change and a prediction in figures. It is what the Check will be held against.',
    },
    {
      section: 'Do',
      means: 'Making the change, small first (one line or one shift before the whole factory), with a named person, a day and a reason for every step, so everybody knows what was changed and when. The date of the change matters: it splits the readings into before and after.',
      doThis: 'Give each step an Action in the project: who, what, why, where and by when, with its priority. Plan the days on the Journey so they land on this week and next. If you want the sum worked before the trial, use a Calculator for the what-if. Say what was done into Line Talk and photograph it, so it is kept with the project. Change one thing at a time: two changes made together cannot be told apart.',
      youGet: 'The change made and dated, every step owned on the Actions page, and a record of what was done that the Check can trust.',
    },
    {
      section: 'Check',
      means: 'Measuring the same number again, the same way, and setting it against before and against your prediction. The question is whether the difference is bigger than the number’s own ups and downs (“beyond the noise”), and whether it did what you said it would do.',
      doThis: 'Take the after readings exactly as the before ones were taken: same machine, same count or timing, same definition. Open Analysis, ask Did it change, paste Before and After, and read the sentence it gives with the size of the change in the number’s own units. Put a measurement on a Control chart or in Capability. Then set the result against the prediction: a bigger effect than you planned is a question too (what else changed?).',
      youGet: 'A verdict in words and figures: moved or not, by how much, how sure, and against what you predicted. Where the line’s rates are given, the money it is worth as well.',
    },
    {
      section: 'Act',
      means: 'Deciding what the result earns. If it worked, the change becomes the way the work is done: written down, people shown it, offered to the other lines, and watched to see that it holds. If it did not work, you say why and plan again.',
      doThis: 'If it worked, update the Line standard or the standard work (the combination table in Line balance) and raise an Action for the training and one for each other line with the same machine. Start a Control chart on the after period: its limits tell you when a later shift has slipped. If it did not work, write what you learned as a note and go back to Plan. Close the Problem only when the number holds.',
      youGet: 'Either a standard that holds the gain with a chart watching it, or a written lesson and a new Plan. Never a change quietly declared a success.',
    },
  ],
};

const DMAIC: MethodGuide = {
  whenToUse: 'Reach for DMAIC when a defect or a variation has to be cut with data, the cause is not obvious, and somebody will want evidence before each phase begins: give-away, yield, a chronic seal-failure rate, start-up losses across a range of products. It suits a project big enough to deserve a review at each phase and a named owner for the process afterwards.',
  notFor: 'Not for a problem that can be fixed on the floor in a week: use PDCA, an A3 or a Kaizen event, which carry the same logic without five reviews. Not for a customer complaint that needs a formal corrective-action report (8D) or for new equipment going in (Stage gate).',
  example: 'Give-away on a muesli filler. Define: the charter, with the requirement “mean give-away at most 2 g and no pack under the nominal weight”. Measure: baseline Ppk 0.6 on 120 packs, and the checkweigher’s gauge R&R at 12%, acceptable. Analyse: split by weigher head, head 3 runs 2 g heavy; five whys end at feed-tray vibration. Improve: a pilot takes give-away from 4.1 g to 2.3 g, proved before and after. Control: a chart at the weigher, a control plan row, the standard, eight weeks held, then handed to the process owner.',
  sections: [
    {
      section: 'Define',
      means: 'Saying exactly what the problem is and what it is worth before measuring anything: the problem in one sentence, the customer’s requirement, the scope, the goal and the money at stake. A CTQ (critical to quality) is the customer’s requirement turned into something you can measure, with its limits.',
      doThis: 'Write the charter: the problem, the CTQ with its limits, the goal and its date, the team and the line. Where the section’s tool list shows a charter tool, write it there; where a tool shows Not built yet (a SIPOC scope page, a voice-of-the-customer table), keep its content as a note on the project. A SIPOC lists suppliers, inputs, the process, outputs and customers on one page. Put money on the problem with the Cost of poor quality calculator and on the fix with the payback and NPV calculator; an input you cannot give yet is named, not guessed.',
      youGet: 'A problem statement agreed at the first review: the CTQ with its limits, the scope, the goal and date, the team, and what success is worth in money.',
    },
    {
      section: 'Measure',
      means: 'Finding out where the CTQ stands today, and proving the measuring can be believed. The baseline is the CTQ’s real readings and its capability, which is how well it fits inside its limits. The gauge check (R&R, repeatability and reproducibility) asks whether the same scale gives the same answer for the same pack, whoever uses it.',
      doThis: 'Decide how many readings, who takes them and how, before the first one. Run Gauge R&R first on the checkweigher or probe you will use: ten parts across the range, a few appraisers, each measuring more than once. Under 10% is good, 10 to 30% is acceptable depending on the purpose, over 30% is unfit. Then take the baseline in Capability (thirty or more readings, limits from Define) or, for counts, the reject-rate, faults-per-item and defects-per-million modes, and put the readings on a Control chart in time order.',
      youGet: 'A baseline you can trust: Ppk (or the reject share, or defects per million) with how sure it is, the gauge’s verdict, and a chart of how the number behaves in time. Improve will be proved against it.',
    },
    {
      section: 'Analyse',
      means: 'Finding the root causes with data, not opinion. Stratifying means splitting the data (by head, shift, product, machine or day) to see where the problem lives. A cause counts only when the data point at it and the five whys can be walked down to something you can put right.',
      doThis: 'Start with the Defect Pareto to see which kind of fault matters. Split the data with Stratification for stops, or Comparing several groups in Analysis for heads, shifts and lines. See what moves with the problem in Correlation and What drives it. Then work the 6M tool’s fishbone and five whys on what the data point at, marking how each cause is known: measured, counted, seen or told.',
      youGet: 'The verified root causes, each with its evidence and how it is known, and the suspects ruled out. Not a list of opinions: every cause points at a figure.',
    },
    {
      section: 'Improve',
      means: 'Choosing a solution, trying it small and proving on the CTQ that it works. Choosing means weighing the options against criteria agreed first, not by who argues loudest. The pilot is a trial on one line or one shift, measured the same way as the baseline.',
      doThis: 'Compare the solutions in the Pugh matrix, with today’s way as the datum, and order the countermeasures with Impact and effort. If changeovers are the lever, time and cut them with SMED. Run the pilot as Actions with owners and days, take the readings exactly as in Measure, and prove it in Analysis (Did it change). Put its worth against its cost with the payback and NPV calculator.',
      youGet: 'A chosen solution and its pilot result: before and after on the CTQ, with how sure, and its worth against its cost.',
    },
    {
      section: 'Control',
      means: 'Making the gain hold after the project team has gone. A control chart watches the number and flags a slip. A control plan says what is checked, how often, by whom and what happens if it goes wrong. The process owner is the person who now runs the process and owns the number.',
      doThis: 'Start a Control chart on the new period (X̄-R for subgroups, XmR for single readings, a reject-rate or faults chart for counts) with its limits set from the good period and frozen. Capability across products and over time shows whether it stays capable. Update the standard in Line standard or the combination table. Write the control plan row (what, how, how often, what if not) as a note where its tool shows Not built yet. Raise an Action to hand over to the process owner, with a day for the first review, and keep checking through the holding period (eight weeks is common).',
      youGet: 'A chart that says when the gain slips, a standard that holds the new way and a named owner who has the number. The project closes on the holding evidence, not on the last meeting.',
    },
  ],
};

const EIGHT_D: MethodGuide = {
  whenToUse: 'Reach for 8D when something has gone wrong that matters to a customer or to the site (a retailer complaint, a foreign-body incident, a withdrawal, a major audit finding) and you must show that it was contained at once, why it happened, why it was not caught and that it will not come back, with a date and evidence for each discipline.',
  notFor: 'Not for an internal improvement with no customer form to answer: a chronic give-away or a slow changeover belongs in an A3, PDCA or a Kaizen event. Not for finding a cause alone (use the 6M tool). 8D is heavy, and a report written only to close a complaint, with “operator error” as its cause and “retrained” as its cure, is sent back.',
  example: 'A retailer complains of leaking seals from lane 3. D0–D1, day 0 to 1: the complaint raised as a Problem, the line stopped, the team named. D2: is and is not (lane 3 only, since the new jaw went in). D3: 14 pallets held, 14 × 1,200 packs × £0.42 = £7,056 tied up. D4, day 9: the new jaw’s heater reads 12 °C low, verified by swapping the jaw to lane 2, where the leaks moved; the escape point is that no check looked at the heater. D5–D6: a heater calibration at every jaw change, and no leakers in six weeks on lane 3 where the old rate would have given about 540. D7: the control plan, the jaw-change checklist and the other sealers. D8, day 30: closed.',
  sections: [
    {
      section: 'D0–D1  Symptom, emergency response, team',
      means: 'D0 is what happened, in plain facts, and the emergency response: the first thing done to protect the customer and the line. D1 is the team, the few people who know the process and can act. Nothing is analysed yet. The aim is to stop it getting worse and to start the clock.',
      doThis: 'Raise the incident as a Problem in the register with its line, machine, priority and the date and time you learned of it. If it is a customer complaint, add it to the count in Complaints per million so it shows in the rate. Put the team on the Actions page by name, each with something to do and a day, and write the first response taken (line stopped, product quarantined) as an Action already done.',
      youGet: 'A dated symptom, the first response taken and a named team with its first Actions. This is day 0 of the clock every later discipline is timed from.',
    },
    {
      section: 'D2  Describe the problem',
      means: 'Describing the problem so exactly that anyone could recognise it. “Is / is not” is the heart of it: what the problem is and what it could be but is not, where and where not, when and when not, how much and how many. The differences between the is and the is-not are where the cause hides.',
      doThis: 'Write four pairs: what (which product, which fault) and what not; where (which line, lane, machine) and where not; when (which shift, which batch, since when) and when not; how much (how many packs, what share). Count with the Defect tally at the line, see the types in the Defect Pareto, and split by lane, shift and product with Stratification or Comparing several groups. Where the is / is not tool shows Not built yet, write the four pairs as a note on the project.',
      youGet: 'A specification of the problem: what, where, when and how much, each with its is-not. It tells D4 which differences to look into.',
    },
    {
      section: 'D3  Contain',
      means: 'Interim containment: the temporary action that protects the customer while the real fix is not yet known. Product is held, sorted or reworked, what has already left the site is found, and you check that the containment works. It fixes nothing; it buys time.',
      doThis: 'List what is held and where, how many packs, what they cost and who may release them. Record what the sort or rework finds on the Defect tally. Use What a sampling plan protects (the OC curve) to see what extra inspection really guards against. Make each containment step an Action with an owner and a day, and add one to check, from the first good result, that nothing more has escaped. Where a hold register shows Not built yet, keep the held lots in a note.',
      youGet: 'Product held or sorted with the quantity and its cost, the customer protected and evidence that the containment works. It is written as containment, never as the corrective action.',
    },
    {
      section: 'D4  Root cause and escape point',
      means: 'The root cause is why it happened, verified by turning it on and off. The escape point is why your checks did not catch it. “Operator error” is a stopping place, not a root cause: ask what let it happen.',
      doThis: 'Work the 6M tool: the fishbone with evidence on each cause, then the five whys on every cause you confirm. Test with data (Comparing several groups, Did it change in Analysis, Stratification) and by trying it: turn the suspected cause on and off, or swap the part to another lane and see whether the problem moves. Then ask the second question: which check should have caught this, and why did it not? Record both.',
      youGet: 'A root cause verified on and off, an escape point, and the whys behind each, with the evidence. This is D4’s deliverable.',
    },
    {
      section: 'D5–D6  Corrective action, implemented and validated',
      means: 'D5 chooses the permanent corrective action and shows it should work. D6 puts it in and proves, on the number, that it did. It replaces the containment: once D6 holds, the held-and-sorted workaround can stop.',
      doThis: 'Compare the options in the Pugh matrix and order them with Impact and effort, then make the chosen action an Action with an owner and a day. After it is in, prove it on the same number the complaint was about: Did it change in Analysis, Capability on the new readings and a Control chart running on it. If the result is a count of zero, say what zero proves: the count the old rate would have given, and did not.',
      youGet: 'The chosen action in place and its proof, before and after on the number with how sure, so the containment can be lifted.',
    },
    {
      section: 'D7  Prevent recurrence',
      means: 'Preventing it coming back in the system, not just on this line. The FMEA (failure modes and effects analysis, the list of what can go wrong and how well it is caught) is updated, the control plan gains the check that would have caught it, the standard is rewritten, and the fix is offered to every line with the same machine.',
      doThis: 'Make an Action for each system change, with an owner and a day: the risk list, the control plan check, the written standard (Line standard, the combination table in Line balance) and the mistake-proofing check in the Mistake-proofing log. Then make one Action for each other line with the same machine, to check it or fit the fix. Where a tool the section lists shows Not built yet, the change is still an Action and its evidence a note.',
      youGet: 'The system changed in writing: the documents updated, the checks added and the other lines told, each with an owner and a date.',
    },
    {
      section: 'D8  Close',
      means: 'Closing the report: every discipline has its evidence and its date, the team is recognised, and the report goes to whoever raised it, the client. It also shows how many days each discipline took.',
      doThis: 'Check each discipline has its evidence and date and every Action is closed, then close the Problem. Write what was learned as a note. Make the project’s reports for the client. Where the 8D report shows Not built yet, those reports and the closed Actions are the record.',
      youGet: 'A closed report, each discipline with evidence and a date, sent to the client, and the days each took.',
    },
  ],
};

const A3: MethodGuide = {
  whenToUse: 'Reach for an A3 when one problem and its solution have to go on one page and be agreed with the people who must support it: a chronic give-away on a line, a changeover improvement proposed to the sponsor, a 6M brought to the site meeting. The owner drafts the thinking, the others question each block, and the page carries their agreement.',
  notFor: 'Not for a formal corrective-action report to a customer (8D). Not for a whole programme of problems: one page holds one problem. Not as a form to fill in after the work is done: a page of statements with no facts and no evidence is the common failure.',
  example: 'Leaking seals on lane 3, found in the weekly count before any complaint. Background: leakers cost money every week and risk a complaint. Current condition: leakers by lane, lane 3 at 3.2% against 0.3% on the others. Target: 0.3% on lane 3 by 14 November. Analysis: the swap test points at the new jaw’s heater. Countermeasures: heater calibration at every jaw change (engineering, 7 November) and a jaw-change checklist (production, 10 November). Plan and follow-up: on 28 November the chart shows 0.2% over four weeks, held. One page, read in the site meeting in two minutes.',
  sections: [
    {
      section: 'Background',
      means: 'Why this matters to the business: the gap in a number the business cares about, and what the gap costs. A background that does not name the number and the cost is a complaint, not a problem.',
      doThis: 'Raise the Problem in the register with its line and priority. Put the cost beside it: Cost a pack in labour and Lost time in money for time, Cost of poor quality for rejects and holds. Write the gap in one sentence (the number now, the number wanted, the cost a week) and say who feels it.',
      youGet: 'The gap stated in the business’s own number, with what it costs a week. It is why the page exists.',
    },
    {
      section: 'Current condition',
      means: 'The facts drawn with the number on them: a chart, a Pareto or a map of the process, whichever shows the number best. It is what is true today, not what anyone thinks the cause is.',
      doThis: 'Draw it from real readings and take them yourself at the line. Use the Defect Pareto for faults by type, the Loss count for where a shift’s time goes, the Value stream map for flow and waiting, a Control chart or Capability for a measured value and the Defect tally for counts. Note the dates the readings cover, and pick the one picture that shows the number.',
      youGet: 'A picture and a number for today: the baseline the target and the follow-up are measured against.',
    },
    {
      section: 'Target',
      means: 'The number you want and the date you want it by, on the same measure as the current condition. A target with no date is a wish; a target on a different measure cannot be checked.',
      doThis: 'Set it on the same measure and in the same unit as the current condition. If the target is the line’s output, Line capacity shows what the line can make and how far each way to the target goes. For a number the team reports every week, use the line’s weekly Numbers, which hold the target and the trend. Put the date on the Action that follows.',
      youGet: 'A target of a number, a unit and a date: what the follow-up will be judged against.',
    },
    {
      section: 'Analysis',
      means: 'The root cause, with the evidence. The fishbone sorts possible causes on six bones (People, Machine, Method, Material, Measurement, Environment) and the five whys drill each confirmed cause down to something that can be put right.',
      doThis: 'Open the 6M tool and build the fishbone from the current condition, marking how each cause is known: measured, counted, seen or told. Work the five whys on the confirmed ones. Split the data by shift, head or product where it helps, and ask the is / is not question: where and when it happens, and where and when it does not. Where a fault tree or an is / is not tool shows Not built yet, keep the answers as a note.',
      youGet: 'The root cause, or causes, with the evidence for each and the chain of whys. The countermeasures aim at these.',
    },
    {
      section: 'Countermeasures',
      means: 'What will be done, by whom, by when and against which cause. A countermeasure is aimed at one named cause; a list of tasks with no cause named is a to-do list.',
      doThis: 'Put each countermeasure on the Actions page with its owner, its day, its reason and the cause it answers. When there are several ways to answer a cause, rank them with Impact and effort or compare them in a Pugh matrix. Check that every cause on the analysis has a countermeasure, or a written reason why not.',
      youGet: 'A set of Actions, each tied to a cause and with an owner and a date, and no cause left unanswered without a reason.',
    },
    {
      section: 'Plan and follow-up',
      means: 'The steps and their dates, and then the part most often forgotten: the number checked again, and whether it held. The page is not finished until the follow-up is written. It is updated, not replaced.',
      doThis: 'Plan the steps on the Journey so they land on their days. On the follow-up date take the number again, the same way, and use Did it change in Analysis for before and after, with a Control chart to watch it hold. Keep the weekly Numbers up against the target. Write the result in the project’s notes and close the Problem when it held.',
      youGet: 'The follow-up result against the target (did it move, by how much, did it hold) and the page closed or planned again.',
    },
  ],
};

export const METHOD_GUIDE: Readonly<Record<MethodKey, MethodGuide>> = { pdca: PDCA, dmaic: DMAIC, 'eight-d': EIGHT_D, a3: A3 } as Record<MethodKey, MethodGuide>;

/** A method’s whole guide. */
export const guideOfMethod = (key: MethodKey): MethodGuide => METHOD_GUIDE[key];

/** One section’s guide, by the section’s name exactly as methods.ts names it. */
export const guideOfSection = (key: MethodKey, section: string): SectionGuide | undefined => METHOD_GUIDE[key].sections.find(s => s.section === section);
