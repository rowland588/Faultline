/* WHAT A SAMPLING PLAN PROTECTS — THE OC CURVE — FC-131 (knowledge/specs/FC-131-oc-curve.md;
 * knowledge/methods/quality/acceptance-sampling-attributes.md).
 *
 * A plan is a number to take (n) and a number of bad units that still accepts the lot (c). The operating-characteristic curve
 * says how often a lot is accepted at every true share of bad units: the binomial for a lot taken from a steady stream, the
 * hypergeometric for one lot of known size, whose bad units are whole (lib/ie/oc). Public mathematics — NO table of ISO 2859-1
 * or ANSI/ASQ Z1.4 is held, and a plan typed in from a contract is read, never named a standard's. The producer's risk (a good
 * lot turned away) and the consumer's (a bad lot accepted) are read off at the two points the person gives. The picture earns
 * its place: the curve IS the answer. FC-131 has no money of its own (knowledge/MONEY.md §4); what is shown is the labour of
 * inspecting, the one cost the plan sets. */
import { GRID, accepts, badIn, curve, niceTop, shareAt, type Plan } from '../../../lib/ie/oc';
import { fixed, fmt, gbp, pct } from '../format';
import type { CalcDef, CalcMoney, CalcPicture, Problem, Values } from '../types';

const num = (v: Values, id: string): number | undefined => v[id] as number | undefined;

const planOf = (v: Values): Plan => ({ n: num(v, 'n') as number, c: num(v, 'c') as number, ...(num(v, 'lot') !== undefined ? { lot: num(v, 'lot') as number } : {}) });

const def: CalcDef = {
  key: 'oc-curve',
  fc: 'FC-131',
  title: 'What a sampling plan protects',
  says: 'For a plan of n taken and c allowed, how often a lot is accepted at each share bad',
  question: 'For each true defect rate, how often does this plan accept a lot?',
  group: 'Quality sampling',
  inputs: [
    { id: 'n', label: 'Units taken from each lot', unit: 'units', kind: 'number', min: 1, integer: true, help: 'The sample, drawn at random across the whole lot — every layer, every pallet — or it is not a sample.' },
    { id: 'c', label: 'Accept if this many are bad, or fewer', unit: 'bad units', kind: 'number', min: 0, integer: true, help: 'The acceptance number from the plan — type it from your own copy of the contract or standard.' },
    { id: 'lot', label: 'Size of the lot', unit: 'units', kind: 'number', min: 1, integer: true, optional: true, help: 'Only for one lot of known size: its bad units are whole, so the small-lot arithmetic is used. Leave blank for a lot that is one of a steady stream.' },
    { id: 'aql', label: 'Quality you want accepted (the AQL)', unit: '% bad', kind: 'number', min: 0.001, max: 99, optional: true, help: 'The share bad you are happy to receive: 1 for one in a hundred. Gives the producer’s risk.' },
    { id: 'lq', label: 'Quality you will not accept (limiting quality)', unit: '% bad', kind: 'number', min: 0.001, max: 100, optional: true, help: 'A share bad that must almost never get through. Gives the consumer’s risk.' },
    { id: 'inspectSec', label: 'Seconds to inspect one unit', unit: 'seconds', kind: 'number', min: 0, optional: true, money: true, help: 'Timed at the bench, to say what inspecting a lot costs.' },
    { id: 'rate', label: 'Cost of a person an hour', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'Wage with on-costs; the line’s own can be used.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const n = num(v, 'n') as number, c = num(v, 'c') as number, lot = num(v, 'lot'), aql = num(v, 'aql'), lq = num(v, 'lq');
    if (lot !== undefined && n > lot) out.push({ field: 'n', say: `You cannot take ${fmt(n, 0)} units from a lot of ${fmt(lot, 0)}.`, block: true });
    if (aql !== undefined && lq !== undefined && aql >= lq) out.push({ field: 'lq', say: 'The quality you want accepted must be better — a smaller share bad — than the quality you will not accept.', block: true });
    if (out.some(p => p.block)) return out;
    if (c >= n) out.push({ field: 'c', say: `A plan that allows ${fmt(c, 0)} bad out of ${fmt(n, 0)} taken accepts every lot — it protects nothing.` });
    if (lot !== undefined) {
      if (aql !== undefined) {
        const d = badIn(lot, aql / 100);
        if (d <= c) out.push({ field: 'aql', say: `${fmt(aql, 2)}% of ${fmt(lot, 0)} is ${fmt(d, 0)} bad unit${d === 1 ? '' : 's'}, and the plan allows ${fmt(c, 0)}: a lot at your AQL can never be rejected. For a small lot, say how many bad units you will accept, not a percentage.` });
      }
      if (lq !== undefined) {
        const d = badIn(lot, lq / 100);
        if (d <= c) out.push({ field: 'lq', say: `${fmt(lq, 2)}% of ${fmt(lot, 0)} is ${fmt(d, 0)} bad unit${d === 1 ? '' : 's'}, and the plan allows ${fmt(c, 0)}: this plan can never reject a lot that bad.` });
      }
    }
    return out;
  },
  compute(v) {
    const plan = planOf(v);
    const { n, c, lot } = plan;
    const aql = num(v, 'aql'), lq = num(v, 'lq');
    const said = (p: number) => (lot !== undefined ? `${fmt(Math.round(p * lot), 0)} bad in ${fmt(lot, 0)} (${pct(p)})` : pct(p));
    const p95 = shareAt(plan, 0.95), p10 = shareAt(plan, 0.1);
    const aqlPa = aql !== undefined ? accepts(plan, aql / 100) : undefined, lqPa = lq !== undefined ? accepts(plan, lq / 100) : undefined;
    const alpha = aqlPa !== undefined ? 1 - aqlPa : undefined, beta = lqPa;

    const rule = c === 0 ? 'none are bad' : c === 1 ? '1 or fewer is bad' : `${fmt(c, 0)} or fewer are bad`;
    const head = `Take ${fmt(n, 0)} at random from the lot and accept it if ${rule}.`;
    const points: string[] = [];
    if (aql !== undefined) points.push(`a lot that is ${fmt(aql, 2)}% bad is accepted ${fixed((aqlPa as number) * 100, 1)} times in 100, so ${fixed((alpha as number) * 100, 1)} good lots in 100 are turned away (the producer’s risk)`);
    if (lq !== undefined) points.push(`a lot that is ${fmt(lq, 2)}% bad is accepted ${fixed((lqPa as number) * 100, 1)} times in 100 (the consumer’s risk)`);
    const sentence = points.length
      ? `${head} ${points.join('; ').replace(/^./, ch => ch.toUpperCase())}.`
      : `${head} A lot that is ${said(p95)} bad or better is accepted 95 times in 100; one that is ${said(p10)} bad is accepted only 10 times in 100.`;
    const more: string[] = [];
    if (points.length) more.push(`The curve: accepted 95 times in 100 when the lot is ${said(p95)} bad or better; only 10 times in 100 at ${said(p10)} bad (the limiting quality at a 10% risk).`);
    more.push(lot !== undefined
      ? `Worked as one lot of ${fmt(lot, 0)} with whole bad units (the hypergeometric)${n / lot > 0.1 ? ` — you take ${pct(n / lot, 0)} of it, so a stream’s binomial would overstate the acceptance` : ''}.`
      : 'Worked as a lot from a steady stream (the binomial). For one small lot of known size give its size.');

    const sec = num(v, 'inspectSec'), rate = num(v, 'rate');
    const missing: string[] = [];
    let money: CalcMoney;
    if (sec !== undefined) {
      const min = (n * sec) / 60;
      if (rate !== undefined) {
        const cost = (min / 60) * rate;
        money = { text: `Inspecting ${fmt(n, 0)} units takes about ${fmt(min, 1)} minutes — ${gbp(cost)} a lot at ${gbp(rate)} an hour — because ${fmt(n, 0)} are looked at in every lot, accepted or not.`, figures: [['Minutes a lot', fmt(min, 1)], ['Cost a lot', gbp(cost)]], missing };
      } else {
        missing.push('Give the cost of a person an hour (the line’s wage on its set-up, with on-costs) to say the inspection in money.');
        money = { text: `Inspecting ${fmt(n, 0)} units takes about ${fmt(min, 1)} minutes a lot.`, figures: [['Minutes a lot', fmt(min, 1)]], missing };
      }
    } else { missing.push('Give the seconds to inspect one unit to say what inspecting a lot costs.'); money = { missing }; }

    /* the curve, to a nice top that shows both ends */
    const xmax = niceTop(Math.max(p10 * 1.5, lq !== undefined ? (lq / 100) * 1.3 : 0, aql !== undefined ? (aql / 100) * 2 : 0, 0.02));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * xmax);
    const picture: CalcPicture = {
      title: `Chance of accepting a lot — take ${fmt(n, 0)}, accept on ${fmt(c, 0)}`,
      caption: 'Up: how often a lot is accepted. Across: the true share of bad units in the lot. Read the producer’s risk where the curve meets the AQL and the consumer’s where it meets the limiting quality.',
      x: { label: 'True share bad in the lot', min: 0, max: xmax, ticks, fmt: x => pct(x, xmax < 0.05 ? 1 : 0) },
      y: { label: 'Chance the lot is accepted', min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], fmt: y => pct(y, 0) },
      lines: [{ points: curve(plan, xmax, 80), mark: 'brand' }],
      verticals: [...(aql !== undefined ? [{ x: aql / 100, label: `AQL ${fmt(aql, 2)}%` }] : []), ...(lq !== undefined ? [{ x: lq / 100, label: `LQ ${fmt(lq, 2)}%` }] : [])],
      horizontals: [{ y: 0.95, label: '95 in 100' }, { y: 0.1, label: '10 in 100' }],
      dots: [...(aql !== undefined ? [{ x: aql / 100, y: aqlPa as number, label: `${fixed((aqlPa as number) * 100, 1)}% accepted` }] : []), ...(lq !== undefined ? [{ x: lq / 100, y: lqPa as number, label: `${fixed((lqPa as number) * 100, 1)}% accepted` }] : []),
        { x: p95, y: 0.95, label: '' }, { x: p10, y: 0.1, label: '' }],
    };

    const risky = (alpha !== undefined && alpha > 0.05) || (beta !== undefined && beta > 0.1);
    return {
      verdict: alpha !== undefined && beta !== undefined ? `Risks ${pct(alpha)} and ${pct(beta)}` : alpha !== undefined ? `Producer’s risk ${pct(alpha)}` : beta !== undefined ? `Consumer’s risk ${pct(beta)}` : `Take ${fmt(n, 0)}, accept on ${fmt(c, 0)}`,
      tone: risky ? 'a' : 'n',
      sentence,
      more,
      tiles: [
        alpha !== undefined ? { k: 'Good lots turned away', v: pct(alpha), of: `of lots ${fmt(aql as number, 2)}% bad`, n: alpha, better: 'lower', fmt: x => pct(x), ...(alpha > 0.05 ? { tone: 'a' as const } : {}) } : { k: 'Good lots turned away', v: '—', of: 'give the quality you want accepted' },
        beta !== undefined ? { k: 'Bad lots accepted', v: pct(beta), of: `of lots ${fmt(lq as number, 2)}% bad`, n: beta, better: 'lower', fmt: x => pct(x), ...(beta > 0.1 ? { tone: 'a' as const } : {}) } : { k: 'Bad lots accepted', v: '—', of: 'give the quality you will not accept' },
        { k: 'Accepted 95 in 100', v: pct(p95), of: lot !== undefined ? `bad or better · ${fmt(Math.round(p95 * lot), 0)} in ${fmt(lot, 0)}` : 'bad or better', n: p95, better: 'higher', fmt: x => pct(x) },
        { k: 'Accepted 10 in 100', v: pct(p10), of: lot !== undefined ? `bad · ${fmt(Math.round(p10 * lot), 0)} in ${fmt(lot, 0)} (limiting quality)` : 'bad (limiting quality)', n: p10, better: 'lower', fmt: x => pct(x) },
        sec !== undefined && rate !== undefined
          ? { k: 'Inspection a lot', v: gbp(((n * sec) / 3600) * rate), of: `${fmt((n * sec) / 60, 1)} minutes at ${gbp(rate)} an hour`, n: ((n * sec) / 3600) * rate, better: 'lower', fmt: gbp }
          : { k: 'Inspection a lot', v: '—', of: sec !== undefined ? 'give the cost of a person an hour' : 'give the seconds a unit' },
      ],
      working: [
        ...GRID.map(p => {
          const pa = accepts(plan, p);
          return { label: `${pct(p, 1)} bad${lot !== undefined ? ` · ${fmt(badIn(lot, p), 0)} in ${fmt(lot, 0)}` : ''}`, value: `accepted ${fixed(pa * 100, 1)} times in 100`, ...(p === GRID[0] ? { note: lot !== undefined ? 'Pa = P(X ≤ c), X hypergeometric' : 'Pa = P(X ≤ c), X binomial (n, p)' } : {}) };
        }),
        { label: 'Accepted 95 in 100 up to', value: said(p95) },
        { label: 'Accepted 10 in 100 at', value: said(p10), note: 'the limiting quality at a 10% consumer’s risk' },
      ],
      caveats: [
        'A plan decides lots at stated risks; it does not prove a lot good or bad. An accepted lot still holds bad units, and a rejected one is evidence, not proof.',
        'Faultline does not hold the tables of ISO 2859-1 or ANSI/ASQ Z1.4, and this is not one of their plans: it reads the n and c you type in and says what they protect.',
        'It assumes the bad units are scattered at random through the lot and the sample is drawn from all of it. A clustered fault (a roll of bad film) makes the real acceptance worse than the curve says.',
        'It assumes the inspectors agree on what a bad unit is. Where they may not, check that first.',
      ],
      money,
      picture,
      closing: `Take ${fmt(n, 0)}, accept on ${fmt(c, 0)}: it accepts a lot ${said(p95)} bad or better 95 times in 100, and lets one ${said(p10)} bad through 1 time in 10.${risky ? ' A risk is above the usual 5% and 10% — a looser or tighter plan changes it.' : ''}`,
    };
  },
  examples: [
    {
      name: 'A plan of 125, accept on 3, read at 1% and 6% (the knowledge record’s worked plan)',
      source: 'knowledge/methods/quality/acceptance-sampling-attributes.md; SciPy binom.cdf(3, 125, p); scripts/knowledge/cases-calc.py O1, O9',
      inputs: { n: 125, c: 3, aql: 1, lq: 6, inspectSec: 30, rate: 14.7 },
      expect: {
        verdict: 'Risks 3.7% and 5.4%', tone: 'n',
        sentence: 'Take 125 at random from the lot and accept it if 3 or fewer are bad. A lot that is 1% bad is accepted 96.3 times in 100, so 3.7 good lots in 100 are turned away (the producer’s risk); a lot that is 6% bad is accepted 5.4 times in 100 (the consumer’s risk).',
        tiles: { 'Good lots turned away': '3.7%', 'Bad lots accepted': '5.4%', 'Accepted 95 in 100': '1.1%', 'Accepted 10 in 100': '5.3%', 'Inspection a lot': '£15.31' },
        money: 'Inspecting 125 units takes about 62.5 minutes — £15.31 a lot at £14.70 an hour — because 125 are looked at in every lot, accepted or not.',
      },
    },
    {
      name: 'A plan of 50, accept on 1, with no points given',
      source: 'SciPy brentq on binom.cdf(1, 50, p) = 0.95 and 0.10; scripts/knowledge/cases-calc.py O2',
      inputs: { n: 50, c: 1 },
      expect: {
        verdict: 'Take 50, accept on 1', tone: 'n',
        sentence: 'Take 50 at random from the lot and accept it if 1 or fewer is bad. A lot that is 0.7% bad or better is accepted 95 times in 100; one that is 7.6% bad is accepted only 10 times in 100.',
        tiles: { 'Good lots turned away': '—', 'Bad lots accepted': '—', 'Accepted 95 in 100': '0.7%', 'Accepted 10 in 100': '7.6%', 'Inspection a lot': '—' },
      },
    },
    {
      name: 'One lot of 500 — whole bad units, the hypergeometric',
      source: 'SciPy hypergeom.cdf(2, 500, D, 83); scripts/knowledge/cases-calc.py O7',
      inputs: { n: 83, c: 2, lot: 500, aql: 1, lq: 6 },
      expect: {
        verdict: 'Risks 3.4% and 9.7%', tone: 'n',
        sentence: 'Take 83 at random from the lot and accept it if 2 or fewer are bad. A lot that is 1% bad is accepted 96.6 times in 100, so 3.4 good lots in 100 are turned away (the producer’s risk); a lot that is 6% bad is accepted 9.7 times in 100 (the consumer’s risk).',
        tiles: { 'Good lots turned away': '3.4%', 'Bad lots accepted': '9.7%', 'Accepted 95 in 100': '1.2%', 'Accepted 10 in 100': '6%', 'Inspection a lot': '—' },
      },
    },
    {
      name: 'A loose plan: the risk above the customary 5% is said in amber',
      source: 'SciPy: 1 − binom.cdf(2, 89, 0.01) = 6.03%; scripts/knowledge/cases-calc.py O4',
      inputs: { n: 89, c: 2, aql: 1, lq: 6 },
      expect: {
        verdict: 'Risks 6% and 9.2%', tone: 'a',
        sentence: 'Take 89 at random from the lot and accept it if 2 or fewer are bad. A lot that is 1% bad is accepted 94.0 times in 100, so 6.0 good lots in 100 are turned away (the producer’s risk); a lot that is 6% bad is accepted 9.2 times in 100 (the consumer’s risk).',
        tiles: { 'Good lots turned away': '6%', 'Bad lots accepted': '9.2%', 'Accepted 95 in 100': '0.9%', 'Accepted 10 in 100': '5.9%', 'Inspection a lot': '—' },
      },
    },
    {
      name: 'A small lot: 1% of 200 is 2 bad units and the plan allows 2 — a lot at the AQL can never be rejected',
      source: 'SciPy hypergeom.cdf(2, 200, 2, 76) = 1; the research record’s whole-unit trap; scripts/knowledge/cases-calc.py O6',
      inputs: { n: 76, c: 2, lot: 200, aql: 1 },
      expect: {
        verdict: 'Producer’s risk 0%', tone: 'n',
        sentence: 'Take 76 at random from the lot and accept it if 2 or fewer are bad. A lot that is 1% bad is accepted 100.0 times in 100, so 0.0 good lots in 100 are turned away (the producer’s risk).',
        tiles: { 'Good lots turned away': '0%', 'Bad lots accepted': '—', 'Accepted 95 in 100': '1.5%', 'Accepted 10 in 100': '6%', 'Inspection a lot': '—' },
        warns: ['is 2 bad units, and the plan allows 2: a lot at your AQL can never be rejected'],
      },
    },
  ],
  refused: [
    { name: 'more taken than the lot holds', inputs: { n: 300, c: 3, lot: 200 }, blocked: 'cannot take 300 units from a lot of 200' },
    { name: 'the AQL no better than the limiting quality', inputs: { n: 50, c: 1, aql: 6, lq: 1 }, blocked: 'must be better' },
    { name: 'half a unit taken', inputs: { n: 12.5, c: 1 }, blocked: 'must be a whole number' },
    { name: 'nothing taken', inputs: { n: 0, c: 0 }, blocked: 'must be at least 1' },
  ],
};

export default def;
