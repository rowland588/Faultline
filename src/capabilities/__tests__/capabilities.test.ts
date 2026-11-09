/* AI MODE'S CAPABILITIES (docs/AI-MODE.md) — the registry and the schemas agree; a call is checked, allowed and, if it writes,
 * confirmed; nothing deletes or verifies; a line's answer holds only that line; a failure is a sentence, never a throw; and every
 * read says what the page's own reader says, on records seeded in a fake IndexedDB. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { CAPABILITY_SCHEMAS } from '../schemas';
import type { CapCtx } from '../types';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

/* the db and the capabilities from one fresh module graph, so both see the same database */
const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines') });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

const DAY = 86_400_000;

async function seedTwoLines() {
  const { db, reg, lines } = await fresh();
  const a = await lines.addLineToFactory('Line A');
  const b = await lines.addLineToFactory('Line B');
  await db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
  await db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
  const t = Date.now();
  await db.addSnag({ id: 'pa1', workspaceId: a.id, problem: 'Wrapper film tears on the splice', status: 'open', priority: 'critical', raisedAt: t, updatedAt: t, dueAt: t - 3 * DAY, owner: 'Sam' });
  await db.addSnag({ id: 'pa2', workspaceId: a.id, problem: 'Labeller skews the label', status: 'open', priority: 'low', raisedAt: t, updatedAt: t });
  await db.addSnag({ id: 'pb1', workspaceId: b.id, problem: 'Filler drips on the seal', status: 'open', priority: 'high', raisedAt: t, updatedAt: t });
  await db.putStudy({ id: 'sa', tool: 'capability', name: 'Seal strength A', workspaceId: a.id, agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  await db.putStudy({ id: 'sb', tool: 'capability', name: 'Seal strength B', workspaceId: b.id, agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  return { db, reg, a, b };
}

describe('the registry and the schemas', () => {
  it('carry the same names and kinds, every schema an object refusing other fields', async () => {
    const { reg } = await fresh();
    expect(reg.CAPABILITIES.map(c => [c.name, c.kind]).sort()).toEqual(CAPABILITY_SCHEMAS.map(s => [s.name, s.kind]).sort());
    const objects = (s: unknown): boolean => {
      if (!s || typeof s !== 'object') return true;
      const o = s as Record<string, unknown>;
      if (o.type === 'object' && o.properties && o.additionalProperties !== false) return false;
      return Object.values(o).every(v => (Array.isArray(v) ? v.every(objects) : objects(v)));
    };
    for (const s of CAPABILITY_SCHEMAS) { expect((s.input_schema as { type: string }).type).toBe('object'); expect(objects(s.input_schema)).toBe(true); }
  }, 60_000);   /* the first to load the whole module graph */

  it('nothing deletes, archives or verifies; no write or note accepts verified', async () => {
    const { reg } = await fresh();
    for (const c of reg.CAPABILITIES) expect(c.name).not.toMatch(/delete|remove|archive|verif/);
    expect(JSON.stringify(CAPABILITY_SCHEMAS)).not.toContain('"verified"');
    const r = reg.capabilityByName('raise_problem')?.validate({ lineId: 'w', words: 'x', priority: 'low', how: 'verified' });
    expect(r?.ok).toBe(false);
    const o = reg.capabilityByName('record_observation')?.validate({ text: 'x', how: 'verified' });
    expect(o?.ok).toBe(false);
    if (o && !o.ok) expect(o.why).toMatch(/how it is known/i);
  });

  it('validate refuses bad input with a sentence', async () => {
    const { reg } = await fresh();
    const cases: [string, unknown][] = [['line_state', {}], ['line_state', { lineId: 'w', extra: 1 }], ['start_timer', { minutes: 500, label: 'x' }], ['open_page', { href: 'https://evil' }], ['raise_problem', { lineId: 'w', words: 'x', priority: 'urgent', how: 'observed' }], ['update_problem', { problemId: 'p', due: '14/11/2026' }], ['tool_records', {}]];
    for (const [name, input] of cases) {
      const v = reg.capabilityByName(name)?.validate(input);
      expect(v?.ok, name).toBe(false);
      if (v && !v.ok) expect(v.why).toMatch(/^[A-Z“].+[.—]/);
    }
  });
});

describe('runCall', () => {
  it('refuses a write that is not confirmed, and a capability it does not know', async () => {
    const { reg, a } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('raise_problem', { lineId: a.id, words: 'Jam at the infeed', priority: 'high', how: 'reported' }), { confirmed: false });
    expect(r.ok).toBe(false);
    expect((await (await import('../../db')).listAllSnags()).some(s => s.problem.startsWith('Jam at the infeed'))).toBe(false);
    expect((await reg.runCall(ctx(), call('delete_line', {}), { confirmed: true })).ok).toBe(false);
  }, 30_000);

  it('a client may read everything and write nothing', async () => {
    const { reg, a } = await seedTwoLines();
    const client = ctx({ level: 'client' });
    for (const c of reg.CAPABILITIES.filter(x => x.kind === 'read')) {
      const input = c.name === 'find' || c.name === 'resolve' || c.name === 'resolve_record' || c.name === 'plan_work' || c.name === 'plan_investigation' ? { words: 'line' } : c.name === 'understand_task' ? { words: 'losing production time', lineId: a.id } : c.name === 'run_analysis' ? { question: 'sure', name: 'Fill', values: [1, 2, 3, 4, 5, 6, 7, 8] } : c.name === 'fishbone_state' ? { lineId: a.id } : c.name === 'line_state' ? { lineId: a.id } : c.name === 'tool_records' ? { lineId: a.id } : c.name === 'recall' ? { words: 'film' } : c.name === 'project_state' || c.name === 'run_calculator' || c.name === 'draft_state' || c.name === 'read_record' ? null : {};
      if (input === null) continue;
      expect((await reg.runCall(client, call(c.name, input), { confirmed: false })).ok, c.name).toBe(true);
    }
    const writes: [string, unknown][] = [
      ['raise_problem', { lineId: a.id, words: 'x', priority: 'low', how: 'observed' }], ['update_problem', { problemId: 'pa1', owner: 'Jo' }],
      ['start_project', { name: 'P', method: 'pdca', lineIds: [a.id] }], ['save_calculation', { key: 'kanban', inputs: {} }], ['add_photo_to_problem', { problemId: 'pa1', photoKey: 'k' }],
      ['link_to_project', { projectId: 'nope', problemId: 'pa1' }],
      ['start_measurement', { tool: 'stops', lineId: a.id }], ['draw_diagram', { set: 'flow', capture: { title: 'x', steps: [{ what: 'Cook', kind: 'operation', time: 2, timeUnit: 'minutes', dist: null, distUnit: '' }] } }],
    ];
    for (const [name, input] of writes) {
      const r = await reg.runCall(client, call(name, input), { confirmed: true });
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.why).toMatch(/read/);
    }
  }, 60_000);

  it('a failed run is a sentence, never a throw', async () => {
    const { reg } = await seedTwoLines();
    const u = await reg.runCall(ctx(), call('update_problem', { problemId: 'nope', owner: 'Jo' }), { confirmed: true });
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.why).toMatch(/no problem with that id/);
    const { CALCS } = await import('../../tools/calc/registry');
    const def = CALCS.find(c => c.inputs.some(f => !f.optional && !f.hidden && f.kind === 'number'));
    if (!def) throw new Error('no calculator with a needed number');
    const r = await reg.runCall(ctx(), call('run_calculator', { key: def.key, inputs: {} }), { confirmed: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/Give “/);
    expect((await reg.runCall(ctx(), call('run_calculator', { key: 'no-such', inputs: {} }), { confirmed: false })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('line_state', { lineId: 'nope' }), { confirmed: false })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('set_focus', { title: 'x' }), { confirmed: false })).ok).toBe(false);
  }, 30_000);
});

describe('the reads say what the pages say, and a line holds only its own', () => {
  it('list_problems on line A: the register’s sentence of those problems, none of line B', async () => {
    const { db, reg, a, b } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('list_problems', { lineId: a.id }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const { snagsReading } = await import('../../lib/snagsReport');
    const mine = (await db.listAllSnags()).filter(s => s.workspaceId === a.id);
    expect(r.says).toBe(snagsReading({ snags: mine, register: true, became: new Map(), lineName: () => 'Line A', jobName: () => undefined }).says);
    expect(JSON.stringify(r)).not.toContain('Filler drips');
    expect(r.refs.map(x => x.id).sort()).toEqual(['pa1', 'pa2']);
    const late = await reg.runCall(ctx(), call('list_problems', { which: 'late' }), { confirmed: false });
    if (!late.ok) throw new Error(late.why);
    expect(late.refs.map(x => x.id)).toEqual(['pa1']);
    expect(b.id).not.toBe(a.id);
  }, 30_000);

  it('line_state and tool_records on line A carry nothing of line B', async () => {
    const { reg, a } = await seedTwoLines();
    const s = await reg.runCall(ctx(), call('line_state', { lineId: a.id }), { confirmed: false });
    if (!s.ok) throw new Error(s.why);
    const said = JSON.stringify(s);
    expect(said).toContain('Wrapper film tears');
    expect(said).not.toContain('Filler drips');
    expect(said).not.toContain('Line B');
    expect(s.says).toContain('2 problems open');
    const t = await reg.runCall(ctx(), call('tool_records', { lineId: a.id }), { confirmed: false });
    if (!t.ok) throw new Error(t.why);
    expect(JSON.stringify(t)).toContain('Seal strength A');
    expect(JSON.stringify(t)).not.toContain('Seal strength B');
    const { studyLine } = await import('../../lib/studyLinks');
    const { getStudy } = await import('../../db');
    expect((t.data as { says: string }[])[0].says).toBe(studyLine((await getStudy('sa'))!).text);
  }, 30_000);

  it('find with a client finds only that client’s lines and their problems', async () => {
    const { reg } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('find', { words: 'line', client: 'Acme Foods' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.refs.map(x => x.label)).toContain('Line A');
    expect(r.refs.map(x => x.label)).not.toContain('Line B');
    const f = await reg.runCall(ctx(), call('find', { words: 'filler', client: 'Acme Foods' }), { confirmed: false });
    if (!f.ok) throw new Error(f.why);
    expect(f.refs).toEqual([]);
    const all = await reg.runCall(ctx(), call('find', { words: 'filler' }), { confirmed: false });
    if (!all.ok) throw new Error(all.why);
    expect(all.refs.some(x => x.kind === 'problem' && x.id === 'pb1' && x.href === '/snags?open=pb1')).toBe(true);
  }, 30_000);

  it('overdue_actions on line A: the tracker’s sentence, the late one Sam’s', async () => {
    const { db, reg, a } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('overdue_actions', { lineId: a.id }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const { trackerRows, trackerSays } = await import('../../line/actions/lineActions');
    expect(r.says).toBe(trackerSays(trackerRows(await db.listAllSnags(), a.id, Date.now()), 'Line A'));
    expect((r.data as { late: { who: string }[] }).late.map(x => x.who)).toEqual(['Sam']);
    expect(JSON.stringify(r)).not.toContain('Filler drips');
  }, 30_000);

  it('list_calculators and run_calculator say what the calculator says', async () => {
    const { reg } = await fresh();
    const { CALCS } = await import('../../tools/calc/registry');
    const { runCalc } = await import('../../tools/calc/calc');
    const l = await reg.runCall(ctx(), call('list_calculators', {}), { confirmed: false });
    if (!l.ok) throw new Error(l.why);
    expect((l.data as { key: string }[]).map(x => x.key)).toEqual(CALCS.map(c => c.key));
    for (const def of CALCS) {
      const ex = def.examples[0];
      if (!ex) continue;
      const r = await reg.runCall(ctx(), call('run_calculator', { key: def.key, inputs: ex.inputs }), { confirmed: false });
      if (!r.ok) throw new Error(`${def.key}: ${r.why}`);
      expect((r.data as { sentence: string }).sentence, def.key).toBe(runCalc(def, ex.inputs).result?.sentence);
      expect((r.data as { sentence: string }).sentence, def.key).toBe(ex.expect.sentence);
    }
  }, 30_000);
});

describe('the writes write what the page writes', () => {
  it('raise_problem: a problem the register lists, with its words and how it is known, the machine on its line', async () => {
    const { db, reg, a } = await seedTwoLines();
    const input = { lineId: a.id, words: 'Infeed jams on the 2 kg bags', machine: 'Infeed', priority: 'high', how: 'reported', owner: 'Priya' };
    const p = await reg.previewCall(ctx(), call('raise_problem', input));
    expect(p.ok && p.says).toMatch(/Raise a High problem on Line A, on the Infeed/);
    const r = await reg.runCall(ctx(), call('raise_problem', input), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const s = (await db.listAllSnags()).find(x => x.problem.startsWith('Infeed jams'));
    expect(s?.problem).toBe('Infeed jams on the 2 kg bags Reported by the operators — not yet measured.');
    expect(s?.workspaceId).toBe(a.id);
    expect(s?.owner).toBe('Priya');
    expect((await db.getWorkspace(a.id))?.assets).toContain('Infeed');
  }, 30_000);

  it('update_problem: the owner changed; nothing to change refused', async () => {
    const { db, reg } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('update_problem', { problemId: 'pa2', owner: 'Jo', status: 'doing' }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const s = await db.getSnag('pa2');
    expect(s?.owner).toBe('Jo');
    expect(s?.status).toBe('in_progress');
    const again = await reg.runCall(ctx(), call('update_problem', { problemId: 'pa2', owner: 'Jo' }), { confirmed: true });
    expect(again.ok).toBe(false);
  }, 30_000);

  it('start_project: a project of that method on that line', async () => {
    const { db, reg, a } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('start_project', { name: 'Wrapper waste down', method: 'dmaic', lineIds: [a.id] }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const p = (await db.ensureProjects()).find(x => x.name === 'Wrapper waste down');
    expect(p?.method).toBe('dmaic');
    expect((await db.allPaceLines()).filter(l => l.projectId === p?.id).map(l => l.workspaceId)).toEqual([a.id]);
  }, 30_000);

  it('save_calculation: a calculator record on the line, its sentence the calculator’s', async () => {
    const { db, reg, a } = await seedTwoLines();
    const { CALCS } = await import('../../tools/calc/registry');
    const def = CALCS.find(c => c.examples.length) ?? CALCS[0];
    const r = await reg.runCall(ctx(), call('save_calculation', { key: def.key, inputs: def.examples[0].inputs, lineId: a.id, name: 'From the colleague' }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const s = (await db.listStudiesForLine(a.id)).find(x => x.name === 'From the colleague');
    expect(s?.tool).toBe('calc');
    expect(s?.agreed?.calc?.key).toBe(def.key);
    const { calcSays } = await import('../../tools/calc/calc');
    expect(calcSays(s!).text).toBe(def.examples[0].expect.sentence);
  }, 30_000);

  it('add_photo_to_problem: the blob on the problem, once', async () => {
    const { db, reg } = await seedTwoLines();
    await db.putBlob('photo-1', new Blob(['jpeg'], { type: 'image/jpeg' }));
    const r = await reg.runCall(ctx(), call('add_photo_to_problem', { problemId: 'pa1', photoKey: 'photo-1' }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    expect((await db.getSnag('pa1'))?.media?.map(m => m.blobKey)).toEqual(['photo-1']);
    expect((await reg.runCall(ctx(), call('add_photo_to_problem', { problemId: 'pa1', photoKey: 'photo-1' }), { confirmed: true })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('add_photo_to_problem', { problemId: 'pa1', photoKey: 'gone' }), { confirmed: true })).ok).toBe(false);
  }, 30_000);
});

describe('the conversation’s threads', () => {
  it('set_focus makes a thread current and parks the last; record_observation notes on it', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy({ id: 'conv', tool: 'talk', name: 'AI Mode', facts: { colleague: true } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    const c = ctx({ conversationId: 'conv' });
    expect((await reg.runCall(c, call('set_focus', { title: 'Line 3 lost output', scope: { lineId: 'w3' } }), { confirmed: false })).ok).toBe(true);
    expect((await reg.runCall(c, call('record_observation', { text: 'Film tears at every splice', how: 'observed' }), { confirmed: false })).ok).toBe(true);
    const r = await reg.runCall(c, call('set_focus', { title: 'Accumulation conveyor' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.says).toContain('“Line 3 lost output” is parked');
    const back = await reg.runCall(c, call('set_focus', { title: 'Something', scope: { lineId: 'w3' } }), { confirmed: false });
    expect(back.ok && back.says).toMatch(/^Back on “Line 3 lost output”/);
    const threads = ((await db.getStudy('conv'))?.facts as { threads: { title: string; status: string; notes: { how: string }[] }[] }).threads;
    expect(threads.map(x => [x.title, x.status])).toEqual([['Accumulation conveyor', 'parked'], ['Line 3 lost output', 'current']]);
    expect(threads[1].notes.map(n => n.how)).toEqual(['observed']);
    expect((await reg.runCall(c, call('park_focus', {}), { confirmed: false })).ok).toBe(true);
  }, 30_000);
});
