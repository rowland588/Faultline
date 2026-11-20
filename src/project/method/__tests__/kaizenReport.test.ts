/* The Kaizen event's sections of the project report — hand-worked. Week of Mon 2 Nov 2026 (days 2–6 Nov), today 20 Nov, the check
 * booked for 10 Nov and not recorded: ten days overdue. 11 actions raised, 8 closed (73%), 1 late, 1 with nobody named. */
import { describe, expect, it } from 'vitest';
import { methodByKey } from '../../../lib/methods';
import { methodReportModel, reportLines, type ReportIn, type ReportItem } from '../../../lib/methodReportModel';
import { kaizenEventReport } from '../report/kaizen-event';
import { METHOD_REPORT } from '../report';

const day = (n: number, see: string, change: string, measure: string) => ({ [`day-see@${n}`]: see, [`day-change@${n}`]: change, [`day-measure@${n}`]: measure });
const answers: Record<string, string> = {
  charter: 'Wrapper changeover too long', sponsor: 'Ops manager', target: 'Changeover minutes; 25 or under', team: 'Fitter, two operators', baseline: '42.1 min, 8 changeovers',
  after: '24.4 min, 8 changeovers', tried: 'Film staged at the wrapper', written: 'Sequence card on the wrapper', trained: '',
  start: '2026-11-02', 'check-date': '2026-11-10', holding: '',
  ...day(1, 'Four trips for film', 'Film staged', '41 min'), ...day(2, 'Waiting for the fitter', '', ''),
};
const owed = [
  ...Array.from({ length: 8 }, (_, i) => ({ kind: 'next', what: `done ${i}`, owner: 'A', doneAt: 1 })),
  { kind: 'next', what: 'Order the trolley', owner: 'Sam', due: '2026-11-10' }, { kind: 'next', what: 'Pre-set jig', due: '2026-12-30' }, { kind: 'found', what: 'Second operator standard', owner: 'Ann', due: '2026-12-30' },
];
const input = (a = answers): ReportIn => ({
  method: methodByKey('kaizen-event')!, answers: a, studies: [], owed, today: '2026-11-20', project: { name: 'Wrapper week', lead: 'Rowland' }, line: 'Line 3', printed: '20 Nov 2026',
  readsOf: () => undefined,
});
const kinds = (items: ReportItem[], k: ReportItem['kind']) => items.filter(i => i.kind === k);

describe('the Kaizen event report sections', () => {
  const r = methodReportModel(input(), kaizenEventReport);
  const sec = (id: string) => r.sections.find(s => s.id === id)!;

  it('is registered, and sits between what needs attention and what we wrote', () => {
    expect(METHOD_REPORT['kaizen-event']).toBe(kaizenEventReport);
    expect(r.sections.map(s => s.id)).toEqual(['journey', 'telling', 'attention', 'kz-charter', 'kz-week', 'kz-result', 'kz-standard', 'kz-actions', 'kz-check', 'wrote']);
  });
  it('the week: five days dated from the start, each in its word; the days gone by empty are red', () => {
    const t = kinds(sec('kz-week').items, 'table')[0];
    if (t?.kind !== 'table') throw new Error('no table');
    expect(t.rows.map(x => [x[0], x[1], x[5]])).toEqual([['1', 'Mon 2 Nov 2026', 'Written'], ['2', 'Tue 3 Nov 2026', 'Under way'], ['3', 'Wed 4 Nov 2026', 'Not written'], ['4', 'Thu 5 Nov 2026', 'Not written'], ['5', 'Fri 6 Nov 2026', 'Not written']]);
    expect(t.tones).toEqual([undefined, 'w', 'r', 'r', 'r']);
    expect(sec('kz-week').lead).toMatch(/^1 of 5 days written, 1 under way\. The 30-day check was due 10 Nov 2026/);
  });
  it('the result: before and after side by side, with a note that the words are not subtracted', () => {
    const rows = kinds(sec('kz-result').items, 'facts')[0];
    expect(rows?.kind === 'facts' && rows.rows.slice(1, 3)).toEqual([['Before the week', '42.1 min, 8 changeovers'], ['After the changes', '24.4 min, 8 changeovers']]);
    const c = kinds(sec('kz-result').items, 'callout')[0];
    expect(c).toMatchObject({ tone: 'n', word: 'Note' });
  });
  it('with no baseline the result says the week has none', () => {
    const r2 = methodReportModel(input({ ...answers, baseline: '' }), kaizenEventReport);
    const c = kinds(r2.sections.find(s => s.id === 'kz-result')!.items, 'callout')[0];
    expect(c).toMatchObject({ tone: 'a', word: 'Watch', text: 'The week has no result yet: the baseline is not written.' });
  });
  it('the new way: written but not taught is amber, in words', () => {
    expect(kinds(sec('kz-standard').items, 'callout')[0]).toMatchObject({ tone: 'a', word: 'Watch' });
  });
  it('the actions: 11 raised, 8 closed (73%), 3 open, 1 late, 1 with nobody — the two to look at are listed', () => {
    expect(sec('kz-actions').lead).toBe('11 actions raised, 8 closed (73%), 3 open.');
    const f = kinds(sec('kz-actions').items, 'facts')[0];
    expect(f?.kind === 'facts' && f.rows.slice(0, 5)).toEqual([['Raised', '11'], ['Closed', '8 (73% of raised)'], ['Open', '3'], ['Late', '1'], ['Open with nobody named', '1']]);
    const b = kinds(sec('kz-actions').items, 'bullets')[0];
    expect(b?.kind === 'bullets' && b.items.map(i => i.tone)).toEqual(['r', 'a']);
    expect(b?.kind === 'bullets' && b.items[1]?.text).toContain('Pre-set jig — nobody named');
  });
  it('the check: overdue in its word, red, with the measure at 30 days not written', () => {
    const c = kinds(sec('kz-check').items, 'callout')[0];
    expect(c).toMatchObject({ tone: 'r', word: 'Overdue', text: 'The 30-day check was due 10 Nov 2026 — 10 days ago — and is not recorded.' });
    const f = kinds(sec('kz-check').items, 'facts')[0];
    expect(f?.kind === 'facts' && f.rows.map(x => x[1])).toEqual(['Fri 6 Nov 2026', 'Tue 10 Nov 2026', 'Not recorded', 'Not written yet.']);
  });
  it('the method’s own warnings reach what needs attention once, red first, through the dashboard', () => {
    const calls = kinds(sec('attention').items, 'callout').map(c => c.kind === 'callout' ? c.text : '');
    expect(calls.slice(0, 2).sort()).toEqual(['1 action is late: Order the trolley.', expect.stringMatching(/^The 30-day check was due 10 Nov 2026/)].sort((x, y) => String(x).localeCompare(String(y))));
    expect(calls.filter(t => t.startsWith('The 30-day check was due')).length).toBe(1);
    expect(r.dash.next).toBe('Hold the 30-day check: take the same measure again and record Holding, Slipping or Lost.');
    expect(r.cover.verdict).toEqual({ text: 'Needs attention', tone: 'r' });
  });
  it('every line of words is findable, and a missing answer is named never invented', () => {
    const lines = reportLines(r).join('\n');
    expect(lines).toContain('Wrapper changeover too long');
    expect(lines).toContain('Not written yet.');
    expect(lines).not.toMatch(/undefined|NaN/);
  });
});

/* knowledge/specs/FC-016-kaizen-event.md, criteria 4 and 8 — the readings since the week in the check's section: the values, which way is
 * better, and the module's sentence as an amber Watch; reaching what needs attention through the dashboard once */
describe('the 30-day check’s readings in the report', () => {
  const a = { ...answers, 'check-date': '2026-12-07', 'check-verdict': 'Holding', holding: 'Last six changeovers', 'check-readings': '25, 24, 28, 31, 30, 33', better: 'lower' };
  const r = methodReportModel(input(a), kaizenEventReport);
  const check = r.sections.find(s => s.id === 'kz-check')!;
  it('says the readings, the way that is better and the trend in the module’s words', () => {
    const f = check.items.filter(i => i.kind === 'facts')[1];
    expect(f?.kind === 'facts' && f.rows).toEqual([['The readings since the week', '25, 24, 28, 31, 30, 33'], ['Which way is better', 'Lower is better']]);
    const c = check.items.filter(i => i.kind === 'callout')[1];
    expect(c).toEqual({ kind: 'callout', tone: 'a', word: 'Watch', text: '6 readings since the week: mean 28.5, rising (Spearman’s ρ 0.89 on their order, p 0.02) — the wrong way for this measure: the gain is creeping back.' });
    expect(r.dash.attention.filter(x => x.text.startsWith('The check says Holding, but the readings since the week are creeping back')).length).toBe(1);
  });
  it('with no readings written the section adds nothing of them', () => {
    const none = methodReportModel(input({ ...a, 'check-readings': '' }), kaizenEventReport).sections.find(s => s.id === 'kz-check')!;
    expect(none.items.filter(i => i.kind === 'facts').length).toBe(1);
    expect(reportLines(methodReportModel(input({ ...a, 'check-readings': '' }), kaizenEventReport)).join('\n')).not.toMatch(/Spearman/);
  });
});

/* knowledge/specs/FC-016-kaizen-event.md, §3 money — the event's own cost is not built, and the report says so rather than leaving a gap */
describe('the week’s money', () => {
  it('says the week’s own cost is not worked out here, beside the tools’ own money', () => {
    const r = methodReportModel(input(), kaizenEventReport);
    const res = r.sections.find(s => s.id === 'kz-result')!;
    expect(res.items[res.items.length - 1]).toEqual({ kind: 'paragraph', tone: 'n', text: 'The week’s own cost — the people released × the days × the line’s rate — is not worked out here. The money above is each tool’s own, never summed.' });
  });
});
