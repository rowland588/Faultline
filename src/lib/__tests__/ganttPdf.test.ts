/* @vitest-environment jsdom
 *
 * The plan on paper: every sheet landscape, the rows carried over the page with
 * the calendar drawn again, and every row on exactly one sheet. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { gantt, withMachines } from '../gantt';
import { standing } from '../standing';
import type { Asset, Test } from '../testing';
import { drawGantt, drawGanttDoc } from '../ganttPdf';
import type { PlanMark } from '../standing';

const TODAY = '2026-10-02';
const steps = (n: number): PlanMark[] => Array.from({ length: n }, (_, i) => ({
  id: `t${i}`, kind: i % 3 === 0 ? 'setup' : 'install', at: `2026-10-${String(5 + (i % 20)).padStart(2, '0')}`,
  until: `2026-10-${String(6 + (i % 20)).padStart(2, '0')}`, label: `Machine ${i} — Step ${i}`, on: `Machine ${i}`, tone: i % 4 === 0 ? 'done' : 'booked',
}));
const texts = (doc: jsPDF) => {
  const out: string[] = [];
  const orig = doc.text.bind(doc);
  (doc as unknown as { text: (...a: unknown[]) => jsPDF }).text = (t: unknown, ...rest: unknown[]) => {
    out.push(...(Array.isArray(t) ? t.map(String) : [String(t)]));
    return (orig as (...a: unknown[]) => jsPDF)(t, ...rest);
  };
  return out;
};

describe('the plan on paper', () => {
  it('fits a short job on one landscape sheet, with every row and the handover on it', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    drawGanttDoc(doc, gantt(steps(6), { today: TODAY, expectedAt: '2026-10-30' }), { name: 'Line 2A', printed: '2 Oct 2026' });
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    for (let i = 0; i < 6; i++) expect(said).toContain(`Step ${i}`);
    expect(said).toContain('Handover 30 Oct');
    expect(said).toContain('1 of 1');
  });

  it('keeps a title with a dash of its own whole — only a machine is split off', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const marks: PlanMark[] = [{ id: 'w', kind: 'test', at: '2026-10-05', label: 'Weight accuracy — 400g', tone: 'booked' }];
    drawGanttDoc(doc, gantt(marks, { today: TODAY }), { name: 'Line 2A', printed: '2 Oct 2026' });
    expect(said).toContain('Weight accuracy — 400g');
    expect(said).not.toContain('400g');
  });

  it('prints the overlap the screen flags, with its key', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const g = gantt(steps(3), { today: TODAY });
    g.groups[0].rows[0].overlap = 'Dry run';
    drawGanttDoc(doc, g, { name: 'Line 2A', printed: '2 Oct 2026' });
    expect(said).toContain('overlaps Dry run');
    expect(said).toContain('starts before the step ahead has finished');
  });

  it('prints the walk as one lane, with its words and its key', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const g = gantt(steps(3), { today: TODAY }, { tests: [], items: [], walk: [
      { id: 'a', what: 'Guard gap', state: 'open', found: '2026-10-05', due: '2026-10-01', wsId: 'w', frameId: 'f' },
      { id: 'b', what: 'Loose cable', state: 'closed', found: '2026-10-06', wsId: 'w', frameId: 'f' },
    ] });
    drawGanttDoc(doc, g, { name: 'Line 2A', printed: '2 Oct 2026' });
    expect(said.filter(t => t === 'Found on the walk')).toHaveLength(1);
    expect(said).toContain('1 open · 1 past due · 1 closed');
    expect(said.some(t => t.startsWith('found on the walk'))).toBe(true);
  });

  it('carries a long plan over the page, each row exactly once, each sheet landscape', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const pages = drawGantt(doc, gantt(steps(70), { today: TODAY }), { eyebrow: 'X', title: 'The plan' });
    expect(pages.length).toBeGreaterThan(1);
    expect(pages).toEqual(Array.from({ length: pages.length }, (_, i) => i + 1));
    for (let i = 0; i < 70; i++) expect(said.filter(t => t === `Step ${i}`).length).toBe(1);
    expect(said.some(t => t.includes('(continued)'))).toBe(true);
    for (const p of pages) {
      doc.setPage(p);
      expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    }
  });

  it('says the dates on a long job by the week, when days will not fit', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    drawGantt(doc, gantt([...steps(3), { kind: 'handover', at: '2027-02-01', label: 'Sign off', tone: 'booked' }], { today: TODAY }), { eyebrow: 'X', title: 'The plan' });
    expect(said).toContain('5 Oct');      // a week, labelled by its Monday
    expect(said).toContain('JAN 27');
  });

  /* BY MACHINE (Rowland, 5 October: "all muddled together"). */
  const job = (machines: number, stages: number) => {
    const assets: Asset[] = Array.from({ length: machines }, (_, i) => ({ id: `a${i}`, projectId: 'p', name: `Machine ${i + 1}`, state: 'onSite', sort: i, updatedAt: 1 }));
    const tests: Test[] = assets.flatMap((a, i) => Array.from({ length: stages }, (_, j) => ({
      id: `t${i}-${j}`, projectId: 'p', kind: 'install' as const, title: `Stage ${j + 1}`, assetId: a.id, outcome: 'planned' as const,
      plannedFor: `2026-10-${String(5 + ((i + j) % 20)).padStart(2, '0')}`, sort: j, createdAt: 1, updatedAt: 1,
    })));
    const st = standing({ tests, items: [], assets, materials: [], programs: [], today: TODAY });
    return withMachines(gantt(st.plan, { today: TODAY }, { tests, items: [] }), { assets, tests, items: [], today: TODAY });
  };

  it('prints each machine as a band: its name, where it stands, its gates, its steps without its name', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const g = job(2, 3);
    drawGanttDoc(doc, g, { name: 'Line 2A', printed: '2 Oct 2026' });
    for (const b of g.machines!) { expect(said).toContain(b.name); expect(said).toContain(b.says); }
    expect(said).toContain('INSTALL');
    expect(said.filter(t => t === 'Stage 1')).toHaveLength(2);
    expect(said.some(t => /^Machine \d+ — /.test(t))).toBe(false);
  });

  it('starts a machine on a fresh page rather than splitting it, when the page is already well used', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const pages = drawGantt(doc, job(3, 8), { eyebrow: 'X', title: 'The plan' });
    expect(pages.length).toBe(2);
    expect(said.some(t => t.includes('(continued)'))).toBe(false);
  });

  it('folds a huge job gate by gate, and keeps every machine and where it stands', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    const g = job(12, 15);
    const pages = drawGantt(doc, g, { eyebrow: 'X', title: 'The plan' });
    expect(pages.length).toBeLessThanOrEqual(4);
    for (const b of g.machines!) { expect(said.some(t => t.startsWith(b.name))).toBe(true); expect(said).toContain(b.says); }
    expect(said).toContain('15 stages');
  });
});
