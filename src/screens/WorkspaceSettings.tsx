/* Workspace settings — name, cost model, and the vocabularies. Categories and
 * assets are flat lists; sub-categories are managed PER category. Every value can
 * be renamed (which fixes it across all history) or removed (with a heads-up if
 * it's in use). Each change confirms with a quiet toast. */
import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { goBack, nav } from '../state/useRoute';
import { renameInObservations, renameLineMachine } from '../db';
import { Toast } from '../ui/Toast';
import { hasLabour, labourPerHour, ratedPerMin, burdenOf, fmtGBP } from '../lib/cost';
import { useLineNeck } from '../lib/useLineNeck';
import { plural } from '../lib/format';
import { supabase } from '../cloud/client';
import { PeoplePanel } from './PeopleScreen';
import { TAXONOMIES, type LossTaxonomy } from '../lib/taxonomy';
import type { Shift } from '../types';
import { shiftWindow } from '../lib/shifts';
import { todayISO } from '../lib/weeks';
import { plannedOf } from '../tools/losses/losses';
import { Icon } from '../ui/Icon';

function ChipEditor({ title, items, addLabel, usageOf, onAdd, onRename, onDelete, onMove }: {
  title?: string;
  items: string[];
  addLabel: string;
  usageOf: (v: string) => number;
  onAdd: (v: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (v: string) => void;
  /** when the ORDER of this list means something (the line), arrows appear */
  onMove?: (index: number, dir: -1 | 1) => void;
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
        {items.map((it, i) => editing === it ? (
          <span key={it} className="chip chip-add-form">
            <input autoFocus value={editText} maxLength={48}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
              onBlur={commitEdit} />
          </span>
        ) : (
          <span key={it} className="chip chip-editable">
            {onMove && <button className="chip-move" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Move ${it} earlier on the line`}>‹</button>}
            <button className="chip-label" onClick={() => { setEditing(it); setEditText(it); }} title={`Rename “${it}”`}>{it}</button>
            {onMove && <button className="chip-move" disabled={i === items.length - 1} onClick={() => onMove(i, 1)} aria-label={`Move ${it} later on the line`}>›</button>}
            <button className="chip-x" onClick={() => del(it)} aria-label={`Remove ${it}`}><Icon name="close" size="0.85em" /></button>
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

export function WorkspaceSettings({ bare = false }: { bare?: boolean }) {
  const { workspace, observations, reload, patchWorkspace } = useWorkspace();
  /* the line's bottleneck, from its Line capacity — where a stop costs packs (lib/lineLoss) */
  const neck = useLineNeck(workspace.id);
  const [toast, setToast] = useState<string | null>(null);
  // refinements stay visible for anyone already using them; hidden until asked otherwise
  const [showBurden, setShowBurden] = useState(!!workspace.labourBurden);
  const [showOutput, setShowOutput] = useState(!!(workspace.packsPerMin || workspace.marginPerPack || workspace.materialsPerPack));
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
  /* "480 min − 30 min of breaks = 450 planned" — what a loss count starts from */
  const shiftPlanned = (x: Shift): string => {
    const w = shiftWindow(x, todayISO());
    return w ? plannedOf({ ...w, shift: x.name, ...(x.breakMin !== undefined ? { breakMin: x.breakMin } : {}), ...(x.relief ? { relief: true } : {}) }).words : 'add its times to work out its planned minutes';
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

  /* A machine renamed: its stops and its record on the line (who made it,
     its programs) follow the name (db/lineRecords renameLineMachine). */
  const renameAsset = async (from: string, to: string) => {
    await patchWorkspace({ assets: workspace.assets.map(a => (a === from ? to : a)) });
    const n = await renameLineMachine(workspace.id, from, to);
    await reload();
    setToast(n > 0 ? `Renamed · ${plural(n, 'entry', 'entries')} updated` : 'Renamed');
  };

  /* Deleting a line's study is the most destructive tap in the app — it gets
     a confirm AND an undo window. Nothing is actually deleted here: Home holds
     the study in limbo for a few seconds and only then commits. */
  const removeAll = () => {
    if (!window.confirm(`Delete "${workspace.name}" and everything captured on it?`)) return;
    sessionStorage.setItem('faultline-pending-delete', JSON.stringify({ id: workspace.id, name: workspace.name, until: Date.now() + 8000 }));
    nav('/room');
  };

  return (
    <div className={bare ? 'ws-setup' : 'wrap'}>
      {!bare && (
        <div className="subhead">
          <button className="back-btn" onClick={() => goBack(`/w/${workspace.id}/analyse`)}>‹ Back</button>
          <span className="subhead-title">Set up</span>
        </div>
      )}

      <div className="card">
        <label className="field-label">Name</label>
        <input className="text-input" defaultValue={workspace.name} maxLength={60}
          onBlur={e => { const v = e.target.value.trim(); if (v && v !== workspace.name) void save({ name: v }); }} />
      </div>

      {supabase && <PeoplePanel wsId={workspace.id} ownerId={workspace.ownerId} />}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Cost of downtime</div>
        {/* the whole visible story is the simple ratio: people × £/hr × time.
            On-costs is a finance refinement, so it lives behind a disclosure —
            it confused the owner, so it will confuse every plant manager. */}
        <p className="sub" style={{ margin: '4px 0 10px' }}>
          People on the line × £ per hour each. A stoppage then costs its share of that:
          10 minutes of 6 people's pay is exactly that — a straight ratio.
        </p>
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
            <label className="mini-label">£/hr per person</label>
            <input className="text-input" type="number" inputMode="decimal" min={0} step="0.01"
              defaultValue={workspace.labourRatePerHour ?? ''} placeholder="e.g. 18.50"
              onBlur={e => {
                const raw = e.target.value.trim(); const v = parseFloat(raw);
                if (raw && !(Number.isFinite(v) && v > 0)) { setToast('Rate needs a number above 0'); return; }
                void save({ labourRatePerHour: raw && v > 0 ? v : undefined });
              }} />
          </div>
        </div>
        {!showBurden ? (
          <button className="linkish" style={{ marginTop: 8, fontSize: 'var(--t-detail)' }} onClick={() => setShowBurden(true)}>
            Finance gave you a fully-loaded rate or on-cost %? Refine it (optional) ›
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <label className="mini-label">On-costs multiplier <span className="opt">optional — blank counts wages only</span></label>
            <div className="row-inline" style={{ alignItems: 'center' }}>
              <input className="text-input" style={{ maxWidth: 120 }} type="number" inputMode="decimal" min={1} step="0.05"
                defaultValue={workspace.labourBurden ?? ''} placeholder="e.g. 1.3"
                onBlur={e => {
                  const raw = e.target.value.trim(); const v = parseFloat(raw);
                  if (raw && !(Number.isFinite(v) && v >= 1)) { setToast('On-costs is a multiplier from 1 up — e.g. 1.3'); return; }
                  void save({ labourBurden: raw && v >= 1 ? v : undefined });
                }} />
              <p className="sub" style={{ fontSize: 'var(--t-label)', flex: 1 }}>
                The wage isn't the full cost of employing someone — employer NI, pension and holiday cover sit on top
                (typically ×1.25–1.4 in the UK; finance will know yours). This only refines the £; the ratio logic never changes.
              </p>
            </div>
          </div>
        )}

        {/* THE CAPACITY LOST — the packs a stop costs when it stops the line,
            counted in packs beside the labour, never added into its £
            (lib/lineLoss; docs/CAPACITY.md §6; Rowland, 14 October:
            "capacity loss units and labour"). Opt-in: labour stays the default. */}
        {!showOutput ? (
          <button className="linkish" style={{ marginTop: 6, fontSize: 'var(--t-detail)', display: 'block' }} onClick={() => setShowOutput(true)}>
            Know your line speed? Count the packs a stop costs (optional) ›
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <label className="mini-label">Capacity lost <span className="opt">optional — the packs a stop costs when it stops the line</span></label>
            <div className="row-inline" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="mini-label">Packs / min <span className="opt">rated speed</span></label>
                <input className="text-input" type="number" inputMode="decimal" min={0} step="1"
                  defaultValue={workspace.packsPerMin ?? ''} placeholder="e.g. 120"
                  onBlur={e => {
                    const raw = e.target.value.trim(); const v = parseFloat(raw);
                    if (raw && !(Number.isFinite(v) && v > 0)) { setToast('Speed needs a number above 0'); return; }
                    void save({ packsPerMin: raw && v > 0 ? v : undefined });
                  }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="mini-label">£ margin / pack <span className="opt">for a shift’s loss count and SMED</span></label>
                <input className="text-input" type="number" inputMode="decimal" min={0} step="0.001"
                  defaultValue={workspace.marginPerPack ?? ''} placeholder="e.g. 0.03"
                  onBlur={e => {
                    const raw = e.target.value.trim(); const v = parseFloat(raw);
                    if (raw && !(Number.isFinite(v) && v > 0)) { setToast('Margin needs a number above 0 (in £ — 3p is 0.03)'); return; }
                    void save({ marginPerPack: raw && v > 0 ? v : undefined });
                  }} />
              </div>
              <div className="ws-cost-box">
                <label className="mini-label">£ materials / pack <span className="opt">what a reject throws away</span></label>
                <input className="text-input" type="number" inputMode="decimal" min={0} step="0.001" aria-label="A pack’s materials, £"
                  defaultValue={workspace.materialsPerPack ?? ''} placeholder="e.g. 0.12"
                  onBlur={e => {
                    const raw = e.target.value.trim(); const v = parseFloat(raw);
                    if (raw && !(Number.isFinite(v) && v >= 0)) { setToast('Materials need a number, 0 or above (in £ — 12p is 0.12)'); return; }
                    void save({ materialsPerPack: raw && v >= 0 ? v : undefined });
                  }} />
              </div>
            </div>
            <p className="sub" style={{ margin: '6px 0 0', fontSize: 'var(--t-label)' }}>
              The rated speed counts the packs never made while a stop stopped the line — on its bottleneck
              (from its Line capacity{neck ? `: ${neck.names.join(', ')}` : ', not counted yet — until it is, every stop is counted'}) or the whole line. A stop on
              another machine costs its labour only: the line runs round it. The packs are said beside the
              labour, never added into its £. The margin a pack prices the packs in a shift’s loss count and in SMED. A pack’s
              materials price what a problem on the register throws away as rejects, and the product it holds (money tied up).
            </p>
          </div>
        )}
        {/* what a stop costs, in its two parts — never one £ */}
        {hasLabour(workspace) && (
          <div className="cost-readout">
            = <b>{fmtGBP(labourPerHour(workspace))}/hr labour</b> while this line is down
            <span className="sub">{' '}({workspace.crew} × £{workspace.labourRatePerHour}{burdenOf(workspace) !== 1 ? ` × ${burdenOf(workspace)}` : ''})</span>
          </div>
        )}
        {ratedPerMin(workspace) !== undefined && (
          <div className="cost-readout">
            {hasLabour(workspace) ? '+ ' : '= '}<b>{(ratedPerMin(workspace) ?? 0).toLocaleString('en-GB')} packs a minute</b> not made while a stop stops the line
            <span className="sub">{' '}— {neck ? `on its bottleneck (${neck.names.join(', ')}) or the whole line` : 'every stop, until its Line capacity says its bottleneck'}</span>
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
        <ChipEditor title="Machines on the line" items={workspace.assets} addLabel="Add a machine or area…"
          usageOf={usageAsset}
          onAdd={v => void save({ assets: [...workspace.assets, v] })}
          onRename={renameAsset}
          onDelete={v => void save({ assets: workspace.assets.filter(a => a !== v) })}
          onMove={(i, dir) => {
            const next = [...workspace.assets];
            const [m] = next.splice(i, 1); next.splice(i + dir, 0, m);
            void save({ assets: next }, 'Line order saved');
          }} />
        {/* the order IS the line: Capture's chips, the board's asset cards and
            the Line view all walk the machines in this order */}
        <p className="sub" style={{ marginTop: 6 }}>‹ › put the machines in the order they stand on the floor — the app walks the line in this order.</p>
      </div>

      {/* shifts: the IPS team's question — "is it the same on shift C?" — needs
          the data stamped. Names stratify; times make the stamping automatic. */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label">Shifts</div>
        <p className="sub" style={{ margin: '4px 0 8px' }}>
          Name your shifts and every capture gets stamped with one — then Analyse can ask
          "is it the same on every shift?". Add times and the stamp is automatic from the clock
          (overnight windows like 22:00–06:00 are fine); without times the floor picks by tap.
          Add the breaks the line stops for, and a loss count works out its planned minutes
          from them — the shift less its breaks, none when relief keeps the line running.
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
            <button className="chip-x" onClick={() => removeShift(s.name)} aria-label={`Remove ${s.name}`}><Icon name="close" size="0.85em" /></button>
            {/* THE SHIFT'S PLANNED BREAKS (docs/CAPACITY.md §5): what a loss
                count takes off the shift for its planned minutes — none when
                relief keeps the line running. Saved when the box is left. */}
            <span className="shift-brk">
              <label className="shift-brk-l">Breaks
                <input key={`${s.name}:${s.breakMin ?? ''}`} className="text-input shift-min" inputMode="numeric" defaultValue={s.breakMin ?? ''} placeholder="0" aria-label={`${s.name} breaks, minutes`}
                  onBlur={e => { const v = e.target.value.trim(); const n = v === '' ? undefined : Number(v);
                    if (n !== undefined && (!Number.isFinite(n) || n < 0)) return;
                    if (n !== s.breakMin) patchShift(s.name, { breakMin: n }); }} /> min</label>
              <label className="shift-brk-l"><input type="checkbox" checked={!!s.relief} aria-label={`${s.name}: relief covers the breaks`}
                onChange={e => patchShift(s.name, { relief: e.target.checked || undefined })} /> relief keeps the line running</label>
              <span className="sub shift-plan">{shiftPlanned(s)}</span>
            </span>
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
        <p className="sub" style={{ margin: '4px 0 8px' }}>Merge a pre-built loss tree into this line. Only adds what's missing — your existing categories, kinds and machines are untouched.</p>
        {TAXONOMIES.filter(t => t.id !== 'lean').map(t => (
          <button key={t.id} className="tax-opt" style={{ width: '100%', marginBottom: 6 }} onClick={() => void mergeTaxonomy(t)}>
            <span className="tax-name"><Icon name="plus" size="1.15em" /> {t.name}</span>
            <span className="tax-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <button type="button" className="btn ws-setup-del" onClick={removeAll}>Delete everything captured on this line</button>
        <p className="sub" style={{ margin: '6px 0 0' }}>The stops, the walks and the evidence. It asks first, and Home gives you a few seconds to undo.</p>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
