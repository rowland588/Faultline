/* PROJECT CHARTER (FC-142) — one page agreed before the work starts, between the sponsor and the team: the problem as a number, the goal
 * as the same number with a date, the scope in and out, the team and their time, what closing the gap is worth, and the milestones.
 * Specified in knowledge/specs/FC-142-charter.md; the method in knowledge/methods/sixsigma/charter.md (ISO 13053-2:2011; Pyzdek & Keller
 * 2014; George et al. 2005). The arithmetic is figures/charter.ts, proved against hand-worked cases in scripts/knowledge/cases-doc.py. */
import { daysBetween, niceDay } from '../../../lib/weeks';
import { fmt, gbp, plural, sayN, lowerFirst as lower } from '../figures/words';
import { cellNum, cellText, numOf, rowsOf, textOf } from '../doc';
import { baselineInterval, gapOf, paybackWeeks, teamCost, worthOf, WEEKS_A_YEAR, type TeamRow } from '../figures/charter';
import type { DocDef, DocProblem, DocTable, DocValues } from '../types';

const money6 = (n: number) => `£${fmt(n, 6)}`;

const TEAM = (v: DocValues): TeamRow[] => rowsOf(v, 'team').map(r => ({ name: cellText(r, 'name'), role: cellText(r, 'role'), ...(cellNum(r, 'hours') !== undefined ? { hours: cellNum(r, 'hours') as number } : {}) }));

const charter: DocDef = {
  key: 'charter', fc: 'FC-142', title: 'Project charter', noun: 'charter', group: 'Define',
  says: 'The problem as a number, the goal with a date, the scope, the team and what closing the gap is worth — agreed before the work starts',
  question: 'What is this project for, and how will we know it is done?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the sponsor', ask: 'Agree the charter', back: 'Reopen the charter' },
  sections: [
    { id: 'problem', title: 'The problem', help: 'What is wrong, in a number — with no cause and no solution in it.', items: [
      { id: 'measure', kind: 'text', label: 'What is measured', required: true, example: 'Give-away on Line 3', help: 'The number the project is about, with where it is measured.' },
      { id: 'unit', kind: 'text', label: 'In what unit', required: true, example: 'g a pack', help: 'Said after every figure: g a pack, % of packs, minutes a changeover.' },
      { id: 'baseline', kind: 'number', label: 'Where it is now', required: true, help: 'The baseline, measured — not remembered. Ten shifts’ means, a month’s rejects.' },
      { id: 'baselineHow', kind: 'long', label: 'How the baseline was measured', required: true, example: 'Mean of ten shifts on the Line 3 weigher, June', help: 'By whom, with which tool, over what. A baseline from memory is usually flattering or dramatic.' },
      { id: 'baselineN', kind: 'number', label: 'Readings behind the baseline', integer: true, min: 2, help: 'Optional — with their spread it gives the baseline’s interval.' },
      { id: 'baselineSd', kind: 'number', label: 'Their spread (standard deviation)', min: 0, help: 'Optional — from the capability study or the spreadsheet that gave the mean.' },
      { id: 'problem', kind: 'long', label: 'The problem, in words', required: true, example: 'Give-away on Line 3 averages 4.1 g a pack against a 2 g target, since the new weigher in June.', help: 'What is wrong, where, since when, how big, against what it should be. If a cause or a fix is in it, take it out.' },
    ] },
    { id: 'goal', title: 'The goal', help: 'The same number, where it must get to, and by when.', items: [
      { id: 'target', kind: 'number', label: 'Where it must get to', required: true, help: 'The target, in the same unit.' },
      { id: 'by', kind: 'date', label: 'By when', required: true, help: 'A date the sponsor can hold the team to.' },
    ] },
    { id: 'scope', title: 'The scope', help: 'What is in, what is out — the test for every “while we’re at it”.', items: [
      { id: 'scopeIn', kind: 'long', label: 'In scope', required: true, example: 'Line 3, its four products, all shifts', help: 'Lines, products, shifts, steps.' },
      { id: 'scopeOut', kind: 'long', label: 'Out of scope', required: true, example: 'The supplier’s film; the depot’s handling', help: 'What will not be touched, even if it is part of the problem.' },
      { id: 'constraints', kind: 'long', label: 'Constraints', help: 'Optional — no capital, no new people, no stopping the line on days.' },
    ] },
    { id: 'team', title: 'The team', help: 'Who agrees it, who leads it, who does the work and how many hours they give.', items: [
      { id: 'sponsor', kind: 'person', label: 'Sponsor', required: true, help: 'Who agrees the charter and clears the way.' },
      { id: 'lead', kind: 'person', label: 'Lead', required: true, offer: ctx => (ctx.lead ? { value: ctx.lead, words: `${ctx.lead} — the project’s lead` } : undefined), help: 'Who owns the project day to day.' },
      { id: 'team', kind: 'list', label: 'Team members', rowWord: 'member', help: 'Each person who does the work, and the hours they give the project in all.', columns: [
        { id: 'name', kind: 'person', label: 'Name', required: true },
        { id: 'role', kind: 'text', label: 'Role', example: 'Engineer' },
        { id: 'hours', kind: 'number', label: 'Hours in all', min: 0, unit: 'hours' },
      ] },
      { id: 'rate', kind: 'number', label: 'One person’s £ an hour', min: 0, unit: '£ an hour', offer: ctx => (ctx.labourPerHour ? { value: Math.round(ctx.labourPerHour * 100) / 100, words: `£${fmt(ctx.labourPerHour, 2)} an hour — ${ctx.lineName ?? 'the line'}’s wage with on-costs` } : undefined), help: 'Optional — costs the team’s time. The line’s own is offered when it has one.' },
    ] },
    { id: 'worth', title: 'What it is worth', help: 'In money, from the tool that measured the problem. Every box here is optional — nothing waits on it.', items: [
      { id: 'worthWeek', kind: 'number', label: 'What the problem costs a week', min: 0, unit: '£ a week', help: 'As the tool that measured it says it — the problem’s money line, the loss count, a calculation. Not a figure made up for the charter.' },
      { id: 'worthFrom', kind: 'text', label: 'Which tool or record said so', example: 'Loss count, Line 3, w/c 12 Oct', help: 'Name it, so the sponsor can open it.' },
      { id: 'volume', kind: 'number', label: 'Units a year the gap applies to', min: 0, unit: 'a year', help: 'Only when no tool has put a £ a week on it: packs a year, changeovers a year.' },
      { id: 'unitValue', kind: 'number', label: 'What one unit of the measure is worth', min: 0, unit: '£', help: 'On one of those units — for give-away, the product’s £ a gram (£3.40 a kilo is £0.0034 a gram).' },
    ] },
    { id: 'milestones', title: 'The milestones', help: 'The phases’ dates, in order — the DMAIC tollgates or the steps of the method you run.', items: [
      { id: 'milestones', kind: 'list', label: 'Milestones', rowWord: 'milestone', help: 'Optional.', columns: [
        { id: 'phase', kind: 'text', label: 'Phase or step', required: true, example: 'Measure done' },
        { id: 'date', kind: 'date', label: 'Date', required: true },
      ] },
    ] },
  ],
  check: (v, ctx): DocProblem[] => {
    const out: DocProblem[] = [];
    const b = numOf(v, 'baseline'), t = numOf(v, 'target'), by = textOf(v, 'by');
    if (b !== undefined && t !== undefined && b === t) out.push({ field: 'target', say: 'The goal is the same as where it is now — nothing would change.' });
    if (by && daysBetween(ctx.today, by) < 0) out.push({ field: 'by', say: `The goal date, ${niceDay(by, { year: true })}, has passed.` });
    const n = numOf(v, 'baselineN'), sd = numOf(v, 'baselineSd');
    if ((n === undefined) !== (sd === undefined)) out.push({ field: n === undefined ? 'baselineN' : 'baselineSd', say: 'Give both the readings behind the baseline and their spread, or neither.' });
    if (numOf(v, 'worthWeek') !== undefined && !textOf(v, 'worthFrom')) out.push({ field: 'worthFrom', say: `Say which tool or record put ${gbp(numOf(v, 'worthWeek') as number)} a week on the problem.` });
    const sp = textOf(v, 'sponsor').toLowerCase(), ld = textOf(v, 'lead').toLowerCase();
    if (sp && sp === ld) out.push({ field: 'lead', say: 'The sponsor and the lead are the same person — a charter is agreed between the two.' });
    const ms = rowsOf(v, 'milestones').filter(r => cellText(r, 'date'));
    ms.forEach((r, i) => {
      const next = ms[i + 1];
      if (next && cellText(next, 'date') < cellText(r, 'date')) out.push({ field: 'milestones', say: `Milestones are out of order: “${cellText(r, 'phase')}” (${niceDay(cellText(r, 'date'), { year: true })}) comes before “${cellText(next, 'phase')}” (${niceDay(cellText(next, 'date'), { year: true })}).` });
      if (by && cellText(r, 'date') > by) out.push({ field: 'milestones', say: `“${cellText(r, 'phase')}” falls after the goal date.` });
    });
    return out;
  },
  read: (v, ctx) => {
    const measure = textOf(v, 'measure'), unit = textOf(v, 'unit'), by = textOf(v, 'by');
    const b = numOf(v, 'baseline'), t = numOf(v, 'target');
    const g = b !== undefined && t !== undefined ? gapOf(b, t) : undefined;
    const rate = numOf(v, 'rate') ?? ctx.labourPerHour;
    const rateFrom = numOf(v, 'rate') !== undefined ? 'typed' : ctx.labourPerHour !== undefined ? `${ctx.lineName ?? 'the line'}’s wage with on-costs` : undefined;
    const worth = worthOf({ ...(numOf(v, 'worthWeek') !== undefined ? { worthWeek: numOf(v, 'worthWeek') as number } : {}), ...(g ? { gap: g.gap } : {}), ...(numOf(v, 'volume') !== undefined ? { volume: numOf(v, 'volume') as number } : {}), ...(numOf(v, 'unitValue') !== undefined ? { unitValue: numOf(v, 'unitValue') as number } : {}) });
    const team = TEAM(v);
    const tc = teamCost(team, rate);
    const days = by ? daysBetween(ctx.today, by) : undefined;
    const pay = tc.cost !== undefined && worth ? paybackWeeks(tc.cost, worth.perWeek) : undefined;
    const n = numOf(v, 'baselineN'), sd = numOf(v, 'baselineSd');
    const ci = b !== undefined && n !== undefined && sd !== undefined ? baselineInterval(b, sd, n) : undefined;

    /* the sentence — only once the number, the target and the date are all there */
    let sentence = '', tone: 'r' | 'a' | 'g' | 'n' = 'n';
    if (measure && unit && g && by) {
      if (g.direction === 'hold') { sentence = `The goal for ${lower(measure)} is the same as where it is now (${sayN(b as number, unit)}) — there is nothing to close.`; tone = 'a'; }
      else sentence = `${g.direction === 'reduce' ? 'Reduce' : 'Raise'} ${lower(measure)} from ${sayN(b as number, unit)} to ${sayN(t as number, unit)} by ${niceDay(by, { year: true })}${worth ? `, worth ${gbp(worth.perYear)} a year` : ''}.`;
    }

    const tiles = [
      g ? { k: 'The gap', v: sayN(g.gap, unit), of: g.share !== undefined ? `${fmt(g.share * 100, 0)}% of today’s ${fmt(b as number, 2)}` : 'to close', ...(g.direction === 'hold' ? { tone: 'a' as const } : {}) } : { k: 'The gap', v: '—', of: 'needs where it is now and where it must get to' },
      days === undefined ? { k: 'Time to go', v: '—', of: 'needs the goal date' }
        : days < 0 ? { k: 'Time to go', v: `${plural(-days, 'day')} late`, of: `the goal date, ${niceDay(by, { year: true })}, has passed`, tone: 'r' as const }
          : { k: 'Time to go', v: plural(days, 'day'), of: `to ${niceDay(by, { year: true })}` },
      worth ? { k: 'Worth a year', v: gbp(worth.perYear), of: worth.how === 'tool' ? `${gbp(worth.perWeek)} a week × ${WEEKS_A_YEAR}` : 'gap × units a year × value' } : { k: 'Worth a year', v: '—', of: 'needs the tool’s money line' },
      tc.hours > 0 ? { k: 'The team’s time', v: `${fmt(tc.hours, 1)} hours`, of: tc.cost !== undefined ? `${gbp(tc.cost)} at ${gbp(rate as number)} an hour` : 'needs £ an hour to cost it' } : { k: 'The team’s time', v: '—', of: team.length ? 'needs each member’s hours' : 'needs the team’s hours' },
      pay !== undefined ? { k: 'Paid back in', v: `${fmt(pay, 1)} ${pay === 1 ? 'week' : 'weeks'}`, of: 'of the gain covers the team’s time' } : { k: 'Paid back in', v: '—', of: 'needs the worth and the team’s time' },
    ];

    const working = [
      ...(g && b !== undefined && t !== undefined ? [{ label: 'The gap', value: `${fmt(b, 2)} − ${fmt(t, 2)} = ${sayN(g.gap, unit)}${g.share !== undefined ? ` (${fmt(g.share * 100, 1)}% of where it is now)` : ''}`, note: 'baseline against target, in the one unit' }] : []),
      ...(ci && b !== undefined && n !== undefined && sd !== undefined ? [{ label: 'The baseline', value: `mean ${sayN(b, unit)}, s ${fmt(sd, 2)} over ${n} readings — 95% interval ${fmt(ci.lo, 2)} to ${fmt(ci.hi, 2)}`, note: 'x̄ ± t·s/√n (Student’s t)' }] : []),
      ...(worth ? [{ label: 'Worth a year', value: worth.how === 'tool' ? `${gbp(numOf(v, 'worthWeek') as number)} a week × ${WEEKS_A_YEAR} weeks = ${gbp(worth.perYear)}` : `${sayN(g?.gap ?? 0, unit)} × ${fmt(numOf(v, 'volume') as number, 0)} units a year × ${money6(numOf(v, 'unitValue') as number)} = ${gbp(worth.perYear)}`, note: worth.how === 'tool' ? `from ${textOf(v, 'worthFrom') || 'the measuring tool'}` : 'the gap × units a year × what one unit of the measure is worth' }] : []),
      ...(tc.hours > 0 ? [{ label: 'The team’s time', value: tc.cost !== undefined ? `${fmt(tc.hours, 1)} hours × ${gbp(rate as number)} = ${gbp(tc.cost)}` : `${fmt(tc.hours, 1)} hours`, note: rateFrom ? `£ an hour: ${rateFrom}` : 'no £ an hour given' }] : []),
      ...(pay !== undefined && tc.cost !== undefined && worth ? [{ label: 'Paid back in', value: `${gbp(tc.cost)} ÷ ${gbp(worth.perWeek)} a week = ${fmt(pay, 2)} weeks`, note: 'the team’s time against the gain a week' }] : []),
    ];

    const missing: string[] = [];
    if (!worth) missing.push('Measure the problem with its tool to say the worth — give what it costs a week and which tool said so, or the units a year and what one unit of the measure is worth.');
    if (tc.hours > 0 && rate === undefined) missing.push('Give the line a wage (Set up the line), or type one person’s £ an hour, to say the team’s time in money.');
    if (team.length && tc.hours === 0) missing.push('Give the hours each member will put in to say the team’s time.');
    const money = {
      ...(worth ? { text: `Closing the gap is worth ${gbp(worth.perYear)} a year${worth.how === 'tool' ? ` because ${textOf(v, 'worthFrom') || 'the tool that measured it'} puts ${gbp(worth.perWeek)} a week on the problem` : ` because ${sayN(g?.gap ?? 0, unit)} on each of ${fmt(numOf(v, 'volume') as number, 0)} units a year, at ${money6(numOf(v, 'unitValue') as number)} each`}${tc.cost !== undefined ? `; the team’s time is ${gbp(tc.cost)}${pay !== undefined ? `, paid back in ${fmt(pay, 1)} ${pay === 1 ? 'week' : 'weeks'}` : ''}` : ''}.` } : {}),
      ...(worth || tc.cost !== undefined ? { figures: [
        ...(worth ? [['Worth a year', gbp(worth.perYear)] as [string, string], ['Worth a week', gbp(worth.perWeek)] as [string, string]] : []),
        ...(tc.cost !== undefined ? [['The team’s time', gbp(tc.cost)] as [string, string]] : []),
      ] } : {}),
      missing,
    };

    const tables: DocTable[] = [];
    const people: string[][] = [];
    if (textOf(v, 'sponsor')) people.push([textOf(v, 'sponsor'), 'Sponsor', '', '']);
    if (textOf(v, 'lead')) people.push([textOf(v, 'lead'), 'Lead', '', '']);
    for (const m of team) people.push([m.name, m.role || 'Member', m.hours !== undefined ? fmt(m.hours, 1) : '', m.hours !== undefined && rate !== undefined ? gbp(m.hours * rate) : '']);
    if (people.length) tables.push({ title: 'The team', head: ['Name', 'Role', 'Hours', 'Cost'], rows: people, shares: [0.34, 0.26, 0.18, 0.22] });
    const ms = rowsOf(v, 'milestones');
    if (ms.length) tables.push({ title: 'The milestones', head: ['Phase or step', 'Date', 'From today'], rows: ms.map(r => [cellText(r, 'phase'), cellText(r, 'date') ? niceDay(cellText(r, 'date'), { year: true }) : '—', cellText(r, 'date') ? (daysBetween(ctx.today, cellText(r, 'date')) < 0 ? `${plural(-daysBetween(ctx.today, cellText(r, 'date')), 'day')} ago` : plural(daysBetween(ctx.today, cellText(r, 'date')), 'day')) : '—']), shares: [0.5, 0.26, 0.24] });

    const more = [
      ...(ci && n !== undefined ? [`The baseline is ${sayN(b as number, unit)}, with a 95% interval of ${fmt(ci.lo, 2)} to ${fmt(ci.hi, 2)} from ${n} readings.`] : []),
      ...(worth?.other ? [`Set beside it, ${worth.other.how === 'gap' ? 'the gap × units × value' : 'the tool’s figure'} gives ${gbp(worth.other.perYear)} a year${Math.abs(worth.other.perYear - worth.perYear) <= 0.1 * worth.perYear ? ' — the two agree within 10%.' : ' — the two differ by more than 10%; find out which is wrong before the sponsor relies on either.'}`] : []),
      ...(textOf(v, 'scopeIn') ? [`In scope: ${textOf(v, 'scopeIn')}${textOf(v, 'scopeOut') ? `. Out of scope: ${textOf(v, 'scopeOut')}` : ''}.`] : []),
    ];
    const lead = textOf(v, 'lead'), sponsor = textOf(v, 'sponsor');
    return {
      sentence, tone, ...(more.length ? { more } : {}), tiles, tables, working, money,
      caveats: [
        'It says what the project is for and how it will be known to be done — not what causes the problem or what to do about it; the Analyse phase finds the cause.',
        'A baseline typed from memory is usually flattering or dramatic: measure it, and if the Measure phase shows it was wrong, restate the charter with the sponsor’s agreement and keep the change.',
        'The worth is only as good as the figure behind it: the measuring tool’s money line, or a gap × units × value you can defend — never a rate made up for the charter.',
        'A charter nobody agrees binds nobody: the sponsor’s name is on it once it is agreed, and the scope is the test for every “while we’re at it”.',
      ],
      checks: [],
      closing: sentence
        ? `${sentence.replace(/\.$/, '')}${sponsor || lead ? `. ${sponsor ? `Sponsor ${sponsor}` : ''}${sponsor && lead ? '; ' : ''}${lead ? `lead ${lead}` : ''}` : ''}${days !== undefined && days >= 0 ? `. ${plural(days, 'day')} to go.` : '.'}`
        : 'Write the problem as a number and the goal as the same number with a date; the rest of the charter follows from them.',
    };
  },
  examples: [
    {
      name: 'Give-away on Line 3 — the record’s worked case',
      source: 'knowledge/methods/sixsigma/charter.md worked case; scripts/knowledge/cases-doc.py C1 (the gap, the worth and the payback worked in Python; t(0.975, 9) = 2.262157 from the t table)',
      values: {
        measure: 'Give-away on Line 3', unit: 'g a pack', baseline: 4.1, baselineHow: 'Mean of ten shifts on the Line 3 weigher, June', baselineN: 10, baselineSd: 0.18,
        problem: 'Give-away on Line 3 averages 4.1 g a pack against a 2 g target, since the new weigher in June.',
        target: 2, by: '2027-03-31', scopeIn: 'Line 3, its four products, all shifts', scopeOut: 'The supplier’s film; the depot’s handling',
        sponsor: 'Priya Shah', lead: 'Sam Patel',
        team: [{ id: 't1', c: { name: 'Jo Marsh', role: 'Line leader', hours: 20 } }, { id: 't2', c: { name: 'Dev Rao', role: 'Engineer', hours: 30 } }, { id: 't3', c: { name: 'Kim Osei', role: 'Quality', hours: 10 } }],
        rate: 14.7, volume: 12_480_000, unitValue: 0.0034,
        milestones: [{ id: 'm1', c: { phase: 'Measure done', date: '2026-12-15' } }, { id: 'm2', c: { phase: 'Improve piloted', date: '2027-02-15' } }],
      },
      ctx: { today: '2026-11-01' },
      expect: {
        sentence: 'Reduce give-away on Line 3 from 4.1 g a pack to 2 g a pack by 31 Mar 2027, worth £89,107 a year.',
        tiles: { 'Filled in': '11 of 11', 'The gap': '2.1 g a pack', 'Time to go': '150 days', 'Worth a year': '£89,107', 'The team’s time': '60 hours', 'Paid back in': '0.5 weeks' },
        money: 'Closing the gap is worth £89,107 a year because 2.1 g a pack on each of 12,480,000 units a year, at £0.0034 each; the team’s time is £882.00, paid back in 0.5 weeks.',
        tables: { 'The team': [['Priya Shah', 'Sponsor'], ['Sam Patel', 'Lead'], ['Jo Marsh', 'Line leader', '20', '£294.00'], ['Dev Rao', 'Engineer', '30', '£441.00'], ['Kim Osei', 'Quality', '10', '£147.00']], 'The milestones': [['Measure done', '15 Dec 2026', '44 days'], ['Improve piloted', '15 Feb 2027', '106 days']] },
        needs: [],
      },
    },
    {
      name: 'A rejects project — the worth from the measuring tool, a rise and a missing wage',
      source: 'scripts/knowledge/cases-doc.py C2 (£ a week × 52; the percentage gap)',
      values: {
        measure: 'Yield at the slicer', unit: '% of intake', baseline: 91.5, baselineHow: 'Four weeks of the slicer’s mass balance', problem: 'Yield at the slicer is 91.5% of intake against a 94% target.',
        target: 94, by: '2027-02-28', scopeIn: 'The slicer and wash', scopeOut: 'Intake grading', sponsor: 'Priya Shah', lead: 'Sam Patel',
        team: [{ id: 't1', c: { name: 'Jo Marsh', hours: 12 } }], worthWeek: 750, worthFrom: 'Loss count, Line 2, w/c 12 Oct',
      },
      ctx: { today: '2026-11-01' },
      expect: {
        sentence: 'Raise yield at the slicer from 91.5% of intake to 94% of intake by 28 Feb 2027, worth £39,000 a year.',
        tiles: { 'Filled in': '11 of 11', 'The gap': '2.5% of intake', 'Time to go': '119 days', 'Worth a year': '£39,000', 'The team’s time': '12 hours' },
        money: 'Closing the gap is worth £39,000 a year because Loss count, Line 2, w/c 12 Oct puts £750.00 a week on the problem.',
        tables: { 'The team': [['Priya Shah', 'Sponsor'], ['Sam Patel', 'Lead'], ['Jo Marsh', 'Member', '12']] },
        needs: [],
      },
    },
    {
      name: 'A draft — only the problem, nothing else yet',
      source: 'the shape: a document is saved as typed; the boxes still needed are named',
      values: { measure: 'Film breaks', unit: 'a shift', baseline: 6 },
      ctx: { today: '2026-11-01' },
      expect: {
        sentence: '',
        tiles: { 'Filled in': '3 of 11', 'The gap': '—', 'Time to go': '—', 'Worth a year': '—' },
        needs: ['How the baseline was measured', 'The problem, in words', 'Where it must get to', 'By when', 'In scope', 'Out of scope', 'Sponsor', 'Lead'],
      },
    },
  ],
  see: [{ key: 'sipoc', why: 'bounds the process the problem lives in' }, { key: 'voc-ctq', why: 'turns what the customer says into limits' }],
};

export default charter;
