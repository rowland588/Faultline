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

export const METHOD_GUIDE: Readonly<Record<MethodKey, MethodGuide>> = { pdca: PDCA, dmaic: DMAIC } as Record<MethodKey, MethodGuide>;

/** A method’s whole guide. */
export const guideOfMethod = (key: MethodKey): MethodGuide => METHOD_GUIDE[key];

/** One section’s guide, by the section’s name exactly as methods.ts names it. */
export const guideOfSection = (key: MethodKey, section: string): SectionGuide | undefined => METHOD_GUIDE[key].sections.find(s => s.section === section);
