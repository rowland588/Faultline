/* ONBOARDING A FACTORY (docs/FACTORY-KNOWLEDGE.md F3–F5): the factory draft's tree (pure), matching what Faultline holds for THIS
 * client only, conflicts and outdated documents, a document's quotes checked, a CSV register read by rules, and the capabilities —
 * add_to_factory_draft, make_record on a factory, replace_machine, takeDocument — on records in a fake IndexedDB. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { applyFactoryOps, factoryView, toMake, type FactoryOp } from '../factoryDraft';
import { checkFactoryRead, readFactoryAsk } from '../factoryRead';
import { readRegister, csvCells } from '../../colleague/factoryRegister';
import { CAPABILITY_SCHEMAS } from '../schemas';
import type { FactoryDraftBody } from '../types';
import type { Workspace } from '../../types';
import type { Asset } from '../../lib/testing';

const NOW = Date.parse('2026-11-09T10:00:00Z');
let n = 0;
const id = () => `n${++n}`;
const said = { how: 'reported' as const, source: { kind: 'conversation' as const, id: 'conv', label: 'AI' } };
const empty = (client = 'Customer X Foods'): FactoryDraftBody => ({ client: { value: client, how: 'reported', at: NOW }, nodes: [] });
const ws = (o: Partial<Workspace> & { id: string; name: string }): Workspace => ({ color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1, ...o } as Workspace);

describe('the factory draft — said into a tree, nothing invented', () => {
  it('Rowland’s onboarding: two factories, the main one’s five areas, Packaging Lines 1–3 with their machines', () => {
    const ops: FactoryOp[] = [
      { op: 'add', level: 'site', name: 'Main factory', said: 'two factories' }, { op: 'add', level: 'site', name: 'Second factory' },
      ...['Preparation', 'Mixing', 'Cooking', 'Packaging', 'Despatch'].map((a): FactoryOp => ({ op: 'add', level: 'area', name: a, site: 'Main factory' })),
      ...[1, 2, 3].map((k): FactoryOp => ({ op: 'add', level: 'line', name: `Packaging Line ${k}`, site: 'Main factory', area: 'Packaging' })),
      { op: 'add', level: 'machine', name: 'Weighing scale', line: 'Packaging Line 1', kind: 'scales' },
      { op: 'add', level: 'machine', name: 'Bagging machine', line: 'Packaging Line 1', kind: 'bagging machine' },
    ];
    const r = applyFactoryOps(empty(), ops, said, NOW, id);
    expect(r.refused).toEqual([]);
    expect(r.body.nodes.filter(x => x.level === 'area')).toHaveLength(5);
    const line1 = r.body.nodes.find(x => x.name.value === 'Packaging Line 1');
    const packaging = r.body.nodes.find(x => x.name.value === 'Packaging');
    expect(line1?.parent).toBe(packaging?.id);
    const scale = r.body.nodes.find(x => x.name.value === 'Weighing scale');
    expect(scale?.parent).toBe(line1?.id);
    expect(scale?.facts?.kind?.value).toBe('scale');
    expect(scale?.facts?.kind?.how).toBe('reported');
    /* a machine is on a line, always — none said, none made up */
    const no = applyFactoryOps(r.body, [{ op: 'add', level: 'machine', name: 'Checkweigher' }], said, NOW, id);
    expect(no.refused[0]).toMatch(/a machine is on a line, always/);
    expect(no.body.nodes).toHaveLength(r.body.nodes.length);
    /* said twice — one node */
    const twice = applyFactoryOps(r.body, [{ op: 'add', level: 'line', name: 'packaging line 1', site: 'Main factory', area: 'Packaging' }], said, NOW, id);
    expect(twice.body.nodes.filter(x => x.level === 'line')).toHaveLength(3);
  });

  it('a correction keeps what it replaced; a rename, a move, a removal', () => {
    let b = applyFactoryOps(empty(), [{ op: 'add', level: 'machine', name: 'Bagger', line: 'Line 2', model: 'BX-100' }], said, NOW, id).body;
    b = applyFactoryOps(b, [{ op: 'set', level: 'machine', name: 'Bagger', of: 'Line 2', model: 'BX-200', said: 'it is the 200, not the 100' }], said, NOW + 1, id).body;
    const bag = b.nodes.find(x => x.name.value === 'Bagger');
    expect(bag?.facts?.model?.value).toBe('BX-200');
    expect(bag?.facts?.model?.earlier?.[0]?.value).toBe('BX-100');
    b = applyFactoryOps(b, [{ op: 'rename', level: 'machine', name: 'Bagger', to: 'Bagger 2' }, { op: 'move', level: 'machine', name: 'Bagger 2', line: 'Line 3' }], said, NOW, id).body;
    const moved = b.nodes.find(x => x.name.value === 'Bagger 2');
    expect(b.nodes.find(x => x.id === moved?.parent)?.name.value).toBe('Line 3');
    expect(moved?.name.earlier?.[0]?.value).toBe('Bagger');
    const gone = applyFactoryOps(b, [{ op: 'remove', level: 'line', name: 'Line 3' }], said, NOW, id);
    expect(gone.body.nodes.some(x => x.name.value === 'Bagger 2')).toBe(false);
  });
});

describe('the draft against what Faultline holds — this client only', () => {
  const lines = [
    ws({ id: 'L1', name: 'Packaging Line 1', clientName: 'Customer X Foods', siteName: 'Main factory', areaName: 'Packaging', assets: ['Metal detector'] }),
    ws({ id: 'B1', name: 'Packaging Line 2', clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Packaging', assets: ['Bagger'] }),
  ];
  const assets: Asset[] = [{ id: 'md', projectId: '', workspaceId: 'L1', name: 'Metal detector', kind: 'metal detector', model: 'Loma IQ4', state: 'running', sort: 0, updatedAt: 1,
    known: { model: { how: 'confirmed', at: Date.parse('2026-06-01T00:00:00Z'), by: 'Rowland' } } }];

  it('a line and a machine already there are matched, never doubled; another client’s line of the same name is never touched', () => {
    const b = applyFactoryOps(empty(), [
      { op: 'add', level: 'machine', name: 'Metal detector', line: 'Packaging Line 1', site: 'Main factory', area: 'Packaging' },
      { op: 'add', level: 'machine', name: 'Checkweigher', line: 'Packaging Line 1', site: 'Main factory', area: 'Packaging' },
      { op: 'add', level: 'machine', name: 'Bagger', line: 'Packaging Line 2', site: 'Main factory', area: 'Packaging' },
    ], said, NOW, id).body;
    const v = factoryView({ factory: b }, { lines, assets });
    const st = (name: string) => v.all.find(x => x.node.name.value === name)?.state;
    expect(st('Packaging Line 1')).toBe('in-faultline');
    expect(st('Metal detector')).toBe('in-faultline');
    expect(st('Checkweigher')).toBe('new');
    /* Brook Dairy's "Packaging Line 2" is never this client's */
    expect(st('Packaging Line 2')).toBe('new');
    expect(st('Bagger')).toBe('new');
    expect(JSON.stringify(v)).not.toContain('Brook');
    const plan = toMake(v);
    expect(plan.lines.map(x => x.node.name.value)).toEqual(['Packaging Line 2']);
    expect(plan.machines.map(x => x.node.name.value).sort()).toEqual(['Bagger', 'Checkweigher']);
  });

  it('a value that differs from the recorded one is a conflict to pick; an older document is flagged', () => {
    const doc = { how: 'document' as const, source: { kind: 'document' as const, id: 'src', label: 'Register.csv', day: '2026-03-01' }, quoteOf: () => 'Packaging Line 1,Metal detector,Loma IQ3' };
    const b = applyFactoryOps(empty(), [{ op: 'add', level: 'machine', name: 'Metal detector', line: 'Packaging Line 1', model: 'Loma IQ3' }], doc, NOW, id).body;
    const v = factoryView({ factory: b }, { lines, assets });
    const md = v.all.find(x => x.node.name.value === 'Metal detector');
    expect(md?.conflicts[0]).toMatchObject({ field: 'model', recorded: { value: 'Loma IQ4' }, offered: { value: 'Loma IQ3' } });
    expect(md?.conflicts[0].recorded.said).toMatch(/Confirmed by Rowland/);
    expect(md?.flags[0]).toMatch(/dated 1 Mar 2026, but the Metal detector’s model was recorded on 1 Jun 2026/);
    expect(v.blockers.join(' ')).toMatch(/wait for your word/);
    expect(v.blockers.join(' ')).toMatch(/Faultline holds model “Loma IQ4”, the document says “Loma IQ3” — pick which/);
    /* kept and picked: nothing holds it */
    const kept = applyFactoryOps(b, [{ op: 'keep', level: 'machine', name: 'Metal detector', of: 'Packaging Line 1' }, { op: 'pick', level: 'machine', name: 'Metal detector', of: 'Packaging Line 1', field: 'model', take: 'recorded' }], said, NOW, id).body;
    expect(kept.nodes.every(x => x.review === 'kept')).toBe(true);
    expect(factoryView({ factory: kept }, { lines, assets }).blockers).toEqual([]);
  });

  it('a document naming a machine replaced since is out of date and is never made', () => {
    const withOld: Asset[] = [...assets,
      { id: 'old', projectId: '', workspaceId: 'L1', name: 'Bagger', state: 'running', sort: 1, updatedAt: 1, replacedBy: 'new', known: { replacedBy: { how: 'reported', at: Date.parse('2026-11-08T00:00:00Z') } } },
      { id: 'new', projectId: '', workspaceId: 'L1', name: 'Bagger BX500', state: 'running', sort: 1, updatedAt: 1 }];
    const l = [{ ...lines[0], assets: ['Metal detector', 'Bagger BX500'] }];
    const doc = { how: 'document' as const, source: { kind: 'document' as const, id: 'src', label: 'Register.csv', day: '2026-03-01' } };
    const b = applyFactoryOps(empty(), [{ op: 'add', level: 'machine', name: 'Bagger', line: 'Packaging Line 1' }], doc, NOW, id).body;
    const v = factoryView({ factory: b }, { lines: l, assets: withOld });
    const bag = v.all.find(x => x.node.name.value === 'Bagger');
    expect(bag?.state).toBe('replaced');
    expect(bag?.flags[0]).toMatch(/names Bagger, which was replaced by Bagger BX500 on 8 Nov — it is out of date here/);
    expect(toMake(v).machines).toEqual([]);
  });
});

describe('a document’s words — quotes checked', () => {
  const text = 'Equipment register — issued 1 March 2026\nPackaging Line 1 | Weighing scale | Avery | AV-200\nPackaging Line 2 | Bagger | Ishida | BX-100';
  it('an item whose quote is not in the document is dropped; a value not in its quote is dropped', () => {
    const r = checkFactoryRead({ day: '2026-03-01', dayQuote: 'issued 1 March 2026', items: [
      { level: 'machine', name: 'Weighing scale', quote: 'Packaging Line 1 | Weighing scale | Avery | AV-200', line: 'Packaging Line 1', maker: 'Avery', model: 'AV-200', site: '', area: '', kind: '', serial: '' },
      { level: 'machine', name: 'Checkweigher', quote: 'Packaging Line 3 | Checkweigher', line: 'Packaging Line 3', site: '', area: '', kind: '', model: '', serial: '', maker: '' },
      { level: 'machine', name: 'Bagger', quote: 'Packaging Line 2 | Bagger | Ishida | BX-100', line: 'Packaging Line 2', model: 'BX-900', site: '', area: '', kind: '', serial: '', maker: '' },
    ] }, text);
    expect(r?.items.map(i => i.name)).toEqual(['Weighing scale']);
    expect(r?.dropped).toBe(2);
    expect(r?.day).toBe('2026-03-01');
  });
  it('the request holds the words or the pages, within their limits', () => {
    expect(readFactoryAsk({ text, pages: ['x'] }).ok).toBe(false);
    expect(readFactoryAsk({ text }).ok).toBe(true);
    expect(readFactoryAsk({ pages: ['!!'] }).ok).toBe(false);
  });
});

describe('a CSV register read by rules', () => {
  it('its header found, each row a machine with the row as its words, a row with no line left out and said, its date', () => {
    const csv = 'Customer X Foods equipment register\nDate: 2026-03-01\nSite,Area,Line,Equipment,Type,Make,Model,Serial No\nMain factory,Packaging,Packaging Line 1,Scale 1,Weighing scale,Avery,AV-200,S100\nMain factory,Packaging,,Spare scale,Weighing scale,Avery,AV-200,S101\n"Main factory",Packaging,Packaging Line 2,"Bagger, vertical",Bagging machine,Ishida,BX-100,B7\n';
    const r = readRegister(csv);
    if ('why' in r) throw new Error(r.why);
    expect(r.day).toBe('2026-03-01');
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ level: 'machine', name: 'Scale 1', line: 'Packaging Line 1', site: 'Main factory', area: 'Packaging', kind: 'Weighing scale', maker: 'Avery', model: 'AV-200', serial: 'S100', quote: 'Main factory,Packaging,Packaging Line 1,Scale 1,Weighing scale,Avery,AV-200,S100' });
    expect(r.items[1].name).toBe('Bagger, vertical');
    expect(r.skipped[0]).toMatch(/names no line — left out/);
    expect(csvCells('a;"b;c";d', ';')).toEqual(['a', 'b;c', 'd']);
    expect('why' in readRegister('just,words\n1,2')).toBe(true);
  });
});

/* ------------------------------------------------------------------ the capabilities on a conversation */

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});
const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), conv: await import('../../colleague/conversation'), build: await import('../factoryBuild') });

describe('the capabilities: note, make, replace, read a document', () => {
  it('are in the registry and the schemas with the same kinds', async () => {
    const { reg } = await fresh();
    expect(reg.capabilityByName('add_to_factory_draft')?.kind).toBe('local');
    expect(reg.capabilityByName('replace_machine')?.kind).toBe('write');
    for (const name of ['add_to_factory_draft', 'replace_machine']) expect(CAPABILITY_SCHEMAS.find(s => s.name === name)?.kind).toBe(reg.capabilityByName(name)?.kind);
    expect(reg.capabilityByName('add_to_factory_draft')?.validate({ items: [{ op: 'add', level: 'machine', name: 'X', colour: 'red' }] }).ok).toBe(false);
  }, 60_000);

  it('Customer X Foods onboarded: noted, made through lib/lines on the client’s site › area, the machines with how known; a client may not make it', async () => {
    const { db, reg, lines, conv } = await fresh();
    const other = await lines.addLineToFactory('Packaging Line 1');
    await db.updateWorkspace({ ...other, clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Packaging', assets: ['Robot'] });
    await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI — 9 Nov' }));
    const ctx = { now: NOW, conversationId: 'conv', me: 'Rowland' };
    const run = (name: string, input: unknown, confirmed = false, c: object = ctx) => reg.runCall(c as typeof ctx, { id: `c-${name}`, name, input }, { confirmed });
    const none = await run('add_to_factory_draft', { items: [{ op: 'add', level: 'site', name: 'Main factory' }] });
    expect(!none.ok && none.why).toMatch(/Say whose factory this is/);
    const a = await run('add_to_factory_draft', { client: 'Customer X Foods', items: [
      { op: 'add', level: 'area', name: 'Packaging', site: 'Main factory', said: 'let’s start with packaging' },
      { op: 'add', level: 'area', name: 'Mixing', site: 'Main factory' },
      { op: 'add', level: 'machine', name: 'Weighing scale', line: 'Packaging Line 1', site: 'Main factory', area: 'Packaging', kind: 'scales' },
      { op: 'add', level: 'machine', name: 'Metal detector', line: 'Packaging Line 1', site: 'Main factory', area: 'Packaging', model: 'Loma IQ4' },
    ] });
    expect(a.ok).toBe(true);
    const draftId = a.ok ? (a.data as { draftId: string }).draftId : '';
    /* Brook Dairy's line of the same name is not this client's — a new line, never matched to theirs */
    expect(a.ok && (a.data as { counts: { newLines: number } }).counts.newLines).toBe(1);
    expect(a.ok && a.says).toMatch(/Held on the draft until a line is made in them: Mixing \(Main factory\)/);
    const refusedAsClient = await run('make_record', { draftId }, true, { ...ctx, level: 'client' });
    expect(refusedAsClient.ok).toBe(false);
    const p = await reg.previewCall(ctx, { id: 'p', name: 'make_record', input: { draftId } });
    expect(p.ok && p.says).toMatch(/Make Customer X Foods’s factory in Faultline.*1 new line — Packaging Line 1 \(Main factory › Packaging\) with Weighing scale, Metal detector/);
    const m = await run('make_record', { draftId }, true);
    expect(m.ok && m.says).toMatch(/Made in Faultline for Customer X Foods: 1 new line and 2 machines/);
    const all = await db.listWorkspaces();
    const made = all.filter(w => w.name === 'Packaging Line 1');
    expect(made).toHaveLength(2);
    const mine = made.find(w => w.clientName === 'Customer X Foods');
    expect(mine).toMatchObject({ siteName: 'Main factory', areaName: 'Packaging' });
    expect(mine?.known?.clientName?.how).toBe('reported');
    expect(mine?.assets?.filter(x => x !== 'Whole line')).toEqual(['Weighing scale', 'Metal detector']);
    const recs = (await db.listAllAssets()).filter(x => x.workspaceId === mine?.id);
    const scale = recs.find(x => x.name === 'Weighing scale');
    expect(scale?.kind).toBe('scale');
    expect(scale?.known?.kind).toMatchObject({ how: 'reported', by: 'Rowland', source: { kind: 'conversation', id: 'conv' } });
    /* the other client's line untouched */
    expect((await db.getWorkspace(other.id))?.assets).toEqual(['Robot']);
    /* made: a second make has nothing new */
    const again = await run('make_record', { draftId }, true);
    expect(again.ok).toBe(false);

    /* F5 — the scale replaced: a new record, the old kept and marked; the list carries the new name */
    const same = await run('replace_machine', { lineId: mine?.id, machine: 'Weighing scale', name: 'weighing scale' }, true);
    expect(!same.ok && same.why).toMatch(/needs its own name/);
    const unknown = await run('replace_machine', { lineId: mine?.id, machine: 'Mixer', name: 'Mixer 2' }, true);
    expect(!unknown.ok && unknown.why).toMatch(/No machine called “Mixer”/);
    const pv = await reg.previewCall(ctx, { id: 'p2', name: 'replace_machine', input: { lineId: mine?.id, machine: 'Weighing scale', name: 'Scale — Ishida', kind: 'scale', maker: 'Ishida' } });
    expect(pv.ok && pv.says).toMatch(/Record that Weighing scale on Packaging Line 1 has been replaced by Scale — Ishida \(a scale, made by Ishida\)/);
    const unconfirmed = await run('replace_machine', { lineId: mine?.id, machine: 'Weighing scale', name: 'Scale — Ishida' });
    expect(unconfirmed.ok).toBe(false);
    const rp = await run('replace_machine', { lineId: mine?.id, machine: 'Weighing scale', name: 'Scale — Ishida', kind: 'scale', maker: 'Ishida', said: 'the scale has been replaced' }, true);
    expect(rp.ok).toBe(true);
    const after = (await db.listAllAssets()).filter(x => x.workspaceId === mine?.id);
    const old = after.find(x => x.name === 'Weighing scale');
    const nu = after.find(x => x.name === 'Scale — Ishida');
    expect(old?.replacedBy).toBe(nu?.id);
    expect(old?.deletedAt).toBeUndefined();
    expect(old?.known?.replacedBy).toMatchObject({ how: 'reported', by: 'Rowland' });
    expect(nu).toMatchObject({ kind: 'scale', oem: 'Ishida', sort: old?.sort });
    expect(nu?.known?.oem?.how).toBe('reported');
    expect((await db.getWorkspace(mine?.id as string))?.assets?.filter(x => x !== 'Whole line')).toEqual(['Scale — Ishida', 'Metal detector']);
  }, 60_000);

  it('a document taken: kept as a factory source, its proposals waiting, a quote not in it refused; kept then made', async () => {
    const { db, reg, conv, build } = await fresh();
    await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI' }));
    const ctx = { now: NOW, conversationId: 'conv' };
    const text = 'Line,Equipment,Type\nPackaging Line 3,Checkweigher 3,Checkweigher\nPackaging Line 3,Case packer,Case packer';
    const t = await build.takeDocument(ctx, { client: 'Customer X Foods', file: { name: 'register.csv', blob: new Blob([text]), mime: 'text/csv' }, text, readBy: 'code', day: '2026-03-01', items: [
      { level: 'machine', name: 'Checkweigher 3', line: 'Packaging Line 3', kind: 'Checkweigher', quote: 'Packaging Line 3,Checkweigher 3,Checkweigher' },
      { level: 'machine', name: 'Case packer', line: 'Packaging Line 3', quote: 'Packaging Line 3,Case packer,Case packer' },
      { level: 'machine', name: 'Robot', line: 'Packaging Line 3', quote: 'Packaging Line 3,Robot' },
    ] });
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    expect(t.proposed).toBe(2);
    expect(t.refused[0]).toMatch(/“Robot” — its words are not in the document/);
    const src = await db.getStudy(t.sourceId);
    expect(src).toMatchObject({ tool: 'doc', agreed: { doc: { def: 'custom' } } });
    expect(src?.facts.docValues?.text).toBe(text);
    expect(src?.facts.docPhotos?.[0]).toMatchObject({ field: 'source-file', mime: 'text/csv' });
    const blocked = await reg.runCall(ctx, { id: 'm', name: 'make_record', input: { draftId: t.draftId } }, { confirmed: true });
    expect(!blocked.ok && blocked.why).toMatch(/wait for your word/);
    const kept = await reg.runCall(ctx, { id: 'k', name: 'add_to_factory_draft', input: { draftId: t.draftId, items: [
      { op: 'keep', level: 'machine', name: 'Checkweigher 3', of: 'Packaging Line 3' }, { op: 'leave_out', level: 'machine', name: 'Case packer', of: 'Packaging Line 3' }] } }, { confirmed: false });
    expect(kept.ok).toBe(true);
    const made = await reg.runCall(ctx, { id: 'm2', name: 'make_record', input: { draftId: t.draftId } }, { confirmed: true });
    expect(made.ok).toBe(true);
    const line = (await db.listWorkspaces()).find(w => w.name === 'Packaging Line 3');
    expect(line?.assets?.filter(x => x !== 'Whole line')).toEqual(['Checkweigher 3']);
    const cw = (await db.listAllAssets()).find(x => x.name === 'Checkweigher 3');
    expect(cw?.known?.kind).toMatchObject({ how: 'document', source: { kind: 'document', id: t.sourceId, quote: 'Packaging Line 3,Checkweigher 3,Checkweigher', label: 'register.csv' } });
    /* the source now sits on the line it describes */
    expect((await db.getStudy(t.sourceId))?.workspaceId).toBe(line?.id);
  }, 60_000);
});
