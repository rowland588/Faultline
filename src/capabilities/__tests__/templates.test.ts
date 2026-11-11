/* LUNA AND MY TEMPLATES (docs/CONSULTANT-WORKSPACE.md C5; capabilities/templates): list_templates names the person's own and nothing of a
 * customer's; start_from_template waits for a yes, says what it will do, makes an ordinary record on the line given, refuses a log with no
 * line and a client — and the template is still a template, out of every list. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { ToolStudy } from '../../lib/study';

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const T = 1_700_000_000_000;

async function setup() {
  const db = await import('../../db');
  const reg = await import('../registry');
  const tpl = await import('../../lib/templates');
  const { defOf } = await import('../../tools/checks/registry');
  const { newLogStudy } = await import('../../tools/checks/start');
  const branston = await db.createWorkspace('Branston Packing 1');
  await db.patchWorkspaceRecord(branston.id, { clientName: 'Branston' });
  const cobb = await db.createWorkspace('Cobb Packing 1');
  await db.patchWorkspaceRecord(cobb.id, { clientName: 'Cobb Foods' });
  const log = newLogStudy(defOf('five-s')!, { since: T, now: T, name: 'Branston hall 5S', workspaceId: branston.id, where: 'Branston hall' });
  await db.putStudy(log);
  const saved = await tpl.saveAsTemplate(log, { name: 'My 5S walk', note: 'every first visit', keep: 'structure' });
  if (!saved.ok) throw new Error(saved.why);
  return { db, reg, saved: saved.t as ToolStudy, branston, cobb, log };
}

describe('list_templates', () => {
  it('names the person’s own templates with their ids, and none of a customer’s records', async () => {
    const { reg, saved } = await setup();
    const r = await reg.runCall({ now: T }, { id: '1', name: 'list_templates', input: {} }, { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.says).toContain('“My 5S walk” (Check log · 5S audit');
    expect(r.says).toContain(`[template ${saved.id}]`);
    expect(r.says).toContain('every first visit');
    expect(r.says).not.toContain('Branston hall 5S');
    const none = await reg.runCall({ now: T }, { id: '2', name: 'list_templates', input: { kind: 'doc' } }, { confirmed: false });
    expect(none.ok && none.says).toMatch(/no document templates/);
  });
});

describe('start_from_template', () => {
  it('waits for a yes, says what it will do, then makes an ordinary log on the line given — the template unchanged', async () => {
    const { db, reg, saved, cobb } = await setup();
    const call = { id: '3', name: 'start_from_template', input: { templateId: saved.id, lineId: cobb.id } };
    const before = await reg.runCall({ now: T, level: 'owner' }, call, { confirmed: false });
    expect(before.ok).toBe(false);
    const p = await reg.previewCall({ now: T, level: 'owner' }, call);
    expect(p.ok && p.says).toMatch(/^Start “My 5S walk” from your template .* on Cobb Packing 1 \(Cobb Foods\) — a new record of Cobb Foods’s/);
    const r = await reg.runCall({ now: T, level: 'owner' }, call, { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const made = (await db.listStudiesForLine(cobb.id)).find(s => s.tool === 'log');
    expect(made?.name).toBe('My 5S walk');
    expect(made?.facts.template).toBeUndefined();
    expect(made?.agreed?.log?.checks.every(c => !c.where)).toBe(true);
    expect(r.show?.href).toBe(`/log/five-s/${made?.id}`);
    expect((await db.listTemplates()).map(t => t.id)).toEqual([saved.id]);
    expect((await db.listAllStudies()).some(s => s.id === saved.id)).toBe(false);
  });
  it('a log with no line is refused in words; a client may not start one; an unknown id is not a template', async () => {
    const { reg, saved, log } = await setup();
    const noLine = await reg.runCall({ now: T, level: 'owner' }, { id: '4', name: 'start_from_template', input: { templateId: saved.id } }, { confirmed: true });
    expect(noLine.ok ? '' : noLine.why).toMatch(/A check log is a line’s/);
    const client = await reg.runCall({ now: T, level: 'client' }, { id: '5', name: 'start_from_template', input: { templateId: saved.id } }, { confirmed: true });
    expect(client.ok).toBe(false);
    const notOne = await reg.runCall({ now: T, level: 'owner' }, { id: '6', name: 'start_from_template', input: { templateId: log.id } }, { confirmed: true });
    expect(notOne.ok ? '' : notOne.why).toMatch(/not one of the person’s templates/);
  });
});
