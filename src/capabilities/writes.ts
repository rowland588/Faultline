/* THE WRITES — each shown as a card with its preview and run only when the person confirms; never a delete, never 'verified'.
 * Each writes what the page writes, the way the page writes it:
 *   raise_problem       — snag/QuickSnag's save: addSnag with the sheet's fields, and the machine joining its line (lib/lines machineOntoLine)
 *   update_problem      — snag/ProblemPanel's boxes: patchSnag for whose, due, priority and latest; setSnagsStatus for where it stands
 *   start_project       — screens/ProjectsScreen New project: createProject with the next colour, the method and its plan model,
 *                         then the lines picked (lib/newProject putProjectOnLines)
 *   add_photo_to_problem — a picture on the problem's media, the same blob key (as snag/quick sendSnags carries pictures: nothing copied) */
import { createProject, ensureProjects, getBlob, getProject, getSnag, getWorkspace, patchSnag, addSnag, setSnagsStatus } from '../db';
import type { Snag, SnagStatus } from '../snag/types';
import { dueFromInput } from '../snag/types';
import { machineOntoLine } from '../lib/lines';
import { methodByKey, METHODS, type MethodKey } from '../lib/methods';
import { modelOfMethod, putProjectOnLines } from '../lib/newProject';
import { uid } from '../lib/ids';
import { COLORS } from '../lib/useProjects';
import { niceDay } from '../lib/weeks';
import { PRIORITY_WORD } from '../lib/snagsReport';
import { checkObject, DAY_PATTERN, ID } from './check';
import { mayEdit, mayStartProjects } from './access';
import { HOW_SAID, type CapCtx, type CapResult, type Capability, type HowKnown } from './types';
import { lineRef, notFound, problemRef, projectRef } from './util';
import { alikeProblems, alikeProjects } from './understand';

type Priority = 'low' | 'high' | 'critical';
const PRIORITIES: readonly Priority[] = ['low', 'high', 'critical'];
const DAY = { kind: 'string' as const, label: 'the day', max: 10, pattern: DAY_PATTERN, patternSays: 'A day is written YYYY-MM-DD, e.g. 2026-11-14.' };

/** How it is known, in the problem's own words — "Reported by the operators — not yet measured." */
export const HOW_WORDS: Record<Exclude<HowKnown, 'verified'>, string> = {
  observed: 'Seen on the line — not yet measured.',
  reported: 'Reported by the operators — not yet measured.',
  measured: 'Measured on the line.',
  imported: 'Imported from a file — not measured here.',
  system: 'From the business’s production system — what it recorded, not measured here.',
  estimated: 'An estimate — not measured.',
  calculated: 'Worked out by a calculator from figures given.',
  hypothesised: 'A suspicion — not yet checked.',
  unknown: 'How this is known has not been said.',
};

/* ── raise_problem ── */
interface RaiseIn { lineId: string; words: string; machine?: string; priority: Priority; how: Exclude<HowKnown, 'verified'>; projectId?: string; owner?: string; due?: string; findingId?: string; reason?: string }
export const raiseProblem: Capability = {
  name: 'raise_problem', title: 'Raise a problem', kind: 'write',
  validate: raw => checkObject(raw, {
    lineId: ID('the line', true), words: { kind: 'string', label: 'what the problem is', required: true, max: 1000 },
    machine: { kind: 'string', label: 'the machine', max: 120 }, priority: { kind: 'enum', label: 'how serious', values: PRIORITIES, required: true },
    how: { kind: 'enum', label: 'how it is known', values: HOW_SAID, required: true }, projectId: ID('the project'),
    owner: { kind: 'string', label: 'whose it is', max: 120 }, due: DAY,
    findingId: { kind: 'string', label: 'the finding it acts on', max: 80 }, reason: { kind: 'string', label: 'the reason of the stops', max: 120 },
  }),
  allowed: (ctx: CapCtx, input: RaiseIn) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: RaiseIn) {
    const [line, p, twins] = await Promise.all([getWorkspace(input.lineId), input.projectId ? getProject(input.projectId) : undefined, alikeProblems(input.lineId, input.words)]);
    /* an open problem that already says this is named on the card — the person decides, nothing raised twice by default (9 November) */
    const twin = twins.length ? ` ${line?.name ?? 'The line'} already has an open problem like this: ${twins.slice(0, 2).map(t => `“${t.problem}”`).join(', ')} — this raises another.` : '';
    return `Raise a ${PRIORITY_WORD[input.priority]} problem on ${line?.name ?? 'the line'}${input.machine ? `, on the ${input.machine}` : ''}${p ? ` for ${p.name}` : ', in no project'}: “${input.words}” — ${HOW_WORDS[input.how].toLowerCase()}${input.owner ? ` With ${input.owner}` : ' Nobody on it yet'}${input.due ? `, due ${niceDay(input.due)}` : ''}.${twin}`;
  },
  async run(ctx, input: RaiseIn): Promise<CapResult> {
    const line = await getWorkspace(input.lineId);
    if (!line) return notFound('line');
    const p = input.projectId ? await getProject(input.projectId) : undefined;
    if (input.projectId && (!p || p.deletedAt)) return notFound('project');
    const t = ctx.now;
    /* the sheet's fields (snag/QuickSnag save), with how it is known in its words and whose / by when when said */
    const snag: Snag = {
      id: uid(), workspaceId: line.id, problem: `${input.words.trim()} ${HOW_WORDS[input.how]}`, media: [],
      ...(input.machine ? { targetAsset: input.machine } : {}), ...(p ? { projectId: p.id } : {}), priority: input.priority,
      ...(input.owner ? { owner: input.owner } : {}), ...(input.due ? { dueAt: dueFromInput(input.due) } : {}),
      /* raised from what LUNAR found (docs/LUNAR-KNOWLEDGE.md §1): linked, so the outcome of its fix comes back to the finding */
      ...(input.findingId ? { fromFinding: input.findingId } : {}), ...(input.reason ? { targetCategory: input.reason } : {}),
      status: 'open', raisedAt: t, updatedAt: t,
    };
    await addSnag(snag);
    /* a machine named joins its line's list — every machine is on a line */
    if (input.machine) await machineOntoLine(line.id, input.machine);
    return { ok: true, says: `Raised on ${line.name}: “${snag.problem}” (${PRIORITY_WORD[input.priority]}).`, data: { id: snag.id }, refs: [problemRef(snag), lineRef(line), ...(p ? [projectRef(p)] : [])] };
  },
};

/* ── update_problem ── */
const STATUS: Record<'todo' | 'doing' | 'done', SnagStatus> = { todo: 'open', doing: 'in_progress', done: 'closed' };
const STATUS_WORD: Record<SnagStatus, string> = { open: 'To do', in_progress: 'Under way', closed: 'Done' };
interface UpdateIn { problemId: string; owner?: string; due?: string; priority?: Priority; status?: keyof typeof STATUS; latest?: string }

/** What would change, against the problem as it is stored now — nothing changes is said and refused. */
function changesOf(s: Snag, input: UpdateIn): string[] {
  const out: string[] = [];
  if (input.owner !== undefined && input.owner !== (s.owner ?? '')) out.push(`whose: ${s.owner || 'nobody'} → ${input.owner}`);
  if (input.due !== undefined && dueFromInput(input.due) !== s.dueAt) out.push(`due: ${s.dueAt != null ? niceDay(new Date(s.dueAt).toISOString().slice(0, 10)) : 'no day'} → ${niceDay(input.due)}`);
  if (input.priority !== undefined && input.priority !== (s.priority ?? 'low')) out.push(`priority: ${PRIORITY_WORD[s.priority ?? 'low']} → ${PRIORITY_WORD[input.priority]}`);
  if (input.status !== undefined && STATUS[input.status] !== s.status) out.push(`where it stands: ${STATUS_WORD[s.status]} → ${STATUS_WORD[STATUS[input.status]]}`);
  if (input.latest !== undefined && input.latest !== (s.latestUpdate ?? '')) out.push(`latest: “${input.latest}”`);
  return out;
}

export const updateProblem: Capability = {
  name: 'update_problem', title: 'Change a problem', kind: 'write',
  validate: raw => checkObject(raw, {
    problemId: ID('the problem', true), owner: { kind: 'string', label: 'whose it is', max: 120 }, due: DAY,
    priority: { kind: 'enum', label: 'the priority', values: PRIORITIES }, status: { kind: 'enum', label: 'where it stands', values: ['todo', 'doing', 'done'] },
    latest: { kind: 'string', label: 'the latest word', max: 1000 },
  }),
  async allowed(ctx: CapCtx, input: UpdateIn) {
    const s = await getSnag(input.problemId);
    return mayEdit(ctx, s?.projectId);
  },
  async preview(_ctx, input: UpdateIn) {
    const s = await getSnag(input.problemId);
    if (!s) return 'There is no problem with that id on this device.';
    const c = changesOf(s, input);
    return c.length ? `Change “${s.problem}”: ${c.join('; ')}.` : `Nothing would change on “${s.problem}”.`;
  },
  async run(ctx, input: UpdateIn): Promise<CapResult> {
    const s = await getSnag(input.problemId);
    if (!s || s.deletedAt) return notFound('problem');
    const c = changesOf(s, input);
    if (!c.length) return { ok: false, why: `Nothing would change on “${s.problem}” — it already says that.` };
    /* the panel's own writes (snag/ProblemPanel): the boxes patched into the row as stored, where it stands by setSnagsStatus */
    const patch: Partial<Snag> = {
      ...(input.owner !== undefined ? { owner: input.owner || undefined } : {}),
      ...(input.due !== undefined ? { dueAt: dueFromInput(input.due) } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.latest !== undefined ? { latestUpdate: input.latest || undefined, latestUpdateAt: input.latest ? ctx.now : undefined } : {}),
    };
    if (Object.keys(patch).length) await patchSnag(s.id, { ...patch, updatedAt: Date.now() });
    if (input.status !== undefined && STATUS[input.status] !== s.status) await setSnagsStatus([s.id], STATUS[input.status]);
    return { ok: true, says: `Changed “${s.problem}”: ${c.join('; ')}.`, refs: [problemRef(s)] };
  },
};

/* ── start_project ── */
interface StartIn { name: string; method: MethodKey; lineIds: string[] }
export const startProject: Capability = {
  name: 'start_project', title: 'Start a project', kind: 'write',
  validate: raw => checkObject(raw, {
    name: { kind: 'string', label: 'the project’s name', required: true, max: 120 },
    method: { kind: 'enum', label: 'the method', values: METHODS.map(m => m.key), required: true },
    lineIds: { kind: 'strings', label: 'the lines', required: true, min: 1, max: 8 },
  }),
  allowed: (ctx: CapCtx) => mayStartProjects(ctx),
  async preview(_ctx, input: StartIn) {
    const [lines, twins] = await Promise.all([Promise.all(input.lineIds.map(id => getWorkspace(id))), alikeProjects(input.name, input.lineIds)]);
    const twin = twins.length ? ` Already on these lines: ${twins.slice(0, 3).map(p => `“${p.name}”`).join(', ')} — say if the work belongs in ${twins.length === 1 ? 'that one' : 'one of those'} instead.` : '';
    return `Start a ${methodByKey(input.method)?.name ?? input.method} project called “${input.name}” on ${lines.map((w, i) => w?.name ?? `an unknown line (${input.lineIds[i]})`).join(' and ')}.${twin}`;
  },
  async run(_ctx, input: StartIn): Promise<CapResult> {
    const lines = await Promise.all(input.lineIds.map(id => getWorkspace(id)));
    const missing = input.lineIds.filter((_, i) => !lines[i]);
    if (missing.length) return { ok: false, why: `There is no line with the id ${missing.join(', ')} on this device — find each line by name first.` };
    /* never a second project of the same name on the same line (9 November — "never create duplicate records") */
    const twin = (await alikeProjects(input.name, input.lineIds)).find(p => p.name.trim().toLowerCase() === input.name.trim().toLowerCase());
    if (twin) return { ok: false, why: `“${twin.name}” is already a project on ${lines.length === 1 ? lines[0]?.name : 'these lines'} — nothing was started. Use that one, or give the new one a different name.` };
    /* New project's own steps: the next colour of the palette, the plan model the method needs, then the lines picked */
    const all = await ensureProjects();
    const p = await createProject(input.name, COLORS[all.length % COLORS.length], undefined, undefined, modelOfMethod(input.method), input.method);
    const picked = lines.filter((w): w is NonNullable<typeof w> => !!w);
    await putProjectOnLines(p.id, picked);
    return { ok: true, says: `Started “${p.name}”, a ${methodByKey(input.method)?.name ?? input.method} project on ${picked.map(w => w.name).join(' and ')}.`, data: { id: p.id }, refs: [projectRef(p), ...picked.map(lineRef)] };
  },
};

/* ── add_photo_to_problem ── */
interface PhotoIn { problemId: string; photoKey: string }
export const addPhotoToProblem: Capability = {
  name: 'add_photo_to_problem', title: 'Put a photo on a problem', kind: 'write',
  validate: raw => checkObject(raw, { problemId: ID('the problem', true), photoKey: { kind: 'string', label: 'the photo', required: true, max: 120 } }),
  async allowed(ctx: CapCtx, input: PhotoIn) {
    const s = await getSnag(input.problemId);
    return mayEdit(ctx, s?.projectId);
  },
  async preview(_ctx, input: PhotoIn) {
    const s = await getSnag(input.problemId);
    return `Put the photo on “${s?.problem ?? 'the problem'}”.`;
  },
  async run(ctx, input: PhotoIn): Promise<CapResult> {
    const s = await getSnag(input.problemId);
    if (!s || s.deletedAt) return notFound('problem');
    if ((s.media ?? []).some(m => m.blobKey === input.photoKey)) return { ok: false, why: `That photo is already on “${s.problem}”.` };
    const blob = await getBlob(input.photoKey);
    if (!blob) return { ok: false, why: 'That photo is not on this device any more — take it again.' };
    /* the same blob key, nothing copied — as a problem's pictures travel (snag/quick sendSnags) */
    const ref = { id: uid(), kind: 'photo' as const, blobKey: input.photoKey, mime: blob.type || 'image/jpeg', capturedAt: ctx.now };
    await patchSnag(s.id, cur => ({ media: [...(cur.media ?? []), ref], updatedAt: Date.now() }));
    return { ok: true, says: `The photo is on “${s.problem}”.`, refs: [problemRef(s)] };
  },
};
