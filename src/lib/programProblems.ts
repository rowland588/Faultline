/* THE PROBLEMS ON A PROGRAM, FOR PAPER (PROBLEM_PROGRAM.sql — Rowland, 4 November: "make sure that ... is on the reports, linked beautifully, clearly seeing
 * problems with the pictures directly associated to this product"): the register's problems that name a program, by program — what, how serious, whose,
 * which products, and the first picture made small. The Programs report draws them under their program. */
import type { Snag } from '../snag/types';
import { SNAG_STATUS_META } from '../snag/types';

export interface ProgramProblemPaper {
  id: string; what: string; priority: 'critical' | 'high' | 'low';
  /** "Open · 3 days", "Closed 2 Nov" — the state in words. */
  word: string; open: boolean; owner?: string;
  /** "Maris Piper, King Edward" or "every product it makes" — what it affects. */
  products: string;
  photo?: { dataUrl: string; w: number; h: number };
}

const DAY = 86_400_000;

/** Pure: the problems that name a program, open first and by priority, each at most `max` a program. */
export function problemsByProgramOf(snags: readonly Snag[], now = Date.now(), max = 8): Map<string, Omit<ProgramProblemPaper, 'photo'>[]> {
  const rank = { critical: 0, high: 1, low: 2 } as const;
  const out = new Map<string, (Omit<ProgramProblemPaper, 'photo'> & { _k?: string })[]>();
  for (const s of snags.filter(x => !x.deletedAt && !x.archivedAt && x.programId)) {
    const open = s.status !== 'closed';
    const age = Math.max(0, Math.floor((now - s.raisedAt) / DAY));
    const word = open ? `${SNAG_STATUS_META[s.status].label} · ${age === 0 ? 'today' : age === 1 ? '1 day' : `${age} days`}` : `Closed${s.closedAt ? ` ${new Date(s.closedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`;
    const products = (s.products ?? []).filter(Boolean);
    const row = { id: s.id, what: s.problem?.trim() || 'A picture, no words yet', priority: s.priority ?? 'low', word, open,
      ...(s.owner?.trim() ? { owner: s.owner.trim() } : {}), products: products.length ? products.join(', ') : 'every product it makes', _k: photoKeyOf(s) };
    const key = s.programId as string;
    out.set(key, [...(out.get(key) ?? []), row]);
  }
  for (const [k, rows] of out) out.set(k, rows.sort((a, b) => Number(!a.open) - Number(!b.open) || rank[a.priority] - rank[b.priority]).slice(0, max));
  return out;
}

const photoKeyOf = (s: Snag): string | undefined => s.media?.find(m => m.kind === 'photo')?.blobKey ?? s.detailPhotoKey;

/** The problems by program with their pictures made small — read from the device (async). */
export async function problemsByProgram(): Promise<Map<string, ProgramProblemPaper[]>> {
  const { listAllSnags } = await import('../db');
  const { shrinkPicture } = await import('../tools/talk/talkPictures');
  const snags = await listAllSnags();
  const byId = new Map(snags.map(s => [s.id, s]));
  const base = problemsByProgramOf(snags);
  const out = new Map<string, ProgramProblemPaper[]>();
  for (const [pid, rows] of base) {
    const withPhotos: ProgramProblemPaper[] = [];
    for (const r of rows) {
      const key = byId.get(r.id) ? photoKeyOf(byId.get(r.id) as Snag) : undefined;
      const photo = key ? await shrinkPicture(key, 420, 0.75).catch(() => undefined) : undefined;
      withPhotos.push(photo ? { ...r, photo } : r);
    }
    out.set(pid, withPhotos);
  }
  return out;
}
