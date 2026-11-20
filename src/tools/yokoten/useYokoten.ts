/* HORIZONTAL DEPLOYMENT, LIVE (FC-155) — the device's own records read together and read again when anything is written
 * (coalesced). The only writes are an offer (a problem on the receiving line, made once), and its three answers. The money is read,
 * never written: the countermeasure's problem and share through the 6M board's own reader (lib/useProblems loadProblems →
 * lib/fishbone buildView, the problem card's figure), each line's cost model and its Line capacity's bottleneck (lib/lineLoss neckOf). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addSnag, allPaceLines, listAllPaceTodos, listAllSnags, listAllStandards, listAllStudies, listWorkspaces, onDataChange, patchSnag } from '../../db';
import { useProjectLineIds } from '../gemba/useLooking';
import type { Snag } from '../../snag/types';
import type { PaceTodoRow } from '../../db/rows';
import type { Workspace } from '../../types';
import type { Standard } from '../linestandard/standard';
import { loadProblems, viewsOf } from '../../lib/useProblems';
import { scopeOf } from '../../lib/fishbone';
import { neckOf } from '../../lib/lineLoss';
import {
  OFFER_CATEGORY, candidatesOf, declineChange, fixMoneyOf, fixMoneySays, lineIfOf, lineIfSays, projectSpreadSays, fixSays, offerId, offerSays,
  offerSnag, proveChange, provedFixes, spreadIfSays, stateOf, takeChange,
  type Candidate, type FactoryLine, type FixMoney, type LineIf, type ProvedFix,
} from './yokoten';

export interface FixRow { fix: ProvedFix; cands: Candidate[]; money?: FixMoney; ifs?: Map<string, LineIf> }
/** An offer on this line: the fix, where it was proved, and — when the fix has money — what it would be worth on this line (`hereName`). */
export interface OfferRow { snag: Snag; fixWhat: string; sourceLine: string; hereName: string; machine?: string; money?: FixMoney; lineIf?: LineIf }
export interface YokotenRead {
  /** Fixes proved on this line, with the lines that could take them. */
  proved: FixRow[];
  /** Offers made to this line. */
  received: OfferRow[];
  lines: FactoryLine[];
}

const lineOf = (w: { id: string; name: string; assets?: string[]; archived?: boolean; madeOf?: string[] }): FactoryLine =>
  ({ id: w.id, name: w.name, machines: w.assets ?? [], ...(w.archived ? { archived: true } : {}), ...(w.madeOf?.length ? { madeOf: w.madeOf } : {}) });

/** WHAT EACH FIX IS WORTH WHERE IT WAS PROVED — its problem, measure and money as its 6M board works them (one read a project), its
 *  share as typed on the board. A fix with no project, or a project not on this device, reads as on no problem (said, never guessed). */
async function moneyOfFixes(fixes: readonly ProvedFix[], todos: readonly PaceTodoRow[]): Promise<Map<string, FixMoney>> {
  const out = new Map<string, FixMoney>();
  const projects = [...new Set(fixes.flatMap(f => (f.projectId ? [f.projectId] : [])))];
  const read = await Promise.all(projects.map(pid => loadProblems(pid).then(l => ({ pid, l })).catch(() => undefined)));
  for (const f of fixes) {
    const got = read.find(r => r?.pid === f.projectId);
    const view = got ? viewsOf(got.l, got.pid).find(v => v.actions.some(a => (a.uid ?? a.ref) === f.id)) : undefined;
    const pct = todos.find(t => t.id === f.id)?.expectPct;
    const scope = view && got ? scopeOf(view.problem, got.l.data) : undefined;
    out.set(f.id, fixMoneyOf(pct, view?.measure, view?.money, {
      onProblem: !!view,
      countedAsStop: !!view?.money && scope?.whole === false && !!scope.asset && !view.money.neckKnown,
    }));
  }
  return out;
}

/** The same hours priced on each line, by that line's own cost model and bottleneck. */
function ifsOf(money: FixMoney | undefined, machine: string, lineIds: readonly string[], ws: ReadonlyMap<string, Workspace>, standards: readonly Standard[]): Map<string, LineIf> | undefined {
  if (money?.kind !== 'worth') return undefined;
  return new Map(lineIds.map(id => [id, lineIfOf(money.hours, machine, ws.get(id), neckOf(standards, id))] as const));
}

/** Reads for the lines asked, in one pass: what each proved and may spread, what was offered to each, and what each is worth. */
export function useYokotenMany(wsIds: readonly string[]): Map<string, YokotenRead> | null {
  const [got, setGot] = useState<{key:string;read:Map<string,YokotenRead>} | null>(null);
  const key = wsIds.join('|');
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const ids = key ? key.split('|') : [];
    const load = () => void Promise.all([listWorkspaces(), allPaceLines(), listAllPaceTodos(), listAllStudies(), listAllSnags(), listAllStandards()]).then(async ([ws, pl, todos, studies, snags, standards]) => {
      if (!live) return;
      const lines = ws.map(lineOf);
      const wsById = new Map(ws.map(w => [w.id, w] as const));
      const ref = Date.now();
      const all = provedFixes(todos, pl, studies, lines);
      const byId = new Map(all.map(f => [f.id, f] as const));
      /* only the fixes these lines show — proved here, or offered here — are priced */
      const shown = all.filter(f => ids.includes(f.lineId) || snags.some(s => s.targetCategory === OFFER_CATEGORY && s.deletedAt == null && s.targetSubcategory === f.id && ids.includes(s.workspaceId)));
      const money = await moneyOfFixes(shown, todos);
      if (!live) return;
      const out = new Map<string, YokotenRead>();
      for (const wsId of ids) {
        const proved = all.filter(f => f.lineId === wsId).map(fix => {
          const cands = candidatesOf(fix, lines, snags, ref);
          const m = money.get(fix.id);
          const ifs = ifsOf(m, fix.machine, cands.map(c => c.line.id), wsById, standards);
          return { fix, cands, ...(m ? { money: m } : {}), ...(ifs ? { ifs } : {}) };
        }).filter(r => r.cands.length);
        const received = snags.filter(s => s.workspaceId === wsId && s.targetCategory === OFFER_CATEGORY && s.deletedAt == null)
          .map(snag => {
            const fix = byId.get(snag.targetSubcategory ?? '');
            const m = fix ? money.get(fix.id) : undefined;
            const machine = fix?.machine ?? snag.targetAsset ?? '';
            const lineIf = ifsOf(m, machine, [wsId], wsById, standards)?.get(wsId);
            return { snag, fixWhat: fix?.what ?? snag.problem.replace(/^Take the fix: /, ''), sourceLine: fix?.lineName ?? 'another line', hereName: wsById.get(wsId)?.name ?? 'this line',
              ...(machine ? { machine } : {}), ...(m ? { money: m } : {}), ...(lineIf ? { lineIf } : {}) };
          })
          .sort((a, b) => b.snag.raisedAt - a.snag.raisedAt);
        out.set(wsId, { proved, received, lines });
      }
      setGot({key,read:out});
    });
    load();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(load, 150); });
    return () => { live = false; window.clearTimeout(timer); off(); };
  }, [key]);
  return got?.key===key ? got.read : null;
}

/** Reads for one line. */
export function useYokoten(wsId: string): YokotenRead | null {
  const many = useYokotenMany(useMemo(() => [wsId], [wsId]));
  return many?.get(wsId) ?? null;
}

/** What a fix proved here is worth: where it was proved, then the lines not yet answered added up (or why no money is said). */
export function provedMoneySays(x: FixRow): string[] {
  if (!x.money) return [];
  if (x.money.kind === 'none') return [fixMoneySays(x.fix, x.money)];
  const sum = spreadIfSays(x.money, x.cands, x.ifs ?? new Map());
  return [fixMoneySays(x.fix, x.money), ...(sum ? [sum] : [])];
}
/** What an offer would be worth on this line — an if; nothing on a declined offer. */
export function offerMoneySays(x: OfferRow): string | undefined {
  if (!x.money || stateOf(x.snag) === 'declined') return undefined;
  if (x.money.kind === 'none') return fixMoneySays({ lineName: x.sourceLine }, x.money);
  return x.lineIf ? lineIfSays(x.hereName, x.machine ?? 'machine', x.lineIf, 'here') : undefined;
}

/** The sentences a line's papers carry: each fix it proved with where it stands and what it is worth, and each fix offered to it with
 *  what it would be worth here — the panel's own sentences. */
export function spreadSentences(r: YokotenRead | undefined): string[] {
  if (!r) return [];
  return [
    ...r.proved.flatMap(x => [fixSays(x.fix, x.cands), ...provedMoneySays(x)]),
    ...r.received.flatMap(x => { const m = offerMoneySays(x); return [`${offerSays(x.fixWhat, x.snag)} Proved on ${x.sourceLine}.`, ...(m ? [m] : [])]; }),
  ];
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
