/* SCORED AUDITS — GMP, HYGIENE, LAYERED PROCESS AUDITS (FC-177; knowledge/specs/FC-177-scored-audits.md).
 *
 * A fixed checklist walked at a frequency by different levels — the team leader daily, a manager weekly — each
 * answer on one scale, the audit scored, every answer below the line a finding that is actioned on the register,
 * and a finding that comes back marked a repeat (knowledge/methods/foodsafety/audits.md: a repeat is a system
 * that fixed the symptom). It scores the site's own walk; it does not grade a certification audit — the standard's
 * grading bands are the standard's, and they are TO CONFIRM against its text. */
import { items, type LogDef } from '../def';

const REACTION = 'Raise each finding as a problem with an owner and a day, closed with evidence. A finding that comes back is a repeat: find the cause in the system — the record, the schedule, the design — not another re-training.';
const WALK = items([
  ['People', ['Hair, jewellery and clothing are as the site’s rules say', 'Hands are washed and sanitised at the points required', 'Visitors and contractors are signed in and briefed', 'Illness is reported and acted on']],
  ['Premises and equipment', ['Floors, walls, ceilings and drains are in good repair', 'Equipment is sound, with no loose or missing parts', 'Lighting covers are intact', 'Doors, curtains and seals are closed and undamaged']],
  ['Cleaning and hygiene', ['Cleaning is done to the schedule and signed', 'Cleaning tools are the right colour for the zone and in their place', 'Chemicals are stored and labelled correctly', 'Food contact surfaces are clean and dry before start-up']],
  ['Foreign body control', ['Glass and brittle plastic are controlled and the register is current', 'Knives, blades and tools are accounted for', 'Detectors and sieves are checked as the plan says', 'Nothing personal is carried into the production area']],
  ['Records', ['Today’s records are filled in at the time, legibly', 'Corrections are signed and dated', 'The last audit’s findings are closed or in hand', 'Allergen and changeover records match what ran']],
]);

export const def: LogDef = {
  key: 'scored-audit',
  fc: 'FC-177',
  title: 'Scored audits — GMP, hygiene, layered',
  noun: 'audit',
  says: 'A fixed checklist walked by different levels, scored, with every finding actioned and repeats marked',
  group: 'Food safety',
  standard: {
    rests: 'Internal audit practice as audits are run on a food site: a fixed checklist, a frequency by level (a team-leader walk, a manager’s audit), findings with an owner and a day, closed with evidence, and counted when they come back. The sections and questions below are a starting point written for Faultline and edited by the site; they are not any standard’s or any customer’s checklist.',
    confirm: [
      'BRCGS Food Safety (issue 9): its internal-audit clause and its grading bands for majors and minors — quoted nowhere here, not read against the text',
      'ISO 19011 and ISO 22000 on internal audit — not re-read for this build',
      'Your customers’ own audit questions and your site’s GMP rules — the questions here are not those',
    ],
  },
  kinds: ['scored'],
  starterChecks: [
    { name: 'GMP walk — team leader', where: '', who: 'Team leader', when: { every: 1, unit: 'day' }, kind: 'scored', items: WALK, reaction: REACTION, priority: 'low', holds: false },
    { name: 'GMP and hygiene audit — manager', where: '', who: 'Manager', when: { every: 1, unit: 'week' }, kind: 'scored', items: WALK, reaction: REACTION, priority: 'low', holds: false },
  ],
  reactionWords: REACTION,
  whereLabel: 'Area',
  holds: false,
  priority: 'low',
  scale: {
    levels: [{ v: 0, word: 'Not met' }, { v: 1, word: 'Partly met' }, { v: 2, word: 'Met' }],
    findingBelow: 2,
  },
  limits: [
    'It scores the site’s own walk. It does not grade a certification audit: the standard’s grading bands (majors and minors) are not built, and are TO CONFIRM against its text.',
    'A finding is an answer below Met; its severity (minor, major, critical) is the priority on the problem it raises, set by the auditor — Faultline does not classify it.',
    'A repeat is the same question below the line in the audit before it. A finding that is the same in substance but asked in another question is not found as a repeat.',
    'The questions are a starting point: your site’s GMP rules and your customers’ audits decide what is asked.',
  ],
  examples: [{
    name: 'A GMP walk: 36 of 40, three findings, cleaning the weakest',
    checks: [0], nowMin: 60,
    results: [{ check: 0, min: 0, outcome: 'score', levels: [2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 2, 2, 1, 2, 2, 2, 2, 2, 2] }],
    expect: { pct: 90, weakest: 'Cleaning and hygiene', findings: 3 },
  }],
};
