/* A LINE'S CARD ON THE FACTORY'S BOARD — one row of the Lines tab (#/room) and of an area's page (#/area, lib/areas): who it is ·
 * where it stands · the worst thing open · the rest (docs/ENTERPRISE-UX.md X1). Moved out of screens/WorkspaceHome on 9 November,
 * unchanged, so the area's page draws its lines exactly as the board does. */
import { useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { listAllStudies, onDataChange } from '../db';
import { lineRates, rateShort, WEEK } from '../lib/intelligence';
import type { Workspace } from '../types';
import type { LineProblems } from '../lib/lineWork';
import { Icon } from './Icon';

/** What a line's card answers: its problems open, critical and late (lib/lineWork lineProblems — the count the line's own page
 *  uses), and the worst thing on it — the register's first row, who has it and when. */
export interface LineCardContents {
  problems: Pick<LineProblems, 'open' | 'critical' | 'late'>;
  worst?: { what: string; owner?: string; due?: string; red: boolean };
}

/** WHERE A LINE STANDS, in a word and its colour — the factory's board (27 October: "which line needs me?"). Red: a
 *  critical or late problem; amber: problems open; green: nothing open. Always with its words beside it. */
export function lineState(c: LineCardContents | undefined): { word: string; tone: 'r' | 'a' | 'g' | 'n' } {
  if (!c) return { word: '…', tone: 'n' };
  const p = c.problems;
  if (p.critical || p.late) return { word: [p.late ? `${p.late} late` : '', p.critical ? `${p.critical} critical` : ''].filter(Boolean).join(' · '), tone: 'r' };
  if (p.open) return { word: `${p.open} problem${p.open === 1 ? '' : 's'} open`, tone: 'a' };
  return { word: 'Nothing late', tone: 'g' };
}

export function FactoryLineCard({ w, c, machineSaid, todo, late, dual, rate, projects, looked }: {
  w: Workspace;
  c: LineCardContents | undefined;
  /** Its machines in flow, in words — or "No machines named yet". */
  machineSaid: string;
  /** Programs still to prove, and how many are past their test day. */
  todo: number; late: number;
  /** "made of …" / "part of …" (lib/lines dualSaid), or nothing. */
  dual: string;
  rate?: string;
  /** The projects on it, by name, or nothing. */
  projects?: string;
  /** How fresh the looking is (tools/gemba lookingShort), with its level. */
  looked?: { text: string; level: string };
}) {
  const st = lineState(c);
  return (
    <button className={'fac-card is-' + st.tone} data-line={w.name} onClick={() => nav(`/lines/${w.id}`)}>
      {/* a row of the board (docs/ENTERPRISE-UX.md X1): who it is · where it stands · the worst thing open · the rest */}
      <span className="fac-card-id">
        <span className="fac-card-ic" aria-hidden><Icon name="machine" size={18} /></span>
        <span className="fac-card-head">
          <b className="fac-card-name">{w.name}</b>
        </span>
        <span className="fac-card-type">{w.lineType || 'No type yet'}</span>
        <span className="fac-card-machines">{machineSaid}</span>
      </span>
      {st.tone === 'r' && c && (c.problems.critical || c.problems.late)
        ? (
          <span className="fac-card-state is-r">
            {c.problems.critical > 0 && <b className="is-r">{c.problems.critical} critical</b>}
            {c.problems.critical > 0 && c.problems.late > 0 && ' · '}
            {c.problems.late > 0 && <b className="is-r">{c.problems.late} late</b>}
          </span>
        )
        : <span className={'fac-card-state is-' + st.tone}>{st.word}</span>}
      {c?.worst ? <span className={'fac-card-worst' + (c.worst.red ? ' is-r' : '')}>{c.worst.what}<span className="sub"> · {c.worst.owner ?? 'nobody yet'}{c.worst.due ? ` · ${c.worst.due}` : ''}</span></span> : <span className="fac-card-worst is-none">Nothing open</span>}
      <span className="fac-card-info">
        {(todo > 0 || late || dual || rate) ? (
          <span className="fac-card-meta">
            {todo > 0 ? `${todo} program${todo === 1 ? '' : 's'} to prove` : ''}
            {late ? <>{todo > 0 ? ' · ' : ''}<b className="is-r">{late} late</b></> : null}
            {dual ? <>{todo > 0 || late ? ' · ' : ''}<span className="fac-dual">{dual}</span></> : null}
            {rate ? <>{todo > 0 || late || dual ? ' · ' : ''}{rate}</> : null}
          </span>
        ) : null}
        <span className="fac-card-projects">{projects ? `Projects: ${projects}` : 'No project on it'}</span>
        {looked ? <span className={'fac-card-looked is-' + looked.level}>{looked.text}</span> : null}
      </span>
      {/* the way in, named (27 October, where-am-i D: each card saying what a tap does) */}
      <span className="fac-card-go">Open {w.name} ›</span>
    </button>
  );
}

/** WHAT EACH LINE CAN PLAN ON — its counted shifts over six weeks, read by the same function as its capacity panel
 *  (lib/intelligence lineRates), so the card and the panel cannot disagree (docs/upgrade-plan.md, O). By line id. */
export function useLineRates(): Record<string, string> {
  const [rateOf, setRateOf] = useState<Record<string, string>>({});
  useEffect(() => {
    let on = true;
    const load = async () => {
      const from = Date.now() - 6 * WEEK;
      const counts = (await listAllStudies()).filter(x => x.tool === 'losses' && !x.deletedAt && x.facts.losses && (x.facts.losses.from ?? 0) >= from);
      const by = new Map<string, typeof counts>();
      for (const c of counts) if (c.workspaceId) (by.get(c.workspaceId) ?? by.set(c.workspaceId, []).get(c.workspaceId))?.push(c);
      const out: Record<string, string> = {};
      for (const [id, cs] of by) { const t = rateShort(lineRates(cs.map(c => ({ id: c.id, count: c.facts.losses })))); if (t) out[id] = t; }
      if (on) setRateOf(out);
    };
    void load();
    const off = onDataChange(() => { void load(); });
    return () => { on = false; off(); };
  }, []);
  return rateOf;
}
