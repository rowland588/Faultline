/* Workspace settings — rename + manage the vocabularies (what / where / why).
 * The same string arrays the floor grows inline; here they're editable. */
import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';

function ChipEditor({ title, items, onChange, addLabel }: {
  title: string; items: string[]; onChange: (next: string[]) => void; addLabel: string;
}) {
  const [text, setText] = useState('');
  const add = () => { const t = text.trim(); if (t && !items.includes(t)) onChange([...items, t]); setText(''); };
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="field-label">{title}</div>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {items.map(it => (
          <span key={it} className="chip">
            {it}
            <button className="chip-x" onClick={() => onChange(items.filter(x => x !== it))} aria-label={`Remove ${it}`}>×</button>
          </span>
        ))}
        {items.length === 0 && <span className="sub">None yet.</span>}
      </div>
      <div className="row-inline" style={{ marginTop: 10 }}>
        <input className="text-input" value={text} placeholder={addLabel} maxLength={48}
          onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        <button className="btn" onClick={add} disabled={!text.trim()}>Add</button>
      </div>
    </div>
  );
}

export function WorkspaceSettings() {
  const { workspace, patchWorkspace } = useWorkspace();
  return (
    <div className="wrap">
      <p className="eyebrow">Settings</p>
      <div className="card">
        <label className="field-label">Workspace name</label>
        <input className="text-input" defaultValue={workspace.name} maxLength={60}
          onBlur={e => { const v = e.target.value.trim(); if (v && v !== workspace.name) void patchWorkspace({ name: v }); }} />
      </div>
      <ChipEditor title="What — categories" items={workspace.categories} addLabel="Add a category…"
        onChange={categories => void patchWorkspace({ categories })} />
      <ChipEditor title="Where — assets" items={workspace.assets} addLabel="Add a machine or area…"
        onChange={assets => void patchWorkspace({ assets })} />
      <ChipEditor title="Why — reasons" items={workspace.reasons} addLabel="Add a reason…"
        onChange={reasons => void patchWorkspace({ reasons })} />
    </div>
  );
}
