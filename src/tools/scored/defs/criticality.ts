import { rankCriticality, type RankedRow } from '../../../lib/ie/criticality';
import type { ScoredDef } from '../types';

const def: ScoredDef = {
  key: 'criticality',
  fc: 'FC-064',
  title: 'Equipment criticality',
  says: 'Rank machines A, B or C from consequence and likelihood — CCP and standby overrides as the method says',
  group: 'Maintenance',
  question: 'Which machines must never fail, and which can run to failure?',
  scales: [
    { id: 'production', label: 'Production' },
    { id: 'safety', label: 'Safety' },
    { id: 'quality', label: 'Quality' },
    { id: 'repair', label: 'Repair' },
    { id: 'likelihood', label: 'Likelihood' },
  ],
  limits: [
    'Likelihood is typed — not read from reliability or the loss count yet.',
    'Does not set spares service level on FC-066 automatically.',
    'RCM (FC-065) and PM tasks (FC-063) are separate records.',
  ],
  rank: rows => rankCriticality(rows),
  noun: 'machine',
  help: 'Consequence is the highest of the four dimensions you fill (1–5). Likelihood 1–5. Tick CCP for a food-safety override to class A.',
  fields: [
    { id: 'production', label: 'Production', kind: 'score' }, { id: 'safety', label: 'Safety', kind: 'score' }, { id: 'quality', label: 'Quality', kind: 'score' },
    { id: 'repair', label: 'Repair', kind: 'score' }, { id: 'likelihood', label: 'Likelihood', kind: 'score' },
    { id: 'ccp', label: 'CCP', kind: 'tick' }, { id: 'standby', label: 'Standby', kind: 'tick' },
  ],
  columns: [
    { label: 'Score', of: r => String(r.score) },
    { label: 'Class', of: r => (r as RankedRow).class, tone: r => (r.class === 'A' ? 'r' : r.class === 'B' ? 'a' : 'n') },
  ],
  examples: [{
    name: 'Line 2 — five assets from the knowledge record',
    rows: [
      { id: '1', name: 'Wrapper jaws', production: 5, safety: 3, quality: 3, repair: 4, likelihood: 4 },
      { id: '2', name: 'Checkweigher', production: 5, safety: 5, quality: 5, repair: 3, likelihood: 2, ccp: true },
      { id: '3', name: 'Conveyor 3', production: 2, safety: 1, quality: 1, repair: 2, likelihood: 4 },
      { id: '4', name: 'Label printer', production: 3, safety: 1, quality: 3, repair: 2, likelihood: 3 },
      { id: '5', name: 'Spare pump', production: 1, safety: 1, quality: 1, repair: 1, likelihood: 2, standby: true },
    ],
    expect: { classA: 2, classB: 2, classC: 1 },
  }],
};

export default def;
