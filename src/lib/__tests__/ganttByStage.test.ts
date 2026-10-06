/* @vitest-environment jsdom
 *
 * THE PLAN BY STAGE — Rowland, 6 October: "when I do by stage I lose my
 * ability to see clearly by each machine … I can see machine by stage at
 * exactly the same time." Each stage is a heading with one row per machine
 * under it, named by the machine; Commission's tests sit under their machine.
 * The paper draws the same. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { byStage, gantt } from '../gantt';
import { drawGantt } from '../ganttPdf';
import { standing } from '../standing';
import type { Asset, Test } from '../testing';

const TODAY = '2026-10-05';
let n = 0;
const asset = (o: Partial<Asset> & { name: string }): Asset =>
  ({ id: `a${++n}`, projectId: 'p', state: 'onSite', sort: n, updatedAt: 1, ...o });
const step = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `s${++n}`, projectId: 'p', kind: 'install', outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });

/* Sorted 20, 10 on purpose: the machines' order is their sort. */
const weigher = asset({ name: 'Ishida checkweigher', sort: 20 });
const wrapper = asset({ name: 'Ilapak flow wrapper', sort: 10 });
const assets = [weigher, wrapper];
const tests: Test[] = [
  step({ id: 'w-io', title: 'Sensors checked', assetId: weigher.id, plannedFor: '2026-10-02' }),            // late, and on no list
  step({ id: 'w-dry', title: 'Dry run', assetId: weigher.id, plannedFor: '2026-10-07' }),
  step({ id: 'w-pos', title: 'Positioned and levelled', assetId: weigher.id, plannedFor: '2026-09-28', ranOn: '2026-09-28', outcome: 'passed' }),
  step({ id: 'p-pos', title: 'Positioned and levelled', assetId: wrapper.id, plannedFor: '2026-09-30', ranOn: '2026-09-30', outcome: 'passed' }),
  step({ id: 'p-dry', title: 'Dry run', assetId: wrapper.id, plannedFor: '2026-10-08' }),
  step({ id: 'line-air', title: 'Line air ring main', plannedFor: '2026-10-06' }),
  step({ id: 'p-seal', kind: 'test', title: 'Seal integrity', assetId: wrapper.id, plannedFor: '2026-10-09' }),
  step({ id: 'w-wt', kind: 'test', title: 'Weight accuracy', assetId: weigher.id, plannedFor: '2026-10-01' }),
];
const st = standing({ tests, items: [], assets, materials: [], programs: [], today: TODAY });
const g = byStage(gantt(st.plan, { today: TODAY }, { tests, items: [] }), { assets, tests });
const group = (kind: string) => g.groups.find(gr => gr.kind === kind)!;

describe('the plan by stage', () => {
  it('heads each stage in the order of the job’s list, then the rest in the order they were planned', () => {
    expect(group('install').subs!.map(s => s.label)).toEqual(['Positioned and levelled', 'Dry run', 'Sensors checked', 'Line air ring main']);
  });

  it('follows the job’s own list when it has one', () => {
    const own = byStage(gantt(st.plan, { today: TODAY }, { tests, items: [] }), { assets, tests, stages: { install: ['Dry run', 'Positioned and levelled'] } });
    expect(own.groups.find(gr => gr.kind === 'install')!.subs!.map(s => s.label).slice(0, 2)).toEqual(['Dry run', 'Positioned and levelled']);
  });

  it('puts one row per machine under a stage, named by the machine, in the machines’ order', () => {
    const pos = group('install').subs![0];
    expect(pos.rows.map(r => r.label)).toEqual(['Ilapak flow wrapper', 'Ishida checkweigher']);
    expect(pos.rows.every(r => !r.on)).toBe(true);
    expect(pos.n).toBe('2 machines');
    /* A step on no machine is the line's, said so. */
    expect(group('install').subs![3].rows.map(r => r.label)).toEqual(['The line']);
  });

  it('says what is abnormal under each heading, in words', () => {
    const io = group('install').subs!.find(s => s.label === 'Sensors checked')!;
    expect(io.n).toBe('1 machine');
    expect(io.bad).toBe('1 late');
    expect(group('install').subs![0].bad).toBe('');
  });

  it('puts Commission’s tests under their machine, each named by its title', () => {
    const c = group('test').subs!;
    expect(c.map(s => s.label)).toEqual(['Ilapak flow wrapper', 'Ishida checkweigher']);
    expect(c[1].rows.map(r => r.label)).toEqual(['Weight accuracy']);
    expect(c[1].n).toBe('1 test');
  });

  it('keeps every row: the group’s rows are its headings’ rows, the same records', () => {
    for (const gr of g.groups) if (gr.subs) expect(gr.rows.map(r => r.id)).toEqual(gr.subs.flatMap(s => s.rows.map(r => r.id)));
    expect(g.groups.flatMap(gr => gr.rows).length).toBe(gantt(st.plan, { today: TODAY }, { tests, items: [] }).groups.flatMap(gr => gr.rows).length);
  });

  it('leaves a job with nothing on a machine as it was', () => {
    const plain = gantt(st.plan, { today: TODAY }, { tests, items: [] });
    expect(byStage(plain, { assets: [], tests })).toBe(plain);
  });
});

describe('the plan by stage, on paper', () => {
  const texts = (doc: jsPDF) => {
    const out: string[] = [];
    const orig = doc.text.bind(doc);
    (doc as unknown as { text: (...a: unknown[]) => jsPDF }).text = (t: unknown, ...rest: unknown[]) => {
      out.push(...(Array.isArray(t) ? t.map(String) : [String(t)]));
      return (orig as (...a: unknown[]) => jsPDF)(t, ...rest);
    };
    return out;
  };

  it('prints each stage’s heading and the machines under it by name', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    drawGantt(doc, g, { eyebrow: 'X', title: 'The plan' });
    expect(said).toContain('Positioned and levelled');
    expect(said).toContain('· 2 machines');
    expect(said).toContain('· 1 late');
    expect(said.filter(t => t === 'Ilapak flow wrapper').length).toBeGreaterThanOrEqual(3);   // two stages and its tests' heading
    expect(said.some(t => /— Positioned and levelled/.test(t))).toBe(false);
  });

  it('folds a huge job to one lane per stage, saying how many machines and how many are late', () => {
    const many: Asset[] = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, projectId: 'p', name: `Machine ${i + 1}`, state: 'onSite', sort: i, updatedAt: 1 }));
    const ts: Test[] = many.flatMap((a, i) => Array.from({ length: 15 }, (_, j) => ({
      id: `t${i}-${j}`, projectId: 'p', kind: 'install' as const, title: `Stage ${j + 1}`, assetId: a.id, outcome: 'planned' as const,
      plannedFor: `2026-10-${String(5 + ((i + j) % 20)).padStart(2, '0')}`, sort: j, createdAt: 1, updatedAt: 1,
    })));
    const s2 = standing({ tests: ts, items: [], assets: many, materials: [], programs: [], today: TODAY });
    const big = byStage(gantt(s2.plan, { today: TODAY }, { tests: ts, items: [] }), { assets: many, tests: ts });
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const pages = drawGantt(doc, big, { eyebrow: 'X', title: 'The plan' });
    expect(pages.length).toBeLessThanOrEqual(2);
    expect(said).toContain('Stage 1');
    expect(said).toContain('12 machines');
  });
});
