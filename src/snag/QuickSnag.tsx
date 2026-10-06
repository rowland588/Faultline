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
 * client report as a problem. */
import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Evidence } from '../ui/EvidenceDoors';
import { EvidenceViewer } from '../ui/Evidence';
import { Icon } from '../ui/Icon';
import { offerUndo } from '../ui/Undo';
import { addSnag, updateSnag, listWorkspaces, createWorkspace } from '../db';
import { useProjects } from '../lib/useProjects';
import { uid } from '../lib/ids';
import type { MediaRef, Workspace } from '../types';
import { SNAG_STATUS_META, dueFromInput, dueToInput, type Snag, type SnagStatus } from './types';
import { recall, remember } from './quick';

/* ---- one way in, from anywhere: the button, the FAB, a row on the page ---- */
type Opener = (s?: Snag) => void;
let opener: Opener | null = null;
export const openQuickSnag: Opener = s => opener?.(s);

export function QuickSnagButton() {
  return (
    <button type="button" className="btn btn-primary qs-top" onClick={() => openQuickSnag()}>
      <Icon name="camera" size="1.05em" />Snag
    </button>
  );
}

/** Mounted once, in the frame. Starts on the line and job you are in. */
export function QuickSnagHost({ wsId, projectId }: { wsId?: string; projectId?: string }) {
  const [open, setOpen] = useState<{ snag?: Snag; n: number } | null>(null);
  useEffect(() => {
    opener = s => setOpen(o => ({ snag: s, n: (o?.n ?? 0) + 1 }));
    return () => { opener = null; };
  }, []);
  return (
    <>
      <button type="button" className="qs-fab" onClick={() => openQuickSnag()} aria-label="Snag — spot an issue">
        <Icon name="camera" size={22} /><span>Snag</span>
      </button>
      {open && <QuickSnagSheet key={open.n} snag={open.snag} wsId={wsId} projectId={projectId} onClose={() => setOpen(null)} />}
    </>
  );
}

const NEW_LINE = '__new__';

function QuickSnagSheet({ snag, wsId, projectId, onClose }: {
  snag?: Snag; wsId?: string; projectId?: string; onClose: () => void;
}) {
  const { projects } = useProjects();
  const [lines, setLines] = useState<Workspace[] | null>(null);
  const [media, setMedia] = useState<MediaRef[]>(snag?.media ?? []);
  const [words, setWords] = useState(snag?.problem ?? '');
  const [line, setLine] = useState(snag?.workspaceId ?? wsId ?? recall('line'));
  const [newLine, setNewLine] = useState('');
  const [machine, setMachine] = useState(snag?.targetAsset ?? '');
  const [project, setProject] = useState(snag ? (snag.projectId ?? '') : (projectId ?? recall('project')));
  const [status, setStatus] = useState<SnagStatus>(snag?.status ?? 'open');
  const [owner, setOwner] = useState(snag?.owner ?? '');
  const [due, setDue] = useState(dueToInput(snag?.dueAt));
  const [update, setUpdate] = useState(snag?.latestUpdate ?? '');
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);

  useEffect(() => {
    let live = true;
    void listWorkspaces().then(ws => {
      if (!live) return;
      setLines(ws);
      /* A remembered line that has gone is no line: the first one, or a new one. */
      setLine(l => (ws.some(w => w.id === l) ? l : ws[0]?.id ?? NEW_LINE));
    });
    return () => { live = false; };
  }, []);
  useEffect(() => { if (project && projects.length && !projects.some(p => p.id === project)) setProject(''); }, [projects, project]);

  const ws = lines?.find(w => w.id === line);
  const ready = (words.trim() || media.length > 0) && (line !== NEW_LINE || newLine.trim()) && !busy;

  const save = async (another: boolean) => {
    if (!ready) return;
    setBusy(true);
    try {
      let workspaceId = line;
      if (line === NEW_LINE) {
        const w = await createWorkspace(newLine.trim());
        workspaceId = w.id;
        setLines(ls => [w, ...(ls ?? [])]); setLine(w.id); setNewLine('');
      }
      const t = Date.now();
      const fields = {
        workspaceId, problem: words.trim(), media, targetAsset: machine || undefined, projectId: project || undefined,
      };
      if (snag) {
        await updateSnag({
          ...snag, ...fields, status, owner: owner.trim() || undefined, dueAt: dueFromInput(due),
          latestUpdate: update.trim() || undefined,
          latestUpdateAt: update.trim() !== (snag.latestUpdate ?? '') ? t : snag.latestUpdateAt,
          closedAt: status === 'closed' ? (snag.closedAt ?? t) : undefined,
        });
      } else {
        await addSnag({ id: uid(), ...fields, status: 'open', raisedAt: t, updatedAt: t });
      }
      remember('line', workspaceId); remember('project', project);
      if (another) { setWords(''); setMedia([]); setSaved(n => n + 1); } else onClose();
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!snag) return;
    await updateSnag({ ...snag, deletedAt: Date.now() });
    offerUndo('Snag deleted', async () => { await updateSnag({ ...snag, deletedAt: undefined }); });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={snag ? 'The snag' : 'Snag — spot an issue'}>
      <div className="qs">
        <Evidence media={media} kind="found" onView={setViewing}
          onAdd={async refs => { setMedia(m => [...m, ...refs]); }} />
        <label className="cw-f cw-f-wide"><span>WHAT’S WRONG</span>
          <textarea rows={2} value={words} maxLength={600} placeholder="e.g. Guard on the infeed conveyor is loose"
            onChange={e => setWords(e.target.value)} /></label>
        <div className="qs-row">
          <label className="cw-f"><span>LINE</span>
            <select value={line} onChange={e => { setLine(e.target.value); setMachine(''); }}>
              {(lines ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              <option value={NEW_LINE}>A new line…</option>
            </select></label>
          <label className="cw-f"><span>PROJECT <i className="cw-f-opt">if it is for one</i></span>
            <select value={project} onChange={e => setProject(e.target.value)}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
        </div>
        {line === NEW_LINE && (
          <label className="cw-f cw-f-wide"><span>NAME THE LINE</span>
            <input value={newLine} maxLength={80} placeholder="e.g. Line 4" onChange={e => setNewLine(e.target.value)} /></label>
        )}
        {ws && ws.assets.length > 0 && (
          <div className="qs-mach" role="group" aria-label="Which machine">
            <span className="qs-l">MACHINE <i className="cw-f-opt">if it is one</i></span>
            <div className="chip-row">
              {ws.assets.map(a => (
                <button key={a} type="button" className={'chip' + (machine === a ? ' on' : '')} aria-pressed={machine === a}
                  onClick={() => setMachine(m => (m === a ? '' : a))}>{a}</button>
              ))}
            </div>
          </div>
        )}
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
        {saved > 0 && <p className="sub" role="status">Saved {saved} on {ws?.name ?? 'this line'} — snag the next.</p>}
        <div className="ax-foot qs-foot">
          {snag
            ? <button type="button" className="btn qs-del" onClick={() => void remove()}>Delete</button>
            : <button type="button" className="btn" onClick={onClose}>{saved ? 'Done' : 'Cancel'}</button>}
          <span style={{ flex: 1 }} />
          {!snag && <button type="button" className="btn" disabled={!ready} onClick={() => void save(true)}>Save and snag another</button>}
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => void save(false)}>Save</button>
        </div>
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onRemove={() => { setMedia(m => m.filter(x => x.id !== viewing.id)); setViewing(null); }} />}
    </Sheet>
  );
}
