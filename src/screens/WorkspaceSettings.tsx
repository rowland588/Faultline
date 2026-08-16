/* Workspace settings — name, cost model, and the vocabularies. Categories and
 * assets are flat lists; sub-categories are managed PER category. Every value can
 * be renamed (which fixes it across all history) or removed (with a heads-up if
 * it's in use). Each change confirms with a quiet toast. */
import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { goBack } from '../state/useRoute';
import { renameInObservations } from '../db';
import { Toast } from '../ui/Toast';
import { hasCost, costPerHour, burdenOf, fmtGBP } from '../lib/cost';
import { plural } from '../lib/format';
import { supabase } from '../cloud/client';
import { PeoplePanel } from './PeopleScreen';
import { TAXONOMIES, type LossTaxonomy } from '../lib/taxonomy';
import type { Shift } from '../types';

function ChipEditor({ title, items, addLabel, usageOf, onAdd, onRename, onDelete }: {
  title?: string;
  items: string[];
  addLabel: string;
  usageOf: (v: string) => number;
  onAdd: (v: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (v: string) => void;
}) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [note, setNote] = useState('');

  const dup = (t: string) => items.some(i => i.toLowerCase() === t.toLowerCase());
  const add = () => {
    const t = text.trim(); if (!t) return;
    if (dup(t)) { setNote(`“${t}” is already in the list`); setText(''); return; }
    onAdd(t); setText(''); setNote('');
  };
  const commitEdit = () => {
    const from = editing; const t = editText.trim();
    setEditing(null);
    if (from && t && t !== from && !dup(t)) onRename(from, t);
  };
  const del = (it: string) => {
    const n = usageOf(it);
    if (n > 0 && !window.confirm(`“${it}” is used by ${plural(n, 'entry', 'entries')}. Remove it from the list? Those entries keep the label — you just can't log new ones with it. (Rename instead to fix them all.)`)) return;
    onDelete(it);
  };

  return (
    <div className="chip-editor">
      {title && <div className="field-label">{title}</div>}
      <div className="chip-row" style={{ marginTop: 8 }}>
        {items.map(it => editing === it ? (
          <span key={it} className="chip chip-add-form">
            <input autoFocus value={editText} maxLength={48}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
              onBlur={commitEdit} />
          </span>
        ) : (
          <span key={it} className="chip chip-editable">
            <button className="chip-label" onClick={() => { setEditing(it); setEditText(it); }} title={`Rename “${it}”`}>{it}</button>
            <button className="chip-x" onClick={() => del(it)} aria-label={`Remove ${it}`}>×</button>
          </span>
        ))}
        {items.length === 0 && <span className="sub">None yet.</span>}
      </div>
      {note && <p className="chip-note">{note}</p>}
      <div className="row-inline" style={{ marginTop: 10 }}>
        <input className="text-input" value={text} placeholder={addLabel} maxLength={48}
          onChange={e => { setText(e.target.value); setNote(''); }} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        <button className="btn" onClick={add} disabled={!text.trim()}>Add</button>
      </div>
      <p className="chip-hint">Tap a chip to rename it everywhere · × to remove</p>
    </div>
  );
}

export function WorkspaceSettings() {
  const { workspace, observations, reload, patchWorkspace } = useWorkspace();
  const [toast, setToast] = useState<string | null>(null);
  const subs = workspace.subcategories ?? {};

  const save = async (patch: Parameters<typeof patchWorkspace>[0], msg = 'Saved') => { await patchWorkspace(patch); setToast(msg); };

  // Union-merge a starter vocabulary in: adds what's missing, touches nothing
  // that exists (no renames, no deletes — the no-removal rule, applied to data).
  const mergeTaxonomy = async (t: LossTaxonomy) => {
    const categories = [...workspace.categories, ...t.categories.filter(c => !workspace.categories.includes(c))];
    const subcategories: Record<string, string[]> = { ...(workspace.subcategories ?? {}) };
    for (const [cat, list] of Object.entries(t.subcategories)) {
      const cur = subcategories[cat] ?? [];
      subcategories[cat] = [...cur, ...list.filter(s => !cur.includes(s))];
    }
    const assets = [...workspace.assets, ...t.assets.filter(a => !workspace.assets.includes(a))];
    await save({ categories, subcategories, assets }, `“${t.name}” merged in — nothing was removed`);
  };
  const rename = async (
    field: 'category' | 'subcategory' | 'asset' | 'shift', from: string, to: string,
    patch: Parameters<typeof patchWorkspace>[0], onlyCategory?: string,
  ) => {
    await patchWorkspace(patch);
    const n = await renameInObservations(workspace.id, field, from, to, onlyCategory);
    await reload();
    setToast(n > 0 ? `Renamed · ${plural(n, 'entry', 'entries')} updated` : 'Renamed');
  };

  const usageCat = (v: string) => observations.filter(o => o.category === v).length;
  const usageAsset = (v: string) => observations.filter(o => o.asset === v).length;
  const usageSub = (cat: string, v: string) => observations.filter(o => o.category === cat && o.subcategory === v).length;
  const usageShift = (v: string) => observations.filter(o => o.shift === v).length;

  // shifts — names stratify the analysis; times let Capture stamp the shift
  // automatically from the clock (windows may wrap midnight, e.g. 22:00–06:00)
  const shifts = workspace.shifts ?? [];
  const patchShift = (name: string, patch: Partial<Shift>) =>
    void save({ shifts: shifts.map(s => (s.name === name ? { ...s, ...patch } : s)) });
  const renameShift = (from: string, to: string) => {
    if (!to.trim() || from === to.trim() || shifts.some(s => s.name === to.trim())) return;
    void rename('shift', from, to.trim(), { shifts: shifts.map(s => (s.name === from ? { ...s, name: to.trim() } : s)) });
  };
  const removeShift = (name: string) => {
    const used = usageShift(name);
    if (used > 0 && !window.confirm(`“${name}” is on ${plural(used, 'observation')} — they keep the label, it just leaves the picker. Remove?`)) return;
    void save({ shifts: shifts.filter(s => s.name !== name) });
  };
  const [newShift, setNewShift] = useState('');
  const addShift = () => {
    const n = newShift.trim();
    if (!n || shifts.some(s => s.name === n)) return;
    void save({ shifts: [...shifts, { name: n, start: '', end: '' }] });
    setNewShift('');
  };

  // categories (renaming a category also moves its sub-category list)
  const renameCat = (from: string, to: string) => {
    const nextSubs = { ...subs };
    if (nextSubs[from]) { nextSubs[to] = nextSubs[from]; delete nextSubs[from]; }
    void rename('category', from, to, { categories: workspace.categories.map(c => (c === from ? to : c)), subcategories: nextSubs });
  };
  const delCat = (v: string) => { const nextSubs = { ...subs }; delete nextSubs[v]; void save({ categories: workspace.categories.filter(c => c !== v), subcategories: nextSubs }); };

  const renameAsset = (from: string, to: string) => void rename('asset', from, to, { assets: workspace.assets.map(a => (a === from ? to : a)) });

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="back-btn" onClick={() => goBack(`/w/${workspace.id}/analyse`)}>‹ Back</button>
        <span className="subhead-title">Settings</span>
      </div>

      <div className="card">
        <label className="field-label">Workspace name</label>
        <input className="text-input" defaultValue={workspace.name} maxLength={60}
          onBlur={e => { const v = e.target.value.trim(); if (v && v !== workspace.name) void save({ name: v }); }} />
      </div>

      {supabase && <PeoplePanel wsId={workspace.id} ownerId={workspace.ownerId} />}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Cost of downtime</div>
        <p className="sub" style={{ margin: '4px 0 10px' }}>Crew × wage × on-costs = £/hour of idle labour. Time lost then reads in £.</p>
        <div className="row-inline" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="mini-label">People on the line</label>
            <input className="text-input" type="number" inputMode="decimal" min={0} step="1"
              defaultValue={workspace.crew ?? ''} placeholder="e.g. 6"
              onBlur={e => {
                const raw = e.target.value.trim(); const v = parseFloat(raw);
                if (raw && !(Number.isFinite(v) && v > 0)) { setToast('Crew needs a number above 0'); return; }
                void save({ crew: raw && v > 0 ? v : undefined });
              }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mini-label">Wage £/hr</label>
            <input className="text-input" type="number" inputMode="decimal" min={0} step="0.01"
              defaultValue={workspace.labourRatePerHour ?? ''} placeholder="e.g. 18.50"
              onBlur={e => {
                const raw = e.target.value.trim(); const v = parseFloat(raw);
                if (raw && !(Number.isFinite(v) && v > 0)) { setToast('Rate needs a number above 0'); return; }
                void save({ labourRatePerHour: raw && v > 0 ? v : undefined });
              }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mini-label">On-costs ×</label>
            <input className="text-input" type="number" inputMode="decimal" min={1} step="0.05"
              defaultValue={workspace.labourBurden ?? ''} placeholder="e.g. 1.3"
              onBlur={e => {
                const raw = e.target.value.trim(); const v = parseFloat(raw);
                if (raw && !(Number.isFinite(v) && v >= 1)) { setToast('On-costs is a multiplier from 1 up — e.g. 1.3'); return; }
                void save({ labourBurden: raw && v >= 1 ? v : undefined });
              }} />
          </div>
        </div>
        <p className="sub" style={{ margin: '8px 0 0', fontSize: 12 }}>
          On-costs turns the wage into what a person costs the business — employer NI, pension, holiday
          cover. Typically ×1.25–1.4; ask finance for yours. Leave blank to count wages only.
        </p>
        {hasCost(workspace) && (
          <div className="cost-readout">
            = <b>{fmtGBP(costPerHour(workspace))}/hr</b> of idle labour while this line is down
            <span className="sub"> ({workspace.crew} × £{workspace.labourRatePerHour}{burdenOf(workspace) !== 1 ? ` × ${burdenOf(workspace)}` : ''})</span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <ChipEditor title="Categories (What)" items={workspace.categories} addLabel="Add a category…"
          usageOf={usageCat}
          onAdd={v => void save({ categories: [...workspace.categories, v] })}
          onRename={renameCat}
          onDelete={delCat} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Sub-categories</div>
        <p className="sub" style={{ margin: '4px 0 6px' }}>Each category has its own kinds — they drill to their own Pareto.</p>
        {workspace.categories.map(cat => (
          <div key={cat} className="sub-editor">
            <div className="sub-editor-cat">{cat}</div>
            <ChipEditor items={subs[cat] ?? []} addLabel={`Add a kind of ${cat}…`}
              usageOf={v => usageSub(cat, v)}
              onAdd={v => void save({ subcategories: { ...subs, [cat]: [...(subs[cat] ?? []), v] } })}
              onRename={(from, to) => void rename('subcategory', from, to, { subcategories: { ...subs, [cat]: (subs[cat] ?? []).map(s => (s === from ? to : s)) } }, cat)}
              onDelete={v => void save({ subcategories: { ...subs, [cat]: (subs[cat] ?? []).filter(s => s !== v) } })} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <ChipEditor title="Assets on the line" items={workspace.assets} addLabel="Add a machine or area…"
          usageOf={usageAsset}
          onAdd={v => void save({ assets: [...workspace.assets, v] })}
          onRename={renameAsset}
          onDelete={v => void save({ assets: workspace.assets.filter(a => a !== v) })} />
      </div>

      {/* shifts: the IPS team's question — "is it the same on shift C?" — needs
          the data stamped. Names stratify; times make the stamping automatic. */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Shifts</div>
        <p className="sub" style={{ margin: '4px 0 8px' }}>
          Name your shifts and every capture gets stamped with one — then Analyse can ask
          "is it the same on every shift?". Add times and the stamp is automatic from the clock
          (overnight windows like 22:00–06:00 are fine); without times the floor picks by tap.
        </p>
        {shifts.map(s => (
          <div key={s.name} className="shift-row">
            <input className="text-input shift-name" defaultValue={s.name} maxLength={24} aria-label="Shift name"
              onBlur={e => renameShift(s.name, e.target.value)} />
            <input className="text-input shift-time" type="time" value={s.start} aria-label="Starts"
              onChange={e => patchShift(s.name, { start: e.target.value })} />
            <span className="sub">→</span>
            <input className="text-input shift-time" type="time" value={s.end} aria-label="Ends"
              onChange={e => patchShift(s.name, { end: e.target.value })} />
            <span className="sub shift-use">{usageShift(s.name) > 0 ? plural(usageShift(s.name), 'entry', 'entries') : ''}</span>
            <button className="chip-x" onClick={() => removeShift(s.name)} aria-label={`Remove ${s.name}`}>×</button>
          </div>
        ))}
        <div className="row-inline" style={{ marginTop: shifts.length ? 10 : 4 }}>
          <input className="text-input" value={newShift} placeholder="e.g. Days / Backs / Nights…" maxLength={24}
            onChange={e => setNewShift(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addShift(); }} />
          <button className="btn" onClick={addShift} disabled={!newShift.trim()}>Add shift</button>
        </div>
      </div>

      {/* adopt a starter vocabulary later — ADDITIVE ONLY: merges what's missing,
          never renames or removes anything you already have */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Add a starter vocabulary</div>
        <p className="sub" style={{ margin: '4px 0 8px' }}>Merge a pre-built loss tree into this workspace. Only adds what's missing — your existing categories, kinds and assets are untouched.</p>
        {TAXONOMIES.filter(t => t.id !== 'lean').map(t => (
          <button key={t.id} className="tax-opt" style={{ width: '100%', marginBottom: 6 }} onClick={() => void mergeTaxonomy(t)}>
            <span className="tax-name">＋ {t.name}</span>
            <span className="tax-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
