/* THE SNAGS PAGE — every quick snag, on every line, in one place, beside the
 * control room in the rail. Rowland, 6 October: "transfer these multiple snags
 * over to a project, transfer them as problems, same sort of multi-status,
 * completely adaptable, editable."
 *
 * MOVED, NOT COPIED. Rowland, 8 October: "does it move from a snag and go to
 * the fix page, to keep things clean and transitional?" A snag moved to a job
 * (snag/quick) leaves the line's list of snags here and sits under "Moved to
 * jobs", saying what it became — a fix, a problem on a stage, an action — and
 * opening it, in the job, in one tap.
 *
 * Grouped by line, newest first. Tap one to change anything about it (the
 * same sheet that took it). Tick several — or a whole line — and send them to
 * a stage-gate job as problems on the stage they were found on (snag/quick
 * sendSnags); each then says where it went. Nothing is locked once closed or
 * sent. The pinned snags of the walk and the board's actions stay on the
 * line's own Evidence list; this page is the quick ones (snag/quick). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllSnags, listWorkspaces, listTests, listTestItems, listAssets, onDataChange } from '../db';
import { useProjects } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { live, type Asset, type Test } from '../lib/testing';
import { fixTone } from '../lib/fixTone';
import { listPaceTodos } from '../db';
import { nav } from '../state/useRoute';
import { openRecord } from '../ui/RecordDrawer';
import { useAccessByJob } from '../ui/JobsBoard';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';
import type { MediaRef, Project, Workspace } from '../types';
import { SNAG_STATUS_META, ageDays, type Snag, type SnagStatus } from './types';
import { isQuickSnag, moveSnagsToActions, pinSnag, sendSnags } from './quick';
import { openQuickSnag } from './QuickSnag';

type Filter = 'all' | SnagStatus;

const ago = (ms: number) => { const d = ageDays(ms); return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };

/** "Machine — Stage", the words a stage-gate job's stage goes by. */
const stageLabel = (t: Test, assets: Asset[]) => `${assets.find(a => a.id === t.assetId)?.name ?? 'The line'} — ${t.title}`;

/** Moved to a job: it has gone there, and that record is the live one. */
const isMoved = (s: Snag) => (s.sent ?? []).length > 0;

/** What a moved snag became, in words, and the door to it. */
interface Became { says: string; go: () => void }

export function QuickSnagsScreen() {
  const { projects } = useProjects();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [became, setBecame] = useState<Map<string, Became>>(new Map());
  const [filter, setFilter] = useState<Filter>('all');
  const [lineF, setLineF] = useState('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<{ snagId: string; media: MediaRef } | null>(null);

  const load = useCallback(async () => {
    const [all, ws] = await Promise.all([listAllSnags(), listWorkspaces()]);
    const q = all.filter(isQuickSnag).sort((a, b) => b.raisedAt - a.raisedAt);
    setSnags(q); setLines(ws);
    /* What each moved one became, read off the job — a renamed fix or stage
       reads right — and how it stands there now. */
    const pids = [...new Set(q.flatMap(s => (s.sent ?? []).map(x => x.projectId)))];
    const m = new Map<string, Became>();
    await Promise.all(pids.map(async pid => {
      const [tests, items, assets, todos] = await Promise.all([listTests(pid), listTestItems(pid), listAssets(pid), listPaceTodos(pid)]);
      for (const i of live(items)) {
        const t = tests.find(x => x.id === i.testId && x.kind !== 'fix');
        const fix = i.becameTestId ? tests.find(x => x.id === i.becameTestId && !x.deletedAt) : undefined;
        const flag = i.critical ? 'critical · ' : i.risk ? 'high risk · ' : '';
        m.set(i.id, fix
          ? { says: `a fix — ${flag}${(w => w.charAt(0).toLowerCase() + w.slice(1))(fixTone(fix).when)}`, go: () => openRecord(pid, fix.id) }
          : { says: `a problem on ${t ? stageLabel(t, assets) : 'the job'} — ${flag}${i.doneAt != null ? 'sorted' : 'open'}`, go: () => openRecord(pid, i.id) });
      }
      for (const a of todos) {
        m.set(a.id, { says: `an action on its board — ${a.state === 'done' ? 'done' : a.state === 'waiting' ? 'waiting' : 'to do'}`, go: () => nav(`/project/${pid}/board?a=${encodeURIComponent(a.id)}`) });
      }
    }));
    setBecame(m);
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const lineName = (id: string) => lines.find(w => w.id === id)?.name ?? 'A line';
  const projName = (id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined);

  /* Still snags, by line; and the ones moved to a job, on their own. */
  const here = (snags ?? []).filter(s => !isMoved(s));
  const gone = (snags ?? []).filter(isMoved);
  const shown = here.filter(s => (filter === 'all' || s.status === filter) && (lineF === 'all' || s.workspaceId === lineF));
  const groups = useMemo(() => {
    const by = new Map<string, Snag[]>();
    for (const s of shown) by.set(s.workspaceId, [...(by.get(s.workspaceId) ?? []), s]);
    return [...by.entries()];
  }, [shown]);
  const count = (f: Filter) => here.filter(s => (f === 'all' || s.status === f) && (lineF === 'all' || s.workspaceId === lineF)).length;
  const onLines = [...new Set(here.map(s => s.workspaceId))];

  const toggle = (ids: string[], on: boolean) => setPicked(p => {
    const n = new Set(p);
    for (const id of ids) { if (on) n.add(id); else n.delete(id); }
    return n;
  });
  const chosen = (snags ?? []).filter(s => picked.has(s.id));

  return (
    <div className="wrap qsl">
      <header className="pace-head">
        <h1>Snags</h1>
        <p className="sub">Every snag taken on the move, by line. Name a job on one, or tick several and move them: they go to the job as fixes (or, on a 6M job, actions) and leave this list.</p>
      </header>
      <div className="chip-row qsl-f" role="group" aria-label="Which">
        {(['all', 'open', 'in_progress', 'closed'] as Filter[]).map(f => (
          <button key={f} type="button" className={'chip' + (filter === f ? ' on' : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : SNAG_STATUS_META[f].label} · {count(f)}
          </button>
        ))}
      </div>
      {onLines.length > 1 && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className={'chip' + (lineF === 'all' ? ' on' : '')} onClick={() => setLineF('all')}>Every line</button>
          {onLines.map(id => (
            <button key={id} type="button" className={'chip' + (lineF === id ? ' on' : '')} onClick={() => setLineF(id)}>{lineName(id)}</button>
          ))}
        </div>
      )}
      {snags && snags.length === 0 && (
        <div className="qsl-empty">
          <p><b>No snags yet.</b> Spot something on a line — press <b>Snag</b>, take a picture, say what is wrong.</p>
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Snag</button>
        </div>
      )}
      {snags && snags.length > 0 && groups.length === 0 && <p className="sub">{here.length ? 'None here — try All.' : 'Every snag has moved to a job.'}</p>}
      {groups.map(([wsId, rows]) => {
        const all = rows.every(r => picked.has(r.id));
        return (
          <section key={wsId} className="qsl-g">
            <div className="qsl-gh">
              <label className="qsl-tick">
                <input type="checkbox" checked={all} onChange={e => toggle(rows.map(r => r.id), e.target.checked)}
                  aria-label={`Tick every snag on ${lineName(wsId)}`} />
              </label>
              <h2>{lineName(wsId)}</h2>
              <span className="sub">{rows.length} snag{rows.length === 1 ? '' : 's'}</span>
            </div>
            <ul className="qsl-rows">
              {rows.map(s => {
                const thumb = s.media?.[0];
                return (
                  <li key={s.id} className={'qsl-row' + (picked.has(s.id) ? ' is-picked' : '')}>
                    <label className="qsl-tick">
                      <input type="checkbox" checked={picked.has(s.id)} onChange={e => toggle([s.id], e.target.checked)}
                        aria-label={`Tick: ${s.problem || 'snag'}`} />
                    </label>
                    {/* THE PICTURE OPENS LARGE, to be pointed at (ui/Evidence):
                        tap where it is wrong and say what — kept at once.
                        The words beside it open the snag itself. */}
                    {thumb && <EvidenceThumb media={thumb} size={52} onClick={() => setViewing({ snagId: s.id, media: thumb })} />}
                    <button type="button" className="qsl-open" onClick={() => openQuickSnag(s)}>
                      {!thumb && <span className="qsl-nopic" aria-hidden><Icon name="camera" size={18} /></span>}
                      <span className="qsl-body">
                        <span className="qsl-what">{s.problem || <i className="sub">A picture, no words yet</i>}</span>
                        <span className="qsl-meta">
                          <b style={{ color: SNAG_STATUS_META[s.status].color }}>{SNAG_STATUS_META[s.status].label}</b>
                          {s.targetAsset && <> · {s.targetAsset}</>}
                          {/* Named for a job and not on it yet: said, so it is not
                              taken for being on the job's reports. */}
                          {projName(s.projectId) && <> · for {projName(s.projectId)} — not moved yet</>}
                          {s.owner && <> · {s.owner}</>}
                          {' · '}{ago(s.raisedAt)}
                          {(s.media?.length ?? 0) > 1 && <> · {s.media?.length} pictures</>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {/* MOVED TO JOBS — what each became, opened where it now lives. */}
      {gone.length > 0 && (
        <section className="qsl-g qsl-moved">
          <div className="qsl-gh"><h2>Moved to jobs</h2><span className="sub">{gone.length}</span></div>
          <ul className="qsl-rows">
            {gone.map(s => {
              const thumb = s.media?.[0];
              const to = (s.sent ?? []).map(x => ({ x, b: became.get(x.itemId) })).filter(r => r.b);
              const first = to[0];
              return (
                <li key={s.id} className="qsl-row">
                  {thumb && <EvidenceThumb media={thumb} size={52} onClick={() => setViewing({ snagId: s.id, media: thumb })} />}
                  <button type="button" className="qsl-open" disabled={!first} onClick={() => first?.b?.go()}>
                    {!thumb && <span className="qsl-nopic" aria-hidden><Icon name="camera" size={18} /></span>}
                    <span className="qsl-body">
                      <span className="qsl-what">{s.problem || <i className="sub">A picture, no words yet</i>}</span>
                      {to.length
                        ? to.map(({ x, b }) => <span key={x.itemId} className="qsl-meta">On <b>{projName(x.projectId) ?? 'a job'}</b> as {b?.says}</span>)
                        : <span className="qsl-meta">Moved to {projName(s.sent?.[0]?.projectId) ?? 'a job'} — no longer there</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {chosen.length > 0 && (
        <div className="qsl-bar" role="region" aria-label="Ticked snags">
          <span><b>{chosen.length}</b> ticked</span>
          <button type="button" className="btn" onClick={() => setPicked(new Set())}>Clear</button>
          <button type="button" className="btn btn-primary" onClick={() => setSending(true)}>Move to a job</button>
        </div>
      )}
      {viewing && <EvidenceViewer media={viewing.media} onClose={() => setViewing(null)}
        onPins={pins => void pinSnag(viewing.snagId, viewing.media.id, pins)} />}
      {sending && <SendSheet snags={chosen} projects={projects}
        onClose={() => setSending(false)} onSent={() => { setSending(false); setPicked(new Set()); }} />}
    </div>
  );
}

/** MOVE THEM TO A JOB — which job; for a stage-gate job, the stage they were
 *  found on (none is an answer), the flag, and fix or problem; for a 6M or
 *  lever-tree job, actions on its board (snag/quick). */
function SendSheet({ snags, projects, onClose, onSent }: {
  snags: Snag[]; projects: Project[]; onClose: () => void; onSent: () => void;
}) {
  const accessOn = useAccessByJob(projects);
  /* A job you cannot change is not offered: the database would refuse it. */
  const mine = projects.filter(p => accessOn(p.id).edit);
  const gated = (p: Project) => planModel(p) === 'commissioning';
  const first = mine.find(p => snags.some(s => s.projectId === p.id)) ?? mine.find(gated) ?? mine[0];
  const [pid, setPid] = useState(first?.id ?? '');
  const [steps, setSteps] = useState<{ t: Test; label: string; machine?: string }[] | null>(null);
  const [step, setStep] = useState('');
  const [busy, setBusy] = useState(false);
  const [flag, setFlag] = useState<'none' | 'risk' | 'critical'>('none');
  const [asFix, setAsFix] = useState(true);
  const machineOf = snags.find(s => s.targetAsset)?.targetAsset?.toLowerCase();
  const p = projects.find(x => x.id === pid);
  const isGated = !!p && gated(p);

  useEffect(() => {
    let alive = true;
    setSteps(null); setStep('');
    if (!pid || !isGated) return;
    void Promise.all([listTests(pid), listAssets(pid)]).then(([tests, assets]) => {
      if (!alive) return;
      const rows = live(tests).filter(t => t.kind === 'install')
        .map(t => ({ t, label: stageLabel(t, assets), machine: assets.find(a => a.id === t.assetId)?.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setSteps(rows);
      /* The snags' machine's stage, when the job has one of that name — else none. */
      setStep((machineOf && rows.find(r => r.machine?.toLowerCase() === machineOf)?.t.id) || '');
    });
    return () => { alive = false; };
  }, [pid, isGated, machineOf]);

  const n = snags.length;
  const send = async () => {
    if (!p || busy) return;
    setBusy(true);
    try {
      if (isGated) {
        const fix = asFix || !step;
        const undo = await sendSnags(snags, p.id, step || undefined, { ...(flag !== 'none' ? { flag } : {}), fix }, p.name);
        offerUndo(`${n} moved to ${p.name} — ${fix ? `${n === 1 ? 'a fix' : 'fixes'} on its Fixes page` : `${n === 1 ? 'a problem' : 'problems'} on its stage`}`, undo);
      } else {
        const undo = await moveSnagsToActions(snags, p.id, p.name);
        offerUndo(`${n} moved to ${p.name} — ${n === 1 ? 'an action' : 'actions'} on its board`, undo);
      }
      onSent();
    } finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title={`Move ${n} snag${n === 1 ? '' : 's'} to a job`}>
      <div className="qs">
        <label className="cw-f cw-f-wide"><span>WHICH JOB</span>
          <select value={pid} onChange={e => setPid(e.target.value)}>
            <option value="" disabled>Pick a job</option>
            {mine.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select></label>
        {isGated && <>
          {steps && steps.length > 0 && (
            <label className="cw-f cw-f-wide"><span>FOUND ON <i className="cw-f-opt">if it was a stage</i></span>
              <select value={step} onChange={e => setStep(e.target.value)}>
                <option value="">Not on a stage</option>
                {steps.map(r => <option key={r.t.id} value={r.t.id}>{r.label}</option>)}
              </select></label>
          )}
          <div className="qs-mach">
            <span className="qs-l">FLAG {n === 1 ? 'IT' : 'THEM'}</span>
            <div className="chip-row" role="group" aria-label="How serious is it?">
              {([['none', 'Not flagged'], ['risk', 'High risk'], ['critical', 'Critical']] as const).map(([k, w]) => (
                <button key={k} type="button" className={'chip' + (flag === k ? ' on' : '')} aria-pressed={flag === k} onClick={() => setFlag(k)}>{w}</button>
              ))}
            </div>
          </div>
          <label className="why-check"><input type="checkbox" checked={asFix || !step} disabled={!step} onChange={e => setAsFix(e.target.checked)} />
            <span>Make {n === 1 ? 'it a fix' : 'each a fix'}</span></label>
        </>}
        {p && !isGated && <p className="sub">{n === 1 ? 'It goes' : 'They go'} on {p.name}’s board as {n === 1 ? 'an action' : 'actions'}, with {n === 1 ? 'its' : 'their'} pictures.</p>}
        {mine.length === 0 && <p className="sub">There is no job you can change.</p>}
        <div className="ax-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!p || busy} onClick={() => void send()}>Move {n}</button>
        </div>
      </div>
    </Sheet>
  );
}
