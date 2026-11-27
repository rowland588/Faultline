/* LOSS ENGINE attach pipeline (Loss Engine v3 Phase 3) — a shift CSV read in code on attach, before workbook or downtime import.
 * Luna runs map_dataset → confirm_mapping → run_loss_engine → narrate_loss_report; every figure from runLossEngine JSON. */
import { patchStudy } from '../db';
import { uid } from '../lib/ids';
import type { CapCtx, ColleagueLossShift } from '../capabilities/types';
import { conversation } from '../capabilities/draftStore';
import { looksLikeLossShiftFile, probeLossShift } from '../lib/lossEngine/detectShift';
import { guessMapping, type LossImportMapping } from '../lib/lossEngine/importShiftCsv';
import { WHO, appendTurn } from './conversation';

const lossOf = (facts: Record<string, unknown> | undefined): ColleagueLossShift[] => {
  const t = facts?.lossShifts;
  return Array.isArray(t) ? t as ColleagueLossShift[] : [];
};

export async function attachLossShift(
  ctx: Omit<CapCtx, 'conversationId'>,
  conversationId: () => Promise<string>,
  file: File,
  o: { lineId?: string; client?: string } = {},
): Promise<{ took: false } | { took: true; ok: boolean; says: string; lossShiftId?: string }> {
  if (file.size > 2 * 1024 * 1024) return { took: false };
  const text = await file.text();
  if (!looksLikeLossShiftFile(file.name, text)) return { took: false };
  const probe = probeLossShift(text);
  if (!probe.ok) return { took: false };
  const cid = await conversationId();
  const c = { ...ctx, conversationId: cid };
  const conv = await conversation(c);
  if (!conv.ok) return { took: true, ok: false, says: conv.why };
  const headers = text.trim().split(/\r?\n/)[0]?.split(/[,;\t]/).map(h => h.trim()) ?? [];
  const mapping = guessMapping(headers);
  const id = `lsh-${uid()}`;
  const row: ColleagueLossShift = {
    id,
    name: file.name,
    at: ctx.now,
    raw: text,
    headers,
    mapping,
    mappingConfirmed: false,
    ...(o.lineId ? { lineId: o.lineId } : {}),
    ...(o.client ? { client: o.client } : {}),
  };
  await patchStudy(conv.s.id, s => ({
    facts: { ...s.facts, lossShifts: [...lossOf(s.facts as Record<string, unknown>), row] } as typeof s.facts,
  }));
  const mapLines = Object.entries(mapping).filter(([, v]) => v).map(([k, v]) => `${k} → ${v}`).join(', ');
  const says = probe.refused.length
    ? `Read “${file.name}” as a shift production file. Some rows need attention: ${probe.refused.join(' ')} Run map_dataset before describing losses.`
    : `Read “${file.name}” as a shift production file [${id}]. Headers: ${headers.join(', ')}. Suggested mapping: ${mapLines}. Next: map_dataset, confirm_mapping on a card, run_loss_engine, narrate_loss_report — every figure from the engine, never invented.`;
  await appendTurn(patchStudy, cid, { id: uid(), at: ctx.now, who: WHO, kind: 'reply', text: says, byCode: true });
  return { took: true, ok: true, says, lossShiftId: id };
}

export async function patchLossShift(ctx: CapCtx, id: string, patch: Partial<ColleagueLossShift>): Promise<ColleagueLossShift | { why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return { why: c.why };
  let out: ColleagueLossShift | undefined;
  await patchStudy(c.s.id, s => {
    const list = lossOf(s.facts as Record<string, unknown>);
    const next = list.map(x => (x.id === id ? { ...x, ...patch } : x));
    out = next.find(x => x.id === id);
    return { facts: { ...s.facts, lossShifts: next } as typeof s.facts };
  });
  return out ?? { why: `No shift file [${id}] on this conversation.` };
}

export async function pickLossShift(ctx: CapCtx, lossShiftId?: string): Promise<{ ok: true; row: ColleagueLossShift } | { ok: false; why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return { ok: false, why: c.why };
  const all = lossOf(c.s.facts as Record<string, unknown>);
  if (!all.length) return { ok: false, why: 'No shift production file has been attached in this conversation. Attach a CSV with sigma_minutes and good_packs.' };
  const row = lossShiftId ? all.find(x => x.id === lossShiftId) : all[all.length - 1];
  if (!row) return { ok: false, why: lossShiftId ? `No shift file [${lossShiftId}].` : 'No shift file found.' };
  return { ok: true, row };
}

export type { LossImportMapping };