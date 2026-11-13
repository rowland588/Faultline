/* THE FIRST LOOK, KEPT AND USED AGAIN (13 November, docs/WORKBOOKS.md — the four things the Excel work was still missing).
 *   workLook            the first look worked (lib/workbook/firstLook) with what the customer's notebook says, and with the snapshots
 *                       of workbooks read before FOR THE SAME CUSTOMER — so the same report read again says what changed;
 *                       kept on the conversation (to make its pack, or read it again the same way) and its snapshot kept on the
 *                       file's record in the register (to be compared with next time, from any device);
 *   read_workbook_as    local   the person's word on how to read it — the sheet to start with, the row the headings are on, a
 *                       column's name, the column that is the result or the date — then the look again by that. Changes how the
 *                       workbook is understood on this device; never the file, never a record of the factory;
 *   workbook_pack       local   the look laid out as a report of the conversation (a PDF and slides from its card) — every chart from
 *                       a result asked of the rows; no AI asked.
 * One customer's snapshots are never offered to another's workbook. */
import { patchStudy } from '../db';
import { uid } from '../lib/ids';
import type { ToolStudy } from '../lib/study';
import { workbooks } from '../lib/workbook/client';
import { firstLook, noLook, type FirstLook, type LookOptions } from '../lib/workbook/firstLook';
import { lookPack, type KeptLook } from '../lib/workbook/lookPack';
import type { LookSnap } from '../lib/workbook/sinceLast';
import type { WorkbookProfile } from '../lib/workbook/read';
import type { SourceFacts } from '../lib/data/sources';
import { anyone } from './access';
import { checkObject, ID } from './check';
import { allSources, keepPack } from './data';
import { conversation } from './draftStore';
import { pick } from './workbook';
import type { CapCtx, CapResult, Capability } from './types';

type Kept = { snap?: LookSnap; client?: string };
const lc = (s: string) => s.trim().toLowerCase();
const looksOf = (s: Pick<ToolStudy, 'facts'>): KeptLook[] => { const l = (s.facts as { looks?: unknown }).looks; return Array.isArray(l) ? l as KeptLook[] : []; };

/** The snapshots of workbooks read before for this customer ('' = no customer said) — never another customer's. */
export async function earlierSnaps(client: string): Promise<LookSnap[]> {
  return (await allSources()).map(s => (s.facts as SourceFacts & { look?: Kept }).look).filter((k): k is Kept & { snap: LookSnap } => !!k?.snap && lc(k.client ?? '') === lc(client)).map(k => k.snap);
}

/** The look worked and kept: on the conversation, and its snapshot on the file's record. Nothing when the workbook has no table to lead with. */
export async function workLook(ctx: CapCtx, w: { id: string; name: string }, p: WorkbookProfile, o: { client: string; told?: readonly string[]; asked?: KeptLook['asked'] }): Promise<FirstLook | undefined> {
  const opts: LookOptions = { ...(o.told ? { told: o.told } : {}), ...(o.asked ?? {}), earlier: await earlierSnaps(o.client), now: ctx.now };
  const look = await firstLook(p, q => workbooks().query(w.id, q), opts);
  if (!look) return undefined;
  const kept: KeptLook = { workbookId: w.id, name: p.name, at: ctx.now, sheet: look.roles.sheet, headline: look.roles.headline as KeptLook['headline'], ...(look.roles.date ? { date: look.roles.date } : {}), dims: look.splitDims, parts: look.parts, total: look.snap.total, rows: look.snap.rows, ...(look.months.length ? { period: look.months.length === 1 ? look.months[0].label : `${look.months[0].label} to ${look.months[look.months.length - 1].label}` } : {}), ...(o.asked && Object.keys(o.asked).length ? { asked: o.asked } : {}) };
  const c = await conversation(ctx);
  if (c.ok) await patchStudy(c.s.id, s => ({ facts: { ...s.facts, looks: [...looksOf(s).filter(x => x.workbookId !== w.id), kept].slice(-6) } as ToolStudy['facts'] }));
  const src = (await allSources()).find(s => s.facts.fileId === w.id);
  if (src) await patchStudy(src.id, s => ({ facts: { ...s.facts, source: { ...(s.facts as unknown as { source: SourceFacts }).source, look: { snap: look.snap, client: o.client } } } as unknown as ToolStudy['facts'] }));
  return look;
}

/** The look kept on this conversation for a workbook — the one named, else the newest. */
export async function keptLook(ctx: CapCtx, workbookId?: string): Promise<KeptLook | undefined> {
  const c = await conversation(ctx);
  if (!c.ok) return undefined;
  const all = looksOf(c.s);
  return workbookId ? all.find(x => x.workbookId === workbookId) : [...all].sort((a, b) => b.at - a.at)[0];
}

/** The pack of a kept look, made and kept on the conversation. */
export async function makePack(ctx: CapCtx, workbookId?: string): Promise<CapResult> {
  const k = await keptLook(ctx, workbookId);
  if (!k) return { ok: false, why: 'No first look has been worked in this conversation — a workbook is attached (.xlsx) with the + button, and its first look is what a pack is made from.' };
  try {
    const pack = await lookPack(k, q => workbooks().query(k.workbookId, q), { kind: 'workbook', id: k.workbookId, name: k.name, sheet: k.sheet }, { id: pre => `${pre}${uid().slice(0, 6)}`, now: ctx.now });
    const w = await keepPack(ctx, pack);
    if (!w.ok) return w;
    const r = pack.report;
    const ref = { kind: 'convreport' as const, id: `${r.id}@${r.version}`, label: r.title, href: '' };
    return { ok: true, says: `Made the pack “${r.title}” [report ${r.id}] from the first look of “${k.name}”: ${r.sections.length} sections — ${r.sections.map(s => s.heading).join('; ')} — with ${pack.charts.length} chart${pack.charts.length === 1 ? '' : 's'}, each drawn from a result asked of “${k.sheet}”. The person downloads it as a PDF or as slides from its card; it can be added to with build_report.`, refs: [ref], show: ref, data: { reportId: r.id, version: r.version, charts: pack.charts.length } };
  } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
}

const clientOf = async (ctx: CapCtx): Promise<string> => {
  const c = await conversation(ctx);
  const [{ getWorkspace }, { activeClientNow }, { currentThread, factsOfConversation }] = await Promise.all([import('../db'), import('../lib/activeClient'), import('../colleague/conversation')]);
  const lineId = c.ok ? currentThread(factsOfConversation(c.s).threads ?? [])?.scope.lineId : undefined;
  const line = lineId ? await getWorkspace(lineId) : undefined;
  return line?.clientName?.trim() ?? (await activeClientNow()).client;
};

export const readWorkbookAs: Capability = {
  name: 'read_workbook_as', title: 'Read the workbook the way they say', kind: 'local',
  validate: raw => checkObject(raw, {
    workbookId: ID('the workbook'), sheet: { kind: 'string', label: 'the sheet to start with', max: 120 },
    headerRow: { kind: 'int', label: 'the row the headings are on', min: 1, max: 1_048_576 },
    rename: { kind: 'record', label: 'columns to call by another name (letter or heading → name)' },
    result: { kind: 'string', label: 'the column that is the result', max: 120 }, date: { kind: 'string', label: 'the column that dates each row', max: 120 },
  }),
  allowed: anyone,
  async run(ctx, input: { workbookId?: string; sheet?: string; headerRow?: number; rename?: Record<string, unknown>; result?: string; date?: string }): Promise<CapResult> {
    const k = await pick(ctx, input.workbookId);
    if (!k.ok) return { ok: false, why: k.why };
    const before = await keptLook(ctx, k.w.id);
    const sheet = input.sheet ?? before?.asked?.sheet ?? before?.sheet;
    const names = Object.entries(input.rename ?? {}).filter(([, v]) => typeof v === 'string' && v.trim()).map(([column, name]) => ({ column, name: String(name) }));
    const said: string[] = [];
    let p = k.p;
    try {
      if (input.headerRow !== undefined || names.length) {
        if (!sheet) return { ok: false, why: `Say which sheet — the sheets are ${p.sheets.map(s => `“${s.name}”`).join(', ')}.` };
        const a = await workbooks().amend(k.w.id, { sheet, ...(input.headerRow !== undefined ? { headerRow: input.headerRow } : {}), ...(names.length ? { names } : {}) });
        p = a.profile; said.push(...a.said);
      }
      if (input.sheet && !p.sheets.some(s => lc(s.name) === lc(input.sheet as string))) return { ok: false, why: `No sheet “${input.sheet}” — the sheets are ${p.sheets.map(s => `“${s.name}”`).join(', ')}.` };
      /* a result or a date must be a column of the sheet — by its heading or its letter; anything else is refused in words (and, said
         in passing in a sentence that was not about the workbook, is left to Luna) */
      const on = p.sheets.find(x => lc(x.name) === lc(sheet ?? '')) ?? (await import('../lib/workbook/firstLook')).tablesOf(p).map(t => p.sheets.find(x => x.name === t.sheet)).find(Boolean);
      for (const [what, name] of [['the result', input.result], ['the date', input.date]] as const) {
        if (!name) continue;
        if (!on) return { ok: false, why: `Say which sheet “${name}” is on — the sheets are ${p.sheets.map(x => `“${x.name}”`).join(', ')}.` };
        if (!on.columns.some(c => lc(c.name) === lc(name) || c.letter === name.trim().toUpperCase())) return { ok: false, why: `“${name}” is not a column of “${on.name}” to take as ${what} — its columns are ${on.columns.filter(c => !c.colour).slice(0, 30).map(c => `“${c.name}” (${c.letter})`).join(', ')}.` };
      }
      const asked = { ...(before?.asked ?? {}), ...(sheet && (input.sheet || input.headerRow !== undefined || names.length || before?.asked?.sheet) ? { sheet } : {}), ...(input.result ? { result: input.result } : {}), ...(input.date ? { date: input.date } : {}) };
      const [{ readNotebooks, liveEntries }, client] = await Promise.all([import('../colleague/notebook'), clientOf(ctx)]);
      const nb = await readNotebooks(client).catch(() => ({} as Awaited<ReturnType<typeof readNotebooks>>));
      const look = await workLook(ctx, k.w, p, { client, told: [...liveEntries(nb.client), ...liveEntries(nb.own)].flatMap(e => [e.term, e.means]), asked });
      if (!look) {
        const s = sheet ? p.sheets.find(x => lc(x.name) === lc(sheet)) : undefined;
        const cols = s ? s.columns.filter(c => !c.colour).slice(0, 14).map(c => `${c.letter} “${c.name}” (${c.type})`).join(', ') : '';
        return { ok: true, refs: [], says: `${said.join(' ')}${said.length ? ' ' : ''}${s ? `On “${s.name}” I still find no column of numbers under a heading to take as the figure. Its headings are read from row ${s.headerRow || '— none found'}; its columns: ${cols}. Say the row the headings are on, or name the column that is the result by its letter.` : noLook(p)}`.trim(), data: { look: false } };
      }
      return { ok: true, refs: [], says: [...said, ...look.says].join('\n\n'), data: { look: true, sheet: look.roles.sheet, headline: look.roles.headline?.column, suggestions: look.suggestions } };
    } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
  },
};

export const workbookPack: Capability = {
  name: 'workbook_pack', title: 'Make the pack from the first look', kind: 'local',
  validate: raw => checkObject(raw, { workbookId: ID('the workbook') }),
  allowed: anyone,
  run: (ctx, input: { workbookId?: string }) => makePack(ctx, input.workbookId),
};

export const LOOK: readonly Capability[] = [readWorkbookAs, workbookPack];
