/* 5S AUDIT WITH SCORE AND TREND (FC-013; knowledge/specs/FC-177-scored-audits.md) — the first checklist of the
 * scored audit.
 *
 * Sort, set in order, shine, standardise, sustain (Hirano, Osada): the same questions each time, each on a 0–4
 * scale, scored as a share of the maximum by S and overall (knowledge/methods/lean/five-s.md). The value is the
 * trend and the weakest S, not the number: an area is compared with itself over time, never with another. It
 * reuses the shared scored-checklist variant — its only own parts are its questions, its scale and its words. */
import { items, type LogDef } from '../def';

const REACTION = 'Raise each finding as a problem with an owner and a day. The area’s leader reads the weakest S with the team; a fall two audits running is the signal to look at the standard itself.';

export const def: LogDef = {
  key: 'five-s',
  fc: 'FC-013',
  title: '5S audits',
  noun: '5S audit',
  says: 'An area scored on the same questions each time — by S, and whether it is holding',
  group: 'Lean',
  standard: {
    rests: 'Hirano (1995) and Osada (1991) frame the five S — sort, set in order, shine, standardise, sustain — and a scored checklist repeated by someone who is not the area’s own is the usual way to keep them. The questions and the 0–4 scale below are a starting point written for Faultline and edited by the team; they are not the books’ and not a certification standard.',
    confirm: [
      'Hirano’s and Osada’s texts were not re-read for this build (the record says so)',
      'Your site’s own 5S standard and the photographs of what right looks like in each area',
    ],
  },
  kinds: ['scored'],
  starterChecks: [{
    name: '5S audit', where: '', when: { every: 1, unit: 'week' }, kind: 'scored', reaction: REACTION, priority: 'low', holds: false,
    items: items([
      ['Sort', ['Nothing is in the area that is not used here', 'Red-tagged items are dated and have an owner', 'Walkways and work surfaces are clear', 'Only the current product’s materials are at the station']],
      ['Set in order', ['Every tool and fixture has a marked place', 'Shadow boards are complete', 'Anyone can find what they need quickly', 'Floor markings and labels match the layout']],
      ['Shine', ['Floors, walls and machines are clean', 'Cleaning tools are in their place and in good condition', 'Leaks, loose guards and wear are looked for while cleaning', 'Waste is in the right bins and emptied']],
      ['Standardise', ['The standard for the area is on display, with photographs of right', 'Colour coding and labels are used the same way everywhere', 'The cleaning schedule is on display and signed', 'Everyone can say what right looks like']],
      ['Sustain', ['The findings of the last audit are closed', 'The audit is done on its day by someone who is not of the area', 'The scores are on the board and read at the meeting', 'New starters are shown the standard']],
    ]),
  }],
  reactionWords: REACTION,
  whereLabel: 'Area',
  holds: false,
  priority: 'low',
  scale: {
    levels: [
      { v: 0, word: 'Not done — nothing like the standard' }, { v: 1, word: 'Started — far from the standard' },
      { v: 2, word: 'Partly — some of it is right' }, { v: 3, word: 'Mostly — a small gap' }, { v: 4, word: 'At the standard' },
    ],
    findingBelow: 3,
  },
  limits: [
    'An area is compared with itself over time, never with another area: a tidy office and a busy line are not a league table.',
    'The evidence that earns each level is not written per question — write it into the wording so two auditors score alike. Two auditors’ agreement is not measured here (FC-121).',
    'Photographs of what right looks like are not held beside the question; a photograph goes on the problem a finding raises.',
    'Hygiene audits have their own clauses and law (scored audits, FC-177); 5S does not replace them and should not repeat their questions.',
  ],
  examples: [{
    /* the record's Line 3 (cases-lean.py): 52 of 80 = 65%; Shine the weakest at 44%; the audit a week before scored 58 of 80 = 72.5%, four of this audit's nine findings (Shine ×3, Sustain ×1) were below 3 then too */
    name: 'Line 3, a week after an audit of 72.5%',
    nowMin: 10_080 + 60,
    results: [
      { check: 0, min: 0, outcome: 'score', levels: [4, 3, 4, 3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 3, 3] },
      { check: 0, min: 10_080, outcome: 'score', levels: [4, 3, 4, 3, 3, 3, 2, 3, 2, 1, 2, 2, 3, 2, 3, 3, 2, 2, 3, 2] },
    ],
    expect: { pct: 65, weakest: 'Shine', findings: 9, repeats: 4, falls: 1 },
  }],
};
