import { guessMapping, parseLossShiftCsv } from './importShiftCsv';

const TEXT_EXT = /\.(csv|tsv|txt)$/i;

/** A shift production file the Loss Engine can read — not a generic downtime reason table. */
export function looksLikeLossShiftFile(name: string, text?: string): boolean {
  if (!TEXT_EXT.test(name)) return false;
  if (!text?.trim()) return false;
  const first = text.trim().split(/\r?\n/)[0]?.toLowerCase() ?? '';
  const hints = ['sigma_minutes', 'good_packs', 'row_type', 'planned_co'];
  return hints.filter(h => first.includes(h)).length >= 2;
}

/** Quick parse check — headers map and at least sigma or good present. */
export function probeLossShift(text: string): { ok: boolean; refused: string[] } {
  const headers = text.trim().split(/\r?\n/)[0]?.split(/[,;\t]/) ?? [];
  const p = parseLossShiftCsv(text, guessMapping(headers));
  if (p.refused.some(r => /empty/i.test(r))) return { ok: false, refused: p.refused };
  const hasShift = p.facts.sigmaMinutes > 0 && p.facts.goodPacks > 0;
  return { ok: hasShift, refused: p.refused };
}