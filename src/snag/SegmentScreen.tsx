import { useEffect, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { getSegment, listSegments, updateSegment, assetsForSegment, snagsForAsset, addSnagAsset, putBlob } from '../db';
import { uid, now } from '../lib/ids';
import { Sheet } from '../ui/Sheet';
import { useBlobSource } from './useBlobUrl';
import { captureFrame } from './frame';
import { createSegmentFromVideo } from './addSegment';
import { sectionLabel } from './labels';
import { useSyncedAt } from '../cloud/session';
import type { Segment, SnagAsset } from './types';

export function SegmentScreen({ wsId, segmentId }: { wsId: string; segmentId: string }) {
  const [seg, setSeg] = useState<Segment | null>(null);
  const [segs, setSegs] = useState<Segment[]>([]);
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [openCounts, setOpenCounts] = useState<Map<string, number>>(new Map());
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [marking, setMarking] = useState<{ still: string; blob: Blob; timestamp: number } | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [renamingSeg, setRenamingSeg] = useState(false);
  const [err, setErr] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const { url: videoUrl, state: videoState } = useBlobSource(seg?.videoKey);

  const loadAssets = async () => {
    const list = await assetsForSegment(segmentId);
    setAssets(list);
    const c = new Map<string, number>();
    for (const a of list) { const sn = await snagsForAsset(a.id); c.set(a.id, sn.filter(s => s.status !== 'closed').length); }
    setOpenCounts(c);
  };
  useEffect(() => {
    (async () => {
      const s = await getSegment(segmentId);
      if (!s) { nav(`/w/${wsId}/snags`); return; }
      setSeg(s); await loadAssets();
    })();
    // eslint-disable-next-line
  }, [segmentId]);
  const syncedAt = useSyncedAt();
  useEffect(() => { void listSegments(wsId).then(setSegs); void loadAssets(); /* eslint-disable-next-line */ }, [wsId, syncedAt]);

  const idx = segs.findIndex(s => s.id === segmentId);
  const goSeg = (s?: Segment) => { if (s) nav(`/w/${wsId}/segment/${s.id}`); };

  const addVideo = async (file: File) => {
    setErr(''); setAddingVideo(true);
    try {
      const id = await createSegmentFromVideo(wsId, file);
      nav(`/w/${wsId}/segment/${id}`); // jump into the new video
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add the video.'); }
    finally { setAddingVideo(false); if (addRef.current) addRef.current.value = ''; }
  };

  const renameSeg = async (nm: string) => {
    if (!seg) return;
    await updateSegment({ ...seg, name: nm.trim() || undefined });
    const s = await getSegment(segmentId); setSeg(s ?? null);   // refresh title
    await listSegments(wsId).then(setSegs);                     // refresh strip labels
    setRenamingSeg(false);
  };

  const seek = (to: number) => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, Math.min(dur || v.duration || 0, to)); };
  const step = (d: number) => { const v = videoRef.current; if (v) { v.pause(); seek(v.currentTime + d); } };

  const mark = async () => {
    const v = videoRef.current; if (!v) return;
    v.pause(); setErr(''); setBusy(true);
    try {
      const blob = await captureFrame(v, 0.85);
      setMarking({ still: URL.createObjectURL(blob), blob, timestamp: v.currentTime });
      setName(''); setCode('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not mark.'); }
    finally { setBusy(false); }
  };

  /** Persist the marked frame as an asset; returns its id (or null on failure). */
  const create = async (): Promise<string | null> => {
    if (!marking || !seg || !name.trim()) return null;
    setBusy(true);
    try {
      const id = uid();
      const stillKey = `blob-${uid()}`;
      await putBlob(stillKey, marking.blob);
      await addSnagAsset({ id, workspaceId: wsId, segmentId: seg.id, timestampS: marking.timestamp, name: name.trim(), code: code.trim() || undefined, stillKey, createdAt: now() });
      URL.revokeObjectURL(marking.still);
      return id;
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); return null; }
    finally { setBusy(false); }
  };

  // The natural next step: go straight to the still to zoom in and pin snags.
  const saveAndAnnotate = async () => {
    const id = await create();
    if (id) { setMarking(null); nav(`/w/${wsId}/asset/${id}`); }
  };
  // The fast path: keep scrubbing to mark more assets in one pass.
  const saveAndMarkAnother = async () => {
    const ts = marking?.timestamp ?? 0;
    const id = await create();
    if (id) { setMarking(null); await loadAssets(); seek(ts); }
  };
  const cancel = () => { if (marking) URL.revokeObjectURL(marking.still); setMarking(null); };

  return (
    <div className="wrap">
      <div className="subhead">
        {/* A named destination, so go straight there. history.back() would only
            rewind ONE entry — and every segment you switched through (strip
            chips, ‹ › arrows) pushed one, so it walked you back a segment at a
            time instead of reaching the list. */}
        <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>‹ All segments</button>
        <div style={{ flex: 1 }} />
        {segs.length > 1 && (
          <div className="seg-nav">
            <button className="seg-nav-arrow" disabled={idx <= 0} onClick={() => goSeg(segs[idx - 1])} aria-label="Previous segment">‹</button>
            <span className="seg-nav-pos">{idx + 1} / {segs.length}</span>
            <button className="seg-nav-arrow" disabled={idx < 0 || idx >= segs.length - 1} onClick={() => goSeg(segs[idx + 1])} aria-label="Next segment">›</button>
          </div>
        )}
      </div>

      <input ref={addRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void addVideo(f); }} />
      <div className="seg-strip">
        {segs.map((s, i) => (
          <button key={s.id} className={'seg-chip' + (s.id === segmentId ? ' on' : '')} onClick={() => goSeg(s)} title={s.name || `Segment ${s.sequence}`}>
            {i + 1}
          </button>
        ))}
        <button className="seg-chip seg-chip-add" disabled={addingVideo} onClick={() => addRef.current?.click()} title="Add another video">
          {addingVideo ? '…' : '＋ Video'}
        </button>
      </div>

      <div className="seg-title-row">
        <button className="asset-title" style={{ width: 'auto' }} onClick={() => seg && setRenamingSeg(true)}>
          <span className="mark" style={{ fontSize: 22 }}>{seg ? sectionLabel(seg, assets.map(a => a.name)) : '…'}</span>
        </button>
        {seg && <button className="btn seg-rename-btn" onClick={() => setRenamingSeg(true)}>✎ Name this video</button>}
      </div>
      <p className="sub" style={{ marginTop: 4 }}>Scrub to a machine, pause, and mark it. That exact frame becomes its still.{segs.length > 1 ? ' Switch videos with the numbers above.' : ''}</p>

      {err && <div className="card" style={{ color: 'var(--danger)', marginTop: 12 }}>{err}</div>}

      <div className="card" style={{ marginTop: 12, padding: 10 }}>
        {videoState === 'ready' ? (
          <video ref={videoRef} className="seg-video" src={videoUrl ?? undefined} playsInline controls preload="metadata"
            onLoadedMetadata={e => setDur((e.target as HTMLVideoElement).duration || 0)}
            onTimeUpdate={e => setT((e.target as HTMLVideoElement).currentTime)} />
        ) : (
          <div className="video-msg seg-video">
            <span className="video-msg-ic" aria-hidden>☁</span>
            <b>{videoState === 'loading' ? 'Loading…' : 'Not on this device yet'}</b>
            {videoState === 'missing' && <span className="sub">This video will download on the next sync — keep this device online for a moment.</span>}
          </div>
        )}
        <div className="seg-controls">
          <button className="btn" onClick={() => step(-1)}>◄ 1s</button>
          <button className="btn" onClick={() => step(1)}>1s ►</button>
          <span className="seg-time">{t.toFixed(1)}s{dur ? ` / ${dur.toFixed(0)}s` : ''}</span>
          <button className="btn btn-primary" onClick={mark} disabled={busy || !videoUrl}>＋ Mark asset</button>
        </div>
        {dur > 0 && (
          <div className="seg-timeline">
            {assets.map(a => <button key={a.id} className="seg-marker" style={{ left: `${(a.timestampS / dur) * 100}%` }} title={`${a.name} — ${a.timestampS.toFixed(1)}s`} onClick={() => seek(a.timestampS)} />)}
          </div>
        )}
      </div>

      <div className="card">
        <div className="field-label" style={{ marginBottom: 8 }}>Assets in this segment</div>
        {assets.length === 0 ? <p className="sub">None yet — scrub to a machine, pause, tap “Mark asset”.</p>
          : assets.map(a => (
            <button key={a.id} className="asset-line" onClick={() => nav(`/w/${wsId}/asset/${a.id}`)}>
              <span className="asset-line-name">{a.name}{a.code ? <span className="asset-code"> · {a.code}</span> : ''}</span>
              <span className="asset-line-meta">{a.timestampS.toFixed(1)}s · {openCounts.get(a.id) ?? 0} open</span>
            </button>
          ))}
      </div>

      <Sheet open={!!marking} onClose={cancel} title="New asset">
        {marking && <img className="mark-still" src={marking.still} alt="marked frame" />}
        <div className="field-label" style={{ marginTop: 8 }}>Asset name</div>
        <input className="text-input" autoFocus value={name} placeholder="e.g. Multihead Weigher" onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveAndAnnotate(); }} />
        <div className="field-label" style={{ marginTop: 10 }}>Asset code <span className="opt">optional</span></div>
        <input className="text-input" value={code} placeholder="e.g. MHW-04" onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveAndAnnotate(); }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={saveAndAnnotate} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save & add snags →'}</button>
          <button className="btn" onClick={saveAndMarkAnother} disabled={busy || !name.trim()}>Save &amp; mark another</button>
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
        </div>
      </Sheet>

      <Sheet open={renamingSeg} onClose={() => setRenamingSeg(false)} title="Name this video">
        {seg && <SegNameForm key={seg.id} initial={seg.name ?? ''} placeholder={`Segment ${seg.sequence}`} onSave={renameSeg} onClose={() => setRenamingSeg(false)} />}
      </Sheet>
    </div>
  );
}

/** The little name form for a video/section. Kept simple — one field. */
function SegNameForm({ initial, placeholder, onSave, onClose }: { initial: string; placeholder: string; onSave: (n: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave(name); } finally { setBusy(false); } };
  return (
    <>
      <p className="sub" style={{ marginBottom: 10 }}>Give this video a name so you can tell your sections apart — e.g. “Infeed”, “Filler → capper”, “Outfeed”.</p>
      <div className="field-label">Video name</div>
      <input className="text-input" autoFocus value={name} placeholder={placeholder} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save(); }} />
      <div className="row-end" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  );
}
