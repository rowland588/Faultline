/* METHODS RUN FOR REAL — the operations against a real IndexedDB.
 *
 * A method is drafted, refused while it is not runnable, approved, run on a
 * project with two machines, its steps done and refused while incomplete, a
 * gate blocked and then passed, an owner's override kept with its reason, a
 * new version made without touching the one a project runs, and every one of
 * those written in the activity log — with a team member and a client each
 * refused what the database would refuse them. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { can } from '../lib/access';
import { FLOW_SCHEMA, type FlowDefinition } from '../lib/flow/definition';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const load = async () => ({ ops: await import('../lib/flow/operations'), db: await import('../db') });
const owner = { who: 'Rowland', can: can('owner'), today: '2026-10-20' };
const team = { who: 'Lee', can: can('team'), today: '2026-10-20' };
const client = { who: 'Sam', can: can('client'), today: '2026-10-20' };

const definition = (): FlowDefinition => ({
  schema: FLOW_SCHEMA, name: 'Commissioning — tray line', purpose: 'From delivery to handover.', kind: 'stagegate',
  roles: [{ key: 'oem', name: 'OEM fitter' }, { key: 'site', name: 'Site engineer' }],
  stages: [
    {
      key: 'mech', name: 'Mechanical',
      steps: [{ key: 'levelled', title: 'Positioned and levelled', per: 'machine', role: 'oem', answer: 'done', evidence: { photos: 1 } }],
      gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }, { id: 'tidy', type: 'manual', label: 'Area guarded', policy: 'block' }] },
    },
    {
      key: 'perf', name: 'Performance',
      steps: [{
        key: 'run', title: 'Performance run', per: 'line', role: 'oem', answer: 'measure',
        fields: [
          { key: 'packs', label: 'Packs made', type: 'number', required: true },
          { key: 'minutes', label: 'Minutes run', type: 'reading', unit: 'min', min: 120 },
          { key: 'rate', label: 'Rate', type: 'calc', unit: 'packs/min', formula: 'packs / minutes' },
        ],
      }],
      gate: { conditions: [{ id: 'rate', type: 'fieldMeets', step: 'run', field: 'rate', op: '>=', value: 60, policy: 'block' }] },
    },
  ],
});
const photo = { id: 'ph', kind: 'photo' as const, blobKey: 'b', mime: 'image/jpeg', capturedAt: 1 };

describe('a method from draft to approved', () => {
  it('is refused while it cannot run, approved once it can, and its earlier version retired', async () => {
    const { ops, db } = await load();
    const broken = { ...definition(), stages: [] };
    const d = await ops.createMethod(owner, { definition: broken, origin: 'hand' });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const refused = await ops.approveMethod(owner, d.value.id);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.issues?.[0].message).toMatch(/no stages/);

    await ops.saveDraft(owner, d.value.id, definition());
    const v1 = await ops.approveMethod(owner, d.value.id);
    expect(v1.ok && v1.value.status).toBe('active');

    const v2 = await ops.draftNewVersion(owner, d.value.id, undefined, 'a reliability run');
    expect(v2.ok && v2.value.version).toBe(2);
    if (!v2.ok) return;
    const edited = definition(); edited.stages[1].steps[0].title = 'Performance run at rate';
    await ops.saveDraft(owner, v2.value.id, edited);
    await ops.approveMethod(owner, v2.value.id);
    const family = await db.methodFamily(d.value.familyId);
    expect(family.map(m => `${m.version}:${m.status}`)).toEqual(['1:retired', '2:active']);
    expect(family[0].definition.stages[1].steps[0].title).toBe('Performance run');
  });

  it('an approved version is never edited, and never deleted', async () => {
    const { ops } = await load();
    const d = await ops.createMethod(owner, { definition: definition(), origin: 'hand' });
    if (!d.ok) throw new Error();
    await ops.approveMethod(owner, d.value.id);
    expect((await ops.saveDraft(owner, d.value.id, definition())).ok).toBe(false);
    expect((await ops.deleteDraft(owner, d.value.id)).ok).toBe(false);
  });

  it('is written by an owner — a team member or a client is refused', async () => {
    const { ops } = await load();
    expect((await ops.createMethod(team, { definition: definition(), origin: 'hand' })).ok).toBe(false);
    expect((await ops.createMethod(client, { definition: definition(), origin: 'hand' })).ok).toBe(false);
  });
});

async function running() {
  const { ops, db } = await load();
  const d = await ops.createMethod(owner, { definition: definition(), origin: 'hand' });
  if (!d.ok) throw new Error();
  await ops.approveMethod(owner, d.value.id);
  const p = await ops.startProject(owner, { methodId: d.value.id, name: 'Line 7 tray line', machines: ['Tray sealer', 'Case packer'], startedOn: '2026-10-01', people: { site: 'Lee' } });
  if (!p.ok) throw new Error(p.why);
  const fp = await ops.loadFlowProject(p.value.id, '2026-10-20');
  if (!fp) throw new Error();
  return { ops, db, project: p.value, fp, methodId: d.value.id };
}

describe('a project running the method', () => {
  it('starts with its machines, its method pinned, and a step per machine', async () => {
    const { fp } = await running();
    expect(fp.project.flow).toMatchObject({ version: 1, startedOn: '2026-10-01', people: { site: 'Lee' } });
    expect(fp.machines.map(m => m.name)).toEqual(['Tray sealer', 'Case packer']);
    expect(fp.state.stages[0].steps.map(s => s.machine)).toEqual(['Tray sealer', 'Case packer']);
  });

  it('refuses "done" on a step that still needs its photo, then takes it', async () => {
    const { ops, project, fp } = await running();
    const s = { projectId: project.id, stageKey: 'mech', stepKey: 'levelled', assetId: fp.machines[0].id };
    const r1 = await ops.completeStep(team, s);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.why).toBe('It still needs a photo.');
    const r2 = await ops.completeStep(team, s, { media: [photo] });
    expect(r2.ok && r2.value.outcome).toBe('done');
  });

  it('keeps a measurement outside its limit and says it did not pass', async () => {
    const { ops, project } = await running();
    const r = await ops.completeStep(team, { projectId: project.id, stageKey: 'perf', stepKey: 'run' }, { values: { packs: 5000, minutes: 90 } });
    expect(r.ok && r.value.outcome).toBe('failed');
    if (r.ok) expect(r.said).toMatch(/did not pass: Minutes run 90 min — at least 120 min/);
  });

  it('a client changes nothing', async () => {
    const { ops, project, fp } = await running();
    expect((await ops.completeStep(client, { projectId: project.id, stageKey: 'mech', stepKey: 'levelled', assetId: fp.machines[0].id }, { media: [photo] })).ok).toBe(false);
  });
});

describe('a gate', () => {
  it('blocks until its steps are done and its check confirmed; the owner alone passes it', async () => {
    const { ops, project, fp } = await running();
    const blocked = await ops.passGate(owner, { projectId: project.id, stageKey: 'mech' });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.why).toMatch(/Every step in Mechanical done \(0 of 2 done\); Area guarded — to confirm/);

    for (const m of fp.machines) await ops.completeStep(team, { projectId: project.id, stageKey: 'mech', stepKey: 'levelled', assetId: m.id }, { media: [photo] });
    expect((await ops.passGate(team, { projectId: project.id, stageKey: 'mech', checks: { tidy: 'Lee' } })).ok).toBe(false);
    const passed = await ops.passGate(owner, { projectId: project.id, stageKey: 'mech', checks: { tidy: 'Lee' } });
    expect(passed.ok && passed.value).toMatchObject({ kind: 'gate', who: 'Rowland', checks: { tidy: 'Lee' } });
    expect(passed.ok && passed.value.override).toBeUndefined();
  });

  it('an owner may pass over an unmet condition with a reason, kept on the pass and in the log', async () => {
    const { ops, db, project, fp } = await running();
    for (const m of fp.machines) await ops.completeStep(team, { projectId: project.id, stageKey: 'mech', stepKey: 'levelled', assetId: m.id }, { media: [photo] });
    await ops.passGate(owner, { projectId: project.id, stageKey: 'mech', checks: { tidy: 'Lee' } });
    await ops.completeStep(team, { projectId: project.id, stageKey: 'perf', stepKey: 'run' }, { values: { packs: 6000, minutes: 125 } });
    const no = await ops.passGate(owner, { projectId: project.id, stageKey: 'perf' });
    expect(no.ok).toBe(false);
    if (!no.ok) expect(no.why).toMatch(/Rate at least 60 packs\/min \(48 packs\/min\)/);
    const over = await ops.passGate(owner, { projectId: project.id, stageKey: 'perf', override: 'Client accepted 48 a minute for the first week' });
    expect(over.ok && over.value.override).toBe('Client accepted 48 a minute for the first week');
    expect(over.ok && over.value.openAtPass?.[0]).toMatch(/Rate at least 60 packs\/min — 48 packs\/min/);
    const log = await db.listActivity(project.id);
    expect(log[0]).toMatchObject({ op: 'passGate', who: 'Rowland', source: 'person' });
    expect(log[0].summary).toMatch(/over 1 unmet — “Client accepted 48 a minute for the first week”/);
    const after = await ops.loadFlowProject(project.id, '2026-10-20');
    expect(after?.state.done).toBe(true);
  });

  it('a later gate waits on the one before; a gate is reopened last-first, with a reason', async () => {
    const { ops, project, fp } = await running();
    expect((await ops.passGate(owner, { projectId: project.id, stageKey: 'perf', override: 'x' })).ok).toBe(false);
    for (const m of fp.machines) await ops.completeStep(team, { projectId: project.id, stageKey: 'mech', stepKey: 'levelled', assetId: m.id }, { media: [photo] });
    await ops.passGate(owner, { projectId: project.id, stageKey: 'mech', checks: { tidy: 'Lee' } });
    expect((await ops.reopenGate(owner, project.id, 'mech', '')).ok).toBe(false);
    const re = await ops.reopenGate(owner, project.id, 'mech', 'Guard found loose');
    expect(re.ok).toBe(true);
    const after = await ops.loadFlowProject(project.id, '2026-10-20');
    expect(after?.state.stages[0].gate.passed).toBe(false);
  });
});

describe('the project keeps running on the version it started on', () => {
  it('a new version of the method changes nothing on a project already running', async () => {
    const { ops, project, methodId } = await running();
    const v2 = await ops.draftNewVersion(owner, methodId);
    if (!v2.ok) throw new Error();
    const changed = definition(); changed.stages[0].name = 'Mechanical and services';
    await ops.saveDraft(owner, v2.value.id, changed);
    await ops.approveMethod(owner, v2.value.id);
    const fp = await ops.loadFlowProject(project.id, '2026-10-20');
    expect(fp?.method.version).toBe(1);
    expect(fp?.state.stages[0].name).toBe('Mechanical');
  });
});
