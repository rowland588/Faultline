import { uid } from '../../../lib/ids';
import { START, TARGET_DEFAULT, analyseSkills } from '../../skills/skills';
import type { ScoredDef } from '../types';

/* FC-222 — the skills matrix and cover: who can do what at which level, and where one absence stops a line.
   Specification: knowledge/specs/FC-222-skills-matrix.md. Arithmetic and words: src/tools/skills/skills.ts. */
const def: ScoredDef = {
  key: 'skills',
  fc: 'FC-222',
  title: 'Skills matrix and cover',
  says: 'Who can run what, at what level — and where one absence stops a line, shift by shift',
  group: 'People and skills',
  question: 'Who can run what, at what level — and where is one absence a stopped line?',
  scales: [],
  limits: [
    'The date each level was reached and who signed it are not kept; the matrix is as good as the last time someone read it.',
    'Cover is counted as people at the standard (U) or above on a shift; absence, leave and training are not modelled — the crew plan (FC-184) is not built.',
    'A single point is priced as a shift of the line not making, from what is typed or the line’s own figures; the absence rate is not held, so no yearly cost is guessed.',
    'The training plan is the list of gaps in order; it does not become actions on the project by itself.',
  ],
  matrix: {
    editor: 'skills',
    section: 'Mark what each person can do',
    datumDefault: '',
    target: { label: 'Cover wanted on each task, each shift (people at U or O) — a starting point, not a rule', default: TARGET_DEFAULT },
    dayCost: { label: 'What a shift of the line not making costs, £ (optional)', unit: 'shift' },
    analyse: a => analyseSkills(a),
    start: () => ({
      datum: '',
      criteria: [0, 1, 2].map(() => ({ id: uid(), name: '' })),
      rows: [0, 1, 2].map(() => ({ id: uid(), name: '', scores: {} })),
    }),
    asks: { name: START.name, placeholder: START.placeholder, empty: START.empty },
  },
  examples: [{
    name: 'Three tasks on days and nights — the knowledge record’s worked case (target 3)',
    /* scripts/knowledge/cases-projects-people-ergo-sust.py "Skills matrix": wrapper days [4,3,3,1] nights [3,1,0]; labeller days [4,3] nights [3]; CCP days [3,3,4,3] nights [3,3,1] */
    criteria: [
      { id: 'wrap', name: 'Wrapper set-up' },
      { id: 'label', name: 'Labeller set-up' },
      { id: 'ccp', name: 'CCP cook check' },
    ],
    rows: [
      { id: 'amy', name: 'Amy', shift: 'Days', scores: { wrap: 4, label: 4, ccp: 3 } },
      { id: 'ben', name: 'Ben', shift: 'Days', scores: { wrap: 3, label: 3, ccp: 3 } },
      { id: 'cal', name: 'Cal', shift: 'Days', scores: { wrap: 3, ccp: 4 } },
      { id: 'dee', name: 'Dee', shift: 'Days', scores: { wrap: 1, ccp: 3 } },
      { id: 'eli', name: 'Eli', shift: 'Nights', scores: { wrap: 3, label: 3, ccp: 3 } },
      { id: 'fay', name: 'Fay', shift: 'Nights', scores: { wrap: 1, ccp: 3 } },
      { id: 'gus', name: 'Gus', shift: 'Nights', scores: { ccp: 1 } },
    ],
    expect: {
      counts: { singles: 2, nobody: 0, atTarget: 2, cells: 6 },
      tiles: { 'Single points': '2', 'Nobody': '0', 'At the cover wanted': '2 of 6', 'Can teach it': '3 of 3' },
      verdict: '2 single points of cover',
    },
  }],
};

export default def;
