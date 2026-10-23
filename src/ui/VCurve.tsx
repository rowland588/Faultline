/* THE V-CURVE — every station's capacity as a share of the bottleneck's, in
 * the order the product flows (docs/CAPACITY.md §4; lib/capacity vCurve).
 *
 * The bottleneck is the lowest; the line protects it when every station
 * either side is faster by the margin the owner agrees — about 10% a step is
 * the usual starting point, a convention, so it is never drawn until it is
 * set.
 *
 * DRAWN AS COLUMNS (Rowland, 14 October: "improve the graphics on the line
 * capacity ... sometimes you can't read what the bottom line says ... it
 * looks very bland, very old"). A column a station, as tall as its share of
 * the bottleneck once its own stops count; what it does while running is the
 * hatched cap on top — the stops' share seen, not read off a second line. The
 * names are words on the page under each column, wrapped to four lines, never
 * shrunk to fit a drawing (the whole name on hover and in the sheet below);
 * past what the box holds the columns scroll, faded at the edge that has more,
 * the scale and the target staying put, opened on the bottleneck. The colour says how close to the bottleneck
 * a station runs: the bottleneck in the house's graphite, the stations
 * either side in the teal of what you press — a column opens its station —
 * lighter the more they have to spare, so the V is seen in colour as well as
 * height. Only the abnormal wears a state colour: a station under the agreed
 * V is amber, with the words; the target is red only when the bottleneck
 * cannot meet it. Nothing is stored here but the margin. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { shareColours, type CapacityResult, type VCurve as V } from '../lib/capacity';
import { fmtN } from '../lib/capacityWords';
import { Icon } from './Icon';

export function VCurveView({ r, v, target, margin, canAgree, onMargin, onPick }: {
  r: CapacityResult; v: V; target?: number; margin?: number; canAgree: boolean; onMargin: (m: number | undefined) => void;
  /** A column tapped: its station opened, by its index on the line. */
  onPick?: (stationIndex: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(margin ?? 10));
  const scroller = useRef<HTMLDivElement>(null);
  const limitAt = v.points.findIndex(p => p.isLimit);
  /* which edge has more to scroll to: faded, so more columns are seen to be there */
  const edges = () => {
    const el = scroller.current;
    if (!el) return;
    el.dataset.l = el.scrollLeft > 4 ? '1' : '';
    el.dataset.r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4 ? '1' : '';
  };
  /* many stations: open on the bottleneck, the scale staying put */
  useEffect(() => {
    const el = scroller.current;
    if (el && limitAt >= 0 && el.scrollWidth > el.clientWidth) {
      const col = el.querySelectorAll<HTMLElement>('.vc-col')[limitAt];
      if (col) el.scrollLeft = Math.max(0, col.offsetLeft + col.offsetWidth / 2 - el.clientWidth / 2);
    }
    edges();
  }, [limitAt, v.points.length]);
  if (!v.points.length || !v.limit) return null;
  const lim = v.limit.perMin;
  const tgt = target != null && lim > 0 ? (target / lim) * 100 : undefined;
  /* THE SCALE: from nothing — a column's height is its share, honestly —
     to a little over the highest, never past 300%: a station many times
     faster than the bottleneck is cut at the top with its figure on it, so
     the stations that matter, the ones near 100%, keep their height. */
  const most = Math.max(...v.points.map(p => Math.max(p.runningPct, p.guide ?? 0)), tgt ?? 0);
  const top = Number.isFinite(most) ? Math.min(300, Math.max(140, Math.ceil((most + 8) / 20) * 20)) : 300;
  const step = top > 200 ? 50 : 25;
  const grid: number[] = [];
  for (let p = 0; p <= top + 1e-9; p += step) grid.push(p);
  const h = (p: number) => `${(Math.max(0, Math.min(p, top)) / top) * 100}%`;
  const n = v.points.length;
  const over = tgt != null && tgt > 100 + 1e-9;
  const save = () => { const m = Number(draft); onMargin(Number.isFinite(m) && m > 0 && m <= 100 ? m : undefined); setEditing(false); };
  return (
    <div className="vc">
      <div className="vc-box">
        <div className="vc-head">
          <b className="vc-title">The V — every station beside the bottleneck</b>
          <span className="vc-scale">as a share of the bottleneck, in {r.unit} a minute{onPick ? ' · tap a column to open it' : ''}</span>
        </div>
        <div className="vc-plot">
          {/* the scale, kept still while the columns scroll */}
          <div className="vc-yaxis" aria-hidden>
            {grid.map(p => <span key={p} className={'vc-tick' + (p === 100 ? ' is-100' : '')} style={{ bottom: h(p) }}>{p}%</span>)}
          </div>
          {/* the target marked on the scale, where it stays while the columns
              scroll and covers no column's figure; said in words in the key */}
          {tgt != null && (
            <span className={'vc-tgt-tag' + (over ? ' is-over' : '')} style={{ top: `calc(var(--padT) + var(--plotH) * ${1 - Math.min(tgt, top) / top})` }}>
              {fmtN(target ?? 0)}/min
            </span>
          )}
          <div className="vc-scroll" ref={scroller} onScroll={edges}>
            <div className="vc-cols" style={{ '--n': n } as CSSProperties}>
              <div className="vc-lines" aria-hidden>
                {grid.map(p => <span key={p} className={'vc-gl' + (p === 100 ? ' is-100' : '')} style={{ bottom: h(p) }} />)}
              </div>
              {v.points.map(p => {
                const [deep, light] = shareColours(p.pct, p.isLimit, p.under);
                const cut = p.pct > top;
                const style = { '--c': deep, '--c2': light } as CSSProperties;
                const body = (
                  <>
                    <span className="vc-stack">
                      {p.runningPct > p.pct + 0.5 && !cut && (
                        <span className="vc-runcap" style={{ bottom: h(p.pct), height: `calc(${h(p.runningPct)} - ${h(p.pct)})` }} />
                      )}
                      <span className={'vc-pt vc-bar' + (p.isLimit ? ' is-limit' : p.under ? ' is-under' : '') + (cut ? ' is-cut' : '')} style={{ height: h(p.pct) }} />
                      <span className={'vc-val' + (p.under ? ' is-under' : '') + (p.isLimit ? ' is-limit' : '')} style={{ bottom: `calc(${h(cut ? top : Math.max(p.pct, p.runningPct))} + 6px)` }}>
                        {p.isLimit && <span className="vc-neck">BOTTLENECK</span>}
                        <span className="vc-pct">{p.isLimit ? '100%' : `${fmtN(Math.round(p.pct))}%`}</span>
                        {p.under && <span className="vc-underw">under the V</span>}
                      </span>
                    </span>
                    <span className="vc-name">
                      <span className="vc-id"><span className="vc-num">{p.index + 1}</span><Icon name={p.kind === 'people' ? 'person' : 'machine'} size={13} /></span>
                      <b className="vc-nm" title={p.name}>{p.name}</b>
                      <span className="vc-sp">{fmtN(p.perMin)} {r.unit}/min</span>
                    </span>
                  </>
                );
                const cls = 'vc-col' + (p.isLimit ? ' is-limit' : '') + (p.under ? ' is-under' : '');
                return onPick
                  ? <button key={p.index} type="button" className={cls} style={style} onClick={() => onPick(p.index)}
                      aria-label={`${p.name}: ${p.isLimit ? 'the bottleneck' : `${fmtN(Math.round(p.pct))}% of the bottleneck`} — open the station`}>{body}</button>
                  : <div key={p.index} className={cls} style={style}>{body}</div>;
              })}
              {/* OVER THE COLUMNS: the target, and the V agreed — a step away
                  from the bottleneck, so much faster */}
              <div className="vc-over" aria-hidden>
                {tgt != null && <span className={'vc-tgt' + (over ? ' is-over' : '')} style={{ bottom: h(tgt) }} />}
                <svg className="vc-svg" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" role="img" aria-label={v.sentence}>
                  {margin != null && <polyline className="vc-guide" vectorEffect="non-scaling-stroke"
                    points={v.points.map((p, i) => `${i + 0.5},${100 - (Math.min(p.guide ?? 100, top) / top) * 100}`).join(' ')} />}
                </svg>
              </div>
            </div>
          </div>
        </div>
        <p className="vc-key">
          <span><i className="vc-sw is-eff" /> once its own stops count</span>
          <span><i className="vc-sw is-run" /> more while running</span>
          <span><i className="vc-sw is-limit" /> the bottleneck</span>
          {margin != null && <span><i className="vc-k is-guide" /> the V: {fmtN(margin)}% faster a step</span>}
          {tgt != null && <span className={over ? 'vc-key-r' : ''}><i className={'vc-k is-tgt' + (over ? ' is-over' : '')} /> the target, {fmtN(target ?? 0)} a min{over ? ' — above the bottleneck' : ''}{tgt > top ? ' — off the scale' : ''}</span>}
        </p>
      </div>
      {/* ON A PHONE THE V LIES ON ITS SIDE (Rowland, 13 October: "the line
          capacity page graphics don't work") — a bar a station, in flow
          order, as long as its share of the bottleneck: the shortest is the
          bottleneck; the line at 100% is the bottleneck's own. Same numbers,
          same colours, same words. */}
      <ol className="vc-rows" aria-label={v.sentence}>
        {v.points.map(p => {
          const w = (x: number) => `${Math.max(0, Math.min(100, (x / top) * 100))}%`;
          const [deep, light] = shareColours(p.pct, p.isLimit, p.under);
          const row = 'vc-row' + (p.isLimit ? ' is-limit' : '') + (p.under ? ' is-under' : '');
          const inner = <>
            <span className="vc-row-name"><span className="vc-num">{p.index + 1}</span> <b>{p.name}</b> <span className="sub">{fmtN(p.perMin)} {r.unit}/min</span></span>
            <span className="vc-row-track" aria-hidden>
              <span className="vc-row-run" style={{ width: w(p.runningPct) }} />
              <span className="vc-row-bar" style={{ width: w(p.pct) }} />
              <span className="vc-row-100" style={{ left: w(100) }} />
              {p.guide != null && <span className="vc-row-guide" style={{ left: w(p.guide) }} />}
              {tgt != null && <span className={'vc-row-tgt' + (over ? ' is-over' : '')} style={{ left: w(tgt) }} />}
            </span>
            <span className="vc-row-val">{p.isLimit ? 'the bottleneck' : `${fmtN(Math.round(p.pct))}%${p.under ? ' · under the V' : ''}`}</span>
          </>;
          return (
            <li key={p.index} className={row} style={{ '--c': deep, '--c2': light } as CSSProperties}>
              {onPick
                ? <button type="button" className="vc-row-in vc-row-b" onClick={() => onPick(p.index)} aria-label={`${p.name} — open the station`}>{inner}</button>
                : <span className="vc-row-in">{inner}</span>}
            </li>
          );
        })}
      </ol>
      {tgt != null && <p className="vc-rows-tgt sub">The dotted mark is the target, {fmtN(target ?? 0)} a minute{over ? ' — above the bottleneck' : ''}.</p>}
      <p className={'vc-says' + (v.under.length ? ' is-a' : '')}>{v.sentence}</p>
      <div className="vc-margin">
        {margin != null && !editing && <span className="sub">Agreed: each station {fmtN(margin)}% faster a step away from the bottleneck.</span>}
        {canAgree && !editing && <button type="button" className="linkish" onClick={() => { setDraft(String(margin ?? 10)); setEditing(true); }}>{margin != null ? 'Change the margin' : 'Set the V’s margin'}</button>}
        {editing && (
          <form className="vc-form" onSubmit={e => { e.preventDefault(); save(); }}>
            <label className="field"><span className="field-label">Faster a step away from the bottleneck, %</span>
              <input className="text-input" inputMode="decimal" value={draft} autoFocus onChange={e => setDraft(e.target.value)} aria-label="The V's margin in percent" /></label>
            <span className="sub">About 10% a step is the usual starting point on an accumulation line — a convention, not a law: change it to what your line needs.</span>
            <span className="vc-form-act">
              <button type="submit" className="btn btn-primary">Agree it</button>
              {margin != null && <button type="button" className="btn" onClick={() => { onMargin(undefined); setEditing(false); }}>Take it off</button>}
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Leave it</button>
            </span>
          </form>
        )}
      </div>
    </div>
  );
}
