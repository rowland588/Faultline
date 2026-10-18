/* THE ONLY WAY A METHOD OR A PROJECT RUNNING ONE CHANGES — for a person on a
 * screen and for the assistant alike (docs/PLATFORM-REVIEW.md §6.5).
 *
 * Every operation does the same five things in the same order: checks the
 * person may (lib/access, beside the database's own policies — a button that
 * would be refused is a button that lies); checks the change against the
 * method and the project as they stand now (lib/flow/validate,
 * lib/flow/runtime); writes through src/db; hands back an undo where the
 * change can be taken back; and writes one line in the activity log saying
 * who, what, and whether it began as the assistant's proposal. Nothing here
 * trusts a figure it did not work out itself. */
import type { Can } from '../access';
import type { ID, Project } from '../../types';
import { uid, now } from '../ids';
import { todayISO } from '../weeks';
import type { Restore } from '../../db';
import {
  addActivity, deleteFlowRecord, deleteMethodRow, getMethod, getProject, listAllSnags, listAssets,
  listFlowRecords, methodFamily, putAsset, putFlowRecord, putMethod, updateProject, createProject,
} from '../../db';
import type { FlowDefinition } from './definition';
import { validateDefinition, type Issue } from './validate';
import { readFlow, type FlowProblem, type FlowState } from './runtime';
import type { ActivityEntry, FlowRecord, Method, ProjectFlow } from './records';

export interface OpContext {
  /** The person, as they are known on screen. */
  who: string;
  can: Can;
  /** A person's own hand, or the assistant's proposal a person accepted. */
  source?: 'person' | 'assistant';
  today?: string;
}

export type OpResult<T> =
  | { ok: true; value: T; said: string; undo?: Restore }
  | { ok: false; why: string; issues?: Issue[] };

const refuse = <T>(why: string, issues?: Issue[]): OpResult<T> => ({ ok: false, why, ...(issues ? { issues } : {}) });

async function log(ctx: OpContext, e: Omit<ActivityEntry, 'id' | 'who' | 'at' | 'source' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const t = now();
  await addActivity({ id: uid(), who: ctx.who, at: t, source: ctx.source ?? 'person', createdAt: t, updatedAt: t, ...e });
}

/* ================================== methods ================================ */

/** A new method, as a draft — by hand, from the usual lists, or a proposal. */
export async function createMethod(ctx: OpContext, input: { definition: FlowDefinition; origin: Method['origin']; changeNote?: string }): Promise<OpResult<Method>> {
  if (!ctx.can.agree) return refuse('Only a project owner writes methods.');
  const id = uid(), t = now();
  const m: Method = {
    id, familyId: id, version: 1, status: 'draft', definition: input.definition, origin: input.origin,
    ...(input.changeNote ? { changeNote: input.changeNote } : {}), createdAt: t, updatedAt: t,
  };
  await putMethod(m);
  await log(ctx, { methodId: id, op: 'createMethod', summary: `Started the method “${input.definition.name}” (draft)`, target: { kind: 'method', id } });
  return { ok: true, value: m, said: 'Saved as a draft.' };
}

/** A draft's definition, saved as it stands — it need not be complete until it
 *  is approved. An active or retired version is never edited: change makes a
 *  new version (draftNewVersion). */
export async function saveDraft(ctx: OpContext, id: ID, definition: FlowDefinition, changeNote?: string): Promise<OpResult<Method>> {
  if (!ctx.can.agree) return refuse('Only a project owner writes methods.');
  const m = await getMethod(id);
  if (!m) return refuse('That method is not on this device.');
  if (m.status !== 'draft') return refuse('An approved method is not edited — change it as a new version.');
  const next: Method = { ...m, definition, ...(changeNote !== undefined ? { changeNote } : {}) };
  await putMethod(next);
  return { ok: true, value: next, said: 'Draft saved.' };
}

/** Approve a draft: it must be a method the app can run. It becomes the
 *  family's active version, and the version before it is retired — kept,
 *  never deleted, so a project on it still reads it. */
export async function approveMethod(ctx: OpContext, id: ID): Promise<OpResult<Method>> {
  if (!ctx.can.agree) return refuse('Only a project owner approves a method.');
  const m = await getMethod(id);
  if (!m) return refuse('That method is not on this device.');
  if (m.status !== 'draft') return refuse('Only a draft is approved.');
  const checked = validateDefinition(m.definition);
  if (!checked.ok || !checked.def) return refuse('It cannot be approved yet.', checked.errors);
  const t = now();
  const family = await methodFamily(m.familyId);
  for (const other of family) {
    if (other.id !== m.id && other.status === 'active') await putMethod({ ...other, status: 'retired' });
  }
  const approved: Method = { ...m, definition: checked.def, status: 'active', approvedBy: ctx.who, approvedAt: t };
  await putMethod(approved);
  await log(ctx, {
    methodId: id, op: 'approveMethod', target: { kind: 'method', id },
    summary: `Approved “${checked.def.name}”, version ${m.version}${m.changeNote ? ` — ${m.changeNote}` : ''}`,
    ...(checked.warnings.length ? { detail: { warnings: checked.warnings.map(w => w.message) } } : {}),
  });
  return { ok: true, value: approved, said: `Version ${m.version} approved.` };
}

/** A new draft version of an approved method — the next number, made from it. */
export async function draftNewVersion(ctx: OpContext, fromId: ID, definition?: FlowDefinition, changeNote?: string): Promise<OpResult<Method>> {
  if (!ctx.can.agree) return refuse('Only a project owner writes methods.');
  const from = await getMethod(fromId);
  if (!from) return refuse('That method is not on this device.');
  const family = await methodFamily(from.familyId);
  const open = family.find(f => f.status === 'draft');
  if (open && !definition) return { ok: true, value: open, said: `Version ${open.version} is already a draft.` };
  const id = uid(), t = now();
  const version = Math.max(...family.map(f => f.version), from.version) + 1;
  const m: Method = {
    id, familyId: from.familyId, version, status: 'draft', parentId: from.id, origin: ctx.source === 'assistant' ? 'assistant' : 'hand',
    definition: definition ?? structuredClone(from.definition), ...(changeNote ? { changeNote } : {}), createdAt: t, updatedAt: t,
  };
  await putMethod(m);
  await log(ctx, { methodId: id, op: 'draftNewVersion', target: { kind: 'method', id }, summary: `Started version ${version} of “${from.definition.name}”${changeNote ? ` — ${changeNote}` : ''}` });
  return { ok: true, value: m, said: `Version ${version} started as a draft.` };
}

/** A draft taken away, with an undo. An approved version is retired, never deleted. */
export async function deleteDraft(ctx: OpContext, id: ID): Promise<OpResult<null>> {
  if (!ctx.can.agree) return refuse('Only a project owner deletes a method.');
  const m = await getMethod(id);
  if (!m) return refuse('That method is not on this device.');
  if (m.status !== 'draft') return refuse('An approved method is retired, not deleted — projects may still run on it.');
  const undo = await deleteMethodRow(id);
  await log(ctx, { methodId: id, op: 'deleteDraft', target: { kind: 'method', id }, summary: `Deleted the draft of “${m.definition.name}” (version ${m.version})` });
  return { ok: true, value: null, said: 'Draft deleted.', undo };
}

/* ============================ starting a project =========================== */

export interface StartInput {
  methodId: ID;
  name: string;
  color?: string;
  /** The machines it runs on — each becomes a machine of the project. */
  machines: string[];
  startedOn?: string;
  /** Who does each role. */
  people?: Record<string, string>;
  lead?: string;
}

/** A project that runs an approved method. */
export async function startProject(ctx: OpContext, input: StartInput): Promise<OpResult<Project>> {
  const m = await getMethod(input.methodId);
  if (!m) return refuse('That method is not on this device.');
  if (m.status !== 'active') return refuse('Only an approved method can be run.');
  const usesMachines = m.definition.stages.some(s => s.steps.some(t => t.per === 'machine'));
  const machines = [...new Set(input.machines.map(x => x.trim()).filter(Boolean))];
  if (usesMachines && !machines.length) return refuse('Name the machines it runs on — some steps are done on every machine.');
  const p = await createProject(input.name.trim() || m.definition.name, input.color ?? '#0c7489', input.lead);
  const flow: ProjectFlow = {
    methodId: m.id, familyId: m.familyId, version: m.version, name: m.definition.name,
    startedOn: input.startedOn ?? ctx.today ?? todayISO(),
    ...(input.people && Object.keys(input.people).length ? { people: input.people } : {}),
  };
  const withFlow: Project = { ...p, flow };
  await updateProject(withFlow);
  let sort = 0;
  for (const name of machines) {
    await putAsset({ id: uid(), projectId: p.id, name, state: 'onSite', sort: sort++, updatedAt: now() });
  }
  await log(ctx, {
    projectId: p.id, methodId: m.id, op: 'startProject', target: { kind: 'project', id: p.id },
    summary: `Started “${withFlow.name}” on “${m.definition.name}” version ${m.version}${machines.length ? ` — ${machines.join(', ')}` : ''}`,
  });
  return { ok: true, value: withFlow, said: 'Project started.' };
}

/* ========================= a project running a method ====================== */

export interface FlowProject {
  project: Project;
  method: Method;
  records: FlowRecord[];
  machines: { id: string; name: string }[];
  problems: FlowProblem[];
  state: FlowState;
}

/** Everything a project running a method needs read, and read once. */
export async function loadFlowProject(projectId: ID, today: string = todayISO()): Promise<FlowProject | undefined> {
  const project = await getProject(projectId);
  if (!project?.flow) return undefined;
  const method = await getMethod(project.flow.methodId);
  if (!method) return undefined;
  const [records, assets, snags] = await Promise.all([listFlowRecords(projectId), listAssets(projectId), listAllSnags()]);
  const machines = assets.filter(a => !a.deletedAt).sort((a, b) => a.sort - b.sort).map(a => ({ id: a.id, name: a.name }));
  const problems: FlowProblem[] = snags
    .filter(s => s.projectId === projectId && !s.deletedAt && !s.archivedAt)
    .map(s => ({ id: s.id, title: s.problem, open: s.status !== 'closed', priority: s.priority ?? 'low' }));
  const state = readFlow({
    def: method.definition, records, machines, problems, today,
    startedOn: project.flow.startedOn, people: project.flow.people,
  });
  return { project, method, records, machines, problems, state };
}

export interface StepRef { projectId: ID; stageKey: string; stepKey: string; assetId?: ID }

const sameStep = (r: FlowRecord, s: StepRef) =>
  r.kind === 'step' && r.stageKey === s.stageKey && r.stepKey === s.stepKey && (r.assetId ?? undefined) === (s.assetId ?? undefined);

/** The newest record for a step on a machine, or a new planned one. */
async function currentRecord(fp: FlowProject, s: StepRef): Promise<{ rec: FlowRecord; isNew: boolean }> {
  const mine = fp.records.filter(r => sameStep(r, s)).sort((a, b) => (b.createdAt - a.createdAt) || (b.updatedAt - a.updatedAt));
  if (mine[0]) return { rec: mine[0], isNew: false };
  const t = now();
  return {
    isNew: true,
    rec: {
      id: uid(), projectId: s.projectId, kind: 'step', stageKey: s.stageKey, stepKey: s.stepKey,
      ...(s.assetId ? { assetId: s.assetId } : {}),
      version: fp.method.version, outcome: 'planned', sort: fp.records.length, createdAt: t, updatedAt: t,
    },
  };
}

const stepTitle = (fp: FlowProject, s: StepRef) => {
  const st = fp.state.stages.find(x => x.key === s.stageKey)?.steps.find(x => x.def.key === s.stepKey && (x.assetId ?? undefined) === (s.assetId ?? undefined));
  return st ? `${st.def.title}${st.machine ? ` — ${st.machine}` : ''}` : s.stepKey;
};

export type StepPatch = Partial<Pick<FlowRecord, 'values' | 'note' | 'plannedFor' | 'who' | 'media' | 'docs' | 'signedBy' | 'studyId'>>;

/** Keep what was written on a step — its fields, words, photos, files, day,
 *  who — without saying it is done. */
export async function recordStep(ctx: OpContext, s: StepRef, patch: StepPatch): Promise<OpResult<FlowRecord>> {
  if (!ctx.can.edit) return refuse('You can read this project but not change it.');
  const fp = await loadFlowProject(s.projectId, ctx.today);
  if (!fp) return refuse('That project is not running a method on this device.');
  if (!fp.state.stages.some(st => st.key === s.stageKey && st.steps.some(x => x.def.key === s.stepKey))) return refuse('That step is not on the method.');
  const { rec } = await currentRecord(fp, s);
  const values = patch.values ? { ...(rec.values ?? {}), ...patch.values } : rec.values;
  const next: FlowRecord = { ...rec, ...patch, ...(values ? { values } : {}) };
  await putFlowRecord(next);
  /* the log says what someone decided — a day, a person — not every box typed
     or photo added on the way to done (those are on the step itself) */
  if (patch.plannedFor || patch.who) {
    const what = patch.plannedFor ? `planned for ${patch.plannedFor}` : `given to ${patch.who}`;
    await log(ctx, { projectId: s.projectId, methodId: fp.method.id, op: 'recordStep', target: { kind: 'flow_record', id: next.id }, summary: `${stepTitle(fp, s)} — ${what}` });
  }
  return { ok: true, value: next, said: 'Saved.' };
}

/** Say a step is done. It must be complete — every field it needs, its photos
 *  and files, its sign-off — or the app says what it still needs. A reading
 *  outside its limits is kept and said: the step did not pass. */
export async function completeStep(ctx: OpContext, s: StepRef, patch: StepPatch = {}): Promise<OpResult<FlowRecord>> {
  if (!ctx.can.edit) return refuse('You can read this project but not change it.');
  const today = ctx.today ?? todayISO();
  const fp = await loadFlowProject(s.projectId, today);
  if (!fp) return refuse('That project is not running a method on this device.');
  const { rec } = await currentRecord(fp, s);
  const values = patch.values ? { ...(rec.values ?? {}), ...patch.values } : rec.values;
  const trial: FlowRecord = { ...rec, ...patch, ...(values ? { values } : {}), outcome: 'done', doneOn: rec.doneOn ?? today };
  /* read the project again with the step as it would be, by the one runtime */
  const after = readFlow({
    def: fp.method.definition, records: [...fp.records.filter(r => r.id !== trial.id), trial], machines: fp.machines,
    problems: fp.problems, today, startedOn: fp.project.flow?.startedOn, people: fp.project.flow?.people,
  });
  const inst = after.stages.find(x => x.key === s.stageKey)?.steps.find(x => x.def.key === s.stepKey && (x.assetId ?? undefined) === (s.assetId ?? undefined));
  if (!inst) return refuse('That step is not on the method.');
  if (inst.missing.length) return refuse(`It still needs ${inst.missing.join(', ')}.`);
  const stage = after.stages.find(x => x.key === s.stageKey);
  const failed = inst.outOfLimits.length > 0;
  const next: FlowRecord = {
    ...trial,
    outcome: failed ? 'failed' : 'done',
    ...(inst.def.answer === 'signoff' && stage ? {
      openAtSign: stage.steps.filter(x => !x.complete && x !== inst).map(x => `${x.def.title}${x.machine ? ` — ${x.machine}` : ''}`),
    } : {}),
  };
  await putFlowRecord(next);
  await log(ctx, {
    projectId: s.projectId, methodId: fp.method.id, op: 'completeStep', target: { kind: 'flow_record', id: next.id },
    summary: `${stepTitle(fp, s)} — ${failed ? `did not pass: ${inst.outOfLimits.join('; ')}` : inst.def.answer === 'signoff' ? `signed by ${next.signedBy}` : 'done'}`,
  });
  return { ok: true, value: next, said: failed ? `Kept — it did not pass: ${inst.outOfLimits.join('; ')}.` : 'Done.' };
}

/** A task that hit a problem, or a test that did not pass — said, with what happened. */
export async function stepDidNotPass(ctx: OpContext, s: StepRef, note: string): Promise<OpResult<FlowRecord>> {
  if (!ctx.can.edit) return refuse('You can read this project but not change it.');
  const today = ctx.today ?? todayISO();
  const fp = await loadFlowProject(s.projectId, today);
  if (!fp) return refuse('That project is not running a method on this device.');
  if (!note.trim()) return refuse('Say what happened.');
  const { rec } = await currentRecord(fp, s);
  const next: FlowRecord = { ...rec, outcome: 'failed', note: note.trim(), doneOn: rec.doneOn ?? today };
  await putFlowRecord(next);
  await log(ctx, { projectId: s.projectId, methodId: fp.method.id, op: 'stepDidNotPass', target: { kind: 'flow_record', id: next.id }, summary: `${stepTitle(fp, s)} — did not pass: ${note.trim()}` });
  return { ok: true, value: next, said: 'Kept.' };
}

/** Try a step again: a new attempt, the last one kept as its history. */
export async function tryAgain(ctx: OpContext, s: StepRef, plannedFor?: string): Promise<OpResult<FlowRecord>> {
  if (!ctx.can.edit) return refuse('You can read this project but not change it.');
  const fp = await loadFlowProject(s.projectId, ctx.today);
  if (!fp) return refuse('That project is not running a method on this device.');
  const { rec, isNew } = await currentRecord(fp, s);
  if (isNew || rec.outcome === 'planned') return { ok: true, value: rec, said: 'It is still to do.' };
  const t = now();
  const next: FlowRecord = {
    id: uid(), projectId: s.projectId, kind: 'step', stageKey: s.stageKey, stepKey: s.stepKey,
    ...(s.assetId ? { assetId: s.assetId } : {}), version: fp.method.version, outcome: 'planned',
    ...(plannedFor ? { plannedFor } : {}), ...(rec.who ? { who: rec.who } : {}),
    sort: fp.records.length, createdAt: t, updatedAt: t,
  };
  await putFlowRecord(next);
  await log(ctx, { projectId: s.projectId, methodId: fp.method.id, op: 'tryAgain', target: { kind: 'flow_record', id: next.id }, summary: `${stepTitle(fp, s)} — to try again${plannedFor ? ` on ${plannedFor}` : ''}` });
  return { ok: true, value: next, said: 'A new attempt is planned; the last one is kept.' };
}

/** Take back "done" on a step — the owner's, as deleting is. */
export async function reopenStep(ctx: OpContext, recordId: ID, projectId: ID): Promise<OpResult<FlowRecord>> {
  if (!ctx.can.agree) return refuse('Only the project owner takes back a step that was done.');
  const fp = await loadFlowProject(projectId, ctx.today);
  const rec = fp?.records.find(r => r.id === recordId);
  if (!fp || !rec || rec.kind !== 'step') return refuse('That step is not on this project.');
  const passed = fp.state.stages.find(s => s.key === rec.stageKey)?.gate.passed;
  if (passed) return refuse('Its gate is passed — reopen the gate first, so the gate is not left passed on work that is no longer done.');
  const next: FlowRecord = { ...rec, outcome: 'planned' };
  const { doneOn: _d, ...rest } = next;
  void _d;
  await putFlowRecord(rest);
  await log(ctx, { projectId, methodId: fp.method.id, op: 'reopenStep', target: { kind: 'flow_record', id: rec.id }, summary: `${stepTitle(fp, { projectId, stageKey: rec.stageKey, stepKey: rec.stepKey ?? '', assetId: rec.assetId })} — taken back to not done` });
  return { ok: true, value: rest, said: 'Taken back.' };
}

/* ==================================== gates ================================ */

export interface PassInput {
  projectId: ID;
  stageKey: string;
  /** The manual checks confirmed, by condition id — each with who confirmed or a word. */
  checks?: Record<string, string>;
  /** Passing over a blocking condition: the owner's reason, kept. */
  override?: string;
}

/** Pass a stage's gate — the owner's alone. Every blocking condition must be
 *  met and every manual check confirmed; otherwise only with an override and
 *  its reason, which is kept with the pass and in the log. */
export async function passGate(ctx: OpContext, input: PassInput): Promise<OpResult<FlowRecord>> {
  if (!ctx.can.agree) return refuse('Passing a gate is the project owner’s.');
  const today = ctx.today ?? todayISO();
  const fp = await loadFlowProject(input.projectId, today);
  if (!fp) return refuse('That project is not running a method on this device.');
  const stage = fp.state.stages.find(s => s.key === input.stageKey);
  if (!stage) return refuse('That stage is not on the method.');
  if (stage.gate.passed) return refuse(`${stage.name}'s gate is already passed.`);
  if (stage.gate.waitsOn) return refuse(`Pass ${stage.gate.waitsOn} first.`);
  const override = input.override?.trim();
  const blockers = stage.gate.conditions.filter(c => c.blocking);
  const unchecked = stage.gate.conditions.filter(c => c.manual && !input.checks?.[c.id]?.trim());
  if ((blockers.length || unchecked.length) && !override) {
    const needs = [...blockers.map(b => `${b.label} (${b.why})`), ...unchecked.map(u => `${u.label} — to confirm`)];
    return refuse(`The gate needs: ${needs.join('; ')}.`);
  }
  const t = now();
  const openAtPass = [
    ...blockers.map(b => `${b.label} — ${b.why}`),
    ...unchecked.map(u => `${u.label} — not confirmed`),
    ...stage.gate.warnings.map(w => `${w.label} — ${w.why}`),
  ];
  const rec: FlowRecord = {
    id: uid(), projectId: input.projectId, kind: 'gate', stageKey: stage.key, version: fp.method.version,
    outcome: 'done', doneOn: today, who: ctx.who,
    ...(input.checks && Object.keys(input.checks).length ? { checks: input.checks } : {}),
    ...(override && (blockers.length || unchecked.length) ? { override } : {}),
    ...(openAtPass.length ? { openAtPass } : {}),
    sort: fp.records.length, createdAt: t, updatedAt: t,
  };
  await putFlowRecord(rec);
  await log(ctx, {
    projectId: input.projectId, methodId: fp.method.id, op: 'passGate', target: { kind: 'flow_record', id: rec.id },
    summary: `Passed ${stage.name}'s gate${rec.override ? ` over ${blockers.length + unchecked.length} unmet — “${rec.override}”` : openAtPass.length ? ` with ${openAtPass.length} noted` : ''}`,
    ...(openAtPass.length ? { detail: { openAtPass } } : {}),
  });
  return { ok: true, value: rec, said: `${stage.name}'s gate passed.` };
}

/** Reopen a passed gate — the owner's, with a reason. The pass is kept in the
 *  log; the record is deleted with an undo. A later gate already passed must
 *  be reopened first. */
export async function reopenGate(ctx: OpContext, projectId: ID, stageKey: string, reason: string): Promise<OpResult<null>> {
  if (!ctx.can.agree) return refuse('Reopening a gate is the project owner’s.');
  if (!reason.trim()) return refuse('Say why it is reopened.');
  const fp = await loadFlowProject(projectId, ctx.today);
  if (!fp) return refuse('That project is not running a method on this device.');
  const i = fp.state.stages.findIndex(s => s.key === stageKey);
  const stage = fp.state.stages[i];
  if (!stage?.gate.pass) return refuse('That gate is not passed.');
  const later = fp.state.stages.slice(i + 1).find(s => s.gate.passed);
  if (later) return refuse(`${later.name}'s gate comes after it and is passed — reopen that first.`);
  const undo = await deleteFlowRecord(stage.gate.pass.id);
  await log(ctx, { projectId, methodId: fp.method.id, op: 'reopenGate', target: { kind: 'flow_record', id: stage.gate.pass.id }, summary: `Reopened ${stage.name}'s gate — “${reason.trim()}”` });
  return { ok: true, value: null, said: `${stage.name}'s gate reopened.`, undo };
}

/** Who does a role on a project — the project's own, kept with its method link. */
export async function setPeople(ctx: OpContext, projectId: ID, people: Record<string, string>): Promise<OpResult<Project>> {
  if (!ctx.can.agree) return refuse('Who does what is the project owner’s.');
  const p = await getProject(projectId);
  if (!p?.flow) return refuse('That project is not running a method.');
  const clean = Object.fromEntries(Object.entries(people).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
  const next: Project = { ...p, flow: { ...p.flow, people: clean } };
  await updateProject(next);
  await log(ctx, { projectId, op: 'setPeople', target: { kind: 'project', id: projectId }, summary: 'Changed who does what', detail: { people: clean } });
  return { ok: true, value: next, said: 'Saved.' };
}
