// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { jsPDF } from 'jspdf';
import { describe, expect, it, vi } from 'vitest';
import * as db from '../../../db';
import { placementNote } from '../../../lib/methodPlacement';
import { methodByKey } from '../../../lib/methods';
import { reportLines } from '../../../lib/methodReportModel';
import { methodReportBlocks, saveMethodReportPdf } from '../../../lib/report/methodReport';
import { pour } from '../../../lib/report/flow';
import { exportEverything } from '../../../lib/exportAll';
import * as save from '../../../lib/savePdf';
import * as writer from '../../../lib/xlsxWrite';
import type { PaceTodoRow } from '../../../db/rows';
import type { ToolStudy } from '../../../lib/study';
import * as a3Paper from '../../../lib/report/a3Paper';
import { drawCharterPaper } from '../../../lib/report/charterPaper';
import * as eightDPaper from '../../../lib/report/eightDPaper';
import { PAPERS } from '../papers';
import { loadMethodReport } from '../reportData';

describe('customer evidence for a method project', () => {
  it.each(['a3', 'eight-d'] as const)('uses live tracker actions in the %s specialist paper and customer report', async method => {
    const project = await db.createProject('Wrapper project ' + method, '#000', undefined, undefined, 'board', method);
    const row = (field: string, what: string) => db.putTestItem({ id: project.id + field, projectId: project.id, testId: `method:${method}:${field}`,
      kind: 'note', what, createdAt: 1, updatedAt: 1, sort: 1 });
    await row(method === 'a3' ? 'counter' : 'act@1', 'Obsolete worksheet text');
    await row('tracked@1', project.id + '-action');
    await db.putPaceTodo({ id: project.id + '-action', projectId: project.id, what: 'Retimed the wrapper', who: 'Pat', where: '', when: '',
      why: 'Variable infeed', state: 'done', outcome: 'The queue cleared', createdAt: 1, updatedAt: 1 });
    const got = await loadMethodReport(project.id);
    if (!got) throw new Error('Project report unavailable');
    const report = reportLines(got.report).join(' ');
    expect(report).toContain('Retimed the wrapper');
    expect(report).toContain('The queue cleared');
    expect(report).not.toContain('Obsolete worksheet text');

    const a3 = vi.spyOn(a3Paper, 'saveA3Pdf').mockResolvedValue(undefined);
    const eightD = vi.spyOn(eightDPaper, 'saveEightDPdf').mockResolvedValue(undefined);
    try {
      await PAPERS[method]![0].make(project.id);
      const doc = new jsPDF({unit: 'pt', orientation: method === 'a3' ? 'landscape' : 'portrait', format: method === 'a3' ? 'a3' : 'a4'});
      const drawn = vi.spyOn(doc, 'text');
      if (method === 'a3') await a3Paper.drawA3Paper(doc, a3.mock.calls[0][0]);
      else await eightDPaper.drawEightDPaper(doc, eightD.mock.calls[0][0]);
      const paper = drawn.mock.calls.flatMap(call => call[0]).join('').replace(/\s+/g, '');
      for (const text of ['Retimed the wrapper', 'Pat', 'The queue cleared']) expect(paper).toContain(text.replace(/\s+/g, ''));
      expect(paper).not.toContain('Obsoleteworksheettext');
    } finally { vi.restoreAllMocks(); }
  });
  it('prints phase evidence separately from the worksheet or review it recommends next', async () => {
    const project = await db.createProject('Out of order trials', '#000', undefined, undefined, 'board', 'dmaic');
    for (const [section, name] of [['Measure', 'Reference gauge trial'], ['Improve', 'Discharge pilot']]) {
      await db.putStudy({id: name, projectId: project.id, name, tool: 'analysis', facts: {}, uses: [],
        createdAt: 1, startedAt: 1, updatedAt: 1}, {projectId: project.id, method: 'dmaic', section});
    }
    const got = await loadMethodReport(project.id);
    if (!got) throw new Error('Project report unavailable');
    const delivery = vi.spyOn(save, 'deliverPdf').mockResolvedValue('downloaded');
    try {
      await saveMethodReportPdf({ project: project.name, methodName: 'DMAIC', report: got.report, data: got.paper, todayISO: got.today });
      const bytes = delivery.mock.calls[0][0].output();
      const words = [...bytes.matchAll(/\((.*?)\) Tj/g)].map(group => group[1]).join(' ').replace(/\s+/g, ' ');
      expect(words).toMatch(/Activity recorded in Measure, Improve/i);
      expect(words).toMatch(/2\. Measure Activity recorded 0 of 4 1/);
      expect(words).toMatch(/4\. Improve Activity recorded 0 of 3 1/);
      expect(words).toMatch(/Define No review recorded/);
      expect(words).toMatch(/Measure No review recorded/);
      expect(words).toMatch(/Reference gauge trial/);
      expect(words).toMatch(/Discharge pilot/);
      expect(words).not.toMatch(/you are (in|here)|in hand|not started/i);
    } finally { delivery.mockRestore(); }
  });
  it('preserves a recorded unsigned review in the printed charter', async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    await drawCharterPaper(doc, { project: 'Phase reviews', printed: '25 November 2026',
      answers: { rv_measure_result: 'passed', rv_improve_note: 'Await pilot readings' }, evidence: [] });
    const words = [...doc.output().matchAll(/\((.*?)\) Tj/g)].map(group => group[1]).join(' ');
    expect(words).toMatch(/MEASURE.*?questions written.*?Passed/i);
    expect(words).toMatch(/IMPROVE.*?questions written.*?Notes recorded Await pilot readings/i);
    expect(words).not.toMatch(/not started|no review held or booked/i);
  });
  it('prints the chosen project’s decisions, complete tool uses, current walk and real actions on a shared line', async () => {
    const p = await db.createProject('June packaging trial', '#000', undefined, undefined, 'board', 'pdca');
    const peer = await db.createProject('Peer customer report', '#000', undefined, undefined, 'board', 'a3');
    const w = await db.createWorkspace('Shared packaging line');
    for (const project of [p, peer]) await db.addPaceLine({ projectId: project.id, key: w.id, name: w.name, workspaceId: w.id });
    const at = 123;
    const study = (id: string, projectId: string, tool: ToolStudy['tool'], facts: ToolStudy['facts']): ToolStudy =>
      ({ id, projectId, workspaceId: w.id, name: id, tool, facts, uses: [], createdAt: at, updatedAt: at, startedAt: at });
    for (const id of ['Baseline pressure', 'Follow-up pressure']) {
      await db.putStudy(study(id, p.id, 'capability', {}));
      await db.putTestItem(placementNote({ projectId: p.id, method: 'pdca', section: id.startsWith('Baseline') ? 'Plan' : 'Check' }, 'study', id, at));
    }
    const note = (title: string, t: number) => ({ id: title, at: t, kind: 'reply' as const, doc: { title, kind: 'line-walk' as const,
      sections: [{ heading: 'Engineering finding', text: title + ' body', points: [], photos: [] }] } });
    await db.putStudy(study('Walk at the filler', p.id, 'talk', { turns: [note('Obsolete walk', 1), note('Latest walk', 2), { id: 'chat', kind: 'typed', at: 3, text: 'Private raw recording' }] }));
    await db.putTestItem(placementNote({ projectId: p.id, method: 'pdca', section: 'Do' }, 'study', 'Walk at the filler', at));
    await db.putStudy(study('Peer talk', peer.id, 'talk', { turns: [note('Other customer walk', 3)] }));
    await db.putStandard({ id: 'product', projectId: p.id, workspaceId: w.id, product: 'Large cartons', marks: [], note: 'Shift rotation agreed',
      capacity: { stations: [{ id: 's', name: 'Carton collator', kind: 'machine', contains: 1, unit: 'cartons', rate: 30, ratePer: 'min' }] }, createdAt: at, updatedAt: at, sort: 1 });
    await db.putStandard({ id: 'other-product', projectId: peer.id, workspaceId: w.id, product: 'Peer specification', marks: [], createdAt: at, updatedAt: at, sort: 1 });
    for (const [id, projectId] of [['Register issue', p.id], ['Peer observation', peer.id], ['Unassigned shared walk', undefined]]) {
      await db.addSnag({ id: id!, workspaceId: w.id, projectId, problem: id!, status: 'open', raisedAt: at, updatedAt: at });
    }
    const action = (id: string, projectId: string, state: PaceTodoRow['state']): PaceTodoRow =>
      ({ id, projectId, state, what: id, where: '', why: '', who: 'Shift lead', when: '', due: '2020-01-01', createdAt: at, updatedAt: at });
    await db.putPaceTodo(action('Reset speed', p.id, 'waiting'));
    await db.putPaceTodo({ ...action('Measure discharge', p.id, 'done'), outcome: 'Forty cartons per minute' });
    await db.putPaceTodo(action('Peer action', peer.id, 'todo'));
    const result = await loadMethodReport(p.id);
    if (!result) throw new Error('Method report was not available');
    expect(result.method.key).toBe('pdca');
    expect(result.report.dash.findings.map(s => [s.id, s.section])).toEqual([['Baseline pressure', 'Plan'], ['Walk at the filler', 'Do'], ['Follow-up pressure', 'Check']]);
    expect(result.report.dash.actions).toEqual({open: 1, late: 1});
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const printed = vi.spyOn(doc, 'text');
    await pour({ doc, x: 36, w: 523, top: 36, bottom: 786, density: 'comfortable', dry: false },
      methodReportBlocks({ project: p.name, methodName: methodByKey('pdca')!.name, report: result.report, data: result.paper, todayISO: result.today }),
      () => doc.addPage());
    const pdf = printed.mock.calls.flatMap(call => call[0]).join('').replace(/\s+/g, '');
    const screen = reportLines(result.report).join(' ').replace(/\s+/g, '');
    for (const output of [screen, pdf]) {
      for (const word of ['Latest walk body', 'Carton collator', 'Shift rotation agreed', 'Register issue', 'Reset speed', 'Waiting', 'Measure discharge', 'Forty cartons per minute']) {
        expect(output).toContain(word.replace(/\s+/g, ''));
      }
      for (const word of ['Peer action', 'Peer observation', 'Private raw recording', 'Obsolete walk', 'Other customer walk', 'Unassigned shared walk', 'Peer specification']) {
        expect(output).not.toContain(word.replace(/\s+/g, ''));
      }
    }
    const write = vi.spyOn(writer, 'writeXlsx');
    vi.spyOn(save, 'deliverBlob').mockResolvedValue('downloaded');
    await exportEverything(p.id);
    const workbook = JSON.stringify(write.mock.calls[0][0]);
    expect(workbook).toContain('Register issue');
    expect(workbook).toContain('PDCA');
    for (const text of [peer.name, 'Peer observation', 'Unassigned shared walk']) expect(workbook).not.toContain(text);
    vi.restoreAllMocks();
  });
});
