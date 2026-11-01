/* THE PROCESS FMEA ON THE PAGE — a card a failure mode: the step, the failure mode, its effect and cause, the controls now in place, three ratings
   against the anchors, the priority the rule gives (and a hand-set one from the handbook), the action with its owner and day, and the re-rating once it
   is done. Edits go to the record through the caller (ScoredScreen's Record); the priority comes from the module (fmea.readRow), never worked out here. */
import { useState } from 'react';
import { uid } from '../../lib/ids';
import { todayISO, niceDay } from '../../lib/weeks';
import type { FmeaData, ScoredRow } from '../../lib/study';
import { AP_MEANS, AP_WORD, DETECTION, OCCURRENCE, SEVERITY, readRow, type Ap } from './fmea';

const RANK: Record<Ap, number> = { H: 0, M: 1, L: 2 };
const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) ? undefined : Number(t));

function Rating({ label, scale, value, disabled, onChange }: { label: string; scale: Record<number, string>; value?: number; disabled: boolean; onChange: (v: number | undefined) => void }) {
  return (
    <label className="field fm-rate"><span className="field-label">{label}</span>
      <select className="text-input" aria-label={label} disabled={disabled} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
        <option value="">—</option>
        {Array.from({ length: 10 }, (_, i) => 10 - i).map(n => <option key={n} value={n}>{n} — {scale[n]}</option>)}
      </select>
      <span className="sub fm-anchor">{value ? scale[value] : 'Pick the line that fits best'}</span>
    </label>
  );
}

export function FmeaEditor({ rows, canEdit, onChange }: { rows: ScoredRow[]; canEdit: boolean; onChange: (next: ScoredRow[]) => void }) {
  const today = todayISO();
  const [undo, setUndo] = useState<{ label: string; rows: ScoredRow[] } | null>(null);
  const change = (next: ScoredRow[]) => { setUndo(null); onChange(next); };
  const set = (id: string, patch: Partial<FmeaData>) => change(rows.map(r => (r.id === id ? { ...r, fmea: { ...r.fmea, ...patch } } : r)));
  const setAfter = (id: string, patch: NonNullable<FmeaData['after']>) => change(rows.map(r => (r.id === id ? { ...r, fmea: { ...r.fmea, after: { ...r.fmea?.after, ...patch } } } : r)));
  const rename = (id: string, name: string) => change(rows.map(r => (r.id === id ? { ...r, name } : r)));
  const remove = (r: ScoredRow) => { onChange(rows.filter(x => x.id !== r.id)); setUndo({ label: `${r.name.trim() || 'The failure mode'} taken off.`, rows }); };
  const add = () => change([...rows, { id: uid(), name: '', fmea: {} }]);
  const text = (id: string, key: 'step' | 'effect' | 'cause' | 'prevention' | 'detection' | 'action' | 'owner' | 'reason' | 'evidence', f: FmeaData, label: string, placeholder = '') => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input" aria-label={label} disabled={!canEdit} value={f[key] ?? ''} placeholder={placeholder} onChange={e => set(id, { [key]: e.target.value })} /></label>
  );
  return (
    <div className="fm" data-fmea>
      {rows.map((r, i) => {
        const f = r.fmea ?? {}, read = readRow(r, i + 1, today), ap = read.ap;
        return (
          <section key={r.id} className="fm-card" data-fmea-row={r.id} aria-label={`Failure mode ${i + 1}`}>
            <header className="fm-head">
              <b className="fm-no">{i + 1}</b>
              <label className="field fm-mode"><span className="field-label">Failure mode — what goes wrong</span>
                <input className="text-input" aria-label={`Failure mode ${i + 1}`} disabled={!canEdit} value={r.name} placeholder="e.g. Seal does not hold" onChange={e => rename(r.id, e.target.value)} /></label>
              <span className={'fm-ap' + (ap ? ` is-${ap}` : '')} data-ap={ap ?? ''}>{ap ? `${AP_WORD[ap]}${read.byHand ? ' · from the handbook' : ''}` : 'Not rated'}</span>
            </header>
            {read.why && <p className="sub fm-why">{read.byHand && read.rule && read.rule !== ap ? `The rule says ${AP_WORD[read.rule]} — ${read.why}. Set by hand to ${AP_WORD[ap as Ap]}.` : read.why}. A {ap ? AP_WORD[ap] : ''} {ap ? `priority ${AP_MEANS[ap]}.` : ''}</p>}
            <div className="fm-grid">
              {text(r.id, 'step', f, 'Process step', 'e.g. Sealing')}
              {text(r.id, 'effect', f, 'Effect — what the customer or the next step gets', 'e.g. Leaker reaches the customer')}
              {text(r.id, 'cause', f, 'Cause — why it would happen', 'e.g. Jaw temperature drift')}
              {text(r.id, 'prevention', f, 'Prevention now — what stops the cause', 'e.g. Set-point check each start')}
              {text(r.id, 'detection', f, 'Detection now — what would catch it', 'e.g. Seal pull every 30 min')}
            </div>
            <div className="fm-grid fm-rates">
              <Rating label="Severity of the effect" scale={SEVERITY} value={f.s} disabled={!canEdit} onChange={v => set(r.id, { s: v })} />
              <Rating label="Occurrence of the cause" scale={OCCURRENCE} value={f.o} disabled={!canEdit} onChange={v => set(r.id, { o: v })} />
              <Rating label="Detection by the control now" scale={DETECTION} value={f.d} disabled={!canEdit} onChange={v => set(r.id, { d: v })} />
            </div>
            <details className="fm-more" open={!!(f.action || f.reason || f.owner)}>
              <summary>Action, and the priority from a handbook</summary>
              <div className="fm-grid">
                {text(r.id, 'action', f, 'Action — what will be done', 'e.g. Barcode scan at reel loading')}
                {text(r.id, 'owner', f, 'Who', 'e.g. Dave')}
                <label className="field"><span className="field-label">By when</span>
                  <input className="text-input" type="date" aria-label="By when" disabled={!canEdit} value={f.due ?? ''} onChange={e => set(r.id, { due: e.target.value || undefined })} /></label>
                <label className="field"><span className="field-label">Done on <i className="sub">the day it was in place and checked</i></span>
                  <input className="text-input" type="date" aria-label="Done on" disabled={!canEdit} value={f.done ?? ''} onChange={e => set(r.id, { done: e.target.value || undefined })} /></label>
                {text(r.id, 'reason', f, 'No action — why the controls are enough', 'written down, not assumed')}
                <label className="field"><span className="field-label">Priority from the handbook <i className="sub">only if your team holds it</i></span>
                  <select className="text-input" aria-label="Priority from the handbook" disabled={!canEdit} value={f.ap ?? ''} onChange={e => set(r.id, { ap: (e.target.value || undefined) as Ap | undefined })}>
                    <option value="">The rule’s</option><option value="H">High</option><option value="M">Medium</option><option value="L">Low</option>
                  </select></label>
                <label className="field"><span className="field-label">One occurrence costs <i className="sub">£, optional</i></span>
                  <input className="text-input scored-num" inputMode="decimal" aria-label="One occurrence costs" disabled={!canEdit} value={f.cost ?? ''} onChange={e => set(r.id, { cost: num(e.target.value) })} /></label>
                <label className="field fm-tick"><input type="checkbox" aria-label="A food-safety hazard" disabled={!canEdit} checked={!!f.haccp} onChange={e => set(r.id, { haccp: e.target.checked || undefined })} /> <span>A food-safety hazard — it belongs in the HACCP plan too</span></label>
              </div>
              {f.done && (
                <div className="fm-after">
                  <p className="sub"><b>After the action</b> — the same three ratings, once it is in place and checked ({niceDay(f.done)}).{read.afterAp ? ` Now ${AP_WORD[read.afterAp]}${ap ? (read.afterAp === ap ? ', unchanged' : `, ${RANK[read.afterAp] > RANK[ap] ? 'down' : 'up'} from ${AP_WORD[ap]}`) : ''}.` : ''}</p>
                  <div className="fm-grid fm-rates">
                    <Rating label="Severity after" scale={SEVERITY} value={f.after?.s ?? f.s} disabled={!canEdit} onChange={v => setAfter(r.id, { s: v })} />
                    <Rating label="Occurrence after" scale={OCCURRENCE} value={f.after?.o} disabled={!canEdit} onChange={v => setAfter(r.id, { o: v })} />
                    <Rating label="Detection after" scale={DETECTION} value={f.after?.d} disabled={!canEdit} onChange={v => setAfter(r.id, { d: v })} />
                  </div>
                  {text(r.id, 'evidence', f, 'Evidence — how it was checked', 'e.g. 3 shifts, no wrong reel')}
                </div>
              )}
            </details>
            {read.late && <p className="ie-warn" role="status">This action was due {niceDay(f.due)} and is not done.</p>}
            {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off failure mode ${i + 1}`} onClick={() => remove(r)}>Take off</button>}
          </section>
        );
      })}
      {canEdit && <button type="button" className="btn" onClick={add}>+ Add a failure mode</button>}
      {undo && <p className="sub" role="status">{undo.label} <button type="button" className="linkish" onClick={() => { onChange(undo.rows); setUndo(null); }}>Undo</button></p>}
      <details className="fm-scales"><summary>The rating scales — Faultline’s anchors for food manufacturing</summary>
        {([['Severity', SEVERITY], ['Occurrence', OCCURRENCE], ['Detection', DETECTION]] as const).map(([name, sc]) => (
          <div key={name}><h4>{name}</h4><ul>{Array.from({ length: 10 }, (_, i) => 10 - i).map(n => <li key={n}><b>{n}</b> {sc[n]}</li>)}</ul></div>
        ))}
      </details>
    </div>
  );
}
