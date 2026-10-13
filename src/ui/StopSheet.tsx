/* ONE STOP, CHANGED WHERE IT IS LISTED — the line's log on Capture (docs/
 * AUDIT.md, bar 2). Its machine, what it was and its kind from the line's own
 * lists (the one it had kept when it has since left them), its minutes, its
 * note and its cause family; Save writes it (lib/stopEdit says what changes,
 * and a stop whose minutes are typed over says it was typed), Undo puts it
 * back. Delete stays on the row, where it was. */
import { useState } from 'react';
import type { Observation, Workspace } from '../types';
import { Sheet } from './Sheet';
import { SIXM, type SixM } from '../lib/sixm';
import { changedStop, minutesOf } from '../lib/stopEdit';

const withCurrent = (list: readonly string[], cur?: string) => (cur && !list.includes(cur) ? [cur, ...list] : [...list]);

export function StopSheet({ o, ws, onClose, onSave }: {
  o: Observation; ws: Pick<Workspace, 'assets' | 'categories' | 'subcategories'>;
  onClose: () => void;
  /** The stop as changed, and as it was — for Undo. */
  onSave: (next: Observation, before: Observation) => void;
}) {
  const [asset, setAsset] = useState(o.asset);
  const [category, setCategory] = useState(o.category);
  const [sub, setSub] = useState(o.subcategory ?? '');
  const startMin = minutesOf(o.durationMs);
  const [min, setMin] = useState(o.durationMs > 0 ? startMin : '');
  const [note, setNote] = useState(o.note ?? '');
  const [bone, setBone] = useState<SixM | ''>(o.causeM ?? '');
  const subs = withCurrent((ws.subcategories ?? {})[category] ?? [], category === o.category ? o.subcategory : undefined);
  /* the minutes are sent only when they were typed over — opening and saving
     never turns a timed stop into a typed one by rounding */
  const minutes = min.trim() === (o.durationMs > 0 ? startMin : '') ? undefined : min.trim() === '' ? 0 : Number(min);
  const next = changedStop(o, { asset, category, subcategory: sub, minutes, note, ...(bone ? { causeM: bone } : {}) });
  const bad = minutes !== undefined && !(Number.isFinite(minutes) && minutes >= 0);
  return (
    <Sheet open onClose={onClose} title="Change this stop">
      <form className="stop-edit" onSubmit={e => { e.preventDefault(); if (next) onSave(next, o); }}>
        <label className="field"><span className="field-label">Where</span>
          <select className="text-input" value={asset} aria-label="Which machine" onChange={e => setAsset(e.target.value)}>
            {withCurrent(ws.assets, o.asset).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="field"><span className="field-label">What</span>
          <select className="text-input" value={category} aria-label="What it was" onChange={e => { setCategory(e.target.value); setSub(''); }}>
            {withCurrent(ws.categories, o.category).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {(subs.length > 0 || sub) && (
          <label className="field"><span className="field-label">Kind</span>
            <select className="text-input" value={sub} aria-label="Its kind" onChange={e => setSub(e.target.value)}>
              <option value="">No kind</option>
              {subs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
        <label className="field"><span className="field-label">Minutes {o.timing === 'stopwatch' && <i className="sub">timed — typed over, it says typed</i>}</span>
          <input className="text-input" inputMode="decimal" value={min} placeholder="0 — a stop counted, not timed" aria-label="How long, in minutes" onChange={e => setMin(e.target.value)} />
          {bad && <span className="sub stop-edit-bad">A number of minutes — 0 or more.</span>}
        </label>
        <label className="field"><span className="field-label">Cause family <i className="sub">optional</i></span>
          <select className="text-input" value={bone} aria-label="Its cause family" onChange={e => setBone(e.target.value as SixM | '')}>
            <option value="">Not given</option>
            {SIXM.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
        </label>
        <label className="field"><span className="field-label">Note <i className="sub">optional</i></span>
          <textarea className="text-area" rows={2} value={note} maxLength={500} aria-label="Note" onChange={e => setNote(e.target.value)} />
        </label>
        <div className="stop-edit-acts">
          <button type="submit" className="btn btn-primary" disabled={!next}>Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
