/* THE SNAGS PAGE — every quick snag, on every line, in one place, beside the
 * control room in the rail. Rowland, 6 October: "transfer these multiple snags
 * over to a project, transfer them as problems, same sort of multi-status,
 * completely adaptable, editable."
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
import { useAccessByJob } from '../ui/JobsBoard';
import { EvidenceThumb } from '../ui/Evidence';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';
import type { Project, Workspace } from '../types';
import { SNAG_STATUS_META, ageDays, type Snag, type SnagStatus } from './types';
import { isQuickSnag, sendSnags } from './quick';
import { openQuickSnag } from './QuickSnag';

type Filter = 'all' | SnagStatus;

const ago = (ms: number) => { const d = ageDays(ms); return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };

/** "Machine — Stage", the words a stage-gate job's stage goes by. */
const stageLabel = (t: Test, assets: Asset[]) => `${assets.find(a => a.id === t.assetId)?.name ?? 'The line'} — ${t.title}`;

export function QuickSnagsScreen() {
  const { projects } = useProjects();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [sentTo, setSentTo] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<Filter>('all');
  const [lineF, setLineF] = useState('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [all, ws] = await Promise.all([listAllSnags(), listWorkspaces()]);
    const q = all.filter(isQuickSnag).sort((a, b) => b.raisedAt - a.raisedAt);
    setSnags(q); setLines(ws);
    /* Where each sent one went, in the job's own words: "Line 2 — Filler —
       Mechanical install". Read off the job, so a renamed stage reads right. */
    const pids = [...new Set(q.flatMap(s => (s.sent ?? []).map(x => x.projectId)))];
    const m = new Map<string, string>();
    await Promise.all(pids.map(async pid => {
      const [tests, items, assets] = await Promise.all([listTests(pid), listTestItems(pid), listAssets(pid)]);
      for (const i of items) {
        const t = tests.find(x => x.id === i.testId);
        m.set(i.id, t ? stageLabel(t, assets) : 'the job');
      }
    }));
    setSentTo(m);
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const lineName = (id: string) => lines.find(w => w.id === id)?.name ?? 'A line';
  const projName = (id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined);

  const shown = (snags ?? []).filter(s => (filter === 'all' || s.status === filter) && (lineF === 'all' || s.workspaceId === lineF));
  const groups = useMemo(() => {
    const by = new Map<string, Snag[]>();
    for (const s of shown) by.set(s.workspaceId, [...(by.get(s.workspaceId) ?? []), s]);
    return [...by.entries()];
  }, [shown]);
  const count = (f: Filter) => (snags ?? []).filter(s => (f === 'all' || s.status === f) && (lineF === 'all' || s.workspaceId === lineF)).length;
  const onLines = [...new Set((snags ?? []).map(s => s.workspaceId))];

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
        <p className="sub">Every snag taken on the move, by line. Tap one to change it; tick several to send them to a job as problems.</p>
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
      {snags && snags.length > 0 && groups.length === 0 && <p className="sub">None here — try All.</p>}
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
                const sent = (s.sent ?? []).filter(x => sentTo.has(x.itemId));
                const thumb = s.media?.[0];
                return (
                  <li key={s.id} className={'qsl-row' + (picked.has(s.id) ? ' is-picked' : '')}>
                    <label className="qsl-tick">
                      <input type="checkbox" checked={picked.has(s.id)} onChange={e => toggle([s.id], e.target.checked)}
                        aria-label={`Tick: ${s.problem || 'snag'}`} />
                    </label>
                    <button type="button" className="qsl-open" onClick={() => openQuickSnag(s)}>
                      {thumb ? <EvidenceThumb media={thumb} size={52} still /> : <span className="qsl-nopic" aria-hidden><Icon name="camera" size={18} /></span>}
                      <span className="qsl-body">
                        <span className="qsl-what">{s.problem || <i className="sub">A picture, no words yet</i>}</span>
                        <span className="qsl-meta">
                          <b style={{ color: SNAG_STATUS_META[s.status].color }}>{SNAG_STATUS_META[s.status].label}</b>
                          {s.targetAsset && <> · {s.targetAsset}</>}
                          {projName(s.projectId) && <> · {projName(s.projectId)}</>}
                          {s.owner && <> · {s.owner}</>}
                          {' · '}{ago(s.raisedAt)}
                          {(s.media?.length ?? 0) > 1 && <> · {s.media?.length} pictures</>}
                        </span>
                        {sent.map(x => (
                          <span key={x.itemId} className="qsl-sent">Sent to {projName(x.projectId) ?? 'a job'} — {sentTo.get(x.itemId)}</span>
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {chosen.length > 0 && (
        <div className="qsl-bar" role="region" aria-label="Ticked snags">
          <span><b>{chosen.length}</b> ticked</span>
          <button type="button" className="btn" onClick={() => setPicked(new Set())}>Clear</button>
          <button type="button" className="btn btn-primary" onClick={() => setSending(true)}>Send to a project</button>
        </div>
      )}
      {sending && <SendSheet snags={chosen} projects={projects}
        onClose={() => setSending(false)} onSent={() => { setSending(false); setPicked(new Set()); }} />}
    </div>
  );
}

/** Which job, and which of its stages they were found on. */
function SendSheet({ snags, projects, onClose, onSent }: {
  snags: Snag[]; projects: Project[]; onClose: () => void; onSent: () => void;
}) {
  const accessOn = useAccessByJob(projects);
  /* A job you cannot change is not offered: the database would refuse it. */
  const mine = projects.filter(p => accessOn(p.id).edit);
  const gated = (p: Project) => planModel(p) === 'commissioning';
  const first = mine.find(p => gated(p) && snags.some(s => s.projectId === p.id)) ?? mine.find(gated);
  const [pid, setPid] = useState(first?.id ?? '');
  const [steps, setSteps] = useState<{ t: Test; label: string; machine?: string }[] | null>(null);
  const [step, setStep] = useState('');
  const [busy, setBusy] = useState(false);
  const machineOf = snags.find(s => s.targetAsset)?.targetAsset?.toLowerCase();

  useEffect(() => {
    let alive = true;
    setSteps(null); setStep('');
    if (!pid) return;
    void Promise.all([listTests(pid), listAssets(pid)]).then(([tests, assets]) => {
      if (!alive) return;
      const rows = live(tests).filter(t => t.kind === 'install')
        .map(t => ({ t, label: stageLabel(t, assets), machine: assets.find(a => a.id === t.assetId)?.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setSteps(rows);
      /* The snags' machine, when the job has a stage on a machine of that name. */
      setStep((machineOf && rows.find(r => r.machine?.toLowerCase() === machineOf)?.t.id) || rows[0]?.t.id || '');
    });
    return () => { alive = false; };
  }, [pid, machineOf]);

  const p = projects.find(x => x.id === pid);
  const send = async () => {
    if (!p || !step || busy) return;
    setBusy(true);
    try {
      const undo = await sendSnags(snags, p.id, step);
      offerUndo(`${snags.length} sent to ${p.name} as problems`, undo);
      onSent();
    } finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title={`Send ${snags.length} snag${snags.length === 1 ? '' : 's'} to a project`}>
      <div className="qs">
        <p className="sub">Each becomes a <b>problem</b> on the stage it was found on, with its words and pictures. They show on the job’s Fixes page under “Problems with no fix”, and on its client report.</p>
        <label className="cw-f cw-f-wide"><span>WHICH PROJECT</span>
          <select value={pid} onChange={e => setPid(e.target.value)}>
            <option value="" disabled>Pick a project</option>
            {mine.map(x => <option key={x.id} value={x.id} disabled={!gated(x)}>{x.name}{gated(x) ? '' : ' — stage-gate jobs for now'}</option>)}
          </select></label>
        {pid && steps && steps.length > 0 && (
          <label className="cw-f cw-f-wide"><span>FOUND ON WHICH STAGE</span>
            <select value={step} onChange={e => setStep(e.target.value)}>
              {steps.map(r => <option key={r.t.id} value={r.t.id}>{r.label}</option>)}
            </select></label>
        )}
        {pid && steps && steps.length === 0 && <p className="sub">This job has no install stages yet — add its machines and stages first.</p>}
        {mine.length === 0 && <p className="sub">There is no job you can add problems to.</p>}
        <div className="ax-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!p || !step || busy} onClick={() => void send()}>
            Send {snags.length} as problem{snags.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
