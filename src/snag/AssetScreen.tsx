import { useEffect, useRef, useState } from 'react';
import type { Observation } from '../types';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { getSnagAsset, getSegment, snagsForAsset, addSnag, updateSnag, updateSnagAsset, deleteSnag, putBlob, chainForWorkspace, getProject, listTests, listTestItems, putTest } from '../db';
import { planModel } from '../lib/planModel';
import { live, type Test, type TestItem } from '../lib/testing';
import { fixTone } from '../lib/fixTone';
import { uid, now } from '../lib/ids';
import { Sheet } from '../ui/Sheet';
import { Chip } from '../ui/Chip';
import { useBlobUrl } from './useBlobUrl';
import { VideoPlayer } from '../ui/VideoPlayer';
import { useTeam } from '../cloud/team';
import { useSyncedAt } from '../cloud/session';
import PinImage, { type Pin } from './PinImage';
import { SNAG_STATUS_META, ageDays, isStaleOpen, dueToInput, dueFromInput, type SnagAsset, type Snag, type SnagStatus } from './types';

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
  /* ON A STAGE-GATE JOB THE PROBLEM IS A FIX. Rowland: "where does the
     evidence come into play?" — it sat beside the fixes. Here the frame shows
     the fixes pinned on it, and a problem raised on it becomes a fix. */
  const [job, setJob] = useState<{ projectId: string; fixes: Test[]; found: { item: TestItem; on?: Test }[] } | null>(null);
  const [fixDraft, setFixDraft] = useState<{ xPct: number; yPct: number } | null>(null);

  const load = async () => {
    let a = await getSnagAsset(assetId);
    if (!a) {
      // one transient read miss (heavy writes in flight) must not eject the
      // user back to the hub — re-read once before concluding it's gone
      await new Promise(r => setTimeout(r, 400));
      a = await getSnagAsset(assetId);
      if (!a) { nav(`/w/${wsId}/snags`); return; }
    }
    setAsset(a); setSnags(await snagsForAsset(a.id));
    // No segment id means the clip it was cut from has since been deleted.
    // The still and everything pinned on it are still here — there is just no
    // video to jump back to.
    const seg = a.segmentId ? await getSegment(a.segmentId) : undefined;
    setVideoKey(seg?.videoKey);
    const frameId = a.id;
    const chain = await chainForWorkspace(wsId);
    const project = chain ? await getProject(chain.projectId) : undefined;
    if (chain && project && planModel(project) === 'commissioning') {
      const tests = live(await listTests(chain.projectId));
      const fixes = tests.filter(t => t.kind === 'fix' && t.pin?.frameId === frameId);
      /* What was found on an install step or a test, pointed at here. */
      const found = live(await listTestItems(chain.projectId))
        .filter(i => i.pin?.frameId === frameId)
        .map(item => ({ item, on: tests.find(t => t.id === item.testId) }));
      setJob({ projectId: chain.projectId, fixes, found });
    } else setJob(null);
  };
  const syncedAt = useSyncedAt();
  // Deliberately narrow: this re-runs on the identity that matters, not on
  // every reference it reads.
// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [assetId, syncedAt]);

  const visible = snags.filter(s => showClosed || !(s.status === 'closed' && ageDays(s.closedAt ?? s.raisedAt) > 30));
  const hiddenClosed = snags.length - visible.length;
  const openCount = snags.filter(s => s.status !== 'closed').length;

  // Stable reference number per snag (raised order), shown on the pin AND in the
  // list AND in the printed report, so "snag 3" means the same everywhere.
  const numById = new Map(snags.map((s, i) => [s.id, i + 1] as const));
  const pins: Pin[] = visible.map(s => ({ id: s.id, xPct: s.xPct ?? 0, yPct: s.yPct ?? 0, color: SNAG_STATUS_META[s.status].color, label: s.problem, n: numById.get(s.id), active: editing?.id === s.id }));
  if (draft) pins.push({ id: '__draft', xPct: draft.xPct, yPct: draft.yPct, color: 'var(--brand)', n: snags.length + 1, active: true });
  const FIX_COLOUR: Record<string, string> = { done: 'var(--ok)', late: 'var(--danger)', notRun: 'var(--danger)', soon: 'var(--warn)', ahead: 'var(--brand)' };
  for (const f of job?.fixes ?? []) if (f.pin) pins.push({ id: 'fix:' + f.id, xPct: f.pin.x, yPct: f.pin.y, color: FIX_COLOUR[fixTone(f).tone], label: f.title });
  for (const { item } of job?.found ?? []) if (item.pin) pins.push({ id: 'item:' + item.id, xPct: item.pin.x, yPct: item.pin.y, color: 'var(--warn)', label: item.what });
  if (fixDraft) pins.push({ id: '__fix', xPct: fixDraft.xPct, yPct: fixDraft.yPct, color: 'var(--danger)', active: true });
  const place = (x: number, y: number) => {
    setEditing(null);
    if (job) { setDraft(null); setFixDraft({ xPct: x, yPct: y }); } else setDraft({ xPct: x, yPct: y });
  };

  return (
    <div className="wrap">
      <div className="subhead">
        {/* No back button here any more — the crumb bar above says where this
            frame sits and steps up to any of it. What is left is the SIDEWAYS
            move: out of this one frame and into everything the line has. */}
        <button className="btn" data-tour="asset-back" onClick={() => nav(`/w/${wsId}/snaglist`)}>⚑ All evidence</button>
        <div style={{ flex: 1 }} />
        {asset && <button className="btn" onClick={() => nav(`/w/${wsId}/history/${asset.id}`)}>⏱ Through time</button>}
        {asset && <button className="btn" onClick={() => setRenaming(true)}>✎ Rename</button>}
        {hiddenClosed > 0 && <button className="btn" onClick={() => setShowClosed(v => !v)}>{showClosed ? 'Hide closed' : `Show closed (${hiddenClosed})`}</button>}
      </div>
      <button className="asset-title" onClick={() => asset && setRenaming(true)}>
        <span className="mark" style={{ fontSize: 22 }}>{asset?.name ?? '…'}{asset?.code ? <span className="sub" style={{ fontSize: 15, fontWeight: 400 }}> · {asset.code}</span> : null}</span>
      </button>
      <div className="asset-actions">
        {/* A BUTTON, not only a gesture. Tapping the picture still works, but on
            a phone that tap competes with pinch-zoom, and when it loses there
            is no other way in — you are stuck looking at a still you cannot
            add anything to. The button drops the pin in the middle and the
            editor lets you move it. */}
        <button className="btn btn-primary" data-tour="add-snag" onClick={() => place(50, 50)}>
          {job ? '＋ Raise a fix here' : '＋ Add evidence'}
        </button>
        <span className="sub">{job
          ? `${((n: number) => `${n} ${n === 1 ? 'fix' : 'fixes'}`)(job.fixes.filter(f => f.outcome !== 'passed').length)} open here · or tap the picture where the problem is`
          : `${openCount} open · or tap the picture where you see it`}</span>
      </div>

      <div style={{ marginTop: 12 }} data-tour="pins">
        <PinImage src={still} pins={pins} alt={asset?.name}
          onPlace={place}
          onPinTap={id => {
            if (id.startsWith('fix:') && job) { nav(`/project/${job.projectId}/testing/${encodeURIComponent(id.slice(4))}`); return; }
            if (id.startsWith('item:') && job) {
              const hit = job.found.find(f => f.item.id === id.slice(5));
              if (hit) nav(`/project/${job.projectId}/testing/${encodeURIComponent(hit.item.testId)}`);
              return;
            }
            const s = snags.find(x => x.id === id); if (s) { setDraft(null); setFixDraft(null); setEditing(s); }
          }} />
      </div>

      {/* Offered whenever a source clip exists — the player itself explains if
          it hasn't synced to this device yet, rather than the button vanishing. */}
      {videoKey && (
        <button className="btn watch-video-btn" onClick={() => setWatching(true)}>
          ▶ Watch the video — see it live
        </button>
      )}

      {job && job.found.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Found here</div>
          {job.found.map(({ item, on }) => (
            <button key={item.id} className="snag-line-row" onClick={() => nav(`/project/${job.projectId}/testing/${encodeURIComponent(item.testId)}`)}>
              <span className="snag-dot-sm" style={{ background: 'var(--warn)' }} />
              <span className="snag-line-main">
                <span className="snag-line-problem">{item.what}</span>
                <span className="snag-line-meta">{on ? `${on.kind === 'install' ? 'Install step' : 'Test'} · ${on.title}` : ''}{item.owner ? ` · ${item.owner}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {job && job.fixes.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Fixes pinned here</div>
          {job.fixes.map(f => (
            <button key={f.id} className="snag-line-row" onClick={() => nav(`/project/${job.projectId}/testing/${encodeURIComponent(f.id)}`)}>
              <span className="snag-dot-sm" style={{ background: FIX_COLOUR[fixTone(f).tone] }} />
              <span className="snag-line-main">
                <span className="snag-line-problem">{f.title}</span>
                <span className="snag-line-meta">{fixTone(f).when}{f.withWhom ? ` · ${f.withWhom}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {(!job || visible.length > 0) && <div className="card" style={{ marginTop: 12 }}>
        <div className="field-label" style={{ marginBottom: 8 }}>{job ? 'Evidence pinned here earlier' : 'On this asset'}</div>
        {visible.length === 0 ? <p className="sub">Nothing on this frame yet — tap it where you see something.</p>
          : visible.map(s => (
            <button key={s.id} className="snag-line-row" onClick={() => { setDraft(null); setEditing(s); }}>
              <span className="snag-dot-sm" style={{ background: SNAG_STATUS_META[s.status].color }}>{numById.get(s.id)}</span>
              <span className="snag-line-main">
                <span className="snag-line-problem">{s.problem}</span>
                <span className="snag-line-meta">{SNAG_STATUS_META[s.status].label}{s.owner ? ` · ${s.owner}` : ''} · {ageDays(s.raisedAt)}d{isStaleOpen(s) ? ' · ⚠ stale' : ''}</span>
              </span>
            </button>
          ))}
      </div>}

      {fixDraft && job && asset && (
        <RaiseFix projectId={job.projectId} frameId={asset.id} at={fixDraft} still={still}
          onClose={() => setFixDraft(null)} />
      )}

      {(draft || editing) && asset && (
        <SnagEditor wsId={wsId} asset={asset} draft={draft} snag={editing} observations={observations}
          jobId={job?.projectId}
          still={still} pinAt={draft ?? (editing ? { xPct: editing.xPct ?? 50, yPct: editing.yPct ?? 50 } : null)}
          onClose={() => { setDraft(null); setEditing(null); }}
          onSaved={async () => { setDraft(null); setEditing(null); await load(); }}
          /* Saved, and straight into the next one — the answer to "I just want
             to add another". The new pin lands a little away from the last so
             the two do not sit on top of each other. */
          onSavedAndNext={async () => {
            const from = draft ?? { xPct: 50, yPct: 50 };
            setEditing(null);
            setDraft({ xPct: Math.min(90, from.xPct + 8), yPct: Math.min(90, from.yPct + 8) });
            await load();
          }}
          /* Put the pin somewhere else: close up, tap the picture. */
          onMovePin={() => { setEditing(null); setDraft(null); }} />
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

function SnagEditor({ wsId, asset, draft, snag, observations, still, pinAt, onClose, onSaved, onSavedAndNext, onMovePin, jobId }: {
  wsId: string; asset: SnagAsset; draft: { xPct: number; yPct: number } | null; snag: Snag | null;
  /** The stage-gate job this frame belongs to, when it does: then a pinned
   *  problem can be made the fix it is. */
  jobId?: string;
  observations: Observation[];
  /** The frame and where this pin sits on it. Shown INSIDE the sheet, because
   *  the sheet covers the picture: writing "the guide on the left" while unable
   *  to see which pin you are writing about is how the wrong snag gets typed. */
  still: string | null; pinAt: { xPct: number; yPct: number } | null;
  onClose: () => void; onSaved: () => void;
  onSavedAndNext: () => void; onMovePin: () => void;
}) {
  const { members } = useTeam();
  const [problem, setProblem] = useState(snag?.problem ?? '');
  const [solution, setSolution] = useState(snag?.proposedSolution ?? '');
  const [status, setStatus] = useState<SnagStatus>(snag?.status ?? 'open');
  const [owner, setOwner] = useState(snag?.owner ?? '');
  const [due, setDue] = useState(dueToInput(snag?.dueAt));
  const [update, setUpdate] = useState(snag?.latestUpdate ?? '');
  const [closeNote, setCloseNote] = useState(snag?.closeNote ?? '');
  const [links, setLinks] = useState<string[]>(snag?.linkedObsIds ?? []);
  const [photoKey, setPhotoKey] = useState<string | undefined>(snag?.detailPhotoKey);
  const [fixedKey, setFixedKey] = useState<string | undefined>(snag?.fixedPhotoKey);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const fixedRef = useRef<HTMLInputElement>(null);
  const photoUrl = useBlobUrl(photoKey);
  const fixedUrl = useBlobUrl(fixedKey);

  const obsById = new Map(observations.map(o => [o.id, o]));
  const candidates = q.trim()
    ? observations.filter(o => !links.includes(o.id) && (obsLabel(o) + ' ' + o.asset).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  const save = async (then: 'close' | 'another' = 'close') => {
    if (!problem.trim()) return;
    setBusy(true);
    try {
      if (snag) {
        const u = update.trim();
        await updateSnag({ ...snag, problem: problem.trim(), proposedSolution: solution.trim() || undefined, status, owner: owner.trim() || undefined,
          dueAt: dueFromInput(due), latestUpdate: u || undefined,
          latestUpdateAt: u ? (u === snag.latestUpdate ? snag.latestUpdateAt : now()) : undefined,
          closeNote: closeNote.trim() || undefined, detailPhotoKey: photoKey, fixedPhotoKey: fixedKey, linkedObsIds: links.length ? links : undefined, closedAt: status === 'closed' ? (snag.closedAt ?? now()) : undefined });
      } else if (draft) {
        await addSnag({ id: uid(), workspaceId: wsId, assetId: asset.id, xPct: draft.xPct, yPct: draft.yPct, problem: problem.trim(), proposedSolution: solution.trim() || undefined, owner: owner.trim() || undefined, dueAt: dueFromInput(due), status: 'open', raisedAt: now(), updatedAt: now() });
      }
      if (then === 'another' && !snag) onSavedAndNext(); else onSaved();
    } finally { setBusy(false); }
  };
  /* ONE PROBLEM, ONE RECORD. The pin becomes a fix in the same spot, carrying
     what was written and the close-up; the pin is closed with a note saying
     where it went, never deleted — its photo is now the fix's too. */
  const makeFix = async () => {
    if (!snag || !jobId) return;
    setBusy(true);
    try {
      const t = now(), id = uid();
      const due = snag.dueAt ? new Date(snag.dueAt) : undefined;
      const iso = due ? `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}` : undefined;
      await putTest({
        id, projectId: jobId, kind: 'fix', outcome: 'planned',
        title: (snag.proposedSolution || snag.problem).trim(), passesIf: snag.problem.trim(),
        withWhom: snag.owner || undefined, plannedFor: iso,
        pin: { frameId: asset.id, x: snag.xPct ?? 50, y: snag.yPct ?? 50 },
        media: snag.detailPhotoKey ? [{ id: uid(), kind: 'photo', blobKey: snag.detailPhotoKey, mime: 'image/jpeg', capturedAt: snag.raisedAt }] : undefined,
        sort: t, createdAt: t, updatedAt: t,
      });
      await updateSnag({ ...snag, status: 'closed', closedAt: t, closeNote: 'Now a fix — on the Fixes screen.' });
      nav(`/project/${jobId}/testing/${encodeURIComponent(id)}`);
    } finally { setBusy(false); }
  };
  const remove = async () => { if (snag && window.confirm('Delete this? The photo and everything written about it go with it.')) { await deleteSnag(snag.id); onSaved(); } };
  const addPhoto = async (file: File) => { const key = `blob-${uid()}`; await putBlob(key, file); setPhotoKey(key); };
  const addFixed = async (file: File) => { const key = `blob-${uid()}`; await putBlob(key, file); setFixedKey(key); };

  return (
    <Sheet open onClose={onClose} title={snag ? 'Evidence' : 'New evidence'}>
      {still && pinAt && (
        <div className="snag-where">
          <div className="snag-where-img">
            <img src={still} alt="" />
            <span className="snag-where-pin" style={{ left: `${pinAt.xPct}%`, top: `${pinAt.yPct}%` }} aria-hidden />
          </div>
          <button className="btn btn-ghost snag-where-move" onClick={onMovePin}>
            Put the pin somewhere else
          </button>
        </div>
      )}
      <div className="field-label">Problem</div>
      <textarea className="text-area" autoFocus rows={2} value={problem} placeholder="What's wrong here?" onChange={e => setProblem(e.target.value)} />
      <div className="field-label" style={{ marginTop: 10 }}>Proposed solution <span className="opt">optional</span></div>
      <textarea className="text-area" rows={2} value={solution} placeholder="What would fix it?" onChange={e => setSolution(e.target.value)} />

      <div className="field-label" style={{ marginTop: 10 }}>Owner <span className="opt">who's on it — optional</span></div>
      {/* free text with the team as suggestions: assign a real teammate (they
          get a "Mine" view) or type an outside contractor's name — both valid */}
      <input className="text-input" value={owner} placeholder="Name or teammate" list="team-members"
        onChange={e => setOwner(e.target.value)} />
      <datalist id="team-members">
        {members.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
      </datalist>

      <div className="field-label" style={{ marginTop: 10 }}>Due <span className="opt">the promise — optional</span></div>
      <input className="text-input due-input" type="date" value={due} onChange={e => setDue(e.target.value)} />

      {snag && (<>
        <div className="field-label" style={{ marginTop: 10 }}>Latest update <span className="opt">what's happening — optional</span></div>
        <input className="text-input" value={update} maxLength={200} placeholder="e.g. Parts ordered, ETA Thursday"
          onChange={e => setUpdate(e.target.value)} />
      </>)}

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
            {/* the camera world's proof: the AFTER photo, next to the before-still */}
            <div className="field-label" style={{ marginTop: 10 }}>After photo <span className="opt">the proof it's fixed</span></div>
            <input ref={fixedRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void addFixed(f); }} />
            {fixedUrl ? <button className="mark-still-btn" onClick={() => fixedRef.current?.click()}><img className="mark-still" src={fixedUrl} alt="after — fixed" /></button>
              : <button className="btn" onClick={() => fixedRef.current?.click()}>📷 Add the after photo</button>}
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

      <div className="snag-editor-foot">
        <button className="btn btn-primary" onClick={() => void save('close')} disabled={busy || !problem.trim()}>
          {busy ? 'Saving…' : snag ? 'Save' : 'Add it'}
        </button>
        {/* A walk finds problems in threes, not ones. Without this you save,
            the sheet shuts, you hunt for the picture, tap it again and start
            over — which is the bit that feels like being trapped. */}
        {!snag && (
          <button className="btn" onClick={() => void save('another')} disabled={busy || !problem.trim()}>
            Add &amp; place another
          </button>
        )}
        {snag && jobId && snag.status !== 'closed' && (
          <button className="btn" onClick={() => void makeFix()} disabled={busy}>Make it a fix ›</button>
        )}
        {snag && <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={remove}>Delete</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

/** A problem seen on the frame, raised as a fix on the stage-gate job —
 *  what's wrong and, if known, what will fix it. Everything else (who, when,
 *  pictures) is filled on the fix itself, which opens straight after. */
function RaiseFix({ projectId, frameId, at, still, onClose }: {
  projectId: string; frameId: string; at: { xPct: number; yPct: number }; still: string | null; onClose: () => void;
}) {
  const [problem, setProblem] = useState('');
  const [fix, setFix] = useState('');
  const [busy, setBusy] = useState(false);
  const raise = async () => {
    if (!problem.trim() || busy) return;
    setBusy(true);
    try {
      const t = now(), id = uid();
      await putTest({
        id, projectId, kind: 'fix', outcome: 'planned',
        title: (fix || problem).trim(), passesIf: problem.trim(),
        pin: { frameId, x: at.xPct, y: at.yPct }, sort: t, createdAt: t, updatedAt: t,
      });
      nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="Raise a fix here">
      {still && (
        <div className="snag-where">
          <div className="otl-frame" style={{ cursor: 'default' }}>
            <img src={still} alt="" />
            <span className="otl-dot" style={{ left: `${at.xPct}%`, top: `${at.yPct}%` }} aria-hidden />
          </div>
          <p className="sub" style={{ marginTop: 6 }}>Wrong spot? Close this and tap the picture where it is.</p>
        </div>
      )}
      <div className="field-label">What's wrong here?</div>
      <textarea className="text-area" autoFocus rows={2} value={problem} placeholder="Film creases as the web enters the former" onChange={e => setProblem(e.target.value)} />
      <div className="field-label" style={{ marginTop: 10 }}>The fix <span className="opt">if you know it</span></div>
      <textarea className="text-area" rows={2} value={fix} placeholder="Re-align the roller" onChange={e => setFix(e.target.value)} />
      <div className="snag-editor-foot">
        <button className="btn btn-primary" onClick={() => void raise()} disabled={busy || !problem.trim()}>{busy ? 'Raising…' : 'Raise the fix'}</button>
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
