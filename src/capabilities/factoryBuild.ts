/* ONBOARDING A FACTORY — the capabilities (9 November, docs/FACTORY-KNOWLEDGE.md F3–F5).
 *
 *   add_to_factory_draft  local  the client's sites › areas › lines › machines as the person says them, into the conversation's
 *                                factory draft (started on the first call, for the client named): add, set, rename, move, remove,
 *                                keep or leave out a document's proposal, pick recorded or new where they differ. Never invents.
 *   make_record (factory)  write  confirmed: the lines made through lib/lines (addLineToFactory, their client · site · area words),
 *                                the machines put on them (machineOntoLine) and described (db/lineRecords setMachineIdentity) — each
 *                                value saying how it is known (reported, or from a document with its words); a line or machine
 *                                already in Faultline matched, never doubled; held while a proposal waits or a conflict is unpicked
 *   replace_machine       write  confirmed: the new machine on the same line, the old one kept and marked Replaced by (db/lineRecords
 *                                replaceLineMachine), how known = reported by whom and when
 *   takeDocument                 (the screen's, not the colleague's) a factory source — a document record holding the file and its
 *                                words — and its proposals into the draft, each with the exact words it came from; a quote not found
 *                                in the document is refused
 * The draft is pure in ./factoryDraft; what each sees is only its own client's (lib/factoryKnowledge sameClient). */
import { allPaceLines, getStudy, getWorkspace, listAllAssets, listWorkspaces, patchStudy, putBlob, putStudy, updateWorkspace } from '../db';
import { machineRecordFor, replaceLineMachine, setMachineIdentity } from '../db/lineRecords';
import { addLineToFactory, machineOntoLine } from '../lib/lines';
import { machineKey, machinesOnLine } from '../lib/lineRecords';
import { kindWord } from '../lib/factoryKnowledge';
import { uid } from '../lib/ids';
import type { Known, KnownFact, Workspace } from '../types';
import type { ToolStudy } from '../lib/study';
import { CUSTOM_KEY } from '../tools/doc/custom';
import type { CustomDef, DocRow } from '../tools/doc/types';
import { checkObject, ID } from './check';
import { anyone, mayEdit } from './access';
import { conversation, draftsOf, putDraft, writeDrafts } from './draftStore';
import { applyFactoryOps, FACTORY_FIELDS, FACTORY_KEY, FACTORY_TOOL, factoryView, sameName, toMake, type FactoryOp, type FactoryOpKind, type FactoryView, type ViewNode } from './factoryDraft';
import { sameText, type FactoryReadItem } from './factoryRead';
import type { CapCtx, CapRef, CapResult, Capability, ColleagueDraft, FactoryFact, FactoryField, FactoryLevel } from './types';
import { lineRef, plural } from './util';

const OPS: readonly FactoryOpKind[] = ['add', 'set', 'rename', 'move', 'remove', 'keep', 'leave_out', 'pick'];
const LEVELS: readonly FactoryLevel[] = ['site', 'area', 'line', 'machine'];

const existing = async () => { const [lines, assets, jobLines] = await Promise.all([listWorkspaces(), listAllAssets(), allPaceLines()]); return { lines, assets, jobLines }; };

/** The conversation's factory draft for a client — the newest. */
export const factoryDraftFor = (drafts: readonly ColleagueDraft[], client?: string): ColleagueDraft | undefined =>
  [...drafts].filter(d => d.kind === 'factory' && (!client || sameName('site', d.factory?.client.value ?? '', client))).sort((a, b) => b.at - a.at)[0];

function newFactoryDraft(client: FactoryFact, title: string | undefined, threadId: string | undefined, now: number): ColleagueDraft {
  return { id: uid(), kind: 'factory', key: FACTORY_KEY, title: title?.trim() || `${client.value} — the factory`, scope: {}, values: {}, factory: { client, nodes: [] }, status: 'draft', ...(threadId ? { threadId } : {}), at: now };
}
const currentThreadId = (s: ToolStudy): string | undefined => ((s.facts as { threads?: { id: string; status: string }[] }).threads ?? []).find(t => t.status === 'current')?.id;

/** The view in a few words: what is new, what is matched, what waits, what holds it. */
export function viewSaid(v: FactoryView): string {
  const c = v.counts;
  return [
    `${v.client || 'The client'}: ${[c.newLines ? `${plural(c.newLines, 'new line')}` : '', c.newMachines ? `${plural(c.newMachines, 'new machine')}` : '', c.matchedLines + c.matchedMachines ? `${c.matchedLines + c.matchedMachines} already in Faultline (matched, not doubled)` : '', c.made ? `${c.made} made` : ''].filter(Boolean).join(', ') || 'nothing said yet'}.`,
    v.held.length ? `Held on the draft until a line is made in them: ${v.held.join(', ')}.` : '',
    ...v.all.flatMap(x => x.flags),
    v.blockers.length ? `Before it can be made: ${v.blockers.join(' ')}` : c.newLines + c.newMachines + v.all.filter(x => x.state === 'in-faultline').length ? 'It can be made when the person says so.' : '',
  ].filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ add_to_factory_draft */

const OP_FIELDS = {
  op: { kind: 'enum' as const, label: 'what to do', values: OPS, required: true },
  level: { kind: 'enum' as const, label: 'what it is (site, area, line or machine)', values: LEVELS, required: true },
  name: { kind: 'string' as const, label: 'its name, as said', max: 160, required: true },
  id: { kind: 'string' as const, label: 'its id in the draft', max: 80 },
  of: { kind: 'string' as const, label: 'which one (its line, area or site)', max: 160 },
  site: { kind: 'string' as const, label: 'its site', max: 160 },
  area: { kind: 'string' as const, label: 'its area', max: 160 },
  line: { kind: 'string' as const, label: 'its line', max: 160 },
  to: { kind: 'string' as const, label: 'the new name', max: 160 },
  kind: { kind: 'string' as const, label: 'what the machine is', max: 120 },
  model: { kind: 'string' as const, label: 'its model', max: 120 },
  serial: { kind: 'string' as const, label: 'its serial', max: 120 },
  maker: { kind: 'string' as const, label: 'who made it', max: 120 },
  field: { kind: 'enum' as const, label: 'the field picked', values: ['kind', 'model', 'serial', 'maker', 'site', 'area'] },
  take: { kind: 'enum' as const, label: 'which value is taken', values: ['recorded', 'new'] },
  said: { kind: 'string' as const, label: 'the words said', max: 300 },
};

export const addToFactoryDraft: Capability = {
  name: 'add_to_factory_draft', title: 'Note the factory', kind: 'local',
  validate: raw => {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const { items, ...rest } = o;
    const head = checkObject(rest, { draftId: ID('the factory draft'), client: { kind: 'string', label: 'the client — the business', max: 120 }, title: { kind: 'string', label: 'its name', max: 120 } });
    if (!head.ok) return head;
    if (!Array.isArray(items) || !items.length) return { ok: false, why: 'Give what was said — a list of { op, level, name, … }.' };
    if (items.length > 60) return { ok: false, why: 'Give at most 60 at once.' };
    const ops: FactoryOp[] = [];
    for (const [i, it] of items.entries()) {
      const c = checkObject(it, OP_FIELDS, `Item ${i + 1}`);
      if (!c.ok) return c;
      const op = c.input as unknown as FactoryOp;
      if (op.op === 'pick' && (!op.field || !op.take)) return { ok: false, why: `Item ${i + 1}: a pick says the field and which value is taken (recorded or new).` };
      if (op.op === 'rename' && !op.to) return { ok: false, why: `Item ${i + 1}: say the new name.` };
      ops.push(op);
    }
    return { ok: true, input: { ...head.input, items: ops } };
  },
  allowed: anyone,
  async run(ctx, input: { draftId?: string; client?: string; title?: string; items: FactoryOp[] }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const drafts = draftsOf(c.s);
    let d = input.draftId ? drafts.find(x => x.id === input.draftId && x.kind === 'factory') : factoryDraftFor(drafts, input.client) ?? (input.client ? undefined : factoryDraftFor(drafts));
    if (input.draftId && !d) return { ok: false, why: 'There is no factory draft with that id in this conversation.' };
    if (d && input.client && !sameName('site', d.factory?.client.value ?? '', input.client)) return { ok: false, why: `That draft is ${d.factory?.client.value}’s factory, not ${input.client}’s — one client’s factory is never mixed with another’s.` };
    let started = false;
    if (!d) {
      if (!input.client) return { ok: false, why: 'Say whose factory this is — the business — before anything of it is noted.' };
      d = newFactoryDraft({ value: input.client.trim(), how: 'reported', source: { kind: 'conversation', id: c.s.id, label: c.s.name }, at: ctx.now }, input.title, currentThreadId(c.s), ctx.now);
      started = true;
    }
    const r = applyFactoryOps(d.factory as NonNullable<ColleagueDraft['factory']>, input.items, { how: 'reported', source: { kind: 'conversation', id: c.s.id, label: c.s.name } }, ctx.now, uid);
    if (!r.done.length && !started) return { ok: false, why: `Nothing was noted. ${r.refused.join(' ')}` };
    const next: ColleagueDraft = { ...d, factory: r.body };
    await (started ? writeDrafts(c.s.id, cur => [...cur, next]) : putDraft(c.s, next));
    const v = factoryView(next, await existing());
    return {
      ok: true,
      says: [started ? `Started ${next.title} as a draft — nothing is a record until you say so.` : '', r.done.length ? `Noted: ${r.done.join('; ')}.` : '', r.refused.length ? `Not noted: ${r.refused.join(' ')}` : '', viewSaid(v)].filter(Boolean).join(' '),
      data: { draftId: next.id, client: v.client, counts: v.counts, ...(r.refused.length ? { refused: r.refused } : {}), blockers: v.blockers, held: v.held,
        flags: v.all.flatMap(x => x.flags), matched: v.all.filter(x => x.state === 'in-faultline').map(x => `${x.node.level} ${x.node.name.value}`) },
      refs: v.all.filter(x => x.match?.id && x.node.level === 'line').map(x => lineRef({ id: x.match?.id as string, name: x.match?.name as string })),
    };
  },
};

/** draft_state, for a factory draft: the tree against Faultline (needs the records, so it is here, not in the pure draft). */
export async function factoryState(d: ColleagueDraft): Promise<{ says: string; data: unknown }> {
  const v = factoryView(d, await existing());
  const node = (x: ViewNode): unknown => ({
    id: x.node.id, level: x.node.level, name: x.node.name.value, state: x.state, how: x.node.name.how,
    ...(x.node.level === 'machine' ? { facts: Object.fromEntries(FACTORY_FIELDS.filter(f => x.node.facts?.[f]).map(f => [f, { value: x.node.facts?.[f]?.value, how: x.node.facts?.[f]?.how }])) } : {}),
    ...(x.conflicts.length ? { conflicts: x.conflicts.map(c => ({ field: c.field, recorded: c.recorded.value, offered: c.offered.value, pick: c.pick ?? 'not picked' })) } : {}),
    ...(x.flags.length ? { flags: x.flags } : {}), ...(x.children.length ? { children: x.children.map(node) } : {}),
  });
  return { says: `${d.title} (${FACTORY_TOOL}). ${viewSaid(v)}`, data: { draftId: d.id, client: v.client, tree: v.roots.map(node), counts: v.counts, blockers: v.blockers, held: v.held } };
}

/* ------------------------------------------------------------------ making it */

const byOf = (ctx: CapCtx) => ctx.me?.trim() || ctx.email?.trim() || undefined;
/** How a value said or read is known on the record — reported (the conversation, its words) or from a document (its words). */
const knownOf = (f: FactoryFact, ctx: CapCtx): KnownFact => ({
  how: f.how === 'document' ? 'document' : 'reported', at: f.at, ...(byOf(ctx) ? { by: byOf(ctx) } : {}),
  source: { kind: f.how === 'document' ? 'document' : 'conversation', ...(f.source?.id ? { id: f.source.id } : {}), ...(f.source?.quote ? { quote: f.source.quote } : f.said ? { quote: f.said } : {}), ...(f.source?.label ? { label: f.source.label } : {}) },
});
const RECORD: Record<FactoryField, 'kind' | 'model' | 'serial' | 'oem'> = { kind: 'kind', model: 'model', serial: 'serial', maker: 'oem' };

export async function factoryPreview(d: ColleagueDraft): Promise<string> {
  const v = factoryView(d, await existing());
  if (v.blockers.length) return `${d.title} cannot be made yet. ${v.blockers.join(' ')}`;
  const plan = toMake(v);
  const where = (x: ViewNode) => [x.path.site, x.path.area].filter(Boolean).join(' › ');
  const machinesOn = (lineNode: string) => plan.machines.filter(m => m.node.parent === lineNode);
  const lines = plan.lines.map(l => `${l.node.name.value}${where(l) ? ` (${where(l)})` : ''}${machinesOn(l.node.id).length ? ` with ${machinesOn(l.node.id).map(m => m.node.name.value).join(', ')}` : ''}`);
  const onOld = plan.machines.filter(m => !plan.lines.some(l => l.node.id === m.node.parent));
  const ups = plan.updates;
  if (!lines.length && !onOld.length && !ups.length) return `Nothing new to make for ${v.client} — everything said is already made or in Faultline.`;
  const how = v.all.some(x => x.node.name.how === 'document') ? 'each value saying how it is known — reported in this conversation, or from its document with the words it came from' : 'each value marked as reported in this conversation';
  return [
    `Make ${v.client}’s factory in Faultline, ${how}:`,
    lines.length ? `${plural(lines.length, 'new line')} — ${lines.join('; ')}.` : '',
    onOld.length ? `On lines already in Faultline: ${onOld.map(m => `${m.node.name.value} on ${m.path.line}`).join(', ')}.` : '',
    ups.length ? `Already in Faultline, matched not doubled (only what each lacks, or what you picked, is written): ${ups.map(x => x.node.name.value).join(', ')}.` : '',
    v.held.length ? `Held on the draft until a line is made in them: ${v.held.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

/** MAKE IT — through the functions Manual Mode uses, in order: the lines, then their machines, then what is matched. */
export async function makeFactory(ctx: CapCtx, s: ToolStudy, d: ColleagueDraft): Promise<CapResult> {
  const ex = await existing();
  const v = factoryView(d, ex);
  if (v.blockers.length) return { ok: false, why: `${d.title} cannot be made yet. ${v.blockers.join(' ')}` };
  const plan = toMake(v);
  if (!plan.lines.length && !plan.machines.length && !plan.updates.length) return { ok: false, why: `Nothing new to make for ${v.client} — everything said is already made or in Faultline.` };
  const body = d.factory as NonNullable<ColleagueDraft['factory']>;
  const made = new Map<string, string>();   // node id → line id or machine record id
  const at = ctx.now;
  const lineOfNode = (id?: string): string | undefined => {
    if (!id) return undefined;
    const x = v.all.find(y => y.node.id === id);
    return made.get(id) ?? x?.node.made?.id ?? x?.match?.id;
  };
  const siteFact = (x: ViewNode, level: 'site' | 'area'): FactoryFact | undefined => {
    let p = body.nodes.find(n => n.id === x.node.parent);
    while (p && p.level !== level) p = body.nodes.find(n => n.id === p?.parent);
    return p?.name;
  };
  const refs: CapRef[] = [];
  /* 1 · the new lines: added to the factory, with the client, site and area words and how each is known */
  for (const l of plan.lines) {
    const w = await addLineToFactory(l.node.name.value);
    const cur = (await getWorkspace(w.id)) ?? w;
    const site = siteFact(l, 'site'), area = siteFact(l, 'area');
    const known: Known = { ...(cur.known ?? {}), name: knownOf(l.node.name, ctx), clientName: knownOf(body.client, ctx), ...(site ? { siteName: knownOf(site, ctx) } : {}), ...(area ? { areaName: knownOf(area, ctx) } : {}) };
    await updateWorkspace({ ...cur, clientName: v.client, ...(site ? { siteName: site.value } : {}), ...(area ? { areaName: area.value } : {}), known });
    made.set(l.node.id, w.id);
    refs.push(lineRef(w));
  }
  /* 2 · a line already in Faultline: its place taken from the draft only where the person picked the new */
  for (const x of plan.updates.filter(u => u.node.level === 'line')) {
    const id = x.match?.id;
    const w = id ? await getWorkspace(id) : undefined;
    if (!w) continue;
    const patch: Partial<Workspace> = {};
    const known: Known = { ...(w.known ?? {}) };
    for (const field of ['site', 'area'] as const) {
      const f = siteFact(x, field);
      const key = field === 'site' ? 'siteName' : 'areaName';
      if (!f) continue;
      const conflict = x.conflicts.find(c => c.field === field);
      if ((conflict && conflict.pick === 'new') || (!conflict && !(w[key] ?? '').trim())) { patch[key] = f.value; known[key] = knownOf(f, ctx); }
    }
    if (!(w.clientName ?? '').trim()) { patch.clientName = v.client; known.clientName = knownOf(body.client, ctx); }
    if (Object.keys(patch).length) await updateWorkspace({ ...w, ...patch, known });
    made.set(x.node.id, w.id);
    refs.push(lineRef(w));
  }
  /* 3 · the machines: on their line's list (machineOntoLine), then described — each value with how it is known */
  let machines = 0;
  for (const m of [...plan.machines, ...plan.updates.filter(u => u.node.level === 'machine')]) {
    const lineId = lineOfNode(m.node.parent);
    if (!lineId) continue;
    const name = m.match?.name ?? m.node.name.value;
    if (m.state === 'new') await machineOntoLine(lineId, name);
    const rec = await machineRecordFor(lineId, name);
    const patch: Partial<Record<'kind' | 'model' | 'serial' | 'oem', string>> = {};
    const how: Partial<Record<'kind' | 'model' | 'serial' | 'oem', KnownFact>> = {};
    for (const f of FACTORY_FIELDS) {
      const said = m.node.facts?.[f];
      if (!said) continue;
      const has = (rec[RECORD[f]] ?? '').trim();
      const conflict = m.conflicts.find(c => c.field === f);
      if (has && !(conflict?.pick === 'new')) continue;   /* nothing recorded is overwritten unless the person picked the new */
      patch[RECORD[f]] = f === 'kind' ? kindWord(said.value) : said.value;
      how[RECORD[f]] = knownOf(said, ctx);
    }
    if (Object.keys(patch).length) await setMachineIdentity(lineId, name, patch, byOf(ctx), how);
    made.set(m.node.id, rec.id);
    machines++;
  }
  /* 4 · a source document on no line yet: on the first line it describes that is now in Faultline */
  const fromSource = (n: (typeof body.nodes)[number], srcId: string) => n.name.source?.id === srcId || FACTORY_FIELDS.some(f => n.facts?.[f]?.source?.id === srcId);
  for (const src of body.sources ?? []) {
    const doc = await getStudy(src.id);
    if (!doc || doc.workspaceId) continue;
    const lineId = body.nodes.filter(n => fromSource(n, src.id)).map(n => (n.level === 'line' ? n.id : n.level === 'machine' ? n.parent : undefined)).map(lineOfNode).find(Boolean);
    if (lineId) await patchStudy(doc.id, cur => ({ ...cur, workspaceId: lineId }));
  }
  const nodes = body.nodes.map(n => (made.has(n.id) && !n.made ? { ...n, made: { id: made.get(n.id) as string, at } } : n));
  await putDraft(s, { ...d, status: 'made', factory: { ...body, nodes } });
  const newLines = plan.lines.length;
  const says = [
    `Made in Faultline for ${v.client}: ${[newLines ? plural(newLines, 'new line') : '', machines ? `${plural(machines, 'machine')} put on ${newLines ? 'them' : 'their lines'} with what each is` : ''].filter(Boolean).join(' and ') || 'the lines already there brought up to date'}.`,
    plan.updates.length ? `${plan.updates.length} already in Faultline were matched, not doubled.` : '',
    v.held.length ? `Held on the draft until a line is made in them: ${v.held.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  return { ok: true, says, data: { lines: refs.map(r => r.id), machines }, refs };
}

/* ------------------------------------------------------------------ replace_machine */

const REPLACE_FIELDS = {
  lineId: ID('the line it is on', true),
  machine: { kind: 'string' as const, label: 'the machine replaced, by its name in Faultline', max: 160, required: true },
  name: { kind: 'string' as const, label: 'the new machine’s name — its own, e.g. with its model', max: 160, required: true },
  kind: { kind: 'string' as const, label: 'what the new machine is', max: 120 },
  model: { kind: 'string' as const, label: 'its model', max: 120 },
  serial: { kind: 'string' as const, label: 'its serial', max: 120 },
  maker: { kind: 'string' as const, label: 'who made it', max: 120 },
  said: { kind: 'string' as const, label: 'the words said', max: 300 },
};
type ReplaceIn = { lineId: string; machine: string; name: string; kind?: string; model?: string; serial?: string; maker?: string; said?: string };

async function onLine(lineId: string): Promise<{ line?: Workspace; names: string[] }> {
  const [line, ex] = await Promise.all([getWorkspace(lineId), existing()]);
  if (!line) return { names: [] };
  return { line, names: machinesOnLine(line, ex.assets.filter(a => !a.replacedBy && !a.mergedInto), ex.jobLines).map(m => m.name) };
}
const newSaid = (i: ReplaceIn) => [i.kind ? `a ${kindWord(i.kind)}` : '', i.maker ? `made by ${i.maker}` : '', i.model ? `model ${i.model}` : '', i.serial ? `serial ${i.serial}` : ''].filter(Boolean).join(', ');

export const replaceMachine: Capability = {
  name: 'replace_machine', title: 'Record a machine replaced', kind: 'write',
  validate: raw => {
    const c = checkObject(raw, REPLACE_FIELDS);
    if (!c.ok) return c;
    const i = c.input as ReplaceIn;
    if (machineKey(i.machine) === machineKey(i.name)) return { ok: false, why: `The new machine needs its own name, not “${i.machine}” again — its model, say — so the old one’s page keeps its history and the new one has its own.` };
    return c;
  },
  async allowed(ctx: CapCtx, input: ReplaceIn) {
    const may = await mayEdit(ctx);
    if (!may.ok) return may;
    const { line, names } = await onLine(input.lineId);
    if (!line) return { ok: false, why: 'There is no line with that id on this device — find it by name first.' };
    if (!names.some(n => machineKey(n) === machineKey(input.machine))) return { ok: false, why: `No machine called “${input.machine}” is on ${line.name} in Faultline — resolve what was meant first.` };
    if (names.some(n => machineKey(n) === machineKey(input.name))) return { ok: false, why: `${line.name} already has a machine called “${input.name}” — give the new one its own name.` };
    return { ok: true };
  },
  async preview(ctx, input: ReplaceIn) {
    const line = await getWorkspace(input.lineId);
    const who = byOf(ctx);
    const what = newSaid(input);
    return `Record that ${input.machine} on ${line?.name ?? 'the line'} has been replaced by ${input.name}${what ? ` (${what})` : ''}: a new machine record in its place on the line, and the ${input.machine}’s record kept with its history, saying Replaced by ${input.name}. How it is known: reported${who ? ` by ${who}` : ''}, today${input.said ? ` — “${input.said}”` : ''}.`;
  },
  async run(ctx, input: ReplaceIn): Promise<CapResult> {
    const line = await getWorkspace(input.lineId);
    if (!line) return { ok: false, why: 'Its line is not on this device any more.' };
    const c = await conversation(ctx);
    const fact: KnownFact = { how: 'reported', at: ctx.now, ...(byOf(ctx) ? { by: byOf(ctx) } : {}), source: { kind: 'conversation', ...(c.ok ? { id: c.s.id, label: c.s.name } : {}), ...(input.said ? { quote: input.said } : {}) } };
    const { old, made } = await replaceLineMachine(line.id, input.machine, { name: input.name, ...(input.kind ? { kind: input.kind } : {}), ...(input.model ? { model: input.model } : {}), ...(input.serial ? { serial: input.serial } : {}), ...(input.maker ? { oem: input.maker } : {}) }, fact);
    const page = (n: string) => `/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(n.trim())}`;
    const what = newSaid(input);
    return {
      ok: true,
      says: `Recorded: ${old.name} on ${line.name} replaced by ${made.name}${what ? ` (${what})` : ''} — reported${byOf(ctx) ? ` by ${byOf(ctx)}` : ''}. The ${old.name}’s record is kept with its history and says Replaced by ${made.name}; ${line.name}’s machines now list ${made.name} in its place.`,
      data: { oldId: old.id, newId: made.id },
      refs: [lineRef(line), { kind: 'machine', id: made.id, label: made.name, href: page(made.name) }, { kind: 'machine', id: old.id, label: `${old.name} (replaced)`, href: page(old.name) }],
    };
  },
};

/* ------------------------------------------------------------------ a factory source: the document, kept, and its proposals */

/** A FACTORY SOURCE — the custom-sheet shape of a document record (tools/doc/custom; a `doc` study, agreed.doc.def 'custom'), so
 *  the document's page, list, paper, rename and delete read it unchanged: what it is, its day, how it was read, its words, and what
 *  was taken from it. The file itself rides as the record's media (facts.docPhotos, which the cloud's media rule already takes). */
export const FACTORY_SOURCE_DEF: CustomDef = {
  title: 'Factory source',
  purpose: 'A document about the factory — an equipment register, an asset list, a layout — kept with its words, and what was taken from it into Faultline, each with the words it came from.',
  sections: [
    { id: 's1', title: 'The document', fields: [
      { id: 'client', label: 'Whose factory', type: 'text' },
      { id: 'file', label: 'The file', type: 'text' },
      { id: 'day', label: 'Its date', type: 'text' },
      { id: 'read', label: 'How it was read', type: 'text' },
    ] },
    { id: 's2', title: 'What it holds', fields: [{ id: 'text', label: 'Its words', type: 'text' }] },
    { id: 's3', title: 'What was taken from it', fields: [{ id: 'taken', label: 'Proposed into the factory', type: 'list', columns: [
      { id: 'what', label: 'What', type: 'text' }, { id: 'name', label: 'Name', type: 'text' }, { id: 'where', label: 'Where', type: 'text' }, { id: 'quote', label: 'The words it came from', type: 'text' },
    ] }] },
  ],
};
export const SOURCE_FILE_FIELD = 'source-file';

export interface TakenDocument { client: string; file: { name: string; blob: Blob; mime: string }; text: string; readBy: 'code' | 'assistant'; day?: string; dayQuote?: string; items: FactoryReadItem[]; lineId?: string }

/** THE DOCUMENT KEPT AND READ INTO THE DRAFT — the source record made (its file and its words), then each item a proposal on the
 *  client's factory draft (started when there is none), from a document, waiting for the person's word, with the exact words it
 *  came from. An item whose quote is not in the document's words is refused, never proposed. */
export async function takeDocument(ctx: CapCtx, t: TakenDocument): Promise<{ ok: true; says: string; draftId: string; sourceId: string; proposed: number; refused: string[] } | { ok: false; why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return c;
  if (!t.client.trim()) return { ok: false, why: 'Say whose factory the document is about first.' };
  const whole = sameText(t.text);
  const refused: string[] = [];
  const good = t.items.filter(it => { const ok = !!it.quote && whole.includes(sameText(it.quote)); if (!ok) refused.push(`“${it.name}” — its words are not in the document, so it is not proposed.`); return ok; });
  /* the source record — the file and its words */
  const id = uid(), blobKey = `doc-${uid()}`;
  await putBlob(blobKey, t.file.blob);
  const taken: DocRow[] = good.map((it, i) => ({ id: `${id}-t${i + 1}`, c: { what: it.level, name: it.name, where: [it.site, it.area, it.line].filter(Boolean).join(' › '), quote: it.quote } }));
  const day = t.day && /^\d{4}-\d{2}-\d{2}$/.test(t.day) ? t.day : undefined;
  const src: ToolStudy = {
    id, tool: 'doc', name: `${t.file.name} — factory source`, ...(t.lineId ? { workspaceId: t.lineId } : {}),
    agreed: { doc: { def: CUSTOM_KEY } },
    facts: {
      customDef: FACTORY_SOURCE_DEF,
      docValues: { client: t.client.trim(), file: t.file.name, ...(day ? { day: `${day}${t.dayQuote ? ` — “${t.dayQuote}”` : ' — typed when it was read'}` } : {}), read: t.readBy === 'code' ? 'Read in code — nothing sent anywhere' : 'Read by the assistant from its pages', text: t.text, ...(taken.length ? { taken } : {}) },
      docPhotos: [{ id: uid(), field: SOURCE_FILE_FIELD, blobKey, mime: t.file.mime || 'application/octet-stream', caption: t.file.name, at: ctx.now, ...(byOf(ctx) ? { by: byOf(ctx) } : {}) }],
    },
    uses: [], startedAt: ctx.now, createdAt: ctx.now, updatedAt: ctx.now,
  };
  await putStudy(src);
  /* the proposals into the client's draft */
  const fresh = await conversation(ctx);
  if (!fresh.ok) return fresh;
  const drafts = draftsOf(fresh.s);
  let d = factoryDraftFor(drafts, t.client);
  const started = !d;
  if (!d) d = newFactoryDraft({ value: t.client.trim(), how: 'reported', source: { kind: 'conversation', id: fresh.s.id, label: fresh.s.name }, at: ctx.now }, undefined, currentThreadId(fresh.s), ctx.now);
  const ops: FactoryOp[] = good.map(it => ({ op: 'add', level: it.level, name: it.name, ...(it.site ? { site: it.site } : {}), ...(it.area ? { area: it.area } : {}), ...(it.line ? { line: it.line } : {}),
    ...(it.kind ? { kind: it.kind } : {}), ...(it.model ? { model: it.model } : {}), ...(it.serial ? { serial: it.serial } : {}), ...(it.maker ? { maker: it.maker } : {}), said: it.quote }));
  const quotes = new Map(ops.map((o, i) => [o, good[i].quote]));
  const r = applyFactoryOps(d.factory as NonNullable<ColleagueDraft['factory']>, ops, { how: 'document', source: { kind: 'document', id, label: t.file.name, ...(day ? { day } : {}) }, quoteOf: o => quotes.get(o) }, ctx.now, uid);
  const next: ColleagueDraft = { ...d, factory: { ...r.body, sources: [...(r.body.sources ?? []), { id, label: t.file.name, ...(day ? { day } : {}) }] } };
  await (started ? writeDrafts(fresh.s.id, cur => [...cur, next]) : putDraft(fresh.s, next));
  const all = [...refused, ...r.refused];
  return { ok: true, draftId: next.id, sourceId: id, proposed: good.length, refused: all,
    says: `Read ${t.file.name}${day ? ` (dated ${day})` : ''}: ${plural(good.length, 'thing')} proposed into ${t.client.trim()}’s factory, each with the words it came from — keep or leave out each under Being built.${all.length ? ` ${plural(all.length, 'item')} not proposed.` : ''} The document is kept as a factory source.` };
}
