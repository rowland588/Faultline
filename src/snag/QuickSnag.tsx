/* THE SNAG BUTTON, AND THE SHEET IT OPENS — on every screen of the frame.
 *
 * Rowland, 6 October: "made for on the move: spot an issue … visible at all
 * times regardless." So the Snag button is in the top bar on a laptop and a
 * round button above the foot bar on a phone, and it opens one short sheet:
 * the pictures first (the camera is one tap — nothing grabs the keyboard),
 * then what is wrong, which line, which machine, which project. "Save and snag
 * another" keeps the line, machine and project and clears the rest, because
 * several snags on one line in a row is the point.
 *
 * The same sheet edits one from the Snags page (snag/QuickSnagsScreen):
 * status, whose, by when, the latest word — everything, always, closed or
 * sent. WHICH RECORD: a Snag (snag/quick). WHERE IT SHOWS: the Snags page,
 * the line's own Evidence list, and — once sent — the job's Fixes page and
 * client report as a problem.
 *
 * A PROBLEM FOR A PROJECT IS ASSIGNED, NEVER MOVED. On 8 October Save moved
 * it into the job (a fix, or an action on the board) and closed it here as
 * "Moved to <job>". Rowland, 12 October, after "Moved to Line 2A — a fix on
 * its Fixes page": "No idea what that is." So naming a project only says
 * which it is for: the problem stays on the Problems page with its journey,
 * "for" that project, and shows on the job's own view, where it is made a
 * fix in one tap when one is wanted. */
import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Evidence } from '../ui/EvidenceDoors';
import { EvidenceViewer, withPins } from '../ui/Evidence';
import { Icon } from '../ui/Icon';
import { offerUndo } from '../ui/Undo';
import { addSnag, patchSnag, listWorkspaces, allPaceLines } from '../db';
import { useMachinesOf } from '../lib/useLineRecords';
import { useProjects } from '../lib/useProjects';
import { useAccess } from '../cloud/access';
import { uid } from '../lib/ids';
import type { MediaRef, Workspace } from '../types';
import { SNAG_STATUS_META, dueFromInput, dueToInput, type Snag, type SnagStatus } from './types';
import { pinSnag, recall, remember } from './quick';
import { addLineToFactory, liveProductionLines } from '../lib/lines';
import { factoryLinesOf, type JobLine } from '../lib/lineRecords';

/* ---- one way in, from anywhere: the button, the FAB, a row on the page ---- */
type Opener = (s?: Snag) => void;
let opener: Opener | null = null;
export const openQuickSnag: Opener = s => opener?.(s);

/** MAY THIS PERSON TAKE A PROBLEM HERE? Inside a project only if they may
 *  change its work (lib/access can.edit): a client's rows are never sent
 *  (cloud/sync), so a problem a client saved stayed on their device alone,
 *  silently (docs/STRUCTURE.md §17, found 22 October). Off a project the
 *  database decides, as before. */
export function useCanTakeProblem(projectId?: string): boolean {
  const can = useAccess(projectId ?? '');
  return !projectId || can.edit;
}

export function QuickSnagButton({ projectId }: { projectId?: string }) {
  if (!useCanTakeProblem(projectId)) return null;
  return (
    <button type="button" className="btn btn-primary qs-top" onClick={() => openQuickSnag()}>
      <Icon name="camera" size="1.05em" />Problem
    </button>
  );
}

/** Mounted once, in the frame. Starts on the line and job you are in. */
export function QuickSnagHost({ wsId, projectId }: { wsId?: string; projectId?: string }) {
  const [open, setOpen] = useState<{ snag?: Snag; n: number } | null>(null);
  const may = useCanTakeProblem(projectId);
  useEffect(() => {
    opener = s => setOpen(o => ({ snag: s, n: (o?.n ?? 0) + 1 }));
    return () => { opener = null; };
  }, []);
  return (
    <>
      {may && <button type="button" className="qs-fab" onClick={() => openQuickSnag()} aria-label="Problem — spot an issue">
        <Icon name="camera" size={22} /><span>Problem</span>
      </button>}
      {open && <QuickSnagSheet key={open.n} snag={open.snag} wsId={wsId} projectId={projectId} onClose={() => setOpen(null)} />}
    </>
  );
}

const NEW_LINE = '__new__';
/** The line not said yet — a job on several lines asks which (FLOW-AUDIT #5). */
const ASK = '';

function QuickSnagSheet({ snag, wsId, projectId, onClose }: {
  snag?: Snag; wsId?: string; projectId?: string; onClose: () => void;
}) {
  const { projects } = useProjects();
  const [lines, setLines] = useState<Workspace[] | null>(null);
  const [media, setMedia] = useState<MediaRef[]>(snag?.media ?? []);
  const [words, setWords] = useState(snag?.problem ?? '');
  /* WHICH LINE — decided once the lines are read: its own; the line this page is on; THE JOB'S OWN LINE when a
     job is open, never the last line used (FLOW-AUDIT #5: "a problem taken inside Line 2 commissioning is filed on
     Line 7 ... the last line used, not the job's own line"), and asked when the job is on several; else the last used. */
  const [line, setLine] = useState<string>(snag?.workspaceId ?? ASK);
  const [linePicked, setLinePicked] = useState(!!snag);
  const [jobLines, setJobLines] = useState<JobLine[]>([]);
  const [newLine, setNewLine] = useState('');
  const [machine, setMachine] = useState(snag?.targetAsset ?? '');
  /* ITS PRIORITY — Critical · High · Low (lib/snagsReport); on a job it is the problem's flag there. */
  const [priority, setPriority] = useState<'critical' | 'high' | 'low'>(snag?.priority ?? 'low');
  const [project, setProject] = useState(snag ? (snag.projectId ?? '') : (projectId ?? recall('project')));
  const [status, setStatus] = useState<SnagStatus>(snag?.status ?? 'open');
  const [owner, setOwner] = useState(snag?.owner ?? '');
  const [due, setDue] = useState(dueToInput(snag?.dueAt));
  const [update, setUpdate] = useState(snag?.latestUpdate ?? '');
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);

  const ownLine = snag?.workspaceId;
  useEffect(() => {
    let live = true;
    void Promise.all([listWorkspaces(), allPaceLines()]).then(async ([all, pl]) => {
      /* the lines worked on now — an archived project's go with it (13 October audit); the problem's own line always kept */
      const keep = new Set((await liveProductionLines(all)).map(w => w.id));
      const ws = all.filter(w => keep.has(w.id) || w.id === ownLine);
      if (!live) return;
      setLines(ws); setJobLines(pl);
      const onFloor = (id?: string) => (id && ws.some(w => w.id === id) ? id : undefined);
      /* A remembered line that has gone is no line: the first one, or a new one. */
      const fallback = onFloor(recall('line')) ?? ws[0]?.id ?? NEW_LINE;
      if (ownLine) { setLine(l => onFloor(l) ?? fallback); return; }
      const theirs = factoryLinesOf(projectId ?? '', pl).filter(id => onFloor(id));
      setLine(onFloor(wsId) ?? (theirs.length === 1 ? theirs[0] : theirs.length > 1 ? ASK : undefined) ?? fallback);
    });
    return () => { live = false; };
  }, [ownLine, wsId, projectId]);
  /* the lines of the job it is for, on the floor — offered first, and asked for when there are several */
  const linesOfJob = (pid: string) => factoryLinesOf(pid, jobLines).filter(id => lines?.some(w => w.id === id));
  const theirs = project ? linesOfJob(project) : [];
  /* another job picked, the line not picked yet: that job's line, or asked */
  const pickProject = (pid: string) => {
    setProject(pid);
    if (snag || linePicked) return;
    const t = pid ? linesOfJob(pid) : [];
    const last = recall('line');
    if (t.length === 1) setLine(t[0]);
    else if (t.length > 1) setLine(ASK);
    else if (line === ASK) setLine(last && lines?.some(w => w.id === last) ? last : lines?.[0]?.id ?? NEW_LINE);
  };
  const pickLine = (id: string) => { setLine(id); setLinePicked(true); setMachine(''); };
  useEffect(() => { if (project && projects.length && !projects.some(p => p.id === project)) setProject(''); }, [projects, project]);
  /* THE MACHINES TO PICK FROM — the line's, in flow order, with the machines
     its jobs brought onto it, and the job's own when it is for one (lib/
     lineRecords machinesOf). Rowland, 12 October: "it doesn't show our
     current machines to pick from — they should"; flow audit #14: never
     another line's. */
  const lineMachines = useMachinesOf(line === NEW_LINE ? undefined : line, project || undefined);

  const ws = lines?.find(w => w.id === line);
  /* a project this person may only read takes no problem from them: said, and Save held */
  const mayForProject = useCanTakeProblem(project || undefined);
  const ready = mayForProject && (words.trim() || media.length > 0) && line !== ASK && (line !== NEW_LINE || newLine.trim()) && !busy;

  const save = async (another: boolean) => {
    if (!ready) return;
    setBusy(true);
    try {
      let workspaceId = line;
      if (line === NEW_LINE) {
        const w = await addLineToFactory(newLine.trim());   /* a new line goes into Your factory, at the end of the floor */
        workspaceId = w.id;
        setLines(ls => [w, ...(ls ?? [])]); setLine(w.id); setNewLine('');
      }
      const t = Date.now();
      const fields = {
        workspaceId, problem: words.trim(), media, targetAsset: machine.trim() || undefined, projectId: project || undefined, priority,
      };
      let kept: Snag;
      if (snag) {
        /* what this sheet shows, patched into the row as it is stored now — a journey step or a mark
           added elsewhere while it was open is kept (FLOW-AUDIT #4) */
        kept = await patchSnag(snag.id, cur => ({
          ...fields, status, owner: owner.trim() || undefined, dueAt: dueFromInput(due),
          latestUpdate: update.trim() || undefined,
          latestUpdateAt: update.trim() !== (cur.latestUpdate ?? '') ? t : cur.latestUpdateAt,
          closedAt: status === 'closed' ? (cur.closedAt ?? t) : undefined,
        })) ?? { ...snag, ...fields };
      } else {
        kept = { id: uid(), ...fields, status: 'open', raisedAt: t, updatedAt: t };
        await addSnag(kept);
      }
      remember('line', workspaceId); remember('project', project);
      if (another) { setWords(''); setMedia([]); setSaved(n => n + 1); } else onClose();
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!snag) return;
    await patchSnag(snag.id, { deletedAt: Date.now() });
    offerUndo('Problem deleted', async () => { await patchSnag(snag.id, { deletedAt: undefined }); });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={snag ? 'The problem' : 'Problem — spot an issue'}>
      <div className="qs">
        <Evidence media={media} kind="found" onView={setViewing}
          onAdd={async refs => { setMedia(m => [...m, ...refs]); }} />
        <label className="cw-f cw-f-wide"><span>WHAT’S WRONG</span>
          <textarea rows={2} value={words} maxLength={600} placeholder="e.g. Guard on the infeed conveyor is loose"
            onChange={e => setWords(e.target.value)} /></label>
        <div className="qs-row">
          <label className="cw-f"><span>LINE</span>
            <select value={line} onChange={e => pickLine(e.target.value)} aria-label="Which line">
              {line === ASK && <option value={ASK} disabled>Which line?</option>}
              {(lines ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              <option value={NEW_LINE}>A new line…</option>
            </select></label>
          <label className="cw-f"><span>PROJECT <i className="cw-f-opt">if it is for one</i></span>
            <select value={project} onChange={e => pickProject(e.target.value)} aria-label="Which project">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
        </div>
        {/* A JOB ON SEVERAL LINES ASKS WHICH — as it asks for the machine — its lines first */}
        {line === ASK && theirs.length > 1 && (
          <div className="qs-mach qs-ask" role="group" aria-label="Which of the project's lines">
            <span className="qs-l">{projects.find(p => p.id === project)?.name ?? 'The project'} is on {theirs.length} lines — which is it on?</span>
            <div className="chip-row">
              {theirs.map(id => <button key={id} type="button" className="chip" onClick={() => pickLine(id)}>{lines?.find(w => w.id === id)?.name}</button>)}
            </div>
          </div>
        )}
        {line === NEW_LINE && (
          <label className="cw-f cw-f-wide"><span>NAME THE LINE</span>
            <input value={newLine} maxLength={80} placeholder="e.g. Line 4" onChange={e => setNewLine(e.target.value)} /></label>
        )}
        {(() => {
          const seen = new Set<string>();
          const choices = lineMachines.filter(a => { const k = a.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
          const typed = !!machine && !choices.some(a => a.toLowerCase() === machine.trim().toLowerCase());
          return (
            <div className="qs-mach" role="group" aria-label="Which machine">
              <span className="qs-l">MACHINE <i className="cw-f-opt">if it is one</i></span>
              {choices.length > 0 && (
                <div className="chip-row">
                  {choices.map(a => (
                    <button key={a} type="button" className={'chip' + (machine.trim().toLowerCase() === a.toLowerCase() ? ' on' : '')} aria-pressed={machine.trim().toLowerCase() === a.toLowerCase()}
                      onClick={() => setMachine(m => (m.trim().toLowerCase() === a.toLowerCase() ? '' : a))}>{a}</button>
                  ))}
                </div>
              )}
              <input className="text-input qs-mach-other" value={typed ? machine : ''} maxLength={80} placeholder={choices.length ? 'Another machine…' : 'Which machine? e.g. Bagger'}
                aria-label="Another machine" onChange={e => setMachine(e.target.value)} />
            </div>
          );
        })()}
        <div className="qs-mach" role="group" aria-label="Priority">
          <span className="qs-l">PRIORITY</span>
          <div className="chip-row">
            {(['critical', 'high', 'low'] as const).map(k => (
              <button key={k} type="button" className={'chip qs-prio is-' + k + (priority === k ? ' on' : '')} aria-pressed={priority === k} onClick={() => setPriority(k)}>
                {k === 'critical' ? 'Critical' : k === 'high' ? 'High' : 'Low'}</button>
            ))}
          </div>
        </div>
        {snag && <>
          <div className="qs-mach" role="group" aria-label="Status">
            <span className="qs-l">STATUS</span>
            <div className="chip-row">
              {(Object.keys(SNAG_STATUS_META) as SnagStatus[]).map(k => (
                <button key={k} type="button" className={'chip qs-st' + (status === k ? ' on' : '')} aria-pressed={status === k}
                  style={status === k ? { background: SNAG_STATUS_META[k].color, borderColor: SNAG_STATUS_META[k].color } : undefined}
                  onClick={() => setStatus(k)}>{SNAG_STATUS_META[k].label}</button>
              ))}
            </div>
          </div>
          <div className="qs-row">
            <label className="cw-f"><span>WHOSE</span>
              <input value={owner} maxLength={60} placeholder="Name" onChange={e => setOwner(e.target.value)} /></label>
            <label className="cw-f"><span>BY WHEN</span>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} /></label>
          </div>
          <label className="cw-f cw-f-wide"><span>LATEST</span>
            <input value={update} maxLength={200} placeholder="What is happening with it" onChange={e => setUpdate(e.target.value)} /></label>
        </>}
        {!mayForProject && <p className="sub qs-ro" role="status">You can read {projects.find(p => p.id === project)?.name ?? 'this project'}; its problems are taken by its team.</p>}
        {saved > 0 && <p className="sub" role="status">Saved {saved} on {ws?.name ?? 'this line'} — take the next.</p>}
        <div className="ax-foot qs-foot">
          {snag
            ? <button type="button" className="btn qs-del" onClick={() => void remove()}>Delete</button>
            : <button type="button" className="btn" onClick={onClose}>{saved ? 'Done' : 'Cancel'}</button>}
          <span style={{ flex: 1 }} />
          {!snag && <button type="button" className="btn" disabled={!ready} onClick={() => void save(true)}>Save and take another</button>}
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => void save(false)}>Save</button>
        </div>
      </div>
      {/* Tap the picture where it is wrong, and say what (ui/Evidence): the
          marks are kept on the photo — at once on a snag already kept. */}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onPins={pins => { setMedia(m => withPins(m, viewing.id, pins)); if (snag) void pinSnag(snag.id, viewing.id, pins); }}
        onRemove={() => { setMedia(m => m.filter(x => x.id !== viewing.id)); setViewing(null); }} />}
    </Sheet>
  );
}
