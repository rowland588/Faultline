/* CALIBRATION REGISTER AND CHECKS (FC-122; knowledge/specs/FC-122-calibration-register.md; msa.calibration).
 *
 * Each gauge is a check on an interval: the reading on its reference is typed, judged against lo/hi agreed
 * around the reference, and a failure holds everything the gauge judged since the last good check. */
import type { LogDef } from '../def';

const REACTION =
  'Tag the gauge out of use. Review everything it judged since the last good check against the product limit — release, hold or rework with the record. Service or replace the gauge, then check again before use.';

const CHECK = {
  when: { every: 1, unit: 'week' } as const,
  kind: 'value' as const,
  reaction: REACTION,
  priority: 'high' as const,
  holds: true,
};

export const def: LogDef = {
  key: 'calibration',
  fc: 'FC-122',
  title: 'Calibration checks',
  noun: 'calibration check',
  says: 'Gauges checked on schedule against a reference — due, overdue, and what a failure holds',
  group: 'Measurement systems',
  standard: {
    rests: 'ISO 9001 and ISO 10012 expect measuring equipment identified, checked on a programme, and action when found unfit (exact clause numbers not quoted here). The reference, allowed error, interval and what the gauge judges are the site’s — this starter list is not the standard.',
    confirm: [
      'BRCGS Food Issue 9 clause 6.4 — exact wording not confirmed against the text',
      'Your laboratory’s certificates and traceability chain',
      'The product limit used to review packs when a gauge fails — never decided here',
    ],
  },
  kinds: ['value'],
  starterChecks: [
    { name: 'Bench scale — 500 g reference', unit: 'g', ...CHECK },
    { name: 'Cook probe — ice point or reference bath', unit: '°C', when: { every: 1, unit: 'day' }, kind: 'value', reaction: REACTION, priority: 'critical', holds: true },
    { name: 'Checkweigher — test weight at nominal', unit: 'g', when: { every: 1, unit: 'shift' }, kind: 'value', reaction: REACTION, priority: 'high', holds: true },
  ],
  reactionWords: REACTION,
  whereLabel: 'Gauge',
  holds: true,
  priority: 'high',
  limits: [
    'It records checks and states the team’s rules; it never decides a release — whether product is held, reworked or released is the site’s call.',
    'Set lo and hi on each check from the reference and allowed error before the reading is judged; with no limits the reading is kept and trended, not pass/fail.',
    'The reference’s certificate and traceability are not stored here.',
    'Interval by drift from a stability chart (FC-120) and the product-on-hold register (FC-135) are not built yet.',
    'Daily verification readings do not yet feed the bias/stability study automatically.',
  ],
  examples: [
    {
      /* knowledge/methods/msa/calibration.md — weekly scale, ±0.3 g on 500 g, fails 0.4 g high after 6 good weeks */
      name: 'Weekly bench scale; fails 0.4 g high on day 42',
      checks: [0],
      nowMin: 43 * 1440 + 60,
      set: { 0: { lo: 499.7, hi: 500.3 } },
      results: [
        ...[0, 7, 14, 21, 28, 35].map(min => ({ check: 0, min: min * 1440, outcome: 'value' as const, value: 500.0 })),
        { check: 0, min: 42 * 1440, outcome: 'value' as const, value: 500.4, made: 50_000 },
      ],
      expect: { expected: 7, onTime: 7, missed: 0, failed: 1, packsHeld: 50_000, pct: 100, states: { 0: 'failed' } },
    },
    {
      name: 'Probe check due and not yet done',
      checks: [1],
      nowMin: 2 * 1440 + 120,
      set: { 1: { lo: -0.2, hi: 0.2 } },
      results: [{ check: 1, min: 0, outcome: 'value' as const, value: 0.05 }],
      expect: { expected: 2, onTime: 1, missed: 1, pct: 50, states: { 1: 'overdue' } },
    },
  ],
};
