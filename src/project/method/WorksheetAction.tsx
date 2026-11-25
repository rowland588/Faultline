import { useEffect, useState } from 'react';
import { useRoute } from '../../state/useRoute';
import { openActionRecord } from '../../ui/ActionRecord';
import { FOLD_OPEN, openFold } from '../../ui/Fold';
import { boardFoldId } from './shapes/BoardFold';
import { trackWorksheetAction, type WorksheetMethod } from './worksheetActions';

export function useWorksheetRow(method: WorksheetMethod, ready?: boolean) {
  const { query } = useRoute();
  const row = query.get('worksheetRow');
  useEffect(() => {
    if (!ready || !row || !/^[1-9]\d*$/.test(row)) return;
    const id = boardFoldId(method, method === 'a3' ? '5-Countermeasures' : 'actions');
    openFold(id);
    window.dispatchEvent(new CustomEvent(FOLD_OPEN, { detail: id }));
    const frame = requestAnimationFrame(() => document.getElementById(`worksheet-${method}-${row}`)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [method, ready, row]);
}

export function WorksheetAction({ projectId, method, n, answers, what, canEdit }: {
  projectId: string; method: WorksheetMethod; n: number; answers: Record<string, string>; what: string; canEdit: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = answers[`tracked@${n}`];
  const state = answers[`actstate@${n}`];
  if (state === 'removed') return <span className="sub">Removed from Actions</span>;
  if (id) return <div className="worksheet-action">
    <span>{state === 'done' ? 'Done' : state === 'waiting' ? 'Waiting' : 'To do'}</span>
    {answers[`actoutcome@${n}`] && <p>Outcome · {answers[`actoutcome@${n}`]}</p>}
    <button type="button" className="linkish" onClick={() => openActionRecord(id)}>Open action</button>
  </div>;
  if (!canEdit || !what || what === 'New action') return null;
  return <div className="worksheet-action">
    <button type="button" className="btn btn-sm" disabled={busy} onClick={async () => {
      setBusy(true);
      setError('');
      try { await trackWorksheetAction(projectId, method, n); }
      catch (e) { setError(e instanceof Error ? e.message : 'Could not save the action. Try again.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Saving…' : 'Add to Actions'}</button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
