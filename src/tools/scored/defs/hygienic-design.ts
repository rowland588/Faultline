import { uid } from '../../../lib/ids';
import type { ScoredRow } from '../../../lib/study';
import { CHECKLIST, START, STARTER, analyseHygiene } from '../../hygiene/hygiene';
import type { ScoredDef } from '../types';

/* FC-178 — hygienic design review of new equipment: a checklist and findings register, graded and closed before SAT. Not an EHEDG or EN 1672-2 assessment.
   Specification: knowledge/specs/FC-178-hygienic-design.md. Arithmetic and words: src/tools/hygiene/hygiene.ts. */
const PAST = '2020-01-01', FUTURE = '2099-12-31';
/** A new slicer at FAT, hand-counted: 18 points — 12 checked (6 meet, 1 does not apply, 1 closed, 4 findings open: 2 critical, 1 major, 1 minor), 6 not yet checked, 1 finding past its day. */
function slicer(): ScoredRow[] {
  const by = (name: string) => STARTER.find(s => s.name.startsWith(name));
  const row = (name: string, o: Partial<ScoredRow>): ScoredRow => { const s = by(name); if (!s) throw new Error(`no starter point ${name}`); return { ...s, id: uid(), ...o }; };
  return [
    row('Materials that touch food', { status: 'meets', note: 'Certificates seen' }),
    row('Surfaces that touch food', { status: 'meets' }),
    row('Joints in the product zone', { status: 'finding', note: 'Lap joint on the hopper lip', owner: 'OEM — service lead', due: FUTURE }),
    row('Every product-contact surface drains', { status: 'meets' }),
    row('No dead legs', { status: 'closed', severity: 'critical', note: 'CIP leg re-piped, seen again at FAT', owner: 'OEM — service lead' }),
    row('No hollow rollers', { status: 'finding', note: 'Hollow take-off roller open at one end', owner: 'OEM — service lead', due: PAST }),
    row('No exposed threads', { status: 'meets' }),
    row('Seals and gaskets', { status: 'meets' }),
    row('Bearings, drives', { status: 'meets' }),
    row('Every product-contact part', { status: 'unchecked' }),
    row('Surfaces in the splash zone', { status: 'finding', note: 'Flat shelf under the drive holds water', owner: 'Site engineer', due: FUTURE, severity: 'major' }),
    row('No horizontal ledges', { status: 'na' }),
    row('Guards, covers', { status: 'unchecked' }),
    row('Cable, pipe and hose', { status: 'unchecked' }),
    row('Frames, legs and feet', { status: 'finding', note: 'Open box section on the frame', owner: 'OEM — service lead', due: FUTURE }),
    row('Painted or coated', { status: 'unchecked' }),
    row('Electrical cabinets', { status: 'unchecked' }),
    row('Drip trays', { status: 'unchecked' }),
  ];
}

const def: ScoredDef = {
  key: 'hygienic-design',
  fc: 'FC-178',
  title: 'Hygienic design review',
  says: 'Can this new machine be cleaned? A zone-by-zone checklist and findings register, each finding graded and closed before the site accepts it',
  group: 'Stage gate',
  question: 'Can it be cleaned — and what must the OEM change before it is shipped, accepted and handed over?',
  scales: [],
  limits: [
    'A checklist and a findings register, not an EHEDG, EN 1672-2 or EN ISO 14159 assessment, certification or declaration of conformity.',
    'The points are in plain words from the principles the records name; EHEDG Guideline 8’s text could not be opened and the standards are paid, so no section, roughness, radius or gap limit is quoted — each point cites its principle by topic only.',
    'The grades and the gates are LUNAR’s; the photo that should close a finding is not kept here — the re-check is written beside it.',
    'It is a review of cleanability; the cleaning method and its validation, and the swab sites a finding becomes, are other tools’.',
  ],
  matrix: {
    editor: 'checklist',
    section: 'Walk the machine, zone by zone',
    datumDefault: '',
    checklist: CHECKLIST,
    analyse: a => analyseHygiene(a),
    start: () => ({ datum: '', criteria: [], rows: STARTER.map(r => ({ ...r, id: uid() })) }),
    asks: { name: START.name, placeholder: START.placeholder, empty: START.empty },
  },
  examples: [{
    name: 'A new slicer at FAT — 18 points, hand-counted',
    criteria: [],
    rows: slicer(),
    expect: {
      counts: { total: 18, checked: 12, open: 4, critical: 2, major: 1, minor: 1, closed: 1, unchecked: 6, late: 1 },
      tiles: { Checked: '12 of 18', 'Open findings': '4', 'To close before SAT': '3', Closed: '1', 'Past their day': '1' },
      verdict: '3 to close before SAT',
    },
  }],
};

export default def;
