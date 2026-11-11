/* THE FACTORY KNOWLEDGE CAPABILITIES (src/capabilities/factory, docs/FACTORY-KNOWLEDGE.md F2) — factory_map and resolve are
 * reads in the registry and the schemas; their input is checked; and with a line or project in hand they hold that client's
 * factory and never another's, on records seeded in a fake IndexedDB. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { CAPABILITY_SCHEMAS } from '../schemas';
import type { CapCtx } from '../types';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines') });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

/* Acme Foods: Line 2 (Scale 1, Scale 2, Mixer) in Site 1 › Packaging; Brook Dairy: Dairy 1 (Mixer, Robot) */
async function seed() {
  const { db, reg, lines } = await fresh();
  const a = await lines.addLineToFactory('Line 2');
  const b = await lines.addLineToFactory('Dairy 1');
  await db.updateWorkspace({ ...a, clientName: 'Acme Foods', siteName: 'Site 1', areaName: 'Packaging', assets: ['Scale 1', 'Scale 2', 'Mixer'] });
  await db.updateWorkspace({ ...b, clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Filling', assets: ['Mixer', 'Robot'] });
  await db.putAsset({ id: 'cw-acme', projectId: '', workspaceId: a.id, name: 'Mixer', kind: 'mixer', model: 'Hobart H600', state: 'running', sort: 0, updatedAt: 1,
    known: { kind: { how: 'confirmed', at: Date.now(), by: 'Rowland' }, model: { how: 'reported', at: Date.now(), source: { kind: 'conversation' } } } });
  return { db, reg, a, b };
}

describe('factory_map and resolve in the registry', () => {
  it('are reads, in the schemas with the same names, refusing other fields', async () => {
    const { reg } = await fresh();
    for (const name of ['factory_map', 'resolve']) {
      expect(reg.capabilityByName(name)?.kind).toBe('read');
      expect(CAPABILITY_SCHEMAS.find(s => s.name === name)?.kind).toBe('read');
    }
    expect(reg.capabilityByName('resolve')?.validate({}).ok).toBe(false);
    expect(reg.capabilityByName('resolve')?.validate({ words: 'x', machine: 'y' }).ok).toBe(false);
    expect(reg.capabilityByName('factory_map')?.validate({ lineId: 'w', extra: 1 }).ok).toBe(false);
    expect(reg.capabilityByName('resolve')?.validate({ words: 'the scales', lineId: 'w' }).ok).toBe(true);
  }, 60_000);
});

describe('factory_map', () => {
  it('with a line in hand: that client only, each machine with how it is known', async () => {
    const { reg, a } = await seed();
    const r = await reg.runCall(ctx(), call('factory_map', { lineId: a.id }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const map = r.data as { clients: { name: string; sites: { areas: { lines: { name: string; machines: { name: string; kind?: { value: string; how: string }; model?: { how: string } }[] }[] }[] }[] }[] };
    expect(map.clients.map(c => c.name)).toEqual(['Acme Foods']);
    const line = map.clients[0].sites[0].areas[0].lines[0];
    expect(line.name).toBe('Line 2');
    const mixer = line.machines.find(m => m.name === 'Mixer');
    expect(mixer?.kind).toMatchObject({ value: 'mixer', how: 'confirmed' });
    expect(mixer?.model?.how).toBe('reported');
    expect(line.machines.find(m => m.name === 'Scale 1')?.kind).toMatchObject({ value: 'scale', how: 'inferred' });
    expect(JSON.stringify(r.data)).not.toContain('Brook');
    expect(JSON.stringify(r.data)).not.toContain('Robot');
    expect(r.says).toMatch(/^Acme Foods: 1 site, 1 area, 1 line, 3 machines — 1 with what it is said, 2 only guessed from the name, 0 not known\.$/);
  }, 30_000);

  it('refuses a client that is not the line’s; with nothing in hand, each client its own group', async () => {
    const { reg, a } = await seed();
    const no = await reg.runCall(ctx(), call('factory_map', { lineId: a.id, client: 'Brook Dairy' }), { confirmed: false });
    expect(no.ok).toBe(false);
    const both = await reg.runCall(ctx(), call('factory_map', {}), { confirmed: false });
    expect(both.ok && (both.data as { clients: { name: string }[] }).clients.map(c => c.name)).toEqual(['Acme Foods', 'Brook Dairy']);
  }, 30_000);
});

describe('resolve', () => {
  it('the scales — several; the mixer — one, Acme’s; the robot — none on Acme’s line, Brook’s never offered', async () => {
    const { reg, a, b } = await seed();
    const scales = await reg.runCall(ctx(), call('resolve', { words: 'the scales', lineId: a.id }), { confirmed: false });
    expect(scales.ok && (scales.data as { match: string }).match).toBe('several');
    expect(scales.ok && scales.says).toMatch(/Scale 1.*Scale 2/);
    const mixer = await reg.runCall(ctx(), call('resolve', { words: 'the mixer', lineId: a.id }), { confirmed: false });
    expect(mixer.ok && (mixer.data as { match: string; candidates: { id?: string; lineId?: string }[] })).toMatchObject({ match: 'one', candidates: [{ id: 'cw-acme', lineId: a.id }] });
    if (mixer.ok) expect(mixer.refs[0].href).toBe(`/lines/${a.id}/machine/Mixer`);
    const robot = await reg.runCall(ctx(), call('resolve', { words: 'the robot', lineId: a.id }), { confirmed: false });
    expect(robot.ok && (robot.data as { match: string }).match).toBe('none');
    expect(robot.ok && robot.says).toBe('Nothing called “the robot” is known in Luna for Acme Foods — it may need adding.');
    expect(JSON.stringify(robot)).not.toContain(b.id);
    const line = await reg.runCall(ctx(), call('resolve', { words: 'line two', lineId: a.id }), { confirmed: false });
    expect(line.ok && (line.data as { candidates: { kind: string; id?: string }[] }).candidates).toMatchObject([{ kind: 'line', id: a.id }]);
  }, 30_000);

  it('with nothing in hand, a word both clients have is several, each saying whose', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx(), call('resolve', { words: 'the mixer' }), { confirmed: false });
    expect(r.ok && (r.data as { match: string }).match).toBe('several');
    expect(r.ok && (r.data as { candidates: { label: string }[] }).candidates.map(c => c.label)).toEqual([
      'Mixer — a mixer, on Line 2 (Acme Foods)', 'Mixer — probably a mixer, on Dairy 1 (Brook Dairy)',
    ]);
  }, 30_000);
});
