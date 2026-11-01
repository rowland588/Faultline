/* A CHECKLIST ON THE PAGE — items under their headings, each with its state, who owns it, its day and what proves it (FC-082 readiness, FC-178 hygienic design).
   Edits go to the record through the caller (ScoredScreen's Record); the sentence, counts and tiles above are the module's — never worked out here.
   Colour is never the only carrier: a state, a late day and an item that would stop day one each say so in words. */
import { useState } from 'react';
import { uid } from '../../lib/ids';
import type { ScoredRow } from '../../lib/study';
import { todayISO } from '../../lib/weeks';
import type { ScoredChecklist } from './types';

export function ChecklistEditor({ rows, list, canEdit, onChange }: { rows: ScoredRow[]; list: ScoredChecklist; canEdit: boolean; onChange: (next: ScoredRow[]) => void }) {
  const [undo, setUndo] = useState<{ label: string; rows: ScoredRow[] } | null>(null);
  const [area, setArea] = useState('');
  const [what, setWhat] = useState('');
  const today = todayISO();
  const first = list.states[0].key;
  const has = (f: ScoredChecklist['fields'][number]): boolean => list.fields.includes(f);
  const label = (f: keyof NonNullable<ScoredChecklist['labels']>, d: string): string => list.labels?.[f] ?? d;
  const change = (next: ScoredRow[]) => { setUndo(null); onChange(next); };
  const set = (id: string, patch: Partial<ScoredRow>) => change(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (r: ScoredRow) => { onChange(rows.filter(x => x.id !== r.id)); setUndo({ label: `${r.name.trim() || `The ${list.noun}`} taken off.`, rows }); };
  const areaOf = (r: ScoredRow): string => (r.group ?? '').trim() || 'Other';
  const areas = [...new Set(rows.map(areaOf))];
  const add = () => {
    const g = area.trim() || areas[areas.length - 1] || '';
    change([...rows, { id: uid(), name: what.trim(), ...(g ? { group: g } : {}), status: first }]);
    setWhat('');
  };
  let n = 0;
  return (
    <div className="ckl" data-checklist>
      {areas.map(a => {
        const mine = rows.filter(r => areaOf(r) === a);
        const done = mine.filter(r => (r.status ?? first) !== first).length;
        return (
          <section key={a} className="ckl-area" data-area={a} aria-label={a}>
            <h3 className="ckl-h">{a} <span className="sub">{done} of {mine.length} done</span></h3>
            <ul className="ckl-items">
              {mine.map(r => {
                const i = ++n;
                const state = r.status ?? first;
                const late = state === first && !!r.due && r.due < today;
                return (
                  <li key={r.id} className={`ckl-item is-${state}`} data-item={r.id}>
                    <div className="ckl-top">
                      <input className="text-input ckl-name" aria-label={`${list.noun[0].toUpperCase()}${list.noun.slice(1)} ${i}`} disabled={!canEdit} value={r.name} placeholder={`What must be done`} onChange={e => set(r.id, { name: e.target.value })} />
                      <select className="text-input ckl-state" aria-label={`State of ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={state} onChange={e => set(r.id, { status: e.target.value })}>
                        {list.states.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                    {(late || (r.stopper && state === first)) && (
                      <p className="ckl-tags">
                        {late && <span className="ckl-tag is-late">Late — was due {r.due}</span>}
                        {r.stopper && state === first && <span className="ckl-tag is-stop">Would stop day one</span>}
                      </p>
                    )}
                    <div className="ckl-grid">
                      {has('source') && <label className="field"><span className="field-label">{label('source', 'Where it comes from')}</span>
                        <input className="text-input" aria-label={`${label('source', 'Where it comes from')} — ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={r.source ?? ''} onChange={e => set(r.id, { source: e.target.value })} /></label>}
                      {has('evidence') && <label className="field"><span className="field-label">{label('evidence', 'What will prove it')}</span>
                        <input className="text-input" aria-label={`${label('evidence', 'What will prove it')} — ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={r.evidence ?? ''} onChange={e => set(r.id, { evidence: e.target.value })} /></label>}
                      {has('owner') && <label className="field"><span className="field-label">{label('owner', 'Who owns it')}</span>
                        <input className="text-input" aria-label={`${label('owner', 'Who owns it')} — ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={r.owner ?? ''} placeholder="a name" onChange={e => set(r.id, { owner: e.target.value })} /></label>}
                      {has('due') && <label className="field"><span className="field-label">{label('due', 'By when')}</span>
                        <input className="text-input" type="date" aria-label={`${label('due', 'By when')} — ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={r.due ?? ''} onChange={e => set(r.id, { due: e.target.value || undefined })} /></label>}
                      {has('severity') && list.severities && <label className="field"><span className="field-label">{label('severity', 'How serious')}</span>
                        <select className="text-input" aria-label={`${label('severity', 'How serious')} — ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={r.severity ?? ''} onChange={e => set(r.id, { severity: e.target.value || undefined })}>
                          <option value="">—</option>{list.severities.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>}
                      {has('note') && <label className="field ckl-wide"><span className="field-label">{label('note', 'What was seen')}</span>
                        <input className="text-input" aria-label={`${label('note', 'What was seen')} — ${r.name.trim() || `${list.noun} ${i}`}`} disabled={!canEdit} value={r.note ?? ''} onChange={e => set(r.id, { note: e.target.value })} /></label>}
                    </div>
                    <div className="ckl-foot">
                      {has('stopper') && <label className="ckl-stop"><input type="checkbox" disabled={!canEdit} checked={!!r.stopper} aria-label={`${label('stopper', 'Would stop day one')} — ${r.name.trim() || `${list.noun} ${i}`}`} onChange={e => set(r.id, { stopper: e.target.checked || undefined })} /> <span>{label('stopper', 'Would stop day one')}</span></label>}
                      {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off ${r.name.trim() || `${list.noun} ${i}`}`} onClick={() => remove(r)}>Take off</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {canEdit && (
        <div className="ckl-add">
          <label className="field"><span className="field-label">{list.groupLabel} for a new {list.noun}</span>
            <input className="text-input" list="ckl-areas" aria-label={`${list.groupLabel} for a new ${list.noun}`} value={area} placeholder={areas[areas.length - 1] ?? 'e.g. People'} onChange={e => setArea(e.target.value)} /></label>
          <label className="field"><span className="field-label">The new {list.noun}</span>
            <input className="text-input" aria-label={`The new ${list.noun}`} value={what} placeholder="What must be done" onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && what.trim()) { e.preventDefault(); add(); } }} /></label>
          <button type="button" className="btn" disabled={!what.trim()} onClick={add}>+ Add {/^[aeiou]/i.test(list.noun) ? 'an' : 'a'} {list.noun}</button>
          <datalist id="ckl-areas">{areas.map(g => <option key={g} value={g} />)}</datalist>
        </div>
      )}
      {undo && <p className="sub pugh-undo" role="status">{undo.label} <button type="button" className="cw-link" onClick={() => { onChange(undo.rows); setUndo(null); }}>Undo</button></p>}
    </div>
  );
}
