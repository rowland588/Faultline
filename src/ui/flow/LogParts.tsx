/* A LOG ON THE FLOOR — a step answered by many entries, and what they add up
 * to (lib/flow/analysis; docs/BLUEPRINT.md §3, the new product).
 *
 * The entry form asks the log's columns, as a person says them on the floor
 * — a reason picked, minutes typed, the day it happened (today unless said)
 * — and adds the entry; worked-out columns are said by the app as it is
 * filled. Under it, what the entries add up to: each analysis's figure and
 * its sentence, and the picture where it has one (a Pareto with its running
 * share, a trend by day, a histogram, a control chart with its signals, a
 * relationship's dots and line, a forecast carried a week on) — the same results the gate, the
 * measure and the paper read (lib/flow/runtime). Then every entry, newest
 * first: corrected where it sits, or struck — never erased, a mistype keeps
 * its place and counts for nothing — with Undo. Every write goes through
 * lib/flow/operations, under the person's access. */
import { useState } from 'react';
import type { FlowField } from '../../lib/flow/definition';
import { BLOCKS, entryValues, fmtNumber, numberSaid, type AnalysisPicture, type AnalysisResult, type FlowEntry, type SeriesPoint } from '../../lib/flow/analysis';
import type { StepInstance } from '../../lib/flow/runtime';
import { addEntry, editEntry, strikeEntry, type FlowProject, type OpContext, type StepRef } from '../../lib/flow/operations';
import { niceDay, todayISO } from '../../lib/weeks';
import { offerUndo } from '../Undo';

type Typed = Record<string, string | number | boolean>;

const shown = (v: string | number | boolean | undefined, c: FlowField) =>
  v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'number' ? `${fmtNumber(v)}${c.unit ? ` ${c.unit}` : ''}` : String(v);

/** The boxes of one entry, kept here until it is added. */
function EntryForm({ columns, start, onSubmit, submitWord, onCancel }: {
  columns: FlowField[]; start?: Typed; onSubmit: (typed: Typed, on: string) => Promise<string | undefined>; submitWord: string; onCancel?: () => void;
}) {
  const [typed, setTyped] = useState<Typed>(start ?? {});
  const [on, setOn] = useState(todayISO());
  const [err, setErr] = useState<string | null>(null);
  const worked = entryValues(columns, typed);
  const set = (k: string, v: string | number | boolean) => setTyped(t => ({ ...t, [k]: v }));
  return (
    <form className="fw-entry" onSubmit={e => {
      e.preventDefault();
      void onSubmit(typed, on).then(why => { if (why) setErr(why); else { setErr(null); if (!start) setTyped({}); } });
    }}>
      <div className="fw-entry-r">
        {columns.map(c => {
          const head = <span className="field-label">{c.label}{c.unit ? ` (${c.unit})` : ''}{c.required ? ' · needed' : ''}</span>;
          const v = typed[c.key];
          if (c.type === 'calc') return <div key={c.key} className="fw-f fw-calc" data-col={c.key}>{head}<b className="fw-calc-v">{typeof worked[c.key] === 'number' ? shown(worked[c.key], c) : '—'}</b></div>;
          if (c.type === 'choice') return (
            <label key={c.key} className="fw-f" data-col={c.key}>{head}
              <select className="text-input fw-in" aria-label={c.label} value={typeof v === 'string' ? v : ''} onChange={e => set(c.key, e.target.value)}>
                <option value="">—</option>
                {(c.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          );
          if (c.type === 'yesno') return (
            <div key={c.key} className="fw-f" data-col={c.key}>{head}
              <div className="fw-seg" role="radiogroup" aria-label={c.label}>
                {[true, false].map(b => <button key={String(b)} type="button" role="radio" aria-checked={v === b} className={'fw-seg-b' + (v === b ? ' on' : '')} onClick={() => set(c.key, b)}>{b ? 'Yes' : 'No'}</button>)}
              </div>
            </div>
          );
          const kind = c.type === 'number' || c.type === 'reading' ? 'number' : c.type === 'date' ? 'date' : 'text';
          return (
            <label key={c.key} className="fw-f" data-col={c.key}>{head}
              <input className="text-input fw-in" type={kind === 'number' ? 'text' : kind} inputMode={kind === 'number' ? 'decimal' : undefined} aria-label={c.label}
                value={v === undefined ? '' : String(v)} onChange={e => set(c.key, e.target.value)} />
            </label>
          );
        })}
        {!start && (
          <label className="fw-f fw-entry-on"><span className="field-label">On</span>
            <input className="text-input fw-in" type="date" aria-label="The day it happened" value={on} onChange={e => setOn(e.target.value || todayISO())} /></label>
        )}
      </div>
      <div className="fw-acts">
        <button type="submit" className="btn btn-primary btn-sm">{submitWord}</button>
        {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
        {err && <span className="sub is-r" role="alert">{err}</span>}
      </div>
    </form>
  );
}

/** A picture of an analysis, drawn as its block says (lib/flow/analysis
 *  AnalysisPicture) — never by the block's id, so a new block with an old
 *  picture is drawn the day it is written. Neutral ink: a figure carries no
 *  state until a gate or a measure judges it, with one exception — a control
 *  chart's signals are the abnormal readings, marked red, and said in words
 *  in the sentence above the picture (CLAUDE.md, visual management). */
export function AnalysisChart({ r, picture, axes }: { r: AnalysisResult; picture: AnalysisPicture; axes?: { x?: string; y?: string } }) {
  if (picture === 'none' || !r.series?.length) return null;
  if (picture === 'control') return <ControlChart r={r} />;
  if (picture === 'scatter') return <ScatterChart r={r} axes={axes} />;
  if (picture === 'forecast') return <ForecastChart r={r} />;
  return <BarsChart r={r} pareto={picture === 'pareto'} />;
}

const W = 320, H = 132, padL = 6, padB = 34, padT = 8;
const dayLabel = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? niceDay(s) : s);
/** A y scale over the values given, a little room above and below. */
function yScale(vals: number[], top = padT, base = H - padB) {
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  return (v: number) => top + (base - top) * (1 - (v - lo) / (hi - lo));
}

function BarsChart({ r, pareto }: { r: AnalysisResult; pareto: boolean }) {
  const pts: SeriesPoint[] = (r.series ?? []).slice(0, 24);
  const max = Math.max(...pts.map(p => p.value), 0) || 1;
  const bw = (W - padL * 2) / pts.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <svg className={`fw-chart is-${pareto ? 'pareto' : 'bars'}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.says}>
      {pts.map((p, i) => {
        const x = padL + i * bw, top = y(p.value);
        return (
          <g key={i}>
            <rect className={i === 0 && pareto ? 'fw-bar is-top' : 'fw-bar'} x={x + bw * 0.12} y={top} width={bw * 0.76} height={Math.max(0, H - padB - top)} rx={2} />
            <text className="fw-chart-v" x={x + bw / 2} y={top - 2} textAnchor="middle">{fmtNumber(p.value)}</text>
            <text className="fw-chart-l" x={x + bw / 2} y={H - padB + 12} textAnchor="middle">{dayLabel(p.label).slice(0, Math.max(4, Math.floor(bw / 5)))}</text>
          </g>
        );
      })}
      {pareto && pts.length > 1 && (
        <polyline className="fw-cum" fill="none" points={pts.map((p, i) => `${padL + i * bw + bw / 2},${padT + (H - padT - padB) * (1 - (p.cum ?? 0) / 100)}`).join(' ')} />
      )}
      <line className="fw-chart-axis" x1={padL} x2={W - padL} y1={H - padB} y2={H - padB} />
    </svg>
  );
}

/** Each reading in the order taken; the centre and the limits across; a
 *  signal a red dot. A day is named under its first reading. */
function ControlChart({ r }: { r: AnalysisResult }) {
  const pts = (r.series ?? []).slice(-60), L = r.limits;
  if (!L) return null;
  const right = 46, base = H - padB + 10;
  const y = yScale([...pts.map(p => p.value), L.upper, L.lower], padT, base);
  const step = (W - padL - right) / Math.max(1, pts.length - 1);
  const x = (i: number) => padL + 4 + i * step;
  const every = Math.max(1, Math.ceil(pts.length / 8));
  const limit = (v: number, word: string, cls: string) => (
    <g className={cls}><line x1={padL} x2={W - right + 4} y1={y(v)} y2={y(v)} /><text className="fw-chart-l" x={W - right + 6} y={y(v) + 3}>{word} {fmtNumber(v)}</text></g>
  );
  return (
    <svg className="fw-chart is-control" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.says}>
      {limit(L.upper, 'UCL', 'fw-lim')}
      {limit(L.centre, 'CL', 'fw-centre')}
      {limit(L.lower, 'LCL', 'fw-lim')}
      <polyline className="fw-run" fill="none" points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />
      {pts.map((p, i) => <circle key={i} className={p.flag ? 'fw-dot is-signal' : 'fw-dot'} cx={x(i)} cy={y(p.value)} r={p.flag ? 3 : 2}><title>{`${dayLabel(p.label)}: ${fmtNumber(p.value)}${p.flag === 'outside' ? ' — outside the limits' : p.flag === 'run' ? ' — in a run of 8 on one side' : ''}`}</title></circle>)}
      {pts.map((p, i) => (i % every === 0 && (i === 0 || p.label !== pts[i - 1].label) ? <text key={`l${i}`} className="fw-chart-l" x={x(i)} y={H - 4} textAnchor="middle">{dayLabel(p.label)}</text> : null))}
    </svg>
  );
}

/** One dot an entry, the line through them. */
function ScatterChart({ r, axes }: { r: AnalysisResult; axes?: { x?: string; y?: string } }) {
  const pts = (r.series ?? []).filter(p => typeof p.x === 'number').slice(0, 300);
  if (!pts.length) return null;
  const xs = pts.map(p => p.x as number), base = H - padB + 6, left = padL + 22;
  /* the dots kept off the axes: the scale a little wider than the readings */
  const lo = Math.min(...xs), hi = Math.max(...xs), room = hi > lo ? (hi - lo) * 0.06 : 1;
  const x0 = lo - room, x1 = hi + room;
  const x = (v: number) => left + (W - left - 8) * ((v - x0) / (x1 - x0));
  const fit = r.fit;
  const ys = pts.map(p => p.value).concat(fit ? [fit.intercept + fit.slope * x0, fit.intercept + fit.slope * x1] : []);
  /* yScale pads the values a little, so no dot sits on the floor */
  const y = yScale(ys, padT, base);
  const yLo = Math.min(...pts.map(p => p.value)), yHi = Math.max(...pts.map(p => p.value));
  return (
    <svg className="fw-chart is-scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.says}>
      <line className="fw-chart-axis" x1={left} x2={W - 8} y1={base} y2={base} />
      <line className="fw-chart-axis" x1={left} x2={left} y1={padT} y2={base} />
      {fit && <line className="fw-fit" x1={x(x0)} x2={x(x1)} y1={y(fit.intercept + fit.slope * x0)} y2={y(fit.intercept + fit.slope * x1)} />}
      {pts.map((p, i) => <circle key={i} className="fw-dot" cx={x(p.x as number)} cy={y(p.value)} r={2.4} />)}
      <text className="fw-chart-l" x={x(lo)} y={base + 11} textAnchor="middle">{fmtNumber(lo)}</text>
      {hi > lo && <text className="fw-chart-l" x={x(hi)} y={base + 11} textAnchor="middle">{fmtNumber(hi)}</text>}
      {axes?.x && <text className="fw-chart-l" x={(left + W - 8) / 2} y={H - 4} textAnchor="middle">{axes.x}, across</text>}
      <text className="fw-chart-l" x={left - 3} y={y(yHi) + 3} textAnchor="end">{fmtNumber(yHi)}</text>
      <text className="fw-chart-l" x={left - 3} y={y(yLo) + 3} textAnchor="end">{fmtNumber(yLo)}</text>
      {axes?.y && <text className="fw-chart-l" x={left + 4} y={padT + 2} textAnchor="start">{axes.y}, up</text>}
    </svg>
  );
}

/** The days logged as bars where they fell, the line through them carried
 *  a week on (dashed), and the target across. */
function ForecastChart({ r }: { r: AnalysisResult }) {
  const pts = (r.series ?? []).slice(-60), fit = r.fit;
  if (!fit || !pts.length) return null;
  const d = (iso: string) => Date.parse(`${iso}T12:00:00Z`) / 86400000;
  const d0 = d(pts[0].label), last = d(pts[pts.length - 1].label) - d0, span = last + (r.ahead ?? 7);
  const base = H - padB;
  const at = (k: number) => Math.max(pts.every(p => p.value >= 0) ? 0 : -Infinity, fit.intercept + fit.slope * k);
  const tops = [...pts.map(p => p.value), at(0), at(span), ...(typeof r.target === 'number' ? [r.target] : []), 0];
  const max = Math.max(...tops) || 1, min = Math.min(...tops, 0);
  const y = (v: number) => padT + (base - padT) * (1 - (v - min) / (max - min || 1));
  const bw = (W - padL * 2) / (span + 1);
  const x = (k: number) => padL + k * bw + bw / 2;
  return (
    <svg className="fw-chart is-forecast" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.says}>
      {pts.map((p, i) => { const k = d(p.label) - d0, top = y(p.value); return <rect key={i} className="fw-bar" x={x(k) - bw * 0.38} y={top} width={bw * 0.76} height={Math.max(0, y(Math.max(0, min)) - top)} rx={1.5}><title>{`${dayLabel(p.label)}: ${fmtNumber(p.value)}`}</title></rect>; })}
      <line className="fw-fit" x1={x(0)} x2={x(last)} y1={y(at(0))} y2={y(at(last))} />
      <line className="fw-fit is-ahead" x1={x(last)} x2={x(span)} y1={y(at(last))} y2={y(at(span))} />
      {typeof r.target === 'number' && <g className="fw-target"><line x1={padL} x2={W - padL} y1={y(r.target)} y2={y(r.target)} /><text className="fw-chart-l" x={W - padL} y={y(r.target) - 3} textAnchor="end">target {fmtNumber(r.target)}</text></g>}
      <line className="fw-chart-axis" x1={padL} x2={W - padL} y1={base} y2={base} />
      <text className="fw-chart-l" x={x(0)} y={base + 12} textAnchor="start">{dayLabel(pts[0].label)}</text>
      <text className="fw-chart-l" x={x(last)} y={base + 12} textAnchor="middle">{dayLabel(pts[pts.length - 1].label)}</text>
      <text className="fw-chart-l" x={W - padL} y={base + 12} textAnchor="end">a week on</text>
    </svg>
  );
}

/** What a log's entries add up to — each analysis's figure, sentence and picture. */
export function LogResults({ inst }: { inst: StepInstance }) {
  const list = inst.def.analyses ?? [];
  if (!list.length || !inst.analysis) return null;
  return (
    <div className="fw-results" aria-label="What the entries add up to">
      {list.map(a => {
        const r = inst.analysis?.[a.key];
        if (!r) return null;
        const picture = BLOCKS[a.block]?.picture ?? 'none';
        const pic = picture !== 'none' && !!r.series?.length;
        const label = (k?: string) => inst.def.columns?.find(c => c.key === k)?.label;
        return (
          <div key={a.key} className={'fw-result' + (pic ? ' has-pic' : '')} data-analysis={a.key}>
            <span className="fw-result-h"><b className="fw-result-v">{typeof r.value === 'number' ? numberSaid(r.value, r.unit) : '—'}</b>
              <span className="fw-result-l">{a.label}</span></span>
            <span className="sub fw-result-s">{r.says}</span>
            {pic && <AnalysisChart r={r} picture={picture} axes={{ x: label(a.against), y: label(a.of) }} />}
          </div>
        );
      })}
    </div>
  );
}

/** THE LOG — its entry form, what it adds up to, and every entry. */
export function LogPanel({ fp, inst, ctx, live }: { fp: FlowProject; inst: StepInstance; ctx: OpContext; live: boolean }) {
  const ref: StepRef = { projectId: fp.project.id, stageKey: inst.stageKey, stepKey: inst.def.key, ...(inst.assetId ? { assetId: inst.assetId } : {}) };
  const cols = inst.def.columns ?? [];
  const entries: FlowEntry[] = [...(inst.record?.entries ?? [])].sort((a, b) => b.on.localeCompare(a.on) || b.at - a.at);
  const [fixing, setFixing] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const want = Math.max(1, inst.def.minEntries ?? 1);
  const counted = entries.filter(e => !e.struck).length;
  const shownRows = showAll ? entries : entries.slice(0, 12);
  return (
    <div className="fw-log-panel" data-log={inst.def.key}>
      <span className="field-label">The log — {counted} entr{counted === 1 ? 'y' : 'ies'}{want > 1 ? ` of the ${want} it needs` : ''}</span>
      {live && (
        <EntryForm columns={cols} submitWord="Add the entry"
          onSubmit={async (typed, on) => { const r = await addEntry(ctx, ref, typed, on); return r.ok ? undefined : r.why; }} />
      )}
      <LogResults inst={inst} />
      {entries.length > 0 && (
        <div className="fw-entries">
          <table className="fw-entries-t">
            <thead><tr><th>On</th>{cols.map(c => <th key={c.key}>{c.label}</th>)}<th>Who</th>{live && <th aria-label="Change it" />}</tr></thead>
            <tbody>
              {shownRows.map(e => {
                const v = entryValues(cols, e.values);
                if (fixing === e.id) return (
                  <tr key={e.id} className="fw-entry-fix"><td colSpan={cols.length + 3}>
                    <EntryForm columns={cols} start={e.values} submitWord="Save the correction" onCancel={() => setFixing(null)}
                      onSubmit={async typed => {
                        const r = await editEntry(ctx, ref, e.id, typed);
                        if (!r.ok) return r.why;
                        setFixing(null);
                        if (r.undo) offerUndo('Entry corrected', r.undo);
                        return undefined;
                      }} />
                  </td></tr>
                );
                return (
                  <tr key={e.id} className={e.struck ? 'is-struck' : ''} data-entry={e.id}>
                    <td>{niceDay(e.on)}</td>
                    {cols.map(c => <td key={c.key}>{shown(v[c.key], c)}</td>)}
                    <td className="sub">{e.who ?? ''}</td>
                    {live && (
                      <td className="fw-entry-acts">
                        {!e.struck && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFixing(e.id)}>Correct</button>}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void strikeEntry(ctx, ref, e.id, !e.struck).then(r => {
                          if (r.ok && r.undo) offerUndo(e.struck ? 'Entry brought back' : 'Entry struck — it counts for nothing', r.undo);
                        })}>{e.struck ? 'Bring back' : 'Strike'}</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length > 12 && <button type="button" className="cw-link" onClick={() => setShowAll(x => !x)}>{showAll ? 'The latest 12' : `Every entry (${entries.length})`}</button>}
        </div>
      )}
      {!entries.length && !live && <p className="sub">No entries yet.</p>}
    </div>
  );
}
