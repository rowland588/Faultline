/* GUIDES — the control plan, product on hold and fault tree analysis (the DMAIC Control, 8D D3 and D4 tools). Each step is the page's own label, said as
 * what it means, what to do and what you get — and nothing the page does not do. */
import type { Guide } from '../guide';

export const RISK_CONTROL_GUIDES: Record<string, Guide> = {
  'FC-133': {
    intro: 'For writing down, once, what is checked on a line, against what, by whom and what is done when it is out — so an improvement is held after the project team has gone. Start it from the FMEA so that every risk that matters has a check.',
    steps: [
      {
        step: 'New control plan',
        means: 'A register for one process or line, kept as a card for each characteristic — each thing that is checked. A control plan is the written link between the risks (the FMEA) and the checks on the floor.',
        doThis: 'Press New control plan, name it for the process (“Line 2 wrapper — control plan”) and pick the line. If an FMEA already exists for the line, press “+ From the FMEA” on the plan to start a card for each risk that has no check.',
        youGet: 'A plan with one blank card, or a first draft with a card for each risk the FMEA says matters.',
      },
      {
        step: 'Characteristic, step and against what',
        means: 'The characteristic is what is checked (“Seal strength”, “Net weight”, “Metal detector sensitivity”). Against what is the specification or limit it is judged against (“≥ 8 N per 15 mm”). A product characteristic is a feature of the pack; a process one is a setting or a condition.',
        doThis: 'Name the characteristic as the floor says it, the process step it belongs to, and the limit in numbers with the unit. If the limit is a legal or customer one, say so in the words.',
        youGet: 'A card that says one thing that is checked and what good looks like.',
      },
      {
        step: 'How and the sample',
        means: 'How is the method and the gauge: “Pull test, calibrated force gauge”. The sample is how much is taken each time: “1 pack per head”, “5 packs”. A check without a gauge and a sample is not yet a check.',
        doThis: 'Write the method as the operator does it, and the sample size. If the gauge has not been shown fit, say so — a gauge study comes before trusting the check.',
        youGet: 'The check made repeatable: two people reading the card do the same thing.',
      },
      {
        step: 'How often, who and where it is recorded',
        means: 'How often is the minutes between checks — or, for a check that follows an event, the event (“at every changeover”). Who is the person who does it. Recorded where is the sheet or log the result goes on.',
        doThis: 'Type the minutes between checks (not “regularly”), or the event. Name a role, not a hope. If a check log already holds this check, link it under “What it controls, and the check that does it” and the plan will read whether it is due.',
        youGet: 'A check that has an owner, a rhythm and a place — and the minutes a shift it costs, once you give the minutes one check takes.',
      },
      {
        step: 'If it is out — the reaction',
        means: 'What is done when the check fails: contain, correct, tell, and decide what happens to the product made since the last good check. This is the point of a control plan: a check with no reaction is data collection.',
        doThis: 'Write the reaction as steps an operator can follow without asking: stop or not, who to call, what to do with the packs since the last good check, how to restart. “Hold” needs saying how much.',
        youGet: 'A complete card. The card says “Complete” only when all six parts — against what, how, sample, how often, who, the reaction — are said.',
      },
      {
        step: 'What it controls, and the check that does it',
        means: 'The failure mode of the FMEA that this check holds back, and the check of a check log that does it. Pointing at them lets the plan say which risks have no check, and which checks are due, overdue or failed.',
        doThis: 'Pick the failure mode from the FMEA on the same line or project. Pick the check from the line’s check logs if there is one. Tick “A critical control point” if it belongs in the HACCP plan — this plan points to it, it does not replace it.',
        youGet: '“Risks without a check”, High first, with the FMEA they come from; and a red line when a linked check is overdue or failed, or when the plan and the log disagree about how often.',
      },
      {
        step: 'What the checks cost',
        means: 'Optional prices that let the page say the checks in money: the labour of checking a shift, and the most product a failed check can find. The interval is a trade between the two: a shorter one holds less product and costs more checks.',
        doThis: 'Open “What the checks cost” and give £ an hour, the minutes in a shift, the line’s speed and what a held pack is worth — each can be taken from the line in a tap. Leave any empty: the page names what it still lacks and nothing waits.',
        youGet: 'Checks a shift and their labour; the packs (and pounds) a failed check can find. No expected loss is stated — how often a drift happens is not known.',
      },
    ],
    watch: 'The page checks that the plan is complete, not that it is right: a limit, a frequency or a gauge nobody has validated looks the same as one that has been. A plan copied from another line checks that line’s risks.',
  },
};
