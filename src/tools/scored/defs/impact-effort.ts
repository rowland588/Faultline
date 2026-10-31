import { paybackWords, rankPick, summarizePick, type PickRanked } from '../../../lib/ie/pick';
import type { ScoredDef } from '../types';

const def: ScoredDef = {
  key: 'impact-effort',
  fc: 'FC-144',
  title: 'Impact and effort',
  says: 'Which countermeasure first — the PICK chart: impact against effort, in order, with what the quick wins are worth',
  group: 'Choosing solutions',
  question: 'Which countermeasures do we do first, which are projects, and which do we decline?',
  scales: [
    { id: 'impact', label: 'Impact' },
    { id: 'effort', label: 'Effort' },
  ],
  noun: 'countermeasure',
  help: 'Impact 1–5: 1 barely moves the number, 3 closes a fair part of the gap, 5 closes most of it. Effort 1–5: 1 a day or less, 2 about a week, 3 a few weeks, 4 a month or two, 5 a quarter or more, or capital. Agree what the scores mean before you score. What it is worth a year, the hours and any other spend are optional — they put the quick wins in money.',
  fields: [
    { id: 'impact', label: 'Impact', kind: 'score' },
    { id: 'effort', label: 'Effort', kind: 'score' },
    { id: 'worthGbp', label: 'Worth a year, £', kind: 'money' },
    { id: 'hours', label: 'Hours', kind: 'hours' },
    { id: 'spendGbp', label: 'Other spend, £', kind: 'money' },
  ],
  columns: [
    { label: 'Order', of: r => String(r.score) },
    { label: 'Quadrant', of: r => `${r.class}${(r as PickRanked).onLine ? ' · on the line' : ''}`, tone: () => 'n' },
    { label: 'Pays back', of: r => ((r as PickRanked).paybackWeeks !== undefined ? paybackWords((r as PickRanked).paybackWeeks as number) : '—') },
  ],
  asksRate: true,
  paperInputs: true,
  blank: true,
  limits: [
    'The scores and the £ a year are typed — they are not read from the 6M problem or the Pareto bar yet.',
    'The quick wins are not put on the Actions in one tap; add them there with who and by when.',
    'Payback is the plain division of cost by worth — not NPV (FC-191). Pugh (FC-143) is a separate register.',
  ],
  rank: (rows, o) => rankPick(rows, o),
  summarize: (ok, o) => summarizePick(ok as PickRanked[], o),
  examples: [
    {
      name: 'Film breaks — four countermeasures, priced at £18 an hour',
      rate: 18,
      rows: [
        { id: '1', name: 'Film guide', impact: 3, effort: 1, worthGbp: 6000, hours: 6 },
        { id: '2', name: 'Reel trolley', impact: 3, effort: 2, worthGbp: 4500, hours: 20 },
        { id: '3', name: 'New unwind unit', impact: 4, effort: 5, worthGbp: 30000, hours: 200, spendGbp: 18000 },
        { id: '4', name: 'Second operator', impact: 2, effort: 2, worthGbp: 2000, hours: 40 },
      ],
      expect: {
        counts: { Implement: 2, Challenge: 1, Possible: 1, Kill: 0 },
        order: ['Film guide', 'Reel trolley', 'New unwind unit', 'Second operator'],
        tiles: { Implement: '2', Challenge: '1', Possible: '1', Kill: '0' },
        verdict: '2 to do first',
        money: ['The quick wins are worth £10.5k a year for 26 hours of work (£468 of labour at £18 an hour).'],
      },
    },
    {
      name: 'Packing line — five ideas, nothing priced, a 3 on the line',
      rows: [
        { id: '1', name: 'Sealer jaw spares kit', impact: 4, effort: 2 },
        { id: '2', name: 'Splice tape change', impact: 3, effort: 3 },
        { id: '3', name: 'Re-tune the auto-reject', impact: 2, effort: 4 },
        { id: '4', name: 'Rewrite the changeover checklist', impact: 2, effort: 1 },
        { id: '5', name: 'Replace the wrapper', impact: 5, effort: 5 },
      ],
      expect: {
        counts: { Implement: 1, Challenge: 2, Possible: 1, Kill: 1 },
        order: ['Sealer jaw spares kit', 'Replace the wrapper', 'Splice tape change', 'Rewrite the changeover checklist', 'Re-tune the auto-reject'],
        tiles: { Implement: '1', Challenge: '2', Possible: '1', Kill: '1' },
        verdict: '1 to do first',
        money: ['Type what each is worth a year to say what the quick wins are worth.', 'Give the hours, and the £ an hour, to say what the work costs.'],
      },
    },
  ],
};

export default def;
