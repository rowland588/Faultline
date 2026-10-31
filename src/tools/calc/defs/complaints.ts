/* COMPLAINTS PER MILLION AND THEIR PARETO — FC-134 (knowledge/specs/FC-134-complaints.md; quality.complaints).
 *
 * One period on one line: the units sold, the complaints counted by kind. The rate a million units with its exact Poisson interval,
 * whether the period is unusual against the periods before (the u-chart's range) or different from the one before (the exact test of
 * two rates), the Pareto of the kinds, and the cost of the period's complaints when a cost is typed (external failure). Complaints
 * are counted by the customer and under-reported by a factor nobody knows: the rate compares like with like, it never says the true
 * defect rate — said in the caveats. The arithmetic is tools/complaints/complaints.ts, proved against SciPy. */
import { KINDS, MILLION, complaintCost, cpmu, pareto, ratesDiffer, usualRange } from '../../complaints/complaints';
import { fixed, fmt, gbp, plural } from '../format';
import type { CalcDef, CalcMoney, CalcPicture, CalcTile, Problem, Values } from '../types';

const num = (v: Values, id: string): number | undefined => {
  const x = v[id];
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
};

/** A rate a million, said: one decimal, two under 1, plain 0. */
const rate = (x: number): string => (x === 0 ? '0' : fixed(x, x < 1 ? 2 : 1));
/** Units, said: 1.25 million, 400,000. */
const unitsSaid = (n: number): string => (n >= MILLION ? `${fmt(n / MILLION, 2)} million` : fmt(n, 0));
/** A chance, said: 0.41, 0.019, < 0.001. */
const pSaid = (p: number): string => (p < 0.001 ? '< 0.001' : p < 0.01 ? fixed(p, 3) : fixed(p, 2));

const WIDE_BELOW = 20;
const SMALL_SALES = 100_000;

const kindFields = KINDS.map(k => ({
  id: k.id, label: k.label, unit: 'complaints', kind: 'number' as const, min: 0, integer: true, optional: true,
  help: k.id === 'foreign' ? 'Type 0 for a kind with none — at least one of the six must be typed. Code what the customer said.' : undefined,
}));

const countsOf = (v: Values) => KINDS.map(k => ({ ...k, count: num(v, k.id) ?? 0 }));
const typedAny = (v: Values): boolean => KINDS.some(k => num(v, k.id) !== undefined);

const pair = (v: Values, a: string, b: string): { c: number; n: number } | undefined => {
  const c = num(v, a), n = num(v, b);
  return c !== undefined && n !== undefined ? { c, n } : undefined;
};

const def: CalcDef = {
  key: 'complaints-per-million',
  fc: 'FC-134',
  title: 'Complaints per million units',
  says: 'The complaint rate a million units sold, how sure it is, and which kinds make most of it',
  question: 'Are complaints rising per million sold, and which kind are they?',
  group: 'Quality and complaints',
  inputs: [
    { id: 'period', label: 'Period', kind: 'text', optional: true, help: 'October, week 42 — names the sentence and the paper only.' },
    { id: 'units', label: 'Units sold or despatched in the period', unit: 'units', kind: 'number', min: 1, integer: true,
      help: 'The same product and period as the complaints — from despatch or the retailer’s volume report.' },
    ...kindFields,
    { id: 'usualC', label: 'Usual rate — complaints in the periods before', unit: 'complaints', kind: 'number', min: 0, integer: true, optional: true,
      help: 'The last twelve months, say, not counting this period. With the units below it gives the range this period should fall in.' },
    { id: 'usualN', label: 'Usual rate — units sold in those periods', unit: 'units', kind: 'number', min: 1, integer: true, optional: true },
    { id: 'beforeC', label: 'The period before — complaints', unit: 'complaints', kind: 'number', min: 0, integer: true, optional: true,
      help: 'Last month’s count, to say whether this one is really different.' },
    { id: 'beforeN', label: 'The period before — units sold', unit: 'units', kind: 'number', min: 1, integer: true, optional: true },
    { id: 'cost', label: 'Cost of one complaint', unit: '£ a complaint', kind: 'number', min: 0, optional: true, money: true,
      help: 'Handling, the retailer’s charge-back or credit, goodwill — from your own records. Every complaint is taken at this one cost.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    if (!typedAny(v)) out.push({ field: KINDS[0].id, say: 'Type how many complaints of each kind — 0 for none. A blank period is not the same as no complaints.', block: true });
    if (out.some(p => p.block)) return out;
    const n = num(v, 'units') as number;
    if (n < SMALL_SALES) out.push({ field: 'units', say: `On fewer than ${fmt(SMALL_SALES, 0)} units sold, one complaint moves the rate by more than ${fmt(MILLION / SMALL_SALES, 0)} a million — read the count, not the rate.` });
    if ((num(v, 'usualC') === undefined) !== (num(v, 'usualN') === undefined)) out.push({ field: num(v, 'usualC') === undefined ? 'usualC' : 'usualN', say: 'Give both the complaints and the units sold for the usual rate, or neither — the usual range is left out until both are given.' });
    if ((num(v, 'beforeC') === undefined) !== (num(v, 'beforeN') === undefined)) out.push({ field: num(v, 'beforeC') === undefined ? 'beforeC' : 'beforeN', say: 'Give both the complaints and the units sold for the period before, or neither — the comparison is left out until both are given.' });
    return out;
  },
  compute(v) {
    const N = num(v, 'units') as number;
    const counts = countsOf(v);
    const c = counts.reduce((s, k) => s + k.count, 0);
    const r = cpmu(c, N);
    const period = typeof v.period === 'string' && v.period.trim() ? v.period.trim() : '';
    const inPeriod = period ? ` in ${period}` : '';

    const usualP = pair(v, 'usualC', 'usualN');
    const range = usualP ? usualRange(usualP.c, usualP.n, N) : undefined;
    const beforeP = pair(v, 'beforeC', 'beforeN');
    const p = beforeP ? ratesDiffer(beforeP, { c, n: N }) : undefined;
    const beforeRate = beforeP ? (beforeP.c / beforeP.n) * MILLION : undefined;
    const higher = beforeRate !== undefined && r.perMillion > beforeRate;
    const differs = p !== undefined && p < 0.05;

    const above = range !== undefined && r.perMillion > range.ucl;
    const below = range !== undefined && range.lcl > 0 && r.perMillion < range.lcl;
    const tone: 'r' | 'a' | 'g' | 'n' = above ? 'r' : below ? 'g' : differs && !higher ? 'g' : differs && higher && !range ? 'a' : 'n';

    const rows = pareto(counts, N);

    /* the sentence */
    const head = c === 0
      ? `No complaints on ${unitsSaid(N)} units sold${inPeriod} — no more than ${rate(r.upper)} a million at 95%`
      : `${plural(c, 'complaint')} on ${unitsSaid(N)} units sold${inPeriod} — ${rate(r.perMillion)} a million, 95% confident ${rate(r.lo)}–${rate(r.hi)}`;
    const rangeClause = range ? `${above ? 'above' : below ? 'below' : 'inside'} the usual range of ${rate(range.lcl)}–${rate(range.ucl)} a million` : '';
    const beforeClause = p !== undefined && beforeRate !== undefined
      ? `${differs ? (higher ? 'shown higher than' : 'shown lower than') : 'not shown different from'} the period before (${rate(beforeRate)} a million, p = ${pSaid(p)})`
      : '';
    const sentence = `${[head, rangeClause, beforeClause].filter(Boolean).join('; ')}.`;

    /* what more is said */
    const more: string[] = [];
    if (rows.length === 1) more.push(`Every complaint is ${rows[0].label.toLowerCase()}.`);
    else if (rows.length >= 2) more.push(`${rows[0].label} and ${rows[1].label.toLowerCase()} are ${Math.round(rows[1].cum * 100)}% of the complaints.`);
    if (beforeP && p === undefined) more.push('No complaints in either period — there is nothing to compare.');
    if (c > 0 && c < WIDE_BELOW) more.push(`Only ${c} complaint${c === 1 ? '' : 's'}: the interval is wide and the order of the kinds can change next period — read them one by one before reacting to the rate.`);
    if (!range) more.push('Give the complaints and units of the periods before to say whether this period is outside the usual range.');
    if (!beforeP) more.push('Give the period before to say whether this one is really different from it.');

    /* money — external failure at the one typed cost */
    const cost = num(v, 'cost');
    let money: CalcMoney;
    if (cost !== undefined) {
      const m = complaintCost(c, N, cost);
      money = c === 0
        ? { text: 'No complaints, so no external failure cost this period.', figures: [['Cost this period', gbp(0)]], missing: [] }
        : {
          text: `The ${plural(c, 'complaint')} cost about ${gbp(m.total)} (${c} × ${gbp(cost)}) — ${gbp(m.perMillionUnits)} for every million units sold. That is external failure, the cost of quality that reaches the customer.`,
          figures: [['Cost this period', gbp(m.total)], ['For every million units sold', gbp(m.perMillionUnits)], ['A unit sold', `${fixed(m.perUnitPence, 4)}p`]],
          missing: [],
        };
    } else {
      money = { missing: ['Give the cost of a complaint (handling, credit or charge-back, goodwill) to say external failure in money.'] };
    }

    /* the Pareto picture: cumulative share by rank, each point labelled — only when there is an order to show */
    const picture: CalcPicture | undefined = rows.length >= 2
      ? {
        title: 'Complaints by kind, most first',
        caption: `Left to right: ${rows.map(x => `${x.label.toLowerCase()} ${x.count}`).join(', ')}. Up: the share of all the complaints, added as you go.`,
        x: { label: 'Kinds, most complaints first', min: 0, max: rows.length, ticks: rows.map((_, i) => i + 1), fmt: x => `${x}` },
        y: { label: 'Share of the complaints', min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], fmt: y => `${Math.round(y * 100)}%` },
        lines: [{ points: [[0, 0], ...rows.map((x, i) => [i + 1, x.cum] as [number, number])], mark: 'brand' }],
        verticals: [],
        horizontals: [],
        dots: rows.map((x, i) => ({ x: i + 1, y: x.cum, label: `${Math.round(x.cum * 100)}%` })),
      }
      : undefined;

    const top = rows[0];
    const tiles: CalcTile[] = [
      { k: 'A million', v: rate(r.perMillion), of: c === 0 ? `at most ${rate(r.upper)} (95%)` : `95%: ${rate(r.lo)}–${rate(r.hi)}`, n: r.perMillion, better: 'lower', fmt: x => `${rate(x)} a million`, ...(tone !== 'n' ? { tone } : {}) },
      { k: 'Complaints', v: fmt(c, 0), of: `on ${unitsSaid(N)} units`, n: c, better: 'lower', counted: true, fmt: x => plural(x, 'complaint') },
      range
        ? { k: 'Usual range', v: `${rate(range.lcl)}–${rate(range.ucl)}`, of: `around ${rate(range.usual)} a million`, ...(above ? { tone: 'r' as const } : {}) }
        : { k: 'Usual range', v: '—', of: 'give the periods before' },
      p !== undefined
        ? { k: 'Against before', v: `p = ${pSaid(p)}`, of: differs ? (higher ? 'shown higher' : 'shown lower') : 'not shown different', ...(differs ? { tone: higher ? ('a' as const) : ('g' as const) } : {}) }
        : { k: 'Against before', v: '—', of: beforeP ? 'none in either period' : 'give the period before' },
      top
        ? { k: 'Most of them', v: top.label, of: `${Math.round(top.share * 100)}% of the complaints` }
        : { k: 'Most of them', v: '—', of: 'none received' },
      cost !== undefined
        ? { k: 'Cost', v: gbp(complaintCost(c, N, cost).total), of: `${gbp(complaintCost(c, N, cost).perMillionUnits)} a million units`, n: complaintCost(c, N, cost).total, better: 'lower', fmt: gbp }
        : { k: 'Cost', v: '—', of: 'give the cost of a complaint' },
    ];

    const working = [
      { label: 'Rate', value: `${c} ÷ ${fmt(N, 0)} × 1,000,000 = ${rate(r.perMillion)} a million`, note: 'complaints ÷ units × 10⁶' },
      c === 0
        ? { label: 'The most it could be', value: `${rate(r.upper)} a million (95%, one side)`, note: 'χ²(0.95; 2) ÷ 2N — about 3 ÷ N, the rule of three' }
        : { label: 'Interval, 95% exact', value: `${rate(r.lo)} to ${rate(r.hi)} a million`, note: 'Poisson: χ²(0.025; 2c) and χ²(0.975; 2c + 2), each ÷ 2N' },
      ...(range && usualP ? [
        { label: 'Usual rate', value: `${fmt(usualP.c, 0)} ÷ ${fmt(usualP.n, 0)} × 1,000,000 = ${rate(range.usual)} a million` },
        { label: 'Range for this period', value: `${rate(range.lcl)} to ${rate(range.ucl)} a million`, note: 'ū ± 3√(ū ÷ millions of units), the lower cut at 0' },
      ] : []),
      ...(beforeP && beforeRate !== undefined ? [
        { label: 'The period before', value: `${fmt(beforeP.c, 0)} on ${fmt(beforeP.n, 0)} units = ${rate(beforeRate)} a million` },
        ...(p !== undefined ? [{ label: 'Chance of a gap this big if the rate were the same', value: `p = ${pSaid(p)}`, note: `exact: the earlier ${beforeP.c} of ${beforeP.c + c} complaints against ${fixed((beforeP.n / (beforeP.n + N)) * 100, 1)}% by units` }] : []),
      ] : []),
      ...rows.map((x, i) => ({ label: x.label, value: `${x.count} · ${Math.round(x.share * 100)}% · added up ${Math.round(x.cum * 100)}% · ${rate(x.perMillion)} a million`, ...(i === 0 ? { note: 'the Pareto, most first' } : {}) })),
    ];

    return {
      verdict: `${rate(r.perMillion)} a million`,
      tone,
      sentence,
      more,
      tiles,
      working,
      caveats: [
        'Complaints under-report by a factor nobody knows — most people throw the pack away. The rate compares like with like over time; it never says the true defect rate.',
        'It is the period the complaints arrived, not the week the product was made, so a fix shows late; match by date code before judging one.',
        'The interval assumes complaints arrive one at a time and independently. Several from one bad batch are one cause, not many.',
        'Kinds coded loosely are no use: count what the customer said. One cost is taken for every complaint, so the Pareto is by number, not by money.',
      ],
      money,
      ...(picture ? { picture } : {}),
      closing: `${c === 0 ? 'No complaints' : `${rate(r.perMillion)} a million (${rate(r.lo)}–${rate(r.hi)})`}${range ? ` — ${above ? 'above' : below ? 'below' : 'inside'} the usual range` : ''}${top ? `; look at ${top.label.toLowerCase()} first` : ''}${c > 0 ? ' and read the complaints one by one.' : '.'}`,
    };
  },
  examples: [
    {
      name: 'October: inside the usual range, not shown different from last month',
      source: 'knowledge/methods/quality/complaints.md worked case; scripts/knowledge/cases-complaints.py (SciPy): 12 on 1.25 M → 9.6 (4.9605–16.7693); 106 on 14.4 M → 7.3611, range 0.0810–14.6412; p = 0.4083',
      inputs: { period: 'October', units: 1250000, foreign: 5, packaging: 3, taste: 2, quantity: 1, labelling: 1, other: 0, usualC: 106, usualN: 14400000, beforeC: 7, beforeN: 1200000, cost: 85 },
      expect: {
        verdict: '9.6 a million',
        tone: 'n',
        sentence: '12 complaints on 1.25 million units sold in October — 9.6 a million, 95% confident 5.0–16.8; inside the usual range of 0.08–14.6 a million; not shown different from the period before (5.8 a million, p = 0.41).',
        tiles: { 'A million': '9.6', Complaints: '12', 'Usual range': '0.08–14.6', 'Against before': 'p = 0.41', 'Most of them': 'Foreign body', Cost: '£1,020' },
        money: 'The 12 complaints cost about £1,020 (12 × £85.00) — £816.00 for every million units sold. That is external failure, the cost of quality that reaches the customer.',
      },
    },
    {
      name: 'The month before: 7 on 1.2 million, nothing else given',
      source: 'cases-complaints.py (SciPy): 7 on 1.2 M → 5.8333 (2.3453–12.0189); Pareto 3 · 2 · 1 · 1, top two 5 of 7 = 71%',
      inputs: { units: 1200000, foreign: 3, packaging: 2, taste: 1, labelling: 1 },
      expect: {
        verdict: '5.8 a million',
        tone: 'n',
        sentence: '7 complaints on 1.2 million units sold — 5.8 a million, 95% confident 2.3–12.0.',
        tiles: { 'A million': '5.8', Complaints: '7', 'Usual range': '—', 'Against before': '—', 'Most of them': 'Foreign body' },
      },
    },
    {
      name: 'A month above the usual range, shown higher than last month',
      source: 'cases-complaints.py (SciPy): 20 on 1.2 M → 16.6667 (10.1804–25.7403); range 0–14.7913; against 7 on 1.2 M p = 0.01916',
      inputs: { period: 'November', units: 1200000, foreign: 12, packaging: 4, taste: 2, quantity: 1, other: 1, usualC: 106, usualN: 14400000, beforeC: 7, beforeN: 1200000 },
      expect: {
        verdict: '16.7 a million',
        tone: 'r',
        sentence: '20 complaints on 1.2 million units sold in November — 16.7 a million, 95% confident 10.2–25.7; above the usual range of 0–14.8 a million; shown higher than the period before (5.8 a million, p = 0.02).',
        tiles: { 'A million': '16.7', 'Usual range': '0–14.8', 'Against before': 'p = 0.02', 'Most of them': 'Foreign body' },
      },
    },
    {
      name: 'A launch month: 3 on 400,000, shown lower than a bad month before',
      source: 'cases-complaints.py (SciPy): 3 on 0.4 M → 7.5 (1.5467–21.9182); against 30 on 1.2 M (25 a million) p = 0.0411; range 0–20.2306',
      inputs: { units: 400000, foreign: 1, packaging: 1, quantity: 1, usualC: 106, usualN: 14400000, beforeC: 30, beforeN: 1200000 },
      expect: {
        verdict: '7.5 a million',
        tone: 'g',
        sentence: '3 complaints on 400,000 units sold — 7.5 a million, 95% confident 1.5–21.9; inside the usual range of 0–20.2 a million; shown lower than the period before (25.0 a million, p = 0.04).',
        tiles: { 'A million': '7.5', 'Against before': 'p = 0.04', 'Most of them': 'Foreign body' },
      },
    },
    {
      name: 'Nothing received on a million units',
      source: 'cases-complaints.py (SciPy): 0 on 1 M → at most 2.9957 a million (one-sided 95%); range 0–15.5005',
      inputs: { period: 'Week 42', units: 1000000, foreign: 0, packaging: 0, taste: 0, quantity: 0, labelling: 0, other: 0, usualC: 106, usualN: 14400000, cost: 85 },
      expect: {
        verdict: '0 a million',
        tone: 'n',
        sentence: 'No complaints on 1 million units sold in Week 42 — no more than 3.0 a million at 95%; inside the usual range of 0–15.5 a million.',
        tiles: { 'A million': '0', Complaints: '0', 'Most of them': '—', Cost: '£0.00' },
        money: 'No complaints, so no external failure cost this period.',
      },
    },
    {
      name: 'A tiny sale: one complaint on 50,000 units is a warning, not a verdict',
      source: 'cases-complaints.py (SciPy): 1 on 50,000 → 20.0 (0.5064–111.4329)',
      inputs: { units: 50000, taste: 1 },
      expect: {
        verdict: '20.0 a million',
        tone: 'n',
        sentence: '1 complaint on 50,000 units sold — 20.0 a million, 95% confident 0.51–111.4.',
        tiles: { 'A million': '20.0', Complaints: '1', 'Most of them': 'Taste, smell or condition' },
        warns: ['fewer than 100,000 units'],
      },
    },
  ],
  refused: [
    { name: 'no units', inputs: { foreign: 3 }, blocked: 'Units sold or despatched' },
    { name: 'no kind typed', inputs: { units: 1000000 }, blocked: 'Type how many complaints of each kind' },
    { name: 'half a complaint', inputs: { units: 1000000, foreign: 2.5 }, blocked: 'must be a whole number' },
    { name: 'a negative count', inputs: { units: 1000000, foreign: -1 }, blocked: 'must be at least' },
    { name: 'no units sold', inputs: { units: 0, foreign: 1 }, blocked: 'must be at least' },
  ],
};

export default def;
