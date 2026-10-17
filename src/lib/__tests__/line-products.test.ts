/* A LINE'S PRODUCTS, READY OR NOT (BLUEPRINT Stage 3) — lib/lineProducts and
 * the line's lean page (lib/lineLean). Line 7 runs two products and has a
 * changeover timed into a third:
 *   Maris Piper 2kg — its program proved 10 Oct, its line standard set with
 *     2 people, its Line capacity 44 bags a minute against 60 (16 short:
 *     red), its changeover timed into it at 42 min;
 *   Express 1.25 kg — its program's test day 12 Oct gone (red), no line
 *     standard, no capacity, no changeover (amber gaps);
 *   Finest Red 2kg — only a changeover started into it, nothing timed. */
import { describe, expect, it } from 'vitest';
import { lineProducts, productsNext, productsSaid } from '../lineProducts';
import { lineClosing, lineTiles } from '../lineLean';
import type { Program } from '../programs';
import type { Standard } from '../standard';
import type { ToolStudy } from '../study';

const prog = (o: Partial<Program> & Pick<Program, 'id' | 'what'>): Program => ({ projectId: '', workspaceId: 'w7', state: 'onMachine', sort: 0, createdAt: 0, updatedAt: 0, ...o });
const programs = [
  prog({ id: 'p1', what: 'P-12', runs: 'Maris Piper 2kg', state: 'proved', provedOn: '2026-10-10' }),
  prog({ id: 'p2', what: 'P-14', runs: 'Express 1.25 kg', testOn: '2026-10-12' }),
];
const standards = [{
  id: 's1', workspaceId: 'w7', product: 'Maris Piper 2kg', createdAt: 0, updatedAt: 0,
  marks: [{ id: 'm1', kind: 'person', x: 0.2, y: 0.3, label: 'Op 1' }, { id: 'm2', kind: 'person', x: 0.6, y: 0.3, label: 'Op 2' }],
  capacity: { targetPerMin: 60, stations: [
    { id: 'a', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min' },
    { id: 'b', name: 'Packer', kind: 'machine', unit: 'bags', contains: 1, rate: 44, ratePer: 'min' },
  ] },
}] as unknown as Standard[];
const study = (o: Partial<ToolStudy>): ToolStudy => ({ id: 'c', tool: 'changeover', name: 'A changeover', workspaceId: 'w7', facts: {}, uses: [], startedAt: 0, createdAt: 0, updatedAt: 0, ...o } as ToolStudy);
const studies = [
  study({ id: 'c1', facts: { toProduct: 'Maris Piper 2kg', sequence: [{ id: 'x', order: 0, name: 'Change the former', sec: 42 * 60, side: 'internal', source: 'timed', crew: ['Op 1'] }] } as ToolStudy['facts'] }),
  study({ id: 'c2', product: 'Finest Red 2kg', facts: { sequence: [] } as ToolStudy['facts'] }),
];
const today = '2026-10-17';

describe('each product, its four answers', () => {
  const p = lineProducts({ programs, standards, studies, today });
  it('the products in the order first met — programs, standards, changeovers', () => {
    expect(p.rows.map(r => r.name)).toEqual(['Maris Piper 2kg', 'Express 1.25 kg', 'Finest Red 2kg']);
  });
  it('proved, set, short of target in red, timed', () => {
    expect(p.rows[0].cells.map(c => [c.k, c.word, c.tone])).toEqual([
      ['program', 'proved 10 Oct', 'g'],
      ['standard', 'set · 2 people', 'g'],
      ['capacity', '44 a min — 16 short of 60', 'r'],
      ['changeover', '42 min into it', 'g'],
    ]);
  });
  it('a test day gone in red; nothing set is a gap in amber', () => {
    expect(p.rows[1].cells.map(c => [c.word, c.tone])).toEqual([['test was 12 Oct', 'r'], ['not set', 'a'], ['not known', 'a'], ['not timed', 'a']]);
    expect(p.rows[2].cells.map(c => [c.word, c.tone])).toEqual([['no program', 'a'], ['not set', 'a'], ['not known', 'a'], ['started, not timed', 'a']]);
  });
  it('counted and said: none ready, one with gaps, two failing; the worst first', () => {
    expect([p.ready, p.withGaps, p.failing]).toEqual([0, 1, 2]);
    expect(productsSaid(p).map(x => x.text).join('')).toBe('3 products · 0 ready · 1 with gaps · 2 failing');
    expect(productsNext(p)).toBe('Maris Piper 2kg — capacity 44 a min — 16 short of 60');
  });
  it('a booked test ahead is under way (violet), not a gap', () => {
    const q = lineProducts({ programs: [prog({ id: 'p3', what: 'P-20', runs: 'Smash 1kg', testOn: '2026-10-20' })], standards: [], studies: [], today });
    expect(q.rows[0].cells[0]).toEqual({ k: 'program', word: 'test 20 Oct', tone: 'w' });
  });
});

describe('the line as a lean page — tiles and closing line', () => {
  const products = lineProducts({ programs, standards, studies, today });
  const r = { name: 'Line 7', problems: { open: 3, late: 1, critical: 0 }, programs: { n: 2, proved: 1, late: 1 }, products, stops: { n: 4, minutes: 70, worst: 'Bagger' }, day: { margin: 1800, missing: [] }, jobs: 1 };
  it('problems, programs, products, stops and a day of the line in money', () => {
    expect(lineTiles(r).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Problems open', '3', '1 late', 'r'],
      ['Programs proved', '1', 'of 2 · 1 past its test day', 'r'],
      ['Products ready', '0', 'of 3 · 2 failing · 1 with gaps', 'r'],
      ['Stops timed', '70 min', 'lost in 4 stops, the last four weeks — the Bagger most', undefined],
      ['A day of the line', '£1.8k', 'of margin — its speed × its shifts × its margin a pack · 1 job on it', undefined],
    ]);
    expect(lineClosing(r)).toEqual({ text: 'Line 7: 3 problems open — 1 late; 0 of 3 products ready (Maris Piper 2kg — capacity 44 a min — 16 short of 60); 1 program to prove, 1 late; a day of it is worth £1.8k of margin.', tone: 'r' });
  });
  it('a line it cannot price says what to give', () => {
    expect(lineTiles({ ...r, day: { missing: ['its speed', 'its margin a pack'] } })[4]).toEqual({ k: 'A day of the line', v: '—', of: 'give its speed and its margin a pack in Your factory' });
  });
});
