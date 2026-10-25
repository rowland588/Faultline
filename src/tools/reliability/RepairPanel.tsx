/* REPAIR TIMES, CALLS AND THE STOPS NOT YET CLEARED, ON THE RELIABILITY PAGE
 * (knowledge/specs/FC-059-repair-times.md, FC-015-andon-calls.md).
 *
 * The OPEN panel is what a person at the machine presses after a tap on a
 * timed count: Help arrived, Running again — or "it took" a chip or a typed
 * time — and the reason, from the count's own short list. The two panels
 * below are the figures: a timed stop's repair time (typical, worst, waiting
 * and fixing, availability) and a call's response and clearing (by reason,
 * by shift). Every figure and every sentence is the module's (repair.ts), the
 * same one the paper reads. A call is never shown by person. */
import { useMemo, useState } from 'react';
import { patchStudy } from '../../db';
import { now } from '../../lib/ids';
import type { RelEvent } from '../../lib/study';
import { LeanInsights, LeanPanel } from '../../ui/Lean';
import {
  callInsights, callSays, callsByShift, fitterCost, fitterWords, parseDuration, repairInsights, repairSays, OPEN_STALE_H, type CallFigures, type ReasonRow, type RepairFigures, type ShiftRow, type StopBar, type TimedStop,
} from './repair';
import { mins, plural } from './words';
import { waitCost, waitWords, type RelCostLine, type RelCounter, type RelFigures, type RelItem, type RelWhere } from './reliability';

const MIN = 60_000;
const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
/** The chips a time said is offered as. */
const TOOK: [string, number][] = [['10 s', 10_000], ['30 s', 30_000], ['1 min', MIN], ['2 min', 2 * MIN], ['5 min', 5 * MIN]];

/** Stamp or change one tap of a study. */
function editEvent(sid: string, id: string, p: (e: RelEvent) => RelEvent) {
  void patchStudy(sid, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === id ? p(x) : x)) } }));
}

/** Running again at `fixedAt`: the help stamp is kept only if it still sits between the tap and it. */
export const withTook = (e: RelEvent, fixedAt: number, est: boolean): RelEvent => {
  const { arrivedAt, ...rest } = e;
  return { ...rest, ...(arrivedAt !== undefined && arrivedAt <= fixedAt ? { arrivedAt } : {}), fixedAt, ...(est ? { est: true } : {}) };
};

/* ------------------------------------------------------------------ the open ones */

/** THE STOPS NOT YET RUNNING AGAIN — one row each, large buttons. */
export function OpenStops({ sid, items, t }: { sid: string; items: RelItem[]; t: number }) {
  const rows = items.flatMap(i => (i.stops ?? []).map((st, idx) => ({ item: i, st, n: idx + 1 }))).filter(x => x.st.open).sort((a, b) => a.st.at - b.st.at);
  if (!rows.length) return null;
  return (
    <section className="rl-open" aria-label="Not yet running again">
      <h2 className="rl-open-h">Not yet running again</h2>
      <ul className="rl-open-list">
        {rows.map(({ item, st, n }) => <OpenRow key={st.id} sid={sid} c={item.c} st={st} n={n} t={t} />)}
      </ul>
    </section>
  );
}

function OpenRow({ sid, c, st, n, t }: { sid: string; c: RelCounter; st: TimedStop; n: number; t: number }) {
  const [said, setSaid] = useState('');
  const [problem, setProblem] = useState('');
  const stale = (t - st.at) / 3_600_000 > OPEN_STALE_H;
  const call = c.timed === 'call';
  const ago = Math.max(0, Math.round((t - st.at) / 1000));
  const agoWords = ago < 90 ? `${ago} s ago` : `${Math.round(ago / 60)} min ago`;
  const took = (ms: number) => {
    const at = st.at + ms;
    if (st.arrivedAt !== undefined && st.arrivedAt > at) { setProblem('That is before help arrived — change the time or leave it'); return; }
    setProblem(''); setSaid('');
    editEvent(sid, st.id, e => withTook(e, at, true));
  };
  const arrived = () => editEvent(sid, st.id, e => ({ ...e, arrivedAt: Math.max(now(), st.at) }));
  const running = () => editEvent(sid, st.id, e => withTook(e, Math.max(now(), st.at + 1000), false));
  return (
    <li className={'rl-open-row' + (stale ? ' is-stale' : '')} data-stop={st.id}>
      <div className="rl-open-top">
        <b>{cap(c.event)} {n}</b>
        <span className="sub">{call ? 'called' : 'stopped'} {hm(st.at)} · {agoWords}{st.arrivedAt !== undefined ? ` · help came ${hm(st.arrivedAt)} (${mins((st.arrivedAt - st.at) / MIN)})` : ''}</span>
        {stale && <span className="rl-open-stale">open for more than {OPEN_STALE_H} hours — say how long it took</span>}
      </div>
      <div className="rl-open-acts">
        {st.arrivedAt === undefined && <button type="button" className="btn rl-open-help" onClick={arrived}>Help arrived</button>}
        <button type="button" className="btn btn-primary rl-open-done" onClick={running}>Running again</button>
      </div>
      {c.reasons && c.reasons.length > 0 && (
        <div className="chip-row rl-open-reasons" role="group" aria-label={`Reason for ${c.event} ${n}`}>
          {c.reasons.map(r => (
            <button key={r} type="button" className={'chip' + (st.reason === r ? ' on' : '')} aria-pressed={st.reason === r}
              onClick={() => editEvent(sid, st.id, e => ({ ...e, reason: st.reason === r ? undefined : r }))}>{r}</button>
          ))}
        </div>
      )}
      <div className="rl-open-took">
        <span className="sub">Or say how long it took</span>
        <span className="chip-row" role="group" aria-label={`It took, ${c.event} ${n}`}>
          {TOOK.map(([label, ms]) => <button key={label} type="button" className="chip" onClick={() => took(ms)}>{label}</button>)}
        </span>
        <form className="rl-note" onSubmit={e => { e.preventDefault(); const ms = parseDuration(said); if (ms === undefined) { setProblem('Say it as 40 s, 90 s, 1.5 min, 1:30 or 2 h — a bare number is minutes'); return; } took(ms); }}>
          <input className="text-input" value={said} placeholder="e.g. 90 s, 1:30, 4" aria-label={`How long ${c.event} ${n} took`} onChange={e => { setSaid(e.target.value); setProblem(''); }} />
          <button type="submit" className="btn" disabled={!said.trim()}>Set</button>
        </form>
      </div>
      {problem && <p className="ie-problem" role="alert">{problem}</p>}
    </li>
  );
}

/* ------------------------------------------------------------------ one tap's times, in the list of every tap */

/** What a tap's times say, and a way to put them right. */
export function TapTimes({ sid, e, call, canEdit }: { sid: string; e: RelEvent; call: boolean; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [said, setSaid] = useState('');
  const [problem, setProblem] = useState('');
  const set = () => {
    const ms = parseDuration(said);
    if (ms === undefined) { setProblem('Say it as 40 s, 90 s, 1.5 min, 1:30 or 2 h — a bare number is minutes'); return; }
    if (e.arrivedAt !== undefined && e.arrivedAt > e.at + ms) { setProblem('That is before help arrived'); return; }
    editEvent(sid, e.id, x => withTook(x, x.at + ms, true));
    setOpen(false); setSaid(''); setProblem('');
  };
  const words = [e.arrivedAt !== undefined && e.arrivedAt >= e.at ? `help +${mins((e.arrivedAt - e.at) / MIN)}` : '', e.fixedAt !== undefined && e.fixedAt > e.at ? `${e.est ? '~' : ''}running again +${mins((e.fixedAt - e.at) / MIN)}` : (call ? 'not cleared' : 'not cleared'),
    e.reason ? e.reason : ''].filter(Boolean).join(' · ');
  return (
    <span className="rl-taptimes">
      <span className="sub">{words}</span>
      {canEdit && !e.struck && (
        <>
          <button type="button" className="linkish" onClick={() => setOpen(o => !o)} aria-expanded={open}>{e.fixedAt !== undefined ? 'Change the time' : 'Time it'}</button>
          {e.fixedAt !== undefined && <button type="button" className="linkish" onClick={() => editEvent(sid, e.id, x => { const { fixedAt: _f, arrivedAt: _a, est: _e, ...rest } = x; return rest; })}>Clear the times</button>}
        </>
      )}
      {open && (
        <form className="rl-note" onSubmit={ev => { ev.preventDefault(); set(); }}>
          <input className="text-input" value={said} placeholder="how long: 90 s, 1:30, 4" aria-label="How long it took" onChange={ev => { setSaid(ev.target.value); setProblem(''); }} />
          <button type="submit" className="btn" disabled={!said.trim()}>Set</button>
          {problem && <span className="ie-problem" role="alert">{problem}</span>}
        </form>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ the pictures */

/** A bar for each stop, oldest first, the last 24: waiting for help (amber — waiting on somebody), then fixing. */
export function StopBars({ bars, event }: { bars: readonly StopBar[]; event: string }) {
  const list = bars.slice(-24);
  const W = 360, L = 40, R = 52, RH = 14, T = 6, H = list.length * RH + T + 8;
  const max = Math.max(...list.map(b => (b.waitMin ?? 0) + b.fixMin), 0.5);
  const x = (m: number) => L + (m / max) * (W - L - R);
  if (!list.length) return null;
  return (
    <figure className="rl-fig rl-stopbars">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${list.length} ${plural(event, list.length)}, each with the time waiting for help and the time fixing`}>
        {list.map((b, i) => {
          const y = T + i * RH, w = b.waitMin ?? 0;
          return (
            <g key={b.at}>
              <text className="ln-ax" x={L - 5} y={y + 9} textAnchor="end">{hm(b.at)}</text>
              {b.waitMin !== undefined && <rect className="rl-bar-wait" x={x(0)} y={y + 1} width={Math.max(0.6, x(w) - x(0))} height={RH - 4}><title>{`waiting for help ${mins(w)}`}</title></rect>}
              <rect className={b.waitMin !== undefined ? 'rl-bar-fix' : 'rl-bar-whole'} x={x(w)} y={y + 1} width={Math.max(0.6, x(w + b.fixMin) - x(w))} height={RH - 4}><title>{`${b.waitMin !== undefined ? 'fixing' : 'the whole time'} ${mins(b.fixMin)}`}</title></rect>
              <text className="ln-ax rl-bar-l" x={x(w + b.fixMin) + 4} y={y + 9} textAnchor="start">{b.est ? '~' : ''}{mins(w + b.fixMin)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="ln-legend">
        <span className="ln-key rl-key-wait" aria-hidden /> waiting for help · <span className="ln-key rl-key-fix" aria-hidden /> fixing, from help arrived to running again · <span className="ln-key rl-key-whole" aria-hidden /> the whole time, no help stamp · ~ said, not clocked · each {event}, oldest first
      </figcaption>
    </figure>
  );
}

/** Reasons ranked, a bar for the minutes. */
export function Reasons({ rows, by, event }: { rows: readonly ReasonRow[]; by: 'wait' | 'clear'; event: string }) {
  const key = (r: ReasonRow) => (by === 'wait' ? r.waitMin : r.clearMin);
  const max = Math.max(...rows.map(key), 0.1);
  return (
    <ul className="ws-bars rl-reasons" aria-label={by === 'wait' ? 'Reasons, by the minutes waited' : 'Reasons, by the minutes lost'}>
      {rows.map(r => (
        <li key={r.reason} className="ws-bar" data-reason={r.reason}>
          <span className="ws-bar-w">{r.reason}</span>
          <svg className="ws-bar-t" aria-hidden width="100%" height="16"><rect className={by === 'wait' ? 'rl-bar-wait' : 'rl-bar-fix'} x="0" y="0" width={`${Math.max(1.5, (key(r) / max) * 100)}%`} height="16" /></svg>
          <span className="ws-bar-n"><b>{r.n}</b> {plural(event, r.n)} · waited {mins(r.waitMin)} · cleared {mins(r.clearMin)}</span>
        </li>
      ))}
    </ul>
  );
}

function ShiftsTable({ rows }: { rows: readonly ShiftRow[] }) {
  if (!rows.length) return null;
  return (
    <table className="rl-days rl-shifts">
      <thead><tr><th>Shift</th><th>Calls</th><th>Answered</th><th>Help in, typically</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.name} data-shift={r.name}><td>{r.name}</td><td>{r.calls}</td><td>{r.answered}</td><td>{r.respMedianMin !== undefined ? mins(r.respMedianMin) : '—'}</td></tr>)}</tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ the panels */

/** A TIMED STOP COUNT'S REPAIR TIMES. */
export function RepairPanel({ item, f }: { item: RelItem; f: RelFigures }) {
  const { c, r } = item;
  const said = r ? repairSays(c.event, f, r) : undefined;
  const ins = useMemo(() => (r ? repairInsights(c.event, f, r) : []), [c.event, f, r]);
  if (!r || !said) return null;
  const fw = fitterWords(fitterCost(r, f.rate, c.fitterRate));
  return (
    <LeanPanel title="Repair times" className="ln-solo rl-repair-p">
      <p className={'rl-say2 is-' + said.tone} data-repair>{said.text}</p>
      <LeanInsights insights={ins} />
      <StopBars bars={r.bars} event={c.event} />
      {r.reasons.length > 0 && <><h3 className="rl-sub-h">What the {plural(c.event)} were</h3><Reasons rows={r.reasons} by="clear" event={c.event} /></>}
      {fw && <p className="sub rl-cost" data-fitter>{fw}</p>}
    </LeanPanel>
  );
}

/** A CALL COUNT'S RESPONSE AND CLEARING. */
export function CallsPanel({ item, f, line, where, shifts }: { item: RelItem; f: RelFigures; line?: RelCostLine; where?: RelWhere; shifts?: Parameters<typeof callsByShift>[1] }) {
  const { c, k, stops } = item;
  const said = k ? callSays(c.event, k) : undefined;
  const ins = useMemo(() => (k ? callInsights(c.event, k, !!c.reasons?.length) : []), [c.event, c.reasons, k]);
  if (!k || !said) return null;
  const byShift = callsByShift(stops ?? [], shifts);
  const wait = waitWords(waitCost(k, f, c, line, where));
  return (
    <LeanPanel title={`${cap(plural(c.event))} for help`} className="ln-solo rl-calls-p">
      <p className={'rl-say2 is-' + said.tone} data-calls>{said.text}</p>
      <LeanInsights insights={ins} />
      {k.reasons.length > 0 && <><h3 className="rl-sub-h">Reasons, by the minutes waited</h3><Reasons rows={k.reasons} by="wait" event={c.event} /></>}
      {byShift.length > 0 && <><h3 className="rl-sub-h">By shift</h3><ShiftsTable rows={byShift} /></>}
      <StopBars bars={k.bars} event={c.event} />
      {wait && <p className="sub rl-cost" data-wait>{wait}</p>}
    </LeanPanel>
  );
}

export type { CallFigures, RepairFigures };
