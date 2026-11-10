/* OPERATING THE APPLICATION — the capabilities over the tool connectors (10 November, docs/AI-OPERATING.md).
 *
 * Rowland, 10 November: "I want to be able to talk to Faultline about an operational problem and have it intelligently use the entire
 * application to do the work with me." Each capability here is a door onto what the app already does — the tool's own sentence, its
 * own record, its own paper, its own capture writes, its own statistics — through the connectors (./connectors). Nothing here works out
 * a figure: the tools do. Nothing is deleted. A write is a card the person confirms; a live measurement is confirmed ONCE when it
 * starts (Rowland: "confirm once when starting the measurement … spoken events should be captured directly … correct, undo and
 * review"), and only the session's own events are taken without a card, only while it runs, only into its own record.
 *
 *   tool_guide          read   every tool's parts (describe · fill · capture · read · report), and the kinds of work said apart
 *   read_record         read   one record as its tool reads it: its sentence, where it sits, its readings and notes, its paper
 *   run_analysis        read   the Analysis tool's own statistics on figures given or a record's readings, in its own words
 *   show_work           local  the real page of a record, a line, a project or a report opened in the work pane beside the talk
 *   make_report         local  a paper made by the app's own report code (a tool's record, a project, a line, its full package,
 *                              an area, the client report, the Story) — opened in the pane, made on arrival, kept under Saved copies
 *   write_document      write  a document written in the conversation, kept as a Line Talk record with its own page and PDF
 *   draw_diagram        write  a process flow, spaghetti or value stream said aloud, made (or updated) as the tool's own record
 *   add_readings        write  readings added to a capability study, a control chart or an analysis
 *   start_measurement   write  a live measurement started with a tool's capture (confirmed once)
 *   capture_event       local  an event of the running measurement, written as the capture screen writes it
 *   undo_capture        local  the last event (or one named) taken back as the tool's own Undo does
 *   correct_capture     local  an event taken back and written again as said, at the same moment
 *   end_measurement     local  the measurement stopped, what it captured said
 *   measurement_state   read   the session's events, for review
 *   plan_investigation  read   a method and its tools in order for an investigation, each tool's kind of work and how its findings come together */
import { getProject, getStudy, getWorkspace, listObservations, listStudies, listStudiesForLine, patchStudy, putStudy } from '../db';
import type { StudyReading, ToolStudy } from '../lib/study';
import { studyHref, studyTitle } from '../lib/studyLinks';
import { savingAt } from '../lib/useSaveOnArrival';
import { uid } from '../lib/ids';
import { APP_TOOLS } from '../catalogue/registry';
import { METHODS, methodByKey, type MethodKey } from '../lib/methods';
import { fieldsOf } from '../lib/methodSheet';
import { analysisFigures, analysisSays } from '../tools/analysis/analysis';
import type { AgreedAnalysis } from '../lib/study';
import { checkTalkAnswer, figuresIn } from '../tools/talk/talkAssist';
import { readCapture, setOf, type TalkCapture } from '../tools/talk/talkSets';
import { photoLabels, type TalkTurn } from '../tools/talk/talk';
import { DIAGRAM_WORD, diagramRecord, diagramUpdate } from '../tools/talk/diagramRecord';
import { checkObject, ID } from './check';
import { anyone, mayEdit } from './access';
import { ACTIVITIES } from './appModel';
import { activitiesFor } from './understand';
const activityOf = (words: string) => activitiesFor(words)[0];
import { CONNECTORS, INTENTS, allGuides, connectorForStudy, connectorOf, readRecord, toolGuide, type Intent } from './connectors';
import { CAPTURE_ADAPTERS, MEASURE_TOOLS, adapterOf, reviewOf, type CaptureInput, type MeasureEvent, type Measurement, type StartInput } from './connectors/measure';
import type { CapCtx, CapRef, CapResult, Capability, Checked } from './types';
import { lineRef, notFound, plural, projectRef } from './util';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 400): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const nums = (v: unknown, max = 2000): number[] | undefined => (Array.isArray(v) && v.length && v.length <= max && v.every(x => typeof x === 'number' && Number.isFinite(x)) ? v as number[] : undefined);
const studyRef = (s: ToolStudy): CapRef => ({ kind: 'study', id: s.id, label: studyTitle(s), href: studyHref(s) });
const pageRef = (href: string, label: string): CapRef => ({ kind: 'page', id: href, label, href });
const reportRef = (href: string, label: string): CapRef => ({ kind: 'report', id: href, label, href });

/** The conversation this call is part of. */
async function conversation(ctx: CapCtx): Promise<ToolStudy | undefined> {
  if (!ctx.conversationId) return undefined;
  const s = await getStudy(ctx.conversationId);
  return s && s.tool === 'talk' && (s.facts as { colleague?: boolean }).colleague ? s : undefined;
}
/** A record by id, and whether this person may change it. */
async function editable(ctx: CapCtx, studyId: string | undefined): Promise<{ ok: true; s: ToolStudy } | { ok: false; why: string }> {
  const s = studyId ? await getStudy(studyId) : undefined;
  if (!s || s.deletedAt) return notFound('record');
  const may = await mayEdit(ctx, s.projectId);
  return may.ok ? { ok: true, s } : may;
}

/* ================================================================== tool_guide */
export const toolGuideCap: Capability = {
  name: 'tool_guide', title: 'What each tool can do', kind: 'read',
  validate: raw => checkObject(raw, { key: { kind: 'string', label: 'one tool’s key', max: 60 }, words: { kind: 'string', label: 'words for the work', max: 200 }, intent: { kind: 'enum', label: 'the kind of work', values: Object.keys(INTENTS) } }),
  allowed: anyone,
  async run(_ctx, input: { key?: string; words?: string; intent?: Intent }): Promise<CapResult> {
    let guides = allGuides();
    if (input.key) { const c = connectorOf(input.key); if (!c) return { ok: false, why: `No tool has the key “${input.key}” — leave it out to see them all.` }; guides = [toolGuide(c)]; }
    else if (input.intent) {
      const want: Record<Intent, (g: ReturnType<typeof toolGuide>) => boolean> = {
        report: g => g.parts.includes('report'), fill: g => g.parts.includes('fill'), measure: g => !!g.capture, calculate: g => g.key === 'calc' || /calc/.test(g.page ?? ''),
        analyse: g => !!g.readings || g.key === 'analysis', investigate: () => true,
      };
      guides = guides.filter(want[input.intent]);
    }
    if (input.words) {
      const act = activityOf(input.words);
      const w = input.words.toLowerCase().split(/\W+/).filter(x => x.length > 2);
      const hit = guides.filter(g => (act ? act.tools.includes(g.key) : false) || w.some(x => `${g.label} ${g.says}`.toLowerCase().includes(x)));
      if (hit.length) guides = hit;
    }
    return {
      ok: true,
      says: `${plural(guides.length, 'tool')}: ${guides.slice(0, 12).map(g => `${g.label} (${g.parts.join(' · ')})`).join('; ')}${guides.length > 12 ? ' …' : ''}.`,
      data: { intents: INTENTS, tools: guides },
      refs: [],
    };
  },
};

/* ================================================================== read_record */
export const readRecordCap: Capability = {
  name: 'read_record', title: 'Read a record', kind: 'read',
  validate: raw => checkObject(raw, { studyId: ID('the record', true) }),
  allowed: anyone,
  async run(_ctx, input: { studyId: string }): Promise<CapResult> {
    const s = await getStudy(input.studyId);
    if (!s || s.deletedAt) return notFound('record');
    const line = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
    const obs = line && s.tool === 'losses' ? await listObservations(line.id) : [];
    const r = readRecord(s, line && s.tool === 'losses' ? { observations: obs, workspaces: [line] } : undefined);
    return { ok: true, says: `${r.title}: ${r.says}${r.readings ? ` (${plural(r.readings.n, 'reading')}${r.readings.struck ? `, ${r.readings.struck} struck` : ''})` : ''}`, data: r, refs: [studyRef(s)] };
  },
};

/* ================================================================== run_analysis */
type Question = 'sure' | 'change' | 'paired' | 'groups' | 'relate';
interface AnalysisIn {
  question: Question; name: string; unit?: string; confidence?: 0.9 | 0.95 | 0.99; better?: 'lower' | 'higher' | 'either';
  values?: number[]; before?: number[]; after?: number[]; groups?: { name: string; values: number[] }[]; pairs?: { x: number; y: number }[];
  first?: number[]; second?: number[]; within?: number; driver?: string; studyId?: string;
}
function checkAnalysis(raw: unknown): Checked<AnalysisIn> {
  if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
  const q = raw.question;
  if (!['sure', 'change', 'paired', 'groups', 'relate'].includes(String(q))) return { ok: false, why: 'The question is one of sure, change, paired, groups, relate.' };
  const name = str(raw.name, 120);
  if (!name) return { ok: false, why: 'Say what is measured — its name.' };
  const conf = raw.confidence === undefined ? undefined : [0.9, 0.95, 0.99].includes(Number(raw.confidence)) ? Number(raw.confidence) as 0.9 | 0.95 | 0.99 : null;
  if (conf === null) return { ok: false, why: 'The confidence is 0.9, 0.95 or 0.99.' };
  const out: AnalysisIn = { question: q as Question, name, ...(str(raw.unit, 20) ? { unit: str(raw.unit, 20) } : {}), ...(conf ? { confidence: conf } : {}),
    ...(['lower', 'higher', 'either'].includes(String(raw.better)) ? { better: raw.better as 'lower' | 'higher' | 'either' } : {}), ...(str(raw.studyId, 80) ? { studyId: str(raw.studyId, 80) } : {}) };
  for (const k of ['values', 'before', 'after', 'first', 'second'] as const) {
    if (raw[k] === undefined) continue;
    const xs = nums(raw[k]);
    if (!xs) return { ok: false, why: `${k} must be a list of numbers, as given.` };
    out[k] = xs;
  }
  if (raw.groups !== undefined) {
    if (!Array.isArray(raw.groups) || raw.groups.length < 2 || raw.groups.length > 8) return { ok: false, why: 'Give two to eight groups, each a name and its numbers.' };
    const gs: { name: string; values: number[] }[] = [];
    for (const g of raw.groups) { const n = isObj(g) ? str(g.name, 60) : undefined, xs = isObj(g) ? nums(g.values) : undefined; if (!n || !xs) return { ok: false, why: 'Each group needs its name and its numbers.' }; gs.push({ name: n, values: xs }); }
    out.groups = gs;
  }
  if (raw.pairs !== undefined) {
    if (!Array.isArray(raw.pairs) || raw.pairs.length > 2000 || raw.pairs.some(p => !isObj(p) || typeof p.x !== 'number' || typeof p.y !== 'number')) return { ok: false, why: 'Pairs are a list of { x, y } numbers.' };
    out.pairs = raw.pairs as { x: number; y: number }[];
  }
  if (typeof raw.within === 'number' && raw.within >= 0) out.within = raw.within;
  if (str(raw.driver, 60)) out.driver = str(raw.driver, 60);
  return { ok: true, input: out };
}
/** The Analysis tool's own question and readings from what was given — the shape its page keeps (tools/analysis). */
export function analysisFrom(i: AnalysisIn, fromRecord: StudyReading[] = []): { a: AgreedAnalysis; readings: StudyReading[] } | { why: string } {
  const at = 0;
  const r = (value: number, extra: Partial<StudyReading> = {}): StudyReading => ({ id: uid(), value, at, ...extra });
  const base = { name: i.name, ...(i.unit ? { unit: i.unit } : {}), ...(i.confidence ? { confidence: i.confidence } : {}), ...(i.better ? { better: i.better } : {}) };
  if (i.question === 'sure') {
    const xs = i.values ?? fromRecord.filter(x => !x.struck && typeof x.value === 'number').map(x => x.value as number);
    if (!xs.length) return { why: 'Give the readings, or a record that holds them.' };
    return { a: { kind: 'sure', of: 'mean', ...base }, readings: xs.map(v => r(v)) };
  }
  if (i.question === 'change') {
    const b = i.before ?? fromRecord.filter(x => !x.struck && x.arm === 'before' && typeof x.value === 'number').map(x => x.value as number);
    const a = i.after ?? fromRecord.filter(x => !x.struck && x.arm === 'after' && typeof x.value === 'number').map(x => x.value as number);
    if (!b.length || !a.length) return { why: 'Give the readings before and after.' };
    return { a: { kind: 'change', data: 'measured', ...base }, readings: [...b.map(v => r(v, { arm: 'before' })), ...a.map(v => r(v, { arm: 'after' }))] };
  }
  if (i.question === 'paired') {
    if (!i.first || !i.second || i.first.length !== i.second.length) return { why: 'Give the two ways’ readings, the same number of each, in the same order.' };
    const second = i.second;
    return { a: { kind: 'paired', ...base, firstName: 'First way', secondName: 'Second way', ...(i.within !== undefined ? { within: i.within } : {}) }, readings: i.first.map((v, k) => r(v, { with: second[k] })) };
  }
  if (i.question === 'groups') {
    if (!i.groups) return { why: 'Give the groups, each a name and its readings.' };
    return { a: { kind: 'groups', ...base, firstName: 'Group', rows: i.groups.map(g => g.name) }, readings: i.groups.flatMap(g => g.values.map(v => r(v, { arm: g.name }))) };
  }
  if (!i.pairs?.length) return { why: 'Give the pairs — what moved (x) and the result (y).' };
  return { a: { kind: 'relate', ...base, drivers: [{ name: i.driver ?? 'x' }] }, readings: i.pairs.map(p => r(p.y, { xs: [p.x] })) };
}
export const runAnalysis: Capability = {
  name: 'run_analysis', title: 'Analyse the figures', kind: 'read',
  validate: raw => checkAnalysis(raw),
  allowed: anyone,
  async run(_ctx, input: AnalysisIn): Promise<CapResult> {
    let fromRecord: StudyReading[] = [], refs: CapRef[] = [];
    if (input.studyId) {
      const s = await getStudy(input.studyId);
      if (!s || s.deletedAt) return notFound('record');
      fromRecord = (s.facts?.readings ?? []) as StudyReading[];
      refs = [studyRef(s)];
    }
    const built = analysisFrom(input, fromRecord);
    if ('why' in built) return { ok: false, why: built.why };
    const f = analysisFigures(built.a, built.readings);
    const said = analysisSays(f, built.a);
    return {
      ok: true,
      says: `${said.text}${said.more.length ? ` ${said.more.join(' ')}` : ''} (Faultline's Analysis, ${plural(built.readings.length, 'reading')}${input.studyId ? ' from the record' : ' as given'}.) ${said.notClaimed}`.trim(),
      data: { verdict: said.verdict, tone: said.tone, sentence: said.text, more: said.more, notClaimed: said.notClaimed, checks: (f as { checks?: { say: string }[] }).checks?.map(c => c.say) ?? [] },
      refs,
    };
  },
};

/* ================================================================== show_work and make_report */
export const showWork: Capability = {
  name: 'show_work', title: 'Show it', kind: 'local',
  validate: raw => {
    const c = checkObject(raw, { studyId: ID('the record'), lineId: ID('the line'), projectId: ID('the project'), href: { kind: 'string', label: 'a page of the app', max: 300 } });
    if (!c.ok) return c;
    const h = c.input.href as string | undefined;
    if (h && (!h.startsWith('/') || h.startsWith('//'))) return { ok: false, why: 'Only a page of the app — an address starting “/”.' };
    return Object.keys(c.input).length ? c : { ok: false, why: 'Say what to show — a record, a line, a project or a page.' };
  },
  allowed: anyone,
  async run(_ctx, input: { studyId?: string; lineId?: string; projectId?: string; href?: string }): Promise<CapResult> {
    if (input.studyId) {
      const s = await getStudy(input.studyId);
      if (!s || s.deletedAt) return notFound('record');
      const ref = studyRef(s);
      return { ok: true, says: `Showing ${ref.label}.`, refs: [ref], show: ref };
    }
    if (input.projectId) {
      const p = await getProject(input.projectId);
      if (!p || p.deletedAt) return notFound('project');
      const ref = projectRef(p);
      return { ok: true, says: `Showing the project ${p.name}.`, refs: [ref], show: ref };
    }
    if (input.lineId) {
      const w = await getWorkspace(input.lineId);
      if (!w) return notFound('line');
      const ref = lineRef(w);
      return { ok: true, says: `Showing ${w.name}.`, refs: [ref], show: ref };
    }
    const ref = pageRef(input.href as string, input.href as string);
    return { ok: true, says: `Showing ${input.href}.`, refs: [ref], show: ref };
  },
};

const REPORT_KINDS = ['record', 'project', 'client', 'six-m', 'line', 'line-package', 'area', 'story'] as const;
type ReportKind = typeof REPORT_KINDS[number];
export const makeReport: Capability = {
  name: 'make_report', title: 'Make the report', kind: 'local',
  validate: raw => {
    const c = checkObject(raw, { what: { kind: 'enum', label: 'which report', values: REPORT_KINDS, required: true }, studyId: ID('the record'), projectId: ID('the project'), lineId: ID('the line'),
      site: { kind: 'string', label: 'the site', max: 120 }, area: { kind: 'string', label: 'the area', max: 120 } });
    if (!c.ok) return c;
    const w = c.input.what as ReportKind;
    if (w === 'record' && !c.input.studyId) return { ok: false, why: 'A record’s report needs the record (studyId).' };
    if ((w === 'project' || w === 'client' || w === 'six-m') && !c.input.projectId) return { ok: false, why: 'A project’s report needs the project.' };
    if ((w === 'line' || w === 'line-package') && !c.input.lineId) return { ok: false, why: 'A line’s report needs the line.' };
    if (w === 'area' && !c.input.area) return { ok: false, why: 'An area’s report needs the area’s name.' };
    return c;
  },
  allowed: anyone,
  async run(_ctx, input: { what: ReportKind; studyId?: string; projectId?: string; lineId?: string; site?: string; area?: string }): Promise<CapResult> {
    const made = (href: string, label: string, also = ''): CapResult => {
      const ref = reportRef(savingAt(href), label);
      return { ok: true, says: `Making ${label} with the app's own report — it opens beside the conversation, is made as soon as its page has read the records, and is kept under its Report ▾ › Saved copies.${also}`, refs: [ref], show: ref };
    };
    if (input.what === 'record') {
      const s = await getStudy(input.studyId as string);
      if (!s || s.deletedAt) return notFound('record');
      const c = connectorForStudy(s);
      if (c?.report === 'paper') return made(studyHref(s), `${studyTitle(s)} — on paper`);
      const ref = studyRef(s);
      return { ok: true, says: `${studyTitle(s)}'s paper is made on its own page, under Report ▾ — it is open beside the conversation.${c?.byHand ? ` ${c.byHand}` : ''}`, refs: [ref], show: ref };
    }
    if (input.what === 'project' || input.what === 'client' || input.what === 'six-m') {
      const p = await getProject(input.projectId as string);
      if (!p || p.deletedAt) return notFound('project');
      if (input.what === 'project') return made(`/project/${p.id}/method-report`, `the project report for ${p.name}`, ' It brings every tool used in the project together, each in its own words, with what needs attention and who owes what.');
      if (input.what === 'client') return made(`/project/${p.id}/report`, `the client report for ${p.name}`);
      return made(`/project/${p.id}/report?which=sixm`, `the 6M report for ${p.name}`);
    }
    if (input.what === 'line' || input.what === 'line-package') {
      const w = await getWorkspace(input.lineId as string);
      if (!w) return notFound('line');
      return input.what === 'line'
        ? made(`/lines/${w.id}/report`, `the line report for ${w.name}`, ' It carries the newest record of every tool used on the line.')
        : made(`/lines/${w.id}/report?full=1`, `the full package for ${w.name}`, ' Every tool’s own paper behind a cover and contents.');
    }
    if (input.what === 'area') {
      const q = new URLSearchParams({ ...(input.site ? { site: input.site } : {}), area: input.area as string });
      return made(`/area/report?${q.toString()}`, `the report for ${input.area}`);
    }
    return made('/', 'the Story’s chapter', ' The newest approved chapter.');
  },
};

/* ================================================================== write_document */
interface DocIn { document: unknown; lineId?: string; projectId?: string }
export const writeDocument: Capability = {
  name: 'write_document', title: 'Keep the document', kind: 'write',
  validate: raw => {
    if (!isObj(raw) || !isObj(raw.document)) return { ok: false, why: 'Give the document — its title, kind, status and sections.' };
    const checked = checkTalkAnswer({ reply: '', document: raw.document }, [], 'walk');
    if (!checked?.document || !checked.document.sections.length) return { ok: false, why: 'The document has no sections Faultline can read.' };
    return { ok: true, input: { document: raw.document, ...(str(raw.lineId, 80) ? { lineId: str(raw.lineId, 80) } : {}), ...(str(raw.projectId, 80) ? { projectId: str(raw.projectId, 80) } : {}) } };
  },
  allowed: async (ctx, input: DocIn) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: DocIn) {
    const d = checkTalkAnswer({ reply: '', document: input.document }, [], 'walk')?.document;
    const w = input.lineId ? await getWorkspace(input.lineId) : undefined;
    return `Keep “${d?.title ?? 'the document'}” (${plural(d?.sections.length ?? 0, 'section')}) as a Line Talk${w ? ` on ${w.name}` : ''}${input.projectId ? ', in the project' : ''} — its page to edit it, its PDF from there.`;
  },
  async run(ctx, input: DocIn): Promise<CapResult> {
    const conv = await conversation(ctx);
    const turns = ((conv?.facts as { turns?: TalkTurn[] } | undefined)?.turns ?? []);
    const labels = photoLabels(turns);
    const photos = [...labels.values()];
    const answer = checkTalkAnswer({ reply: '', document: input.document }, photos, 'walk');
    const doc = answer?.document;
    if (!doc) return { ok: false, why: 'The document could not be read.' };
    /* the photos it shows come with it, keeping their labels (P1, P2 …) */
    const shown = new Set(doc.sections.flatMap(s => s.photos.map(p => p.photo)));
    const photoTurns = turns.filter(t => t.kind === 'photo' && shown.has(labels.get(t.id) ?? ''));
    /* a figure in it found in nothing said in the conversation is marked to check, as Line Talk's are */
    const known = new Set(turns.flatMap(t => figuresIn(`${t.text ?? ''} ${t.heard ?? ''}`)));
    const words = [doc.title, doc.status?.line ?? '', ...doc.sections.flatMap(s => [s.heading, s.text, ...s.points.flatMap(p => [p.text, p.owner, p.due]), ...s.photos.map(p => p.caption)])].join('\n');
    const unsure = [...new Set(figuresIn(words).filter(f => !known.has(f)))].slice(0, 12);
    const w = input.lineId ? await getWorkspace(input.lineId) : undefined;
    const at = ctx.now, replyId = uid();
    const s: ToolStudy = {
      id: uid(), tool: 'talk', name: doc.title, ...(w ? { workspaceId: w.id } : {}), ...(input.projectId ? { projectId: input.projectId } : {}),
      facts: { turns: [
        { id: uid(), at: at - 2, kind: 'typed', text: `Written in AI Mode${conv ? ` — ${conv.name}` : ''}.` },
        ...photoTurns.map((t, k) => ({ ...t, at: at - 1 - (photoTurns.length - k) / 1000 })),
        { id: replyId, at, kind: 'reply', text: `The ${doc.kind === 'punch-list' ? 'punch list' : 'document'} “${doc.title}”, written in AI Mode.`, doc, ...(unsure.length ? { unsure } : {}) },
      ] } as ToolStudy['facts'], uses: [], startedAt: at, createdAt: at, updatedAt: at,
    };
    await putStudy(s);
    const ref: CapRef = { kind: 'study', id: s.id, label: doc.title, href: `/talk/${s.id}?doc=${encodeURIComponent(replyId)}` };
    return { ok: true, says: `Kept “${doc.title}” as a Line Talk${w ? ` on ${w.name}` : ''} — open beside the conversation to edit, and its PDF is on its page.${unsure.length ? ` Figures to check (not said in the conversation): ${unsure.join(', ')}.` : ''}`, refs: [ref], show: ref };
  },
};

/* ================================================================== draw_diagram */
interface DiagramIn { set: 'flow' | 'spag' | 'vs'; capture: TalkCapture; lineId?: string; projectId?: string; studyId?: string }
export const drawDiagram: Capability = {
  name: 'draw_diagram', title: 'Make the diagram', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const set = setOf(raw.set);
    if (set === 'walk') return { ok: false, why: 'The diagram is flow, spag or vs.' };
    const capture = readCapture(set, raw.capture);
    if (!capture) return { ok: false, why: 'The diagram has nothing Faultline can read — its steps, or its walkers and places.' };
    return { ok: true, input: { set, capture, ...(str(raw.lineId, 80) ? { lineId: str(raw.lineId, 80) } : {}), ...(str(raw.projectId, 80) ? { projectId: str(raw.projectId, 80) } : {}), ...(str(raw.studyId, 80) ? { studyId: str(raw.studyId, 80) } : {}) } };
  },
  allowed: async (ctx, input: DiagramIn) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: DiagramIn) {
    const w = input.lineId ? await getWorkspace(input.lineId) : undefined;
    const n = input.capture.set === 'spag' ? input.capture.walkers.reduce((t, x) => t + Math.max(0, x.steps.length - 1), 0) : input.capture.steps.length;
    return input.studyId
      ? `Update the ${DIAGRAM_WORD[input.set]} with what was said (${plural(n, input.set === 'spag' ? 'move' : 'step')}) — everything else on it stays.`
      : `Make a ${DIAGRAM_WORD[input.set]}${w ? ` on ${w.name}` : ''}${input.projectId ? ' in the project' : ''} from what was said — ${plural(n, input.set === 'spag' ? 'move' : 'step')}, every figure as said; the tool works out the rest.`;
  },
  async run(ctx, input: DiagramIn): Promise<CapResult> {
    const source = `AI Mode, ${new Date(ctx.now).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
    if (input.studyId) {
      const s = await getStudy(input.studyId);
      if (!s || s.deletedAt) return notFound('record');
      await patchStudy(s.id, cur => diagramUpdate(input.capture, cur, source));
      const ref = studyRef(s);
      return { ok: true, says: `Updated ${ref.label} with what was said — open beside the conversation.`, refs: [ref], show: ref };
    }
    const made = diagramRecord(input.capture, { id: uid(), at: ctx.now, ...(input.lineId ? { workspaceId: input.lineId } : {}), ...(input.projectId ? { projectId: input.projectId } : {}), source, from: { colleague: ctx.conversationId ?? '', at: ctx.now } });
    await putStudy(made);
    const ref = studyRef(made);
    return { ok: true, says: `Made the ${DIAGRAM_WORD[input.set]} — the tool's own page is open beside the conversation with what it works out.`, refs: [ref], show: ref };
  },
};

/* ================================================================== add_readings */
interface ReadingIn { value?: number; ok?: boolean; made?: number; rejected?: number; inspected?: number; faults?: number; arm?: string; with?: number; xs?: number[]; group?: number; product?: string; head?: number; note?: string }
interface ReadingsIn { studyId: string; values?: number[]; arm?: string; ok?: boolean[]; note?: string; readings?: ReadingIn[] }
/** One reading as said, in the shape its tool keeps (lib/study StudyReading) — only the boxes it has, each a number as said. */
function readingIn(x: unknown): ReadingIn | string {
  if (!isObj(x)) return 'Each reading is an object of its boxes.';
  const out: ReadingIn = {};
  for (const k of ['value', 'with', 'made', 'rejected', 'inspected', 'faults', 'group', 'head'] as const) {
    if (x[k] === undefined) continue;
    if (typeof x[k] !== 'number' || !Number.isFinite(x[k] as number)) return `${k} is a number, as said.`;
    out[k] = x[k] as number;
  }
  if (typeof x.ok === 'boolean') out.ok = x.ok;
  if (Array.isArray(x.xs)) { const xs = nums(x.xs, 5); if (!xs) return 'xs are the drivers’ numbers, in order.'; out.xs = xs; }
  for (const k of ['arm', 'product', 'note'] as const) if (str(x[k], 300)) out[k] = str(x[k], 300);
  if (out.made !== undefined && out.rejected !== undefined && out.rejected > out.made) return 'More rejected than made — check the counts.';
  return Object.keys(out).length ? out : 'A reading needs at least one box.';
}
export const addReadings: Capability = {
  name: 'add_readings', title: 'Add the readings', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const studyId = str(raw.studyId, 80);
    if (!studyId) return { ok: false, why: 'Say which record the readings go in.' };
    const values = raw.values === undefined ? undefined : nums(raw.values, 500);
    const okList = Array.isArray(raw.ok) && raw.ok.length <= 500 && raw.ok.every(x => typeof x === 'boolean') ? raw.ok as boolean[] : undefined;
    let readings: ReadingIn[] | undefined;
    if (Array.isArray(raw.readings)) {
      if (raw.readings.length > 500) return { ok: false, why: 'At most 500 readings at once.' };
      readings = [];
      for (const x of raw.readings) { const r = readingIn(x); if (typeof r === 'string') return { ok: false, why: r }; readings.push(r); }
    }
    if (!values && !okList && !readings?.length) return { ok: false, why: 'Give the readings as numbers (or good / failed as true / false, or each as its boxes), exactly as said.' };
    return { ok: true, input: { studyId, ...(values ? { values } : {}), ...(okList ? { ok: okList } : {}), ...(readings ? { readings } : {}), ...(str(raw.arm, 40) ? { arm: str(raw.arm, 40) } : {}), ...(str(raw.note, 300) ? { note: str(raw.note, 300) } : {}) } };
  },
  allowed: async (ctx, input: ReadingsIn) => { const e = await editable(ctx, input.studyId); return e.ok ? { ok: true } : e; },
  async preview(_ctx, input: ReadingsIn) {
    const s = await getStudy(input.studyId);
    const n = (input.values?.length ?? 0) + (input.ok?.length ?? 0) + (input.readings?.length ?? 0);
    return `Add ${plural(n, 'reading')} to ${s ? studyTitle(s) : 'the record'}${input.arm ? ` (${input.arm})` : ''}, each exactly as said — the tool works out what they mean.`;
  },
  async run(ctx, input: ReadingsIn): Promise<CapResult> {
    const e = await editable(ctx, input.studyId);
    if (!e.ok) return e;
    const s = e.s;
    if (!['capability', 'chart', 'analysis'].includes(s.tool)) return { ok: false, why: `${studyTitle(s)} does not take readings this way — open it to add them.` };
    const t = ctx.now;
    const add: StudyReading[] = [
      ...(input.values ?? []).map((v, k) => ({ id: uid(), value: v, at: t + k, ...(ctx.me ? { who: ctx.me } : {}), ...(input.arm ? { arm: input.arm } : {}), ...(k === 0 && input.note ? { note: input.note } : {}) })),
      ...(input.ok ?? []).map((v, k) => ({ id: uid(), ok: v, at: t + 1000 + k, ...(ctx.me ? { who: ctx.me } : {}) })),
      ...(input.readings ?? []).map((x, k) => ({ id: uid(), at: t + 2000 + k, ...(ctx.me ? { who: ctx.me } : {}), ...x })),
    ];
    await patchStudy(s.id, cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), ...add] } }));
    const now = await getStudy(s.id);
    const r = now ? readRecord(now) : undefined;
    const ref = studyRef(s);
    return { ok: true, says: `Added ${plural(add.length, 'reading')} to ${ref.label}. ${r ? `It now says: ${r.says}` : ''}`, data: r, refs: [ref], show: ref };
  },
};

/* ================================================================== live measurement */
const measuresOf = (s: ToolStudy | undefined): Measurement[] => {
  const m = (s?.facts as { measures?: unknown } | undefined)?.measures;
  return Array.isArray(m) ? m as Measurement[] : [];
};
const writeMeasure = (convId: string, m: Measurement) => patchStudy(convId, cur => ({ facts: { ...cur.facts, measures: [...measuresOf(cur).filter(x => x.id !== m.id), m] } as ToolStudy['facts'] }));
/** The measurement running in this conversation — the newest not ended. */
export const runningMeasure = (s: ToolStudy | undefined): Measurement | undefined => measuresOf(s).filter(m => !m.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
/** When an event happened: the moment the person's words were heard, if that was in the last two minutes; else now. */
const eventAt = (ctx: CapCtx): number => (ctx.saidAt && ctx.saidAt <= ctx.now && ctx.now - ctx.saidAt < 120_000 ? ctx.saidAt : ctx.now);

const START_FIELDS = {
  tool: { kind: 'enum', label: 'the measuring tool', values: MEASURE_TOOLS, required: true },
  lineId: ID('the line'), studyId: ID('the record to carry on'), machine: { kind: 'string', label: 'the machine', max: 120 }, name: { kind: 'string', label: 'a name', max: 120 },
  counts: { kind: 'strings', label: 'the things counted', max: 6 }, who: { kind: 'strings', label: 'the people watched', max: 12 }, activities: { kind: 'strings', label: 'what a tap can say', max: 10 },
  from: { kind: 'string', label: 'the product changed from', max: 120 }, to: { kind: 'string', label: 'the product changed to', max: 120 }, workstations: { kind: 'strings', label: 'the workstations', max: 30 },
  product: { kind: 'string', label: 'the product timed', max: 120 },
} as const;
export const startMeasurement: Capability = {
  name: 'start_measurement', title: 'Start the measurement', kind: 'write',
  validate: raw => checkObject(raw, START_FIELDS as unknown as Parameters<typeof checkObject>[1]),
  allowed: async (ctx, input: StartInput) => {
    if (input.studyId) { const e = await editable(ctx, input.studyId); return e.ok ? { ok: true } : e; }
    return mayEdit(ctx);
  },
  async preview(_ctx, input: StartInput) {
    const a = CAPTURE_ADAPTERS[input.tool];
    const s = input.studyId ? await getStudy(input.studyId) : undefined;
    const w = input.lineId ? await getWorkspace(input.lineId) : undefined;
    return `Start ${a.label}${s ? ` on ${studyTitle(s)}` : w ? ` on ${w.name}` : ''}${input.machine ? ` — ${input.machine}` : ''}. From now, what you say is captured straight into it without asking each time (${a.events.map(e => e.event).join(', ')}); you can review, undo or correct any of it, and end it when you are done.`;
  },
  async run(ctx, input: StartInput): Promise<CapResult> {
    const conv = await conversation(ctx);
    if (!conv) return { ok: false, why: 'A measurement is kept on the conversation, and there is none open.' };
    const was = runningMeasure(conv);
    if (was) return { ok: false, why: `${was.label} is still running — end it first (end_measurement), or carry on with it.` };
    const a = CAPTURE_ADAPTERS[input.tool];
    if (a.needsLine && !input.lineId) return { ok: false, why: `${a.label} is on a line — say which.` };
    const r = await a.start(input, ctx.now, ctx.me);
    if (!r.ok) return r;
    await writeMeasure(conv.id, { ...r.m, ...(conv ? {} : {}) });
    const ref = pageRef(r.href, a.label);
    return { ok: true, says: `${r.says} Say each event as it happens; “undo that”, “that was the filler, not the wrapper” and “stop measuring” all work.`, data: { measurement: r.m.id, events: a.events }, refs: [ref], show: ref };
  },
};

const CAPTURE_FIELDS = {
  event: { kind: 'string', label: 'the event', max: 40, required: true }, machine: { kind: 'string', label: 'the machine', max: 120 }, reason: { kind: 'string', label: 'why', max: 160 },
  count: { kind: 'string', label: 'what was counted', max: 60 }, who: { kind: 'string', label: 'who', max: 60 }, activity: { kind: 'string', label: 'what they were doing', max: 60 },
  name: { kind: 'string', label: 'the element', max: 160 }, side: { kind: 'enum', label: 'internal or external', values: ['internal', 'external'] },
  workstation: { kind: 'string', label: 'the workstation', max: 80 }, note: { kind: 'string', label: 'a note', max: 300 },
  where: { kind: 'string', label: 'where', max: 120 }, kind: { kind: 'enum', label: 'the kind of step', values: ['operation', 'move', 'check'] }, value: { kind: 'enum', label: 'VA, NE or NV', values: ['adds', 'needed', 'waste'] },
} as const;
const checkCapture = (raw: unknown): Checked<CaptureInput> => {
  const people = isObj(raw) && Array.isArray(raw.people) ? raw.people : undefined;
  const rest = isObj(raw) ? Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'people')) : raw;
  const c = checkObject(rest, CAPTURE_FIELDS as unknown as Parameters<typeof checkObject>[1]);
  if (!c.ok) return c;
  if (people) {
    if (people.length > 12 || people.some(p => !isObj(p) || !str(p.who, 60) || !str(p.activity, 60))) return { ok: false, why: 'Each person needs who and what they were doing.' };
    return { ok: true, input: { ...(c.input as unknown as CaptureInput), people: people.map(p => ({ who: str((p as Record<string, unknown>).who, 60) as string, activity: str((p as Record<string, unknown>).activity, 60) as string })) } };
  }
  return { ok: true, input: c.input as unknown as CaptureInput };
};
/** Only the running session's own events, only into its own record, only by somebody who may change it. */
async function sessionAllowed(ctx: CapCtx): Promise<{ ok: true; conv: ToolStudy; m: Measurement } | { ok: false; why: string }> {
  const conv = await conversation(ctx);
  const m = runningMeasure(conv);
  if (!conv || !m) return { ok: false, why: 'No measurement is running in this conversation — start one first (start_measurement), which asks once.' };
  if (m.studyId) { const e = await editable(ctx, m.studyId); if (!e.ok) return e; } else { const may = await mayEdit(ctx); if (!may.ok) return may; }
  return { ok: true, conv, m };
}
export const captureEvent: Capability = {
  name: 'capture_event', title: 'Capture it', kind: 'local',
  validate: checkCapture,
  allowed: async ctx => { const a = await sessionAllowed(ctx); return a.ok ? { ok: true } : a; },
  async run(ctx, input: CaptureInput): Promise<CapResult> {
    const a = await sessionAllowed(ctx);
    if (!a.ok) return a;
    const ad = adapterOf(a.m.tool);
    if (!ad) return { ok: false, why: 'That measurement’s tool is not known.' };
    const r = await ad.record(a.m, input, eventAt(ctx), ctx.me);
    if (!r.ok) return r;
    await writeMeasure(a.conv.id, r.m);
    return { ok: true, says: r.says, data: { event: r.event.id, at: r.event.at, n: r.m.events.filter(e => !e.struck).length }, refs: [pageRef(ad.href(r.m), ad.label)] };
  },
};
async function takeBack(ctx: CapCtx, eventId: string | undefined): Promise<{ ok: true; conv: ToolStudy; m: Measurement; e: MeasureEvent; says: string } | { ok: false; why: string }> {
  const a = await sessionAllowed(ctx);
  if (!a.ok) return a;
  const e = eventId ? a.m.events.find(x => x.id === eventId) : [...a.m.events].filter(x => !x.struck).sort((x, y) => y.at - x.at)[0];
  if (!e || e.struck) return { ok: false, why: eventId ? 'That event is not in this measurement, or was already taken back.' : 'Nothing has been captured yet.' };
  const ad = adapterOf(a.m.tool);
  if (!ad) return { ok: false, why: 'That measurement’s tool is not known.' };
  const r = await ad.undo(a.m, e);
  if (!r.ok) return r;
  const m = { ...r.m, events: r.m.events.map(x => (x.id === e.id ? { ...x, struck: true } : x)) };
  await writeMeasure(a.conv.id, m);
  return { ok: true, conv: a.conv, m, e, says: r.says };
}
export const undoCapture: Capability = {
  name: 'undo_capture', title: 'Take it back', kind: 'local',
  validate: raw => checkObject(raw, { eventId: ID('the event') }),
  allowed: async ctx => { const a = await sessionAllowed(ctx); return a.ok ? { ok: true } : a; },
  async run(ctx, input: { eventId?: string }): Promise<CapResult> {
    const r = await takeBack(ctx, input.eventId);
    if (!r.ok) return r;
    return { ok: true, says: r.says, data: { event: r.e.id }, refs: [] };
  },
};
export const correctCapture: Capability = {
  name: 'correct_capture', title: 'Put it right', kind: 'local',
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const c = checkCapture(raw.as);
    if (!c.ok) return c;
    return { ok: true, input: { ...(str(raw.eventId, 80) ? { eventId: str(raw.eventId, 80) } : {}), as: c.input } };
  },
  allowed: async ctx => { const a = await sessionAllowed(ctx); return a.ok ? { ok: true } : a; },
  async run(ctx, input: { eventId?: string; as: CaptureInput }): Promise<CapResult> {
    /* put right in place where the tool can (a finished stop keeps its times — measure.ts stops.correct) */
    const s0 = await sessionAllowed(ctx);
    if (!s0.ok) return s0;
    const ad0 = adapterOf(s0.m.tool);
    const e0 = input.eventId ? s0.m.events.find(x => x.id === input.eventId) : [...s0.m.events].filter(x => !x.struck && x.event !== 'running').sort((x, y) => y.at - x.at)[0];
    if (ad0?.correct && e0 && !e0.struck) {
      const c = await ad0.correct(s0.m, e0, input.as);
      if (c && !c.ok) return c;
      if (c?.ok) { await writeMeasure(s0.conv.id, c.m); return { ok: true, says: `Put right — ${c.says}`, data: { was: e0.id, now: c.event.id }, refs: [] }; }
    }
    const r = await takeBack(ctx, input.eventId);
    if (!r.ok) return r;
    const ad = adapterOf(r.m.tool);
    if (!ad) return { ok: false, why: 'That measurement’s tool is not known.' };
    /* written again at the moment the first one was — a correction never moves when it happened */
    const again = await ad.record(r.m, { ...r.e.input, ...input.as } as CaptureInput, r.e.at, ctx.me);
    if (!again.ok) return { ok: false, why: `Taken back, but the corrected one could not be written: ${again.why}` };
    await writeMeasure(r.conv.id, again.m);
    return { ok: true, says: `Put right — ${again.says}`, data: { was: r.e.id, now: again.event.id }, refs: [] };
  },
};
export const endMeasurement: Capability = {
  name: 'end_measurement', title: 'End the measurement', kind: 'local',
  validate: raw => checkObject(raw, {}),
  allowed: async ctx => { const a = await sessionAllowed(ctx); return a.ok ? { ok: true } : a; },
  async run(ctx): Promise<CapResult> {
    const a = await sessionAllowed(ctx);
    if (!a.ok) return a;
    const ad = adapterOf(a.m.tool);
    if (!ad) return { ok: false, why: 'That measurement’s tool is not known.' };
    const r = await ad.end(a.m, ctx.now);
    await writeMeasure(a.conv.id, r.m);
    const s = r.m.studyId ? await getStudy(r.m.studyId) : undefined;
    const read = s ? readRecord(s) : undefined;
    const ref = pageRef(ad.href(r.m), ad.label);
    return { ok: true, says: `${r.says}${read ? ` It says now: ${read.says}` : ''}`, data: { review: reviewOf(r.m), ...(read ? { record: read } : {}) }, refs: [ref], show: ref };
  },
};
export const measurementState: Capability = {
  name: 'measurement_state', title: 'What has been captured', kind: 'read',
  validate: raw => checkObject(raw, {}),
  allowed: anyone,
  async run(ctx): Promise<CapResult> {
    const conv = await conversation(ctx);
    const all = measuresOf(conv).sort((a, b) => b.startedAt - a.startedAt);
    const m = all[0];
    if (!m) return { ok: true, says: 'No measurement has been taken in this conversation.', data: { running: false }, refs: [] };
    const ad = adapterOf(m.tool);
    return {
      ok: true,
      says: `${m.label} — ${m.endedAt ? 'ended' : 'running'}; ${plural(m.events.filter(e => !e.struck).length, 'event')} captured${m.events.some(e => e.struck) ? `, ${m.events.filter(e => e.struck).length} taken back` : ''}.`,
      data: { running: !m.endedAt, tool: m.tool, events: m.events.map(e => ({ id: e.id, at: e.at, event: e.event, says: e.says, ...(e.struck ? { struck: true } : {}) })), review: reviewOf(m), takes: ad?.events ?? [] },
      refs: ad ? [pageRef(ad.href(m), ad.label)] : [],
    };
  },
};

/* ================================================================== plan_investigation */
export const planInvestigation: Capability = {
  name: 'plan_investigation', title: 'Plan the investigation', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'what is being investigated', max: 300, required: true }, method: { kind: 'enum', label: 'the method', values: METHODS.map(m => m.key) }, lineId: ID('the line'), projectId: ID('the project') }),
  allowed: anyone,
  async run(_ctx, input: { words: string; method?: MethodKey; lineId?: string; projectId?: string }): Promise<CapResult> {
    const act = activityOf(input.words);
    const project = input.projectId ? await getProject(input.projectId) : undefined;
    const mKey = input.method ?? project?.method ?? (act?.id === 'cause' ? 'eight-d' : act?.id === 'output' ? 'toc' : act?.id === 'changeover' ? 'kaizen-event' : 'dmaic');
    const method = methodByKey(mKey);
    if (!method) return { ok: false, why: 'That method is not known.' };
    const existing = project ? await listStudies(project.id) : input.lineId ? await listStudiesForLine(input.lineId) : [];
    const steps = method.sections.map(sec => {
      const tools = sec.tools.map(id => APP_TOOLS.find(t => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t).map(t => {
        const c = connectorOf(t.key);
        const used = existing.filter(s => !s.deletedAt && c?.owns?.(s));
        const how: Intent = c?.capture ? 'measure' : c?.fill || c?.diagram ? 'fill' : c?.readings ? 'analyse' : t.key === 'calc' ? 'calculate' : 'report';
        return { key: t.key, label: t.label, how, ...(used.length ? { already: used.slice(0, 3).map(s => ({ id: s.id, title: studyTitle(s) })) } : {}) };
      });
      const asks = fieldsOf(method.key, sec.name).map(f => ({ id: f.id, question: f.label }));
      return { section: sec.name, what: sec.what, tools, ...(asks.length ? { asks } : {}) };
    });
    const firstTools = act ? act.tools.map((k: string) => APP_TOOLS.find(t => t.key === k)?.label ?? k) : [];
    return {
      ok: true,
      says: `${method.name} for this: ${steps.map(s => `${s.section}${s.tools.length ? ` (${s.tools.map(t => t.label).join(', ')})` : ''}`).join(' → ')}. ${firstTools.length ? `For “${act?.word}” start with ${firstTools.join(' or ')}. ` : ''}Each section’s questions are answered with answer_method. The project report brings every tool’s finding together at the end (make_report project).${project ? '' : ' It is a project with this method (start_project), on the line — offered, never assumed.'}`,
      data: { method: { key: method.key, name: method.name, question: method.question }, steps, ...(act ? { activity: { id: act.id, word: act.word, tools: act.tools } } : {}), methods: METHODS.map(m => ({ key: m.key, name: m.name, question: m.question })), ending: 'make_report what: project' },
      refs: project ? [projectRef(project)] : [],
    };
  },
};

/** Every connector-backed capability, for the registry. */
export const OPERATE: readonly Capability[] = [
  toolGuideCap, readRecordCap, runAnalysis, showWork, makeReport, writeDocument, drawDiagram, addReadings,
  startMeasurement, captureEvent, undoCapture, correctCapture, endMeasurement, measurementState, planInvestigation,
];

export const _forTests = { CONNECTORS, ACTIVITIES };
