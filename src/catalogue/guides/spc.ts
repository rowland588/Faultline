/* GUIDES — statistical process control, capability and measurement (the discipline's tools; src/catalogue/guide.ts).
 * FC-094 and FC-118 are the two exemplars the other guides match: the page's own labels, in the order a person meets them,
 * each step said as what it means, what to do and what you get — and nothing the page does not do. */
import type { Guide } from '../guide';

export const SPC_GUIDES: Record<string, Guide> = {
  'FC-094': {
    intro: 'For a measurement a machine makes again and again — a fill weight, a seal temperature, a slice thickness — when you need to know whether it holds its limits all shift, not just on the one pack you checked.',
    steps: [
      {
        step: 'What are you measuring?',
        means: 'The thing you take readings of, and its unit — fill weight in grams, jaw temperature in °C. Naming it first tells the tool which sentences and which units to use.',
        doThis: 'Pick the kind that matches what the floor actually has: a measurement (a number on a scale or a probe), a count of rejects, faults found, a rate held, or pass or fail. Type its name and unit as the operator would say them.',
        youGet: 'A study named for what it measures, with the right boxes below — and the right words on the verdict and on the paper.',
      },
      {
        step: 'Which question?',
        means: 'The same readings can answer different questions: do they stay between two limits, at least a minimum, at most a maximum, or do items simply pass or fail. The question decides the arithmetic.',
        doThis: 'Tap the question that is in the specification or the customer’s requirement. A speed that must be at least 75 a minute has only a lower limit; oxygen in a pack that must be at most 2% has only an upper one.',
        youGet: 'Only the boxes that question needs — a one-sided question never asks for the limit it does not have.',
      },
      {
        step: 'Judged against',
        means: 'The limits, and how many readings you will take, agreed before the first one — so the verdict cannot be bent to suit the numbers afterwards.',
        doThis: 'Type the lower and upper limit from the specification (and the target if there is one), and how many readings you will take. Thirty is the usual number for a capability figure; fewer is allowed and said.',
        youGet: 'The agreed record the verdict is read against. A limit left empty on a question that needs it is refused in words.',
      },
      {
        step: 'The readings',
        means: 'The values in the order they were taken. Order matters: it is how the tool tells a steady process from one that is creeping.',
        doThis: 'Take the reading at the machine and tap it into the number pad, or paste the column from your log. A wrong one is struck, not deleted — it stays on the list, left out of the figures, and can be brought back.',
        youGet: 'The readings in order with a histogram, and the checks before capability: is it bell-shaped, is it steady, is it read finely enough. Under twenty readings the checks say they cannot be sure.',
      },
      {
        step: 'Ppk and the verdict',
        means: 'Ppk says how many times the real spread of the readings fits between the limits, counting how far off-centre it runs. 1.33 or more is capable; below 1 the process is making product outside the limits. The tool also says how sure the figure is, because thirty readings give a range, not a point.',
        doThis: 'Read the verdict sentence first, then the tiles: Ppk, Cpk, the share outside the limits and how sure the figure is. If the readings are not bell-shaped the share outside is counted as measured, not worked out from a curve.',
        youGet: 'A verdict in words — capable, not capable or not enough readings — the Ppk with its lower bound, the share outside, and an action plan with an owner and a day.',
      },
      {
        step: 'In money',
        means: 'What the finding costs: for a fill weight, the product given away above the target, said for a pack, a shift and a week from what the product costs you a kilo.',
        doThis: 'Give what the product costs a kilo, the packs a shift and the shifts a week. Every one is optional — leave any out and the page says which it is missing instead of inventing a figure.',
        youGet: 'The give-away in pounds, or the name of the one input still needed. Nothing waits on it: the verdict stands without it.',
      },
    ],
    watch: 'Agree the limits and the number of readings before you take any. A study whose limits were typed after the readings proves nothing — and the page will not let a verdict stand without them.',
  },
  'FC-118': {
    intro: 'For checking that a measuring method is good enough to trust before you judge a machine with it — do three people, measuring the same ten parts, get the same answer from the same scale?',
    steps: [
      {
        step: 'The parts',
        means: 'The things that are measured: ten parts that between them span the whole range the process makes, from the smallest to the largest you would see.',
        doThis: 'Pick ten real parts — ten packs, ten seals, ten slices — that are spread across the range, not ten that look alike. Code them 1 to 10 and type the codes, separated by commas.',
        youGet: 'The ten rows the readings will be filled in against. Parts that are all alike make the gauge look worse than it is, because there is nothing for it to tell apart.',
      },
      {
        step: 'The appraisers',
        means: 'The people who measure — the ones who will really use this gauge on the floor. The study separates what the gauge does on its own from what changes with who is using it.',
        doThis: 'Type the three operators’ names or initials, separated by commas. Use the people who do the job, not the most careful person in the building.',
        youGet: 'Three columns of readings, one for each person, so the tool can tell repeatability (one person, the same part, again) from reproducibility (one person against another).',
      },
      {
        step: 'Trials each',
        means: 'How many times each person measures each part. The parts are shuffled and the person does not see their last reading.',
        doThis: 'Choose 2 or 3. Three trials give a firmer answer; two is the usual minimum. Have each person measure all ten in a fresh random order for every trial.',
        youGet: 'The size of the grid — parts × appraisers × trials — and the number of readings still to enter.',
      },
      {
        step: 'Tolerance',
        means: 'The width of the specification: the upper limit less the lower limit. It lets the study also say how much of the tolerance the measuring method uses up, which matters when the part is judged against limits.',
        doThis: 'Type the lower and upper limit if you have them — it is optional. Leave it empty if you only want the share of the parts’ own variation.',
        youGet: 'A second figure, %GRR of tolerance, next to the first. Without limits the page still gives the first.',
      },
      {
        step: 'The readings',
        means: 'Every reading, filled against the part, the person and the trial it belongs to.',
        doThis: 'Paste the column from your sheet or type them in by cell. A reading entered twice for one part, person and trial keeps the last — said on the page.',
        youGet: 'A complete grid, or a list of the cells still empty. The figures appear once the grid is full.',
      },
      {
        step: '%GRR and ndc',
        means: '%GRR is how much of the total variation you see comes from the gauge and the people measuring, not from the parts. Under 10% is good, 10–30% is marginal, over 30% is not acceptable. ndc is the number of distinct groups the gauge can tell apart; five or more is wanted.',
        doThis: 'Read the verdict sentence, then which of repeatability or reproducibility leads. If the people differ, train them or fix the method; if one person differs from themselves, the gauge itself needs attention.',
        youGet: 'The verdict — acceptable, marginal or not acceptable — the %GRR, ndc, the split between repeatability and reproducibility, and the paper for the file.',
      },
    ],
    watch: 'A bad result is often the method, not the gauge: different positions on the pack, different pressure, a different reading point. Fix the way it is measured before you buy a new scale.',
  },
};
