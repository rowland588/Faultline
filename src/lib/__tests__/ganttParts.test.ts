/* @vitest-environment jsdom
 *
 * THE PLAN, READABLE — Rowland, 6 October: "I can't see where I am; what is
 * 'the line and the whole job'?; the reminders are great but again small" and
 * "The sub category I put in on Set up — Programs doesn't show on the map. It
 * should appear like a branch." Parts of the plan hang under their stage, each
 * machine's next stage says "Next", the whole job's band says what is in it,
 * and a reminder's own words reach the paper. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { byStage, gantt, jobContents, JOB_BAND, nextSteps, partOf, partsWords, withMachines, withNext } from '../gantt';
import { drawGantt } from '../ganttPdf';
import { standing } from '../standing';
import type { Asset, Test, TestItem } from '../testing';

const TODAY = '2026-10-06';
let n = 0;
const asset = (o: Partial<Asset> & { name: string }): Asset =>
  ({ id: `a${++n}`, projectId: 'p', state: 'onSite', sort: n, updatedAt: 1, ...o });
const step = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `s${++n}`, projectId: 'p', kind: 'install', outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const item = (o: Partial<TestItem> & { testId: string; what: string }): TestItem =>
  ({ id: `i${++n}`, projectId: 'p', kind: 'next', sort: n, createdAt: 1, updatedAt: 1, ...o });

const wrapper = asset({ name: 'Ilapak flow wrapper', state: 'running', runningOn: '2026-09-25' });
const weigher = asset({ name: 'Ishida checkweigher' });
const assets = [wrapper, weigher];
const tests: Test[] = [
  step({ id: 'w-pos', title: 'Positioned and levelled', assetId: weigher.id, plannedFor: '2026-09-28', ranOn: '2026-09-28', outcome: 'passed' }),
  step({ id: 'w-air', title: 'Air and power connected', assetId: weigher.id, plannedFor: '2026-10-08' }),
  step({ id: 'w-dry', title: 'Dry run', assetId: weigher.id, plannedFor: '2026-10-12' }),
  step({ id: 'p-prog', title: 'Programs loaded', gate: 'setup', assetId: wrapper.id, plannedFor: '2026-10-02', ranOn: '2026-10-02', outcome: 'passed' }),
  step({ id: 'p-chg', title: 'Change parts fitted', gate: 'setup', assetId: wrapper.id, plannedFor: '2026-10-09' }),
  step({ id: 'p-seal', kind: 'test', title: 'Seal integrity', assetId: wrapper.id, plannedFor: '2026-10-10' }),
  step({ id: 'line-air', title: 'Line air ring main', plannedFor: '2026-10-07' }),
];
const items: TestItem[] = [
  item({ testId: 'p-prog', what: 'First program to verify Tesco Express 1.25 packs through the de-nester and the pick and place', owner: 'Ilapak UK', due: '2026-10-08' }),
  item({ testId: 'p-prog', what: 'Back up the programs', due: '2026-10-01', doneAt: Date.parse('2026-10-03T10:00:00Z') }),
  item({ testId: 'p-prog', what: 'Agree the recipe names', due: '2026-11-20' }),             // widens the calendar
  item({ testId: 'p-seal', what: 'Re-run with the new film' }),                              // a test's next step — not a part
  item({ testId: 'w-air', kind: 'note', what: 'Not a part' }),
];
const st = standing({ tests, items, assets, materials: [], programs: [], today: TODAY });
const g = gantt(st.plan, { today: TODAY }, { tests, items });
const row = (id: string) => g.groups.flatMap(gr => gr.rows).find(r => r.id === id)!;

describe('a stage’s parts on the plan', () => {
  it('reads each part’s state the way the floor would: done, late, due soon, booked, or no day yet', () => {
    expect(partOf(item({ testId: 'x', what: 'a', doneAt: Date.parse('2026-10-06T09:00:00Z') }), TODAY)).toMatchObject({ state: 'done', says: 'done 6 Oct' });
    expect(partOf(item({ testId: 'x', what: 'a', due: '2026-10-04' }), TODAY)).toMatchObject({ state: 'late', says: 'late — due 4 Oct' });
    expect(partOf(item({ testId: 'x', what: 'a', due: '2026-10-08' }), TODAY)).toMatchObject({ state: 'soon', says: 'due 8 Oct' });
    expect(partOf(item({ testId: 'x', what: 'a', due: '2026-10-09' }), TODAY)).toMatchObject({ state: 'booked' });
    expect(partOf(item({ testId: 'x', what: 'a' }), TODAY)).toMatchObject({ state: 'todo', says: 'to do' });
  });

  it('hangs them under their stage, in the order written, with the stage saying how many', () => {
    const r = row('p-prog');
    expect(r.parts!.map(p => p.label)).toEqual([
      'First program to verify Tesco Express 1.25 packs through the de-nester and the pick and place', 'Back up the programs', 'Agree the recipe names']);
    expect(r.parts![0]).toMatchObject({ owner: 'Ilapak UK', state: 'soon' });
    expect(r.partsSay).toBe('3 parts · 1 done');
    expect(partsWords([{ state: 'late' }])).toBe('1 part · 1 late');
  });

  it('marks a part with a day on that day, widening the calendar to it; one with no day has no mark', () => {
    const r = row('p-prog');
    expect(g.dayList[r.parts![0].at!].iso).toBe('2026-10-08');
    expect(g.to >= '2026-11-20').toBe(true);
    expect(partOf(item({ testId: 'x', what: 'a' }), TODAY)).not.toHaveProperty('at');
  });

  it('keeps a test’s next steps and the notes off it — parts are a stage’s own', () => {
    expect(row('p-seal').parts).toBeUndefined();
    expect(row('w-air').parts).toBeUndefined();
  });

  it('carries them into both views', () => {
    const gm = withMachines(g, { assets, tests, items, today: TODAY });
    expect(gm.machines!.flatMap(b => b.groups.flatMap(gr => gr.rows)).find(r => r.id === 'p-prog')!.parts).toHaveLength(3);
    const gs = byStage(g, { assets, tests });
    expect(gs.groups.find(gr => gr.kind === 'setup')!.subs![0].rows[0].parts).toHaveLength(3);
  });
});

describe('where am I', () => {
  it('says "Next" on each machine’s next stage not yet done — in the gate it is at', () => {
    const ids = nextSteps({ assets, tests, items, today: TODAY });
    /* The weigher is at Install: its first step not done. The wrapper is in
       and at Set up: its change parts. */
    expect([...ids].sort()).toEqual(['p-chg', 'w-air']);
    const gn = withNext(g, { assets, tests, items, today: TODAY });
    expect(gn.groups.flatMap(gr => gr.rows).filter(r => r.next).map(r => r.id).sort()).toEqual(['p-chg', 'w-air']);
  });

  it('names the band of what is on no one machine for what it is, and says what is in it', () => {
    expect(JOB_BAND).toBe('Whole job — not on one machine');
    expect(jobContents([{ kind: 'handover' }, { kind: 'material' }, { kind: 'program' }], true)).toBe('handover · materials · programs · the filmed walk');
    const gm = withMachines(g, { assets, tests, items, today: TODAY });
    expect(gm.machines!.find(b => b.name === JOB_BAND)!.says).toBe('install on the line');
  });
});

describe('on paper', () => {
  const texts = (doc: jsPDF) => {
    const out: string[] = [];
    const orig = doc.text.bind(doc);
    (doc as unknown as { text: (...a: unknown[]) => jsPDF }).text = (t: unknown, ...rest: unknown[]) => {
      out.push(...(Array.isArray(t) ? t.map(String) : [String(t)]));
      return (orig as (...a: unknown[]) => jsPDF)(t, ...rest);
    };
    return out;
  };

  it('prints each part under its stage with its state, the stage’s count, and NEXT — in both views', () => {
    for (const view of ['machine', 'stage'] as const) {
      const gn = withNext(g, { assets, tests, items, today: TODAY });
      const drawn = view === 'machine' ? withMachines(gn, { assets, tests, items, today: TODAY }) : byStage(gn, { assets, tests });
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const said = texts(doc);
      drawGantt(doc, drawn, { eyebrow: 'X', title: 'The plan' });
      const all = said.join(' ');
      expect(all).toContain('> First program to verify Tesco Express 1.25 packs');
      expect(all).toContain('the pick and place (Ilapak UK)');
      expect(said).toContain('due 8 Oct');
      expect(said).toContain('done 3 Oct');
      expect(said).toContain('due 20 Nov');
      expect(all).toContain('3 parts · 1 done');
      expect(said).toContain('NEXT');
    }
  });

  it('prints a reminder as a mark with its own words beside it, and says what it is in the label', () => {
    const note: TestItem = { id: 'n1', projectId: 'p', testId: 'meeting', kind: 'note', what: 'Ask Ilapak for the spare jaw heater quote before the handover meeting', due: '2026-10-09', onPlan: true, sort: 1, createdAt: 1, updatedAt: 1 };
    const s2 = standing({ tests, items: [...items, note], assets, materials: [], programs: [], today: TODAY });
    const g2 = gantt(s2.plan, { today: TODAY }, { tests, items: [...items, note] });
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said = texts(doc);
    drawGantt(doc, g2, { eyebrow: 'X', title: 'The plan' });
    expect(said.join(' ')).toContain('Ask Ilapak for the spare jaw heater quote before the handover meeting');
    expect(said.some(t => t.startsWith('Reminder · '))).toBe(true);
    expect(said).toContain('to come');
  });
});
