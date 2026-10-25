/* METAL DETECTION AND X-RAY VERIFICATION (FC-170; knowledge/specs/FC-170-metal-detection.md) — test pieces at
 * the agreed positions and frequency, and what a miss holds.
 *
 * The control is only as good as the proof that the detector finds, and the reject removes, the test pieces the
 * plan validated (knowledge/methods/foodsafety/metal-detection-verification.md). A pass is detected AND rejected;
 * detected and not rejected is a fail. A fail means everything made since the last good check is in doubt — the
 * shape works that window out and raises the problem; whether the product is held, re-run, released or scrapped is
 * the site's call, never this tool's. */
import type { LogDef } from '../def';

const REACTION = 'Stop the line. Tag the detector. Hold everything made since the last good check and run it through a working detector. Check it again before the line restarts.';
const PIECE = { where: 'Metal detector', when: { every: 1, unit: 'hour' } as const, kind: 'passfail' as const, criterion: 'Detected, and the reject removes the pack', reaction: REACTION, priority: 'critical' as const, holds: true };

export const def: LogDef = {
  key: 'metal-detection',
  fc: 'FC-170',
  title: 'Metal detection checks',
  noun: 'metal detector check',
  says: 'Test pieces through the detector when the plan says — and what a miss holds',
  group: 'Food safety',
  standard: {
    rests: 'The test pieces, where they go through the aperture, the sensitivities and how often are the site’s own — set by its HACCP plan, the detector’s validation and the retailer’s code of practice. The usual practice is a check at start-up, at an interval, after a stop or a changeover and at the end of the run; this list starts from that and is not the standard. BRCGS Food Safety (issue 9) has a clause on foreign-body detection equipment.',
    confirm: [
      'The BRCGS clause number and its exact requirements for test pieces and frequency — not read against the text',
      'Your retailer’s code of practice: its test-piece sizes and how often',
      'The sensitivities validated for each product — the detector’s validation sets them, this list sets none',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    { name: 'Ferrous test piece', ...PIECE },
    { name: 'Non-ferrous test piece', ...PIECE },
    { name: 'Stainless steel test piece', ...PIECE },
    { name: 'Start-up — all three pieces', ...PIECE, when: { when: 'startup' } },
    { name: 'After a changeover — all three pieces', ...PIECE, when: { when: 'changeover' } },
    { name: 'End of the run — all three pieces', ...PIECE, when: { when: 'trigger', note: 'the run ends' } },
  ],
  reactionWords: REACTION,
  whereLabel: 'Detector',
  holds: true,
  priority: 'critical',
  limits: [
    'It records the checks and states the team’s rules; it never decides a release. Whether product is held, re-run, released or scrapped is the site’s call.',
    'The test-piece sizes, where they go through and how often are the site’s validated plan — the starter list sets none of the sizes.',
    'A pass means detected and rejected; a piece detected and not rejected is a fail.',
    'The signal strength on each piece is not recorded, so a drift toward the threshold is not seen before a miss.',
    'Checks done when something happens (start-up, a changeover, the end of the run) are counted, not scheduled: a missed one is not known.',
    'The product-on-hold record (FC-135) is not built yet: the hold is worked out and the facts are ready for it.',
  ],
  examples: [
    {
      /* the knowledge record's run: three pieces hourly from 08:00, the stainless piece not rejected at 11:00, last good 10:00, 110 packs a minute */
      name: 'Three pieces hourly; the stainless piece fails at 11:00',
      checks: [0, 1, 2], nowMin: 185, ratePerMin: 110,
      results: [
        ...[0, 60, 120, 180].flatMap(min => [0, 1].map(check => ({ check, min, outcome: 'pass' as const }))),
        ...[0, 60, 120].map(min => ({ check: 2, min, outcome: 'pass' as const })), { check: 2, min: 180, outcome: 'fail' as const },
      ],
      expect: { expected: 12, onTime: 12, missed: 0, failed: 1, packsHeld: 6600, pct: 100, states: { 0: 'done', 1: 'done', 2: 'failed' } },
    },
    {
      name: 'The ferrous piece done at 08:00 and 09:00, then missed twice',
      checks: [0], nowMin: 200,
      results: [{ check: 0, min: 0, outcome: 'pass' }, { check: 0, min: 60, outcome: 'pass' }],
      expect: { expected: 4, onTime: 2, missed: 2, failed: 0, pct: 50, states: { 0: 'overdue' } },
    },
  ],
};
