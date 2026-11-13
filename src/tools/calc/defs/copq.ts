/* COST OF POOR QUALITY — FC-128 (knowledge/specs/FC-128-cost-of-poor-quality.md; knowledge/methods/quality/copq.md).
 *
 * The four buckets of the PAF model — prevention, appraisal, internal failure, external failure — each a list of items priced from
 * the one cost model (hours × the wage, packs × a pack's materials, rework, a complaint) or typed in pounds from the record that
 * holds it, summed, ranked and said as a share of sales. Poor quality is the failure buckets; the cost of quality is all four.
 * Money IS the finding here, so only the unit costs the cost model supplies sit under "In money"; every box is optional and an
 * item whose price is missing is counted, not priced, and named (knowledge/MONEY.md rules 4–6). The verdict is never coloured:
 * Juran's 5–25% of sales is a range, not a threshold (copq.md). */
import { BUCKET_LABEL, copq, type Bucket, type BucketTotal, type CopqInput, type CopqResult } from '../../copq/copq';
import { fmt, gbp, pct } from '../format';
import type { CalcDef, CalcTile, Field, Problem, Values } from '../types';

const num = (v: Values, id: string): number | undefined => (typeof v[id] === 'number' ? (v[id] as number) : undefined);
const ids = ['rate', 'materials', 'reworkCost', 'complaintCost', 'prevHours', 'prevOther', 'apprHours', 'apprSamples', 'apprOther', 'scrapPacks', 'reworkPacks',
  'giveaway', 'holds', 'stops', 'complaints', 'credits', 'withdrawals', 'sales', 'packsMade'] as const;
const inputOf = (v: Values): CopqInput => {
  const out: Record<string, number> = {};
  for (const id of ids) { const x = num(v, id); if (x !== undefined) out[id] = x; }
  return out as CopqInput;
};
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const pence = (n: number): string => `${fmt(n * 100, 1)}p`;

/** What was spent preventing and checking, as the sentence ends: "£1,800 spent preventing it and £3,200 checking for it". */
function spentPhrase(r: CopqResult, it: boolean): string {
  const p = r.buckets[0].total, a = r.buckets[1].total;
  const pw = it ? 'preventing it' : 'preventing', aw = it ? 'checking for it' : 'checking';
  if (p !== undefined && a !== undefined) return `${gbp(p)} spent ${pw} and ${gbp(a)} ${aw}`;
  if (p !== undefined) return `${gbp(p)} spent ${pw}`;
  if (a !== undefined) return `${gbp(a)} spent ${aw}`;
  return '';
}

const pounds = (id: string, label: string, help: string): Field => ({ id, label, unit: '£', kind: 'number', min: 0, optional: true, help });
const packs = (id: string, label: string, help: string): Field => ({ id, label, unit: 'packs', kind: 'number', min: 0, integer: true, optional: true, help });

const def: CalcDef = {
  key: 'copq',
  fc: 'FC-128',
  title: 'Cost of poor quality',
  says: 'What poor quality costs a period in pounds, in the four buckets — and where the money is',
  question: 'What does poor quality cost us a week or a month, and which part is first to go after?',
  group: 'Losses in money',
  inputs: [
    { id: 'period', label: 'Period', kind: 'text', optional: true, help: 'e.g. Week 42, Line 2 — names the paper only.' },
    { id: 'sales', label: 'Sales for the period', unit: '£', kind: 'number', min: 0.000001, optional: true, money: true, help: 'From finance, for the same period — to say the cost as a share of sales.' },
    { id: 'packsMade', label: 'Packs made in the period', unit: 'packs', kind: 'number', min: 0.000001, integer: true, optional: true, help: 'Good packs out, for the same period — to say the cost a pack.' },
    { id: 'rate', label: 'One person’s cost an hour', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'The wage with on-costs — prices the hours on prevention and checking.' },
    { id: 'materials', label: 'A pack’s materials', unit: '£ a pack', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'materialsPerPack', where: 'a pack’s materials on its set-up', words: 'the line’s materials for a pack' }, help: 'Ingredients and packaging in one pack — prices scrap and the samples destroyed.' },
    { id: 'reworkCost', label: 'Putting a pack through again costs', unit: '£ a pack', kind: 'number', min: 0, optional: true, money: true, help: 'The labour and materials of reworking one pack — your own figure; Faultline never fills it in.' },
    { id: 'complaintCost', label: 'One complaint costs to handle', unit: '£', kind: 'number', min: 0, optional: true, money: true, help: 'Investigating, replying and crediting one complaint — the business’s own figure; Faultline never fills it in.' },
    { id: 'prevHours', label: 'Prevention — hours spent', unit: 'hours', kind: 'number', min: 0, optional: true, help: 'Training, process design, control-plan work, mistake-proofing, supplier assurance.' },
    pounds('prevOther', 'Prevention — other costs', 'Courses, supplier visits, maintenance done for quality.'),
    { id: 'apprHours', label: 'Appraisal — hours checking', unit: 'hours', kind: 'number', min: 0, optional: true, help: 'Inspection, testing, audits, calibration — from the check logs and the control plan.' },
    packs('apprSamples', 'Appraisal — samples destroyed', 'Packs destroyed by testing.'),
    pounds('apprOther', 'Appraisal — other costs', 'Lab fees, gauges, calibration contracts.'),
    packs('scrapPacks', 'Internal failure — packs scrapped', 'Rejects that became waste, from the reject count by fate.'),
    packs('reworkPacks', 'Internal failure — packs reworked', 'Rejects put through again.'),
    pounds('giveaway', 'Internal failure — give-away', 'From the capability study’s give-away, in pounds for the period.'),
    pounds('holds', 'Internal failure — held or downgraded', 'Product held, downgraded or written off, in pounds.'),
    pounds('stops', 'Internal failure — line time lost to quality stops', 'From Lost time in money: the labour, and the contribution only if the stop was at the bottleneck.'),
    { id: 'complaints', label: 'External failure — complaints', unit: 'complaints', kind: 'number', min: 0, integer: true, optional: true, help: 'Customer complaints received in the period.' },
    pounds('credits', 'External failure — credits and charge-backs', 'Retailer credits and charge-backs, in pounds.'),
    pounds('withdrawals', 'External failure — returns, withdrawals and recalls', 'In pounds, from the incident.'),
  ],
  check(v): Problem[] {
    const r = copq(inputOf(v));
    if (!r.priced) {
      return [{ block: true, say: r.needs.length ? `Nothing is priced yet. ${r.needs.join(' ')}` : 'Give at least one cost to work out — hours with the wage, packs with a pack’s materials, or a figure in pounds.' }];
    }
    const sales = num(v, 'sales');
    return sales !== undefined && r.poor > sales ? [{ field: 'sales', say: 'The poor quality typed is more than the sales typed — check that both are for the same period.' }] : [];
  },
  compute(v) {
    const r = copq(inputOf(v));
    const [bp, ba, bi, be] = r.buckets;
    const failureGiven = bi.total !== undefined || be.total !== undefined;
    const top = r.ranked[0], second = r.ranked[1];
    const sales = num(v, 'sales');
    const label = typeof v.period === 'string' && v.period.trim() ? v.period.trim() : 'the period';

    const spentIt = spentPhrase(r, true), spent = spentPhrase(r, false);
    const sentence = failureGiven && r.poor > 0 && top
      ? `Poor quality cost ${gbp(r.poor)} in the period${r.poorOfSales !== undefined ? ` (${pct(r.poorOfSales)} of sales)` : ''} — ${top.item.short} ${gbp(top.item.amount as number)} of it${second && (second.item.amount as number) > 0 ? `, then ${second.item.short} ${gbp(second.item.amount as number)}` : ''}${spentIt ? ` — against ${spentIt}` : ''}.`
      : failureGiven
        ? `No poor quality cost was counted in the period${spentIt ? `, against ${spentIt}` : ''}.`
        : `No failure cost was priced, so the cost of poor quality is not worked out yet${spent ? ` — ${spent} so far` : ''}.`;

    const more: string[] = [];
    if (failureGiven) {
      more.push(`The cost of quality, all four buckets, is ${gbp(r.total)}${r.totalOfSales !== undefined ? ` (${pct(r.totalOfSales)} of sales)` : ''}${r.failureShare !== undefined && r.poor > 0 ? `; failure is ${pct(r.failureShare, 0)} of it` : ''}.`);
      if (r.poorPerPack !== undefined) more.push(`That is ${pence(r.poorPerPack)} of poor quality in every pack made.`);
      if (r.ranked.length > 1 && r.poor > 0) more.push(`Failure ranked: ${r.ranked.map(x => `${cap(x.item.short)} ${gbp(x.item.amount as number)} (${pct(x.share, 0)})`).join(' · ')}.`);
    }
    if (r.unpricedCount > 0) more.push(`${r.unpricedCount} ${r.unpricedCount === 1 ? 'item was' : 'items were'} counted but not priced, so the figures are a floor.`);

    const bucketTile = (b: BucketTotal, better?: 'lower'): CalcTile => ({
      k: BUCKET_LABEL[b.bucket],
      v: b.total !== undefined ? gbp(b.total) : '—',
      of: b.total !== undefined ? (b.share !== undefined ? `${pct(b.share, 0)} of the cost of quality` : 'of the cost of quality') : b.given ? 'counted, not priced' : 'nothing given',
      ...(b.total !== undefined ? { n: b.total, fmt: gbp, ...(better ? { better } : {}) } : {}),
    });
    const tiles: CalcTile[] = [
      failureGiven ? { k: 'Poor quality', v: gbp(r.poor), of: 'internal + external failure', n: r.poor, better: 'lower', fmt: gbp } : { k: 'Poor quality', v: '—', of: 'give the failure costs' },
      bucketTile(bp), bucketTile(ba), bucketTile(bi, 'lower'), bucketTile(be, 'lower'),
      r.poorOfSales !== undefined
        ? { k: 'Of sales', v: pct(r.poorOfSales), of: `poor quality ÷ ${gbp(sales as number)} sales`, n: r.poorOfSales, better: 'lower', fmt: x => pct(x) }
        : { k: 'Of sales', v: '—', of: 'give the sales' },
    ];

    const word = (b: Bucket): string => BUCKET_LABEL[b].toLowerCase();
    const parts = r.buckets.filter(b => b.total !== undefined).map(b => `${word(b.bucket)} ${gbp(b.total as number)}`);
    const moneyText = `${cap(parts.join(' + '))}${parts.length > 1 ? ` = ${gbp(r.total)}` : ''} — each item priced from the hours, wage, materials and costs given.`;

    const working = [
      ...r.items.map(i => ({ label: i.label, value: i.amount !== undefined ? gbp(i.amount) : '—', note: `${BUCKET_LABEL[i.bucket]} · ${i.basis}` })),
      ...r.buckets.map(b => ({ label: BUCKET_LABEL[b.bucket], value: b.total !== undefined ? gbp(b.total) : '—', note: b.total !== undefined ? `${b.share !== undefined ? pct(b.share, 1) : ''} of the cost of quality`.trim() : b.given ? 'counted, not priced' : 'nothing given' })),
      { label: 'Poor quality', value: gbp(r.poor), note: 'internal failure + external failure' },
      { label: 'Cost of quality', value: gbp(r.total), note: 'all four buckets' },
    ];

    return {
      verdict: failureGiven ? `${gbp(r.poor)} poor quality` : `${gbp(r.spent)} spent on quality`,
      tone: 'n',
      sentence,
      ...(more.length ? { more } : {}),
      tiles,
      working,
      caveats: [
        'Only counted costs are in. No overhead is spread over a pack and no “hidden factory” multiplier is added — what is not counted is not zero, it is not here.',
        r.unpricedCount > 0
          ? `${r.unpricedCount} ${r.unpricedCount === 1 ? 'item is' : 'items are'} counted but not priced, so every total is a floor — give the missing cost named under “In money” to price ${r.unpricedCount === 1 ? 'it' : 'them'}.`
          : 'The total is only as good as the counting: a bucket filled by estimate becomes the number people argue about.',
        'A low figure can mean good quality or poor counting. The ranking and the trend carry the meaning, not the total.',
        'Cutting prevention to cut the “cost of quality” is the classic misread: the figure to move is failure.',
      ],
      money: {
        text: moneyText,
        figures: [...r.buckets.filter(b => b.total !== undefined).map(b => [BUCKET_LABEL[b.bucket], gbp(b.total as number)] as [string, string]), ['Poor quality', gbp(r.poor)], ['Cost of quality', gbp(r.total)]],
        missing: r.missing,
      },
      closing: failureGiven && r.poor > 0 && top
        ? `Chase ${top.item.short} first — ${pct(top.share, 0)} of the ${gbp(r.poor)} that poor quality cost ${label === 'the period' ? 'in the period' : label}. Save this period as the before, and the next will say whether it moved.`
        : 'Give the failure costs — scrap, rework, give-away, holds, complaints — to see where the money is; prevention and checking alone say what is spent, not what is lost.',
    };
  },
  examples: [
    {
      name: 'The record’s week: £17,000 of quality cost on £310,000 of sales',
      source: 'knowledge/methods/quality/copq.md worked case; scripts/knowledge/cases-quality.py quality.copq; scripts/knowledge/cases-calc.py Q1',
      inputs: { period: 'Week 42, Line 2', sales: 310000, packsMade: 155000, rate: 15, materials: 0.5, reworkCost: 1.4, complaintCost: 80,
        prevHours: 80, prevOther: 600, apprHours: 160, apprSamples: 1000, apprOther: 300,
        scrapPacks: 3400, reworkPacks: 2000, giveaway: 4100, holds: 800, complaints: 20, credits: 1000 },
      expect: {
        verdict: '£12,000 poor quality', tone: 'n',
        sentence: 'Poor quality cost £12,000 in the period (3.9% of sales) — give-away £4,100 of it, then rework £2,800 — against £1,800 spent preventing it and £3,200 checking for it.',
        tiles: { 'Poor quality': '£12,000', Prevention: '£1,800', Appraisal: '£3,200', 'Internal failure': '£9,400', 'External failure': '£2,600', 'Of sales': '3.9%' },
        money: 'Prevention £1,800 + appraisal £3,200 + internal failure £9,400 + external failure £2,600 = £17,000 — each item priced from the hours, wage, materials and costs given.',
      },
    },
    {
      name: 'A later week: prevention up, give-away cut, a quality stop typed, no sales given',
      source: 'by hand from the same rates (80 h → 120 h on prevention); scripts/knowledge/cases-calc.py Q2',
      inputs: { period: 'Week 46, Line 2', rate: 15, materials: 0.5, reworkCost: 1.4, complaintCost: 80,
        prevHours: 120, prevOther: 600, apprHours: 160, apprSamples: 1000, apprOther: 300,
        scrapPacks: 2000, reworkPacks: 1500, giveaway: 2400, holds: 500, stops: 300, complaints: 12, credits: 400 },
      expect: {
        verdict: '£7,660 poor quality', tone: 'n',
        sentence: 'Poor quality cost £7,660 in the period — give-away £2,400 of it, then rework £2,100 — against £2,400 spent preventing it and £3,200 checking for it.',
        tiles: { 'Poor quality': '£7,660', Prevention: '£2,400', Appraisal: '£3,200', 'Internal failure': '£6,300', 'External failure': '£1,360', 'Of sales': '—' },
        money: 'Prevention £2,400 + appraisal £3,200 + internal failure £6,300 + external failure £1,360 = £13,260 — each item priced from the hours, wage, materials and costs given.',
      },
    },
    {
      name: 'A line that only knows its scrap: complaints counted, not priced',
      source: 'by hand: 1,200 × 50p + £350 = £950; scripts/knowledge/cases-calc.py Q3',
      inputs: { materials: 0.5, scrapPacks: 1200, giveaway: 350, complaints: 4 },
      expect: {
        verdict: '£950.00 poor quality', tone: 'n',
        sentence: 'Poor quality cost £950.00 in the period — scrap £600.00 of it, then give-away £350.00.',
        tiles: { 'Poor quality': '£950.00', Prevention: '—', Appraisal: '—', 'Internal failure': '£950.00', 'External failure': '—', 'Of sales': '—' },
        money: 'Internal failure £950.00 — each item priced from the hours, wage, materials and costs given.',
      },
    },
  ],
  refused: [
    { name: 'nothing given', inputs: { period: 'Week 42' }, blocked: 'Give at least one cost' },
    { name: 'hours but no wage', inputs: { apprHours: 160 }, blocked: 'Give the line a wage' },
    { name: 'complaints counted, no cost of one', inputs: { complaints: 20 }, blocked: 'Give the cost of a complaint' },
    { name: 'a negative cost', inputs: { giveaway: -100, rate: 15 }, blocked: 'must be at least 0' },
  ],
  see: [{ key: 'cost-deployment', why: 'the same losses by equipment, for the project list' }],
};

export default def;
