/* A LINE'S ACTION TRACKER ON SCREEN (lineActions.ts says why and what). The classic tracker — what, who, due, status,
 * priority — a row each problem on the line, edited where it sits (the problem's own fields), and the Gantt drawn from the same
 * rows beside them: a bar from the day it was raised to its due day, today's line, late red with its overdue tail, done quiet
 * green, no day a point that says so. ＋ Add an action raises a problem on the line — the one record.
 * WHAT WAITS FOR WHAT (7 November, depends.ts): a row's Link offers both ways round; a bar's end dragged onto another bar asks
 * which is done first; the links drawn as arrows from the end of one bar to the start of the next, amber where a day cannot be
 * kept — the same links the problem's own editor shows. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { addSnag, listAllSnags, listSnagAssets, onDataChange, patchSnag, setSnagsStatus } from '../../db';
import { dueFromInput, dueToInput, type Snag, type SnagStatus } from '../../snag/types';
import { uid } from '../../lib/ids';
import { nav } from '../../state/useRoute';
import { LeanTiles } from '../../ui/Lean';
import type { LeanTile } from '../../lib/lean';
import { Icon } from '../../ui/Icon';
import { LinkSheet } from './Depends';
import { holdsUp } from './depends';
import { DAY, barOf, ganttSpan, trackerRows, trackerSays, trackerSummary, type TrackerRow } from './lineActions';
import './lineActions.css';

const STATUS: { v: SnagStatus; w: string }[] = [{ v: 'open', w: 'To do' }, { v: 'in_progress', w: 'Doing' }, { v: 'closed', w: 'Done' }];
const PRIO: { v: 'critical' | 'high' | 'low'; w: string }[] = [{ v: 'critical', w: 'Critical' }, { v: 'high', w: 'High' }, { v: 'low', w: 'Low' }];
const STATE_WORD: Record<TrackerRow['state'], string> = { late: 'Late', soon: 'Due soon', open: 'On time', doing: 'On time', done: 'Done', nodate: 'No day' };
/** Where a mark sits on the Gantt — its left edge and, for a bar, its width (one helper, so the page's positions are computed
 *  in one place). */
const at = (left: string, width?: string): CSSProperties => (width ? { left, width } : { left });
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function LineActions({ wsId, lineName }: { wsId: string; lineName: string }) {
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [withDone, setWithDone] = useState(false);
  const [adding, setAdding] = useState('');
  const [link, setLink] = useState<{ id: string; pair?: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ key: string; d: string; clash: boolean }[]>([]);
  const [drag, setDrag] = useState<{ from: string; x0: number; y0: number; x: number; y: number } | null>(null);
  const [today] = useState(() => Date.now());
  const load = useCallback(async () => { const [s, a] = await Promise.all([listAllSnags(), listSnagAssets(wsId)]); setSnags(s); setAssets(a); }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const machineOf = useCallback((s: Snag) => (s.assetId ? assets.find(a => a.id === s.assetId)?.name : s.targetAsset), [assets]);
  const rows = useMemo(() => (snags ? trackerRows(snags, wsId, today, { withDone, machineOf }) : []), [snags, wsId, withDone, machineOf, today]);
  const sum = trackerSummary(rows);
  const span = useMemo(() => ganttSpan(rows, today), [rows, today]);
  const weeks = Array.from({ length: span.weeks }, (_, i) => span.from + i * 7 * DAY);
  const pct = (t: number) => `${((t - span.from) / (span.to - span.from)) * 100}%`;
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);

  /* THE ARROWS — from the end of what is waited for to the start of what waits, measured from the bars as drawn */
  const local = (g: HTMLElement, x: number, y: number) => { const r = g.getBoundingClientRect(); return { x: x - r.left + g.scrollLeft, y: y - r.top + g.scrollTop }; };
  useLayoutEffect(() => {
    const g = gridRef.current; if (!g) { setLines([]); return; }
    const measure = () => {
      const mark = (id: string) => g.querySelector(`[data-la-row="${CSS.escape(id)}"] [data-la-bar]`)?.getBoundingClientRect();
      const out: { key: string; d: string; clash: boolean }[] = [];
      for (const r of rows) for (const p of r.after) {
        const a = mark(p), b = mark(r.id); if (!a || !b || !a.width && !a.height) continue;
        const s1 = local(g, a.right, a.top + a.height / 2), s2 = local(g, b.left, b.top + b.height / 2);
        const xm = s1.x + 8, xe = s2.x - 8;
        const d = xe >= xm ? `M${s1.x} ${s1.y} H${xm} V${s2.y} H${s2.x - 1}`
          : `M${s1.x} ${s1.y} H${xm} V${s2.y + (s2.y > s1.y ? -14 : 14)} H${xe} V${s2.y} H${s2.x - 1}`;
        out.push({ key: `${p}>${r.id}`, d, clash: !!r.clash });
      }
      setLines(out);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [rows]);
  /* A BAR'S END DRAGGED ONTO ANOTHER — then the sheet asks which is done first */
  useEffect(() => {
    if (!drag) return;
    const g = gridRef.current; if (!g) return;
    const move = (e: PointerEvent) => { const p = local(g, e.clientX, e.clientY); setDrag(d => (d ? { ...d, x: p.x, y: p.y } : d)); };
    const up = (e: PointerEvent) => {
      const to = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-la-row]')?.getAttribute('data-la-row');
      if (to && to !== drag.from) setLink({ id: drag.from, pair: to });
      setDrag(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag]);
  const startDrag = (id: string) => (e: ReactPointerEvent) => {
    const g = gridRef.current; if (!g) return;
    e.preventDefault(); e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), p = local(g, r.left + r.width / 2, r.top + r.height / 2);
    setDrag({ from: id, x0: p.x, y0: p.y, x: p.x, y: p.y });
  };
  const whatOf = (id: string) => snags?.find(s => s.id === id)?.problem ?? '';

  const tiles: LeanTile[] = [
    { k: 'Open', v: String(sum.open), of: 'actions on the line' },
    { k: 'Late', v: String(sum.late), tone: sum.late ? 'r' : 'n', of: 'past their day' },
    { k: 'Due this week', v: String(sum.soon), tone: sum.soon ? 'a' : 'n', of: 'within 7 days' },
    { k: 'Nobody on it', v: String(sum.noOwner), tone: sum.noOwner ? 'a' : 'n', of: 'no owner yet' },
    { k: 'No day', v: String(sum.noDate), tone: sum.noDate ? 'a' : 'n', of: 'no due day yet' },
  ];

  const add = async () => {
    const what = adding.trim(); if (!what) return;
    const t = Date.now();
    await addSnag({ id: uid(), workspaceId: wsId, problem: what, status: 'open', raisedAt: t, updatedAt: t, media: [], priority: 'low' } as Snag);
    setAdding('');
  };

  if (!snags) return <section className="pl-sec la" aria-label="Action tracker"><p className="sub">Loading the tracker…</p></section>;
  return (
    <section className="pl-sec la" aria-label="Action tracker" data-line-actions={wsId}>
      <div className="pl-sec-h">
        <h2>Action tracker</h2>
        <span className="sub">Every problem raised on {lineName} is here at once — who, by when, where it stands — and the Gantt draws itself from it.</span>
      </div>
      <p className="lat-says" data-la-says>{trackerSays(rows, lineName)}</p>
      <LeanTiles tiles={tiles} className="ie-strip lat-tiles" />
      <div className="lat-bar">
        <form className="lat-add" onSubmit={e => { e.preventDefault(); void add(); }}>
          <input className="text-input" value={adding} onChange={e => setAdding(e.target.value)} placeholder="Add an action — what needs doing" aria-label="Add an action" maxLength={240} />
          <button type="submit" className="btn btn-primary" disabled={!adding.trim()}>Add</button>
        </form>
        <label className="lat-done"><input type="checkbox" checked={withDone} onChange={e => setWithDone(e.target.checked)} /> Show done (last 30 days)</label>
      </div>

      {!rows.length ? <p className="sub lat-empty">{sum.done ? 'Nothing open.' : 'Nothing on the tracker yet — add an action above, or raise a problem on the line.'}</p> : (
        <div className={'lat-grid' + (drag ? ' is-dragging' : '')} role="table" aria-label={`Action tracker — ${lineName}`} ref={gridRef}>
          <svg className="lat-links" aria-hidden width={gridRef.current?.scrollWidth ?? 0} height={gridRef.current?.scrollHeight ?? 0}>
            <defs><marker id="lat-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" /></marker></defs>
            {lines.map(l => <path key={l.key} d={l.d} className={'lat-ln' + (l.clash ? ' is-clash' : '')} markerEnd="url(#lat-arrow)" data-la-link={l.key} />)}
            {drag && <path d={`M${drag.x0} ${drag.y0} L${drag.x} ${drag.y}`} className="lat-ln is-drag" />}
          </svg>
          <div className="lat-row lat-head" role="row">
            <span role="columnheader" className="lat-c-what">Action</span>
            <span role="columnheader" className="lat-c-who">Who</span>
            <span role="columnheader" className="lat-c-due">Due</span>
            <span role="columnheader" className="lat-c-st">Status</span>
            <span role="columnheader" className="lat-c-pr">Priority</span>
            <span role="columnheader" className="lat-c-gantt">
              <span className="lat-weeks">{weeks.map(w => <span key={w} className="lat-week" style={at(pct(w))}>{day(w)}</span>)}</span>
            </span>
          </div>
          {rows.map(r => {
            const b = barOf(r, span);
            const lateTail = r.state === 'late' && r.due != null ? at(pct(r.due + DAY), `${((t0.getTime() - r.due) / (span.to - span.from)) * 100}%`) : null;
            return (
              <div key={r.id} className={`lat-row is-${r.state}`} role="row" data-la-row={r.id} data-state={r.state}>
                <span role="cell" className="lat-c-what">
                  <button type="button" className="lat-what" onClick={() => nav(`/snags?line=${encodeURIComponent(wsId)}&open=${encodeURIComponent(r.id)}`)} title="Open the problem">{r.what}</button>
                  {r.machine && <span className="sub lat-mc">{r.machine}</span>}
                  {(() => { const held = holdsUp(snags, r.id); return (r.after.length > 0 || held.length > 0) && (
                    <span className="lat-deps" data-la-deps={r.id}>
                      {r.after.length > 0 && <span>Waits for {r.after.map(whatOf).join(' · ')}</span>}
                      {held.length > 0 && <span>Holds up {held.map(o => o.problem).join(' · ')}</span>}
                    </span>
                  ); })()}
                  {r.clash && <span className="lat-clash" data-la-clash={r.id}>{r.clash}</span>}
                  <button type="button" className="lat-link" aria-label={`Link — ${r.what}`} title="What it waits for, or holds up" onClick={() => setLink({ id: r.id })}><Icon name="link" size="1em" /> Link</button>
                </span>
                <span role="cell" className="lat-c-who">
                  <input className="text-input lat-in" defaultValue={r.owner} key={`o${r.id}${r.owner}`} placeholder="Nobody yet" aria-label={`Who — ${r.what}`}
                    onBlur={e => { const v = e.target.value.trim(); if (v !== r.owner) void patchSnag(r.id, { owner: v || undefined, updatedAt: Date.now() }); }} />
                </span>
                <span role="cell" className="lat-c-due">
                  <input className="text-input lat-in" type="date" defaultValue={dueToInput(r.due)} key={`d${r.id}${r.due}`} aria-label={`Due — ${r.what}`}
                    onChange={e => void patchSnag(r.id, { dueAt: dueFromInput(e.target.value), updatedAt: Date.now() })} />
                  <span className={`lat-state is-${r.state}`}>{r.state === 'late' ? `${r.lateBy} day${r.lateBy === 1 ? '' : 's'} late` : STATE_WORD[r.state]}</span>
                </span>
                <span role="cell" className="lat-c-st">
                  <select className="text-input lat-in" value={r.status} aria-label={`Status — ${r.what}`} onChange={e => void setSnagsStatus([r.id], e.target.value as SnagStatus)}>
                    {STATUS.map(o => <option key={o.v} value={o.v}>{o.w}</option>)}
                  </select>
                </span>
                <span role="cell" className="lat-c-pr">
                  <select className={`text-input lat-in lat-pr is-${r.priority}`} value={r.priority} aria-label={`Priority — ${r.what}`} onChange={e => void patchSnag(r.id, { priority: e.target.value as Snag['priority'], updatedAt: Date.now() })}>
                    {PRIO.map(o => <option key={o.v} value={o.v}>{o.w}</option>)}
                  </select>
                </span>
                <span role="cell" className="lat-c-gantt" aria-label={r.due != null ? `${day(r.start)} to ${day(r.closed ?? r.due)}` : `raised ${day(r.start)}, no due day`}>
                  <span className="lat-today" style={at(pct(t0.getTime()))} aria-hidden />
                  {b.point
                    ? <span className="lat-pt" style={at(`${b.left * 100}%`)} data-la-bar="point"><span className="lat-pt-w">no day</span><span className="lat-h" data-la-handle={r.id} title="Drag onto the action that waits for this one" onPointerDown={startDrag(r.id)} /></span>
                    : <span className={`lat-b is-${r.state}`} style={at(`${b.left * 100}%`, `${b.width * 100}%`)} data-la-bar="bar"><span className="lat-h" data-la-handle={r.id} title="Drag onto the action that waits for this one" onPointerDown={startDrag(r.id)} /></span>}
                  {lateTail && <span className="lat-tail" style={lateTail} aria-hidden />}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {link && snags && <LinkSheet snags={snags} id={link.id} {...(link.pair ? { pair: link.pair } : {})} onClose={() => setLink(null)} />}
      <p className="sub lat-key"><span className="lat-k is-open" /> planned · <span className="lat-k is-soon" /> due within a week · <span className="lat-k is-late" /> late (the tail runs to today) · <span className="lat-k is-done" /> done · <span className="lat-k-today" /> today · <span className="lat-k-ln" /> waits for (amber where its day cannot be kept). Drag the end of a bar onto another, or press Link, to say what waits for what. Change who, the day, the status or the priority here — it is the problem’s own, on the Problems page and every report.</p>
    </section>
  );
}
