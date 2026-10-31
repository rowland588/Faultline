/* WHAT AN IMPROVEMENT IS WORTH — PAYBACK AND NPV — FC-191 (knowledge/specs/FC-191-payback-npv.md; knowledge/methods/cost/investment-appraisal.md).
 *
 * A one-off cost against a constant saving a week: payback in running weeks, NPV at the business's own rate over a life in whole years,
 * the IRR and the return a year (the simple ROI), with the record's two checks (the saving halved; the cost up a quarter). The saving is
 * typed, or built from a loss and the share a fix recovers, or from hours saved at the line's wage. Money IS the finding: the cost, the
 * rate and the life are the business's own and are never filled in; a missing one is named and nothing waits on it. Red only by
 * arithmetic (an NPV below zero, a payback longer than the life), never green. */
import { costUp, figures, fromHours, fromShare, halved, annuity, type Case, type Figures } from '../../investment/investment';
import { fmt, gbp, pct } from '../format';
import type { CalcDef, CalcTile, Problem, Values } from '../types';

const num = (v: Values, id: string): number | undefined => (typeof v[id] === 'number' ? (v[id] as number) : undefined);
const years = (n: number): string => `${fmt(n, 0)} year${n === 1 ? '' : 's'}`;
const weeksWords = (w: number): string => `${fmt(w, 1)} weeks`;
const irrWords = (r: number): string => (r > 10 ? 'over 1,000%' : pct(r, 0));

/** The saving a week as the person knows it, and how it was made. */
function savingOf(v: Values): { weekly: number; how: string; of: string } {
  const how = v.how as string;
  if (how === 'share') {
    const loss = num(v, 'loss') as number, share = num(v, 'share') as number;
    return { weekly: fromShare(loss, share), how: `${gbp(loss)} × ${fmt(share, 1)}% = ${gbp(fromShare(loss, share))}`, of: `${fmt(share, 1)}% of ${gbp(loss)} a week` };
  }
  if (how === 'hours') {
    const h = num(v, 'hours') as number, r = num(v, 'rate') as number;
    return { weekly: fromHours(h, r), how: `${fmt(h, 2)} hours × ${gbp(r)} an hour = ${gbp(fromHours(h, r))}`, of: `${fmt(h, 1)} hours × ${gbp(r)}` };
  }
  const s = num(v, 'saving') as number;
  return { weekly: s, how: `${gbp(s)} typed`, of: 'typed' };
}

const caseOf = (v: Values, weekly: number): Case => ({
  weekly,
  ...(num(v, 'cost') !== undefined ? { cost: num(v, 'cost') as number } : {}),
  ...(num(v, 'weeks') !== undefined ? { weeks: num(v, 'weeks') as number } : {}),
  ...(num(v, 'life') !== undefined ? { life: num(v, 'life') as number } : {}),
  ...(num(v, 'discount') !== undefined ? { rate: (num(v, 'discount') as number) / 100 } : {}),
});

const def: CalcDef = {
  key: 'payback-npv',
  fc: 'FC-191',
  title: 'What an improvement is worth',
  says: 'Payback, net present value and return on a spend — from a saving a tool measured',
  question: 'Does this spend pay for itself, and how soon?',
  group: 'Cost and payback',
  inputs: [
    { id: 'how', label: 'How the saving is known', kind: 'choice', default: 'typed',
      options: [
        { value: 'typed', label: 'I know the saving a week', help: 'from the tool that measured it' },
        { value: 'share', label: 'A loss and the share the fix recovers', help: 'the way SMED or the loss count says it' },
        { value: 'hours', label: 'Hours saved at the wage', help: 'labour time given back' },
      ] },
    { id: 'thing', label: 'What is being bought', kind: 'text', optional: true, help: 'A splice table, a SMED kit — it only names the sentence.' },
    { id: 'saving', label: 'Saving a week', unit: '£ a week', kind: 'number', min: 0.000001, showIf: v => v.how === 'typed', help: 'What the fix gives back each week the line runs — from the tool that measured the loss, in pounds.' },
    { id: 'loss', label: 'The loss now', unit: '£ a week', kind: 'number', min: 0.000001, showIf: v => v.how === 'share', help: 'What the problem costs a week today, from the tool that measured it.' },
    { id: 'share', label: 'Share the fix recovers', unit: '%', kind: 'number', min: 0.000001, max: 100, showIf: v => v.how === 'share', help: 'How much of that loss it should give back.' },
    { id: 'hours', label: 'Hours saved a week', unit: 'hours', kind: 'number', min: 0.000001, showIf: v => v.how === 'hours', help: 'Labour time the fix gives back, from the study that timed it.' },
    { id: 'rate', label: 'One person’s cost an hour', unit: '£ an hour', kind: 'number', min: 0.000001, showIf: v => v.how === 'hours',
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'The wage with on-costs.' },
    { id: 'weeks', label: 'Weeks a year the line runs', unit: 'weeks', kind: 'number', min: 1, max: 52, optional: true, help: 'Asked, never assumed: 48, 50 or 52 change the year.' },
    { id: 'life', label: 'Years the saving is counted for', unit: 'years', kind: 'number', min: 1, max: 50, integer: true, optional: true, help: 'The machine’s life or the business’s policy — three to five years is usual.' },
    { id: 'cost', label: 'The investment — what it costs once', unit: '£', kind: 'number', min: 0.000001, optional: true, money: true, help: 'Price, fitting, training and any production lost to fit it.' },
    { id: 'discount', label: 'The business’s discount rate', unit: '% a year', kind: 'number', min: 0, max: 1000, optional: true, money: true, help: 'Finance will have it — Faultline never fills it in.' },
  ],
  check(v): Problem[] {
    const d = num(v, 'discount');
    if (d !== undefined && d > 100) return [{ field: 'discount', say: 'A discount rate over 100% a year is unusual — check it is a percentage (10 for 10%).' }];
    if (d !== undefined && d > 0 && d < 1) return [{ field: 'discount', say: `A discount rate of ${fmt(d, 2)}% a year is very low — type 10 for 10%.` }];
    return [];
  },
  compute(v) {
    const s = savingOf(v);
    const c = caseOf(v, s.weekly);
    const f = figures(c);
    const cost = c.cost, weeks = c.weeks, life = c.life, rate = c.rate;
    const subject = typeof v.thing === 'string' && v.thing.trim() ? `The ${v.thing.trim()}` : 'The spend';
    const longer = f.paybackOfLife !== undefined && f.paybackOfLife > 1;
    const negative = f.npv !== undefined && f.npv < 0;

    let sentence: string;
    if (cost === undefined || f.paybackWeeks === undefined) {
      sentence = `${subject} saves ${gbp(s.weekly)} a week${f.annual !== undefined ? ` — ${gbp(f.annual)} a year of ${fmt(weeks as number, 0)} running weeks` : ''}; with the investment’s cost it can be said how soon it pays back.`;
    } else {
      sentence = `${subject} — ${gbp(cost)} to save ${gbp(s.weekly)} a week — pays back in ${weeksWords(f.paybackWeeks)} of running${weeks !== undefined ? ` (${fmt(f.paybackWeeks / weeks, 2)} of a running year)` : ''}`;
      if (longer) sentence += ` — longer than the ${years(life as number)} it is counted for`;
      if (f.npv !== undefined) sentence += `; over ${years(life as number)} at ${fmt((rate as number) * 100, 1)}% it is worth ${gbp(Math.abs(f.npv))} ${f.npv >= 0 ? 'more' : 'less'} than the money would earn (NPV)`;
      if (f.returnYear !== undefined) sentence += `${f.npv !== undefined ? ', ' : '; '}a return of ${pct(f.returnYear, 0)} a year`;
      sentence += '.';
    }

    const more: string[] = [];
    if (f.irr !== undefined) more.push(`The internal rate of return is ${irrWords(f.irr)} — the rate at which the NPV is zero; set it against the business’s hurdle rate.`);
    const check = (label: string, g: Figures, w: number, spend: number | undefined): string | undefined => {
      if (g.paybackWeeks === undefined) return undefined;
      const end = g.npv !== undefined ? `, NPV ${gbp(g.npv)}${g.npv >= 0 ? ' — it still pays' : ' — it no longer pays'}` : '';
      return `${label} (${spend !== undefined && label.includes('cost') ? gbp(spend) : `${gbp(w)} a week`}): pays back in ${weeksWords(g.paybackWeeks)}${end}.`;
    };
    const h = check('With the saving halved', halved(c), s.weekly / 2, cost);
    const u = check('With the cost up a quarter', costUp(c), s.weekly, cost !== undefined ? cost * 1.25 : undefined);
    if (h) more.push(h);
    if (u) more.push(u);
    more.push('The saving is expected until the tool that measured the loss measures it again after the spend.');

    const missing: string[] = [];
    if (cost === undefined) missing.push('Give the investment’s cost to say its payback.');
    if (weeks === undefined) missing.push('Give the weeks a year the line runs to say the saving a year, the return and the NPV.');
    if (life === undefined) missing.push('Give the years the saving is counted for to say the NPV and the IRR.');
    if (rate === undefined) missing.push('Give the business’s discount rate to say the NPV.');

    const tiles: CalcTile[] = [
      f.paybackWeeks !== undefined
        ? { k: 'Payback', v: weeksWords(f.paybackWeeks), of: 'of running, cost ÷ saving a week', n: f.paybackWeeks, better: 'lower', fmt: weeksWords, ...(longer ? { tone: 'r' as const } : {}) }
        : { k: 'Payback', v: '—', of: 'give the investment’s cost' },
      { k: 'Saving a week', v: gbp(s.weekly), of: s.of, n: s.weekly, better: 'higher', fmt: gbp },
      f.npv !== undefined
        ? { k: 'NPV', v: gbp(f.npv), of: `at ${fmt((rate as number) * 100, 1)}% over ${years(life as number)}`, n: f.npv, better: 'higher', fmt: gbp, ...(negative ? { tone: 'r' as const } : {}) }
        : { k: 'NPV', v: '—', of: cost === undefined ? 'give the cost, weeks, life and rate' : weeks === undefined ? 'give the weeks a year' : life === undefined ? 'give the years counted' : 'give the discount rate' },
      f.returnYear !== undefined
        ? { k: 'Return a year', v: pct(f.returnYear, 0), of: 'saving a year ÷ the cost', n: f.returnYear, better: 'higher', fmt: x => pct(x, 0) }
        : { k: 'Return a year', v: '—', of: 'needs the cost and the weeks a year' },
      f.irr !== undefined
        ? { k: 'IRR', v: irrWords(f.irr), of: 'the rate where NPV is zero', n: f.irr, better: 'higher', fmt: x => pct(x, 0) }
        : { k: 'IRR', v: '—', of: 'needs the cost, weeks and life' },
      cost !== undefined
        ? { k: 'Spend', v: gbp(cost), of: 'once', n: cost, better: 'lower', fmt: gbp }
        : { k: 'Spend', v: '—', of: 'give the investment’s cost' },
    ];

    const working: { label: string; value: string; note?: string }[] = [
      { label: 'Saving a week', value: s.how, note: v.how === 'typed' ? 'from the tool that measured it' : undefined },
      ...(f.annual !== undefined ? [{ label: 'Saving a year', value: `${gbp(s.weekly)} × ${fmt(weeks as number, 0)} weeks = ${gbp(f.annual)}` }] : []),
      ...(f.paybackWeeks !== undefined ? [{ label: 'Payback', value: `${gbp(cost as number)} ÷ ${gbp(s.weekly)} = ${fmt(f.paybackWeeks, 2)} running weeks`, note: 'cost ÷ saving a week' }] : []),
      ...(f.npv !== undefined ? [
        { label: 'Years’ worth of one pound a year', value: `(1 − (1 + ${fmt((rate as number) * 100, 1)}%)^−${life}) ÷ ${fmt((rate as number) * 100, 1)}% = ${fmt(annuity(rate as number, life as number), 4)}`, note: 'the annuity factor' },
        { label: 'NPV', value: `${gbp(f.annual as number)} × ${fmt(annuity(rate as number, life as number), 4)} − ${gbp(cost as number)} = ${gbp(f.npv)}`, note: 'each year’s saving at its year end, the cost now' },
      ] : []),
      ...(f.irr !== undefined ? [{ label: 'IRR', value: irrWords(f.irr), note: 'the rate at which the NPV is zero, found by halving the range' }] : []),
      ...(f.returnYear !== undefined ? [{ label: 'Return a year', value: `${gbp(f.annual as number)} ÷ ${gbp(cost as number)} = ${pct(f.returnYear, 0)}`, note: 'the simple return on the spend' }] : []),
    ];

    const moneyText = cost !== undefined
      ? `Spend ${gbp(cost)} against a saving of ${gbp(s.weekly)} a week${f.annual !== undefined ? ` (${gbp(f.annual)} a year)` : ''}${f.npv !== undefined ? ` — NPV ${gbp(f.npv)} at ${fmt((rate as number) * 100, 1)}% over ${years(life as number)}` : ''}.`
      : `Saving ${gbp(s.weekly)} a week${f.annual !== undefined ? ` (${gbp(f.annual)} a year)` : ''} — no investment given to set it against.`;

    return {
      verdict: f.paybackWeeks !== undefined ? `${weeksWords(f.paybackWeeks)} to pay back` : `${gbp(s.weekly)} a week saved`,
      tone: negative || longer ? 'r' : 'n',
      sentence,
      more,
      tiles,
      working,
      caveats: [
        'Payback ignores the time value of money and everything after it; NPV is the decision figure where lives differ, and it is only as good as the saving.',
        'The saving is expected, not banked, until the tool that measured the loss measures it again after the spend.',
        'The discount rate and the years are the business’s policy, not Faultline’s: change them and the NPV and IRR move.',
        'The saving is taken as constant and the cost as all up front, with each year’s saving at its year end. Savings in lost time away from the bottleneck are labour, not contribution.',
      ],
      money: {
        text: moneyText,
        figures: [
          ['Saving a week', gbp(s.weekly)],
          ...(f.annual !== undefined ? [['Saving a year', gbp(f.annual)] as [string, string]] : []),
          ...(cost !== undefined ? [['Spend', gbp(cost)] as [string, string]] : []),
          ...(f.npv !== undefined ? [['NPV', gbp(f.npv)] as [string, string]] : []),
        ],
        missing,
      },
      closing: f.paybackWeeks !== undefined
        ? `${weeksWords(f.paybackWeeks)} of running to pay back ${gbp(cost as number)}${f.npv !== undefined ? negative ? `, and worth ${gbp(Math.abs(f.npv))} less than the money would earn` : `, and worth ${gbp(f.npv)} more than the money would earn` : ''}. Book the saving only when the loss is measured again after the spend.`
        : `Saving ${gbp(s.weekly)} a week. Give the investment’s cost and this says how soon it pays back, and whether it is worth doing.`,
    };
  },
  examples: [
    {
      name: 'The record’s SMED kit: £28,000 against 60% of a £1,900 changeover loss',
      source: 'knowledge/methods/cost/investment-appraisal.md worked case (£179,400, 195%); scripts/knowledge/cases-calc.py I1',
      inputs: { how: 'share', thing: 'SMED kit', loss: 1900, share: 60, weeks: 48, life: 5, cost: 28000, discount: 10 },
      expect: {
        verdict: '24.6 weeks to pay back', tone: 'n',
        sentence: 'The SMED kit — £28,000 to save £1,140 a week — pays back in 24.6 weeks of running (0.51 of a running year); over 5 years at 10% it is worth £179,432 more than the money would earn (NPV), a return of 195% a year.',
        tiles: { Payback: '24.6 weeks', 'Saving a week': '£1,140', NPV: '£179,432', 'Return a year': '195%', IRR: '195%', Spend: '£28,000' },
        money: 'Spend £28,000 against a saving of £1,140 a week (£54,720 a year) — NPV £179,432 at 10% over 5 years.',
      },
    },
    {
      name: 'A £4,800 splice table saving £310 a week',
      source: 'the catalogue’s example; scripts/knowledge/cases-calc.py I2 (SciPy brentq, the polynomial’s roots)',
      inputs: { how: 'typed', thing: 'splice table', saving: 310, weeks: 48, life: 3, cost: 4800, discount: 10 },
      expect: {
        verdict: '15.5 weeks to pay back', tone: 'n',
        sentence: 'The splice table — £4,800 to save £310.00 a week — pays back in 15.5 weeks of running (0.32 of a running year); over 3 years at 10% it is worth £32,204 more than the money would earn (NPV), a return of 310% a year.',
        tiles: { Payback: '15.5 weeks', 'Saving a week': '£310.00', NPV: '£32,204', 'Return a year': '310%', IRR: '305%', Spend: '£4,800' },
        money: 'Spend £4,800 against a saving of £310.00 a week (£14,880 a year) — NPV £32,204 at 10% over 3 years.',
      },
    },
    {
      name: 'A saving in hours, no investment given yet',
      source: 'by hand: 6 hours × £14.70 = £88.20 a week; × 48 weeks = £4,233.60; scripts/knowledge/cases-calc.py I4',
      inputs: { how: 'hours', hours: 6, rate: 14.7, weeks: 48 },
      expect: {
        verdict: '£88.20 a week saved', tone: 'n',
        sentence: 'The spend saves £88.20 a week — £4,234 a year of 48 running weeks; with the investment’s cost it can be said how soon it pays back.',
        tiles: { Payback: '—', 'Saving a week': '£88.20', NPV: '—', 'Return a year': '—', IRR: '—', Spend: '—' },
        money: 'Saving £88.20 a week (£4,234 a year) — no investment given to set it against.',
      },
    },
    {
      name: 'A spend that does not pay: £30,000 for £200 a week over 3 years',
      source: 'by hand and SciPy: payback 150 weeks against 144 running weeks, NPV −£6,126.22; scripts/knowledge/cases-calc.py I3',
      inputs: { how: 'typed', thing: 'accumulation table', saving: 200, weeks: 48, life: 3, cost: 30000, discount: 10 },
      expect: {
        verdict: '150 weeks to pay back', tone: 'r',
        sentence: 'The accumulation table — £30,000 to save £200.00 a week — pays back in 150 weeks of running (3.13 of a running year) — longer than the 3 years it is counted for; over 3 years at 10% it is worth £6,126 less than the money would earn (NPV), a return of 32% a year.',
        tiles: { Payback: '150 weeks', 'Saving a week': '£200.00', NPV: '-£6,126', 'Return a year': '32%', IRR: '-2%', Spend: '£30,000' },
        money: 'Spend £30,000 against a saving of £200.00 a week (£9,600 a year) — NPV -£6,126 at 10% over 3 years.',
      },
    },
  ],
  refused: [
    { name: 'no saving given', inputs: { how: 'typed', cost: 4800 }, blocked: 'Give “Saving a week”' },
    { name: 'a loss with no share', inputs: { how: 'share', loss: 1900 }, blocked: 'Give “Share the fix recovers”' },
    { name: 'hours with no wage', inputs: { how: 'hours', hours: 6 }, blocked: 'Give “One person’s cost an hour”' },
    { name: 'an investment of nothing', inputs: { how: 'typed', saving: 310, cost: 0 }, blocked: 'must be at least' },
    { name: 'a share over 100%', inputs: { how: 'share', loss: 1900, share: 120 }, blocked: 'must be at most 100' },
    { name: 'a life in part-years', inputs: { how: 'typed', saving: 310, life: 2.5 }, blocked: 'must be a whole number' },
  ],
  see: [
    { key: 'cost-deployment', why: 'rank the losses to find the saving worth spending on' },
    { key: 'copq', why: 'what poor quality costs — a saving to set a spend against' },
  ],
};

export default def;
