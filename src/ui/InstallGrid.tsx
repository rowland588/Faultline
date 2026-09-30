/* THE INSTALL GRID — every machine's installation on one screen, captured fast.
 *
 * Rowland: "if you can imagine two, three, four, five assets all being
 * installed, I need to capture each of the six steps within each of them
 * assets. And I need to do it fast."
 *
 * Machines down the side, the job's stages across the top, one cell where they
 * cross. Tap a cell: Done today is the first button, so a step is two taps.
 * Tap a STAGE at the top to act on it for every machine at once — plan the
 * day, say who, add it where it is missing. Tap a MACHINE to give it the
 * usual stages or plan everything left on it. Every change can be undone from
 * the toast, and every cell still opens the step's own page for the detail.
 *
 * Nothing new is stored: a cell is an install step (see lib/testing), read
 * through lib/install's installGrid.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { deleteTest } from '../db';
import { installGrid, type StepView } from '../lib/install';
import { isSettled, live, plannedEnd, type Asset, type Test } from '../lib/testing';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import type { useTesting } from '../lib/useTesting';

type TT = ReturnType<typeof useTesting>;
type Open = { t: 'cell'; row: number; col: number } | { t: 'col'; col: number } | { t: 'row'; row: number } | null;

const short = (iso?: string) => (iso ? niceDay(iso) : '');

/** What a cell says, in as few characters as will do. */
function cellWord(s: StepView): string {
  const t = s.step;
  switch (s.tone) {
    case 'done': return t.ranOn ? short(t.ranOn) : 'Done';
    case 'problem': return 'Problem';
    case 'asking': return 'Done?';
    case 'late': return 'Late';
    default: { const on = plannedEnd(t); return on ? short(on) : '—'; }
  }
}

export function InstallGrid({ tt, projectId, usual }: { tt: TT; projectId: string; usual: string[] }) {
  const today = todayISO();
  const grid = installGrid(tt.assets, tt.tests, tt.items, today, usual);
  const [open, setOpen] = useState<Open>(null);

  if (grid.rows.length === 0) return null;

  /* Everyone named anywhere on the job, for the "who" box. */
  const names = [...new Set([
    ...live(tt.tests).map(t => t.withWhom?.trim()),
    ...live(tt.assets).map(a => a.oem?.trim()),
  ].filter((x): x is string => !!x))].sort();

  const rowName = (a?: Asset) => a?.name ?? 'The line itself';
  const openStep = (id: string) => nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);

  /* ---- the writes, each with its own undo ---- */
  const snapshot = (ts: Test[]) => ts.map(t => ({ id: t.id, outcome: t.outcome, ranOn: t.ranOn, plannedFor: t.plannedFor, plannedTo: t.plannedTo, withWhom: t.withWhom }));
  const change = async (ts: Test[], patch: (t: Test) => Partial<Test>, said: string) => {
    if (!ts.length) return;
    const before = snapshot(ts);
    for (const t of ts) await tt.patchTest(t.id, patch(t));
    offerUndo(said, async () => { for (const b of before) await tt.patchTest(b.id, b); });
  };
  const add = async (pairs: { title: string; assetId?: string }[], said: string) => {
    if (!pairs.length) return;
    const ids: string[] = [];
    /* Grouped per machine, so each machine's steps are numbered in order. */
    const byMachine = new Map<string | undefined, string[]>();
    for (const p of pairs) byMachine.set(p.assetId, [...(byMachine.get(p.assetId) ?? []), p.title]);
    for (const [assetId, titles] of byMachine) ids.push(...await tt.planSteps(titles, assetId));
    offerUndo(said, async () => { for (const id of ids) await deleteTest(id, projectId); });
  };

  /* Every machine missing a usual stage — the one-tap start. */
  const missingAll = grid.rows.filter(r => r.asset).flatMap(r =>
    grid.columns.slice(0, usual.length).flatMap((c, i) => (r.cells[i] ? [] : [{ title: c, assetId: r.asset?.id }])));

  const sheet = (() => {
    if (!open) return null;
    if (open.t === 'cell') {
      const row = grid.rows[open.row];
      const col = grid.columns[open.col];
      const s = row.cells[open.col];
      if (!s) {
        return (
          <Sheet title={`${rowName(row.asset)} — ${col}`} sub="Not on this machine yet" onClose={() => setOpen(null)}>
            <button className="btn btn-primary ig-big" onClick={() => { void add([{ title: col, assetId: row.asset?.id }], `Added “${col}” to ${rowName(row.asset)}`); setOpen(null); }}>
              Add “{col}” here
            </button>
          </Sheet>
        );
      }
      const t = s.step;
      return (
        <Sheet title={`${rowName(row.asset)} — ${t.title}`} sub={[t.withWhom || 'nobody named', plannedEnd(t) ? `planned ${short(plannedEnd(t))}` : 'no day yet'].join(' · ')}
          onClose={() => setOpen(null)}>
          <div className="ig-acts">
            <button className="btn btn-primary ig-big" onClick={() => {
              void change([t], cur => ({ outcome: 'passed', ranOn: cur.ranOn ?? today }), `${t.title} done — ${rowName(row.asset)}`);
              setOpen(null);
            }}>Done today</button>
            <button className="btn ig-big ig-bad" onClick={() => {
              void change([t], cur => ({ outcome: 'failed', ranOn: cur.ranOn ?? today }), `${t.title} hit a problem`);
              setOpen(null); openStep(t.id);
            }}>Hit a problem — write it up</button>
            {t.outcome !== 'planned' && (
              <button className="btn btn-ghost ig-big" onClick={() => {
                void change([t], () => ({ outcome: 'planned', ranOn: undefined }), `${t.title} back to planned`);
                setOpen(null);
              }}>Not done after all</button>
            )}
          </div>
          <label className="cw-f ig-f"><span>Planned for</span>
            <input type="date" defaultValue={t.plannedFor ?? ''}
              onChange={e => void change([t], () => ({ plannedFor: e.target.value || undefined }), `${t.title} planned`)} /></label>
          <Who names={names} value={t.withWhom ?? ''} onSave={v => void change([t], () => ({ withWhom: v || undefined }), `${t.title} — ${v || 'nobody named'}`)} />
          <button className="cw-link" onClick={() => openStep(t.id)}>Open the step — pictures, what was found, fixes ›</button>
        </Sheet>
      );
    }
    if (open.t === 'col') {
      const col = grid.columns[open.col];
      const cells = grid.rows.map(r => r.cells[open.col]);
      const steps = cells.filter((c): c is StepView => !!c).map(c => c.step);
      const left = steps.filter(t => !isSettled(t));
      const lacking = grid.rows.filter((_r, i) => !cells[i]).map(r => ({ title: col, assetId: r.asset?.id }));
      return (
        <Sheet title={col} sub={`${steps.length - left.length} of ${grid.rows.length} machines done`} onClose={() => setOpen(null)}>
          <div className="ig-acts">
            {lacking.length > 0 && (
              <button className="btn btn-primary ig-big" onClick={() => { void add(lacking, `Added “${col}” to ${lacking.length} machine${lacking.length === 1 ? '' : 's'}`); setOpen(null); }}>
                Add to {lacking.length === grid.rows.length ? 'every machine' : `the ${lacking.length} without it`}
              </button>
            )}
            {left.length > 0 && (
              <button className="btn ig-big" onClick={() => {
                if (left.length > 1 && !confirm(`Mark “${col}” done today on ${left.length} machines?`)) return;
                void change(left, cur => ({ outcome: 'passed', ranOn: cur.ranOn ?? today }), `${col} done on ${left.length} machine${left.length === 1 ? '' : 's'}`);
                setOpen(null);
              }}>Done today on {left.length === 1 ? 'the one left' : `all ${left.length} left`}</button>
            )}
          </div>
          {left.length > 0 && (
            <>
              <label className="cw-f ig-f"><span>Plan it for every machine not done</span>
                <input type="date" onChange={e => e.target.value && void change(left, () => ({ plannedFor: e.target.value }), `${col} planned on ${left.length} machine${left.length === 1 ? '' : 's'}`)} /></label>
              <Who names={names} value="" label="Who is doing it, on every machine not done"
                onSave={v => v && void change(left, () => ({ withWhom: v }), `${col} — ${v}, ${left.length} machine${left.length === 1 ? '' : 's'}`)} />
            </>
          )}
        </Sheet>
      );
    }
    const row = grid.rows[open.row];
    const left = row.cells.filter((c): c is StepView => !!c && !isSettled(c.step)).map(c => c.step);
    const missing = grid.columns.slice(0, usual.length).filter((_, i) => !row.cells[i]);
    return (
      <Sheet title={rowName(row.asset)} sub={row.asset?.oem ?? ''} onClose={() => setOpen(null)}>
        <div className="ig-acts">
          {missing.length > 0 && (
            <button className="btn btn-primary ig-big" onClick={() => {
              void add(missing.map(title => ({ title, assetId: row.asset?.id })), `Added ${missing.length} stage${missing.length === 1 ? '' : 's'} to ${rowName(row.asset)}`);
              setOpen(null);
            }}>Add the {missing.length === usual.length ? `usual ${usual.length} stages` : `${missing.length} missing stage${missing.length === 1 ? '' : 's'}`}</button>
          )}
        </div>
        {left.length > 0 && (
          <>
            <label className="cw-f ig-f"><span>Plan every step left on it for</span>
              <input type="date" onChange={e => e.target.value && void change(left, () => ({ plannedFor: e.target.value }), `${rowName(row.asset)}: ${left.length} step${left.length === 1 ? '' : 's'} planned`)} /></label>
            <Who names={names} value="" label="Who is doing every step left on it"
              onSave={v => v && void change(left, () => ({ withWhom: v }), `${rowName(row.asset)}: ${v}`)} />
          </>
        )}
      </Sheet>
    );
  })();

  return (
    <section className="ig">
      <div className="ig-head">
        <h2 className="cmp-h">Every machine at once</h2>
        {missingAll.length > 0 && (
          <button className="btn" onClick={() => void add(missingAll, `Added ${missingAll.length} step${missingAll.length === 1 ? '' : 's'} across the machines`)}>
            Add the usual stages to every machine
          </button>
        )}
      </div>
      <p className="sub ig-hint">Tap a square to mark it done or plan it. Tap a stage or a machine to do it for all of them.</p>
      <div className="ig-wrap">
        <table className="ig-grid">
          <thead>
            <tr>
              <th scope="col" className="ig-corner">Machine</th>
              {grid.columns.map((c, i) => (
                <th key={c} scope="col">
                  <button className="ig-colh" onClick={() => setOpen({ t: 'col', col: i })}>{c}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((r, ri) => (
              <tr key={r.asset?.id ?? 'line'}>
                <th scope="row">
                  <button className="ig-rowh" onClick={() => setOpen({ t: 'row', row: ri })}>
                    <b>{rowName(r.asset)}</b>
                    {r.asset?.oem && <span>{r.asset.oem}</span>}
                  </button>
                </th>
                {r.cells.map((s, ci) => (
                  <td key={ci}>
                    <button className={'ig-cell' + (s ? ` is-${s.tone}${s.next ? ' is-next' : ''}` : ' is-empty')}
                      onClick={() => setOpen({ t: 'cell', row: ri, col: ci })}
                      aria-label={`${rowName(r.asset)} — ${grid.columns[ci]}: ${s ? cellWord(s) : 'not added'}`}>
                      {s ? cellWord(s) : '+'}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sheet}
    </section>
  );
}

function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="ig-scrim" onClick={onClose}>
      <div className="ig-sheet" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="ig-sheet-h">
          <span><b>{title}</b>{sub && <span className="sub">{sub}</span>}</span>
          <button className="ig-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Who is doing it — typed, or picked from everyone already named on the job. */
function Who({ names, value, label = 'Who is doing it', onSave }: {
  names: string[]; value: string; label?: string; onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <form className="ig-who" onSubmit={e => { e.preventDefault(); onSave(v.trim()); }}>
      <label className="cw-f ig-f"><span>{label}</span>
        <input list="ig-names" value={v} onChange={e => setV(e.target.value)} placeholder="Brillopak fitter, site electrician…" /></label>
      <datalist id="ig-names">{names.map(n => <option key={n} value={n} />)}</datalist>
      <button className="btn" type="submit" disabled={v.trim() === value.trim()}>Save</button>
    </form>
  );
}
