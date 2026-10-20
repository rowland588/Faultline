/* LINKS WRITTEN FOR REAL — an entry naming an entry of an earlier log, through
 * lib/flow/operations against a real IndexedDB (docs/VIEWS.md): a root cause
 * logged, an experiment linked to it, a link to nothing or to a struck
 * cause refused, and a link kept as it was when its cause is struck later
 * and the experiment corrected. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { can } from '../lib/access';
import { FLOW_SCHEMA, type FlowDefinition } from '../lib/flow/definition';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const owner = { who: 'Rowland', can: can('owner'), today: '2026-10-20' };
const team = { who: 'Lee', can: can('team'), today: '2026-10-20' };

const definition = (): FlowDefinition => ({
  schema: FLOW_SCHEMA, name: 'Seal leaks', purpose: 'Find the cause and prove the fix.', kind: 'improvement', roles: [],
  stages: [
    {
      key: 'analyse', name: 'Analyse', gate: { conditions: [] },
      steps: [{
        key: 'causes', title: 'The causes', per: 'line', answer: 'log',
        columns: [
          { key: 'cause', label: 'Cause', type: 'text', required: true },
          { key: 'bone', label: 'Bone', type: 'choice', options: ['People', 'Machine', 'Method', 'Material', 'Measurement', 'Environment'], required: true },
          { key: 'root', label: 'Root cause', type: 'yesno' },
        ],
        analyses: [{ key: 'roots', label: 'Seal leaks', block: 'fishbone', of: 'cause', by: 'bone', when: { column: 'root', op: '=', value: true } }],
        view: { id: 'fishbone', bind: { cause: 'cause', bone: 'bone', root: 'root' } },
      }],
    },
    {
      key: 'improve', name: 'Improve', gate: { conditions: [] },
      steps: [{
        key: 'experiments', title: 'PDCA experiments', per: 'line', answer: 'log',
        columns: [
          { key: 'what', label: 'Experiment', type: 'text', required: true },
          { key: 'lane', label: 'PDCA', type: 'choice', options: ['Plan', 'Do', 'Check', 'Act'], required: true },
          { key: 'tests', label: 'Root cause it tests', type: 'ref', of: 'causes', required: true },
        ],
        analyses: [{ key: 'n', label: 'Experiments', block: 'count' }],
        view: { id: 'board', bind: { card: 'what', lane: 'lane' } },
      }],
    },
  ],
});

async function running() {
  const ops = await import('../lib/flow/operations');
  const links = await import('../lib/flow/links');
  const d = await ops.createMethod(owner, { definition: definition(), origin: 'hand' });
  if (!d.ok) throw new Error(d.why);
  const a = await ops.approveMethod(owner, d.value.id);
  if (!a.ok) throw new Error(a.why);
  const p = await ops.startProject(owner, { methodId: d.value.id, name: 'Line 3 seal leaks', machines: [], startedOn: '2026-10-13' });
  if (!p.ok) throw new Error(p.why);
  const causes = { projectId: p.value.id, stageKey: 'analyse', stepKey: 'causes' };
  const exps = { projectId: p.value.id, stageKey: 'improve', stepKey: 'experiments' };
  const state = async () => { const fp = await ops.loadFlowProject(p.value.id, '2026-10-20'); if (!fp) throw new Error(); return fp.state; };
  return { ops, links, causes, exps, state };
}

describe('a link written through the operations', () => {
  it('names a cause logged, and the cause lists it back', async () => {
    const { ops, links, causes, exps, state } = await running();
    const c = await ops.addEntry(team, causes, { cause: 'Seal jaw temperature drifts', bone: 'Machine', root: true });
    if (!c.ok) throw new Error(c.why);
    const x = await ops.addEntry(team, exps, { what: 'Hold the jaw at 185 °C', lane: 'Plan', tests: c.value.id });
    expect(x.ok).toBe(true);
    const s = await state();
    expect(links.linksTo(s, 'causes', c.value.id).map(l => l.title)).toEqual(['Hold the jaw at 185 °C']);
    const col = s.stages[1].steps[0].def.columns?.find(k => k.key === 'tests');
    if (!col || !x.ok) throw new Error();
    expect(links.linkSaid(s, col, x.value.values.tests)?.title).toBe('Seal jaw temperature drifts');
  });

  it('refuses a link to nothing, and to a cause struck — needed when the log says so', async () => {
    const { ops, causes, exps } = await running();
    const none = await ops.addEntry(team, exps, { what: 'Try it', lane: 'Plan', tests: 'not-an-entry' });
    expect(none.ok ? '' : none.why).toBe('Root cause it tests: that entry is not on “The causes”.');
    const c = await ops.addEntry(team, causes, { cause: 'Mistyped', bone: 'People' });
    if (!c.ok) throw new Error(c.why);
    await ops.strikeEntry(team, causes, c.value.id);
    const struck = await ops.addEntry(team, exps, { what: 'Try it', lane: 'Plan', tests: c.value.id });
    expect(struck.ok ? '' : struck.why).toBe('Root cause it tests: that entry is struck — link one that counts.');
    const blank = await ops.addEntry(team, exps, { what: 'Try it', lane: 'Plan' });
    expect(blank.ok ? '' : blank.why).toBe('Say root cause it tests.');
  });

  it('keeps a link as it was when its cause is struck later and the experiment corrected; moves to a live one', async () => {
    const { ops, links, causes, exps, state } = await running();
    const c1 = await ops.addEntry(team, causes, { cause: 'Seal jaw temperature drifts', bone: 'Machine' });
    const c2 = await ops.addEntry(team, causes, { cause: 'Film from two suppliers', bone: 'Material' });
    if (!c1.ok || !c2.ok) throw new Error();
    const x = await ops.addEntry(team, exps, { what: 'Hold the jaw', lane: 'Plan', tests: c1.value.id });
    if (!x.ok) throw new Error(x.why);
    await ops.strikeEntry(team, causes, c1.value.id);
    const moved = await ops.editEntry(team, exps, x.value.id, { lane: 'Do' });
    expect(moved.ok && moved.value.values).toMatchObject({ lane: 'Do', tests: c1.value.id });
    const s = await state();
    const col = s.stages[1].steps[0].def.columns?.find(k => k.key === 'tests');
    if (!col) throw new Error();
    expect(links.linkSaid(s, col, c1.value.id)).toMatchObject({ title: 'Seal jaw temperature drifts', struck: true });
    expect(links.linksTo(s, 'causes', c1.value.id)).toHaveLength(1);
    const relinked = await ops.editEntry(team, exps, x.value.id, { tests: c2.value.id });
    expect(relinked.ok && relinked.value.values.tests).toBe(c2.value.id);
    expect(links.linksTo(await state(), 'causes', c2.value.id).map(l => l.title)).toEqual(['Hold the jaw']);
  });
});
