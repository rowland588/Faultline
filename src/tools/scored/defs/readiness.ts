import { uid } from '../../../lib/ids';
import { CHECKLIST, START, STARTER, analyseReadiness } from '../../readiness/readiness';
import type { ScoredDef } from '../types';
import type { ScoredRow } from '../../../lib/study';

/* FC-082 — operational readiness: everything the line needs before production takes it, each item with an owner, a day and its evidence.
   Specification: knowledge/specs/FC-082-operational-readiness.md. Arithmetic and words: src/tools/readiness/readiness.ts. */

/** The knowledge record's worked case, built as rows: 72 items in six areas — 56 ready, 16 open, 3 past their day, and the HACCP validation and the cleaning validation
 *  the two that stop day one (scripts/knowledge/cases-operations.py, the readiness block). Days far enough either side of any "today" that lateness does not drift. */
const PAST = '2020-01-01', FUTURE = '2099-12-31';
function worked(): ScoredRow[] {
  const areas: [string, number, number][] = [
    ['People trained and signed off', 18, 14], ['SOPs and standards issued', 11, 9], ['HACCP plan amended and validated', 4, 3],
    ['Spares on the shelf', 30, 22], ['PM schedule loaded', 6, 6], ['Cleaning validated', 3, 2],
  ];
  let late = 3;
  return areas.flatMap(([area, n, ready], a) => Array.from({ length: n }, (_, i): ScoredRow => {
    const isReady = i < ready;
    const stopper = !isReady && (area === 'HACCP plan amended and validated' || area === 'Cleaning validated');
    const name = stopper ? (area === 'Cleaning validated' ? 'Cleaning validation' : 'HACCP validation') : `${area.split(' ')[0]} ${a + 1}.${i + 1}`;
    const isLate = !isReady && !stopper && late-- > 0;
    return { id: `w${a}-${i}`, name, group: area, status: isReady ? 'ready' : 'open', owner: 'Site team', due: isReady || isLate ? PAST : FUTURE, ...(isReady ? { note: 'Record filed' } : {}), ...(stopper ? { stopper: true } : {}) };
  }));
}

const def: ScoredDef = {
  key: 'readiness',
  fc: 'FC-082',
  title: 'Operational readiness',
  says: 'Is production ready to take this line — people, standards, food safety, spares and maintenance, item by item with an owner and a day',
  group: 'Stage gate',
  question: 'Is production ready to take this line — and what is missing, and whose is it?',
  scales: [],
  limits: [
    'It counts what the team says is ready; it validates nothing — the HACCP amendment and the cleaning validation have their own evidence and this list only says where it is.',
    'The starter list is for a new line and is a starting point, not the standard; a rebuilt machine’s list is shorter — mark what does not apply “Not needed here”.',
    'The people item is a tick here; who is signed off on which station is the skills matrix (FC-222), which is not joined to it.',
    'An open item is not turned into an action on the project by itself, and the project’s front page and the commissioning report do not yet carry the count.',
  ],
  matrix: {
    editor: 'checklist',
    section: 'What must be ready before production takes the line',
    datumDefault: '',
    checklist: CHECKLIST,
    dayCost: { label: 'What a day of the line not making costs, £ (optional)', unit: 'day' },
    analyse: a => analyseReadiness(a),
    start: () => ({ datum: '', criteria: [], rows: STARTER.map(r => ({ ...r, id: uid() })) }),
    asks: { name: START.name, placeholder: START.placeholder, empty: START.empty },
  },
  examples: [{
    name: '72 items in six areas — the knowledge record’s worked case',
    criteria: [],
    rows: worked(),
    expect: {
      counts: { total: 72, ready: 56, open: 16, late: 3, stoppers: 2, areas: 6 },
      tiles: { Ready: '56 of 72', Open: '16', 'Past their day': '3', 'Would stop day one': '2' },
      verdict: '16 open, 3 late',
    },
  }],
};

export default def;
