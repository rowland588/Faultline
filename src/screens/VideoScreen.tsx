/* VIDEO STUDY — footage of the line read for the work at each station,
 * reviewed by a person, worked out as a line balance and put on paper
 * (docs/VIDEO.md; lib/video).
 *
 * Rowland, 18 October: "allow a user to upload a production video, describe
 * the analysis they want in natural language, and receive a structured,
 * reviewable manufacturing study."
 *
 *   /video        every video study, and New: the footage, what is wanted in
 *                 words, the line and the job it is for
 *   /video/:id    one study — the footage and its facts; the stations in
 *                 view; the reading (its state kept on the record, resumed
 *                 when the page is opened again); the events to review on
 *                 the footage itself; the line balance worked out from what
 *                 was accepted; takt asked for; what it says, each line
 *                 saying how it is known; questions answered in words; the
 *                 report.
 *
 * The record is a line balance study (lib/study, tool `balance`) carrying the
 * footage in facts.video and the events in facts.vevents — so the Yamazumi,
 * the takt, a method's step and the line's page read it as the line balance
 * it is. The footage stays on the device it was taken on until the cloud
 * takes a study's footage (docs/VIDEO.md, blockers); everything else syncs. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteBlobs, getStudy, listAllStudies, onDataChange, patchStudy, putBlob, putStudy } from '../db';
import { deleteStudy } from '../db/studies';
import { useAccess } from '../cloud/access';
import { can as canOf } from '../lib/access';
import { uid, now } from '../lib/ids';
import { nav } from '../state/useRoute';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { useWho } from '../lib/flow/useFlow';
import type { ToolStudy } from '../lib/study';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { Legend, Stacks } from '../ui/WorkBalance';
import { AskingNote, useAsking, withFor } from '../ui/flow/Asking';
import { StudyProves } from '../ui/ProveProgram';
import { asked } from '../lib/lines';
import { probe, scanFootage } from '../lib/video/extract';
import { checkFootage, VIDEO_LIMITS } from '../lib/video/validate';
import { sampleInterval } from '../lib/video/detect';
import { newJob, STATE_WORD, working } from '../lib/video/job';
import { isRunning, resumeLeftJobs, runJob } from '../lib/video/runner';
import { readObjective, questionsFor, answer } from '../lib/video/ask';
import { assistLabeller } from '../lib/video/providers';
import { BASIS_WORD, EVENT_CATEGORIES, EVENT_WORD, FLAG_WORD, KIND_WORD, READING_VERSION, type EventCategory, type FootageScan, type VideoEvent, type VideoFacts, type VideoSource, type VideoStudyKind, type VideoZone, type Viewpoint } from '../lib/video/record';
import { KINDS, OBJECTIVES, READINESS_WORD, VIEWPOINTS } from '../lib/video/objectives';
import { capturePlan } from '../lib/video/capture';
import { assessFootage } from '../lib/video/assess';
import { FilmPlan, FitView } from '../ui/VideoFit';
import { byHand, decide, merge, reclassify, setBoundary, split, acceptAll } from '../lib/video/review';
import { clock, FINDING_WORD, findings, sec1, standing, videoFigures, type Basis } from '../lib/video/study';
import { checkEvent } from '../lib/video/validate';
import { footageGone, footageKeys, withoutFootage } from '../lib/video/footage';
import { useBlobSource } from '../lib/useBlobUrl';
import { useSyncStatus } from '../cloud/session';
import { backedUp } from '../cloud/sync';
import { cloudConfigured } from '../cloud/client';
import { CLOUD_FILE_LIMIT } from '../lib/transcode';

const OWNER = canOf('owner');
const TRACKS = ['Operator A', 'Operator B', 'Operator C', 'Operator D', 'Operator E', 'Operator F'];

/** Stations in view, left to right, each an equal band of the picture. */
export function bands(n: number, prev: readonly VideoZone[] = []): VideoZone[] {
  return Array.from({ length: n }, (_, i) => ({
    id: prev[i]?.id ?? `s${i + 1}`, label: prev[i]?.label ?? `Workstation ${i + 1}`, track: prev[i]?.track ?? TRACKS[i] ?? `Operator ${i + 1}`,
    x0: Math.round((i / n) * 1000) / 1000, x1: Math.round(((i + 1) / n) * 1000) / 1000, y0: prev[i]?.y0 ?? 0, y1: prev[i]?.y1 ?? 1,
  }));
}

const mb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;

function useStudies(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  useEffect(() => {
    const load = () => void listAllStudies().then(all => setList(all.filter(s => !s.deletedAt && !!s.facts.video).sort((a, b) => b.startedAt - a.startedAt)));
    load();
    return onDataChange(load);
  }, []);
  return list;
}

/* =============================================================== the list */
export function VideosScreen() {
  const list = useStudies();
  const lines = useFactoryLines();
  const { projects } = useProjects();
  /* opened on its New from a method's step done with the line balance (ui/flow/RunParts) */
  const [adding, setAdding] = useState(() => !!asked('add'));
  /* …or while this list is open: the page stays, so New is opened afresh — its line and its step read again */
  const [addKey, setAddKey] = useState(0);
  useEffect(() => {
    const on = () => { if (asked('add')) { setAddKey(k => k + 1); setAdding(true); } };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { if (list) void resumeLeftJobs(list); }, [list]);
  return (
    <div className="wrap vid-list">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1>Video studies</h1>
          <p className="sub">Film the line, say what you want to find out, and the app reads the footage for the work at each station. You review every piece it finds on the footage itself; the cycles, the line balance, takt and the report are worked out from what you accept.</p>
        </div>
        <div className="pace-head-actions"><button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>New video study</button></div>
      </header>
      {/* before a long study: whether the phone that would film it can (docs/VIDEO-FEASIBILITY.md) */}
      <p className="vck-door"><button type="button" className="linkish" onClick={() => nav('/video-check')}>Can this phone film a long study?</button> Try it here first: the camera read as it films, clips, a steady camera, the screen and the battery.</p>
      {list && !list.length && (
        <div className="qsl-empty">
          <p>No video studies yet. A minute or two of the line, filmed side-on with every station in view, is enough for a first one.</p>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>New video study</button>
        </div>
      )}
      {list && list.length > 0 && (
        <ul className="lt-rows">
          {list.map(s => {
            const v = s.facts.video as VideoSource;
            const f = videoFigures(v, s.facts.vevents ?? []);
            const st = standing(f);
            const line = lines.find(l => l.id === s.workspaceId), job = projects.find(p => p.id === s.projectId);
            return (
              <li key={s.id} className="lt-li" data-study={s.id}>
                <button type="button" className="lt-row" onClick={() => nav(`/video/${s.id}`)}>
                  <b className="lt-what">{s.name || v.facts.fileName}</b>
                  <span className={`lt-says ie-tone is-${working(v.job.state) || v.job.state === 'failed' ? (v.job.state === 'failed' ? 'r' : 'n') : st.tone}`}>{working(v.job.state) || v.job.state === 'failed' || v.job.state === 'uploaded' ? STATE_WORD[v.job.state] : st.text}</span>
                  <span className="lt-where">{v.kind ? KIND_WORD[v.kind] : 'Line balance'} · {clock(v.facts.durationSec)} of footage · {line ? line.name : 'on no line'}{job ? ` · ${job.name}` : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <NewVideoStudy key={addKey} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

const EXAMPLES = ['Analyse this video for line balance', 'Identify repeated cycles and calculate their durations', 'Review the longest observed waiting periods'];

function NewVideoStudy({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const [file, setFile] = useState<File | null>(null);
  const [facts, setFacts] = useState<Partial<VideoFacts> | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [objective, setObjective] = useState('');
  /* the study is chosen from what is to be found out (docs/VIDEO-DESIGN.md, D1): read
     from the words, or picked; it decides how to film it and what may be claimed */
  const [kindPick, setKindPick] = useState<VideoStudyKind | ''>('');
  const [cycle, setCycle] = useState('');
  const [view, setView] = useState<Viewpoint | ''>('');
  const [scan, setScan] = useState<FootageScan | null>(null);
  const [scanning, setScanning] = useState<'no' | 'yes' | 'failed'>('no');
  /* a video study is a line balance study: one made from a method's line
     balance step answers it, on that job's line (ui/flow/Asking) */
  const asking = useAsking('balance');
  const [lineId, setLineId] = useState(() => asked('line') ?? '');
  const [projectId, setProjectId] = useState(() => asking.ask?.ref.projectId ?? '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const read = readObjective(objective || 'line balance');
  const kind: VideoStudyKind = kindPick || read.kind;
  const cycleSec = Number(cycle) > 0 ? Number(cycle) : undefined;
  const plan = capturePlan(kind, { ...(cycleSec ? { cycleSec } : {}) });
  const fit = facts && !problems.length && facts.durationSec ? assessFootage({ kind, facts: facts as VideoFacts, zones: [], ...(view ? { view } : {}), ...(cycleSec ? { cycleHintSec: cycleSec } : {}), ...(scan ? { scan } : {}) }) : null;

  const pick = async (f: File | null) => {
    setFile(f); setFacts(null); setProblems([]); setScan(null); setScanning('no');
    if (!f) return;
    setReading(true);
    let dur = 0, fine = false;
    try {
      const p = await probe(f, f.name);
      setFacts(p.facts);
      const bad = [...(p.error ? [p.error] : []), ...checkFootage(p.facts).map(x => x.message)];
      setProblems(bad);
      dur = p.facts.durationSec ?? 0; fine = !bad.length && dur > 0;
      if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
    } finally { setReading(false); }
    /* a quick look at the light and the camera over a stretch, as it comes in — every frame is checked as it is read */
    if (!fine) return;
    setScanning('yes');
    try { setScan(await scanFootage(f, dur)); setScanning('no'); } catch (e) { console.warn('the quick look at the footage did not finish', e); setScanning('failed'); }
  };
  const ok = !!file && !!facts && !problems.length && !reading && !busy;
  const make = async () => {
    if (!ok || !file || !facts) return;
    setBusy(true);
    try {
      const t = now(), id = uid(), blobKey = `video-${uid()}`;
      await putBlob(blobKey, file);
      const full = facts as VideoFacts;
      const config = { sampleSec: sampleInterval(full.durationSec, full.fps, VIDEO_LIMITS.maxSamples), readWidth: 160, zones: bands(2), sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: READING_VERSION };
      const v: VideoSource = { media: { id: uid(), blobKey, mime: full.mime, capturedAt: file.lastModified || t }, facts: full, ...(objective.trim() ? { objective: objective.trim() } : {}), kind, job: newJob(config, t),
        ...(view ? { view } : {}), ...(cycleSec ? { cycleHintSec: cycleSec } : {}), ...(scan ? { scan } : {}) };
      const s: ToolStudy = { id, tool: 'balance', name: name.trim() || full.fileName, ...(lineId ? { workspaceId: lineId } : {}), ...(projectId ? { projectId } : {}),
        facts: { video: v, vevents: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t };
      await putStudy(s);
      const forStep = await asking.attach(id);
      onClose();
      nav(withFor(`/video/${id}`, forStep));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="New video study">
      <form className="lt-new vid-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        <AskingNote asking={asking} />
        <label className="field"><span className="field-label">What do you want to find out?</span>
          <textarea className="text-input" rows={3} value={objective} aria-label="What do you want to find out" placeholder="e.g. Analyse this video for line balance against takt" onChange={e => setObjective(e.target.value)} />
          <span className="chip-row">{EXAMPLES.map(x => <button key={x} type="button" className="chip" onClick={() => setObjective(x)}>{x}</button>)}</span>
          <span className="sub">{read.said}</span>
        </label>
        <div className="vfit-pick">
          <label className="field"><span className="field-label">The study</span>
            <select className="text-input" value={kindPick} aria-label="The study" onChange={e => setKindPick(e.target.value as VideoStudyKind | '')}>
              <option value="">{KIND_WORD[read.kind]} — from the words</option>
              {KINDS.map(k => <option key={k} value={k}>{KIND_WORD[k]} — {READINESS_WORD[OBJECTIVES[k].readiness].toLowerCase()}</option>)}
            </select>
          </label>
          {(OBJECTIVES[kind].minCycles ?? 0) > 0 && (
            <label className="field"><span className="field-label">One cycle takes about (seconds)</span>
              <input type="number" inputMode="decimal" min={0} step={0.5} className="text-input" value={cycle} aria-label="One cycle takes about" placeholder="If you know — to work out how long to film" onChange={e => setCycle(e.target.value)} />
            </label>
          )}
        </div>
        <FilmPlan p={plan} open={!file} key={file ? 'filmed' : 'planning'} />
        <label className="field"><span className="field-label">The footage</span>
          <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" aria-label="The footage" onChange={e => void pick(e.target.files?.[0] ?? null)} />
          <span className="sub">An MP4, MOV or WebM of up to {Math.round(VIDEO_LIMITS.maxDurationSec / 60)} minutes. It is read on this device; nothing is sent anywhere to read it.</span>
        </label>
        {reading && <p className="sub">Reading the file…</p>}
        {facts && !problems.length && (
          <p className="vid-facts" data-facts>{facts.fileName} — {clock(facts.durationSec ?? 0)} · {facts.width}×{facts.height}{facts.fps ? ` · ${facts.fps} frames a second` : ''} · {mb(facts.bytes ?? 0)}{facts.codec ? ` · ${facts.codec}` : ''}</p>
        )}
        {problems.length > 0 && <ul className="vid-problems" role="alert">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
        {facts && !problems.length && (
          <label className="field"><span className="field-label">Where was the phone?</span>
            <select className="text-input" value={view} aria-label="Where was the phone" onChange={e => setView(e.target.value as Viewpoint | '')}>
              <option value="">Not said</option>
              {(Object.keys(VIEWPOINTS) as Viewpoint[]).map(k => <option key={k} value={k}>{VIEWPOINTS[k].name}</option>)}
            </select>
          </label>
        )}
        {scanning === 'yes' && <p className="sub" role="status">Checking the camera and the light…</p>}
        {scanning === 'failed' && <p className="sub">The camera and the light could not be checked now — every frame is checked as it is read.</p>}
        {fit && scanning !== 'yes' && <section className="vid-fit-new" aria-label="Is this footage fit for the study"><FitView a={fit} /></section>}
        <label className="field"><span className="field-label">Which line</span>
          <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
            <option value="">No line yet</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="field"><span className="field-label">For a job?</span>
          <select className="text-input" value={projectId} aria-label="For a job" onChange={e => setProjectId(e.target.value)}>
            <option value="">No — a study on its own</option>
            {projects.filter(p => !p.deletedAt && !p.archivedAt).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field"><span className="field-label">Its name</span>
          <input className="text-input" value={name} maxLength={120} aria-label="Its name" onChange={e => setName(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ok}>{busy ? 'Saving…' : 'Start the study'}</button>
      </form>
    </Sheet>
  );
}

/* ============================================================== the study */
function useStudy(id: string): ToolStudy | null | undefined {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => void getStudy(id).then(x => { if (alive) setS(x && !x.deletedAt ? x : null); });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [id]);
  return s;
}

/* WHERE THE FOOTAGE IS, said beside its facts (lib/video/footage): on this
   device only, waiting to go up, in the cloud, or too big for the cloud — the
   sync's own record of each, never a guess. */
function useFootageWhere(s: ToolStudy, key: string | undefined, here: boolean): string {
  const status = useSyncStatus();
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!cloudConfigured || !key || !here) return;
    let alive = true;
    void backedUp('studies', s.id, s.updatedAt, [key]).then(b => { if (alive) setUp(b); });
    return () => { alive = false; };
  }, [s.id, s.updatedAt, key, here, status.lastSyncedAt]);
  if (!cloudConfigured) return 'kept on this device only';
  if (!here || !key) return '';
  if (status.tooBig?.some(t => t.key === key)) return `over the ${Math.round(CLOUD_FILE_LIMIT / 1048576)} MB the cloud takes, so on this device only — Backup can make it fit`;
  if (status.state === 'signedout') return 'on this device only — sign in to send it to the cloud';
  return up ? 'in the cloud — your other devices play it' : 'on this device, waiting to go up to the cloud';
}

export function VideoStudyScreen({ id }: { id: string }) {
  const s = useStudy(id);
  if (s === undefined) return <div className="wrap"><p className="sub">Opening…</p></div>;
  if (s === null || !s.facts.video) return (
    <div className="wrap"><h1>Not on this device</h1><p className="sub">This video study has not reached this device, or it was deleted.</p>
      <button type="button" className="btn" onClick={() => nav('/video')}>Every video study</button></div>
  );
  return <Study s={s} v={s.facts.video} />;
}

function Study({ s, v }: { s: ToolStudy; v: VideoSource }) {
  const jobCan = useAccess(s.projectId ?? '');
  const can = s.projectId ? jobCan : OWNER;
  const who = useWho();
  const me = { by: who, at: Date.now() };
  const { projects } = useProjects();
  const lines = useFactoryLines(s.workspaceId);
  const events = useMemo(() => s.facts.vevents ?? [], [s.facts.vevents]);
  const [basis, setBasis] = useState<Basis>('verified');
  const f = useMemo(() => videoFigures(v, events, basis), [v, events, basis]);
  const verified = useMemo(() => videoFigures(v, events, 'verified'), [v, events]);
  const st = standing(verified);
  const gone = footageGone(s.facts);
  /* the footage from this device, or fetched from the cloud when another device filmed it */
  const footage = useBlobSource(gone ? null : v.media.blobKey || null);
  const url = footage.url ?? undefined, missing = footage.state === 'missing';
  const where = useFootageWhere(s, gone ? undefined : v.media.blobKey, !!url);
  const player = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [said, setSaid] = useState<string | null>(null);
  const [withVision, setWithVision] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const [printing, setPrinting] = useState(false);
  const zones = v.job.config.zones;
  const job = v.job;
  const running = working(job.state);

  /* A JOB LEFT HALF-WAY — the tab closed or reloaded while it read — is taken
     up again here: checked every two seconds while it says it is reading and
     nothing on this device holds it (another tab reading it holds its lock) */
  useEffect(() => {
    if (!running || !url) return;
    const tick = () => { if (!isRunning(s.id) && Date.now() - job.updatedAt > 4000) void runJob(s.id); };
    tick();
    const h = setInterval(tick, 2000);
    return () => clearInterval(h);
  }, [running, s.id, job.updatedAt, url]);

  const patchV = (p: Partial<VideoSource>) => patchStudy(s.id, cur => ({ facts: { ...cur.facts, video: { ...(cur.facts.video as VideoSource), ...p } } }));
  const setEvents = (fn: (es: VideoEvent[]) => VideoEvent[] | { error: string }) => {
    let err: string | undefined;
    void patchStudy(s.id, cur => {
      const next = fn(cur.facts.vevents ?? []);
      if (!Array.isArray(next)) { err = next.error; return {}; }
      const bad = next.map(e => checkEvent(e, { durationSec: v.facts.durationSec, zones })).find(p => p.length);
      if (bad) { err = bad[0].message; return {}; }
      return { facts: { ...cur.facts, vevents: next } };
    }).then(() => setSaid(err ?? null));
  };
  const one = (eid: string, fn: (e: VideoEvent) => VideoEvent | { error: string }) =>
    setEvents(es => { const out: VideoEvent[] = []; for (const e of es) { if (e.id !== eid) { out.push(e); continue; } const x = fn(e); if ('error' in x) return x; out.push(x); } return out; });

  const go = (sec: number) => { const p = player.current; if (p) { p.currentTime = sec; setT(sec); } };
  const read = async () => {
    abort.current = new AbortController();
    setSaid(null);
    await runJob(s.id, { withVision, abort: abort.current.signal });
  };
  const report = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const { printVideoReport } = await import('../lib/video/printReport');
      setSaid(await printVideoReport(s.id, who));
    } catch (e) {
      console.error('video report failed', e);
      setSaid('Sorry — the report could not be made. Please try again.');
    } finally { setPrinting(false); }
  };
  const deleteFootage = async () => {
    if (!can.remove || !window.confirm('Delete the footage from this study? The events, the figures and the reports made from it are kept, and say the footage was deleted.')) return;
    /* this device's copy now; the name off the study, so the cloud lets nobody open it; the
       sender takes it out of the cloud and every device forgets it as it syncs (cloud/sync) */
    await deleteBlobs(footageKeys(s.facts).map(x => x.key));
    await patchStudy(s.id, cur => ({ facts: withoutFootage(cur.facts, Date.now(), who) }));
    setSaid(cloudConfigured
      ? 'The footage is deleted: gone from this device, nobody can open it from the cloud, and it goes from your other devices as they sync. What was found in it is kept.'
      : 'The footage is deleted from this device. What was found in it is kept.');
  };
  const removeStudy = async () => {
    if (!can.remove) return;
    const undo = await deleteStudy(s.id);
    offerUndo(`Deleted “${s.name}”`, undo);
    nav('/video');
  };

  const line = lines.find(l => l.id === s.workspaceId), job0 = projects.find(p => p.id === s.projectId);
  const kind: VideoStudyKind = v.kind ?? 'balance';
  const obj = OBJECTIVES[kind];
  const questions = questionsFor(kind, verified, { zones: zones.length, wantsTakt: (v.objective ?? '').toLowerCase().includes('takt') });
  /* IS THIS FOOTAGE FIT FOR THE STUDY? — from the quick look as it came in, then every frame read; once read, the cycles and the review too */
  const isRead = job.state === 'review' || job.state === 'reported';
  const fit = useMemo(() => assessFootage({ kind, facts: v.facts, zones, ...(v.view ? { view: v.view } : {}), ...(v.cycleHintSec ? { cycleHintSec: v.cycleHintSec } : {}),
    ...(v.scan ? { scan: v.scan } : {}), ...(v.quality ? { quality: v.quality } : {}), ...(isRead ? { figures: verified, events, read: true } : {}) }),
  [kind, v.facts, zones, v.view, v.cycleHintSec, v.scan, v.quality, isRead, verified, events]);
  const plan = capturePlan(kind, { stations: zones.length, ...((verified.bottleneck?.cycleTime?.mean ?? v.cycleHintSec) ? { cycleSec: verified.bottleneck?.cycleTime?.mean ?? v.cycleHintSec } : {}) });
  const figuresTitle = kind === 'balance' ? 'The line balance' : kind === 'cycles' ? 'The cycles at each box' : `${KIND_WORD[kind]} — read as movement at each box`;

  return (
    <div className="wrap vid-study" data-state={job.state}>
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="eyebrow">Video study · {v.kind ? KIND_WORD[v.kind] : 'Line balance'}</p>
          <h1>{s.name || v.facts.fileName}</h1>
          <p className="sub">{line ? line.name : 'On no line'}{job0 ? ` · for ${job0.name}` : ''} · <b className={`ie-tone is-${st.tone}`} data-standing>{st.text}</b></p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" disabled={printing || !events.length} onClick={() => void report()}>{printing ? 'Making…' : 'Report'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => nav('/video')}>Every video study</button>
        </div>
      </header>
      {said && <p className="vid-said" role="status">{said}</p>}

      {/* THE FOOTAGE — what it is, read from the file, and where it is */}
      <section className="vid-panel" aria-label="The footage">
        <div className="vid-player">
          {url ? (
            <video ref={player} src={url} controls muted playsInline preload="auto" aria-label="The footage" onTimeUpdate={e => setT((e.target as HTMLVideoElement).currentTime)} />
          ) : (
            <p className="vid-nofootage">{gone ? `The footage was deleted${gone.by ? ` by ${gone.by}` : ''} — what was found in it is kept.`
              : !missing ? 'Opening the footage…'
                : cloudConfigured ? `The footage is not on this device yet. It comes down from the cloud once the device that filmed it has sent it — a film over ${Math.round(CLOUD_FILE_LIMIT / 1048576)} MB waits on that device until its Backup makes it fit.`
                  : 'The footage is not on this device: without the cloud it stays on the device it was taken on. Open the study there to read or watch it.'}</p>
          )}
          {url && zones.length > 0 && <ZoneOverlay zones={zones} />}
        </div>
        <p className="sub vid-facts" data-facts>{v.facts.fileName} — {clock(v.facts.durationSec)} · {v.facts.width}×{v.facts.height}{v.facts.fps ? ` · ${v.facts.fps} frames a second` : ''} · {mb(v.facts.bytes)}{v.facts.codec ? ` · ${v.facts.codec}` : ''}{where ? ` · ${where}` : ''}</p>
        {v.objective && <p className="vid-objective"><span className="field-label">Asked for</span> “{v.objective}” — {readObjective(v.objective).said}</p>}
        {questions.length > 0 && <ul className="vid-questions" aria-label="What the study needs">{questions.map(q => <li key={q}>{q}</li>)}</ul>}
      </section>

      {/* IS THIS FOOTAGE FIT FOR THE STUDY? — the study, where the phone was, each check and what can be claimed (docs/VIDEO-DESIGN.md, D6) */}
      <section className="vid-panel vid-fit" aria-label="Is this footage fit for the study">
        <h2>Is this footage fit for the study?</h2>
        {can.edit && (
          <div className="vfit-pick">
            <label className="field"><span className="field-label">The study</span>
              <select className="text-input" value={kind} aria-label="The study" onChange={e => void patchV({ kind: e.target.value as VideoStudyKind })}>
                {KINDS.map(k => <option key={k} value={k}>{KIND_WORD[k]} — {READINESS_WORD[OBJECTIVES[k].readiness].toLowerCase()}</option>)}
              </select>
            </label>
            <label className="field"><span className="field-label">Where was the phone?</span>
              <select className="text-input" value={v.view ?? ''} aria-label="Where was the phone" onChange={e => void patchV({ view: (e.target.value || undefined) as Viewpoint | undefined })}>
                <option value="">Not said</option>
                {(Object.keys(VIEWPOINTS) as Viewpoint[]).map(k => <option key={k} value={k}>{VIEWPOINTS[k].name}</option>)}
              </select>
            </label>
          </div>
        )}
        <FitView a={fit} />
        {obj.meanwhile && obj.readiness !== 'measured' && <p className="sub vid-meanwhile">Meanwhile, by hand: <button type="button" className="linkish" onClick={() => nav(obj.meanwhile?.path ?? '/')}>{obj.meanwhile.tool}</button> — {obj.meanwhile.why}.</p>}
        <FilmPlan p={plan} />
      </section>

      {/* THE STATIONS IN VIEW and the reading */}
      <section className="vid-panel" aria-label="The reading">
        <h2>Stations in view, left to right</h2>
        <Stations zones={zones} disabled={!can.edit || running} onChange={z => void patchV({ job: { ...job, config: { ...job.config, zones: z } } })} />
        <details className="vid-settings">
          <summary>How the footage is read</summary>
          <p className="sub">A frame every {job.config.sampleSec} s, read {job.config.readWidth} pixels wide; work is movement more than {job.config.sensitivity} times the station’s own quiet spread, gaps under {job.config.joinGapSec} s joined, anything under {job.config.minEventSec} s left out. Reading {job.config.version}.</p>
          <label className="field"><span className="field-label">Sensitivity (lower finds more)</span>
            <input type="number" className="text-input" min={1.5} max={12} step={0.5} value={job.config.sensitivity} disabled={!can.edit || running} aria-label="Sensitivity"
              onChange={e => { const n = Number(e.target.value); if (n >= 1.5 && n <= 12) void patchV({ job: { ...job, config: { ...job.config, sensitivity: n } } }); }} /></label>
        </details>
        <label className="vid-vision"><input type="checkbox" checked={withVision} disabled={running} onChange={e => setWithVision(e.target.checked)} /> Name the work from the frames — {assistLabeller.sends}</label>
        <div className="vid-job" data-job={job.state}>
          <b className={job.state === 'failed' ? 'ie-tone is-r' : ''}>{STATE_WORD[job.state]}</b>
          {job.said && <span className="sub"> — {job.said}</span>}
          {running && <progress max={1} value={job.progress} aria-label="How far through" />}
          {job.state === 'failed' && job.error && <p className="ie-tone is-r" role="alert">{job.error}</p>}
          <div className="vid-job-acts">
            {can.edit && !running && url && <button type="button" className="btn btn-primary" onClick={() => void read()}>{job.state === 'uploaded' ? 'Read the footage' : job.state === 'failed' || job.state === 'cancelled' ? 'Try again' : 'Read it again'}</button>}
            {running && isRunning(s.id) && <button type="button" className="btn btn-ghost" onClick={() => abort.current?.abort()}>Stop</button>}
          </div>
        </div>
      </section>

      {/* REVIEW — every event on the footage, accepted, corrected or rejected */}
      {events.length > 0 && (
        <section className="vid-panel" aria-label="Review">
          <div className="vid-head">
            <h2>What was found — review it on the footage</h2>
            {can.edit && verified.candidates > 0 && <button type="button" className="btn btn-sm" onClick={() => setEvents(es => acceptAll(es, me))}>Accept every one still to review</button>}
          </div>
          <p className="sub">Each piece of work is a candidate until you accept it. Play to a moment and set a start or an end there, change what it is, merge, split or reject it. Only what is accepted is counted.</p>
          <Timeline zones={zones} events={events} durationSec={v.facts.durationSec} t={t} onPick={go} />
          <ul className="vid-events" aria-label="Events">
            {events.map((e, i) => {
              const z = zones.find(x => x.id === e.zone);
              const next = events.slice(i + 1).find(x => x.zone === e.zone);
              return (
                <li key={e.id} className={`vid-ev is-${e.review}`} data-event={e.id} data-review={e.review}>
                  <button type="button" className="vid-ev-t linkish" onClick={() => go(e.start)} aria-label={`Play from ${clock(e.start)}`}>{clock(e.start)}–{clock(e.end)}</button>
                  <span className="vid-ev-z">{z?.label ?? e.zone}{e.track ? ` · ${e.track}` : ''}</span>
                  <span className="vid-ev-w">
                    {can.edit ? (
                      <select value={e.category} aria-label="What it is" onChange={x => one(e.id, y => reclassify(y, { category: x.target.value as EventCategory }, me))}>
                        {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{EVENT_WORD[c]}</option>)}
                      </select>
                    ) : <b>{EVENT_WORD[e.category]}</b>}
                    <span className="sub"> {sec1(e.end - e.start)} · seen: {e.observed}{e.inferred ? ` · believed: ${e.inferred}` : ''}</span>
                  </span>
                  <span className="vid-ev-how sub">{BASIS_WORD[e.basis]}{e.basis !== 'person' ? `, ${Math.round(e.confidence * 100)}% sure` : ''} · each end ±{(e.pm ?? job.config.sampleSec / 2).toFixed(2)} s{e.provenance.model ? ` · named by the assistant` : ''}{e.proposed ? ` · corrected from ${clock(e.proposed.start)}–${clock(e.proposed.end)}` : ''}{e.flags?.length ? <span className="vid-ev-flag" data-flags={e.flags.join(' ')}> · {e.flags.map(x => FLAG_WORD[x]).join(', ')} — check it on the footage</span> : null}</span>
                  <span className="vid-ev-state"><b>{e.review === 'candidate' ? 'To review' : e.review === 'accepted' ? `Accepted${e.by ? ` by ${e.by}` : ''}` : 'Rejected'}</b></span>
                  {can.edit && (
                    <span className="vid-ev-acts">
                      {e.review !== 'accepted' && <button type="button" className="btn btn-sm" onClick={() => one(e.id, y => decide(y, 'accepted', me))}>Accept</button>}
                      {e.review !== 'rejected' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => one(e.id, y => decide(y, 'rejected', me))}>Reject</button>}
                      <button type="button" className="btn btn-sm btn-ghost" disabled={!url} onClick={() => one(e.id, y => setBoundary(y, 'start', t, me))}>Start here ({clock(t)})</button>
                      <button type="button" className="btn btn-sm btn-ghost" disabled={!url} onClick={() => one(e.id, y => setBoundary(y, 'end', t, me))}>End here</button>
                      <button type="button" className="btn btn-sm btn-ghost" disabled={!url || !(t > e.start && t < e.end)} onClick={() => setEvents(es => { const r = split(e, t, `${e.id}-${uid().slice(0, 4)}`, me); if ('error' in r) return r; return es.flatMap(x => (x.id === e.id ? r : [x])); })}>Split here</button>
                      {next && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEvents(es => { const m = merge(e, next, me); if ('error' in m) return m; return es.filter(x => x.id !== next.id).map(x => (x.id === e.id ? m : x)); })}>Merge with the next</button>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {can.edit && url && (
            <div className="vid-add">
              <span className="sub">Seen something it missed? At {clock(t)}:</span>
              {zones.map(z => (
                <button key={z.id} type="button" className="btn btn-sm btn-ghost" onClick={() => setEvents(es => [...es, byHand({ id: `p-${uid()}`, start: t, end: Math.min(v.facts.durationSec, t + 2), zone: z.id, track: z.track, category: 'work' }, me)].sort((a, b) => a.start - b.start))}>Add work at {z.label}</button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* THE LINE BALANCE, worked out from what was accepted */}
      {events.length > 0 && (
        <section className="vid-panel" aria-label="The line balance">
          <div className="vid-head">
            <h2>{figuresTitle}</h2>
            <div className="chip-row" role="group" aria-label="Counted from">
              <button type="button" className={`chip${basis === 'verified' ? ' on' : ''}`} aria-pressed={basis === 'verified'} onClick={() => setBasis('verified')}>Accepted only</button>
              <button type="button" className={`chip${basis === 'provisional' ? ' on' : ''}`} aria-pressed={basis === 'provisional'} onClick={() => setBasis('provisional')}>With those to review (provisional)</button>
            </div>
          </div>
          <p className="sub">{basis === 'verified' ? `Worked out from the ${f.accepted} accepted event${f.accepted === 1 ? '' : 's'}.` : `Provisional — the ${f.candidates} still to review are counted as if accepted.`}{obj.readiness !== 'measured' ? ` Faultline ${obj.readiness === 'partly' ? 'measures only part of' : 'does not measure'} ${KIND_WORD[kind].toLowerCase()} from footage yet: below is the movement in each box, worked out as stations.` : ''}</p>
          <table className="vid-table" aria-label="Each station">
            <thead><tr><th>Station</th><th>Work a cycle</th><th>Cycles</th><th>Range</th><th>A cycle every</th><th>No movement between</th><th>Working</th></tr></thead>
            <tbody>
              {f.stations.map(x => (
                <tr key={x.zone.id} data-station={x.zone.id}>
                  <td><b>{x.zone.label}</b><br /><span className="sub">{x.zone.track}</span></td>
                  <td>{x.workTime ? sec1(x.workTime.mean) : '—'}{x.workTime ? <span className="sub" title="The larger of its 95% interval and the reading’s own ± on a length"> ±{Math.max(x.workTime.ci95 ?? 0, x.pm).toFixed(1)}</span> : null}{x.workTime ? <span className="sub"> · median {sec1(x.workTime.median)}</span> : null}</td>
                  <td>{x.workTime?.n ?? 0}{x.workTime && x.needed && !x.enough ? <span className="ie-tone is-a"> of {x.needed} needed</span> : null}{x.partial.length ? <span className="sub"> + {x.partial.length} cut off</span> : null}</td>
                  <td>{x.workTime ? `${x.workTime.min.toFixed(1)}–${x.workTime.max.toFixed(1)} s` : '—'}</td>
                  <td>{x.cycleTime ? sec1(x.cycleTime.mean) : '—'}</td>
                  <td>{x.waitTime ? sec1(x.waitTime.mean) : '—'}</td>
                  <td>{x.utilisation !== undefined ? `${Math.round(x.utilisation * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Workload f={f} />
          {f.takt && f.balance.people.some(p => p.work > 0) && (
            <div className="vid-stacks" aria-label="Each person's work stacked against takt"><Stacks f={f.balance} /><Legend f={f.balance} /></div>
          )}
          <Takt v={v} disabled={!can.edit} onSave={d => void patchV({ demand: d })} />
          <h3>What it says</h3>
          <ul className="vid-findings" aria-label="What it says">
            {findings(f).map((x, i) => <li key={i} className={`is-${x.kind}`} data-kind={x.kind}><span className="field-label">{FINDING_WORD[x.kind]}</span> <span className={x.tone !== 'n' ? `ie-tone is-${x.tone}` : ''}>{x.text}</span></li>)}
          </ul>
          <Ask f={f} />
        </section>
      )}

      {/* WHERE IT SITS, and taking it away */}
      <section className="vid-panel vid-where" aria-label="Where it sits">
        {/* the program it was named as proof of, as on every study's page (ui/StudyPlace) */}
        <StudyProves s={s} />
        {can.edit && (
          <label className="field"><span className="field-label">For a job</span>
            <select className="text-input" value={s.projectId ?? ''} aria-label="Put it on a job" onChange={e => void patchStudy(s.id, { projectId: e.target.value || undefined })}>
              <option value="">No — a study on its own</option>
              {projects.filter(p => !p.deletedAt && !p.archivedAt).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {v.reports?.length ? <p className="sub">Reports made: {v.reports.map(r => `${new Date(r.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${r.accepted} accepted${r.candidates ? `, ${r.candidates} to review` : ''})`).join(' · ')}</p> : null}
        <div className="vid-job-acts">
          {can.remove && !gone && <button type="button" className="btn btn-ghost" onClick={() => void deleteFootage()}>Delete the footage</button>}
          {can.remove && <button type="button" className="btn btn-ghost" onClick={() => void removeStudy()}>Delete the study</button>}
        </div>
      </section>
    </div>
  );
}

/** EACH STATION'S WORKLOAD — its work a cycle and its time with no movement between, side
 *  by side, the slowest darkest; takt drawn across when it is known. Shown as
 *  soon as one station is timed, takt or not (the line balance's own stacks
 *  follow once takt is given). */
function Workload({ f }: { f: ReturnType<typeof videoFigures> }) {
  const ss = f.stations.filter(s => s.workTime);
  if (!ss.length) return null;
  const W = 560, H = 190, L = 34, B = 34, T = 12;
  const most = Math.max(...ss.map(s => (s.workTime?.mean ?? 0) + (s.waitTime?.mean ?? 0)), f.takt ?? 0) * 1.12;
  const y = (v: number) => T + (1 - v / most) * (H - T - B);
  const col = (W - L - 8) / ss.length, bw = Math.min(64, col * 0.6);
  return (
    <svg className="vid-load" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each station's work and time with no movement in a cycle">
      {[0, 0.25, 0.5, 0.75, 1].map(k => <g key={k}><line x1={L} x2={W - 4} y1={y(most * k)} y2={y(most * k)} className="vid-load-grid" /><text x={L - 4} y={y(most * k) + 3} className="vid-load-ax">{(most * k).toFixed(0)} s</text></g>)}
      {ss.map((s, i) => {
        const x = L + 4 + i * col + (col - bw) / 2, work = s.workTime?.mean ?? 0, wait = s.waitTime?.mean ?? 0;
        return (
          <g key={s.zone.id} data-station={s.zone.id}>
            <rect x={x} y={y(work)} width={bw} height={y(0) - y(work)} className={`vid-load-work${s === f.bottleneck ? ' is-most' : ''}`} />
            {wait > 0 && <rect x={x} y={y(work + wait)} width={bw} height={y(work) - y(work + wait)} className="vid-load-wait" />}
            <text x={x + bw / 2} y={y(work) - 4} className="vid-load-v">{sec1(work)}</text>
            <text x={x + bw / 2} y={H - B + 14} className="vid-load-l">{s.zone.label}</text>
            <text x={x + bw / 2} y={H - B + 26} className="vid-load-s">{s.zone.track}</text>
          </g>
        );
      })}
      {f.takt && <g><line x1={L} x2={W - 4} y1={y(f.takt)} y2={y(f.takt)} className="vid-load-takt" /><text x={W - 6} y={y(f.takt) - 4} className="vid-load-tl">takt {sec1(f.takt)}</text></g>}
    </svg>
  );
}

/** The stations drawn over the footage, so what is read is what is seen. */
function ZoneOverlay({ zones }: { zones: readonly VideoZone[] }) {
  return (
    <div className="vid-zones" aria-hidden>
      {zones.map(z => (
        <span key={z.id} className="vid-zone" style={{ left: `${z.x0 * 100}%`, width: `${(z.x1 - z.x0) * 100}%`, top: `${z.y0 * 100}%`, height: `${(z.y1 - z.y0) * 100}%` }}>
          <i>{z.label}</i>
        </span>
      ))}
    </div>
  );
}

/** How many stations, their names and who works there, and where each one ends. */
function Stations({ zones, disabled, onChange }: { zones: readonly VideoZone[]; disabled: boolean; onChange: (z: VideoZone[]) => void }) {
  const setN = (n: number) => onChange(bands(n, zones));
  const edge = (i: number, x: number) => {
    const next = zones.map(z => ({ ...z }));
    const lo = next[i].x0 + 0.02, hi = next[i + 1].x1 - 0.02;
    const v = Math.max(lo, Math.min(hi, x));
    next[i].x1 = v; next[i + 1].x0 = v;
    onChange(next);
  };
  return (
    <div className="vid-stations">
      <label className="field"><span className="field-label">How many stations are in view?</span>
        <select className="text-input" value={zones.length} disabled={disabled} aria-label="How many stations are in view" onChange={e => setN(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <ul className="vid-zone-rows">
        {zones.map((z, i) => (
          <li key={z.id} data-zone={z.id}>
            <input className="text-input" value={z.label} disabled={disabled} aria-label={`Station ${i + 1} name`} onChange={e => onChange(zones.map(x => (x.id === z.id ? { ...x, label: e.target.value } : x)))} />
            <input className="text-input" value={z.track} disabled={disabled} aria-label={`Station ${i + 1} worker`} onChange={e => onChange(zones.map(x => (x.id === z.id ? { ...x, track: e.target.value } : x)))} />
            {i < zones.length - 1 && (
              <label className="sub">ends at <input type="range" min={0} max={100} value={Math.round(z.x1 * 100)} disabled={disabled} aria-label={`Where station ${i + 1} ends`} onChange={e => edge(i, Number(e.target.value) / 100)} /> {Math.round(z.x1 * 100)}% across</label>
            )}
          </li>
        ))}
      </ul>
      <p className="sub">A station is a place in the picture; who works there is a label like Operator A — never a name. Nobody is recognised by face.</p>
    </div>
  );
}

/** Every event on a lane of its station, the playhead across them; a tap plays from there. */
function Timeline({ zones, events, durationSec, t, onPick }: { zones: readonly VideoZone[]; events: readonly VideoEvent[]; durationSec: number; t: number; onPick: (s: number) => void }) {
  const pc = (x: number) => `${(x / Math.max(0.001, durationSec)) * 100}%`;
  return (
    <div className="vid-tl" aria-label="The events on the footage's timeline">
      {zones.map(z => (
        <div key={z.id} className="vid-lane">
          <span className="vid-lane-l">{z.label}</span>
          <div className="vid-lane-t">
            {events.filter(e => e.zone === z.id).map(e => (
              <button key={e.id} type="button" className={`vid-bar is-${e.review}`} style={{ left: pc(e.start), width: pc(e.end - e.start) }} title={`${clock(e.start)}–${clock(e.end)} ${EVENT_WORD[e.category]}`} aria-label={`${z.label} ${clock(e.start)} to ${clock(e.end)}`} onClick={() => onPick(e.start)} />
            ))}
            <span className="vid-head-line" style={{ left: pc(t) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** TAKT, ASKED FOR — the demand and the minutes to make it in. */
function Takt({ v, disabled, onSave }: { v: VideoSource; disabled: boolean; onSave: (d: VideoSource['demand']) => void }) {
  const [units, setUnits] = useState(v.demand?.units ? String(v.demand.units) : '');
  const [minutes, setMinutes] = useState(v.demand?.availableMin ? String(v.demand.availableMin) : '');
  const [unit, setUnit] = useState(v.demand?.unit ?? 'packs');
  const [per, setPer] = useState<'shift' | 'day'>(v.demand?.per ?? 'shift');
  const save = () => {
    const u = Number(units), m = Number(minutes);
    onSave(u > 0 && m > 0 ? { units: u, unit: unit.trim() || 'units', availableMin: m, per } : undefined);
  };
  return (
    <form className="vid-takt" onSubmit={e => { e.preventDefault(); save(); }} aria-label="Takt">
      <span className="field-label">Takt — the demand and the time to make it</span>
      <input className="text-input" inputMode="numeric" value={units} disabled={disabled} aria-label="How many to make" placeholder="480" onChange={e => setUnits(e.target.value)} />
      <input className="text-input" value={unit} disabled={disabled} aria-label="Of what" onChange={e => setUnit(e.target.value)} />
      <span className="sub">in</span>
      <input className="text-input" inputMode="numeric" value={minutes} disabled={disabled} aria-label="Minutes to make them in" placeholder="450" onChange={e => setMinutes(e.target.value)} />
      <span className="sub">minutes a</span>
      <select value={per} disabled={disabled} aria-label="A shift or a day" onChange={e => setPer(e.target.value as 'shift' | 'day')}><option value="shift">shift</option><option value="day">day</option></select>
      {!disabled && <button type="submit" className="btn btn-sm">Work out takt</button>}
    </form>
  );
}

/** ASKED IN WORDS — answered from the figures, said how it is known. */
function Ask({ f }: { f: ReturnType<typeof videoFigures> }) {
  const [q, setQ] = useState('');
  const [a, setA] = useState<{ text: string; how: string } | null>(null);
  const ask = useCallback((x: string) => {
    const r = answer(x, f);
    setA(r ?? { how: 'not known', text: 'The app answers about the cycles, the gaps with no movement, takt, the bottleneck, what is still needed and the report. Ask about one of those.' });
  }, [f]);
  return (
    <div className="vid-ask">
      <form onSubmit={e => { e.preventDefault(); ask(q); }}>
        <input className="text-input" value={q} aria-label="Ask about this study" placeholder="e.g. What else do you need to work out takt?" onChange={e => setQ(e.target.value)} />
        <button type="submit" className="btn btn-sm">Ask</button>
      </form>
      <span className="chip-row">{['Identify repeated cycles', 'Show the longest gaps with no movement', 'What do you need to calculate takt?', 'Which station contributes most?'].map(x => <button key={x} type="button" className="chip" onClick={() => { setQ(x); ask(x); }}>{x}</button>)}</span>
      {a && <p className="vid-answer" data-how={a.how}>{a.text} <span className="sub">— {a.how === 'worked out' ? 'worked out by the app from the study' : 'not known yet'}</span></p>}
    </div>
  );
}
