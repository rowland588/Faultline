/* PLANNED MAINTENANCE — tasks due, compliance and backlog in crew-hours (FC-063; knowledge/specs/FC-063-planned-maintenance.md). */
import type { LogDef } from '../def';

const REACTION = 'Raise it on the register, book the task for the next stop or shutdown, and say why it slipped. Do not let it roll another interval without a decision.';

const TASK = {
  kind: 'passfail' as const,
  reaction: REACTION,
  priority: 'high' as const,
  holds: false,
  stdHours: 2.5,
};

export const def: LogDef = {
  key: 'planned-maintenance',
  fc: 'FC-063',
  title: 'Planned maintenance',
  noun: 'PM task',
  says: 'Fitter tasks on a schedule — due, done on time, missed, and the backlog in crew-hours',
  group: 'Maintenance',
  standard: {
    rests: 'TPM planned maintenance and EN 15341-style KPIs: each machine has tasks with an interval, a window and standard hours; compliance is done in the window ÷ due; backlog is overdue tasks summed in those hours (knowledge/methods/maintenance/planned-maintenance.md).',
    confirm: [
      'EN 15341:2019 indicator definitions — exact wording not confirmed against the text',
      'Each task’s interval and its reason (Weibull age, OEM, legal)',
      'Reactive hours for the planned share (FC-067) — not typed here',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    { name: 'Wrapper — monthly inspection', where: '', when: { every: 4, unit: 'week' }, criterion: 'Inspection sheet complete', ...TASK },
    { name: 'Filler — quarterly gearbox oil', where: '', when: { every: 12, unit: 'week' }, criterion: 'Oil changed to spec', ...TASK, stdHours: 4 },
    { name: 'Checkweigher — weekly reference check', where: '', when: { every: 1, unit: 'week' }, criterion: 'Reference within tolerance', ...TASK, stdHours: 1 },
  ],
  reactionWords: REACTION,
  whereLabel: 'Machine',
  holds: false,
  priority: 'high',
  limits: [
    'Planned share of all maintenance hours is not typed here (FC-067).',
    'Parts cost and breakdown cost are not in money on this page.',
    'Criticality (FC-064) does not set intervals automatically.',
    'Operator care checks (FC-062) and hygiene cleans are other logs.',
  ],
  examples: [{
    name: 'Four weekly tasks — three on time, one overdue with backlog',
    checks: [0],
    nowMin: 22 * 1440,
    set: { 0: { stdHours: 2.5, when: { every: 1, unit: 'week' } } },
    results: [
      { check: 0, min: 0, outcome: 'pass' },
      { check: 0, min: 7 * 1440, outcome: 'pass' },
      { check: 0, min: 14 * 1440, outcome: 'pass' },
    ],
    expect: { expected: 3, onTime: 3, missed: 0, pct: 100 },
  }],
};
