/* THE SPAGHETTI BOARD — FC-004 part 3 (knowledge/specs/FC-004-spaghetti-board.md; the model in ./board).
 *
 * Rowland, 7 November: "a blank page — draw the line or area out, whatever it may be, put people there and click the person to the
 * objects I have on the map, as I do that lines are created." A board like the Line standard's: an area drawn with a tap and stretched
 * from its corner, a place pin, the Line standard's icons, people; a scale set by two taps and the metres between them; a person
 * tapped and Walk, then the places in the order they go, each tap a move and a line in that person's style. Every change writes the
 * board and the boxes it fills (board.boardInputs) — the calculator below says the figures; this draws nothing it does not keep.
 *
 * Drawn in one SVG measured to its box (no inline styles), the page's to scroll: only a mark being dragged holds the finger. */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { BOARDS, ICON_GROUPS, MARKS, markOf, type BoardShape } from '../linestandard/standard';
import { Sheet } from '../../ui/Sheet';
import { offerUndo } from '../../ui/Undo';
import { uid } from '../../lib/ids';
import { fmt } from '../calc/format';
import type { Inputs } from '../calc/types';
import { WALKER_STYLES } from './walkers';
import {
  addToWalk, boardInputs, boardWalks, canAdd, emptyBoard, kindWord, metresPerUnit, namesOf, pathsOf, readBoard, scaleSaid, straightMetres, undoWalk,
  withoutMark, writeBoard, type BoardMark, type SpagBoard,
} from './board';
import './spaghettiBoard.css';

type Tool = { t: 'move' } | { t: 'area' } | { t: 'place' } | { t: 'person' } | { t: 'icon'; kind: string } | { t: 'scale'; a?: [number, number]; b?: [number, number] } | { t: 'walk'; person: string };
type Drag = { id: string; mode: 'move' | 'size'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; moved: boolean };

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
const r1 = (x: number) => Math.round(x * 10) / 10;

export function SpaghettiBoard({ draft, canEdit, onPatch }: { draft: Inputs; canEdit: boolean; onPatch: (patch: Record<string, string | number | null>) => void }) {
  const kept = useMemo(() => readBoard(draft.board), [draft.board]);
  const [b, setB] = useState<SpagBoard>(() => kept ?? emptyBoard());
  /* the record moved under us (another device, an Undo): take it, unless a drag is in hand */
  const dragging = useRef<Drag | null>(null);
  useEffect(() => { if (kept && !dragging.current && writeBoard(kept) !== writeBoard(b)) setB(kept); }, [kept]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tool, setTool] = useState<Tool>({ t: 'move' });
  const [open, setOpen] = useState<string | null>(null);
  const [icons, setIcons] = useState(false);
  const [metres, setMetres] = useState('');
  const [say, setSay] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const shape = b.shape;
  const svg = useRef<SVGSVGElement>(null);
  const [bw, setBw] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    /* as wide as the page, but never taller than most of the screen — a square or tall board is narrowed to fit the eye */
    const fit = () => setBw(Math.max(240, Math.min(el.clientWidth, ((window.innerHeight || 800) * 0.72 * BOARDS[shape].w) / BOARDS[shape].h)));
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [shape]);
  const bh = (bw * BOARDS[b.shape].h) / BOARDS[b.shape].w;
  const px = (x: number) => (x / 100) * bw, py = (y: number) => (y / 100) * bh;
  const names = useMemo(() => namesOf(b), [b]);
  const paths = useMemo(() => pathsOf(b), [b]);
  const ro = !canEdit;

  /** Keep a new board: the board itself and, while it has a walk (or had one), the boxes it fills. */
  const commit = (next: SpagBoard) => {
    setB(next);
    const patch: Record<string, string | number | null> = { board: writeBoard(next) };
    if (boardWalks(next) || boardWalks(b)) Object.assign(patch, boardInputs(next, draft));
    onPatch(patch);
  };

  const at = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return [50, 50];
    return [r1(clamp(((e.clientX - r.left) / r.width) * 100)), r1(clamp(((e.clientY - r.top) / r.height) * 100))];
  };

  /* a tap on the board itself — not on a mark */
  const boardTap = (e: React.MouseEvent) => {
    if (ro) return;
    const [x, y] = at(e);
    if (tool.t === 'area') { const m: BoardMark = { id: uid(), kind: 'area', x, y, w: 22, h: 16 }; commit({ ...b, marks: [...b.marks, m] }); setOpen(m.id); setTool({ t: 'move' }); return; }
    if (tool.t === 'place' || tool.t === 'person' || tool.t === 'icon') {
      const m: BoardMark = { id: uid(), kind: tool.t === 'icon' ? tool.kind : tool.t, x, y };
      commit({ ...b, marks: [...b.marks, m] });
      if (tool.t !== 'person') setOpen(m.id);
      return;
    }
    if (tool.t === 'scale') { setTool(tool.a ? { t: 'scale', a: tool.a, b: [x, y] } : { t: 'scale', a: [x, y] }); return; }
    if (tool.t === 'walk') setSay('Tap a place — an area, a pin, an icon — or the person to finish.');
  };

  /* a mark pressed: dragged when it moves (Move only), tapped when it does not */
  const placing = tool.t === 'area' || tool.t === 'place' || tool.t === 'person' || tool.t === 'icon' || tool.t === 'scale';
  const down = (e: RPointerEvent, m: BoardMark, mode: Drag['mode'] = 'move') => {
    /* an area is the ground while something is being put on it: the tap goes through to the board */
    if (m.kind === 'area' && mode === 'move' && placing) return;
    e.stopPropagation();
    if (ro) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragging.current = { id: m.id, mode, sx: e.clientX, sy: e.clientY, ox: m.x, oy: m.y, ow: m.w ?? 0, oh: m.h ?? 0, moved: false };
  };
  const move = (e: RPointerEvent) => {
    const d = dragging.current;
    if (!d || tool.t === 'walk' || tool.t === 'scale') return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    const fx = (dx / bw) * 100, fy = (dy / bh) * 100;
    setB(cur => ({ ...cur, marks: cur.marks.map(m => m.id !== d.id ? m : d.mode === 'move'
      ? { ...m, x: r1(clamp(d.ox + fx)), y: r1(clamp(d.oy + fy)) }
      : { ...m, w: r1(clamp(d.ow + fx * 2, 4, 100)), h: r1(clamp(d.oh + fy * 2, 4, 100)) }) }));
  };
  const up = (m: BoardMark) => {
    const d = dragging.current;
    dragging.current = null;
    if (!d) return;
    if (d.moved) { commit(now.current); return; }
    tapMark(m);
  };
  /* the board as last drawn — what a drag leaves when the finger lifts */
  const now = useRef(b);
  now.current = b;

  const tapMark = (m: BoardMark) => {
    setSay(null);
    if (tool.t === 'walk') {
      if (m.id === tool.person) { setTool({ t: 'move' }); return; }
      const why = canAdd(b, tool.person);
      if (why) { setSay(why); return; }
      commit(addToWalk(b, tool.person, m.id));
      return;
    }
    if (tool.t === 'scale') return;
    setOpen(m.id);
  };

  const opened = b.marks.find(m => m.id === open);
  const walking = tool.t === 'walk' ? b.marks.find(m => m.id === tool.person) : undefined;
  const walkOf = (person: string) => b.walks.find(w => w.person === person);
  const styleOf = (person: string) => { const p = paths.find(x => x.person === person); return p ? WALKER_STYLES[p.walker] : WALKER_STYLES[Math.min(paths.length, 3)]; };

  const rename = (id: string, label: string) => commit({ ...b, marks: b.marks.map(m => (m.id === id ? { ...m, label: label.slice(0, 60) } : m)) });
  const takeOff = (id: string) => {
    const before = b;
    commit(withoutMark(b, id));
    setOpen(null);
    offerUndo(`${names.get(id) ?? 'It'} taken off the board${before.walks.some(w => w.person === id || w.places.includes(id)) ? ', with its moves' : ''}.`, async () => commit(before));
  };
  const setScale = () => {
    if (tool.t !== 'scale' || !tool.a || !tool.b) return;
    const m = Number(metres.replace(/,/g, ''));
    if (!(m > 0)) { setSay('Say how many metres there are between the two marks — a number above nought.'); return; }
    commit({ ...b, scale: { a: tool.a, b: tool.b, m } });
    setTool({ t: 'move' }); setMetres(''); setSay(null);
  };
  const reshape = (shape: BoardShape) => commit({ ...b, shape });

  const hint = ro ? 'The board as drawn.'
    : tool.t === 'walk' ? `Walking: ${names.get(tool.person)} — tap each place in the order they go. Tap ${names.get(tool.person)} again, or Done, to finish.`
      : tool.t === 'scale' ? (!tool.a ? 'Scale: tap one end of something you know the length of.' : !tool.b ? 'Scale: now tap the other end.' : 'How many metres are there between the two marks?')
        : tool.t === 'area' ? 'Tap where the area goes — the line, a store, a bay. Then name it and stretch it from its corner.'
          : tool.t === 'place' ? 'Tap where the place is — the film store, the bin, the office.'
            : tool.t === 'person' ? 'Tap where each person stands. Then tap a person and Walk.'
              : tool.t === 'icon' ? `Tap where the ${markOf(tool.kind).word.toLowerCase()} goes.`
                : b.marks.length === 0 ? 'Draw what you are looking at: an area for the line, the places people go, the people. Then tap a person and Walk.'
                  : 'Drag to move. Tap a person to walk them; tap anything to name it or take it off.';
  const k = metresPerUnit(b);

  return (
    <section className="sb" aria-label="The board" data-spag-board>
      <div className="sb-head">
        <h2>The board</h2>
        {!ro && (
          <div className="chip-row sb-shape" role="group" aria-label="The board's shape">
            {(Object.keys(BOARDS) as BoardShape[]).map(s => (
              <button key={s} type="button" className={'chip' + (b.shape === s ? ' on' : '')} aria-pressed={b.shape === s} onClick={() => reshape(s)}>{BOARDS[s].word}</button>
            ))}
          </div>
        )}
      </div>
      {!ro && tool.t !== 'walk' && (
        <div className="sb-tools" role="toolbar" aria-label="Draw on the board">
          {([['move', 'Move'], ['area', 'Area'], ['place', 'Place'], ['person', 'Person']] as const).map(([t, w]) => (
            <button key={t} type="button" className={'sb-tool' + (tool.t === t ? ' on' : '')} aria-pressed={tool.t === t} onClick={() => { setTool({ t } as Tool); setSay(null); }}>{w}</button>
          ))}
          <button type="button" className={'sb-tool' + (tool.t === 'icon' ? ' on' : '')} aria-pressed={tool.t === 'icon'} onClick={() => setIcons(true)}>{tool.t === 'icon' ? markOf(tool.kind).word : 'Icon'} ▾</button>
          <button type="button" className={'sb-tool' + (tool.t === 'scale' ? ' on' : '')} aria-pressed={tool.t === 'scale'} onClick={() => { setTool({ t: 'scale' }); setSay(null); }}>{k ? 'Scale again' : 'Set the scale'}</button>
        </div>
      )}
      {walking && (
        <div className="sb-walkbar" role="status">
          <span><b>{names.get(walking.id)}</b> · {(walkOf(walking.id)?.places.length ?? 0) === 0 ? 'no move yet' : `${walkOf(walking.id)?.places.length} tapped`}</span>
          <button type="button" className="btn" disabled={!walkOf(walking.id)} onClick={() => commit(undoWalk(b, walking.id))}>Undo</button>
          <button type="button" className="btn btn-primary" onClick={() => setTool({ t: 'move' })}>Done</button>
        </div>
      )}
      {b.from && <p className="sub sb-from" data-from-standard>Drawn from the Line standard for {b.from.product} — its people, areas and icons copied here; the standard is unchanged{b.marks.length ? '' : ', and had nothing to copy'}.</p>}
      <p className="sub sb-hint" data-sb-hint>{hint}</p>
      {say && <p className="sb-say" role="alert">{say}</p>}
      {tool.t === 'scale' && tool.a && tool.b && (
        <form className="sb-scale" onSubmit={e => { e.preventDefault(); setScale(); }}>
          <label className="field"><span className="field-label">Metres between the two marks</span>
            <input className="text-input" inputMode="decimal" autoFocus value={metres} onChange={e => setMetres(e.target.value)} aria-label="Metres between the two marks" />
          </label>
          <button type="submit" className="btn btn-primary">Set the scale</button>
          <button type="button" className="btn" onClick={() => setTool({ t: 'scale' })}>Tap again</button>
        </form>
      )}
      <div ref={wrap} className={'sb-board' + (tool.t !== 'move' && !ro ? ' is-placing' : '')}>
        <svg ref={svg} className="sb-svg" width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} onClick={boardTap} onPointerMove={move} role="img" aria-label="The board: the areas, the places, the people and their walks">
          <rect className="sb-ground" x={0.5} y={0.5} width={bw - 1} height={bh - 1} rx={12} />
          {b.marks.filter(m => m.kind === 'area').map(m => {
            const x = px(m.x - (m.w ?? 0) / 2), y = py(m.y - (m.h ?? 0) / 2), w = px(m.w ?? 0), h = py(m.h ?? 0);
            return (
              <g key={m.id} className="sb-area" data-mark={m.id} data-name={names.get(m.id)} onPointerDown={e => down(e, m)} onPointerUp={() => up(m)} onClick={e => { if (!placing) e.stopPropagation(); }}>
                <rect x={x} y={y} width={w} height={h} rx={6} />
                <text x={x + 8} y={y + 18} className="sb-area-l">{names.get(m.id)}</text>
                {!ro && tool.t === 'move' && <rect className="sb-size" x={x + w - 14} y={y + h - 14} width={18} height={18} rx={4} aria-label={`Stretch ${names.get(m.id)}`}
                  onPointerDown={e => down(e, m, 'size')} onPointerUp={() => up(m)} />}
              </g>
            );
          })}
          {paths.map(p => {
            const st = WALKER_STYLES[p.walker];
            return <polyline key={p.person} className={'sb-path is-' + st.mark + (st.dash ? ' is-dash' : '')} points={p.points.map(pt => `${px(pt.x)},${py(pt.y)}`).join(' ')} data-path={names.get(p.person)} />;
          })}
          {paths.flatMap(p => p.points.slice(1).map((pt, i) => {
            const a = p.points[i], mx = (px(a.x) + px(pt.x)) / 2, my = (py(a.y) + py(pt.y)) / 2;
            return <g key={`${p.person}${i}`} className="sb-step"><circle cx={mx} cy={my} r={8} /><text x={mx} y={my + 3.5} textAnchor="middle">{i + 1}</text></g>;
          }))}
          {tool.t === 'scale' && tool.a && <circle className="sb-tick" cx={px(tool.a[0])} cy={py(tool.a[1])} r={6} />}
          {tool.t === 'scale' && tool.b && <circle className="sb-tick" cx={px(tool.b[0])} cy={py(tool.b[1])} r={6} />}
          {tool.t === 'scale' && tool.a && tool.b && <line className="sb-scale-l" x1={px(tool.a[0])} y1={py(tool.a[1])} x2={px(tool.b[0])} y2={py(tool.b[1])} />}
          {b.marks.filter(m => m.kind !== 'area').map(m => {
            const x = px(m.x), y = py(m.y), on = walking?.id === m.id;
            const isP = m.kind === 'person', ic = m.kind === 'place' ? null : markOf(isP ? 'person' : m.kind);
            const st = isP ? styleOf(m.id) : undefined;
            return (
              <g key={m.id} className={'sb-mark' + (on ? ' is-on' : '') + (isP ? ' is-person' : '') + (m.kind === 'place' ? ' is-pin' : '')} data-mark={m.id} data-name={names.get(m.id)}
                onPointerDown={e => down(e, m)} onPointerUp={() => up(m)} onClick={e => e.stopPropagation()} role="button" aria-label={names.get(m.id)}>
                <circle cx={x} cy={y} r={18} className="sb-hit" />
                {m.kind === 'place'
                  ? <><circle cx={x} cy={y} r={9} className="sb-pin" /><circle cx={x} cy={y} r={3.5} className="sb-pin-c" /></>
                  : <g transform={`translate(${x - 14} ${y - 14}) scale(${28 / 24})`}>
                    <circle cx="12" cy="12" r="12" className={isP ? 'sb-ic-p is-' + (st?.mark ?? 'ink') : 'sb-ic'} fill={isP ? undefined : ic?.colour} />
                    <path d={ic?.glyph} fill="#fff" fillRule={ic?.rule ?? 'evenodd'} transform="translate(2.4 2.4) scale(0.8)" />
                  </g>}
                <text x={x} y={y + (m.kind === 'place' ? 22 : 28)} textAnchor="middle" className="sb-mark-l">{names.get(m.id)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {k && <p className="sub sb-scale-said" data-scale>{scaleSaid(b)}</p>}
      {paths.length > 0 && (
        <ul className="sb-moves" aria-label="The moves">
          {paths.map(p => (
            <li key={p.person}>
              <b>{names.get(p.person)}</b>
              <span>{p.points.slice(1).map((pt, i) => {
                const typed = draft[`w${p.walker + 1}_s${String(i + 2).padStart(2, '0')}_m`];
                const straight = straightMetres(b, [p.points[i].x, p.points[i].y], [pt.x, pt.y]);
                const len = typed !== undefined && typed !== '' ? `${fmt(Number(typed), 1)} m measured` : straight !== undefined ? `${fmt(straight, 1)} m straight` : 'no length';
                return `${i + 1}. ${p.points[i].name} → ${pt.name} (${len})`;
              }).join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
      {paths.length > 0 && <p className="sub sb-note">The walkers below are written from the board. Type a measured metres into a move’s box to replace its straight line.</p>}

      <Sheet open={icons} onClose={() => setIcons(false)} title="Put an icon on the board">
        {ICON_GROUPS.filter(g => g.group !== 'people').map(g => (
          <div key={g.group} className="sb-icons">
            <p className="sub">{g.word}</p>
            <div className="sb-icon-row">
              {MARKS.filter(x => x.group === g.group).map(x => (
                <button key={x.kind} type="button" className="sb-icon" onClick={() => { setTool({ t: 'icon', kind: x.kind }); setIcons(false); }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill={x.colour} /><path d={x.glyph} fill="#fff" fillRule={x.rule ?? 'evenodd'} transform="translate(2.4 2.4) scale(0.8)" /></svg>
                  <span>{x.word}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Sheet>

      <Sheet open={!!opened} onClose={() => setOpen(null)} title={opened ? `${kindWord(opened.kind)} — ${names.get(opened.id)}` : ''}>
        {opened && (
          <div className="sb-sheet">
            <label className="field"><span className="field-label">{opened.kind === 'person' ? 'Who — a label, never a name' : 'What it is called'}</span>
              <input className="text-input" defaultValue={opened.label ?? ''} placeholder={names.get(opened.id)} maxLength={60} aria-label="Its name" disabled={ro}
                onBlur={e => { if ((e.target.value.trim()) !== (opened.label ?? '')) rename(opened.id, e.target.value.trim()); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            </label>
            {opened.kind === 'person' && !ro && (
              <button type="button" className="btn btn-primary" onClick={() => { const why = canAdd(b, opened.id); if (why && !walkOf(opened.id)) { setSay(why); setOpen(null); return; } setTool({ t: 'walk', person: opened.id }); setOpen(null); setSay(null); }}>
                {walkOf(opened.id) ? 'Walk on — add the next places' : 'Walk — tap the places they go'}
              </button>
            )}
            {opened.kind === 'person' && walkOf(opened.id) && !ro && (
              <button type="button" className="btn" onClick={() => { const before = b; commit({ ...b, walks: b.walks.filter(w => w.person !== opened.id) }); setOpen(null); offerUndo(`${names.get(opened.id)}’s walk taken off.`, async () => commit(before)); }}>Take the walk off</button>
            )}
            {opened.kind !== 'person' && (() => { const n = b.walks.reduce((t, w) => t + w.places.filter(p => p === opened.id).length, 0) + paths.reduce((t, p) => t + (p.points[0].id === opened.id ? 1 : 0), 0); return <p className="sub">{n ? `On the walks: ${n === 1 ? 'once' : `${n} times`}.` : 'Not walked to yet.'}</p>; })()}
            {!ro && <button type="button" className="btn sp-rm" onClick={() => takeOff(opened.id)}>Take it off the board</button>}
          </div>
        )}
      </Sheet>
    </section>
  );
}

