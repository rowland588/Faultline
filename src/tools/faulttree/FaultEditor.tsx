/* THE FAULT TREE ON THE PAGE — an indented outline: the top event, the gates under it (AND: all of the causes below must happen; OR: any one), and the basic events
   at the leaves, each with a probability for the same period and, if it is one cause that appears under two gates, the event it is the same as. What a row is
   (a gate or a basic event) comes from the module (fault.buildTree), never decided here. Edits go to the record through the caller (ScoredScreen's Record). */
import { useMemo, useState } from 'react';
import { uid } from '../../lib/ids';
import type { ScoredRow, TreeData } from '../../lib/study';
import { buildTree, outline, pWords } from './fault';

const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) ? undefined : Number(t));

export function FaultEditor({ rows, canEdit, study, onChange, onInputs }: {
  rows: ScoredRow[]; canEdit: boolean; study: { agreed?: { scored?: { eventCost?: number; period?: string } } }; onChange: (next: ScoredRow[]) => void;
  onInputs: (patch: { eventCost?: number; period?: string }) => void;
}) {
  const sc = study.agreed?.scored;
  const [undo, setUndo] = useState<{ label: string; rows: ScoredRow[] } | null>(null);
  const change = (next: ScoredRow[]) => { setUndo(null); onChange(next); };
  const tree = useMemo(() => buildTree(rows), [rows]);
  const lines = useMemo(() => outline(rows), [rows]);
  const leaves = lines.filter(l => l.node.leaf && l.row.name.trim());
  const set = (id: string, patch: Partial<TreeData>) => change(rows.map(r => (r.id === id ? { ...r, tree: { ...r.tree, ...patch } } : r)));
  const rename = (id: string, name: string) => change(rows.map(r => (r.id === id ? { ...r, name } : r)));
  const addUnder = (parent: string) => change([...rows, { id: uid(), name: '', tree: { parent } }]);
  const subtree = (id: string): Set<string> => { const out = new Set<string>([id]); const go = (n: string) => { for (const k of tree.byId.get(n)?.kids ?? []) { out.add(k); go(k); } }; go(id); return out; };
  const remove = (r: ScoredRow) => { const gone = subtree(r.id); onChange(rows.filter(x => !gone.has(x.id)).map(x => (x.tree?.same && gone.has(x.tree.same) ? { ...x, tree: { ...x.tree, same: undefined } } : x))); setUndo({ label: `${r.name.trim() || 'The cause'}${gone.size > 1 ? ` and the ${gone.size - 1} below it` : ''} taken off.`, rows }); };
  const top = tree.top;
  return (
    <div className="fm ft" data-faulttree>
      <details className="fm-more cp-prices" open={!!(sc?.eventCost || sc?.period)}>
        <summary>The period and what the top event costs (optional)</summary>
        <div className="fm-grid">
          <label className="field"><span className="field-label">Every probability is for — the same period</span>
            <input className="text-input" aria-label="The period every probability is for" disabled={!canEdit} value={sc?.period ?? ''} placeholder="e.g. a year, a shift, a demand" onChange={e => onInputs({ period: e.target.value || undefined })} /></label>
          <label className="field scored-rate"><span className="field-label">What one occurrence of the top event costs, £</span>
            <input className="text-input scored-num" inputMode="decimal" aria-label="What one occurrence of the top event costs" disabled={!canEdit} value={sc?.eventCost ?? ''} onChange={e => onInputs({ eventCost: num(e.target.value) })} /></label>
        </div>
      </details>
      <p className="sub">An <b>AND</b> gate needs all the causes below it to happen; an <b>OR</b> gate, any one. A cause with nothing below it is a basic event — give it a probability for the period.</p>
      {lines.map(({ row: r, node: n }, i) => {
        const f = r.tree ?? {}, isTop = top?.id === r.id, role = isTop ? 'Top event' : n.leaf ? 'Basic event' : `${n.gate} gate`;
        const others = leaves.filter(l => l.row.id !== r.id && !l.row.tree?.same);
        return (
          <section key={r.id} className={`fm-card ft-node ft-d${Math.min(n.depth, 6)}` + (n.leaf ? ' is-leaf' : '')} data-ft-row={r.id} data-ft-role={role} aria-label={`${role} ${i + 1}`}>
            <header className="fm-head">
              <b className="fm-no">{i + 1}</b>
              <label className="field fm-mode"><span className="field-label">{isTop ? 'Top event — the failure this tree explains' : n.leaf ? 'Basic event — a cause that needs no explaining' : 'Cause — made of the causes below it'}</span>
                <input className="text-input" aria-label={`${role} ${i + 1}`} disabled={!canEdit} value={r.name} placeholder={isTop ? 'e.g. Metal reaches a consumer in a pack' : 'e.g. Screen mesh breaks'} onChange={e => rename(r.id, e.target.value)} /></label>
              <span className={'fm-ap' + (isTop ? ' is-H' : n.leaf ? ' is-L' : ' is-M')}>{role}</span>
            </header>
            <div className="fm-grid">
              {!n.leaf && (
                <label className="field"><span className="field-label">The causes below happen</span>
                  <select className="text-input" aria-label="Gate" disabled={!canEdit} value={n.gate ?? 'OR'} onChange={e => set(r.id, { gate: e.target.value as 'AND' | 'OR' })}>
                    <option value="OR">OR — any one of them is enough</option><option value="AND">AND — all of them together</option></select></label>
              )}
              {n.leaf && !f.same && (
                <label className="field"><span className="field-label">Probability, 0 to 1 <i className="sub">for the same period</i></span>
                  <input className="text-input scored-num" inputMode="decimal" aria-label="Probability" disabled={!canEdit} value={f.p ?? ''} onChange={e => set(r.id, { p: num(e.target.value) })} />
                  <span className="sub">{f.p !== undefined && f.p >= 0 && f.p <= 1 ? pWords(f.p) : f.p !== undefined ? 'A probability is between 0 and 1.' : ' '}</span></label>
              )}
              {n.leaf && !isTop && (others.length > 0 || f.same) && (
                <label className="field"><span className="field-label">Or the same cause as <i className="sub">one cause under two gates</i></span>
                  <select className="text-input" aria-label="The same cause as" disabled={!canEdit} value={f.same ?? ''} onChange={e => set(r.id, { same: e.target.value || undefined })}>
                    <option value="">A cause of its own</option>
                    {f.same && !others.some(o => o.row.id === f.same) && <option value={f.same}>{rows.find(x => x.id === f.same)?.name || 'that cause'}</option>}
                    {others.map(o => <option key={o.row.id} value={o.row.id}>{o.row.name}</option>)}
                  </select></label>
              )}
            </div>
            {canEdit && (
              <div className="cp-acts">
                <button type="button" className="cw-link" aria-label={`Add a cause under ${r.name.trim() || `row ${i + 1}`}`} onClick={() => addUnder(r.id)}>+ Add a cause under this</button>
                {!isTop && <button type="button" className="cw-link sp-rm" aria-label={`Take off ${role.toLowerCase()} ${i + 1}`} onClick={() => remove(r)}>Take off</button>}
              </div>
            )}
          </section>
        );
      })}
      {undo && <p className="sub" role="status">{undo.label} <button type="button" className="linkish" onClick={() => { onChange(undo.rows); setUndo(null); }}>Undo</button></p>}
    </div>
  );
}
