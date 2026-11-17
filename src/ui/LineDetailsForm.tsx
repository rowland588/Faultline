import { useState } from 'react';
import type { Workspace } from '../types';
import { patchWorkspaceRecord } from '../db';

const FIELDS = [
  ['name', 'Name', 'e.g. Line 2A'], ['lineType', 'Type', 'e.g. Packing'],
  ['clientName', 'Client', 'Optional'], ['siteName', 'Site', 'Optional'], ['areaName', 'Area', 'Optional'],
] as const;
type Field = typeof FIELDS[number][0];
const valuesOf = (line: Workspace) => Object.fromEntries(FIELDS.map(([key]) => [key, line[key] ?? ''])) as Record<Field, string>;

/** Save only fields changed in this form, against the current database record. */
export function LineDetailsForm({ line, onSaved, offered = {} }: {
  line: Workspace; onSaved: () => void; offered?: Partial<Record<Field, string[]>>;
}) {
  const [original, setOriginal] = useState(() => valuesOf(line));
  const [draft, setDraft] = useState(original);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const changed = FIELDS.filter(([key]) => draft[key].trim() !== original[key]);
  const save = async () => {
    if (!draft.name.trim() || busy || !changed.length) return;
    setBusy(true); setMessage('');
    try {
      const patch = Object.fromEntries(changed.map(([key]) => [key, draft[key].trim() || undefined]));
      const saved = await patchWorkspaceRecord(line.id, patch);
      if (!saved) throw new Error('Line unavailable');
      const values = valuesOf(saved); setOriginal(values); setDraft(values); setMessage('Changes saved.'); onSaved();
    } catch { setMessage('Changes could not be saved. Your entries are still here; please try again.'); }
    finally { setBusy(false); }
  };
  return <form className="line-details-form" aria-label={`Details for ${line.name}`} onSubmit={e => { e.preventDefault(); void save(); }}>
    <div className="line-details-fields">{FIELDS.map(([key, label, placeholder]) => <label key={key}>
      <span>{label}{key !== 'name' ? ' (optional)' : ''}</span>
      <input className="text-input" aria-label={`The line's ${key === 'lineType' ? 'type' : label.toLowerCase()}`} required={key === 'name'} maxLength={80} placeholder={placeholder} value={draft[key]} disabled={busy}
        list={`line-details-${line.id}-${key}`} onChange={e => { setDraft(d => ({ ...d, [key]: e.target.value })); setMessage(''); }} />
      {offered[key]?.length ? <datalist id={`line-details-${line.id}-${key}`}>{offered[key]?.map(v => <option key={v} value={v} />)}</datalist> : null}
    </label>)}</div>
    <div className="line-details-actions"><button type="submit" className="btn btn-primary" disabled={busy || !changed.length || !draft.name.trim()}>{busy ? 'Saving…' : 'Save changes'}</button>
      {changed.length > 0 && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setDraft(original); setMessage(''); }}>Discard changes</button>}
      <span role="status" className="sub">{message || (changed.length ? 'Unsaved changes' : '')}</span>
    </div>
  </form>;
}
