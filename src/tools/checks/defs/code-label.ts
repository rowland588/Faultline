/* CODE AND LABEL VERIFICATION (FC-166; knowledge/specs/FC-166-code-label.md) — the label, date, allergen and
 * legibility on the schedule the plan says (knowledge/methods/packaging/code-label-verification.md). A fail holds
 * product since the last good check; containment and release are the site’s call, never this tool’s. */
import type { LogDef } from '../def';

const REACTION =
  'Stop the line. Hold everything made since the last good check. Re-check label by label or by lot before release. Name the cause and fix the poka-yoke if one is needed.';
const HOURLY = {
  where: 'Labeller',
  when: { every: 1, unit: 'hour' } as const,
  kind: 'passfail' as const,
  reaction: REACTION,
  priority: 'critical' as const,
  holds: true,
};

export const def: LogDef = {
  key: 'code-label',
  fc: 'FC-166',
  title: 'Code and label checks',
  noun: 'label check',
  says: 'Label, code and allergen on the schedule — and what a wrong one holds',
  group: 'Packaging',
  standard: {
    rests:
      'At start of run, after every reel or label-roll change, at intervals and at end: the label identity (barcode scan against the plan when possible), the date and lot code, the allergen statement and legibility — are the site’s own plan. Wrong-label recalls are common; this list starts from hourly plus start, reel change and end, and is not the standard.',
    confirm: [
      'BRCGS Food Issue 9 labelling requirements — clause not confirmed against the text',
      'The retailer’s label code and barcode for each product on the run',
      'The allergen declaration expected from the recipe — verified at changeover, not decided here',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    { name: 'Label identity — matches the plan', criterion: 'Barcode scan or read matches the run plan', ...HOURLY },
    { name: 'Date and lot code — correct and legible', criterion: 'Printed date and lot match today’s format and can be read', ...HOURLY },
    { name: 'Allergen statement — matches the recipe', criterion: 'The allergen box matches what this product must declare', ...HOURLY },
    { name: 'Start of run — all three', criterion: 'Label, code and allergen checked before the line runs', ...HOURLY, when: { when: 'startup' } },
    { name: 'After reel change — all three', criterion: 'Label, code and allergen checked after each new reel', ...HOURLY, when: { when: 'changeover' } },
    { name: 'End of run — all three', criterion: 'Final check before the run ends', ...HOURLY, when: { when: 'trigger', note: 'the run ends' } },
  ],
  reactionWords: REACTION,
  whereLabel: 'Labeller',
  holds: true,
  priority: 'critical',
  limits: [
    'It records checks and states the team’s rules; it never decides a release or a recall.',
    'A visual read alone does not verify identity when two labels can look alike — scan when you can.',
    'The run plan’s label code is not verified here — that belongs at first-off release (FC-071).',
    'How sure “no wrong labels” is from good checks alone is a sample (FC-100); the poka-yoke at reel loading is the real fix.',
    'Event checks are counted when done, not scheduled as overdue.',
    'The product-on-hold record (FC-135) is not built yet.',
  ],
  examples: [
    {
      /* knowledge record: wrong date at 14:00, last good 13:00, 110/min → 6,600 packs */
      name: 'Hourly checks pass; the date code fails at 14:00',
      checks: [0, 1, 2],
      nowMin: 185,
      ratePerMin: 110,
      results: [
        ...[0, 60, 120, 180].flatMap(min => [0, 2].map(check => ({ check, min, outcome: 'pass' as const }))),
        ...[0, 60, 120].map(min => ({ check: 1, min, outcome: 'pass' as const })),
        { check: 1, min: 180, outcome: 'fail' as const },
      ],
      expect: { expected: 12, onTime: 12, missed: 0, failed: 1, packsHeld: 6600, pct: 100, states: { 0: 'done', 1: 'failed', 2: 'done' } },
    },
    {
      name: 'Label identity done twice, then missed twice',
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
