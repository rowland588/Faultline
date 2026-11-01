/* THE SKILLS MATRIX ON THE PAGE — people down, tasks across, a level in each cell (— not trained · I learning · L with help · U alone to the
   standard · O can teach it), and under each task the cover on each shift against the cover wanted. Edits go to the record through the caller
   (ScoredScreen's Record); the figures under the columns are the module's table (skills.skillsTable), never worked out here. A colour is not a
   level: every cell says its letter and its words. */
import { useState } from 'react';
import { uid } from '../../lib/ids';
import type { ScoredCriterion, ScoredRow } from '../../lib/study';
import type { ScoredTable } from '../scored/types';
import { LEVELS } from './skills';

export interface SkillsDraft { rows: ScoredRow[]; criteria: ScoredCriterion[] }

export function SkillsEditor({ draft, table, canEdit, onChange }: { draft: SkillsDraft; table?: ScoredTable; canEdit: boolean; onChange: (next: SkillsDraft) => void }) {
  const { rows, criteria } = draft;
  const [undo, setUndo] = useState<{ label: string; draft: SkillsDraft } | null>(null);
  const change = (next: Partial<SkillsDraft>) => { setUndo(null); onChange({ ...draft, ...next }); };
  const setTask = (id: string, patch: Partial<ScoredCriterion>) => change({ criteria: criteria.map(c => (c.id === id ? { ...c, ...patch } : c)) });
  const setPerson = (id: string, patch: Partial<ScoredRow>) => change({ rows: rows.map(r => (r.id === id ? { ...r, ...patch } : r)) });
  const setLevel = (p: ScoredRow, tid: string, v: string) => setPerson(p.id, { scores: { ...p.scores, [tid]: v === '' ? undefined : Number(v) } });
  const removeTask = (c: ScoredCriterion) => { onChange({ ...draft, criteria: criteria.filter(x => x.id !== c.id) }); setUndo({ label: `${c.name.trim() || 'The task'} taken off.`, draft }); };
  const removePerson = (p: ScoredRow) => { onChange({ ...draft, rows: rows.filter(x => x.id !== p.id) }); setUndo({ label: `${p.name.trim() || 'The person'} taken off.`, draft }); };
  const shifts = [...new Set(rows.map(r => (r.shift ?? '').trim()).filter(Boolean))];
  const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));
  const named = rows.filter(r => r.name.trim());
  const doneCol = table ? table.head.length - 1 : -1;

  return (
    <div className="skl" data-skills>
      <div className="scored-table-wrap">
        <table className="scored-table skl-table">
          <thead>
            <tr>
              <th scope="col">Person</th><th scope="col">Shift</th>
              {criteria.map((c, j) => (
                <th key={c.id} scope="col" className="skl-task">
                  <input className="text-input" aria-label={`Task ${j + 1}`} disabled={!canEdit} value={c.name} placeholder={`Task ${j + 1}`} onChange={e => setTask(c.id, { name: e.target.value })} />
                  <span className="skl-pair">
                    <input className="text-input scored-num" type="number" inputMode="numeric" min={1} max={20} step={1} aria-label={`People wanted on ${c.name.trim() || `task ${j + 1}`}`} title="People wanted on each shift (blank: the matrix’s own)" disabled={!canEdit} value={c.need ?? ''} placeholder="wanted"
                      onChange={e => setTask(c.id, { need: num(e.target.value) })} />
                    <input className="text-input scored-num" type="number" inputMode="numeric" min={1} max={5} step={1} aria-label={`How much ${c.name.trim() || `task ${j + 1}`} matters, 1 to 5`} title="How much it matters, 1 to 5 — the training is ranked by it" disabled={!canEdit} value={c.weight ?? ''} placeholder="matters"
                      onChange={e => setTask(c.id, { weight: num(e.target.value) })} />
                  </span>
                  {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off task ${c.name.trim() || j + 1}`} onClick={() => removeTask(c)}>Take off</button>}
                </th>
              ))}
              <th scope="col">Can do alone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const out = table?.rows[named.indexOf(p)];
              return (
                <tr key={p.id}>
                  <td>
                    <input className="text-input" aria-label={`Person ${i + 1}`} disabled={!canEdit} value={p.name} placeholder={`Person ${i + 1}`} onChange={e => setPerson(p.id, { name: e.target.value })} />
                    {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off ${p.name.trim() || `person ${i + 1}`}`} onClick={() => removePerson(p)}>Take off</button>}
                  </td>
                  <td><input className="text-input" list="skl-shifts" aria-label={`Shift of ${p.name.trim() || `person ${i + 1}`}`} disabled={!canEdit} value={p.shift ?? ''} placeholder="Days" onChange={e => setPerson(p.id, { shift: e.target.value })} /></td>
                  {criteria.map((c, j) => (
                    <td key={c.id}>
                      <select className="text-input skl-level" aria-label={`${p.name.trim() || `Person ${i + 1}`} on ${c.name.trim() || `task ${j + 1}`}`} disabled={!canEdit}
                        value={p.scores?.[c.id] === undefined ? '' : String(p.scores[c.id])} onChange={e => setLevel(p, c.id, e.target.value)}>
                        <option value="">— not marked</option>
                        <option value="0">0 · Not trained</option>
                        {LEVELS.slice(1).map(l => <option key={l.v} value={String(l.v)} title={l.word}>{l.short} · {l.pick}</option>)}
                      </select>
                    </td>
                  ))}
                  <td className="skl-can">{out && doneCol > 0 ? out[doneCol] : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          {table && (
            <tfoot>
              {table.foot.map(row => (
                <tr key={row[0]} data-foot={row[0]} className={row[0].startsWith('Cover on') || row[0].startsWith('Cover (') ? 'skl-cover' : undefined}>
                  <th scope="row">{row[0]}</th><td />
                  {criteria.map((c, j) => <td key={c.id}>{row[2 + j] ?? ''}</td>)}
                  <td />
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
      <datalist id="skl-shifts">{shifts.map(s => <option key={s} value={s} />)}</datalist>
      <p className="sub skl-key">{LEVELS.slice(1).map(l => `${l.short} ${l.word.toLowerCase()}`).join(' · ')}. Cover is the people at U or O on a shift. Blank is not trained.</p>
      {canEdit && (
        <div className="pugh-acts">
          <button type="button" className="btn" onClick={() => change({ criteria: [...criteria, { id: uid(), name: '' }] })}>+ Add a task</button>
          <button type="button" className="btn" onClick={() => change({ rows: [...rows, { id: uid(), name: '', scores: {} }] })}>+ Add a person</button>
        </div>
      )}
      {undo && (
        <p className="sub pugh-undo" role="status">{undo.label} <button type="button" className="cw-link" onClick={() => { onChange(undo.draft); setUndo(null); }}>Undo</button></p>
      )}
    </div>
  );
}
