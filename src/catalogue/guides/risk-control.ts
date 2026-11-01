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
  'FC-135': {
    intro: 'For product that may not be right — a failed seal check, a wrong date code, a missed metal-detector test piece. Record what is held, who may release it and by when, then what became of it and what it cost, so no hold sits unowned while its shelf life runs out.',
    steps: [
      {
        step: 'New holds register',
        means: 'A register for one line or area, kept as a card for each hold. A hold is product held back — labelled and segregated — until someone with the authority decides what becomes of it.',
        doThis: 'Press New holds register, name it for the line and the month (“Line 2 — holds, November”) and pick the line. Add a card for each hold with “+ Add a hold” as it is raised, at the line, not afterwards.',
        youGet: 'A register with one blank card, today as the raised day.',
      },
      {
        step: 'What is held, how many and where',
        means: 'The product and the reason in a line (“Maris 500 g — failed seal check”), the packs, the lot, the label number and where it sits. Held product must be physically segregated or locked in the system with its label: the record alone holds nothing.',
        doThis: 'Name what is held, type the packs, the lot and the hold label number, say where it is and tick that it is segregated and labelled. If you cannot tick it, go and do that first.',
        youGet: 'A card that identifies the hold the way an auditor or a customer will ask for it, and says “not segregated” until it is.',
      },
      {
        step: 'Why, the cause and who raised it',
        means: 'Why it is held is the check, the complaint or the deviation. The cause is the heading the Pareto counts under (Seal, Weight, Code or label, Metal detection…). The same cause held three times is a repeating cause.',
        doThis: 'Write the failed check in a line, pick or type a cause the same way each time, and the day and the person who raised it.',
        youGet: '“Holds by cause”, ranked — and a note when one cause has held product three times: an 8D is worth opening.',
      },
      {
        step: 'Who may release it, and by when',
        means: 'The authority is the person allowed to decide — quality, not production under pressure. The decision day is when it is due. A hold with no decision day is a slow destroy: the shelf life runs out while nobody decides.',
        doThis: 'Name the authority and set the day the decision is due. Add the product’s total shelf life if you know it, so the page can say how much has gone while held.',
        youGet: 'Days held, a red line when the decision is past its day, and the share of shelf life used.',
      },
      {
        step: 'The decision',
        means: 'What became of it: released (shown to conform), released under concession (the customer accepted in writing), reworked, regraded or destroyed. Each is recorded with who decided, when and on what grounds. Rework must be re-inspected: “reworked” with no record is a release.',
        doThis: 'Pick what became of it. Name who decided, the day, the grounds (the re-test, the customer’s email) and the corrective action reference. Give the hours, the materials added, the price lost a pack or the disposal cost that fate asks for.',
        youGet: 'The hold closed with its fate, and what it lost where the inputs were given.',
      },
      {
        step: 'What a hold costs',
        means: 'Two different sums, never added. Tied up is the packs times what a pack has cost to this point while the hold is open — money held, not lost unless the product is. Lost is what a decided hold cost by its fate: the review’s hours, the price lost, the labour again, or the materials, labour and margin not earned.',
        doThis: 'Open “What a hold costs” and give what a pack has cost to this point (materials and labour), the margin a pack, £ an hour and, if you carry stock at a rate, the percentage a year. Leave any empty: the page names what it still lacks.',
        youGet: 'Tied up and lost, in pounds, each in its own tile; the carrying cost; and the name of the one input still needed, never an invented figure.',
      },
    ],
    watch: 'Product “on hold” that is not segregated is released by accident. The tied-up money is not a loss and must not be added to the losses; only a decided hold says what was lost.',
  },
  'FC-152': {
    intro: 'For a serious event that must not happen — metal reaching a consumer, an under-cooked product leaving the line — when you need every combination of failures that could cause it, and which barrier is doing the most work. Not for a chronic problem: use the fishbone and the 5 Whys for that.',
    steps: [
      {
        step: 'The top event',
        means: 'The one event the tree explains, stated exactly: what, where, how much (“Metal reaches a consumer in a pack”). Everything below it is a cause, worked downward.',
        doThis: 'Press New fault tree and write the top event as the name. Make it specific enough that you could tell whether it happened.',
        youGet: 'A tree with its top event, ready for causes.',
      },
      {
        step: 'Gates: AND and OR',
        means: 'An OR gate means any one of the causes below it is enough. An AND gate means all of them must happen together — a hazard present and every defence failing. The gates are how the protections are arranged.',
        doThis: 'Under the top event press “+ Add a cause under this” for each immediate cause. Where a cause is itself made of causes, add causes under it; pick AND or OR for the group. Ask “would one of these be enough, or must all happen?”',
        youGet: 'An outline of the logic, indented one step for each level, each row saying whether it is a gate or a basic event.',
      },
      {
        step: 'Basic events and their probabilities',
        means: 'A basic event is a cause with nothing below it that you can know or act on (“Screen mesh breaks”). Its probability is the chance it happens in the period — the same period for every event (a year, a shift, a demand).',
        doThis: 'Give each basic event a probability between 0 and 1, from your records (a failure count over the period) or a judgement marked as such. Say the period at the top under “The period and what the top event costs”.',
        youGet: 'The probabilities in words as you type them (0.02 reads 2%). Without them the cut sets still stand; the probability waits.',
      },
      {
        step: 'A cause under two gates',
        means: 'If one cause appears in two branches — one maintenance error that lets metal in and also disables the detector — it is one event, not two. Counting it twice makes the answer wrong.',
        doThis: 'On the second occurrence pick “Or the same cause as” and choose the first. It then takes the first’s probability.',
        youGet: 'A shared cause counted once, and its importance rising because it sits in more cut sets.',
      },
      {
        step: 'The cut sets and the single points',
        means: 'A minimal cut set is the smallest group of basic events that, all happening, cause the top event. A cut set of one is a single point: that event alone does it.',
        doThis: 'Read the sentence first: how many cut sets, the fewest events that can cause it, and any single point. Then the table, the likeliest first. Look hardest at the single points and the pairs.',
        youGet: 'Every way the top event can happen, ranked by probability — and the single points in amber, a place to look first, not necessarily a failure.',
      },
      {
        step: 'The probability and which events matter',
        means: 'The probability of the top event, exact for independent events, beside the two usual approximations. Each event’s importance says what share of the risk runs through it, and what making it certain would do to the top.',
        doThis: 'Read “Which events matter most”. The event with the greatest share is where a control buys most. Optionally give what one occurrence of the top event costs to see the expected cost beside the probability.',
        youGet: 'The top event’s probability for the period; the weakest link; an expected cost if the cost was given.',
      },
    ],
    watch: 'The tree explains only the causes the team listed, and its probability is only as good as the probabilities typed in. A judgement made up to fill a box makes the answer look like a measurement and have none of its worth.',
  },
  'FC-112': {
    intro: 'For when a factorial has shown which two or three settings matter and you now want their best values — filler speed and temperature for give-away, seal temperature and dwell for seal strength. It fits a curved surface to a designed set of runs; it does not guess outside them.',
    steps: [
      {
        step: 'The factors and what is wanted',
        means: 'The factors are the two or three settings you will vary, each with the low and high you are willing to run — those become −1 and +1. What is wanted says whether the best is the smallest response (give-away) or the largest (seal strength).',
        doThis: 'Press New optimisation, name it, then give each factor a name, a unit, a low and a high. Keep the box where you would actually run the line; the best setting will only be quoted inside it. Name the response and its unit and say which way is better.',
        youGet: 'A setup that says how many runs it needs, or what is still missing.',
      },
      {
        step: 'The design',
        means: 'The pattern of runs. Central composite, face-centred, runs the corners, the middle of each face and the centre — never outside your box. Rotatable adds points beyond the corners so the answer is as sure in every direction. Box–Behnken runs the middle of each edge for three factors, with no corner.',
        doThis: 'For a first look use face-centred. Give five runs at the centre: they are real repeats, and they are what lets the page test whether a curve is the right shape.',
        youGet: 'The run count — 13 for two factors, 19 for three — and the reason for each kind of run.',
      },
      {
        step: 'The run sheet',
        means: 'The runs to make, in an order shuffled from a seed so that a machine warming up or a reel changing does not look like one of the factors. Each run is shown in your own units.',
        doThis: 'Press “Make the run sheet”, then make the runs in the order shown, holding everything else as it is. Do not tidy the order. Making the sheet again throws the runs away; Undo brings them back.',
        youGet: 'A card for each run with its settings and a box for the result.',
      },
      {
        step: 'The responses',
        means: 'What each run gave — the grams given away, the newtons the seal held. Typed as the run is made, not afterwards.',
        doThis: 'Type each result in its box. The page fits as soon as there are more runs with a result than terms (seven for two factors) and says how many it still wants.',
        youGet: 'The surface fitted, with R² (how much of the spread it explains), adjusted R², and predicted R² — the one that shows a model that fits its runs and predicts nothing.',
      },
      {
        step: 'Lack of fit and the shape',
        means: 'The centre runs repeated the same setting, so their spread is pure error. Lack of fit asks whether what is left over is more than that. A significant one means a cubic term, a transform or a run that went wrong — never “good model”.',
        doThis: 'Read the sentence’s lack-of-fit line first. If it is red, do not trust the best setting: look at the runs for one that went wrong before fitting anything more complicated.',
        youGet: '“No sign the quadratic is wrong” — or a red verdict, Does not fit.',
      },
      {
        step: 'The best setting',
        means: 'The stationary point is where the surface is flat — the top, the bottom or a saddle. It is quoted only if it is the kind you want and lies inside what you ran. Outside, the curve is a formula with no physics behind it, so the page gives the best on the edge of what was run and tells you to move the box and run again.',
        doThis: 'Read the setting in your units and its distance from the centre against how far you ran. If it says Beyond the runs, take the edge setting as the new centre and run a smaller design there.',
        youGet: 'The best setting, its predicted result, the interval for the average and for a single run — or the edge of the region and what to do next.',
      },
      {
        step: 'The confirmation run',
        means: 'One run at the chosen setting made after the design. The surface is a prediction until a run agrees with it: inside the prediction interval the model holds there; outside, it does not.',
        doThis: 'Set the line to the best setting, make one run, and type the result in the confirmation box.',
        youGet: 'Confirmed in green, or Not confirmed in red with “do not adopt the setting”.',
      },
    ],
    watch: 'A best setting beyond the runs is a guess. A drifting machine looks like a factor if the order is tidied. And a surface that fits its own runs but has a low predicted R² has learned the runs, not the process.',
  },
};
