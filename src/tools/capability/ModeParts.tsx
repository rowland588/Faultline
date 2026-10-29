/* THE MODES' PARTS ON THE CAPABILITY SCREEN — W1 (knowledge/specs/FC-094-capability.md
 * parts 2–4). The pictures: a run or an inspection a bar against the chart's limits
 * (the p-chart, the u-chart — a bar outside in red), the faults' Pareto by count or by
 * money, and a rate's intervals as bars against the floor. The capture: two boxes and
 * Add for a run; the items, the kinds as chips with a count each and Add for an
 * inspection. Every figure drawn comes from ./modes; nothing is worked out here. */
import { useState } from 'react';
import type { AgreedReadings, StudyReading } from '../../lib/study';
import type { SampleFigures } from './sample';
import { OTHER, type RunsFigures, type FaultsFigures, type RateFigures } from './modes';

const W = 600, H = 210, P = { l: 44, r: 12, t: 18, b: 30 };
const n = (v: number) => v.toLocaleString('en-GB');

/** A RUN A BAR — rate against the chart's limits (FC-088), a run outside red; the pooled rate a line. */
export function RunsChart({ r }: { r: RunsFigures }) {
  if (!r.runs.length) return <p className="sub ie-pic-empty">Each run lands here as a bar — what was rejected out of what was made.</p>;
  return <RateBarsSvg rows={r.runs.map(x => ({ no: x.no, v: x.p, lcl: x.lcl, ucl: x.ucl, out: x.out, label: `${n(x.rejected)} of ${n(x.made)}` }))} centre={r.p} limit={r.max} pct label={`${r.runs.length} run${r.runs.length === 1 ? "" : "s"}: ${(r.p * 100).toFixed(2)}% rejected${r.runs.some(x => x.out) ? `, run ${r.runs.filter(x => x.out).map(x => x.no).join(', ')} outside the limits` : ''}`} />;
}

/** AN INSPECTION A BAR — faults an item against the u-chart's limits (FC-089). */
export function UChart({ q }: { q: FaultsFigures }) {
  if (!q.insp.length) return <p className="sub ie-pic-empty">Each inspection lands here as a bar — faults an item.</p>;
  return <RateBarsSvg rows={q.insp.map(x => ({ no: x.no, v: x.u, lcl: x.lcl, ucl: x.ucl, out: x.out, label: `${n(x.faults)} on ${n(x.inspected)}` }))} centre={q.dpu} limit={q.max} label={`${q.insp.length} inspections: ${q.dpu.toFixed(3)} faults an item`} />;
}

/** HELD AT A RATE — an interval a bar against the floor (or ceiling) line, the met ones teal, the missed amber. */
export function RateBars({ r, unit }: { r: RateFigures; unit?: string }) {
  if (!r.intervals.length) return <p className="sub ie-pic-empty">Each interval lands here as a bar — the packs counted, against the rate agreed.</p>;
  const vs = [...r.intervals.map(i => i.rate), r.limit];
  const top = Math.max(...vs) * 1.12, lo = 0;
  const bw = (W - P.l - P.r) / Math.max(r.intervals.length, 1);
  const y = (v: number) => P.t + (1 - (v - lo) / (top - lo)) * (H - P.t - P.b);
  return (
    <svg className="ie-hist ie-modebars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${r.intervals.length} intervals: ${r.met} met ${r.side === 'least' ? 'at least' : 'at most'} ${r.limit} a minute`}>
      {r.intervals.map((i, k) => (
        <g key={i.id}>
          <rect className={'ie-bar' + (i.met ? ' is-met' : ' is-miss')} x={P.l + k * bw + 1} width={Math.max(1, bw - 2)} y={y(i.rate)} height={H - P.b - y(i.rate)} />
          {r.intervals.length <= 30 && <text className="ie-hx" x={P.l + k * bw + bw / 2} y={H - 14} textAnchor="middle">{i.no}</text>}
        </g>
      ))}
      <line className="ie-lim" x1={P.l} x2={W - P.r} y1={y(r.limit)} y2={y(r.limit)} />
      <text className="ie-lw" x={P.l - 4} y={y(r.limit) + 4} textAnchor="end">{r.limit}</text>
      <line className="ie-axis" x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} />
      <text className="ie-hx" x={P.l} y={P.t - 6}>{r.side === 'least' ? 'at least' : 'at most'} {r.limit}{unit ? ` ${unit}` : ''} a minute · met {r.met} of {r.intervals.length}</text>
    </svg>
  );
}

/** THE PARETO OF FAULT KINDS (FC-125) — bars by count, the cumulative line; By money on a toggle. */
export function Pareto({ q }: { q: FaultsFigures }) {
  const [byMoney, setByMoney] = useState(false);
  const rows = q.tally.filter(t => t.count > 0);
  if (!rows.length) return null;
  const priced = rows.every(t => t.gbp !== undefined);
  const vals = rows.map(t => (byMoney && priced ? (t.gbp as number) : t.count));
  const total = vals.reduce((s, v) => s + v, 0) || 1;
  const sorted = rows.map((t, i) => ({ t, v: vals[i] })).sort((a, b) => b.v - a.v);
  const top = Math.max(...vals) * 1.15;
  const bw = (W - P.l - P.r) / sorted.length;
  const y = (v: number) => P.t + (1 - v / top) * (H - P.t - P.b);
  const yc = (c: number) => P.t + (1 - c) * (H - P.t - P.b);
  let cum = 0;
  const pts = sorted.map(({ v }, k) => { cum += v / total; return `${P.l + k * bw + bw / 2},${yc(cum)}`; });
  return (
    <div className="ie-pareto tool-sig-pareto">
      <div className="ie-pareto-h">
        <span className="ie-checks-h">Faults by kind{byMoney && priced ? ' — by money' : ''}</span>
        {priced && <button type="button" className="linkish" onClick={() => setByMoney(b => !b)}>{byMoney ? 'By count' : 'By money'}</button>}
      </div>
      <svg className="ie-hist" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Faults by kind: ${sorted.map(({ t }) => `${t.kind} ${n(t.count)}`).join(', ')}`}>
        {sorted.map(({ t, v }, k) => (
          <g key={t.kind}>
            <rect className={'ie-bar is-kind' + (k === 0 ? ' is-top' : '')} x={P.l + k * bw + 4} width={Math.max(2, bw - 8)} y={y(v)} height={H - P.b - y(v)} />
            <text className="ie-bar-n" x={P.l + k * bw + bw / 2} y={y(v) - 4} textAnchor="middle">{byMoney && priced ? `£${v.toFixed(2)}` : n(v)}</text>
            <text className="ie-hx" x={P.l + k * bw + bw / 2} y={H - 14} textAnchor="middle">{t.kind.length > 14 ? `${t.kind.slice(0, 13)}…` : t.kind}</text>
          </g>
        ))}
        <polyline className="ie-cum" points={pts.join(' ')} />
        <line className="ie-axis" x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} />
      </svg>
    </div>
  );
}

/* a bar a row against its own limits (p or u), the centre line, the maximum agreed */
function RateBarsSvg({ rows, centre, limit, pct, label }: { rows: { no: number; v: number; lcl: number; ucl: number; out: boolean; label: string }[]; centre: number; limit?: number; pct?: boolean; label: string }) {
  const vs = [...rows.map(r => r.v), ...rows.map(r => r.ucl), centre, ...(limit !== undefined ? [limit] : [])];
  const top = Math.max(...vs, 1e-9) * 1.12;
  const bw = (W - P.l - P.r) / Math.max(rows.length, 1);
  const y = (v: number) => P.t + (1 - v / top) * (H - P.t - P.b);
  const fmt = (v: number) => (pct ? `${(v * 100).toFixed(2)}%` : v.toFixed(3));
  const limits = rows.length >= 5;
  return (
    <svg className="ie-hist ie-modebars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {rows.map((r, k) => (
        <g key={r.no}>
          <rect className={'ie-bar' + (r.out ? ' is-out' : '')} x={P.l + k * bw + 2} width={Math.max(1, bw - 4)} y={y(r.v)} height={H - P.b - y(r.v)} />
          {limits && <line className="ie-ucl" x1={P.l + k * bw + 1} x2={P.l + (k + 1) * bw - 1} y1={y(r.ucl)} y2={y(r.ucl)} />}
          {limits && r.lcl > 0 && <line className="ie-ucl" x1={P.l + k * bw + 1} x2={P.l + (k + 1) * bw - 1} y1={y(r.lcl)} y2={y(r.lcl)} />}
          {rows.length <= 24 && <text className="ie-hx" x={P.l + k * bw + bw / 2} y={H - 14} textAnchor="middle">{r.no}</text>}
        </g>
      ))}
      <line className="ie-mean" x1={P.l} x2={W - P.r} y1={y(centre)} y2={y(centre)} />
      <text className="ie-lw" x={P.l - 4} y={y(centre) + 4} textAnchor="end">{fmt(centre)}</text>
      {limit !== undefined && <><line className="ie-lim" x1={P.l} x2={W - P.r} y1={y(limit)} y2={y(limit)} /><text className="ie-lw" x={W - P.r} y={y(limit) - 4} textAnchor="end">at most {fmt(limit)}</text></>}
      <line className="ie-axis" x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} />
      <text className="ie-hx" x={P.l} y={P.t - 6}>{label}</text>
    </svg>
  );
}

/* ================================ CAPTURE ================================= */
const whole = (t: string): number | undefined => (/^\d+$/.test(t.trim()) ? Number(t) : undefined);

/** A RUN: what was made, what was rejected — two boxes and Add. */
export function RunsCapture({ f, onAdd }: { f: SampleFigures; onAdd: (r: Omit<StudyReading, 'id' | 'at'>) => void }) {
  const [made, setMade] = useState(''), [rej, setRej] = useState('');
  const m = whole(made), r = whole(rej);
  const problem = made.trim() === '' && rej.trim() === '' ? '' : m === undefined || m < 1 ? 'Made — a whole number, 1 or more.' : r === undefined ? 'Rejected — a whole number, 0 or more.' : r > m ? 'Rejected cannot be more than made.' : '';
  const ok = !problem && m !== undefined && r !== undefined;
  return (
    <form className="ie-cap-box ie-runs-cap" aria-label="Count a run" onSubmit={e => { e.preventDefault(); if (!ok) return; onAdd({ made: m, rejected: r }); setMade(''); setRej(''); }}>
      <div className="ie-count"><b>{f.n}</b> of {f.count} runs{f.enough ? ' — all in' : ''}</div>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">Made</span><input className="text-input" inputMode="numeric" value={made} onChange={e => setMade(e.target.value)} placeholder="4800" /></label>
        <label className="field"><span className="field-label">Rejected</span><input className="text-input" inputMode="numeric" value={rej} onChange={e => setRej(e.target.value)} placeholder="24" /></label>
      </div>
      {problem && <p className="ie-problem">{problem}</p>}
      <button type="submit" className="btn btn-primary" disabled={!ok}>Add the run</button>
    </form>
  );
}

/** AN INSPECTION: the items looked at, then a tap per fault on its kind — the kinds as chips with a
 *  count each, Other typed — and Add. The faults total is the taps. */
export function FaultsCapture({ a, f, onAdd }: { a: AgreedReadings; f: SampleFigures; onAdd: (r: Omit<StudyReading, 'id' | 'at'>) => void }) {
  const [items, setItems] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [other, setOther] = useState('');
  const kinds = [...(a.faultKinds ?? [])];
  const faults = Object.values(counts).reduce((s, c) => s + c, 0);
  const it = whole(items);
  const problem = items.trim() === '' ? '' : it === undefined || it < 1 ? 'Items inspected — a whole number, 1 or more.' : '';
  const ok = !problem && it !== undefined;
  const bump = (k: string, d: number) => setCounts(c => { const v = Math.max(0, (c[k] ?? 0) + d); const next = { ...c }; if (v) next[k] = v; else delete next[k]; return next; });
  return (
    <form className="ie-cap-box ie-faults-cap" aria-label="Record an inspection" onSubmit={e => { e.preventDefault(); if (!ok) return; onAdd({ inspected: it, faults, kinds: counts }); setItems(''); setCounts({}); setOther(''); }}>
      <div className="ie-count"><b>{f.n}</b> of {f.count} inspections{f.enough ? ' — all in' : ''}</div>
      <label className="field"><span className="field-label">Items inspected</span><input className="text-input" inputMode="numeric" value={items} onChange={e => setItems(e.target.value)} placeholder="200" /></label>
      <div className="ie-kind-taps" role="group" aria-label="Faults found, by kind">
        <span className="field-label">Faults found — a tap each{faults ? ` · ${faults} so far` : ''}</span>
        {[...kinds, ...Object.keys(counts).filter(k => !kinds.includes(k))].map(k => (
          <span key={k} className="ie-kind-tap">
            <button type="button" className="chip" onClick={() => bump(k, 1)} aria-label={`One more ${k}`}>{k}{counts[k] ? ` · ${counts[k]}` : ''}</button>
            {counts[k] ? <button type="button" className="linkish" onClick={() => bump(k, -1)} aria-label={`One fewer ${k}`}>−1</button> : null}
          </span>
        ))}
        <span className="ie-kind-tap ie-kind-other">
          <input className="text-input" value={other} maxLength={24} placeholder={OTHER} aria-label="Another kind" onChange={e => setOther(e.target.value)} />
          <button type="button" className="chip" disabled={!other.trim()} onClick={() => { bump(other.trim(), 1); setOther(''); }}>Add one</button>
        </span>
      </div>
      {problem && <p className="ie-problem">{problem}</p>}
      <button type="submit" className="btn btn-primary" disabled={!ok}>Add the inspection{it !== undefined ? ` — ${faults} fault${faults === 1 ? '' : 's'} on ${n(it)}` : ''}</button>
    </form>
  );
}

/** A reading's words in the lists, for the modes. */
export function modeReadingWord(a: AgreedReadings, r: StudyReading): string | undefined {
  if (a.kind === 'rejects') return typeof r.made === 'number' ? `${n(r.rejected ?? 0)} of ${n(r.made)}` : undefined;
  if (a.kind === 'faults') return typeof r.inspected === 'number' ? `${n(r.faults ?? 0)} on ${n(r.inspected)}${r.kinds && Object.keys(r.kinds).length ? ` — ${Object.entries(r.kinds).filter(([, c]) => c > 0).map(([k, c]) => `${k} ${c}`).join(', ')}` : ''}` : undefined;
  if (a.kind === 'rate') return typeof r.value === 'number' ? `${n(r.value)}` : undefined;
  if (a.kind === 'limits' && a.question === 'weigher' && typeof r.value === 'number' && r.head !== undefined) return `${r.value}${a.unit ? ` ${a.unit}` : ''} · head ${r.head}`;
  return undefined;
}
