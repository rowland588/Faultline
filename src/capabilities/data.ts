/* CONVERSATIONAL DATA — one layer for every source (10 November, docs/CONVERSATIONAL-DATA.md — Rowland: "I should be able to talk to Luna
 * about a factory, a production problem, a test, an experiment or a set of figures … ask questions, explore the information, challenge
 * the results, request graphs, build reports and change direction naturally").
 *
 *   list_sources    read   the files in the register and Faultline's own tables on a line or project, each with the id to ask it by
 *   resolve_source  read   which file the words mean — one, or the ones to ask between (never the newest picked silently)
 *   name_source     write  a card: a file's name (the person's or Luna's suggestion, said so), its description and what it is about
 *   source_fields   read   what a source holds — every field with its type, how many rows record it, what it cannot hold
 *   query_data      read   a question of any source, worked by Faultline's code over every row (lib/workbook/query for a file,
 *                          lib/data/table for the records), kept on the conversation as a RESULT; a field the source does not hold is
 *                          answered "cannot be said", with what it holds and what would be needed — never a guess
 *   make_chart      local  a chart drawn from results only, kept on the conversation
 *   refine_chart    local  a new version of a chart — type, percentages, left out, only, top n, target, compare, labels, another
 *                          result — or back to the previous or the original
 *   build_report    local  a report or presentation built section by section on the conversation; a finding names its results and a
 *                          figure none holds is marked Check this; the person downloads the PDF or the slides from its card
 *   outputs_state   read   the results, charts and reports in this conversation, newest first — what "that" can mean
 * Every figure is the code's. Nothing here changes a record but the register's own (by card). */
import { getStudy, listAllStudies, patchStudy, putStudy } from '../db';
import { getWorkspace, listWorkspaces } from '../db/workspaces';
import { listObservations } from '../db/observations';
import { listAllAssets, listAllTests } from '../db/testing';
import { listAllPrograms } from '../db/programs';
import { listAllSnags } from '../db/walk';
import { workbooks } from '../lib/workbook/client';
import type { Query, QueryResult } from '../lib/workbook/query';
import type { ToolStudy } from '../lib/study';
import { uid } from '../lib/ids';
import { fieldCoverage, missingFields, runTable, TableError, type Dataset, type Field } from '../lib/data/table';
import { problemsDataset, productionDataset, readingsDataset, stopsDataset, testsDataset } from '../lib/data/datasets';
import { listConnections, listProduction } from '../db/production';
import { matchSources, resolveSource, sourceSaid, sourcesOf, suggestName, type Source, type SourceFacts, type SourceSheet } from '../lib/data/sources';
import { applyReportOp, chartNow, checkSection, seriesOf, specChange, type Chart, type ChartSpec, type ConvReport, type DataResult, type ReportOp, type ReportSection } from '../lib/data/outputs';
import { anyone, mayEdit } from './access';
import { conversation } from './draftStore';
import { checkObject, ID } from './check';
import { lineRef, plural } from './util';
import type { CapCtx, CapResult, Capability, Checked, ColleagueImport, ColleagueWorkbook } from './types';

/* ------------------------------------------------------------------ the conversation's outputs */
export interface DataFacts { results?: DataResult[]; charts?: Chart[]; reports?: ConvReport[] }
const RESULTS_KEPT = 60, GROUPS_KEPT = 60;
const outputsOf = (s: Pick<ToolStudy, 'facts'>): Required<DataFacts> => {
  const f = s.facts as DataFacts;
  return { results: Array.isArray(f.results) ? f.results : [], charts: Array.isArray(f.charts) ? f.charts : [], reports: Array.isArray(f.reports) ? f.reports : [] };
};
const resultMap = (o: Required<DataFacts>) => new Map(o.results.map(r => [r.id, r]));
const chartMap = (o: Required<DataFacts>) => new Map(o.charts.map(c => [c.id, c]));
async function writeOutputs(id: string, change: (o: Required<DataFacts>) => Partial<DataFacts>): Promise<void> {
  await patchStudy(id, cur => ({ facts: { ...cur.facts, ...change(outputsOf(cur)) } as ToolStudy['facts'] }));
}

/* ------------------------------------------------------------------ the register */
const lineNames = async () => { const ws = await listWorkspaces(); return (id?: string) => (id ? ws.find(w => w.id === id)?.name : undefined); };
export async function allSources(): Promise<Source[]> { return sourcesOf(await listAllStudies()); }

/** A file read in the conversation put in the register — found by its contents' id and brought up to date, else made, named by its
 *  file (the person names it, or keeps a suggestion, through name_source). Placed on the line or project the conversation is on. */
export async function registerFile(ctx: CapCtx, f: { fileId: string; fileName: string; kind: SourceFacts['kind']; bytes: number; status: SourceFacts['status']; sheets?: SourceSheet[]; notRead?: string[]; lineId?: string; projectId?: string }): Promise<Source | undefined> {
  const had = (await allSources()).find(s => s.facts.fileId === f.fileId);
  if (had) {
    await patchStudy(had.id, cur => {
      const sf = (cur.facts as { source: SourceFacts }).source;
      return { facts: { ...cur.facts, source: { ...sf, status: f.status, ...(f.sheets ? { sheets: f.sheets } : {}), ...(f.notRead ? { notRead: f.notRead } : {}) } } as ToolStudy['facts'] };
    });
    return (await allSources()).find(s => s.id === had.id);
  }
  const t = Date.now();
  const line = f.lineId ? await getWorkspace(f.lineId) : undefined;
  const facts: SourceFacts = {
    name: suggestName(f.fileName, f.sheets), named: 'file', fileName: f.fileName, kind: f.kind, bytes: f.bytes, at: t, fileId: f.fileId, status: f.status,
    ...(f.sheets ? { sheets: f.sheets } : {}), ...(f.notRead?.length ? { notRead: f.notRead } : {}), ...(line?.clientName?.trim() ? { client: line.clientName.trim() } : {}),
    ...(ctx.conversationId ? { conversationId: ctx.conversationId } : {}),
  };
  const s: ToolStudy = { id: uid(), tool: 'source', name: facts.name, ...(f.lineId ? { workspaceId: f.lineId } : {}), ...(f.projectId ? { projectId: f.projectId } : {}), facts: { source: facts } as unknown as ToolStudy['facts'], uses: [], startedAt: t, createdAt: t, updatedAt: t };
  await putStudy(s);
  return (await allSources()).find(x => x.id === s.id);
}

/* ------------------------------------------------------------------ a source, by its id */
type Resolved =
  | { kind: 'workbook'; source?: Source; fileId: string; name: string }
  | { kind: 'dataset'; dataset: Dataset; source?: Source };

async function datasetFor(id: string, ctx: CapCtx): Promise<Dataset | { why: string }> {
  const [kind, ref] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
  if (kind === 'stops' || kind === 'tests' || (kind === 'problems' && ref !== 'all')) {
    const w = await getWorkspace(ref);
    if (!w) return { why: 'There is no line with that id on this device — find it first.' };
    if (kind === 'stops') return stopsDataset(w, await listObservations(w.id));
    if (kind === 'tests') {
      const [tests, programs, assets] = await Promise.all([listAllTests(), listAllPrograms(), listAllAssets()]);
      return testsDataset(w, tests, programs, assets, p => (p.workspaceId ?? p.lineId) === w.id);
    }
    return problemsDataset(w, (await listAllSnags()).filter(s => s.workspaceId === w.id), [w], ctx.now);
  }
  /* what a business's own system sent through a data connection (docs/DATA-CONNECTIONS.md): one line's, or every line's on this device */
  if (kind === 'production') {
    const lines = await listWorkspaces();
    const w = ref === 'all' ? undefined : lines.find(l => l.id === ref);
    if (ref !== 'all' && !w) return { why: 'There is no line with that id on this device — find it first.' };
    return productionDataset(w ?? { id: 'all', name: 'Every line' }, await listProduction(w?.id), lines, await listConnections());
  }
  if (kind === 'problems') return problemsDataset({ id: 'all', name: 'Every line' }, await listAllSnags(), await listWorkspaces(), ctx.now);
  if (kind === 'readings') {
    const s = await getStudy(ref);
    if (!s || s.deletedAt) return { why: 'There is no study with that id on this device.' };
    return readingsDataset(s);
  }
  if (kind === 'import') {
    const c = await conversation(ctx);
    const imp = c.ok ? ((c.s.facts as { imports?: ColleagueImport[] }).imports ?? []).find(x => x.id === ref) : undefined;
    if (!imp) return { why: 'That imported file is not in this conversation.' };
    const fields: Field[] = [
      { name: 'reason', type: 'text', means: `the reason column of the file (“${imp.columns.reason}”)` },
      { name: 'minutes', type: 'number', unit: 'min', means: imp.columns.minutes ? `the file’s “${imp.columns.minutes}”` : 'not in the file' },
      { name: 'events', type: 'number', means: imp.columns.count ? `the file’s “${imp.columns.count}”` : 'not in the file' },
      { name: 'line', type: 'text', means: imp.columns.line ? `the file’s “${imp.columns.line}”` : 'not in the file' },
      { name: 'date', type: 'date', means: imp.columns.date ? `the file’s “${imp.columns.date}”` : 'not in the file' },
    ];
    return {
      id, name: imp.name, kind: 'stops', fields,
      rows: imp.rows.map(r => [r.category, r.mins ?? null, r.events ?? null, r.line ?? null, r.at ? new Date(r.at).toISOString().slice(0, 10) : null]),
      refs: imp.rows.map((_r, i) => `${imp.name} row ${i + 2}`),
      limits: [`Imported from ${imp.name} — what the file says, not measured in the app.${imp.skipped.length ? ` ${imp.skipped.length} rows could not be read.` : ''}`],
    };
  }
  return { why: `“${id}” is not a source id — use list_sources or resolve_source for one.` };
}

async function resolveId(id: string, ctx: CapCtx): Promise<Resolved | { why: string }> {
  if (id.startsWith('file:') || id.startsWith('wb-') || !id.includes(':')) {
    const key = id.startsWith('file:') ? id.slice(5) : id;
    const all = await allSources();
    const s = all.find(x => x.id === key || x.facts.fileId === key);
    if (s) {
      if (s.facts.kind === 'workbook') {
        if (s.facts.status !== 'ready' && s.facts.status !== 'partial') return { why: `“${s.facts.name}” was not read (${s.facts.status}) — attach it again to read it.` };
        return { kind: 'workbook', source: s, fileId: s.facts.fileId, name: s.facts.name };
      }
      const d = await datasetFor(`import:${s.facts.fileId}`, ctx);
      return 'why' in d ? d : { kind: 'dataset', dataset: { ...d, name: s.facts.name }, source: s };
    }
    const c = await conversation(ctx);
    const wb = c.ok ? ((c.s.facts as { workbooks?: ColleagueWorkbook[] }).workbooks ?? []).find(w => w.id === key) : undefined;
    if (wb) return { kind: 'workbook', fileId: wb.id, name: wb.name };
    return { why: `There is no file “${id}” in the register — list_sources or resolve_source finds it.` };
  }
  const d = await datasetFor(id, ctx);
  return 'why' in d ? d : { kind: 'dataset', dataset: d };
}

/* ------------------------------------------------------------------ a question of any source, for the other capabilities (dig.ts) */
export interface SourceField { name: string; type: string; distinct?: number; unique?: boolean }
export type Asked = { ok: true; result: QueryResult; name: string; sheet?: string; kind: 'workbook' | 'dataset'; id: string; sourceId?: string; limits: string[] } | { ok: false; why: string; cannot?: CapResult };

/** What a source holds, field by field (its type, how many values) — the sheet's when it is a workbook. */
export async function fieldsOfSource(ctx: CapCtx, source: string, sheet?: string): Promise<{ ok: true; fields: SourceField[]; sheet?: string; name: string } | { ok: false; why: string }> {
  const r = await resolveId(source, ctx);
  if ('why' in r) return { ok: false, why: r.why };
  if (r.kind === 'workbook') {
    let p;
    try { p = await workbooks().profile(r.fileId); } catch { return { ok: false, why: `“${r.name}” is in the register, but its cells are not on this device — attach the file here to ask it.` }; }
    const sh = sheet ? p.sheets.find(x => x.name.toLowerCase() === sheet.toLowerCase()) : p.sheets.filter(x => x.read).length === 1 ? p.sheets.find(x => x.read) : undefined;
    if (!sh) return { ok: false, why: sheet ? `“${r.name}” has no sheet “${sheet}” — it has ${p.sheets.map(x => x.name).join(', ')}.` : `“${r.name}” has ${p.sheets.length} sheets (${p.sheets.map(x => x.name).join(', ')}) — say which.` };
    return { ok: true, name: r.name, sheet: sh.name, fields: sh.columns.map(c => ({ name: c.name, type: c.type, ...(c.distinct !== undefined ? { distinct: c.distinct } : {}), ...(c.unique ? { unique: true } : {}) })) };
  }
  const cov = fieldCoverage(r.dataset);
  return { ok: true, name: r.dataset.name, fields: cov.map(c => ({ name: c.name, type: c.type, distinct: c.type === 'text' || c.type === 'yes/no' ? new Set(r.dataset.rows.map(row => row[r.dataset.fields.findIndex(f => f.name === c.name)]).filter(v => v !== null && v !== '')).size : undefined })) };
}

/** One question of a source, worked by its own code — the result, or why it cannot be (a field it does not hold: `cannot`). */
export async function askSource(ctx: CapCtx, source: string, sheet: string | undefined, q: Omit<Query, 'sheet'>): Promise<Asked> {
  const r = await resolveId(source, ctx);
  if ('why' in r) return { ok: false, why: r.why };
  if (r.kind === 'workbook') {
    let p;
    try { p = await workbooks().profile(r.fileId); } catch { return { ok: false, why: `“${r.name}” is in the register, but its cells are not on this device — attach the file here to ask it.` }; }
    const sh = sheet ? p.sheets.find(x => x.name.toLowerCase() === sheet.toLowerCase()) : p.sheets.filter(x => x.read).length === 1 ? p.sheets.find(x => x.read) : undefined;
    if (!sh) return { ok: false, why: sheet ? `“${r.name}” has no sheet “${sheet}” — it has ${p.sheets.map(x => x.name).join(', ')}.` : `“${r.name}” has ${p.sheets.length} sheets (${p.sheets.map(x => x.name).join(', ')}) — say which.` };
    const miss = missingFields({ fields: sh.columns.map(cl => ({ name: cl.name, type: 'text' as const, means: '' })) }, q);
    if (miss.length) return { ok: false, why: 'cannot', cannot: cannot(r.name, miss, sh.columns.map(cl => cl.name), []) };
    try { return { ok: true, result: await workbooks().query(r.fileId, { ...q, sheet: sh.name }), name: r.name, sheet: sh.name, kind: 'workbook', id: r.fileId, ...(r.source ? { sourceId: r.source.id } : {}), limits: [] }; } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
  }
  const miss = missingFields(r.dataset, q);
  if (miss.length) return { ok: false, why: 'cannot', cannot: cannot(r.dataset.name, miss, r.dataset.fields.map(f => f.name), r.dataset.limits) };
  try { return { ok: true, result: runTable(r.dataset, q), name: r.dataset.name, kind: 'dataset', id: r.dataset.id, ...(r.source ? { sourceId: r.source.id } : {}), limits: r.dataset.limits }; } catch (e) { return { ok: false, why: e instanceof TableError ? e.message : String(e) }; }
}

/** A result kept on the conversation (a question asked by another capability — a change, a join), with its id. */
export async function keepResult(ctx: CapCtx, r: Omit<DataResult, 'id' | 'at'>): Promise<DataResult | { why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return { why: c.why };
  const kept: DataResult = { ...r, id: `R${uid().slice(0, 6)}`, at: ctx.now, result: { ...r.result, groups: r.result.groups.slice(0, GROUPS_KEPT) } };
  await writeOutputs(c.s.id, o => ({ results: [...o.results, kept].slice(-RESULTS_KEPT) }));
  return kept;
}
export const resultsOfConversation = async (ctx: CapCtx): Promise<Map<string, DataResult>> => {
  const c = await conversation(ctx);
  return c.ok ? resultMap(outputsOf(c.s)) : new Map();
};

/* ── list_sources ── */
export const listSources: Capability = {
  name: 'list_sources', title: 'What there is to look at', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lineId: ID('the line'), projectId: ID('the project'), client: { kind: 'string', label: 'the client', max: 120 } }),
  allowed: anyone,
  async run(ctx, input: { lineId?: string; projectId?: string; client?: string }): Promise<CapResult> {
    const name = await lineNames();
    const line = input.lineId ? await getWorkspace(input.lineId) : undefined;
    const client = input.client?.trim() || line?.clientName?.trim();
    const files = (await allSources()).filter(s => !client || !s.facts.client || s.facts.client.toLowerCase() === client.toLowerCase());
    const native: { id: string; name: string; rows: number; limits: string[] }[] = [];
    if (line) {
      for (const k of ['stops', 'tests', 'problems', 'production'] as const) { const d = await datasetFor(`${k}:${line.id}`, ctx); if (!('why' in d) && (k !== 'production' || d.rows.length)) native.push({ id: d.id, name: d.name, rows: d.rows.length, limits: d.limits }); }
      for (const s of (await listAllStudies()).filter(x => x.workspaceId === line.id && !x.deletedAt && Array.isArray(x.facts?.readings) && (x.facts.readings as unknown[]).length)) native.push({ id: `readings:${s.id}`, name: `${s.name} — readings`, rows: (s.facts.readings as { struck?: boolean }[]).filter(r => !r.struck).length, limits: [] });
    }
    const says = [
      files.length ? `${plural(files.length, 'file')} in the register${client ? ` for ${client} (or none named)` : ''}: ${files.slice(0, 12).map(s => sourceSaid(s, name)).join('; ')}.` : `No file in the register${client ? ` for ${client}` : ''}.`,
      line ? `${line.name}’s own records: ${native.map(n => `${n.name} — ${plural(n.rows, 'row')} [${n.id}]`).join('; ') || 'none'}.` : 'Give a line to list its own records (stops, program trials, problems, study readings).',
    ].join(' ');
    return { ok: true, says, refs: line ? [lineRef(line)] : [], data: { files: files.map(s => ({ id: s.id, name: s.facts.name, fileName: s.facts.fileName, at: s.at, status: s.facts.status, description: s.facts.description ?? null, line: name(s.lineId) ?? null, sheets: (s.facts.sheets ?? []).map(x => x.name) })), records: native } };
  },
};

/* ── resolve_source ── */
export const resolveSourceCap: Capability = {
  name: 'resolve_source', title: 'Which file', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'what the person called it', required: true, max: 200 } }),
  allowed: anyone,
  async run(ctx, input: { words: string }): Promise<CapResult> {
    const name = await lineNames();
    const all = await allSources();
    const r = resolveSource(all, input.words, ctx.now, name);
    if ('none' in r) return { ok: true, says: `No file in the register matches “${input.words}”${all.length ? ` — there ${all.length === 1 ? 'is' : 'are'} ${plural(all.length, 'file')}: ${all.slice(0, 8).map(s => `“${s.facts.name}”`).join(', ')}` : ''}. Say so; never pick one.`, refs: [], data: { match: 'none' } };
    if ('ask' in r) return { ok: true, says: `More than one file could be meant by “${input.words}”: ${r.ask.map(s => sourceSaid(s, name)).join('; ')}. Ask which, naming each — never pick one.`, refs: [], data: { match: 'ask', candidates: r.ask.map(s => ({ id: s.id, name: s.facts.name, fileName: s.facts.fileName, at: s.at })) } };
    const why = matchSources(all, input.words, ctx.now, name)[0]?.why ?? [];
    return { ok: true, says: `“${input.words}” is ${sourceSaid(r.one, name)} (matched by ${why.join(', ') || 'its name'}).`, refs: [], data: { match: 'one', id: r.one.id } };
  },
};

/* ── name_source ── */
interface NameIn { sourceId: string; name?: string; suggested?: boolean; description?: string; lineId?: string; projectId?: string; client?: string; machine?: string }
export const nameSource: Capability = {
  name: 'name_source', title: 'Name the file', kind: 'write',
  validate: raw => {
    const c = checkObject(raw, {
      sourceId: ID('the file', true), name: { kind: 'string', label: 'its name', max: 120 }, suggested: { kind: 'bool', label: 'whether Luna suggested the name' },
      description: { kind: 'string', label: 'what it holds', max: 400 }, lineId: ID('the line'), projectId: ID('the project'),
      client: { kind: 'string', label: 'the client', max: 120 }, machine: { kind: 'string', label: 'the machine', max: 120 },
    });
    if (c.ok && !['name', 'description', 'lineId', 'projectId', 'client', 'machine'].some(k => (c.input as Record<string, unknown>)[k])) return { ok: false, why: 'Say what to set — a name, a description, or what it is about.' };
    return c;
  },
  allowed: (ctx: CapCtx, input: NameIn) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: NameIn) {
    const s = (await allSources()).find(x => x.id === input.sourceId);
    const line = input.lineId ? await getWorkspace(input.lineId) : undefined;
    const bits = [input.name ? `call it “${input.name.trim()}”${input.suggested ? ' (Luna’s suggestion)' : ''}` : '', input.description ? `describe it as “${input.description.trim()}”` : '', line ? `put it on ${line.name}` : '', input.client ? `for ${input.client}` : '', input.machine ? `about the ${input.machine}` : ''].filter(Boolean);
    return `For ${s ? `“${s.facts.name}” (${s.facts.fileName})` : 'the file'}: ${bits.join(', ')}. Its contents are not changed.`;
  },
  async run(ctx, input: NameIn): Promise<CapResult> {
    const s = (await allSources()).find(x => x.id === input.sourceId);
    if (!s) return { ok: false, why: 'There is no such file in the register.' };
    const clash = input.name ? (await allSources()).find(x => x.id !== s.id && x.facts.name.trim().toLowerCase() === input.name?.trim().toLowerCase()) : undefined;
    if (clash) return { ok: false, why: `Another file is already called “${clash.facts.name}” (${clash.facts.fileName}) — pick a name that tells them apart.` };
    if (input.lineId && !(await getWorkspace(input.lineId))) return { ok: false, why: 'There is no line with that id.' };
    await patchStudy(s.id, cur => {
      const sf = (cur.facts as { source: SourceFacts }).source;
      const next: SourceFacts = { ...sf, ...(input.name ? { name: input.name.trim(), named: input.suggested ? 'suggested' : 'person' } : {}), ...(input.description ? { description: input.description.trim(), describedBy: input.suggested ? 'luna' : 'person' } : {}), ...(input.client ? { client: input.client.trim() } : {}), ...(input.machine ? { machine: input.machine.trim() } : {}) };
      return { ...(input.name ? { name: next.name } : {}), ...(input.lineId ? { workspaceId: input.lineId } : {}), ...(input.projectId ? { projectId: input.projectId } : {}), facts: { ...cur.facts, source: next } as ToolStudy['facts'] };
    });
    const now = (await allSources()).find(x => x.id === s.id) as Source;
    void ctx;
    return { ok: true, says: `The file is ${sourceSaid(now, await lineNames())}.`, refs: [] };
  },
};

/* ── source_fields ── */
export const sourceFields: Capability = {
  name: 'source_fields', title: 'What a source holds', kind: 'read',
  validate: raw => checkObject(raw, { source: { kind: 'string', label: 'the source id', required: true, max: 120 }, sheet: { kind: 'string', label: 'the sheet', max: 120 } }),
  allowed: anyone,
  async run(ctx, input: { source: string; sheet?: string }): Promise<CapResult> {
    const r = await resolveId(input.source, ctx);
    if ('why' in r) return { ok: false, why: r.why };
    if (r.kind === 'workbook') {
      let p;
      try { p = await workbooks().profile(r.fileId); } catch { return { ok: true, says: `“${r.name}” is in the register, but its cells are not on this device — it was read on another device. Attach the file here to ask it; nothing can be said of its figures until then.`, refs: [], data: { onDevice: false } }; }
      const sheets = input.sheet ? p.sheets.filter(s => s.name.toLowerCase() === input.sheet?.toLowerCase()) : p.sheets.filter(s => s.read);
      if (!sheets.length) return { ok: false, why: `“${r.name}” has no sheet “${input.sheet}” — it has ${p.sheets.map(s => s.name).join(', ')}.` };
      const says = sheets.map(s => `${s.name} (${s.rows.toLocaleString('en-GB')} rows): ${s.columns.map(c => `${c.name} — ${c.type}${c.counts.blank ? `, ${c.counts.blank.toLocaleString('en-GB')} blank` : ''}${c.counts.text && c.type === 'number' ? `, ${c.counts.text} words` : ''}`).join('; ')}`).join(' · ');
      return { ok: true, says: `“${r.name}” holds — ${says}.${p.notRead.length ? ` Not read: ${p.notRead.map(x => x.what).join(', ')}.` : ''}`, refs: [], data: { sheets: sheets.map(s => ({ name: s.name, rows: s.rows, fields: s.columns.map(c => ({ name: c.name, type: c.type, blank: c.counts.blank, words: c.type === 'number' ? c.counts.text : 0 })) })) } };
    }
    const cov = fieldCoverage(r.dataset);
    return {
      ok: true, refs: [],
      says: `${r.dataset.name} (${plural(r.dataset.rows.length, 'row')}) holds — ${cov.map(c => `${c.name} (${c.type}${c.unit ? `, ${c.unit}` : ''}): recorded on ${c.recorded} of ${c.of}${c.calc ? `, worked out as ${c.calc}` : ''}${c.top?.length ? `; e.g. ${c.top.slice(0, 4).map(([v, n]) => `${v} ×${n}`).join(', ')}` : ''}`).join('; ')}. What it cannot hold: ${r.dataset.limits.join(' ')}`,
      data: { fields: cov, limits: r.dataset.limits },
    };
  },
};

/* ── query_data ── */
type QIn = Omit<Query, 'sheet'> & { source: string; sheet?: string; title: string; from?: string };
const MEASURE_OPS = ['sum', 'avg', 'min', 'max', 'count', 'distinct'];
const FILTER_OPS = ['eq', 'ne', 'in', 'gt', 'gte', 'lt', 'lte', 'between', 'contains', 'blank', 'notblank'];
function checkQuery(raw: unknown): Checked<QIn> {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return { ok: false, why: 'The question is missing.' };
  if (typeof o.source !== 'string' || !o.source.trim()) return { ok: false, why: 'source: the source id (from list_sources or resolve_source).' };
  if (typeof o.title !== 'string' || !o.title.trim()) return { ok: false, why: 'title: what the result is, in a few words ("Downtime minutes by shift").' };
  const measures = Array.isArray(o.measures) ? o.measures as { op?: string; column?: string }[] : [];
  if (!measures.length || measures.length > 6 || measures.some(m => !MEASURE_OPS.includes(String(m?.op)) || (m.op !== 'count' && typeof m.column !== 'string'))) return { ok: false, why: 'measures: one to six of sum, avg, min, max, count or distinct, each with its field (count may have none).' };
  const filters = Array.isArray(o.filters) ? o.filters as { column?: string; op?: string }[] : [];
  if (filters.length > 8 || filters.some(f => typeof f?.column !== 'string' || !FILTER_OPS.includes(String(f.op)))) return { ok: false, why: 'filters: up to eight, each a field and an op.' };
  const groupBy = Array.isArray(o.groupBy) ? o.groupBy.filter((g): g is string => typeof g === 'string').slice(0, 3) : [];
  const time = o.time && typeof o.time === 'object' ? o.time as { column?: string; by?: string } : undefined;
  if (time && (typeof time.column !== 'string' || !['day', 'week', 'month', 'year'].includes(String(time.by)))) return { ok: false, why: 'time: a date field and by day, week, month or year.' };
  return {
    ok: true,
    input: {
      source: o.source.trim(), title: o.title.trim().slice(0, 120), measures: measures as Query['measures'], filters: filters as Query['filters'], groupBy,
      ...(time ? { time: time as Query['time'] } : {}), ...(typeof o.sheet === 'string' ? { sheet: o.sheet } : {}),
      ...(o.order && typeof o.order === 'object' ? { order: o.order as Query['order'] } : {}),
      limit: typeof o.limit === 'number' ? Math.max(1, Math.min(50, Math.round(o.limit))) : 25,
      ...(typeof o.from === 'string' ? { from: o.from } : {}),
    },
  };
}
const n2 = (v: number | string | null) => (v === null ? 'not recorded' : typeof v === 'number' ? (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-GB') : String(Math.round(v * 100) / 100)) : v);
export function resultSaid(r: QueryResult, max = 12): string {
  const head = `${r.rowsMatched.toLocaleString('en-GB')} of ${r.rowsScanned.toLocaleString('en-GB')} rows`;
  if (!r.groups.length) return `${head}: ${r.measures.map((m, i) => `${m} ${n2(r.totals[i])}`).join(', ')}.`;
  return `${head}; ${r.groups.slice(0, max).map(g => `${g.key.join(' · ')}: ${g.values.map(n2).join(', ')}`).join('; ')}${r.groupsTotal > max ? `; … ${r.groupsTotal - max} more groups` : ''}. Totals: ${r.measures.map((m, i) => `${m} ${n2(r.totals[i])}`).join(', ')}.`;
}

export const queryData: Capability = {
  name: 'query_data', title: 'Work it out', kind: 'read',
  validate: raw => checkQuery(raw),
  allowed: anyone,
  async run(ctx, input: QIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const r = await resolveId(input.source, ctx);
    if ('why' in r) return { ok: false, why: r.why };
    const { source: _s, title, from, sheet, ...q } = input;
    let result: QueryResult, srcName: string, sheetName: string | undefined;
    if (r.kind === 'workbook') {
      let p;
      try { p = await workbooks().profile(r.fileId); } catch { return { ok: true, says: `“${r.name}” is in the register, but its cells are not on this device — attach the file here to ask it. Nothing can be said of its figures until then.`, refs: [], data: { answered: false, why: 'not on this device' } }; }
      const sh = sheet ? p.sheets.find(s => s.name.toLowerCase() === sheet.toLowerCase()) : p.sheets.filter(s => s.read).length === 1 ? p.sheets.find(s => s.read) : undefined;
      if (!sh) return { ok: false, why: sheet ? `“${r.name}” has no sheet “${sheet}” — it has ${p.sheets.map(s => s.name).join(', ')}.` : `“${r.name}” has ${p.sheets.length} sheets (${p.sheets.map(s => s.name).join(', ')}) — say which.` };
      const fieldsOf = { fields: sh.columns.map(cl => ({ name: cl.name, type: 'text' as const, means: '' })) };
      const miss = missingFields(fieldsOf, q);
      if (miss.length) return cannot(r.name, miss, sh.columns.map(cl => cl.name), []);
      try { result = await workbooks().query(r.fileId, { ...q, sheet: sh.name }); } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
      srcName = r.name; sheetName = sh.name;
    } else {
      const miss = missingFields(r.dataset, q);
      if (miss.length) return cannot(r.dataset.name, miss, r.dataset.fields.map(f => f.name), r.dataset.limits);
      try { result = runTable(r.dataset, q); } catch (e) { return { ok: false, why: e instanceof TableError ? e.message : String(e) }; }
      srcName = r.dataset.name;
    }
    const kept: DataResult = {
      id: `R${uid().slice(0, 6)}`, title, at: ctx.now, query: { ...q, ...(sheetName ? { sheet: sheetName } : {}) },
      source: { kind: r.kind, id: r.kind === 'workbook' ? r.fileId : r.dataset.id, name: srcName, ...(sheetName ? { sheet: sheetName } : {}), ...(r.source ? { sourceId: r.source.id } : {}) },
      result: { ...result, groups: result.groups.slice(0, GROUPS_KEPT) },
      ...(from ? { from } : {}),
    };
    await writeOutputs(c.s.id, o => ({ results: [...o.results, kept].slice(-RESULTS_KEPT) }));
    const empty = result.rowsMatched === 0;
    const says = `${title} [result ${kept.id}] — from ${srcName}${sheetName ? ` › ${sheetName}` : ''}: ${empty ? 'no row matches — nothing to say, which is not the same as zero.' : resultSaid(result)}${result.skipped.length ? ` Could not use: ${result.skipped.map(s => `${s.count} in ${s.measure} (${s.refs.slice(0, 3).join(', ')})`).join('; ')}.` : ''}${result.notes.length ? ` ${result.notes.join(' ')}` : ''}${r.kind === 'dataset' && r.dataset.limits.length ? ` (${r.dataset.limits[0]})` : ''}`;
    return { ok: true, says, refs: [], data: { resultId: kept.id, result: kept.result } };
  },
};
function cannot(name: string, miss: string[], holds: string[], limits: string[]): CapResult {
  return {
    ok: true, refs: [],
    says: `This cannot be answered from ${name}: it holds no ${miss.map(m => `“${m}”`).join(', ')}. It holds ${holds.join(', ')}.${limits.length ? ` ${limits.join(' ')}` : ''} Say so plainly — what is missing and what would be needed to answer it — and never put a figure in its place.`,
    data: { answered: false, missing: miss, holds },
  };
}

/* ── make_chart / refine_chart ── */
const CHART_TYPES = ['bar', 'column', 'line', 'pie', 'pareto'];
const specFields = {
  type: { kind: 'enum' as const, label: 'the kind of chart', values: CHART_TYPES },
  title: { kind: 'string' as const, label: 'its title', max: 120 },
  measure: { kind: 'int' as const, label: 'which measure (0 for the first)', min: 0, max: 5 },
  percent: { kind: 'bool' as const, label: 'as percentages of the total shown' },
  exclude: { kind: 'strings' as const, label: 'categories left out', max: 30 },
  only: { kind: 'strings' as const, label: 'only these categories', max: 30 },
  top: { kind: 'int' as const, label: 'only the largest n', min: 1, max: 50 },
  target: { kind: 'num' as const, label: 'a target line' },
  targetLabel: { kind: 'string' as const, label: 'what the target is', max: 60 },
  compareResultId: { kind: 'string' as const, label: 'a result to compare with', max: 40 },
  compareLabel: { kind: 'string' as const, label: 'what the comparison is', max: 60 },
  unit: { kind: 'string' as const, label: 'the unit', max: 30 },
  xLabel: { kind: 'string' as const, label: 'the label along the bottom', max: 60 },
  yLabel: { kind: 'string' as const, label: 'the label up the side', max: 60 },
};
function chartSays(c: Chart, results: ReadonlyMap<string, DataResult>, change: string): CapResult {
  const spec = chartNow(c);
  const s = seriesOf(spec, results);
  if ('why' in s) return { ok: false, why: s.why };
  return { ok: true, says: `Chart ${c.id} v${c.versions.length} — ${change}: ${s.labels.map((l, i) => `${l} ${s.values[i] === null ? 'not recorded' : `${s.values[i]}${s.unit === '%' ? '%' : ''}`}`).join(', ')}.${s.finding ? ` What it shows (drawn on it): ${s.finding}` : ''}${s.notes.length ? ` ${s.notes.join(' ')}` : ''} It is shown in the conversation with its download.`, refs: [{ kind: 'chart', id: `${c.id}@${c.versions.length}`, label: spec.title, href: '' }], data: { chartId: c.id, version: c.versions.length } };
}

export const makeChart: Capability = {
  name: 'make_chart', title: 'Make a chart', kind: 'local',
  validate: raw => checkObject(raw, { resultId: { kind: 'string', label: 'the result to draw', required: true, max: 40 }, ...specFields }),
  allowed: anyone,
  async run(ctx, input: Partial<ChartSpec> & { resultId: string }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const o = outputsOf(c.s);
    const res = resultMap(o);
    const r = res.get(input.resultId);
    if (!r) return { ok: false, why: `There is no result ${input.resultId} in this conversation — work it out with query_data first; a chart is drawn only from a result.` };
    if (input.compareResultId && !res.has(input.compareResultId)) return { ok: false, why: `There is no result ${input.compareResultId} to compare with.` };
    const spec: ChartSpec = { type: 'column', measure: 0, title: r.title, ...stripUndefined(input), resultId: input.resultId } as ChartSpec;
    const chart: Chart = { id: `C${uid().slice(0, 6)}`, versions: [spec], at: ctx.now };
    const check = seriesOf(spec, res);
    if ('why' in check) return { ok: false, why: check.why };
    await writeOutputs(c.s.id, x => ({ charts: [...x.charts, chart].slice(-40) }));
    return chartSays(chart, res, specChange(undefined, spec));
  },
};

export const refineChart: Capability = {
  name: 'refine_chart', title: 'Change the chart', kind: 'local',
  validate: raw => checkObject(raw, { chartId: { kind: 'string', label: 'the chart', required: true, max: 40 }, resultId: { kind: 'string', label: 'another result to draw', max: 40 }, back: { kind: 'enum', label: 'back to', values: ['previous', 'original'] }, clear: { kind: 'strings', label: 'settings to take off', max: 10 }, ...specFields }),
  allowed: anyone,
  async run(ctx, input: Partial<ChartSpec> & { chartId: string; back?: 'previous' | 'original'; clear?: string[] }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const o = outputsOf(c.s);
    const res = resultMap(o);
    const chart = chartMap(o).get(input.chartId);
    if (!chart) return { ok: false, why: `There is no chart ${input.chartId} in this conversation.` };
    const now = chartNow(chart);
    let next: ChartSpec;
    if (input.back) {
      if (chart.versions.length < 2) return { ok: false, why: 'The chart has had no change to go back from.' };
      next = input.back === 'original' ? chart.versions[0] : chart.versions[chart.versions.length - 2];
    } else {
      const { chartId: _c, back: _b, clear, ...change } = input;
      next = { ...now, ...stripUndefined(change) } as ChartSpec;
      for (const k of clear ?? []) delete (next as unknown as Record<string, unknown>)[k];
      if (change.resultId && !res.has(change.resultId)) return { ok: false, why: `There is no result ${change.resultId} in this conversation.` };
      if (change.compareResultId && !res.has(change.compareResultId)) return { ok: false, why: `There is no result ${change.compareResultId} to compare with.` };
    }
    const check = seriesOf(next, res);
    if ('why' in check) return { ok: false, why: check.why };
    const nc: Chart = { ...chart, versions: [...chart.versions, next].slice(-30) };
    await writeOutputs(c.s.id, x => ({ charts: x.charts.map(y => (y.id === chart.id ? nc : y)) }));
    return chartSays(nc, res, input.back ? `back to the ${input.back} (${specChange(now, next)})` : specChange(now, next));
  },
};
function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}

/* ── build_report ── */
interface ReportIn { reportId?: string; title?: string; form?: 'report' | 'presentation'; op?: 'add' | 'replace' | 'remove' | 'move'; sectionId?: string; after?: string; section?: Partial<ReportSection> }
export const buildReport: Capability = {
  name: 'build_report', title: 'Build the report', kind: 'local',
  validate: raw => checkObject(raw, {
    reportId: { kind: 'string', label: 'the report (none: a new one)', max: 40 }, title: { kind: 'string', label: 'its title', max: 140 },
    form: { kind: 'enum', label: 'report or presentation', values: ['report', 'presentation'] },
    op: { kind: 'enum', label: 'what to do to a section', values: ['add', 'replace', 'remove', 'move'] },
    sectionId: { kind: 'string', label: 'the section', max: 40 }, after: { kind: 'string', label: 'after which section (start for first)', max: 40 },
    section: { kind: 'object', label: 'the section', fields: {
      kind: { kind: 'enum', label: 'its kind', values: ['summary', 'finding', 'chart', 'table', 'recommendation', 'text'] },
      heading: { kind: 'string', label: 'its heading', max: 140 }, text: { kind: 'string', label: 'its words', max: 6000 },
      chartId: { kind: 'string', label: 'the chart', max: 40 }, resultId: { kind: 'string', label: 'the result', max: 40 },
      evidence: { kind: 'strings', label: 'the results it rests on', max: 10 }, by: { kind: 'enum', label: 'whose view', values: ['luna', 'person'] },
    } },
  }),
  allowed: anyone,
  async run(ctx, input: ReportIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const o = outputsOf(c.s);
    const res = resultMap(o), ch = chartMap(o);
    let r = input.reportId ? o.reports.find(x => x.id === input.reportId) : undefined;
    if (input.reportId && !r) return { ok: false, why: `There is no report ${input.reportId} in this conversation.` };
    const said: string[] = [];
    if (!r) {
      if (!input.title?.trim()) return { ok: false, why: 'A new report needs its title.' };
      r = { id: `D${uid().slice(0, 6)}`, title: input.title.trim(), form: input.form ?? 'report', sections: [], at: ctx.now, updated: ctx.now, version: 1 };
      said.push(`Started ${r.form === 'presentation' ? 'the presentation' : 'the report'} “${r.title}” [report ${r.id}]`);
    } else {
      if (input.title?.trim() && input.title.trim() !== r.title) { const t = applyReportOp(r, { op: 'title', title: input.title }, res, ch, () => `S${uid().slice(0, 5)}`, ctx.now); if (t.ok) { r = t.r; said.push(t.says); } }
      if (input.form && input.form !== r.form) { const t = applyReportOp(r, { op: 'form', form: input.form }, res, ch, () => `S${uid().slice(0, 5)}`, ctx.now); if (t.ok) { r = t.r; said.push(t.says); } }
    }
    if (input.op) {
      const op: ReportOp | undefined =
        input.op === 'add' ? (input.section?.kind && input.section.heading ? { op: 'add', section: { ...(input.section as ReportSection) }, ...(input.after ? { after: input.after } : {}) } : undefined)
          : input.op === 'replace' ? (input.sectionId ? { op: 'replace', sectionId: input.sectionId, section: input.section ?? {} } : undefined)
            : input.op === 'remove' ? (input.sectionId ? { op: 'remove', sectionId: input.sectionId } : undefined)
              : input.sectionId && input.after ? { op: 'move', sectionId: input.sectionId, after: input.after } : undefined;
      if (!op) return { ok: false, why: input.op === 'add' ? 'A section to add needs its kind and heading.' : `To ${input.op} a section, give its id${input.op === 'move' ? ' and where it goes (after)' : ''}.` };
      const t = applyReportOp(r, op, res, ch, () => `S${uid().slice(0, 5)}`, ctx.now);
      if (!t.ok) return { ok: false, why: t.why };
      r = t.r; said.push(t.says);
    }
    const final = r;
    await writeOutputs(c.s.id, x => ({ reports: [...x.reports.filter(y => y.id !== final.id), final] }));
    const flagged = final.sections.filter(s => s.unbacked?.length);
    return { ok: true, says: `${said.join(' ')} — ${final.form} “${final.title}” [report ${final.id}] v${final.version}, ${plural(final.sections.length, 'section')}: ${final.sections.map(s => `${s.heading} [${s.id}, ${s.kind}]`).join('; ') || 'none yet'}.${flagged.length ? ` Check this on ${flagged.map(s => `“${s.heading}” (${s.unbacked?.join(', ')})`).join('; ')} — figures not in its results.` : ''} The person downloads it from its card in the conversation.`, refs: [{ kind: 'convreport', id: `${final.id}@${final.version}`, label: final.title, href: '' }], data: { reportId: final.id, version: final.version } };
  },
};

/* ── outputs_state ── */
export const outputsState: Capability = {
  name: 'outputs_state', title: 'What we have made', kind: 'read',
  validate: raw => checkObject(raw ?? {}, {}),
  allowed: anyone,
  async run(ctx): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return { ok: true, says: 'No conversation is open.', refs: [] };
    return { ok: true, says: outputsText(outputsOf(c.s)) || 'Nothing made in this conversation yet — no result, chart or report.', refs: [] };
  },
};

/** The conversation's outputs in words, newest first — sent with every turn so "that", "the previous graph" and "the other file" have
 *  something to point at. */
export function outputsText(o: Required<DataFacts>): string {
  const res = resultMap(o);
  const lines: string[] = [];
  for (const r of [...o.results].reverse().slice(0, 10)) lines.push(`Result ${r.id}: ${r.title} — ${r.source.name}${r.source.sheet ? ` › ${r.source.sheet}` : ''}${r.from ? ` (asked from ${r.from})` : ''}`);
  for (const c of [...o.charts].reverse().slice(0, 6)) { const s = chartNow(c); lines.push(`Chart ${c.id} v${c.versions.length}: ${s.title} — a ${s.type} of result ${s.resultId}${s.percent ? ', percentages' : ''}${s.exclude?.length ? `, without ${s.exclude.join(', ')}` : ''}${s.only?.length ? `, only ${s.only.join(', ')}` : ''}${s.top ? `, top ${s.top}` : ''}${s.compareResultId ? `, compared with ${s.compareResultId}` : ''}${res.has(s.resultId) ? '' : ' (its result is gone)'}`); }
  for (const r of [...o.reports].reverse().slice(0, 3)) lines.push(`${r.form === 'presentation' ? 'Presentation' : 'Report'} ${r.id} v${r.version}: “${r.title}” — ${r.sections.map(s => `${s.heading} [${s.id}, ${s.kind}${s.unbacked?.length ? ', CHECK THIS' : ''}]`).join('; ') || 'no sections yet'}`);
  return lines.join('\n');
}
export const outputsOfConversation = outputsOf;

/* ── refresh_report (docs/LUNA-NEXT.md L5) ── */
/** The clients a conversation's subjects are about — to keep one client's report from being copied into another's conversation. */
async function clientsOf(s: ToolStudy | undefined): Promise<Set<string>> {
  const out = new Set<string>();
  for (const t of ((s?.facts as { threads?: { scope?: { lineId?: string } }[] } | undefined)?.threads ?? [])) {
    const w = t.scope?.lineId ? await getWorkspace(t.scope.lineId) : undefined;
    if (w?.clientName?.trim()) out.add(w.clientName.trim().toLowerCase());
  }
  return out;
}
interface RefreshIn { reportId: string; fromConversation?: string; title?: string }
export const refreshReport: Capability = {
  name: 'refresh_report', title: 'Bring the report up to date', kind: 'local',
  validate: raw => checkObject(raw, { reportId: { kind: 'string', label: 'the report', required: true, max: 40 }, fromConversation: { kind: 'string', label: 'the earlier conversation it is in', max: 80 }, title: { kind: 'string', label: 'the new report\'s title', max: 140 } }),
  allowed: anyone,
  async run(ctx, input: RefreshIn): Promise<CapResult> {
    const here = await conversation(ctx);
    if (!here.ok) return here;
    const away = input.fromConversation && input.fromConversation !== here.s.id ? await getStudy(input.fromConversation) : undefined;
    if (input.fromConversation && input.fromConversation !== here.s.id) {
      if (!away || away.deletedAt || away.tool !== 'talk' || !(away.facts as { colleague?: boolean }).colleague) return { ok: false, why: 'That earlier conversation is not on this device.' };
      const [a, b] = [await clientsOf(away), await clientsOf(here.s)];
      if (a.size && b.size && ![...a].some(x => b.has(x))) return { ok: false, why: 'That report is another client’s — it is never copied into this one.' };
    }
    const src = outputsOf(away ?? here.s);
    const rep = src.reports.find(r => r.id === input.reportId);
    if (!rep) return { ok: false, why: `There is no report ${input.reportId} in ${away ? 'that conversation' : 'this conversation'}.` };
    const oldRes = resultMap(src), oldCharts = chartMap(src);
    /* every result the report rests on, asked again of the data as it is now */
    const used = new Set<string>();
    for (const sec of rep.sections) {
      if (sec.resultId) used.add(sec.resultId);
      for (const e of sec.evidence ?? []) used.add(e);
      const c = sec.chartId ? oldCharts.get(sec.chartId) : undefined;
      if (c) { used.add(chartNow(c).resultId); if (chartNow(c).compareResultId) used.add(chartNow(c).compareResultId as string); }
    }
    const map = new Map<string, string>();
    const moved: string[] = [], kept: string[] = [];
    const joins: DataResult[] = [];
    const tot = (r: { result: QueryResult }) => r.result.totals.map(v => (typeof v === 'number' ? Math.round(v * 100) / 100 : v ?? 'not recorded')).join(', ');
    for (const id of used) {
      const r = oldRes.get(id);
      if (!r) continue;
      const q = r.query as Record<string, unknown>;
      if (q.join) { joins.push(r); continue; }
      let fresh: DataResult | undefined, why = '';
      if (q.explain) {
        const { explainChange } = await import('./dig');
        const x = await explainChange.run(ctx, q.explain);
        const nid = x.ok ? (x.data as { resultId?: string }).resultId : undefined;
        if (nid) fresh = resultMap(outputsOf((await getStudy(here.s.id)) as ToolStudy)).get(nid); else why = x.ok ? 'nothing to keep' : x.why;
      } else {
        const { sheet, ...qq } = q as Omit<Query, 'sheet'> & { sheet?: string };
        const a = await askSource(ctx, r.source.kind === 'workbook' ? r.source.sourceId ?? r.source.id : r.source.id, sheet ?? r.source.sheet, qq as Omit<Query, 'sheet'>);
        if (a.ok) { const k = await keepResult(ctx, { title: r.title, source: r.source, query: r.query, result: a.result, from: r.id }); if (!('why' in k)) fresh = k; else why = k.why; }
        else why = a.why === 'cannot' ? 'its source no longer holds a field it asks' : a.why;
      }
      if (fresh) { map.set(id, fresh.id); if (tot(fresh) !== tot(r)) moved.push(`“${r.title}” ${tot(r)} → ${tot(fresh)}`); }
      else kept.push(`“${r.title}” (${why})`);
    }
    for (const r of joins) {
      const j = (r.query as { join: { a: string; b: string; measureA: number; measureB: number; rules: { a: string; b: string }[] } }).join;
      const now = resultMap(outputsOf((await getStudy(here.s.id)) as ToolStudy));
      const a = now.get(map.get(j.a) ?? '') ?? oldRes.get(j.a), b = now.get(map.get(j.b) ?? '') ?? oldRes.get(j.b);
      const { joinResults } = await import('../lib/data/join');
      const x = a && b ? joinResults(a, b, j.measureA, j.measureB, j.rules) : { why: 'its two results are gone' };
      if ('why' in x) { kept.push(`“${r.title}” (${x.why})`); continue; }
      const k = await keepResult(ctx, { title: r.title, source: r.source, query: { join: { ...j, a: a?.id, b: b?.id } }, result: x.result, from: r.id });
      if (!('why' in k)) { map.set(r.id, k.id); if (tot(k) !== tot(r)) moved.push(`“${r.title}” ${tot(r)} → ${tot(k)}`); }
    }
    /* the charts drawn again from the new results, the sections pointed at them and their figures checked again */
    const cur = outputsOf((await getStudy(here.s.id)) as ToolStudy);
    const res = resultMap(cur);
    const newCharts: Chart[] = [];
    const chartFor = new Map<string, string>();
    for (const sec of rep.sections) {
      const c = sec.chartId ? oldCharts.get(sec.chartId) : undefined;
      if (!c || chartFor.has(c.id)) continue;
      const spec = chartNow(c);
      const next: ChartSpec = { ...spec, resultId: map.get(spec.resultId) ?? spec.resultId, ...(spec.compareResultId ? { compareResultId: map.get(spec.compareResultId) ?? spec.compareResultId } : {}) };
      if (!res.has(next.resultId)) { const old = oldRes.get(spec.resultId); if (old) res.set(old.id, old); }
      const nc: Chart = { id: `C${uid().slice(0, 6)}`, versions: [next], at: ctx.now };
      newCharts.push(nc); chartFor.set(c.id, nc.id);
    }
    /* a result kept as it was (not asked again) still stands behind its sections — carried over from the earlier conversation */
    for (const id of used) if (!map.has(id) && !res.has(id)) { const old = oldRes.get(id); if (old) res.set(id, old); }
    const charts = new Map([...chartMap(cur), ...newCharts.map(c => [c.id, c] as const)]);
    const sections: ReportSection[] = [];
    for (const sec of rep.sections) {
      const moved2: ReportSection = { ...sec, ...(sec.resultId ? { resultId: map.get(sec.resultId) ?? sec.resultId } : {}), ...(sec.evidence ? { evidence: sec.evidence.map(e => map.get(e) ?? e) } : {}), ...(sec.chartId ? { chartId: chartFor.get(sec.chartId) ?? sec.chartId } : {}) };
      const c = checkSection(moved2, res, charts);
      sections.push(c.ok ? c.s : moved2);
    }
    const carried = [...used].filter(id => !map.has(id) && !cur.results.some(r => r.id === id)).map(id => oldRes.get(id)).filter((r): r is DataResult => !!r);
    const same = !away;
    const next: ConvReport = same
      ? { ...rep, ...(input.title?.trim() ? { title: input.title.trim() } : {}), sections, updated: ctx.now, version: rep.version + 1 }
      : { id: `D${uid().slice(0, 6)}`, title: input.title?.trim() || rep.title, form: rep.form, sections, at: ctx.now, updated: ctx.now, version: 1 };
    await writeOutputs(here.s.id, o => ({ results: [...o.results, ...carried].slice(-RESULTS_KEPT), charts: [...o.charts, ...newCharts].slice(-40), reports: [...o.reports.filter(r => r.id !== next.id), next] }));
    const flagged = sections.filter(x => x.unbacked?.length);
    return {
      ok: true,
      says: `${same ? `Brought “${next.title}” up to date` : `Made “${next.title}” like the earlier report`} [report ${next.id}] v${next.version}: ${map.size} of ${used.size} result${used.size === 1 ? '' : 's'} asked again of the data as it is now.${moved.length ? ` Moved: ${moved.join('; ')}.` : ' No figure behind it has moved.'}${kept.length ? ` Kept as before: ${kept.join('; ')}.` : ''}${flagged.length ? ` Check this — words that no longer match their results: ${flagged.map(x => `“${x.heading}” (${x.unbacked?.join(', ')})`).join('; ')}. Rewrite them from the new results (build_report replace).` : ''}`,
      refs: [{ kind: 'convreport', id: `${next.id}@${next.version}`, label: next.title, href: '' }],
      data: { reportId: next.id, version: next.version, results: Object.fromEntries(map) },
    };
  },
};

/* ── earlier_reports ── */
export const earlierReports: Capability = {
  name: 'earlier_reports', title: 'Reports made before', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { words: { kind: 'string', label: 'words in its title', max: 120 } }),
  allowed: anyone,
  async run(ctx, input: { words?: string }): Promise<CapResult> {
    const here = ctx.conversationId ? await getStudy(ctx.conversationId) : undefined;
    const mine = await clientsOf(here);
    const words = (input.words ?? '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const out: { conversation: string; id: string; title: string; updated: number; sections: number; form: string }[] = [];
    for (const s of await listAllStudies()) {
      if (s.deletedAt || s.tool !== 'talk' || !(s.facts as { colleague?: boolean }).colleague) continue;
      const theirs = await clientsOf(s);
      if (mine.size && theirs.size && ![...theirs].some(x => mine.has(x))) continue;
      for (const r of outputsOf(s).reports) if (!words.length || words.some(w => r.title.toLowerCase().includes(w))) out.push({ conversation: s.id, id: r.id, title: r.title, updated: r.updated, sections: r.sections.length, form: r.form });
    }
    out.sort((a, b) => b.updated - a.updated);
    return { ok: true, refs: [], says: out.length ? `Reports made before (newest first): ${out.slice(0, 10).map(r => `“${r.title}” — ${r.form}, ${r.sections} sections, ${new Date(r.updated).toISOString().slice(0, 10)} [report ${r.id}${r.conversation === ctx.conversationId ? ', this conversation' : `, conversation ${r.conversation}`}]`).join('; ')}.` : 'No report has been made before for this client.', data: { reports: out.slice(0, 20) } };
  },
};

export const DATA: readonly Capability[] = [listSources, resolveSourceCap, nameSource, sourceFields, queryData, makeChart, refineChart, buildReport, outputsState, refreshReport, earlierReports];
