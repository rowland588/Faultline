/* @vitest-environment jsdom
 *
 * A PROJECT RUNNING A METHOD, READ FOR A PERSON — the words each step and
 * stage is said in, the lean page its screen and paper draw, its row in the
 * control room beside the other methods' jobs, and the paper itself: every
 * step and every gate condition printed, nothing cut, a long method running
 * on to more pages. All from the one runtime reading. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import type { Project } from '../../../types';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import type { FlowRecord } from '../records';
import { readFlow } from '../runtime';
import { flowLean, stageWord, stepSquare, stepWord } from '../view';
import { flowJobMissing, flowJobOf, suppliersOf } from '../job';
import { drawFlowReport } from '../reportPdf';
import { portfolio, type PacedInput } from '../../portfolio';
import { planHref } from '../../plan';
import type { FlowProject } from '../operations';
import type { Method } from '../records';

const T = '2026-10-20';
const def: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Commissioning — tray line', purpose: 'From delivery to handover.', kind: 'stagegate',
  roles: [{ key: 'oem', name: 'OEM fitter' }, { key: 'site', name: 'Site engineer' }],
  stages: [
    {
      key: 'mech', name: 'Mechanical',
      steps: [
        { key: 'levelled', title: 'Positioned and levelled', per: 'machine', role: 'oem', answer: 'done', dueDays: 3 },
        { key: 'guards', title: 'Guards fitted', per: 'machine', role: 'site', answer: 'done' },
      ],
      gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }, { id: 'tidy', type: 'manual', label: 'Area guarded', policy: 'block' }] },
    },
    {
      key: 'perf', name: 'Performance',
      steps: [{
        key: 'run', title: 'Performance run', per: 'line', role: 'oem', answer: 'measure',
        fields: [{ key: 'rate', label: 'Rate', type: 'reading', unit: 'packs/min', min: 60, required: true }],
      }],
      gate: { conditions: [{ id: 'rate', type: 'fieldMeets', step: 'run', field: 'rate', op: '>=', value: 60, policy: 'block' }] },
    },
  ],
};
const machines = [{ id: 'm1', name: 'Tray sealer' }, { id: 'm2', name: 'Case packer' }];
let n = 0;
const rec = (o: Partial<FlowRecord>): FlowRecord => ({
  id: `r${++n}`, projectId: 'P', kind: 'step', stageKey: 'mech', version: 1, outcome: 'planned', sort: n, createdAt: n, updatedAt: n, ...o,
});
const project = { id: 'P', name: 'Line 9 tray line', color: '#0c7489' } as Project;

describe('the words a step and a stage are said in', () => {
  it('says done with its day, late with the day it was due, and booked ahead in violet', () => {
    const s = readFlow({
      def, machines, today: T, startedOn: '2026-10-01',
      records: [
        rec({ stepKey: 'levelled', assetId: 'm1', outcome: 'done', doneOn: '2026-10-03' }),
        rec({ stepKey: 'guards', assetId: 'm1', plannedFor: '2026-10-25' }),
      ],
    });
    const st = s.stages[0];
    const one = (k: string, a: string) => st.steps.find(x => x.def.key === k && x.assetId === a);
    expect(stepWord(one('levelled', 'm1')!)).toBe('Done 3 Oct');
    expect(stepSquare(one('levelled', 'm1')!)).toBe('g');
    expect(stepWord(one('levelled', 'm2')!)).toBe('Late — was due 4 Oct');
    expect(stepSquare(one('levelled', 'm2')!)).toBe('r');
    expect(stepWord(one('guards', 'm1')!)).toBe('Due 25 Oct');
    expect(stepSquare(one('guards', 'm1')!)).toBe('w');
    expect(stepSquare(one('guards', 'm2')!)).toBe('n');
    expect(stageWord(st)).toBe('1 late');
  });
});

describe('the lean page', () => {
  it('counts what is done, late and failed, says the gate and what is next', () => {
    const records = [
      rec({ stepKey: 'levelled', assetId: 'm1', outcome: 'done', doneOn: '2026-10-18' }),
      rec({ stepKey: 'levelled', assetId: 'm2', outcome: 'done', doneOn: '2026-10-18' }),
      rec({ stepKey: 'guards', assetId: 'm1', outcome: 'done', doneOn: '2026-10-19' }),
    ];
    const state = readFlow({ def, machines, today: T, startedOn: '2026-10-01', records });
    const page = flowLean({ project, def, version: 2, startedOn: '2026-10-01', state, problems: [{ open: true, priority: 'critical', title: 'Guard missing' }], records, machines }, T);
    expect(page.title).toBe('Line 9 tray line');
    expect(page.sub).toBe('Commissioning — tray line · version 2');
    expect(page.verdict).toEqual({ text: 'At Mechanical', tone: 'n' });
    const tile = (k: string) => page.tiles.find(t => t.k === k);
    expect(tile('Steps done')).toMatchObject({ v: '3', of: 'of 5 · 60%' });
    expect(tile('Steps done')?.change?.text).toBe('3 done this week');
    expect(tile('Gates passed')).toMatchObject({ v: '0', of: 'of 2' });
    expect(tile('Problems open')).toMatchObject({ v: '1', of: '1 critical', tone: 'r' });
    expect(page.insights[0].text).toBe(state.verdict.text);
    expect(page.insights.some(x => /checks? (is|are) confirmed by hand: Area guarded/.test(x.text))).toBe(true);
    expect(page.actions[0]).toMatchObject({ what: 'Guards fitted — Case packer', who: 'Site engineer', from: 'Mechanical' });
    expect(page.actions[0].open?.ref).toBe('mech/guards/m2');
    expect(page.closing.text).toBe('Next: Guards fitted — Case packer — Site engineer.');
  });

  it('says every gate passed, in green, when the method is done', () => {
    const records = [
      ...machines.flatMap(m => ['levelled', 'guards'].map(k => rec({ stepKey: k, assetId: m.id, outcome: 'done', doneOn: '2026-10-10' }))),
      rec({ kind: 'gate', outcome: 'done', doneOn: '2026-10-11', checks: { tidy: 'Lee' } }),
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', doneOn: '2026-10-15', values: { rate: 64 } }),
      rec({ kind: 'gate', stageKey: 'perf', outcome: 'done', doneOn: '2026-10-16' }),
    ];
    const state = readFlow({ def, machines, today: T, records });
    const page = flowLean({ project, def, version: 1, state, problems: [], records, machines }, T);
    expect(state.done).toBe(true);
    expect(page.verdict).toEqual({ text: 'Every gate passed', tone: 'g' });
    expect(page.closing).toEqual({ text: 'Every gate passed — Commissioning — tray line is done on Line 9 tray line.', tone: 'g' });
    expect(page.tiles.find(t => t.k === 'Gates passed')?.tone).toBe('g');
  });
});

describe('the control room', () => {
  it('reads the project beside the other jobs: where it is, its stages, what it owes, and a step opens on its page', () => {
    const records = [rec({ stepKey: 'levelled', assetId: 'm1', outcome: 'failed', doneOn: '2026-10-19', note: 'Feet not adjustable' })];
    const state = readFlow({ def, machines, today: T, startedOn: '2026-10-01', records });
    const flow = flowJobOf(project, state, suppliersOf(def, { site: 'Lee' }));
    expect(flow.suppliers).toEqual([]);
    expect(suppliersOf({ roles: [{ key: 'oem', name: 'OEM fitter', side: 'supplier' }] }, { oem: 'Brillopak — Dave' })).toEqual(['Brillopak — Dave']);
    expect(flow.facts.at).toBe('Mechanical');
    expect(flow.facts.stages.map(s => `${s.label}:${s.tone}`)).toEqual(['Mechanical:late', 'Performance:ahead']);
    expect(flow.items.find(i => i.what === 'Positioned and levelled — Case packer')).toMatchObject({ kind: 'step', on: '2026-10-04', late: true, id: 'mech/levelled/m2' });
    const p = { ...project, flow: { methodId: 'M', familyId: 'M', version: 1, startedOn: '2026-10-01', name: 'Commissioning — tray line' } } as Project;
    const input: PacedInput = { project: p, steps: [], lines: [], atTarget: 0, judged: 0, flow };
    const pf = portfolio([], T, [input]);
    const row = pf.jobs[0];
    expect(row.method).toBe('flow');
    expect(row.methodLabel).toBe('Commissioning — tray line');
    expect(row.at).toBe('Mechanical');
    expect(row.sentence).toBe(state.verdict.text);
    expect(row.flow?.stages).toHaveLength(2);
    expect(row.late).toBe(state.counts.late);
    expect(pf.items.some(i => i.kind === 'step' && i.jobId === 'P')).toBe(true);
    expect(planHref('P', { kind: 'step', id: 'mech/levelled/m2' })).toBe('/project/P?view=stage-mech&step=mech%2Flevelled%2Fm2');
  });

  it('says so when the method has not reached the device', () => {
    const p = { ...project, flow: { methodId: 'M', familyId: 'M', version: 1, startedOn: T } } as Project;
    const row = portfolio([], T, [{ project: p, steps: [], lines: [], atTarget: 0, judged: 0, flow: flowJobMissing() }]).jobs[0];
    expect(row.sentence).toMatch(/has not reached this device/);
    expect(row.methodLabel).toBe('Own method');
  });
});

async function paper(fp: FlowProject) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const said: string[] = [];
  const orig = doc.text.bind(doc);
  (doc as unknown as { text: (...a: unknown[]) => jsPDF }).text = (t: unknown, ...rest: unknown[]) => {
    said.push(...(Array.isArray(t) ? t.map(String) : [String(t)]));
    return (orig as (...a: unknown[]) => jsPDF)(t, ...rest);
  };
  const page = flowLean({ project: fp.project, def: fp.method.definition, version: fp.method.version, state: fp.state, problems: fp.problems, records: fp.records, machines: fp.machines }, T);
  await drawFlowReport(doc, { fp, page, printed: '20 October 2026' });
  return { doc, flat: said.join('').replace(/\s+/g, '') };
}
const has = (flat: string, s: string) => flat.includes(s.replace(/\s+/g, ''));
const method = (d: FlowDefinition): Method => ({ id: 'M', familyId: 'M', version: 1, status: 'active', definition: d, createdAt: 0, updatedAt: 0 });

describe('the method report', () => {
  it('prints every stage, every step on every machine and every condition of every gate', async () => {
    const records = [
      rec({ stepKey: 'levelled', assetId: 'm1', outcome: 'done', doneOn: '2026-10-18' }),
      rec({ kind: 'gate', stageKey: 'mech', outcome: 'done', doneOn: '2026-10-19', override: 'Guards fitted on the night shift, photos to follow', checks: { tidy: 'Lee' } }),
    ];
    const state = readFlow({ def, machines, today: T, startedOn: '2026-10-01', records });
    const fp = { project, method: method(def), records, machines, problems: [], state } as unknown as FlowProject;
    const { doc, flat } = await paper(fp);
    expect(doc.getNumberOfPages()).toBe(1);
    for (const s of state.stages) for (const x of s.steps) expect(has(flat, `${x.def.title}${x.machine ? ` — ${x.machine}` : ''}`)).toBe(true);
    expect(has(flat, 'Confirmed by Lee — Area guarded')).toBe(true);
    expect(has(flat, 'over what was unmet: "Guards fitted on the night shift, photos to follow"')).toBe(true);
    expect(has(flat, 'Not met — “Performance run”: Rate at least 60 packs/min')).toBe(true);
    expect(has(flat, 'Next:')).toBe(true);
  });

  it('runs a long method on to more pages and cuts nothing', async () => {
    const big: FlowDefinition = {
      ...def,
      stages: Array.from({ length: 6 }, (_, i) => ({
        key: `s${i}`, name: `Stage ${i + 1}`,
        steps: Array.from({ length: 8 }, (_, j) => ({ key: `s${i}-t${j}`, title: `Step ${j + 1} of stage ${i + 1} with a long name that runs on end${i}-${j}`, per: 'machine' as const, answer: 'done' as const })),
        gate: { conditions: [{ id: 'all', type: 'stepsDone' as const, policy: 'block' as const }] },
      })),
    };
    const state = readFlow({ def: big, machines, today: T, records: [] });
    const fp = { project, method: method(big), records: [], machines, problems: [], state } as unknown as FlowProject;
    const { doc, flat } = await paper(fp);
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) expect(has(flat, `end${i}-${j} — Case packer`)).toBe(true);
  });
});
