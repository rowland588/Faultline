/* HORIZONTAL DEPLOYMENT, LIVE (FC-155) — the device's own records read together and read again when anything is written
 * (coalesced). The only writes are an offer (a problem on the receiving line, made once), and its three answers. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addSnag, allPaceLines, listAllPaceTodos, listAllSnags, listAllStudies, listWorkspaces, onDataChange, patchSnag } from '../../db';
import { useProjectLineIds } from '../gemba/useLooking';
import type { Snag } from '../../snag/types';
import {
  OFFER_CATEGORY, candidatesOf, declineChange, projectSpreadSays, fixSays, offerId, offerSays, offerSnag, proveChange, provedFixes, takeChange,
  type Candidate, type FactoryLine, type ProvedFix,
} from './yokoten';

export interface FixRow { fix: ProvedFix; cands: Candidate[] }
export interface OfferRow { snag: Snag; fixWhat: string; sourceLine: string }
export interface YokotenRead {
  /** Fixes proved on this line, with the lines that could take them. */
  proved: FixRow[];
  /** Offers made to this line. */
  received: OfferRow[];
  lines: FactoryLine[];
}

const lineOf = (w: { id: string; name: string; assets?: string[]; archived?: boolean; madeOf?: string[] }): FactoryLine =>
  ({ id: w.id, name: w.name, machines: w.assets ?? [], ...(w.archived ? { archived: true } : {}), ...(w.madeOf?.length ? { madeOf: w.madeOf } : {}) });

/** Reads for the lines asked, in one pass: what each proved and may spread, what was offered to each. */
export function useYokotenMany(wsIds: readonly string[]): Map<string, YokotenRead> | null {
  const [read, setRead] = useState<Map<string, YokotenRead> | null>(null);
  const key = wsIds.join('|');
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const ids = key ? key.split('|') : [];
    const load = () => void Promise.all([listWorkspaces(), allPaceLines(), listAllPaceTodos(), listAllStudies(), listAllSnags()]).then(([ws, pl, todos, studies, snags]) => {
      if (!live) return;
      const lines = ws.map(lineOf);
      const ref = Date.now();
      const all = provedFixes(todos, pl, studies, lines);
      const byId = new Map(all.map(f => [f.id, f] as const));
      const out = new Map<string, YokotenRead>();
      for (const wsId of ids) {
        const proved = all.filter(f => f.lineId === wsId).map(fix => ({ fix, cands: candidatesOf(fix, lines, snags, ref) })).filter(r => r.cands.length);
        const received = snags.filter(s => s.workspaceId === wsId && s.targetCategory === OFFER_CATEGORY && s.deletedAt == null)
          .map(snag => ({ snag, fixWhat: byId.get(snag.targetSubcategory ?? '')?.what ?? snag.problem.replace(/^Take the fix: /, ''), sourceLine: byId.get(snag.targetSubcategory ?? '')?.lineName ?? 'another line' }))
          .sort((a, b) => b.snag.raisedAt - a.snag.raisedAt);
        out.set(wsId, { proved, received, lines });
      }
      setRead(out);
    });
    load();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(load, 150); });
    return () => { live = false; window.clearTimeout(timer); off(); };
  }, [key]);
  return read;
}

/** Reads for one line. */
export function useYokoten(wsId: string): YokotenRead | null {
  const many = useYokotenMany(useMemo(() => [wsId], [wsId]));
  return many?.get(wsId) ?? null;
}

/** The sentences a line's papers carry: each fix it proved with where it stands, and each fix offered to it. */
export function spreadSentences(r: YokotenRead | undefined): string[] {
  if (!r) return [];
  return [...r.proved.map(x => fixSays(x.fix, x.cands)), ...r.received.map(x => `${offerSays(x.fixWhat, x.snag)} Proved on ${x.sourceLine}.`)];
}

const dayWord = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The writes. Offering again to a line that has the offer changes nothing. */
export function useYokotenActs() {
  const offer = useCallback(async (fix: ProvedFix, to: readonly Candidate[]) => {
    const ref = Date.now();
    const existing = new Set((await listAllSnags()).map(s => s.id));
    for (const c of to) {
      if (c.state !== 'not-offered') continue;
      const row = offerSnag(fix, c.line, ref, dayWord(ref));
      if (!existing.has(row.id)) await addSnag(row);
    }
  }, []);
  const take = useCallback((id: string) => patchSnag(id, takeChange(Date.now())), []);
  const prove = useCallback((id: string, words: string) => patchSnag(id, proveChange(words, Date.now())), []);
  const decline = useCallback((id: string, why: string) => patchSnag(id, declineChange(why, Date.now())), []);
  return { offer, take, prove, decline, offerId };
}

/** A project's lines read for its method page's Horizontal deployment row. */
export function useProjectSpread(projectId: string): { says: string; lineId: string } | undefined {
  const ids = useProjectLineIds(projectId);
  const many = useYokotenMany(useMemo(() => ids ?? [], [ids]));
  if (!many) return undefined;
  return projectSpreadSays([...many.values()].flatMap(r => r.proved));
}
