/* A LOG ON THE FLOOR — a step answered by many entries, and what they add up
 * to (lib/flow/analysis; docs/BLUEPRINT.md §3, the new product).
 *
 * The entry form asks the log's columns, as a person says them on the floor
 * — a reason picked, minutes typed, the day it happened (today unless said)
 * — and adds the entry; worked-out columns are said by the app as it is
 * filled. Under it, what the entries add up to: each analysis's figure and
 * its sentence, and the picture where it has one (a Pareto with its running
 * share, a trend by day, a histogram) — the same results the gate, the
 * measure and the paper read (lib/flow/runtime). Then every entry, newest
 * first: corrected where it sits, or struck — never erased, a mistype keeps
 * its place and counts for nothing — with Undo. Every write goes through
 * lib/flow/operations, under the person's access. */
import { useState } from 'react';
import type { FlowField } from '../../lib/flow/definition';
import { entryValues, fmtNumber, type AnalysisResult, type FlowEntry, type SeriesPoint } from '../../lib/flow/analysis';
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

/** A picture of an analysis — bars for a Pareto (with its running share),
 *  a trend by day and a histogram. Neutral ink: the figure carries no state
 *  until a gate or a measure judges it (CLAUDE.md, visual management). */
export function AnalysisChart({ r, kind }: { r: AnalysisResult; kind: 'pareto' | 'trend' | 'histogram' }) {
  const pts: SeriesPoint[] = (r.series ?? []).slice(0, 24);
  if (!pts.length) return null;
  const W = 320, H = 132, padL = 6, padB = 34, padT = 8;
  const max = Math.max(...pts.map(p => p.value), 0) || 1;
  const bw = (W - padL * 2) / pts.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const day = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? niceDay(s) : s);
  return (
    <svg className={`fw-chart is-${kind}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.says}>
      {pts.map((p, i) => {
        const x = padL + i * bw, top = y(p.value);
        return (
          <g key={i}>
            <rect className={i === 0 && kind === 'pareto' ? 'fw-bar is-top' : 'fw-bar'} x={x + bw * 0.12} y={top} width={bw * 0.76} height={Math.max(0, H - padB - top)} rx={2} />
            <text className="fw-chart-v" x={x + bw / 2} y={top - 2} textAnchor="middle">{fmtNumber(p.value)}</text>
            <text className="fw-chart-l" x={x + bw / 2} y={H - padB + 12} textAnchor="middle">{day(p.label).slice(0, Math.max(4, Math.floor(bw / 5)))}</text>
          </g>
        );
      })}
      {kind === 'pareto' && pts.length > 1 && (
        <polyline className="fw-cum" fill="none" points={pts.map((p, i) => `${padL + i * bw + bw / 2},${padT + (H - padT - padB) * (1 - (p.cum ?? 0) / 100)}`).join(' ')} />
      )}
      <line className="fw-chart-axis" x1={padL} x2={W - padL} y1={H - padB} y2={H - padB} />
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
        const pic = a.block === 'pareto' || a.block === 'trend' || a.block === 'histogram';
        return (
          <div key={a.key} className={'fw-result' + (pic ? ' has-pic' : '')} data-analysis={a.key}>
            <span className="fw-result-h"><b className="fw-result-v">{typeof r.value === 'number' ? `${fmtNumber(r.value)}${r.unit ? (r.unit === '%' ? '%' : ` ${r.unit}`) : ''}` : '—'}</b>
              <span className="fw-result-l">{a.label}</span></span>
            <span className="sub fw-result-s">{r.says}</span>
            {pic && <AnalysisChart r={r} kind={a.block as 'pareto' | 'trend' | 'histogram'} />}
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
