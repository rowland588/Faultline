/* Entering the ppm numbers.
 *
 * A grid, not a form per reading: lines down, weeks across, so a week's figures
 * are typed in one pass with the Tab key. Every edit saves as it is made —
 * there is no Save button to forget before closing the laptop.
 *
 * An empty cell means "not measured", which is not the same as zero, and is
 * what makes the chart break its line rather than draw a week nobody recorded. */
import { useState } from 'react';
import { weekLabel, type PaceLinesState } from '../lib/usePaceLines';

const QUARTERS = ['q1', 'q2', 'q3', 'q4'] as const;

function Cell({ value, onCommit, label }: {
  value: number | null; onCommit: (v: number | null) => void; label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? '' : String(value));

  const commit = () => {
    if (draft == null) return;
    const t = draft.trim();
    if (t === '') { onCommit(null); setDraft(null); return; }
    const n = Number(t);
    // A number that isn't one is discarded rather than stored as 0 or NaN.
    if (Number.isFinite(n) && n >= 0) onCommit(n);
    setDraft(null);
  };

  return (
    <input
      className={'ppm-cell' + (value == null ? ' is-empty' : '')}
      inputMode="decimal" aria-label={label} value={shown}
      placeholder="—"
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
        if (e.key === 'Escape') { setDraft(null); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

export function PpmEditor({ state }: { state: PaceLinesState }) {
  const [open, setOpen] = useState(false);
  const { lines, weeks } = state;
  const weekIdx = Array.from({ length: weeks }, (_, i) => i);
  const lastEmpty = weeks > 0 && lines.every(l => l.weekly[weeks - 1] == null);

  return (
    <section className="ppm-editor">
      <button className="ppm-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ppm-toggle-ic" aria-hidden>{open ? '▾' : '▸'}</span>
        Enter ppm numbers
        <span className="ppm-toggle-sub">{lines.length} lines · {weeks} weeks · saves as you type</span>
      </button>

      {open && (
        <div className="ppm-body">
          <div className="ppm-scroll">
            <table className="ppm-grid">
              <thead>
                <tr>
                  <th className="ppm-corner" scope="col">Line</th>
                  {weekIdx.map(i => (
                    <th key={i} scope="col">
                      <span className="ppm-wk">W{i + 1}</span>
                      <span className="ppm-wc">{weekLabel(i)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.key}>
                    <th scope="row" className="ppm-rowhead">{l.name}</th>
                    {weekIdx.map(i => (
                      <td key={i}>
                        <Cell
                          value={l.weekly[i] ?? null}
                          label={`${l.name}, week ${i + 1}`}
                          onCommit={v => void state.setPpm(l.key, i, v)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ppm-week-actions">
            <button className="btn btn-primary" onClick={() => void state.addWeek()}>+ Add a week</button>
            {lastEmpty && (
              <button className="btn btn-ghost" onClick={() => void state.removeLastWeek()}>
                Remove week {weeks}
              </button>
            )}
            <span className="ppm-hint">Leave a cell blank for a week that wasn’t measured — the chart breaks the line rather than inventing a reading.</span>
          </div>

          <details className="ppm-targets">
            <summary>Quarterly targets</summary>
            <div className="ppm-scroll">
              <table className="ppm-grid">
                <thead>
                  <tr>
                    <th className="ppm-corner" scope="col">Line</th>
                    {QUARTERS.map(q => <th key={q} scope="col"><span className="ppm-wk">{q.toUpperCase()}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.key}>
                      <th scope="row" className="ppm-rowhead">{l.name}</th>
                      {QUARTERS.map(q => (
                        <td key={q}>
                          <Cell
                            value={l[q]}
                            label={`${l.name}, ${q.toUpperCase()} target`}
                            onCommit={v => { if (v != null) void state.setTarget(l.key, q, v); }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
