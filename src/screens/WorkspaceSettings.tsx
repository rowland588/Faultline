/* Workspace settings — name, cost model, and the vocabularies. Categories and
 * assets are flat lists; sub-categories are managed PER category. Every value can
 * be renamed (which fixes it across all history) or removed (with a heads-up if
 * it's in use). Each change confirms with a quiet toast. */
import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { goBack } from '../state/useRoute';
import { renameInObservations } from '../db';
import { Toast } from '../ui/Toast';
import { hasCost, fmtGBP } from '../lib/cost';
import { plural } from '../lib/format';
import { supabase } from '../cloud/client';
import { useTeam, displayName } from '../cloud/team';
import { useMembers } from '../cloud/members';
import { useProfile } from '../cloud/admin';

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

/* Who's in this room. Each workspace is independent — its creator owns it and
 * chooses the stakeholders. Members see everything in the workspace, including
 * all history from before they joined; the owner (or the app admin) manages
 * the list. People management is live-online: it talks straight to the cloud. */
function PeoplePanel({ wsId, ownerId }: { wsId: string; ownerId?: string }) {
  const { whoIs, myId, members: team } = useTeam();
  const { profile } = useProfile();
  const { members, loaded, myEmail, add, remove } = useMembers(wsId);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');

  // No ownerId means this device created the workspace before it ever synced.
  const canManage = !ownerId || ownerId === myId || !!profile?.is_super;
  const ownerEmail = (ownerId ? whoIs(ownerId)?.email : myEmail) ?? '';
  const iAmOwner = !ownerId || ownerId === myId;

  const doAdd = async () => {
    const t = text.trim().toLowerCase();
    if (!t) return;
    if (t === ownerEmail || members.some(m => m.email === t)) { setNote(`${t} is already in this workspace`); setText(''); return; }
    try {
      await add(t);
      const registered = team.some(m => m.email.toLowerCase() === t);
      setNote(registered ? '' : `${t} isn’t in the app yet — the administrator needs to invite them before they can sign in. Once they do, this workspace will be waiting for them.`);
      setText('');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Couldn’t add them — are you online?');
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="field-label">People in this workspace</div>
      <p className="sub" style={{ margin: '4px 0 6px' }}>
        {iAmOwner
          ? 'Your workspace, your team — everyone here sees and works on the same data, including all history.'
          : `${displayName(ownerEmail) || 'The owner'} runs this workspace and chooses who’s in it.`}
      </p>
      <div className="chip-row" style={{ marginTop: 8 }}>
        <span className="chip" title={ownerEmail}>{iAmOwner ? 'You' : displayName(ownerEmail)} · owner</span>
        {members.filter(m => m.email !== ownerEmail).map(m => (
          <span key={m.email} className={canManage ? 'chip chip-editable' : 'chip'} title={m.email}>
            {canManage
              ? <>
                  <span className="chip-label">{m.email === myEmail ? 'You' : displayName(m.email)}</span>
                  <button className="chip-x" onClick={() => { void remove(m.email).catch(() => setNote('Couldn’t remove them — are you online?')); }}
                    aria-label={`Remove ${m.email}`}>×</button>
                </>
              : (m.email === myEmail ? 'You' : displayName(m.email))}
          </span>
        ))}
        {loaded && members.filter(m => m.email !== ownerEmail).length === 0 && (
          <span className="sub">{canManage ? 'Nobody else yet.' : ''}</span>
        )}
      </div>
      {note && <p className="chip-note">{note}</p>}
      {canManage && (
        <>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <input className="text-input" type="email" value={text} placeholder="Add a person by email…" maxLength={120}
              onChange={e => { setText(e.target.value); setNote(''); }}
              onKeyDown={e => { if (e.key === 'Enter') void doAdd(); }} />
            <button className="btn" onClick={() => void doAdd()} disabled={!text.trim()}>Add</button>
          </div>
          <p className="chip-hint">They’ll see this workspace — and its full history — the next time the app syncs</p>
        </>
      )}
    </div>
  );
}

export function WorkspaceSettings() {
  const { workspace, observations, reload, patchWorkspace } = useWorkspace();
  const [toast, setToast] = useState<string | null>(null);
  const subs = workspace.subcategories ?? {};

  const save = async (patch: Parameters<typeof patchWorkspace>[0], msg = 'Saved') => { await patchWorkspace(patch); setToast(msg); };
  const rename = async (
    field: 'category' | 'subcategory' | 'asset', from: string, to: string,
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
        <p className="sub" style={{ margin: '4px 0 10px' }}>Crew on the line × labour rate = £/hour of idle labour. Time lost then reads in £.</p>
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
            <label className="mini-label">Labour rate £/hr</label>
            <input className="text-input" type="number" inputMode="decimal" min={0} step="0.01"
              defaultValue={workspace.labourRatePerHour ?? ''} placeholder="e.g. 18.50"
              onBlur={e => {
                const raw = e.target.value.trim(); const v = parseFloat(raw);
                if (raw && !(Number.isFinite(v) && v > 0)) { setToast('Rate needs a number above 0'); return; }
                void save({ labourRatePerHour: raw && v > 0 ? v : undefined });
              }} />
          </div>
        </div>
        {hasCost(workspace) && (
          <div className="cost-readout">= <b>{fmtGBP(workspace.crew! * workspace.labourRatePerHour!)}/hr</b> of idle labour while this line is down</div>
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
