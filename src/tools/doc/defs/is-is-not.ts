/* IS / IS NOT (FC-149) — specifying the problem before anyone proposes a cause (Kepner & Tregoe): what, where, when and how much it IS, and what
 * it could be but IS NOT; what is true only of the IS side; what changed; and each possible cause tested against every line. A true cause
 * explains every is and every is-not. Specified in knowledge/specs/FC-149-is-is-not.md; the method in knowledge/methods/rca/is-is-not.md
 * (Kepner & Tregoe 1965, 1981 — from knowledge, texts not re-read); the arithmetic in figures/isnot.ts against scripts/knowledge/cases-doc.py I1. */
import { niceDay } from '../../../lib/weeks';
import { andList, fmt, gbp, plural } from '../figures/words';
import { badPacks, excessMaterials, excessPacks, leadDays, ratioOf, verdictOf, type Fit } from '../figures/isnot';
import { cellText, numOf, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable } from '../types';

const DIMS = [{ value: 'what', label: 'What' }, { value: 'where', label: 'Where' }, { value: 'when', label: 'When' }, { value: 'howmuch', label: 'How much' }];
const FIT = [{ value: 'yes', label: 'Explains it' }, { value: 'assume', label: 'Needs an assumption' }, { value: 'no', label: 'Cannot' }];
const FITWORD: Record<string, string> = { yes: 'explains', assume: 'assumes', no: 'cannot' };
const dimLabel = (v: string) => DIMS.find(d => d.value === v)?.label ?? v;
const day = (d: string) => niceDay(d, { year: true });
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

const isIsNot: DocDef = {
  key: 'is-is-not', fc: 'FC-149', title: 'Is / is not', noun: 'is / is not', group: 'Problem solving',
  says: 'Describe a sudden problem exactly — what, where, when, how much it is and is not — see what changed, and test every suspected cause against every line',
  question: 'Where, when and on what does it happen — and not happen — and what changed?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the team leader', ask: 'Agree the specification', back: 'Reopen the specification' },
  sections: [
    { id: 'problem', title: 'The problem', help: 'One statement, with no cause and no solution in it.', items: [
      { id: 'problem', kind: 'long', label: 'The problem, in one statement', required: true, example: 'Leaking seals on 400 g trays', help: 'What is wrong, in the words of the floor.',
        offer: ctx => { const p = ctx.problems?.find(x => !x.closedOn); return p ? { value: p.problem, words: `“${p.problem}” — the project’s open problem on the register` } : undefined; } },
      { id: 'since', kind: 'date', label: 'The day it began', help: 'Optional — the first day it was seen. A problem that was always there has no “since”; this method is for one that began.' },
    ] },
    { id: 'spec', title: 'The specification', help: 'Four questions, each asked two ways. The IS NOT column is where the method lives — a specification with only IS lines is a complaint.', items: [
      { id: 'spec', kind: 'list', label: 'What it is, and what it is not', rowWord: 'line', required: true, min: 4, help: 'One line at least for what, where, when and how much. Facts, each with how it is known — not opinion.', columns: [
        { id: 'dim', kind: 'choice', label: 'About', required: true, options: DIMS },
        { id: 'is', kind: 'text', label: 'It IS', required: true, example: 'Lane 3 of the tray sealer' },
        { id: 'isnot', kind: 'text', label: 'It could be, but IS NOT', required: true, example: 'Lanes 1, 2 and 4' },
        { id: 'source', kind: 'text', label: 'How it is known', example: 'Reject log by lane, w/c 12 Oct', help: 'The record or the count it came from.' },
      ] },
    ] },
    { id: 'extent', title: 'How much, in numbers', help: 'Optional — the same “how much” line as percentages, so the comparison and its cost can be said. Nothing waits on it.', items: [
      { id: 'isRate', kind: 'number', label: 'How often on the IS side', min: 0, max: 100, unit: '% of packs', help: 'Of the packs made where it IS.' },
      { id: 'notRate', kind: 'number', label: 'How often on the IS NOT side', min: 0, max: 100, unit: '% of packs', help: 'Of the packs made where it IS NOT — the comparison.' },
      { id: 'packs', kind: 'number', label: 'Packs made on the IS side a shift', min: 0, unit: 'packs a shift' },
      { id: 'perPack', kind: 'number', label: 'What a pack’s materials cost', min: 0, unit: '£ a pack', help: 'The line’s own is offered when it has one.',
        offer: ctx => (ctx.materialsPerPack ? { value: ctx.materialsPerPack, words: `£${fmt(ctx.materialsPerPack, 2)} — ${ctx.lineName ?? 'the line'}’s materials for a pack` } : undefined) },
    ] },
    { id: 'distinct', title: 'What is distinct, and what changed', help: 'What is true of the IS side and not of the IS NOT side; and what was changed in, on or around it — with the day.', items: [
      { id: 'distinct', kind: 'list', label: 'Distinctions', rowWord: 'distinction', help: 'Lane 3 only; nights only; the new product only.', columns: [
        { id: 'what', kind: 'text', label: 'True only of the IS side', required: true, example: 'Lane 3 has the new sealing jaw' },
      ] },
      { id: 'changes', kind: 'list', label: 'Changes', rowWord: 'change', help: 'Fitted, adjusted, a new batch or a new person — and the day. A change that lines up with the day it began is the lead.', columns: [
        { id: 'what', kind: 'text', label: 'What changed', required: true, example: 'New sealing jaw fitted' },
        { id: 'where', kind: 'text', label: 'Where', example: 'Lane 3' },
        { id: 'date', kind: 'date', label: 'The day' },
      ] },
    ] },
    { id: 'causes', title: 'Possible causes, tested', help: 'For each suspected cause: if it were the cause, would it explain each line? One “Cannot” rules it out; one that explains every line with no assumption is the most probable.', items: [
      { id: 'causes', kind: 'list', label: 'Possible causes', rowWord: 'cause', required: true, min: 1, help: 'Test against the four lines of the specification.', columns: [
        { id: 'cause', kind: 'text', label: 'Possible cause', required: true, example: 'The new jaw’s heater reads low' },
        { id: 'what', kind: 'choice', label: 'What', options: FIT },
        { id: 'where', kind: 'choice', label: 'Where', options: FIT },
        { id: 'when', kind: 'choice', label: 'When', options: FIT },
        { id: 'howmuch', kind: 'choice', label: 'How much', options: FIT },
        { id: 'assumes', kind: 'text', label: 'What must be assumed', example: 'That the film differs on lane 3 only' },
      ] },
    ] },
    { id: 'check', title: 'The check on the floor', help: 'The most probable cause is a lead, not a verdict — it is verified before anything is changed.', items: [
      { id: 'firstCheck', kind: 'long', label: 'The first check, and what it will show', required: true, example: 'Measure the new jaw’s heater against the others; swap the jaw to lane 2 and see if the leaks move with it', help: 'Something that can come out either way.' },
      { id: 'verified', kind: 'long', label: 'What the check showed', help: 'Optional until it is done.' },
    ] },
  ],
  check: (v): DocProblem[] => {
    const out: DocProblem[] = [];
    const spec = rowsOf(v, 'spec');
    const dims = new Set(spec.map(r => cellText(r, 'dim')));
    const lacking = DIMS.filter(d => !dims.has(d.value));
    if (spec.length && lacking.length) out.push({ field: 'spec', say: `No line for ${andList(lacking.map(d => `“${d.label.toLowerCase()}”`))} — the method asks all four.` });
    spec.forEach((r, i) => {
      const n = cellText(r, 'dim') ? dimLabel(cellText(r, 'dim')) : `line ${i + 1}`;
      if (cellText(r, 'is') && !cellText(r, 'isnot')) out.push({ field: 'spec', say: `“${n}” has an IS and no IS NOT — an IS line alone is a complaint, not a specification.` });
      if (cellText(r, 'is') && !cellText(r, 'source')) out.push({ field: 'spec', say: `“${n}: ${cellText(r, 'is')}” does not say how it is known — every line needs a fact behind it.` });
    });
    const is = numOf(v, 'isRate'), not = numOf(v, 'notRate');
    if (is !== undefined && not !== undefined && is <= not) out.push({ field: 'isRate', say: `It is no more frequent where it IS (${fmt(is, 1)}%) than where it IS NOT (${fmt(not, 1)}%) — the specification has not found a difference.` });
    const since = textOf(v, 'since');
    if (since) rowsOf(v, 'changes').forEach(r => {
      const d = cellText(r, 'date');
      if (d && leadDays(since, d) < 0) out.push({ field: 'changes', say: `“${cellText(r, 'what')}” (${day(d)}) came after the problem began (${day(since)}) — it cannot be what started it.` });
    });
    if (!since && rowsOf(v, 'changes').some(r => cellText(r, 'date'))) out.push({ field: 'since', say: 'Changes are dated but the day the problem began is not — say it, so the change that lines up can be found.' });
    for (const r of rowsOf(v, 'causes')) {
      if (cellText(r, 'cause') && !['what', 'where', 'when', 'howmuch'].some(k => cellText(r, k))) out.push({ field: 'causes', say: `“${cellText(r, 'cause')}” has not been tested against any line.` });
      if (cellText(r, 'assumes') === '' && ['what', 'where', 'when', 'howmuch'].some(k => cellText(r, k) === 'assume')) out.push({ field: 'causes', say: `“${cellText(r, 'cause')}” needs an assumption but does not say which.` });
    }
    return out;
  },
  read: v => {
    const spec = rowsOf(v, 'spec');
    const since = textOf(v, 'since');
    const line = (dim: string, f: 'is' | 'isnot') => spec.filter(r => cellText(r, 'dim') === dim).map(r => cellText(r, f)).filter(Boolean).join('; ');
    const causes = rowsOf(v, 'causes').filter(r => cellText(r, 'cause')).map(r => {
      const fits = (['what', 'where', 'when', 'howmuch'] as const).map(k => cellText(r, k) as Fit | '');
      return { name: cellText(r, 'cause'), fits, verdict: verdictOf(fits), assumes: cellText(r, 'assumes') };
    });
    const ranked = causes.filter(c => c.verdict.kind === 'fits' || c.verdict.kind === 'assumes').sort((a, b) => a.verdict.assumptions - b.verdict.assumptions);
    const best = ranked[0], tied = best ? ranked.filter(c => c.verdict.assumptions === best.verdict.assumptions && c.verdict.kind === best.verdict.kind) : [];
    const ruledOut = causes.filter(c => c.verdict.kind === 'ruled-out');
    const is = numOf(v, 'isRate'), not = numOf(v, 'notRate'), packs = numOf(v, 'packs'), per = numOf(v, 'perPack');
    const ratio = is !== undefined && not !== undefined ? ratioOf(is, not) : undefined;
    /* nearest before the start first, then those with no day, and the ones that came after it last */
    const order = (lead: number | undefined) => (lead === undefined ? 5e5 : lead >= 0 ? lead : 1e6 - lead);
    const changes = rowsOf(v, 'changes').filter(r => cellText(r, 'what')).map(r => ({ r, lead: since && cellText(r, 'date') ? leadDays(since, cellText(r, 'date')) : undefined }))
      .sort((a, b) => order(a.lead) - order(b.lead));
    const before = changes.filter(c => c.lead !== undefined && c.lead >= 0);
    const isWhat = line('what', 'is'), isWhere = line('where', 'is'), isWhen = line('when', 'is'), isHow = line('howmuch', 'is');
    const head = [isWhat, isWhere, isWhen || (since ? `since ${day(since)}` : ''), isHow].filter(Boolean);
    const sentence = head.length >= 2
      ? `${head.map((s, i) => (i ? lc(s) : s)).join(', ')}${ratio !== undefined ? `; ${fmt(is as number, 1)}% against ${fmt(not as number, 1)}% where it is not (${fmt(ratio, 1)} times)` : ''}${tied.length === 1 ? `. Most probable: ${lc(tied[0].name)} — ${tied[0].verdict.kind === 'fits' ? 'it explains every line with no assumption' : `it explains the lines with ${plural(tied[0].verdict.assumptions, 'assumption')}`}` : tied.length > 1 ? `. ${plural(tied.length, 'cause')} still fit equally: ${andList(tied.map(c => lc(c.name)))}` : ''}.`
      : '';
    const tables: DocTable[] = [];
    if (spec.length) tables.push({ title: 'The specification', head: ['About', 'It IS', 'It IS NOT', 'How it is known'], shares: [0.12, 0.3, 0.3, 0.28],
      rows: spec.map(r => [dimLabel(cellText(r, 'dim')) || '—', cellText(r, 'is') || '—', cellText(r, 'isnot') || '—', cellText(r, 'source') || '—']) });
    if (changes.length) tables.push({ title: 'What changed, nearest the start first', head: ['Change', 'Where', 'The day', 'Before it began'], shares: [0.4, 0.2, 0.2, 0.2],
      rows: changes.map(({ r, lead }) => [cellText(r, 'what'), cellText(r, 'where') || '—', cellText(r, 'date') ? day(cellText(r, 'date')) : '—', lead === undefined ? '—' : lead === 0 ? 'the same day' : lead > 0 ? plural(lead, 'day') : `${plural(-lead, 'day')} after`]) });
    if (causes.length) tables.push({ title: 'Causes tested against the lines', head: ['Possible cause', 'What', 'Where', 'When', 'How much', 'Verdict'], shares: [0.3, 0.11, 0.11, 0.11, 0.11, 0.26],
      rows: causes.map(c => [c.name, ...c.fits.map(f => (f ? FITWORD[f] : '—')), c.verdict.kind === 'ruled-out' ? 'ruled out' : c.verdict.kind === 'fits' ? 'fits every line' : c.verdict.kind === 'assumes' ? `fits with ${plural(c.verdict.assumptions, 'assumption')}` : 'not tested']),
      note: 'A cause that cannot explain one line is ruled out; the one that explains all with no assumption is the most probable.' });
    const excess = is !== undefined && not !== undefined && packs !== undefined ? excessPacks(packs, is, not) : undefined;
    const mats = excess !== undefined && per !== undefined ? excessMaterials(excess, per) : undefined;
    const missing: string[] = [];
    if (is === undefined || not === undefined) missing.push('Give how often it happens where it IS and where it IS NOT (under How much, in numbers) to say how many bad packs the difference makes.');
    else if (packs === undefined) missing.push('Give the packs made on the IS side a shift to say the difference in packs.');
    if (excess !== undefined && per === undefined) missing.push('Give what a pack’s materials cost (the line’s own is offered) to say the difference in pounds.');
    return {
      sentence, tone: ruledOut.length === causes.length && causes.length ? 'a' : 'n',
      ...(before.length ? { more: [`Nearest change before it began: ${before[0].r ? cellText(before[0].r, 'what') : ''} — ${before[0].lead === 0 ? 'the same day' : plural(before[0].lead as number, 'day') + ' before'}.`] } : {}),
      tiles: [
        { k: 'Lines', v: spec.length ? String(spec.length) : '—', of: `${new Set(spec.map(r => cellText(r, 'dim')).filter(Boolean)).size} of 4 questions asked` },
        { k: 'IS against IS NOT', v: ratio !== undefined ? `${fmt(ratio, 1)}×` : '—', of: ratio !== undefined ? `${fmt(is as number, 1)}% against ${fmt(not as number, 1)}%` : 'needs the two percentages' },
        { k: 'Changes before it began', v: since ? String(before.length) : '—', of: since ? `of ${changes.length} listed` : 'needs the day it began' },
        { k: 'Causes left', v: causes.length ? String(causes.length - ruledOut.length) : '—', of: causes.length ? `of ${causes.length} tested` : 'needs a possible cause' },
      ],
      tables,
      working: [
        ...(ratio !== undefined ? [{ label: 'IS ÷ IS NOT', value: `${fmt(is as number, 1)} ÷ ${fmt(not as number, 1)} = ${fmt(ratio, 2)}`, note: 'how much more often it happens where it is' }] : []),
        ...(excess !== undefined ? [{ label: 'Bad packs a shift', value: `${fmt(badPacks(packs as number, is as number), 0)} where it IS, ${fmt(badPacks(packs as number, not as number), 0)} at the IS NOT rate: ${fmt(excess, 0)} more`, note: `${fmt(packs as number, 0)} packs × the two percentages` }] : []),
        ...(mats !== undefined ? [{ label: 'Materials', value: `${fmt(excess as number, 0)} × ${gbp(per as number)} = ${gbp(mats)} a shift`, note: 'the extra bad packs’ materials only' }] : []),
      ],
      money: {
        ...(mats !== undefined ? { text: `The difference makes ${fmt(excess as number, 0)} more bad packs a shift than the IS NOT rate would — ${gbp(mats)} a shift in materials at ${gbp(per as number)} a pack.`, figures: [['More bad packs a shift', fmt(excess as number, 0)], ['Materials a shift', gbp(mats)]] as [string, string][] } : {}),
        missing,
      },
      caveats: [
        'The specification is only as good as its facts: filled with opinion, it proves whatever the room believes. Every line says how it is known.',
        'A specification with only IS lines is a complaint; the IS NOT column is where the method finds the cause.',
        'A change that lines up with the day it began is a lead, not a verdict — the check on the floor comes before anything is changed.',
        'It finds the cause of a deviation from a previous good state. A problem that was always there has no “since”, and a chronic one with many small causes belongs on the fishbone and in stratification.',
        'The money is the materials of the extra bad packs only; the contribution they cost is the loss count’s to say, and only where the line cannot make it up.',
      ],
      checks: [],
      closing: sentence ? `${sentence.replace(/\.$/, '')}. Check it on the floor before changing anything.` : 'Say what the problem is, then what it is and is not — what, where, when and how much.',
    };
  },
  examples: [
    {
      name: 'Leaking seals on lane 3 — the record’s worked case',
      source: 'knowledge/methods/rca/is-is-not.md worked case (Kepner & Tregoe); figures worked in scripts/knowledge/cases-doc.py I1',
      values: {
        problem: 'Leaking seals on 400 g trays', since: '2026-10-13',
        spec: [
          { id: 'w1', c: { dim: 'what', is: 'Leaking seals on 400 g trays', isnot: '200 g trays and flow-wrap packs', source: 'Reject log by product' } },
          { id: 'w2', c: { dim: 'where', is: 'Lane 3 of the tray sealer', isnot: 'Lanes 1, 2 and 4', source: 'Reject log by lane' } },
          { id: 'w3', c: { dim: 'when', is: 'Since Tuesday 13 Oct, every shift', isnot: 'Before Tuesday; not only at start-up', source: 'Reject log by shift' } },
          { id: 'w4', c: { dim: 'howmuch', is: '3.2% of lane 3, steady', isnot: '0.3% on the other lanes, not rising', source: 'Reject log, 4 weeks' } },
        ],
        isRate: 3.2, notRate: 0.3, packs: 6000, perPack: 0.42,
        distinct: [{ id: 'd1', c: { what: 'Lane 3 has the new sealing jaw' } }],
        changes: [
          { id: 'c1', c: { what: 'New sealing jaw fitted', where: 'Lane 3', date: '2026-10-13' } },
          { id: 'c2', c: { what: 'Film batch changed', where: 'All lanes', date: '2026-10-02' } },
          { id: 'c3', c: { what: 'Crew rota changed', where: 'Nights', date: '2026-10-15' } },
        ],
        causes: [
          { id: 'k1', c: { cause: 'The new jaw’s heater reads low', what: 'yes', where: 'yes', when: 'yes', howmuch: 'yes' } },
          { id: 'k2', c: { cause: 'A bad film batch', what: 'yes', where: 'no', when: 'yes', howmuch: 'assume', assumes: 'That the film differs on lane 3 only' } },
          { id: 'k3', c: { cause: 'The new crew', what: 'assume', where: 'assume', when: 'assume', howmuch: 'assume', assumes: 'That the crew works lane 3 only' } },
        ],
        firstCheck: 'Measure the new jaw’s heater against the others; swap the jaw to lane 2 and see if the leaks move with it',
      },
      expect: {
        sentence: 'Leaking seals on 400 g trays, lane 3 of the tray sealer, since Tuesday 13 Oct, every shift, 3.2% of lane 3, steady; 3.2% against 0.3% where it is not (10.7 times). Most probable: the new jaw’s heater reads low — it explains every line with no assumption.',
        tiles: { Lines: '4', 'IS against IS NOT': '10.7×', 'Changes before it began': '2', 'Causes left': '2' },
        money: 'The difference makes 174 more bad packs a shift than the IS NOT rate would — £73.08 a shift in materials at £0.42 a pack.',
        checks: ['“Crew rota changed” (15 Oct 2026) came after the problem began'],
        tables: { 'What changed, nearest the start first': [['New sealing jaw fitted', 'Lane 3', '13 Oct 2026', 'the same day'], ['Film batch changed', 'All lanes', '2 Oct 2026', '11 days'], ['Crew rota changed', 'Nights', '15 Oct 2026', '2 days after']] },
        needs: [],
      },
    },
    {
      name: 'A complaint with only IS lines, no sources, and a cause never tested',
      source: 'the record’s misuse list: only IS lines; opinion without a source; a specification must find a difference',
      values: {
        problem: 'Weights are low',
        spec: [{ id: 'a', c: { dim: 'what', is: 'Underweight packs' } }, { id: 'b', c: { dim: 'where', is: 'Head 4', isnot: 'The other heads', source: 'Weigher log' } }],
        isRate: 2, notRate: 2.5,
        causes: [{ id: 'z', c: { cause: 'The operator' } }],
      },
      expect: {
        sentence: 'Underweight packs, head 4; 2% against 2.5% where it is not (0.8 times).',
        tiles: { Lines: '2', 'IS against IS NOT': '0.8×', 'Causes left': '1' },
        checks: ['No line for “when” and “how much”', '“What” has an IS and no IS NOT', 'does not say how it is known', 'no more frequent where it IS (2%) than where it IS NOT (2.5%)', '“The operator” has not been tested against any line'],
        needs: ['What it is, and what it is not — at least 4 lines, with “About” and “It IS” and “It could be, but IS NOT” given', 'The first check, and what it will show'],
      },
    },
    {
      name: 'A draft — only the problem named',
      source: 'the shape: a document is saved as typed; the boxes still needed are named',
      values: { problem: 'Seals leak' },
      expect: { sentence: '', tiles: { 'Filled in': '1 of 4', Lines: '—', 'IS against IS NOT': '—' }, needs: ['What it is, and what it is not — at least 4 lines', 'Possible causes — at least one cause', 'The first check, and what it will show'] },
    },
  ],
  see: [{ key: 'eight-d', why: 'the customer’s paper around it — D2 describes the problem the same way' }],
};

export default isIsNot;
