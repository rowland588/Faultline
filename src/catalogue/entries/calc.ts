/* THE CATALOGUE — the calculators' hub (knowledge/specs/FC-235-calculators.md). One entry for the SHAPE: the page that lists every
 * calculator and the saved sums, the record, the form, the what-if, the saved before, the paper and the line report. Each calculator
 * is its own entry elsewhere (FC-009, FC-183, FC-131, FC-044 …), opening at /calc/<key> with no face of its own. */
import type { Entry } from '../types';
import { CALC_CODE, CALC_TESTS } from './calcBuilt';

export const CALC: Entry[] = [
  {
    id: 'FC-235', name: 'Calculators — a sum for one situation, saved with its sentence, its money and its paper', discipline: 'lean', sub: 'flow',
    problem: 'A sum is done once on a phone or a spreadsheet and nobody can see what went into it, what it meant, what it was worth or whether the next one is better.',
    questions: ['What does this sum say for this line, in a sentence?', 'What happens if one figure changes?', 'Did the change we made move it?'],
    method: 'A saved set of inputs for one situation (a line, a project, a product or nothing); a definition’s own formula turns them into a sentence, tiles, the working, the caveats, the money and — where it earns one — a picture, worked out on every render; a what-if moves one figure; the figures saved as a before read the next as before → after.',
    inputs: 'The calculator’s own figures, each with its unit and where to find it; some offered from the line’s cost model; money figures optional.',
    outputs: 'The answer in words and tiles with what moved since the saved before, the working, what it does not say, the money or the sentence saying what to add, a paper, and a row in the line report.',
    food: 'Kanbans for film and trays, a reorder point for packaging, what a goods-in sampling plan protects, how long product waits in a chiller.',
    depends: ['FC-009', 'FC-183', 'FC-131', 'FC-044'],
    complexity: 'M', value: 'high', valueWhy: 'Thirty small sums share one proved record, page and paper; each new one is a definition, not a screen.',
    status: 'available', form: 'tool', kind: 'study',
    methods: ['lean.kanban-supermarket', 'planning.safety-stock', 'quality.acceptance-sampling-attributes', 'capacity.littles-law'],
    scenarios: ['planning', 'quality', 'money', 'running'], words: ['calculator', 'sum', 'what if', 'sizing', 'formula'],
    app: { key: 'calc', label: 'Calculators', says: 'Sums for one situation — kanbans, safety stock, a sampling plan, lead time — saved with their sentence, their money and a paper', onLine: 'sums saved for this line, each with what it says', reads: 'calc', icon: 'hash', order: 4.7 },
    built: { where: ['/calc'], code: CALC_CODE, tests: CALC_TESTS, acceptance: ['calc-shape.mjs'] },
    spec: 'knowledge/specs/FC-235-calculators.md',
    limits: ['It lists only the calculators built so far; each is proved on its own (its entry, its definition, its independent cases) and the rest of the catalogue’s sums are added the same way.', 'A saved before is one copy of the figures: a second change reads against it until a new one is saved. Two saved calculations of one calculator are not compared with each other.', 'Results are always worked out again from the figures and the definition as it is now — a calculator improved later changes what an old saved calculation says, never its figures.'],
  },
];
