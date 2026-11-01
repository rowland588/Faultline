import { uid } from '../../../lib/ids';
import { holdAnalyse, holdStart } from '../../hold/hold';
import type { ScoredDef } from '../types';

/* FC-135 — product on hold: a card a hold — what is held, how many packs, where, why, who may release it and by when; then the fate (released, concession,
   reworked, regraded, destroyed) with who decided and on what grounds. The money keeps the two-parts rule: tied up while open (not lost), lost once decided.
   Specification: knowledge/specs/FC-135-product-on-hold.md. Arithmetic and words: src/tools/hold/hold.ts. */
const def: ScoredDef = {
  key: 'hold',
  fc: 'FC-135',
  title: 'Product on hold',
  says: 'What is held, since when, why, who may release it, and what each hold has cost — tied up while open, lost once decided',
  group: 'Risk and control',
  question: 'What is on hold now, since when and why — who decides, by when, and what has it cost?',
  scales: [],
  limits: [
    'The register records the hold and the decision; it does not segregate the product or decide: the label and the lock on the floor, and the named authority, do that.',
    'A hold is not yet raised from a failed check of a check log or from a problem on the register, and a hold is not on the line’s page, Needs you or the control room; it is a register on the line or project.',
    'The cost is the typed cost of a pack to this point, the margin, the wage and the rates for the hold’s fate; a missing input is named and the figure is left out, never guessed. No cost-of-poor-quality total is made from it.',
    'The Pareto is of this register’s holds only; “repeating” at three holds is Faultline’s cut. Allergen and food-safety holds are HACCP matters (not built, FC-168).',
  ],
  noun: 'hold',
  register: {
    analyse: ({ rows, ctx }) => holdAnalyse({ rows, ctx }),
    start: () => holdStart(uid),
    asks: { name: 'What line or area are these holds for?', placeholder: 'e.g. Line 2 — holds, November', empty: 'No holds recorded yet — start the register, then add each hold: what is held, how many packs, why, and who may release it.', noun: 'hold', newLabel: 'New holds register' },
  },
  examples: [{
    name: 'Line 2 — six holds, two open and four decided (read on 1 November 2026)',
    rate: 25,
    rows: [
      { id: 'h1', name: 'Maris 500 g — failed seal check', hold: { qty: 4800, lot: 'M2310-14', label: 'H-014', where: 'Quarantine cage 2', segregated: true, reason: 'Seal pull failed at 09:40, 3 of 5 below 8 N', cause: 'Seal', raisedOn: '2026-10-26', raisedBy: 'Sam', decider: 'Priya (QA lead)', decideBy: '2026-10-30', life: 21 } },
      { id: 'h2', name: 'King Edward 1 kg — wrong date code', hold: { qty: 1200, lot: 'KE2310-02', label: 'H-015', where: 'Chilled bay 3', segregated: true, reason: 'Date code one day early after the changeover', cause: 'Code or label', raisedOn: '2026-10-30', raisedBy: 'Dave', decider: 'Priya (QA lead)', decideBy: '2026-11-03', life: 14 } },
      { id: 'h3', name: 'Baby 400 g — metal detector missed a test piece', hold: { qty: 3000, lot: 'B2310-09', label: 'H-012', reason: 'Test piece missed twice at the hourly check', cause: 'Metal detection', raisedOn: '2026-10-20', raisedBy: 'Sam', decider: 'Priya (QA lead)', fate: 'destroy', decidedOn: '2026-10-22', decidedBy: 'Priya (QA lead)', grounds: 'Cannot show the product clear of the missed window', disposal: 150, ref: '8D-0042' } },
      { id: 'h4', name: 'Maris 500 g — seal check in error', hold: { qty: 2400, lot: 'M2310-03', label: 'H-010', reason: 'Seal pull failed once, gauge suspect', cause: 'Seal', raisedOn: '2026-10-12', raisedBy: 'Dave', decider: 'Priya (QA lead)', fate: 'release', decidedOn: '2026-10-13', decidedBy: 'Priya (QA lead)', grounds: 'Re-test of 20 packs on a calibrated gauge, all above 8 N', hours: 2 } },
      { id: 'h5', name: 'Tesco 400 g — undersize', hold: { qty: 2000, lot: 'T2310-01', label: 'H-008', reason: 'Pack width 4 mm under the customer specification', cause: 'Weight', raisedOn: '2026-10-05', raisedBy: 'Sam', decider: 'Priya (QA lead)', fate: 'regrade', decidedOn: '2026-10-09', decidedBy: 'Priya (QA lead)', grounds: 'Sold as a second to the discount channel', lossPerPack: 0.08 } },
      { id: 'h6', name: 'Maris 500 g — re-seal', hold: { qty: 900, lot: 'M2309-30', label: 'H-006', reason: 'Weak seal on the first reel of the shift', cause: 'Seal', raisedOn: '2026-10-01', raisedBy: 'Dave', decider: 'Priya (QA lead)', fate: 'rework', decidedOn: '2026-10-03', decidedBy: 'Priya (QA lead)', grounds: 'Re-sealed and 100% pull-tested', hours: 4, extra: 45 } },
    ],
    /* scripts/knowledge/cases-t8-3.py — the six holds worked by a second implementation */
    expect: { counts: { open: 2, decided: 4 }, order: ['Maris 500 g — failed seal check', 'King Edward 1 kg — wrong date code', 'Baby 400 g — metal detector missed a test piece', 'Maris 500 g — seal check in error', 'Tesco 400 g — undersize', 'Maris 500 g — re-seal'], verdict: '2 on hold' },
  }],
};

export default def;
