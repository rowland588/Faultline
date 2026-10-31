/* THE PUGH MATRIX ON THE PAGE — criteria down with their weights, the datum, one column an option, a mark in each cell
   (+ better · S same · − worse), the counts and score under each column. Edits go to the record through the caller
   (ScoredScreen's Record); the figures under the columns come from the module's table (pugh.pughTable), never worked
   out here. A colour is never a mark: the leader is said in words. */
import { useState } from 'react';
import { uid } from '../../lib/ids';
import type { ScoredCriterion, ScoredRow } from '../../lib/study';
import type { ScoredTable } from '../scored/types';

export interface MatrixDraft { rows: ScoredRow[]; criteria: ScoredCriterion[]; datum: string }

const MARKS: { v: string; label: string; word: string }[] = [
  { v: '1', label: '+', word: 'better than the datum' },
  { v: '0', label: 'S', word: 'the same as the datum' },
  { v: '-1', label: '−', word: 'worse than the datum' },
];

export function PughEditor({ draft, table, leaders, canEdit, onChange }: {
  draft: MatrixDraft; table?: ScoredTable; leaders?: string[]; canEdit: boolean; onChange: (next: MatrixDraft) => void;
}) {
  const { rows, criteria, datum } = draft;
  const [undo, setUndo] = useState<{ label: string; draft: MatrixDraft } | null>(null);
  const change = (next: Partial<MatrixDraft>) => { setUndo(null); onChange({ ...draft, ...next }); };
  const setCrit = (id: string, patch: Partial<ScoredCriterion>) => change({ criteria: criteria.map(c => (c.id === id ? { ...c, ...patch } : c)) });
  const setOpt = (id: string, patch: Partial<ScoredRow>) => change({ rows: rows.map(r => (r.id === id ? { ...r, ...patch } : r)) });
  const setMark = (opt: ScoredRow, cid: string, v: string) => setOpt(opt.id, { scores: { ...opt.scores, [cid]: v === '' ? undefined : Number(v) } });
  const removeCrit = (c: ScoredCriterion) => { onChange({ ...draft, criteria: criteria.filter(x => x.id !== c.id) }); setUndo({ label: `${c.name.trim() || 'The criterion'} taken off.`, draft }); };
  const removeOpt = (o: ScoredRow) => { onChange({ ...draft, rows: rows.filter(x => x.id !== o.id) }); setUndo({ label: `${o.name.trim() || 'The option'} taken off.`, draft }); };
  const col = (id: string) => table?.columnIds.indexOf(id) ?? -1;
  const foot = (k: number, id: string) => { const i = col(id); return i < 0 ? '—' : table?.foot[k]?.[3 + i] ?? '—'; };
  const leads = (id: string) => { const i = col(id); return i >= 0 && !!table?.foot[4]?.[3 + i]?.includes('leads'); };
  const costed = rows.some(r => r.cost !== undefined) || canEdit;

  return (
    <div className="pugh" data-pugh>
      <label className="field pugh-datum"><span className="field-label">Datum — what every option is set against</span>
        <input className="text-input" aria-label="Datum" disabled={!canEdit} value={datum} placeholder="Present state" onChange={e => change({ datum: e.target.value })} /></label>
      <div className="scored-table-wrap">
        <table className="scored-table pugh-table">
          <thead>
            <tr>
              <th scope="col">Criterion</th><th scope="col">Weight</th><th scope="col">Datum</th>
              {rows.map((o, i) => (
                <th key={o.id} scope="col" className={leads(o.id) ? 'pugh-lead' : undefined}>
                  <input className="text-input" aria-label={`Option ${i + 1}`} disabled={!canEdit} value={o.name} placeholder={`Option ${i + 1}`} onChange={e => setOpt(o.id, { name: e.target.value })} />
                  {leads(o.id) && <span className="sub pugh-leads">leads</span>}
                  {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off option ${o.name.trim() || i + 1}`} onClick={() => removeOpt(o)}>Take off</button>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, j) => (
              <tr key={c.id}>
                <td>
                  <input className="text-input" aria-label={`Criterion ${j + 1}`} disabled={!canEdit} value={c.name} placeholder={`Criterion ${j + 1}`} onChange={e => setCrit(c.id, { name: e.target.value })} />
                  {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off criterion ${c.name.trim() || j + 1}`} onClick={() => removeCrit(c)}>Take off</button>}
                </td>
                <td><input className="text-input scored-num" type="number" inputMode="numeric" min={1} max={5} step={1} aria-label={`Weight of ${c.name.trim() || `criterion ${j + 1}`}`} disabled={!canEdit} value={c.weight ?? ''} placeholder="1"
                  onChange={e => setCrit(c.id, { weight: e.target.value === '' ? undefined : Number(e.target.value) })} /></td>
                <td className="pugh-datum-cell" aria-label="The datum scores 0">D</td>
                {rows.map((o, i) => (
                  <td key={o.id}>
                    <select className="text-input pugh-mark" aria-label={`${o.name.trim() || `Option ${i + 1}`} on ${c.name.trim() || `criterion ${j + 1}`}`} disabled={!canEdit}
                      value={o.scores?.[c.id] === undefined ? '' : String(o.scores[c.id])} onChange={e => setMark(o, c.id, e.target.value)}>
                      <option value="">—</option>
                      {MARKS.map(m => <option key={m.v} value={m.v} title={m.word}>{m.label}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {table && table.foot.slice(0, 5).map((row, k) => (
              <tr key={row[0]} className={k >= 3 ? 'pugh-sum' : undefined} data-foot={row[0]}>
                <th scope="row">{row[0]}</th><td /><td>{row[2]}</td>
                {rows.map(o => <td key={o.id}>{foot(k, o.id)}</td>)}
              </tr>
            ))}
            {costed && (
              <tr data-foot="Cost">
                <th scope="row">Cost, £ (if known)</th><td /><td />
                {rows.map((o, i) => (
                  <td key={o.id}><input className="text-input scored-num" type="number" inputMode="decimal" min={0} aria-label={`Cost of ${o.name.trim() || `option ${i + 1}`}`} disabled={!canEdit} value={o.cost ?? ''} placeholder="—"
                    onChange={e => setOpt(o.id, { cost: e.target.value === '' ? undefined : Number(e.target.value) })} /></td>
                ))}
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      <p className="sub pugh-key">+ better than the datum · S the same · − worse. Agree the criteria and weights first, then mark; the datum scores 0 on every one.</p>
      <p className="sub">The cost is shown beside the score and is not part of it.</p>
      {canEdit && (
        <div className="pugh-acts">
          <button type="button" className="btn" onClick={() => change({ criteria: [...criteria, { id: uid(), name: '' }] })}>+ Add a criterion</button>
          <button type="button" className="btn" onClick={() => change({ rows: [...rows, { id: uid(), name: '', scores: {} }] })}>+ Add an option</button>
        </div>
      )}
      {undo && (
        <p className="sub pugh-undo" role="status">{undo.label} <button type="button" className="cw-link" onClick={() => { onChange(undo.draft); setUndo(null); }}>Undo</button></p>
      )}
      {!table && <p className="sub">The counts and the rank appear once there is a criterion and an option marked on every one.</p>}
      {leaders && leaders.length > 1 && <p className="sub">Tied at the top: {leaders.join(', ')}.</p>}
    </div>
  );
}
