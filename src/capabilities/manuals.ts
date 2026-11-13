/* LUNA AND A MACHINE'S DOCUMENTS (13 November, docs/ASSET-DOCUMENTS.md — Rowland: "I upload it to Luna. She digests it. I'm able to tell
 * her to create a preventive maintenance list based on what the OEM has stipulated … I want to know the plate speed, how fast it can go,
 * what its limitations are, what products it's made for, whatever the documentation is saying").
 *
 * The reading is code (lib/manual): the manual's words are on the record page by page, and these four doors work on them —
 *   list_documents      the documents kept on a line or a machine
 *   find_in_document    what one says about maintenance · speed · products · limits, or any words — the passages, each with its page
 *   draft_pm_list       the maintenance tasks WITH an interval: those a rule read, plus any Luna adds from a passage — each of hers must
 *                       name its page and quote the manual's own words, and is dropped if those words are not on that page
 *   make_pm_list        (a card) the list made as a Planned maintenance log (FC-063) on the machine's line, a task a check, the OEM's
 *                       own words kept as what passes — through the log's own function, checked again against the pages
 * Luna never supplies an interval the manual does not state, and nothing is a record until the person says so. */
import { getWorkspace, listStudiesForLine, putStudy } from '../db';
import { newDocStudy } from '../tools/doc/doc';
import { docByKey } from '../tools/doc/registry';
import { studyHref } from '../lib/studyLinks';
import { uid } from '../lib/ids';
import { LOG_DEFS } from '../tools/checks/registry';
import { newLogStudy } from '../tools/checks/start';
import type { LogCheck } from '../lib/study';
import { findPassages, intervalSaid, pmTasksOf, proceduresOf, quoteOnPage, TOPICS, type ManualProcedure, type PmTask, type PmUnit, type Topic } from '../lib/manual/manual';
import { DOC_KIND_WORD, getMachineDoc, listMachineDocs, docSaid, type MachineDoc } from '../lib/manual/store';
import { checkObject } from './check';
import { anyone, mayEdit } from './access';
import type { CapCtx, CapRef, CapResult, Capability, Checked } from './types';

const UNITS: readonly PmUnit[] = ['hour', 'shift', 'day', 'week'];
const refOf = (d: MachineDoc): CapRef => ({ kind: 'study', id: d.id, label: d.name, href: d.lineId ? `/lines/${d.lineId}?view=machines` : '/library' });
const none = 'There is no such document on this device — list_documents says which are kept.';

export const listDocumentsCap: Capability = {
  name: 'list_documents', title: 'List a machine’s documents', kind: 'read',
  validate: raw => checkObject(raw, { lineId: { kind: 'string', label: 'the line', max: 60 }, machine: { kind: 'string', label: 'the machine', max: 80 } }),
  allowed: anyone,
  async run(_ctx, input: { lineId?: string; machine?: string }): Promise<CapResult> {
    const docs = await listMachineDocs(input);
    if (!docs.length) return { ok: true, says: `No document is kept${input.machine ? ` on ${input.machine}` : input.lineId ? ' on that line' : ''} yet — attach its PDF with the + beside the box and say which machine it is of.`, refs: [], data: { documents: [] } };
    return { ok: true, says: `${docs.length} document${docs.length === 1 ? '' : 's'} kept: ${docs.slice(0, 12).map(d => `${d.name} (${DOC_KIND_WORD[d.docKind].toLowerCase()}${d.machine ? `, ${d.machine}` : ''}, ${d.pageCount} pages) [${d.id}]`).join('; ')}.`,
      refs: docs.slice(0, 6).map(refOf), data: { documents: docs.map(d => ({ id: d.id, name: d.name, kind: d.docKind, machine: d.machine ?? null, lineId: d.lineId ?? null, pages: d.pageCount, unreadablePages: d.blank })) } };
  },
};

export const findInDocumentCap: Capability = {
  name: 'find_in_document', title: 'Find what a document says', kind: 'read',
  validate: raw => {
    const c = checkObject(raw, { documentId: { kind: 'string', label: 'which document', required: true, max: 60 }, topic: { kind: 'enum', label: 'the topic', values: Object.keys(TOPICS) }, words: { kind: 'string', label: 'the words to look for', max: 120 } });
    if (c.ok && !c.input.topic && !c.input.words) return { ok: false, why: 'Say what to look for — a topic (maintenance, speed, products, limits) or the words.' };
    return c;
  },
  allowed: anyone,
  async run(_ctx, input: { documentId: string; topic?: Topic; words?: string }): Promise<CapResult> {
    const d = await getMachineDoc(input.documentId);
    if (!d) return { ok: false, why: none };
    const { passages, more } = findPassages(d.pages, input, 24);
    const about = input.topic ?? `“${input.words}”`;
    if (!passages.length) return { ok: true, says: `“${d.name}” says nothing a search finds about ${about}${d.blank ? ` — ${d.blank} of its pages have no words to read (scans or drawings), so it may be on one of those` : ''}. Say so; do not answer from memory.`, refs: [refOf(d)], data: { passages: [] } };
    return { ok: true,
      says: `“${d.name}” on ${about}: ${passages.length} passage${passages.length === 1 ? '' : 's'}${more ? ` (and ${more} more — narrow the words)` : ''}. ${passages.map(p => `p.${p.page}: ${p.text}`).join(' ‖ ')} — answer only from these, giving the page; a figure not in them is not in the manual.`,
      refs: [refOf(d)], data: { passages, more } };
  },
};

interface AddIn { task: string; every: number; unit: PmUnit; oem: string; page: number; quote: string }
const readAdds = (raw: unknown): Checked<AddIn[]> => {
  if (raw === undefined || raw === null) return { ok: true, input: [] };
  if (!Array.isArray(raw) || raw.length > 60) return { ok: false, why: 'The tasks must be a list of at most 60.' };
  const out: AddIn[] = [];
  for (const x of raw) {
    const c = checkObject(x, {
      task: { kind: 'string', label: 'the task', required: true, max: 240 }, every: { kind: 'num', label: 'the interval’s number', required: true, min: 1, max: 100000 },
      unit: { kind: 'enum', label: 'the interval’s unit', required: true, values: UNITS }, oem: { kind: 'string', label: 'the manual’s own words for the interval', required: true, max: 120 },
      page: { kind: 'int', label: 'the page', required: true, min: 1, max: 5000 }, quote: { kind: 'string', label: 'the manual’s own words for the task', required: true, max: 400 },
    }, 'A task');
    if (!c.ok) return c;
    out.push(c.input as unknown as AddIn);
  }
  return { ok: true, input: out };
};

/** The tasks that stand: the rules' own, then each added one whose task words AND interval words are on the page it names. */
function standing(d: MachineDoc, adds: readonly AddIn[]): { tasks: PmTask[]; dropped: string[] } {
  const tasks = pmTasksOf(d.pages), dropped: string[] = [];
  const has = (t: { task: string; every: number; unit: PmUnit }) => tasks.some(x => x.every === t.every && x.unit === t.unit && x.task.toLowerCase() === t.task.toLowerCase());
  for (const a of adds) {
    if (!quoteOnPage(d.pages, a.page, a.quote)) { dropped.push(`“${a.task}” — its words are not on page ${a.page}`); continue; }
    if (!d.pages.some(p => p.toLowerCase().replace(/\s+/g, ' ').includes(a.oem.toLowerCase().replace(/\s+/g, ' ')))) { dropped.push(`“${a.task}” — the manual does not say “${a.oem}”`); continue; }
    if (!has(a)) tasks.push({ ...a, by: 'luna' });
  }
  return { tasks, dropped };
}
const taskLine = (t: PmTask) => `${t.task} — ${intervalSaid(t)}, p.${t.page}${t.by === 'luna' ? ' (added from the passage)' : ''}`;

export const draftPmListCap: Capability = {
  name: 'draft_pm_list', title: 'Draft a PM list from the manual', kind: 'read',
  validate: raw => {
    const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const c = checkObject({ documentId: o.documentId }, { documentId: { kind: 'string', label: 'which document', required: true, max: 60 } });
    if (!c.ok) return c;
    const a = readAdds(o.add);
    return a.ok ? { ok: true, input: { documentId: c.input.documentId, add: a.input } } : a;
  },
  allowed: anyone,
  async run(_ctx, input: { documentId: string; add: AddIn[] }): Promise<CapResult> {
    const d = await getMachineDoc(input.documentId);
    if (!d) return { ok: false, why: none };
    const { tasks, dropped } = standing(d, input.add);
    const about = findPassages(d.pages, { topic: 'maintenance' }, 9999).passages.length;
    if (!tasks.length) return { ok: true, refs: [refOf(d)], data: { tasks: [], dropped },
      says: `No maintenance task with an interval can be read in “${d.name}”${about ? ` — ${about} place${about === 1 ? '' : 's'} speak of maintenance; read them with find_in_document (topic maintenance) and add the tasks they state, each with its page and the manual's own words` : d.blank ? ` — ${d.blank} of its pages are pictures with no words to read` : ' — it does not speak of maintenance'}. Never supply an interval the manual does not give.${dropped.length ? ` Dropped: ${dropped.join('; ')}.` : ''}` };
    return { ok: true, refs: [refOf(d)], data: { tasks, dropped, machine: d.machine ?? null, lineId: d.lineId ?? null },
      says: `${tasks.length} maintenance task${tasks.length === 1 ? '' : 's'} the manual “${d.name}” states with an interval${d.machine ? `, for ${d.machine}` : ''}: ${tasks.map(taskLine).join(' ‖ ')}.${dropped.length ? ` Dropped, not in the manual as said: ${dropped.join('; ')}.` : ''} ${about > tasks.length ? `${about} places speak of maintenance in all — if a passage states a task these miss, add it with its page and the manual's own words. ` : ''}Show the person the list with pages; make_pm_list makes it a Planned maintenance record when they say so. The manual gives no hours for a task, and none is supplied.` };
  },
};

interface MakeIn { documentId: string; add: AddIn[]; leaveOut: string[]; name?: string }
export const makePmListCap: Capability = {
  name: 'make_pm_list', title: 'Make the PM list', kind: 'write',
  validate: raw => {
    const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const c = checkObject({ documentId: o.documentId, name: o.name, leaveOut: o.leaveOut }, {
      documentId: { kind: 'string', label: 'which document', required: true, max: 60 }, name: { kind: 'string', label: 'the list’s name', max: 120 },
      leaveOut: { kind: 'strings', label: 'the tasks to leave out', max: 80 },
    });
    if (!c.ok) return c;
    const a = readAdds(o.add);
    return a.ok ? { ok: true, input: { documentId: c.input.documentId, add: a.input, leaveOut: (c.input.leaveOut as string[] | undefined) ?? [], ...(c.input.name ? { name: c.input.name } : {}) } } : a;
  },
  allowed: (ctx: CapCtx) => mayEdit(ctx),
  async preview(_ctx, input: MakeIn) {
    const d = await getMachineDoc(input.documentId);
    if (!d || !d.lineId) return 'The document is not on this device, or is on no line.';
    const line = await getWorkspace(d.lineId);
    const tasks = chosen(d, input);
    return `Make a Planned maintenance list on ${line?.name ?? 'the line'}${d.machine ? ` for ${d.machine}` : ''} from “${d.name}”: ${tasks.length} task${tasks.length === 1 ? '' : 's'}, each with the interval the manual states and its page — ${tasks.slice(0, 6).map(t => `${t.task} (${t.oem})`).join('; ')}${tasks.length > 6 ? `; and ${tasks.length - 6} more` : ''}. No hours are set for a task — the manual gives none. You can change, add or take off any task on the list afterwards.`;
  },
  async run(ctx, input: MakeIn): Promise<CapResult> {
    const d = await getMachineDoc(input.documentId);
    if (!d) return { ok: false, why: none };
    if (!d.lineId) return { ok: false, why: 'The document is on no line — a PM list belongs to a machine on a line.' };
    const line = await getWorkspace(d.lineId);
    if (!line) return { ok: false, why: 'Its line is not on this device.' };
    const def = LOG_DEFS.find(x => x.key === 'planned-maintenance');
    if (!def) return { ok: false, why: 'Planned maintenance is not in this build.' };
    const tasks = chosen(d, input);
    if (!tasks.length) return { ok: false, why: 'No task with an interval stands — nothing to make.' };
    const checks: LogCheck[] = tasks.map(t => ({
      id: uid(), name: t.task, ...(d.machine ? { where: d.machine } : {}), when: { every: t.every, unit: t.unit }, kind: 'passfail',
      criterion: `Done as the manual says — “${t.quote}” (${d.name}, p.${t.page}; interval: “${t.oem}”)`,
      reaction: def.reactionWords, priority: 'high', holds: false, src: { doc: d.name, page: t.page, oem: t.oem, quote: t.quote },
    }));
    const s = newLogStudy(def, { since: ctx.now, pick: [], name: input.name?.trim() || `${d.machine ?? line.name} — PM from the manual`, workspaceId: line.id, ...(d.machine ? { machine: d.machine } : {}), now: ctx.now });
    const log = s.agreed?.log;
    if (!log) return { ok: false, why: 'The list could not be started.' };
    await putStudy({ ...s, agreed: { ...s.agreed, log: { ...log, checks } } });
    const made: CapRef = { kind: 'study', id: s.id, label: s.name, href: studyHref(s) };
    return { ok: true, refs: [made, refOf(d)],
      says: `Made “${s.name}” on ${line.name}: ${checks.length} planned maintenance task${checks.length === 1 ? '' : 's'} from “${d.name}”, each due at the manual's interval from today and saying the page it came from. Hours a task takes are not set — the manual gives none; they are typed on the list. Where the manual counts operating hours the list counts clock hours — say so. The paper to hand to the business is the list’s Report › Maintenance schedule: every task under its interval with the manual’s page.`,
      data: { studyId: s.id, tasks: checks.length }, show: made };
  },
};
function chosen(d: MachineDoc, input: MakeIn): PmTask[] {
  const out = new Set(input.leaveOut.map(x => x.toLowerCase().trim()));
  return standing(d, input.add).tasks.filter(t => !out.has(t.task.toLowerCase()));
}

/* A PROCEDURE FROM THE MANUAL, AS A DOCUMENT (13 November — Rowland: "turn it into something meaningful, like a SOP, or one-page work
 * instructions"; "SOP and work instruction from a manual, with the page cited per step"):
 *   list_procedures   the procedures the manual gives as numbered steps (lib/manual proceduresOf) — title, page, each step with its page,
 *                     the section's warnings
 *   make_procedure    (a card) one of them made a Standard operating procedure (FC-225) or a task instruction (FC-223) on the machine's
 *                     line, through the document's own record: a step a row in the manual's own words, its From saying the manual and
 *                     the page, the warnings kept as notes. A DRAFT — who keeps it, the photos, the care a step needs, a key point's
 *                     reason are the person's to give, and the document says what it still needs.
 * Nothing is reworded and no step is supplied: what the manual does not give as numbered steps is not made a procedure here. */
type DocAs = 'sop' | 'instruction';
const AS_WORD: Record<DocAs, string> = { sop: 'Standard operating procedure', instruction: 'task instruction' };
const sentencesOf = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
const bare = (x: string) => x.replace(/[.;:,\s]+$/, '');
/** What the procedure is for, from its title's own words — else "something else", never a guess past the words. */
const useOf = (title: string): string => (/\bchang|change-?over|size change/i.test(title) ? 'changeover' : /\bclean|wash|sanit/i.test(title) ? 'clean' : /\bstart|set-?up|setting up/i.test(title) ? 'setup' : /\bcheck|inspect|test\b/i.test(title) ? 'check' : 'other');
const pickProcedure = (all: ManualProcedure[], want: string): ManualProcedure | undefined => {
  const w = want.trim().toLowerCase();
  const n = /^\d+$/.test(w) ? all[Number(w) - 1] : undefined;
  return n ?? all.find(x => x.title.toLowerCase() === w) ?? (all.filter(x => x.title.toLowerCase().includes(w)).length === 1 ? all.find(x => x.title.toLowerCase().includes(w)) : undefined);
};
const procLine = (x: ManualProcedure, i: number) => `[${i + 1}] ${x.title} (p.${x.page}, ${x.steps.length} steps${x.warnings.length ? `, ${x.warnings.length} warning${x.warnings.length === 1 ? '' : 's'}` : ''})`;

export const listProceduresCap: Capability = {
  name: 'list_procedures', title: 'List the procedures in a manual', kind: 'read',
  validate: raw => checkObject(raw, { documentId: { kind: 'string', label: 'which document', required: true, max: 60 }, procedure: { kind: 'string', label: 'which procedure', max: 120 } }),
  allowed: anyone,
  async run(_ctx, input: { documentId: string; procedure?: string }): Promise<CapResult> {
    const d = await getMachineDoc(input.documentId);
    if (!d) return { ok: false, why: none };
    const all = proceduresOf(d.pages);
    if (!all.length) return { ok: true, refs: [refOf(d)], data: { procedures: [] },
      says: `“${d.name}” gives no procedure as numbered steps that the app can read${d.blank ? ` — ${d.blank} of its pages are pictures with no words` : ''}. Say so. What it says in prose can be found with find_in_document and typed into a procedure by the person; never write the steps yourself as if the manual gave them.` };
    const one = input.procedure ? pickProcedure(all, input.procedure) : undefined;
    if (one) return { ok: true, refs: [refOf(d)], data: { procedure: one },
      says: `“${one.title}” in “${d.name}” (p.${one.page}), ${one.steps.length} steps in the manual's own words: ${one.steps.map(st => `${st.n}. ${st.text} (p.${st.page})`).join(' ‖ ')}.${one.warnings.length ? ` The manual's warnings there: ${one.warnings.map(w => `${w.text} (p.${w.page})`).join(' ‖ ')}.` : ''} make_procedure makes it a Standard operating procedure or a task instruction on the line when the person says so.` };
    return { ok: true, refs: [refOf(d)], data: { procedures: all.map(x => ({ title: x.title, page: x.page, steps: x.steps.length, warnings: x.warnings.length })) },
      says: `${all.length} procedure${all.length === 1 ? '' : 's'} “${d.name}” gives as numbered steps: ${all.map(procLine).join(' · ')}. Ask which one, unless the person named it; list_procedures with procedure gives its steps. Only these are steps the manual states — do not add a step it does not give.` };
  },
};

interface ProcIn { documentId: string; procedure: string; as: DocAs; name?: string }
type ProcDraft = { why: string } | { d: MachineDoc; line: NonNullable<Awaited<ReturnType<typeof getWorkspace>>>; proc: ManualProcedure; def: NonNullable<ReturnType<typeof docByKey>> };
async function procedureDraft(input: ProcIn): Promise<ProcDraft> {
  const d = await getMachineDoc(input.documentId);
  if (!d) return { why: none };
  if (!d.lineId) return { why: 'The document is on no line — a procedure belongs to a machine on a line.' };
  const line = await getWorkspace(d.lineId);
  if (!line) return { why: 'Its line is not on this device.' };
  const all = proceduresOf(d.pages);
  const proc = pickProcedure(all, input.procedure);
  if (!proc) return { why: all.length ? `“${d.name}” has no one procedure called “${input.procedure}” — it gives: ${all.map(procLine).join(' · ')}. Ask which.` : `“${d.name}” gives no procedure as numbered steps.` };
  const def = docByKey(input.as === 'sop' ? 'sop' : 'job-instruction');
  if (!def) return { why: 'That kind of document is not in this build.' };
  return { d, line, proc, def };
}
export const makeProcedureCap: Capability = {
  name: 'make_procedure', title: 'Make a procedure from the manual', kind: 'write',
  validate: raw => checkObject(raw, {
    documentId: { kind: 'string', label: 'which document', required: true, max: 60 }, procedure: { kind: 'string', label: 'which procedure', required: true, max: 120 },
    as: { kind: 'enum', label: 'what to make it', required: true, values: ['sop', 'instruction'] }, name: { kind: 'string', label: 'its name', max: 120 },
  }),
  allowed: (ctx: CapCtx) => mayEdit(ctx),
  async preview(_ctx, input: ProcIn) {
    const p = await procedureDraft(input);
    if ('why' in p) return p.why;
    const { d, line, proc } = p;
    return `Make a ${AS_WORD[input.as]} on ${line.name}${d.machine ? ` for ${d.machine}` : ''} from “${proc.title}” in “${d.name}” (p.${proc.page}): ${proc.steps.length} steps in the manual’s own words, each saying its page${proc.warnings.length ? `, and the manual’s ${proc.warnings.length === 1 ? 'warning' : `${proc.warnings.length} warnings`} kept as notes` : ''}. It is a draft: ${input.as === 'sop' ? 'who keeps it, the photos and the care each step needs' : 'the instructor, and the reason for each key point'} are yours to give, and it says what it still needs.`;
  },
  async run(ctx, input: ProcIn): Promise<CapResult> {
    const p = await procedureDraft(input);
    if ('why' in p) return { ok: false, why: p.why };
    const { d, line, proc, def } = p;
    const name = input.name?.trim() || `${proc.title}${d.machine ? ` — ${d.machine}` : ''}`;
    const same = (await listStudiesForLine(line.id)).find(x => !x.deletedAt && x.tool === 'doc' && x.agreed?.doc?.def === def.key && x.name.trim().toLowerCase() === name.toLowerCase());
    if (same) return { ok: false, why: `${line.name} already has a ${AS_WORD[input.as]} called “${same.name}” — open that one, or give this one another name.` };
    const from = (page: number) => `${d.name}, p.${page}`;
    const where = [d.machine, line.name].filter(Boolean).join(', ');
    const steps = proc.steps.map(st => {
      const [first, ...rest] = sentencesOf(st.text);
      return { id: uid(), c: input.as === 'sop'
        ? { do: bare(first ?? st.text), ...(rest.length ? { how: rest.join(' ') } : {}), from: from(st.page) }
        : { step: bare(first ?? st.text), ...(rest.length ? { keys: rest.map(bare).join('; ') } : {}), from: from(st.page) } };
    });
    const values = input.as === 'sop'
      ? { title: proc.title, use: useOf(proc.title), where, steps }
      : { title: proc.title, where, standard: `${d.name} (the maker’s manual), p.${proc.page}`, steps };
    const s = newDocStudy(def, { name, workspaceId: line.id, now: ctx.now });
    const remarks = proc.warnings.map((w, i) => ({ id: uid(), at: ctx.now + i, text: `From ${from(w.page)}: ${w.text}` }));
    await putStudy({ ...s, ...(d.machine ? { machine: d.machine } : {}), facts: { ...s.facts, docValues: { ...(s.facts.docValues ?? {}), ...values }, ...(remarks.length ? { remarks } : {}) } });
    const made: CapRef = { kind: 'study', id: s.id, label: s.name, href: studyHref(s) };
    return { ok: true, refs: [made, refOf(d)], show: made, data: { studyId: s.id, steps: steps.length, warnings: remarks.length },
      says: `Made “${s.name}”, a ${AS_WORD[input.as]} on ${line.name}: ${steps.length} steps from “${d.name}”, each in the manual's own words with its page${remarks.length ? `, and its ${remarks.length === 1 ? 'warning' : `${remarks.length} warnings`} kept under Notes` : ''}. It is a DRAFT and says what it still needs — ${input.as === 'sop' ? 'who keeps it, a photo for each step and the care a step needs' : 'the instructor, and a reason for each key point (the manual gives none)'}; ${steps.length > 12 ? 'it is long for one page at the machine. ' : ''}say so, and that it should be read against the machine before it is agreed.` };
  },
};

export const MANUALS: Capability[] = [listDocumentsCap, findInDocumentCap, draftPmListCap, makePmListCap, listProceduresCap, makeProcedureCap];
export { docSaid };
