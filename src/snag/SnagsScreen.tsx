import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForWorkspace, deleteSegment, reorderSegments, updateSegment } from '../db';
import { plural } from '../lib/format';
import { EmptyState } from '../ui/EmptyState';
import { Sheet } from '../ui/Sheet';
import { useBlobUrl } from './useBlobUrl';
import { createSegmentFromVideo } from './addSegment';
import type { Segment } from './types';

const fmtDur = (s?: number) => (!s || s <= 0 ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function SegRow({ seg, assetCount, first, last, onOpen, onUp, onDown, onRename, onDelete }: {
  seg: Segment; assetCount: number; first: boolean; last: boolean;
  onOpen: () => void; onUp: () => void; onDown: () => void; onRename: () => void; onDelete: () => void;
}) {
  const poster = useBlobUrl(seg.posterKey);
  return (
    <div className="seg-row">
      <div className="seg-order">
        <button className="seg-arrow" disabled={first} onClick={onUp} aria-label="Move earlier">▲</button>
        <span className="seg-seq">{seg.sequence}</span>
        <button className="seg-arrow" disabled={last} onClick={onDown} aria-label="Move later">▼</button>
      </div>
      <button className="seg-poster" onClick={onOpen}>{poster ? <img src={poster} alt="" /> : <span>▶</span>}</button>
      <button className="seg-main" onClick={onOpen}>
        <span className="seg-name">{seg.name || `Segment ${seg.sequence}`}</span>
        <span className="seg-meta">{fmtDur(seg.durationS)} · {plural(assetCount, 'asset')}</span>
      </button>
      <button className="seg-edit" onClick={onRename} aria-label="Rename segment">✎</button>
      <button className="seg-del" onClick={onDelete} aria-label="Delete segment">×</button>
    </div>
  );
}

/** One-field name form for a video/section, reset each time the sheet opens. */
function SegNameForm({ initial, placeholder, onSave, onClose }: { initial: string; placeholder: string; onSave: (n: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave(name); } finally { setBusy(false); } };
  return (
    <>
      <p className="sub" style={{ marginBottom: 10 }}>Name this section so you can tell your videos apart — e.g. “Infeed”, “Filler → capper”, “Outfeed”.</p>
      <div className="field-label">Video name</div>
      <input className="text-input" autoFocus value={name} placeholder={placeholder} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save(); }} />
      <div className="row-end" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  );
}

export function SnagsScreen() {
  const { workspace } = useWorkspace();
  const [segs, setSegs] = useState<Segment[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [openSnags, setOpenSnags] = useState(0);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState<Segment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [ss, assets, snags] = await Promise.all([listSegments(workspace.id), listSnagAssets(workspace.id), snagsForWorkspace(workspace.id)]);
    const c = new Map<string, number>();
    for (const a of assets) c.set(a.segmentId, (c.get(a.segmentId) ?? 0) + 1);
    setSegs(ss); setCounts(c); setOpenSnags(snags.filter(s => s.status !== 'closed').length);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [workspace.id]);

  const onFile = async (file: File) => {
    setErr(''); setBusy('Saving the video…');
    try {
      const id = await createSegmentFromVideo(workspace.id, file);
      await load();
      nav(`/w/${workspace.id}/segment/${id}`); // jump straight into the new video to mark assets
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add the video.'); }
    finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= segs.length) return;
    const order = segs.map(s => s.id); const [m] = order.splice(from, 1); order.splice(to, 0, m);
    setSegs(order.map((id, i) => ({ ...segs.find(s => s.id === id)!, sequence: i + 1 })));
    await reorderSegments(order);
  };

  const remove = async (seg: Segment) => {
    const n = counts.get(seg.id) ?? 0;
    if (!window.confirm(`Delete "${seg.name || `Segment ${seg.sequence}`}"? This also removes ${plural(n, 'asset')} and all their snags. This can't be undone.`)) return;
    await deleteSegment(seg.id); await load();
  };

  const totalAssets = [...counts.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="wrap">
      <div className="subhead">
        <div style={{ flex: 1 }} />
        {segs.length > 0 && <button className="btn" onClick={() => nav(`/w/${workspace.id}/walk`)}>▶ Walkthrough</button>}
        {totalAssets > 0 && <button className="btn" onClick={() => nav(`/w/${workspace.id}/snaglist`)}>Snag list</button>}
      </div>

      <div className="mark" style={{ fontSize: 22 }}>Snag walk</div>
      <p className="sub" style={{ marginTop: 4 }}>{workspace.name} · {plural(segs.length, 'segment')} · {plural(totalAssets, 'asset')} · {openSnags} open</p>

      {err && <div className="card" style={{ color: 'var(--danger)', marginTop: 12 }}>{err}</div>}

      <input ref={fileRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />

      {busy ? (
        <div className="card" style={{ marginTop: 14 }}><b>{busy}</b><p className="sub" style={{ marginTop: 6 }}>Large files take a moment — keep this screen open.</p></div>
      ) : (
        <div style={{ margin: '14px 0' }}><button className="btn btn-primary btn-lg" onClick={() => fileRef.current?.click()}>＋ Add a video (film or choose)</button></div>
      )}

      {segs.length === 0 && !busy ? (
        <EmptyState icon="🎥" title="No footage yet">Film the line infeed-to-outfeed — several clips for a long line — and add them in walk order. Then scrub each to mark its assets.</EmptyState>
      ) : (
        <div className="card">
          <div className="field-label" style={{ marginBottom: 8 }}>Segments · walk order</div>
          {segs.map((seg, i) => (
            <SegRow key={seg.id} seg={seg} assetCount={counts.get(seg.id) ?? 0} first={i === 0} last={i === segs.length - 1}
              onOpen={() => nav(`/w/${workspace.id}/segment/${seg.id}`)}
              onUp={() => move(i, i - 1)} onDown={() => move(i, i + 1)}
              onRename={() => setRenaming(seg)} onDelete={() => remove(seg)} />
          ))}
        </div>
      )}

      <Sheet open={!!renaming} onClose={() => setRenaming(null)} title="Name this video">
        {renaming && <SegNameForm key={renaming.id} initial={renaming.name ?? ''} placeholder={`Segment ${renaming.sequence}`}
          onSave={async nm => { await updateSegment({ ...renaming, name: nm.trim() || undefined }); setRenaming(null); await load(); }}
          onClose={() => setRenaming(null)} />}
      </Sheet>
    </div>
  );
}
