/* THE FACTORY WALK AND ITS PHOTOGRAPHS (10 November, docs/FACTORY-WALK.md — Rowland: "I move around the factory, Luna moves with me";
 * "A photograph that hasn't been formally filed should remain part of the factory walk … Where it has a confirmed relationship to a
 * line, machine or department, it should also be visible from those relevant pages. Use relationships to the original photograph
 * rather than creating duplicate copies … Never guess an uncertain relationship.").
 *
 *   set_position    local  where the person is now — a department, a line, a machine — said by them; kept on the conversation with the
 *                          trail of stops (lib/walk). A move, never a new subject: the threads stay, and the open ones whose place is
 *                          here are offered.
 *   walk_state      read   the position, the stops in order with the photos taken at each, and which photos are filed and to what.
 *   file_photo      write  a card: one photo linked to a line, a machine, a department, a problem or a project — the same photograph
 *                          (its blob key), never a copy; the link says it was confirmed by the person and what it shows is observed by
 *                          them, never verified. A problem's own pictures take the same key (as add_photo_to_problem).
 *   add_department  write  a card: a department of the factory as a record of its own (lib/departments) — Dispatch with no line yet,
 *                          nothing made under it. */
import { getStudy, patchStudy } from '../db';
import { getWorkspace } from '../db/workspaces';
import { getProject } from '../db/projects';
import { getSnag, patchSnag } from '../db/walk';
import { getBlob } from '../db/blobs';
import { addDepartment, listDepartments } from '../db/departments';
import { departmentFor } from '../lib/departments';
import { areaHref } from '../lib/areas';
import { machineKey } from '../lib/lineRecords';
import { uid } from '../lib/ids';
import type { ToolStudy } from '../lib/study';
import type { Workspace } from '../types';
import { isPhotoTurn, photosAtStops, placeSaid, samePlace, walkWith, type PhotoLink, type PhotoTarget, type WalkFacts, type WalkStop, type WalkTurn } from '../lib/walk';
import { checkObject, ID } from './check';
import { anyone, mayEdit } from './access';
import { lineRef, notFound, plural, problemRef, projectRef } from './util';
import type { CapCtx, CapRef, CapResult, Capability, ColleagueThread } from './types';
import { activeClientNow } from '../lib/activeClient';

async function conversation(ctx: CapCtx): Promise<{ ok: true; s: ToolStudy } | { ok: false; why: string }> {
  if (!ctx.conversationId) return { ok: false, why: 'This needs a conversation to keep it in, and there is none open.' };
  const s = await getStudy(ctx.conversationId);
  if (!s || s.tool !== 'talk' || !(s.facts as { colleague?: boolean }).colleague) return { ok: false, why: 'The conversation is not on this device any more.' };
  return { ok: true, s };
}
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);
const byOf = (ctx: CapCtx) => ctx.me?.trim() || ctx.email?.trim() || undefined;
const machinesOfLine = (w: Workspace): string[] => (w.assets ?? []).filter(a => a.trim() && machineKey(a) !== 'whole line');
const deptRef = (id: string, d: { area: string; site?: string; client?: string }): CapRef => ({ kind: 'page', id, label: d.area, href: areaHref({ area: d.area, ...(d.site ? { site: d.site } : {}), ...(d.client ? { client: d.client } : {}) }) });

/* ── set_position ── */
interface PositionIn { lineId?: string; departmentId?: string; area?: string; site?: string; machine?: string; said?: string }
export const setPosition: Capability = {
  name: 'set_position', title: 'Where you are', kind: 'local',
  validate: raw => {
    const c = checkObject(raw, {
      lineId: ID('the line'), departmentId: ID('the department'),
      area: { kind: 'string', label: 'the department or area, in their words', max: 120 },
      site: { kind: 'string', label: 'the site', max: 120 },
      machine: { kind: 'string', label: 'the machine', max: 120 },
      said: { kind: 'string', label: 'what the person said', max: 300 },
    });
    if (c.ok && !c.input.lineId && !c.input.departmentId && !(c.input.area as string | undefined)?.trim()) return { ok: false, why: 'Say where the person is — a line (its id), a department, or an area in their words.' };
    if (c.ok && c.input.machine && !c.input.lineId) return { ok: false, why: 'A machine is always on a line — give its line too.' };
    return c;
  },
  allowed: anyone,
  async run(ctx, input: PositionIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const stop: WalkStop = { at: ctx.now, how: 'said', ...(input.said?.trim() ? { said: input.said.trim() } : {}) };
    const notes: string[] = [];
    const refs: CapRef[] = [];
    if (input.lineId) {
      const w = await getWorkspace(input.lineId);
      if (!w) return notFound('line');
      Object.assign(stop, { lineId: w.id, line: w.name, ...(w.clientName?.trim() ? { client: w.clientName.trim() } : {}), ...(w.siteName?.trim() ? { site: w.siteName.trim() } : {}), ...(w.areaName?.trim() ? { area: w.areaName.trim() } : {}) });
      refs.push(lineRef(w));
      if (input.machine?.trim()) {
        const m = machinesOfLine(w).find(x => machineKey(x) === machineKey(input.machine as string));
        stop.machine = m ?? input.machine.trim();
        if (!m) notes.push(`No machine called “${input.machine.trim()}” is on ${w.name} in Faultline — it is kept as said, not as a record.`);
      }
    } else {
      const depts = await listDepartments();
      const d = input.departmentId ? depts.find(x => x.id === input.departmentId) : departmentFor(depts, { area: (input.area as string).trim(), ...(input.site?.trim() ? { site: input.site.trim() } : {}) });
      if (input.departmentId && !d) return notFound('department');
      if (d) { Object.assign(stop, { departmentId: d.id, area: d.facts.area, ...(d.facts.site ? { site: d.facts.site } : {}), ...(d.facts.client ? { client: d.facts.client } : {}) }); refs.push(deptRef(d.id, d.facts)); }
      else {
        Object.assign(stop, { area: (input.area as string).trim(), ...(input.site?.trim() ? { site: input.site.trim() } : {}) });
        notes.push(`“${stop.area}” is not a department in Faultline yet — it is kept as said; add_department records it, if the person wants it kept.`);
      }
    }
    const f = c.s.facts as WalkFacts & { threads?: ColleagueThread[] };
    const moved = !samePlace(f.position, stop);
    await patchStudy(c.s.id, cur => {
      const cf = cur.facts as WalkFacts;
      return { facts: { ...cur.facts, position: stop, walk: walkWith(cf.walk ?? [], stop) } as ToolStudy['facts'] };
    });
    /* the open threads whose place is here — offered, never switched to */
    const threads = (f.threads ?? []).filter(t => t.status !== 'closed');
    const here = threads.filter(t => (stop.lineId && t.scope.lineId === stop.lineId && (!stop.machine || !t.scope.machine || machineKey(t.scope.machine) === machineKey(stop.machine))));
    const cur = threads.find(t => t.status === 'current');
    const says = [
      moved ? `You are at ${placeSaid(stop)} (${hhmm(stop.at)}).` : `Still at ${placeSaid(stop)}.`,
      cur ? `A move, not a new subject — the subject stays “${cur.title}”.` : '',
      here.filter(t => t.id !== cur?.id).length ? `Open here: ${here.filter(t => t.id !== cur?.id).map(t => `“${t.title}” (${t.status}) [thread ${t.id}]`).join('; ')} — offer it; switch only if the person wants.` : '',
      ...notes,
    ].filter(Boolean).join(' ');
    return { ok: true, says, data: { position: stop, moved, openHere: here.map(t => ({ id: t.id, title: t.title, status: t.status })) }, refs };
  },
};

/* ── walk_state ── */
export const walkState: Capability = {
  name: 'walk_state', title: 'The walk so far', kind: 'read',
  validate: raw => checkObject(raw ?? {}, {}),
  allowed: anyone,
  async run(ctx): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return { ok: true, says: 'No conversation is open, so there is no walk to read.', refs: [], data: { position: null, stops: [], photos: [] } };
    const f = c.s.facts as WalkFacts & { turns?: WalkTurn[] };
    const turns = (f.turns ?? []).filter(isPhotoTurn).sort((a, b) => a.at - b.at);
    const trail = f.walk ?? [];
    const stops = photosAtStops(trail, turns);
    const before = trail.length ? turns.filter(t => t.at < trail[0].at) : turns;
    const unfiled = turns.filter(t => !(t.filed ?? []).length);
    const says = [
      f.position ? `Now at ${placeSaid(f.position)} (since ${hhmm(f.position.at)}).` : 'Where the person is has not been said.',
      trail.length ? `The walk: ${stops.map(s => `${placeSaid(s.stop)} ${hhmm(s.stop.at)}${s.photos.length ? ` (${plural(s.photos.length, 'photo')})` : ''}`).join(' → ')}.` : 'No stops yet.',
      before.length ? `${plural(before.length, 'photo')} taken before any place was said.` : '',
      turns.length ? `${plural(turns.length, 'photo')} in all, ${unfiled.length} not filed — each stays on the walk; file one only where the person confirms what it belongs to.` : 'No photos yet.',
    ].filter(Boolean).join(' ');
    return {
      ok: true, says, refs: [],
      data: {
        position: f.position ?? null,
        stops: stops.map(s => ({ place: placeSaid(s.stop), at: s.stop.at, lineId: s.stop.lineId, departmentId: s.stop.departmentId, machine: s.stop.machine, photos: s.photos.map(p => p.media?.blobKey) })),
        photos: turns.map(t => ({ photoKey: t.media?.blobKey, at: t.at, where: placeSaid(t.where) || null, caption: t.text ?? null, filed: (t.filed ?? []).map(l => l.label) })),
      },
    };
  },
};

/* ── file_photo ── */
interface FileIn { photoKey: string; to: PhotoTarget; lineId?: string; machine?: string; departmentId?: string; problemId?: string; projectId?: string; why?: string }
interface Target { label: string; refId: string; machine?: string; ref: CapRef; projectId?: string }
async function targetOf(input: FileIn): Promise<{ ok: true; t: Target } | { ok: false; why: string }> {
  if (input.to === 'line' || input.to === 'machine') {
    if (!input.lineId) return { ok: false, why: input.to === 'machine' ? 'A machine is on a line — give the line’s id and the machine’s name.' : 'Give the line’s id.' };
    const w = await getWorkspace(input.lineId);
    if (!w) return notFound('line');
    if (input.to === 'line') return { ok: true, t: { label: w.name, refId: w.id, ref: lineRef(w) } };
    const m = machinesOfLine(w).find(x => machineKey(x) === machineKey(input.machine ?? ''));
    if (!m) return { ok: false, why: `No machine called “${input.machine ?? ''}” is on ${w.name} — find it with resolve first; a photo is never filed to a guess.` };
    return { ok: true, t: { label: `${m} on ${w.name}`, refId: w.id, machine: m, ref: { kind: 'machine', id: `${w.id}:${m}`, label: m, href: `/lines/${w.id}/machine/${encodeURIComponent(m)}` } } };
  }
  if (input.to === 'department') {
    const d = (await listDepartments()).find(x => x.id === input.departmentId);
    if (!d) return notFound('department');
    return { ok: true, t: { label: d.facts.area, refId: d.id, ref: deptRef(d.id, d.facts) } };
  }
  if (input.to === 'problem') {
    const s = input.problemId ? await getSnag(input.problemId) : undefined;
    if (!s || s.deletedAt) return notFound('problem');
    return { ok: true, t: { label: `the problem “${s.problem}”`, refId: s.id, ref: problemRef(s), ...(s.projectId ? { projectId: s.projectId } : {}) } };
  }
  const p = input.projectId ? await getProject(input.projectId) : undefined;
  if (!p || p.deletedAt) return notFound('project');
  return { ok: true, t: { label: `the project “${p.name}”`, refId: p.id, ref: projectRef(p), projectId: p.id } };
}
const photoTurn = (s: ToolStudy, key: string): WalkTurn | undefined => ((s.facts as { turns?: WalkTurn[] }).turns ?? []).find(t => isPhotoTurn(t) && t.media?.blobKey === key);

export const filePhoto: Capability = {
  name: 'file_photo', title: 'File a photo', kind: 'write',
  validate: raw => checkObject(raw, {
    photoKey: { kind: 'string', label: 'the photo', required: true, max: 120 },
    to: { kind: 'enum', label: 'what it is filed to', values: ['line', 'machine', 'department', 'problem', 'project'], required: true },
    lineId: ID('the line'), machine: { kind: 'string', label: 'the machine', max: 120 },
    departmentId: ID('the department'), problemId: ID('the problem'), projectId: ID('the project'),
    why: { kind: 'string', label: 'why it belongs there, in the person’s words', max: 300 },
  }),
  async allowed(ctx: CapCtx, input: FileIn) {
    /* a record that is not there is refused before any card — a photo is never offered to a guess */
    const t = await targetOf(input);
    if (!t.ok) return t;
    return mayEdit(ctx, t.t.projectId);
  },
  async preview(ctx, input: FileIn) {
    const c = await conversation(ctx);
    const turn = c.ok ? photoTurn(c.s, input.photoKey) : undefined;
    const t = await targetOf(input);
    const where = turn ? placeSaid(turn.where) : '';
    return `File the photo${turn ? ` taken at ${hhmm(turn.at)}${where ? ` at ${where}` : ''}` : ''} to ${t.ok ? t.t.label : 'the record named'} — the same photograph linked, not a copy; it stays on the walk too. What it shows is as you saw it, not verified.`;
  },
  async run(ctx, input: FileIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const turn = photoTurn(c.s, input.photoKey);
    if (!turn) return { ok: false, why: 'That photo is not in this conversation.' };
    const t = await targetOf(input);
    if (!t.ok) return t;
    if ((turn.filed ?? []).some(l => l.to === input.to && l.refId === t.t.refId && (l.machine ?? '') === (t.t.machine ?? ''))) return { ok: false, why: `That photo is already filed to ${t.t.label}.` };
    if (input.to === 'problem') {
      const s = await getSnag(t.t.refId);
      if (s && !(s.media ?? []).some(m => m.blobKey === input.photoKey)) {
        const blob = await getBlob(input.photoKey);
        if (!blob) return { ok: false, why: 'That photo is not on this device any more — take it again.' };
        /* the same blob key, nothing copied — as add_photo_to_problem */
        await patchSnag(s.id, cur => ({ media: [...(cur.media ?? []), { id: uid(), kind: 'photo' as const, blobKey: input.photoKey, mime: blob.type || 'image/jpeg', capturedAt: turn.at }], updatedAt: Date.now() }));
      }
    }
    const link: PhotoLink = { id: uid(), to: input.to, refId: t.t.refId, ...(t.t.machine ? { machine: t.t.machine } : {}), label: t.t.label, at: ctx.now, ...(byOf(ctx) ? { by: byOf(ctx) } : {}), how: 'confirmed', ...(input.why?.trim() ? { why: input.why.trim() } : {}) };
    await patchStudy(c.s.id, cur => ({
      facts: { ...cur.facts, turns: ((cur.facts as { turns?: WalkTurn[] }).turns ?? []).map(x => (x.id === turn.id ? { ...x, filed: [...(x.filed ?? []), link] } : x)) } as ToolStudy['facts'],
    }));
    return { ok: true, says: `The photo is filed to ${t.t.label} — the same photograph, shown there and kept on the walk.`, refs: [t.t.ref] };
  },
};

/* ── add_department ── */
interface DeptIn { area: string; site?: string; client?: string }
export const addDepartmentCap: Capability = {
  name: 'add_department', title: 'Add a department', kind: 'write',
  validate: raw => checkObject(raw, {
    area: { kind: 'string', label: 'the department’s name', required: true, max: 120 },
    site: { kind: 'string', label: 'its site', max: 120 },
    client: { kind: 'string', label: 'its client', max: 120 },
  }),
  allowed: (ctx: CapCtx) => mayEdit(ctx),
  async preview(_ctx, input: DeptIn) {
    const had = departmentFor(await listDepartments(), { area: input.area.trim(), ...(input.site?.trim() ? { site: input.site.trim() } : {}) });
    if (had) return `“${had.facts.area}” is already a department in Faultline — nothing new would be made.`;
    return `Add “${input.area.trim()}”${input.site?.trim() ? ` at ${input.site.trim()}` : ''}${input.client?.trim() ? ` for ${input.client.trim()}` : ''} as a department of the factory — a record of its own, with no lines or machines made under it; they join it as they are found.`;
  },
  async run(ctx, input: DeptIn): Promise<CapResult> {
    const at = ctx.now, by = byOf(ctx);
    const how = { how: 'reported' as const, at, ...(by ? { by } : {}), source: { kind: 'conversation' as const, ...(ctx.conversationId ? { id: ctx.conversationId } : {}) } };
    /* no client said: the customer in hand (lib/activeClient, C2a) — the department is aligned to it */
    const client = input.client?.trim() || (await activeClientNow()).client;
    const r = await addDepartment({ area: input.area, ...(input.site ? { site: input.site } : {}), ...(client ? { client } : {}) }, { area: how, ...(input.site ? { site: how } : {}), ...(input.client ? { client: how } : {}) });
    if (!r.ok) return r;
    return { ok: true, says: r.made ? `“${r.facts.area}” is a department of the factory now — nothing made under it.` : `“${r.facts.area}” was already a department — nothing new made.`, data: { id: r.id, made: r.made }, refs: [deptRef(r.id, r.facts)] };
  },
};

export const WALK: readonly Capability[] = [setPosition, walkState, filePhoto, addDepartmentCap];
