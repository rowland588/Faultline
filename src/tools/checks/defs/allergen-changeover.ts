/* ALLERGEN CHANGEOVER VERIFICATION (FC-171; knowledge/specs/FC-171-allergen-changeover.md) — visual inspection and
 * verification swabs after the validated allergen clean (knowledge/methods/foodsafety/allergen-changeover.md). A fail
 * before release stops the next product; containment and release are the site’s call, never this tool’s. */
import type { LogDef } from '../def';

const REACTION =
  'Do not start the next product. Re-clean to the validated procedure, re-swab the failed sites, and sign release only when every check passes.';
const CO = {
  when: { when: 'changeover' } as const,
  kind: 'passfail' as const,
  reaction: REACTION,
  priority: 'critical' as const,
  holds: true,
};

export const def: LogDef = {
  key: 'allergen-changeover',
  fc: 'FC-171',
  title: 'Allergen changeover verification',
  noun: 'allergen verification check',
  says: 'Visual and swab verification after the validated allergen clean — each changeover, before release',
  group: 'Food safety',
  standard: {
    rests:
      'Each allergen changeover needs the validated cleaning procedure done, a visual check of product-contact areas, and verification swabs at the hardest sites — allergen-specific lateral-flow swabs unless the site has validated ATP as a proxy for that allergen on this line. Validation (three worst-case cleans, allergen testing below the kit’s limit of detection) is kept outside this log; this list verifies every changeover. BRCGS Food Issue 9 allergen management is named in guidance, not quoted here.',
    confirm: [
      'BRCGS Global Standard Food Safety Issue 9 clause 5.3 — exact wording not confirmed against the text',
      'Campden BRI Guideline 59 — validation evidence for the clean on this line and allergen',
      'Which product changes need the full clean — the allergen matrix (FC-070), not decided here',
      'Whether ATP may verify this allergen on this line — only where validation showed it tracks removal (FC-172)',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    {
      name: 'Visual — product-contact areas clean and free of previous product',
      criterion: 'No visible residue, build-up or previous product on contact surfaces',
      ...CO,
    },
    {
      name: 'Swab — hard-to-clean site 1',
      criterion: 'Swab read passes against the site’s verification limit (allergen kit or validated ATP proxy)',
      ...CO,
    },
    {
      name: 'Swab — hard-to-clean site 2',
      criterion: 'Swab read passes against the site’s verification limit',
      ...CO,
    },
    {
      name: 'Swab — hard-to-clean site 3',
      criterion: 'Swab read passes against the site’s verification limit',
      ...CO,
    },
    {
      name: 'Release signed — all verification passed',
      criterion: 'Every check above passed; who released and when recorded',
      ...CO,
    },
  ],
  reactionWords: REACTION,
  whereLabel: 'Site',
  holds: true,
  priority: 'critical',
  limits: [
    'It records checks and states the team’s rules; it never decides a release or shortens the validated clean.',
    'Validation of the clean by allergen-specific testing is not stored here — only verification each changeover.',
    'ATP alone does not prove allergen removal unless the site validated it as a proxy on this line.',
    'The allergen matrix and changeover sequence (FC-070) are not built; SMED times the clean (FC-072), not this log.',
    'Event checks at changeover are counted when done, not scheduled as overdue.',
    'The product-on-hold record (FC-135) is not built yet.',
  ],
  examples: [
    {
      name: 'One changeover: a swab fails before release',
      checks: [0, 1, 2, 3, 4],
      nowMin: 120,
      results: [
        { check: 0, min: 0, outcome: 'pass' },
        { check: 1, min: 5, outcome: 'pass' },
        { check: 2, min: 10, outcome: 'fail' },
        { check: 3, min: 15, outcome: 'pass' },
      ],
      expect: { failed: 1, states: { 2: 'failed', 4: 'event' } },
    },
    {
      name: 'Visual check done at two changeovers, release not signed at the third',
      checks: [0, 4],
      nowMin: 60,
      results: [
        { check: 0, min: 0, outcome: 'pass' },
        { check: 4, min: 0, outcome: 'pass' },
        { check: 0, min: 30, outcome: 'pass' },
      ],
      expect: { states: { 0: 'event', 4: 'event' } },
    },
  ],
};
