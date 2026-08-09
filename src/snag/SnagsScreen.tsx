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
import { findUnportable, repairSegment, canRepairHere } from './repair';
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
  const [progress, setProgress] = useState<number | null>(null);
  const [stuck, setStuck] = useState<Segment[]>([]);
  const [repairing, setRepairing] = useState<{ index: number; total: number; fraction: number } | null>(null);
  const [repairMsg, setRepairMsg] = useState('');
  const [canRepair, setCanRepair] = useState(false);
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

  // Anything filmed before conversion existed is still stuck in a format other
  // devices can't show. Offer to fix it, but only where it can actually be done.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await findUnportable(workspace.id);
      if (!alive) return;
      setStuck(s);
      setCanRepair(s.length > 0 ? await canRepairHere(s) : false);
    })();
    return () => { alive = false; };
  }, [workspace.id, segs.length, repairMsg]);

  const repairAll = async () => {
    setRepairMsg(''); setErr('');
    let done = 0, blocked = false;
    for (let i = 0; i < stuck.length; i++) {
      setRepairing({ index: i, total: stuck.length, fraction: 0 });
      const outcome = await repairSegment(stuck[i], f => setRepairing({ index: i, total: stuck.length, fraction: f }));
      if (outcome === 'converted') done++;
      // No decoder here means no source to convert FROM — the phone that filmed
      // it is the only place this can work, so stop rather than grind through.
      if (outcome === 'cannot-decode') { blocked = true; break; }
    }
    setRepairing(null);
    await load();
    setRepairMsg(blocked
      ? `Converted ${done}. The rest can't be converted on this device — it can't read that format. Open this workspace on the phone that filmed them and tap this again.`
      : done > 0 ? `Converted ${done} video${done === 1 ? '' : 's'} — they'll play on your other devices once synced.`
      : 'Nothing could be converted here.');
  };

  /** Uploaded footage — each file becomes a segment, in the order picked.
   *  Phone clips get converted on the way in, which runs at playback speed, so
   *  the progress here is the real thing rather than a spinner. */
  const onFiles = async (files: File[]) => {
    setErr(''); setProgress(null);
    let firstId: string | null = null;
    try {
      for (let i = 0; i < files.length; i++) {
        setBusy(files.length > 1 ? `Adding video ${i + 1} of ${files.length}…` : 'Adding the video…');
        const id = await createSegmentFromVideo(workspace.id, files[i], f => setProgress(f));
        firstId ??= id;
        setProgress(null);
      }
      await load();
      // One video: drop straight into it to start marking. Several: stay on the
      // list, which is where you'd order and name a batch anyway.
      if (files.length === 1 && firstId) nav(`/w/${workspace.id}/segment/${firstId}`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add the video.'); }
    finally { setBusy(''); setProgress(null); if (fileRef.current) fileRef.current.value = ''; }
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

      {(stuck.length > 0 || repairing || repairMsg) && (
        <div className="card" style={{ marginTop: 12 }}>
          {repairing ? (
            <>
              <b>Converting video {repairing.index + 1} of {repairing.total}…</b>
              <p className="sub" style={{ marginTop: 6 }}>Runs at playback speed — keep this screen open.</p>
              <div className="prog"><div className="prog-bar" style={{ width: `${Math.round(repairing.fraction * 100)}%` }} /></div>
            </>
          ) : repairMsg ? (
            <>
              <p className="sub">{repairMsg}</p>
              {stuck.length > 0 && <button className="btn" style={{ marginTop: 10 }} onClick={repairAll}>Try again</button>}
            </>
          ) : (
            <>
              <b>{plural(stuck.length, 'video')} won't play on your other devices</b>
              {canRepair ? (
                <>
                  <p className="sub" style={{ marginTop: 6 }}>
                    {stuck.length === 1 ? 'It was' : 'They were'} filmed in your phone's own format, which a laptop
                    can play the sound of but not the picture. Converting {stuck.length === 1 ? 'it' : 'them'} here
                    fixes that everywhere — your marked assets and snags are kept. Takes about as long as the
                    footage runs, so keep this screen open.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={repairAll}>
                    Convert {plural(stuck.length, 'video')}
                  </button>
                </>
              ) : (
                /* Converting means decoding the original first, and this device
                   can't read the format — so don't offer a button that can only fail. */
                <p className="sub" style={{ marginTop: 6 }}>
                  This has to be done on the phone that filmed {stuck.length === 1 ? 'it' : 'them'} — this device
                  can't read that format, so there's nothing here to convert from. Open this workspace on that
                  phone, come to <b>Snag walk</b>, and tap <b>Convert</b>. They'll play here afterwards.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* No `capture` attribute: with it, a phone goes straight to the camera and
          never offers the gallery or Files — which is the opposite of what this
          button is for. Multiple, because footage usually arrives in batches. */}
      <input ref={fileRef} type="file" accept="video/*" multiple style={{ display: 'none' }}
        onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) void onFiles(f); }} />

      {busy ? (
        <div className="card" style={{ marginTop: 14 }}>
          <b>{busy}</b>
          {progress === null ? (
            <p className="sub" style={{ marginTop: 6 }}>Large files take a moment — keep this screen open.</p>
          ) : (
            <>
              <p className="sub" style={{ marginTop: 6 }}>
                Converting so it plays on your laptop as well as your phone. This runs at
                playback speed — keep this screen open.
              </p>
              <div className="prog"><div className="prog-bar" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <p className="sub" style={{ marginTop: 6 }}>{Math.round(progress * 100)}%</p>
            </>
          )}
        </div>
      ) : (
        <div className="add-video-row" data-tour="film">
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
