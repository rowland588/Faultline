import { uid } from '../../../lib/ids';
import { cplanAnalyse, cplanStart } from '../../cplan/cplan';
import type { ScoredDef } from '../types';

/* FC-133 — the control plan: a card a characteristic — what is checked, against what, how, how often, by whom, recorded where, and what is done when it is out.
   A row points at the FMEA failure mode it controls and at the check of a check log that does it; the plan says which risks have no check and which checks are owed.
   Specification: knowledge/specs/FC-133-control-plan.md. Arithmetic and words: src/tools/cplan/cplan.ts. */
const def: ScoredDef = {
  key: 'control-plan',
  fc: 'FC-133',
  title: 'Control plan',
  says: 'What is checked on the line, against what, how, how often, by whom — and what is done when it is out',
  group: 'Risk and control',
  question: 'Is every risk that matters held by a check — and does every check have an owner and a reaction?',
  scales: [],
  limits: [
    'The plan is what the team wrote: it checks that each row says the six parts (against what, how, the sample, how often, who, the reaction) and that the risks of the FMEA beside it have a row — it does not judge whether a limit or a frequency is right.',
    'The interval is shown with its two sides — the checks’ labour and the product at risk between checks — from the numbers typed; the chance of a drift is not guessed, so no expected loss is stated.',
    'A check log row is read for due, overdue and failed, but a result entered in the log does not yet draw the characteristic’s chart, and a failed check does not yet open the reaction on the plan (the log raises its own problem).',
    'Critical control points belong to the HACCP plan (not built, FC-168): tick the row to point at it; the plan does not specify, validate or verify a CCP.',
  ],
  noun: 'characteristic',
  register: {
    analyse: ({ rows, ctx }) => cplanAnalyse({ rows, ctx }),
    start: () => cplanStart(uid),
    asks: { name: 'What process or line step does this plan cover?', placeholder: 'e.g. Line 2 wrapper — control plan', empty: 'No control plan yet — list what is checked on the line, against what, how often, by whom, and what is done when it is out.', noun: 'characteristic', newLabel: 'New control plan' },
  },
  examples: [{
    name: 'Line 2 wrapper — four characteristics, one with no reaction',
    rate: 25,
    rows: [
      { id: 'c1', name: 'Seal strength', plan: { step: 'Sealing', kind: 'product', spec: '≥ 8 N per 15 mm', method: 'Pull test, calibrated force gauge', sample: '1 pack per head', everyMin: 30, minutes: 5, owner: 'Technician', record: 'Seal log', reaction: 'Stop the line; hold the packs since the last good check; re-set the jaw temperature and re-test' } },
      { id: 'c2', name: 'Net weight', plan: { step: 'Filling', kind: 'product', spec: '≥ 100 g (no pack below)', method: 'Off-line scale, checked against the line checkweigher', sample: '5 packs', everyMin: 60, minutes: 4, owner: 'Operator', record: 'Weight sheet' } },
      { id: 'c3', name: 'Metal detector test pieces', plan: { step: 'Metal detection', kind: 'process', spec: 'Fe 1.5 mm · non-Fe 2.0 mm · stainless 2.5 mm all rejected', method: 'Test pieces through the belt, reject confirmed', sample: '3 pieces', everyMin: 60, minutes: 3, owner: 'QA technician', record: 'Metal detection log', reaction: 'Hold everything since the last pass; stop and call maintenance; re-test before restart', haccp: true } },
      { id: 'c4', name: 'Date code', plan: { step: 'Coding', kind: 'product', spec: 'Matches the work order', method: 'Visual against the work order', sample: 'First pack', event: 'at every changeover', owner: 'Operator', record: 'Changeover sheet', reaction: 'Stop; re-code; hold what was coded wrong' } },
    ],
    expect: { counts: { complete: 3, open: 1 }, order: ['Seal strength', 'Net weight', 'Metal detector test pieces', 'Date code'], verdict: '1 gap' },
  }],
};

export default def;
