import { useEffect, useRef, useState } from 'react';
import type { Observation } from '../types';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { getSnagAsset, getSegment, snagsForAsset, addSnag, updateSnag, updateSnagAsset, deleteSnag, putBlob } from '../db';
import { uid, now } from '../lib/ids';
import { plural } from '../lib/format';
import { Sheet } from '../ui/Sheet';
import { Chip } from '../ui/Chip';
import { useBlobUrl } from './useBlobUrl';
import { VideoPlayer } from '../ui/VideoPlayer';
import { useSyncedAt } from '../cloud/session';
import PinImage, { type Pin } from './PinImage';
import { SNAG_STATUS_META, ageDays, isStaleOpen, type SnagAsset, type Snag, type SnagStatus } from './types';

const obsLabel = (o: Observation) => `${o.category}${o.subcategory ? ' · ' + o.subcategory : ''}${o.note ? ' — ' + o.note : ''}`;

export function AssetScreen({ wsId, assetId }: { wsId: string; assetId: string }) {
  const { observations } = useWorkspace();
  const [asset, setAsset] = useState<SnagAsset | null>(null);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [draft, setDraft] = useState<{ xPct: number; yPct: number } | null>(null);
  const [editing, setEditing] = useState<Snag | null>(null);
  const [videoKey, setVideoKey] = useState<string | undefined>();
  const [watching, setWatching] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const still = useBlobUrl(asset?.stillKey);

  const load = async () => {
    const a = await getSnagAsset(assetId);
    if (!a) { nav(`/w/${wsId}/snags`); return; }
    setAsset(a); setSnags(await snagsForAsset(a.id));
    const seg = await getSegment(a.segmentId);
    setVideoKey(seg?.videoKey);
  };
  const syncedAt = useSyncedAt();
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [assetId, syncedAt]);

  const visible = snags.filter(s => showClosed || !(s.status === 'closed' && ageDays(s.closedAt ?? s.raisedAt) > 30));
  const hiddenClosed = snags.length - visible.length;
  const openCount = snags.filter(s => s.status !== 'closed').length;

  // Stable reference number per snag (raised order), shown on the pin AND in the
  // list AND in the printed report, so "snag 3" means the same everywhere.
  const numById = new Map(snags.map((s, i) => [s.id, i + 1] as const));
  const pins: Pin[] = visible.map(s => ({ id: s.id, xPct: s.xPct, yPct: s.yPct, color: SNAG_STATUS_META[s.status].color, label: s.problem, n: numById.get(s.id), active: editing?.id === s.id }));
  if (draft) pins.push({ id: '__draft', xPct: draft.xPct, yPct: draft.yPct, color: 'var(--brand)', n: snags.length + 1, active: true });

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav(asset ? `/w/${wsId}/segment/${asset.segmentId}` : `/w/${wsId}/snags`)}>‹ Segment</button>
        <div style={{ flex: 1 }} />
        {asset && <button className="btn" onClick={() => setRenaming(true)}>✎ Rename</button>}
        {hiddenClosed > 0 && <button className="btn" onClick={() => setShowClosed(v => !v)}>{showClosed ? 'Hide closed' : `Show closed (${hiddenClosed})`}</button>}
      </div>
      <button className="asset-title" onClick={() => asset && setRenaming(true)}>
        <span className="mark" style={{ fontSize: 22 }}>{asset?.name ?? '…'}{asset?.code ? <span className="sub" style={{ fontSize: 15, fontWeight: 400 }}> · {asset.code}</span> : null}</span>
      </button>
      <p className="sub" style={{ marginTop: 4 }}>{plural(openCount, 'open snag')}. Pinch or use ＋ / − to zoom in, then tap the picture to drop a red dot where the problem is.</p>

      <div style={{ marginTop: 12 }}>
        <PinImage src={still} pins={pins} alt={asset?.name}
          onPlace={(x, y) => { setEditing(null); setDraft({ xPct: x, yPct: y }); }}
          onPinTap={id => { const s = snags.find(x => x.id === id); if (s) { setDraft(null); setEditing(s); } }} />
      </div>

      {/* Offered whenever a source clip exists — the player itself explains if
          it hasn't synced to this device yet, rather than the button vanishing. */}
      {videoKey && (
        <button className="btn watch-video-btn" onClick={() => setWatching(true)}>
          ▶ Watch the video — see it live
        </button>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label" style={{ marginBottom: 8 }}>Snags on this asset</div>
        {visible.length === 0 ? <p className="sub">None yet — tap the image above where you see a problem.</p>
          : visible.map(s => (
            <button key={s.id} className="snag-line-row" onClick={() => { setDraft(null); setEditing(s); }}>
              <span className="snag-dot-sm" style={{ background: SNAG_STATUS_META[s.status].color }}>{numById.get(s.id)}</span>
              <span className="snag-line-main">
                <span className="snag-line-problem">{s.problem}</span>
                <span className="snag-line-meta">{SNAG_STATUS_META[s.status].label}{s.owner ? ` · ${s.owner}` : ''} · {ageDays(s.raisedAt)}d{isStaleOpen(s) ? ' · ⚠ stale' : ''}</span>
              </span>
            </button>
          ))}
      </div>

      {(draft || editing) && asset && (
        <SnagEditor wsId={wsId} asset={asset} draft={draft} snag={editing} observations={observations}
          onClose={() => { setDraft(null); setEditing(null); }}
          onSaved={async () => { setDraft(null); setEditing(null); await load(); }} />
      )}

      {asset && <RenameSheet asset={asset} open={renaming} onClose={() => setRenaming(false)} onSaved={async () => { setRenaming(false); await load(); }} />}

      <Sheet open={watching} onClose={() => setWatching(false)} title={asset ? `${asset.name} — live` : 'Video'}>
        <VideoPlayer blobKey={videoKey} className="asset-video" autoPlay
          onLoadedMetadata={e => { const v = e.target as HTMLVideoElement; if (asset) { try { v.currentTime = asset.timestampS; } catch { /* seek before ready */ } } }} />
        <p className="sub" style={{ marginTop: 8 }}>
          The still with the dots was frozen from this clip{asset ? ` at ${asset.timestampS.toFixed(1)}s` : ''}. Play it to show what's happening in real life.
        </p>
      </Sheet>
    </div>
  );
}

function SnagEditor({ wsId, asset, draft, snag, observations, onClose, onSaved }: {
  wsId: string; asset: SnagAsset; draft: { xPct: number; yPct: number } | null; snag: Snag | null;
  observations: Observation[]; onClose: () => void; onSaved: () => void;
}) {
  const [problem, setProblem] = useState(snag?.problem ?? '');
  const [solution, setSolution] = useState(snag?.proposedSolution ?? '');
  const [status, setStatus] = useState<SnagStatus>(snag?.status ?? 'open');
  const [owner, setOwner] = useState(snag?.owner ?? '');
  const [closeNote, setCloseNote] = useState(snag?.closeNote ?? '');
  const [links, setLinks] = useState<string[]>(snag?.linkedObsIds ?? []);
  const [photoKey, setPhotoKey] = useState<string | undefined>(snag?.detailPhotoKey);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const photoUrl = useBlobUrl(photoKey);

  const obsById = new Map(observations.map(o => [o.id, o]));
  const candidates = q.trim()
    ? observations.filter(o => !links.includes(o.id) && (obsLabel(o) + ' ' + o.asset).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  const save = async () => {
    if (!problem.trim()) return;
    setBusy(true);
    try {
      if (snag) {
        await updateSnag({ ...snag, problem: problem.trim(), proposedSolution: solution.trim() || undefined, status, owner: owner.trim() || undefined, closeNote: closeNote.trim() || undefined, detailPhotoKey: photoKey, linkedObsIds: links.length ? links : undefined, closedAt: status === 'closed' ? (snag.closedAt ?? now()) : undefined });
      } else if (draft) {
        await addSnag({ id: uid(), workspaceId: wsId, assetId: asset.id, xPct: draft.xPct, yPct: draft.yPct, problem: problem.trim(), proposedSolution: solution.trim() || undefined, owner: owner.trim() || undefined, status: 'open', raisedAt: now(), updatedAt: now() });
      }
      onSaved();
    } finally { setBusy(false); }
  };
  const remove = async () => { if (snag && window.confirm('Delete this snag?')) { await deleteSnag(snag.id); onSaved(); } };
  const addPhoto = async (file: File) => { const key = `blob-${uid()}`; await putBlob(key, file); setPhotoKey(key); };

  return (
    <Sheet open onClose={onClose} title={snag ? 'Snag' : 'New snag'}>
      <div className="field-label">Problem</div>
      <textarea className="text-area" autoFocus rows={2} value={problem} placeholder="What's wrong here?" onChange={e => setProblem(e.target.value)} />
      <div className="field-label" style={{ marginTop: 10 }}>Proposed solution <span className="opt">optional</span></div>
      <textarea className="text-area" rows={2} value={solution} placeholder="What would fix it?" onChange={e => setSolution(e.target.value)} />

      <div className="field-label" style={{ marginTop: 10 }}>Owner <span className="opt">who's on it — optional</span></div>
      <input className="text-input" value={owner} placeholder="Name" onChange={e => setOwner(e.target.value)} />

      {snag && (
        <p className="sub" style={{ marginTop: 10 }}>
          Raised {new Date(snag.raisedAt).toLocaleDateString()}
          {snag.closedAt ? ` · closed ${new Date(snag.closedAt).toLocaleDateString()}` : ''}
        </p>
      )}

      {snag && (
        <>
          <div className="field-label" style={{ marginTop: 12 }}>Status</div>
          <div className="chip-row">
            {(['open', 'in_progress', 'closed'] as SnagStatus[]).map(s => <Chip key={s} label={SNAG_STATUS_META[s].label} on={status === s} onClick={() => setStatus(s)} />)}
          </div>
          {status === 'closed' && (<>
            <div className="field-label" style={{ marginTop: 10 }}>Close note</div>
            <textarea className="text-area" rows={2} value={closeNote} placeholder="What was done" onChange={e => setCloseNote(e.target.value)} />
          </>)}

          <div className="field-label" style={{ marginTop: 12 }}>Detail photo <span className="opt">optional</span></div>
          {/* No `capture`, so the OS chooser offers BOTH the camera and existing
              photos — a close-up often already exists on the phone or a laptop. */}
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); }} />
          {photoUrl ? <button className="mark-still-btn" onClick={() => photoRef.current?.click()}><img className="mark-still" src={photoUrl} alt="detail" /></button>
            : <button className="btn" onClick={() => photoRef.current?.click()}>📷 Add close-up of the fault</button>}

          <div className="field-label" style={{ marginTop: 12 }}>Related losses <span className="opt">optional</span></div>
          {links.map(id => { const o = obsById.get(id); return (
            <div key={id} className="loss-link"><span className="loss-link-label">{o ? obsLabel(o) : 'logged loss'}{o ? <span className="loss-link-ctx"> · {o.asset}</span> : ''}</span><button className="loss-link-x" onClick={() => setLinks(ls => ls.filter(x => x !== id))} aria-label="Unlink">×</button></div>
          ); })}
          <input className="text-input" value={q} placeholder="Search this workspace's logged losses…" onChange={e => setQ(e.target.value)} />
          {candidates.length > 0 && (
            <div className="loss-cands">
              {candidates.map(o => (
                <button key={o.id} className="loss-cand" onClick={() => { setLinks(ls => [...ls, o.id]); setQ(''); }}>
                  <span className="loss-cand-label">{obsLabel(o)}</span><span className="loss-cand-ctx">{o.asset}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={save} disabled={busy || !problem.trim()}>{busy ? 'Saving…' : snag ? 'Save' : 'Add snag'}</button>
        {snag && <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={remove}>Delete</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

/** Rename an asset (name + code). The change stamps updatedAt, so it syncs and
 *  every screen that reads the asset shows the new name on its next load. */
function RenameSheet({ asset, open, onClose, onSaved }: { asset: SnagAsset; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(asset.name);
  const [code, setCode] = useState(asset.code ?? '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(asset.name); setCode(asset.code ?? ''); }, [asset.id, asset.name, asset.code, open]);

  const save = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try { await updateSnagAsset({ ...asset, name: name.trim(), code: code.trim() || undefined }); onSaved(); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Rename asset">
      <div className="field-label">Asset name</div>
      <input className="text-input" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save(); }} />
      <div className="field-label" style={{ marginTop: 10 }}>Asset code <span className="opt">optional</span></div>
      <input className="text-input" value={code} placeholder="e.g. MHW-04" onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save(); }} />
      <div className="row-end" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Sheet>
  );
}
