import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForWorkspace, deleteSegment, reorderSegments, updateSegment } from '../db';
import { plural } from '../lib/format';
import { EmptyState } from '../ui/EmptyState';
import { Sheet } from '../ui/Sheet';
import { useBlobUrl } from './useBlobUrl';
import { createSegmentFromVideo } from './addSegment';
import { VideoRecorder, videoCaptureSupported } from '../ui/VideoRecorder';
import { useSyncedAt } from '../cloud/session';
import { sectionLabel } from './labels';
import type { Segment } from './types';

const fmtDur = (s?: number) => (!s || s <= 0 ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function SegRow({ seg, assetNames, first, last, onOpen, onUp, onDown, onRename, onDelete }: {
  seg: Segment; assetNames: string[]; first: boolean; last: boolean;
  onOpen: () => void; onUp: () => void; onDown: () => void; onRename: () => void; onDelete: () => void;
}) {
  const poster = useBlobUrl(seg.posterKey);
  const label = sectionLabel(seg, assetNames);
  return (
    <div className="seg-row">
      <div className="seg-order">
        <button className="seg-arrow" disabled={first} onClick={onUp} aria-label="Move earlier">▲</button>
        <span className="seg-seq">{seg.sequence}</span>
        <button className="seg-arrow" disabled={last} onClick={onDown} aria-label="Move later">▼</button>
      </div>
      <button className="seg-poster" onClick={onOpen}>{poster ? <img src={poster} alt="" /> : <span>▶</span>}</button>
      <button className="seg-main" onClick={onOpen}>
        <span className="seg-name">{label}</span>
        <span className="seg-meta">{fmtDur(seg.durationS)} · {plural(assetNames.length, 'asset')}</span>
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
  const [namesBySeg, setNamesBySeg] = useState<Map<string, string[]>>(new Map());
  const [openSnags, setOpenSnags] = useState(0);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState<Segment | null>(null);
  const [filming, setFilming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [ss, assets, snags] = await Promise.all([listSegments(workspace.id), listSnagAssets(workspace.id), snagsForWorkspace(workspace.id)]);
    const names = new Map<string, string[]>();
    for (const a of [...assets].sort((x, y) => x.timestampS - y.timestampS)) {
      names.set(a.segmentId, [...(names.get(a.segmentId) ?? []), a.name]);
    }
    setSegs(ss); setNamesBySeg(names); setOpenSnags(snags.filter(s => s.status !== 'closed').length);
  };
  const syncedAt = useSyncedAt();
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [workspace.id, syncedAt]);

  /** Uploaded footage — each file becomes a segment, in the order picked. */
  const onFiles = async (files: File[]) => {
    setErr(''); setBusy(files.length > 1 ? `Saving ${files.length} videos…` : 'Saving the video…');
    let firstId: string | null = null;
    try {
      for (const f of files) {
        const id = await createSegmentFromVideo(workspace.id, f);
        firstId ??= id;
      }
      await load();
      // One video: drop straight into it to start marking. Several: stay on the
      // list, which is where you'd order and name a batch anyway.
      if (files.length === 1 && firstId) nav(`/w/${workspace.id}/segment/${firstId}`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add the video.'); }
    finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  /* Each clip recorded in one session becomes its own segment — that's exactly
   * the shape of a walk (infeed, filler, outfeed). Saved as they're shot so
   * nothing is lost if the camera is closed mid-session. */
  const onRecorded = async (blob: Blob) => {
    setErr('');
    try { await createSegmentFromVideo(workspace.id, blob); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save the clip.'); }
  };

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= segs.length) return;
    const order = segs.map(s => s.id); const [m] = order.splice(from, 1); order.splice(to, 0, m);
    setSegs(order.map((id, i) => ({ ...segs.find(s => s.id === id)!, sequence: i + 1 })));
    await reorderSegments(order);
  };

  const remove = async (seg: Segment) => {
    const n = (namesBySeg.get(seg.id) ?? []).length;
    if (!window.confirm(`Delete "${seg.name || `Segment ${seg.sequence}`}"? This also removes ${plural(n, 'asset')} and all their snags. This can't be undone.`)) return;
    await deleteSegment(seg.id); await load();
  };

  const totalAssets = [...namesBySeg.values()].reduce((a, b) => a + b.length, 0);

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

      {/* No `capture` attribute: with it, a phone goes straight to the camera and
          never offers the gallery or Files — which is the opposite of what this
          button is for. Multiple, because footage usually arrives in batches. */}
      <input ref={fileRef} type="file" accept="video/*" multiple style={{ display: 'none' }}
        onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) void onFiles(f); }} />

      {busy ? (
        <div className="card" style={{ marginTop: 14 }}><b>{busy}</b><p className="sub" style={{ marginTop: 6 }}>Large files take a moment — keep this screen open.</p></div>
      ) : (
        <div className="add-video-row">
          {/* Filming in-app records H.264, which plays on every device. The
              phone's own camera app defaults to HEVC on most handsets, which
              a laptop can decode the sound of but not the picture — so that's
              the fallback, not the headline action. */}
          {videoCaptureSupported() && (
            <button className="btn btn-primary btn-lg" onClick={() => setFilming(true)}>🎥 Film the walk</button>
          )}
          <button className={'btn btn-lg' + (videoCaptureSupported() ? '' : ' btn-primary')} onClick={() => fileRef.current?.click()}>
            ⬆ Upload video{videoCaptureSupported() ? 's' : ''}
          </button>
        </div>
      )}

      {segs.length === 0 && !busy ? (
        <EmptyState icon="🎥" title="No footage yet">Film the line infeed-to-outfeed — several clips for a long line — and add them in walk order. Then scrub each to mark its assets.</EmptyState>
      ) : (
        <div className="card">
          <div className="field-label" style={{ marginBottom: 8 }}>Segments · walk order</div>
          {segs.map((seg, i) => (
            <SegRow key={seg.id} seg={seg} assetNames={namesBySeg.get(seg.id) ?? []} first={i === 0} last={i === segs.length - 1}
              onOpen={() => nav(`/w/${workspace.id}/segment/${seg.id}`)}
              onUp={() => move(i, i - 1)} onDown={() => move(i, i + 1)}
              onRename={() => setRenaming(seg)} onDelete={() => remove(seg)} />
          ))}
        </div>
      )}

      {filming && <VideoRecorder onCapture={b => void onRecorded(b)} onClose={() => setFilming(false)} />}

      <Sheet open={!!renaming} onClose={() => setRenaming(null)} title="Name this video">
        {renaming && <SegNameForm key={renaming.id} initial={renaming.name ?? ''} placeholder={`Segment ${renaming.sequence}`}
          onSave={async nm => { await updateSegment({ ...renaming, name: nm.trim() || undefined }); setRenaming(null); await load(); }}
          onClose={() => setRenaming(null)} />}
      </Sheet>
    </div>
  );
}
