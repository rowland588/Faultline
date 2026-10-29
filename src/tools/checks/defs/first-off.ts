/* FIRST-OFF RELEASE AT CHANGEOVER (FC-071; knowledge/specs/FC-071-first-off-release.md) — line clearance and the
 * checks before the first good pack ships (knowledge/methods/changeover/first-off-release.md). A fail stops release;
 * containment and who may sign are the site’s call, never this tool’s. */
import type { LogDef } from '../def';

const REACTION =
  'Do not release the line. Fix the check, run it again, and sign release only when every check passes.';
const CO = {
  where: 'Line 7',
  when: { when: 'changeover' } as const,
  kind: 'passfail' as const,
  reaction: REACTION,
  priority: 'critical' as const,
  holds: false,
};

export const def: LogDef = {
  key: 'first-off',
  fc: 'FC-071',
  title: 'First-off release',
  noun: 'first-off check',
  says: 'Line clearance and release checks before the first good pack — each changeover, signed before running',
  group: 'Changeovers',
  standard: {
    rests:
      'Between the last turn of the spanner and the first pack that counts, the site runs its release list: old product and packaging gone, allergen clean verified where the matrix says, packaging matches the plan, date and lot correct, first packs within limits, metal detector and checkweigher test pieces passed, release signed with time. Nothing ships until the list passes. BRCGS Food Issue 9 clauses on labelling and pack control are named in guidance, not quoted here.',
    confirm: [
      'BRCGS Global Standard Food Safety Issue 9 clauses 5.3 and 6.2 — exact wording not confirmed against the text',
      'The release list for each kind of change on this line — like-for-like vs allergen change',
      'Who may sign release — quality or a trained line leader, written',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    {
      name: 'Line clearance — previous product and packaging gone',
      criterion: 'Old product, packaging, labels and rework removed; clearance signed',
      ...CO,
    },
    {
      name: 'Allergen clean verified — where the matrix says',
      criterion: 'Validated allergen clean and verification passed (FC-171) where required',
      ...CO,
    },
    {
      name: 'Packaging loaded — matches the run plan',
      criterion: 'Film, tray, lid and label match the plan by scan or read',
      ...CO,
    },
    {
      name: 'Date and lot code — correct and legible',
      criterion: 'Printed date and lot match today’s format and can be read',
      ...CO,
    },
    {
      name: 'First packs — weight within limits',
      criterion: 'First packs weighed or pre-control greens within the filler’s limits',
      ...CO,
    },
    {
      name: 'Seal — visual and pull test',
      criterion: 'Seal complete on first packs; pull test passes where used',
      ...CO,
    },
    {
      name: 'Metal detector — test pieces passed',
      criterion: 'Fe, non-Fe and stainless test pieces detected and rejected',
      ...CO,
    },
    {
      name: 'Checkweigher — test weights passed',
      criterion: 'Low, nominal and high test weights pass and reject proved',
      ...CO,
    },
    {
      name: 'Release signed — all checks passed',
      criterion: 'Every check above passed; who released and when recorded',
      ...CO,
    },
  ],
  reactionWords: REACTION,
  whereLabel: 'Line',
  holds: false,
  priority: 'critical',
  limits: [
    'It records checks and states the team’s rules; it never decides release or shortens the list.',
    'First-off minutes belong in the SMED record (FC-068); this log does not time the changeover.',
    'In-run label and code checks (FC-166) continue after release; this list is before the first good pack.',
    'A list the same for every change is either too long or too short — edit the starter list by change type.',
    'Event checks at changeover are counted when done, not scheduled as overdue.',
    'The product-on-hold record (FC-135) is not built yet.',
  ],
  examples: [
    {
      name: 'One changeover: the label check fails before release',
      checks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      nowMin: 90,
      results: [
        { check: 0, min: 0, outcome: 'pass' },
        { check: 1, min: 5, outcome: 'pass' },
        { check: 2, min: 10, outcome: 'fail' },
        { check: 3, min: 15, outcome: 'pass' },
      ],
      expect: { failed: 1, states: { 2: 'failed', 8: 'event' } },
    },
    {
      name: 'Two changeovers: all checks pass and release signed each time',
      checks: [0, 8],
      nowMin: 120,
      results: [
        { check: 0, min: 0, outcome: 'pass' },
        { check: 8, min: 0, outcome: 'pass' },
        { check: 0, min: 60, outcome: 'pass' },
        { check: 8, min: 60, outcome: 'pass' },
      ],
      expect: { states: { 0: 'event', 8: 'event' } },
    },
  ],
};
