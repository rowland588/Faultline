/* Loss Engine v3 — Luna pipeline capabilities (Phase 3). Every figure from runLossEngine; narration quotes JSON only. */
import { getWorkspace } from '../db';
import { anyone } from './access';
import { checkObject, ID } from './check';
import type { CapResult, Capability } from './types';
import { lineRef } from './util';
import { parseLossShiftCsv, type LossImportMapping } from '../lib/lossEngine/importShiftCsv';
import { runLossEngine, economicsFromWorkspace } from '../lib/lossEngine/runLossEngine';
import { lineEconomicsFromRecord, economicsStatus } from '../lib/lossEngine/economicsRecord';
import { immediateLossSays } from '../lib/lossEngine/reportSays';
import { narrativeFigurePool } from '../lib/lossEngine/narrativeFigures';
import type { LossEngineReport } from '../lib/lossEngine/types';
import { pickLossShift, patchLossShift } from '../colleague/lossPipeline';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function mapFields(raw: unknown): { ok: true; mapping: LossImportMapping } {
  if (!isObj(raw)) return { ok: true, mapping: {} };
  const o = raw as Record<string, unknown>;
  const mapping: LossImportMapping = {};
  for (const k of ['sigma_minutes', 'breaks_minutes', 'planned_co_minutes', 'planned_clean_minutes', 'good_packs', 'reject_packs', 'rate_per_min', 'family', 'minutes', 'label', 'reason_code', 'row_type'] as const) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) mapping[k] = v.trim();
  }
  return { ok: true, mapping };
}

function economicsForLine(ws: Awaited<ReturnType<typeof getWorkspace>>) {
  if (!ws) return { ok: false as const, why: 'There is no line with that id.' };
  const st = economicsStatus(ws);
  const econ = ws.lossEngineEconomics ? lineEconomicsFromRecord(ws.lossEngineEconomics) : economicsFromWorkspace(ws);
  return { ok: true as const, ws, st, econ };
}

function engineInput(parsed: ReturnType<typeof parseLossShiftCsv>, econ: NonNullable<ReturnType<typeof economicsFromWorkspace>>, rate?: number) {
  const structure = (parsed.facts.breaksMinutes !== undefined || parsed.facts.plannedCoMinutes !== undefined || parsed.facts.plannedCleanMinutes !== undefined)
    ? { breaksMinutes: parsed.facts.breaksMinutes, plannedChangeoverMinutes: parsed.facts.plannedCoMinutes, plannedCleanMinutes: parsed.facts.plannedCleanMinutes }
    : undefined;
  return {
    sigmaMinutes: parsed.facts.sigmaMinutes,
    goodPacks: parsed.facts.goodPacks,
    rejectPacks: parsed.facts.rejectPacks,
    economics: { ...econ, ratePerMin: rate ?? parsed.facts.ratePerMin ?? econ.ratePerMin },
    ledger: parsed.ledger,
    ...(structure ? { structure } : {}),
  };
}

export const mapDataset: Capability = {
  name: 'map_dataset',
  title: 'Map shift production columns',
  kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lossShiftId: ID('the shift file read'), lineId: ID('the line') }),
  allowed: anyone,
  async run(ctx, input: { lossShiftId?: string; lineId?: string }): Promise<CapResult> {
    const pick = await pickLossShift(ctx, input.lossShiftId);
    if (!pick.ok) return { ok: false, why: pick.why };
    const { row } = pick;
    if (!row.raw) return { ok: false, why: 'The shift file has no stored text — attach it again.' };
    const mapping = row.mappingConfirmed ? row.mapping : row.mapping;
    const parsed = parseLossShiftCsv(row.raw, mapping);
    const lineId = input.lineId ?? row.lineId;
    const line = lineId ? await getWorkspace(lineId) : undefined;
    const econNote = line ? economicsStatus(line).says : 'Name the line for Line economics status.';
    const mapSaid = Object.entries(mapping).filter(([, v]) => v).map(([k, v]) => `${k} → ${v}`).join('; ');
    return {
      ok: true,
      says: `“${row.name}” [${row.id}]: headers ${parsed.headers.join(', ')}. Mapping: ${mapSaid || 'default column names'}. ${parsed.refused.length ? `Still to fix: ${parsed.refused.join(' ')}` : 'Ready to confirm.'} ${econNote} Use confirm_mapping before run_loss_engine.`,
      data: { lossShiftId: row.id, headers: parsed.headers, mapping, parsed: { facts: parsed.facts, refused: parsed.refused, ledgerRows: parsed.ledger.length }, mappingConfirmed: row.mappingConfirmed ?? false, line: line ? { id: line.id, name: line.name } : undefined, narrativeFigures: row.report ? narrativeFigurePool(row.report) : [] },
      refs: line ? [lineRef(line)] : [],
    };
  },
};

export const confirmMapping: Capability = {
  name: 'confirm_mapping',
  title: 'Confirm shift column mapping',
  kind: 'write',
  validate: raw => {
    const c = checkObject(raw ?? {}, { lossShiftId: ID('the shift file read'), lineId: ID('the line') });
    if (!c.ok) return c;
    const mapping = isObj(raw) && 'mapping' in raw ? mapFields(raw.mapping).mapping : {};
    return { ok: true, input: { ...c.input, mapping } };
  },
  allowed: anyone,
  async run(ctx, input: { lossShiftId?: string; lineId?: string; mapping?: LossImportMapping }): Promise<CapResult> {
    const pick = await pickLossShift(ctx, input.lossShiftId);
    if (!pick.ok) return { ok: false, why: pick.why };
    const mapping = { ...pick.row.mapping, ...(input.mapping ?? {}) };
    if (!Object.keys(mapping).length && pick.row.headers.length) {
      const { guessMapping } = await import('../lib/lossEngine/importShiftCsv');
      Object.assign(mapping, guessMapping(pick.row.headers));
    }
    const parsed = pick.row.raw ? parseLossShiftCsv(pick.row.raw, mapping) : undefined;
    if (parsed?.refused.length) return { ok: false, why: parsed.refused.join(' ') };
    const lineId = input.lineId ?? pick.row.lineId;
    await patchLossShift(ctx, pick.row.id, { mapping, mappingConfirmed: true, ...(lineId ? { lineId } : {}), ...(parsed ? { parsedFacts: parsed.facts } : {}) });
    const line = lineId ? await getWorkspace(lineId) : undefined;
    return {
      ok: true,
      says: `Mapping confirmed for “${pick.row.name}”. ${parsed ? `σ ${parsed.facts.sigmaMinutes} min, ${parsed.facts.goodPacks.toLocaleString('en-GB')} good packs, ${parsed.ledger.length} ledger rows.` : ''} Run run_loss_engine when Line economics is ready.`,
      data: { lossShiftId: pick.row.id, mapping, mappingConfirmed: true },
      refs: line ? [lineRef(line)] : [],
    };
  },
};

export const runLossEngineCap: Capability = {
  name: 'run_loss_engine',
  title: 'Run the Loss Engine on the shift file',
  kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lossShiftId: ID('the shift file read'), lineId: ID('the line') }),
  allowed: anyone,
  async run(ctx, input: { lossShiftId?: string; lineId?: string }): Promise<CapResult> {
    const pick = await pickLossShift(ctx, input.lossShiftId);
    if (!pick.ok) return { ok: false, why: pick.why };
    if (!pick.row.mappingConfirmed) return { ok: false, why: 'Confirm column mapping first (confirm_mapping).' };
    if (!pick.row.raw) return { ok: false, why: 'The shift file has no stored text — attach it again.' };
    const lineId = input.lineId ?? pick.row.lineId;
    if (!lineId) return { ok: false, why: 'Say which line this shift is for.' };
    const line = await getWorkspace(lineId);
    const econ = economicsForLine(line);
    if (!econ.ok) return { ok: false, why: econ.why };
    if (!econ.st.complete || !econ.econ) return { ok: false, why: `${econ.st.says} Open Line economics in Settings first.` };
    const parsed = parseLossShiftCsv(pick.row.raw, pick.row.mapping);
    if (parsed.refused.length) return { ok: false, why: parsed.refused.join(' ') };
    const report = runLossEngine(engineInput(parsed, econ.econ, parsed.facts.ratePerMin));
    await patchLossShift(ctx, pick.row.id, { report, lineId });
    return {
      ok: true,
      says: immediateLossSays(report).lines.join(' '),
      data: { lossShiftId: pick.row.id, report, narrativeFigures: narrativeFigurePool(report), howKnown: 'runLossEngine' },
      refs: [lineRef(econ.ws)],
    };
  },
};

export const narrateLossReport: Capability = {
  name: 'narrate_loss_report',
  title: 'Words for the immediate loss report',
  kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lossShiftId: ID('the shift file read') }),
  allowed: anyone,
  async run(ctx, input: { lossShiftId?: string }): Promise<CapResult> {
    const pick = await pickLossShift(ctx, input.lossShiftId);
    if (!pick.ok) return { ok: false, why: pick.why };
    const report = pick.row.report;
    if (!report) return { ok: false, why: 'Run run_loss_engine first — no report JSON on this conversation.' };
    const said = immediateLossSays(report);
    return {
      ok: true,
      says: `${said.headline}. ${said.lines.join(' ')} Quote only figures in narrativeFigures or this says string — labour and contribution are never summed.`,
      data: { lossShiftId: pick.row.id, report, narrativeFigures: narrativeFigurePool(report), lines: said.lines, headline: said.headline, status: said.status },
      refs: [],
    };
  },
};

export const LOSS_ENGINE: readonly Capability[] = [mapDataset, confirmMapping, runLossEngineCap, narrateLossReport];

export function lossReportFromData(data: unknown): LossEngineReport | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const r = (data as { report?: LossEngineReport }).report;
  return r && typeof r.sigmaMinutes === 'number' ? r : undefined;
}