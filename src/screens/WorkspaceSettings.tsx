/* Workspace settings — rename + manage the vocabularies. Categories and assets
 * are flat lists; sub-categories are managed PER category (each is its own drill
 * level → its own Pareto). Same quick add as the floor. */
import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { hasCost, fmtGBP } from '../lib/cost';

function ChipEditor({ title, items, onChange, addLabel }: {
  title?: string; items: string[]; onChange: (next: string[]) => void; addLabel: string;
}) {
  const [text, setText] = useState('');
  const add = () => { const t = text.trim(); if (t && !items.includes(t)) onChange([...items, t]); setText(''); };
  return (
    <div className="chip-editor">
      {title && <div className="field-label">{title}</div>}
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
  const subs = workspace.subcategories ?? {};
  const setCatSubs = (cat: string, next: string[]) => void patchWorkspace({ subcategories: { ...subs, [cat]: next } });

  return (
    <div className="wrap">
      <p className="eyebrow">Settings</p>

      <div className="card">
        <label className="field-label">Workspace name</label>
        <input className="text-input" defaultValue={workspace.name} maxLength={60}
          onBlur={e => { const v = e.target.value.trim(); if (v && v !== workspace.name) void patchWorkspace({ name: v }); }} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Cost of downtime</div>
        <p className="sub" style={{ margin: '4px 0 10px' }}>Crew on the line × labour rate = £/hour of idle labour. Time lost then reads in £.</p>
        <div className="row-inline" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="mini-label">People on the line</label>
            <input className="text-input" type="number" inputMode="decimal" min={0} step="1"
              defaultValue={workspace.crew ?? ''} placeholder="e.g. 6"
              onBlur={e => { const v = parseFloat(e.target.value); void patchWorkspace({ crew: Number.isFinite(v) && v > 0 ? v : undefined }); }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mini-label">Labour rate £/hr</label>
            <input className="text-input" type="number" inputMode="decimal" min={0} step="0.01"
              defaultValue={workspace.labourRatePerHour ?? ''} placeholder="e.g. 18.50"
              onBlur={e => { const v = parseFloat(e.target.value); void patchWorkspace({ labourRatePerHour: Number.isFinite(v) && v > 0 ? v : undefined }); }} />
          </div>
        </div>
        {hasCost(workspace) && (
          <div className="cost-readout">= <b>{fmtGBP(workspace.crew! * workspace.labourRatePerHour!)}/hr</b> of idle labour while this line is down</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <ChipEditor title="Categories (What)" items={workspace.categories} addLabel="Add a category…"
          onChange={categories => void patchWorkspace({ categories })} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Sub-categories</div>
        <p className="sub" style={{ margin: '4px 0 6px' }}>Each category has its own kinds — they drill to their own Pareto.</p>
        {workspace.categories.map(cat => (
          <div key={cat} className="sub-editor">
            <div className="sub-editor-cat">{cat}</div>
            <ChipEditor items={subs[cat] ?? []} addLabel={`Add a kind of ${cat}…`} onChange={next => setCatSubs(cat, next)} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <ChipEditor title="Assets on the line" items={workspace.assets} addLabel="Add a machine or area…"
          onChange={assets => void patchWorkspace({ assets })} />
      </div>
    </div>
  );
}
