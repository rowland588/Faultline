/* Capture — the shop floor. Tap WHAT, tap WHERE, put a TIME to it, snap the
 * proof. One thumb, no charts, nothing technical. A running stopwatch is
 * persisted, so it survives the app closing. Every log is a check-sheet row. */
import { useEffect, useRef, useState } from 'react';
import type { Case, Observation, MediaRef } from '../types';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { deleteBlobs, listCases } from '../db';
import { applyDrill } from '../engine/drill';
import { studyResult } from '../lib/proof';
import { useSyncedAt } from '../cloud/session';
import { uid, now } from '../lib/ids';
import { captureMedia, saveVideoBlob, pickExistingMedia } from '../lib/media';
import { VideoRecorder, videoCaptureSupported } from '../ui/VideoRecorder';
import { fmtDuration, fmtDurationWords, fmtRelative, plural } from '../lib/format';
import { ChipPicker } from '../ui/Chip';
import { Stopwatch, CostTicker } from '../ui/Stopwatch';
import { costPerMs } from '../lib/cost';
import { Toast } from '../ui/Toast';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { useTeam } from '../cloud/team';

const blobKeysOf = (media: MediaRef[]): string[] =>
  media.flatMap(m => [m.blobKey, m.thumbKey].filter(Boolean) as string[]);

/** Quiet banner while a confirmation study is running: every capture in its
 *  scope counts automatically — this just shows the count climbing, so
 *  re-measuring feels like winning. Reads the same lib/proof arithmetic as
 *  the Case page; renders nothing when no study is armed. */
function StudyChips({ wsId, observations }: { wsId: string; observations: Observation[] }) {
  const [cases, setCases] = useState<Case[]>([]);
  const syncedAt = useSyncedAt();
  useEffect(() => { void listCases(wsId).then(setCases); }, [wsId, syncedAt]);
  const running = cases.filter(c => c.status === 'open' && c.study && !c.study.closedAt);
  if (running.length === 0) return null;
  const live = observations.filter(o => o.deletedAt == null);
  return (
    <div className="study-chips">
      {running.map(c => {
        const r = studyResult(c, applyDrill(live, wsId, c.path));
        if (!r) return null;
        return (
          <button key={c.id} className="study-chip" onClick={() => nav(`/w/${wsId}/case/${c.id}`)}>
            🔬 <b>{c.title}</b> — {r.afterN} of {r.targetN} samples{r.enough ? ' ✓ ready to call' : ''}
          </button>
        );
      })}
    </div>
  );
}

export function CaptureScreen() {
  const { workspace, observations, addObs, removeObs, restoreObs, patchWorkspace } = useWorkspace();
  const { whoIs, myId } = useTeam();

  const [category, setCategory] = useState(workspace.lastCategory ?? workspace.categories[0] ?? '');
  const [subcategory, setSubcategory] = useState('');
  const [asset, setAsset] = useState(workspace.lastAsset ?? workspace.assets[0] ?? '');
  const subOptions = (workspace.subcategories ?? {})[category] ?? [];
  const pickCategory = (c: string) => { setCategory(c); setSubcategory(''); };
  const [pending, setPending] = useState<MediaRef[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(workspace.activeTimer?.startedAt ?? null);
  const [typed, setTyped] = useState(false);
  const [tMin, setTMin] = useState('');
  const [tSec, setTSec] = useState('');
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [recording, setRecording] = useState(false);
  const [converting, setConverting] = useState<{ label: string; fraction: number } | null>(null);

  // Resume a running stopwatch (and its what/where) that survived an app close.
  useEffect(() => {
    if (workspace.activeTimer) {
      setStartedAt(workspace.activeTimer.startedAt);
      setCategory(workspace.activeTimer.category);
      setSubcategory(workspace.activeTimer.subcategory ?? '');
      setAsset(workspace.activeTimer.asset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reclaim orphaned evidence blobs: if you attach a photo/video then leave
  // without logging, the blob is otherwise stranded in IndexedDB forever.
  const pendingRef = useRef<MediaRef[]>([]);
  pendingRef.current = pending;
  useEffect(() => () => { const k = blobKeysOf(pendingRef.current); if (k.length) void deleteBlobs(k); }, []);

  const timing = startedAt !== null;
  const canLog = !!category && !!asset;

  const commit = async (durationMs: number, kind: Observation['timing'], startAt: number) => {
    const o: Observation = {
      id: uid(),
      workspaceId: workspace.id,
      category,
      subcategory: subcategory || undefined,
      asset,
      startedAt: startAt,
      endedAt: kind === 'stopwatch' ? now() : undefined,
      durationMs,
      timing: kind,
      count: 1,
      media: pending,
      createdAt: now(),
      updatedAt: now(),
    };
    await addObs(o);
    await patchWorkspace({ lastCategory: category, lastAsset: asset, activeTimer: undefined });
    setPending([]);
    setStartedAt(null);
    // name the £ the event just cost — the same rate the ticker was counting at
    const cost = durationMs * costPerMs(workspace);
    setToast({ msg: `Logged · ${o.asset} · ${o.category}${durationMs > 0 ? ' · ' + fmtDuration(durationMs) : ''}${cost > 0 ? ` · £${cost.toFixed(2)}` : ''}`, undo: () => void removeObs(o.id) });
  };

  const start = async () => {
    if (!canLog) return;
    const t = now();
    setStartedAt(t);
    // patchWorkspace (not saveActiveTimer) so the running timer lives in memory too
    // — otherwise switching tabs and back loses it / resurrects a discarded one.
    await patchWorkspace({ activeTimer: { category, subcategory: subcategory || undefined, asset, startedAt: t } });
  };
  const stopAndLog = async () => {
    if (startedAt === null) return;
    await commit(Math.max(1000, now() - startedAt), 'stopwatch', startedAt);
  };
  const discard = async () => {
    setStartedAt(null);
    await patchWorkspace({ activeTimer: undefined });
  };
  const logInstant = async () => {
    if (!canLog) return;
    await commit(0, 'instant', now());
  };
  const logTyped = async () => {
    const secs = Math.min(59, Math.max(0, parseInt(tSec, 10) || 0)); // typed values ignore the max attr
    const ms = ((parseInt(tMin, 10) || 0) * 60 + secs) * 1000;
    if (!canLog || ms <= 0) return;
    setTyped(false); setTMin(''); setTSec('');
    await commit(ms, 'typed', now());
  };
  const attach = async (kind: 'photo' | 'video') => {
    // Video stays on-screen and records straight from the camera stream so
    // several clips can be shot back to back — see VideoRecorder for why.
    if (kind === 'video' && videoCaptureSupported()) { setRecording(true); return; }
    try {
      const ref = await captureMedia(kind);
      if (ref) setPending(m => [...m, ref]);
    } catch {
      setToast({ msg: "Couldn't save that clip — device storage may be full." });
    }
  };
  /** Footage that already exists — phone gallery, Files, or a laptop's disk. */
  const upload = async () => {
    try {
      const refs = await pickExistingMedia((i, total, f) =>
        setConverting({ label: total > 1 ? `Video ${i + 1} of ${total}` : 'Video', fraction: f }));
      if (refs.length) setPending(m => [...m, ...refs]);
    } catch {
      setToast({ msg: "Couldn't attach those files — device storage may be full." });
    } finally {
      setConverting(null);
    }
  };
  const onClip = async (blob: Blob) => {
    try {
      const ref = await saveVideoBlob(blob);
      setPending(m => [...m, ref]);
    } catch {
      setToast({ msg: "Couldn't save that clip — device storage may be full." });
    }
  };
  const delFeed = async (o: Observation) => {
    await removeObs(o.id);
    setToast({ msg: `Deleted · ${o.asset} · ${o.category}`, undo: () => void restoreObs(o.id) });
  };

  const total = observations.reduce((a, o) => a + o.durationMs, 0);
  const recent = [...observations].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div className="wrap cap">
      <StudyChips wsId={workspace.id} observations={observations} />
      {/* pickers lock while a timer runs so the elapsed time can't be re-attributed */}
      <fieldset className="cap-fields" data-tour="cap-fields" disabled={timing}>
      {/* ASSET — where on the line (the floor thinks asset-first: this machine stopped) */}
      <div className="cap-block">
        <div className="field-label">Which asset?</div>
        <ChipPicker
          options={workspace.assets}
          value={asset}          onChange={setAsset}
          onAdd={a => void patchWorkspace({ assets: [...workspace.assets, a] })}
          addLabel="Add a machine or area…"
        />
        {workspace.assets.length === 0 && <p className="sub" style={{ marginTop: 6 }}>Add the machines on this line. “Whole line” is for losses that aren't one machine.</p>}
      </div>

      {/* WHAT — what did you see on it */}
      <div className="cap-block">
        <div className="field-label">What did you see?</div>
        <ChipPicker
          options={workspace.categories}
          value={category}          onChange={pickCategory}
          onAdd={c => void patchWorkspace({ categories: [...workspace.categories, c] })}
          addLabel="Add a category…"
        />
      </div>

      {/* WHAT — sub-category (scoped to the chosen category; drills to its own Pareto) */}
      {category && (
        <div className="cap-block">
          <div className="field-label">Which kind? <span className="opt">optional</span></div>
          <ChipPicker
            options={subOptions}
            value={subcategory}            onChange={setSubcategory}
            onAdd={s => void patchWorkspace({ subcategories: { ...(workspace.subcategories ?? {}), [category]: [...subOptions, s] } })}
            addLabel={`Add a kind of ${category}…`}
          />
        </div>
      )}
      </fieldset>

      {/* THE TIME — the whole point */}
      <div className={'cap-timer' + (timing ? ' live' : '')}>
        {timing ? (
          <>
            <div className="cap-timer-what">{asset} · {category}</div>
            <div className="cap-clock"><span className="cap-dot" />{startedAt !== null && <Stopwatch startedAt={startedAt} />}</div>
            {startedAt !== null && <CostTicker startedAt={startedAt} perMs={costPerMs(workspace)} />}
            <div className="cap-timer-actions">
              <button className="btn btn-primary btn-lg cap-stop" onClick={stopAndLog}>■ Stop &amp; log</button>
              <button className="btn btn-ghost" onClick={discard}>Discard</button>
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-primary cap-start" disabled={!canLog} onClick={start}>
              ▶ Start timing
            </button>
            <div className="cap-secondary">
              <button className="btn" data-tour="log-now" disabled={!canLog} onClick={logInstant}>Log now</button>
              <button className="btn" disabled={!canLog} onClick={() => setTyped(t => !t)}>Type a time</button>
            </div>
            {typed && (
              <div className="cap-typed">
                <input className="text-input" type="number" min="0" placeholder="min" value={tMin} onChange={e => setTMin(e.target.value)} />
                <input className="text-input" type="number" min="0" max="59" placeholder="sec" value={tSec} onChange={e => setTSec(e.target.value)} />
                <button className="btn btn-primary" onClick={logTyped}>Log</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* EVIDENCE */}
      <div className="cap-block cap-evidence">
        <div className="cap-ev-row">
          <button className="btn cap-ev-btn" onClick={() => attach('photo')}>📷 Photo</button>
          <button className="btn cap-ev-btn" onClick={() => attach('video')}>🎥 Video</button>
          <button className="btn cap-ev-btn" onClick={upload}>⬆ Upload</button>
          {pending.map(m => <EvidenceThumb key={m.id} media={m} onClick={() => setViewing(m)} />)}
        </div>
        {converting && (
          <div style={{ marginTop: 10 }}>
            <p className="sub">Converting {converting.label.toLowerCase()} so it plays on every device — runs at playback speed.</p>
            <div className="prog"><div className="prog-bar" style={{ width: `${Math.round(converting.fraction * 100)}%` }} /></div>
          </div>
        )}
        {pending.length > 0 && <p className="sub" style={{ marginTop: 6 }}>{plural(pending.length, 'clip')} ready — attaches to the next log.</p>}
      </div>

      {/* the bridge to the payoff — logging leads somewhere */}
      {observations.length > 0 && (
        <button className="board-cta" onClick={() => nav(`/w/${workspace.id}/analyse`)}>
          <span className="board-cta-ic" aria-hidden>▤</span>
          <span className="board-cta-main">See where the line's losing time</span>
          <span className="board-cta-go" aria-hidden>›</span>
        </button>
      )}

      {/* THE CHECK SHEET — every log lands here, newest first */}
      <div className="cap-feed">
        <div className="cap-feed-head">
          <span className="cap-feed-title-lbl">Logged this workspace</span>
          <span className="cap-feed-count"><b>{observations.length}</b> {observations.length === 1 ? 'entry' : 'entries'}{total > 0 && <> · <b>{fmtDurationWords(total)}</b></>}</span>
        </div>
        {recent.length === 0 ? (
          <p className="cap-feed-empty">Nothing yet. Pick an asset, say what you saw, put a time to it — it lands here.</p>
        ) : (
          <div className="cap-feed-list">
            {recent.map(o => (
              <div className="cap-feed-row" key={o.id}>
                <span className="cap-feed-dot" style={{ background: workspace.color }} />
                <div className="cap-feed-main">
                  <div className="cap-feed-what">{o.asset} · <b>{o.category}</b>{o.subcategory ? ` · ${o.subcategory}` : ''}</div>
                  <div className="cap-feed-meta">
                    {o.durationMs > 0 ? fmtDuration(o.durationMs) : 'noted'} · {fmtRelative(o.createdAt)}
                    {o.media.length > 0 && <> · 📷 {o.media.length}</>}
                    {/* a teammate's entry says whose it is — shared workspace, no mystery rows */}
                    {o.ownerId && myId && o.ownerId !== myId && <> · <b>{whoIs(o.ownerId)?.name ?? 'teammate'}</b></>}
                  </div>
                </div>
                <button className="cap-feed-del" onClick={() => void delFeed(o)} aria-label={`Delete ${o.category} on ${o.asset}`}>×</button>
              </div>
            ))}
            {observations.length > recent.length && (
              <button className="cap-feed-more" onClick={() => nav(`/w/${workspace.id}/log`)}>
                See all {observations.length} ›
              </button>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} onUndo={toast.undo ? () => { toast.undo!(); setToast(null); } : undefined} onDismiss={() => setToast(null)} />}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
      {recording && <VideoRecorder onCapture={o => void onClip(o)} onClose={() => setRecording(false)} />}
    </div>
  );
}
