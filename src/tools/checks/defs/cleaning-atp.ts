/* CLEANING VERIFICATION BY ATP (FC-172; knowledge/specs/FC-172-cleaning-atp.md) — pre-op swabs read in RLU against
 * limits the site sets on each contact site (knowledge/methods/foodsafety/cleaning-verification-atp.md). A fail or a
 * caution treated as fail means re-clean and re-swab before start-up; release is the site’s call, never this tool’s. */
import type { LogDef } from '../def';

const REACTION =
  'Re-clean the site to the hygiene method, re-swab, and do not start production on that line until the reading passes the limit you set.';
const PREOP = {
  where: 'Slicer guard',
  when: { every: 1, unit: 'day' } as const,
  kind: 'value' as const,
  unit: 'RLU',
  reaction: REACTION,
  priority: 'high' as const,
  holds: false,
};

export const def: LogDef = {
  key: 'cleaning-atp',
  fc: 'FC-172',
  title: 'Cleaning verification (ATP)',
  noun: 'ATP swab',
  says: 'Pre-op swabs in RLU at each site — pass rate, trends, and which sites fail most',
  group: 'Food safety',
  standard: {
    rests:
      'After the clean and before production, product-contact sites are swabbed and read on a luminometer (relative light units). The site sets pass and fail limits from a baseline on surfaces known clean — often pass under the baseline’s 95th percentile and fail at twice that; manufacturer defaults are only a start. Readings are lognormal; the pass rate and median matter more than the mean. Caution bands that must re-clean are set by choosing the fail limit on each check — the shape has one upper limit, not three bands.',
    confirm: [
      'Your luminometer manufacturer’s guidance on limits and swabbing technique',
      'The baseline swab set on known-clean surfaces for this line',
      'Whether a reading in the caution band may start — the site’s written rule, not decided here',
    ],
  },
  kinds: ['value'],
  starterChecks: [
    { name: 'Filler hopper — product contact', ...PREOP },
    { name: 'Conveyor belt — product contact', ...PREOP },
    { name: 'Slicer blade guard — product contact', ...PREOP },
    { name: 'Depositor nozzle — product contact', ...PREOP },
  ],
  reactionWords: REACTION,
  whereLabel: 'Site',
  holds: false,
  priority: 'high',
  limits: [
    'ATP measures organic residue, not pathogens — environmental monitoring (FC-173) answers microbes.',
    'Set hi (and lo if needed) on each site from your baseline before the reading is judged; with no limits the RLU is kept and trended, not pass/fail.',
    'Allergen changeover verification (FC-171) uses allergen-specific swabs unless ATP was validated as a proxy on that line.',
    'A caution released as a pass under time pressure is misuse — the rule is written on the check and the release is recorded.',
    'Re-clean delay can be priced as labour and line stood (FC-172 money) when wage and rate are given — not on the verdict.',
  ],
  examples: [
    {
      /* cases-planning-foodsafety.py — fail at 320 RLU against fail limit 300; slicer guard is the recurring fail site */
      name: 'Pre-op swabs pass except the slicer guard at 320 RLU',
      checks: [0, 1, 2, 3],
      nowMin: 3 * 1440 + 60,
      set: { 0: { hi: 300 }, 1: { hi: 300 }, 2: { hi: 300 }, 3: { hi: 300 } },
      results: [
        { check: 0, min: 0, outcome: 'value', value: 48 },
        { check: 1, min: 0, outcome: 'value', value: 55 },
        { check: 2, min: 0, outcome: 'value', value: 320 },
        { check: 3, min: 0, outcome: 'value', value: 62 },
        { check: 0, min: 1440, outcome: 'value', value: 52 },
        { check: 1, min: 1440, outcome: 'value', value: 58 },
        { check: 2, min: 1440, outcome: 'value', value: 88 },
        { check: 3, min: 1440, outcome: 'value', value: 71 },
      ],
      expect: { expected: 12, onTime: 8, missed: 4, failed: 1, pct: 66.7 },
    },
    {
      name: 'One site done twice, then missed once',
      checks: [2],
      nowMin: 3 * 1440 + 120,
      set: { 2: { hi: 300 } },
      results: [
        { check: 2, min: 0, outcome: 'value', value: 62 },
        { check: 2, min: 1440, outcome: 'value', value: 55 },
      ],
      expect: { expected: 3, onTime: 2, missed: 1, failed: 0, pct: 66.7, states: { 2: 'overdue' } },
    },
  ],
};
