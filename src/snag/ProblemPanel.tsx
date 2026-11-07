/* A PROBLEM IN THE PANEL — opened over the page you are on (docs/ENTERPRISE-UX.md X3, 7 November — the record panel: "its fields
 * editable in place, its linked records, its journey; opened from every list"). Before, a problem tapped on a line's tracker, the
 * Factory's Needs you now or Actions took you away to Problems and its filters; now it opens here, in the one drawer every record
 * wears (ui/DrawerShell — a panel from the right at a desk, a sheet from the bottom on a phone), and × puts you back where you were.
 *
 * NO NEW RECORD, NO SECOND FORM OF ITS OWN WORDS: the boxes are the problem's own fields, written through the same calls the
 * register and the tracker use (patchSnag, setSnagsStatus), so the register, the tracker, its Gantt and every paper read the
 * same thing. What only the full editor holds — the pictures, its cost, the waste, the program, its journey's steps, closing it
 * with what shows it is fixed — is one tap away: *Open the full record ›* (Problems, ?open=). A problem of a project is
 * changed only by somebody who may change that project's work (useAccess can.edit); a client reads it. */
import { useCallback, useEffect, useState } from 'react';
import { getSnag, listSnagAssets, listWorkspaces, onDataChange, patchSnag, setSnagsStatus } from '../db';
import { dueFromInput, dueToInput, type Snag, type SnagStatus } from './types';
import { useAccess } from '../cloud/access';
import { DrawerShell } from '../ui/DrawerShell';
import { DateInput } from '../ui/DateInput';
import { DraftArea, DraftText } from '../ui/Draft';
import { nav } from '../state/useRoute';
import { DependsBlock } from '../line/actions/Depends';
import './problemPanel.css';

let opener: ((id: string) => void) | null = null;
/** Open a problem in the panel over the page you are on. Where the frame has no host (a page outside it) it goes to Problems. */
export function openProblem(id: string): void {
  if (opener) opener(id);
  else nav(`/snags?open=${encodeURIComponent(id)}`);
}

/** Mounted once by the frame (ui/Frame), beside the quick problem's host. */
export function ProblemPanelHost() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { opener = setId; return () => { opener = null; }; }, []);
  return id ? <ProblemPanel key={id} id={id} onClose={() => setId(null)} /> : null;
}

const STATUS: { v: SnagStatus; w: string }[] = [{ v: 'open', w: 'To do' }, { v: 'in_progress', w: 'Doing' }, { v: 'closed', w: 'Done' }];
const PRIO: { v: NonNullable<Snag['priority']>; w: string; c: string }[] = [{ v: 'critical', w: 'Critical', c: 'pp-r' }, { v: 'high', w: 'High', c: 'pp-a' }, { v: 'low', w: 'Low', c: 'pp-g' }];
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function ProblemPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [s, setS] = useState<Snag | null | undefined>(undefined);
  const [where, setWhere] = useState<{ line: string; machine?: string }>({ line: '' });
  const load = useCallback(async () => {
    const snag = await getSnag(id);
    setS(snag && !snag.deletedAt ? snag : null);
    if (snag) {
      const [lines, assets] = await Promise.all([listWorkspaces(), listSnagAssets(snag.workspaceId)]);
      setWhere({ line: lines.find(w => w.id === snag.workspaceId)?.name ?? '', machine: snag.assetId ? assets.find(a => a.id === snag.assetId)?.name : snag.targetAsset });
    }
  }, [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  return (
    <DrawerShell label={s ? `Problem — ${s.problem}` : 'Problem'} onClose={onClose} back>
      {s === undefined ? <p className="sub pp-pad">Opening the problem…</p>
        : s === null ? <p className="sub pp-pad">This problem is not here any more — it was deleted, or it has not reached this device yet.</p>
          : s.projectId ? <WithAccess projectId={s.projectId}>{edit => <Body s={s} where={where} edit={edit} onClose={onClose} />}</WithAccess>
            : <Body s={s} where={where} edit onClose={onClose} />}
    </DrawerShell>
  );
}

function WithAccess({ projectId, children }: { projectId: string; children: (edit: boolean) => JSX.Element }) {
  return children(useAccess(projectId).edit);
}

function Body({ s, where, edit, onClose }: { s: Snag; where: { line: string; machine?: string }; edit: boolean; onClose: () => void }) {
  const put = (p: Partial<Snag>) => { if (edit) void patchSnag(s.id, { ...p, updatedAt: Date.now() }); };
  const prio = s.priority ?? 'low';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const late = s.status !== 'closed' && s.dueAt != null && s.dueAt < today.getTime();
  const lateBy = late ? Math.round((today.getTime() - (s.dueAt as number)) / 86_400_000) : 0;
  const full = () => { onClose(); window.setTimeout(() => nav(`/snags?line=${encodeURIComponent(s.workspaceId)}&open=${encodeURIComponent(s.id)}`), 60); };
  return (
    <div className="pp" data-problem-panel={s.id}>
      <p className="pp-eyebrow">Problem{where.line ? ` · ${where.line}` : ''}{where.machine ? ` · ${where.machine}` : ''}</p>
      {edit
        ? <DraftArea value={s.problem} rows={2} className="text-input pp-title" ariaLabel="What is going wrong" onSave={v => { if (v.trim()) put({ problem: v.trim() }); }} />
        : <h2 className="pp-title-ro">{s.problem}</h2>}
      <p className={'pp-said' + (late ? ' is-late' : '')} data-pp-said>
        {s.status === 'closed' ? `Done${s.closedAt ? ` on ${day(s.closedAt)}` : ''}.`
          : late ? `${lateBy} day${lateBy === 1 ? '' : 's'} late — it was due ${day(s.dueAt as number)}${s.owner ? `, with ${s.owner}` : ', with nobody on it'}.`
            : `${s.status === 'in_progress' ? 'Under way' : 'To do'}${s.dueAt != null ? `, due ${day(s.dueAt)}` : ', no day agreed'}${s.owner ? `, with ${s.owner}` : ', nobody on it yet'}.`}
        {' '}Raised {day(s.raisedAt)}.
      </p>

      <div className="pp-grid">
        <span className="pp-k" id="pp-st">Status</span>
        <div className="pp-seg" role="group" aria-labelledby="pp-st">
          {STATUS.map(o => <button key={o.v} type="button" className={'pp-chip' + (s.status === o.v ? ' on' : '')} aria-pressed={s.status === o.v} disabled={!edit} onClick={() => void setSnagsStatus([s.id], o.v)}>{o.w}</button>)}
        </div>
        <span className="pp-k" id="pp-pr">Priority</span>
        <div className="pp-seg" role="group" aria-labelledby="pp-pr">
          {PRIO.map(o => <button key={o.v} type="button" className={`pp-chip ${o.c}` + (prio === o.v ? ' on' : '')} aria-pressed={prio === o.v} disabled={!edit} onClick={() => put({ priority: o.v })}>{o.w}</button>)}
        </div>
        <label className="pp-k" htmlFor="pp-who">Whose</label>
        {edit ? <DraftText value={s.owner ?? ''} placeholder="Nobody yet" className="text-input" max={60} ariaLabel="Whose is it" onSave={v => put({ owner: v.trim() || undefined })} />
          : <span id="pp-who">{s.owner || 'Nobody yet'}</span>}
        <span className="pp-k">Due</span>
        {edit ? <DateInput className="text-input" value={dueToInput(s.dueAt)} aria-label="Due date" onCommit={v => put({ dueAt: dueFromInput(v) })} />
          : <span>{s.dueAt != null ? day(s.dueAt) : 'No day agreed'}</span>}
      </div>

      <div className="pp-f">
        <span className="pp-k">What we will do</span>
        {edit ? <DraftArea value={s.proposedSolution ?? ''} rows={2} placeholder="The plan — what will put it right" className="text-input" ariaLabel="What we will do" onSave={v => put({ proposedSolution: v || undefined })} />
          : <p>{s.proposedSolution || <span className="sub">Not written yet.</span>}</p>}
      </div>
      <div className="pp-f">
        <span className="pp-k">Latest</span>
        {edit ? <DraftText value={s.latestUpdate ?? ''} placeholder="What is happening with it now" className="text-input" max={200} ariaLabel="What is happening with it now" onSave={v => put({ latestUpdate: v.trim() || undefined, latestUpdateAt: v.trim() ? Date.now() : undefined })} />
          : <p>{s.latestUpdate || <span className="sub">Nothing said yet.</span>}</p>}
        {s.latestUpdate && s.latestUpdateAt && <span className="sub pp-at">said {day(s.latestUpdateAt)}</span>}
      </div>

      {edit ? <DependsBlock id={s.id} /> : null}

      {(s.journey?.length ?? 0) > 0 && (
        <div className="pp-f">
          <span className="pp-k">Its journey</span>
          <ol className="pp-journey">
            {[...(s.journey ?? [])].sort((a, b) => b.at - a.at).slice(0, 4).map(j => <li key={j.id}><span className="sub">{day(j.at)}</span> {j.did}{j.result ? ` → ${j.result}` : ''}</li>)}
          </ol>
        </div>
      )}

      <div className="pp-foot">
        <button type="button" className="btn btn-primary" onClick={full}>Open the full record ›</button>
        <span className="sub">Pictures, what it costs, which waste, the program, its journey and closing it with what shows it is fixed.</span>
      </div>
    </div>
  );
}
