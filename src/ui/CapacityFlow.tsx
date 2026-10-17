/* THE LINE, DRAWN — each line running down the page, the lines meeting, what
 * comes after them and what the whole makes, drawn beside the stations while
 * they are typed (Rowland, 16 October: "I should be able to see things appear
 * to the right-hand side of my screen ... being able to see what you're doing
 * makes no sense"). The bottleneck is the house's graphite and says so; a line's
 * own slowest wears the brand's teal edge; a station with no speed yet is
 * dashed and says "no speed yet". A tap opens the station. Drawn at the width
 * it has, so its words stay their size on a phone. Reads lib/capacityFlow. */
import { useEffect, useRef, useState } from 'react';
import { perMinWords, type FlowModel, type FlowNode } from '../lib/capacityFlow';

const NH = 46, VG = 18, HEAD = 22, PAD = 8;

function cut(s: string, px: number, size: number): string {
  const max = Math.max(3, Math.floor(px / (size * 0.56)));
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function CapacityFlow({ m, onPick }: { m: FlowModel; onPick?: (index: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(460);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(es => { const w = Math.round(es[0]?.contentRect.width ?? 0); if (w > 0) setW(Math.max(260, w)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const unit = m.unit;
  const n = Math.max(1, m.columns.length);
  const gap = n > 1 ? 10 : 0;
  const colW = m.laned ? Math.min(190, (W - 2 * PAD - (n - 1) * gap) / n) : Math.min(300, W - 2 * PAD);
  const span = n * colW + (n - 1) * gap;
  const x0 = (W - span) / 2;
  const colX = (k: number) => x0 + k * (colW + gap);
  const rows = Math.max(1, ...m.columns.map(c => c.nodes.length));
  const top = m.laned ? HEAD : 4;
  const laneBottom = top + rows * (NH + VG) - VG;
  const mergeH = 30, mergeW = Math.min(W - 2 * PAD, 300);
  const sharedW = Math.min(W - 2 * PAD, 300);
  const merges = m.laned && m.shared.length > 0;
  const mergeY = laneBottom + 34;
  const sharedY = (i: number) => mergeY + mergeH + VG + i * (NH + VG);
  const waiting = m.laned && !merges && m.columns.every(c => !c.nodes.length);
  const afterShared = merges ? sharedY(m.shared.length) : laneBottom + VG + 16 + (waiting ? mergeH + 26 : 0);
  const outY = afterShared + (merges ? 2 : 0);
  const outH = 40;
  const H = outY + outH + 6;

  const short = m.target != null && m.makes != null && m.makes < m.target - 1e-9;
  const pick = (x: FlowNode) => { if (onPick && x.index >= 0) onPick(x.index); };

  const nodeAt = (x: FlowNode, nx: number, ny: number, w: number) => {
    const cls = 'cxf-node' + (x.isLimit ? ' is-limit' : x.isOwnLimit ? ' is-own' : x.perMin == null ? ' is-none' : '');
    const rate = x.perMin == null ? 'no speed yet' : `${perMinWords(x.perMin)} ${unit}/min`;
    return (
      <g key={x.id} className={cls} transform={`translate(${nx},${ny})`} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined}
        aria-label={`${x.name}: ${rate}${x.isLimit ? ', the bottleneck' : x.isOwnLimit ? ', sets its own line’s pace' : ''}`}
        onClick={() => pick(x)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(x); } }}>
        <title>{`${x.name} — ${rate}`}</title>
        <rect width={w} height={NH} rx={8} />
        <text x={10} y={19} className="cxf-name">{cut(x.name, w - 20, 12.5)}</text>
        <text x={10} y={36} className="cxf-rate">{cut(rate, w - 20, 11.5)}</text>
        {x.isLimit && <g transform={`translate(${w - 8},-8)`}><rect x={-78} width={78} height={16} rx={8} className="cxf-tag" /><text x={-39} y={11.5} textAnchor="middle" className="cxf-tag-t">BOTTLENECK</text></g>}
      </g>
    );
  };

  const edges: string[] = [];
  const nodes: React.ReactNode[] = [];
  const heads: React.ReactNode[] = [];
  m.columns.forEach((c, k) => {
    const cx = colX(k);
    if (m.laned) heads.push(<text key={`h${c.id}`} x={cx + colW / 2} y={14} textAnchor="middle" className="cxf-lane">{cut(c.name, colW, 12)}</text>);
    if (!c.nodes.length) {
      nodes.push(<g key={`e${c.id}`} className="cxf-node is-none" transform={`translate(${cx},${top})`}><rect width={colW} height={NH} rx={8} /><text x={colW / 2} y={28} textAnchor="middle" className="cxf-rate">no stations yet</text></g>);
    }
    c.nodes.forEach((x, i) => {
      const y = top + i * (NH + VG);
      nodes.push(nodeAt(x, cx, y, colW));
      if (i > 0) edges.push(`M${cx + colW / 2},${y - VG} L${cx + colW / 2},${y - 3}`);
    });
    /* down from the column's last box to where it goes next */
    const yEnd = top + Math.max(1, c.nodes.length) * (NH + VG) - VG;
    const fx = cx + colW / 2;
    const tx = W / 2;
    const ty = merges ? mergeY - 3 : outY - 3;
    edges.push(`M${fx},${yEnd} L${fx},${Math.max(yEnd, laneBottom) + 6} C${fx},${ty - 10} ${tx},${Math.max(yEnd, laneBottom) + 14} ${tx},${ty}`);
  });

  return (
    <div className="cxf" ref={box}>
      <svg className="cxf-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={m.laned ? `${m.columns.length} lines${merges ? `, meeting at ${m.shared[0]?.name}` : ', each ending on its own'}${m.makes != null ? ` — the line makes ${perMinWords(m.makes)} ${unit} a minute` : ''}` : `The line${m.makes != null ? ` makes ${perMinWords(m.makes)} ${unit} a minute` : ''}`}>
        <defs>
          <marker id="cxf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" className="cxf-arrowhead" /></marker>
        </defs>
        {heads}
        {edges.map((d, i) => <path key={i} d={d} className="cxf-edge" markerEnd="url(#cxf-arrow)" />)}
        {nodes}
        {merges && (
          <g transform={`translate(${(W - mergeW) / 2},${mergeY})`} className="cxf-merge">
            <rect width={mergeW} height={mergeH} rx={mergeH / 2} />
            <text x={mergeW / 2} y={19.5} textAnchor="middle">{cut(`The lines meet — ${m.sends != null ? `${perMinWords(m.sends)} ${unit}/min arrive` : 'what they send arrives'}`, mergeW - 20, 12)}</text>
          </g>
        )}
        {m.laned && !merges && m.columns.every(c => !c.nodes.length) && (
          /* lines chosen before any station: where they will meet, waiting */
          <g transform={`translate(${(W - mergeW) / 2},${laneBottom + 26})`} className="cxf-merge is-none">
            <rect width={mergeW} height={mergeH} rx={mergeH / 2} />
            <text x={mergeW / 2} y={19.5} textAnchor="middle">{cut('Where they meet — add its stations below', mergeW - 20, 12)}</text>
          </g>
        )}
        {merges && m.shared.map((x, i) => {
          const y = sharedY(i);
          const sx = (W - sharedW) / 2;
          return (
            <g key={x.id}>
              <path d={`M${W / 2},${i === 0 ? mergeY + mergeH : y - VG} L${W / 2},${y - 3}`} className="cxf-edge" markerEnd="url(#cxf-arrow)" />
              {nodeAt(x, sx, y, sharedW)}
            </g>
          );
        })}
        {merges && <path d={`M${W / 2},${sharedY(m.shared.length) - VG} L${W / 2},${outY - 3}`} className="cxf-edge" markerEnd="url(#cxf-arrow)" />}
        <g transform={`translate(${(W - Math.min(W - 2 * PAD, 320)) / 2},${outY})`} className={'cxf-out' + (short ? ' is-short' : '')}>
          <rect width={Math.min(W - 2 * PAD, 320)} height={outH} rx={10} />
          <text x={Math.min(W - 2 * PAD, 320) / 2} y={17} textAnchor="middle" className="cxf-out-a">
            {m.makes != null ? `${m.laned && !merges ? 'Together' : 'The line makes'} ${perMinWords(m.makes)} ${unit}/min` : 'Give the stations their speeds'}
          </text>
          <text x={Math.min(W - 2 * PAD, 320) / 2} y={33} textAnchor="middle" className="cxf-out-b">
            {m.target == null ? 'no target set' : m.makes == null ? `target ${perMinWords(m.target)}` : short ? `target ${perMinWords(m.target)} — ${perMinWords(m.target - m.makes)} short` : `target ${perMinWords(m.target)} — met`}
          </text>
        </g>
      </svg>
      <p className="cxf-key"><span className="cxf-k is-limit" aria-hidden /> holds the whole line back <span className="cxf-k is-own" aria-hidden /> sets its own line’s pace <span className="cxf-k is-none" aria-hidden /> no speed yet</p>
    </div>
  );
}
