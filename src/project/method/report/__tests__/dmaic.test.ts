import { describe, expect, it } from 'vitest';
import { methodByKey } from '../../../../lib/methods';
import { fieldsOf } from '../../../../lib/methodSheet';
import { methodReportModel, type ReportIn } from '../../../../lib/methodReportModel';
import { METHOD_REPORT } from '..';

const m = methodByKey('dmaic')!;
const base = (answers: Record<string, string>): ReportIn => ({
  method: m, answers, studies: [], owed: [], today: '2026-11-10', project: { name: 'Seal fix', lead: 'Rowland' }, line: 'Line 7', printed: '10 Nov 2026',
  readsOf: () => undefined, nameOf: () => undefined,
});
const report = (a: Record<string, string>) => methodReportModel(base(a), METHOD_REPORT.dmaic);
const fill = (phase: string, o: Record<string, string>) => { for (const f of fieldsOf('dmaic', phase)) o[f.id] = `${f.id} done`; return o; };

describe('DMAIC’s sections of the project report', () => {
  it('registers three sections between attention and what we wrote', () => {
    expect(report({}).sections.map(s => s.id)).toEqual(['journey', 'telling', 'attention', 'dmaic-reviews', 'dmaic-charter', 'dmaic-next', 'wrote']);
  });
  it('an empty project: five rows not started, the charter not written, Define next', () => {
    const [rv, ch, nx] = report({}).sections.slice(3, 6);
    expect(rv.lead).toBe('0 of 5 phase reviews passed. In Define: not started.');
    const t = rv.items[0];
    expect(t.kind === 'table' && t.rows.map(r => r.slice(0, 2))).toEqual([['Define — in hand', 'Not started (0 of 10 written)'], ['Measure', 'Not started (0 of 4 written)'], ['Analyse', 'Not started (0 of 3 written)'], ['Improve', 'Not started (0 of 3 written)'], ['Control', 'Not started (0 of 4 written)']]);
    expect(ch.lead).toBe('The charter is not written yet.');
    expect(nx.title).toBe('Next: Define');
  });
  it('Define passed with conditions and Measure held: the rows carry who, the day and the decision; Analyse is waiting', () => {
    const a = fill('Define', { rv_define_who: 'Tanya', rv_define_when: '2026-11-14', rv_define_result: 'conditions', rv_define_note: 'restate the goal', rv_measure_result: 'held', rv_measure_note: 'gauge unfit' });
    const r = report(a);
    const t = r.sections[3].items[0];
    expect(t.kind === 'table' && t.rows[0]).toEqual(['Define', 'Passed with conditions (10 of 10 written)', 'Tanya', '14 Nov 2026', 'Passed with conditions: restate the goal']);
    expect(t.kind === 'table' && t.rows[1]).toEqual(['Measure — in hand', 'Held (0 of 4 written)', '—', '—', 'Held: gauge unfit']);
    expect(t.kind === 'table' && t.tones).toEqual(['a', 'r', undefined, undefined, undefined]);
    const nx = r.sections[5];
    expect(nx.items[0]).toMatchObject({ kind: 'callout', tone: 'r', word: 'Needs attention' });
    expect(r.dash.attention.some(x => /Measure was held at its review — gauge unfit/.test(x.text))).toBe(true);
  });
  it('the next phase names what is still unwritten and what the review lacks', () => {
    const a = fill('Define', { rv_define_result: 'passed', rv_define_who: 'T', rv_define_when: '2026-11-01', baseline: 'today 4%' });
    const nx = report(a).sections[5];
    expect(nx.title).toBe('Next: Measure');
    const b = nx.items[1];
    expect(b.kind === 'bullets' && b.items.map(i => i.text)).toEqual([
      'Still to write before the review: The data collection plan · The gauge proved fit — how · Baseline capability.',
      'The review itself still needs: who holds the review, the day of the review, what it decided.']);
  });
  it('the charter lists what is written and names what is not', () => {
    const ch = report({ problem: 'Seal failures at 4%' }).sections[4];
    expect(ch.lead).toBe('1 of 10 charter items written; still to write: The customer’s requirement · The measure that matters (CTQ) · Scope — in and out · The process, start to finish (SIPOC) · The goal · The business case — what it is worth · The team and its roles · The timeline — a date for each phase review · Risks, constraints and assumptions.');
    expect(ch.items[0]).toEqual({ kind: 'facts', rows: [['The problem statement', 'Seal failures at 4%']] });
  });
  it('all five passed: closed, and the callout says so', () => {
    const a: Record<string, string> = {};
    for (const p of ['define', 'measure', 'analyse', 'improve', 'control']) a[`rv_${p}_result`] = 'passed';
    const nx = report(a).sections[5];
    expect(nx.title).toBe('Where it stands: closed');
    expect(nx.items[0]).toMatchObject({ tone: 'g', word: 'Fine' });
  });
});
