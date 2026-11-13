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
import { getWorkspace, putStudy } from '../db';
import { studyHref } from '../lib/studyLinks';
import { uid } from '../lib/ids';
import { LOG_DEFS } from '../tools/checks/registry';
import { newLogStudy } from '../tools/checks/start';
import type { LogCheck } from '../lib/study';
import { findPassages, intervalSaid, pmTasksOf, quoteOnPage, TOPICS, type PmTask, type PmUnit, type Topic } from '../lib/manual/manual';
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
      reaction: def.reactionWords, priority: 'high', holds: false,
    }));
    const s = newLogStudy(def, { since: ctx.now, pick: [], name: input.name?.trim() || `${d.machine ?? line.name} — PM from the manual`, workspaceId: line.id, ...(d.machine ? { machine: d.machine } : {}), now: ctx.now });
    const log = s.agreed?.log;
    if (!log) return { ok: false, why: 'The list could not be started.' };
    await putStudy({ ...s, agreed: { ...s.agreed, log: { ...log, checks } } });
    const made: CapRef = { kind: 'study', id: s.id, label: s.name, href: studyHref(s) };
    return { ok: true, refs: [made, refOf(d)],
      says: `Made “${s.name}” on ${line.name}: ${checks.length} planned maintenance task${checks.length === 1 ? '' : 's'} from “${d.name}”, each due at the manual's interval from today and saying the page it came from. Hours a task takes are not set — the manual gives none; they are typed on the list. Where the manual counts operating hours the list counts clock hours — say so.`,
      data: { studyId: s.id, tasks: checks.length }, show: made };
  },
};
function chosen(d: MachineDoc, input: MakeIn): PmTask[] {
  const out = new Set(input.leaveOut.map(x => x.toLowerCase().trim()));
  return standing(d, input.add).tasks.filter(t => !out.has(t.task.toLowerCase()));
}

export const MANUALS: Capability[] = [listDocumentsCap, findInDocumentCap, draftPmListCap, makePmListCap];
export { docSaid };
