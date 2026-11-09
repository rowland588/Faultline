/* THE TOOL INTELLIGENCE CAPABILITIES (docs/AI-TOOL-INTELLIGENCE.md):
 *   tool_intel       what a tool does, cannot do, needs, how its evidence is got, and each operation's level — from intel/tools
 *   assess_evidence  for a tool on a line: what is already held, whether it is enough, what is missing and the best way to get it
 *   pareto           the Pareto from every source there is, each kept apart by how it is known (intel/pareto)
 *   import_table     the downtime files read in code on this conversation
 *   hand_over        a step only the person can do (level 3): their page opened, what to do said, the step kept on the subject
 *   handover_state   whether the record has moved since — read, never assumed */
import { getStudy, getWorkspace, listObservations, listStudiesForLine, patchStudy } from '../../db';
import type { ToolStudy } from '../../lib/study';
import { studyHref } from '../../lib/studyLinks';
import { checkObject, ID } from '../check';
import { anyone } from '../access';
import { conversation } from '../draftStore';
import { evidenceFor } from '../task';
import type { CapCtx, CapResult, Capability, ColleagueAwaiting, ColleagueImport, ColleagueThread } from '../types';
import { lineRef, notFound, plural } from '../util';
import { BASIS_WORD, paretoEvidence, sourcesFromObservations, type Source } from './pareto';
import { intelOf, TOOL_INTEL } from './tools';
import { INTERACTION_WORD, LEVEL_WORD, type Operation, type ToolIntel } from './types';

const DAY = 86_400_000;

/* ---------------------------------------------------------------- the conversation's subject and imports */

const threadsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueThread[] => {
  const t = (s.facts as { threads?: unknown }).threads;
  return Array.isArray(t) ? t as ColleagueThread[] : [];
};
const importsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueImport[] => {
  const t = (s.facts as { imports?: unknown }).imports;
  return Array.isArray(t) ? t as ColleagueImport[] : [];
};
async function here(ctx: CapCtx): Promise<{ s?: ToolStudy; cur?: ColleagueThread }> {
  if (!ctx.conversationId) return {};
  const c = await conversation(ctx);
  if (!c.ok) return {};
  return { s: c.s, cur: threadsOf(c.s).find(t => t.status === 'current') };
}

/** A downtime file read in code, kept on the conversation as imported evidence. Called by AI Mode when a file is attached. */
export async function keepImport(ctx: CapCtx, imp: Omit<ColleagueImport, 'id' | 'at'>): Promise<{ ok: true; id: string; says: string } | { ok: false; why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return { ok: false, why: c.why };
  const id = `imp-${ctx.now.toString(36)}`;
  await patchStudy(c.s.id, s => ({ facts: { ...s.facts, imports: [...importsOf(s), { ...imp, id, at: ctx.now }] } as ToolStudy['facts'] }));
  const cols = [imp.columns.minutes && `minutes (“${imp.columns.minutes}”)`, imp.columns.count && `counts (“${imp.columns.count}”)`, imp.columns.line && 'lines', imp.columns.date && 'dates'].filter(Boolean).join(', ');
  return { ok: true, id, says: `Read “${imp.name}” in code: ${plural(imp.rows.length, 'row')} with a reason (“${imp.columns.reason}”) and ${cols}${imp.skipped.length ? `; ${plural(imp.skipped.length, 'row')} left out — ${imp.skipped.slice(0, 3).join('; ')}` : ''}. Kept as imported evidence [${id}] — not added to the line’s timed stops.` };
}

/* ---------------------------------------------------------------- tool_intel */

const opSaid = (o: Operation): string => {
  const how = o.how?.length ? ` — ${o.how.join(' → ')}` : '';
  if (o.level === 3) return `${o.does}: ${LEVEL_WORD[3]} (${(o.interaction ?? []).map(i => INTERACTION_WORD[i]).join(', ')})${how}. Hand over: “${o.handover}”${o.why ? ` Why: ${o.why}.` : ''}`;
  if (o.level === 4) return `${o.does}: ${LEVEL_WORD[4]} — ${o.why}`;
  return `${o.does}: ${LEVEL_WORD[o.level]}${o.needs ? ` (needs ${o.needs})` : ''}${how}`;
};

export function intelSaid(t: ToolIntel): string {
  const sup = t.acquire.filter(a => a.status === 'supported'), not = t.acquire.filter(a => a.status !== 'supported');
  return [
    `${t.key}: ${t.does}`,
    `Answers: ${t.answers.join(' · ')}. Cannot answer: ${t.cannot.join(' · ')}.`,
    `Use when: ${t.when.join('; ')}.${t.notWhen.length ? ` Not when: ${t.notWhen.join('; ')}.` : ''}${t.instead.length ? ` Instead: ${t.instead.map(i => `${i.key} for ${i.when}`).join('; ')}.` : ''}`,
    `Needs: ${t.fields.filter(f => !f.derived).map(f => `${f.name}${f.required ? '' : ' (optional)'}`).join('; ')}. Works out: ${t.fields.filter(f => f.derived).map(f => f.name).join('; ') || '—'}.`,
    t.enough ? `Enough: ${t.enough.n} ${t.enough.of} — ${t.enough.why}.` : '',
    `Evidence by: ${sup.map(a => `${a.route} (${a.how})`).join('; ')}.${not.length ? ` Not by: ${not.map(a => `${a.route} — ${a.status === 'future' ? 'not yet' : 'not possible'}: ${a.how}`).join('; ')}.` : ''}`,
    `Operations: ${t.ops.map(opSaid).join(' | ')}`,
    t.assumptions.length ? `Assumes: ${t.assumptions.join('; ')}.` : '',
    t.quality.length ? `Quality: ${t.quality.join('; ')}.` : '',
  ].filter(Boolean).join('\n');
}

export const toolIntel: Capability = {
  name: 'tool_intel', title: 'What a tool can and cannot do', kind: 'read',
  validate: raw => checkObject(raw, { tool: { kind: 'string', label: 'the tool’s key', required: true, max: 40 } }),
  allowed: anyone,
  async run(_ctx, input: { tool: string }): Promise<CapResult> {
    const t = intelOf(input.tool);
    if (!t) return { ok: false, why: `No tool “${input.tool}”. Tools: ${TOOL_INTEL.map(x => x.key).join(', ')}.` };
    return { ok: true, says: intelSaid(t), data: t, refs: [] };
  },
};

/* ---------------------------------------------------------------- pareto */

type ReportedIn = { category: string; minutes?: number; stops?: number };
type ParetoIn = { lineId?: string; lineIds?: string[]; days?: number; from?: string; to?: string; importId?: string; reported?: ReportedIn[] };

const dayAt = (d: string) => Date.parse(`${d}T00:00:00`);

export const pareto: Capability = {
  name: 'pareto', title: 'Rank where the time goes', kind: 'read',
  validate(raw) {
    const { reported: _r, ...rest } = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    void _r;
    const c = checkObject(rest, {
      lineId: ID('the line'), lineIds: { kind: 'strings', label: 'the lines', max: 8 }, days: { kind: 'int', label: 'the days back', min: 1, max: 365 },
      from: { kind: 'string', label: 'from (YYYY-MM-DD)', max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ }, to: { kind: 'string', label: 'to (YYYY-MM-DD)', max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ },
      importId: ID('the file read'),
    });
    if (!c.ok) return c;
    const rep = (raw as { reported?: unknown }).reported;
    if (rep !== undefined) {
      if (!Array.isArray(rep) || rep.length > 40) return { ok: false, why: 'The figures said are a list of reasons, at most 40.' };
      const out: ReportedIn[] = [];
      for (const r of rep) {
        const o = r as Record<string, unknown>;
        const category = typeof o?.category === 'string' ? o.category.trim().slice(0, 80) : '';
        const minutes = typeof o?.minutes === 'number' && Number.isFinite(o.minutes) && o.minutes >= 0 ? o.minutes : undefined;
        const stops = typeof o?.stops === 'number' && Number.isInteger(o.stops) && o.stops >= 0 ? o.stops : undefined;
        if (!category) return { ok: false, why: 'Each figure said needs its reason.' };
        if (minutes === undefined && stops === undefined) return { ok: false, why: `“${category}” has no figure — the minutes or how many times, as said.` };
        out.push({ category, ...(minutes !== undefined ? { minutes } : {}), ...(stops !== undefined ? { stops } : {}) });
      }
      c.input.reported = out;
    }
    return c;
  },
  allowed: anyone,
  async run(ctx, input: ParetoIn): Promise<CapResult> {
    const { s, cur } = await here(ctx);
    const ids = input.lineIds?.length ? input.lineIds : [input.lineId ?? cur?.scope.lineId].filter((x): x is string => !!x);
    const lines = (await Promise.all(ids.map(id => getWorkspace(id)))).filter((w): w is NonNullable<typeof w> => !!w);
    if (ids.length && !lines.length) return notFound('line');
    /* to now inclusive — a stop said this very moment is in */
    const to = input.to ? dayAt(input.to) + DAY : ctx.now + 1;
    const from = input.from ? dayAt(input.from) : to - (input.days ?? 28) * DAY;
    if (!(from < to)) return { ok: false, why: 'The period ends before it begins.' };
    const sources: Source[] = [];
    let previous: Source | undefined;
    for (const w of lines) {
      const obs = await listObservations(w.id);
      for (const src of sourcesFromObservations(obs, from, to, () => w.name)) {
        const had = sources.find(x => x.basis === src.basis);
        if (had) had.rows.push(...src.rows); else sources.push(src);
      }
      const before = sourcesFromObservations(obs, from - (to - from), from, () => w.name).find(x => x.basis === 'measured');
      if (before) previous = previous ? { ...previous, rows: [...previous.rows, ...before.rows] } : before;
    }
    const imports = s ? importsOf(s) : [];
    const imp = input.importId ? imports.find(i => i.id === input.importId) : undefined;
    if (input.importId && !imp) return { ok: false, why: `No file read with id ${input.importId} on this conversation.` };
    if (imp) {
      const inPeriod = imp.rows.filter(r => r.at === undefined || (r.at >= from && r.at < to));
      sources.push({ basis: 'imported', label: `${BASIS_WORD.imported} (“${imp.name}”)`, rows: inPeriod, ...(imp.rows.some(r => r.at !== undefined) ? { from, to } : {}) });
    }
    if (input.reported?.length) sources.push({ basis: 'reported', label: 'said in this conversation (reported)', rows: input.reported.map(r => ({ category: r.category, ...(r.minutes !== undefined ? { mins: r.minutes } : {}), ...(r.stops !== undefined ? { events: r.stops } : {}) })) });
    const where = lines.length === 1 ? lines[0].name : lines.length ? `${plural(lines.length, 'line')}` : undefined;
    const ev = paretoEvidence(sources, { ...(where ? { where } : {}), ...(previous ? { previous } : {}) });
    const nothing = !ev.sources.length;
    const tail = nothing
      ? ` ${lines.length ? `The best way to get it: time the stops on ${lines[0].name} as they happen (start_measurement, stops) — or attach a downtime file, or say the figures you have.` : 'Name the line first.'} Do not draw a Pareto from the problem as said.`
      : ' Say this as it stands — never present reported or counted figures as timed.';
    return { ok: true, says: ev.says + tail, data: { ...ev, period: { from, to }, lines: lines.map(l => ({ id: l.id, name: l.name })), ranked: !nothing }, refs: lines.map(lineRef) };
  },
};

/* ---------------------------------------------------------------- import_table */

export const importTable: Capability = {
  name: 'import_table', title: 'Files read in this conversation', kind: 'read',
  validate: raw => checkObject(raw, { importId: ID('the file read') }),
  allowed: anyone,
  async run(ctx, input: { importId?: string }): Promise<CapResult> {
    const { s } = await here(ctx);
    const all = s ? importsOf(s) : [];
    const list = input.importId ? all.filter(i => i.id === input.importId) : all;
    if (!list.length) return { ok: true, says: input.importId ? `No file read with id ${input.importId}.` : 'No downtime file has been read in this conversation. The person can attach one (CSV or Excel) with the + button: a column of reasons and a column of minutes or counts.', data: { imports: [] }, refs: [] };
    return { ok: true, says: list.map(i => `“${i.name}” [${i.id}]: ${plural(i.rows.length, 'row')} — reason “${i.columns.reason}”${i.columns.minutes ? `, minutes “${i.columns.minutes}”` : ''}${i.columns.count ? `, count “${i.columns.count}”` : ''}${i.columns.line ? ', by line' : ''}${i.columns.date ? ', dated' : ''}${i.skipped.length ? `; ${plural(i.skipped.length, 'row')} left out` : ''}. Imported — use pareto with importId.`).join('\n'),
      data: { imports: list.map(i => ({ id: i.id, name: i.name, columns: i.columns, rows: i.rows.length, skipped: i.skipped })) }, refs: [] };
  },
};

/* ---------------------------------------------------------------- assess_evidence */

export const assessEvidence: Capability = {
  name: 'assess_evidence', title: 'What evidence there is', kind: 'read',
  validate: raw => checkObject(raw, { tool: { kind: 'string', label: 'the tool’s key', required: true, max: 40 }, lineId: ID('the line') }),
  allowed: anyone,
  async run(ctx, input: { tool: string; lineId?: string }): Promise<CapResult> {
    const t = intelOf(input.tool);
    if (!t) return { ok: false, why: `No tool “${input.tool}”.` };
    const { s, cur } = await here(ctx);
    const lineId = input.lineId ?? cur?.scope.lineId;
    const w = lineId ? await getWorkspace(lineId) : undefined;
    const imports = s ? importsOf(s) : [];
    let held = '', status: 'known' | 'old' | 'missing' = 'missing';
    if (w && t.key === 'stops') {
      const p = await pareto.run(ctx, { lineId: w.id });
      const d = p.ok ? p.data as { ranked: boolean; enough: { level: string }; lead?: { basis: string } } : undefined;
      status = d?.ranked ? 'known' : 'missing';
      held = p.ok ? p.says.split(' The best way')[0] : '';
    } else if (w) {
      const ev = await evidenceFor(w.id, [{ key: t.key, why: '' }], ctx.now);
      const st = ev?.steps[0];
      if (st) { status = st.status; held = st.status === 'missing' ? `Nothing of it on ${w.name} yet.` : `${plural(st.n, 'record')} on ${w.name}${st.days !== undefined ? `, the newest ${st.days} days old` : ''}${st.finding ? ` — ${st.finding}` : ''}.`; }
    }
    /* the best way to get what is missing: the records when they are there and fresh; else the first supported route */
    const sup = t.acquire.filter(a => a.status === 'supported');
    const best = status === 'known' ? sup.find(a => a.route === 'records') ?? sup[0] : sup.find(a => a.route === 'live') ?? sup.find(a => a.route !== 'records') ?? sup[0];
    const needs = t.fields.filter(f => f.required && !f.derived).map(f => f.name);
    const fileNote = t.key === 'stops' && imports.length ? ` A file has been read here (${imports.map(i => `“${i.name}” [${i.id}]`).join(', ')}) — pareto with importId ranks it as imported.` : '';
    const says = `${t.key}${w ? ` on ${w.name}` : ''}: ${w ? held || 'nothing held yet.' : 'no line in hand — name it first.'}${fileNote} It needs: ${needs.join('; ')}.${t.enough ? ` Enough is ${t.enough.n} ${t.enough.of}.` : ''} ${status === 'known' ? 'Work from what is held' : 'Best way to get it'}: ${best ? `${best.route} — ${best.how}` : 'none supported'}.${status !== 'known' ? ' Do not ask for figures typed by hand where the records or a live measurement can give them, and never present what is said as measured.' : ''}`;
    return { ok: true, says, data: { tool: t.key, status, held, needs, best, enough: t.enough, routes: t.acquire, ...(w ? { line: { id: w.id, name: w.name } } : {}) }, refs: w ? [lineRef(w)] : [] };
  },
};

/* ---------------------------------------------------------------- hand_over · handover_state */

type HandIn = { tool: string; op: string; studyId?: string; lineId?: string };

export const handOver: Capability = {
  name: 'hand_over', title: 'Hand a step to you', kind: 'local',
  validate: raw => checkObject(raw, { tool: { kind: 'string', label: 'the tool’s key', required: true, max: 40 }, op: { kind: 'string', label: 'the operation', required: true, max: 40 }, studyId: ID('the record'), lineId: ID('the line') }),
  allowed: anyone,
  async run(ctx, input: HandIn): Promise<CapResult> {
    const t = intelOf(input.tool);
    const o = t?.ops.find(x => x.id === input.op);
    if (!t || !o) return { ok: false, why: `No operation “${input.op}” on “${input.tool}” — tool_intel lists them.` };
    if (o.level !== 3) return { ok: false, why: o.level === 4 ? `That is not supported yet: ${o.why}` : `That one can be done in the conversation (${o.how?.join(', ')}) — no need to hand it over.` };
    const { s, cur } = await here(ctx);
    if (!s) return { ok: false, why: 'A hand-over is kept on a conversation — there is none here.' };
    let href: string | undefined, label = t.key;
    if (o.page === 'record') {
      if (!input.studyId) return { ok: false, why: 'Which record — give its studyId (make it or find it first).' };
      const st = await getStudy(input.studyId);
      if (!st || st.deletedAt) return notFound('record');
      href = studyHref(st); label = st.name;
    } else {
      const lineId = input.lineId ?? cur?.scope.lineId;
      if (!lineId) return { ok: false, why: 'Which line — name it first.' };
      const w = await getWorkspace(lineId);
      if (!w) return notFound('line');
      href = o.page === 'line' || !o.page ? `/lines/${w.id}${t.key === 'actions' ? '?view=actions' : ''}` : o.page; label = w.name;
    }
    const awaiting: ColleagueAwaiting = { tool: t.key, op: o.id, does: o.does, handover: o.handover ?? '', href, at: ctx.now, ...(input.studyId ? { studyId: input.studyId } : {}), ...(input.lineId ?? cur?.scope.lineId ? { lineId: input.lineId ?? cur?.scope.lineId } : {}) };
    if (cur) await patchStudy(s.id, x => ({ facts: { ...x.facts, threads: threadsOf(x).map(th => (th.id === cur.id ? { ...th, awaiting } : th)) } as ToolStudy['facts'] }));
    const ref = { kind: 'page' as const, id: href, label, href };
    return { ok: true, says: `Handed over — ${o.does}: ${o.handover} I can’t do this part: ${o.why ?? 'it is done by hand on the page'}. Its page is open. Once they say it is done, run handover_state and read the record (${o.after ?? 'what it now says'}).`, data: { awaiting, interaction: o.interaction }, refs: [ref], show: ref };
  },
};

export const handoverState: Capability = {
  name: 'handover_state', title: 'Has the handed-over step been done', kind: 'read',
  validate: raw => checkObject(raw, { done: { kind: 'enum', label: 'clear it once read', values: ['keep', 'clear'] } }),
  allowed: anyone,
  async run(ctx, input: { done?: 'keep' | 'clear' }): Promise<CapResult> {
    const { s, cur } = await here(ctx);
    const a = cur?.awaiting;
    if (!s || !cur || !a) return { ok: true, says: 'Nothing is handed over on this subject.', data: { awaiting: null }, refs: [] };
    let moved = false, said = '';
    if (a.studyId) {
      const st = await getStudy(a.studyId);
      moved = !!st && st.updatedAt > a.at;
      said = st ? `${st.name} was ${moved ? `changed ${Math.max(0, Math.round((ctx.now - st.updatedAt) / 60_000))} min ago` : 'not changed'} since it was handed over` : 'the record is gone';
    } else if (a.lineId) {
      const [studies, obs] = await Promise.all([listStudiesForLine(a.lineId), listObservations(a.lineId)]);
      const n = studies.filter(x => x.updatedAt > a.at).length + obs.filter(o => o.startedAt > a.at).length;
      moved = n > 0; said = moved ? `${plural(n, 'record')} on the line changed since` : 'nothing on the line changed since';
    }
    if (moved && input.done === 'clear') await patchStudy(s.id, x => ({ facts: { ...x.facts, threads: threadsOf(x).map(th => (th.id === cur.id ? { ...th, awaiting: undefined } : th)) } as ToolStudy['facts'] }));
    return { ok: true, says: `Handed over: ${a.does} (${a.tool}). ${said[0]?.toUpperCase() ?? ''}${said.slice(1)}. ${moved ? 'Read the record now and carry on from what it says.' : 'Not done yet — never assume it was; ask, or carry on with something else and come back.'}`, data: { awaiting: a, moved }, refs: [] };
  },
};

export const INTEL = [toolIntel, assessEvidence, pareto, importTable, handOver, handoverState];

