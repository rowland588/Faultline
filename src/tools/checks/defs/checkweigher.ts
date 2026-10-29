/* CHECKWEIGHER VERIFICATION (FC-164; knowledge/specs/FC-164-checkweigher.md) — test weights at the limits and the
 * reject proved at speed (knowledge/methods/packaging/checkweigher-verification.md). A pass on a weight check is
 * reading within the allowed error; on a reject check it is a real under-weight pack rejected every pass. A fail holds
 * everything since the last good check — the site decides release, never this tool. */
import type { LogDef } from '../def';

const REACTION =
  'Tag the checkweigher out of use. Hold everything made since the last good check and re-check it. Find the cause, re-verify, then run again.';
const HOURLY = {
  where: 'Checkweigher',
  when: { every: 1, unit: 'hour' } as const,
  kind: 'passfail' as const,
  reaction: REACTION,
  priority: 'critical' as const,
  holds: true,
};

export const def: LogDef = {
  key: 'checkweigher',
  fc: 'FC-164',
  title: 'Checkweigher verification',
  noun: 'checkweigher check',
  says: 'Test weights and the reject at speed — due, done, and what a failure holds',
  group: 'Packaging',
  standard: {
    rests:
      'Certified test weights at the low limit, nominal and high limit for each product, passed at line speed; the reject proved with real under-weight packs, not only the test button — are the site’s own programme (OIML R 51 and Weights and Measures guidance name the idea; this list is a starting point, not the standard). The usual practice is start of run, after a product change, at an interval and end of run.',
    confirm: [
      'OIML R 51 and your national Weights and Measures guidance — exact in-service error limits not reproduced here',
      'The test-weight set certified for each product’s mass',
      'The set point and legal minimum per product — from the average-quantity plan, not set here',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    { name: 'Low limit test weight — within allowed error', criterion: 'Reading within tolerance at speed', ...HOURLY },
    { name: 'Nominal test weight — within allowed error', criterion: 'Reading within tolerance at speed', ...HOURLY },
    { name: 'High limit test weight — within allowed error', criterion: 'Reading within tolerance at speed', ...HOURLY },
    {
      name: 'Under set point — rejected every pass',
      criterion: 'A pack below the set point is rejected; a good pack is not',
      ...HOURLY,
    },
    { name: 'Start-up — weights and reject', criterion: 'All weights and the reject check passed', ...HOURLY, when: { when: 'startup' } },
    { name: 'After product change — weights and reject', criterion: 'All weights and the reject check passed', ...HOURLY, when: { when: 'changeover' } },
  ],
  reactionWords: REACTION,
  whereLabel: 'Checkweigher',
  holds: true,
  priority: 'critical',
  limits: [
    'It records checks and states the team’s rules; it never decides a release.',
    'Individual weight readings are not typed here — only pass or fail against the criterion agreed on each check.',
    'A static weight on a stopped belt does not verify dynamic weighing; the check is at line speed.',
    'The zone of indecision and set-point placement (FC-119 Type 1 study) are not calculated on this page.',
    'Event checks (start-up, product change) are counted when done, not scheduled as overdue.',
    'The product-on-hold record (FC-135) is not built yet: the hold is worked out and the facts are ready for it.',
  ],
  examples: [
    {
      /* knowledge record: 395/400/405 g within 1.0 g; reject fails at 11:00, last good 10:00, 110 packs/min → 6,600 held */
      name: 'Hourly weights pass; the reject check fails at 11:00',
      checks: [0, 1, 2, 3],
      nowMin: 185,
      ratePerMin: 110,
      results: [
        ...[0, 60, 120, 180].flatMap(min => [0, 1, 2].map(check => ({ check, min, outcome: 'pass' as const }))),
        ...[0, 60, 120].map(min => ({ check: 3, min, outcome: 'pass' as const })),
        { check: 3, min: 180, outcome: 'fail' as const },
      ],
      expect: { expected: 16, onTime: 16, missed: 0, failed: 1, packsHeld: 6600, pct: 100, states: { 0: 'done', 1: 'done', 2: 'done', 3: 'failed' } },
    },
    {
      name: 'The low-limit weight done twice, then missed twice',
      checks: [0],
      nowMin: 200,
      results: [
        { check: 0, min: 0, outcome: 'pass' },
        { check: 0, min: 60, outcome: 'pass' },
      ],
      expect: { expected: 4, onTime: 2, missed: 2, failed: 0, pct: 50, states: { 0: 'overdue' } },
    },
  ],
};
