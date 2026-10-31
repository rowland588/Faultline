import { uid } from '../../../lib/ids';
import { DATUM_DEFAULT, pugh, pughTable, summarizePugh } from '../../pugh/pugh';
import type { ScoredDef } from '../types';

/* FC-143 — the Pugh matrix: options marked better, same or worse than a datum on criteria agreed first.
   Specification: knowledge/specs/FC-143-pugh-matrix.md. Arithmetic and words: src/tools/pugh/pugh.ts. */
const def: ScoredDef = {
  key: 'pugh',
  fc: 'FC-143',
  title: 'Pugh matrix',
  says: 'Choose between solutions — each option marked better, same or worse than the datum on the criteria you agreed first',
  group: 'Choosing solutions',
  question: 'Which option scores best against what matters — and where is the lead thin?',
  scales: [],
  limits: [
    'An option’s cost is typed and shown beside the score, never in it; payback and NPV of a capital option are the Payback and NPV calculator’s (FC-191) — the two are not joined.',
    'Rounds of convergence are not kept as a history: edit the matrix and read it again.',
  ],
  matrix: {
    datumDefault: DATUM_DEFAULT,
    analyse: a => {
      const input = { datum: a.datum, criteria: a.criteria, options: a.rows };
      const out = pugh(input);
      if (!('ok' in out)) return { problems: out.problems };
      return { result: summarizePugh(out.ok), table: pughTable(input, out.ok), leaders: out.ok.leaders };
    },
    start: () => ({
      datum: DATUM_DEFAULT,
      criteria: [0, 1, 2].map(() => ({ id: uid(), name: '' })),
      rows: [0, 1].map(() => ({ id: uid(), name: '', scores: {} })),
    }),
    asks: {
      name: 'What are you choosing?',
      placeholder: 'e.g. Film breaks on Line 2 — which fix first',
      empty: 'No Pugh matrix yet — name the options and the criteria that matter, then mark each option against the datum.',
    },
  },
  examples: [{
    name: 'Four countermeasures for film breaks — the knowledge record’s worked case',
    datum: DATUM_DEFAULT,
    criteria: [
      { id: 'breaks', name: 'Cuts breaks', weight: 5 },
      { id: 'cost', name: 'Cost', weight: 3 },
      { id: 'time', name: 'Time to do', weight: 3 },
      { id: 'safety', name: 'Safety', weight: 4 },
      { id: 'hygiene', name: 'Hygiene', weight: 4 },
    ],
    rows: [
      { id: 'o1', name: 'Film guide', scores: { breaks: 1, cost: 1, time: 1, safety: 0, hygiene: 0 } },
      { id: 'o2', name: 'Reel trolley', scores: { breaks: 1, cost: 0, time: 0, safety: 1, hygiene: 0 } },
      { id: 'o3', name: 'New unwind unit', scores: { breaks: 1, cost: -1, time: -1, safety: 0, hygiene: 0 } },
      { id: 'o4', name: 'Second operator', scores: { breaks: 0, cost: -1, time: 1, safety: 0, hygiene: 0 } },
    ],
    /* scripts/knowledge/cases-pugh.py case 1 */
    expect: { leader: 'Film guide', scores: { 'Film guide': 11, 'Reel trolley': 9, 'New unwind unit': -1, 'Second operator': 0 }, verdict: 'Film guide leads' },
  }],
};

export default def;
