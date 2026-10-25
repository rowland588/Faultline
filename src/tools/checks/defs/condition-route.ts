/* CONDITION CHECKS BY A PERSON — TEMPERATURES, WEAR, NOISE ON A ROUTE (FC-234; knowledge/specs/FC-062-cilt-checks.md).
 *
 * The value variant of the operators' round: a reading taken by a person with an IR thermometer, a wear gauge or
 * by ear, against a limit, point by point, and trended — the warning signs failures give, recorded, and the points
 * nearing their limit seen before they pass it (knowledge/methods/maintenance/autonomous-maintenance.md). No sensor
 * is read: every number is typed. The limits come from the machine's maker and the fitter. The starter list sets
 * NONE — a reading with no limit is recorded and trended, and said not to be judged yet. */
import type { LogDef } from '../def';

const REACTION = 'Tell the fitter. Do not wait for the limit if the reading is climbing — a reading nearing its limit is a reason to look today.';
const POINT = { where: '', when: { every: 1, unit: 'day' } as const, kind: 'value' as const, reaction: REACTION, priority: 'high' as const, holds: false };

export const def: LogDef = {
  key: 'condition-route',
  fc: 'FC-234',
  title: 'Condition checks on a route',
  noun: 'condition reading',
  says: 'Temperatures, wear and noise read by a person along a route, each against its limit and trended by point',
  group: 'Maintenance',
  standard: {
    rests: 'Route-based condition monitoring by a person — an IR thermometer on motors and bearings, a wear gauge on belts, listening for noise — is part of operator care in TPM (Nakajima, Suzuki). Each limit comes from the machine maker’s data and the fitter; the starter list below sets none, and says so.',
    confirm: [
      'Every limit: from the machine maker’s instructions or the fitter — none is given here',
      'The texts behind the TPM record were not re-read for this build (the record says so)',
    ],
  },
  kinds: ['value', 'passfail'],
  starterChecks: [
    { name: 'Motor temperature', ...POINT, unit: '°C' },
    { name: 'Bearing temperature', ...POINT, unit: '°C' },
    { name: 'Gearbox temperature', ...POINT, unit: '°C' },
    { name: 'Belt wear', ...POINT, when: { every: 1, unit: 'week' }, unit: 'mm' },
    { name: 'Noise — normal for this machine?', ...POINT, kind: 'passfail', criterion: 'Sounds as it always does', when: { every: 1, unit: 'day' } },
  ],
  reactionWords: REACTION,
  whereLabel: 'Point on the route',
  holds: false,
  priority: 'high',
  limits: [
    'No limit is given: set each from the machine maker’s data before the first round, or the reading is recorded and trended but not judged.',
    'A reading nearing its limit is within 15% of the band between the limits; a trend is said from eight readings (Mann–Kendall, Sen’s slope) and is a reason to look, not a prediction of a date.',
    'Every number is read by a person and typed; nothing is read from a sensor.',
    'It does not plan the fitters’ work (planned maintenance, FC-063) or rank machines (FC-064).',
  ],
  examples: [{
    /* the record's trend case: eight daily readings of a motor, limits 40–75 °C, the latest 70 — 14% of the band from the upper limit, rising */
    name: 'A motor temperature rising toward its upper limit',
    checks: [0], nowMin: 7 * 1440 + 60, set: { 0: { lo: 40, hi: 75 } },
    results: [61, 62, 62, 64, 65, 67, 68, 70].map((value, i) => ({ check: 0, min: i * 1440, outcome: 'value' as const, value })),
    expect: { nearing: 'hi', headroomPct: 14.29, going: 'up', expected: 8, onTime: 8, missed: 0, pct: 100 },
  }],
};
