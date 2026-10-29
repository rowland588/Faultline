/* AUTONOMOUS MAINTENANCE — CILT CHECKS AND ABNORMALITY TAGS (FC-062; knowledge/specs/FC-062-cilt-checks.md).
 *
 * The people who run a machine all day see its abnormalities first, if they are looking and have a way to say so
 * (knowledge/methods/maintenance/autonomous-maintenance.md): a short written check — clean, inspect, lubricate,
 * tighten — done on the phone with a tap, and a tag for every abnormality found. A tag is a problem on the register
 * with the machine, the place and a colour (red needs the fitter, white the operator fixes); its age and whether
 * the same place is tagged again are read from there. It is the operators' check; the hygiene clean, and the
 * fitters' planned maintenance (FC-063), are other logs. */
import type { LogDef } from '../def';

const REACTION = 'Fix it if it is yours to fix and tag it white. If it is not, tag it red and tell the fitter. Do not run with a guard off or a hazard open.';
const SHIFT = { where: '', when: { every: 1, unit: 'shift' } as const, kind: 'passfail' as const, reaction: REACTION, priority: 'low' as const, holds: false };

export const def: LogDef = {
  key: 'cilt',
  fc: 'FC-062',
  title: 'Operator care checks (CILT)',
  noun: 'operator check',
  says: 'The operators’ clean–inspect–lubricate–tighten checks, done by tap, and the abnormality tags they raise',
  group: 'Maintenance',
  standard: {
    rests: 'Autonomous maintenance as Nakajima (1988) and Suzuki (1994) describe it: a written check per machine — what, how, how long, what is normal — done daily and weekly by the operators, with a tag for every abnormality. The machine’s checks, their frequency and what is normal come from its maker’s instructions and the fitter; the list below is a starting point to edit, not the standard.',
    confirm: [
      'Nakajima’s and Suzuki’s texts were not re-read for this build (the record says so)',
      'The machine maker’s maintenance instructions: the checks, their frequency and what normal looks like',
      'The time each check takes — the standard’s minutes are planned into the shift, not assumed',
    ],
  },
  kinds: ['passfail', 'value'],
  starterChecks: [
    { name: 'Guards fitted, undamaged and interlocks working', ...SHIFT, criterion: 'All guards on and sound' },
    { name: 'No leaks — air, oil or product', ...SHIFT, criterion: 'No leak seen' },
    { name: 'Belts and chains tracking and in condition', ...SHIFT, criterion: 'Tracking true, no fraying or build-up' },
    { name: 'Product build-up cleared from sensors, jaws and guards', ...SHIFT, criterion: 'Clean and clear' },
    { name: 'Fasteners tight — jaw and guard brackets', ...SHIFT, when: { every: 1, unit: 'day' }, criterion: 'No loose or missing fastener' },
    { name: 'Lubrication points done (food-grade)', ...SHIFT, when: { every: 1, unit: 'week' }, criterion: 'Each point done to the sheet' },
  ],
  reactionWords: REACTION,
  whereLabel: 'Machine',
  holds: false,
  priority: 'low',
  tags: true,
  limits: [
    'A tag is a problem on the register: its age and whether it is closed are the register’s. A red tag is raised high, a white one low.',
    'A repeat abnormality is the same check tagged again within 28 days — the sign the fix was a wipe and the source is still there.',
    'The seven steps and their step audits are not built; the minutes the checks take against the short stops they prevent are not measured here.',
    'The hygiene clean is a different standard with its own verification; the two are scheduled together, not confused.',
    'Planned maintenance by the fitters (FC-063) is another log on the same shape.',
  ],
  examples: [{
    /* a shift check (8 h, a grace of 2 h) done at 06:00 and 14:00, the 22:00 one missed by 01:00; the guard tagged twice (a repeat abnormality) */
    name: 'Shift checks: two done on time, one missed, the guard tagged twice',
    checks: [0], nowMin: 19 * 60,
    results: [{ check: 0, min: 0, outcome: 'pass' }, { check: 0, min: 8 * 60, outcome: 'pass' }],
    tags: [{ check: 0, min: 30, colour: 'white' }, { check: 0, min: 500, colour: 'red' }],
    expect: { expected: 3, onTime: 2, missed: 1, failed: 0, pct: 66.7, tags: 2, repeatTags: 1, states: { 0: 'overdue' } },
  }],
};
