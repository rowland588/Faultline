import { rankCriticality } from '../../../lib/ie/criticality';
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
  rank: rankCriticality,
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
