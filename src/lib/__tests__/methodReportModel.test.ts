import { describe, expect, it } from 'vitest';
import { methodByKey } from '../methods';
import { fieldsOf } from '../methodSheet';
import { itemLines, leanPageOf, methodReportModel, moneyClauses, reportLines, type MethodReportFn, type ReportIn } from '../methodReportModel';
import type { ToolStudy } from '../study';

const m = methodByKey('pdca')!;
const base = (o: Partial<ReportIn> = {}): ReportIn => ({
  method: m, answers: {}, studies: [], owed: [], today: '2026-11-10', project: { name: 'Seal fix', lead: 'Rowland' }, line: 'Line 7', printed: '10 Nov 2026',
  readsOf: id => (id === 'FC-094' ? 'capability' : undefined), nameOf: id => (id === 'FC-094' ? 'Capability study' : undefined), ...o,
});
const cap = (over: Partial<ToolStudy> = {}): ToolStudy => ({ id: 's1', tool: 'capability', name: 'Seal temp', createdAt: 1, updatedAt: 5, startedAt: 1, facts: { sample: { values: [], limits: {} } }, uses: [], ...over } as unknown as ToolStudy);

describe('the project report model', () => {
  it('the cover: method, line, lead, four tiles, and the sections in order (a) to (f)', () => {
    const r = methodReportModel(base());
    expect(r.cover.title).toBe('Seal fix');
    expect(r.cover.eyebrow).toBe('PROJECT REPORT · PDCA');
    expect(r.cover.facts.slice(0, 3)).toEqual([['Method', 'PDCA'], ['Line', 'Line 7'], ['Lead', 'Rowland']]);
    expect(r.cover.tiles.map(t => [t.k, t.v])).toEqual([['Sections written', '0'], ['Tool results', '0'], ['To look at', '0'], ['Late actions', '0']]);
    expect(r.sections.map(s => s.id)).toEqual(['journey', 'telling', 'attention', 'wrote']);
    expect(r.cover.sub).toBe(r.dash.says);
    expect(r.cover.verdict).toEqual({ text: 'Not started yet', tone: 'n' });
  });
  it('a missing line and lead are said, not blanked', () => {
    const r = methodReportModel(base({ line: '', project: { name: 'X' } }));
    expect(r.cover.facts.slice(1, 3)).toEqual([['Line', 'No line yet'], ['Lead', 'Not named yet']]);
  });
  it('the journey: a bar and a row per section, “you are here” on the first not written, written n of m', () => {
    const plan: Record<string, string> = {};
    const fs = fieldsOf('pdca', 'Plan');
    for (const f of fs) plan[f.id] = 'done';
    const r = methodReportModel(base({ answers: plan }));
    const t = r.sections[0].items.find(i => i.kind === 'table');
    expect(t && t.kind === 'table' && t.rows.map(x => x.slice(0, 3))).toEqual([
      ['1. Plan', 'All written', `${fs.length} of ${fs.length}`], ['2. Do — you are here', 'Not started', `0 of ${fieldsOf('pdca', 'Do').length}`],
      ['3. Check', 'Not started', `0 of ${fieldsOf('pdca', 'Check').length}`], ['4. Act', 'Not started', `0 of ${fieldsOf('pdca', 'Act').length}`]]);
    expect(r.cover.tiles[0]).toMatchObject({ v: '1', of: 'of 4' });
    const b = r.sections[0].items.find(i => i.kind === 'bars');
    expect(b && b.kind === 'bars' && b.bars[0]).toMatchObject({ v: 1, text: `${fs.length} of ${fs.length} written` });
  });
  it('a tool’s result is in its own sentence, placed in its section, and a tool with no £ in its sentence names the input it needs', () => {
    const r = methodReportModel(base({ studies: [cap()] }));
    const tool = r.sections[1].items.find(i => i.kind === 'tool');
    expect(tool).toMatchObject({ kind: 'tool', id: 's1', key: 'capability', section: 'Plan', tool: 'Capability study' });
    const money = r.sections[1].items.filter(i => i.kind === 'money');
    expect(money).toHaveLength(1);
    expect(money[0]).toMatchObject({ missing: true });
    expect(money[0].kind === 'money' && money[0].text).toBe('Capability study (Capability study — Seal temp) says no money yet — it needs the cost a kilo of the product (for give-away) or the margin a pack. Nothing is estimated.');
    expect(r.cover.tiles[1]).toMatchObject({ v: '1', of: 'from 1 tool' });
  });
  it('money is a tool’s own clauses, cut at its own breaks, never summed', () => {
    expect(moneyClauses('Cp 1.2 — capable. Costs £40 idle labour · £128 lost contribution a shift; 3 stops.')).toEqual(['Costs £40 idle labour · £128 lost contribution a shift;']);
    expect(moneyClauses('no pounds here')).toEqual([]);
  });
  it('attention: the dashboard’s rules in order, then who owes what by when — late first, then by day, nobody yet said', () => {
    const owed = [
      { kind: 'next', what: 'Order film', owner: 'Sam', due: '2026-11-20', doneAt: null },
      { kind: 'next', what: 'Re-set the dancer', due: '2026-11-03', doneAt: null },
      { kind: 'next', what: 'Done', owner: 'Sam', due: '2026-11-01', doneAt: 9 },
    ];
    const r = methodReportModel(base({ owed }));
    const a = r.sections[2];
    expect(a.items[0]).toMatchObject({ kind: 'callout', tone: 'r', word: 'Needs attention', text: '1 action is late: Re-set the dancer.' });
    const t = a.items.find(i => i.kind === 'table');
    expect(t && t.kind === 'table' && t.rows).toEqual([['Re-set the dancer', 'Nobody yet', '3 Nov', 'Late'], ['Order film', 'Sam', '20 Nov', 'Open']]);
    expect(r.cover.tiles[3]).toMatchObject({ v: '1', of: 'of 2 open actions', tone: 'r' });
    expect(r.cover.tiles[2]).toMatchObject({ v: '1', tone: 'r' });
  });
  it('nothing flagged and no actions say so', () => {
    const r = methodReportModel(base());
    expect(r.sections[2].lead).toBe('Nothing is flagged.');
    expect(r.sections[2].items).toEqual([{ kind: 'paragraph', text: 'No open actions on this project.' }]);
  });
  it('what we wrote: every question, a missing answer said, never invented', () => {
    const f0 = fieldsOf('pdca', 'Plan')[0];
    const r = methodReportModel(base({ answers: { [f0.id]: 'Packs a minute' } }));
    const w = r.sections[r.sections.length - 1];
    expect(w.title).toBe('What we wrote — PDCA');
    const qa = w.items[0];
    expect(qa.kind === 'qa' && qa.title).toBe('Plan');
    expect(qa.kind === 'qa' && qa.rows[0]).toEqual({ q: f0.label, a: 'Packs a minute', written: true });
    expect(qa.kind === 'qa' && qa.rows[1]).toMatchObject({ a: 'Not written yet.', written: false });
    expect(w.items.length).toBe(4);
  });
  it('a method’s own sections slot in before “what we wrote”, add their flags to attention and the tiles, and retitle the appendix', () => {
    const own: MethodReportFn = ctx => [{ id: 'cycles', title: 'The PDCA cycles', items: [{ kind: 'paragraph', text: `One cycle on ${ctx.project.name}.` }], flags: [{ text: 'Cycle 1 has no Check.', tone: 'a' }] }];
    const r = methodReportModel(base(), own);
    expect(r.sections.map(s => s.id)).toEqual(['journey', 'telling', 'attention', 'cycles', 'wrote']);
    expect(r.sections[2].items[0]).toMatchObject({ kind: 'callout', tone: 'a', text: 'Cycle 1 has no Check.' });
    expect(r.cover.tiles[2]).toMatchObject({ v: '1', tone: 'a' });
    expect(r.sections[4].title).toBe('Everything we wrote');
  });
  it('the closing line answers the three questions: where, why, what we are doing', () => {
    const r = methodReportModel(base({ owed: [{ kind: 'next', what: 'Re-set the dancer', due: '2026-11-03', doneAt: null }] }));
    expect(r.closing.text).toBe('0 of 4 sections written · 0 tools reporting · 1 thing to look at · 1 late. Why: 1 action is late: Re-set the dancer. Doing about it: 1 action late, 1 action open — next: in Plan, write “The number we are improving”.');
    expect(r.closing.tone).toBe('r');
  });
  it('every line of words is listed for the page and the paper to be read against; the lean cover carries the tiles', () => {
    const r = methodReportModel(base({ studies: [cap()] }));
    const lines = reportLines(r);
    expect(lines).toContain(r.closing.text);
    expect(lines).toContain(r.dash.findings[0].says);
    expect(r.sections.flatMap(s => s.items.flatMap(itemLines)).length).toBeGreaterThan(10);
    expect(leanPageOf(r).tiles).toBe(r.cover.tiles);
  });
});
