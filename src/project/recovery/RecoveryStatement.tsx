import { useState } from 'react';
import { useAnswers, useSaveAnswer } from '../method/MethodSheet';

/** Define on the recovery page edits the same answer as the DMAIC charter. */
export function RecoveryStatement({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { answers, items, ready } = useAnswers(projectId, 'dmaic');
  const saveAnswer = useSaveAnswer(projectId, 'dmaic', items);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const statement = answers.problem ?? '';
  if (!ready) return <p className="sub" role="status">Loading problem statement…</p>;

  if (!canEdit || (statement && draft === null)) return <div className="recovery-statement">
    <h3>Problem statement</h3>
    <p className="recovery-saved-statement">{statement || 'No problem statement recorded yet.'}</p>
    {canEdit && <button className="btn btn-sm" onClick={() => setDraft(statement)}>Edit statement</button>}
  </div>;

  const value = draft ?? '';
  async function save() {
    if (saving || !value.trim()) return;
    setSaving(true);
    setError('');
    try {
      await saveAnswer('problem', value.trim(), 'Problem statement');
      setDraft(null);
    } catch {
      setError('The statement could not be saved. Your words are still here. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return <form className="recovery-statement" onSubmit={event => { event.preventDefault(); void save(); }}>
    <label>
      <span className="field-label">Problem statement</span>
      <textarea className="text-input" rows={3} value={value} disabled={saving}
        placeholder="What is happening, where and when?"
        onChange={event => setDraft(event.target.value)} />
    </label>
    {value.trim() && <button className="btn btn-sm btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save statement'}</button>}
    {statement && <button className="btn btn-sm btn-ghost" type="button" disabled={saving} onClick={() => { setDraft(null); setError(''); }}>Cancel</button>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
