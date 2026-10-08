/* @vitest-environment jsdom
 *
 * AN OPEN CRITICAL PROBLEM, IMPOSSIBLE TO MISS — Rowland, 6 October: "the
 * ability to say in a report: look at this, this is a major problem,
 * potential solutions." One reading (lib/critical criticalProblems), and every
 * place its stage or job shows says it: Needs you leads with it, the control
 * room counts it, the day leads with it and says it the day it was written,
 * and the plan's stage carries "1 critical" on screen and on paper. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { criticalItems, jobItems, needsYou, portfolio, type JobInput } from '../portfolio';
import { dayOf } from '../day';
import { gantt, withMachines } from '../gantt';
import { drawGantt } from '../ganttPdf';
import { standing } from '../standing';
import type { Project } from '../../types';
import type { Asset, Test, TestItem } from '../testing';

const TODAY = '2026-10-06';
const at = (iso: string) => new Date(`${iso}T10:00:00`).getTime();
const project = { id: 'j', name: 'Line 2B commissioning', color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true } as unknown as Project;
const wrapper: Asset = { id: 'a1', projectId: 'j', name: 'Pick and place', state: 'onSite', onSiteOn: '2026-09-22', sort: 1, updatedAt: 1 };
const programs: Test = { id: 's1', projectId: 'j', kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: wrapper.id, outcome: 'planned', plannedFor: '2026-10-08', sort: 1, createdAt: 1, updatedAt: 1 };
const dry: Test = { id: 's2', projectId: 'j', kind: 'install', title: 'Dry run', assetId: wrapper.id, outcome: 'planned', plannedFor: '2026-09-30', sort: 2, createdAt: 1, updatedAt: 1 };
const crit: TestItem = {
  id: 'c1', projectId: 'j', testId: programs.id, kind: 'found', what: 'Programs cannot be copied over', owner: 'Ilapak UK',
  critical: true, impact: 'The line cannot go back to production on the agreed day.',
  ways: [{ id: 'w1', what: 'A belt to bypass the robot', agreed: true }], sort: 1, createdAt: at('2026-10-05'), updatedAt: 1,
};
const plain: TestItem = { id: 'c2', projectId: 'j', testId: programs.id, kind: 'found', what: 'A guard rattles', sort: 2, createdAt: at('2026-10-05'), updatedAt: 1 };
const j: JobInput = { project, tests: [programs, dry], items: [crit, plain], materials: [], programs: [], assets: [wrapper] };

describe('Needs you and the control room', () => {
  it('reads each open critical problem as a row that opens the problem itself, with where, impact and state', () => {
    /* One door (docs/DOORS.md): the row opens the problem; its stage is one tap from it. */
    expect(criticalItems(j)).toEqual([expect.objectContaining({
      id: 'c1', kind: 'setup', what: 'Programs cannot be copied over', who: 'Ilapak UK', late: false,
      critical: { where: 'Pick and place — Programs loaded', impact: 'The line cannot go back to production on the agreed day.', state: 'open · going with: A belt to bypass the robot' },
    })]);
  });

  it('leads Needs you with it, outside the cap, and counts the rest as before', () => {
    const n = needsYou([...criticalItems(j), ...jobItems(j, TODAY)], TODAY, { max: 1 });
    expect(n.rows.map(r => `${r.urgency}:${r.item.what}`)).toEqual(['critical:Programs cannot be copied over', 'late:Dry run']);
    expect(n).toMatchObject({ critical: 1, late: 1, more: 1, undated: 0 });
  });

  it('counts it on the job row and across the board — never as a thing owed or late', () => {
    const pf = portfolio([j], TODAY);
    expect(pf.jobs[0].critical.map(x => x.what)).toEqual(['Programs cannot be copied over']);
    expect(pf.totals).toMatchObject({ critical: 1, late: 1 });
    expect(pf.items.some(x => x.critical)).toBe(false);
    expect(pf.owes.reduce((t, o) => t + o.open, 0)).toBe(pf.items.length);
  });

  it('is gone once it is sorted', () => {
    const sorted = { ...j, items: [{ ...crit, doneAt: at('2026-10-06') }, plain] };
    expect(criticalItems(sorted)).toEqual([]);
    expect(portfolio([sorted], TODAY).totals.critical).toBe(0);
  });
});

describe('the day', () => {
  const input = { tests: [programs, dry], items: [crit, plain], assets: [wrapper], materials: [], programs: [] };

  it('leads today with every open critical problem, one line each, and says it in the headline', () => {
    const d = dayOf(input, TODAY, TODAY);
    expect(d.sections[0].key).toBe('critical');
    expect(d.sections[0].lines.map(l => l.text)).toEqual([
      'Critical: Programs cannot be copied over (Pick and place) — Programs loaded · open · going with: A belt to bypass the robot.',
    ]);
    /* The line opens the problem itself (ui/ProblemRecord, docs/DOORS.md). */
    expect(d.sections[0].lines[0]).toMatchObject({ id: crit.id, tone: 'bad', mark: 'Critical', detail: crit.impact });
    expect(d.headline.startsWith('1 critical open. ')).toBe(true);
  });

  it('on the day it was written, says it once — leading the day while open, never among what was found', () => {
    const d = dayOf(input, '2026-10-05', TODAY);
    const texts = (k: string) => d.sections.find(s => s.key === k)?.lines.map(l => l.text) ?? [];
    expect(texts('critical')).toHaveLength(1);
    expect(texts('wrong')).toEqual([]);
    expect(texts('found')).toEqual(['A guard rattles']);
  });

  it('written and sorted the same day, it is in what did not go to plan, as critical', () => {
    const sameDay = { ...input, items: [{ ...crit, doneAt: at('2026-10-05') + 3_600_000 }, plain] };
    const d = dayOf(sameDay, '2026-10-05', TODAY);
    const texts = (k: string) => d.sections.find(s => s.key === k)?.lines.map(l => l.text) ?? [];
    expect(texts('critical')).toEqual([]);
    expect(texts('wrong')).toEqual(['Critical: Programs cannot be copied over (Pick and place) — Programs loaded.']);
  });

  it('a day before it was written does not carry it', () => {
    const d = dayOf(input, '2026-10-01', TODAY);
    expect(d.sections.some(s => s.key === 'critical')).toBe(false);
  });
});

describe('the plan', () => {
  const st = standing({ tests: [programs, dry], items: [crit, plain], assets: [wrapper], materials: [], programs: [], today: TODAY });
  const g = gantt(st.plan, { today: TODAY }, { tests: [programs, dry], items: [crit, plain] });
  const row = g.groups.flatMap(x => x.rows).find(r => r.id === programs.id);

  it('carries the count on the stage’s own row — never a row of its own', () => {
    expect(row?.critical).toBe(1);
    expect(g.groups.flatMap(x => x.rows).find(r => r.id === dry.id)?.critical).toBeUndefined();
    expect(g.groups.flatMap(x => x.rows).some(r => r.label.includes('copied over'))).toBe(false);
  });

  it('says it in the machine’s band and prints "1 CRITICAL" beside the stage on paper', () => {
    const gm = withMachines(g, { assets: [wrapper], tests: [programs, dry], items: [crit, plain], today: TODAY });
    expect(gm.machines![0].says).toContain('1 critical');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const said: string[] = [];
    const orig = doc.text.bind(doc);
    (doc as unknown as { text: (...a: unknown[]) => jsPDF }).text = (t: unknown, ...rest: unknown[]) => {
      said.push(...(Array.isArray(t) ? t.map(String) : [String(t)]));
      return (orig as (...a: unknown[]) => jsPDF)(t, ...rest);
    };
    drawGantt(doc, gm, { eyebrow: 'X', title: 'The plan' });
    expect(said).toContain('1 CRITICAL');
  });
});
